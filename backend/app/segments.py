from typing import List, Dict
import math

def make_windows(transcript: List[Dict], window_size: int = 30, overlap: int = 5):
    """
    transcript: list of {"start": float, "duration": float, "text": str}
    window_size, overlap in seconds.
    Returns list of {"t_start": float, "t_end": float, "text": str}
    """
    # PERFORMANCE OPTIMIZATION: Pre-compute values and use more efficient logic
    segments = []
    
    # Pre-compute all segment boundaries for faster overlap detection
    segment_bounds = []
    max_end = 0
    for item in transcript:
        item_start = item["start"]
        item_end = item["start"] + item.get("duration", 0)
        segment_bounds.append((item_start, item_end, item["text"]))
        max_end = max(max_end, item_end)
    
    step = window_size - overlap
    t = 0.0
    
    while t < max_end:
        t_end = t + window_size
        
        # PERFORMANCE FIX: Use list comprehension for faster text collection
        texts = [
            text for item_start, item_end, text in segment_bounds
            if not (item_end <= t or item_start >= t_end)  # overlap check
        ]
        
        if texts:  # Only create segment if there's actual text
            combined_text = " ".join(texts).strip()
            if combined_text:  # Double-check for non-empty text
                segments.append({
                    "t_start": t, 
                    "t_end": min(t_end, max_end), 
                    "text": combined_text
                })
        
        t += step
    
    return segments
