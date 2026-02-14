/**
 * Audio module - re-exports all audio utilities
 */

// Audio context management
export {
    getAudioContext,
    warmUpAudio,
    setupAudioWarmupListeners
} from './context.js';

// Pitch detection
export {
    detectPitch,
    getSmoothedPitch
} from './pitch.js';

// Tone generation
export { playTone } from './tones.js';

// Click sounds
export {
    getClickBuffer,
    createCountdownBuffer
} from './clicks.js';
