/**
 * Mini staff rendering functions for note selection displays
 */

import { getStaffPosition, getYForStaffPosition } from '../music/notes.js';
import { drawTrebleClefMini, drawBassClefMini } from './clefs.js';
import { drawMiniLedgerLines } from './notes.js';

/**
 * Get display name for a note with accidental symbol
 * @param {string} note - Note name (e.g., 'C', 'C#', 'Db')
 * @param {number} octave - Octave number
 * @returns {string} Formatted note name (e.g., 'C♯4', 'D♭4')
 */
export function getNoteDisplayName(note, octave) {
    // Handle sharp notation (C# -> C♯4)
    if (note.includes('#')) {
        return `${note.replace('#', '♯')}${octave}`;
    }
    // Handle flat notation (Db -> D♭4)
    if (note.includes('b')) {
        return `${note.replace('b', '♭')}${octave}`;
    }
    return `${note}${octave}`;
}

/**
 * Draw a mini-staff with a single selected note
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} note - Note name
 * @param {number} octave - Octave number
 */
export function drawMiniStaff(ctx, canvas, note, octave) {
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(0, 0, width, height);

    // Compact layout
    const staffTop = 12;
    const lineSpacing = 6;
    const clefWidth = 18;
    const leftMargin = 3;

    // Determine clef based on note (C4 and above use treble)
    const staffPos = getStaffPosition(note, octave);
    const clef = staffPos >= 28 ? 'treble' : 'bass';

    // Draw staff lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const y = staffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - 3, y);
        ctx.stroke();
    }

    // Draw clef
    if (clef === 'treble') {
        drawTrebleClefMini(ctx, leftMargin, staffTop, lineSpacing);
    } else {
        drawBassClefMini(ctx, leftMargin, staffTop, lineSpacing);
    }

    // Note position - close to clef with small gap
    const noteX = leftMargin + clefWidth + 12;
    const y = getYForStaffPosition(staffPos, clef, staffTop, lineSpacing);
    const isSharp = note.includes('#');
    const isFlat = note.includes('b');

    // Draw ledger lines
    drawMiniLedgerLines(ctx, noteX, y, staffTop, lineSpacing);

    // Draw note head (filled)
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.ellipse(noteX, y, 4, 3, -0.3, 0, 2 * Math.PI);
    ctx.fill();

    // Draw accidental if needed
    if (isSharp) {
        ctx.fillStyle = '#4ecdc4';
        ctx.font = 'bold 9px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u266F', noteX - 8, y);
    } else if (isFlat) {
        ctx.fillStyle = '#4ecdc4';
        ctx.font = 'bold 10px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u266D', noteX - 8, y);
    }

    // Draw note name below staff (centered under note)
    ctx.fillStyle = '#888';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(getNoteDisplayName(note, octave), noteX, height - 9);
}
