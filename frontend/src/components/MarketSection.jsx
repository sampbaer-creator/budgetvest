import { useEffect, useMemo, useState } from 'react';
import { fetchQuote, searchStocks } from '../api';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value) {
  return value ?? '--';
}

function MarketSection({ marketQuery, marketTicker, recentTickers, watchlist, onMarketStateChange }) {
  const [query, setQuery] = useState(marketQuery || 'AAPL');
  const [suggestions, setSuggestions] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initialTicker = marketTicker || marketQuery || 'AAPL';
    loadQuote(initialTicker);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const results = await searchStocks(query);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query]);

  async function loadQuote(ticker) {
    setLoading(true);
    setError('');

    try {
      const response = await fetchQuote(ticker);
      setQuote(response);
      setQuery(response.ticker);
      onMarketStateChange({
        marketQuery: response.ticker,
        marketTicker: response.ticker,
        recentTickers: [response.ticker, ...recentTickers.filter((item) => item !== response.ticker)].slice(0, 5),
        watchlist,
      });
    } catch (requestError) {
      setError(requestError.message);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await loadQuote(query);
  }

  function handleQueryChange(event) {
    const nextQuery = event.target.value.toUpperCase();
    setQuery(nextQuery);
    onMarketStateChange({
      marketQuery: nextQuery,
      marketTicker,
      recentTickers,
      watchlist,
    });
  }

  function handleWatchlistToggle() {
    const activeTicker = (quote?.ticker || query || '').trim().toUpperCase();
    if (!activeTicker) {
      return;
    }

    const nextWatchlist = watchlist.includes(activeTicker)
      ? watchlist.filter((ticker) => ticker !== activeTicker)
      : [activeTicker, ...watchlist.filter((ticker) => ticker !== activeTicker)].slice(0, 8);

    onMarketStateChange({
      marketQuery: query,
      marketTicker,
      recentTickers,
      watchlist: nextWatchlist,
    });
  }

  const trendClass = quote && quote.daily_change >= 0 ? 'trend-up' : 'trend-down';
  const activeTicker = (quote?.ticker || query || '').trim().toUpperCase();
  const isSaved = activeTicker ? watchlist.includes(activeTicker) : false;

  const rangePosition = useMemo(() => {
    if (!quote || quote.high_price === null || quote.low_price === null) {
      return 50;
    }

    const range = quote.high_price - quote.low_price;
    if (range <= 0) {
      return 50;
    }

    return clamp(((quote.current_price - quote.low_price) / range) * 100, 0, 100);
  }, [quote]);

  return (
    <section className="feature-section" id="market">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Market</p>
          <h2>Check a live stock quote without leaving the app.</h2>
        </div>
        <p className="section-copy">
          Search a company or ticker symbol. The React app talks to FastAPI, and FastAPI handles the external market API request.
        </p>
      </div>

      <div className="feature-grid market-grid">
        <div className="card form-card elevated-card">
          <form className="market-form" onSubmit={handleSubmit}>
            <label className="input-group">
              <span>Search ticker or company</span>
              <input
                placeholder="Try AAPL, MSFT, NVDA..."
                type="text"
                value={query}
                onChange={handleQueryChange}
              />
            </label>

            <div className="form-actions">
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? 'Loading quote...' : 'Get market data'}
              </button>
              <button className="secondary-button" onClick={() => loadQuote(query)} type="button">
                Refresh
              </button>
            </div>
          </form>

          <div className="watchlist-controls">
            <button className={isSaved ? 'secondary-button watchlist-button saved' : 'secondary-button watchlist-button'} onClick={handleWatchlistToggle} type="button">
              {isSaved ? `Remove ${activeTicker || 'ticker'} from watchlist` : `Save ${activeTicker || 'ticker'} to watchlist`}
            </button>
          </div>

          <div className="suggestions">
            {suggestions.slice(0, 5).map((item) => (
              <button
                key={item.symbol}
                className="suggestion-chip"
                type="button"
                onClick={() => loadQuote(item.symbol)}
              >
                {item.symbol} - {item.description}
              </button>
            ))}
          </div>

          <div className="recent-strip">
            <span>Recent tickers</span>
            <div className="suggestions">
              {recentTickers.length ? (
                recentTickers.map((ticker) => (
                  <button
                    className="suggestion-chip subtle-chip"
                    key={ticker}
                    type="button"
                    onClick={() => loadQuote(ticker)}
                  >
                    {ticker}
                  </button>
                ))
              ) : (
                <p className="empty-inline">Your recent lookups will appear here.</p>
              )}
            </div>
          </div>

          <div className="recent-strip">
            <span>Watchlist</span>
            <div className="suggestions">
              {watchlist.length ? (
                watchlist.map((ticker) => (
                  <button
                    className="suggestion-chip"
                    key={ticker}
                    type="button"
                    onClick={() => loadQuote(ticker)}
                  >
                    {ticker}
                  </button>
                ))
              ) : (
                <p className="empty-inline">Save a few tickers here so your research board feels intentional.</p>
              )}
            </div>
          </div>

          <p className="storage-note">Market searches and watchlist ideas are tied to your account, so your saved research follows you after sign-in.</p>
          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="card market-card elevated-card">
          {quote ? (
            <>
              <div className="quote-header">
                <div>
                  <p className="eyebrow">Live quote</p>
                  <h3>{quote.company_name}</h3>
                  <p className="ticker-line">
                    {quote.ticker}
                    {quote.exchange ? ` - ${quote.exchange}` : ''}
                    {quote.currency ? ` - ${quote.currency}` : ''}
                  </p>
                </div>
                <div className={`quote-badge ${trendClass}`}>
                  {quote.percent_change >= 0 ? '+' : ''}
                  {quote.percent_change}%
                </div>
              </div>

              <div className="quote-price">
                <strong>${quote.current_price}</strong>
                <span className={trendClass}>
                  {quote.daily_change >= 0 ? '+' : ''}
                  {quote.daily_change} today
                </span>
              </div>

              <div className="range-card">
                <div className="range-header">
                  <span>Intraday price position</span>
                  <strong>{rangePosition.toFixed(0)}%</strong>
                </div>
                <div className="range-track">
                  <div className="range-marker" style={{ left: `${rangePosition}%` }} />
                </div>
                <div className="range-labels">
                  <small>Low ${formatNumber(quote.low_price)}</small>
                  <small>High ${formatNumber(quote.high_price)}</small>
                </div>
              </div>

              <div className="stats-grid">
                <article>
                  <span>Open</span>
                  <strong>${formatNumber(quote.open_price)}</strong>
                </article>
                <article>
                  <span>High</span>
                  <strong>${formatNumber(quote.high_price)}</strong>
                </article>
                <article>
                  <span>Low</span>
                  <strong>${formatNumber(quote.low_price)}</strong>
                </article>
                <article>
                  <span>Previous close</span>
                  <strong>${formatNumber(quote.previous_close)}</strong>
                </article>
              </div>

              <div className="market-mini-grid">
                <article className="mini-card">
                  <span>Saved watchlist</span>
                  <strong>{watchlist.length} tickers</strong>
                </article>
                <article className="mini-card">
                  <span>Research habit</span>
                  <strong>{recentTickers.length ? 'Active' : 'Starting up'}</strong>
                </article>
                <article className="mini-card">
                  <span>Current focus</span>
                  <strong>{quote.ticker}</strong>
                </article>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>Market data will appear here.</h3>
              <p>Search a stock ticker to load current pricing, daily change, and company details.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default MarketSection;
