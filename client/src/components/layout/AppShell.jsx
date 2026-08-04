import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './AppShell.css';

const AppShell = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'app-shell--collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="app-shell__main">
        <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
