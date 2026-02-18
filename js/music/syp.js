/**
 * SYP (Sing Your Part) format parser
 *
 * A plaintext format for vocal music with four-part harmony.
 */

import { NOTE_TYPES } from './constants.js';

/**
 * Parse SYP file and extract available voice parts
 * @param {string} text - SYP file content
 * @returns {{metadata: Object, parts: Array<{id: string, name: string}>}}
 */
export function getSYPParts(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const metadata = parseHeader(lines);

    // Find which voice parts are present
    const voiceParts = new Set();
    for (const line of lines) {
        const match = line.match(/^(soprano|alto|tenor|bass)\s+/i);
        if (match) {
            voiceParts.add(match[1].toLowerCase());
        }
    }

    const partNames = {
        soprano: 'Soprano',
        alto: 'Alto',
        tenor: 'Tenor',
        bass: 'Bass'
    };

    const parts = Array.from(voiceParts).map(id => ({
        id,
        name: partNames[id] || id
    }));

    // Sort in standard SATB order
    const order = ['soprano', 'alto', 'tenor', 'bass'];
    parts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

    return { metadata, parts };
}

/**
 * Parse header section and extract metadata
 * @param {string[]} lines - All lines from file
 * @returns {Object} Metadata object
 */
function parseHeader(lines) {
    const metadata = {
        title: '',
        composer: '',
        tempo: 90,
        timeSignature: { beats: 4, beatType: 4 },
        key: 'C',
        mode: 'major',
        ranges: {}
    };

    for (const line of lines) {
        if (line.startsWith('measure')) break;

        // Handle both tab-separated and space-separated key/value pairs
        let key, value;
        const tabIndex = line.indexOf('\t');
        if (tabIndex !== -1) {
            key = line.substring(0, tabIndex).trim().toLowerCase();
            value = line.substring(tabIndex + 1).trim();
        } else {
            // Try splitting on multiple spaces
            const spaceMatch = line.match(/^(\S+)\s{2,}(.+)$/);
            if (!spaceMatch) continue;
            key = spaceMatch[1].toLowerCase();
            value = spaceMatch[2].trim();
        }

        switch (key) {
            case 'title':
                metadata.title = value;
                break;
            case 'composer':
                metadata.composer = value;
                break;
            case 'tempo':
                metadata.tempo = parseInt(value) || 90;
                break;
            case 'rhythm':
                const rhythmMatch = value.match(/(\d+)\s*:\s*(\d+)/);
                if (rhythmMatch) {
                    metadata.timeSignature = {
                        beats: parseInt(rhythmMatch[1]),
                        beatType: parseInt(rhythmMatch[2])
                    };
                }
                break;
            case 'key':
                metadata.key = value;
                break;
            case 'mode':
                metadata.mode = value.toLowerCase();
                break;
            case 'range':
                // Parse range like "G: F4 to E5" or "F: A2 to G3"
                const rangeMatch = value.match(/([GF]):\s*([A-G]#?)(\d+)\s+to\s+([A-G]#?)(\d+)/i);
                if (rangeMatch) {
                    const clef = rangeMatch[1].toUpperCase();
                    metadata.ranges[clef] = {
                        lowNote: rangeMatch[2].toUpperCase(),
                        lowOctave: parseInt(rangeMatch[3]),
                        highNote: rangeMatch[4].toUpperCase(),
                        highOctave: parseInt(rangeMatch[5])
                    };
                }
                break;
        }
    }

    return metadata;
}

/**
 * Parse a single voice part from SYP content
 * @param {string} text - SYP file content
 * @param {string} voiceId - Voice part to extract ('soprano', 'alto', 'tenor', 'bass')
 * @returns {{notes: Array, timeSignature: Object, tempo: number}}
 */
export function parseSYPPart(text, voiceId) {
    const lines = text.split('\n').map(l => l.trim());
    const metadata = parseHeader(lines);

    // Determine which range this voice uses
    const isUpperVoice = voiceId === 'soprano' || voiceId === 'alto';
    const rangeKey = isUpperVoice ? 'G' : 'F';
    const range = metadata.ranges[rangeKey] || getDefaultRange(rangeKey);

    // Build octave lookup for the range
    const octaveLookup = buildOctaveLookup(range);

    // Get default duration based on time signature
    const defaultDuration = getDefaultDuration();

    const notes = [];
    let currentMeasure = -1;
    let activeAccidentals = {}; // Track accidentals within measure
    let pickupDuration = 0; // Duration of pickup (anacrusis) measure, if any
    let measure0NoteCount = 0; // Track notes added during measure 0

    for (const line of lines) {
        // Check for measure marker
        const measureMatch = line.match(/^measure\s+(\d+)/i);
        if (measureMatch) {
            // When leaving measure 0, compute pickup duration from the notes added
            if (currentMeasure === 0 && measure0NoteCount > 0) {
                pickupDuration = 0;
                for (let i = notes.length - measure0NoteCount; i < notes.length; i++) {
                    pickupDuration += notes[i].duration;
                }
            }
            currentMeasure = parseInt(measureMatch[1]);
            activeAccidentals = {}; // Reset accidentals at measure boundary
            continue;
        }

        // Check for voice line
        const voiceMatch = line.match(new RegExp(`^${voiceId}\\s+(.+)$`, 'i'));
        if (!voiceMatch) continue;

        const noteTokens = tokenizeNotes(voiceMatch[1]);

        let tieNext = false; // Track if previous note should be tied to current
        for (const token of noteTokens) {
            if (token === '||' || token === '|') continue; // Barlines
            if (token === '=') {
                tieNext = true; // Next note's duration adds to previous note
                continue;
            }

            const noteInfo = parseNoteToken(token, octaveLookup, defaultDuration, activeAccidentals, metadata.key, metadata.mode, metadata.tempo);
            if (noteInfo) {
                if (tieNext && notes.length > 0 && !noteInfo.isRest) {
                    // Tie: preserve visual components while summing duration
                    const prevNote = notes[notes.length - 1];
                    if (!prevNote.tiedNotes) {
                        prevNote.tiedNotes = [{ noteType: prevNote.noteType, dotted: prevNote.dotted, duration: prevNote.duration }];
                    }
                    prevNote.tiedNotes.push({ noteType: noteInfo.noteType, dotted: noteInfo.dotted, duration: noteInfo.duration });
                    prevNote.duration += noteInfo.duration;
                    tieNext = false;
                } else {
                    notes.push(noteInfo);
                    if (currentMeasure === 0) measure0NoteCount++;
                    tieNext = false;
                }
            }
        }
    }

    return {
        notes,
        timeSignature: metadata.timeSignature,
        tempo: metadata.tempo,
        pickupDuration,
        key: metadata.key || 'C'
    };
}

/**
 * Get default range if not specified
 */
function getDefaultRange(clef) {
    if (clef === 'G') {
        return { lowNote: 'F', lowOctave: 4, highNote: 'E', highOctave: 5 };
    } else {
        return { lowNote: 'A', lowOctave: 2, highNote: 'G', highOctave: 3 };
    }
}

/**
 * Build octave lookup table for a range
 * Maps note name to its octave within the range
 */
function buildOctaveLookup(range) {
    const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const lookup = {};

    let octave = range.lowOctave;
    let noteIndex = noteOrder.indexOf(range.lowNote);

    while (true) {
        const noteName = noteOrder[noteIndex];
        lookup[noteName.toLowerCase()] = octave;

        // Check if we've reached the high note
        if (noteName === range.highNote && octave === range.highOctave) {
            break;
        }

        // Move to next note
        noteIndex++;
        if (noteIndex >= noteOrder.length) {
            noteIndex = 0;
            octave++;
        }

        // Safety check
        if (octave > range.highOctave + 1) break;
    }

    return lookup;
}

/**
 * Get default note duration (always quarter note in SYP format)
 */
function getDefaultDuration() {
    return { type: NOTE_TYPES.QUARTER, dotted: false };
}

/**
 * Calculate duration in milliseconds from note type and tempo
 */
function calculateDurationMs(noteType, dotted, tempo) {
    const msPerQuarter = 60000 / tempo;

    let baseMs;
    switch (noteType) {
        case NOTE_TYPES.WHOLE: baseMs = msPerQuarter * 4; break;
        case NOTE_TYPES.HALF: baseMs = msPerQuarter * 2; break;
        case NOTE_TYPES.QUARTER: baseMs = msPerQuarter; break;
        case NOTE_TYPES.EIGHTH: baseMs = msPerQuarter / 2; break;
        case NOTE_TYPES.SIXTEENTH: baseMs = msPerQuarter / 4; break;
        default: baseMs = msPerQuarter;
    }

    return dotted ? baseMs * 1.5 : baseMs;
}

/**
 * Tokenize a note string into individual note tokens
 */
function tokenizeNotes(noteString) {
    const tokens = [];
    let current = '';
    let i = 0;

    while (i < noteString.length) {
        const char = noteString[i];

        if (char === ' ' || char === '\t') {
            if (current) {
                tokens.push(current);
                current = '';
            }
            i++;
        } else if (char === '|') {
            if (current) {
                tokens.push(current);
                current = '';
            }
            // Collect all consecutive | or ||
            let barline = '';
            while (noteString[i] === '|') {
                barline += noteString[i];
                i++;
            }
            tokens.push(barline);
        } else if (char === '=') {
            if (current) {
                tokens.push(current);
                current = '';
            }
            tokens.push('=');
            i++;
        } else {
            current += char;
            i++;
        }
    }

    if (current) {
        tokens.push(current);
    }

    return tokens;
}

/**
 * Parse a single note token
 * @returns {Object|null} Note object or null if invalid
 */
function parseNoteToken(token, octaveLookup, defaultDuration, activeAccidentals, key, mode, tempo) {
    // Rest: R or R/8, R/4, etc.
    const restMatch = token.match(/^R(\/(\d+)(\.)?)?$/i);
    if (restMatch) {
        const dur = parseDuration(restMatch[2], restMatch[3], defaultDuration);
        const durationMs = calculateDurationMs(dur.type, dur.dotted, tempo);
        return {
            isRest: true,
            duration: durationMs,
            noteType: dur.type,
            dotted: dur.dotted
        };
    }

    // Note: e, e-, e+, e#, eb, en, e-/8, e+/4., etc.
    const noteMatch = token.match(/^([a-g])([#bn])?([+-])?(\/(\d+))?(\.)?$/i);
    if (!noteMatch) return null;

    const noteLetter = noteMatch[1].toLowerCase();
    const accidentalChar = noteMatch[2];
    const octaveModifier = noteMatch[3];
    const durationNum = noteMatch[5];
    const dotted = noteMatch[6] === '.';

    // Get base octave from lookup
    let octave = octaveLookup[noteLetter];
    if (octave === undefined) {
        // Fallback for notes not in lookup
        octave = 4;
    }

    // Apply octave modifier
    if (octaveModifier === '-') {
        octave -= 1;
    } else if (octaveModifier === '+') {
        octave += 1;
    }

    // Handle accidentals
    let noteName = noteLetter.toUpperCase();

    if (accidentalChar) {
        // Explicit accidental - update active accidentals for this measure
        if (accidentalChar === '#') {
            noteName += '#';
            activeAccidentals[noteLetter] = '#';
        } else if (accidentalChar === 'b') {
            noteName += 'b';
            activeAccidentals[noteLetter] = 'b';
        } else if (accidentalChar === 'n') {
            // Natural - remove any active accidental
            activeAccidentals[noteLetter] = 'n';
        }
    } else if (activeAccidentals[noteLetter]) {
        // Apply active accidental from earlier in measure
        if (activeAccidentals[noteLetter] === '#') {
            noteName += '#';
        } else if (activeAccidentals[noteLetter] === 'b') {
            noteName += 'b';
        }
        // 'n' means natural, so no suffix
    } else {
        // Apply key signature accidentals
        noteName = applyKeySignature(noteName, key, mode);
    }

    // Parse duration
    const dur = parseDuration(durationNum, dotted ? '.' : null, defaultDuration);
    const durationMs = calculateDurationMs(dur.type, dur.dotted, tempo);

    return {
        note: noteName,
        octave,
        duration: durationMs,
        noteType: dur.type,
        dotted: dur.dotted,
        isRest: false
    };
}

/**
 * Parse duration from string
 */
function parseDuration(durationNum, dottedChar, defaultDuration) {
    const dotted = dottedChar === '.';

    if (!durationNum) {
        return { ...defaultDuration, dotted: dotted || defaultDuration.dotted };
    }

    const num = parseInt(durationNum);
    let type;

    switch (num) {
        case 1: type = NOTE_TYPES.WHOLE; break;
        case 2: type = NOTE_TYPES.HALF; break;
        case 4: type = NOTE_TYPES.QUARTER; break;
        case 8: type = NOTE_TYPES.EIGHTH; break;
        case 16: type = NOTE_TYPES.SIXTEENTH; break;
        default: type = NOTE_TYPES.QUARTER;
    }

    return { type, dotted };
}

/**
 * Key signature lookup tables (exported for rendering)
 */
export const KEY_SHARP_MAP = {
    'G': ['F'],
    'D': ['F', 'C'],
    'A': ['F', 'C', 'G'],
    'E': ['F', 'C', 'G', 'D'],
    'B': ['F', 'C', 'G', 'D', 'A'],
    'F#': ['F', 'C', 'G', 'D', 'A', 'E'],
    'C#': ['F', 'C', 'G', 'D', 'A', 'E', 'B']
};

export const KEY_FLAT_MAP = {
    'F': ['B'],
    'Bb': ['B', 'E'],
    'Eb': ['B', 'E', 'A'],
    'Ab': ['B', 'E', 'A', 'D'],
    'Db': ['B', 'E', 'A', 'D', 'G'],
    'Gb': ['B', 'E', 'A', 'D', 'G', 'C'],
    'Cb': ['B', 'E', 'A', 'D', 'G', 'C', 'F']
};

/**
 * Apply key signature accidentals to a note
 */
function applyKeySignature(noteName, key, mode) {
    const sharpKeys = KEY_SHARP_MAP;
    const flatKeys = KEY_FLAT_MAP;

    // Check if this note should be sharped
    if (sharpKeys[key] && sharpKeys[key].includes(noteName)) {
        return noteName + '#';
    }

    // Check if this note should be flatted
    if (flatKeys[key] && flatKeys[key].includes(noteName)) {
        return noteName + 'b';
    }

    return noteName;
}
