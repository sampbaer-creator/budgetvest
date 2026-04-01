import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import OverviewStrip from './components/OverviewStrip';
import DashboardSummary from './components/DashboardSummary';
import BudgetPlanner from './components/BudgetPlanner';
import PortfolioBuilder from './components/PortfolioBuilder';
import MarketSection from './components/MarketSection';
import AuthSection from './components/AuthSection';
import {
  fetchCurrentUser,
  getUserState,
  loginUser,
  logoutUser,
  registerUser,
  saveUserState,
} from './api';
import {
  defaultAssistantForm,
  defaultPortfolioAiForm,
  defaultPortfolioForm,
  defaultUserState,
} from './defaults';

const AUTH_TOKEN_KEY = 'budgetvest_auth_token';

function mergeUserState(state = {}) {
  const legacyAssistant = state.assistantForm || defaultAssistantForm;
  const legacyPortfolio = state.portfolioForm || defaultPortfolioForm;

  return {
    ...defaultUserState,
    ...state,
    budgetForm: {
      ...defaultUserState.budgetForm,
      ...(state.budgetForm || {}),
    },
    portfolioAiForm: {
      ...defaultPortfolioAiForm,
      ...(state.portfolioAiForm || {}),
      monthly_income: state.portfolioAiForm?.monthly_income ?? legacyAssistant.monthly_income ?? defaultPortfolioAiForm.monthly_income,
      savings_goal: state.portfolioAiForm?.savings_goal ?? legacyAssistant.savings_goal ?? defaultPortfolioAiForm.savings_goal,
      initial_amount: state.portfolioAiForm?.initial_amount ?? legacyPortfolio.initial_amount ?? defaultPortfolioAiForm.initial_amount,
      monthly_contribution:
        state.portfolioAiForm?.monthly_contribution ?? legacyPortfolio.monthly_contribution ?? defaultPortfolioAiForm.monthly_contribution,
      risk_tolerance:
        state.portfolioAiForm?.risk_tolerance ?? legacyPortfolio.risk_tolerance ?? legacyAssistant.risk_tolerance ?? defaultPortfolioAiForm.risk_tolerance,
      time_horizon: state.portfolioAiForm?.time_horizon ?? legacyPortfolio.time_horizon ?? defaultPortfolioAiForm.time_horizon,
      primary_goal: state.portfolioAiForm?.primary_goal ?? legacyPortfolio.primary_goal ?? defaultPortfolioAiForm.primary_goal,
      interests: state.portfolioAiForm?.interests ?? legacyPortfolio.interests ?? defaultPortfolioAiForm.interests,
      future_plans: state.portfolioAiForm?.future_plans ?? defaultPortfolioAiForm.future_plans,
    },
    portfolioAiAdvice: state.portfolioAiAdvice || defaultUserState.portfolioAiAdvice,
    portfolioAiConversation: Array.isArray(state.portfolioAiConversation)
      ? state.portfolioAiConversation
      : defaultUserState.portfolioAiConversation,
    recentTickers: Array.isArray(state.recentTickers) ? state.recentTickers : defaultUserState.recentTickers,
    watchlist: Array.isArray(state.watchlist) ? state.watchlist : defaultUserState.watchlist,
  };
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState(defaultUserState);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    let isActive = true;

    async function bootstrapSession() {
      if (!token) {
        if (isActive) {
          setUser(null);
          setAppState(defaultUserState);
          setAuthReady(true);
          setSaveStatus('');
        }
        return;
      }

      setAuthReady(false);

      try {
        const [currentUser, savedState] = await Promise.all([
          fetchCurrentUser(token),
          getUserState(token),
        ]);

        if (!isActive) {
          return;
        }

        setUser(currentUser);
        setAppState(mergeUserState(savedState.state));
        setAuthError('');
        setSaveStatus('Account data loaded.');
      } catch (error) {
        if (!isActive) {
          return;
        }

        localStorage.removeItem(AUTH_TOKEN_KEY);
        setToken('');
        setUser(null);
        setAppState(defaultUserState);
        setAuthError(error.message);
        setSaveStatus('');
      } finally {
        if (isActive) {
          setAuthReady(true);
        }
      }
    }

    bootstrapSession();

    return () => {
      isActive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !user || !authReady) {
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      try {
        await saveUserState(appState, token);
        setSaveStatus('All changes saved to your account.');
      } catch (error) {
        setSaveStatus(error.message);
      }
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [appState, authReady, token, user]);

  async function handleAuth(action, values) {
    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await action(values);
      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      setSaveStatus('Signing you in...');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (token) {
      try {
        await logoutUser(token);
      } catch {
        // Local cleanup still matters even if the logout request fails.
      }
    }

    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken('');
    setUser(null);
    setAppState(defaultUserState);
    setSaveStatus('');
  }

  if (!authReady) {
    return (
      <div className="app-shell">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="page-content">
          <section className="card elevated-card loading-card">
            <p className="eyebrow">Loading</p>
            <h2>Preparing your BudgetVest dashboard...</h2>
            <p className="summary-text">Checking your session and loading saved account data.</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="page-content">
        <Hero />
        <OverviewStrip />

        {!user ? (
          <AuthSection
            authLoading={authLoading}
            error={authError}
            onLogin={(values) => handleAuth(loginUser, values)}
            onRegister={(values) => handleAuth(registerUser, values)}
          />
        ) : (
          <>
            <section className="session-banner">
              <div className="card elevated-card session-card">
                <p className="eyebrow">Signed in</p>
                <h2>Welcome back, {user.name}.</h2>
                <p className="summary-text">
                  Your dashboard, budget, Portfolio AI plan, follow-up questions, and market research now sync to your account.
                </p>
                <span className="save-indicator">{saveStatus || 'Ready to save changes automatically.'}</span>
              </div>
            </section>

            <DashboardSummary
              budgetForm={appState.budgetForm}
              portfolioAiForm={appState.portfolioAiForm}
              portfolioAiAdvice={appState.portfolioAiAdvice}
              recentTickers={appState.recentTickers}
              watchlist={appState.watchlist}
            />
            <BudgetPlanner
              values={appState.budgetForm}
              onValuesChange={(budgetForm) => setAppState((current) => ({ ...current, budgetForm }))}
            />
            <PortfolioBuilder
              values={appState.portfolioAiForm}
              latestAdvice={appState.portfolioAiAdvice}
              conversation={appState.portfolioAiConversation}
              onPortfolioStateChange={(portfolioState) => setAppState((current) => ({ ...current, ...portfolioState }))}
            />
            <MarketSection
              marketQuery={appState.marketQuery}
              marketTicker={appState.marketTicker}
              recentTickers={appState.recentTickers}
              watchlist={appState.watchlist}
              onMarketStateChange={(marketState) => setAppState((current) => ({ ...current, ...marketState }))}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
