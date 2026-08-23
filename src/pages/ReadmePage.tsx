import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { readme } from '../lib/content';
import { enhanceDocContent } from '../lib/enhance';
import { DocPager } from '../components/DocPager';
import { siteConfig } from '../siteConfig';

export function ReadmePage() {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `Overview · ${siteConfig.siteTitle}`;
    window.scrollTo(0, 0);
  }, []);

  // Copy buttons + highlighting for fenced code blocks.
  useEffect(() => {
    if (contentRef.current === null) return;
    return enhanceDocContent(contentRef.current);
  }, []);

  return (
    <main id="main" className="doc-main">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/">Docs</Link>
          </li>
          <li aria-current="page">Overview</li>
        </ol>
      </nav>
      <article ref={contentRef} className="doc-content markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
      </article>
      <DocPager source="readme" slug="readme" />
    </main>
  );
}
