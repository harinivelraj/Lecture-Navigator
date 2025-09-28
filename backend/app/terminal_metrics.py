import time
import statistics
import threading
from collections import deque
from datetime import datetime
from typing import List, Dict, Optional
import json
import os

def calculate_percentile(values: List[float], percentile: float) -> float:
    """
    Calculate percentile using compatible method for all Python versions.
    percentile should be between 0 and 1 (e.g., 0.95 for 95th percentile)
    """
    if not values:
        return 0.0
    
    sorted_values = sorted(values)
    index = int(percentile * len(sorted_values))
    if index >= len(sorted_values):
        index = len(sorted_values) - 1
    return sorted_values[index]

class P95LatencyMonitor:
    """Real-time P95 latency monitoring system"""
    
    def __init__(self, window_size_minutes: int = 10, alert_threshold_ms: int = 2000):
        self.window_size_minutes = window_size_minutes
        self.alert_threshold_ms = alert_threshold_ms
        self.latencies = deque()  # Store (timestamp, latency_ms) tuples
        self.lock = threading.Lock()
        self.last_alert_time = 0
        self.alert_cooldown_seconds = 300  # 5 minutes between alerts
        
    def record_latency(self, latency_ms: float):
        """Record a new latency measurement"""
        current_time = time.time()
        
        with self.lock:
            # Add new measurement
            self.latencies.append((current_time, latency_ms))
            
            # Remove old measurements outside the window
            cutoff_time = current_time - (self.window_size_minutes * 60)
            while self.latencies and self.latencies[0][0] < cutoff_time:
                self.latencies.popleft()
    
    def get_p95_latency(self) -> Optional[float]:
        """Calculate current P95 latency using compatible method"""
        with self.lock:
            if len(self.latencies) < 5:  # Need minimum samples
                return None
                
            latency_values = [lat for _, lat in self.latencies]
            return calculate_percentile(latency_values, 0.95)
    
    def check_alert(self) -> Optional[Dict]:
        """Check if P95 latency exceeds threshold"""
        p95 = self.get_p95_latency()
        if p95 is None:
            return None
            
        current_time = time.time()
        
        # Alert if threshold exceeded and not in cooldown
        if p95 > self.alert_threshold_ms and (current_time - self.last_alert_time) > self.alert_cooldown_seconds:
            self.last_alert_time = current_time
            return {
                "p95_latency_ms": p95,
                "threshold_ms": self.alert_threshold_ms,
                "sample_count": len(self.latencies),
                "window_minutes": self.window_size_minutes,
                "alert_time": datetime.fromtimestamp(current_time).isoformat()
            }
        
        return None
    
    def get_stats(self) -> Dict:
        """Get current latency statistics"""
        with self.lock:
            if not self.latencies:
                return {"sample_count": 0}
                
            latency_values = [lat for _, lat in self.latencies]
            return {
                "sample_count": len(latency_values),
                "mean_latency_ms": statistics.mean(latency_values),
                "median_latency_ms": statistics.median(latency_values),
                "p95_latency_ms": calculate_percentile(latency_values, 0.95) if len(latency_values) >= 5 else None,
                "max_latency_ms": max(latency_values),
                "min_latency_ms": min(latency_values),
                "window_minutes": self.window_size_minutes
            }


