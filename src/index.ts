/**
 * React Timeline Library
 * 
 * A comprehensive React library for building video editing timelines with multi-track support,
 * drag & drop functionality, virtualization, and event-driven architecture.
 * 
 * @packageDocumentation
 */

// Import base styles - automatically included when importing the library
import './styles/timeline.css';

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Core TypeScript interfaces and types for the timeline library.
 * Includes Clip, Track, TimelineState, TimelineProps, and event payload types.
 */
export * from './types';

// ============================================================================
// MAIN COMPONENTS
// ============================================================================

/**
 * Main Timeline component and error boundary utilities.
 * 
 * @example
 * ```tsx
 * import { Timeline } from 'timeline-studio-lib';
 * 
 * <Timeline
 *   tracks={tracks}
 *   duration={30}
 *   onClipClick={(payload) => console.log('Clip clicked:', payload)}
 * />
 * ```
 */
export { Timeline, TimelineErrorBoundary, withErrorBoundary } from './components';

/**
 * Custom clip renderer component for creating custom clip visualizations.
 * 
 * @example
 * ```tsx
 * import { ClipRenderer } from 'timeline-studio-lib';
 * 
 * const CustomClip = (props) => (
 *   <ClipRenderer {...props}>
 *     <div>Custom content</div>
 *   </ClipRenderer>
 * );
 * ```
 */
export { ClipRenderer } from './components/ClipRenderer';

// ============================================================================
// THEME SYSTEM
// ============================================================================

/**
 * Theme system for customizing timeline appearance.
 * 
 * @example
 * ```tsx
 * import { ThemeProvider, defaultTheme } from 'timeline-studio-lib';
 * 
 * const customTheme = {
 *   ...defaultTheme,
 *   primaryColor: '#ff6b6b'
 * };
 * 
 * <ThemeProvider theme={customTheme}>
 *   <Timeline {...props} />
 * </ThemeProvider>
 * ```
 */
export { ThemeProvider, useTheme, defaultTheme } from './theme';

// ============================================================================
// VIRTUALIZATION
// ============================================================================

/**
 * Virtualization components for handling large datasets efficiently.
 * Automatically used by Timeline when enableVirtualization is true.
 * 
 * @example
 * ```tsx
 * import { VirtualizationWrapper } from 'timeline-studio-lib';
 * 
 * <Timeline
 *   enableVirtualization={true}
 *   estimatedItemSize={80}
 *   tracks={largeTrackList}
 * />
 * ```
 */
export { VirtualizationWrapper, useVirtualization } from './components/VirtualizationWrapper';
export { VirtualizedTrackContainer } from './components/VirtualizedTrackContainer';

// ============================================================================
// EVENT BUS SYSTEM
// ============================================================================

/**
 * Event bus system for external communication with timeline components.
 * Provides hooks and providers for event-driven architecture.
 * 
 * @example
 * ```tsx
 * import { EventBusProvider, useEventBus } from 'timeline-studio-lib';
 * 
 * function App() {
 *   return (
 *     <EventBusProvider namespace="my-timeline">
 *       <Timeline />
 *       <ExternalControls />
 *     </EventBusProvider>
 *   );
 * }
 * 
 * function ExternalControls() {
 *   const eventBus = useEventBus();
 *   
 *   const addClip = () => {
 *     eventBus.emit('timeline:addClip', { clip: newClip });
 *   };
 * }
 * ```
 */
export { 
  EventBusProvider, 
  useEventBus, 
  useEventBusNamespace,
  useEventListener,
  useEventEmitter,
  useEventBusDebug,
  withEventBus
} from './eventBus/EventBusProvider';

/**
 * Core EventBus class and utilities for creating custom event bus instances.
 * 
 * @example
 * ```tsx
 * import { EventBus, createEventBus } from 'timeline-studio-lib';
 * 
 * const customEventBus = createEventBus('custom-namespace');
 * customEventBus.emit('timeline:addClip', { clip });
 * ```
 */
export { EventBus, createEventBus } from './eventBus/EventBus';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Core state management utilities including reducer, actions, and initial state.
 * Used internally by Timeline component but can be used for custom implementations.
 * 
 * @example
 * ```tsx
 * import { timelineReducer, createInitialState, timelineActions } from 'timeline-studio-lib';
 * 
 * const [state, dispatch] = useReducer(timelineReducer, createInitialState());
 * dispatch(timelineActions.addClip(newClip));
 * ```
 */
