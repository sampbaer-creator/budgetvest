const navLinks = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'budget', label: 'Budget' },
  { id: 'portfolio', label: 'Portfolio AI' },
  { id: 'market', label: 'Market' },
];

function Navbar({ user, onLogout }) {
  return (
    <header className="site-header">
      <nav className="navbar">
        <a className="brand" href="#top">
          <span className="brand-mark">BV</span>
          <span>
            <strong>BudgetVest</strong>
            <small>Practical finance for beginners</small>
          </span>
        </a>

        <div className="nav-actions">
          <div className="nav-links">
            {user &&
              navLinks.map((link) => (
                <a key={link.id} href={`#${link.id}`}>
                  {link.label}
                </a>
              ))}
          </div>

          {user ? (
            <div className="user-pill">
              <span>{user.name}</span>
              <button className="nav-logout" onClick={onLogout} type="button">
                Log out
              </button>
            </div>
          ) : (
            <div className="user-pill guest-pill">
              <span>Sign in to save your progress</span>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
