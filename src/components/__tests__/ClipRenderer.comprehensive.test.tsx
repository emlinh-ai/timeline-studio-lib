import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClipRenderer } from '../ClipRenderer';
import { Clip, ClipRendererProps, RenderError } from '../../types';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { ThemeProvider } from '../../theme/ThemeProvider';

// Mock the Clip component
jest.mock('../Clip', () => ({
  Clip: ({ clip, onSelect, onDrag, onResize, onDoubleClick }: any) => (
    <div
      data-testid="default-clip"
      data-clip-id={clip.id}
      onClick={() => onSelect(clip.id)}
      onDoubleClick={() => onDoubleClick?.(clip.id)}
    >
      Default Clip: {clip.metadata?.name || clip.id}
    </div>
  )
}));

const mockClip: Clip = {
  id: 'test-clip',
  trackId: 'test-track',
  start: 10,
  duration: 30,
  type: 'video',
  metadata: {
    name: 'Test Clip'
  }
};

const defaultProps = {
  clip: mockClip,
  isSelected: false,
  onSelect: jest.fn(),
  onDrag: jest.fn(),
  onResize: jest.fn(),
  style: {},
  pixelsPerSecond: 30,
  zoom: 1,
  trackHeight: 60
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <EventBusProvider>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </EventBusProvider>
  );
};

