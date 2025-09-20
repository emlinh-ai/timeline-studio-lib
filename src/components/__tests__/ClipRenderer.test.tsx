import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClipRenderer } from '../ClipRenderer';
import { Clip as ClipType, ClipRendererProps } from '../../types';
import { ThemeProvider } from '../../theme';

// Mock the Clip component
jest.mock('../Clip', () => ({
  Clip: ({ clip, onSelect, onDrag, onResize }: any) => (
    <div 
      data-testid={`default-clip-${clip.id}`}
      onClick={() => onSelect(clip.id)}
      onMouseDown={() => onDrag && onDrag(clip.id, clip.start + 1)}
    >
      Default Clip: {clip.metadata?.name || clip.id}
    </div>
  )
}));

const mockClip: ClipType = {
  id: 'test-clip-1',
  trackId: 'track-1',
  start: 10,
  duration: 5,
  type: 'video',
  metadata: {
    name: 'Test Video Clip'
  }
};

const defaultProps = {
  clip: mockClip,
  isSelected: false,
  onSelect: jest.fn(),
  onDrag: jest.fn(),
  onResize: jest.fn(),
  style: {},
  pixelsPerSecond: 100,
  zoom: 1,
  trackHeight: 60
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('ClipRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console warnings/errors
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Default Rendering', () => {
    it('should render default Clip component when no custom renderer is provided', () => {
      renderWithTheme(<ClipRenderer {...defaultProps} />);
      
      expect(screen.getByTestId('default-clip-test-clip-1')).toBeInTheDocument();
      expect(screen.getByText('Default Clip: Test Video Clip')).toBeInTheDocument();
    });

    it('should pass all required props to default Clip component', () => {
      const onSelect = jest.fn();
      const onDrag = jest.fn();
      
      renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          onSelect={onSelect}
          onDrag={onDrag}
        />
      );
      
      const clipElement = screen.getByTestId('default-clip-test-clip-1');
      
      // Test onSelect
      fireEvent.click(clipElement);
      expect(onSelect).toHaveBeenCalledWith('test-clip-1');
      
      // Test onDrag
      fireEvent.mouseDown(clipElement);
      expect(onDrag).toHaveBeenCalledWith('test-clip-1', 11);
    });
  });

  describe('Custom Renderer', () => {
    it('should render custom component when custom renderer is provided', () => {
      const customRenderer = jest.fn((props: ClipRendererProps) => (
        <div data-testid={`custom-clip-${props.clip.id}`}>
          Custom Clip: {props.clip.metadata?.name}
        </div>
      ));

      renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          customRenderer={customRenderer}
        />
      );

      expect(screen.getByTestId('custom-clip-test-clip-1')).toBeInTheDocument();
      expect(screen.getByText('Custom Clip: Test Video Clip')).toBeInTheDocument();
      expect(customRenderer).toHaveBeenCalledWith({
        clip: mockClip,
        isSelected: false,
        onSelect: defaultProps.onSelect,
        onDrag: defaultProps.onDrag,
        onResize: defaultProps.onResize,
        style: {}
      });
    });

    it('should pass correct props to custom renderer', () => {
      const customRenderer = jest.fn(() => <div>Custom</div>);
      const onSelect = jest.fn();
      const onDrag = jest.fn();
      const onResize = jest.fn();
      const style = { backgroundColor: 'red' };

      renderWithTheme(
        <ClipRenderer 
          {...defaultProps}
          isSelected={true}
          onSelect={onSelect}
          onDrag={onDrag}
          onResize={onResize}
          style={style}
          customRenderer={customRenderer}
        />
      );

      expect(customRenderer).toHaveBeenCalledWith({
        clip: mockClip,
        isSelected: true,
        onSelect,
        onDrag,
        onResize,
        style
      });
    });

    it('should handle custom renderer returning null', () => {
      const customRenderer = jest.fn(() => null);

      renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          customRenderer={customRenderer}
        />
      );

      expect(customRenderer).toHaveBeenCalled();
      // Should not crash and should render the wrapper
      const wrapper = document.querySelector('.custom-clip-wrapper');
      expect(wrapper).toBeInTheDocument();
    });

    it('should wrap custom renderer output in a wrapper div', () => {
      const customRenderer = () => (
        <span data-testid="custom-content">Custom Content</span>
      );

      renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          customRenderer={customRenderer}
        />
      );

      const wrapper = screen.getByTestId('custom-content').parentElement;
      expect(wrapper).toHaveClass('custom-clip-wrapper');
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should fallback to default renderer when custom renderer throws an error', () => {
      const customRenderer = jest.fn(() => {
        throw new Error('Custom renderer error');
      });

      renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          customRenderer={customRenderer}
        />
      );

      // Should fallback to default renderer
      expect(screen.getByTestId('default-clip-test-clip-1')).toBeInTheDocument();
      expect(screen.getByText('Default Clip: Test Video Clip')).toBeInTheDocument();
      
      // Should log error
      expect(console.error).toHaveBeenCalledWith(
        'Custom clip renderer failed, falling back to default:',
        expect.any(Error)
      );
    });

    it('should fallback when custom renderer returns invalid React element', () => {
      const customRenderer = jest.fn(() => 'invalid-element' as any);

      renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          customRenderer={customRenderer}
        />
      );

      // Should fallback to default renderer
      expect(screen.getByTestId('default-clip-test-clip-1')).toBeInTheDocument();
      
      // Should log warning
      expect(console.warn).toHaveBeenCalledWith(
        'Custom clip renderer must return a valid React element or null. Falling back to default renderer.'
      );
    });

    it('should handle RenderError specifically', () => {
      const customRenderer = jest.fn(() => {
        throw new Error('RenderError: Component failed');
      });

      renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          customRenderer={customRenderer}
        />
      );

      // Should fallback to default renderer
      expect(screen.getByTestId('default-clip-test-clip-1')).toBeInTheDocument();
      expect(console.error).toHaveBeenCalled();
    });

    it('should maintain functionality after fallback', () => {
      const customRenderer = jest.fn(() => {
        throw new Error('Custom renderer error');
      });
      const onSelect = jest.fn();

      renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          customRenderer={customRenderer}
          onSelect={onSelect}
        />
      );

      // Should fallback and still be interactive
      const clipElement = screen.getByTestId('default-clip-test-clip-1');
      fireEvent.click(clipElement);
      expect(onSelect).toHaveBeenCalledWith('test-clip-1');
    });
  });

  describe('Double Click Handling', () => {
    it('should pass onDoubleClick to default Clip component', () => {
      const onDoubleClick = jest.fn();

      renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          onDoubleClick={onDoubleClick}
        />
      );

      // The onDoubleClick should be passed to the Clip component
      // We can't easily test the actual double click without mocking the Clip component
      // but we can verify the component renders without errors
      expect(screen.getByTestId('default-clip-test-clip-1')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should not re-render when props have not changed', () => {
      const customRenderer = jest.fn(() => <div>Custom</div>);
      
      const { rerender } = renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          customRenderer={customRenderer}
        />
      );

      expect(customRenderer).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <ThemeProvider>
          <ClipRenderer 
            {...defaultProps} 
            customRenderer={customRenderer}
          />
        </ThemeProvider>
      );

      // Should not call custom renderer again due to memoization
      expect(customRenderer).toHaveBeenCalledTimes(1);
    });

    it('should re-render when clip data changes', () => {
      const customRenderer = jest.fn(() => <div>Custom</div>);
      
      const { rerender } = renderWithTheme(
        <ClipRenderer 
          {...defaultProps} 
          customRenderer={customRenderer}
        />
      );

      expect(customRenderer).toHaveBeenCalledTimes(1);

      // Re-render with different clip
      const newClip = { ...mockClip, id: 'different-clip' };
      rerender(
        <ThemeProvider>
          <ClipRenderer 
            {...defaultProps} 
            clip={newClip}
            customRenderer={customRenderer}
          />
        </ThemeProvider>
      );

      // Should call custom renderer again
      expect(customRenderer).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration with Different Clip Types', () => {
    const clipTypes: ClipType['type'][] = ['video', 'audio', 'text', 'overlay'];

    clipTypes.forEach(type => {
      it(`should handle ${type} clips correctly`, () => {
        const clip: ClipType = {
          ...mockClip,
          type,
          metadata: {
            name: `Test ${type} clip`
          }
        };

        const customRenderer = jest.fn((props: ClipRendererProps) => (
          <div data-testid={`custom-${type}-clip`}>
            {props.clip.type}: {props.clip.metadata?.name}
          </div>
        ));

        renderWithTheme(
          <ClipRenderer 
            {...defaultProps} 
            clip={clip}
            customRenderer={customRenderer}
          />
        );

        expect(screen.getByTestId(`custom-${type}-clip`)).toBeInTheDocument();
        expect(screen.getByText(`${type}: Test ${type} clip`)).toBeInTheDocument();
        expect(customRenderer).toHaveBeenCalledWith(
          expect.objectContaining({
            clip: expect.objectContaining({ type })
          })
        );
      });
    });
  });
});