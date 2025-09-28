import React, { useState } from 'react';
import './MetricsReports.css';

const MetricsReports = () => {
    const [loading, setLoading] = useState(false);
    const [reportConfig, setReportConfig] = useState({
        includeCharts: true,
        timeWindowHours: 24,
        format: 'both' // 'csv', 'notebook', or 'both'
    });
    const [lastReport, setLastReport] = useState(null);

    const generateReport = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/metrics/generate-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reportConfig),
            });

            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            const result = await response.json();
            setLastReport(result);
            
            // Auto-download if formats are ready
            if (result.csv_file) {
                await downloadFile(result.csv_file.file_path, result.csv_file.filename);
            }
            if (result.notebook_file) {
                await downloadFile(result.notebook_file.file_path, result.notebook_file.filename);
            }
            
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadFile = async (filePath, filename) => {
        try {
            const response = await fetch(`/api/metrics/download-report?file_path=${encodeURIComponent(filePath)}`);
            if (!response.ok) {
                throw new Error('Failed to download file');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert(`Failed to download ${filename}`);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="metrics-reports">
            <div className="reports-header">
                <h2>📊 Metrics Reports</h2>
                <p>Generate comprehensive performance and analytics reports</p>
            </div>

            <div className="report-config">
                <h3>Report Configuration</h3>
                
                <div className="config-group">
                    <label>
                        <span>Time Window:</span>
                        <select 
                            value={reportConfig.timeWindowHours}
                            onChange={(e) => setReportConfig(prev => ({
                                ...prev,
                                timeWindowHours: parseInt(e.target.value)
                            }))}
                        >
                            <option value={1}>Last Hour</option>
                            <option value={6}>Last 6 Hours</option>
                            <option value={24}>Last 24 Hours</option>
                            <option value={168}>Last Week</option>
                            <option value={720}>Last Month</option>
                        </select>
                    </label>
                </div>

                <div className="config-group">
                    <label>
                        <span>Output Format:</span>
                        <select 
                            value={reportConfig.format}
                            onChange={(e) => setReportConfig(prev => ({
                                ...prev,
                                format: e.target.value
                            }))}
                        >
                            <option value="both">CSV + Jupyter Notebook</option>
                            <option value="csv">CSV Only</option>
                            <option value="notebook">Jupyter Notebook Only</option>
                        </select>
                    </label>
                </div>

                <div className="config-group">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={reportConfig.includeCharts}
                            onChange={(e) => setReportConfig(prev => ({
                                ...prev,
                                includeCharts: e.target.checked
                            }))}
                        />
                        <span>Include Interactive Charts (Notebook only)</span>
                    </label>
                </div>

                <button 
                    onClick={generateReport}
                    disabled={loading}
                    className="generate-button"
                >
                    {loading ? (
                        <>
                            <div className="spinner"></div>
                            Generating Report...
                        </>
                    ) : (
                        <>
                            📊 Generate Report
                        </>
                    )}
                </button>
            </div>

            {lastReport && (
                <div className="report-results">
                    <h3>Generated Reports</h3>
                    <div className="report-summary">
                        <div className="summary-stats">
                            <div className="stat">
                                <strong>Total Records:</strong> {lastReport.summary?.total_records?.toLocaleString() || 'N/A'}
                            </div>
                            <div className="stat">
                                <strong>Time Window:</strong> {lastReport.summary?.time_window_hours || 'N/A'} hours
                            </div>
                            <div className="stat">
                                <strong>Generated:</strong> {new Date().toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="download-section">
                        {lastReport.csv_file && (
                            <div className="download-item">
                                <div className="file-info">
                                    <div className="file-name">📄 {lastReport.csv_file.filename}</div>
                                    <div className="file-details">
                                        Structured data export • Ready for Excel/analysis tools
                                    </div>
                                </div>
                                <button
                                    onClick={() => downloadFile(lastReport.csv_file.file_path, lastReport.csv_file.filename)}
                                    className="download-button"
                                >
                                    Download CSV
                                </button>
                            </div>
                        )}

                        {lastReport.notebook_file && (
                            <div className="download-item">
                                <div className="file-info">
                                    <div className="file-name">📓 {lastReport.notebook_file.filename}</div>
                                    <div className="file-details">
                                        Interactive analysis • {lastReport.summary?.cell_count || 0} cells
                                        {lastReport.summary?.includes_charts ? ' • With charts' : ''}
                                    </div>
                                </div>
                                <button
                                    onClick={() => downloadFile(lastReport.notebook_file.file_path, lastReport.notebook_file.filename)}
                                    className="download-button"
                                >
                                    Download Notebook
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="usage-tips">
                        <h4>💡 Usage Tips</h4>
                        <ul>
                            <li><strong>CSV Files:</strong> Open in Excel, Google Sheets, or import into analysis tools</li>
                            <li><strong>Jupyter Notebooks:</strong> Run in Jupyter Lab/Notebook for interactive analysis</li>
                            <li><strong>Charts:</strong> Notebooks include Plotly visualizations for comprehensive insights</li>
                            <li><strong>Data Export:</strong> Notebooks can export additional processed data files</li>
                        </ul>
                    </div>
                </div>
            )}

            <div className="kpis-preview">
                <h3>Report Contents</h3>
                <div className="kpi-grid">
                    <div className="kpi-item">
                        <div className="kpi-icon">🚀</div>
                        <div className="kpi-content">
                            <div className="kpi-title">Performance KPIs</div>
                            <div className="kpi-desc">Latency, throughput, P95 metrics</div>
                        </div>
                    </div>
                    <div className="kpi-item">
                        <div className="kpi-icon">🎯</div>
                        <div className="kpi-content">
                            <div className="kpi-title">Accuracy Metrics</div>
                            <div className="kpi-desc">Search quality, error rates</div>
                        </div>
                    </div>
                    <div className="kpi-item">
                        <div className="kpi-icon">💰</div>
                        <div className="kpi-content">
                            <div className="kpi-title">Cost Analysis</div>
                            <div className="kpi-desc">Operation costs, efficiency trends</div>
                        </div>
                    </div>
                    <div className="kpi-item">
                        <div className="kpi-icon">📈</div>
                        <div className="kpi-content">
                            <div className="kpi-title">Trend Analysis</div>
                            <div className="kpi-desc">Time-series data, patterns</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetricsReports;