from youtube_transcript_api import YouTubeTranscriptApi

# Test to see what the transcript objects look like
video_id = "dQw4w9WgXcQ"

try:
    api = YouTubeTranscriptApi()
    result = api.fetch(video_id, languages=['en'])
    print("Success! Got transcript with", len(result), "segments")
    print("First segment type:", type(result[0]))
    print("First segment attributes:", dir(result[0]))
    print("First segment content:")
    first_segment = result[0]
    for attr in ['text', 'start', 'duration']:
        if hasattr(first_segment, attr):
            print(f"  {attr}: {getattr(first_segment, attr)}")
except Exception as e:
    print("Error:", e)