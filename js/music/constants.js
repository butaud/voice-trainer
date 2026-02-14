/**
 * Music constants used throughout the application
 */

// Chromatic note names
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Note duration types
export const NOTE_TYPES = {
    WHOLE: 'whole',
    HALF: 'half',
    QUARTER: 'quarter',
    EIGHTH: 'eighth',
    SIXTEENTH: 'sixteenth'
};

// Diatonic positions for staff placement (C=0 through B=6)
export const DIATONIC_POSITION = {
    'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6
};

// Reference frequency for A4
export const A4_FREQUENCY = 440;

// MIDI note number for A4
export const A4_MIDI = 69;