export { 
  timelineReducer, 
  createInitialState, 
  timelineActions 
} from './state/reducer';

/**
 * State management hooks for undo/redo, serialization, and state tracking.
 * 
 * @example
 * ```tsx
 * import { useUndoRedo, useStateSerialization } from 'timeline-studio-lib';
 * 
 * function TimelineControls() {
 *   const { undo, redo, canUndo, canRedo } = useUndoRedo();
 *   const { exportState, importState } = useStateSerialization();
 * }
 * ```
 */
export {
  useUndoRedo,
  useStateSerialization,
  useTimelineState,
  useUndoRedoKeyboard,
  useStateChangeTracking
} from './state/hooks';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Data validation utilities for ensuring timeline state integrity.
 * 
 * @example
 * ```tsx
 * import { validateClip, validateTimelineState } from 'timeline-studio-lib';
 * 
 * const isValid = validateClip(clipData);
 * const stateErrors = validateTimelineState(state);
 * ```
 */
export { 
  validateClip,
  validateTrack,
  validateTimelineState,
  validateClipUpdates,
  validateTrackUpdates
} from './state/validation';

// ============================================================================
// SERIALIZATION UTILITIES
// ============================================================================

/**
 * State serialization utilities for saving and loading timeline state.
 * 
 * @example
 * ```tsx
 * import { serializeTimelineState, deserializeTimelineState } from 'timeline-studio-lib';
 * 
 * const serialized = serializeTimelineState(state);
 * const restored = deserializeTimelineState(serialized);
 * ```
 */
export {
  serializeTimelineState,
  deserializeTimelineState
} from './state/serialization';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Accessibility utilities for screen reader support and keyboard navigation.
 * 
 * @example
 * ```tsx
 * import { announceToScreenReader, formatTimeForScreenReader } from 'timeline-studio-lib';
 * 
 * // Announce clip selection to screen readers
 * announceToScreenReader(`Selected ${clip.metadata?.name} at ${formatTimeForScreenReader(clip.start)}`);
 * ```
 */
export {
  announceToScreenReader,
  formatTimeForScreenReader,
  getClipAccessibleDescription,
  getTrackAccessibleDescription,
  prefersReducedMotion,
  prefersHighContrast,
  getFocusRingStyle,
  getTransitionStyle,
  handleAccessibleKeyDown,
  generateAccessibilityId,
  validateAccessibility
} from './utils/accessibility';

/**
 * Responsive utilities for handling different screen sizes and breakpoints.
 * 
 * @example
 * ```tsx
 * import { useScreenSize, useResponsiveConfig } from 'timeline-studio-lib';
 * 
 * function ResponsiveTimeline() {
 *   const { screenSize } = useScreenSize();
 *   const config = useResponsiveConfig();
 *   
 *   return (
 *     <Timeline
 *       trackHeight={config.trackHeight}
 *       pixelsPerSecond={screenSize === 'mobile' ? 5 : 10}
 *     />
 *   );
 * }
 * ```
 */
export {
  getScreenSize,
  getResponsiveValue,
  getResponsiveTimeInterval,
  useScreenSize,
  useResponsiveConfig,
  getResponsivePixelsPerSecond,
  getMediaQueries,
  DEFAULT_BREAKPOINTS,
  DEFAULT_RESPONSIVE_CONFIG
} from './utils/responsive';

export type {
  ResponsiveBreakpoints,
  ResponsiveConfig,
  ScreenSize
} from './utils/responsive';

// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================

/**
 * Test utilities and mock data generators for development and testing.
 * Useful for creating demo data and performance testing.
 * 
 * @example
 * ```tsx
 * import { generateMockClips, PerformanceMeasurer } from 'timeline-studio-lib';
 * 
 * const mockClips = generateMockClips(1000);
 * const measurer = new PerformanceMeasurer();
 * ```
 */
export {
  generateMockClips,
  generateMockTracks,
  generateRealisticTimeline,
  performanceTestScenarios,
  PerformanceMeasurer,
  measureMemoryUsage
} from './utils/testDataGenerator';