// ============================================================================
// Module Imports
// ============================================================================
import {
    NOTE_NAMES,
    NOTE_TYPES,
    DIATONIC_POSITION,
    NATURAL_NOTES,
    getFrequency,
    getNoteFromFrequency,
    getCentsDifference,
    noteToSemitone,
    semitoneToNote,
    getStaffPosition,
    getBestClef,
    getYForStaffPosition,
    getBaseNote,
    getAccidentalFromNote,
    applyAccidental,
    flatToSharpEquivalent,
    getNoteRange,
    isNoteInRange,
    calculateNoteScore,
    calculateGrade,
    frequencyToStaffY
} from './js/music/index.js';

import {
    getMusicXMLParts,
    parseMusicXMLPart
} from './js/music/musicxml.js';

import {
    BUILTIN_SEQUENCE_TEMPO,
    audioState,
    appState,
    currentNote,
    pitchDetection,
    PITCH_CONFIG,
    sequenceState,
    previewScrollState,
    userScrollState,
    sequences,
    noteSelectorState
} from './js/state/index.js';

import {
    TREBLE_CLEF_PATH,
    BASS_CLEF_PATH,
    drawTrebleClef,
    drawBassClef,
    drawTrebleClefMini,
    drawBassClefMini,
    drawNote,
    drawRest,
    drawLedgerLines,
    drawSelectableNote,
    drawGrandStaffLedgerLines,
    drawMiniLedgerLines,
    getNoteDisplayName,
    drawMiniStaff
} from './js/rendering/index.js';

import {
    getAudioContext,
    warmUpAudio,
    setupAudioWarmupListeners,
    detectPitch,
    getSmoothedPitch,
    playTone,
    getClickBuffer,
    createCountdownBuffer
} from './js/audio/index.js';

import {
    loadPreferences,
    savePreference,
    loadCustomSequences,
    saveCustomSequence,
    updateCustomSequence,
    deleteCustomSequence,
    findCustomSequenceByName
} from './js/storage/index.js';

// Legacy alias for backward compatibility within this file
const noteNames = NOTE_NAMES;

function updatePreviewScroll() {
    if (!sequenceState.isPreviewing || !previewScrollState.scrollParams) {
        if (previewScrollState.animationId) {
            cancelAnimationFrame(previewScrollState.animationId);
            previewScrollState.animationId = null;
        }
        return;
    }

    const params = previewScrollState.scrollParams;
    const i = previewScrollState.currentNoteIndex;
    const pos = params.notePositions[i];
    if (!pos) {
        previewScrollState.animationId = requestAnimationFrame(updatePreviewScroll);
        return;
    }

    // Calculate progress within current note based on time since note started
    const elapsed = performance.now() - previewScrollState.noteStartTime;
    const progress = Math.min(1, elapsed / previewScrollState.noteDuration);

    // Interpolate X position within current note using per-note spacing
    const nextX = (i < params.notePositions.length - 1)
        ? params.notePositions[i + 1].x
        : pos.x + pos.spacing;
    const currentX = pos.x + progress * (nextX - pos.x);

    sequenceState.previewIndex = i;

    // Calculate scroll offset based on current position
    // Add padding so the current note isn't right at the edge
    const previewPadding = params.minNoteSpacing * 2;
    const scrollOffset = Math.min(
        Math.max(0, currentX - params.notesStartX - previewPadding),
        params.maxScrollNeeded
    );

    drawSheetMusic(sequenceState.previewIndex, sequenceState.previewIndex, null, -1, false, 0, scrollOffset);
    previewScrollState.animationId = requestAnimationFrame(updatePreviewScroll);
}

// Called when a new note starts playing (syncs visual to audio)
function onPreviewNoteStart(noteIndex, noteDuration) {
    previewScrollState.currentNoteIndex = noteIndex;
    previewScrollState.noteStartTime = performance.now();
    previewScrollState.noteDuration = noteDuration;
}

function startPreviewScrollAnimation(scrollParams) {
    previewScrollState.scrollParams = scrollParams;
    previewScrollState.currentNoteIndex = 0;
    previewScrollState.startTime = performance.now();
    previewScrollState.noteStartTime = performance.now();
    previewScrollState.noteDuration = scrollParams.notePositions[0]?.duration || 1000;

    if (!previewScrollState.animationId) {
        previewScrollState.animationId = requestAnimationFrame(updatePreviewScroll);
    }
}

function stopPreviewScrollAnimation() {
    if (previewScrollState.animationId) {
        cancelAnimationFrame(previewScrollState.animationId);
        previewScrollState.animationId = null;
    }
    previewScrollState.scrollParams = null;
}

// DOM elements
const playNoteBtn = document.getElementById('play-note');
const startBtn = document.getElementById('start-btn');
const statusEl = document.getElementById('status');
const pitchCanvas = document.getElementById('pitch-canvas');
const detectedPitchEl = document.getElementById('detected-pitch');
const detectedNoteEl = document.getElementById('detected-note');
const centsOffEl = document.getElementById('cents-off');
const canvasCtx = pitchCanvas.getContext('2d');
const noteSelect = document.getElementById('note-select');
const octaveSelect = document.getElementById('octave-select');
const noteNameEl = document.getElementById('note-name');
const noteFreqEl = document.getElementById('note-freq');
const targetNoteLabelEl = document.getElementById('target-note-label');

// Set up audio warmup on first user interaction
setupAudioWarmupListeners();

// Draw visualization
function drawVisualization() {
    const width = pitchCanvas.width;
    const height = pitchCanvas.height;
    const rightPadding = 30;
    const drawWidth = width - rightPadding;

    // Clear
    canvasCtx.fillStyle = 'rgba(30, 30, 40, 1)';
    canvasCtx.fillRect(0, 0, width, height);

    const centerY = height / 2;

    // On-pitch zone
    canvasCtx.fillStyle = 'rgba(107, 203, 119, 0.15)';
    const onPitchHeight = (10 / 100) * (height / 2 - 10) * 2;
    canvasCtx.fillRect(0, centerY - onPitchHeight / 2, width, onPitchHeight);

    // Target line
    canvasCtx.strokeStyle = '#6bcb77';
    canvasCtx.lineWidth = 2;
    canvasCtx.setLineDash([5, 5]);
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, centerY);
    canvasCtx.lineTo(width, centerY);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);

    // Threshold lines
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    canvasCtx.lineWidth = 1;
    const thresholdOffset = height / 4;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, centerY - thresholdOffset);
    canvasCtx.lineTo(width, centerY - thresholdOffset);
    canvasCtx.moveTo(0, centerY + thresholdOffset);
    canvasCtx.lineTo(width, centerY + thresholdOffset);
    canvasCtx.stroke();

    // Draw pitch history
    canvasCtx.lineWidth = 3;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';

    let lastValidPoint = null;

    for (let i = 0; i < pitchDetection.history.length; i++) {
        const cents = pitchDetection.history[i];
        if (cents === null) {
            lastValidPoint = null;
            continue;
        }

        const x = (i / PITCH_CONFIG.maxSamples) * drawWidth;
        const clampedCents = Math.max(-100, Math.min(100, cents));
        const y = centerY - (clampedCents / 100) * (height / 2 - 10);

        if (Math.abs(cents) <= 10) {
            canvasCtx.strokeStyle = '#6bcb77';
        } else if (Math.abs(cents) <= 25) {
            canvasCtx.strokeStyle = '#ffd93d';
        } else {
            canvasCtx.strokeStyle = '#ff6b6b';
        }

        if (lastValidPoint) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(lastValidPoint.x, lastValidPoint.y);
            canvasCtx.lineTo(x, y);
            canvasCtx.stroke();
        }

        lastValidPoint = { x, y, cents };
    }

    // Current position indicator
    if (lastValidPoint && appState.isRunning) {
        canvasCtx.beginPath();
        canvasCtx.arc(lastValidPoint.x, lastValidPoint.y, 8, 0, Math.PI * 2);

        if (Math.abs(lastValidPoint.cents) <= 10) {
            canvasCtx.fillStyle = '#6bcb77';
        } else if (Math.abs(lastValidPoint.cents) <= 25) {
            canvasCtx.fillStyle = '#ffd93d';
        } else {
            canvasCtx.fillStyle = '#ff6b6b';
        }
        canvasCtx.fill();
        canvasCtx.strokeStyle = 'white';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
    }
}

// Main analysis loop
function analyze(timestamp) {
    if (!appState.isRunning) return;

    // Sample at fixed rate
    if (timestamp - pitchDetection.lastSampleTime >= PITCH_CONFIG.sampleInterval) {
        pitchDetection.lastSampleTime = timestamp;

        const buffer = new Float32Array(audioState.analyser.fftSize);
        audioState.analyser.getFloatTimeDomainData(buffer);

        const rawPitch = detectPitch(buffer, audioState.context.sampleRate);

        if (rawPitch !== -1 && rawPitch > 80 && rawPitch < 1000) {
            const pitch = getSmoothedPitch(rawPitch);
            const cents = getCentsDifference(pitch, currentNote.frequency);
            const noteName = getNoteFromFrequency(pitch);

            detectedPitchEl.textContent = Math.round(pitch);
            detectedNoteEl.textContent = `Hz (${noteName})`;

            const centsRounded = Math.round(cents);
            if (centsRounded > 0) {
                centsOffEl.textContent = `+${centsRounded}`;
                centsOffEl.className = Math.abs(centsRounded) <= 10 ? 'on-pitch' : 'sharp';
            } else {
                centsOffEl.textContent = centsRounded.toString();
                centsOffEl.className = Math.abs(centsRounded) <= 10 ? 'on-pitch' : 'flat';
            }

            pitchDetection.history.push(cents);
        } else {
            pitchDetection.history.push(null);
        }

        // Keep sliding window
        while (pitchDetection.history.length > PITCH_CONFIG.maxSamples) {
            pitchDetection.history.shift();
        }
    }

    drawVisualization();
    appState.animationId = requestAnimationFrame(analyze);
}

// Start live analysis
async function start() {
    try {
        // Ensure audio context is warmed up and resumed
        await warmUpAudio();
        const ctx = getAudioContext();

        audioState.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = ctx.createMediaStreamSource(audioState.micStream);

        audioState.analyser = ctx.createAnalyser();
        audioState.analyser.fftSize = 4096;
        source.connect(audioState.analyser);

        pitchDetection.history.length = 0;
        pitchDetection.recentPitches.length = 0;
        pitchDetection.lastSampleTime = 0;

        appState.isRunning = true;
        startBtn.textContent = 'Stop';
        startBtn.classList.add('recording');
        statusEl.textContent = 'Listening...';

        appState.animationId = requestAnimationFrame(analyze);

    } catch (err) {
        console.error('Microphone error:', err);
        statusEl.textContent = 'Error: Could not access microphone.';
    }
}

// Stop live analysis
function stop() {
    appState.isRunning = false;

    if (appState.animationId) {
        cancelAnimationFrame(appState.animationId);
        appState.animationId = null;
    }

    if (audioState.micStream) {
        audioState.micStream.getTracks().forEach(track => track.stop());
        audioState.micStream = null;
    }

    startBtn.textContent = 'Start';
    startBtn.classList.remove('recording');
    statusEl.textContent = '';
}

// Update current note
function updateCurrentNote() {
    const note = noteSelect.value;
    const octave = parseInt(octaveSelect.value);
    const frequency = getFrequency(note, octave);

    currentNote.name = `${note}${octave}`;
    currentNote.frequency = frequency;

    noteNameEl.textContent = currentNote.name;
    noteFreqEl.textContent = `${Math.round(frequency)} Hz`;
    targetNoteLabelEl.textContent = currentNote.name;

    // Save free practice note preference
    savePreference('freeNote', note);
    savePreference('freeOctave', octave);
}

// Event listeners
noteSelect.addEventListener('change', updateCurrentNote);
octaveSelect.addEventListener('change', updateCurrentNote);

playNoteBtn.addEventListener('click', () => {
    playNoteBtn.disabled = true;
    playTone(currentNote.frequency, 1.5, {
        onComplete: () => { playNoteBtn.disabled = false; }
    });
});

startBtn.addEventListener('click', () => {
    if (appState.isRunning) {
        stop();
    } else {
        start();
    }
});

// Initial draw
drawVisualization();

// Sequence Mode DOM elements
const modeFreeBtn = document.getElementById('mode-free');
const modeSequenceBtn = document.getElementById('mode-sequence');
const freePracticeSections = document.querySelectorAll('.free-practice-section');
const sequenceSection = document.querySelector('.sequence-section');
const sequenceSelect = document.getElementById('sequence-select');
const startNoteSelect = document.getElementById('start-note-select');
const startOctaveSelect = document.getElementById('start-octave-select');
const sheetMusicCanvas = document.getElementById('sheet-music-canvas');
const sheetMusicCtx = sheetMusicCanvas.getContext('2d');

