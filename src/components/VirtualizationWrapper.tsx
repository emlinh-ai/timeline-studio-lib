import React, { 
  useRef, 
  useEffect, 
  useState, 
  useMemo, 
  useCallback,
  ReactNode,
  memo
} from 'react';
import { VirtualizationConfig } from '../types';

interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

interface VirtualizationWrapperProps {
  // Data
  itemCount: number;
  itemHeight: number;
  estimatedItemSize?: number;
  overscan?: number;
  
  // Container
  height: number;
  width?: number | string;
  
  // Rendering
  renderItem: (index: number, style: React.CSSProperties) => ReactNode;
  
  // Configuration
  useFixedSize?: boolean;
  className?: string;
  style?: React.CSSProperties;
  
  // Callbacks
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void;
}

/**
 * VirtualizationWrapper component that efficiently renders large lists
 * using Intersection Observer for visibility detection and overscan for smooth scrolling
 * Memoized to prevent unnecessary re-renders
 */
const VirtualizationWrapperComponent = memo(function VirtualizationWrapper({
  itemCount,
  itemHeight,
  estimatedItemSize = 60,
  overscan = 5,
  height,
  width = '100%',
  renderItem,
  useFixedSize = true,
  className = '',
  style = {},
  onScroll,
  onVisibleRangeChange
}: VirtualizationWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [measuredSizes, setMeasuredSizes] = useState<Map<number, number>>(new Map());
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Calculate item positions and sizes
  const virtualItems = useMemo((): VirtualItem[] => {
    const items: VirtualItem[] = [];
    let currentOffset = 0;

    for (let i = 0; i < itemCount; i++) {
      const size = useFixedSize 
        ? itemHeight 
        : measuredSizes.get(i) || estimatedItemSize;
      
      items.push({
        index: i,
        start: currentOffset,
        size,
        end: currentOffset + size
      });
      
      currentOffset += size;
    }

    return items;
  }, [itemCount, itemHeight, estimatedItemSize, useFixedSize, measuredSizes]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (virtualItems.length === 0) return 0;
    return virtualItems[virtualItems.length - 1].end;
  }, [virtualItems]);

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    if (virtualItems.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] };
    }

    const viewportStart = scrollTop;
    const viewportEnd = scrollTop + height;

    // Find first visible item
    let startIndex = 0;
    for (let i = 0; i < virtualItems.length; i++) {
      if (virtualItems[i].end > viewportStart) {
        startIndex = i;
        break;
      }
    }

    // Find last visible item
    let endIndex = virtualItems.length - 1;
    for (let i = startIndex; i < virtualItems.length; i++) {
      if (virtualItems[i].start > viewportEnd) {
        endIndex = i - 1;
        break;
      }
    }

    // Apply overscan
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(virtualItems.length - 1, endIndex + overscan);

    const visibleItems = virtualItems.slice(overscanStart, overscanEnd + 1);

    return {
      startIndex: overscanStart,
      endIndex: overscanEnd,
      visibleItems
    };
  }, [virtualItems, scrollTop, height, overscan]);

  // Setup Intersection Observer for dynamic sizing
  useEffect(() => {
    if (useFixedSize) return;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const newSizes = new Map(measuredSizes);
        let hasChanges = false;

        entries.forEach((entry) => {
          const element = entry.target as HTMLDivElement;
          const index = parseInt(element.dataset.index || '0', 10);
          const newSize = entry.boundingClientRect.height;
          
          if (newSize > 0 && newSize !== measuredSizes.get(index)) {
            newSizes.set(index, newSize);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          setMeasuredSizes(newSizes);
        }
      },
      {
        root: containerRef.current,
        rootMargin: '0px',
        threshold: 0
      }
    );

    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, [useFixedSize, measuredSizes]);

  // Observe visible items for size measurement
  useEffect(() => {
    if (useFixedSize || !intersectionObserverRef.current) return;

    // Observe all currently rendered items
    itemRefs.current.forEach((element, index) => {
      if (element && visibleRange.visibleItems.some(item => item.index === index)) {
        intersectionObserverRef.current?.observe(element);
      } else if (element) {
        intersectionObserverRef.current?.unobserve(element);
      }
    });
  }, [visibleRange.visibleItems, useFixedSize]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const newScrollTop = target.scrollTop;
    const newScrollLeft = target.scrollLeft;
    
    setScrollTop(newScrollTop);
    setScrollLeft(newScrollLeft);
    
    onScroll?.(newScrollTop, newScrollLeft);
  }, [onScroll]);

  // Notify about visible range changes
  useEffect(() => {
    onVisibleRangeChange?.(visibleRange.startIndex, visibleRange.endIndex);
  }, [visibleRange.startIndex, visibleRange.endIndex, onVisibleRangeChange]);

  // Ref callback for item elements
  const setItemRef = useCallback((index: number) => (element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(index, element);
      element.dataset.index = index.toString();
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`virtualization-wrapper ${className}`}
      style={{
        height,
        width,
        overflow: 'auto',
        position: 'relative',
        ...style
      }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div
        style={{
          height: totalHeight,
          width: '100%',
          position: 'relative'
        }}
      >
        {/* Rendered items */}
        {visibleRange.visibleItems.map((virtualItem) => {
          const itemStyle: React.CSSProperties = {
            position: 'absolute',
            top: virtualItem.start,
            left: 0,
            width: '100%',
            height: useFixedSize ? virtualItem.size : undefined,
            minHeight: useFixedSize ? undefined : virtualItem.size
          };

          return (
            <div
              key={virtualItem.index}
              ref={setItemRef(virtualItem.index)}
              style={itemStyle}
              data-index={virtualItem.index}
            >
              {renderItem(virtualItem.index, itemStyle)}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Hook for managing virtualization state and configuration
 */
export function useVirtualization(config: VirtualizationConfig) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [itemSizes, setItemSizes] = useState<Map<number, number>>(new Map());

  const updateVisibleRange = useCallback((startIndex: number, endIndex: number) => {
    setVisibleRange({ start: startIndex, end: endIndex });
  }, []);

  const updateItemSize = useCallback((index: number, size: number) => {
    setItemSizes(prev => {
      const newSizes = new Map(prev);
      newSizes.set(index, size);
      return newSizes;
    });
  }, []);

  const getItemSize = useCallback((index: number) => {
    return itemSizes.get(index) || config.estimatedItemSize;
  }, [itemSizes, config.estimatedItemSize]);

  return {
    visibleRange,
    itemSizes,
    updateVisibleRange,
    updateItemSize,
    getItemSize
  };
}

export const VirtualizationWrapper = memo(VirtualizationWrapperComponent);
export default VirtualizationWrapper;