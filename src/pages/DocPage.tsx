import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getSection, getSectionHtml, groupTitleFor, manifest } from '../lib/content';
import { enhanceDocContent } from '../lib/enhance';
import { DocPager } from '../components/DocPager';
import { siteConfig } from '../siteConfig';

function Skeleton() {
  return (
    <div className="doc-skeleton" aria-hidden>
      <div className="sk-line w60 tall" />
      <div className="sk-line w90" />
      <div className="sk-line w100" />
      <div className="sk-line w80" />
      <div className="sk-block" />
      <div className="sk-line w95" />
      <div className="sk-line w70" />
      <div className="sk-line w85" />
    </div>
  );
}

export function DocPage() {
  const { source = '', slug = '' } = useParams();
  const location = useLocation();
  const section = getSection(source, slug);
  const sourceMeta = manifest.sources.find((s) => s.id === source);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load the fragment chunk on demand; ignore stale results if the route
  // changes before the previous load resolves.
  useEffect(() => {
    if (!section) return;
    let cancelled = false;
    setHtml(null);
    setFailed(false);
    // Show the skeleton from the top while the chunk loads; a deep-link
    // hash (if any) is honored once the fragment renders.
    window.scrollTo(0, 0);
    getSectionHtml(source, slug).then(
      (h) => {
        if (!cancelled) setHtml(h);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source, slug, section]);

  // Syntax highlighting, copy buttons, table wrappers.
  useEffect(() => {
    if (html === null || contentRef.current === null) return;
    return enhanceDocContent(contentRef.current);
  }, [html]);

  // After the fragment renders: honor a deep-link hash, else scroll to top.
  useEffect(() => {
    if (html === null) return;
    const hash = location.hash;
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        // Long jumps snap instantly (a smooth scroll across thousands of
        // pixels takes seconds); short hops keep the smooth feel.
        const distance = Math.abs(el.getBoundingClientRect().top);
        el.scrollIntoView({ behavior: distance > 1000 ? 'instant' : 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [html, location.hash]);

  useEffect(() => {
    document.title = section
      ? `${section.title} · ${groupTitleFor(source, slug)} · ${siteConfig.siteTitle}`
      : `Not found · ${siteConfig.siteTitle}`;
  }, [section, source, slug]);

  if (!section || !sourceMeta) {
    return (
      <main id="main" className="doc-main">
        <div className="doc-missing">
          <h1>Page not found</h1>
          <p>
            There is no doc section at <code>{`/docs/${source}/${slug}`}</code>.
          </p>
          <Link className="btn btn-primary" to="/">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="doc-main">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/">Docs</Link>
          </li>
          <li>{groupTitleFor(source, slug)}</li>
          <li aria-current="page">{section.title}</li>
        </ol>
      </nav>
      {failed ? (
        <div className="doc-missing">
          <h1>Failed to load this section</h1>
          <p>The content chunk could not be loaded. Try reloading the page.</p>
        </div>
      ) : html === null ? (
        <Skeleton />
      ) : (
        <article
          ref={contentRef}
          className="doc-content"
          // Trusted: locally generated at build time by extract-docs.mjs.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      <DocPager source={source} slug={slug} />
    </main>
  );
}
