import { useState } from 'react';
import { HiMenu, HiBell, HiSearch } from 'react-icons/hi';
import { HiSun, HiMoon } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../utils/constants';
import './Header.css';

const Header = ({ onToggleSidebar, onOpenMobileSidebar }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  return (
    <header className="header">
      <div className="header__left">
        <button 
          className="header__menu-btn" 
          onClick={() => {
            if (window.innerWidth <= 768) {
              onOpenMobileSidebar();
            } else {
              onToggleSidebar();
            }
          }}
        >
          <HiMenu />
        </button>
        <div className="header__greeting">
          <h2>Welcome back, <span className="header__name">{user?.name?.split(' ')[0]}</span></h2>
          <p>{ROLE_LABELS[user?.role]}</p>
        </div>
      </div>

      <div className="header__right">
        {/* Search */}
        <div className={`header__search ${searchOpen ? 'header__search--open' : ''}`}>
          <HiSearch className="header__search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search complaints, tickets, wards..."
            className="header__search-input"
            aria-label="Global search"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
          <kbd className="header__search-kbd">⌘K</kbd>
        </div>

        {/* Theme Toggle */}
        <button
          className={`header__icon-btn header__theme-btn ${theme === 'light' ? 'header__theme-btn--light' : ''}`}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <HiSun /> : <HiMoon />}
        </button>

        {/* Notifications */}
        <div className="header__notif-wrapper">
          <button
            className="header__icon-btn"
            title="Notifications"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="View notifications"
          >
            <HiBell />
            {unreadCount > 0 && <span className="header__badge">{unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="header__notif-dropdown animate-scale-in">
              <div className="header__notif-head">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="header__notif-clear" onClick={() => setUnreadCount(0)}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="header__notif-list">
                <div className="header__notif-item">
                  <span className="header__notif-dot" />
                  <div>
                    <p className="header__notif-text">Zone 4 scheduled for bi-weekly deep drain cleanup.</p>
                    <span className="header__notif-time">10m ago</span>
                  </div>
                </div>
                <div className="header__notif-item">
                  <span className="header__notif-dot" />
                  <div>
                    <p className="header__notif-text">Smart Bin #401 reached 85% capacity in Anna Nagar.</p>
                    <span className="header__notif-time">35m ago</span>
                  </div>
                </div>
                <div className="header__notif-item">
                  <span className="header__notif-dot" />
                  <div>
                    <p className="header__notif-text">AI Diagnostic dispatch auto-assigned 2 road tickets.</p>
                    <span className="header__notif-time">1h ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

