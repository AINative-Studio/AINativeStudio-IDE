/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Computes the repo_hash the backend's `POST /api/v1/zerodb/projects/ensure` contract expects:
 * "First 16 chars of SHA256(normalized git remote URL)" (confirmed directly against the live
 * OpenAPI spec's EnsureProjectRequest schema - see codeContextEngineService.ts). Kept as a
 * standalone pure function (SubtleCrypto only, no Node 'crypto' import) so it works unmodified
 * in both the browser and electron-main contexts common/ code can run in, and so the
 * normalization step - the part most likely to drift from the backend's own normalization and
 * silently produce a different hash for what a human would call "the same remote" - has real
 * test coverage.
 */

/**
 * Normalizes a git remote URL so that equivalent forms of the same remote
 * (SSH vs HTTPS, trailing slash, trailing ".git", trailing-dot host) hash identically.
 * Exported on its own so normalization behavior itself is directly testable, independent of
 * whether the SHA-256 step below matches the backend bit-for-bit in a test environment.
 */
export const normalizeGitRemoteUrl = (remoteUrl: string): string => {
	let s = remoteUrl.trim().toLowerCase();
	// git@host:owner/repo.git -> https://host/owner/repo
	const scpMatch = s.match(/^git@([^:]+):(.+)$/);
	if (scpMatch) {
		s = `https://${scpMatch[1]}/${scpMatch[2]}`;
	}
	s = s.replace(/\.git$/, '');
	s = s.replace(/\/+$/, '');
	return s;
}

/** SHA-256 hex digest via SubtleCrypto, truncated to the first 16 hex chars per the backend contract. */
export const computeRepoHash = async (remoteUrl: string): Promise<string> => {
	const normalized = normalizeGitRemoteUrl(remoteUrl);
	const data = new TextEncoder().encode(normalized);
	const digest = await crypto.subtle.digest('SHA-256', data);
	const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
	return hex.slice(0, 16);
}
