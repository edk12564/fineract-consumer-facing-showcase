import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { manifest, navGroups, searchDocs, type SearchResult } from '../lib/content';
import { CloseIcon, DocIcon, SearchIcon } from './Icons';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const MAX_RESULTS = 30;

const groupTitles: Record<string, string> = Object.fromEntries(
  navGroups.map((g) => [g.id, g.title]),
);

/** Group key for a result — the Glossary gets its own group (like the sidebar). */
function groupKey(r: SearchResult): string {
  if (r.source === 'readme') return 'overview';
  if (r.source === 'backend' && r.slug === 'glossary') return 'glossary';
  return r.source;
}

function docPath(r: SearchResult): string {
  return r.source === 'readme' ? '/docs/readme' : `/docs/${r.source}/${r.slug}`;
}

/** Renders `text` with case-insensitive occurrences of `query` wrapped in <mark>. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: ReactNode[] = [];
  let pos = 0;
  let idx = lower.indexOf(ql);
  let key = 0;
  while (idx >= 0 && key < 20) {
    if (idx > pos) parts.push(text.slice(pos, idx));
    parts.push(<mark key={key++}>{text.slice(idx, idx + q.length)}</mark>);
    pos = idx + q.length;
    idx = lower.indexOf(ql, pos);
  }
  parts.push(text.slice(pos));
  return <>{parts}</>;
}

interface Group {
  source: string;
  items: { result: SearchResult; flatIndex: number }[];
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const results = useMemo(
    () => (query.trim() ? searchDocs(query).slice(0, MAX_RESULTS) : []),
    [query],
  );

  // Group in sidebar order (overview, backend, frontend, glossary) while
  // assigning flat indices in display order so arrow keys move visually.
  const groups = useMemo<Group[]>(() => {
    const order = navGroups.map((g) => g.id);
    const bySource = new Map<string, SearchResult[]>();
    for (const r of results) {
      const key = groupKey(r);
      const list = bySource.get(key) ?? [];
      list.push(r);
      bySource.set(key, list);
    }
    let flat = 0;
    const out: Group[] = [];
    for (const source of order) {
      const items = bySource.get(source);
      if (!items) continue;
      out.push({
        source,
        items: items.map((result) => ({ result, flatIndex: flat++ })),
      });
    }
    return out;
  }, [results]);

  const flatResults = useMemo(
    () => groups.flatMap((g) => g.items.map((i) => i.result)),
    [groups],
  );

  // Reset state each time the modal opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      // Autofocus after mount.
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep the selected result visible.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-flat-index="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  const go = (r: SearchResult) => {
    onClose();
    navigate(docPath(r));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      const r = flatResults[selected];
      if (r) {
        e.preventDefault();
        go(r);
      }
    } else if (e.key === 'Tab') {
      // Minimal focus trap: cycle between the input and the close button.
      e.preventDefault();
      const active = document.activeElement;
      (active === inputRef.current ? closeRef : inputRef).current?.focus();
    }
  };

  return (
    <div className="search-overlay" onMouseDown={onClose}>
      <div
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="search-input-row">
          <SearchIcon size={17} className="search-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search the docs…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            role="combobox"
            aria-expanded={flatResults.length > 0}
            aria-controls="search-results"
            aria-activedescendant={
              flatResults.length > 0 ? `search-result-${selected}` : undefined
            }
            aria-autocomplete="list"
          />
          <button
            ref={closeRef}
            type="button"
            className="icon-btn search-close"
            onClick={onClose}
            aria-label="Close search"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="search-results" id="search-results" role="listbox" ref={listRef}>
          {query.trim() === '' ? (
            <p className="search-hint">
              Type to search across all {manifest.sources.length} doc sources
              and the overview.
            </p>
          ) : flatResults.length === 0 ? (
            <p className="search-hint">
              No results for “{query.trim()}”.
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.source} className="search-group">
                <h3 className="search-group-title">
                  {groupTitles[group.source] ?? group.source}
                </h3>
                <ul>
                  {group.items.map(({ result, flatIndex }) => (
                    <li key={`${result.source}-${result.slug}`}>
                      <div
                        id={`search-result-${flatIndex}`}
                        data-flat-index={flatIndex}
                        role="option"
                        aria-selected={flatIndex === selected}
                        className={
                          flatIndex === selected
                            ? 'search-result selected'
                            : 'search-result'
                        }
                        onMouseEnter={() => setSelected(flatIndex)}
                        onClick={() => go(result)}
                      >
                        <DocIcon size={15} className="search-result-icon" />
                        <div className="search-result-body">
                          <span className="search-result-title">
                            <Highlighted text={result.title} query={query} />
                          </span>
                          <span className="search-result-snippet">
                            <Highlighted text={result.snippet} query={query} />
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <div className="search-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to navigate
          </span>
          <span>
            <kbd>↵</kbd> to open
          </span>
          <span>
            <kbd>esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
