/**
 * Note and rest rendering functions
 */

import { NOTE_TYPES } from '../music/constants.js';
import { KEY_SHARP_MAP, KEY_FLAT_MAP } from '../music/syp.js';

/**
 * Draw a note with stem (supports different note types)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string|boolean|null} accidental - Accidental to display: 'sharp', 'flat', 'natural', null, or boolean (legacy: true=sharp)
 * @param {boolean} isActive - Whether note is currently active
 * @param {boolean} isCompleted - Whether note has been sung
 * @param {number} staffMiddleY - Y position of middle staff line (for stem direction)
 * @param {number|null} score - Performance score (0-100) or null
 * @param {string} noteType - Note type from NOTE_TYPES
 * @param {boolean} dotted - Whether note is dotted
 * @param {number} pulseAmount - Pulse animation amount (0-1)
 */
export function drawNote(ctx, x, y, accidental, isActive, isCompleted, staffMiddleY, score = null, noteType = NOTE_TYPES.QUARTER, dotted = false, pulseAmount = 0) {
    // Normalize legacy boolean parameter
    if (accidental === true) accidental = 'sharp';
    if (accidental === false) accidental = null;
    ctx.save();

    // Determine colors
    let noteColor;
    if (score !== null) {
        // Color based on performance score
        if (score >= 70) {
            noteColor = '#6bcb77'; // Green - good
        } else if (score >= 40) {
            noteColor = '#ffd93d'; // Yellow - okay
        } else {
            noteColor = '#ff6b6b'; // Red - poor
        }
    } else if (isActive) {
        noteColor = '#4ecdc4'; // Cyan - current
    } else if (isCompleted) {
        noteColor = '#6bcb77'; // Green - completed
    } else {
        noteColor = '#bbb'; // Gray - upcoming
    }
    ctx.fillStyle = noteColor;
    ctx.strokeStyle = noteColor;

    // Apply pulse effect for active notes (scale and glow)
    if (pulseAmount > 0) {
        const scale = 1 + pulseAmount * 0.3; // Scale up to 1.3x at max pulse
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.translate(-x, -y);

        // Add glow effect
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 8 + pulseAmount * 12; // 8-20px blur
    }

    // Note head dimensions
    const noteWidth = 7;
    const noteHeight = 5;
    const stemHeight = 30;
    const stemWidth = 1.5;

    // Determine if note head should be filled or hollow
    const isHollow = noteType === NOTE_TYPES.WHOLE || noteType === NOTE_TYPES.HALF;
    const hasStem = noteType !== NOTE_TYPES.WHOLE;
    const hasFlag = noteType === NOTE_TYPES.EIGHTH || noteType === NOTE_TYPES.SIXTEENTH;
    const hasDoubleFlag = noteType === NOTE_TYPES.SIXTEENTH;

    // Stem direction: down if on or above middle line, up if below
    const stemDown = y <= staffMiddleY;

    // Draw note head
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (noteType === NOTE_TYPES.WHOLE) {
        // Whole note: wider, more horizontal oval
        ctx.ellipse(x, y, noteWidth + 2, noteHeight, 0, 0, 2 * Math.PI);
    } else {
        // Other notes: tilted oval
        ctx.ellipse(x, y, noteWidth, noteHeight, -0.3, 0, 2 * Math.PI);
    }

    if (isHollow) {
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        ctx.fill();
    }

    // Draw stem
    if (hasStem) {
        if (stemDown) {
            // Stem down (on left side of note)
            ctx.fillRect(x - noteWidth + 1, y, stemWidth, stemHeight);

            // Draw flag(s) for eighth/sixteenth note (stem down)
            if (hasFlag) {
                ctx.beginPath();
                ctx.moveTo(x - noteWidth + 1 + stemWidth, y + stemHeight);
                ctx.quadraticCurveTo(
                    x - noteWidth + 15, y + stemHeight - 5,
                    x - noteWidth + 12, y + stemHeight - 15
                );
                ctx.lineWidth = 2;
                ctx.stroke();

                // Second flag for sixteenth note
                if (hasDoubleFlag) {
                    ctx.beginPath();
                    ctx.moveTo(x - noteWidth + 1 + stemWidth, y + stemHeight - 6);
                    ctx.quadraticCurveTo(
                        x - noteWidth + 15, y + stemHeight - 11,
                        x - noteWidth + 12, y + stemHeight - 21
                    );
                    ctx.stroke();
                }
            }
        } else {
            // Stem up (on right side of note)
            ctx.fillRect(x + noteWidth - stemWidth - 1, y - stemHeight, stemWidth, stemHeight);

            // Draw flag(s) for eighth/sixteenth note (stem up)
            if (hasFlag) {
                ctx.beginPath();
                ctx.moveTo(x + noteWidth - 1, y - stemHeight);
                ctx.quadraticCurveTo(
                    x + noteWidth + 10, y - stemHeight + 5,
                    x + noteWidth + 8, y - stemHeight + 15
                );
                ctx.lineWidth = 2;
                ctx.stroke();

                // Second flag for sixteenth note
                if (hasDoubleFlag) {
                    ctx.beginPath();
                    ctx.moveTo(x + noteWidth - 1, y - stemHeight + 6);
                    ctx.quadraticCurveTo(
                        x + noteWidth + 10, y - stemHeight + 11,
                        x + noteWidth + 8, y - stemHeight + 21
                    );
                    ctx.stroke();
                }
            }
        }
    }

    // Draw dot for dotted notes
    if (dotted) {
        ctx.beginPath();
        ctx.arc(x + noteWidth + 5, y, 2, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Draw accidental if needed
    if (accidental) {
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (accidental === 'sharp') {
            ctx.fillText('\u266F', x - 16, y);
        } else if (accidental === 'flat') {
            ctx.fillText('\u266D', x - 16, y);
        } else if (accidental === 'natural') {
            ctx.fillText('\u266E', x - 16, y);
        }
    }

    ctx.restore();
}

/**
 * Draw a rest symbol
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} staffTop - Y position of top staff line
 * @param {number} lineSpacing - Spacing between staff lines
 * @param {boolean} isActive - Whether rest is currently active
 * @param {boolean} isCompleted - Whether rest has been passed
 * @param {string} noteType - Note type from NOTE_TYPES
 * @param {boolean} dotted - Whether rest is dotted
 * @param {number} pulseAmount - Pulse animation amount (0-1)
 */
export function drawRest(ctx, x, staffTop, lineSpacing, isActive, isCompleted, noteType = NOTE_TYPES.QUARTER, dotted = false, pulseAmount = 0) {
    ctx.save();

    // Set color based on state
    if (isActive) {
        ctx.fillStyle = '#4ecdc4';
        ctx.strokeStyle = '#4ecdc4';
    } else if (isCompleted) {
        ctx.fillStyle = 'rgba(78, 205, 196, 0.5)';
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.5)';
    } else {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#fff';
    }

    // Apply pulse effect for active rests
    const restCenterY = staffTop + 2 * lineSpacing;
    if (pulseAmount > 0) {
        const scale = 1 + pulseAmount * 0.3;
        ctx.translate(x, restCenterY);
        ctx.scale(scale, scale);
        ctx.translate(-x, -restCenterY);

        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 8 + pulseAmount * 12;
    }

    ctx.lineWidth = 2;
    const staffMiddleY = staffTop + 2 * lineSpacing;

    if (noteType === NOTE_TYPES.WHOLE) {
        // Whole rest: rectangle hanging below the 4th line (2nd from top)
        const restY = staffTop + lineSpacing;
        ctx.fillRect(x - 6, restY, 12, 5);
    } else if (noteType === NOTE_TYPES.HALF) {
        // Half rest: rectangle sitting on the middle line
        const restY = staffMiddleY - 5;
        ctx.fillRect(x - 6, restY, 12, 5);
    } else if (noteType === NOTE_TYPES.QUARTER) {
        // Quarter rest: squiggly shape
        ctx.beginPath();
        ctx.moveTo(x + 3, staffTop + lineSpacing * 0.5);
        ctx.lineTo(x - 3, staffTop + lineSpacing * 1.2);
        ctx.lineTo(x + 3, staffTop + lineSpacing * 2);
        ctx.lineTo(x - 2, staffTop + lineSpacing * 2.8);
        ctx.quadraticCurveTo(x + 5, staffTop + lineSpacing * 3, x + 2, staffTop + lineSpacing * 3.7);
        ctx.lineWidth = 2.5;
        ctx.stroke();
    } else if (noteType === NOTE_TYPES.EIGHTH) {
        // Eighth rest: diagonal line with one flag
        const startY = staffTop + lineSpacing;
        ctx.beginPath();
        // Dot/flag at top
        ctx.arc(x + 2, startY + 2, 3, 0, 2 * Math.PI);
        ctx.fill();
        // Diagonal stem
        ctx.beginPath();
        ctx.moveTo(x + 2, startY + 4);
        ctx.lineTo(x - 3, startY + lineSpacing * 2);
        ctx.lineWidth = 2;
        ctx.stroke();
    } else if (noteType === NOTE_TYPES.SIXTEENTH) {
        // Sixteenth rest: diagonal line with two flags
        const startY = staffTop + lineSpacing * 0.5;
        // First dot/flag
        ctx.beginPath();
        ctx.arc(x + 2, startY + 2, 3, 0, 2 * Math.PI);
        ctx.fill();
        // Second dot/flag
        ctx.beginPath();
        ctx.arc(x + 1, startY + lineSpacing + 2, 3, 0, 2 * Math.PI);
        ctx.fill();
        // Diagonal stem
        ctx.beginPath();
        ctx.moveTo(x + 1, startY + lineSpacing + 4);
        ctx.lineTo(x - 4, startY + lineSpacing * 2.5);
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Draw dot for dotted rests
    if (dotted) {
        ctx.beginPath();
        ctx.arc(x + 10, staffMiddleY, 2, 0, 2 * Math.PI);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Draw a tie arc between two noteheads
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x1 - X position of first notehead
 * @param {number} x2 - X position of second notehead
 * @param {number} y - Y position of noteheads (same pitch)
 * @param {boolean} stemDown - Whether stems point down (arc curves up) or up (arc curves down)
 * @param {string} color - Stroke color for the tie
 */
export function drawTie(ctx, x1, x2, y, stemDown, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    // Arc direction: if stem is down, arc curves upward; if stem is up, arc curves downward
    const arcDirection = stemDown ? -1 : 1;
    const arcHeight = 8;
    const midX = (x1 + x2) / 2;
    const cp1x = x1 + (x2 - x1) * 0.2;
    const cp2x = x1 + (x2 - x1) * 0.8;
    const cpY = y + arcDirection * arcHeight;

    ctx.moveTo(x1 + 7, y);
    ctx.bezierCurveTo(cp1x, cpY, cp2x, cpY, x2 - 7, y);
    ctx.stroke();
    ctx.restore();
}

/**
 * Draw ledger lines for notes outside the staff
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position of note
 * @param {number} y - Y position of note
 * @param {number} staffTop - Y position of top staff line
 * @param {number} lineSpacing - Spacing between staff lines
 * @param {string} clef - 'treble' or 'bass' (unused, kept for API compatibility)
 */
export function drawLedgerLines(ctx, x, y, staffTop, lineSpacing, clef) {
    ctx.save();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;

    const bottomLine = staffTop + 4 * lineSpacing;
    const topLine = staffTop;

    // Draw ledger lines below staff
    if (y > bottomLine + lineSpacing / 2) {
        for (let ly = bottomLine + lineSpacing; ly <= y + lineSpacing / 2; ly += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 12, ly);
            ctx.lineTo(x + 12, ly);
            ctx.stroke();
        }
    }

    // Draw ledger lines above staff
    if (y < topLine - lineSpacing / 2) {
        for (let ly = topLine - lineSpacing; ly >= y - lineSpacing / 2; ly -= lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 12, ly);
            ctx.lineTo(x + 12, ly);
            ctx.stroke();
        }
    }

    ctx.restore();
}

/**
 * Draw a selectable note (hollow whole note for note selector)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {boolean} isHovered - Whether note is being hovered
 * @param {boolean} isSelected - Whether note is selected
 */
export function drawSelectableNote(ctx, x, y, isHovered, isSelected) {
    ctx.save();

    // Set color based on state
    if (isSelected) {
        ctx.fillStyle = '#4ecdc4';
        ctx.strokeStyle = '#4ecdc4';
    } else if (isHovered) {
        ctx.fillStyle = '#6bcb77';
        ctx.strokeStyle = '#6bcb77';
    } else {
        ctx.fillStyle = '#888';
        ctx.strokeStyle = '#888';
    }

    // Draw hollow whole note
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 4, 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw ledger lines for grand staff selector
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} staffTop - Y position of top staff line
 * @param {number} lineSpacing - Spacing between staff lines
 */
export function drawGrandStaffLedgerLines(ctx, x, y, staffTop, lineSpacing) {
    ctx.save();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;

    const bottomLine = staffTop + 4 * lineSpacing;
    const topLine = staffTop;

    // Draw ledger lines below staff
    if (y > bottomLine + lineSpacing / 2) {
        for (let ly = bottomLine + lineSpacing; ly <= y + lineSpacing / 2; ly += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 8, ly);
            ctx.lineTo(x + 8, ly);
            ctx.stroke();
        }
    }

    // Draw ledger lines above staff
    if (y < topLine - lineSpacing / 2) {
        for (let ly = topLine - lineSpacing; ly >= y - lineSpacing / 2; ly -= lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 8, ly);
            ctx.lineTo(x + 8, ly);
            ctx.stroke();
        }
    }

    ctx.restore();
}

