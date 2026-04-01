import { useEffect, useMemo, useState } from 'react';
import { analyzeBudget } from '../api';
import { defaultBudgetForm } from '../defaults';

const fieldLabels = [
  ['monthly_income', 'Monthly income'],
  ['rent_housing', 'Rent / housing'],
  ['utilities', 'Utilities'],
  ['groceries', 'Groceries'],
  ['transportation', 'Transportation'],
  ['entertainment', 'Entertainment'],
  ['savings_goal', 'Savings goal'],
  ['other_expenses', 'Other expenses'],
];

const chartColors = ['#99663e', '#4b6756', '#c28b5c', '#7f5b45', '#8aa18d', '#d7a779', '#b58456'];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString();
}

function BudgetPlanner({ values, onValuesChange }) {
  const [formValues, setFormValues] = useState(values);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    runBudgetAnalysis(values);
  }, []);

  async function runBudgetAnalysis(nextValues) {
    setLoading(true);
    setError('');

    try {
      const response = await analyzeBudget(nextValues);
      setResult(response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValues = {
      ...formValues,
      [name]: Number(value) || 0,
    };

    setFormValues(nextValues);
    onValuesChange(nextValues);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await runBudgetAnalysis(formValues);
  }

  async function handleReset() {
    setFormValues(defaultBudgetForm);
    onValuesChange(defaultBudgetForm);
    await runBudgetAnalysis(defaultBudgetForm);
  }

  const healthStatus = result?.health_status?.toLowerCase() || '';
  const statusTone = healthStatus.includes('over')
    ? 'status-bad'
    : healthStatus.includes('tight')
      ? 'status-warn'
      : 'status-good';

  const topCategory = useMemo(() => {
    if (!result?.breakdown?.length) {
      return null;
    }

    return [...result.breakdown].sort((left, right) => right.value - left.value)[0];
  }, [result]);

  const donutGradient = useMemo(() => {
    const breakdown = result?.breakdown || [];
    if (!breakdown.length) {
      return 'conic-gradient(#99663e 0% 100%)';
    }

    let offset = 0;
    const segments = breakdown.map((item, index) => {
      const start = offset;
      offset = Math.min(offset + item.share_of_income, 100);
      return `${chartColors[index % chartColors.length]} ${start}% ${offset}%`;
    });

    if (offset < 100) {
      segments.push(`rgba(153, 102, 62, 0.12) ${offset}% 100%`);
    }

    return `conic-gradient(${segments.join(', ')})`;
  }, [result]);

  const planningSignals = [
    {
      label: 'Largest category',
      value: topCategory ? topCategory.label : 'Waiting for data',
    },
    {
      label: 'Monthly cushion',
      value: result ? `$${formatCurrency(result.remaining_balance)}` : '$0',
    },
    {
      label: 'Savings target',
      value: result ? `${result.savings_percentage}% of income` : '0% of income',
    },
  ];

  return (
    <section className="feature-section" id="budget">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Budget Planner</p>
          <h2>See your monthly plan before you spend it.</h2>
        </div>
        <p className="section-copy">
          Enter a few key categories to estimate your monthly balance, savings rate, and overall budget health.
        </p>
      </div>

      <div className="feature-grid">
        <form className="card form-card elevated-card" onSubmit={handleSubmit}>
          {fieldLabels.map(([name, label]) => (
            <label key={name} className="input-group">
              <span>{label}</span>
              <input
                min="0"
                name={name}
                step="10"
                type="number"
                value={formValues[name]}
                onChange={handleChange}
              />
            </label>
          ))}

          <div className="form-actions">
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? 'Analyzing...' : 'Analyze budget'}
            </button>
            <button className="secondary-button" onClick={handleReset} type="button">
              Reset example
            </button>
          </div>

          <p className="storage-note">Budget inputs are tied to your account, so you can sign back in and keep working.</p>
        </form>

        <div className="results-column">
          <div className="card summary-card elevated-card">
            <div className="summary-header">
              <div>
                <p className="eyebrow">Financial health</p>
                <h3>{result?.health_status || 'Waiting for analysis'}</h3>
              </div>
              {result && <span className={`status-pill ${statusTone}`}>{result.health_status}</span>}
            </div>

            <p className="summary-text">
              {error || result?.health_summary || 'Submit your numbers to get a quick monthly budget summary.'}
            </p>

            <div className="stats-grid">
              <article>
                <span>Total planned expenses</span>
                <strong>${formatCurrency(result?.total_planned_expenses)}</strong>
              </article>
              <article>
                <span>Remaining balance</span>
                <strong>${formatCurrency(result?.remaining_balance)}</strong>
              </article>
              <article>
                <span>Savings percentage</span>
                <strong>{result?.savings_percentage || 0}%</strong>
              </article>
            </div>
          </div>

          <div className="card elevated-card">
            <div className="chart-layout">
              <div>
                <h3>Spending mix</h3>
                <p className="summary-text">
                  A fast visual read of where the month is going, including the savings target as part of the plan.
                </p>
              </div>
              <div className="donut-wrap">
                <div className="donut-chart" style={{ background: donutGradient }}>
                  <div className="donut-center">
                    <span>Balance</span>
                    <strong>${formatCurrency(result?.remaining_balance)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="legend-grid">
              {(result?.breakdown || []).map((item, index) => (
                <article className="legend-item" key={item.label}>
                  <span className="legend-swatch" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                  <div>
                    <strong>{item.label}</strong>
                    <small>
                      ${formatCurrency(item.value)} - {item.share_of_income}% of income
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="card elevated-card">
            <h3>Portfolio signals</h3>
            <div className="signal-grid">
              {planningSignals.map((signal) => (
                <article className="signal-card" key={signal.label}>
                  <span>{signal.label}</span>
                  <strong>{signal.value}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="card elevated-card">
            <h3>Quick read</h3>
            <div className="insight-list">
              {(result?.highlights || []).map((highlight) => (
                <p key={highlight}>{highlight}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BudgetPlanner;
