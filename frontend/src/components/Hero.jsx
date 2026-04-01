function Hero() {
  return (
    <section className="hero-section" id="top">
      <div className="hero-copy">
        <p className="eyebrow">Student-ready FinTech portfolio project</p>
        <h1>Budget smarter, explore the market, and build better money habits.</h1>
        <p className="hero-text">
          BudgetVest combines a monthly planning dashboard, a live market lookup, and a
          guided financial assistant in a clean experience that feels approachable from the first click.
        </p>
        <div className="hero-badges">
          <span>Beginner-friendly budgeting</span>
          <span>Live stock lookup</span>
          <span>FastAPI + React</span>
        </div>
      </div>

      <div className="hero-panel">
        <div className="hero-card">
          <span>Budget confidence</span>
          <strong>Track the plan before the month gets busy.</strong>
        </div>
        <div className="hero-card accent">
          <span>Market visibility</span>
          <strong>Search a ticker and review live price movement in seconds.</strong>
        </div>
        <div className="hero-card muted">
          <span>Guided support</span>
          <strong>Translate goals and risk comfort into clear next steps.</strong>
        </div>
      </div>
    </section>
  );
}

export default Hero;
