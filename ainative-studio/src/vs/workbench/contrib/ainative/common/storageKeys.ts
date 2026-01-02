/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

// MIGRATION NOTE: Storage keys migrated from 'void.*' to 'ainative.*' for rebranding
// Legacy keys are kept as constants for backward-compatible migration

// Legacy Void keys (for migration reference)
export const LEGACY_AINATIVE_SETTINGS_STORAGE_KEY = 'void.settingsServiceStorageII';
export const LEGACY_THREAD_STORAGE_KEY = 'void.chatThreadStorageII';
export const LEGACY_OPT_OUT_KEY = 'void.app.optOutAll';
export const LEGACY_MACHINE_ID_KEY = 'void.app.machineId';

// Current AINative keys (active)
export const AINATIVE_SETTINGS_STORAGE_KEY = 'ainative.settingsServiceStorageII';
export const THREAD_STORAGE_KEY = 'ainative.chatThreadStorageII';
export const PROMPT_HISTORY_STORAGE_KEY = 'ainative.promptHistory';
export const OPT_OUT_KEY = 'ainative.app.optOutAll';
export const MACHINE_ID_KEY = 'ainative.app.machineId';
export const SKILLS_PREFERENCES_KEY = 'ainative.skillsPreferences';
