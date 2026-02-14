/**
 * Custom sequences storage
 *
 * Persists user-uploaded sequences (from MusicXML) to localStorage.
 */

const STORAGE_KEY = 'voiceTrainer.customSequences';

/**
 * Generate a unique ID for a sequence
 * @returns {string} Unique sequence ID
 */
function generateId() {
    return 'custom-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Load all custom sequences from localStorage
 * @returns {Array<Object>} Array of custom sequence objects
 */
export function loadCustomSequences() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load custom sequences:', e);
    }
    return [];
}

/**
 * Save a new custom sequence
 * @param {Object} sequence - Sequence object with name, notes, timeSignature, tempo
 * @returns {string} The ID assigned to the sequence
 */
export function saveCustomSequence(sequence) {
    try {
        const sequences = loadCustomSequences();
        const id = generateId();
        const newSequence = {
            id,
            name: sequence.name || 'Untitled',
            notes: sequence.notes || [],
            timeSignature: sequence.timeSignature || { beats: 4, beatType: 4 },
            tempo: sequence.tempo || 120,
            createdAt: Date.now()
        };
        sequences.push(newSequence);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sequences));
        return id;
    } catch (e) {
        console.warn('Failed to save custom sequence:', e);
        return null;
    }
}

/**
 * Update an existing custom sequence
 * @param {string} id - Sequence ID
 * @param {Object} updates - Partial sequence object with fields to update
 * @returns {boolean} True if update succeeded
 */
export function updateCustomSequence(id, updates) {
    try {
        const sequences = loadCustomSequences();
        const index = sequences.findIndex(s => s.id === id);
        if (index === -1) return false;

        sequences[index] = { ...sequences[index], ...updates, updatedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sequences));
        return true;
    } catch (e) {
        console.warn('Failed to update custom sequence:', e);
        return false;
    }
}

/**
 * Delete a custom sequence
 * @param {string} id - Sequence ID
 * @returns {boolean} True if deletion succeeded
 */
export function deleteCustomSequence(id) {
    try {
        const sequences = loadCustomSequences();
        const filtered = sequences.filter(s => s.id !== id);
        if (filtered.length === sequences.length) return false; // Not found

        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (e) {
        console.warn('Failed to delete custom sequence:', e);
        return false;
    }
}

/**
 * Get a single custom sequence by ID
 * @param {string} id - Sequence ID
 * @returns {Object|null} Sequence object or null if not found
 */
export function getCustomSequence(id) {
    const sequences = loadCustomSequences();
    return sequences.find(s => s.id === id) || null;
}

/**
 * Clear all custom sequences
 */
export function clearCustomSequences() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear custom sequences:', e);
    }
}

/**
 * Get total storage size used by custom sequences (in bytes)
 * @returns {number} Size in bytes
 */
export function getStorageSize() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? new Blob([stored]).size : 0;
    } catch (e) {
        return 0;
    }
}
