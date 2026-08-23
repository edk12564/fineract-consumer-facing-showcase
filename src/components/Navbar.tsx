import { Link } from 'react-router-dom';
import { siteConfig } from '../siteConfig';
import { firstDocPath } from '../lib/paths';
import { BookIcon, GitHubIcon, SearchIcon } from './Icons';

interface NavbarProps {
  onOpenSearch: () => void;
}

export function Navbar({ onOpenSearch }: NavbarProps) {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className="navbar">
      <nav className="navbar-inner" aria-label="Main">
        <Link
          to="/"
          className="navbar-brand"
          onClick={() => window.scrollTo({ top: 0 })}
        >
          <img
            src={`${import.meta.env.BASE_URL}apache-fineract-logo.png`}
            alt=""
            className="brand-logo"
            aria-hidden
          />
          <span className="brand-text">{siteConfig.siteTitle}</span>
        </Link>
        <div className="navbar-actions">
          <button
            type="button"
            className="search-trigger"
            onClick={onOpenSearch}
            aria-label="Search documentation"
          >
            <SearchIcon size={15} />
            <span className="search-trigger-label">Search</span>
            <kbd className="search-kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <Link
            to={firstDocPath}
            className="icon-btn"
            aria-label="Documentation"
          >
            <BookIcon size={18} />
          </Link>
          <a
            href={siteConfig.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="icon-btn"
            aria-label="GitHub repository (opens in new tab)"
          >
            <GitHubIcon size={18} />
          </a>
        </div>
      </nav>
    </header>
  );
}
