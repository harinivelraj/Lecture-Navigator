import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MRRGoldSetEvaluator = () => {
  const [mrrData, setMrrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState(null);

  const runMRREvaluation = async (searchType = 'semantic') => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/evaluate_mrr', {
        search_type: searchType,
        k: 10
      });
      setMrrData(response.data);
      setLastEvaluation(new Date().toLocaleString());
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        runMRREvaluation(mrrData?.search_type || 'semantic');
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, mrrData?.search_type]);

  return (
    <div className="mrr-gold-evaluator" style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      backgroundColor: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>MRR@10 Gold Set Evaluation</h3>
        <div>
          <label style={{ marginRight: '10px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Auto-refresh (30s)
          </label>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={() => runMRREvaluation('semantic')}
          disabled={loading}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Running...' : 'Run Semantic MRR@10'}
        </button>
        <button
          onClick={() => runMRREvaluation('keyword')}
          disabled={loading}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Running...' : 'Run Keyword MRR@10'}
        </button>
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

      {mrrData && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '15px'
          }}>
            <div style={{
              backgroundColor: mrrData.mrr >= 0.7 ? '#d4edda' : mrrData.mrr >= 0.5 ? '#fff3cd' : '#f8d7da',
              border: `1px solid ${mrrData.mrr >= 0.7 ? '#c3e6cb' : mrrData.mrr >= 0.5 ? '#ffeaa7' : '#f5c6cb'}`,
              borderRadius: '4px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                {mrrData.mrr.toFixed(3)}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>MRR@10 Score</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                {mrrData.mrr >= 0.7 ? '✅ Excellent' : mrrData.mrr >= 0.5 ? '⚠️ Good' : '❌ Needs Improvement'}
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                {mrrData.total_queries}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Total Queries</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                Gold Set Size: {mrrData.total_queries >= 30 ? '✅' : '❌'} {mrrData.total_queries >= 30 ? 'Sufficient' : 'Need ≥30'}
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                {mrrData.found_queries}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Found Queries</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                Coverage: {(mrrData.coverage * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                {mrrData.search_type.toUpperCase()}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Search Type</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                Eval Time: {mrrData.evaluation_time_ms.toFixed(0)}ms
              </div>
            </div>
          </div>

          {lastEvaluation && (
            <div style={{ fontSize: '12px', color: '#888', textAlign: 'right' }}>
              Last evaluation: {lastEvaluation}
            </div>
          )}
        </div>
      )}

      {!mrrData && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px'
        }}>
          <p>Click "Run MRR@10" to evaluate search performance on the gold set</p>
          <p style={{ fontSize: '14px', margin: '5px 0' }}>
            <strong>Goal:</strong> MRR@10 ≥ 0.7 on gold set with ≥30 query→timestamp pairs
          </p>
        </div>
      )}
    </div>
  );
};

export default MRRGoldSetEvaluator;