import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WindowSizeAblation = () => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState(null);

  const fetchComparisonData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/window_size_comparison');
      setComparisonData(response.data);
      setLastUpdate(new Date().toLocaleString());
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 60 seconds if enabled
  useEffect(() => {
    fetchComparisonData(); // Initial fetch
    
    if (autoRefresh) {
      const interval = setInterval(fetchComparisonData, 60000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getRecommendationColor = (recommendation) => {
    if (recommendation === '30s') return '#28a745';
    if (recommendation === '60s') return '#007bff';
    return '#6c757d';
  };

  const getRecommendationIcon = (recommendation) => {
    if (recommendation === '30s') return '⚡';
    if (recommendation === '60s') return '🎯';
    return '❓';
  };

  return (
    <div className="window-size-ablation" style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>Window Size Ablation Study</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Auto-refresh (60s)
          </label>
          <button
            onClick={fetchComparisonData}
            disabled={loading}
            style={{
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Refresh Analysis'}
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '12px',
        marginBottom: '15px',
        fontSize: '14px'
      }}>
        <strong>Ablation Study:</strong> Comparing 30s vs 60s window sizes for P95 latency monitoring.
        <br />
        <strong>Focus:</strong> Impact on stability, responsiveness, and sample count for performance analysis.
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {comparisonData && (
        <div>
          {/* Recommendation Box */}
          {comparisonData.recommendation && (
            <div style={{
              backgroundColor: getRecommendationColor(comparisonData.recommendation.recommended) + '20',
              border: `2px solid ${getRecommendationColor(comparisonData.recommendation.recommended)}`,
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>
                {getRecommendationIcon(comparisonData.recommendation.recommended)} 
                <strong> Recommended: {comparisonData.recommendation.recommended} window</strong>
              </div>
              <div style={{ fontSize: '14px', color: '#333' }}>
                {comparisonData.recommendation.reason}
              </div>
            </div>
          )}

          {/* Comparison Grid */}
          {comparisonData.window_comparisons && Object.keys(comparisonData.window_comparisons).length > 0 && (
            <div>
              <h4 style={{ marginBottom: '15px', color: '#333' }}>Window Size Comparison</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                marginBottom: '20px'
              }}>
                {Object.entries(comparisonData.window_comparisons).map(([windowSize, stats]) => (
                  <div key={windowSize} style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    padding: '15px'
                  }}>
                    <h5 style={{ 
                      margin: '0 0 10px 0', 
                      color: '#333',
                      textAlign: 'center',
                      fontSize: '18px'
                    }}>
                      {windowSize} Window
                    </h5>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                          {stats.p95_latency ? stats.p95_latency.toFixed(0) : 'N/A'}ms
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>P95 Latency</div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                          {stats.sample_count || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Samples</div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                          {stats.stability_score ? stats.stability_score.toFixed(2) : 'N/A'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Stability</div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                          {stats.responsiveness ? stats.responsiveness.toFixed(2) : 'N/A'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Responsiveness</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {comparisonData.insights && comparisonData.insights.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '10px', color: '#333' }}>Analysis Insights</h4>
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                padding: '15px'
              }}>
                {comparisonData.insights.map((insight, index) => (
                  <div key={index} style={{
                    marginBottom: insight.type === 'error' ? '10px' : '8px',
                    padding: insight.type === 'error' ? '8px' : '0',
                    backgroundColor: insight.type === 'error' ? '#f8d7da' : 'transparent',
                    borderRadius: insight.type === 'error' ? '4px' : '0',
                    color: insight.type === 'error' ? '#721c24' : '#333'
                  }}>
                    {insight.type === 'error' && '❌ '}
                    {insight.type === 'recommendation' && '💡 '}
                    {insight.type === 'observation' && '📊 '}
                    {insight.message || insight.error || insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study Metrics */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px', color: '#333' }}>Ablation Study Metrics</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
              fontSize: '12px'
            }}>
              <div style={{ backgroundColor: '#e9ecef', padding: '8px', borderRadius: '4px' }}>
                <strong>P95 Latency:</strong> 95th percentile response time
              </div>
              <div style={{ backgroundColor: '#e9ecef', padding: '8px', borderRadius: '4px' }}>
                <strong>Stability:</strong> Consistency of measurements
              </div>
              <div style={{ backgroundColor: '#e9ecef', padding: '8px', borderRadius: '4px' }}>
                <strong>Sample Count:</strong> Number of data points
              </div>
              <div style={{ backgroundColor: '#e9ecef', padding: '8px', borderRadius: '4px' }}>
                <strong>Responsiveness:</strong> Speed of anomaly detection
              </div>
            </div>
          </div>

          {lastUpdate && (
            <div style={{ fontSize: '12px', color: '#888', textAlign: 'right', marginTop: '15px' }}>
              Last analysis: {lastUpdate}
            </div>
          )}
        </div>
      )}

      {!comparisonData && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          <p><strong>Window Size Ablation Study</strong></p>
          <p style={{ fontSize: '14px', margin: '5px 0' }}>
            Comparing 30s vs 60s monitoring windows for optimal P95 latency tracking
          </p>
          <p style={{ fontSize: '12px', color: '#888' }}>
            Click "Refresh Analysis" to run the comparison study
          </p>
        </div>
      )}
    </div>
  );
};

export default WindowSizeAblation;