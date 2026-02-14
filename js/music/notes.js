/**
 * Note and frequency utility functions
 */

import { NOTE_NAMES, DIATONIC_POSITION, A4_FREQUENCY, A4_MIDI } from './constants.js';

/**
 * Get the frequency in Hz for a given note and octave
 * @param {string} note - Note name (e.g., 'C', 'C#', 'D')
 * @param {number} octave - Octave number (e.g., 4 for middle C)
 * @returns {number} Frequency in Hz
 */
export function getFrequency(note, octave) {
    const noteIndex = NOTE_NAMES.indexOf(note);
    const midiNote = (octave + 1) * 12 + noteIndex;
    return A4_FREQUENCY * Math.pow(2, (midiNote - A4_MIDI) / 12);
}

/**
 * Get the note name and octave from a frequency
 * @param {string} frequency - Frequency in Hz
 * @returns {string} Note name with octave (e.g., 'A4')
 */
export function getNoteFromFrequency(frequency) {
    const noteNum = 12 * (Math.log2(frequency / A4_FREQUENCY)) + A4_MIDI;
    const note = Math.round(noteNum);
    const noteName = NOTE_NAMES[note % 12];
    const octave = Math.floor(note / 12) - 1;
    return `${noteName}${octave}`;
}

/**
 * Get the difference in cents between two frequencies
 * @param {number} detected - Detected frequency in Hz
 * @param {number} target - Target frequency in Hz
 * @returns {number} Difference in cents (positive = sharp, negative = flat)
 */
export function getCentsDifference(detected, target) {
    return 1200 * Math.log2(detected / target);
}

/**
 * Convert a note and octave to a semitone number
 * @param {string} note - Note name
 * @param {number} octave - Octave number
 * @returns {number} Semitone number (C0 = 0)
 */
export function noteToSemitone(note, octave) {
    return octave * 12 + NOTE_NAMES.indexOf(note);
}

/**
 * Convert a semitone number to note and octave
 * @param {number} semitone - Semitone number
 * @returns {{note: string, octave: number}} Note name and octave
 */
export function semitoneToNote(semitone) {
    const octave = Math.floor(semitone / 12);
    const noteIndex = ((semitone % 12) + 12) % 12; // Handle negative values
    return { note: NOTE_NAMES[noteIndex], octave };
}

/**
 * Get the diatonic staff position for a note
 * Used for vertical placement on the musical staff
 * @param {string} note - Note name (with or without sharp)
 * @param {number} octave - Octave number
 * @returns {number} Staff position (C0 = 0, D0 = 1, etc.)
 */
export function getStaffPosition(note, octave) {
    // Get base note without sharp
    const baseNote = note.replace('#', '');
    // Position relative to C0: octave * 7 + diatonic position
    return octave * 7 + DIATONIC_POSITION[baseNote];
}

/**
 * Determine the best clef for a sequence of notes
 * @param {Array} sequence - Array of note objects with {note, octave, isRest}
 * @returns {string} 'treble' or 'bass'
 */
export function getBestClef(sequence) {
    // Filter out rests since they don't have pitch information
    const pitchedNotes = sequence.filter(n => !n.isRest);
    if (pitchedNotes.length === 0) return 'treble';

    // Calculate average staff position
    const avgPosition = pitchedNotes.reduce(
        (sum, n) => sum + getStaffPosition(n.note, n.octave), 0
    ) / pitchedNotes.length;

    // Middle C (C4) is at position 28
    // Use treble if average is >= C4, bass otherwise
    return avgPosition >= 28 ? 'treble' : 'bass';
}

/**
 * Get the Y coordinate on a canvas for a staff position
 * @param {number} staffPos - Staff position from getStaffPosition()
 * @param {string} clef - 'treble' or 'bass'
 * @param {number} staffTop - Y coordinate of top staff line
 * @param {number} lineSpacing - Pixels between staff lines
 * @returns {number} Y coordinate on canvas
 */
