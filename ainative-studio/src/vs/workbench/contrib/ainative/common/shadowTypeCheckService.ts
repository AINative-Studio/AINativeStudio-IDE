/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Shadow Type-Check Service
 *
 * Phase 2, bullet 1 of the "shadow workspace" feature (see /docs/planning/SHADOW_WORKSPACE_DESIGN.md
 * at the repo root, §3.3 and §6). Runs the workspace's configured TypeScript type-checker as a
 * subprocess against a thread's shadow tree (IShadowWorkspaceService), so the end-of-turn diff
 * review (chatThreadService.getPendingShadowDiffs) can show "does this still type-check" alongside
 * "what changed" - closing the gap the design doc calls out in §2.4/§3.3: today's lint-error
 * surfacing (toolsService._getLintErrors) is just IMarkerService.read() for whatever the already-
 * running extension host happened to compute by an arbitrary timeout, for the *real* file. There is
 * no equivalent "run the type-checker and wait for it to finish" step, and no isolated run against
 * the shadow copy's speculative edits. This service is that step, scoped to TypeScript/tsc, which
 * is both this codebase's own toolchain and the design doc's explicitly named starting point
 * ("start with whatever's configured in the real workspace... tsc/pyright/eslint").
 *
 * Toolchain detection: the design doc says to detect the toolchain "the same way existing
 * lint-error surfacing already assumes a configured toolchain" - reading toolsService._getLintErrors
 * and codeIntelligenceService.ts (the only other diagnostics-shaped services in this directory)
 * shows that today's lint surfacing does not actually probe for a toolchain at all; it just reads
 * whatever markers the extension host already produced, implicitly assuming *something* (the TS
 * extension, ESLint, etc.) is configured and running. There is no existing "detect tsc" routine to
 * mirror. The detection implemented here is therefore the straightforward, idiomatic equivalent for
 * a subprocess world: look for the nearest tsconfig.json by walking up from each file actually
 * touched in the shadow tree (same resolution order tsc/npm itself uses), which is the natural
 * subprocess analogue of "whatever's configured in the real workspace".
 *
 * Scope boundary (see design doc §6, phase 2 bullet list + GitHub issue #159):
 * - This service DOES copy the nearest tsconfig.json and its `extends` ancestor chain into the
 *   shadow tree on demand, because a subprocess tsc invocation is a complete no-op without a
 *   resolvable project file - that much "config-ancestor copying" is the minimum required for
 *   bullet 1 (this service) to do anything useful at all, not an attempt at bullet 2 in full.
 * - This service does NOT implement the node_modules symlink strategy from §3.3/phase-2 bullet 2.
 *   That remains genuinely separate, harder, and architecturally riskier work (symlink lifecycle,
 *   Windows junction fallback, cross-platform edge cases) that the task instructions explicitly
 *   call out as lower priority. Practically: type-checking a shadow tree whose tsconfig resolves
 *   ambient/@types-only dependencies (as this very codebase's own src/tsconfig.json does) works
 *   today without node_modules present; a shadow tree that imports concrete runtime packages via
 *   bare specifiers will currently fail to resolve those imports and surface that failure as (valid,
 *   if noisy) TS2307 "Cannot find module" diagnostics rather than silently skipping the check.
 * - No pyright/eslint support yet - TypeScript only, per the task's explicit "start with" guidance.
 */

import { execFile } from 'child_process';
import * as path from 'path';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IShadowWorkspaceService } from './shadowWorkspaceService.js';

export const IShadowTypeCheckService = createDecorator<IShadowTypeCheckService>('shadowTypeCheckService');

/** A single structured diagnostic parsed from a `tsc --noEmit` run against the shadow tree. */
export interface ShadowTypeCheckDiagnostic {
	/** Real-workspace URI the diagnostic applies to (mapped back from the shadow path tsc reported). */
	readonly realUri: URI;
	readonly line: number;
	readonly column: number;
	readonly severity: 'error' | 'warning';
	readonly code: string;
	readonly message: string;
}

export interface ShadowTypeCheckResult {
	/**
	 * 'ok': tsc ran and found zero diagnostics.
	 * 'diagnostics': tsc ran and found at least one diagnostic (see `diagnostics`).
	 * 'no-toolchain': no tsconfig.json could be found for any synced file - nothing to run. Not an
	 *    error; most non-TypeScript shadow trees will legitimately hit this.
	 * 'spawn-error': tsc exists in principle (a tsconfig was found) but the subprocess itself could
	 *    not be run or produced unparseable output - see `errorMessage`.
	 */
	readonly status: 'ok' | 'diagnostics' | 'no-toolchain' | 'spawn-error';
	readonly diagnostics: ShadowTypeCheckDiagnostic[];
	readonly errorMessage?: string;
}

export interface IShadowTypeCheckService {
	readonly _serviceBrand: undefined;

	/**
	 * Runs `tsc --noEmit` against a thread's shadow tree, scoped to the nearest tsconfig.json
	 * ancestor of its synced files (copied into the shadow tree on demand, see module doc), and
	 * returns a structured diagnostic list with paths mapped back to the real workspace.
	 * Returns `{ status: 'no-toolchain', diagnostics: [] }` for a thread with no shadow workspace,
	 * no synced files, or no resolvable tsconfig.json.
	 */
	typeCheckShadow(threadId: string): Promise<ShadowTypeCheckResult>;
}

const TSC_TIMEOUT_MS = 60_000;
// tsc's own stdout buffer for a large monorepo's worth of diagnostics can exceed Node's 1MB
// execFile default; 16MB matches the ceiling this codebase already uses elsewhere for subprocess
// output (see terminalToolService/communityMarketplace network response caps) without being
// unbounded.
const MAX_STDOUT_BYTES = 16 * 1024 * 1024;

// Matches tsc's `--pretty false` plain diagnostic line format:
//   relative/path/to/file.ts(12,34): error TS2322: Type 'string' is not assignable to type 'number'.
// Confirmed against a real `tsc --noEmit --pretty false` run (both error and clean cases) while
// building this service - this is tsc's one stable, documented non-JSON output format (tsc has no
// `--json` diagnostics flag), independent of locale since the "error"/"warning" keyword itself is
// not localized in this format even when message text is.
const TSC_DIAGNOSTIC_LINE = /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.*)$/;

