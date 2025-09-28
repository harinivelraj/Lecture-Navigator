from youtube_transcript_api import YouTubeTranscriptApi

# Test different API patterns to find the correct one
video_id = "dQw4w9WgXcQ"

print("Testing different API patterns...")

# Pattern 1: Instance method
try:
    api = YouTubeTranscriptApi()
    result = api.fetch(video_id, languages=['en'])
    print("✅ Instance method works:", len(result))
except Exception as e:
    print("❌ Instance method:", e)

# Pattern 2: Class method with video_id first
try:
    result = YouTubeTranscriptApi.fetch(video_id, languages=['en'])
    print("✅ Class method (video_id first) works:", len(result))
except Exception as e:
    print("❌ Class method (video_id first):", e)

# Pattern 3: Just video_id
try:
    result = YouTubeTranscriptApi.fetch(video_id)
    print("✅ Just video_id works:", len(result))
except Exception as e:
    print("❌ Just video_id:", e)

print("\nDone testing!")