import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './AppShell.css';

const AppShell = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'app-shell--collapsed' : ''} ${mobileSidebarOpen ? 'app-shell--mobile-open' : ''}`}>
      {mobileSidebarOpen && (
        <div className="sidebar-overlay-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}
      
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <div className="app-shell__main">
        <Header 
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} 
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
