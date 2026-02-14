/**
 * Storage module - re-exports all storage utilities
 */

export {
    loadPreferences,
    savePreferences,
    savePreference,
    resetPreferences,
    getDefaultPreferences
} from './preferences.js';

export {
    loadCustomSequences,
    saveCustomSequence,
    updateCustomSequence,
    deleteCustomSequence,
    getCustomSequence,
    clearCustomSequences,
    getStorageSize
} from './sequences.js';
