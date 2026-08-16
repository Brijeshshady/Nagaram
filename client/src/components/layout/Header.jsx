import { useState } from 'react';
import { HiMenu, HiBell, HiSearch } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import './Header.css';

const Header = ({ onToggleSidebar, onOpenMobileSidebar }) => {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

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
          <HiSearch className="header__search-icon" />
          <input
            type="text"
            placeholder="Search complaints, users..."
            className="header__search-input"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>

        {/* Notifications */}
        <button className="header__icon-btn" title="Notifications">
          <HiBell />
          <span className="header__badge">3</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
