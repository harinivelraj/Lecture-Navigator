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

  // PERFORMANCE: Auto-run evaluation when component mounts with longer delay
  useEffect(() => {
    const timer = setTimeout(() => {
      runEvaluation();
    }, 1000); // Delay 1s to avoid blocking UI and let other components load first
    
    return () => clearTimeout(timer);
  }, []);  // Remove runEvaluation from deps to avoid infinite loops

  // PERFORMANCE: Memoized formatting functions
  const formatScore = useCallback((score) => {
    return (score * 100).toFixed(1) + "%"; // Reduced precision for speed
  }, []);

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
    const chartWidth = 300;
    const mrrWidth = results.mrr * chartWidth;
    
    return (
      <div className="mrr-chart" style={{ marginBottom: "20px" }}>
        <h4>MRR@{k} Performance Chart</h4>
        <div style={{ 
          width: chartWidth, 
          height: "40px", 
          backgroundColor: "#f3f4f6", 
          borderRadius: "8px",
          position: "relative",
          margin: "10px 0"
        }}>
          <div style={{
            width: `${mrrWidth}px`,
            height: "100%",
            backgroundColor: mrrLevel.color,
            borderRadius: "8px",
            transition: "width 0.5s ease-in-out"
          }}></div>
          <span style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontWeight: "bold",
            color: results.mrr > 0.5 ? "white" : "black"
          }}>
            {formatScore(results.mrr)}
          </span>
        </div>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          fontSize: "12px",
          color: "#6b7280"
        }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        <div style={{
          marginTop: "10px",
          padding: "8px 12px",
          backgroundColor: mrrLevel.bgColor,
          color: mrrLevel.color,
          borderRadius: "6px",
          fontWeight: "bold",
          textAlign: "center"
        }}>
          Performance Level: {mrrLevel.level}
        </div>
      </div>
    );
  };

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
            textAlign: "center",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#22c55e" }}>
              {Object.keys(results.query_results).length - errors.length}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Perfect Matches</div>
          </div>
          <div style={{
            padding: "12px",
            backgroundColor: "#fef3c7",
            borderRadius: "8px",
            textAlign: "center",
            border: "1px solid #f59e0b"
          }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>
              {nearMisses.length}
            </div>
            <div style={{ fontSize: "12px", color: "#92400e" }}>Near Misses</div>
          </div>
          <div style={{
            padding: "12px",
            backgroundColor: "#fee2e2",
            borderRadius: "8px",
            textAlign: "center",
            border: "1px solid #ef4444"
          }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444" }}>
              {errors.length}
            </div>
            <div style={{ fontSize: "12px", color: "#b91c1c" }}>Errors</div>
          </div>
        </div>

        {/* Near Misses Details */}
        {nearMisses.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h5 style={{ color: "#f59e0b", marginBottom: "10px" }}>
              🎯 Near Misses (Close but not perfect)
            </h5>
            {nearMisses.map((miss, idx) => (
              <div key={idx} style={{
                padding: "10px",
                backgroundColor: "#fffbeb",
                border: "1px solid #f59e0b",
                borderRadius: "6px",
                marginBottom: "8px"
              }}>
                <div style={{ fontWeight: "bold", color: "#92400e" }}>
                  "{miss.query}"
                </div>
                <div style={{ fontSize: "14px", color: "#92400e" }}>
                  Expected rank {miss.expected}, got rank {miss.actual} 
                  (off by {miss.difference} position{miss.difference > 1 ? 's' : ''})
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Errors Details */}
        {errors.length > 0 && (
          <div>
            <h5 style={{ color: "#ef4444", marginBottom: "10px" }}>
              ❌ Significant Errors
            </h5>
            {errors.map((error, idx) => (
              <div key={idx} style={{
                padding: "10px",
                backgroundColor: "#fef2f2",
                border: "1px solid #ef4444",
                borderRadius: "6px",
                marginBottom: "8px"
              }}>
                <div style={{ fontWeight: "bold", color: "#b91c1c" }}>
                  "{error.query}" - {error.type}
                </div>
                <div style={{ fontSize: "14px", color: "#b91c1c" }}>
                  {error.issue}
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.length === 0 && nearMisses.length === 0 && (
          <div style={{
            padding: "20px",
            backgroundColor: "#dcfce7",
            borderRadius: "8px",
            textAlign: "center",
            color: "#166534"
          }}>
            🎉 Perfect Performance! No errors or near misses detected.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mrr-chart-analysis" style={{
      padding: "20px",
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      margin: "20px 0"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <h3 style={{ margin: 0, color: "#1f2937" }}>
          📊 MRR Chart & Error Analysis
        </h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select 
            value={searchType} 
            onChange={e => setSearchType(e.target.value)}
            disabled={loading}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db"
            }}
          >
            <option value="keyword">Keyword (BM25)</option>
            <option value="semantic">Semantic (Vector)</option>
          </select>
          <input
            type="number"
            min="1"
            max="20"
            value={k}
            onChange={e => setK(parseInt(e.target.value))}
            disabled={loading}
            style={{
              width: "60px",
              padding: "6px",
              borderRadius: "6px",
              border: "1px solid #d1d5db"
            }}
          />
          <button 
            onClick={runEvaluation} 
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: loading ? "#9ca3af" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "500"
            }}
          >
            {loading ? "Running..." : "Analyze"}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ 
          textAlign: "center", 
          padding: "20px",
          color: "#6b7280"
        }}>
          <div style={{ marginBottom: "15px" }}>🔄 Analyzing MRR performance...</div>
          {/* Loading skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ height: "60px", backgroundColor: "#f3f4f6", borderRadius: "8px", animation: "pulse 1.5s ease-in-out infinite" }}></div>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, height: "80px", backgroundColor: "#f3f4f6", borderRadius: "8px", animation: "pulse 1.5s ease-in-out infinite" }}></div>
              <div style={{ flex: 1, height: "80px", backgroundColor: "#f3f4f6", borderRadius: "8px", animation: "pulse 1.5s ease-in-out infinite" }}></div>
              <div style={{ flex: 1, height: "80px", backgroundColor: "#f3f4f6", borderRadius: "8px", animation: "pulse 1.5s ease-in-out infinite" }}></div>
            </div>
          </div>
          <style>
            {`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}
          </style>
        </div>
      )}

      {results && !loading && (
        <div>
          {renderMRRChart()}
          
          {/* Key Metrics */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "15px",
            marginBottom: "20px"
          }}>
            <div style={{
              padding: "15px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px" }}>
                MRR@{k} Score
              </div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b" }}>
                {formatScore(results.mrr)}
              </div>
            </div>
            <div style={{
              padding: "15px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px" }}>
                Total Queries
              </div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b" }}>
                {results.total_queries}
              </div>
            </div>
            <div style={{
              padding: "15px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px" }}>
                Success Rate
              </div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b" }}>
                {formatScore(results.found_rate || 0)}
              </div>
            </div>
          </div>

          {renderErrorAnalysis()}
        </div>
      )}
    </div>
  );
}