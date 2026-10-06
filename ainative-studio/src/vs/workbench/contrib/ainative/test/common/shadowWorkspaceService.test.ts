/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
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
});
