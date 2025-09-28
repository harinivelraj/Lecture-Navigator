#!/usr/bin/env python3
"""
Terminal Metrics Access Utility
Provides easy command-line access to comprehensive search metrics without affecting the main UI.

Usage:
    python terminal_metrics_access.py dashboard    # Show full dashboard
    python terminal_metrics_access.py mrr          # Run MRR@10 evaluation
    python terminal_metrics_access.py p95          # Show P95 latency status
    python terminal_metrics_access.py window       # Test window size comparison
    python terminal_metrics_access.py test <query> # Test both window sizes with a query
"""

import requests
import sys
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_separator(title=""):
    print("\n" + "="*60)
    if title:
        print(f"  {title}")
        print("="*60)

def show_dashboard():
    """Display the comprehensive metrics dashboard"""
    try:
        print_separator("COMPREHENSIVE METRICS DASHBOARD")
        
        # Trigger terminal dashboard print
        response = requests.post(f"{BASE_URL}/terminal_dashboard/print")
        if response.status_code == 200:
            print("Dashboard displayed in server terminal")
        
        # Also get the data for CLI display
        response = requests.get(f"{BASE_URL}/terminal_dashboard")
        if response.status_code == 200:
            data = response.json()["dashboard"]
            
            print_separator("DASHBOARD SUMMARY")
            health = data["overall_health"]
            print(f"System Status: {health['system_status']}")
            
            # P95 Latency Summary
            p95_data = data["p95_latency_monitoring"]
            if p95_data.get("sample_count", 0) > 0:
                p95 = p95_data.get("p95_latency_ms")
                status = "EXCELLENT" if p95 and p95 <= 1000 else "ACCEPTABLE" if p95 and p95 <= 2000 else "POOR"
                print(f"P95 Latency: {status} ({p95:.0f}ms) (target: <=2000ms)")
            else:
                print("P95 Latency: Collecting data...")
            
            # MRR Summary
            mrr_data = data["mrr_at_10_evaluation"]
            if mrr_data.get("current_mrr") is not None:
                mrr = mrr_data["current_mrr"]
                status = "EXCELLENT" if mrr >= 0.7 else "MODERATE" if mrr >= 0.5 else "POOR"
                target = "TARGET MET" if mrr >= 0.7 else "BELOW TARGET"
                print(f"MRR@10: {status} ({mrr:.3f}) ({target})")
            else:
                print("MRR@10: No evaluations yet")
            
            print_separator()
            
        else:
            print(f"Error fetching dashboard: {response.status_code}")
            
    except Exception as e:
        print(f"Dashboard error: {e}")

def run_mrr_evaluation():
    """Run MRR@10 evaluation"""
    try:
        print_separator("🎯 RUNNING MRR@10 EVALUATION")
        print("Evaluating search quality against gold set (39 queries)...")
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/evaluate_mrr", json={"search_type": "semantic", "k": 10})
        eval_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            mrr = data["mrr"]
            
            print(f"✅ EVALUATION COMPLETE ({eval_time:.1f}s)")
            print(f"MRR@10 Score: {mrr:.3f}")
            print(f"Target: ≥0.700 {'✅ MET' if mrr >= 0.7 else '❌ NOT MET'}")
            print(f"Queries: {data['total_queries']} total, {data['found_queries']} successful")
            print(f"Success Rate: {data['found_rate']*100:.1f}%")
            
            if mrr >= 0.7:
                print("🟢 EXCELLENT: Search quality meets professional standards")
            elif mrr >= 0.5:
                print("🟡 MODERATE: Search quality needs improvement")
            else:
                print("🔴 POOR: Significant search quality issues detected")
                
        else:
            print(f"❌ Error running MRR evaluation: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ MRR evaluation error: {e}")

