import React from 'react';
import MRRGoldSetEvaluator from './MRRGoldSetEvaluator';
import LatencyP95Monitor from './LatencyP95Monitor';
import WindowSizeAblation from './WindowSizeAblation';

const PerformanceDashboard = () => {
  return (
    <div className="performance-dashboard" style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>Performance Dashboard</h2>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
          Key performance metrics for search system evaluation and monitoring
        </p>
      </div>

      {/* Performance Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #90caf9',
          borderRadius: '6px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#1565c0', fontWeight: 'bold' }}>
            🎯 MRR@10 Target
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            ≥ 0.7 on gold set (≥30 queries)
          </div>
        </div>

        <div style={{
          backgroundColor: '#e8f5e8',
          border: '1px solid #81c784',
          borderRadius: '6px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#2e7d32', fontWeight: 'bold' }}>
            ⚡ Latency Target
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            P95 ≤ 2.0s for search operations
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff3e0',
          border: '1px solid #ffb74d',
          borderRadius: '6px',
          padding: '15px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#f57c00', fontWeight: 'bold' }}>
            🔬 Ablation Study
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            30s vs 60s window comparison
          </div>
        </div>
      </div>

      {/* Main Components */}
      <div>
        {/* MRR Evaluation */}
        <MRRGoldSetEvaluator />

        {/* Latency Monitoring */}
        <LatencyP95Monitor />

        {/* Window Size Ablation */}
        <WindowSizeAblation />
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <strong>Performance Monitoring:</strong> This dashboard tracks the three key metrics for search system evaluation:
        <br />
        • <strong>MRR@10:</strong> Mean Reciprocal Rank for search relevance quality on annotated gold set
        <br />
        • <strong>P95 Latency:</strong> 95th percentile response time monitoring with 2.0s SLA threshold
        <br />
        • <strong>Window Ablation:</strong> Comparative analysis of monitoring window sizes (30s vs 60s) for optimal performance tracking
      </div>
    </div>
  );
};

export default PerformanceDashboard;