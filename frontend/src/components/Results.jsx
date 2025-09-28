import React from "react";

function secondsToHHMMSS(s) {
  const sec = Math.floor(s);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  if (h>0) return `${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  return `${m}:${String(ss).padStart(2,"0")}`;
}

export default function Results({ items, notFound }) {
  if (notFound) {
    return (
      <div className="results">
        <div className="result no-timestamp">
          <div className="snippet">Not found in the video</div>
        </div>
      </div>
    );
  }
  
  if (!items || items.length === 0) return <div>No results</div>;
  
  return (
    <div className="results">
      {items.map((it, idx) => (
        <div key={idx} className="result">
          <div className="result-header">
            <a target="_blank" rel="noreferrer" href={it.title && it.title.startsWith("YouTube:") ? `https://www.youtube.com/watch?v=${it.title.split(":")[1]}&t=${Math.round(it.t_start)}s` : "#"}>
              Jump to {secondsToHHMMSS(it.t_start)}
            </a>
            <span className="score">score: {Number(it.score).toFixed(3)}</span>
          </div>
          <div className="snippet">{it.snippet}</div>
        </div>
      ))}
    </div>
  );
}
