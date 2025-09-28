from youtube_transcript_api import YouTubeTranscriptApi

print('Testing YouTube Transcript API methods...')

# Test get_transcript
try:
    result = YouTubeTranscriptApi.get_transcript('dQw4w9WgXcQ')
    print('get_transcript works!', len(result))
except Exception as e:
    print('get_transcript error:', e)

# Test fetch
try:
    result = YouTubeTranscriptApi.fetch('dQw4w9WgXcQ')
    print('fetch works!', len(result))
except Exception as e:
    print('fetch error:', e)

# Show available methods
print('Available methods:', [method for method in dir(YouTubeTranscriptApi) if not method.startswith('_')])