def show_p95_status():
    """Show P95 latency monitoring status"""
    try:
        print_separator("⚡ P95 LATENCY MONITORING STATUS")
        
        response = requests.get(f"{BASE_URL}/p95_latency_status")
        if response.status_code == 200:
            data = response.json()
            stats = data["p95_monitoring"]
            
            if stats.get("sample_count", 0) > 0:
                p95 = stats.get("p95_latency_ms")
                threshold = data["threshold_ms"]
                
                status = "🟢 EXCELLENT" if p95 <= 1000 else "🟡 ACCEPTABLE" if p95 <= 2000 else "🔴 POOR"
                print(f"Current P95 Latency: {status} {p95:.0f}ms")
                print(f"Threshold: ≤{threshold}ms")
                print(f"Samples: {stats['sample_count']}")
                print(f"Mean: {stats.get('mean_latency_ms', 0):.0f}ms")
                print(f"Median: {stats.get('median_latency_ms', 0):.0f}ms")
                print(f"Range: {stats.get('min_latency_ms', 0):.0f}ms - {stats.get('max_latency_ms', 0):.0f}ms")
                
                if data["status"] == "alert":
                    print("🚨 ALERT: P95 latency threshold exceeded!")
                else:
                    print("✅ HEALTHY: P95 latency within acceptable range")
                    
            else:
                print("📊 Collecting initial latency data...")
                print("Perform some searches to populate P95 statistics")
                
        else:
            print(f"❌ Error fetching P95 status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ P95 status error: {e}")

def test_window_sizes(query="machine learning"):
    """Test window size comparison"""
    try:
        print_separator(f"🔬 WINDOW SIZE ABLATION TEST")
        print(f"Query: '{query}'")
        print("Testing 30s vs 60s window performance...")
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/test_window_sizes", json={
            "query": query,
            "test_both_sizes": True,
            "k": 10
        })
        test_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"✅ WINDOW COMPARISON COMPLETE ({test_time:.1f}s)")
            print_separator("RESULTS COMPARISON")
            
            w30 = data["comparison_results"]["30s_window"]
            w60 = data["comparison_results"]["60s_window"]
            
            print(f"30s Window:")
            print(f"  Latency: {w30['latency_ms']:.0f}ms")
            print(f"  Accuracy: {w30['accuracy']:.3f}")
            print(f"  Results: {w30['result_count']}")
            
            print(f"\n60s Window:")
            print(f"  Latency: {w60['latency_ms']:.0f}ms")
            print(f"  Accuracy: {w60['accuracy']:.3f}")
            print(f"  Results: {w60['result_count']}")
            
            print(f"\n🎯 RECOMMENDATION: {data['recommendation']} window")
            
            # Analysis
            latency_diff = w60['latency_ms'] - w30['latency_ms']
            accuracy_diff = w60['accuracy'] - w30['accuracy']
            
            print(f"\n📊 ANALYSIS:")
            print(f"  Latency Impact: {'🔴' if latency_diff > 500 else '🟡' if latency_diff > 100 else '🟢'} {latency_diff:+.0f}ms")
            print(f"  Accuracy Impact: {'🟢' if accuracy_diff > 0.1 else '🟡' if accuracy_diff > 0 else '🔴'} {accuracy_diff:+.3f}")
            
        else:
            print(f"❌ Error running window size test: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Window size test error: {e}")

def show_usage():
    """Show usage instructions"""
    print("""
TERMINAL METRICS ACCESS UTILITY
================================

Commands:
  dashboard    - Show comprehensive metrics dashboard
  mrr          - Run MRR@10 evaluation on gold set
  p95          - Show P95 latency monitoring status
  window       - Run window size ablation test
  test <query> - Test window sizes with custom query

Examples:
  python terminal_metrics_access.py dashboard
  python terminal_metrics_access.py mrr
  python terminal_metrics_access.py test "what is machine learning"

All metrics run in terminal without affecting the main search UI.
""")

def main():
    if len(sys.argv) < 2:
        show_usage()
        return
    
    command = sys.argv[1].lower()
    
    print(f"\nTERMINAL METRICS UTILITY [{datetime.now().strftime('%H:%M:%S')}]")
    
    if command == "dashboard":
        show_dashboard()
    elif command == "mrr":
        run_mrr_evaluation()
    elif command == "p95":
        show_p95_status()
    elif command == "window":
        test_window_sizes()
    elif command == "test":
        if len(sys.argv) > 2:
            query = " ".join(sys.argv[2:])
            test_window_sizes(query)
        else:
            test_window_sizes()
    else:
        print(f"Unknown command: {command}")
        show_usage()

if __name__ == "__main__":
    main()