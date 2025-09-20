import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { VirtualizationWrapper, useVirtualization } from '../VirtualizationWrapper';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));

const defaultProps = {
  itemCount: 100,
  itemHeight: 50,
  height: 400,
  renderItem: (index: number, style: React.CSSProperties) => (
    <div key={index} style={style} data-testid={`item-${index}`}>
      Item {index}
    </div>
  )
};

describe('VirtualizationWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIntersectionObserver.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render virtualization wrapper with correct structure', () => {
      const { container } = render(<VirtualizationWrapper {...defaultProps} />);
      
      const wrapper = container.querySelector('.virtualization-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveStyle({
        height: '400px',
        width: '100%',
        overflow: 'auto',
        position: 'relative'
      });
    });

    it('should render visible items only', () => {
      render(<VirtualizationWrapper {...defaultProps} />);
      
      // Should render items in viewport + overscan
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      
      // Should not render items far outside viewport
      expect(screen.queryByTestId('item-50')).not.toBeInTheDocument();
      expect(screen.queryByTestId('item-99')).not.toBeInTheDocument();
    });

    it('should create total height spacer', () => {
      const { container } = render(<VirtualizationWrapper {...defaultProps} />);
      
      // The spacer is the second div inside the virtualization wrapper
      const wrapper = container.querySelector('.virtualization-wrapper');
      const spacer = wrapper?.querySelector('div');
      expect(spacer).toHaveStyle({
        height: '5000px', // itemCount * itemHeight = 100 * 50
        width: '100%',
        position: 'relative'
      });
    });

    it('should position items absolutely', () => {
      render(<VirtualizationWrapper {...defaultProps} />);
      
      const firstItem = screen.getByTestId('item-0');
      expect(firstItem.parentElement).toHaveStyle({
        position: 'absolute',
        top: '0px',
        left: '0px',
        width: '100%',
        height: '50px'
      });
    });
  });

  describe('Scrolling Behavior', () => {
    it('should handle scroll events', () => {
      const onScroll = jest.fn();
      const { container } = render(
        <VirtualizationWrapper 
          {...defaultProps}
          onScroll={onScroll}
        />
      );
      
      const wrapper = container.querySelector('.virtualization-wrapper')!;
      
      act(() => {
        fireEvent.scroll(wrapper, { target: { scrollTop: 100, scrollLeft: 50 } });
      });
      
      expect(onScroll).toHaveBeenCalledWith(100, 50);
    });

    it('should update visible items on scroll', () => {
      const { container } = render(<VirtualizationWrapper {...defaultProps} />);
      
      const wrapper = container.querySelector('.virtualization-wrapper')!;
      
      act(() => {
        fireEvent.scroll(wrapper, { target: { scrollTop: 500 } });
      });
      
      // Should render different items after scroll
      expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
      expect(screen.getByTestId('item-10')).toBeInTheDocument();
    });

    it('should notify about visible range changes', () => {
      const onVisibleRangeChange = jest.fn();
      const { container } = render(
        <VirtualizationWrapper 
          {...defaultProps}
          onVisibleRangeChange={onVisibleRangeChange}
        />
      );
      
      const wrapper = container.querySelector('.virtualization-wrapper')!;
      
      act(() => {
        fireEvent.scroll(wrapper, { target: { scrollTop: 250 } });
      });
      
      expect(onVisibleRangeChange).toHaveBeenCalled();
    });
  });

  describe('Overscan', () => {
    it('should render overscan items', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          overscan={3}
        />
      );
      
      // Should render more items due to overscan
      const items = screen.getAllByTestId(/item-/);
      expect(items.length).toBeGreaterThan(8); // viewport items + overscan
    });

    it('should handle zero overscan', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          overscan={0}
        />
      );
      
      // Should render only visible items
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });

    it('should not render overscan items beyond bounds', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          itemCount={5}
          overscan={10}
        />
      );
      
      // Should not render more items than available
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-4')).toBeInTheDocument();
      expect(screen.queryByTestId('item-5')).not.toBeInTheDocument();
    });
  });

  describe('Dynamic Sizing', () => {
    it('should use fixed size when useFixedSize is true', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          useFixedSize={true}
        />
      );
      
      const firstItem = screen.getByTestId('item-0');
      expect(firstItem.parentElement).toHaveStyle({
        height: '50px'
      });
    });

    it('should use estimated size when useFixedSize is false', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          useFixedSize={false}
          estimatedItemSize={60}
        />
      );
      
      const firstItem = screen.getByTestId('item-0');
      expect(firstItem.parentElement).toHaveStyle({
        minHeight: '60px'
      });
    });

    it('should setup IntersectionObserver for dynamic sizing', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          useFixedSize={false}
        />
      );
      
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it('should not setup IntersectionObserver for fixed sizing', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          useFixedSize={true}
        />
      );
      
      expect(mockIntersectionObserver).not.toHaveBeenCalled();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <VirtualizationWrapper 
          {...defaultProps}
          className="custom-class"
        />
      );
      
      const wrapper = container.querySelector('.virtualization-wrapper');
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should apply custom styles', () => {
      const customStyle = { backgroundColor: 'red', border: '1px solid blue' };
      const { container } = render(
        <VirtualizationWrapper 
          {...defaultProps}
          style={customStyle}
        />
      );
      
      const wrapper = container.querySelector('.virtualization-wrapper');
      expect(wrapper).toHaveStyle(customStyle);
    });

    it('should handle string width', () => {
      const { container } = render(
        <VirtualizationWrapper 
          {...defaultProps}
          width="500px"
        />
      );
      
      const wrapper = container.querySelector('.virtualization-wrapper');
      expect(wrapper).toHaveStyle({ width: '500px' });
    });

    it('should handle numeric width', () => {
      const { container } = render(
        <VirtualizationWrapper 
          {...defaultProps}
          width={500}
        />
      );
      
      const wrapper = container.querySelector('.virtualization-wrapper');
      expect(wrapper).toHaveStyle({ width: '500px' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero items', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          itemCount={0}
        />
      );
      
      expect(screen.queryByTestId(/item-/)).not.toBeInTheDocument();
    });

    it('should handle single item', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          itemCount={1}
        />
      );
      
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.queryByTestId('item-1')).not.toBeInTheDocument();
    });

    it('should handle very small height', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          height={10}
        />
      );
      
      // Should still render at least one item
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });

    it('should handle very large itemHeight', () => {
      render(
        <VirtualizationWrapper 
          {...defaultProps}
          itemHeight={1000}
          overscan={0} // Disable overscan to test exact visibility
        />
      );
      
      // Should render fewer items due to large height
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.queryByTestId('item-2')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize component to prevent unnecessary re-renders', () => {
      const renderItem = jest.fn((index: number, style: React.CSSProperties) => (
        <div key={index} style={style}>Item {index}</div>
      ));
      
      const { rerender } = render(
        <VirtualizationWrapper 
          {...defaultProps}
          renderItem={renderItem}
        />
      );
      
      const initialCallCount = renderItem.mock.calls.length;
      
      // Re-render with same props
      rerender(
        <VirtualizationWrapper 
          {...defaultProps}
          renderItem={renderItem}
        />
      );
      
      // Should not call renderItem again due to memoization
      expect(renderItem.mock.calls.length).toBe(initialCallCount);
    });

    it('should handle rapid scroll events efficiently', () => {
      const onScroll = jest.fn();
      const { container } = render(
        <VirtualizationWrapper 
          {...defaultProps}
          onScroll={onScroll}
        />
      );
      
      const wrapper = container.querySelector('.virtualization-wrapper')!;
      
      // Rapid scroll events
      act(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.scroll(wrapper, { target: { scrollTop: i * 10 } });
        }
      });
      
      expect(onScroll).toHaveBeenCalledTimes(10);
    });
  });

  describe('Data Attributes', () => {
    it('should set data-index on item elements', () => {
      render(<VirtualizationWrapper {...defaultProps} />);
      
      const firstItem = screen.getByTestId('item-0');
      expect(firstItem.parentElement).toHaveAttribute('data-index', '0');
    });

    it('should update data-index for different items', () => {
      const { container } = render(<VirtualizationWrapper {...defaultProps} />);
      
      act(() => {
        const wrapper = container.querySelector('.virtualization-wrapper')!;
        fireEvent.scroll(wrapper, { target: { scrollTop: 500 } });
      });
      
      const visibleItem = screen.getByTestId('item-10');
      expect(visibleItem.parentElement).toHaveAttribute('data-index', '10');
    });
  });

  describe('Cleanup', () => {
    it('should disconnect IntersectionObserver on unmount', () => {
      const mockDisconnect = jest.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: mockDisconnect
      });
      
      const { unmount } = render(
        <VirtualizationWrapper 
          {...defaultProps}
          useFixedSize={false}
        />
      );
      
      unmount();
      
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});