export class ShadowTypeCheckService extends Disposable implements IShadowTypeCheckService {
	_serviceBrand: undefined;

	constructor(
		@IFileService private readonly _fileService: IFileService,
		@IShadowWorkspaceService private readonly _shadowWorkspaceService: IShadowWorkspaceService,
	) {
		super();
	}

	async typeCheckShadow(threadId: string): Promise<ShadowTypeCheckResult> {
		const shadow = this._shadowWorkspaceService.getShadowForThread(threadId);
		if (!shadow || shadow.syncedFsPaths.size === 0) {
			return { status: 'no-toolchain', diagnostics: [] };
		}

		// diffShadowAgainstReal gives us the authoritative real<->shadow URI pairing for every
		// synced file (computed by ShadowWorkspaceService itself, which already knows each file's
		// workspace root) - reusing it here means this service never has to re-derive or guess that
		// mapping (e.g. by assuming a single workspace folder, or stripping a fixed number of path
		// segments), which would silently break on multi-root workspaces or path separators.
		const fileDiffs = await this._shadowWorkspaceService.diffShadowAgainstReal(threadId);
		const shadowToRealUri = new Map<string, URI>(fileDiffs.map(d => [d.shadowUri.fsPath, d.realUri]));

		// Derive each synced file's real workspace root the same way ShadowWorkspaceService mapped
		// it: a shadow path is always `<shadowRoot>/<workspaceFolderBasename>/<relativePath>`, and
		// the corresponding real path's suffix is exactly `<relativePath>` - so stripping that same
		// suffix off the real path recovers the real workspace root. This matters because a
		// tsconfig's `include`/`exclude` resolves relative to the config file's own directory: the
		// copied config must land in the *same* per-workspace-folder subtree syncFileIntoShadow
		// already uses (shadowRoot/<basename>/...), not some other mirrored location, or it will
		// never find the already-synced source files sitting beside it.
		const firstDiff = fileDiffs[0];
		if (!firstDiff) {
			return { status: 'no-toolchain', diagnostics: [] };
		}
		const relativeToShadowRoot = path.relative(shadow.rootUri.fsPath, firstDiff.shadowUri.fsPath); // "<basename>/<rel>"
		const workspaceFolderBasename = relativeToShadowRoot.split(path.sep)[0];
		const relative = relativeToShadowRoot.split(path.sep).slice(1).join(path.sep); // "<rel>"
		const realWorkspaceRootFsPath = relative.length > 0
			? firstDiff.realUri.fsPath.slice(0, firstDiff.realUri.fsPath.length - relative.length - 1)
			: firstDiff.realUri.fsPath;
		const shadowWorkspaceRootUri = URI.file(path.join(shadow.rootUri.fsPath, workspaceFolderBasename));

		const located = await this._locateOrCopyTsconfig(realWorkspaceRootFsPath, shadowWorkspaceRootUri, shadow.rootUri, Array.from(shadow.syncedFsPaths));
		if (!located) {
			return { status: 'no-toolchain', diagnostics: [] };
		}
		const { shadowUri: tsconfigShadowUri, realConfigDirFsPath } = located;

		const tscBin = await this._resolveTscBinaryPath(realConfigDirFsPath);
		if (!tscBin) {
			// A tsconfig.json exists, but no `tsc` binary could be found anywhere a real project of
			// this shape would put one (its own node_modules, or $PATH) - report as no-toolchain
			// rather than spawn-error, since there is genuinely no toolchain installed to run, as
			// opposed to one that's installed but failed. This is the expected common case in this
			// very IDE's own packaged builds, where `typescript` is a devDependency of the IDE itself
			// and is never bundled into a shipped app - the correct toolchain to use is always the
			// *target workspace's own* installed TypeScript, never this IDE's.
			return { status: 'no-toolchain', diagnostics: [] };
		}

		let stdout: string;
		try {
			stdout = await this._runTsc(tscBin, tsconfigShadowUri, shadow.rootUri);
		} catch (e) {
			return { status: 'spawn-error', diagnostics: [], errorMessage: e instanceof Error ? e.message : String(e) };
		}

		const diagnostics = this._parseDiagnostics(stdout, shadow.rootUri, shadowToRealUri);
		return diagnostics.length > 0
			? { status: 'diagnostics', diagnostics }
			: { status: 'ok', diagnostics: [] };
	}

