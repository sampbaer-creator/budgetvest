import { useEffect, useMemo, useState } from 'react';
import { getPortfolioAdvice, getPortfolioFollowUp } from '../api';
import { defaultPortfolioAiForm } from '../defaults';

const interestOptions = [
  { value: 'technology', label: 'Technology' },
  { value: 'innovation', label: 'Innovation' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'sustainability', label: 'Sustainability' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'dividends', label: 'Dividends' },
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString();
}

function getExperienceLabel(provider) {
  if (!provider) {
    return 'Portfolio AI';
  }

  return provider.includes('OpenAI') ? 'Live AI guidance' : 'Guided planning';
}

function PortfolioBuilder({ values, latestAdvice, conversation, onPortfolioStateChange }) {
  const [formValues, setFormValues] = useState(values);
  const [result, setResult] = useState(latestAdvice);
  const [messages, setMessages] = useState(conversation || []);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormValues(values);
  }, [values]);

  useEffect(() => {
    setResult(latestAdvice);
  }, [latestAdvice]);

  useEffect(() => {
    setMessages(conversation || []);
  }, [conversation]);

  useEffect(() => {
    if (!latestAdvice) {
      loadPortfolioAdvice(values, { clearConversation: false });
    }
  }, []);

  async function loadPortfolioAdvice(nextValues, options = {}) {
    const { clearConversation = true } = options;

    setLoading(true);
    setError('');

    try {
      const response = await getPortfolioAdvice(nextValues);
      setResult(response);

      const nextMessages = clearConversation ? [] : messages;
      if (clearConversation) {
        setMessages([]);
      }

      onPortfolioStateChange({
        portfolioAiForm: nextValues,
        portfolioAiAdvice: response,
        portfolioAiConversation: nextMessages,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function updateValues(nextValues) {
    setFormValues(nextValues);
    onPortfolioStateChange({
      portfolioAiForm: nextValues,
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValues = {
      ...formValues,
      [name]: ['monthly_income', 'savings_goal', 'initial_amount', 'monthly_contribution'].includes(name)
        ? Number(value) || 0
        : value,
    };
    updateValues(nextValues);
  }

  function handleInterestToggle(interest) {
    const nextInterests = formValues.interests.includes(interest)
      ? formValues.interests.filter((item) => item !== interest)
      : [...formValues.interests, interest];

    updateValues({
      ...formValues,
      interests: nextInterests,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await loadPortfolioAdvice(formValues);
  }

  async function handleReset() {
    setQuestion('');
    updateValues(defaultPortfolioAiForm);
    await loadPortfolioAdvice(defaultPortfolioAiForm);
  }

  async function handleFollowUpSubmit(event) {
    event.preventDefault();
    if (!question.trim() || !result) {
      return;
    }

    setFollowUpLoading(true);
    setError('');

    const userMessage = { role: 'user', content: question.trim() };

    try {
      const response = await getPortfolioFollowUp({
        profile: formValues,
        latest_plan: result,
        question: question.trim(),
        history: messages.map((item) => ({ role: item.role, content: item.content })),
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.answer,
        highlights: response.highlights,
        action_items: response.action_items,
        caution: response.caution,
        provider: response.provider,
      };
      const nextMessages = [...messages, userMessage, assistantMessage];

      setMessages(nextMessages);
      setQuestion('');
      onPortfolioStateChange({
        portfolioAiConversation: nextMessages,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setFollowUpLoading(false);
    }
  }

  const biggestAllocation = useMemo(() => {
    if (!result?.allocation?.length) {
      return null;
    }

    return [...result.allocation].sort((left, right) => right.percentage - left.percentage)[0];
  }, [result]);

  const projectionMax = useMemo(() => {
    if (!result?.projections?.length) {
      return 1;
    }
    return Math.max(...result.projections.map((item) => item.estimated_value), 1);
  }, [result]);

  const finalProjection = result?.projections?.[result.projections.length - 1];
  const experienceLabel = getExperienceLabel(result?.provider);

  return (
    <section className="feature-section" id="portfolio">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Portfolio AI</p>
          <h2>Build a starter portfolio, see the long-term path, and refine it with follow-up coaching.</h2>
        </div>
        <p className="section-copy">
          BudgetVest turns your income, goals, risk comfort, and interests into one connected investing workflow: a plan, a projection, practical fund ideas, and guided follow-up support.
        </p>
      </div>

      <div className="feature-grid">
        <form className="card form-card elevated-card" onSubmit={handleSubmit}>
          <label className="input-group">
            <span>Monthly income</span>
            <input
              min="0"
              name="monthly_income"
              step="50"
              type="number"
              value={formValues.monthly_income}
              onChange={handleChange}
            />
          </label>

          <label className="input-group">
            <span>Monthly savings goal</span>
            <input
              min="0"
              name="savings_goal"
              step="25"
              type="number"
              value={formValues.savings_goal}
              onChange={handleChange}
            />
          </label>

          <label className="input-group">
            <span>Current amount ready to invest</span>
            <input
              min="0"
              name="initial_amount"
              step="50"
              type="number"
              value={formValues.initial_amount}
              onChange={handleChange}
            />
          </label>

          <label className="input-group">
            <span>Monthly contribution</span>
            <input
              min="0"
              name="monthly_contribution"
              step="25"
              type="number"
              value={formValues.monthly_contribution}
              onChange={handleChange}
            />
          </label>

          <label className="input-group">
            <span>Risk tolerance</span>
            <select name="risk_tolerance" value={formValues.risk_tolerance} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="input-group">
            <span>Time horizon</span>
            <select name="time_horizon" value={formValues.time_horizon} onChange={handleChange}>
              <option value="0_5">0-5 years</option>
              <option value="5_10">5-10 years</option>
              <option value="10_plus">10+ years</option>
            </select>
          </label>

          <label className="input-group">
            <span>Primary long-term goal</span>
            <select name="primary_goal" value={formValues.primary_goal} onChange={handleChange}>
              <option value="wealth">Build long-term wealth</option>
              <option value="retirement">Retirement</option>
              <option value="home">Future home purchase</option>
              <option value="income">Passive income</option>
            </select>
          </label>

          <div className="interest-group">
            <span>Interests and themes</span>
            <div className="interest-grid">
              {interestOptions.map((option) => {
                const isSelected = formValues.interests.includes(option.value);
                return (
                  <button
                    className={isSelected ? 'interest-chip active' : 'interest-chip'}
                    key={option.value}
                    onClick={() => handleInterestToggle(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="input-group">
            <span>What should Portfolio AI know about your long-term plans?</span>
            <textarea
              className="text-area"
              name="future_plans"
              placeholder="Example: I want to build wealth steadily, but I may also want a down payment in 7 years."
              rows="4"
              value={formValues.future_plans}
              onChange={handleChange}
            />
          </label>

          <div className="form-actions">
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? 'Building your plan...' : 'Build portfolio plan'}
            </button>
            <button className="secondary-button" onClick={handleReset} type="button">
              Reset example
            </button>
          </div>

          <p className="storage-note">
            Your plan, projections, and follow-up questions save to your account automatically.
          </p>
        </form>

        <div className="results-column">
          <div className="card elevated-card portfolio-overview-card">
            <p className="eyebrow">Plan overview</p>
            <h3>{result?.investor_profile || 'Waiting for your portfolio plan'}</h3>
            <p className="summary-text">
              {error || result?.summary || 'Fill in the planner to generate a personalized portfolio outline.'}
            </p>

            <div className="tag-row">
              <span className="profile-tag">{experienceLabel}</span>
              {result?.provider ? <span className="profile-tag subtle-tag">{result.provider}</span> : null}
              <span className="profile-tag">{formValues.risk_tolerance} risk</span>
              <span className="profile-tag">{formValues.time_horizon.replace('_', '-')} horizon</span>
            </div>

            <div className="stats-grid assistant-stats">
              <article>
                <span>Monthly investing pace</span>
                <strong>${formatCurrency(formValues.monthly_contribution)}</strong>
              </article>
              <article>
                <span>Current starting amount</span>
                <strong>${formatCurrency(formValues.initial_amount)}</strong>
              </article>
              <article>
                <span>Largest allocation</span>
                <strong>{biggestAllocation?.name || 'None yet'}</strong>
              </article>
            </div>
          </div>

          <div className="card elevated-card">
            <p className="eyebrow">Projection</p>
            <div className="projection-header">
              <div>
                <h3>Growth projection</h3>
                <p className="summary-text">
                  A simple estimate based on steady contributions and a risk-based long-term return assumption.
                </p>
              </div>
              <div className="projection-hero-stat">
                <span>Longest checkpoint</span>
                <strong>
                  {finalProjection ? `$${formatCurrency(finalProjection.estimated_value)}` : 'Waiting'}
                </strong>
              </div>
            </div>

            <div className="projection-chart">
              {(result?.projections || []).map((point) => (
                <article className="projection-bar-card" key={point.year}>
                  <div className="projection-bar-track">
                    <div
                      className="projection-bar-fill"
                      style={{ height: `${Math.max((point.estimated_value / projectionMax) * 100, 8)}%` }}
                    />
                  </div>
                  <strong>Year {point.year}</strong>
                  <span>${formatCurrency(point.estimated_value)}</span>
                  <small>+${formatCurrency(point.projected_growth)} growth</small>
                </article>
              ))}
            </div>

            <div className="projection-footnotes">
              {(result?.projections || []).map((point) => (
                <article className="mini-card" key={`footnote-${point.year}`}>
                  <span>Year {point.year} contributions</span>
                  <strong>${formatCurrency(point.total_contributions)}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="card elevated-card">
            <p className="eyebrow">Reasoning</p>
            <h3>Why this plan fits</h3>
            <div className="portfolio-suggestions">
              {(result?.insights || []).map((item) => (
                <article className="portfolio-suggestion-card" key={item.title}>
                  <span>{item.title}</span>
                  <strong>{item.detail}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="card elevated-card">
            <p className="eyebrow">Allocation</p>
            <h3>Suggested allocation</h3>
            <div className="allocation-list">
              {(result?.allocation || []).map((item) => (
                <article className="allocation-card" key={item.name}>
                  <div className="allocation-header">
                    <strong>{item.name}</strong>
                    <span>{item.percentage}%</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill portfolio-fill" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <p className="summary-text">{item.reason}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="card elevated-card">
            <p className="eyebrow">Investment ideas</p>
            <h3>What to invest in</h3>
            <div className="portfolio-suggestions">
              {(result?.suggestions || []).map((item) => (
                <article className="portfolio-suggestion-card" key={item.category}>
                  <span>{item.category}</span>
                  <strong>{item.fit}</strong>
                  <p>{item.examples.join(', ')}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="card elevated-card">
            <p className="eyebrow">Follow-up coach</p>
            <h3>Ask Portfolio AI a follow-up</h3>
            <p className="summary-text">
              Try questions like: "Why this much in bonds?", "How do I make this more aggressive?", or "How much tech exposure is reasonable?"
            </p>

            <form className="portfolio-chat-form" onSubmit={handleFollowUpSubmit}>
              <textarea
                className="text-area"
                disabled={!result || followUpLoading}
                placeholder="Ask a follow-up about your portfolio plan..."
                rows="3"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <div className="form-actions">
                <button className="primary-button" disabled={!result || followUpLoading || !question.trim()} type="submit">
                  {followUpLoading ? 'Thinking...' : 'Ask follow-up'}
                </button>
              </div>
            </form>

            <div className="portfolio-chat-thread">
              {messages.length ? (
                messages.map((message, index) => (
                  <article className={message.role === 'assistant' ? 'chat-bubble assistant' : 'chat-bubble user'} key={`${message.role}-${index}`}>
                    <span>{message.role === 'assistant' ? getExperienceLabel(message.provider) : 'You'}</span>
                    <strong>{message.content}</strong>
                    {message.highlights?.length ? (
                      <div className="chat-detail-list">
                        {message.highlights.map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    ) : null}
                    {message.action_items?.length ? (
                      <div className="chat-detail-list compact">
                        {message.action_items.map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    ) : null}
                    {message.caution ? <small>{message.caution}</small> : null}
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <h3>No follow-up questions yet.</h3>
                  <p>Your conversation will build here once you start asking Portfolio AI to explain or refine the plan.</p>
                </div>
              )}
            </div>
          </div>

          <div className="card elevated-card">
            <p className="eyebrow">Action plan</p>
            <h3>Next steps</h3>
            <div className="insight-list">
              {(result?.next_steps || []).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>

          <div className="card caution-card elevated-card">
            <p className="eyebrow">Important note</p>
            <h3>Keep in mind</h3>
            <p>{result?.caution || 'Your planning note will appear here.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PortfolioBuilder;