describe('useVirtualization hook', () => {
  const TestComponent = ({ config }: { config: any }) => {
    const {
      visibleRange,
      itemSizes,
      updateVisibleRange,
      updateItemSize,
      getItemSize
    } = useVirtualization(config);
    
    return (
      <div>
        <div data-testid="visible-range">
          {visibleRange.start}-{visibleRange.end}
        </div>
        <div data-testid="item-size-0">
          {getItemSize(0)}
        </div>
        <button 
          onClick={() => updateVisibleRange(5, 15)}
          data-testid="update-range"
        >
          Update Range
        </button>
        <button 
          onClick={() => updateItemSize(0, 100)}
          data-testid="update-size"
        >
          Update Size
        </button>
      </div>
    );
  };

  const config = {
    itemHeight: 50,
    estimatedItemSize: 60,
    overscan: 5,
    useFixedSize: false
  };

  it('should initialize with default values', () => {
    render(<TestComponent config={config} />);
    
    expect(screen.getByTestId('visible-range')).toHaveTextContent('0-0');
    expect(screen.getByTestId('item-size-0')).toHaveTextContent('60');
  });

  it('should update visible range', () => {
    render(<TestComponent config={config} />);
    
    fireEvent.click(screen.getByTestId('update-range'));
    
    expect(screen.getByTestId('visible-range')).toHaveTextContent('5-15');
  });

  it('should update item sizes', () => {
    render(<TestComponent config={config} />);
    
    fireEvent.click(screen.getByTestId('update-size'));
    
    expect(screen.getByTestId('item-size-0')).toHaveTextContent('100');
  });

  it('should return estimated size for unmeasured items', () => {
    render(<TestComponent config={config} />);
    
    expect(screen.getByTestId('item-size-0')).toHaveTextContent('60');
  });

  it('should handle multiple size updates', () => {
    render(<TestComponent config={config} />);
    
    fireEvent.click(screen.getByTestId('update-size'));
    fireEvent.click(screen.getByTestId('update-size'));
    
    expect(screen.getByTestId('item-size-0')).toHaveTextContent('100');
  });
});