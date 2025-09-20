import { Track, Clip } from '../types';

/**
 * Utility functions for generating test data for performance testing
 */

export interface DataGenerationOptions {
  trackCount: number;
  clipsPerTrack: number;
  clipDuration?: number;
  clipSpacing?: number;
  trackTypes?: Array<'video' | 'audio' | 'text' | 'overlay'>;
  includeMetadata?: boolean;
}

/**
 * Generate a large number of clips for performance testing
 */
export function generateMockClips(count: number, trackId: string = 'track-1'): Clip[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `clip-${trackId}-${i}`,
    trackId,
    start: i * 2, // 2 second spacing
    duration: 1.5,
    type: ['video', 'audio', 'text', 'overlay'][i % 4] as Clip['type'],
    metadata: {
      name: `Clip ${i + 1}`,
      speed: 1,
      isAI: i % 10 === 0, // Every 10th clip is AI
      thumbnailUrl: `https://example.com/thumb-${i}.jpg`,
      text: `Text content for clip ${i}`,
      waveform: i % 2 === 0 ? Array.from({ length: 100 }, () => Math.random()) : undefined,
      style: {
        color: `hsl(${(i * 30) % 360}, 70%, 50%)`,
        fontSize: '14px'
      }
    }
  }));
}

/**
 * Generate a large number of tracks with clips for performance testing
 */
export function generateMockTracks(options: DataGenerationOptions): Track[] {
  const {
    trackCount,
    clipsPerTrack,
    clipDuration = 1.5,
    clipSpacing = 2,
    trackTypes = ['video', 'audio', 'text', 'overlay'],
    includeMetadata = true
  } = options;

  return Array.from({ length: trackCount }, (_, trackIndex) => {
    const trackType = trackTypes[trackIndex % trackTypes.length];
    
    const clips: Clip[] = Array.from({ length: clipsPerTrack }, (_, clipIndex) => ({
      id: `clip-${trackIndex}-${clipIndex}`,
      trackId: `track-${trackIndex}`,
      start: clipIndex * clipSpacing,
      duration: clipDuration,
      type: trackType,
      metadata: includeMetadata ? {
        name: `${trackType} Clip ${clipIndex + 1}`,
        speed: 1 + (Math.random() * 0.5 - 0.25), // Random speed between 0.75 and 1.25
        isAI: Math.random() > 0.8, // 20% chance of being AI
        thumbnailUrl: trackType === 'video' ? `https://example.com/thumb-${trackIndex}-${clipIndex}.jpg` : undefined,
        text: trackType === 'text' ? `Text content for clip ${clipIndex + 1}` : undefined,
        waveform: trackType === 'audio' ? Array.from({ length: 200 }, () => Math.random() * 2 - 1) : undefined,
        style: trackType === 'overlay' ? {
          color: `hsl(${(trackIndex * 50 + clipIndex * 30) % 360}, 70%, 50%)`,
          fontSize: `${12 + (clipIndex % 8)}px`,
          fontWeight: clipIndex % 3 === 0 ? 'bold' : 'normal'
        } : undefined
      } : undefined
    }));

    return {
      id: `track-${trackIndex}`,
      type: trackType,
      name: `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} Track ${trackIndex + 1}`,
      height: 60 + (trackIndex % 3) * 20, // Varying heights: 60, 80, 100
      isVisible: true,
      isMuted: trackType === 'audio' ? Math.random() > 0.7 : undefined, // 30% chance audio tracks are muted
      clips
    };
  });
}

/**
 * Generate performance test scenarios
 */
export const performanceTestScenarios = {
  small: {
    trackCount: 10,
    clipsPerTrack: 5,
    description: 'Small dataset for baseline testing'
  },
  medium: {
    trackCount: 100,
    clipsPerTrack: 10,
    description: 'Medium dataset for typical usage'
  },
  large: {
    trackCount: 1000,
    clipsPerTrack: 20,
    description: 'Large dataset for stress testing'
  },
  massive: {
    trackCount: 5000,
    clipsPerTrack: 50,
    description: 'Massive dataset for extreme performance testing'
  },
  wideTimeline: {
    trackCount: 50,
    clipsPerTrack: 1000,
    clipSpacing: 0.1, // Very dense timeline
    description: 'Wide timeline with many clips per track'
  },
  deepTimeline: {
    trackCount: 10000,
    clipsPerTrack: 2,
    description: 'Deep timeline with many tracks'
  }
};

/**
 * Performance measurement utilities
 */
export class PerformanceMeasurer {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(name: string): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    performance.mark(`${name}-start`);
  }

  endMeasurement(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    const duration = measure.duration;
    
    this.measurements.get(name)?.push(duration);
    
    // Clean up marks and measures
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
    
    return duration;
  }

  getAverageTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getMinTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? Math.min(...times) : 0;
  }

  getMaxTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? Math.max(...times) : 0;
  }

  getAllMeasurements(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.measurements.forEach((times, name) => {
      result[name] = {
        avg: this.getAverageTime(name),
        min: this.getMinTime(name),
        max: this.getMaxTime(name),
        count: times.length
      };
    });
    
    return result;
  }

  reset(): void {
    this.measurements.clear();
  }
}

/**
 * Memory usage utilities
 */
export function measureMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
}

/**
 * Generate realistic timeline data with overlapping clips and gaps
 */
export function generateRealisticTimeline(options: {
  trackCount: number;
  timelineDuration: number; // in seconds
  averageClipDuration?: number;
  clipDensity?: number; // 0-1, how densely packed clips are
}): Track[] {
  const {
    trackCount,
    timelineDuration,
    averageClipDuration = 3,
    clipDensity = 0.7
  } = options;

  return Array.from({ length: trackCount }, (_, trackIndex) => {
    const trackType = ['video', 'audio', 'text', 'overlay'][trackIndex % 4] as Track['type'];
    const clips: Clip[] = [];
    
    let currentTime = 0;
    let clipIndex = 0;
    
    while (currentTime < timelineDuration) {
      // Random clip duration around the average
      const duration = Math.max(0.5, averageClipDuration + (Math.random() - 0.5) * 2);
      
      // Add clip if we have space and random chance based on density
      if (Math.random() < clipDensity) {
        clips.push({
          id: `realistic-clip-${trackIndex}-${clipIndex}`,
          trackId: `track-${trackIndex}`,
          start: currentTime,
          duration: Math.min(duration, timelineDuration - currentTime),
          type: trackType,
          metadata: {
            name: `${trackType} ${clipIndex + 1}`,
            speed: 1,
            isAI: Math.random() > 0.9
          }
        });
        clipIndex++;
      }
      
      // Move to next potential clip position
      currentTime += duration + (Math.random() * 2); // Random gap
    }

    return {
      id: `track-${trackIndex}`,
      type: trackType,
      name: `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} ${trackIndex + 1}`,
      height: 60,
      isVisible: true,
      isMuted: trackType === 'audio' ? Math.random() > 0.8 : undefined,
      clips
    };
  });
}