/**
 * Draw mini ledger lines for mini staff display
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} staffTop - Y position of top staff line
 * @param {number} lineSpacing - Spacing between staff lines
 */
export function drawMiniLedgerLines(ctx, x, y, staffTop, lineSpacing) {
    ctx.save();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;

    const bottomLine = staffTop + 4 * lineSpacing;
    const topLine = staffTop;

    // Draw ledger lines below staff
    if (y > bottomLine + lineSpacing / 2) {
        for (let ly = bottomLine + lineSpacing; ly <= y + lineSpacing / 2; ly += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 8, ly);
            ctx.lineTo(x + 8, ly);
            ctx.stroke();
        }
    }

    // Draw ledger lines above staff
    if (y < topLine - lineSpacing / 2) {
        for (let ly = topLine - lineSpacing; ly >= y - lineSpacing / 2; ly -= lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x - 8, ly);
            ctx.lineTo(x + 8, ly);
            ctx.stroke();
        }
    }

    ctx.restore();
}

/**
 * Draw key signature on the staff (sharps or flats after the clef)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Starting X position (after clef)
 * @param {number} staffTop - Y position of top staff line
 * @param {number} lineSpacing - Spacing between staff lines
 * @param {string} clef - 'treble' or 'bass'
 * @param {string} key - Key name (e.g., 'G', 'F', 'Bb', 'C')
 * @returns {number} Width consumed by the key signature
 */
