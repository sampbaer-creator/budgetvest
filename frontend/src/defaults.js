export const defaultBudgetForm = {
  monthly_income: 3200,
  rent_housing: 1050,
  utilities: 170,
  groceries: 360,
  transportation: 180,
  entertainment: 140,
  savings_goal: 450,
  other_expenses: 120,
};

export const defaultAssistantForm = {
  monthly_income: 3200,
  savings_goal: 450,
  risk_tolerance: 'medium',
  focus_area: 'both',
  primary_goal: 'both',
};

export const defaultPortfolioForm = {
  initial_amount: 1500,
  monthly_contribution: 300,
  risk_tolerance: 'medium',
  time_horizon: '10_plus',
  primary_goal: 'wealth',
  interests: ['technology', 'dividends'],
};

export const defaultPortfolioAiForm = {
  monthly_income: 3200,
  savings_goal: 450,
  initial_amount: 1500,
  monthly_contribution: 300,
  risk_tolerance: 'medium',
  time_horizon: '10_plus',
  primary_goal: 'wealth',
  interests: ['technology', 'dividends'],
  future_plans: 'I want a long-term portfolio that can grow steadily while still matching the sectors I care about.',
};

export const defaultUserState = {
  budgetForm: defaultBudgetForm,
  portfolioAiForm: defaultPortfolioAiForm,
  portfolioAiAdvice: null,
  portfolioAiConversation: [],
  marketQuery: 'AAPL',
  marketTicker: 'AAPL',
  recentTickers: [],
  watchlist: ['MSFT', 'VOO'],
};
