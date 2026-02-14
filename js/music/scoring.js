/**
 * Pitch scoring utilities for voice practice
 */

import { NOTE_NAMES } from './constants.js';
import { getStaffPosition, getYForStaffPosition } from './notes.js';

/**
 * Calculate score for a single note based on pitch accuracy and timing
 * @param {number[]} pitchSamples - Array of cents deviation samples
 * @param {number} timeOnPitch - Time spent within acceptable pitch range (ms)
 * @param {number} totalTime - Total note duration (ms)
 * @returns {number} Score from 0-100
 */
export function calculateNoteScore(pitchSamples, timeOnPitch, totalTime) {
    if (pitchSamples.length === 0) {
        return 0;
    }

    // Accuracy score (60 points max) - based on average cents deviation (very lenient)
    const avgCents = pitchSamples.reduce((a, b) => a + Math.abs(b), 0) / pitchSamples.length;
    let accuracyScore;
    if (avgCents <= 25) {
        accuracyScore = 60;
    } else if (avgCents <= 50) {
        accuracyScore = 55;
    } else if (avgCents <= 75) {
        accuracyScore = 50;
    } else if (avgCents <= 100) {
        accuracyScore = 40;
    } else if (avgCents <= 150) {
        accuracyScore = 30;
    } else {
        accuracyScore = Math.max(10, 25 - (avgCents - 150) / 20);
    }

    // Time on pitch score (40 points max) - count within ±50 cents as "on pitch"
    const timeRatio = timeOnPitch / totalTime;
    const timeScore = timeRatio * 40;

    return Math.round(accuracyScore + timeScore);
}

/**
 * Calculate overall grade from percentage score
 * @param {number} percent - Percentage score (0-100)
 * @returns {string} Letter grade (A+ through F)
 */
export function calculateGrade(percent) {
    if (percent >= 97) return 'A+';
    if (percent >= 93) return 'A';
    if (percent >= 90) return 'A-';
    if (percent >= 87) return 'B+';
    if (percent >= 83) return 'B';
    if (percent >= 80) return 'B-';
    if (percent >= 77) return 'C+';
    if (percent >= 73) return 'C';
    if (percent >= 70) return 'C-';
    if (percent >= 67) return 'D+';
    if (percent >= 63) return 'D';
    if (percent >= 60) return 'D-';
    return 'F';
}

/**
 * Convert a frequency to Y coordinate on the staff
 * Provides smooth interpolation between note positions
 * @param {number} frequency - Frequency in Hz
 * @param {string} clef - 'treble' or 'bass'
 * @param {number} staffTop - Y coordinate of top staff line
 * @param {number} lineSpacing - Pixels between staff lines
 * @returns {number} Y coordinate on canvas
 */
export function frequencyToStaffY(frequency, clef, staffTop, lineSpacing) {
    // Convert frequency to note name and octave
    const midiNote = 12 * Math.log2(frequency / 440) + 69;
    const noteIndex = Math.round(midiNote) % 12;
    const octave = Math.floor(Math.round(midiNote) / 12) - 1;
    const noteName = NOTE_NAMES[noteIndex];

    // Get staff position and Y coordinate
    const staffPos = getStaffPosition(noteName, octave);

    // For smooth visualization, interpolate based on actual frequency deviation
    const exactMidi = 12 * Math.log2(frequency / 440) + 69;
    const deviation = exactMidi - Math.round(midiNote); // -0.5 to +0.5

    const baseY = getYForStaffPosition(staffPos, clef, staffTop, lineSpacing);
    // Each semitone is roughly half a staff position, adjust Y accordingly
    const yAdjustment = -deviation * (lineSpacing / 2);

    return baseY + yAdjustment;
}
