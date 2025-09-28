import React, { useState } from "react";
import axios from "axios";

export default function MRREvaluation() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("semantic");
  const [k, setK] = useState(10);

  const runEvaluation = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/evaluate_mrr", { 
        search_type: searchType,
        k: k 
      });
      setResults(res.data);
    } catch (e) {
      alert("Evaluation error: " + (e?.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score) => {
    return (score * 100).toFixed(2) + "%";
  };

  return (
    <div className="mrr-evaluation">
      <h3>MRR@K Evaluation</h3>
      <div className="evaluation-controls">
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="evalSearchType" style={{ marginRight: "8px" }}>Search Type:</label>
          <select 
            id="evalSearchType" 
            value={searchType} 
            onChange={e => setSearchType(e.target.value)}
            disabled={loading}
          >
            <option value="semantic">Semantic (Vector)</option>
            <option value="keyword">Keyword (BM25)</option>
          </select>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="evalK" style={{ marginRight: "8px" }}>K value:</label>
          <input
            id="evalK"
            type="number"
            min="1"
            max="50"
            value={k}
            onChange={e => setK(parseInt(e.target.value))}
            disabled={loading}
            style={{ width: "60px", padding: "4px" }}
          />
        </div>
        <button 
          onClick={runEvaluation} 
          disabled={loading}
          className="evaluation-button"
        >
          {loading ? "Running Evaluation..." : "Run MRR@" + k + " Evaluation"}
        </button>
      </div>

      {results && (
        <div className="evaluation-results">
          <div className="metrics-summary">
            <h4>Overall Metrics</h4>
            <div className="metric-grid">
              <div className="metric">
                <span className="metric-label">MRR@{results.k}:</span>
                <span className="metric-value main-score">{formatScore(results.mrr_at_k)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Coverage:</span>
                <span className="metric-value">{formatScore(results.coverage)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Total Queries:</span>
                <span className="metric-value">{results.total_queries}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Found Queries:</span>
                <span className="metric-value">{results.found_queries}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Evaluation Time:</span>
                <span className="metric-value">{results.evaluation_time_ms.toFixed(0)}ms</span>
              </div>
            </div>
          </div>

          <div className="detailed-results">
            <h4>Query Results</h4>
            <div className="query-results-container">
              {Object.entries(results.query_results).map(([query, result]) => (
                <div key={query} className={`query-result ${result.found ? 'found' : 'not-found'}`}>
                  <div className="query-header">
                    <span className="query-text">"{query}"</span>
                    <span className={`query-status ${result.found ? 'success' : 'failure'}`}>
                      {result.found ? '✓ Found' : '✗ Not Found'}
                    </span>
                  </div>
                  <div className="query-details">
                    <span className="expected-rank">Expected Rank: {result.expected_rank}</span>
                    {result.results && result.results.length > 0 && (
                      <span className="actual-results">
                        Found {result.results.length} result{result.results.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {result.error && (
                      <span className="error-message">Error: {result.error}</span>
                    )}
                  </div>
                  {result.results && result.results.length > 0 && (
                    <div className="top-results">
                      {result.results.slice(0, 3).map((res, idx) => (
                        <div key={idx} className="result-preview">
                          <span className="result-rank">#{res.rank}</span>
                          <span className="result-snippet">{res.snippet}</span>
                          <span className="result-score">({res.score?.toFixed(3)})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}