/**
 * DOM Element Registry
 *
 * Centralizes all DOM element references for easier module extraction.
 * Elements are lazily initialized on first access.
 */

// Cache for DOM elements
const cache = {};

/**
 * Get a DOM element by ID, caching the result
 * @param {string} id - Element ID
 * @returns {HTMLElement|null}
 */
function getById(id) {
    if (!(id in cache)) {
        cache[id] = document.getElementById(id);
    }
    return cache[id];
}

/**
 * Get DOM elements by selector, caching the result
 * @param {string} selector - CSS selector
 * @returns {NodeList}
 */
function getAll(selector) {
    if (!(selector in cache)) {
        cache[selector] = document.querySelectorAll(selector);
    }
    return cache[selector];
}

/**
 * Get a single DOM element by selector, caching the result
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null}
 */
function getOne(selector) {
    if (!(selector in cache)) {
        cache[selector] = document.querySelector(selector);
    }
    return cache[selector];
}

// ============================================================================
// Free Practice Mode Elements
// ============================================================================
export const freePractice = {
    get playNoteBtn() { return getById('play-note'); },
    get startBtn() { return getById('start-btn'); },
    get statusEl() { return getById('status'); },
    get pitchCanvas() { return getById('pitch-canvas'); },
    get detectedPitchEl() { return getById('detected-pitch'); },
    get detectedNoteEl() { return getById('detected-note'); },
    get centsOffEl() { return getById('cents-off'); },
    get noteSelect() { return getById('note-select'); },
    get octaveSelect() { return getById('octave-select'); },
    get noteNameEl() { return getById('note-name'); },
    get noteFreqEl() { return getById('note-freq'); },
    get targetNoteLabelEl() { return getById('target-note-label'); },
    get sections() { return getAll('.free-practice-section'); }
};

// ============================================================================
// Mode Switching Elements
// ============================================================================
export const modes = {
    get freeBtn() { return getById('mode-free'); },
    get sequenceBtn() { return getById('mode-sequence'); }
};

// ============================================================================
// Song Practice Mode Elements
// ============================================================================
export const songPractice = {
    get section() { return getOne('.sequence-section'); },
    get sequenceSelect() { return getById('sequence-select'); },
    get startNoteSelect() { return getById('start-note-select'); },
    get startOctaveSelect() { return getById('start-octave-select'); },
    get sheetMusicCanvas() { return getById('sheet-music-canvas'); },
    get previewBtn() { return getById('preview-btn'); },
    get goBtn() { return getById('go-btn'); },
    get sequenceCanvas() { return getById('sequence-canvas'); },
    get canvasContainer() { return getOne('.sequence-canvas-container'); },
    get results() { return getById('sequence-results'); },
    get resultsGrade() { return getById('results-grade'); },
    get resultsPercent() { return getById('results-percent'); },
    get resultsBreakdown() { return getById('results-breakdown'); },
    get retryBtn() { return getById('retry-btn'); },
    get statusEl() { return getById('sequence-status'); },
    get startingNoteContainer() { return getById('starting-note-container'); },
    get tempoSlider() { return getById('tempo-slider'); },
    get tempoDisplay() { return getById('tempo-display'); },
    get beatIndicator() { return getById('beat-indicator'); }
};

// ============================================================================
// MusicXML Import Elements
// ============================================================================
export const musicxml = {
    get importBtn() { return getById('musicxml-import'); },
    get fileInput() { return getById('musicxml-file'); },
    get filename() { return getById('musicxml-filename'); },
    get partSelector() { return getById('musicxml-part-selector'); },
    get partSelect() { return getById('musicxml-part-select'); }
};

// ============================================================================
// Note Selector Elements
// ============================================================================
export const noteSelector = {
    get popup() { return getById('note-selector-popup'); },
    get closeBtn() { return getById('note-selector-close'); },
    get label() { return getById('note-selector-label'); },
    get okBtn() { return getById('note-selector-ok'); },
    get accidentalToggle() { return getById('accidental-toggle'); },
    get grandStaffCanvas() { return getById('grand-staff-canvas'); },
    get freePracticeMiniCanvas() { return getById('free-practice-mini-canvas'); },
    get songPracticeMiniCanvas() { return getById('song-practice-mini-canvas'); },
    get freePracticeMiniStaff() { return getById('free-practice-mini-staff'); },
    get songPracticeMiniStaff() { return getById('song-practice-mini-staff'); },
    get freeOctaveDown() { return getById('free-octave-down'); },
    get freeOctaveUp() { return getById('free-octave-up'); },
    get songOctaveDown() { return getById('song-octave-down'); },
    get songOctaveUp() { return getById('song-octave-up'); }
};