// Sheet music scroll event handlers
sheetMusicCanvas.addEventListener('mousedown', (e) => {
    if (sequenceState.isPlaying || sequenceState.isPreviewing || sequenceState.isCountingDown) return;
    if (userScrollState.maxOffset <= 0) return;

    userScrollState.isDragging = true;
    userScrollState.startX = e.clientX;
    userScrollState.startOffset = userScrollState.offset;
    sheetMusicCanvas.style.cursor = 'grabbing';
});

sheetMusicCanvas.addEventListener('mousemove', (e) => {
    if (!userScrollState.isDragging) {
        // Show grab cursor if scrollable
        if (userScrollState.maxOffset > 0 && !sequenceState.isPlaying && !sequenceState.isPreviewing && !sequenceState.isCountingDown) {
            sheetMusicCanvas.style.cursor = 'grab';
        } else {
            sheetMusicCanvas.style.cursor = 'default';
        }
        return;
    }

    const deltaX = userScrollState.startX - e.clientX;
    userScrollState.offset = Math.max(0, Math.min(userScrollState.maxOffset, userScrollState.startOffset + deltaX));
    // Preserve final trace when scrolling after song ends
    if (sequenceState.showFinalTrace) {
        drawSheetMusic(-1, -1, sequenceState.noteScores, -1, true);
    } else {
        drawSheetMusic(-1, -1);
    }
});

sheetMusicCanvas.addEventListener('mouseup', () => {
    if (userScrollState.isDragging) {
        userScrollState.isDragging = false;
        sheetMusicCanvas.style.cursor = userScrollState.maxOffset > 0 ? 'grab' : 'default';
    }
});

sheetMusicCanvas.addEventListener('mouseleave', () => {
    if (userScrollState.isDragging) {
        userScrollState.isDragging = false;
        sheetMusicCanvas.style.cursor = 'default';
    }
});

// Touch support for scrolling
sheetMusicCanvas.addEventListener('touchstart', (e) => {
    if (sequenceState.isPlaying || sequenceState.isPreviewing || sequenceState.isCountingDown) return;
    if (userScrollState.maxOffset <= 0) return;

    userScrollState.isDragging = true;
    userScrollState.startX = e.touches[0].clientX;
    userScrollState.startOffset = userScrollState.offset;
}, { passive: true });

sheetMusicCanvas.addEventListener('touchmove', (e) => {
    if (!userScrollState.isDragging) return;

    const deltaX = userScrollState.startX - e.touches[0].clientX;
    userScrollState.offset = Math.max(0, Math.min(userScrollState.maxOffset, userScrollState.startOffset + deltaX));
    // Preserve final trace when scrolling after song ends
    if (sequenceState.showFinalTrace) {
        drawSheetMusic(-1, -1, sequenceState.noteScores, -1, true);
    } else {
        drawSheetMusic(-1, -1);
    }
}, { passive: true });

sheetMusicCanvas.addEventListener('touchend', () => {
    userScrollState.isDragging = false;
});

// Mouse wheel scrolling
sheetMusicCanvas.addEventListener('wheel', (e) => {
    if (sequenceState.isPlaying || sequenceState.isPreviewing || sequenceState.isCountingDown) return;
    if (userScrollState.maxOffset <= 0) return;

    e.preventDefault();
    userScrollState.offset = Math.max(0, Math.min(userScrollState.maxOffset, userScrollState.offset + e.deltaX + e.deltaY));
    // Preserve final trace when scrolling after song ends
    if (sequenceState.showFinalTrace) {
        drawSheetMusic(-1, -1, sequenceState.noteScores, -1, true);
    } else {
        drawSheetMusic(-1, -1);
    }
}, { passive: false });

const previewBtn = document.getElementById('preview-btn');
const goBtn = document.getElementById('go-btn');
const sequenceCanvas = document.getElementById('sequence-canvas');
const sequenceCanvasContainer = document.querySelector('.sequence-canvas-container');
const sequenceCtx = sequenceCanvas.getContext('2d');
const sequenceResults = document.getElementById('sequence-results');
const resultsGrade = document.getElementById('results-grade');
const resultsPercent = document.getElementById('results-percent');
const resultsBreakdown = document.getElementById('results-breakdown');
const retryBtn = document.getElementById('retry-btn');
const sequenceStatus = document.getElementById('sequence-status');
const musicxmlImport = document.getElementById('musicxml-import');
const musicxmlFile = document.getElementById('musicxml-file');
const musicxmlFilename = document.getElementById('musicxml-filename');
const musicxmlPartSelector = document.getElementById('musicxml-part-selector');
const musicxmlPartSelect = document.getElementById('musicxml-part-select');
const startingNoteContainer = document.getElementById('starting-note-container');
const tempoSlider = document.getElementById('tempo-slider');
const tempoDisplay = document.getElementById('tempo-display');
const beatIndicator = document.getElementById('beat-indicator');

// Sequence configuration state
let tempoBPM = 90;

// Load and apply stored preferences on startup
function applyStoredPreferences() {
    const prefs = loadPreferences();

    // Apply free practice note
    if (noteSelect && prefs.freeNote) {
        noteSelect.value = prefs.freeNote;
    }
    if (octaveSelect && prefs.freeOctave) {
        octaveSelect.value = prefs.freeOctave.toString();
    }

    // Apply song practice note
    if (startNoteSelect && prefs.songNote) {
        startNoteSelect.value = prefs.songNote;
    }
    if (startOctaveSelect && prefs.songOctave) {
        startOctaveSelect.value = prefs.songOctave.toString();
    }

    // Apply selected sequence
    if (sequenceSelect && prefs.selectedSequence) {
        // Only apply if the sequence exists
        const option = sequenceSelect.querySelector(`option[value="${prefs.selectedSequence}"]`);
        if (option) {
            sequenceSelect.value = prefs.selectedSequence;
        }
    }

    // Apply tempo
    if (prefs.tempo && tempoSlider && tempoDisplay) {
        tempoBPM = prefs.tempo;
        tempoSlider.value = prefs.tempo.toString();
        tempoDisplay.textContent = prefs.tempo.toString();
    }

    // Note: Mode is applied after DOM is ready via setMode()
    return prefs;
}

// Apply preferences immediately
const storedPrefs = applyStoredPreferences();

// ============================================================================
// Custom Sequence Management
// ============================================================================

/**
 * Add a custom sequence option to the dropdown
 * @param {string} id - Sequence ID
 * @param {string} name - Display name
 */
function addCustomSequenceToDropdown(id, name) {
    const customOption = sequenceSelect.querySelector('option[value="custom"]');
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `📁 ${name}`;
    option.dataset.custom = 'true';
    // Insert before the "Custom (Import)" option
    sequenceSelect.insertBefore(option, customOption);
}

/**
 * Remove a custom sequence option from the dropdown
 * @param {string} id - Sequence ID
 */
function removeCustomSequenceFromDropdown(id) {
    const option = sequenceSelect.querySelector(`option[value="${id}"]`);
    if (option) {
        option.remove();
    }
    // Also remove from sequences registry
    delete sequences[id];
}

/**
 * Initialize saved custom sequences on startup
 */
function initializeSavedSequences() {
    const savedSequences = loadCustomSequences();
    savedSequences.forEach(seq => {
        // Add to sequences registry
        sequences[seq.id] = {
            name: seq.name,
            notes: seq.notes,
            timeSignature: seq.timeSignature,
            tempo: seq.tempo
        };
        // Add to dropdown
        addCustomSequenceToDropdown(seq.id, seq.name);
    });
}

/**
 * Check if current selection is a custom sequence
 * @returns {boolean}
 */
function isCustomSequenceSelected() {
    const option = sequenceSelect.selectedOptions[0];
    return option && option.dataset.custom === 'true';
}

/**
 * Delete the currently selected custom sequence
 */
function deleteSelectedCustomSequence() {
    const selectedId = sequenceSelect.value;
    const option = sequenceSelect.selectedOptions[0];

    if (!option || option.dataset.custom !== 'true') {
        return;
    }

    const name = option.textContent.replace('📁 ', '');
    if (!confirm(`Delete "${name}"?`)) {
        return;
    }

    // Remove from storage
    deleteCustomSequence(selectedId);

    // Remove from dropdown and registry
    removeCustomSequenceFromDropdown(selectedId);

    // Select a built-in sequence
    sequenceSelect.value = 'simple-scale';
    loadSequence('simple-scale');
    savePreference('selectedSequence', 'simple-scale');

    // Hide delete button
    updateDeleteButtonVisibility();
}

/**
 * Update delete button visibility based on selection
 */
function updateDeleteButtonVisibility() {
    if (deleteSequenceBtn) {
        deleteSequenceBtn.style.display = isCustomSequenceSelected() ? '' : 'none';
    }
}

// Create delete button (will be added to DOM after sequence selector is available)
let deleteSequenceBtn = null;

// Initialize saved sequences
initializeSavedSequences();

// Beat indicator animation
let beatIndicatorInterval = null;

function startBeatIndicator() {
    stopBeatIndicator();

    // BPM now means "beats per minute" where beat depends on time signature
    // So the interval is simply 60000 / tempoBPM regardless of time signature
    const beatIntervalMs = 60000 / tempoBPM;

    // Pulse immediately, then on interval
    pulseBeatIndicator();
    beatIndicatorInterval = setInterval(pulseBeatIndicator, beatIntervalMs);
}

function stopBeatIndicator() {
    if (beatIndicatorInterval) {
        clearInterval(beatIndicatorInterval);
        beatIndicatorInterval = null;
    }
    beatIndicator.classList.remove('pulse');
}

function pulseBeatIndicator() {
    beatIndicator.classList.add('pulse');
    setTimeout(() => beatIndicator.classList.remove('pulse'), 100);
}

// Mode toggle
function setMode(mode) {
    if (mode === 'free') {
        sequenceState.isSequenceMode = false;
        modeFreeBtn.classList.add('active');
        modeSequenceBtn.classList.remove('active');
        freePracticeSections.forEach(el => el.style.display = '');
        sequenceSection.style.display = 'none';
        if (sequenceState.isPlaying) {
            stopSequence();
        }
    } else {
        sequenceState.isSequenceMode = true;
        modeSequenceBtn.classList.add('active');
        modeFreeBtn.classList.remove('active');
        freePracticeSections.forEach(el => el.style.display = 'none');
        sequenceSection.style.display = '';
        if (appState.isRunning) {
            stop();
        }
        loadSequence(sequenceSelect.value);
    }
    savePreference('mode', mode);
}

// Load sequence with transposition based on selected starting note
function loadSequence(id) {
    const seq = sequences[id];
    if (!seq || seq.notes.length === 0) return;

    // Clear final trace when loading a new sequence
    sequenceState.showFinalTrace = false;

    // Get the original starting note and the user's selected starting note
    const originalStart = seq.notes[0];
    const originalSemitone = noteToSemitone(originalStart.note, originalStart.octave);

    const selectedNote = startNoteSelect.value;
    const selectedOctave = parseInt(startOctaveSelect.value);
    const selectedSemitone = noteToSemitone(selectedNote, selectedOctave);

    // Calculate transposition interval
    const transposition = selectedSemitone - originalSemitone;

    // Transpose all notes
    sequenceState.currentSequence = seq.notes.map(n => {
        const originalSemi = noteToSemitone(n.note, n.octave);
        const transposedSemi = originalSemi + transposition;
        const transposed = semitoneToNote(transposedSemi);

        return {
            ...n,
            note: transposed.note,
            octave: transposed.octave,
            frequency: getFrequency(transposed.note, transposed.octave),
            name: `${transposed.note}${transposed.octave}`
        };
    });

    // Set time signature and source tempo based on sequence type
    if (id === 'custom') {
        // Import slot - timeSignature and sourceTempo already set by loadCustomSequenceFromImport
    } else if (id.startsWith('custom-')) {
        // Saved custom sequence - use stored values
        sequenceState.timeSignature = seq.timeSignature || { beats: 4, beatType: 4 };
        sequenceState.sourceTempo = seq.tempo || 120;
    } else {
        // Built-in sequences
        sequenceState.timeSignature = { beats: 4, beatType: 4 };
        sequenceState.sourceTempo = 90; // Built-in sequences are defined at 90 BPM
    }

    // Reset user scroll when sequence changes
    userScrollState.offset = 0;

    drawSheetMusic();
    sequenceResults.style.display = 'none';
    sequenceCanvasContainer.classList.remove('active');

    // Sync song practice mini-staff (if initialized)
    if (typeof updateSongPracticeMiniStaff === 'function') {
        updateSongPracticeMiniStaff();
    }

    // Update beat indicator to show dotted note for compound time
    updateBeatIndicatorStyle();
}

