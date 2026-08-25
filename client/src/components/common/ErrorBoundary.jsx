import { Component } from 'react';
import { HiExclamation, HiRefresh } from 'react-icons/hi';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Platform Render Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #0b0f1a)',
          color: 'var(--text-primary, #f1f5f9)',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '16px'
          }}>
            <HiExclamation />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            Platform Rendering Encountered an Issue
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #94a3b8)', maxWidth: '480px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
            A component failed to render. Please refresh the platform or reset your session state.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
            }}
          >
            <HiRefresh /> Reload Platform
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