class WindowSizeComparator:
    """Compare search performance across different window sizes"""
    
    def __init__(self):
        self.results_30s = deque(maxlen=100)  # Store recent results for 30s windows
        self.results_60s = deque(maxlen=100)  # Store recent results for 60s windows
        self.lock = threading.Lock()
    
    def record_result(self, window_size_seconds: int, query: str, latency_ms: float, accuracy: float):
        """Record a search result for a specific window size"""
        result = {
            "timestamp": time.time(),
            "query": query,
            "latency_ms": latency_ms,
            "accuracy": accuracy,
            "window_size_seconds": window_size_seconds
        }
        
        with self.lock:
            if window_size_seconds == 30:
                self.results_30s.append(result)
            elif window_size_seconds == 60:
                self.results_60s.append(result)
    
    def get_comparison_stats(self) -> Dict:
        """Get comparative statistics between window sizes"""
        with self.lock:
            if not self.results_30s or not self.results_60s:
                return {"error": "Insufficient data for comparison"}
            
            # Calculate stats for 30s window
            latencies_30s = [r["latency_ms"] for r in self.results_30s]
            accuracies_30s = [r["accuracy"] for r in self.results_30s if r["accuracy"] is not None]
            
            # Calculate stats for 60s window
            latencies_60s = [r["latency_ms"] for r in self.results_60s]
            accuracies_60s = [r["accuracy"] for r in self.results_60s if r["accuracy"] is not None]
            
            stats_30s = {
                "window_size": "30s",
                "sample_count": len(self.results_30s),
                "mean_latency_ms": statistics.mean(latencies_30s) if latencies_30s else 0,
                "median_latency_ms": statistics.median(latencies_30s) if latencies_30s else 0,
                "p95_latency_ms": calculate_percentile(latencies_30s, 0.95) if len(latencies_30s) >= 5 else None,
                "mean_accuracy": statistics.mean(accuracies_30s) if accuracies_30s else 0,
                "median_accuracy": statistics.median(accuracies_30s) if accuracies_30s else 0
            }
            
            stats_60s = {
                "window_size": "60s",
                "sample_count": len(self.results_60s),
                "mean_latency_ms": statistics.mean(latencies_60s) if latencies_60s else 0,
                "median_latency_ms": statistics.median(latencies_60s) if latencies_60s else 0,
                "p95_latency_ms": calculate_percentile(latencies_60s, 0.95) if len(latencies_60s) >= 5 else None,
                "mean_accuracy": statistics.mean(accuracies_60s) if accuracies_60s else 0,
                "median_accuracy": statistics.median(accuracies_60s) if accuracies_60s else 0
            }
            
            # Calculate improvements
            latency_improvement = ((stats_30s["mean_latency_ms"] - stats_60s["mean_latency_ms"]) / stats_30s["mean_latency_ms"] * 100) if stats_30s["mean_latency_ms"] > 0 else 0
            accuracy_improvement = ((stats_60s["mean_accuracy"] - stats_30s["mean_accuracy"]) / stats_30s["mean_accuracy"] * 100) if stats_30s["mean_accuracy"] > 0 else 0
            
            return {
                "comparison_timestamp": datetime.now().isoformat(),
                "window_30s": stats_30s,
                "window_60s": stats_60s,
                "analysis": {
                    "latency_improvement_60s_vs_30s_percent": latency_improvement,
                    "accuracy_improvement_60s_vs_30s_percent": accuracy_improvement,
                    "recommended_window": "60s" if accuracy_improvement > 10 and latency_improvement > -20 else "30s",
                    "trade_off_analysis": "60s provides better accuracy" if accuracy_improvement > 0 else "30s provides better speed"
                }
            }