// Update beat indicator to show quarter or dotted quarter based on time signature
function updateBeatIndicatorStyle() {
    const { beats, beatType } = sequenceState.timeSignature;
    const isCompoundTime = beatType === 8 && (beats === 6 || beats === 9 || beats === 12);

    if (isCompoundTime) {
        beatIndicator.classList.add('dotted');
    } else {
        beatIndicator.classList.remove('dotted');
    }
}

// Get tempo-adjusted duration (in ms)
function getAdjustedDuration(baseDuration) {
    // Scale duration from source tempo to target tempo
    // sourceTempo is the BPM at which baseDuration was calculated (always in quarter notes)
    // tempoBPM is the user's selected playback tempo (in beats, where beat depends on time signature)

    // For compound time (6/8, 9/8, 12/8), the beat is a dotted quarter (1.5 quarter notes)
    // So tempoBPM in compound time means "dotted quarters per minute"
    // Convert to quarter notes per minute for the calculation
    const { beats, beatType } = sequenceState.timeSignature;
    const isCompoundTime = beatType === 8 && (beats === 6 || beats === 9 || beats === 12);

    let effectiveTempoBPM = tempoBPM;
    if (isCompoundTime) {
        // User's BPM is in dotted quarters, convert to quarter notes
        effectiveTempoBPM = tempoBPM * 1.5;
    } else if (beatType === 8) {
        // Simple time with eighth note beat - BPM is in eighths, convert to quarters
        effectiveTempoBPM = tempoBPM / 2;
    } else if (beatType === 2) {
        // Half note beat - BPM is in halves, convert to quarters
        effectiveTempoBPM = tempoBPM * 2;
    }

    return baseDuration * (sequenceState.sourceTempo / effectiveTempoBPM);
}

// Calculate total sequence duration in ms
function getSequenceTotalDuration() {
    return sequenceState.currentSequence.reduce((sum, note) => sum + getAdjustedDuration(note.duration), 0);
}

// Get cumulative time up to (but not including) a note index
function getCumulativeTime(upToIndex) {
    let time = 0;
    for (let i = 0; i < upToIndex && i < sequenceState.currentSequence.length; i++) {
        time += getAdjustedDuration(sequenceState.currentSequence[i].duration);
    }
    return time;
}

// =============================================================================
// SHARED SCROLL/PLAYBACK UTILITIES
// Used by both preview mode and listening mode for consistent behavior
// =============================================================================

// Calculate all scroll-related layout parameters for a sequence
// Returns object with layout metrics that can be used by any mode
// Uses duration-based spacing: longer notes get more horizontal space
function calculateScrollParameters(sequence, canvasWidth) {
    const leftMargin = 15;
    const clefWidth = 40;
    const rightMargin = 15;
    const noteAreaWidth = canvasWidth - leftMargin - clefWidth - rightMargin;
    const minNoteSpacing = 28; // Minimum spacing for the shortest note

    // Find minimum duration to use as baseline for spacing
    const durations = sequence.map(n => getAdjustedDuration(n.duration));
    const minDuration = Math.min(...durations);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    // Calculate spacing for each note based on duration ratio
    // Shortest note gets minNoteSpacing, others scale proportionally
    // No cap - proportional spacing is required for constant scroll rate
    const noteSpacings = durations.map(d => {
        const ratio = d / minDuration;
        return minNoteSpacing * ratio;
    });

    // Calculate total width needed for all notes
    const totalNotesWidth = noteSpacings.reduce((sum, s) => sum + s, 0);

    // Starting X position (leave room for half of first note's spacing)
    const notesStartX = leftMargin + clefWidth + noteSpacings[0] / 2;

    // Build note positions with cumulative X based on variable spacing
    const notePositions = [];
    let cumulativeX = notesStartX;
    let cumulativeTime = 0;
    sequence.forEach((note, i) => {
        const duration = durations[i];
        const spacing = noteSpacings[i];
        notePositions.push({
            x: cumulativeX,
            startTime: cumulativeTime,
            endTime: cumulativeTime + duration,
            duration: duration,
            spacing: spacing // Store per-note spacing for interpolation
        });
        cumulativeX += spacing;
        cumulativeTime += duration;
    });

    // Calculate if scrolling is needed
    const rightEdge = canvasWidth - rightMargin - 10;
    const lastNoteX = notePositions[notePositions.length - 1].x;
    const lastNoteSpacing = noteSpacings[noteSpacings.length - 1];
    const maxScrollNeeded = Math.max(0, lastNoteX + lastNoteSpacing / 2 - rightEdge);
    const hasEllipsis = maxScrollNeeded > 0;

    // For compatibility, calculate an "average" note spacing
    const avgNoteSpacing = totalNotesWidth / sequence.length;

    return {
        leftMargin,
        clefWidth,
        rightMargin,
        noteAreaWidth,
        noteSpacing: avgNoteSpacing, // Average for compatibility
        notesStartX,
        maxNotesVisible: Math.floor(noteAreaWidth / minNoteSpacing), // Approximate
        hasEllipsis,
        maxScrollNeeded,
        rightEdge,
        lastNoteX,
        notePositions,
        totalDuration,
        totalNotesWidth,
        minNoteSpacing,
        minDuration
    };
}

// Calculate playback progress at a given elapsed time
// Returns current note index, progress within that note, and interpolated X position
function getPlaybackProgress(elapsedTime, scrollParams) {
    const { notePositions, notesStartX, maxScrollNeeded } = scrollParams;

    let currentNoteIndex = 0;
    let noteProgress = 0;
    let naturalPlayheadX = notesStartX;

    for (let i = 0; i < notePositions.length; i++) {
        const pos = notePositions[i];
        if (elapsedTime >= pos.startTime && elapsedTime < pos.endTime) {
            currentNoteIndex = i;
            noteProgress = (elapsedTime - pos.startTime) / pos.duration;
            // Use per-note spacing for interpolation
            const nextX = (i < notePositions.length - 1) ? notePositions[i + 1].x : pos.x + pos.spacing;
            naturalPlayheadX = pos.x + noteProgress * (nextX - pos.x);
            break;
        } else if (elapsedTime >= pos.endTime) {
            currentNoteIndex = i + 1;
            noteProgress = 0;
            naturalPlayheadX = (i < notePositions.length - 1) ? notePositions[i + 1].x : pos.x + pos.spacing;
        }
    }

    // Clamp note index to valid range
    currentNoteIndex = Math.min(currentNoteIndex, notePositions.length - 1);

    // Calculate scroll offset for long songs
    const currentScroll = naturalPlayheadX - notesStartX;
    const scrollOffset = Math.min(Math.max(0, currentScroll), maxScrollNeeded);

    // Playhead stays fixed while scrolling, then moves normally
    const playheadX = notesStartX + Math.max(0, currentScroll - maxScrollNeeded);

    return {
        currentNoteIndex,
        noteProgress,
        naturalPlayheadX,
        scrollOffset,
        playheadX
    };
}

// =============================================================================

// Main function to draw sheet music
function drawSheetMusic(activeIndex = -1, completedUpTo = -1, noteScores = null, playbackTime = -1, showFinalTrace = false, noteOffsetX = 0, previewScrollOffset = 0) {
    const canvas = sheetMusicCanvas;
    const ctx = sheetMusicCtx;
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(0, 0, width, height);

    const sequence = sequenceState.currentSequence;
    if (sequence.length === 0) return;

    // Layout - center staff vertically with room for pitch deviations
    const staffTop = 55;
    const lineSpacing = 10;
    const clef = getBestClef(sequence);

    // Use shared scroll parameter calculation
    const scrollParams = calculateScrollParameters(sequence, width);
    const {
        leftMargin, clefWidth, rightMargin, noteSpacing, notesStartX,
        maxNotesVisible, hasEllipsis, maxScrollNeeded, notePositions, totalDuration
    } = scrollParams;
    const notesToShow = Math.min(sequence.length, maxNotesVisible);

    // Draw staff lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const y = staffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - rightMargin, y);
        ctx.stroke();
    }

    // Draw clef
    if (clef === 'treble') {
        drawTrebleClef(ctx, leftMargin, staffTop, lineSpacing);
    } else {
        drawBassClef(ctx, leftMargin, staffTop, lineSpacing);
    }

    // Middle line of staff (for stem direction)
    const staffMiddleY = staffTop + 2 * lineSpacing;

    // Determine if we're in idle mode (not playing, not counting down, not previewing)
    const isIdleMode = playbackTime === -1 && !sequenceState.isPlaying && !sequenceState.isCountingDown && !sequenceState.isPreviewing;

    // Update user scroll max offset for idle scrolling
    if (isIdleMode) {
        userScrollState.maxOffset = maxScrollNeeded;
        // Clamp current offset if max changed
        userScrollState.offset = Math.min(userScrollState.offset, maxScrollNeeded);
    }

    // Determine scroll offset to apply for idle user scrolling
    const idleScrollOffset = isIdleMode && hasEllipsis ? userScrollState.offset : 0;

    // Left edge for clipping notes (at the clef)
    const clipLeftEdge = leftMargin + clefWidth - 5;

    // Calculate pulse amount for active note during playback
    // Pulse decays from 1 to 0 over 250ms when a note becomes active
    let activePulseAmount = 0;
    if (playbackTime >= 0 && sequenceState.isPlaying && activeIndex >= 0 && activeIndex < notePositions.length) {
        const noteStartTime = notePositions[activeIndex].startTime;
        const timeSinceNoteStart = playbackTime - noteStartTime;
        const pulseDuration = 250; // ms
        if (timeSinceNoteStart >= 0 && timeSinceNoteStart < pulseDuration) {
            activePulseAmount = 1 - (timeSinceNoteStart / pulseDuration);
        }
    }

    // Draw all notes with clipping (user can scroll to see them all in idle mode)
    for (let i = 0; i < sequence.length; i++) {
        const note = sequence[i];
        // Use pre-calculated position from notePositions (supports variable spacing)
        const x = notePositions[i].x + noteOffsetX - previewScrollOffset - idleScrollOffset;

        // Skip notes that are past the left edge of the staff or off-screen right
        if (x < clipLeftEdge || x > width + 20) continue;

        const isActive = i === activeIndex;
        const isCompleted = i < completedUpTo;
        const pulseAmount = isActive ? activePulseAmount : 0;

        if (note.isRest) {
            // Draw rest symbol
            drawRest(ctx, x, staffTop, lineSpacing, isActive, isCompleted, note.noteType || NOTE_TYPES.QUARTER, note.dotted || false, pulseAmount);
        } else {
            const staffPos = getStaffPosition(note.note, note.octave);
            const y = getYForStaffPosition(staffPos, clef, staffTop, lineSpacing);
            const isSharp = note.note.includes('#');
            const score = noteScores && noteScores[i] ? noteScores[i].score : null;

            // Draw ledger lines if needed
            drawLedgerLines(ctx, x, y, staffTop, lineSpacing, clef);

            // Draw the note
            drawNote(ctx, x, y, isSharp, isActive, isCompleted, staffMiddleY, score, note.noteType || NOTE_TYPES.QUARTER, note.dotted || false, pulseAmount);
        }
    }

    // Draw scroll indicators if song is scrollable in idle mode
    if (isIdleMode && hasEllipsis) {
        ctx.fillStyle = 'rgba(136, 136, 136, 0.6)';
        ctx.font = 'bold 16px sans-serif';
        ctx.textBaseline = 'middle';
        const indicatorY = staffTop + 2 * lineSpacing;

        // Left arrow if scrolled right
        if (userScrollState.offset > 0) {
            ctx.textAlign = 'left';
            ctx.fillText('◀', leftMargin + clefWidth + 5, indicatorY);
        }

        // Right arrow if more content to the right
        if (userScrollState.offset < maxScrollNeeded) {
            ctx.textAlign = 'right';
            ctx.fillText('▶', width - rightMargin - 5, indicatorY);
        }
    }

    // Draw playback visualization if in playback mode or showing final trace
    const showVisualization = (playbackTime >= 0 && sequenceState.isPlaying) || showFinalTrace;
    if (showVisualization) {
        // Use shared function to calculate playhead position and scroll offset
        const progress = playbackTime >= 0
            ? getPlaybackProgress(playbackTime, scrollParams)
            : { scrollOffset: 0, playheadX: notesStartX, naturalPlayheadX: notesStartX };

        // For final trace in idle mode, use the same scroll offset as the notes
        // Otherwise the pitch trace would be misaligned with the notes
        let scrollOffset = showFinalTrace && isIdleMode ? idleScrollOffset : (hasEllipsis ? progress.scrollOffset : 0);
        let playheadX = hasEllipsis ? progress.playheadX : progress.naturalPlayheadX;

        // Redraw notes with scroll offset during playback
        if (scrollOffset > 0) {
            // Clear and redraw background
            ctx.fillStyle = 'rgba(30, 30, 40, 1)';
            ctx.fillRect(0, 0, width, height);

            // Redraw staff lines
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const y = staffTop + i * lineSpacing;
                ctx.beginPath();
                ctx.moveTo(leftMargin, y);
                ctx.lineTo(width - rightMargin, y);
                ctx.stroke();
            }

            // Redraw clef
            if (clef === 'treble') {
                drawTrebleClef(ctx, leftMargin, staffTop, lineSpacing);
            } else {
                drawBassClef(ctx, leftMargin, staffTop, lineSpacing);
            }

            // Redraw notes with scroll offset
            for (let i = 0; i < sequence.length; i++) {
                const note = sequence[i];
                const x = notePositions[i].x - scrollOffset;
                // Skip notes that are past the left edge of the staff or off-screen right
                if (x < clipLeftEdge || x > width + 20) continue;

                const isActive = i === activeIndex;
                const isCompleted = i < completedUpTo;
                const pulseAmount = isActive ? activePulseAmount : 0;

                if (note.isRest) {
                    drawRest(ctx, x, staffTop, lineSpacing, isActive, isCompleted, note.noteType || NOTE_TYPES.QUARTER, note.dotted || false, pulseAmount);
                } else {
                    const staffPos = getStaffPosition(note.note, note.octave);
                    const y = getYForStaffPosition(staffPos, clef, staffTop, lineSpacing);
                    const isSharp = note.note.includes('#');
                    const score = noteScores && noteScores[i] ? noteScores[i].score : null;

                    drawLedgerLines(ctx, x, y, staffTop, lineSpacing, clef);
                    drawNote(ctx, x, y, isSharp, isActive, isCompleted, staffMiddleY, score, note.noteType || NOTE_TYPES.QUARTER, note.dotted || false, pulseAmount);
                }
            }
        }

        // Draw pitch trace (with scroll offset applied)
        if (sequenceState.globalPitchTrace.length > 1) {
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Helper to get X position for a time, using the same calculation as the playhead
            // This ensures consistency between playhead and pitch trace positioning
            function getTraceX(time) {
                // Use getPlaybackProgress for consistent time-to-X mapping
                const traceProgress = getPlaybackProgress(time, scrollParams);
                // Apply the same scroll offset adjustment as used for playhead display
                return traceProgress.naturalPlayheadX - scrollOffset;
            }

            // Draw trace segments
            for (let i = 1; i < sequenceState.globalPitchTrace.length; i++) {
                const prev = sequenceState.globalPitchTrace[i - 1];
                const curr = sequenceState.globalPitchTrace[i];

                // Calculate X positions using the same logic as the playhead
                const prevX = getTraceX(prev.time);
                const currX = getTraceX(curr.time);

                // Calculate Y positions based on detected frequency
                const prevY = frequencyToStaffY(prev.frequency, clef, staffTop, lineSpacing);
                const currY = frequencyToStaffY(curr.frequency, clef, staffTop, lineSpacing);

                // Color based on cents deviation (use current point's accuracy)
                const absCents = Math.abs(curr.cents);
                let traceColor;
                if (absCents <= 15) {
                    traceColor = '#6bcb77'; // Green - very accurate
                } else if (absCents <= 30) {
                    traceColor = '#a8e6a3'; // Light green - good
                } else if (absCents <= 50) {
                    traceColor = '#ffd93d'; // Yellow - okay
                } else {
                    traceColor = '#ff6b6b'; // Red - off
                }

                ctx.strokeStyle = traceColor;
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(currX, currY);
                ctx.stroke();
            }
        }

        // Draw playhead line (only during active playback, not final trace)
        if (sequenceState.isPlaying && playbackTime >= 0) {
            ctx.strokeStyle = 'rgba(78, 205, 196, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(playheadX, 10);
            ctx.lineTo(playheadX, height - 10);
            ctx.stroke();
            ctx.setLineDash([]);

            // Show "GO!" for the first half beat of playback
            const goDisplayDuration = sequenceState.countdownBeatInterval * 0.5;
            if (playbackTime < goDisplayDuration) {
                const textY = 25;
                ctx.fillStyle = 'rgba(30, 30, 40, 1)';
                ctx.fillRect(playheadX - 30, textY - 22, 60, 44);
                ctx.fillStyle = '#6bcb77';
                ctx.font = 'bold 36px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('GO!', playheadX, textY);
            }
        }
    }
}

