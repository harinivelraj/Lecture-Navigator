// Utility functions for formatting latency values

export const formatLatency = (ms) => {
  if (ms === 0) return '0ms';
  // Show in milliseconds for values under 2 seconds for better readability
  if (ms < 2000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

export const getLatencyStatusColor = (value, threshold = 2000) => {
  if (value <= threshold * 0.7) return "#28a745"; // Green
  if (value <= threshold * 0.9) return "#ffc107"; // Yellow
  return "#dc3545"; // Red
};