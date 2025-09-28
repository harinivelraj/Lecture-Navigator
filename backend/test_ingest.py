from app.ingest import ingest_youtube, ingest_srt_file
from youtube_transcript_api import YouTubeTranscriptApi
# print(dir(YouTubeTranscriptApi))

# # Ingest SRT file
# srt_result = ingest_srt_file("../demo_data/sample_transcripts/sample_lecture.srt", window_size=30, overlap=5)
# print("SRT result:", srt_result)

# Ingest YouTube video
yt_result = ingest_youtube("https://www.youtube.com/watch?v=6wyirNSXmUQ", window_size=30, overlap=5)
print("YouTube result:", yt_result)