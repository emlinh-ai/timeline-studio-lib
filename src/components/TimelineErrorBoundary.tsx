import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RenderError, ErrorRecoveryAction } from '../types';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

/**
 * Error boundary component for Timeline to handle component-level errors
 * Provides error recovery and fallback UI
 */
export class TimelineErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Timeline Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Create a RenderError for timeline-specific errors
    const renderError = new RenderError(
      `Timeline component error: ${error.message}`,
      errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown component'
    );

    this.setState({
      error: renderError,
      errorInfo
    });

    // Call onError callback if provided
    this.props.onError?.(renderError, errorInfo);

    // Log to external error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // Here you would integrate with error reporting services like Sentry
      console.error('Production error in Timeline:', {
        error: renderError,
        errorInfo,
        retryCount: this.state.retryCount
      });
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: this.state.retryCount + 1
      });
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    });
  };

  private renderDefaultFallback() {
    const { error, errorInfo, retryCount } = this.state;
    const canRetry = retryCount < this.maxRetries;

    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          border: '2px solid #ff4444',
          borderRadius: '8px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          maxWidth: '600px',
          margin: '20px auto'
        }}
      >
        <h2 style={{ color: '#ff4444', marginTop: 0 }}>
          ⚠️ Timeline Error
        </h2>
        
        <p style={{ marginBottom: '16px' }}>
          Something went wrong with the timeline component. This error has been logged for investigation.
        </p>

        {error && (
          <details style={{ marginBottom: '16px' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
              Error Details
            </summary>
            <pre
              style={{
                backgroundColor: '#2d2d2d',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {error.message}
              {process.env.NODE_ENV === 'development' && errorInfo && (
                <>
                  {'\n\nComponent Stack:'}
                  {errorInfo.componentStack}
                </>
              )}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {canRetry && (
            <button
              onClick={this.handleRetry}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007acc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Retry ({this.maxRetries - retryCount} attempts left)
            </button>
          )}
          
          <button
            onClick={this.handleReset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#666666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reset Timeline
          </button>
          
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reload Page
          </button>
        </div>

        {retryCount >= this.maxRetries && (
          <p style={{ 
            marginTop: '16px', 
            color: '#ffaa00',
            fontSize: '14px'
          }}>
            Maximum retry attempts reached. Please reload the page or contact support if the problem persists.
          </p>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error!,
          this.state.errorInfo!,
          this.handleRetry
        );
      }

      // Default fallback UI
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }
}

/**
 * Higher-order component that wraps a component with TimelineErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: Props['fallback'],
  onError?: Props['onError']
) {
  const WrappedComponent = (props: P) => (
    <TimelineErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </TimelineErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default TimelineErrorBoundary;