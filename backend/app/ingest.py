from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound
# from YoutubeTranscriptApi import get_transcript
import pysrt
from typing import List, Dict
import uuid
import os
from .store import BM25Store
from .segments import make_windows
from .store import VectorStore

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

def parse_srt_text(srt_path: str):
    import time
    start_time = time.time()
    
    subs = pysrt.open(srt_path)
    
    # PERFORMANCE OPTIMIZATION: Use list comprehension for faster processing
    transcript = []
    for s in subs:
        start_seconds = (s.start.seconds + s.start.minutes*60 + s.start.hours*3600 + s.start.milliseconds/1000.0)
        end_seconds = (s.end.seconds + s.end.minutes*60 + s.end.hours*3600 + s.end.milliseconds/1000.0)
        transcript.append({
            "start": start_seconds,
            "duration": end_seconds - start_seconds,
            "text": s.text.replace("\n", " ")
        })
    
    parse_time = (time.time() - start_time) * 1000
    print(f"SRT parsing completed in {parse_time:.0f}ms for {len(transcript)} subtitles")
    return transcript

def ingest_youtube(url: str, window_size: int=30, overlap: int=5, fast_mode: bool=True):
    import time
    start_time = time.time()
    
    # extract video id
    if "youtu" not in url:
        raise ValueError("Only YouTube URLs are supported by this ingestion function.")
    # naive id extraction
    if "v=" in url:
        video_id = url.split("v=")[1].split("&")[0]
    else:
        video_id = url.split("/")[-1]
    
    print(f"Fetching transcript for video: {video_id}")
    try:
        # Create an instance of the API and try to get English transcript first
        api = YouTubeTranscriptApi()
        raw = api.fetch(video_id, languages=['en'])
    except NoTranscriptFound:
        try:
            # If no English transcript, try without language specification
            api = YouTubeTranscriptApi()
            raw = api.fetch(video_id)
        except Exception as e:
            raise ValueError(f"No transcript available for this video: {str(e)}")
    except Exception as e:
        error_msg = str(e).lower()
        # Handle specific common errors
        if "no element found" in error_msg:
            raise ValueError("No valid transcript data found for this video. The video may not have transcripts enabled, may be restricted, or may be private.")
        elif "video unavailable" in error_msg:
            raise ValueError("The requested video is unavailable or has been removed.")
        elif "transcripts disabled" in error_msg:
            raise ValueError("Transcripts have been disabled for this video by the uploader.")
        elif "could not retrieve transcript" in error_msg:
            raise ValueError("Unable to retrieve transcript. The video may be private, age-restricted, or have no transcripts available.")
        else:
            raise ValueError(f"Error fetching transcript: {str(e)}. This might be due to video restrictions or transcript format issues.")
    
    fetch_time = time.time()
    print(f"Transcript fetched in {(fetch_time - start_time):.2f}s - Processing {len(raw)} segments...")
    
    # PERFORMANCE OPTIMIZATION: Process transcript data more efficiently
    transcript = []
    for seg in raw:
        transcript.append({
            "start": seg.start,
            "duration": getattr(seg, "duration", 0),
            "text": seg.text
        })
    
    process_time = time.time()
    print(f"Transcript processed in {(process_time - fetch_time):.2f}s - Creating time windows...")
    
    segments = make_windows(transcript, window_size=window_size, overlap=overlap)
    
    window_time = time.time()
    print(f"Windows created in {(window_time - process_time):.2f}s - Preparing {len(segments)} segments...")
    
    # PERFORMANCE OPTIMIZATION: Pre-compute title and build docs efficiently
    title = f"YouTube:{video_id}"
    docs = []
    for seg in segments:
        docs.append({
            "text": seg["text"], 
            "metadata": {
                "video_id": video_id, 
                "t_start": seg["t_start"], 
                "t_end": seg["t_end"], 
                "text": seg["text"], 
                "title": title
            }
        })
    
    prep_time = time.time()
    print(f"Documents prepared in {(prep_time - window_time):.2f}s - Building search index...")
    
    # PERFORMANCE FIX: Only use fast BM25 indexing in fast mode
    bm25 = BM25Store()
    bm25.add_documents(docs)
    
    # Only build vector index if not in fast mode
    if not fast_mode:
        print("Building vector index (slow mode)...")
        vector_store = VectorStore()
        vector_store.clear_index()
        vector_store.add_documents(docs)
    
    end_time = time.time()
    total_time = end_time - start_time
    index_time = end_time - prep_time
    
    print(f"Ingestion complete in {total_time:.2f}s (indexing: {index_time:.2f}s)! Indexed {len(docs)} segments.")
    return {"video_id": video_id, "ingested_segments": len(docs), "total_time": total_time}

def ingest_srt_file(path: str, window_size: int=30, overlap: int=5, fast_mode: bool=True):
    import time
    start_time = time.time()
    
    print(f"Parsing SRT file: {os.path.basename(path)}")
    transcript = parse_srt_text(path)
    
    parse_time = time.time()
    print(f"SRT parsed in {(parse_time - start_time):.2f}s - Creating time windows from {len(transcript)} entries...")
    
    segments = make_windows(transcript, window_size=window_size, overlap=overlap)
    
    window_time = time.time()
    print(f"Windows created in {(window_time - parse_time):.2f}s - Preparing {len(segments)} segments...")
    
    # PERFORMANCE OPTIMIZATION: Pre-compute video ID and title
    vid = "local_srt_" + os.path.basename(path)
    title = os.path.basename(path)
    
    # Build documents efficiently
    docs = []
    for seg in segments:
        docs.append({
            "text": seg["text"], 
            "metadata": {
                "video_id": vid, 
                "t_start": seg["t_start"], 
                "t_end": seg["t_end"], 
                "text": seg["text"], 
                "title": title
            }
        })
    
    prep_time = time.time()
    print(f"Documents prepared in {(prep_time - window_time):.2f}s - Building search index...")
    
    # PERFORMANCE FIX: Only use fast BM25 indexing in fast mode
    bm25 = BM25Store()
    bm25.add_documents(docs)
    
    # Only build vector index if not in fast mode
    if not fast_mode:
        print("Building vector index (slow mode)...")
        vector_store = VectorStore()
        vector_store.clear_index()
        vector_store.add_documents(docs)
    
    end_time = time.time()
    total_time = end_time - start_time
    index_time = end_time - prep_time
    
    print(f"Ingestion complete in {total_time:.2f}s (indexing: {index_time:.2f}s)! Indexed {len(docs)} segments.")
    return {"video_id": vid, "ingested_segments": len(docs), "total_time": total_time}
