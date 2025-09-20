import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineErrorBoundary, withErrorBoundary } from '../TimelineErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Mock component for testing HOC
const TestComponent = ({ message }: { message: string }) => (
  <div>{message}</div>
);

describe('TimelineErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for these tests since we're intentionally throwing errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <TimelineErrorBoundary>
          <ThrowError shouldThrow={false} />
        </TimelineErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should not interfere with normal component rendering', () => {
      render(
        <TimelineErrorBoundary>
          <div>
            <span>Child 1</span>
            <span>Child 2</span>
          </div>
        </TimelineErrorBoundary>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <TimelineErrorBoundary>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      expect(screen.getByText('⚠️ Timeline Error')).toBeInTheDocument();
      expect(screen.getByText(/Something went wrong with the timeline component/)).toBeInTheDocument();
    });

    it('should display error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TimelineErrorBoundary>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
      expect(screen.getByText(/Test error message/)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should call onError callback when error occurs', () => {
      const mockOnError = jest.fn();

      render(
        <TimelineErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should create RenderError with component information', () => {
      const mockOnError = jest.fn();

      render(
        <TimelineErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      const [error] = mockOnError.mock.calls[0];
      expect(error.name).toBe('RenderError');
      expect(error.message).toContain('Timeline component error');
    });
  });

  describe('Error Recovery', () => {
    it('should show retry button when error occurs', () => {
      render(
        <TimelineErrorBoundary>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      expect(screen.getByText(/Retry \(3 attempts left\)/)).toBeInTheDocument();
    });

    it('should allow retry when retry button is clicked', () => {
      let shouldThrow = true;
      const TestComponentWithToggle = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Recovered</div>;
      };

      render(
        <TimelineErrorBoundary>
          <TestComponentWithToggle />
        </TimelineErrorBoundary>
      );

      expect(screen.getByText('⚠️ Timeline Error')).toBeInTheDocument();

      // Simulate fixing the error condition
      shouldThrow = false;
      fireEvent.click(screen.getByText(/Retry \(3 attempts left\)/));

      expect(screen.getByText('Recovered')).toBeInTheDocument();
    });

    it('should decrease retry count on each retry', () => {
      const AlwaysThrow = () => {
        throw new Error('Always throws');
      };

      render(
        <TimelineErrorBoundary>
          <AlwaysThrow />
        </TimelineErrorBoundary>
      );

      // First error
      expect(screen.getByText(/Retry \(3 attempts left\)/)).toBeInTheDocument();

      // First retry
      fireEvent.click(screen.getByText(/Retry \(3 attempts left\)/));
      expect(screen.getByText(/Retry \(2 attempts left\)/)).toBeInTheDocument();

      // Second retry
      fireEvent.click(screen.getByText(/Retry \(2 attempts left\)/));
      expect(screen.getByText(/Retry \(1 attempts left\)/)).toBeInTheDocument();
    });

    it('should disable retry after maximum attempts', () => {
      const AlwaysThrow = () => {
        throw new Error('Always throws');
      };

      render(
        <TimelineErrorBoundary>
          <AlwaysThrow />
        </TimelineErrorBoundary>
      );

      // Exhaust all retry attempts
      fireEvent.click(screen.getByText(/Retry \(3 attempts left\)/));
      fireEvent.click(screen.getByText(/Retry \(2 attempts left\)/));
      fireEvent.click(screen.getByText(/Retry \(1 attempts left\)/));

      expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
      expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
    });

    it('should reset error state when reset button is clicked', () => {
      render(
        <TimelineErrorBoundary>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      expect(screen.getByText('⚠️ Timeline Error')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Reset Timeline'));

      // After reset, it should try to render the component again
      // Since ThrowError still has shouldThrow=true, it will error again
      expect(screen.getByText('⚠️ Timeline Error')).toBeInTheDocument();
      // But retry count should be reset
      expect(screen.getByText(/Retry \(3 attempts left\)/)).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should use custom fallback when provided', () => {
      const customFallback = (error: Error, errorInfo: any, retry: () => void) => (
        <div>
          <h1>Custom Error UI</h1>
          <p>Error: {error.message}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      );

      render(
        <TimelineErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.getByText(/Error:.*Test error message/)).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
    });

    it('should call retry function from custom fallback', () => {
      let shouldThrow = true;
      const TestComponentWithToggle = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Recovered from custom fallback</div>;
      };

      const customFallback = (error: Error, errorInfo: any, retry: () => void) => (
        <button onClick={retry}>Custom Retry Button</button>
      );

      render(
        <TimelineErrorBoundary fallback={customFallback}>
          <TestComponentWithToggle />
        </TimelineErrorBoundary>
      );

      // Simulate fixing the error condition
      shouldThrow = false;
      fireEvent.click(screen.getByText('Custom Retry Button'));

      expect(screen.getByText('Recovered from custom fallback')).toBeInTheDocument();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(TestComponent);

      render(<WrappedComponent message="Test message" />);

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should catch errors in wrapped component', () => {
      const WrappedThrowError = withErrorBoundary(ThrowError);

      render(<WrappedThrowError shouldThrow={true} />);

      expect(screen.getByText('⚠️ Timeline Error')).toBeInTheDocument();
    });

    it('should use custom fallback and onError in HOC', () => {
      const mockOnError = jest.fn();
      const customFallback = () => <div>HOC Custom Fallback</div>;

      const WrappedThrowError = withErrorBoundary(
        ThrowError,
        customFallback,
        mockOnError
      );

      render(<WrappedThrowError shouldThrow={true} />);

      expect(screen.getByText('HOC Custom Fallback')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalled();
    });

    it('should set correct displayName', () => {
      const WrappedComponent = withErrorBoundary(TestComponent);
      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
    });
  });

  describe('Production Behavior', () => {
    it('should log errors in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      process.env.NODE_ENV = 'production';

      render(
        <TimelineErrorBoundary>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Production error in Timeline:',
        expect.objectContaining({
          error: expect.any(Error),
          errorInfo: expect.any(Object),
          retryCount: expect.any(Number)
        })
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('UI Elements', () => {
    it('should show reload page button', () => {
      render(
        <TimelineErrorBoundary>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should show reset timeline button', () => {
      render(
        <TimelineErrorBoundary>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      expect(screen.getByText('Reset Timeline')).toBeInTheDocument();
    });

    it('should show error details in collapsible section', () => {
      render(
        <TimelineErrorBoundary>
          <ThrowError shouldThrow={true} />
        </TimelineErrorBoundary>
      );

      const detailsElement = screen.getByText('Error Details');
      expect(detailsElement).toBeInTheDocument();
      expect(detailsElement.tagName.toLowerCase()).toBe('summary');
    });
  });
});