export function getYForStaffPosition(staffPos, clef, staffTop, lineSpacing) {
    // Reference positions for each clef (the note on the bottom line)
    // Treble: bottom line is E4 (position 30)
    // Bass: bottom line is G2 (position 18)
    const refPosition = clef === 'treble' ? 30 : 18;

    // Each staff position is half a line spacing
    // Bottom line is at staffTop + 4 * lineSpacing
    const bottomLineY = staffTop + 4 * lineSpacing;

    return bottomLineY - ((staffPos - refPosition) * lineSpacing / 2);
}

// ============================================================================
// Accidental Utilities
// ============================================================================

/**
 * Get the base note name without any accidentals
 * @param {string} note - Note name (e.g., 'C#', 'Db', 'C')
 * @returns {string} Base note name (e.g., 'C', 'D', 'C')
 */
export function getBaseNote(note) {
    return note.replace('#', '').replace('b', '');
}

/**
 * Get the accidental type from a note string
 * @param {string} note - Note name
 * @returns {string} 'sharp', 'flat', or 'natural'
 */
export function getAccidentalFromNote(note) {
    if (note.includes('#')) return 'sharp';
    if (note.includes('b')) return 'flat';
    return 'natural';
}

/**
 * Apply an accidental to a base note
 * @param {string} baseNote - Base note name (e.g., 'C')
 * @param {string} accidental - 'sharp', 'flat', or 'natural'
 * @returns {string} Note with accidental (e.g., 'C#', 'Cb', 'C')
 */
export function applyAccidental(baseNote, accidental) {
    if (accidental === 'sharp') return baseNote + '#';
    if (accidental === 'flat') return baseNote + 'b';
    return baseNote;
}

/**
 * Convert flat notes to their enharmonic sharp equivalents
 * Useful for dropdown compatibility where only sharps are used
 * @param {string} note - Note name (e.g., 'Db')
 * @param {number} octave - Octave number
 * @returns {{note: string, octave: number}} Enharmonic equivalent
 */
export function flatToSharpEquivalent(note, octave) {
    if (!note.includes('b')) return { note, octave };

    const baseNote = note.replace('b', '');
    const flatToSharp = {
        'D': { note: 'C#', octaveAdjust: 0 },
        'E': { note: 'D#', octaveAdjust: 0 },
        'G': { note: 'F#', octaveAdjust: 0 },
        'A': { note: 'G#', octaveAdjust: 0 },
        'B': { note: 'A#', octaveAdjust: 0 },
        'C': { note: 'B', octaveAdjust: -1 },  // Cb -> B of lower octave
        'F': { note: 'E', octaveAdjust: 0 }    // Fb -> E (rare but handle it)
    };

    const equiv = flatToSharp[baseNote];
    if (equiv) {
        return { note: equiv.note, octave: octave + equiv.octaveAdjust };
    }
    return { note, octave };
}

// ============================================================================
// Note Range Utilities
// ============================================================================

/** Natural note names in order */
export const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * Get all natural notes in the selectable range (E2 to G5)
 * @returns {Array<{note: string, octave: number}>} Array of note objects
 */
export function getNoteRange() {
    const notes = [];
    for (let octave = 2; octave <= 5; octave++) {
        for (const note of NATURAL_NOTES) {
            // Skip notes before E2
            if (octave === 2 && NATURAL_NOTES.indexOf(note) < NATURAL_NOTES.indexOf('E')) continue;
            // Skip notes after G5
            if (octave === 5 && NATURAL_NOTES.indexOf(note) > NATURAL_NOTES.indexOf('G')) continue;
            notes.push({ note, octave });
        }
    }
    return notes;
}

/**
 * Check if a note/octave is within the valid selectable range (E2 to G5)
 * @param {string} note - Note name
 * @param {number} octave - Octave number
 * @returns {boolean} True if in range
 */
export function isNoteInRange(note, octave) {
    const baseNote = getBaseNote(note);
    const staffPos = getStaffPosition(baseNote, octave);
    const minPos = getStaffPosition('E', 2);
    const maxPos = getStaffPosition('G', 5);
    return staffPos >= minPos && staffPos <= maxPos;
}
