import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { DocsLayout } from './layouts/DocsLayout';
import { Landing } from './pages/Landing';
import { DocPage } from './pages/DocPage';
import { ReadmePage } from './pages/ReadmePage';
import { NotFound } from './pages/NotFound';

/** Site chrome shared by every route: navbar, search modal, footer. */
function SiteShell() {
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Global Cmd/Ctrl+K shortcut.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="site">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar onOpenSearch={openSearch} />
      <Outlet />
      <Footer />
      <SearchModal open={searchOpen} onClose={closeSearch} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<SiteShell />}>
          <Route path="/" element={<Landing />} />
          <Route element={<DocsLayout />}>
            <Route path="/docs/readme" element={<ReadmePage />} />
            <Route path="/docs/:source/:slug" element={<DocPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