// Stop preview playback
function stopPreview() {
    if (!sequenceState.isPreviewing) return;

    // Stop current audio
    if (audioState.currentPreviewAudio) {
        audioState.currentPreviewAudio.stop();
        audioState.currentPreviewAudio = null;
    }

    sequenceState.isPreviewing = false;
    sequenceState.previewIndex = -1;
    previewBtn.textContent = 'Preview';
    previewBtn.classList.remove('recording');
    goBtn.disabled = false;
    stopPreviewScrollAnimation();
    drawSheetMusic(-1, -1);
}

// Preview sequence
function previewSequence() {
    if (sequenceState.isPlaying) return;

    // If already previewing, stop it
    if (sequenceState.isPreviewing) {
        stopPreview();
        return;
    }

    // Reset user scroll offset when starting preview
    userScrollState.offset = 0;
    // Clear final trace display
    sequenceState.showFinalTrace = false;

    sequenceState.isPreviewing = true;
    sequenceState.previewIndex = 0;
    previewBtn.textContent = 'Stop';
    previewBtn.classList.add('recording');
    goBtn.disabled = true;

    const notes = sequenceState.currentSequence;

    // Use shared scroll parameter calculation
    const scrollParams = calculateScrollParameters(notes, sheetMusicCanvas.width);

    // Start smooth scroll animation with shared params
    startPreviewScrollAnimation(scrollParams);

    let index = 0;

    function playNext() {
        if (index >= notes.length || !sequenceState.isPreviewing) {
            sequenceState.isPreviewing = false;
            sequenceState.previewIndex = -1;
            previewBtn.textContent = 'Preview';
            previewBtn.classList.remove('recording');
            goBtn.disabled = false;
            audioState.currentPreviewAudio = null;
            stopPreviewScrollAnimation();
            drawSheetMusic(-1, -1); // Reset highlighting
            return;
        }

        const note = notes[index];
        const adjustedDuration = getAdjustedDuration(note.duration);
        const durationMs = adjustedDuration * 0.9; // Match audio timing
        const durationSec = durationMs / 1000;

        // Sync visual to this note starting
        onPreviewNoteStart(index, durationMs);

        if (note.isRest) {
            // For rests, just wait the duration without playing a tone
            setTimeout(() => {
                index++;
                playNext();
            }, durationMs);
        } else {
            playTone(note.frequency, durationSec, {
                onComplete: () => {
                    index++;
                    playNext();
                }
            });
        }
    }

    playNext();
}

// Start sequence challenge
async function startSequence() {
    if (sequenceState.isPlaying || sequenceState.isCountingDown) return;

    try {
        // Ensure audio context is warmed up and resumed
        await warmUpAudio();
        // Delay to ensure audio system is fully ready (longer for mobile)
        await new Promise(resolve => setTimeout(resolve, 100));
        const ctx = getAudioContext();

        audioState.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = ctx.createMediaStreamSource(audioState.micStream);

        audioState.analyser = ctx.createAnalyser();
        audioState.analyser.fftSize = 4096;
        source.connect(audioState.analyser);

        // Reset state
        sequenceState.currentNoteIndex = 0;
        sequenceState.noteScores = [];
        sequenceState.pitchSamplesForNote = [];
        sequenceState.pitchHistory = [];
        sequenceState.timeOnPitch = 0;
        pitchDetection.recentPitches.length = 0;
        userScrollState.offset = 0;
        // Clear final trace display from previous run
        sequenceState.showFinalTrace = false;

        previewBtn.disabled = true;
        goBtn.textContent = 'Stop';
        goBtn.classList.add('recording');
        sequenceResults.style.display = 'none';
        // Note: visualization now integrated into sheet music, not using separate canvas
        // sequenceCanvasContainer.classList.add('active');

        // Start countdown
        sequenceState.isCountingDown = true;
        sequenceState.countdownValue = 3;
        updatePreviewNotesState();
        runCountdown();

    } catch (err) {
        console.error('Microphone error:', err);
        sequenceStatus.textContent = 'Error: Could not access microphone.';
    }
}

// Trigger a visual pulse on the Go/Stop button
function triggerBeatPulse() {
    goBtn.classList.add('beat-pulse');
    setTimeout(() => {
        goBtn.classList.remove('beat-pulse');
    }, 100);
}

// Run countdown before starting
function runCountdown() {
    if (!sequenceState.isCountingDown) return;

    const ctx = getAudioContext();

    // Calculate beat interval - since getAdjustedDuration already accounts for time signature,
    // the beat interval is simply 60000 / tempoBPM (one beat at the user's selected tempo)
    const beatIntervalMs = 60000 / tempoBPM;

    const beatIntervalSec = beatIntervalMs / 1000;
    sequenceState.countdownBeatInterval = beatIntervalMs; // Store for use during playback

    // Add lead-in silence to let mobile audio fully initialize
    const leadInSec = 1.5;
    const leadInMs = leadInSec * 1000;

    // Create a single buffer with all 4 clicks baked in
    // This is more reliable than scheduling 4 separate sounds
    const countdownBuffer = createCountdownBuffer(ctx, beatIntervalSec, leadInSec);

    const source = ctx.createBufferSource();
    source.buffer = countdownBuffer;

    // Bandpass filter for woodblock-like tone
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1.5;

    source.connect(filter);
    filter.connect(ctx.destination);

    // Start playback immediately (buffer has lead-in silence)
    source.start(ctx.currentTime);

    // Record actual start time and when countdown begins (after lead-in)
    const actualStartTime = performance.now();
    const countdownStartTime = actualStartTime + leadInMs;

    // Initial visual state
    let lastDisplayedBeat = -1;
    let inLeadIn = true;

    // Show preparing state during lead-in
    sequenceStatus.textContent = 'Preparing...';
    drawCountdownVisualization(-1, 0); // -1 = preparing state, 0 = no progress yet

    // Use requestAnimationFrame for smooth visual updates
    function updateVisuals() {
        if (!sequenceState.isCountingDown) return;

        const now = performance.now();

        // During lead-in period
        if (now < countdownStartTime) {
            requestAnimationFrame(updateVisuals);
            return;
        }

        const elapsed = now - countdownStartTime;
        const currentBeat = Math.floor(elapsed / beatIntervalMs);
        const totalCountdownTime = beatIntervalMs * 3; // 3 beats total (3-2-1, then GO at first note)
        const progress = Math.min(elapsed / totalCountdownTime, 1); // 0 to 1

        // Update beat display and trigger pulse only when beat changes
        if (currentBeat !== lastDisplayedBeat) {
            lastDisplayedBeat = currentBeat;

            // Pulse the button on each beat
            triggerBeatPulse();

            if (currentBeat < 3) {
                const displayNumber = 3 - currentBeat;
                sequenceStatus.textContent = `Get ready... ${displayNumber}`;
            }
        }

        // Draw countdown visualization every frame for smooth playhead animation
        const displayNumber = currentBeat < 3 ? 3 - currentBeat : 0;
        drawCountdownVisualization(displayNumber, progress);

        // Check if countdown is complete (after 3 beats) - GO appears right at first note
        if (elapsed >= beatIntervalMs * 3) {
            sequenceStatus.textContent = 'Sing!';
            sequenceState.isCountingDown = false;
            sequenceState.isPlaying = true;
            sequenceState.sequenceStartTime = performance.now();
            sequenceState.globalPitchTrace = [];
            lastPlaybackBeat = -1; // Reset beat tracker for pulse
            lastSequenceSampleTime = 0;
            appState.animationId = requestAnimationFrame(analyzeSequence);
            return;
        }

        requestAnimationFrame(updateVisuals);
    }

    requestAnimationFrame(updateVisuals);
}

