import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatLatency } from "../utils/latencyUtils";

const WindowSizeComparison = () => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/window_size_comparison');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setComparisonData(data);
    } catch (err) {
      console.error('Error fetching window size comparison:', err);
      setError(`Failed to load comparison data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisonData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchComparisonData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (exceeded) => {
    return exceeded ? '#dc3545' : '#28a745'; // Red if exceeded, green if OK
  };

  const getReliabilityColor = (reliability) => {
    switch (reliability) {
      case 'high': return '#28a745';
      case 'medium': return '#ffc107'; 
      case 'low': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading && !comparisonData) {
    return (
      <div className="window-comparison-container">
        <h2>⏱️ Window Size Comparison (Ablation Study)</h2>
        <div className="loading">Loading comparison data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="window-comparison-container">
        <h2>⏱️ Window Size Comparison (Ablation Study)</h2>
        <div className="error">Error: {error}</div>
        <button onClick={fetchComparisonData} className="btn-refresh">
          Try Again
        </button>
      </div>
    );
  }

  if (!comparisonData) {
    return null;
  }

  const { window_comparisons, insights, recommendation, ablation_study } = comparisonData;

  return (
    <div className="window-comparison-container">
      <div className="header">
        <h2>⏱️ Window Size Comparison (Ablation Study)</h2>
        <div className="controls">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh every 30s
          </label>
          <button onClick={fetchComparisonData} disabled={loading} className="btn-refresh">
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>

      <div className="study-description">
        <p><strong>Study:</strong> {ablation_study.description}</p>
        <p><strong>Focus:</strong> {ablation_study.focus}</p>
        <p><strong>Metrics:</strong> {ablation_study.metrics.join(', ')}</p>
      </div>

      <div className="comparison-grid">
        {Object.entries(window_comparisons).map(([windowName, stats]) => (
          <div key={windowName} className="window-card">
            <div className="window-header">
              <h3>{windowName}</h3>
              <span className="window-details">
                ({stats.window_seconds}s window)
              </span>
            </div>
            
            <div className="metrics">
              <div className="metric">
                <label>P95 Latency:</label>
                <span 
                  className="value"
                  style={{ color: getStatusColor(stats.threshold_exceeded) }}
                >
                  {formatLatency(stats.p95_ms)}
                  {stats.threshold_exceeded && ' ⚠️'}
                </span>
              </div>
              
              <div className="metric">
                <label>Mean Latency:</label>
                <span className="value">{formatLatency(stats.mean_ms)}</span>
              </div>
              
              <div className="metric">
                <label>P50 (Median):</label>
                <span className="value">{formatLatency(stats.p50_ms)}</span>
              </div>
              
              <div className="metric">
                <label>Max Latency:</label>
                <span className="value">{formatLatency(stats.max_ms)}</span>
              </div>
              
              <div className="metric">
                <label>Sample Count:</label>
                <span className="value">{stats.count}</span>
              </div>
              
              <div className="metric">
                <label>Stability Score:</label>
                <span className="value">{stats.stability_score.toFixed(3)}</span>
              </div>
              
              <div className="metric">
                <label>Sample Reliability:</label>
                <span 
                  className="value reliability"
                  style={{ color: getReliabilityColor(stats.sample_reliability) }}
                >
                  {stats.sample_reliability}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="insights-section">
        <h3>🔍 Analysis Insights</h3>
        {insights.map((insight, index) => (
          <div key={index} className="insight-card">
            {insight.comparison && (
              <div>
                <h4>{insight.comparison}</h4>
                <ul>
                  <li>P95 difference: {insight.p95_difference_ms}ms ({insight.p95_change_percent}%)</li>
                  <li>Stability difference: {insight.stability_difference}</li>
                  <li>Sample size difference: {insight.sample_size_difference}</li>
                </ul>
              </div>
            )}
            
            {insight.most_stable_window && (
              <div>
                <h4>Most Stable Window</h4>
                <p>
                  <strong>{insight.most_stable_window}</strong> with stability score of{' '}
                  <strong>{insight.stability_score}</strong> ({insight.sample_count} samples)
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="recommendation-section">
        <h3>💡 Recommendation</h3>
        <div className="recommendation-card">
          <div className="recommended-window">
            <strong>Recommended Window Size: {recommendation.recommended}</strong>
            {recommendation.score && <div className="score">Score: {recommendation.score}</div>}
          </div>
          
          {recommendation.reason && <p className="reason">{recommendation.reason}</p>}
          
          {recommendation.suggestion && (
            <div className="suggestion-box">
              <h4>💡 Suggestion:</h4>
              <p>{recommendation.suggestion}</p>
            </div>
          )}
          
          {recommendation.data_needed && (
            <div className="data-info">
              <p><strong>Data Requirements:</strong> {recommendation.data_needed}</p>
            </div>
          )}
          
          {recommendation.current_samples !== undefined && (
            <div className="sample-status">
              <p><strong>Current Samples:</strong> {recommendation.current_samples}</p>
              {recommendation.total_samples && (
                <p><strong>Total Samples:</strong> {recommendation.total_samples}</p>
              )}
            </div>
          )}
          
          {recommendation.confidence && (
            <div className="confidence-indicator">
              <span className={`confidence ${recommendation.confidence}`}>
                Confidence: {recommendation.confidence}
              </span>
            </div>
          )}
          
          {recommendation.all_scores && (
            <div className="top-scores">
              <h4>Top 3 Window Sizes:</h4>
              <ol>
                {recommendation.all_scores.map((score, index) => (
                  <li key={index}>
                    <strong>{score.window}</strong> (score: {score.score}) - 
                    Stability: {score.stability}, Samples: {score.samples}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WindowSizeComparison;