	/**
	 * Walks up from each synced file's *real* path looking for the nearest tsconfig.json (same
	 * resolution order tsc itself uses for an implicit project), then copies that file - and,
	 * transitively, every tsconfig.json its `extends` chain points at - into the shadow tree, into
	 * the same per-workspace-folder subtree syncFileIntoShadow already mirrors source files into
	 * (`realWorkspaceRootFsPath`/`shadowWorkspaceRootUri`, both anchored at the workspace folder, not
	 * the filesystem root). This is required, not cosmetic: tsc resolves a tsconfig's
	 * `include`/`exclude`/relative-`extends` relative to the config file's own directory, so the
	 * copied config has to sit in the exact directory structure the already-synced source files
	 * live in, or `include: ["**\/*.ts"]` (or whatever the real project uses) silently matches
	 * nothing in the shadow tree. A config outside the workspace folder (reached via `extends`) is
	 * mirrored relative to the filesystem root instead (see _mirrorOutsideWorkspaceRoot), since it
	 * has no meaningful position relative to the workspace folder. Returns the shadow URI of the
	 * located tsconfig.json, or undefined if none of the synced files have one anywhere above them
	 * on disk.
	 */
	private async _locateOrCopyTsconfig(realWorkspaceRootFsPath: string, shadowWorkspaceRootUri: URI, shadowRootUri: URI, syncedRealFsPaths: string[]): Promise<{ shadowUri: URI; realConfigDirFsPath: string } | undefined> {
		for (const realFsPath of syncedRealFsPaths) {
			const realTsconfigPath = await this._findNearestTsconfig(path.dirname(realFsPath));
			if (!realTsconfigPath) continue;

			const shadowTsconfigUri = await this._copyConfigChainIntoShadow(realWorkspaceRootFsPath, shadowWorkspaceRootUri, shadowRootUri, realTsconfigPath);
			if (shadowTsconfigUri) return { shadowUri: shadowTsconfigUri, realConfigDirFsPath: path.dirname(realTsconfigPath) };
		}
		return undefined;
	}

