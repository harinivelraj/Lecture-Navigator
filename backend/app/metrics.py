import threading
import os
import csv
import time
import statistics
import collections
from datetime import datetime, timedelta
from typing import List, Dict
METRICS_FILE = os.path.join(os.path.dirname(__file__), '..', 'metrics.csv')
METRICS_HEADER = [
    'event', 'timestamp', 'url_or_filename', 'search_type', 'latency_ms', 'cost', 'accuracy', 'extra'
]

# Ensure metrics file exists with header
_metrics_file_lock = threading.Lock()
def init_metrics_file():
    # Always overwrite metrics file with header on server start
    with open(METRICS_FILE, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(METRICS_HEADER)

init_metrics_file()

def log_metric(event, url_or_filename, search_type=None, latency_ms=None, cost=None, accuracy=None, extra=None):
    # Set default values for missing fields
    row = {
        'event': event,
        'timestamp': time.time(),
        'url_or_filename': url_or_filename if url_or_filename else '',
        'search_type': search_type if search_type else '',
        'latency_ms': latency_ms if latency_ms is not None else '',
        'cost': cost if cost is not None else 0,  # Default to 0 for no-cost operations
        'accuracy': accuracy if accuracy is not None else '',
        'extra': extra if extra else ''
    }
    
    # Terminal logging for monitoring (only log if not quiet mode)
    if not os.getenv('QUIET_METRICS', False):
        timestamp_str = datetime.fromtimestamp(row['timestamp']).strftime('%H:%M:%S')
        
        # Clean, organized output with clear sections (NO EMOJIS)
        if event == 'search':
            latency_status = 'GOOD' if latency_ms and latency_ms <= 2000 else 'SLOW' if latency_ms and latency_ms <= 3000 else 'POOR'
            accuracy_status = 'EXCELLENT' if accuracy and accuracy >= 0.7 else 'MODERATE' if accuracy and accuracy >= 0.5 else 'POOR'
            
            print("\n" + "="*60)
            print(f"SEARCH PERFORMANCE [{timestamp_str}]")
            print("="*60)
            print(f"   Latency: {latency_ms:.0f}ms ({latency_status})")
            print(f"   Accuracy: {accuracy:.3f} ({accuracy_status})")
            print(f"   Search Type: {search_type.upper()}")
            print(f"   Results: {extra}")
            print("="*60 + "\n")
            
        elif event == 'ingest':
            print("\n" + "="*60)
            print(f"CONTENT INGESTION [{timestamp_str}]")
            print("="*60)
            print(f"   Status: SUCCESS")
            print(f"   Duration: {latency_ms:.0f}ms ({latency_ms/1000:.1f}s)")
            print(f"   Quality: {accuracy:.3f} (Perfect: 1.000)")
            print(f"   Content: {extra}")
            print("="*60 + "\n")
            
        elif event == 'mrr_evaluation':
            target_status = 'TARGET MET' if accuracy >= 0.7 else 'BELOW TARGET' if accuracy >= 0.5 else 'NEEDS IMPROVEMENT'
            
            print("\n" + "="*60)
            print(f"MRR@10 EVALUATION [{timestamp_str}]")
            print("="*60)
            print(f"   Score: {accuracy:.3f} ({target_status})")
            print(f"   Target: >= 0.700 for excellent performance")
            print(f"   Details: {extra}")
            print(f"   Evaluation Time: {latency_ms:.0f}ms")
            print("="*60 + "\n")
            
        elif event == 'latency_alert':
            print("\n" + "!"*60)
            print(f"P95 LATENCY ALERT [{timestamp_str}]")
            print("!"*60)
            print(f"   THRESHOLD EXCEEDED: {extra}")
            print(f"   TARGET: <= 2000ms (2.0s)")
            print(f"   ACTION NEEDED: Investigate performance issues")
            print("!"*60 + "\n")
            
        elif event == 'window_comparison':
            print("\n" + "="*60)
            print(f"WINDOW SIZE ANALYSIS [{timestamp_str}]")
            print("="*60)
            print(f"   Ablation Study: 30s vs 60s comparison")
            print(f"   Result: {extra}")
            print("="*60 + "\n")
        
        # Print performance summary every 25 requests (reduced frequency)
        if hasattr(log_metric, '_request_count'):
            log_metric._request_count += 1
        else:
            log_metric._request_count = 1
            
        if log_metric._request_count % 25 == 0 and event == 'search':
            print("\n" + "="*60)
            print(f"PERFORMANCE SUMMARY [{timestamp_str}]")
            print("="*60)
            print(f"   Total Requests Processed: {log_metric._request_count}")
            print(f"   Monitoring: MRR@10 >=0.7 | P95 Latency <=2.0s | Window Analysis")
            print("="*60 + "\n")
    
    with _metrics_file_lock:
        file_exists = os.path.exists(METRICS_FILE)
        with open(METRICS_FILE, 'a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=METRICS_HEADER)
            if not file_exists or os.stat(METRICS_FILE).st_size == 0:
                writer.writeheader()
            writer.writerow(row)  # Write all fields, including empty ones

def compute_mrr_at_k(results_by_query: Dict[str, List[Dict]], gold: Dict[str, int], k=10):
    """
    results_by_query: {query: [ordered list of predicted video timestamp ids OR canonical rankables]}
    gold: {query: gold_item}  — gold_item must be comparable to items in predictions
    """
    rr_scores = []
    for q, preds in results_by_query.items():
        gold_item = gold.get(q)
        if gold_item is None:
            continue
        pos = None
        for i, p in enumerate(preds[:k], start=1):
            if p == gold_item:
                pos = i
                break
        if pos:
            rr_scores.append(1.0/pos)
        else:
            rr_scores.append(0.0)
    mrr = sum(rr_scores) / len(rr_scores) if rr_scores else 0.0
    return mrr


def compute_mrr_at_10_with_timestamps(search_function, gold_set_path: str = None, k: int = 10):
    """
    Enhanced MRR@10 calculation using timestamp-based relevance evaluation.
    
    Args:
        search_function: Function that takes (query, k) and returns list of results with t_start, t_end
        gold_set_path: Path to gold set JSON file with query->timestamp mappings
        k: Number of top results to consider (default: 10)
        
    Returns:
        Dict with MRR score, query count, detailed results, and performance metrics
    """
    import json
    import os
    
    # Load timestamp-based gold set
    if not gold_set_path:
        gold_set_path = os.path.join(os.path.dirname(__file__), "..", "..", "demo_data", "gold_set", "mrr_gold_timestamps.json")
    
    try:
        with open(gold_set_path, "r", encoding="utf-8") as f:
            gold_set = json.load(f)
    except Exception as e:
        print(f"Error loading gold set: {e}")
        return {"mrr_score": 0.0, "query_count": 0, "error": str(e)}
    
    if not gold_set:
        return {"mrr_score": 0.0, "query_count": 0, "error": "Empty gold set"}
    
    print(f"\n🎯 EVALUATING MRR@10 ON {len(gold_set)} QUERIES")
    print("="*50)
    
    rr_scores = []
    detailed_results = {}
    evaluation_start = time.time()
    
    for query, gold_info in gold_set.items():
        query_start = time.time()
        
        # Extract relevant timestamps from gold set
        relevant_timestamps = gold_info.get("relevant_timestamps", [])
        if not relevant_timestamps:
            continue
            
        try:
            # Get search results
            search_results = search_function(query, k)
            
            if not search_results:
                rr_scores.append(0.0)
                detailed_results[query] = {"reciprocal_rank": 0.0, "found_at_position": None, "relevant_found": False}
                continue
            
            # Find the highest ranking relevant result
            best_position = None
            found_relevant = False
            
            for position, result in enumerate(search_results[:k], start=1):
                result_start = result.get("t_start", 0)
                result_end = result.get("t_end", result_start)
                
                # Check if this result overlaps with any relevant timestamp
                for relevant_ts in relevant_timestamps:
                    # Allow some tolerance for timestamp matching (±5 seconds)
                    tolerance = 5.0
                    if (result_start <= relevant_ts + tolerance and 
                        result_end >= relevant_ts - tolerance):
                        if best_position is None:
                            best_position = position
                            found_relevant = True
                        break
                
                if best_position:
                    break
            
            # Calculate reciprocal rank
            if best_position:
                rr_score = 1.0 / best_position
                rr_scores.append(rr_score)
            else:
                rr_score = 0.0
                rr_scores.append(0.0)
            
            query_time = (time.time() - query_start) * 1000
            detailed_results[query] = {
                "reciprocal_rank": rr_score,
                "found_at_position": best_position,
                "relevant_found": found_relevant,
                "query_latency_ms": query_time,
                "relevant_timestamps": relevant_timestamps
            }
            
        except Exception as e:
            print(f"Error evaluating query '{query}': {e}")
            rr_scores.append(0.0)
            detailed_results[query] = {"reciprocal_rank": 0.0, "error": str(e)}
    
    # Calculate final MRR
    mrr_score = sum(rr_scores) / len(rr_scores) if rr_scores else 0.0
    evaluation_time = (time.time() - evaluation_start) * 1000
    
    # Performance statistics
    queries_with_results = sum(1 for r in detailed_results.values() if r.get("relevant_found", False))
    avg_query_latency = statistics.mean([r.get("query_latency_ms", 0) for r in detailed_results.values()])
    
    results = {
        "mrr_score": mrr_score,
        "query_count": len(rr_scores),
        "queries_with_relevant_results": queries_with_results,
        "evaluation_time_ms": evaluation_time,
        "avg_query_latency_ms": avg_query_latency,
        "detailed_results": detailed_results,
        "performance_summary": {
            "target_threshold": 0.7,
            "meets_threshold": mrr_score >= 0.7,
            "queries_evaluated": len(gold_set),
            "successful_queries": queries_with_results
        }
    }
    
    # Terminal logging
    status = "🟢 EXCELLENT" if mrr_score >= 0.7 else "🟡 MODERATE" if mrr_score >= 0.5 else "🔴 POOR"
    print(f"📊 MRR@10 Score: {mrr_score:.3f} ({status})")
    print(f"📈 Queries Evaluated: {len(gold_set)}")
    print(f"✅ Successful Matches: {queries_with_results}/{len(gold_set)} ({queries_with_results/len(gold_set)*100:.1f}%)")
    print(f"⏱️  Evaluation Time: {evaluation_time:.0f}ms")
    print(f"🎯 Target: ≥0.7 {'✓ MET' if mrr_score >= 0.7 else '✗ NOT MET'}")
    
    return results

def measure_latency(func, *args, runs=50, **kwargs):
    times=[]
    for _ in range(runs):
        t0=time.time()
        func(*args, **kwargs)
        times.append(time.time()-t0)
    return {"p50":statistics.median(times), "p95":sorted(times)[int(runs*0.95)-1], "mean":sum(times)/len(times)}


# Latency monitoring and p95 tracking functionality

# In-memory store for recent latency measurements (last 1000 requests)
_latency_buffer = collections.deque(maxlen=1000)
_latency_lock = threading.Lock()

def track_search_latency(latency_ms):
    """Track search latency for p95 monitoring"""
    with _latency_lock:
        _latency_buffer.append({
            'latency_ms': latency_ms,
            'timestamp': datetime.now()
        })

def get_latency_stats(window_minutes=60):
    """Get latency statistics for the specified time window"""
    cutoff_time = datetime.now() - timedelta(minutes=window_minutes)
    
    with _latency_lock:
        # Filter to recent measurements within time window
        recent_latencies = [
            entry['latency_ms'] for entry in _latency_buffer 
            if entry['timestamp'] > cutoff_time
        ]
    
    if not recent_latencies:
        return {
            'count': 0,
            'mean': 0,
            'p50': 0,
            'p95': 0,
            'p99': 0,
            'max': 0,
            'min': 0,
            'window_minutes': window_minutes,
            'p95_threshold_exceeded': False,
            'threshold_ms': 2000
        }
    
    recent_latencies.sort()
    count = len(recent_latencies)
    
    stats = {
        'count': count,
        'mean': sum(recent_latencies) / count,
        'p50': recent_latencies[int(count * 0.5)] if count > 0 else 0,
        'p95': recent_latencies[int(count * 0.95)] if count > 0 else 0,
        'p99': recent_latencies[int(count * 0.99)] if count > 0 else 0,
        'max': max(recent_latencies),
        'min': min(recent_latencies),
        'window_minutes': window_minutes,
        'p95_threshold_exceeded': False,
        'threshold_ms': 2000
    }
    
    # Check if p95 exceeds 2.0s (2000ms) threshold
    stats['p95_threshold_exceeded'] = stats['p95'] > 2000
    
    return stats

def get_window_size_comparison():
    """Compare latency metrics across different window sizes (30s vs 60s ablation study)"""
    window_sizes = [0.5, 1, 2, 5, 10, 30, 60]  # in minutes, including 30s and 60s
    comparison = {}
    
    for window_minutes in window_sizes:
        window_key = f"{int(window_minutes * 60)}s" if window_minutes < 1 else f"{int(window_minutes)}min"
        stats = get_latency_stats(window_minutes)
        
        comparison[window_key] = {
            'window_minutes': window_minutes,
            'window_seconds': window_minutes * 60,
            'count': stats['count'],
            'p95_ms': stats['p95'],
            'mean_ms': stats['mean'],
            'p50_ms': stats['p50'],
            'max_ms': stats['max'],
            'threshold_exceeded': stats['p95_threshold_exceeded'],
            'stability_score': _calculate_stability_score(stats),
            'sample_reliability': 'high' if stats['count'] >= 5 else 'medium' if stats['count'] >= 2 else 'low'
        }
    
    # Add comparison insights
    comparison_insights = _analyze_window_differences(comparison)
    
    return {
        'window_comparisons': comparison,
        'insights': comparison_insights,
        'recommendation': _get_window_size_recommendation(comparison)
    }

def _calculate_stability_score(stats):
    """Calculate stability score based on variance and sample size"""
    if stats['count'] < 2:
        return 0.0
    
    # Handle edge cases
    if stats['mean'] == 0 or stats['max'] == stats['min']:
        return 1.0
    
    try:
        # Estimate standard deviation using percentile differences
        cv = (stats['max'] - stats['min']) / (2 * stats['mean']) if stats['mean'] > 0 else 0
        stability = max(0.0, min(1.0, 1.0 - cv))  # Clamp between 0 and 1
        
        # Handle NaN/infinity
        if not (0.0 <= stability <= 1.0) or stability != stability:  # NaN check
            return 0.5  # Default moderate stability
            
        return round(stability, 3)
    except (ZeroDivisionError, OverflowError):
        return 0.5  # Default moderate stability

def _analyze_window_differences(comparisons):
    """Analyze differences between window sizes"""
    insights = []
    
    try:
        # Compare 30s vs 60s specifically
        if '30s' in comparisons and '60min' in comparisons:
            window_30s = comparisons['30s']
            window_60min = comparisons['60min']
            
            p95_diff = abs(window_30s['p95_ms'] - window_60min['p95_ms'])
            p95_change_pct = (p95_diff / max(window_60min['p95_ms'], 1)) * 100
            
            insights.append({
                'comparison': '30s vs 60min',
                'p95_difference_ms': round(p95_diff, 2) if p95_diff == p95_diff else 0.0,  # NaN check
                'p95_change_percent': round(p95_change_pct, 2) if p95_change_pct == p95_change_pct else 0.0,  # NaN check
                'stability_difference': round(window_30s['stability_score'] - window_60min['stability_score'], 3),
                'sample_size_difference': window_30s['count'] - window_60min['count']
            })
    except (KeyError, TypeError, ValueError) as e:
        insights.append({
            'error': f'Could not compare 30s vs 60min: {str(e)}',
            'comparison': '30s vs 60min'
        })
    
    try:
        # Find most stable window
        if comparisons:
            stable_window = max(comparisons.items(), key=lambda x: x[1]['stability_score'])
            insights.append({
                'most_stable_window': stable_window[0],
                'stability_score': stable_window[1]['stability_score'],
                'sample_count': stable_window[1]['count']
            })
    except (ValueError, KeyError) as e:
        insights.append({
            'error': f'Could not determine most stable window: {str(e)}'
        })
    
    return insights

def _get_window_size_recommendation(comparisons):
    """Provide recommendation for optimal window size"""
    
    # Check if we have any data at all
    total_samples = sum(stats.get('count', 0) for stats in comparisons.values())
    
    if total_samples == 0:
        return {
            'recommended': 'insufficient_data', 
            'reason': 'No search requests have been made yet. Please perform some searches to generate latency data for analysis.',
            'suggestion': 'Try making 5-10 search queries to populate the comparison data.',
            'data_needed': 'At least 5 samples recommended for reliable analysis'
        }
    
    if total_samples < 3:
        return {
            'recommended': 'need_more_data',
            'reason': f'Only {total_samples} samples available. Need at least 5 samples for reliable window size comparison.',
            'suggestion': f'Perform {5 - total_samples} more searches to get sufficient data.',
            'current_samples': total_samples
        }
    
    # Score each window based on stability, sample size, and responsiveness
    scored_windows = []
    
    for window_name, stats in comparisons.items():
        if stats['count'] == 0:
            continue
            
        # Scoring factors
        stability_score = stats['stability_score'] * 0.4
        sample_score = min(stats['count'] / 10, 1.0) * 0.3  # Normalize sample size
        responsiveness_score = (1 / max(stats['window_minutes'], 1)) * 0.3  # Prefer shorter windows
        
        total_score = stability_score + sample_score + responsiveness_score
        
        scored_windows.append({
            'window': window_name,
            'score': round(total_score, 3),
            'stability': stats['stability_score'],
            'samples': stats['count'],
            'responsiveness': round(responsiveness_score, 3)
        })
    
    if not scored_windows:
        return {
            'recommended': 'no_valid_windows', 
            'reason': 'No windows have sufficient data for comparison',
            'total_samples': total_samples
        }
    
    # Sort by score
    scored_windows.sort(key=lambda x: x['score'], reverse=True)
    best_window = scored_windows[0]
    
    return {
        'recommended': best_window['window'],
        'score': best_window['score'],
        'reason': f"Best balance of stability ({best_window['stability']:.3f}), sample size ({best_window['samples']}), and responsiveness",
        'confidence': 'high' if total_samples >= 10 else 'medium' if total_samples >= 5 else 'low',
        'total_samples': total_samples,
        'all_scores': scored_windows[:3]  # Top 3 recommendations
    }

def get_latency_trend(window_minutes=60, bucket_minutes=5):
    """Get latency trend data bucketed by time intervals"""
    cutoff_time = datetime.now() - timedelta(minutes=window_minutes)
    
    with _latency_lock:
        recent_entries = [
            entry for entry in _latency_buffer 
            if entry['timestamp'] > cutoff_time
        ]
    
    if not recent_entries:
        return []
    
    # Create time buckets
    buckets = {}
    bucket_size = timedelta(minutes=bucket_minutes)
    
    for entry in recent_entries:
        # Round timestamp to bucket
        bucket_time = entry['timestamp'].replace(second=0, microsecond=0)
        bucket_time = bucket_time.replace(minute=(bucket_time.minute // bucket_minutes) * bucket_minutes)
        
        if bucket_time not in buckets:
            buckets[bucket_time] = []
        buckets[bucket_time].append(entry['latency_ms'])
    
    # Calculate stats for each bucket
    trend_data = []
    for bucket_time in sorted(buckets.keys()):
        latencies = sorted(buckets[bucket_time])
        count = len(latencies)
        
        trend_data.append({
            'timestamp': bucket_time.isoformat(),
            'count': count,
            'mean': sum(latencies) / count,
            'p95': latencies[int(count * 0.95)] if count > 0 else 0,
            'p95_exceeded': latencies[int(count * 0.95)] > 2000 if count > 0 else False
        })
    
    return trend_data

def check_latency_alert():
    """Check if current p95 latency exceeds threshold and return alert info"""
    stats = get_latency_stats(window_minutes=10)  # Check last 10 minutes
    
    if stats['count'] < 1:  # Need at least 1 sample for any evaluation
        return {
            'alert': False,
            'reason': 'insufficient_data',
            'message': 'No recent requests to evaluate latency'
        }
    
    # For small sample sizes (1-4), use max latency instead of p95 for more responsive alerting
    if stats['count'] < 5:
        threshold_exceeded = stats['max'] > 2000
        metric_used = 'max'
        metric_value = stats['max']
    else:
        threshold_exceeded = stats['p95_threshold_exceeded']
        metric_used = 'p95'
        metric_value = stats['p95']
    
    if threshold_exceeded:
        # Log alert to terminal with clean formatting
        if not os.getenv('QUIET_METRICS', False):
            timestamp_str = datetime.now().strftime('%H:%M:%S')
            print("\n" + "🚨"*25)
            print(f"⚠️  CRITICAL P95 LATENCY ALERT [{timestamp_str}]")
            print("🚨"*25)
            print(f"   Current {metric_used.upper()}: {metric_value:.0f}ms")
            print(f"   Threshold: 2000ms (2.0s)")
            print(f"   Samples: {stats['count']} requests")
            print(f"   Status: EXCEEDS TARGET by {metric_value-2000:.0f}ms")
            print(f"   Action Required: Investigate performance bottlenecks")
            print("🚨"*25 + "\n")
        
        return {
            'alert': True,
            'p95_ms': metric_value,
            'threshold_ms': 2000,
            'count': stats['count'],
            'window_minutes': 10,
            'metric_used': metric_used,
            'message': f'{metric_used.upper()} latency ({metric_value:.0f}ms) exceeds 2.0s threshold in last 10 minutes'
        }
    
    return {
        'alert': False,
        'p95_ms': metric_value,
        'threshold_ms': 2000,
        'count': stats['count'],
        'window_minutes': 10,
        'message': f'{metric_used.upper()} latency ({metric_value:.0f}ms) is within 2.0s threshold'
    }


def generate_comprehensive_report(format="csv", time_window_hours=24, include_charts=True):
    """
    Generate comprehensive metrics report with cost, latency, accuracy KPIs.
    Returns report data and file paths for download.
    """
    import pandas as pd
    import json
    import os
    from datetime import datetime, timedelta
    
    # Ensure reports directory exists
    reports_dir = os.path.join(os.path.dirname(__file__), "..", "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    # Load and process metrics data
    cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
    
    try:
        # Read CSV metrics
        metrics_data = []
        if os.path.exists(METRICS_FILE):
            df = pd.read_csv(METRICS_FILE)
            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
            # Filter by time window
            df = df[df['timestamp'] > cutoff_time]
            metrics_data = df.to_dict('records')
    except Exception as e:
        metrics_data = []
    
    # Calculate KPIs
    kpis = _calculate_project_kpis(metrics_data, time_window_hours)
    
    # Generate timestamp for filenames
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if format == "csv":
        return _generate_csv_report(metrics_data, kpis, reports_dir, timestamp)
    else:  # notebook
        return _generate_notebook_report(metrics_data, kpis, reports_dir, timestamp, include_charts)


def _calculate_project_kpis(metrics_data, time_window_hours):
    """Calculate comprehensive KPIs from metrics data"""
    if not metrics_data:
        return {
            'summary': {
                'total_requests': 0,
                'avg_latency_ms': 0,
                'p95_latency_ms': 0,
                'accuracy_rate': 0,
                'total_cost': 0,
                'error_rate': 0
            },
            'details': {}
        }
    
    # Process metrics by event type
    search_events = [m for m in metrics_data if m.get('event') == 'search']
    mrr_events = [m for m in metrics_data if m.get('event') == 'mrr_evaluation']
    ingest_events = [m for m in metrics_data if m.get('event') == 'ingest']
    
    # Calculate latency stats
    search_latencies = [m.get('latency_ms', 0) for m in search_events if m.get('latency_ms')]
    
    # Calculate accuracy stats
    accuracy_scores = [m.get('accuracy', 0) for m in search_events + mrr_events if m.get('accuracy')]
    
    # Calculate costs (placeholder - implement based on your cost model)
    estimated_costs = _estimate_operation_costs(search_events, mrr_events, ingest_events)
    
    summary = {
        'time_window_hours': time_window_hours,
        'total_requests': len(search_events),
        'total_evaluations': len(mrr_events),
        'total_ingestions': len(ingest_events),
        'avg_latency_ms': sum(search_latencies) / len(search_latencies) if search_latencies else 0,
        'p95_latency_ms': sorted(search_latencies)[int(len(search_latencies) * 0.95)] if search_latencies else 0,
        'max_latency_ms': max(search_latencies) if search_latencies else 0,
        'min_latency_ms': min(search_latencies) if search_latencies else 0,
        'accuracy_rate': sum(accuracy_scores) / len(accuracy_scores) if accuracy_scores else 0,
        'total_estimated_cost': estimated_costs['total'],
        'cost_breakdown': estimated_costs['breakdown'],
        'error_rate': 0,  # Implement based on error tracking
        'throughput_per_hour': len(search_events) / max(time_window_hours, 1)
    }
    
    # Performance by search type
    search_by_type = {}
    for event in search_events:
        search_type = event.get('search_type', 'unknown')
        if search_type not in search_by_type:
            search_by_type[search_type] = []
        search_by_type[search_type].append(event)
    
    type_performance = {}
    for search_type, events in search_by_type.items():
        type_latencies = [e.get('latency_ms', 0) for e in events if e.get('latency_ms')]
        type_performance[search_type] = {
            'count': len(events),
            'avg_latency_ms': sum(type_latencies) / len(type_latencies) if type_latencies else 0,
            'p95_latency_ms': sorted(type_latencies)[int(len(type_latencies) * 0.95)] if type_latencies else 0
        }
    
    return {
        'summary': summary,
        'performance_by_type': type_performance,
        'hourly_breakdown': _calculate_hourly_breakdown(search_events, time_window_hours)
    }


def _estimate_operation_costs(search_events, mrr_events, ingest_events):
    """Estimate costs for different operations (placeholder implementation)"""
    # Cost model (adjust based on your actual costs)
    COST_PER_SEARCH = 0.001      # $0.001 per search
    COST_PER_MRR_EVAL = 0.01     # $0.01 per MRR evaluation  
    COST_PER_INGESTION = 0.05    # $0.05 per video ingestion
    
    search_cost = len(search_events) * COST_PER_SEARCH
    mrr_cost = len(mrr_events) * COST_PER_MRR_EVAL
    ingest_cost = len(ingest_events) * COST_PER_INGESTION
    
    return {
        'total': search_cost + mrr_cost + ingest_cost,
        'breakdown': {
            'search_operations': search_cost,
            'mrr_evaluations': mrr_cost,
            'video_ingestions': ingest_cost
        }
    }


def _calculate_hourly_breakdown(search_events, time_window_hours):
    """Calculate hourly performance breakdown"""
    if not search_events:
        return []
    
    hourly_data = {}
    for event in search_events:
        try:
            if 'timestamp' in event:
                hour = pd.to_datetime(event['timestamp']).floor('H')
                if hour not in hourly_data:
                    hourly_data[hour] = []
                hourly_data[hour].append(event)
        except:
            continue
    
    breakdown = []
    for hour in sorted(hourly_data.keys()):
        events = hourly_data[hour]
        latencies = [e.get('latency_ms', 0) for e in events if e.get('latency_ms')]
        
        breakdown.append({
            'hour': hour.isoformat(),
            'request_count': len(events),
            'avg_latency_ms': sum(latencies) / len(latencies) if latencies else 0,
            'p95_latency_ms': sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0
        })
    
    return breakdown


def _generate_csv_report(metrics_data, kpis, reports_dir, timestamp):
    """Generate CSV format metrics report"""
    import pandas as pd
    
    filename = f"metrics_report_{timestamp}.csv"
    filepath = os.path.join(reports_dir, filename)
    
    # Create comprehensive CSV with multiple sheets worth of data
    report_sections = []
    
    # Section 1: Summary KPIs
    summary_data = {
        'Metric': list(kpis['summary'].keys()),
        'Value': list(kpis['summary'].values())
    }
    summary_df = pd.DataFrame(summary_data)
    
    # Section 2: Performance by Type
    if kpis.get('performance_by_type'):
        type_data = []
        for search_type, perf in kpis['performance_by_type'].items():
            type_data.append({
                'Search_Type': search_type,
                'Request_Count': perf['count'],
                'Avg_Latency_ms': perf['avg_latency_ms'],
                'P95_Latency_ms': perf['p95_latency_ms']
            })
        type_df = pd.DataFrame(type_data)
    else:
        type_df = pd.DataFrame()
    
    # Section 3: Hourly Breakdown
    hourly_df = pd.DataFrame(kpis.get('hourly_breakdown', []))
    
    # Section 4: Raw Metrics Data
    raw_df = pd.DataFrame(metrics_data)
    
    # Combine all sections into one CSV
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        f.write("# LECTURE NAVIGATOR - METRICS REPORT\\n")
        f.write(f"# Generated: {datetime.now().isoformat()}\\n")
        f.write(f"# Time Window: {kpis['summary'].get('time_window_hours', 24)} hours\\n\\n")
        
        f.write("## SUMMARY KPIS\\n")
        summary_df.to_csv(f, index=False)
        f.write("\\n")
        
        if not type_df.empty:
            f.write("## PERFORMANCE BY SEARCH TYPE\\n") 
            type_df.to_csv(f, index=False)
            f.write("\\n")
        
        if not hourly_df.empty:
            f.write("## HOURLY BREAKDOWN\\n")
            hourly_df.to_csv(f, index=False) 
            f.write("\\n")
        
        if not raw_df.empty:
            f.write("## RAW METRICS DATA\\n")
            raw_df.to_csv(f, index=False)
    
    return {
        'file_path': filepath,
        'filename': filename,
        'summary': {
            'total_records': len(metrics_data),
            'time_window_hours': kpis['summary'].get('time_window_hours', 24),
            'sections': ['Summary KPIs', 'Performance by Type', 'Hourly Breakdown', 'Raw Data']
        }
    }


def _generate_notebook_report(metrics_data, kpis, reports_dir, timestamp, include_charts):
    """Generate Jupyter Notebook format metrics report with interactive charts"""
    filename = f"metrics_report_{timestamp}.ipynb"
    filepath = os.path.join(reports_dir, filename)
    
    # Build notebook content
    notebook_content = {
        "cells": [],
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python", 
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.8.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }
    
    # Add notebook cells
    notebook_content["cells"] = _create_notebook_cells(metrics_data, kpis, include_charts, timestamp)
    
    # Save notebook
    import json
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(notebook_content, f, indent=2, ensure_ascii=False, default=str)
    
    return {
        'file_path': filepath,
        'filename': filename,
        'summary': {
            'total_records': len(metrics_data),
            'time_window_hours': kpis['summary'].get('time_window_hours', 24),
            'includes_charts': include_charts,
            'cell_count': len(notebook_content["cells"])
        }
    }


def _create_notebook_cells(metrics_data, kpis, include_charts, timestamp):
    """Create Jupyter notebook cells with comprehensive metrics analysis"""
    cells = []
    
    # Title and Overview
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            f"# 📊 Lecture Navigator - Metrics Report\\n",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \\n",
            f"**Time Window:** {kpis['summary'].get('time_window_hours', 24)} hours  \\n",
            f"**Total Records:** {len(metrics_data)}\\n",
            "\\n",
            "## Executive Summary\\n",
            f"- **Total Requests:** {kpis['summary']['total_requests']:,}\\n",
            f"- **Average Latency:** {kpis['summary']['avg_latency_ms']:.1f}ms\\n", 
            f"- **P95 Latency:** {kpis['summary']['p95_latency_ms']:.1f}ms\\n",
            f"- **Accuracy Rate:** {kpis['summary']['accuracy_rate']:.1%}\\n",
            f"- **Estimated Total Cost:** ${kpis['summary']['total_estimated_cost']:.4f}\\n",
            f"- **Throughput:** {kpis['summary']['throughput_per_hour']:.1f} requests/hour\\n"
        ]
    })
    
    # Import libraries
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Import Required Libraries\\n",
            "import pandas as pd\\n",
            "import plotly.express as px\\n",
            "import plotly.graph_objects as go\\n",
            "from plotly.subplots import make_subplots\\n",
            "import numpy as np\\n",
            "from datetime import datetime, timedelta\\n",
            "import json\\n",
            "\\n",
            "print('📚 Libraries imported successfully!')"
        ]
    })
    
    # Load and display data
    cells.append({
        "cell_type": "code", 
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Load Metrics Data\\n",
            f"metrics_data = {json.dumps(metrics_data[:100], default=str)}  # First 100 records\\n",
            f"kpis = {json.dumps(kpis, default=str)}\\n",
            "\\n",
            "df = pd.DataFrame(metrics_data)\\n",
            "if not df.empty:\\n",
            "    df['timestamp'] = pd.to_datetime(df['timestamp'])\\n",
            "    print(f'📈 Loaded {len(df)} metrics records')\\n",
            "    print(f'📅 Date range: {df[\"timestamp\"].min()} to {df[\"timestamp\"].max()}')\\n",
            "else:\\n",
            "    print('⚠️ No metrics data available')\\n",
            "\\n",
            "# Display data summary\\n",
            "if not df.empty:\\n",
            "    print('\\n📊 Data Summary:')\\n",
            "    print(df.describe())"
        ]
    })
    
    if include_charts:
        # Latency Performance Chart
        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": ["## 🚀 Latency Performance Analysis"]
        })
        
        cells.append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Latency Performance Over Time\\n",
                "if not df.empty and 'latency_ms' in df.columns:\\n",
                "    search_df = df[df['event'] == 'search'].copy()\\n",
                "    \\n",
                "    if not search_df.empty:\\n",
                "        fig = make_subplots(\\n",
                "            rows=2, cols=2,\\n",
                "            subplot_titles=('Latency Over Time', 'Latency Distribution', \\n",
                "                          'Search Type Performance', 'Latency Percentiles'),\\n",
                "            specs=[[{'secondary_y': True}, {'type': 'histogram'}],\\n",
                "                   [{'type': 'bar'}, {'type': 'box'}]]\\n",
                "        )\\n",
                "        \\n",
                "        # Time series\\n",
                "        fig.add_trace(\\n",
                "            go.Scatter(x=search_df['timestamp'], y=search_df['latency_ms'],\\n",
                "                      mode='lines+markers', name='Latency',\\n",
                "                      line=dict(color='blue')), row=1, col=1\\n",
                "        )\\n",
                "        \\n",
                "        # Add P95 threshold line\\n",
                "        fig.add_hline(y=2000, line_dash='dash', line_color='red',\\n",
                "                     annotation_text='P95 Target (2.0s)', row=1, col=1)\\n",
                "        \\n",
                "        # Histogram\\n",
                "        fig.add_trace(\\n",
                "            go.Histogram(x=search_df['latency_ms'], name='Distribution',\\n",
                "                        marker_color='lightblue'), row=1, col=2\\n",
                "        )\\n",
                "        \\n",
                "        # Performance by search type\\n",
                "        if 'search_type' in search_df.columns:\\n",
                "            type_perf = search_df.groupby('search_type')['latency_ms'].agg(['mean', 'count']).reset_index()\\n",
                "            fig.add_trace(\\n",
                "                go.Bar(x=type_perf['search_type'], y=type_perf['mean'],\\n",
                "                      name='Avg Latency by Type',\\n",
                "                      marker_color='green'), row=2, col=1\\n",
                "            )\\n",
                "        \\n",
                "        # Box plot for percentiles\\n",
                "        fig.add_trace(\\n",
                "            go.Box(y=search_df['latency_ms'], name='Latency Distribution',\\n",
                "                  marker_color='orange'), row=2, col=2\\n",
                "        )\\n",
                "        \\n",
                "        fig.update_layout(height=800, showlegend=True,\\n",
                "                         title_text='🚀 Comprehensive Latency Analysis')\\n",
                "        fig.show()\\n",
                "    else:\\n",
                "        print('⚠️ No search events with latency data found')\\n",
                "else:\\n",
                "    print('⚠️ No latency data available for visualization')"
            ]
        })
        
        # Cost Analysis Chart
        cells.append({
            "cell_type": "markdown", 
            "metadata": {},
            "source": ["## 💰 Cost Analysis"]
        })
        
        cells.append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Cost Breakdown Visualization\\n",
                "cost_data = kpis['summary']['cost_breakdown']\\n",
                "\\n",
                "fig = make_subplots(\\n",
                "    rows=1, cols=2,\\n",
                "    specs=[[{'type': 'pie'}, {'type': 'bar'}]],\\n",
                "    subplot_titles=('Cost Distribution', 'Cost by Operation Type')\\n",
                ")\\n",
                "\\n",
                "# Pie chart\\n",
                "labels = list(cost_data.keys())\\n",
                "values = list(cost_data.values())\\n",
                "\\n",
                "fig.add_trace(\\n",
                "    go.Pie(labels=labels, values=values, name='Cost Distribution'),\\n",
                "    row=1, col=1\\n",
                ")\\n",
                "\\n",
                "# Bar chart\\n",
                "fig.add_trace(\\n",
                "    go.Bar(x=labels, y=values, name='Cost by Operation',\\n",
                "           marker_color=['#1f77b4', '#ff7f0e', '#2ca02c']),\\n",
                "    row=1, col=2\\n",
                ")\\n",
                "\\n",
                "fig.update_layout(height=500, showlegend=True,\\n",
                "                 title_text='💰 Cost Analysis Dashboard')\\n",
                "fig.show()\\n",
                "\\n",
                "# Cost summary table\\n",
                "cost_df = pd.DataFrame({\\n",
                "    'Operation Type': labels,\\n",
                "    'Cost ($)': values,\\n",
                "    'Percentage': [v/sum(values)*100 for v in values]\\n",
                "})\\n",
                "print('\\n💰 Cost Breakdown:')\\n",
                "print(cost_df.round(4))"
            ]
        })
        
        # Accuracy and Performance Metrics
        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": ["## 🎯 Accuracy & Performance Metrics"]
        })
        
        cells.append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# KPI Dashboard\\n",
                "fig = make_subplots(\\n",
                "    rows=2, cols=2,\\n",
                "    specs=[[{'type': 'indicator'}, {'type': 'indicator'}],\\n",
                "           [{'type': 'indicator'}, {'type': 'indicator'}]],\\n",
                "    subplot_titles=('P95 Latency', 'Accuracy Rate', 'Total Cost', 'Throughput')\\n",
                ")\\n",
                "\\n",
                f"p95_latency = {kpis['summary']['p95_latency_ms']}\\n",
                f"accuracy_rate = {kpis['summary']['accuracy_rate']}\\n", 
                f"total_cost = {kpis['summary']['total_estimated_cost']}\\n",
                f"throughput = {kpis['summary']['throughput_per_hour']}\\n",
                "\\n",
                "# P95 Latency indicator\\n",
                "fig.add_trace(go.Indicator(\\n",
                "    mode = 'gauge+number+delta',\\n",
                "    value = p95_latency,\\n",
                "    domain = {'x': [0, 1], 'y': [0, 1]},\\n",
                "    title = {'text': 'P95 Latency (ms)'},\\n",
                "    delta = {'reference': 2000},\\n",
                "    gauge = {'axis': {'range': [None, 5000]},\\n",
                "             'bar': {'color': 'darkblue'},\\n",
                "             'steps': [{'range': [0, 2000], 'color': 'lightgray'},\\n",
                "                      {'range': [2000, 5000], 'color': 'gray'}],\\n",
                "             'threshold': {'line': {'color': 'red', 'width': 4},\\n",
                "                          'thickness': 0.75, 'value': 2000}}),\\n",
                "    row=1, col=1)\\n",
                "\\n",
                "# Accuracy Rate indicator\\n",
                "fig.add_trace(go.Indicator(\\n",
                "    mode = 'gauge+number',\\n",
                "    value = accuracy_rate * 100,\\n",
                "    domain = {'x': [0, 1], 'y': [0, 1]},\\n",
                "    title = {'text': 'Accuracy Rate (%)'},\\n",
                "    gauge = {'axis': {'range': [None, 100]},\\n",
                "             'bar': {'color': 'green'},\\n",
                "             'steps': [{'range': [0, 50], 'color': 'lightgray'},\\n",
                "                      {'range': [50, 80], 'color': 'yellow'},\\n",
                "                      {'range': [80, 100], 'color': 'lightgreen'}]}),\\n",
                "    row=1, col=2)\\n",
                "\\n",
                "# Cost indicator\\n",
                "fig.add_trace(go.Indicator(\\n",
                "    mode = 'number',\\n",
                "    value = total_cost,\\n",
                "    title = {'text': 'Total Cost ($)'},\\n",
                "    number = {'prefix': '$', 'valueformat': '.4f'}),\\n",
                "    row=2, col=1)\\n",
                "\\n",
                "# Throughput indicator\\n",
                "fig.add_trace(go.Indicator(\\n",
                "    mode = 'number+delta',\\n",
                "    value = throughput,\\n",
                "    title = {'text': 'Throughput (req/hr)'},\\n",
                "    number = {'valueformat': '.1f'},\\n",
                "    delta = {'reference': 10}),\\n",
                "    row=2, col=2)\\n",
                "\\n",
                "fig.update_layout(height=600, title_text='🎯 Key Performance Indicators')\\n",
                "fig.show()"
            ]
        })
    
    # Summary and Recommendations
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 📋 Summary & Recommendations\\n",
            "\\n",
            "### Key Findings\\n",
            f"- **Performance Status:** {'✅ Healthy' if kpis['summary']['p95_latency_ms'] < 2000 else '⚠️ Needs Attention'}\\n",
            f"- **Cost Efficiency:** Estimated ${kpis['summary']['total_estimated_cost']:.4f} total cost\\n",
            f"- **System Throughput:** {kpis['summary']['throughput_per_hour']:.1f} requests/hour\\n",
            "\\n",
            "### Recommendations\\n",
            "- Monitor P95 latency to stay under 2.0s threshold\\n",
            "- Optimize high-cost operations for better efficiency\\n", 
            "- Consider scaling based on current throughput trends\\n",
            "- Implement additional accuracy tracking for comprehensive evaluation"
        ]
    })
    
    # Export data section
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": ["## 📤 Export Data"]
    })
    
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Export processed data\\n",
            f"export_timestamp = '{timestamp}'\\n",
            "\\n",
            "# Save summary KPIs\\n",
            "summary_df = pd.DataFrame([kpis['summary']])\\n",
            f"summary_df.to_csv(f'summary_kpis_{export_timestamp}.csv', index=False)\\n",
            "\\n",
            "# Save detailed metrics if available\\n",
            "if not df.empty:\\n",
            f"    df.to_csv(f'detailed_metrics_{export_timestamp}.csv', index=False)\\n",
            "    print(f'✅ Exported detailed metrics: detailed_metrics_{export_timestamp}.csv')\\n",
            "\\n",
            f"print(f'✅ Exported summary KPIs: summary_kpis_{export_timestamp}.csv')\\n",
            "print('\\n📊 Report generation completed successfully!')"
        ]
    })
    
    return cells
