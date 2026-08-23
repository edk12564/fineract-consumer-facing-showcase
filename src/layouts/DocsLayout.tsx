import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { CloseIcon, MenuIcon } from '../components/Icons';

/**
 * Two/three-column docs shell: sticky sidebar (desktop) or slide-in drawer
 * (mobile), with the page content rendered via <Outlet/>.
 */
export function DocsLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the drawer on any navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Close on Escape while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="docs-shell">
      <div className="docs-mobile-bar">
        <button
          type="button"
          className="docs-menu-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open documentation menu"
          aria-expanded={drawerOpen}
        >
          <MenuIcon size={16} />
          <span>Menu</span>
        </button>
      </div>

      {drawerOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={drawerOpen ? 'docs-sidebar open' : 'docs-sidebar'}
        aria-label="Documentation sidebar"
      >
        <div className="sidebar-drawer-head">
          <span>Documentation</span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close documentation menu"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
      </aside>

      <Outlet />
    </div>
  );
}
