import { useState } from 'react';

const defaultFormState = {
  name: '',
  email: '',
  password: '',
};

function AuthSection({ authLoading, error, onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [formValues, setFormValues] = useState(defaultFormState);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (mode === 'login') {
      await onLogin({
        email: formValues.email,
        password: formValues.password,
      });
      return;
    }

    await onRegister(formValues);
  }

  return (
    <section className="auth-section">
      <div className="auth-copy card elevated-card">
        <p className="eyebrow">Account access</p>
        <h2>Sign in to save every budget, lookup, and assistant response.</h2>
        <p className="summary-text">
          BudgetVest now supports user accounts, so each person can come back to their own saved financial plan instead of starting from scratch.
        </p>
        <div className="auth-points">
          <p>Save budget planner inputs to your account.</p>
          <p>Keep assistant answers and readiness settings tied to your profile.</p>
          <p>Store recent market tickers for a cleaner return visit.</p>
        </div>
      </div>

      <form className="card auth-card elevated-card" onSubmit={handleSubmit}>
        <div className="auth-toggle">
          <button
            className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setMode('login')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setMode('register')}
            type="button"
          >
            Create account
          </button>
        </div>

        {mode === 'register' && (
          <label className="input-group">
            <span>Full name</span>
            <input
              name="name"
              placeholder="Alex Rivera"
              type="text"
              value={formValues.name}
              onChange={handleChange}
            />
          </label>
        )}

        <label className="input-group">
          <span>Email</span>
          <input
            name="email"
            placeholder="you@example.com"
            type="email"
            value={formValues.email}
            onChange={handleChange}
          />
        </label>

        <label className="input-group">
          <span>Password</span>
          <input
            name="password"
            placeholder="At least 6 characters"
            type="password"
            value={formValues.password}
            onChange={handleChange}
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-button" disabled={authLoading} type="submit">
          {authLoading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </section>
  );
}

export default AuthSection;
