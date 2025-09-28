import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

export default function MRRChartAnalysis() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("keyword");
  const [k, setK] = useState(10);
  const [lastEvalKey, setLastEvalKey] = useState("");  // Cache key for avoiding duplicate runs

  // PERFORMANCE: Memoized evaluation function to prevent unnecessary re-renders
  const runEvaluation = useCallback(async () => {
    const evalKey = `${searchType}_${k}`;
    if (evalKey === lastEvalKey && results) {
      // Skip if same evaluation already done
      return;
    }
    
    setLoading(true);
    const startTime = performance.now();
    
    try {
      // PERFORMANCE: Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const res = await axios.post("/evaluate_mrr", { 
        search_type: searchType,
        k: Math.min(k, 10) // Cap at 10 for performance
      }, {
        timeout: 7000, // Axios timeout
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setResults(res.data);
      setLastEvalKey(evalKey);
      
      const loadTime = performance.now() - startTime;
      console.log(`MRR evaluation completed in ${loadTime.toFixed(0)}ms`);
      
    } catch (e) {
      if (e.name === 'AbortError') {
        alert("MRR Analysis timed out. Please try again with fewer queries.");
      } else {
        alert("MRR Analysis error: " + (e?.response?.data?.detail || e.message));
      }
    } finally {
      setLoading(false);
    }
  }, [searchType, k, lastEvalKey, results]);

  const getMRRLevel = useCallback((mrr) => {
    if (mrr >= 0.8) return { level: "Excellent", color: "#22c55e", bgColor: "#dcfce7" };
    if (mrr >= 0.6) return { level: "Good", color: "#3b82f6", bgColor: "#dbeafe" };
    if (mrr >= 0.4) return { level: "Fair", color: "#f59e0b", bgColor: "#fef3c7" };
    return { level: "Poor", color: "#ef4444", bgColor: "#fee2e2" };
  }, []);

  // PERFORMANCE: Memoized error analysis to avoid recalculating on every render
  const errorAnalysis = useMemo(() => {
    if (!results?.query_results) return { errors: [], nearMisses: [] };
    
    const errors = [];
    const nearMisses = [];
    
    // PERFORMANCE: Limit processing to first 15 query results for speed
    const limitedResults = Object.entries(results.query_results).slice(0, 15);
    
    limitedResults.forEach(([query, result]) => {
      if (!result.found) {
        errors.push({
          type: "Not Found",
          query: query.length > 30 ? query.substring(0, 30) + "..." : query, // Truncate long queries
          expected: result.expected_rank,
          actual: "No results",
          issue: "Query returned no results"
        });
      } else if (result.results.length > 0) {
        const firstResult = result.results[0];
        if (firstResult.rank > result.expected_rank) {
          const rankDiff = firstResult.rank - result.expected_rank;
          if (rankDiff <= 3) {
            nearMisses.push({
              type: "Near Miss",
              query: query.length > 30 ? query.substring(0, 30) + "..." : query,
              expected: result.expected_rank,
              actual: firstResult.rank,
              difference: rankDiff,
              issue: `Expected rank ${result.expected_rank}, got rank ${firstResult.rank}`
            });
          } else {
            errors.push({
              type: "Poor Ranking",
              query: query.length > 30 ? query.substring(0, 30) + "..." : query,
              expected: result.expected_rank,
              actual: firstResult.rank,
              difference: rankDiff,
              issue: `Ranked lower than expected (${rankDiff} positions off)`
            });
          }
        }
      }
    });

    return { errors, nearMisses };
  }, [results?.query_results]);

  // PERFORMANCE: Memoized chart component to prevent unnecessary re-renders
  const renderMRRChart = useMemo(() => {
    if (!results) return null;

    const mrrLevel = getMRRLevel(results.mrr);
    
    return (
      <div className="analysis-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          color: '#1f2937', 
          fontSize: '18px', 
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 MRR Performance Analysis
        </h3>
        
        <div className="mrr-summary" style={{
          padding: '15px',
          backgroundColor: mrrLevel.bgColor,
          borderRadius: '8px',
          border: `1px solid ${mrrLevel.color}20`,
          marginBottom: '15px'
        }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: mrrLevel.color,
            marginBottom: '5px'
          }}>
            {results.mrr.toFixed(3)}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            marginBottom: '5px'
          }}>
            Mean Reciprocal Rank: {mrrLevel.level}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            {results.total_queries || 0} queries evaluated
          </div>
        </div>
      </div>
    );
  }, [results, getMRRLevel]);

  // PERFORMANCE: Memoized error analysis component
  const renderErrorAnalysis = useMemo(() => {
    if (!results?.query_results) return null;
    
    const { errors, nearMisses } = errorAnalysis;
    
    return (
      <div className="error-analysis" style={{ marginTop: "20px" }}>
        <h4>Error Analysis & Near Misses</h4>
        
        {/* Summary Stats */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(3, 1fr)", 
          gap: "10px",
          marginBottom: "20px"
        }}>
          <div style={{
            padding: "12px",
            backgroundColor: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ef4444" }}>
              {errors.length}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Errors
            </div>
          </div>
          
          <div style={{
            padding: "12px",
            backgroundColor: "#fffbeb",
            borderRadius: "8px",
            border: "1px solid #fde68a"
          }}>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f59e0b" }}>
              {nearMisses.length}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Near Misses
            </div>
          </div>
          
          <div style={{
            padding: "12px",
            backgroundColor: "#f0f9ff",
            borderRadius: "8px",
            border: "1px solid #bae6fd"
          }}>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#3b82f6" }}>
              {((results?.total_queries || 0) - errors.length - nearMisses.length)}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Perfect Results
            </div>
          </div>
        </div>

        {/* Error Details */}
        {errors.length > 0 && (
          <div style={{ marginBottom: "15px" }}>
            <h5 style={{ color: "#ef4444", marginBottom: "10px" }}>
              🔴 Critical Issues ({errors.length})
            </h5>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {errors.slice(0, 10).map((error, idx) => (
                <div key={idx} style={{
                  padding: "8px",
                  backgroundColor: "#fef2f2",
                  borderRadius: "6px",
                  border: "1px solid #fecaca",
                  marginBottom: "5px",
                  fontSize: "14px"
                }}>
                  <strong>{error.type}:</strong> {error.issue}
                  <br />
                  <span style={{ color: "#6b7280" }}>
                    Query: "{error.query}"
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Near Miss Details */}
        {nearMisses.length > 0 && (
          <div>
            <h5 style={{ color: "#f59e0b", marginBottom: "10px" }}>
              🟡 Near Misses ({nearMisses.length})
            </h5>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {nearMisses.slice(0, 10).map((miss, idx) => (
                <div key={idx} style={{
                  padding: "8px",
                  backgroundColor: "#fffbeb",
                  borderRadius: "6px",
                  border: "1px solid #fde68a",
                  marginBottom: "5px",
                  fontSize: "14px"
                }}>
                  <strong>Rank Difference: +{miss.difference}</strong>
                  <br />
                  Expected #{miss.expected}, got #{miss.actual}
                  <br />
                  <span style={{ color: "#6b7280" }}>
                    Query: "{miss.query}"
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [results?.query_results, errorAnalysis]);

  // PERFORMANCE: Memoized detailed results component
  const renderDetailedResults = useMemo(() => {
    if (!results?.query_results) return null;

    // PERFORMANCE: Limit detailed results display to first 10 queries
    const limitedResults = Object.entries(results.query_results).slice(0, 10);

    return (
      <div className="detailed-results" style={{ marginTop: "20px" }}>
        <h4>Query Results (First 10)</h4>
        <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          {limitedResults.map(([query, result], idx) => (
            <div key={idx} style={{
              padding: "12px",
              borderBottom: idx < limitedResults.length - 1 ? "1px solid #f3f4f6" : "none",
              backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#ffffff"
            }}>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: "bold", 
                marginBottom: "5px",
                color: "#1f2937"
              }}>
                Query: {query.length > 50 ? query.substring(0, 50) + "..." : query}
              </div>
              
              <div style={{ 
                fontSize: "12px", 
                color: result.found ? "#059669" : "#dc2626",
                marginBottom: "5px"
              }}>
                Status: {result.found ? "✅ Found" : "❌ Not Found"} | 
                Expected Rank: #{result.expected_rank} | 
                Score: {result.reciprocal_rank.toFixed(3)}
              </div>
              
              {result.results.length > 0 && (
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  Top Result: Rank #{result.results[0].rank} - 
                  {result.results[0].text.length > 80 ? 
                    result.results[0].text.substring(0, 80) + "..." : 
                    result.results[0].text}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {Object.keys(results.query_results).length > 10 && (
          <div style={{ 
            textAlign: "center", 
            padding: "10px", 
            fontSize: "12px", 
            color: "#6b7280",
            fontStyle: "italic"
          }}>
            Showing first 10 of {Object.keys(results.query_results).length} query results
          </div>
        )}
      </div>
    );
  }, [results?.query_results]);

  return (
    <div style={{ padding: "0", margin: "0" }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ 
          color: "#1f2937", 
          fontSize: "18px", 
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🧪 MRR Analysis Tool
        </h3>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr auto", 
          gap: "15px", 
          alignItems: "end",
          marginBottom: "20px"
        }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", color: "#374151" }}>
              Search Type:
            </label>
            <select 
              value={searchType} 
              onChange={(e) => setSearchType(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "8px", 
                borderRadius: "6px", 
                border: "1px solid #d1d5db",
                fontSize: "14px"
              }}
            >
              <option value="keyword">Keyword Search</option>
              <option value="semantic">Semantic Search</option>
              <option value="hybrid">Hybrid Search</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", color: "#374151" }}>
              Top K Results:
            </label>
            <input
              type="number"
              value={k}
              onChange={(e) => setK(Math.max(1, Math.min(20, parseInt(e.target.value) || 10)))}
              min="1"
              max="20"
              style={{ 
                width: "100%", 
                padding: "8px", 
                borderRadius: "6px", 
                border: "1px solid #d1d5db",
                fontSize: "14px"
              }}
            />
          </div>
          
          <button 
            onClick={runEvaluation} 
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: loading ? "#9ca3af" : "#22c55e",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              minWidth: "120px"
            }}
          >
            {loading ? "Evaluating..." : "Run Analysis"}
          </button>
        </div>
        
        {loading && (
          <div style={{ 
            textAlign: "center", 
            padding: "20px",
            color: "#6b7280",
            fontSize: "14px"
          }}>
            🔄 Running MRR evaluation... This may take a few seconds.
          </div>
        )}
      </div>

      {/* Results display inline within the tab */}
      {results && (
        <div>
          {renderMRRChart}
          {renderErrorAnalysis}
          {renderDetailedResults}
        </div>
      )}
      
      {!results && !loading && (
        <div style={{
          textAlign: "center",
          padding: "30px",
          color: "#9ca3af",
          fontSize: "14px",
          fontStyle: "italic"
        }}>
          📊 Click "Run Analysis" to evaluate MRR performance
        </div>
      )}
    </div>
  );
}