// Draw countdown screen with notes scrolling towards fixed playhead
function drawCountdownVisualization(count, progress = 0) {
    const ctx = sheetMusicCtx;
    const width = sheetMusicCanvas.width;
    const height = sheetMusicCanvas.height;

    const sequence = sequenceState.currentSequence;
    if (sequence.length === 0) return;

    // Use shared scroll parameters
    const scrollParams = calculateScrollParameters(sequence, width);
    const { notesStartX, minNoteSpacing, minDuration, totalNotesWidth, totalDuration } = scrollParams;

    // Calculate scroll rate to match playback speed
    // With duration-based spacing, scroll rate is constant: totalNotesWidth / totalDuration
    // In 3 beats, we scroll: countdownDuration * (totalNotesWidth / totalDuration)
    const countdownDuration = 3 * sequenceState.countdownBeatInterval;
    const scrollRate = totalNotesWidth / totalDuration; // pixels per ms
    const maxOffset = countdownDuration * scrollRate;
    const noteOffsetX = maxOffset * (1 - progress);

    // Draw sheet music with first note highlighted and offset applied
    drawSheetMusic(0, 0, null, -1, false, noteOffsetX);

    // Playhead stays at fixed position (where first note will be when countdown ends)
    const playheadX = notesStartX;

    // Draw playhead line
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(playheadX, 10);
    ctx.lineTo(playheadX, height - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw countdown number or text above the staff at playhead position
    const textY = 25; // Above the staff (staff starts at y=55)

    if (count === -1) {
        // Preparing state (during lead-in) - opaque background
        ctx.fillStyle = 'rgba(30, 30, 40, 1)';
        ctx.fillRect(playheadX - 55, textY - 12, 110, 24);

        ctx.fillStyle = '#888';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Get ready...', playheadX, textY);
        return;
    }

    // Draw countdown number or "GO!" above the staff with opaque background
    const displayText = count === 0 ? 'GO!' : count.toString();
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(playheadX - 30, textY - 22, 60, 44);

    ctx.fillStyle = count === 0 ? '#6bcb77' : '#4ecdc4';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, playheadX, textY);
}

// Stop sequence
function stopSequence() {
    sequenceState.isPlaying = false;
    sequenceState.isCountingDown = false;

    if (appState.animationId) {
        cancelAnimationFrame(appState.animationId);
        appState.animationId = null;
    }

    if (audioState.micStream) {
        audioState.micStream.getTracks().forEach(track => track.stop());
        audioState.micStream = null;
    }

    previewBtn.disabled = false;
    goBtn.textContent = 'Go';
    goBtn.classList.remove('recording');
    sequenceStatus.textContent = '';
}

// Update sheet music to show current/completed state
function updatePreviewNotesState() {
    drawSheetMusic(sequenceState.currentNoteIndex, sequenceState.currentNoteIndex);
}

// Analyze sequence (main loop during challenge)
let lastSequenceSampleTime = 0;
const sequenceSampleInterval = 1000 / 30;

// Track last beat for pulse during playback
let lastPlaybackBeat = -1;

function analyzeSequence(timestamp) {
    if (!sequenceState.isPlaying) return;

    // Use global timing for everything to prevent drift
    const playbackTime = timestamp - sequenceState.sequenceStartTime;

    // Calculate scroll params and current note from global time (same as playhead)
    const scrollParams = calculateScrollParameters(sequenceState.currentSequence, sheetMusicCanvas.width);
    const progress = getPlaybackProgress(playbackTime, scrollParams);

    // Check if sequence is complete
    if (playbackTime >= scrollParams.totalDuration) {
        // Finalize any remaining note
        if (sequenceState.currentNoteIndex < sequenceState.currentSequence.length) {
            finalizeCurrentNote();
        }
        finishSequence();
        return;
    }

    // Detect note advancement based on global time (not per-note timing)
    const targetNoteIndex = progress.currentNoteIndex;
    while (sequenceState.currentNoteIndex < targetNoteIndex) {
        finalizeCurrentNote();
        sequenceState.currentNoteIndex++;
        sequenceState.pitchSamplesForNote = [];
        sequenceState.pitchHistory = [];
        sequenceState.timeOnPitch = 0;
        pitchDetection.recentPitches.length = 0;
    }

    // Pulse on beats - calculate directly from elapsed time for accurate beat timing
    const currentBeat = Math.floor(playbackTime / sequenceState.countdownBeatInterval);
    if (currentBeat !== lastPlaybackBeat) {
        lastPlaybackBeat = currentBeat;
        triggerBeatPulse();
    }

    // Sample pitch at fixed rate (skip during rests)
    if (timestamp - lastSequenceSampleTime >= sequenceSampleInterval) {
        lastSequenceSampleTime = timestamp;

        const currentNote = sequenceState.currentSequence[sequenceState.currentNoteIndex];

        // Skip pitch detection during rests
        if (!currentNote.isRest) {
            const buffer = new Float32Array(audioState.analyser.fftSize);
            audioState.analyser.getFloatTimeDomainData(buffer);

            const rawPitch = detectPitch(buffer, audioState.context.sampleRate);

            if (rawPitch !== -1 && rawPitch > 80 && rawPitch < 1000) {
                const pitch = getSmoothedPitch(rawPitch);
                const cents = getCentsDifference(pitch, currentNote.frequency);
                sequenceState.pitchSamplesForNote.push(cents);
                sequenceState.pitchHistory.push(cents);

                // Add to global pitch trace for integrated visualization
                sequenceState.globalPitchTrace.push({
                    time: playbackTime,
                    frequency: pitch,
                    noteIndex: sequenceState.currentNoteIndex,
                    cents: cents
                });

                if (Math.abs(cents) <= 50) {
                    sequenceState.timeOnPitch += sequenceSampleInterval;
                }
            } else {
                sequenceState.pitchHistory.push(null);
            }
        }
    }

    // Draw integrated visualization on sheet music
    drawSheetMusic(sequenceState.currentNoteIndex, sequenceState.currentNoteIndex, sequenceState.noteScores, playbackTime);

    appState.animationId = requestAnimationFrame(analyzeSequence);
}

// Finalize scoring for current note (called when advancing to next note)
function finalizeCurrentNote() {
    const currentNote = sequenceState.currentSequence[sequenceState.currentNoteIndex];
    const adjustedDuration = getAdjustedDuration(currentNote.duration);

    // Rests don't get scored - just mark as complete
    if (currentNote.isRest) {
        sequenceState.noteScores.push({
            note: 'rest',
            isRest: true,
            score: 100, // Rests are always "perfect"
            avgCents: 0,
            timeOnPitch: adjustedDuration,
            totalTime: currentNote.duration
        });
        return;
    }

    const score = calculateNoteScore(
        sequenceState.pitchSamplesForNote,
        sequenceState.timeOnPitch,
        adjustedDuration
    );

    sequenceState.noteScores.push({
        note: currentNote.name,
        score: score,
        avgCents: sequenceState.pitchSamplesForNote.length > 0
            ? sequenceState.pitchSamplesForNote.reduce((a, b) => a + Math.abs(b), 0) / sequenceState.pitchSamplesForNote.length
            : 100,
        timeOnPitch: sequenceState.timeOnPitch,
        totalTime: currentNote.duration
    });
}

// Finish sequence and show results
function finishSequence() {
    stopSequence();

    // Filter out rests for grading - only score actual pitched notes
    const pitchedNoteScores = sequenceState.noteScores
        .map((ns, i) => ({ ...ns, originalIndex: i }))
        .filter(ns => !ns.isRest);

    const totalScore = pitchedNoteScores.reduce((a, b) => a + b.score, 0);
    const maxScore = pitchedNoteScores.length * 100;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;

    let grade;
    if (percentage >= 85) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 55) grade = 'C';
    else if (percentage >= 40) grade = 'D';
    else grade = 'F';

    resultsGrade.textContent = grade;
    resultsGrade.className = `results-grade grade-${grade.toLowerCase()}`;
    resultsPercent.textContent = `${percentage}%`;

    // Only show pitched notes in breakdown (not rests)
    resultsBreakdown.innerHTML = pitchedNoteScores.map((ns) => {
        const scoreClass = ns.score >= 70 ? 'score-high' : ns.score >= 40 ? 'score-mid' : 'score-low';
        return `
            <div class="breakdown-item">
                <canvas class="breakdown-mini-staff" data-note-index="${ns.originalIndex}" width="105" height="45"></canvas>
                <div class="breakdown-score">
                    <div class="breakdown-bar">
                        <div class="breakdown-fill ${scoreClass}" style="width: ${ns.score}%"></div>
                    </div>
                    <span class="breakdown-value">${ns.score}</span>
                </div>
            </div>
        `;
    }).join('');

    // Draw mini-staffs for each note
    const miniStaffCanvases = resultsBreakdown.querySelectorAll('.breakdown-mini-staff');
    miniStaffCanvases.forEach(canvas => {
        const noteIndex = parseInt(canvas.dataset.noteIndex);
        const score = sequenceState.noteScores[noteIndex].score;
        drawBreakdownMiniStaff(canvas, sequenceState.currentSequence, noteIndex, score);
    });

    sequenceResults.style.display = '';
    sequenceCanvasContainer.classList.remove('active');

    // Persist final trace display until next action
    sequenceState.showFinalTrace = true;

    // Draw sheet music with performance-based coloring and final pitch trace
    drawSheetMusic(-1, -1, sequenceState.noteScores, -1, true);
}

