/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
import { Schemas } from '../../../../../base/common/network.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ShadowWorkspaceService } from '../../common/shadowWorkspaceService.js';
import { ShadowTypeCheckService } from '../../common/shadowTypeCheckService.js';

// This repo's own node_modules/.bin/tsc, used as the "project's installed TypeScript" fixture
// projects symlink to below - mirrors how ShadowTypeCheckService resolves tsc for a real project
// (its own node_modules/.bin/tsc), without requiring network access or a real `npm install` inside
// a temp directory for every test run.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../../../..');
const REAL_TSC_BIN = path.join(REPO_ROOT, 'node_modules', '.bin', 'tsc');

suite('ShadowTypeCheckService Tests', function () {
	// Real subprocess invocations (tsc) are slower than pure in-memory unit tests - follow
	// skillSyncCommand.test.ts's convention of raising the suite's default timeout for tests that
	// shell out, rather than retrying/sleeping to work around flakiness.
	this.timeout(20000);

	let shadowWorkspaceService: ShadowWorkspaceService;
	let typeCheckService: ShadowTypeCheckService;
	let fileService: FileService;
	let disposables: DisposableStore;
	let testWorkspaceDir: URI;

	const hasRealTsc = fs.existsSync(REAL_TSC_BIN);

	setup(async () => {
		disposables = new DisposableStore();

		const logService = new NullLogService();
		fileService = disposables.add(new FileService(logService));
		const diskProvider = disposables.add(new DiskFileSystemProvider(logService));
		fileService.registerProvider(Schemas.file, diskProvider);

		testWorkspaceDir = URI.file(path.join(tmpdir(), 'ainative-typecheck-test-workspace-' + Date.now() + '-' + Math.random().toString(36).slice(2)));
		await fileService.createFolder(testWorkspaceDir);

		shadowWorkspaceService = disposables.add(new ShadowWorkspaceService(fileService));
		typeCheckService = disposables.add(new ShadowTypeCheckService(fileService, shadowWorkspaceService));
	});

	teardown(async () => {
		try {
			await fileService.del(testWorkspaceDir, { recursive: true });
		} catch {
			// ignore cleanup errors
		}
		disposables.dispose();
	});

	/** Gives the fixture workspace its own node_modules/.bin/tsc by symlinking to this repo's real
	 * installed TypeScript, so _resolveTscBinaryPath's "project's own node_modules" path is actually
	 * exercised instead of falling through to a $PATH lookup. */
	function linkRealTscIntoFixture(workspaceDirFsPath: string): void {
		const binDir = path.join(workspaceDirFsPath, 'node_modules', '.bin');
		fs.mkdirSync(binDir, { recursive: true });
		fs.symlinkSync(REAL_TSC_BIN, path.join(binDir, 'tsc'));
	}

	test('typeCheckShadow returns no-toolchain for a thread with no shadow workspace', async () => {
		const result = await typeCheckService.typeCheckShadow('never-created-thread');
		assert.strictEqual(result.status, 'no-toolchain');
		assert.deepStrictEqual(result.diagnostics, []);
	});

	test('typeCheckShadow returns no-toolchain for a thread whose shadow has no synced files', async () => {
		await shadowWorkspaceService.createShadowForThread('empty-shadow-thread');
		const result = await typeCheckService.typeCheckShadow('empty-shadow-thread');
		assert.strictEqual(result.status, 'no-toolchain');
	});

	test('typeCheckShadow returns no-toolchain when no tsconfig.json exists above the synced file', async () => {
		// testWorkspaceDir has no tsconfig.json anywhere above it on disk by construction (it's a
		// fresh temp dir), so this should hit the "found a file, but no project" path, not run tsc
		// at all.
		const realFile = URI.joinPath(testWorkspaceDir, 'plain.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('export const x = 1;'));
		await shadowWorkspaceService.syncFileIntoShadow('no-tsconfig-thread', testWorkspaceDir, realFile);

		const result = await typeCheckService.typeCheckShadow('no-tsconfig-thread');
		assert.strictEqual(result.status, 'no-toolchain');
		assert.deepStrictEqual(result.diagnostics, []);
	});

	test('typeCheckShadow reports ok for a shadow tree with a clean file', async function () {
		if (!hasRealTsc) { this.skip(); }

		fs.writeFileSync(path.join(testWorkspaceDir.fsPath, 'tsconfig.json'),
			JSON.stringify({ compilerOptions: { noEmit: true, strict: true }, include: ['**/*.ts'] }));
		linkRealTscIntoFixture(testWorkspaceDir.fsPath);

		const realFile = URI.joinPath(testWorkspaceDir, 'clean.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('export const x: number = 1;\n'));
		const shadowUri = await shadowWorkspaceService.syncFileIntoShadow('clean-thread', testWorkspaceDir, realFile);
		// simulate an agent edit landing in the shadow tree - still type-correct
		await fileService.writeFile(shadowUri, VSBuffer.fromString('export const x: number = 2;\n'));

		const result = await typeCheckService.typeCheckShadow('clean-thread');
		assert.strictEqual(result.status, 'ok');
		assert.deepStrictEqual(result.diagnostics, []);
	});

	test('typeCheckShadow reports structured diagnostics for a type error introduced in the shadow tree', async function () {
		if (!hasRealTsc) { this.skip(); }

		fs.writeFileSync(path.join(testWorkspaceDir.fsPath, 'tsconfig.json'),
			JSON.stringify({ compilerOptions: { noEmit: true, strict: true }, include: ['**/*.ts'] }));
		linkRealTscIntoFixture(testWorkspaceDir.fsPath);

		const realFile = URI.joinPath(testWorkspaceDir, 'broken.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('export const x: number = 1;\n'));
		const shadowUri = await shadowWorkspaceService.syncFileIntoShadow('broken-thread', testWorkspaceDir, realFile);
		// the real file is still valid; only the shadow copy (the agent's uncommitted edit) is broken
		await fileService.writeFile(shadowUri, VSBuffer.fromString('export const x: number = "not a number";\n'));

		const result = await typeCheckService.typeCheckShadow('broken-thread');

		assert.strictEqual(result.status, 'diagnostics');
		assert.strictEqual(result.diagnostics.length, 1);
		const [diag] = result.diagnostics;
		assert.strictEqual(diag.severity, 'error');
		assert.strictEqual(diag.code, 'TS2322');
		assert.strictEqual(diag.line, 1);
		assert.ok(diag.message.includes('not assignable'));
		// the diagnostic's path must be mapped back to the REAL file, not the shadow path - this is
		// the whole point of reusing diffShadowAgainstReal's real<->shadow pairing.
		assert.strictEqual(diag.realUri.toString(), realFile.toString());
	});

	test('typeCheckShadow maps diagnostics back to the correct real file across multiple synced files', async function () {
		if (!hasRealTsc) { this.skip(); }

		fs.writeFileSync(path.join(testWorkspaceDir.fsPath, 'tsconfig.json'),
			JSON.stringify({ compilerOptions: { noEmit: true, strict: true }, include: ['**/*.ts'] }));
		linkRealTscIntoFixture(testWorkspaceDir.fsPath);

		const goodFile = URI.joinPath(testWorkspaceDir, 'good.ts');
		const badFile = URI.joinPath(testWorkspaceDir, 'bad.ts');
		await fileService.writeFile(goodFile, VSBuffer.fromString('export const good: number = 1;\n'));
		await fileService.writeFile(badFile, VSBuffer.fromString('export const bad: number = 1;\n'));

		await shadowWorkspaceService.syncFileIntoShadow('multi-thread', testWorkspaceDir, goodFile);
		const badShadowUri = await shadowWorkspaceService.syncFileIntoShadow('multi-thread', testWorkspaceDir, badFile);
		await fileService.writeFile(badShadowUri, VSBuffer.fromString('export const bad: number = "broken";\n'));

		const result = await typeCheckService.typeCheckShadow('multi-thread');

		assert.strictEqual(result.status, 'diagnostics');
		assert.strictEqual(result.diagnostics.length, 1);
		assert.strictEqual(result.diagnostics[0].realUri.toString(), badFile.toString());
	});

	test('typeCheckShadow resolves a tsconfig.json extends chain into the shadow tree', async function () {
		if (!hasRealTsc) { this.skip(); }

		// base config lives one directory above the project, the way a shared base config often does
		const baseDir = path.dirname(testWorkspaceDir.fsPath);
		const baseConfigPath = path.join(baseDir, `tsconfig.base-${path.basename(testWorkspaceDir.fsPath)}.json`);
		fs.writeFileSync(baseConfigPath, JSON.stringify({ compilerOptions: { strict: true } }));

		try {
			fs.writeFileSync(path.join(testWorkspaceDir.fsPath, 'tsconfig.json'), JSON.stringify({
				extends: `./${path.relative(testWorkspaceDir.fsPath, baseConfigPath)}`,
				compilerOptions: { noEmit: true },
				include: ['**/*.ts'],
			}));
			linkRealTscIntoFixture(testWorkspaceDir.fsPath);

			const realFile = URI.joinPath(testWorkspaceDir, 'extended.ts');
			await fileService.writeFile(realFile, VSBuffer.fromString('export const x: number = 1;\n'));
			const shadowUri = await shadowWorkspaceService.syncFileIntoShadow('extends-thread', testWorkspaceDir, realFile);
			// strict (inherited from the base config via extends) must be in effect for this to fail -
			// proves the extends chain actually resolved inside the shadow tree, not just the leaf config.
			await fileService.writeFile(shadowUri, VSBuffer.fromString('let y;\nexport const x: number = y;\n'));

			const result = await typeCheckService.typeCheckShadow('extends-thread');

			assert.strictEqual(result.status, 'diagnostics');
			assert.ok(result.diagnostics.some(d => d.code === 'TS7043' || d.code === 'TS2322'),
				`expected a strict-mode diagnostic, got: ${JSON.stringify(result.diagnostics)}`);
		} finally {
			try { fs.unlinkSync(baseConfigPath); } catch { /* ignore */ }
		}
	});

	test('typeCheckShadow returns no-toolchain (not spawn-error) when a tsconfig exists but no tsc is installed anywhere', async () => {
		// Deliberately do NOT call linkRealTscIntoFixture - and since PATH lookups in the test
		// environment could theoretically find a global tsc, this test only asserts the no-toolchain
		// path is reachable when node_modules/.bin/tsc is absent; it does not assert a $PATH tsc can
		// never be found, which is legitimately environment-dependent. It does assert that the status
		// is never 'spawn-error' for "no binary available" - that's a correctness requirement
		// (spawn-error means the binary existed and failed, never "cannot find one at all").
		fs.writeFileSync(path.join(testWorkspaceDir.fsPath, 'tsconfig.json'),
			JSON.stringify({ compilerOptions: { noEmit: true }, include: ['**/*.ts'] }));

		const realFile = URI.joinPath(testWorkspaceDir, 'a.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('export const x = 1;\n'));
		await shadowWorkspaceService.syncFileIntoShadow('no-tsc-thread', testWorkspaceDir, realFile);

		const result = await typeCheckService.typeCheckShadow('no-tsc-thread');
		assert.notStrictEqual(result.status, 'spawn-error');
	});
});
