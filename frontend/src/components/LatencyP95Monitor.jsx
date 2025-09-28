import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LatencyP95Monitor = () => {
  const [latencyData, setLatencyData] = useState(null);
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10); // seconds
  const [error, setError] = useState(null);

  const THRESHOLD_MS = 2000; // 2.0s threshold

  const fetchLatencyData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both latency stats and alert status
      const [statsResponse, alertResponse] = await Promise.all([
        axios.get('/latency_stats?window_minutes=10'),
        axios.get('/latency_alert')
      ]);
      
      setLatencyData(statsResponse.data.latency_stats);
      setAlertData(alertResponse.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data
  useEffect(() => {
    fetchLatencyData(); // Initial fetch
    
    if (autoRefresh) {
      const interval = setInterval(fetchLatencyData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (p95Value) => {
    if (p95Value <= THRESHOLD_MS) return '#28a745'; // Green
    if (p95Value <= THRESHOLD_MS * 1.2) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getStatusText = (p95Value) => {
    if (p95Value <= THRESHOLD_MS) return '✅ Within Target';
    if (p95Value <= THRESHOLD_MS * 1.2) return '⚠️ Close to Limit'; 
    return '❌ Exceeds Target';
  };

  return (
    <div className="latency-p95-monitor" style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>P95 Latency Monitor</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            style={{ padding: '4px', fontSize: '12px' }}
          >
            <option value={5}>5s refresh</option>
            <option value={10}>10s refresh</option>
            <option value={30}>30s refresh</option>
            <option value={60}>60s refresh</option>
          </select>
          <label style={{ fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchLatencyData}
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
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
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

      {alertData?.alert?.alert && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '15px',
          fontWeight: 'bold'
        }}>
          🚨 <strong>LATENCY ALERT:</strong> {alertData.alert.message}
        </div>
      )}

      {latencyData && (
        <div>
          {/* Main P95 Display */}
          <div style={{
            backgroundColor: getStatusColor(latencyData.p95) + '20',
            border: `2px solid ${getStatusColor(latencyData.p95)}`,
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '15px'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: getStatusColor(latencyData.p95) }}>
              {latencyData.p95.toFixed(0)}ms
            </div>
            <div style={{ fontSize: '16px', color: '#333', marginBottom: '5px' }}>
              P95 Latency (10-minute window)
            </div>
            <div style={{ fontSize: '14px', color: getStatusColor(latencyData.p95), fontWeight: 'bold' }}>
              {getStatusText(latencyData.p95)}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Target: ≤ {THRESHOLD_MS}ms (≤ 2.0s)
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '15px'
          }}>
            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                {latencyData.p50.toFixed(0)}ms
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>P50 (Median)</div>
            </div>

            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                {latencyData.mean.toFixed(0)}ms
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Mean</div>
            </div>

            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                {latencyData.count}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Samples</div>
            </div>

            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                {latencyData.window_minutes}min
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Window</div>
            </div>
          </div>

          {/* Progress Bar for P95 vs Threshold */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '5px' }}>
              P95 vs 2.0s Threshold
            </div>
            <div style={{
              width: '100%',
              height: '20px',
              backgroundColor: '#e9ecef',
              borderRadius: '10px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min((latencyData.p95 / THRESHOLD_MS) * 100, 100)}%`,
                height: '100%',
                backgroundColor: getStatusColor(latencyData.p95),
                borderRadius: '10px',
                transition: 'all 0.3s ease'
              }} />
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#fff',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
              }}>
                {((latencyData.p95 / THRESHOLD_MS) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#888', textAlign: 'right' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}

      {!latencyData && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          <p>Monitoring P95 search latency</p>
          <p style={{ fontSize: '14px', margin: '5px 0' }}>
            <strong>Target:</strong> P95 ≤ 2.0s for search operations
          </p>
          <p style={{ fontSize: '12px', color: '#888' }}>
            Click refresh to load current metrics
          </p>
        </div>
      )}
    </div>
  );
};

export default LatencyP95Monitor;