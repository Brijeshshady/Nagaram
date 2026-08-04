import { Link } from 'react-router-dom';
import './Shared.css';

export const NotFound = () => (
  <div className="shared-page">
    <div className="shared-page__content animate-scale-in">
      <h1 className="shared-page__code">404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="shared-page__btn">Go to Dashboard</Link>
    </div>
  </div>
);

export const Unauthorized = () => (
  <div className="shared-page">
    <div className="shared-page__content animate-scale-in">
      <h1 className="shared-page__code" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>403</h1>
      <h2>Access Denied</h2>
      <p>You don't have permission to view this page.</p>
      <Link to="/dashboard" className="shared-page__btn">Go to Dashboard</Link>
    </div>
  </div>
);
