import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../siteConfig';
import { firstDocPath } from '../lib/paths';
import { ChevronIcon, ExternalIcon, GitHubIcon } from '../components/Icons';

export function Landing() {
  useEffect(() => {
    document.title = siteConfig.siteTitle;
    window.scrollTo(0, 0);
  }, []);

  return (
    <main id="main" className="landing">
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">{siteConfig.siteTitle}</h1>
          <p className="hero-tagline">{siteConfig.tagline}</p>
          <div className="hero-ctas">
            <Link to={firstDocPath} className="btn btn-primary">
              Read the Docs
            </Link>
            <a
              href={siteConfig.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline"
            >
              <GitHubIcon size={16} /> View on GitHub <ExternalIcon size={11} />
            </a>
          </div>
        </div>
        <a
          href="#architecture"
          className="hero-scroll"
          aria-label="Scroll to the architecture overview"
        >
          <ChevronIcon size={22} />
        </a>
      </section>

      <section
        id="architecture"
        className="architecture"
        aria-label="Architecture overview"
      >
        <div className="arch-inner">
          <h2 className="arch-title">Architecture</h2>
          <p className="arch-sub">
            The frontend never talks to Fineract directly. The BFF is the
            single policy enforcement point between consumers and core banking.
            The BFF provides self-service capabilities and security.
          </p>
          <div className="arch-flow">
            <div className="arch-col-left">
              <div className="arch-row">
                <div className="arch-node">
                  <span className="arch-kicker">Frontend</span>
                  <h3>Angular Demo Client</h3>
                  <p>Consumer web app that talks only to the BFF.</p>
                </div>
                <div className="arch-link" aria-hidden>
                  <span className="arch-link-label">JWT Auth</span>
                  <span className="arch-arrow">&rarr;</span>
                </div>
              </div>
              <div className="arch-row">
                <div className="arch-node">
                  <span className="arch-kicker">Open Banking</span>
                  <h3>Third-Party Provider</h3>
                </div>
                <div className="arch-link" aria-hidden>
                  <span className="arch-link-label">OAuth2.0</span>
                  <span className="arch-arrow">&rarr;</span>
                </div>
              </div>
            </div>
            <div className="arch-col-center">
              <div className="arch-satellite">PostgreSQL</div>
              <span className="arch-vline" aria-hidden />
              <div className="arch-node">
                <span className="arch-kicker">Backend for frontend</span>
                <h3>Fineract Consumer Facing</h3>
                <p>
                  Authentication, ABAC, 2FA, rate limiting, open-banking, and
                  frontend auditing.
                </p>
              </div>
              <div className="arch-satellite-row">
                <div className="arch-satellite-stack">
                  <span className="arch-vline" aria-hidden />
                  <div className="arch-satellite">Mailpit</div>
                </div>
                <div className="arch-satellite-stack">
                  <span className="arch-vline" aria-hidden />
                  <div className="arch-satellite">Valkey</div>
                </div>
              </div>
            </div>
            <div className="arch-link" aria-hidden>
              <span className="arch-link-label">Basic Auth</span>
              <span className="arch-arrow">&rarr;</span>
            </div>
            <div className="arch-node">
              <span className="arch-kicker">Core banking</span>
              <h3>Apache Fineract</h3>
              <p>Source of truth on core banking services.</p>
            </div>
          </div>
          <Link to="/docs/backend/architecture" className="arch-docs-link">
            Full architecture docs here
          </Link>
        </div>
      </section>

      <section id="demo" className="demo" aria-label="Demo video">
        <div className="demo-inner">
          <h2 className="demo-title">Demo</h2>
          <p className="demo-sub">
            A walkthrough of the consumer banking experience end to end
          </p>
          <div className="demo-panel">
            <iframe
              src={siteConfig.demoVideoUrl}
              title="Demo video"
              allow="fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section id="author" className="author" aria-label="About the author">
        <div className="author-inner">
          <h2 className="author-title">About the author</h2>
          <p className="author-body">
            Edward Kang - Github{' '}
            <a
              href="https://github.com/edk12564"
              target="_blank"
              rel="noreferrer"
            >
              @edk12564
            </a>
            <br />
            Open Source Contributor @Apache Software Foundation
          </p>
        </div>
      </section>
    </main>
  );
}
