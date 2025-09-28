import React from 'react';

const RefreshTest = () => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const testRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/dashboard_metrics');
      const result = await response.json();
      setData(result);
      console.log('Refresh test successful:', result);
    } catch (error) {
      console.error('Refresh test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>🧪 Metrics API Test</h3>
      <button onClick={testRefresh} disabled={loading}>
        {loading ? 'Testing...' : 'Test Refresh'}
      </button>
      {data && (
        <div style={{ marginTop: '10px' }}>
          <p>✅ API Response: {data.status}</p>
          <p>📊 MRR Status: {data.metrics?.mrr?.status}</p>
          <p>⚡ P95 Status: {data.metrics?.p95_latency?.status}</p>
          <p>🔍 Window Ready: {data.metrics?.window_comparison?.ready ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
};

export default RefreshTest;