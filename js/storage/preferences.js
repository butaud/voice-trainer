/**
 * User preferences storage
 *
 * Persists user settings to localStorage for a consistent experience across sessions.
 */

const STORAGE_KEY = 'voiceTrainer.preferences';

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES = {
    // Free practice mode
    freeNote: 'A',
    freeOctave: 4,

    // Song practice mode
    songNote: 'C',
    songOctave: 4,
    selectedSequence: 'major-scale',
    tempo: 90,

    // Current mode
    mode: 'song' // 'free' or 'song'
};

/**
 * Load preferences from localStorage
 * @returns {Object} User preferences (merged with defaults)
 */
export function loadPreferences() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to handle new preference keys
            return { ...DEFAULT_PREFERENCES, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to load preferences:', e);
    }
    return { ...DEFAULT_PREFERENCES };
}

/**
 * Save preferences to localStorage
 * @param {Object} preferences - Preferences object (partial updates allowed)
 */
export function savePreferences(preferences) {
    try {
        const current = loadPreferences();
        const updated = { ...current, ...preferences };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.warn('Failed to save preferences:', e);
    }
}

/**
 * Save a single preference value
 * @param {string} key - Preference key
 * @param {*} value - Preference value
 */
export function savePreference(key, value) {
    savePreferences({ [key]: value });
}

/**
 * Reset all preferences to defaults
 */
export function resetPreferences() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to reset preferences:', e);
    }
}

/**
 * Get default preferences (for reference)
 * @returns {Object} Default preferences
 */
export function getDefaultPreferences() {
    return { ...DEFAULT_PREFERENCES };
}