	private async _findNearestTsconfig(startDirFsPath: string): Promise<string | undefined> {
		let dir = startDirFsPath;
		// Bounded by the filesystem root - path.dirname(root) === root, so this always terminates.
		for (; ;) {
			const candidate = path.join(dir, 'tsconfig.json');
			if (await this._fileService.exists(URI.file(candidate))) {
				return candidate;
			}
			const parent = path.dirname(dir);
			if (parent === dir) return undefined;
			dir = parent;
		}
	}

	/**
	 * Copies one real tsconfig.json into its mirrored shadow location, then recurses into its
	 * `extends` target (if any and if not already copied) so the chain resolves. A config inside the
	 * workspace root (the overwhelmingly common case - a project's own tsconfig.json) is mirrored
	 * into the exact same subtree syncFileIntoShadow uses for source files
	 * (shadowWorkspaceRootUri/<relative-to-workspace-root>), which is what lets a relative
	 * `include`/`exclude` find those already-synced files sitting right beside it. A config outside
	 * the workspace root (reached by following `extends` upward/outward, e.g. a shared base config
	 * one level up) has no meaningful position relative to the workspace folder, so it falls back to
	 * being mirrored relative to the filesystem root instead (see _mirrorOutsideWorkspaceRoot) - it
	 * only needs to be *somewhere* resolvable, since nothing's `include` ever points directly at it.
	 */
	private async _copyConfigChainIntoShadow(realWorkspaceRootFsPath: string, shadowWorkspaceRootUri: URI, shadowRootUri: URI, realConfigFsPath: string, seen = new Set<string>()): Promise<URI | undefined> {
		const mirror = (fsPath: string): URI => {
			const relativeToWorkspaceRoot = path.relative(realWorkspaceRootFsPath, fsPath);
			return relativeToWorkspaceRoot.startsWith('..')
				? this._mirrorOutsideWorkspaceRoot(shadowRootUri, fsPath)
				: URI.file(path.join(shadowWorkspaceRootUri.fsPath, relativeToWorkspaceRoot));
		};

		if (seen.has(realConfigFsPath)) return mirror(realConfigFsPath);
		seen.add(realConfigFsPath);

		const realUri = URI.file(realConfigFsPath);
		const exists = await this._fileService.exists(realUri);
		if (!exists) return undefined;

		const fileContent = await this._fileService.readFile(realUri);
		const originalContent = fileContent.value.toString();
		const shadowUri = mirror(realConfigFsPath);

		const extendsTarget = this._parseExtendsPath(originalContent, path.dirname(realConfigFsPath));
		let contentToWrite = originalContent;
		if (extendsTarget) {
			// Copy the extends target FIRST so we know where it actually landed - its shadow location
			// only matches its original real-relative-path position when both configs are inside the
			// workspace root (the common case, where the real tree's relative structure is mirrored
			// 1:1 and the original "extends" string needs no change at all). When the target falls
			// outside the workspace root, it's remapped into the unrelated __config-ancestors__
			// subtree (see _mirrorOutsideWorkspaceRoot) and the original relative "extends" string
			// would resolve to the wrong place from the copy's own new directory - so the extends
			// value in the copy must be rewritten to the correct new relative path, or the leaf
			// config silently fails to inherit from its base (which is exactly how this bug was first
			// caught: a 'strict' setting from a one-level-up base config not taking effect at all).
			const extendsShadowUri = await this._copyConfigChainIntoShadow(realWorkspaceRootFsPath, shadowWorkspaceRootUri, shadowRootUri, extendsTarget, seen);
			if (extendsShadowUri) {
				const newExtendsRelative = path.relative(path.dirname(shadowUri.fsPath), extendsShadowUri.fsPath);
				const newExtendsValue = newExtendsRelative.startsWith('.') ? newExtendsRelative : './' + newExtendsRelative;
				contentToWrite = originalContent.replace(/"extends"\s*:\s*"[^"]+"/, `"extends": "${newExtendsValue.split(path.sep).join('/')}"`);
			}
		}

		await this._fileService.writeFile(shadowUri, VSBuffer.fromString(contentToWrite));

		return shadowUri;
	}

