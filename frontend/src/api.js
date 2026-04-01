const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Central request helper so every React section talks to the backend the same way.
async function request(path, options = {}) {
  const { token, headers: customHeaders, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(customHeaders || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    });
  } catch {
    throw new Error(
      `Could not reach the BudgetVest backend at ${API_BASE_URL}. Make sure the FastAPI server is running.`,
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || 'Something went wrong while contacting the server.');
  }

  return response.json();
}

export function registerUser(values) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function loginUser(values) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function logoutUser(token) {
  return request('/api/auth/logout', {
    method: 'POST',
    token,
  });
}

export function fetchCurrentUser(token) {
  return request('/api/auth/me', { token });
}

export function getUserState(token) {
  return request('/api/user/state', { token });
}

export function saveUserState(state, token) {
  return request('/api/user/state', {
    method: 'PUT',
    body: JSON.stringify({ state }),
    token,
  });
}

export function analyzeBudget(values) {
  return request('/api/budget/analyze', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function searchStocks(query) {
  return request(`/api/market/search?q=${encodeURIComponent(query)}`);
}

export function fetchQuote(ticker) {
  return request(`/api/market/quote?ticker=${encodeURIComponent(ticker)}`);
}

export function getAssistantRecommendations(values) {
  return request('/api/assistant/recommend', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function getPortfolioPlan(values) {
  return request('/api/portfolio/plan', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function getPortfolioAdvice(values) {
  return request('/api/portfolio/advice', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function getPortfolioFollowUp(values) {
  return request('/api/portfolio/chat', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}
