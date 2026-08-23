import { Link } from 'react-router-dom';
import { flatSectionList } from '../lib/content';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons';

const flat = flatSectionList();

function pathOf(ref: { source: string; slug: string }): string {
  return ref.source === 'readme'
    ? '/docs/readme'
    : `/docs/${ref.source}/${ref.slug}`;
}

/** Prev/next pagination footer for doc pages. */
export function DocPager({ source, slug }: { source: string; slug: string }) {
  const index = flat.findIndex((r) => r.source === source && r.slug === slug);
  if (index === -1) return null;
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index < flat.length - 1 ? flat[index + 1] : null;

  return (
    <nav className="doc-pager" aria-label="Docs pages">
      {prev ? (
        <Link to={pathOf(prev)} className="pager-card prev">
          <span className="pager-dir">
            <ArrowLeftIcon size={13} /> Previous
          </span>
          <span className="pager-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={pathOf(next)} className="pager-card next">
          <span className="pager-dir">
            Next <ArrowRightIcon size={13} />
          </span>
          <span className="pager-title">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
