import { useEffect, useMemo, useState } from 'react';
import { getAssistantRecommendations } from '../api';
import { defaultAssistantForm } from '../defaults';

function AssistantSection({ values, onValuesChange }) {
  const [formValues, setFormValues] = useState(values);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRecommendations(values);
  }, []);

  async function loadRecommendations(nextValues) {
    setLoading(true);
    setError('');

    try {
      const result = await getAssistantRecommendations(nextValues);
      setResponse(result);
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
      [name]: name.includes('income') || name.includes('goal') ? Number(value) || 0 : value,
    };

    setFormValues(nextValues);
    onValuesChange(nextValues);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await loadRecommendations(formValues);
  }

  async function handleReset() {
    setFormValues(defaultAssistantForm);
    onValuesChange(defaultAssistantForm);
    await loadRecommendations(defaultAssistantForm);
  }

  const savingsRate = useMemo(() => {
    if (!formValues.monthly_income) {
      return 0;
    }

    return Math.round((formValues.savings_goal / formValues.monthly_income) * 100);
  }, [formValues]);

  const readinessScore = useMemo(() => {
    let score = 35;

    if (formValues.monthly_income > 0) {
      score += 15;
    }
    if (savingsRate >= 15) {
      score += 20;
    } else if (savingsRate >= 8) {
      score += 12;
    } else {
      score += 5;
    }
    if (formValues.focus_area === 'both') {
      score += 12;
    } else {
      score += 8;
    }
    if (formValues.risk_tolerance === 'medium') {
      score += 10;
    } else {
      score += 6;
    }

    return Math.min(score, 100);
  }, [formValues, savingsRate]);

  const profileTags = [
    `${formValues.risk_tolerance} risk`,
    `${formValues.focus_area} focus`,
    `${formValues.primary_goal} goal`,
  ];

  return (
    <section className="feature-section" id="assistant">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AI Assistant</p>
          <h2>Answer a few questions and get practical next steps.</h2>
        </div>
        <p className="section-copy">
          This guided helper uses simple backend logic to turn goals, risk comfort, and budget priorities into beginner-friendly suggestions.
        </p>
      </div>

      <div className="feature-grid">
        <form className="card form-card elevated-card" onSubmit={handleSubmit}>
          <label className="input-group">
            <span>What is your monthly income?</span>
            <input
              min="0"
              name="monthly_income"
              step="10"
              type="number"
              value={formValues.monthly_income}
              onChange={handleChange}
            />
          </label>

          <label className="input-group">
            <span>What are your savings goals?</span>
            <input
              min="0"
              name="savings_goal"
              step="10"
              type="number"
              value={formValues.savings_goal}
              onChange={handleChange}
            />
          </label>

          <label className="input-group">
            <span>How much risk are you comfortable with?</span>
            <select name="risk_tolerance" value={formValues.risk_tolerance} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="input-group">
            <span>Are you focused more on budgeting or investing?</span>
            <select name="focus_area" value={formValues.focus_area} onChange={handleChange}>
              <option value="budgeting">Budgeting</option>
              <option value="investing">Investing</option>
              <option value="both">Both</option>
            </select>
          </label>

          <label className="input-group">
            <span>Are you trying to save, invest, or both?</span>
            <select name="primary_goal" value={formValues.primary_goal} onChange={handleChange}>
              <option value="save">Save</option>
              <option value="invest">Invest</option>
              <option value="both">Both</option>
            </select>
          </label>

          <div className="form-actions">
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? 'Building suggestions...' : 'Get guidance'}
            </button>
            <button className="secondary-button" onClick={handleReset} type="button">
              Reset example
            </button>
          </div>

          <p className="storage-note">Assistant answers sync to your account so your planning profile stays available next time.</p>
        </form>

        <div className="results-column">
          <div className="card elevated-card">
            <p className="eyebrow">Assistant profile</p>
            <h3>{response?.persona || 'Portfolio-ready helper'}</h3>
            <p className="summary-text">
              {error || response?.summary || 'Your summary will appear here after you answer the questions.'}
            </p>

            <div className="tag-row">
              {profileTags.map((tag) => (
                <span className="profile-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="assistant-meter">
              <div className="assistant-meter-fill" style={{ width: `${readinessScore}%` }} />
            </div>

            <div className="stats-grid assistant-stats">
              <article>
                <span>Readiness score</span>
                <strong>{readinessScore}/100</strong>
              </article>
              <article>
                <span>Savings target</span>
                <strong>{savingsRate}% of income</strong>
              </article>
              <article>
                <span>Main focus</span>
                <strong>{formValues.focus_area}</strong>
              </article>
            </div>
          </div>

          <div className="card assistant-card elevated-card">
            <h3>Suggestions</h3>
            <div className="insight-list">
              {(response?.recommendations || []).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>

          <div className="card assistant-card elevated-card">
            <h3>Suggested next steps</h3>
            <div className="assistant-grid">
              {(response?.next_steps || []).map((item, index) => (
                <article key={item} className="mini-card">
                  <span>Step {index + 1}</span>
                  <strong>{item}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="card caution-card elevated-card">
            <h3>Keep in mind</h3>
            <p>{response?.caution || 'Your caution note will appear here.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AssistantSection;
