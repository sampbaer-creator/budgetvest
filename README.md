# BudgetVest

BudgetVest is a full-stack student portfolio project that combines budgeting tools, live market data, an AI-guided portfolio planner, follow-up portfolio coaching, and account-based saved progress.

## Stack

- Frontend: React + Vite
- Backend: FastAPI
- Data storage: SQLite
- Market providers: Alpha Vantage or Finnhub

## Features

- Budget planner with totals, savings rate, financial health analysis, and a spending mix chart
- Portfolio AI with long-term goals, interest-based themes, projection checkpoints, and AI-guided portfolio suggestions
- Follow-up Portfolio AI coaching so users can ask why the plan looks the way it does
- Live stock lookup through the FastAPI backend plus a saved watchlist
- Signed-in dashboard summary that ties together budget health, investing pace, and saved research
- User accounts with sign up, sign in, and logout
- Per-user saved state for:
  - budget planner inputs
  - combined Portfolio AI preferences and latest portfolio plan
  - Portfolio AI follow-up conversation
  - recent market tickers
  - watchlist and current market search state

## Project Structure

```text
BudgetVest/
|- backend/
|  |- app/
|  |  |- auth.py
|  |  |- config.py
|  |  |- database.py
|  |  |- main.py
|  |  |- models.py
|  |  `- services.py
|  |- .env.example
|  `- requirements.txt
|- frontend/
|  |- src/
|  |  |- components/
|  |  |- api.js
|  |  |- App.jsx
|  |  |- defaults.js
|  |  |- main.jsx
|  |  `- styles.css
|  |- .env.example
|  |- package.json
|  `- vite.config.js
|- .vscode/
|- .gitignore
`- README.md
```

## Main Files

- `backend/app/main.py`: FastAPI app, auth routes, saved-state routes, and feature routes
- `backend/app/database.py`: SQLite tables, password hashing, sessions, and saved user state
- `backend/app/auth.py`: bearer-token auth helpers for protected routes
- `backend/app/services.py`: budget logic, market provider integration, and Portfolio AI generation
- `frontend/src/App.jsx`: authentication shell, session loading, autosave flow, and dashboard composition
- `frontend/src/api.js`: frontend API helpers for auth, saved state, and feature routes
- `frontend/src/defaults.js`: default app state for new users
- `frontend/src/components/DashboardSummary.jsx`: signed-in overview card set for budget, projections, and research momentum
- `frontend/src/components/PortfolioBuilder.jsx`: combined Portfolio AI planner, projection chart, and follow-up chat UI
- `frontend/src/components/MarketSection.jsx`: live quote lookup, recent tickers, and saved watchlist
- `frontend/src/components/AuthSection.jsx`: sign-in and account-creation UI

## Backend Setup

1. Open a terminal in `backend/`.
2. Create and activate a virtual environment.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Copy `.env.example` to `.env`.
5. Add your market API key, and add an OpenAI API key if you want the portfolio planner to use a real LLM instead of the built-in fallback.
6. Start the backend:

```bash
python -m uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

## Frontend Setup

1. Open a terminal in `frontend/`.
2. Install dependencies:

```bash
npm install
```

3. Start the frontend:

```bash
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`.

## Environment Variables

### `backend/.env`

```env
MARKET_DATA_PROVIDER=finnhub
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
FINNHUB_API_KEY=your_finnhub_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Notes:
- Set `MARKET_DATA_PROVIDER=finnhub` to use Finnhub.
- Set `MARKET_DATA_PROVIDER=alpha_vantage` to force Alpha Vantage.
- `MARKET_DATA_PROVIDER=auto` also works and will choose based on the available key.
- If `OPENAI_API_KEY` is missing, Portfolio AI automatically falls back to the local rule-based planner.

### `frontend/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Auth and Saved State API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/user/state`
- `PUT /api/user/state`

Protected routes use a bearer token from login or register.

## Feature API Routes

- `GET /api/health`
- `POST /api/budget/analyze`
- `GET /api/market/search?q=...`
- `GET /api/market/quote?ticker=...`
- `POST /api/portfolio/plan`
- `POST /api/portfolio/advice`
- `POST /api/portfolio/chat`

## Notes

- User data is stored locally in SQLite at `backend/data/budgetvest.db`.
- Passwords are hashed before storage.
- Session tokens are stored in the database and used to restore the signed-in user.
- Alpha Vantage free keys can rate-limit quickly, so repeated quote checks may require a short wait.
- The OpenAI integration uses the Responses API plus structured JSON output. Official docs used for implementation:
  https://developers.openai.com/api/docs/guides/text
  https://platform.openai.com/docs/guides/structured-outputs?lang=javascript
