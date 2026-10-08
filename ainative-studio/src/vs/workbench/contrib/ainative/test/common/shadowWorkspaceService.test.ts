/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DiskFileSystemProvider } from '../../../../../platform/files/node/diskFileSystemProvider.js';
import { Schemas } from '../../../../../base/common/network.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ShadowWorkspaceService } from '../../common/shadowWorkspaceService.js';

suite('ShadowWorkspaceService Tests', () => {
	let service: ShadowWorkspaceService;
	let fileService: FileService;
	let disposables: DisposableStore;
	let testWorkspaceDir: URI;

	setup(async () => {
		disposables = new DisposableStore();

		const logService = new NullLogService();
		fileService = disposables.add(new FileService(logService));
		const diskProvider = disposables.add(new DiskFileSystemProvider(logService));
		fileService.registerProvider(Schemas.file, diskProvider);

		testWorkspaceDir = URI.file(path.join(tmpdir(), 'ainative-shadow-test-workspace-' + Date.now()));
		await fileService.createFolder(testWorkspaceDir);

		service = disposables.add(new ShadowWorkspaceService(fileService));
	});

	teardown(async () => {
		try {
			await fileService.del(testWorkspaceDir, { recursive: true });
		} catch {
			// ignore cleanup errors
		}
		disposables.dispose();
	});

	test('createShadowForThread allocates a real directory on disk', async () => {
		const shadow = await service.createShadowForThread('thread-1');
		assert.ok(shadow.rootUri);
		const exists = await fileService.exists(shadow.rootUri);
		assert.strictEqual(exists, true);
	});

	test('createShadowForThread is idempotent per threadId', async () => {
		const first = await service.createShadowForThread('thread-2');
		const second = await service.createShadowForThread('thread-2');
		assert.strictEqual(first.rootUri.toString(), second.rootUri.toString());
	});

	test('different threads get different shadow roots', async () => {
		const a = await service.createShadowForThread('thread-a');
		const b = await service.createShadowForThread('thread-b');
		assert.notStrictEqual(a.rootUri.toString(), b.rootUri.toString());
	});

	test('getShadowForThread returns undefined before creation', () => {
		assert.strictEqual(service.getShadowForThread('never-created'), undefined);
	});

	test('syncFileIntoShadow copies real file content into the shadow tree', async () => {
		const realFile = URI.joinPath(testWorkspaceDir, 'src', 'foo.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('export const x = 1;'));

		const shadowUri = await service.syncFileIntoShadow('thread-3', testWorkspaceDir, realFile);

		const shadowContent = await fileService.readFile(shadowUri);
		assert.strictEqual(shadowContent.value.toString(), 'export const x = 1;');

		// relative structure under the workspace folder name is preserved
		assert.ok(shadowUri.fsPath.includes(path.join(path.basename(testWorkspaceDir.fsPath), 'src', 'foo.ts')));
	});

	test('syncFileIntoShadow creates the shadow workspace implicitly if needed', async () => {
		const realFile = URI.joinPath(testWorkspaceDir, 'bar.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('bar'));

		assert.strictEqual(service.getShadowForThread('thread-4'), undefined);
		await service.syncFileIntoShadow('thread-4', testWorkspaceDir, realFile);
		assert.notStrictEqual(service.getShadowForThread('thread-4'), undefined);
	});

	test('syncFileIntoShadow does not re-copy an already-synced file unless forced', async () => {
		const realFile = URI.joinPath(testWorkspaceDir, 'baz.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('v1'));

		const shadowUri = await service.syncFileIntoShadow('thread-5', testWorkspaceDir, realFile);
		// mutate the shadow copy directly, simulating an agent edit that hasn't been promoted
		await fileService.writeFile(shadowUri, VSBuffer.fromString('agent-edited'));

		// real file changes, but re-syncing without force should leave the shadow edit alone
		await fileService.writeFile(realFile, VSBuffer.fromString('v2'));
		await service.syncFileIntoShadow('thread-5', testWorkspaceDir, realFile);
		const unforced = await fileService.readFile(shadowUri);
		assert.strictEqual(unforced.value.toString(), 'agent-edited');

		// forcing re-sync should overwrite with the latest real content
		await service.syncFileIntoShadow('thread-5', testWorkspaceDir, realFile, { force: true });
		const forced = await fileService.readFile(shadowUri);
		assert.strictEqual(forced.value.toString(), 'v2');
	});

	test('syncFileIntoShadow tolerates a real file that does not exist yet', async () => {
		const notYetCreated = URI.joinPath(testWorkspaceDir, 'new-file.ts');
		const shadowUri = await service.syncFileIntoShadow('thread-6', testWorkspaceDir, notYetCreated);
		const exists = await fileService.exists(shadowUri);
		assert.strictEqual(exists, false);
	});

	test('shadowUriFor throws for a file outside the workspace root', async () => {
		await service.createShadowForThread('thread-7');
		const outsideFile = URI.file(path.join(tmpdir(), 'completely-elsewhere.ts'));
		assert.throws(() => service.shadowUriFor('thread-7', testWorkspaceDir, outsideFile));
	});

	test('disposeShadow deletes the directory and forgets the thread', async () => {
		const shadow = await service.createShadowForThread('thread-8');
		await service.disposeShadow('thread-8');

		const exists = await fileService.exists(shadow.rootUri);
		assert.strictEqual(exists, false);
		assert.strictEqual(service.getShadowForThread('thread-8'), undefined);
	});

	test('disposeShadow is a no-op for a thread with no shadow workspace', async () => {
		await service.disposeShadow('never-existed'); // should not throw
	});

	test('diffShadowAgainstReal returns an empty array for a thread with no shadow workspace', async () => {
		const diffs = await service.diffShadowAgainstReal('never-created-for-diff');
		assert.deepStrictEqual(diffs, []);
	});

	test('diffShadowAgainstReal reports unchanged for a synced file nobody has touched since', async () => {
		const realFile = URI.joinPath(testWorkspaceDir, 'unchanged.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('same content'));
		await service.syncFileIntoShadow('thread-diff-1', testWorkspaceDir, realFile);

		const diffs = await service.diffShadowAgainstReal('thread-diff-1');
		assert.strictEqual(diffs.length, 1);
		assert.strictEqual(diffs[0].kind, 'unchanged');
		assert.strictEqual(diffs[0].realContent, 'same content');
		assert.strictEqual(diffs[0].shadowContent, 'same content');
		assert.strictEqual(diffs[0].conflict, false);
	});

	test('diffShadowAgainstReal reports modified when the shadow copy was edited', async () => {
		const realFile = URI.joinPath(testWorkspaceDir, 'edited.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('original'));
		const shadowUri = await service.syncFileIntoShadow('thread-diff-2', testWorkspaceDir, realFile);

		// simulate an agent edit landing in the shadow tree, real file untouched
		await fileService.writeFile(shadowUri, VSBuffer.fromString('agent rewrote this'));

		const diffs = await service.diffShadowAgainstReal('thread-diff-2');
		assert.strictEqual(diffs.length, 1);
		assert.strictEqual(diffs[0].kind, 'modified');
		assert.strictEqual(diffs[0].realContent, 'original');
		assert.strictEqual(diffs[0].shadowContent, 'agent rewrote this');
		// the real file itself was never touched after syncing - only the shadow copy changed, which
		// is the expected, non-conflicting case.
		assert.strictEqual(diffs[0].conflict, false);
	});

	test('diffShadowAgainstReal reports added for a file the agent created only in the shadow tree', async () => {
		const newFile = URI.joinPath(testWorkspaceDir, 'brand-new.ts');
		// sync a not-yet-existing file (same pattern as the "tolerates a real file that does not
		// exist yet" test above), then have the agent write it into the shadow tree directly
		const shadowUri = await service.syncFileIntoShadow('thread-diff-3', testWorkspaceDir, newFile);
		await fileService.writeFile(shadowUri, VSBuffer.fromString('export const brandNew = true;'));

		const diffs = await service.diffShadowAgainstReal('thread-diff-3');
		assert.strictEqual(diffs.length, 1);
		assert.strictEqual(diffs[0].kind, 'added');
		assert.strictEqual(diffs[0].realContent, undefined);
		assert.strictEqual(diffs[0].shadowContent, 'export const brandNew = true;');
	});

	test('diffShadowAgainstReal reports deleted for a file removed from the shadow tree after syncing', async () => {
		const realFile = URI.joinPath(testWorkspaceDir, 'to-be-shadow-deleted.ts');
		await fileService.writeFile(realFile, VSBuffer.fromString('still here on disk'));
		const shadowUri = await service.syncFileIntoShadow('thread-diff-4', testWorkspaceDir, realFile);

		// simulate an agent deleting the file as part of its edit, directly in the shadow tree
		await fileService.del(shadowUri);

		const diffs = await service.diffShadowAgainstReal('thread-diff-4');
		assert.strictEqual(diffs.length, 1);
		assert.strictEqual(diffs[0].kind, 'deleted');
		assert.strictEqual(diffs[0].realContent, 'still here on disk');
		assert.strictEqual(diffs[0].shadowContent, undefined);
	});

	test('diffShadowAgainstReal only reports files that were actually synced, not the whole tree', async () => {
		const syncedFile = URI.joinPath(testWorkspaceDir, 'synced.ts');
		const untouchedFile = URI.joinPath(testWorkspaceDir, 'never-synced.ts');
		await fileService.writeFile(syncedFile, VSBuffer.fromString('a'));
		await fileService.writeFile(untouchedFile, VSBuffer.fromString('b'));

		await service.syncFileIntoShadow('thread-diff-5', testWorkspaceDir, syncedFile);

		const diffs = await service.diffShadowAgainstReal('thread-diff-5');
		assert.strictEqual(diffs.length, 1);
		assert.strictEqual(diffs[0].realUri.toString(), syncedFile.toString());
	});

	test('diffShadowAgainstReal preserves sync order across multiple files', async () => {
		const fileA = URI.joinPath(testWorkspaceDir, 'a-first.ts');
		const fileB = URI.joinPath(testWorkspaceDir, 'b-second.ts');
		const fileC = URI.joinPath(testWorkspaceDir, 'c-third.ts');
		await fileService.writeFile(fileA, VSBuffer.fromString('a'));
		await fileService.writeFile(fileB, VSBuffer.fromString('b'));
		await fileService.writeFile(fileC, VSBuffer.fromString('c'));

		// sync out of alphabetical order to prove this is insertion order, not a sort
		await service.syncFileIntoShadow('thread-diff-6', testWorkspaceDir, fileC);
		await service.syncFileIntoShadow('thread-diff-6', testWorkspaceDir, fileA);
		await service.syncFileIntoShadow('thread-diff-6', testWorkspaceDir, fileB);

		const diffs = await service.diffShadowAgainstReal('thread-diff-6');
		assert.deepStrictEqual(diffs.map(d => d.realUri.toString()), [fileC.toString(), fileA.toString(), fileB.toString()]);
	});

	suite('ensureNodeModulesLinked', () => {
		test('symlinks the real node_modules into the shadow workspace-folder root', async () => {
			const realNodeModules = path.join(testWorkspaceDir.fsPath, 'node_modules');
			fs.mkdirSync(path.join(realNodeModules, 'left-pad'), { recursive: true });
			fs.writeFileSync(path.join(realNodeModules, 'left-pad', 'index.js'), 'module.exports = {};');

			await service.ensureNodeModulesLinked('thread-nm-1', testWorkspaceDir);

			const shadow = service.getShadowForThread('thread-nm-1')!;
			const shadowNodeModules = path.join(shadow.rootUri.fsPath, path.basename(testWorkspaceDir.fsPath), 'node_modules');

			const stat = fs.lstatSync(shadowNodeModules);
			assert.strictEqual(stat.isSymbolicLink(), true);
			assert.strictEqual(fs.realpathSync(shadowNodeModules), fs.realpathSync(realNodeModules));

			// the link must actually resolve to real package contents, not just exist as a dangling path
			const linkedPkg = fs.readFileSync(path.join(shadowNodeModules, 'left-pad', 'index.js'), 'utf8');
			assert.strictEqual(linkedPkg, 'module.exports = {};');
		});

		test('finds node_modules in a parent directory when the workspace root has none of its own', async () => {
			// monorepo shape: node_modules hoisted to a directory above the workspace root being
			// shadowed (e.g. a package inside a yarn/npm/pnpm workspace)
			const monorepoRoot = URI.file(path.join(tmpdir(), 'ainative-shadow-nm-monorepo-' + Date.now()));
			const packageDir = URI.joinPath(monorepoRoot, 'packages', 'app');
			await fileService.createFolder(packageDir);
			fs.mkdirSync(path.join(monorepoRoot.fsPath, 'node_modules', 'shared-dep'), { recursive: true });
			fs.writeFileSync(path.join(monorepoRoot.fsPath, 'node_modules', 'shared-dep', 'index.js'), 'hoisted');

			try {
				await service.ensureNodeModulesLinked('thread-nm-2', packageDir);

				const shadow = service.getShadowForThread('thread-nm-2')!;
				const shadowNodeModules = path.join(shadow.rootUri.fsPath, path.basename(packageDir.fsPath), 'node_modules');
				const stat = fs.lstatSync(shadowNodeModules);
				assert.strictEqual(stat.isSymbolicLink(), true);

				const linkedPkg = fs.readFileSync(path.join(shadowNodeModules, 'shared-dep', 'index.js'), 'utf8');
				assert.strictEqual(linkedPkg, 'hoisted');
			} finally {
				await fileService.del(monorepoRoot, { recursive: true, useTrash: false }).catch(() => { });
			}
		});

		test('is a no-op when no node_modules exists anywhere above the workspace root', async () => {
			// testWorkspaceDir sits directly under the OS temp dir by construction, with no
			// node_modules anywhere above it (and tmpdir() itself certainly has none) - should not throw.
			await service.ensureNodeModulesLinked('thread-nm-3', testWorkspaceDir);

			const shadow = service.getShadowForThread('thread-nm-3')!;
			const shadowNodeModules = path.join(shadow.rootUri.fsPath, path.basename(testWorkspaceDir.fsPath), 'node_modules');
			assert.strictEqual(fs.existsSync(shadowNodeModules), false);
		});

		test('is idempotent: calling twice does not throw or replace an existing link', async () => {
			fs.mkdirSync(path.join(testWorkspaceDir.fsPath, 'node_modules'), { recursive: true });

			await service.ensureNodeModulesLinked('thread-nm-4', testWorkspaceDir);
			// second call must not throw (e.g. EEXIST from re-symlinking the same path)
			await service.ensureNodeModulesLinked('thread-nm-4', testWorkspaceDir);

			const shadow = service.getShadowForThread('thread-nm-4')!;
			const shadowNodeModules = path.join(shadow.rootUri.fsPath, path.basename(testWorkspaceDir.fsPath), 'node_modules');
			assert.strictEqual(fs.lstatSync(shadowNodeModules).isSymbolicLink(), true);
		});

		test('creates the shadow workspace implicitly if one does not exist yet', async () => {
			fs.mkdirSync(path.join(testWorkspaceDir.fsPath, 'node_modules'), { recursive: true });

			assert.strictEqual(service.getShadowForThread('thread-nm-5'), undefined);
			await service.ensureNodeModulesLinked('thread-nm-5', testWorkspaceDir);
			assert.notStrictEqual(service.getShadowForThread('thread-nm-5'), undefined);
		});

		test('does not clobber a real (non-symlink) node_modules directory already in the shadow tree', async () => {
			fs.mkdirSync(path.join(testWorkspaceDir.fsPath, 'node_modules'), { recursive: true });

			const shadow = await service.createShadowForThread('thread-nm-6');
			const shadowWorkspaceFolder = path.join(shadow.rootUri.fsPath, path.basename(testWorkspaceDir.fsPath));
			const shadowNodeModules = path.join(shadowWorkspaceFolder, 'node_modules');
			fs.mkdirSync(shadowNodeModules, { recursive: true });
			fs.writeFileSync(path.join(shadowNodeModules, 'sentinel.txt'), 'do not touch');

			await service.ensureNodeModulesLinked('thread-nm-6', testWorkspaceDir);

			const stat = fs.lstatSync(shadowNodeModules);
			assert.strictEqual(stat.isSymbolicLink(), false);
			assert.strictEqual(fs.readFileSync(path.join(shadowNodeModules, 'sentinel.txt'), 'utf8'), 'do not touch');
		});
	});

	// #159 phase 2 bullet 3 (design doc §4 "Real file changes underneath a shadow copy"): FileDiff.conflict.
	suite('conflict detection (FileDiff.conflict)', () => {
		test('no conflict when only the shadow copy changes after sync', async () => {
			const realFile = URI.joinPath(testWorkspaceDir, 'only-shadow-changes.ts');
			await fileService.writeFile(realFile, VSBuffer.fromString('v1'));
			const shadowUri = await service.syncFileIntoShadow('thread-conflict-1', testWorkspaceDir, realFile);
			await fileService.writeFile(shadowUri, VSBuffer.fromString('agent edit'));

			const [diff] = await service.diffShadowAgainstReal('thread-conflict-1');
			assert.strictEqual(diff.kind, 'modified');
			assert.strictEqual(diff.conflict, false);
		});

		test('conflict when the real file changes after sync while the shadow copy also changes', async () => {
			const realFile = URI.joinPath(testWorkspaceDir, 'both-change.ts');
			await fileService.writeFile(realFile, VSBuffer.fromString('v1'));
			const shadowUri = await service.syncFileIntoShadow('thread-conflict-2', testWorkspaceDir, realFile);

			// the agent edits its shadow copy...
			await fileService.writeFile(shadowUri, VSBuffer.fromString('agent edit'));
			// ...while the user independently edits the real file (e.g. directly in their editor)
			await fileService.writeFile(realFile, VSBuffer.fromString('user edit'));

			const [diff] = await service.diffShadowAgainstReal('thread-conflict-2');
			assert.strictEqual(diff.kind, 'modified');
			assert.strictEqual(diff.conflict, true);
			// realContent must reflect the CURRENT real file (the user's edit), not the stale baseline
			assert.strictEqual(diff.realContent, 'user edit');
		});

		test('conflict when the real file changes after sync but the shadow copy does not', async () => {
			// the real file drifting is itself the conflict, even if the agent never touched its own
			// shadow copy at all this turn - e.g. a git checkout touching a file nobody in this thread
			// has edited yet.
			const realFile = URI.joinPath(testWorkspaceDir, 'real-only-changes.ts');
			await fileService.writeFile(realFile, VSBuffer.fromString('v1'));
			await service.syncFileIntoShadow('thread-conflict-3', testWorkspaceDir, realFile);

			await fileService.writeFile(realFile, VSBuffer.fromString('v2 - changed outside the shadow flow'));

			const [diff] = await service.diffShadowAgainstReal('thread-conflict-3');
			// kind is 'unchanged' because shadow-vs-CURRENT-real happen to read identically here? No -
			// shadow still has 'v1' (what was synced), real now has 'v2', so this is still 'modified'
			// from diffShadowAgainstReal's kind perspective too; asserting both explicitly to pin the
			// distinction between `kind` (shadow vs current real) and `conflict` (current real vs
			// baseline real).
			assert.strictEqual(diff.kind, 'modified');
			assert.strictEqual(diff.conflict, true);
		});

		test('conflict when the real file is deleted after sync', async () => {
			const realFile = URI.joinPath(testWorkspaceDir, 'real-deleted-after-sync.ts');
			await fileService.writeFile(realFile, VSBuffer.fromString('v1'));
			await service.syncFileIntoShadow('thread-conflict-4', testWorkspaceDir, realFile);

			await fileService.del(realFile);

			const [diff] = await service.diffShadowAgainstReal('thread-conflict-4');
			// the shadow tree still has the 'v1' content synced earlier, and the real file is now gone
			// - from diffShadowAgainstReal's shadow-vs-current-real perspective that's 'added' (shadow
			// has it, real doesn't), NOT 'deleted' ('deleted' is the real-has-it/shadow-doesn't case,
			// e.g. an agent deleting its own shadow copy - see the dedicated 'deleted' test above).
			// This is exactly the distinction `conflict` exists to capture: `kind` alone can't tell you
			// "the real file disappeared out from under the shadow copy" from "the agent is creating a
			// brand new file" - both look identical from the current-state comparison; only comparing
			// against the recorded baseline (realContent existed at sync, is gone now) reveals it.
			assert.strictEqual(diff.kind, 'added');
			assert.strictEqual(diff.conflict, true);
		});

		test('conflict when a real file appears after sync for a file that did not exist yet', async () => {
			// agent is about to create a brand-new file; meanwhile the user (or some other process)
			// independently creates a real file at that same path before the agent's shadow edit is
			// promoted - this is the "added" case's analogue of the conflict, going the other direction.
			const newFile = URI.joinPath(testWorkspaceDir, 'appears-after-sync.ts');
			const shadowUri = await service.syncFileIntoShadow('thread-conflict-5', testWorkspaceDir, newFile);
			await fileService.writeFile(shadowUri, VSBuffer.fromString('agent-created content'));

			// simulate something else creating the real file after the shadow sync captured "nothing"
			await fileService.writeFile(newFile, VSBuffer.fromString('someone else created this'));

			const [diff] = await service.diffShadowAgainstReal('thread-conflict-5');
			assert.strictEqual(diff.kind, 'modified'); // both now exist with different content
			assert.strictEqual(diff.conflict, true);
		});

		test('forcing a re-sync accepts the latest real content as the new baseline (no conflict afterward)', async () => {
			const realFile = URI.joinPath(testWorkspaceDir, 'resync-resets-baseline.ts');
			await fileService.writeFile(realFile, VSBuffer.fromString('v1'));
			await service.syncFileIntoShadow('thread-conflict-6', testWorkspaceDir, realFile);

			await fileService.writeFile(realFile, VSBuffer.fromString('v2 - the real file moved on'));
			// before re-sync: a conflict, since the real file diverged from the v1 baseline
			const beforeResync = await service.diffShadowAgainstReal('thread-conflict-6');
			assert.strictEqual(beforeResync[0].conflict, true);

			// force re-sync deliberately re-baselines against the latest real content
			await service.syncFileIntoShadow('thread-conflict-6', testWorkspaceDir, realFile, { force: true });
			const afterResync = await service.diffShadowAgainstReal('thread-conflict-6');
			assert.strictEqual(afterResync[0].conflict, false);
			assert.strictEqual(afterResync[0].kind, 'unchanged');
		});

		test('no conflict for a file nobody has touched on either side since sync', async () => {
			const realFile = URI.joinPath(testWorkspaceDir, 'nobody-touched.ts');
			await fileService.writeFile(realFile, VSBuffer.fromString('stable'));
			await service.syncFileIntoShadow('thread-conflict-7', testWorkspaceDir, realFile);

			const [diff] = await service.diffShadowAgainstReal('thread-conflict-7');
			assert.strictEqual(diff.kind, 'unchanged');
			assert.strictEqual(diff.conflict, false);
		});
	});
});
