/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ProviderName } from './ainativeSettingsTypes.js';
import { defaultProviderSettings } from './modelCapabilities.js';

/**
 * Maps a backend-reported provider name (from GET /api/v1/cli/bootstrap's
 * direct_providers[].provider - see codeContextEngineService-adjacent research on #184) onto
 * this codebase's own ProviderName keys (e.g. "openAI", "xAI" - note the capitalization, which
 * doesn't match a naive lowercase comparison).
 *
 * The backend's OpenAPI spec declares `provider` as a plain string with no enum constraint and
 * no example value, so the exact casing/separators it actually sends cannot be confirmed ahead
 * of a real bootstrap response - this does a normalized (lowercase, non-alphanumeric characters
 * stripped) comparison rather than an exact-string match, so reasonable variations in casing or
 * separators ("OpenAI", "open-ai", "open_ai") all still resolve correctly instead of silently
 * dropping a key the first time the backend's exact format turns out to differ from a guess.
 */
const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const PROVIDER_NAMES = Object.keys(defaultProviderSettings) as ProviderName[];
const NORMALIZED_TO_PROVIDER_NAME = new Map<string, ProviderName>(
	PROVIDER_NAMES.map(name => [normalize(name), name])
);

/** Returns the matching ProviderName for a backend-reported provider string, or undefined if none match. */
export const matchBootstrapProviderName = (backendProviderName: string): ProviderName | undefined => {
	return NORMALIZED_TO_PROVIDER_NAME.get(normalize(backendProviderName));
}