// Draw sequence visualization
function drawSequenceVisualization(elapsed, totalDuration) {
    const width = sequenceCanvas.width;
    const height = sequenceCanvas.height;

    // Clear
    sequenceCtx.fillStyle = 'rgba(30, 30, 40, 1)';
    sequenceCtx.fillRect(0, 0, width, height);

    // Layout regions
    const headerHeight = 50;
    const timelineTop = headerHeight + 10;
    const timelineHeight = 100;
    const timeBarY = height - 25;

    // --- Header: Target note and upcoming notes ---
    const currentNote = sequenceState.currentSequence[sequenceState.currentNoteIndex];

    // Current target note (left side)
    sequenceCtx.fillStyle = 'rgba(78, 205, 196, 0.1)';
    sequenceCtx.beginPath();
    sequenceCtx.roundRect(10, 5, 80, 40, 8);
    sequenceCtx.fill();

    sequenceCtx.fillStyle = '#888';
    sequenceCtx.font = '10px sans-serif';
    sequenceCtx.textAlign = 'center';
    sequenceCtx.textBaseline = 'top';
    sequenceCtx.fillText('TARGET', 50, 8);

    sequenceCtx.fillStyle = '#4ecdc4';
    sequenceCtx.font = 'bold 20px sans-serif';
    sequenceCtx.textBaseline = 'middle';
    sequenceCtx.fillText(currentNote.name, 50, 32);

    // Upcoming notes (right side)
    const upcomingNotes = sequenceState.currentSequence.slice(sequenceState.currentNoteIndex + 1);
    const noteBlockWidth = 45;
    const noteBlockGap = 8;

    sequenceCtx.fillStyle = '#666';
    sequenceCtx.font = '10px sans-serif';
    sequenceCtx.textAlign = 'left';
    sequenceCtx.textBaseline = 'top';
    if (upcomingNotes.length > 0) {
        sequenceCtx.fillText('NEXT', 110, 8);
    }

    upcomingNotes.slice(0, 6).forEach((note, i) => {
        const x = 110 + i * (noteBlockWidth + noteBlockGap);
        if (x < width - noteBlockWidth) {
            sequenceCtx.fillStyle = 'rgba(78, 205, 196, 0.15)';
            sequenceCtx.strokeStyle = 'rgba(78, 205, 196, 0.4)';
            sequenceCtx.lineWidth = 1;
            sequenceCtx.beginPath();
            sequenceCtx.roundRect(x, 18, noteBlockWidth, 26, 6);
            sequenceCtx.fill();
            sequenceCtx.stroke();

            sequenceCtx.fillStyle = '#4ecdc4';
            sequenceCtx.font = 'bold 14px sans-serif';
            sequenceCtx.textAlign = 'center';
            sequenceCtx.textBaseline = 'middle';
            sequenceCtx.fillText(note.name, x + noteBlockWidth / 2, 31);
        }
    });

    // --- Timeline visualization (like free practice mode) ---
    const timelineX = 10;
    const timelineWidth = width - 20;
    const centerY = timelineTop + timelineHeight / 2;

    // On-pitch zone
    sequenceCtx.fillStyle = 'rgba(107, 203, 119, 0.15)';
    const onPitchHeight = (10 / 100) * (timelineHeight / 2 - 5) * 2;
    sequenceCtx.fillRect(timelineX, centerY - onPitchHeight / 2, timelineWidth, onPitchHeight);

    // Target line
    sequenceCtx.strokeStyle = '#6bcb77';
    sequenceCtx.lineWidth = 2;
    sequenceCtx.setLineDash([5, 5]);
    sequenceCtx.beginPath();
    sequenceCtx.moveTo(timelineX, centerY);
    sequenceCtx.lineTo(timelineX + timelineWidth, centerY);
    sequenceCtx.stroke();
    sequenceCtx.setLineDash([]);

    // Y-axis labels
    sequenceCtx.fillStyle = '#ff6b6b';
    sequenceCtx.font = '9px sans-serif';
    sequenceCtx.textAlign = 'left';
    sequenceCtx.textBaseline = 'top';
    sequenceCtx.fillText('Sharp', timelineX + 2, timelineTop + 2);

    sequenceCtx.fillStyle = '#ffd93d';
    sequenceCtx.textBaseline = 'bottom';
    sequenceCtx.fillText('Flat', timelineX + 2, timelineTop + timelineHeight - 2);

    // Draw pitch history - scale to note duration
    sequenceCtx.lineWidth = 3;
    sequenceCtx.lineCap = 'round';
    sequenceCtx.lineJoin = 'round';

    let lastValidPoint = null;
    const history = sequenceState.pitchHistory;

    // Calculate expected samples for this note's duration
    const expectedSamples = Math.ceil((totalDuration / 1000) * PITCH_CONFIG.samplesPerSecond);

    for (let i = 0; i < history.length; i++) {
        const cents = history[i];
        if (cents === null) {
            lastValidPoint = null;
            continue;
        }

        // Scale x position to fill the timeline based on note duration
        const x = timelineX + (i / expectedSamples) * timelineWidth;
        const clampedCents = Math.max(-100, Math.min(100, cents));
        const y = centerY - (clampedCents / 100) * (timelineHeight / 2 - 5);

        if (Math.abs(cents) <= 10) {
            sequenceCtx.strokeStyle = '#6bcb77';
        } else if (Math.abs(cents) <= 25) {
            sequenceCtx.strokeStyle = '#ffd93d';
        } else {
            sequenceCtx.strokeStyle = '#ff6b6b';
        }

        if (lastValidPoint) {
            sequenceCtx.beginPath();
            sequenceCtx.moveTo(lastValidPoint.x, lastValidPoint.y);
            sequenceCtx.lineTo(x, y);
            sequenceCtx.stroke();
        }

        lastValidPoint = { x, y, cents };
    }

    // Current position indicator
    if (lastValidPoint) {
        sequenceCtx.beginPath();
        sequenceCtx.arc(lastValidPoint.x, lastValidPoint.y, 6, 0, Math.PI * 2);

        if (Math.abs(lastValidPoint.cents) <= 10) {
            sequenceCtx.fillStyle = '#6bcb77';
        } else if (Math.abs(lastValidPoint.cents) <= 25) {
            sequenceCtx.fillStyle = '#ffd93d';
        } else {
            sequenceCtx.fillStyle = '#ff6b6b';
        }
        sequenceCtx.fill();
        sequenceCtx.strokeStyle = 'white';
        sequenceCtx.lineWidth = 2;
        sequenceCtx.stroke();
    }

    // --- Time remaining bar ---
    const timeBarHeight = 10;
    const timeBarX = 10;
    const timeBarWidth = width - 20;
    const progress = elapsed / totalDuration;

    // Label
    sequenceCtx.fillStyle = '#666';
    sequenceCtx.font = '9px sans-serif';
    sequenceCtx.textAlign = 'center';
    sequenceCtx.textBaseline = 'bottom';
    sequenceCtx.fillText('TIME REMAINING', width / 2, timeBarY - 2);

    // Background
    sequenceCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    sequenceCtx.beginPath();
    sequenceCtx.roundRect(timeBarX, timeBarY, timeBarWidth, timeBarHeight, 4);
    sequenceCtx.fill();

    // Progress (shrinks as time passes)
    const progressColor = progress < 0.5 ? '#4ecdc4' : progress < 0.8 ? '#ffd93d' : '#ff6b6b';
    const remainingWidth = timeBarWidth * (1 - progress);
    if (remainingWidth > 0) {
        sequenceCtx.fillStyle = progressColor;
        sequenceCtx.beginPath();
        sequenceCtx.roundRect(timeBarX, timeBarY, remainingWidth, timeBarHeight, 4);
        sequenceCtx.fill();
    }
}

// Event listeners for sequence mode
modeFreeBtn.addEventListener('click', () => setMode('free'));
modeSequenceBtn.addEventListener('click', () => setMode('sequence'));

sequenceSelect.addEventListener('change', () => {
    const isImportSlot = sequenceSelect.value === 'custom';
    const isSavedCustom = isCustomSequenceSelected();

    musicxmlImport.style.display = isImportSlot ? '' : 'none';
    // Hide part selector when not in import mode
    if (!isImportSlot) {
        musicxmlPartSelector.style.display = 'none';
    }

    // Update delete button visibility
    updateDeleteButtonVisibility();

    if (isImportSlot) {
        // Import slot - clear sheet music if no custom sequence loaded yet
        if (sequences['custom'].notes.length === 0) {
            sequenceState.currentSequence = [];
            drawSheetMusic();
        } else {
            loadSequence('custom');
        }
    } else {
        // Built-in or saved custom sequence
        loadSequence(sequenceSelect.value);
        savePreference('selectedSequence', sequenceSelect.value);
    }
});

startNoteSelect.addEventListener('change', () => {
    loadSequence(sequenceSelect.value);
    savePreference('songNote', startNoteSelect.value);
});

startOctaveSelect.addEventListener('change', () => {
    loadSequence(sequenceSelect.value);
    savePreference('songOctave', parseInt(startOctaveSelect.value));
});

// Tempo control
tempoSlider.addEventListener('input', () => {
    tempoBPM = parseInt(tempoSlider.value);
    tempoDisplay.textContent = tempoBPM;
    // Restart beat indicator with new tempo
    if (beatIndicatorInterval) {
        startBeatIndicator();
    }
    // Redraw sheet music (spacing is duration-based)
    drawSheetMusic();
});

// Save tempo when slider is released
tempoSlider.addEventListener('change', () => {
    savePreference('tempo', tempoBPM);
});

// Start beat indicator when user interacts with slider
tempoSlider.addEventListener('mousedown', startBeatIndicator);
tempoSlider.addEventListener('touchstart', startBeatIndicator);

// Stop beat indicator when user releases slider
tempoSlider.addEventListener('mouseup', stopBeatIndicator);
tempoSlider.addEventListener('mouseleave', stopBeatIndicator);
tempoSlider.addEventListener('touchend', stopBeatIndicator);

previewBtn.addEventListener('click', previewSequence);

goBtn.addEventListener('click', () => {
    if (sequenceState.isPlaying || sequenceState.isCountingDown) {
        stopSequence();
    } else {
        startSequence();
    }
});

retryBtn.addEventListener('click', () => {
    sequenceResults.style.display = 'none';
    drawSheetMusic();
    startSequence();
});

// Create and add delete button for custom sequences
deleteSequenceBtn = document.createElement('button');
deleteSequenceBtn.id = 'delete-sequence-btn';
deleteSequenceBtn.className = 'delete-sequence-btn';
deleteSequenceBtn.textContent = '🗑️ Delete';
deleteSequenceBtn.title = 'Delete this custom sequence';
deleteSequenceBtn.style.display = 'none';
deleteSequenceBtn.addEventListener('click', deleteSelectedCustomSequence);

// Insert after the sequence selector
const sequenceSelectorDiv = sequenceSelect.parentElement;
sequenceSelectorDiv.appendChild(deleteSequenceBtn);

// Initialize delete button visibility
updateDeleteButtonVisibility();

// MusicXML file import handler
// Store parsed MusicXML document for part selection
let currentMusicXMLDoc = null;
let currentMusicXMLFilename = '';

musicxmlFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Store file name before resetting input
    const fileName = file.name;

    musicxmlFilename.textContent = fileName;
    currentMusicXMLFilename = fileName;
    sequenceStatus.textContent = 'Loading...';
    musicxmlPartSelector.style.display = 'none';

    try {
        const text = await file.text();
        const { doc, parts } = getMusicXMLParts(text);
        currentMusicXMLDoc = doc;

        if (parts.length === 1) {
            // Single part - load directly
            const result = parseMusicXMLPart(doc, parts[0].id);
            loadCustomSequenceFromImport(result.notes, fileName, result.timeSignature, result.tempo);
        } else {
            // Multiple parts - show selector and auto-load first part
            musicxmlPartSelect.innerHTML = parts.map(p =>
                `<option value="${p.id}">${p.name}</option>`
            ).join('');
            musicxmlPartSelector.style.display = '';

            // Auto-load the first part
            const result = parseMusicXMLPart(doc, parts[0].id);
            loadCustomSequenceFromImport(result.notes, fileName, result.timeSignature, result.tempo);
        }
    } catch (err) {
        console.error('MusicXML parse error:', err);
        sequenceStatus.textContent = `Error: ${err.message}`;
        musicxmlFilename.textContent = '';
        currentMusicXMLDoc = null;
    }

    // Reset file input so the same file can be selected again
    e.target.value = '';
});

// Handle part selection
musicxmlPartSelect.addEventListener('change', () => {
    if (!currentMusicXMLDoc) return;

    const partId = musicxmlPartSelect.value;
    try {
        const result = parseMusicXMLPart(currentMusicXMLDoc, partId);
        loadCustomSequenceFromImport(result.notes, currentMusicXMLFilename, result.timeSignature, result.tempo);
    } catch (err) {
        console.error('MusicXML parse error:', err);
        sequenceStatus.textContent = `Error: ${err.message}`;
    }
});

// Helper to load and persist custom sequence
function loadCustomSequenceFromImport(notes, filename, timeSignature = null, tempo = 120) {
    const ts = timeSignature || { beats: 4, beatType: 4 };
    const partName = musicxmlPartSelector.style.display !== 'none'
        ? ` (${musicxmlPartSelect.options[musicxmlPartSelect.selectedIndex].text})`
        : '';
    const displayName = partName ? `${filename}${partName}` : filename;

    // Check if a sequence with this name already exists
    const existing = findCustomSequenceByName(displayName);
    let sequenceId;

    if (existing) {
        // Ask for confirmation to overwrite
        if (!confirm(`"${displayName}" already exists. Overwrite it?`)) {
            // User cancelled - restore previous state
            sequenceStatus.textContent = '';
            // Re-select and reload the existing sequence to refresh the display
            sequenceSelect.value = existing.id;
            loadSequence(existing.id);
            updateDeleteButtonVisibility();
            return;
        }
        // Update existing sequence
        updateCustomSequence(existing.id, {
            notes,
            timeSignature: ts,
            tempo
        });
        sequenceId = existing.id;

        // Update sequences registry
        sequences[sequenceId].notes = notes;
        sequences[sequenceId].timeSignature = ts;
        sequences[sequenceId].tempo = tempo;
    } else {
        // Save new sequence
        sequenceId = saveCustomSequence({
            name: displayName,
            notes,
            timeSignature: ts,
            tempo
        });

        if (!sequenceId) {
            sequenceStatus.textContent = 'Error: Failed to save sequence';
            return;
        }

        // Add to sequences registry
        sequences[sequenceId] = {
            name: displayName,
            notes,
            timeSignature: ts,
            tempo
        };

        // Add to dropdown
        addCustomSequenceToDropdown(sequenceId, displayName);
    }

    // Select the new/updated sequence
    sequenceSelect.value = sequenceId;

    // Store time signature and tempo
    sequenceState.timeSignature = ts;
    sequenceState.sourceTempo = tempo;

    // Set starting note selector to match the first note
    if (notes.length > 0) {
        const firstNote = notes[0];
        startNoteSelect.value = firstNote.note;
        startOctaveSelect.value = firstNote.octave.toString();
    }

    // Load and display
    loadSequence(sequenceId);
    savePreference('selectedSequence', sequenceId);

    // Update delete button visibility
    updateDeleteButtonVisibility();

    // Show status
    sequenceStatus.textContent = `${existing ? 'Updated' : 'Saved'} ${notes.length} notes from ${displayName}`;
    setTimeout(() => {
        if (sequenceStatus.textContent.startsWith('Saved') || sequenceStatus.textContent.startsWith('Updated')) {
            sequenceStatus.textContent = '';
        }
    }, 3000);
}

// Initialize with stored preferences
setTimeout(() => {
    // Apply stored mode (default is 'song' if not stored)
    if (storedPrefs.mode === 'free') {
        setMode('free');
    } else {
        // Song mode is default, just load the sequence
        loadSequence(sequenceSelect.value || 'simple-scale');
    }
}, 100);

// ============================================
// Note Selector - Visual Grand Staff Selection
// ============================================

