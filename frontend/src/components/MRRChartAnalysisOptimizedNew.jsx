import React, { useState, useCallback } from "react";
import axios from "axios";

export default function MRRChartAnalysisOptimized() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("keyword");
  const [k, setK] = useState(10);

  const runEvaluation = useCallback(async () => {
    setLoading(true);
    
    try {
      const res = await axios.post("/evaluate_mrr", { 
        search_type: searchType,
        k: Math.min(k, 10)
      }, {
        timeout: 7000
      });
      
      setResults(res.data);
      console.log('MRR evaluation completed');
      
    } catch (e) {
      alert("MRR Analysis error: " + (e?.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  }, [searchType, k]);

  return (
    <>
      <h3>MRR Analysis Tool</h3>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr auto", 
        gap: "15px", 
        alignItems: "end",
        marginBottom: "20px"
      }}>
        <div>
          <label>Search Type:</label>
          <select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
            <option value="keyword">Keyword Search</option>
            <option value="semantic">Semantic Search</option>
            <option value="hybrid">Hybrid Search</option>
          </select>
        </div>
        
        <div>
          <label>Top K Results:</label>
          <input
            type="number"
            value={k}
            onChange={(e) => setK(Math.max(1, Math.min(20, parseInt(e.target.value) || 10)))}
            min="1"
            max="20"
          />
        </div>
        
        <button onClick={runEvaluation} disabled={loading}>
          {loading ? "Evaluating..." : "Run Analysis"}
        </button>
      </div>
      
      {loading && (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
          🔄 Running MRR evaluation...
        </div>
      )}

      {results && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ 
            padding: "15px", 
            backgroundColor: "#f8f9fa", 
            borderRadius: "8px", 
            marginBottom: "20px" 
          }}>
            <h4>MRR Score: {results.mrr ? results.mrr.toFixed(3) : 'N/A'}</h4>
            <p>Total queries evaluated: {results.total_queries || 0}</p>
          </div>
          
          {results.query_results && (
            <div>
              <h4>Query Results (First 5)</h4>
              {Object.entries(results.query_results).slice(0, 5).map(([query, result], idx) => (
                <div key={idx} style={{ 
                  padding: "10px", 
                  backgroundColor: "#f8f9fa", 
                  marginBottom: "10px", 
                  borderRadius: "4px" 
                }}>
                  <strong>Query:</strong> {query.length > 50 ? query.substring(0, 50) + "..." : query}
                  <br />
                  <span style={{ color: result.found ? "green" : "red" }}>
                    Status: {result.found ? "✅ Found" : "❌ Not Found"}
                  </span>
                  <br />
                  Expected Rank: #{result.expected_rank} | Score: {result.reciprocal_rank !== undefined && result.reciprocal_rank !== null ? result.reciprocal_rank.toFixed(3) : '0.000'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {!results && !loading && (
        <div style={{ textAlign: "center", padding: "30px", color: "#999" }}>
          Click "Run Analysis" to evaluate MRR performance
        </div>
      )}
    </>
  );
}