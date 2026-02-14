/**
 * Built-in practice sequences
 * Durations are in ms at 90 BPM reference tempo
 * Quarter note = 667ms, Eighth note = 333ms at 90 BPM
 */

import { NOTE_TYPES } from '../music/constants.js';

export const BUILTIN_SEQUENCES = {
    'simple-scale': {
        name: 'Simple Scale (C-E)',
        notes: [
            { note: 'C', octave: 3, duration: 667, noteType: NOTE_TYPES.QUARTER },
            { note: 'D', octave: 3, duration: 667, noteType: NOTE_TYPES.QUARTER },
            { note: 'E', octave: 3, duration: 667, noteType: NOTE_TYPES.QUARTER }
        ]
    },
    'octave-jump': {
        name: 'Octave Jump',
        notes: [
            { note: 'C', octave: 3, duration: 667, noteType: NOTE_TYPES.QUARTER },
            { note: 'C', octave: 4, duration: 667, noteType: NOTE_TYPES.QUARTER },
            { note: 'C', octave: 3, duration: 667, noteType: NOTE_TYPES.QUARTER }
        ]
    },
    'major-arpeggio': {
        name: 'Major Arpeggio',
        notes: [
            { note: 'C', octave: 3, duration: 667, noteType: NOTE_TYPES.QUARTER },
            { note: 'E', octave: 3, duration: 667, noteType: NOTE_TYPES.QUARTER },
            { note: 'G', octave: 3, duration: 667, noteType: NOTE_TYPES.QUARTER },
            { note: 'C', octave: 4, duration: 667, noteType: NOTE_TYPES.QUARTER }
        ]
    },
    'full-scale': {
        name: 'Full Scale Up',
        notes: [
            { note: 'C', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 4, duration: 333, noteType: NOTE_TYPES.EIGHTH }
        ]
    },
    'full-scale-up-down': {
        name: 'Full Scale Up & Down',
        notes: [
            { note: 'C', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 4, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH }
        ]
    },
    'double-scale': {
        name: 'Double Scale (Up & Down x2)',
        notes: [
            { note: 'C', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 4, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 4, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'B', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'A', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'G', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'F', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'E', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'D', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH },
            { note: 'C', octave: 3, duration: 333, noteType: NOTE_TYPES.EIGHTH }
        ]
    }
};

// Default tempo for built-in sequences (BPM)
export const BUILTIN_SEQUENCE_TEMPO = 90;