// Note selector DOM elements
const noteSelectorPopup = document.getElementById('note-selector-popup');
const noteSelectorClose = document.getElementById('note-selector-close');
const noteSelectorLabel = document.getElementById('note-selector-label');
const noteSelectorOk = document.getElementById('note-selector-ok');
const accidentalToggle = document.getElementById('accidental-toggle');
const accidentalBtns = accidentalToggle.querySelectorAll('.accidental-btn');
const grandStaffCanvas = document.getElementById('grand-staff-canvas');
const grandStaffCtx = grandStaffCanvas.getContext('2d');
const freePracticeMiniCanvas = document.getElementById('free-practice-mini-canvas');
const freePracticeMiniCtx = freePracticeMiniCanvas.getContext('2d');
const songPracticeMiniCanvas = document.getElementById('song-practice-mini-canvas');
const songPracticeMiniCtx = songPracticeMiniCanvas.getContext('2d');
const freePracticeMiniStaff = document.getElementById('free-practice-mini-staff');
const songPracticeMiniStaff = document.getElementById('song-practice-mini-staff');
const freeOctaveDown = document.getElementById('free-octave-down');
const freeOctaveUp = document.getElementById('free-octave-up');
const songOctaveDown = document.getElementById('song-octave-down');
const songOctaveUp = document.getElementById('song-octave-up');

// Draw a mini-staff for results breakdown with context notes (prev/next shown faded)
function drawBreakdownMiniStaff(canvas, sequence, noteIndex, noteScore) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(0, 0, width, height);

    const currentNote = sequence[noteIndex];
    const prevNote = noteIndex > 0 ? sequence[noteIndex - 1] : null;
    const nextNote = noteIndex < sequence.length - 1 ? sequence[noteIndex + 1] : null;

    // Layout
    const staffTop = 12;
    const lineSpacing = 6;
    const clefWidth = 18;
    const leftMargin = 3;
    const noteSpacing = 20;

    // Determine clef based on current note (use treble for rests, or look at adjacent notes)
    let clef = 'treble';
    if (!currentNote.isRest) {
        const staffPos = getStaffPosition(currentNote.note, currentNote.octave);
        clef = staffPos >= 28 ? 'treble' : 'bass';
    } else if (prevNote && !prevNote.isRest) {
        const staffPos = getStaffPosition(prevNote.note, prevNote.octave);
        clef = staffPos >= 28 ? 'treble' : 'bass';
    } else if (nextNote && !nextNote.isRest) {
        const staffPos = getStaffPosition(nextNote.note, nextNote.octave);
        clef = staffPos >= 28 ? 'treble' : 'bass';
    }
    const staffMiddleY = staffTop + 2 * lineSpacing;

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

    // Calculate note positions - spread evenly across available space
    // Always use 3 positions for consistent layout (prev, center, next)
    const notesAreaStart = leftMargin + clefWidth + 10;
    const notesAreaEnd = width - 8;
    const notesAreaWidth = notesAreaEnd - notesAreaStart;
    const prevX = notesAreaStart;
    const centerX = notesAreaStart + notesAreaWidth * 0.35;
    const nextX = notesAreaStart + notesAreaWidth * 0.75;

    // Helper to draw a mini note with stem and dot
    function drawMiniNote(note, x, alpha, scoreValue) {
        const pos = getStaffPosition(note.note, note.octave);
        const y = getYForStaffPosition(pos, clef, staffTop, lineSpacing);
        const isSharp = note.note.includes('#');
        const noteType = note.noteType || NOTE_TYPES.QUARTER;
        const dotted = note.dotted || false;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw ledger lines
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        const bottomLine = staffTop + 4 * lineSpacing;
        const topLine = staffTop;
        if (y > bottomLine + lineSpacing / 2) {
            for (let ly = bottomLine + lineSpacing; ly <= y + lineSpacing / 2; ly += lineSpacing) {
                ctx.beginPath();
                ctx.moveTo(x - 5, ly);
                ctx.lineTo(x + 5, ly);
                ctx.stroke();
            }
        }
        if (y < topLine - lineSpacing / 2) {
            for (let ly = topLine - lineSpacing; ly >= y - lineSpacing / 2; ly -= lineSpacing) {
                ctx.beginPath();
                ctx.moveTo(x - 5, ly);
                ctx.lineTo(x + 5, ly);
                ctx.stroke();
            }
        }

        // Determine color
        let noteColor;
        if (scoreValue !== null) {
            if (scoreValue >= 70) noteColor = '#6bcb77';
            else if (scoreValue >= 40) noteColor = '#ffd93d';
            else noteColor = '#ff6b6b';
        } else {
            noteColor = '#666';
        }
        ctx.fillStyle = noteColor;
        ctx.strokeStyle = noteColor;

        // Mini note dimensions (scaled down from main)
        const noteWidth = 4;
        const noteHeight = 3;
        const stemHeight = 16;
        const isHollow = noteType === NOTE_TYPES.WHOLE || noteType === NOTE_TYPES.HALF;
        const hasStem = noteType !== NOTE_TYPES.WHOLE;
        const hasFlag = noteType === NOTE_TYPES.EIGHTH || noteType === NOTE_TYPES.SIXTEENTH;
        const hasDoubleFlag = noteType === NOTE_TYPES.SIXTEENTH;
        const stemDown = y <= staffMiddleY;

        // Draw note head
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (noteType === NOTE_TYPES.WHOLE) {
            ctx.ellipse(x, y, noteWidth + 1, noteHeight, 0, 0, 2 * Math.PI);
        } else {
            ctx.ellipse(x, y, noteWidth, noteHeight, -0.3, 0, 2 * Math.PI);
        }
        if (isHollow) {
            ctx.stroke();
        } else {
            ctx.fill();
        }

        // Draw stem
        if (hasStem) {
            ctx.lineWidth = 1;
            if (stemDown) {
                ctx.beginPath();
                ctx.moveTo(x - noteWidth + 1, y);
                ctx.lineTo(x - noteWidth + 1, y + stemHeight);
                ctx.stroke();
                // Flag(s) for eighth/sixteenth notes
                if (hasFlag) {
                    ctx.beginPath();
                    ctx.moveTo(x - noteWidth + 1, y + stemHeight);
                    ctx.quadraticCurveTo(x + 2, y + stemHeight - 4, x + 4, y + stemHeight - 10);
                    ctx.stroke();
                    if (hasDoubleFlag) {
                        ctx.beginPath();
                        ctx.moveTo(x - noteWidth + 1, y + stemHeight - 4);
                        ctx.quadraticCurveTo(x + 2, y + stemHeight - 8, x + 4, y + stemHeight - 14);
                        ctx.stroke();
                    }
                }
            } else {
                ctx.beginPath();
                ctx.moveTo(x + noteWidth - 1, y);
                ctx.lineTo(x + noteWidth - 1, y - stemHeight);
                ctx.stroke();
                if (hasFlag) {
                    ctx.beginPath();
                    ctx.moveTo(x + noteWidth - 1, y - stemHeight);
                    ctx.quadraticCurveTo(x + 6, y - stemHeight + 4, x + 8, y - stemHeight + 10);
                    ctx.stroke();
                    if (hasDoubleFlag) {
                        ctx.beginPath();
                        ctx.moveTo(x + noteWidth - 1, y - stemHeight + 4);
                        ctx.quadraticCurveTo(x + 6, y - stemHeight + 8, x + 8, y - stemHeight + 14);
                        ctx.stroke();
                    }
                }
            }
        }

        // Draw dot
        if (dotted) {
            ctx.beginPath();
            ctx.arc(x + noteWidth + 3, y, 1.5, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Draw accidental
        if (isSharp) {
            ctx.font = 'bold 8px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('\u266F', x - 7, y);
        }

        ctx.restore();
    }

    // Helper to draw a mini rest
    function drawMiniRest(note, x, alpha, scoreValue) {
        const noteType = note.noteType || NOTE_TYPES.QUARTER;
        const dotted = note.dotted || false;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Determine color (rests are always "perfect" so use green if scored)
        let restColor;
        if (scoreValue !== null) {
            restColor = '#6bcb77'; // Always green for rests
        } else {
            restColor = '#666';
        }
        ctx.fillStyle = restColor;
        ctx.strokeStyle = restColor;

        // Draw rest symbol (scaled down versions)
        if (noteType === NOTE_TYPES.WHOLE) {
            ctx.fillRect(x - 4, staffTop + lineSpacing, 8, 3);
        } else if (noteType === NOTE_TYPES.HALF) {
            ctx.fillRect(x - 4, staffMiddleY - 3, 8, 3);
        } else if (noteType === NOTE_TYPES.QUARTER) {
            ctx.beginPath();
            ctx.moveTo(x + 2, staffTop + lineSpacing * 0.8);
            ctx.lineTo(x - 2, staffTop + lineSpacing * 1.4);
            ctx.lineTo(x + 2, staffTop + lineSpacing * 2);
            ctx.lineTo(x - 1, staffTop + lineSpacing * 2.6);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else if (noteType === NOTE_TYPES.EIGHTH) {
            ctx.beginPath();
            ctx.arc(x + 1, staffTop + lineSpacing + 1, 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x + 1, staffTop + lineSpacing + 2);
            ctx.lineTo(x - 2, staffTop + lineSpacing * 2);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else if (noteType === NOTE_TYPES.SIXTEENTH) {
            ctx.beginPath();
            ctx.arc(x + 1, staffTop + lineSpacing * 0.7, 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, staffTop + lineSpacing * 1.3, 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, staffTop + lineSpacing * 1.5);
            ctx.lineTo(x - 2, staffTop + lineSpacing * 2.2);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Draw dot
        if (dotted) {
            ctx.beginPath();
            ctx.arc(x + 6, staffMiddleY, 1.5, 0, 2 * Math.PI);
            ctx.fill();
        }

        ctx.restore();
    }

    // Helper to draw note or rest
    function drawMiniNoteOrRest(note, x, alpha, scoreValue) {
        if (note.isRest) {
            drawMiniRest(note, x, alpha, scoreValue);
        } else {
            drawMiniNote(note, x, alpha, scoreValue);
        }
    }

    // Draw context notes first (faded, no score coloring)
    if (prevNote) {
        drawMiniNoteOrRest(prevNote, prevX, 0.5, null);
    }
    if (nextNote) {
        drawMiniNoteOrRest(nextNote, nextX, 0.5, null);
    }

    // Draw main note (full opacity, colored by score)
    drawMiniNoteOrRest(currentNote, centerX, 1.0, noteScore);

    // Draw pitch trace for this note
    const noteSamples = sequenceState.globalPitchTrace.filter(s => s.noteIndex === noteIndex);
    if (noteSamples.length > 1) {
        // Get time bounds for this note
        const noteStartTime = noteSamples[0].time;
        const noteEndTime = noteSamples[noteSamples.length - 1].time;
        const noteDuration = noteEndTime - noteStartTime;

        // X range for the trace - starts after main note, always ends at next note position
        const traceStartX = centerX + 6;
        const traceEndX = nextX - 6;
        const traceWidth = traceEndX - traceStartX;

        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < noteSamples.length; i++) {
            const prev = noteSamples[i - 1];
            const curr = noteSamples[i];

            // Map time to X position
            const prevProgress = noteDuration > 0 ? (prev.time - noteStartTime) / noteDuration : 0;
            const currProgress = noteDuration > 0 ? (curr.time - noteStartTime) / noteDuration : 0;
            const prevTraceX = traceStartX + prevProgress * traceWidth;
            const currTraceX = traceStartX + currProgress * traceWidth;

            // Map frequency to Y position
            const prevY = frequencyToStaffY(prev.frequency, clef, staffTop, lineSpacing);
            const currY = frequencyToStaffY(curr.frequency, clef, staffTop, lineSpacing);

            // Color based on cents deviation
            const absCents = Math.abs(curr.cents);
            let traceColor;
            if (absCents <= 15) {
                traceColor = '#6bcb77';
            } else if (absCents <= 30) {
                traceColor = '#a8e6a3';
            } else if (absCents <= 50) {
                traceColor = '#ffd93d';
            } else {
                traceColor = '#ff6b6b';
            }

            ctx.strokeStyle = traceColor;
            ctx.beginPath();
            ctx.moveTo(prevTraceX, prevY);
            ctx.lineTo(currTraceX, currY);
            ctx.stroke();
        }
    }
}

// Draw grand staff selector with all notes from E2 to G5
function drawGrandStaffSelector() {
    const canvas = grandStaffCanvas;
    const ctx = grandStaffCtx;
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = 'rgba(30, 30, 40, 1)';
    ctx.fillRect(0, 0, width, height);

    // Layout - stacked: treble notes on treble staff, bass notes on bass staff
    const trebleStaffTop = 15;
    const bassStaffTop = 115;
    const lineSpacing = 10;
    const leftMargin = 5;
    const clefWidth = 45;

    // Split notes into treble (C4+) and bass (below C4)
    const noteRange = getNoteRange();
    const trebleNotes = noteRange.filter(n => getStaffPosition(n.note, n.octave) >= 28);
    const bassNotes = noteRange.filter(n => getStaffPosition(n.note, n.octave) < 28);

    // Calculate spacing for each staff
    const trebleNoteSpacing = (width - clefWidth - 15) / trebleNotes.length;
    const bassNoteSpacing = (width - clefWidth - 15) / bassNotes.length;

    // Draw treble staff
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const y = trebleStaffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - 5, y);
        ctx.stroke();
    }

    // Draw bass staff
    for (let i = 0; i < 5; i++) {
        const y = bassStaffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(width - 5, y);
        ctx.stroke();
    }

    // Draw clefs
    drawTrebleClef(ctx, leftMargin, trebleStaffTop, lineSpacing);
    drawBassClef(ctx, leftMargin, bassStaffTop, lineSpacing);

    // Clear note positions for hit detection
    noteSelectorState.notePositions = [];

    // Draw treble notes (C4 to G5)
    trebleNotes.forEach((noteInfo, i) => {
        const x = clefWidth + i * trebleNoteSpacing + trebleNoteSpacing / 2;
        const staffPos = getStaffPosition(noteInfo.note, noteInfo.octave);
        const y = getYForStaffPosition(staffPos, 'treble', trebleStaffTop, lineSpacing);

        const isHovered = noteSelectorState.hoveredNote &&
            noteSelectorState.hoveredNote.note === noteInfo.note &&
            noteSelectorState.hoveredNote.octave === noteInfo.octave;
        const isSelected = noteSelectorState.selectedNote &&
            noteSelectorState.selectedNote.note === noteInfo.note &&
            noteSelectorState.selectedNote.octave === noteInfo.octave;

        // Draw ledger lines
        drawGrandStaffLedgerLines(ctx, x, y, trebleStaffTop, lineSpacing);

        // Draw the note
        drawSelectableNote(ctx, x, y, isHovered, isSelected);

        // Store position for hit detection
        noteSelectorState.notePositions.push({
            note: noteInfo.note,
            octave: noteInfo.octave,
            x: x - 10,
            y: y - 10,
            width: 20,
            height: 20
        });
    });

    // Draw bass notes (E2 to B3)
    bassNotes.forEach((noteInfo, i) => {
        const x = clefWidth + i * bassNoteSpacing + bassNoteSpacing / 2;
        const staffPos = getStaffPosition(noteInfo.note, noteInfo.octave);
        const y = getYForStaffPosition(staffPos, 'bass', bassStaffTop, lineSpacing);

        const isHovered = noteSelectorState.hoveredNote &&
            noteSelectorState.hoveredNote.note === noteInfo.note &&
            noteSelectorState.hoveredNote.octave === noteInfo.octave;
        const isSelected = noteSelectorState.selectedNote &&
            noteSelectorState.selectedNote.note === noteInfo.note &&
            noteSelectorState.selectedNote.octave === noteInfo.octave;

        // Draw ledger lines
        drawGrandStaffLedgerLines(ctx, x, y, bassStaffTop, lineSpacing);

        // Draw the note
        drawSelectableNote(ctx, x, y, isHovered, isSelected);

        // Store position for hit detection
        noteSelectorState.notePositions.push({
            note: noteInfo.note,
            octave: noteInfo.octave,
            x: x - 10,
            y: y - 10,
            width: 20,
            height: 20
        });
    });
}

// Get note at canvas position (hit detection)
function getNoteAtPosition(x, y) {
    for (const pos of noteSelectorState.notePositions) {
        if (x >= pos.x && x <= pos.x + pos.width &&
            y >= pos.y && y <= pos.y + pos.height) {
            return { note: pos.note, octave: pos.octave };
        }
    }
    return null;
}

// Update the accidental toggle UI
function updateAccidentalToggle(accidental) {
    accidentalBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.accidental === accidental);
    });
}

