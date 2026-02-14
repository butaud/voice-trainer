/**
 * Central state store for the Voice Trainer application
 *
 * Organizes all mutable application state into a single module.
 * State objects are exported directly for easy migration from inline state.
 */

// ============================================================================
// Audio State
// ============================================================================
export const audioState = {
    context: null,
    analyser: null,
    micStream: null,
    warmedUp: false,
    currentPreviewAudio: null
};

// ============================================================================
// App Running State
// ============================================================================
export const appState = {
    isRunning: false,
    animationId: null
};

// ============================================================================
// Current Target Note (Free Practice Mode)
// ============================================================================
export const currentNote = {
    name: 'A4',
    frequency: 440
};

// ============================================================================
// Pitch Detection State
// ============================================================================
export const pitchDetection = {
    history: [],           // Sliding window for visualization
    recentPitches: [],     // Smoothing buffer
    lastSampleTime: 0
};

// Configuration constants for pitch detection
export const PITCH_CONFIG = {
    windowDuration: 3,     // seconds
    samplesPerSecond: 30,
    smoothingWindow: 5,
    maxSamples: 3 * 30,    // windowDuration * samplesPerSecond
    sampleInterval: 1000 / 30
};

// ============================================================================
// Sequence State (Song Practice Mode)
// ============================================================================
export const sequenceState = {
    isSequenceMode: true,
    isPlaying: false,
    isPreviewing: false,
    previewIndex: -1,
    isCountingDown: false,
    countdownStartTime: 0,
    countdownBeatInterval: 1000,
    countdownLastBeat: -1,
    currentSequence: [],
    currentNoteIndex: 0,
    noteScores: [],
    pitchSamplesForNote: [],
    pitchHistory: [],
    timeOnPitch: 0,
    sequenceStartTime: 0,
    globalPitchTrace: [],
    timeSignature: { beats: 4, beatType: 4 },
    sourceTempo: 90,
    showFinalTrace: false
};

// ============================================================================
// Preview Scroll State
// ============================================================================
export const previewScrollState = {
    animationId: null,
    scrollParams: null,
    startTime: 0,
    currentNoteIndex: 0,
    noteStartTime: 0,
    noteDuration: 0
};

// ============================================================================
// User Scroll State (Manual Scrolling)
// ============================================================================
export const userScrollState = {
    offset: 0,
    maxOffset: 0,
    isDragging: false,
    startX: 0,
    startOffset: 0
};

// ============================================================================
// Sequences Registry (built-in + custom)
// ============================================================================
import { BUILTIN_SEQUENCES } from './sequences.js';

export const sequences = {
    ...BUILTIN_SEQUENCES,
    'custom': {
        name: 'Custom',
        notes: []
    }
};

// ============================================================================
// Note Selector State
// ============================================================================
export const noteSelectorState = {
    isOpen: false,
    mode: 'free', // 'free' or 'song'
    hoveredNote: null,
    selectedNote: null, // {note, octave} - pending selection before OK
    accidental: 'natural', // 'flat', 'natural', or 'sharp'
    notePositions: [] // Array of {note, octave, x, y, width, height} for hit detection
};
