import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../siteConfig';

export function NotFound() {
  useEffect(() => {
    document.title = `Not found · ${siteConfig.siteTitle}`;
  }, []);

  return (
    <main id="main" className="notfound">
      <p className="notfound-code">404</p>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="btn btn-primary">
        Back to home
      </Link>
    </main>
  );
}
