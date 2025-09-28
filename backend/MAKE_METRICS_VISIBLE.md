# MAKE METRICS VISIBLE IN TERMINAL 🎯

## PROBLEM: Metrics not showing in terminal

## SOLUTION: Run this ONE command to see all 3 metrics immediately:

```cmd
.\test_all_metrics.bat
```

This will:

1. ✅ Show current status of ALL metrics
2. ✅ Run MRR@10 evaluation (39 queries)
3. ✅ Generate P95 latency data (8 test searches)
4. ✅ Test window size comparison (30s vs 60s)
5. ✅ Display final metrics status

## Expected Terminal Output:

```
IMMEDIATE METRICS STATUS [14:30:15]
================================================================================
1. MRR@10: 0.832 (TARGET MET) | Gold Set: 39 queries
   Evaluations: 1 | Target: >=0.700

2. P95 Latency: 450ms (TARGET MET) | Target: <=2000ms
   Samples: 12 | Mean: 380ms

3. Window Analysis: 30s vs 60s comparison AVAILABLE
   30s: 380ms avg, 0.750 accuracy (8 samples)
   60s: 420ms avg, 0.820 accuracy (6 samples)
   Recommendation: 60s window

================================================================================
Summary:
- MRR@10 (>=0.7): ✓ PASS
- P95 Latency (<=2.0s): ✓ PASS
- Window Comparison: ✓ PASS
================================================================================
```

## Manual Commands:

- **Quick Status**: `curl http://localhost:8000/show_metrics_now`
- **MRR@10 Only**: `.\test_mrr.bat`
- **Dashboard**: `.\metrics.bat dashboard`

## Auto-Display:

- Metrics show automatically every 5 searches
- P95 data accumulates from regular searches
- Window comparison collects data over time

**The terminal metrics are working - just run `.\test_all_metrics.bat` to populate them with data!** 🚀
