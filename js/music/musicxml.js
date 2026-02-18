/**
 * MusicXML parsing utilities
 */

import { NOTE_TYPES } from './constants.js';

// Map flat notes to their sharp equivalents
const FLAT_TO_SHARP = {
    'D': 'C#', 'E': 'D#', 'G': 'F#', 'A': 'G#', 'B': 'A#'
};

/**
 * Get list of parts from a MusicXML document
 * @param {string} xmlString - Raw MusicXML content
 * @returns {{doc: Document, parts: Array<{id: string, name: string}>}}
 */
export function getMusicXMLParts(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid MusicXML file');
    }

    // Get part list with names
    const parts = [];
    const partListEl = doc.querySelector('part-list');
    if (partListEl) {
        const scoreParts = partListEl.querySelectorAll('score-part');
        scoreParts.forEach(sp => {
            const id = sp.getAttribute('id');
            const nameEl = sp.querySelector('part-name');
            const name = nameEl ? nameEl.textContent.trim() : id;
            parts.push({ id, name });
        });
    }

    // Fallback: get parts directly if no part-list
    if (parts.length === 0) {
        const partEls = doc.querySelectorAll('part');
        partEls.forEach((p, i) => {
            const id = p.getAttribute('id') || `part-${i + 1}`;
            parts.push({ id, name: `Part ${i + 1}` });
        });
    }

    if (parts.length === 0) {
        throw new Error('No parts found in MusicXML');
    }

    return { doc, parts };
}

/**
 * Parse notes from a specific part in a MusicXML document
 * @param {Document} doc - Parsed MusicXML document
 * @param {string} partId - ID of the part to parse
 * @returns {{notes: Array, timeSignature: {beats: number, beatType: number}, tempo: number}}
 */
export function parseMusicXMLPart(doc, partId) {
    // Get the specified part
    const part = doc.querySelector(`part[id="${partId}"]`);
    if (!part) {
        throw new Error(`Part "${partId}" not found`);
    }

    // Get tempo (default to 120 BPM if not specified)
    // Check multiple locations where tempo can be specified in MusicXML
    let tempo = 120;
    const soundEl = doc.querySelector('sound[tempo]');
    if (soundEl) {
        tempo = parseFloat(soundEl.getAttribute('tempo'));
    } else {
        // Also check for metronome marking (common in exported MusicXML)
        const perMinuteEl = doc.querySelector('metronome per-minute');
        if (perMinuteEl) {
            tempo = parseFloat(perMinuteEl.textContent);
        }
    }

    // Get divisions (how many divisions per quarter note)
    const divisionsEl = doc.querySelector('divisions');
    const divisions = divisionsEl ? parseInt(divisionsEl.textContent) : 1;

    // Get time signature (default to 4/4)
    let timeBeats = 4;
    let timeBeatType = 4;
    const timeEl = doc.querySelector('time');
    if (timeEl) {
        const beatsEl = timeEl.querySelector('beats');
        const beatTypeEl = timeEl.querySelector('beat-type');
        if (beatsEl) timeBeats = parseInt(beatsEl.textContent);
        if (beatTypeEl) timeBeatType = parseInt(beatTypeEl.textContent);
    }

    // Parse key signature from <fifths>
    let key = 'C';
    const keyEl = doc.querySelector('key fifths');
    if (keyEl) {
        const fifths = parseInt(keyEl.textContent);
        const sharpKeyNames = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
        const flatKeyNames = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
        if (fifths >= 0 && fifths <= 7) {
            key = sharpKeyNames[fifths];
        } else if (fifths < 0 && fifths >= -7) {
            key = flatKeyNames[-fifths];
        }
    }

    // Calculate ms per division
    const msPerBeat = 60000 / tempo; // ms per quarter note
    const msPerDivision = msPerBeat / divisions;

    const notes = [];

    // Process all measures
    const measures = part.querySelectorAll('measure');
    measures.forEach(measure => {
        const noteEls = measure.querySelectorAll('note');
        noteEls.forEach(noteEl => {
            // Skip chord notes (only take the first note of a chord)
            if (noteEl.querySelector('chord')) return;

            // Check if this is a rest
            const isRest = noteEl.querySelector('rest') !== null;

            // Get duration
            const durationEl = noteEl.querySelector('duration');
            const duration = durationEl ? parseInt(durationEl.textContent) : divisions;
            const durationMs = duration * msPerDivision;

            // Get note type
            const typeEl = noteEl.querySelector('type');
            const typeText = typeEl?.textContent || 'quarter';

            // Check for dotted
            const dotted = noteEl.querySelector('dot') !== null;

            // Map MusicXML type to our note types
            let noteType;
            switch (typeText) {
                case 'whole': noteType = NOTE_TYPES.WHOLE; break;
                case 'half': noteType = NOTE_TYPES.HALF; break;
                case 'quarter': noteType = NOTE_TYPES.QUARTER; break;
                case 'eighth': noteType = NOTE_TYPES.EIGHTH; break;
                case '16th': noteType = NOTE_TYPES.SIXTEENTH; break;
                case '32nd': noteType = NOTE_TYPES.SIXTEENTH; break; // Treat 32nd as 16th
                default: noteType = NOTE_TYPES.QUARTER;
            }

            if (isRest) {
                // Add rest with no pitch info
                notes.push({
                    isRest: true,
                    duration: durationMs,
                    noteType: noteType,
                    dotted: dotted
                });
            } else {
                // Get pitch
                const pitchEl = noteEl.querySelector('pitch');
                if (!pitchEl) return;

                const step = pitchEl.querySelector('step')?.textContent || 'C';
                const octave = parseInt(pitchEl.querySelector('octave')?.textContent || '4');
                const alter = parseInt(pitchEl.querySelector('alter')?.textContent || '0');

                // Convert alter to sharp/flat
                let noteName = step;
                if (alter === 1) noteName += '#';
                else if (alter === -1) {
                    // Convert flat to equivalent sharp for internal consistency
                    if (FLAT_TO_SHARP[step]) {
                        noteName = FLAT_TO_SHARP[step];
                    }
                }

                notes.push({
                    note: noteName,
                    octave: octave,
                    duration: durationMs,
                    noteType: noteType,
                    dotted: dotted,
                    isRest: false
                });
            }
        });
    });

    if (notes.length === 0) {
        throw new Error('No notes found in selected part');
    }

    return {
        notes: notes,
        timeSignature: { beats: timeBeats, beatType: timeBeatType },
        tempo: tempo,  // The BPM at which durations were calculated
        key: key
    };
}
