from youtube_transcript_api import YouTubeTranscriptApi

# Test with a video that should have transcripts
test_videos = [
    "dQw4w9WgXcQ",  # Rick Astley - Never Gonna Give You Up (famous video, likely has transcripts)
    "9bZkp7q19f0",  # PSY - Gangnam Style (popular video)
    "GwIo3gDZCVQ"   # Your original video
]

for video_id in test_videos:
    print(f"\nTesting video: {video_id}")
    try:
        transcript = YouTubeTranscriptApi.fetch(video_id, languages=['en'])
        print(f"✅ Success! Found {len(transcript)} transcript segments")
        # Show first segment as example
        if transcript:
            print(f"First segment: {transcript[0]}")
        break  # Stop at first successful video
    except Exception as e:
        print(f"❌ Error: {str(e)}")

print("\nDone testing!")