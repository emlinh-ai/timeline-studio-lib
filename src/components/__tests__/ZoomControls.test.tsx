import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimelineHeader } from '../TimelineHeader';
import { EventBusProvider } from '../../eventBus/EventBusProvider';
import { TimelineTheme } from '../../types';

const defaultTheme: TimelineTheme = {
  primaryColor: '#007acc',
  backgroundColor: '#1e1e1e',
  trackBackgroundColor: '#2d2d2d',
  clipBorderRadius: '4px',
  clipColors: {
    video: '#4CAF50',
    audio: '#FF9800',
    text: '#2196F3',
    overlay: '#9C27B0'
  },
  fonts: {
    primary: 'Arial, sans-serif',
    monospace: 'Monaco, monospace'
  }
};

const renderWithEventBus = (component: React.ReactElement) => {
  return render(
    <EventBusProvider namespace="test">
      {component}
    </EventBusProvider>
  );
};

describe('ZoomControls', () => {
  const defaultProps = {
    currentTime: 10,
    duration: 100,
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 10,
    pixelsPerSecond: 100,
    theme: defaultTheme
  };

  it('renders zoom controls with correct zoom percentage', () => {
    renderWithEventBus(<TimelineHeader {...defaultProps} />);
    
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('displays zoom in and zoom out buttons', () => {
    renderWithEventBus(<TimelineHeader {...defaultProps} />);
    
    expect(screen.getByTitle('Zoom In (Ctrl + +)')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out (Ctrl + -)')).toBeInTheDocument();
  });

  it('displays reset zoom and zoom to fit buttons', () => {
    renderWithEventBus(<TimelineHeader {...defaultProps} />);
    
    expect(screen.getByTitle('Reset Zoom (Ctrl + 0)')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom to Fit')).toBeInTheDocument();
  });

  it('calls onZoomChange when zoom in button is clicked', () => {
    const onZoomChange = jest.fn();
    
    renderWithEventBus(
      <TimelineHeader {...defaultProps} onZoomChange={onZoomChange} />
    );
    
    fireEvent.click(screen.getByTitle('Zoom In (Ctrl + +)'));
    
    expect(onZoomChange).toHaveBeenCalledWith(1.5); // 1 * 1.5
  });

  it('calls onZoomChange when zoom out button is clicked', () => {
    const onZoomChange = jest.fn();
    
    renderWithEventBus(
      <TimelineHeader {...defaultProps} zoom={2} onZoomChange={onZoomChange} />
    );
    
    fireEvent.click(screen.getByTitle('Zoom Out (Ctrl + -)'));
    
    expect(onZoomChange).toHaveBeenCalledWith(1.3333333333333333); // 2 / 1.5
  });

  it('calls onZoomChange when reset zoom button is clicked', () => {
    const onZoomChange = jest.fn();
    
    renderWithEventBus(
      <TimelineHeader {...defaultProps} zoom={2} onZoomChange={onZoomChange} />
    );
    
    fireEvent.click(screen.getByTitle('Reset Zoom (Ctrl + 0)'));
    
    expect(onZoomChange).toHaveBeenCalledWith(1);
  });

  it('calls onZoomChange when zoom to fit button is clicked', () => {
    const onZoomChange = jest.fn();
    
    renderWithEventBus(
      <TimelineHeader {...defaultProps} onZoomChange={onZoomChange} />
    );
    
    fireEvent.click(screen.getByTitle('Zoom to Fit'));
    
    expect(onZoomChange).toHaveBeenCalledWith(0.5); // Default fit zoom
  });

  it('respects minimum zoom limit', () => {
    const onZoomChange = jest.fn();
    
    renderWithEventBus(
      <TimelineHeader 
        {...defaultProps} 
        zoom={0.1} 
        minZoom={0.1}
        onZoomChange={onZoomChange} 
      />
    );
    
    const zoomOutButton = screen.getByTitle('Zoom Out (Ctrl + -)');
    expect(zoomOutButton).toBeDisabled();
  });

  it('respects maximum zoom limit', () => {
    const onZoomChange = jest.fn();
    
    renderWithEventBus(
      <TimelineHeader 
        {...defaultProps} 
        zoom={10} 
        maxZoom={10}
        onZoomChange={onZoomChange} 
      />
    );
    
    const zoomInButton = screen.getByTitle('Zoom In (Ctrl + +)');
    expect(zoomInButton).toBeDisabled();
  });

  it('updates zoom percentage display when zoom changes', () => {
    const { rerender } = renderWithEventBus(
      <TimelineHeader {...defaultProps} zoom={1} />
    );
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    rerender(
      <EventBusProvider namespace="test">
        <TimelineHeader {...defaultProps} zoom={2.5} />
      </EventBusProvider>
    );
    
    expect(screen.getByText('250%')).toBeInTheDocument();
  });

  it('emits timeline:zoom event when zoom changes', async () => {
    const eventHandler = jest.fn();
    
    const TestComponent = () => {
      const eventBus = require('../../eventBus/EventBusProvider').useEventBus();
      
      React.useEffect(() => {
        eventBus.on('timeline:zoom', eventHandler);
        return () => eventBus.off('timeline:zoom', eventHandler);
      }, [eventBus]);
      
      return <TimelineHeader {...defaultProps} />;
    };
    
    renderWithEventBus(<TestComponent />);
    
    fireEvent.click(screen.getByTitle('Zoom In (Ctrl + +)'));
    
    await waitFor(() => {
      expect(eventHandler).toHaveBeenCalledWith({
        oldScale: 1,
        newScale: 1.5,
        centerTime: 10
      });
    });
  });

  it('handles zoom with center time parameter', () => {
    const onZoomChange = jest.fn();
    
    renderWithEventBus(
      <TimelineHeader 
        {...defaultProps} 
        currentTime={25}
        onZoomChange={onZoomChange} 
      />
    );
    
    fireEvent.click(screen.getByTitle('Zoom In (Ctrl + +)'));
    
    // The zoom change should be called with the new zoom level
    expect(onZoomChange).toHaveBeenCalledWith(1.5);
  });
});