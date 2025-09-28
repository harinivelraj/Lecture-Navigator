import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MetricsDashboard = ({ isVisible }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) setRefreshing(true);
      setError(null);
      console.log('Fetching metrics from /dashboard_metrics...');
      
      // Add cache busting parameter for manual refresh
      const url = forceRefresh ? `/dashboard_metrics?t=${Date.now()}` : '/dashboard_metrics';
      const response = await axios.get(url);
      console.log('Metrics response:', response.data);
      
      if (response.data && response.data.metrics) {
        setMetrics(response.data.metrics);
        setLastUpdated(new Date());
        console.log('Metrics updated successfully');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(`Failed to load metrics data: ${err.message}`);
      setMetrics(null);
    } finally {
      setLoading(false);
      if (forceRefresh) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    fetchMetrics(true);
  };

  useEffect(() => {
    if (isVisible) {
      fetchMetrics();
      // Auto-refresh every 30 seconds when visible
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'collecting': return '⏳';
      default: return '⚪';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return '#28a745';
      case 'fail': return '#dc3545';
      case 'collecting': return '#ffc107';
      default: return '#6c757d';
    }
  };

  if (!isVisible) return null;

  if (loading && !metrics) {
    return (
      <div className="metrics-dashboard">
        <div className="metrics-header">
          <h2>📊 Performance Metrics & Tests</h2>
        </div>
        <div className="loading-spinner">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="metrics-dashboard">
        <div className="metrics-header">
          <h2>📊 Performance Metrics & Tests</h2>
        </div>
        <div className="error-message">
          {error}
          <button onClick={handleRefresh} className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="metrics-dashboard">
      <div className="metrics-header">
        <h2>📊 Performance Metrics & Tests</h2>
        <div className="metrics-controls">
          <button 
            onClick={handleRefresh} 
            className="refresh-button" 
            disabled={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="metrics-grid">
        {/* MRR@10 Metric */}
        <div className="metric-card">
          <div className="metric-header">
            <h3>{getStatusIcon(metrics?.mrr?.status)} MRR@10</h3>
            <div className="metric-status" style={{ color: getStatusColor(metrics?.mrr?.status) }}>
              {metrics?.mrr?.status?.toUpperCase()}
            </div>
          </div>
          <div className="metric-content">
            {metrics?.mrr?.evaluated ? (
              <>
                <div className="metric-value">
                  <span className="value">{metrics.mrr.score}</span>
                  <span className="target">/ {metrics.mrr.target} target</span>
                </div>
                <div className="metric-details">
                  <div>Gold set: {metrics.mrr.gold_set_size} queries</div>
                  <div>Evaluations: {metrics.mrr.evaluations_count}</div>
                  <div className="metric-description">
                    Mean Reciprocal Rank measures search relevance quality
                  </div>
                </div>
              </>
            ) : (
              <div className="metric-not-ready">
                <div>Not evaluated yet</div>
                <div className="metric-description">
                  Run MRR evaluation to get search quality metrics
                </div>
              </div>
            )}
          </div>
        </div>

        {/* P95 Latency Metric */}
        <div className="metric-card">
          <div className="metric-header">
            <h3>{getStatusIcon(metrics?.p95_latency?.status)} P95 Latency</h3>
            <div className="metric-status" style={{ color: getStatusColor(metrics?.p95_latency?.status) }}>
              {metrics?.p95_latency?.ready ? 
                (metrics.p95_latency.p95_latency_ms <= metrics.p95_latency.target_ms ? 'PASS' : 'FAIL') : 
                'COLLECTING'
              }
            </div>
          </div>
          <div className="metric-content">
            {metrics?.p95_latency?.ready ? (
              <>
                <div className="metric-value">
                  <span className="value">{Math.round(metrics.p95_latency.p95_latency_ms)}ms</span>
                  <span className="target">/ {metrics.p95_latency.target_ms}ms target</span>
                </div>
                <div className="metric-details">
                  <div>Mean: {Math.round(metrics.p95_latency.mean_latency_ms)}ms</div>
                  <div>Samples: {metrics.p95_latency.sample_count}</div>
                  <div className="metric-description">
                    95th percentile search response time
                  </div>
                </div>
              </>
            ) : (
              <div className="metric-not-ready">
                <div>Collecting data ({metrics?.p95_latency?.sample_count || 0}/5 minimum)</div>
                <div className="metric-description">
                  Perform more searches to accumulate latency data
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Window Size Comparison */}
        <div className="metric-card metric-card-wide">
          <div className="metric-header">
            <h3>{metrics?.window_comparison?.ready ? '✅' : '⏳'} Window Size Ablation</h3>
            <div className="metric-status" style={{ color: getStatusColor(metrics?.window_comparison?.ready ? 'pass' : 'collecting') }}>
              {metrics?.window_comparison?.ready ? 'READY' : 'COLLECTING'}
            </div>
          </div>
          <div className="metric-content">
            {metrics?.window_comparison?.ready ? (
              <div className="window-comparison">
                <div className="comparison-grid">
                  <div className="window-result">
                    <h4>30s Windows</h4>
                    <div className="window-stats">
                      <div>Latency: {metrics.window_comparison.comparison.window_30s.mean_latency_ms}ms</div>
                      <div>Accuracy: {metrics.window_comparison.comparison.window_30s.mean_accuracy}</div>
                      <div>Samples: {metrics.window_comparison.comparison.window_30s.sample_count}</div>
                    </div>
                  </div>
                  <div className="vs-separator">vs</div>
                  <div className="window-result">
                    <h4>60s Windows</h4>
                    <div className="window-stats">
                      <div>Latency: {metrics.window_comparison.comparison.window_60s.mean_latency_ms}ms</div>
                      <div>Accuracy: {metrics.window_comparison.comparison.window_60s.mean_accuracy}</div>
                      <div>Samples: {metrics.window_comparison.comparison.window_60s.sample_count}</div>
                    </div>
                  </div>
                </div>
                <div className="recommendation">
                  <strong>Recommended: </strong>
                  <span className="recommended-window">
                    {metrics.window_comparison.comparison.recommended} window size
                  </span>
                </div>
                <div className="metric-description">
                  Comparison of search performance with different window sizes
                </div>
              </div>
            ) : (
              <div className="metric-not-ready">
                <div>Collecting comparison data</div>
                <div className="metric-description">
                  Searches with different patterns needed for window size analysis
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overall Status Summary */}
      <div className="metrics-summary">
        <h3>📈 Overall Status</h3>
        <div className="status-grid">
          <div className={`status-item ${metrics?.overall?.mrr_pass ? 'status-pass' : 'status-pending'}`}>
            MRR@10: {metrics?.overall?.mrr_pass ? 'Target Met' : 'Needs Evaluation'}
          </div>
          <div className={`status-item ${metrics?.overall?.p95_pass ? 'status-pass' : 'status-pending'}`}>
            P95 Latency: {metrics?.overall?.p95_pass ? 'Under 2.0s' : 'Collecting Data'}
          </div>
          <div className={`status-item ${metrics?.overall?.window_ready ? 'status-pass' : 'status-pending'}`}>
            Window Analysis: {metrics?.overall?.window_ready ? 'Comparison Ready' : 'Collecting Data'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;