class TerminalMetricsDashboard:
    """Comprehensive metrics dashboard for terminal monitoring"""
    
    def __init__(self):
        self.p95_monitor = P95LatencyMonitor()
        self.window_comparator = WindowSizeComparator()
        self.mrr_history = deque(maxlen=20)  # Store recent MRR@10 scores
        self.lock = threading.Lock()
    
    def record_search_performance(self, query: str, latency_ms: float, accuracy: float, window_size_seconds: int = 30):
        """Record a search performance measurement"""
        # Record for P95 monitoring
        self.p95_monitor.record_latency(latency_ms)
        
        # Record for window size comparison
        self.window_comparator.record_result(window_size_seconds, query, latency_ms, accuracy)
        
        # Check for P95 alerts
        alert = self.p95_monitor.check_alert()
        if alert:
            from .metrics import log_metric
            log_metric(
                event='latency_alert',
                url_or_filename='p95_monitoring',
                latency_ms=alert["p95_latency_ms"],
                extra=f"P95={alert['p95_latency_ms']:.0f}ms (threshold={alert['threshold_ms']}ms)"
            )
    
    def record_mrr_evaluation(self, mrr_score: float, query_count: int):
        """Record an MRR@10 evaluation result"""
        with self.lock:
            self.mrr_history.append({
                "timestamp": time.time(),
                "mrr_score": mrr_score,
                "query_count": query_count
            })
    
    def get_comprehensive_dashboard(self) -> Dict:
        """Get complete metrics dashboard data"""
        p95_stats = self.p95_monitor.get_stats()
        window_comparison = self.window_comparator.get_comparison_stats()
        
        with self.lock:
            mrr_stats = {
                "recent_scores": list(self.mrr_history),
                "current_mrr": self.mrr_history[-1]["mrr_score"] if self.mrr_history else None,
                "target_threshold": 0.7,
                "target_met": self.mrr_history[-1]["mrr_score"] >= 0.7 if self.mrr_history else False
            }
        
        return {
            "dashboard_timestamp": datetime.now().isoformat(),
            "p95_latency_monitoring": p95_stats,
            "mrr_at_10_evaluation": mrr_stats,
            "window_size_comparison": window_comparison,
            "overall_health": {
                "p95_latency_healthy": p95_stats.get("p95_latency_ms", 0) <= 2000 if p95_stats.get("p95_latency_ms") else True,
                "mrr_target_met": mrr_stats["target_met"],
                "system_status": "HEALTHY" if (p95_stats.get("p95_latency_ms", 0) <= 2000 if p95_stats.get("p95_latency_ms") else True) and mrr_stats["target_met"] else "NEEDS_ATTENTION"
            }
        }
    
    def print_terminal_dashboard(self):
        """Print comprehensive dashboard to terminal (NO EMOJIS)"""
        dashboard = self.get_comprehensive_dashboard()
        timestamp = datetime.now().strftime('%H:%M:%S')
        
        print("\n" + "="*60)
        print(f"COMPREHENSIVE METRICS DASHBOARD [{timestamp}]")
        print("="*60)
        
        # P95 Latency Section
        p95_data = dashboard["p95_latency_monitoring"]
        if p95_data.get("sample_count", 0) > 0:
            p95_latency = p95_data.get("p95_latency_ms")
            p95_status = "EXCELLENT" if p95_latency and p95_latency <= 1000 else "ACCEPTABLE" if p95_latency and p95_latency <= 2000 else "POOR"
            
            print(f"P95 LATENCY MONITORING:")
            print(f"   Current P95: {p95_status} {p95_latency:.0f}ms" if p95_latency else "   Current P95: Collecting data...")
            print(f"   Target: <= 2000ms | Samples: {p95_data['sample_count']}")
            print(f"   Mean: {p95_data.get('mean_latency_ms', 0):.0f}ms | Median: {p95_data.get('median_latency_ms', 0):.0f}ms")
        else:
            print(f"P95 LATENCY MONITORING: Collecting initial data...")
        
        # MRR@10 Section
        mrr_data = dashboard["mrr_at_10_evaluation"]
        current_mrr = mrr_data.get("current_mrr")
        if current_mrr is not None:
            mrr_status = "EXCELLENT" if current_mrr >= 0.7 else "MODERATE" if current_mrr >= 0.5 else "POOR"
            target_status = "TARGET MET" if current_mrr >= 0.7 else "BELOW TARGET"
            
            print(f"MRR@10 EVALUATION:")
            print(f"   Current Score: {mrr_status} {current_mrr:.3f} ({target_status})")
            print(f"   Target: >= 0.700 | Evaluations: {len(mrr_data['recent_scores'])}")
        else:
            print(f"MRR@10 EVALUATION: No evaluations yet - run /evaluate_mrr")
        
        # Window Size Comparison Section
        window_data = dashboard["window_size_comparison"]
        if "error" not in window_data:
            w30 = window_data["window_30s"]
            w60 = window_data["window_60s"]
            analysis = window_data["analysis"]
            
            print(f"WINDOW SIZE ABLATION:")
            print(f"   30s Window: {w30['mean_latency_ms']:.0f}ms avg, {w30['mean_accuracy']:.3f} accuracy ({w30['sample_count']} samples)")
            print(f"   60s Window: {w60['mean_latency_ms']:.0f}ms avg, {w60['mean_accuracy']:.3f} accuracy ({w60['sample_count']} samples)")
            print(f"   Recommendation: {analysis['recommended_window']} - {analysis['trade_off_analysis']}")
        else:
            print(f"WINDOW SIZE ABLATION: Collecting comparison data...")
        
        # Overall Health
        health = dashboard["overall_health"]
        print(f"SYSTEM HEALTH: {health['system_status']}")
        
        print("="*60 + "\n")

# Global dashboard instance
terminal_dashboard = TerminalMetricsDashboard()