import React, { useState } from "react";

export default function SearchBox({ onSearch, loading, disabled }) {
  const [q, setQ] = useState("");
  const [topN, setTopN] = useState(3);
  return (
    <div className="searchbox">
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        disabled={loading || disabled}
        placeholder="Ask a question about the lecture..."
        style={{ width: "60%" }}
      />
      <input
        type="number"
        min={1}
        max={20}
        value={topN}
        onChange={e => setTopN(Number(e.target.value))}
        disabled={loading || disabled}
        style={{ width: "80px", marginLeft: "10px" }}
        placeholder="Top N"
      />
      <span style={{ marginLeft: "5px" }}>Top N results</span>
      <button onClick={() => onSearch(q, topN)} disabled={loading || !q || disabled}>
        Search
      </button>
    </div>
  );
}