export function drawKeySignature(ctx, x, staffTop, lineSpacing, clef, key) {
    if (!key || key === 'C') return 0;

    const sharps = KEY_SHARP_MAP[key];
    const flats = KEY_FLAT_MAP[key];

    if (!sharps && !flats) return 0;

    // Staff positions as distance from top line in lineSpacing units
    // Treble clef lines top-to-bottom: F5(0), D5(1), B4(2), G4(3), E4(4)
    // Spaces: E5(0.5), C5(1.5), A4(2.5), F4(3.5)

    // Treble clef sharp positions (standard order: F C G D A E B)
    const trebleSharpPos = [0, 1.5, -0.5, 1, 2.5, 0.5, 2]; // F5, C5, G5, D5, A4, E5, B4
    // Treble clef flat positions (standard order: B E A D G C F)
    const trebleFlatPos = [2, 0.5, 2.5, 1, 3, 1.5, 3.5]; // B4, E5, A4, D5, G4, C5, F4

    // Bass clef: shift down 1 position
    const bassOffset = 1;

    const isSharpKey = !!sharps;
    const accidentals = sharps || flats;
    const positions = isSharpKey ? trebleSharpPos : trebleFlatPos;
    const symbol = isSharpKey ? '\u266F' : '\u266D';

    ctx.save();
    ctx.fillStyle = '#bbb';
    ctx.font = 'bold 14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const spacing = 10;
    let offsetX = 5;

    for (let i = 0; i < accidentals.length; i++) {
        let pos = positions[i];
        if (clef === 'bass') pos += bassOffset;
        // Wrap positions that go above staff to an octave lower
        if (pos < 0) pos += 3.5;

        const y = staffTop + pos * lineSpacing;
        ctx.fillText(symbol, x + offsetX, y);
        offsetX += spacing;
    }

    ctx.restore();
    return offsetX;
}

/**
 * Get the set of accidental note letters for a given key signature
 * @param {string} key - Key name (e.g., 'G', 'Bb', 'C')
 * @returns {{type: string|null, notes: string[]}} Accidental type and affected note letters
 */
export function getKeySignatureAccidentals(key) {
    if (!key || key === 'C') return { type: null, notes: [] };
    if (KEY_SHARP_MAP[key]) return { type: 'sharp', notes: KEY_SHARP_MAP[key] };
    if (KEY_FLAT_MAP[key]) return { type: 'flat', notes: KEY_FLAT_MAP[key] };
    return { type: null, notes: [] };
}