// Update the note selector label
function updateNoteSelectorLabel() {
    if (noteSelectorState.selectedNote) {
        const { note, octave } = noteSelectorState.selectedNote;
        const finalNote = applyAccidental(note, noteSelectorState.accidental);
        noteSelectorLabel.textContent = getNoteDisplayName(finalNote, octave);
        noteSelectorLabel.classList.add('note-selected');
        noteSelectorOk.disabled = false;
    } else {
        noteSelectorLabel.textContent = 'Select a note';
        noteSelectorLabel.classList.remove('note-selected');
        noteSelectorOk.disabled = true;
    }
}

// Open note selector popup
function openNoteSelector(mode) {
    noteSelectorState.mode = mode;
    noteSelectorState.isOpen = true;
    noteSelectorState.hoveredNote = null;

    // Get current selection and parse it
    let currentNote, currentOctave;
    if (mode === 'free') {
        currentNote = noteSelect.value;
        currentOctave = parseInt(octaveSelect.value);
    } else {
        currentNote = startNoteSelect.value;
        currentOctave = parseInt(startOctaveSelect.value);
    }

    // Set initial state from current selection
    const baseNote = getBaseNote(currentNote);
    const accidental = getAccidentalFromNote(currentNote);
    noteSelectorState.selectedNote = { note: baseNote, octave: currentOctave };
    noteSelectorState.accidental = accidental;

    // Update UI
    updateAccidentalToggle(accidental);
    updateNoteSelectorLabel();
    noteSelectorPopup.classList.add('active');
    drawGrandStaffSelector();
}

// Close note selector popup
function closeNoteSelector() {
    noteSelectorState.isOpen = false;
    noteSelectorState.hoveredNote = null;
    noteSelectorState.selectedNote = null;
    noteSelectorPopup.classList.remove('active');
}

// Handle clicking a note on the grand staff (sets pending selection)
function handleNoteClick(note, octave) {
    noteSelectorState.selectedNote = { note, octave };
    updateNoteSelectorLabel();
    drawGrandStaffSelector();
}

// Confirm selection and apply to appropriate mode
function confirmNoteSelection() {
    if (!noteSelectorState.selectedNote) return;

    const { note, octave } = noteSelectorState.selectedNote;
    const finalNote = applyAccidental(note, noteSelectorState.accidental);

    // Convert flats to sharp equivalents for dropdown compatibility
    const { note: dropdownNote, octave: dropdownOctave } = flatToSharpEquivalent(finalNote, octave);

    if (noteSelectorState.mode === 'free') {
        noteSelect.value = dropdownNote;
        octaveSelect.value = dropdownOctave.toString();
        updateCurrentNote();
        // Mini-staff will be redrawn by updateCurrentNote
    } else {
        startNoteSelect.value = dropdownNote;
        startOctaveSelect.value = dropdownOctave.toString();
        loadSequence(sequenceSelect.value);
        // Mini-staff will be redrawn by loadSequence -> updateSongPracticeMiniStaff
    }
    closeNoteSelector();
}

// Initialize note selector event listeners
function initNoteSelector() {
    // Mini-staff click handlers
    freePracticeMiniStaff.addEventListener('click', () => {
        openNoteSelector('free');
    });

    songPracticeMiniStaff.addEventListener('click', () => {
        openNoteSelector('song');
    });

    // Close button
    noteSelectorClose.addEventListener('click', closeNoteSelector);

    // OK button
    noteSelectorOk.addEventListener('click', confirmNoteSelection);

    // Accidental toggle buttons
    accidentalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            noteSelectorState.accidental = btn.dataset.accidental;
            updateAccidentalToggle(noteSelectorState.accidental);
            updateNoteSelectorLabel();
        });
    });

    // Click outside to close
    noteSelectorPopup.addEventListener('click', (e) => {
        if (e.target === noteSelectorPopup) {
            closeNoteSelector();
        }
    });

    // Grand staff mouse/touch events
    grandStaffCanvas.addEventListener('mousemove', (e) => {
        const rect = grandStaffCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const noteInfo = getNoteAtPosition(x, y);

        if (noteInfo) {
            noteSelectorState.hoveredNote = noteInfo;
        } else {
            noteSelectorState.hoveredNote = null;
        }
        drawGrandStaffSelector();
    });

    grandStaffCanvas.addEventListener('mouseleave', () => {
        noteSelectorState.hoveredNote = null;
        drawGrandStaffSelector();
    });

    grandStaffCanvas.addEventListener('click', (e) => {
        const rect = grandStaffCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const noteInfo = getNoteAtPosition(x, y);

        if (noteInfo) {
            handleNoteClick(noteInfo.note, noteInfo.octave);
        }
    });

    // Touch support for mobile
    grandStaffCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = grandStaffCanvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const noteInfo = getNoteAtPosition(x, y);

        if (noteInfo) {
            noteSelectorState.hoveredNote = noteInfo;
            drawGrandStaffSelector();
        }
    });

    grandStaffCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (noteSelectorState.hoveredNote) {
            handleNoteClick(noteSelectorState.hoveredNote.note, noteSelectorState.hoveredNote.octave);
            noteSelectorState.hoveredNote = null;
        }
    });

    // Keyboard support (Escape to close, Enter to confirm)
    document.addEventListener('keydown', (e) => {
        if (!noteSelectorState.isOpen) return;
        if (e.key === 'Escape') {
            closeNoteSelector();
        } else if (e.key === 'Enter' && noteSelectorState.selectedNote) {
            confirmNoteSelection();
        }
    });

    // Octave button handlers
    freeOctaveDown.addEventListener('click', () => shiftFreeOctave(-1));
    freeOctaveUp.addEventListener('click', () => shiftFreeOctave(1));
    songOctaveDown.addEventListener('click', () => shiftSongOctave(-1));
    songOctaveUp.addEventListener('click', () => shiftSongOctave(1));

    // Initialize mini-staffs with current selections
    const freeNote = noteSelect.value;
    const freeOctave = parseInt(octaveSelect.value);
    drawMiniStaff(freePracticeMiniCtx, freePracticeMiniCanvas, freeNote, freeOctave);

    const songNote = startNoteSelect.value;
    const songOctave = parseInt(startOctaveSelect.value);
    drawMiniStaff(songPracticeMiniCtx, songPracticeMiniCanvas, songNote, songOctave);

    // Initialize octave button states
    updateOctaveButtonStates();
}

// Sync mini-staff when note changes via original dropdowns (if ever used)
const originalUpdateCurrentNote = updateCurrentNote;
updateCurrentNote = function() {
    originalUpdateCurrentNote();
    const note = noteSelect.value;
    const octave = parseInt(octaveSelect.value);
    drawMiniStaff(freePracticeMiniCtx, freePracticeMiniCanvas, note, octave);
    updateOctaveButtonStates();
};

// Helper function to update song practice mini-staff (called from loadSequence)
function updateSongPracticeMiniStaff() {
    const songNote = startNoteSelect.value;
    const songOctave = parseInt(startOctaveSelect.value);
    drawMiniStaff(songPracticeMiniCtx, songPracticeMiniCanvas, songNote, songOctave);
    updateOctaveButtonStates();
}

// Update octave button disabled states
function updateOctaveButtonStates() {
    // Free practice mode
    const freeNote = noteSelect.value;
    const freeOctave = parseInt(octaveSelect.value);
    freeOctaveDown.disabled = !isNoteInRange(freeNote, freeOctave - 1);
    freeOctaveUp.disabled = !isNoteInRange(freeNote, freeOctave + 1);

    // Song practice mode
    const songNote = startNoteSelect.value;
    const songOctave = parseInt(startOctaveSelect.value);
    songOctaveDown.disabled = !isNoteInRange(songNote, songOctave - 1);
    songOctaveUp.disabled = !isNoteInRange(songNote, songOctave + 1);
}

// Shift octave for free practice
function shiftFreeOctave(direction) {
    const currentOctave = parseInt(octaveSelect.value);
    const newOctave = currentOctave + direction;
    if (isNoteInRange(noteSelect.value, newOctave)) {
        octaveSelect.value = newOctave.toString();
        updateCurrentNote();
    }
}

// Shift octave for song practice
function shiftSongOctave(direction) {
    const currentOctave = parseInt(startOctaveSelect.value);
    const newOctave = currentOctave + direction;
    if (isNoteInRange(startNoteSelect.value, newOctave)) {
        startOctaveSelect.value = newOctave.toString();
        loadSequence(sequenceSelect.value);
    }
}

// Initialize note selector on page load
initNoteSelector();