	/** Best-effort `"extends": "..."` extraction - tolerant of jsonc comments/trailing commas since
	 * tsconfig.json conventionally allows both and a strict JSON.parse would throw on this
	 * codebase's own config files (see src/tsconfig.json's trailing commas). Resolves a relative
	 * extends path (the overwhelmingly common case) against the extending config's own directory,
	 * same as tsc itself does; a bare package-name extends (e.g. "@tsconfig/node20") is left
	 * unresolved since there is no npm package on disk under a path-relative scheme to copy. */
	private _parseExtendsPath(tsconfigContent: string, configDirFsPath: string): string | undefined {
		const match = tsconfigContent.match(/"extends"\s*:\s*"([^"]+)"/);
		if (!match) return undefined;
		const extendsValue = match[1];
		if (!extendsValue.startsWith('.')) return undefined; // bare package specifier, not a disk path
		const resolved = path.resolve(configDirFsPath, extendsValue);
		return resolved.endsWith('.json') ? resolved : resolved + '.json';
	}

	private _mirrorOutsideWorkspaceRoot(shadowRootUri: URI, realFsPath: string): URI {
		// Fallback mirroring for a config that lies outside the workspace root (reached via
		// `extends`) - placed under a dedicated `__config-ancestors__` subtree of the shadow root,
		// mirroring the real absolute path's own segments so two different outside-root configs
		// never collide. Nothing's `include`/`exclude` ever points directly at a path under here
		// (only an `extends` reference does, which is an absolute/resolved path either way), so its
		// exact location relative to the workspace folder doesn't matter the way it does for a
		// config inside the workspace root.
		const relativeToFsRoot = realFsPath.replace(/^[/\\]+/, '').replace(/^([A-Za-z]):[/\\]/, '$1/');
		return URI.file(path.join(shadowRootUri.fsPath, '__config-ancestors__', relativeToFsRoot));
	}

	private _runTsc(tscBin: string, shadowTsconfigUri: URI, shadowRootUri: URI): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			execFile(
				tscBin,
				['--noEmit', '-p', shadowTsconfigUri.fsPath, '--pretty', 'false'],
				{ cwd: shadowRootUri.fsPath, timeout: TSC_TIMEOUT_MS, maxBuffer: MAX_STDOUT_BYTES },
				(error, stdout) => {
					// tsc exits non-zero (1 = compiler errors reported, 2 = diagnostics found) whenever
					// it finds anything to report - that is the expected, successful-run outcome here,
					// not a failure. Only a genuine spawn failure (ENOENT, timeout killing the process,
					// stdout exceeding maxBuffer) has no stdout to parse at all; distinguish by checking
					// whether tsc actually produced output rather than trusting the exit code.
					if (error && !stdout) {
						reject(error);
						return;
					}
					resolve(stdout ?? '');
				}
			);
		});
	}

	/**
	 * Resolves the `tsc` binary to run, starting from the real tsconfig.json's own directory and
	 * walking up (same direction Node module resolution walks for node_modules) looking for
	 * node_modules/.bin/tsc. Deliberately prefers the *target project's own* installed TypeScript
	 * over anything bundled with this IDE - this IDE's own `typescript` dependency is a
	 * devDependency of AINativeStudio itself (not guaranteed to exist, let alone be the right
	 * version, in a packaged build - see this file's header comment), whereas the whole point of
	 * this feature is validating *the user's project* with *the user's project's* configured
	 * compiler, the same version `npm run build`/`tsc` would use if the user ran it themselves.
	 * Falls back to a bare `tsc` resolved via $PATH (covers a global `npm install -g typescript`),
	 * and returns undefined - "no toolchain", not an error - if neither exists, since a project with
	 * a tsconfig.json but no installed TypeScript at all (e.g. `npm install` was never run) has
	 * genuinely nothing to run yet.
	 */
	private async _resolveTscBinaryPath(startDirFsPath: string): Promise<string | undefined> {
		const binName = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';

		let dir = startDirFsPath;
		for (; ;) {
			const candidate = URI.file(path.join(dir, 'node_modules', '.bin', binName));
			if (await this._fileService.exists(candidate)) {
				return candidate.fsPath;
			}
			const parent = path.dirname(dir);
			if (parent === dir) break;
			dir = parent;
		}

		if (await this._isOnPath(binName)) {
			return binName;
		}
		return undefined;
	}

	private _isOnPath(binName: string): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			const checkCommand = process.platform === 'win32' ? 'where' : 'which';
			execFile(checkCommand, [binName], (error) => resolve(!error));
		});
	}

	private _parseDiagnostics(stdout: string, shadowRootUri: URI, shadowToRealUri: Map<string, URI>): ShadowTypeCheckDiagnostic[] {
		const diagnostics: ShadowTypeCheckDiagnostic[] = [];
		for (const line of stdout.split(/\r?\n/)) {
			const match = line.match(TSC_DIAGNOSTIC_LINE);
			if (!match) continue;

			const [, filePathRaw, lineStr, columnStr, severity, code, message] = match;
			// tsc prints paths relative to its invocation cwd (the shadow root, per _runTsc's `cwd`
			// option). Resolve to an absolute shadow fsPath, then look up the authoritative real URI
			// via the real<->shadow pairing diffShadowAgainstReal already computed - this is exact,
			// unlike re-deriving the real path by stripping a guessed number of path segments. A
			// diagnostic on a copied config-ancestor file (under __config-ancestors__, never a
			// "synced" file in ShadowWorkspaceService's own bookkeeping) has no real-file counterpart
			// to map to, so it's reported pointing at its shadow path instead of being dropped - still
			// useful signal ("your base tsconfig itself doesn't compile"), just not file-diff-aligned.
			const shadowAbsPath = path.resolve(shadowRootUri.fsPath, filePathRaw);
			const realUri = shadowToRealUri.get(shadowAbsPath) ?? URI.file(shadowAbsPath);

			diagnostics.push({
				realUri,
				line: parseInt(lineStr, 10),
				column: parseInt(columnStr, 10),
				severity: severity as 'error' | 'warning',
				code,
				message: message.trim(),
			});
		}
		return diagnostics;
	}

	override dispose(): void {
		super.dispose();
	}
}

registerSingleton(IShadowTypeCheckService, ShadowTypeCheckService, InstantiationType.Delayed);