describe('ClipRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Default Rendering', () => {
    it('should render default Clip component when no custom renderer provided', () => {
      renderWithProviders(<ClipRenderer {...defaultProps} />);
      
      expect(screen.getByTestId('default-clip')).toBeInTheDocument();
      expect(screen.getByText('Default Clip: Test Clip')).toBeInTheDocument();
    });

    it('should pass all props to default Clip component', () => {
      const onSelect = jest.fn();
      const onDrag = jest.fn();
      const onResize = jest.fn();
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          onSelect={onSelect}
          onDrag={onDrag}
          onResize={onResize}
          isSelected={true}
        />
      );
      
      const clipElement = screen.getByTestId('default-clip');
      expect(clipElement).toHaveAttribute('data-clip-id', 'test-clip');
      
      fireEvent.click(clipElement);
      expect(onSelect).toHaveBeenCalledWith('test-clip');
    });

    it('should handle double click events', () => {
      const onDoubleClick = jest.fn();
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          onDoubleClick={onDoubleClick}
        />
      );
      
      const clipElement = screen.getByTestId('default-clip');
      fireEvent.doubleClick(clipElement);
      expect(onDoubleClick).toHaveBeenCalledWith('test-clip');
    });
  });

  describe('Custom Renderer', () => {
    it('should render custom renderer when provided', () => {
      const customRenderer = ({ clip }: ClipRendererProps) => (
        <div data-testid="custom-clip">Custom: {clip.metadata?.name}</div>
      );
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      expect(screen.getByTestId('custom-clip')).toBeInTheDocument();
      expect(screen.getByText('Custom: Test Clip')).toBeInTheDocument();
      expect(screen.queryByTestId('default-clip')).not.toBeInTheDocument();
    });

    it('should wrap custom renderer in custom-clip-wrapper', () => {
      const customRenderer = ({ clip }: ClipRendererProps) => (
        <div data-testid="custom-clip">Custom: {clip.metadata?.name}</div>
      );
      
      const { container } = renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      expect(container.querySelector('.custom-clip-wrapper')).toBeInTheDocument();
    });

    it('should pass correct props to custom renderer', () => {
      const customRenderer = jest.fn(({ clip, isSelected, onSelect }: ClipRendererProps) => (
        <div data-testid="custom-clip" onClick={() => onSelect(clip.id)}>
          {clip.metadata?.name} - {isSelected ? 'Selected' : 'Not Selected'}
        </div>
      ));
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
          isSelected={true}
        />
      );
      
      expect(customRenderer).toHaveBeenCalledWith({
        clip: mockClip,
        isSelected: true,
        onSelect: defaultProps.onSelect,
        onDrag: defaultProps.onDrag,
        onResize: defaultProps.onResize,
        style: defaultProps.style
      });
    });

    it('should handle custom renderer returning null', () => {
      const customRenderer = () => null;
      
      const { container } = renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      expect(container.querySelector('.custom-clip-wrapper')).toBeInTheDocument();
      expect(container.querySelector('.custom-clip-wrapper')?.children).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should fallback to default renderer when custom renderer throws error', () => {
      const customRenderer = () => {
        throw new Error('Custom renderer error');
      };
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      expect(screen.getByTestId('default-clip')).toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith(
        'Custom clip renderer failed, falling back to default:',
        expect.any(Error)
      );
    });

    it('should fallback when custom renderer returns invalid React element', () => {
      const customRenderer = () => 'invalid-element' as any;
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      expect(screen.getByTestId('default-clip')).toBeInTheDocument();
      expect(console.warn).toHaveBeenCalledWith(
        'Custom clip renderer must return a valid React element or null. Falling back to default renderer.'
      );
    });

    it('should handle RenderError specifically', () => {
      const customRenderer = () => {
        throw new RenderError('Test render error', 'TestComponent');
      };
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      expect(screen.getByTestId('default-clip')).toBeInTheDocument();
      expect(console.warn).toHaveBeenCalledWith(
        'Render error in TestComponent: Test render error'
      );
    });

    it('should handle custom renderer returning undefined', () => {
      const customRenderer = () => undefined as any;
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      expect(screen.getByTestId('default-clip')).toBeInTheDocument();
      expect(console.warn).toHaveBeenCalledWith(
        'Custom clip renderer must return a valid React element or null. Falling back to default renderer.'
      );
    });

    it('should handle custom renderer returning object', () => {
      const customRenderer = () => ({ invalid: 'object' } as any);
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      expect(screen.getByTestId('default-clip')).toBeInTheDocument();
      expect(console.warn).toHaveBeenCalledWith(
        'Custom clip renderer must return a valid React element or null. Falling back to default renderer.'
      );
    });
  });

  describe('Memoization', () => {
    it('should memoize component to prevent unnecessary re-renders', () => {
      const customRenderer = jest.fn(() => <div>Custom</div>);
      
      const { rerender } = renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      // Re-render with same props
      rerender(
        <EventBusProvider>
          <ThemeProvider>
            <ClipRenderer 
              {...defaultProps}
              customRenderer={customRenderer}
            />
          </ThemeProvider>
        </EventBusProvider>
      );
      
      // Custom renderer should only be called once due to memoization
      expect(customRenderer).toHaveBeenCalledTimes(1);
    });

    it('should re-render when props change', () => {
      const customRenderer = jest.fn(() => <div>Custom</div>);
      
      const { rerender } = renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      // Re-render with different props
      rerender(
        <EventBusProvider>
          <ThemeProvider>
            <ClipRenderer 
              {...defaultProps}
              customRenderer={customRenderer}
              isSelected={true}
            />
          </ThemeProvider>
        </EventBusProvider>
      );
      
      expect(customRenderer).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration', () => {
    it('should work with different clip types', () => {
      const audioClip: Clip = {
        ...mockClip,
        type: 'audio',
        metadata: { name: 'Audio Clip' }
      };
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          clip={audioClip}
        />
      );
      
      expect(screen.getByText('Default Clip: Audio Clip')).toBeInTheDocument();
    });

    it('should handle clips without metadata', () => {
      const clipWithoutMetadata: Clip = {
        ...mockClip,
        metadata: undefined
      };
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          clip={clipWithoutMetadata}
        />
      );
      
      expect(screen.getByText('Default Clip: test-clip')).toBeInTheDocument();
    });

    it('should handle all event callbacks', () => {
      const onSelect = jest.fn();
      const onDrag = jest.fn();
      const onResize = jest.fn();
      const onDoubleClick = jest.fn();
      
      const customRenderer = ({ clip, onSelect, onDrag, onResize }: ClipRendererProps) => (
        <div
          data-testid="interactive-clip"
          onClick={() => onSelect(clip.id)}
          onMouseDown={() => onDrag(clip.id, 20)}
          onMouseUp={() => onResize(clip.id, 40)}
        >
          Interactive Clip
        </div>
      );
      
      renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
          onSelect={onSelect}
          onDrag={onDrag}
          onResize={onResize}
          onDoubleClick={onDoubleClick}
        />
      );
      
      const clipElement = screen.getByTestId('interactive-clip');
      
      fireEvent.click(clipElement);
      expect(onSelect).toHaveBeenCalledWith('test-clip');
      
      fireEvent.mouseDown(clipElement);
      expect(onDrag).toHaveBeenCalledWith('test-clip', 20);
      
      fireEvent.mouseUp(clipElement);
      expect(onResize).toHaveBeenCalledWith('test-clip', 40);
    });
  });

  describe('Performance', () => {
    it('should not re-render when unrelated props change', () => {
      const renderSpy = jest.fn();
      const customRenderer = (props: ClipRendererProps) => {
        renderSpy();
        return <div>Custom</div>;
      };
      
      const { rerender } = renderWithProviders(
        <ClipRenderer 
          {...defaultProps}
          customRenderer={customRenderer}
        />
      );
      
      // Change unrelated prop (this should not cause re-render due to memoization)
      rerender(
        <EventBusProvider>
          <ThemeProvider>
            <ClipRenderer 
              {...defaultProps}
              customRenderer={customRenderer}
            />
          </ThemeProvider>
        </EventBusProvider>
      );
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });
});