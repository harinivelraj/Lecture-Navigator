import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatLatency, getLatencyStatusColor } from "../utils/latencyUtils";

export default function LatencyMonitor() {
  const [latencyStats, setLatencyStats] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [windowMinutes, setWindowMinutes] = useState(60);

  const fetchLatencyData = async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes, alertRes] = await Promise.all([
        axios.get(`/latency_stats?window_minutes=${windowMinutes}`),
        axios.get(`/latency_trend?window_minutes=${windowMinutes}&bucket_minutes=5`),
        axios.get('/latency_alert')
      ]);
      
      setLatencyStats(statsRes.data);
      setTrendData(trendRes.data);
      setAlert(alertRes.data);
    } catch (e) {
      console.error("Error fetching latency data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatencyData();
  }, [windowMinutes]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchLatencyData, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, windowMinutes]);

  return (
    <div className="latency-monitor">
      <h3>🚀 Latency Monitoring (P95 ≤ 2.0s)</h3>
      
      <div className="latency-controls">
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="windowMinutes" style={{ marginRight: "8px" }}>Time Window:</label>
          <select 
            id="windowMinutes" 
            value={windowMinutes} 
            onChange={e => setWindowMinutes(parseInt(e.target.value))}
            disabled={loading}
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="240">4 hours</option>
            <option value="1440">24 hours</option>
          </select>
        </div>
        
        <div style={{ marginBottom: "15px" }}>
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Auto-refresh every 30s
          </label>
        </div>

        <button 
          onClick={fetchLatencyData} 
          disabled={loading}
          className="refresh-button"
        >
          {loading ? "Refreshing..." : "Refresh Now"}
        </button>
      </div>

      {alert && (
        <div className={`latency-alert ${alert.alert.alert ? 'alert-danger' : 'alert-success'}`}>
          <div className="alert-header">
            <span className="alert-icon">
              {alert.alert.alert ? "🚨" : "✅"}
            </span>
            <span className="alert-title">
              {alert.alert.alert ? "LATENCY ALERT" : "LATENCY OK"}
            </span>
          </div>
          <div className="alert-message">{alert.alert.message}</div>
          {alert.current_stats.count >= 1 && (
            <div className="alert-stats">
              Current: {alert.alert.metric_used ? alert.alert.metric_used.toUpperCase() : 'P95'}={formatLatency(alert.current_stats.p95_ms)}, 
              P50={formatLatency(alert.current_stats.p50_ms)}, 
              Count={alert.current_stats.count} (last {alert.current_stats.window_minutes}min)
              {alert.current_stats.count < 5 && (
                <span style={{color: '#856404', marginLeft: '10px'}}>
                  ⚠️ Using {alert.alert.metric_used || 'MAX'} latency (need ≥5 samples for reliable P95)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {latencyStats && (
        <div className="latency-stats">
          <h4>Current Statistics ({windowMinutes} min window)</h4>
          
          {latencyStats.latency_stats.count === 0 ? (
            <div className="no-data">
              No search requests in the selected time window. 
              Try searching for something to generate latency data.
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Request Count</div>
                  <div className="stat-value">{latencyStats.latency_stats.count}</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-label">Mean Latency</div>
                  <div className="stat-value">{formatLatency(latencyStats.latency_stats.mean)}</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-label">P50 (Median)</div>
                  <div className="stat-value">{formatLatency(latencyStats.latency_stats.p50)}</div>
                </div>
                
                <div className="stat-card p95-card">
                  <div className="stat-label">P95 Latency</div>
                  <div 
                    className="stat-value p95-value"
                    style={{ color: getLatencyStatusColor(latencyStats.latency_stats.p95) }}
                  >
                    {formatLatency(latencyStats.latency_stats.p95)}
                  </div>
                  <div className="threshold-info">
                    Target: ≤ 2.0s
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-label">P99 Latency</div>
                  <div className="stat-value">{formatLatency(latencyStats.latency_stats.p99)}</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-label">Max Latency</div>
                  <div className="stat-value">{formatLatency(latencyStats.latency_stats.max)}</div>
                </div>
              </div>

              <div className="performance-indicator">
                <div className="indicator-label">Performance Status:</div>
                <div className={`indicator-status ${latencyStats.status}`}>
                  {latencyStats.status === 'healthy' ? '✅ HEALTHY' : '⚠️ WARNING'}
                </div>
                {latencyStats.latency_stats.p95_threshold_exceeded && (
                  <div className="threshold-exceeded">
                    P95 latency exceeds 2.0s threshold!
                  </div>
                )}
                {latencyStats.latency_stats.count < 5 && latencyStats.latency_stats.max > 2000 && (
                  <div className="insufficient-data-warning">
                    ⚠️ High latency detected but need more samples for reliable P95
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {trendData && trendData.trend_data.length > 0 && (
        <div className="latency-trend">
          <h4>Latency Trend (5-minute buckets)</h4>
          <div className="trend-container">
            {trendData.trend_data.map((bucket, idx) => (
              <div key={idx} className="trend-bucket">
                <div className="bucket-time">
                  {new Date(bucket.timestamp).toLocaleTimeString()}
                </div>
                <div className="bucket-stats">
                  <div className="bucket-stat">
                    <span className="bucket-label">Count:</span>
                    <span className="bucket-value">{bucket.count}</span>
                  </div>
                  <div className="bucket-stat">
                    <span className="bucket-label">Mean:</span>
                    <span className="bucket-value">{formatLatency(bucket.mean)}</span>
                  </div>
                  <div className="bucket-stat">
                    <span className="bucket-label">P95:</span>
                    <span 
                      className={`bucket-value ${bucket.p95_exceeded ? 'exceeded' : ''}`}
                      style={{ color: getLatencyStatusColor(bucket.p95) }}
                    >
                      {formatLatency(bucket.p95)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="latency-info">
        <h4>About P95 Latency</h4>
        <p>
          <strong>P95 latency</strong> means 95% of requests complete within this time. 
          Our target is <strong>≤ 2.0 seconds</strong> for search requests.
        </p>
        <ul>
          <li><strong>Green:</strong> ≤ 1.4s (70% of threshold) - Excellent</li>
          <li><strong>Yellow:</strong> 1.4s - 1.8s (90% of threshold) - Good</li>
          <li><strong>Red:</strong> {'>'}1.8s - Needs attention</li>
        </ul>
      </div>
    </div>
  );
}