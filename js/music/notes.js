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
