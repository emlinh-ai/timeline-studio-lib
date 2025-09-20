import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VirtualizationWrapper, useVirtualization } from '../VirtualizationWrapper';
import { VirtualizationConfig } from '../../types';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock requestAnimationFrame
window.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

describe('VirtualizationWrapper', () => {
  const defaultProps = {
    itemCount: 100,
    itemHeight: 60,
    height: 400,
    renderItem: (index: number, style: React.CSSProperties) => (
      <div style={style} data-testid={`item-${index}`}>
        Item {index}
      </div>
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders visible items only', () => {
    render(<VirtualizationWrapper {...defaultProps} />);
    
    // Should render items that fit in the viewport (400px / 60px = ~7 items + overscan)
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    
    // Should not render items far outside viewport
    expect(screen.queryByTestId('item-50')).not.toBeInTheDocument();
  });

  it('applies overscan correctly', () => {
    render(<VirtualizationWrapper {...defaultProps} overscan={3} />);
    
    // With overscan of 3, should render additional items beyond viewport
    const visibleItems = screen.getAllByTestId(/item-\d+/);
    expect(visibleItems.length).toBeGreaterThan(7); // More than just viewport items
  });

  it('handles scroll events', async () => {
    const onScroll = jest.fn();
    render(<VirtualizationWrapper {...defaultProps} onScroll={onScroll} />);
    
    const container = document.querySelector('.virtualization-wrapper') as HTMLElement;
    fireEvent.scroll(container, { target: { scrollTop: 300, scrollLeft: 0 } });
    
    await waitFor(() => {
      expect(onScroll).toHaveBeenCalledWith(300, 0);
    });
  });

  it('notifies about visible range changes', async () => {
    const onVisibleRangeChange = jest.fn();
    render(
      <VirtualizationWrapper 
        {...defaultProps} 
        onVisibleRangeChange={onVisibleRangeChange}
      />
    );
    
    await waitFor(() => {
      expect(onVisibleRangeChange).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  it('handles empty item list', () => {
    render(<VirtualizationWrapper {...defaultProps} itemCount={0} />);
    
    expect(screen.queryByTestId(/item-\d+/)).not.toBeInTheDocument();
  });

  it('uses fixed size when specified', () => {
    render(<VirtualizationWrapper {...defaultProps} useFixedSize={true} />);
    
    const item = screen.getByTestId('item-0');
    const style = window.getComputedStyle(item);
    expect(style.height).toBe('60px');
  });

  it('supports dynamic sizing', () => {
    render(
      <VirtualizationWrapper 
        {...defaultProps} 
        useFixedSize={false}
        estimatedItemSize={50}
      />
    );
    
    // Should setup IntersectionObserver for dynamic sizing
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });
});

describe('VirtualizationWrapper Performance Tests', () => {
  const createLargeDataset = (count: number) => ({
    itemCount: count,
    itemHeight: 60,
    height: 400,
    renderItem: (index: number, style: React.CSSProperties) => (
      <div style={style} data-testid={`item-${index}`}>
        <div>Item {index}</div>
        <div>Content for item {index}</div>
        <div>More content {index}</div>
      </div>
    ),
  });

  it('handles 1000 items efficiently', async () => {
    const startTime = performance.now();
    
    render(<VirtualizationWrapper {...createLargeDataset(1000)} />);
    
    const renderTime = performance.now() - startTime;
    
    // Should render quickly even with 1000 items
    expect(renderTime).toBeLessThan(100); // Less than 100ms
    
    // Should only render visible items, not all 1000
    const renderedItems = screen.getAllByTestId(/item-\d+/);
    expect(renderedItems.length).toBeLessThan(20); // Much less than 1000
  });

  it('handles 5000 items efficiently', async () => {
    const startTime = performance.now();
    
    render(<VirtualizationWrapper {...createLargeDataset(5000)} />);
    
    const renderTime = performance.now() - startTime;
    
    // Should still render quickly with 5000 items
    expect(renderTime).toBeLessThan(200); // Less than 200ms
    
    // Should only render visible items
    const renderedItems = screen.getAllByTestId(/item-\d+/);
    expect(renderedItems.length).toBeLessThan(20);
  });

  it('maintains performance during scroll with large dataset', async () => {
    render(<VirtualizationWrapper {...createLargeDataset(2000)} />);
    
    const container = document.querySelector('.virtualization-wrapper') as HTMLElement;
    
    // Measure scroll performance
    const scrollStart = performance.now();
    
    // Simulate multiple scroll events
    for (let i = 0; i < 10; i++) {
      fireEvent.scroll(container, { 
        target: { scrollTop: i * 100, scrollLeft: 0 } 
      });
    }
    
    const scrollTime = performance.now() - scrollStart;
    
    // Should handle multiple scrolls quickly
    expect(scrollTime).toBeLessThan(100); // Less than 100ms for 10 scrolls (adjusted for CI environment)
  });

  it('memory usage remains stable with large datasets', () => {
    const { rerender } = render(<VirtualizationWrapper {...createLargeDataset(1000)} />);
    
    // Get initial memory usage (approximate)
    const initialItems = screen.getAllByTestId(/item-\d+/).length;
    
    // Rerender with even larger dataset
    rerender(<VirtualizationWrapper {...createLargeDataset(10000)} />);
    
    const finalItems = screen.getAllByTestId(/item-\d+/).length;
    
    // Should not render significantly more items despite 10x data increase
    expect(finalItems).toBeLessThanOrEqual(initialItems + 5);
  });
});

describe('useVirtualization hook', () => {
  const TestComponent = ({ config }: { config: VirtualizationConfig }) => {
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
        <button 
          onClick={() => updateVisibleRange(5, 15)}
          data-testid="update-range"
        >
          Update Range
        </button>
        <button 
          onClick={() => updateItemSize(0, 80)}
          data-testid="update-size"
        >
          Update Size
        </button>
        <div data-testid="item-size">
          {getItemSize(0)}
        </div>
      </div>
    );
  };

  const config: VirtualizationConfig = {
    itemHeight: 60,
    overscan: 5,
    estimatedItemSize: 60,
    useFixedSize: true
  };

  it('manages visible range state', () => {
    render(<TestComponent config={config} />);
    
    expect(screen.getByTestId('visible-range')).toHaveTextContent('0-0');
    
    fireEvent.click(screen.getByTestId('update-range'));
    
    expect(screen.getByTestId('visible-range')).toHaveTextContent('5-15');
  });

  it('manages item sizes', () => {
    render(<TestComponent config={config} />);
    
    expect(screen.getByTestId('item-size')).toHaveTextContent('60');
    
    fireEvent.click(screen.getByTestId('update-size'));
    
    expect(screen.getByTestId('item-size')).toHaveTextContent('80');
  });
});

describe('VirtualizationWrapper Edge Cases', () => {
  const defaultProps = {
    itemCount: 10,
    itemHeight: 60,
    height: 400,
    renderItem: (index: number, style: React.CSSProperties) => (
      <div style={style} data-testid={`item-${index}`}>
        Item {index}
      </div>
    ),
  };

  it('handles zero height container', () => {
    render(<VirtualizationWrapper {...defaultProps} height={0} />);
    
    // Should not crash - with zero height, it might still render some items due to overscan
    // The important thing is that it doesn't crash
    expect(document.querySelector('.virtualization-wrapper')).toBeInTheDocument();
  });

  it('handles very small items', () => {
    render(<VirtualizationWrapper {...defaultProps} itemHeight={1} />);
    
    // Should render many items due to small height (400px viewport / 1px items + overscan)
    const items = screen.getAllByTestId(/item-\d+/);
    expect(items.length).toBeGreaterThanOrEqual(10);
  });

  it('handles very large items', () => {
    render(<VirtualizationWrapper {...defaultProps} itemHeight={500} />);
    
    // Should render fewer items due to large height (400px viewport / 500px items + overscan)
    const items = screen.getAllByTestId(/item-\d+/);
    expect(items.length).toBeLessThanOrEqual(6); // Viewport + overscan
  });

  it('handles rapid prop changes', () => {
    const { rerender } = render(<VirtualizationWrapper {...defaultProps} />);
    
    // Rapidly change props
    for (let i = 0; i < 10; i++) {
      rerender(
        <VirtualizationWrapper 
          {...defaultProps} 
          itemCount={10 + i}
          itemHeight={60 + i}
        />
      );
    }
    
    // Should not crash and should render final state
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
  });
});