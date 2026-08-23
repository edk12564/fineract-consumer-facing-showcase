import { Link } from 'react-router-dom';
import { siteConfig } from '../siteConfig';
import { navGroups } from '../lib/content';
import { ExternalIcon } from './Icons';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-col">
            <h3>Documentation</h3>
            <ul>
              <li>
                <Link to="/docs/readme">Overview</Link>
              </li>
              {navGroups
                .filter((g) => g.id !== 'overview')
                .map((group) => (
                  <li key={group.id}>
                    <Link
                      to={`/docs/${group.links[0].source}/${group.links[0].slug}`}
                    >
                      {group.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
          <div className="footer-col">
            <h3>Project</h3>
            <ul>
              <li>
                <a href={siteConfig.repoUrl} target="_blank" rel="noreferrer">
                  GitHub repository <ExternalIcon />
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.upstreamUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Apache Fineract <ExternalIcon />
                </a>
              </li>
              <li>
                <a
                  href="https://summerofcode.withgoogle.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Summer of Code <ExternalIcon />
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} Apache Fineract is owned by the
            Apache Software Foundation.
          </p>
        </div>
      </div>
    </footer>
  );
}
