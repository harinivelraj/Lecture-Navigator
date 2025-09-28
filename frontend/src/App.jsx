import React, { useState } from "react";
import SearchBox from "./components/SearchBox";
import Results from "./components/Results";
import LandingPage from "./components/LandingPage";
import MetricsDashboard from "./components/MetricsDashboard";
import axios from "axios";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [results, setResults] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingested, setIngested] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [srtFile, setSrtFile] = useState(null);
  const [ingestMsg, setIngestMsg] = useState("");
  const [searchType, setSearchType] = useState("semantic");
  const [notFound, setNotFound] = useState(false);
  const [showLanding, setShowLanding] = useState(true); // New state for landing page
  const [showMetrics, setShowMetrics] = useState(false); // New state for metrics dashboard

  const handleIngest = async () => {
    setIngesting(true);
    setIngestMsg("");
    try {
      let formData = new FormData();
      if (ytUrl) {
        formData.append("video_url", ytUrl);
      }
      if (srtFile) {
        formData.append("srt_file", srtFile);
      }
      formData.append("window_size", 30);
      formData.append("overlap", 5);

      const res = await axios.post("/ingest_video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIngested(true);
      setIngestMsg("Ingestion successful!");
    } catch (e) {
      setIngestMsg("Ingestion error: " + (e?.response?.data?.detail || e.message));
      setIngested(false);
    } finally {
      setIngesting(false);
    }
  };

  const doSearch = async (query, topN = 3) => {
    setLoading(true);
    try {
      const res = await axios.post("/search_timestamps", { query, k: topN, search_type: searchType});
      setResults(res.data.results || []);
      setAnswer(res.data.answer || "");
      setNotFound(res.data.not_found || false);
    } catch (e) {
      alert("Search error: " + (e?.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    setShowLanding(false);
  };

return (
    <>
      {showLanding ? (
        <LandingPage onGetStarted={handleGetStarted} />
      ) : (
        <div className="container">
          <div className="app-header">
            <h1>Lecture Navigator — Jump to Timestamp</h1>
            <div className="header-buttons">
              <button 
                className={`metrics-toggle-btn ${showMetrics ? 'active' : ''}`}
                onClick={() => setShowMetrics(!showMetrics)}
                title="Toggle Performance Metrics Dashboard"
              >
                📊 Metrics
              </button>
              <button 
                className="back-to-landing-btn" 
                onClick={() => setShowLanding(true)}
                title="Back to Landing Page"
              >
                🏠 Home
              </button>
            </div>
          </div>
          
          {/* Metrics Dashboard Section */}
          <MetricsDashboard isVisible={showMetrics} />
          
          {/* Ingestion Section - Always visible */}
          <div className="ingest-section">
            <h3>Step 1: Ingest Lecture</h3>
            <input
              type="text"
              placeholder="YouTube Link"
              value={ytUrl}
              onChange={(e) => {
                setYtUrl(e.target.value);
                if (e.target.value) setSrtFile(null); // Clear SRT if YT entered
              }}
              disabled={ingesting || !!srtFile}
              style={{ marginRight: "10px" }}
            />
            <input
              type="file"
              accept=".srt"
              onChange={(e) => {
                setSrtFile(e.target.files[0]);
                if (e.target.files[0]) setYtUrl(""); // Clear YT if SRT chosen
              }}
              disabled={ingesting || !!ytUrl}
              style={{ marginRight: "10px" }}
            />
            <button onClick={handleIngest} disabled={ingesting || (!ytUrl && !srtFile)}>
              {ingesting ? "Ingesting..." : "Ingest"}
            </button>
            {ingestMsg && (
              <div className={`${ingested ? 'success-message' : 'error-message'}`} style={{ marginTop: "16px" }}>
                {ingestMsg}
              </div>
            )}
          </div>
          
          <hr />
      
      {/* Search Section */}
      {ingested && (
        <div className="search-content">
          <h3>Step 2: Ask a Question</h3>
          <div style={{ marginBottom: "10px" }}>
            <label htmlFor="searchType" style={{ marginRight: "8px" }}>Search Type:</label>
            <select id="searchType" value={searchType} onChange={e => setSearchType(e.target.value)}>
              <option value="semantic">Semantic (Vector)</option>
              <option value="keyword">Keyword (BM25)</option>
            </select>
          </div>
          <SearchBox onSearch={doSearch} loading={loading} disabled={!ingested} />
          {answer && !notFound && (
            <div className="answer">
              <strong>Answer (extractive):</strong> 
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          )}
          <Results items={results} notFound={notFound} />
        </div>
      )}
      
      {/* Show message if not ingested */}
      {!ingested && !ingesting && (
        <div className="ready-message">
          <h3>🎥 Ready to Get Started?</h3>
          <p>Upload a lecture transcript or provide a YouTube link to begin using the navigation and analysis features.</p>
        </div>
      )}
      </div>
      )}
    </>
  );
}

