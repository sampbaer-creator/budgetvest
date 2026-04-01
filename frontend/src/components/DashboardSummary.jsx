function formatCurrency(value) {
  return Number(value || 0).toLocaleString();
}

function getBudgetHealth(budgetForm) {
  const income = Number(budgetForm.monthly_income || 0);
  const totalExpenses =
    Number(budgetForm.rent_housing || 0) +
    Number(budgetForm.utilities || 0) +
    Number(budgetForm.groceries || 0) +
    Number(budgetForm.transportation || 0) +
    Number(budgetForm.entertainment || 0) +
    Number(budgetForm.savings_goal || 0) +
    Number(budgetForm.other_expenses || 0);
  const remaining = income - totalExpenses;
  const savingsRate = income ? Math.round((Number(budgetForm.savings_goal || 0) / income) * 100) : 0;

  let status = 'Needs setup';
  if (income === 0) {
    status = 'Needs setup';
  } else if (remaining < 0) {
    status = 'Overspending';
  } else if (remaining <= income * 0.05 || savingsRate < 5) {
    status = 'Tight but manageable';
  } else if (remaining >= income * 0.2 && savingsRate >= 15) {
    status = 'Strong position';
  } else {
    status = 'Healthy budget';
  }

  return {
    income,
    totalExpenses,
    remaining,
    savingsRate,
    status,
  };
}

function DashboardSummary({ budgetForm, portfolioAiForm, portfolioAiAdvice, watchlist, recentTickers }) {
  const budget = getBudgetHealth(budgetForm);
  const annualContribution = Number(portfolioAiForm.monthly_contribution || 0) * 12;
  const nextProjection = portfolioAiAdvice?.projections?.[0] || null;
  const largestAllocation = portfolioAiAdvice?.allocation?.[0] || null;

  const nextMoves = [];
  if (budget.remaining < 0) {
    nextMoves.push('Trim one variable budget category before increasing investments.');
  } else if (budget.remaining < Number(portfolioAiForm.monthly_contribution || 0)) {
    nextMoves.push('Check that your monthly investing target still fits your leftover cash comfortably.');
  } else {
    nextMoves.push('Your current cash flow can support steady investing if you keep contributions automatic.');
  }

  if (!watchlist.length) {
    nextMoves.push('Build a short watchlist with 3 diversified funds or companies you want to learn about.');
  } else {
    nextMoves.push(`Your watchlist is active with ${watchlist.length} saved tickers to revisit.`);
  }

  if (portfolioAiAdvice?.next_steps?.length) {
    nextMoves.push(portfolioAiAdvice.next_steps[0]);
  }

  return (
    <section className="feature-section" id="dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Keep your full plan in one practical student-friendly view.</h2>
        </div>
        <p className="section-copy">
          This overview ties together your budget, investing pace, saved market research, and your latest Portfolio AI direction.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="card elevated-card dashboard-hero-card">
          <p className="eyebrow">Today&apos;s snapshot</p>
          <h3>{portfolioAiAdvice?.investor_profile || 'Starter investor dashboard'}</h3>
          <p className="summary-text">
            {portfolioAiAdvice?.summary ||
              'BudgetVest keeps your cash flow, investing pace, and research ideas together so you can make cleaner long-term decisions.'}
          </p>

          <div className="stats-grid dashboard-stats">
            <article>
              <span>Budget status</span>
              <strong>{budget.status}</strong>
            </article>
            <article>
              <span>Monthly cushion</span>
              <strong>${formatCurrency(budget.remaining)}</strong>
            </article>
            <article>
              <span>Savings rate</span>
              <strong>{budget.savingsRate}%</strong>
            </article>
            <article>
              <span>Annual contributions</span>
              <strong>${formatCurrency(annualContribution)}</strong>
            </article>
          </div>
        </div>

        <div className="dashboard-side">
          <div className="card elevated-card">
            <p className="eyebrow">Momentum</p>
            <div className="signal-grid dashboard-signal-grid">
              <article className="signal-card">
                <span>Starting amount</span>
                <strong>${formatCurrency(portfolioAiForm.initial_amount)}</strong>
              </article>
              <article className="signal-card">
                <span>Largest allocation</span>
                <strong>{largestAllocation?.name || 'Run Portfolio AI'}</strong>
              </article>
              <article className="signal-card">
                <span>Watchlist size</span>
                <strong>{watchlist.length} saved</strong>
              </article>
            </div>
          </div>

          <div className="card elevated-card">
            <p className="eyebrow">Projection checkpoint</p>
            <h3>{nextProjection ? `Year ${nextProjection.year}` : 'Waiting for projection'}</h3>
            <p className="summary-text">
              {nextProjection
                ? `If you stay consistent, your plan could grow to about $${formatCurrency(nextProjection.estimated_value)} by year ${nextProjection.year}.`
                : 'Run Portfolio AI to generate growth checkpoints based on your contribution pace and risk level.'}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-lower-grid">
        <div className="card elevated-card">
          <h3>Next best moves</h3>
          <div className="insight-list">
            {nextMoves.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>

        <div className="card elevated-card">
          <h3>Research board</h3>
          <div className="dashboard-chip-list">
            {watchlist.length ? (
              watchlist.map((ticker) => (
                <span className="profile-tag" key={ticker}>
                  {ticker}
                </span>
              ))
            ) : (
              <p className="empty-inline">Saved market ideas will appear here once you add tickers to your watchlist.</p>
            )}
          </div>
          {recentTickers.length ? (
            <p className="summary-text dashboard-footnote">Recent: {recentTickers.join(', ')}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default DashboardSummary;
