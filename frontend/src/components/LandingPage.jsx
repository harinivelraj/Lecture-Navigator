import React from 'react';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="hero-section">
          <h1 className="brand-title">TIMEJUMP</h1>
          <h2 className="hero-subtitle">Navigate through lecture content with intelligent search</h2>
          <p className="hero-description">
            Jump to specific moments in your lectures using semantic search and AI-powered analysis. 
            Transform hours of content into instantly accessible knowledge.
          </p>
          <button className="cta-button" onClick={onGetStarted}>
            GET STARTED
          </button>
        </div>

        <div className="features-section">
          <div className="feature-card">
            <div className="feature-number">1</div>
            <h3 className="feature-title">Precise Search</h3>
            <p className="feature-description">
              Find exact moments in lectures using semantic understanding
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-number">2</div>
            <h3 className="feature-title">Instant Jump</h3>
            <p className="feature-description">
              Skip to relevant timestamps with one click
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-number">3</div>
            <h3 className="feature-title">Smart Analysis</h3>
            <p className="feature-description">
              AI-powered content analysis and performance metrics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;