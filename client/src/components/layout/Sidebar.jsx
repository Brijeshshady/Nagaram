import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS, ROLE_LABELS, ROLE_COLORS } from '../../utils/constants';
import { HiHome, HiPlus, HiClipboardList, HiStar, HiSpeakerphone, HiUsers, HiOfficeBuilding, HiChartBar, HiCog, HiLogout } from 'react-icons/hi';
import './Sidebar.css';

const ICON_MAP = {
  HiHome: HiHome,
  HiPlus: HiPlus,
  HiClipboardList: HiClipboardList,
  HiStar: HiStar,
  HiSpeakerphone: HiSpeakerphone,
  HiUsers: HiUsers,
  HiOfficeBuilding: HiOfficeBuilding,
  HiChartBar: HiChartBar,
  HiCog: HiCog,
};

const Sidebar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.citizen;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">🏙️</div>
        {!collapsed && (
          <div className="sidebar__logo-text">
            <h1>NAGARAM</h1>
            <span>Smart City</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || HiHome;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="sidebar__link-icon" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar" style={{ borderColor: ROLE_COLORS[user?.role] || '#6366f1' }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{user?.name}</p>
              <p className="sidebar__user-role" style={{ color: ROLE_COLORS[user?.role] }}>
                {ROLE_LABELS[user?.role] || user?.role}
              </p>
            </div>
          )}
        </div>
        <button className="sidebar__logout" onClick={handleLogout} title="Logout">
          <HiLogout />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
