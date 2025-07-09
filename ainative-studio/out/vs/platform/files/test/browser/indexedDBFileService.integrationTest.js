/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IndexedDB } from '../../../../base/browser/indexedDB.js';
import { bufferToReadable, bufferToStream, VSBuffer } from '../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { flakySuite } from '../../../../base/test/common/testUtils.js';
import { IndexedDBFileSystemProvider } from '../../browser/indexedDBFileSystemProvider.js';
import { FileSystemProviderErrorCode, FileType } from '../../common/files.js';
import { FileService } from '../../common/fileService.js';
import { NullLogService } from '../../../log/common/log.js';
flakySuite('IndexedDBFileSystemProvider', function () {
    let service;
    let userdataFileProvider;
    const testDir = '/';
    const userdataURIFromPaths = (paths) => joinPath(URI.from({ scheme: Schemas.vscodeUserData, path: testDir }), ...paths);
    const disposables = new DisposableStore();
    const initFixtures = async () => {
        await Promise.all([['fixtures', 'resolver', 'examples'],
            ['fixtures', 'resolver', 'other', 'deep'],
            ['fixtures', 'service', 'deep'],
            ['batched']]
            .map(path => userdataURIFromPaths(path))
            .map(uri => service.createFolder(uri)));
        await Promise.all([
            [['fixtures', 'resolver', 'examples', 'company.js'], 'class company {}'],
            [['fixtures', 'resolver', 'examples', 'conway.js'], 'export function conway() {}'],
            [['fixtures', 'resolver', 'examples', 'employee.js'], 'export const employee = "jax"'],
            [['fixtures', 'resolver', 'examples', 'small.js'], ''],
            [['fixtures', 'resolver', 'other', 'deep', 'company.js'], 'class company {}'],
            [['fixtures', 'resolver', 'other', 'deep', 'conway.js'], 'export function conway() {}'],
            [['fixtures', 'resolver', 'other', 'deep', 'employee.js'], 'export const employee = "jax"'],
            [['fixtures', 'resolver', 'other', 'deep', 'small.js'], ''],
            [['fixtures', 'resolver', 'index.html'], '<p>p</p>'],
            [['fixtures', 'resolver', 'site.css'], '.p {color: red;}'],
            [['fixtures', 'service', 'deep', 'company.js'], 'class company {}'],
            [['fixtures', 'service', 'deep', 'conway.js'], 'export function conway() {}'],
            [['fixtures', 'service', 'deep', 'employee.js'], 'export const employee = "jax"'],
            [['fixtures', 'service', 'deep', 'small.js'], ''],
            [['fixtures', 'service', 'binary.txt'], '<p>p</p>'],
        ]
            .map(([path, contents]) => [userdataURIFromPaths(path), contents])
            .map(([uri, contents]) => service.createFile(uri, VSBuffer.fromString(contents))));
    };
    const reload = async () => {
        const logService = new NullLogService();
        service = new FileService(logService);
        disposables.add(service);
        const indexedDB = await IndexedDB.create('vscode-web-db-test', 1, ['vscode-userdata-store', 'vscode-logs-store']);
        userdataFileProvider = new IndexedDBFileSystemProvider(Schemas.vscodeUserData, indexedDB, 'vscode-userdata-store', true);
        disposables.add(service.registerProvider(Schemas.vscodeUserData, userdataFileProvider));
        disposables.add(userdataFileProvider);
    };
    setup(async function () {
        this.timeout(15000);
        await reload();
    });
    teardown(async () => {
        await userdataFileProvider.reset();
        disposables.clear();
    });
    test('root is always present', async () => {
        assert.strictEqual((await userdataFileProvider.stat(userdataURIFromPaths([]))).type, FileType.Directory);
        await userdataFileProvider.delete(userdataURIFromPaths([]), { recursive: true, useTrash: false, atomic: false });
        assert.strictEqual((await userdataFileProvider.stat(userdataURIFromPaths([]))).type, FileType.Directory);
    });
    test('createFolder', async () => {
        let event;
        disposables.add(service.onDidRunOperation(e => event = e));
        const parent = await service.resolve(userdataURIFromPaths([]));
        const newFolderResource = joinPath(parent.resource, 'newFolder');
        assert.strictEqual((await userdataFileProvider.readdir(parent.resource)).length, 0);
        const newFolder = await service.createFolder(newFolderResource);
        assert.strictEqual(newFolder.name, 'newFolder');
        assert.strictEqual((await userdataFileProvider.readdir(parent.resource)).length, 1);
        assert.strictEqual((await userdataFileProvider.stat(newFolderResource)).type, FileType.Directory);
        assert.ok(event);
        assert.strictEqual(event.resource.path, newFolderResource.path);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.path, newFolderResource.path);
        assert.strictEqual(event.target.isDirectory, true);
    });
    test('createFolder: creating multiple folders at once', async () => {
        let event;
        disposables.add(service.onDidRunOperation(e => event = e));
        const multiFolderPaths = ['a', 'couple', 'of', 'folders'];
        const parent = await service.resolve(userdataURIFromPaths([]));
        const newFolderResource = joinPath(parent.resource, ...multiFolderPaths);
        const newFolder = await service.createFolder(newFolderResource);
        const lastFolderName = multiFolderPaths[multiFolderPaths.length - 1];
        assert.strictEqual(newFolder.name, lastFolderName);
        assert.strictEqual((await userdataFileProvider.stat(newFolderResource)).type, FileType.Directory);
        assert.ok(event);
        assert.strictEqual(event.resource.path, newFolderResource.path);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.path, newFolderResource.path);
        assert.strictEqual(event.target.isDirectory, true);
    });
    test('exists', async () => {
        let exists = await service.exists(userdataURIFromPaths([]));
        assert.strictEqual(exists, true);
        exists = await service.exists(userdataURIFromPaths(['hello']));
        assert.strictEqual(exists, false);
    });
    test('resolve - file', async () => {
        await initFixtures();
        const resource = userdataURIFromPaths(['fixtures', 'resolver', 'index.html']);
        const resolved = await service.resolve(resource);
        assert.strictEqual(resolved.name, 'index.html');
        assert.strictEqual(resolved.isFile, true);
        assert.strictEqual(resolved.isDirectory, false);
        assert.strictEqual(resolved.isSymbolicLink, false);
        assert.strictEqual(resolved.resource.toString(), resource.toString());
        assert.strictEqual(resolved.children, undefined);
        assert.ok(resolved.size > 0);
    });
    test('resolve - directory', async () => {
        await initFixtures();
        const testsElements = ['examples', 'other', 'index.html', 'site.css'];
        const resource = userdataURIFromPaths(['fixtures', 'resolver']);
        const result = await service.resolve(resource);
        assert.ok(result);
        assert.strictEqual(result.resource.toString(), resource.toString());
        assert.strictEqual(result.name, 'resolver');
        assert.ok(result.children);
        assert.ok(result.children.length > 0);
        assert.ok(result.isDirectory);
        assert.strictEqual(result.children.length, testsElements.length);
        assert.ok(result.children.every(entry => {
            return testsElements.some(name => {
                return basename(entry.resource) === name;
            });
        }));
        result.children.forEach(value => {
            assert.ok(basename(value.resource));
            if (['examples', 'other'].indexOf(basename(value.resource)) >= 0) {
                assert.ok(value.isDirectory);
                assert.strictEqual(value.mtime, undefined);
                assert.strictEqual(value.ctime, undefined);
            }
            else if (basename(value.resource) === 'index.html') {
                assert.ok(!value.isDirectory);
                assert.ok(!value.children);
                assert.strictEqual(value.mtime, undefined);
                assert.strictEqual(value.ctime, undefined);
            }
            else if (basename(value.resource) === 'site.css') {
                assert.ok(!value.isDirectory);
                assert.ok(!value.children);
                assert.strictEqual(value.mtime, undefined);
                assert.strictEqual(value.ctime, undefined);
            }
            else {
                assert.fail('Unexpected value ' + basename(value.resource));
            }
        });
    });
    test('createFile', async () => {
        return assertCreateFile(contents => VSBuffer.fromString(contents));
    });
    test('createFile (readable)', async () => {
        return assertCreateFile(contents => bufferToReadable(VSBuffer.fromString(contents)));
    });
    test('createFile (stream)', async () => {
        return assertCreateFile(contents => bufferToStream(VSBuffer.fromString(contents)));
    });
    async function assertCreateFile(converter) {
        let event;
        disposables.add(service.onDidRunOperation(e => event = e));
        const contents = 'Hello World';
        const resource = userdataURIFromPaths(['test.txt']);
        assert.strictEqual(await service.canCreateFile(resource), true);
        const fileStat = await service.createFile(resource, converter(contents));
        assert.strictEqual(fileStat.name, 'test.txt');
        assert.strictEqual((await userdataFileProvider.stat(fileStat.resource)).type, FileType.File);
        assert.strictEqual(new TextDecoder().decode(await userdataFileProvider.readFile(fileStat.resource)), contents);
        assert.ok(event);
        assert.strictEqual(event.resource.path, resource.path);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.path, resource.path);
    }
    const fileCreateBatchTester = (size, name) => {
        const batch = Array.from({ length: size }).map((_, i) => ({ contents: `Hello${i}`, resource: userdataURIFromPaths(['batched', name, `Hello${i}.txt`]) }));
        let creationPromises = undefined;
        return {
            async create() {
                return creationPromises = Promise.all(batch.map(entry => userdataFileProvider.writeFile(entry.resource, VSBuffer.fromString(entry.contents).buffer, { create: true, overwrite: true, unlock: false, atomic: false })));
            },
            async assertContentsCorrect() {
                if (!creationPromises) {
                    throw Error('read called before create');
                }
                await creationPromises;
                await Promise.all(batch.map(async (entry, i) => {
                    assert.strictEqual((await userdataFileProvider.stat(entry.resource)).type, FileType.File);
                    assert.strictEqual(new TextDecoder().decode(await userdataFileProvider.readFile(entry.resource)), entry.contents);
                }));
            }
        };
    };
    test('createFile - batch', async () => {
        const tester = fileCreateBatchTester(20, 'batch');
        await tester.create();
        await tester.assertContentsCorrect();
    });
    test('createFile - batch (mixed parallel/sequential)', async () => {
        const batch1 = fileCreateBatchTester(1, 'batch1');
        const batch2 = fileCreateBatchTester(20, 'batch2');
        const batch3 = fileCreateBatchTester(1, 'batch3');
        const batch4 = fileCreateBatchTester(20, 'batch4');
        batch1.create();
        batch2.create();
        await Promise.all([batch1.assertContentsCorrect(), batch2.assertContentsCorrect()]);
        batch3.create();
        batch4.create();
        await Promise.all([batch3.assertContentsCorrect(), batch4.assertContentsCorrect()]);
        await Promise.all([batch1.assertContentsCorrect(), batch2.assertContentsCorrect()]);
    });
    test('rename not existing resource', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        const targetFile = joinPath(parent.resource, 'targetFile');
        try {
            await service.move(sourceFile, targetFile, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.code, FileSystemProviderErrorCode.FileNotFound);
            return;
        }
        assert.fail('This should fail with error');
    });
    test('rename to an existing file without overwrite', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        await service.writeFile(sourceFile, VSBuffer.fromString('This is source file'));
        const targetFile = joinPath(parent.resource, 'targetFile');
        await service.writeFile(targetFile, VSBuffer.fromString('This is target file'));
        try {
            await service.move(sourceFile, targetFile, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.fileOperationResult, 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            return;
        }
        assert.fail('This should fail with error');
    });
    test('rename folder to an existing folder without overwrite', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        await service.createFolder(sourceFolder);
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        await service.createFolder(targetFolder);
        try {
            await service.move(sourceFolder, targetFolder, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.fileOperationResult, 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            return;
        }
        assert.fail('This should fail with cannot overwrite error');
    });
    test('rename file to a folder', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        await service.writeFile(sourceFile, VSBuffer.fromString('This is source file'));
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        await service.createFolder(targetFolder);
        try {
            await service.move(sourceFile, targetFolder, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.fileOperationResult, 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            return;
        }
        assert.fail('This should fail with error');
    });
    test('rename folder to a file', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFile');
        await service.createFolder(sourceFolder);
        const targetFile = joinPath(parent.resource, 'targetFile');
        await service.writeFile(targetFile, VSBuffer.fromString('This is target file'));
        try {
            await service.move(sourceFolder, targetFile, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.fileOperationResult, 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            return;
        }
        assert.fail('This should fail with error');
    });
    test('rename file', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        await service.writeFile(sourceFile, VSBuffer.fromString('This is source file'));
        const targetFile = joinPath(parent.resource, 'targetFile');
        await service.move(sourceFile, targetFile, false);
        const content = await service.readFile(targetFile);
        assert.strictEqual(await service.exists(sourceFile), false);
        assert.strictEqual(content.value.toString(), 'This is source file');
    });
    test('rename to an existing file with overwrite', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        const targetFile = joinPath(parent.resource, 'targetFile');
        await Promise.all([
            service.writeFile(sourceFile, VSBuffer.fromString('This is source file')),
            service.writeFile(targetFile, VSBuffer.fromString('This is target file'))
        ]);
        await service.move(sourceFile, targetFile, true);
        const content = await service.readFile(targetFile);
        assert.strictEqual(await service.exists(sourceFile), false);
        assert.strictEqual(content.value.toString(), 'This is source file');
    });
    test('rename folder to a new folder', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        await service.createFolder(sourceFolder);
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        await service.move(sourceFolder, targetFolder, false);
        assert.deepStrictEqual(await service.exists(sourceFolder), false);
        assert.deepStrictEqual(await service.exists(targetFolder), true);
    });
    test('rename folder to an existing folder', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        await service.createFolder(sourceFolder);
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        await service.createFolder(targetFolder);
        await service.move(sourceFolder, targetFolder, true);
        assert.deepStrictEqual(await service.exists(sourceFolder), false);
        assert.deepStrictEqual(await service.exists(targetFolder), true);
    });
    test('rename a folder that has multiple files and folders', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        const sourceFile1 = joinPath(sourceFolder, 'folder1', 'file1');
        const sourceFile2 = joinPath(sourceFolder, 'folder2', 'file1');
        const sourceEmptyFolder = joinPath(sourceFolder, 'folder3');
        await Promise.all([
            service.writeFile(sourceFile1, VSBuffer.fromString('Source File 1')),
            service.writeFile(sourceFile2, VSBuffer.fromString('Source File 2')),
            service.createFolder(sourceEmptyFolder)
        ]);
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        const targetFile1 = joinPath(targetFolder, 'folder1', 'file1');
        const targetFile2 = joinPath(targetFolder, 'folder2', 'file1');
        const targetEmptyFolder = joinPath(targetFolder, 'folder3');
        await service.move(sourceFolder, targetFolder, false);
        assert.deepStrictEqual(await service.exists(sourceFolder), false);
        assert.deepStrictEqual(await service.exists(targetFolder), true);
        assert.strictEqual((await service.readFile(targetFile1)).value.toString(), 'Source File 1');
        assert.strictEqual((await service.readFile(targetFile2)).value.toString(), 'Source File 2');
        assert.deepStrictEqual(await service.exists(targetEmptyFolder), true);
    });
    test('rename a folder to another folder that has some files', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        const sourceFile1 = joinPath(sourceFolder, 'folder1', 'file1');
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        const targetFile1 = joinPath(targetFolder, 'folder1', 'file1');
        const targetFile2 = joinPath(targetFolder, 'folder1', 'file2');
        const targetFile3 = joinPath(targetFolder, 'folder2', 'file1');
        await Promise.all([
            service.writeFile(sourceFile1, VSBuffer.fromString('Source File 1')),
            service.writeFile(targetFile2, VSBuffer.fromString('Target File 2')),
            service.writeFile(targetFile3, VSBuffer.fromString('Target File 3'))
        ]);
        await service.move(sourceFolder, targetFolder, true);
        assert.deepStrictEqual(await service.exists(sourceFolder), false);
        assert.deepStrictEqual(await service.exists(targetFolder), true);
        assert.strictEqual((await service.readFile(targetFile1)).value.toString(), 'Source File 1');
        assert.strictEqual(await service.exists(targetFile2), false);
        assert.strictEqual(await service.exists(targetFile3), false);
    });
    test('deleteFile', async () => {
        await initFixtures();
        let event;
        disposables.add(service.onDidRunOperation(e => event = e));
        const anotherResource = userdataURIFromPaths(['fixtures', 'service', 'deep', 'company.js']);
        const resource = userdataURIFromPaths(['fixtures', 'service', 'deep', 'conway.js']);
        const source = await service.resolve(resource);
        assert.strictEqual(await service.canDelete(source.resource, { useTrash: false }), true);
        await service.del(source.resource, { useTrash: false });
        assert.strictEqual(await service.exists(source.resource), false);
        assert.strictEqual(await service.exists(anotherResource), true);
        assert.ok(event);
        assert.strictEqual(event.resource.path, resource.path);
        assert.strictEqual(event.operation, 1 /* FileOperation.DELETE */);
        {
            let error = undefined;
            try {
                await service.del(source.resource, { useTrash: false });
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual(error.fileOperationResult, 1 /* FileOperationResult.FILE_NOT_FOUND */);
        }
        await reload();
        {
            let error = undefined;
            try {
                await service.del(source.resource, { useTrash: false });
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual(error.fileOperationResult, 1 /* FileOperationResult.FILE_NOT_FOUND */);
        }
    });
    test('deleteFolder (recursive)', async () => {
        await initFixtures();
        let event;
        disposables.add(service.onDidRunOperation(e => event = e));
        const resource = userdataURIFromPaths(['fixtures', 'service', 'deep']);
        const subResource1 = userdataURIFromPaths(['fixtures', 'service', 'deep', 'company.js']);
        const subResource2 = userdataURIFromPaths(['fixtures', 'service', 'deep', 'conway.js']);
        assert.strictEqual(await service.exists(subResource1), true);
        assert.strictEqual(await service.exists(subResource2), true);
        const source = await service.resolve(resource);
        assert.strictEqual(await service.canDelete(source.resource, { recursive: true, useTrash: false }), true);
        await service.del(source.resource, { recursive: true, useTrash: false });
        assert.strictEqual(await service.exists(source.resource), false);
        assert.strictEqual(await service.exists(subResource1), false);
        assert.strictEqual(await service.exists(subResource2), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, resource.fsPath);
        assert.strictEqual(event.operation, 1 /* FileOperation.DELETE */);
    });
    test('deleteFolder (non recursive)', async () => {
        await initFixtures();
        const resource = userdataURIFromPaths(['fixtures', 'service', 'deep']);
        const source = await service.resolve(resource);
        assert.ok((await service.canDelete(source.resource)) instanceof Error);
        let error;
        try {
            await service.del(source.resource);
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
    });
    test('delete empty folder', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const folder = joinPath(parent.resource, 'folder');
        await service.createFolder(folder);
        await service.del(folder);
        assert.deepStrictEqual(await service.exists(folder), false);
    });
    test('delete empty folder with reccursive', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const folder = joinPath(parent.resource, 'folder');
        await service.createFolder(folder);
        await service.del(folder, { recursive: true });
        assert.deepStrictEqual(await service.exists(folder), false);
    });
    test('deleteFolder with folders and files (recursive)', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        const file1 = joinPath(targetFolder, 'folder1', 'file1');
        await service.createFile(file1);
        const file2 = joinPath(targetFolder, 'folder2', 'file1');
        await service.createFile(file2);
        const emptyFolder = joinPath(targetFolder, 'folder3');
        await service.createFolder(emptyFolder);
        await service.del(targetFolder, { recursive: true });
        assert.deepStrictEqual(await service.exists(targetFolder), false);
        assert.deepStrictEqual(await service.exists(joinPath(targetFolder, 'folder1')), false);
        assert.deepStrictEqual(await service.exists(joinPath(targetFolder, 'folder2')), false);
        assert.deepStrictEqual(await service.exists(file1), false);
        assert.deepStrictEqual(await service.exists(file2), false);
        assert.deepStrictEqual(await service.exists(emptyFolder), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCRmlsZVNlcnZpY2UuaW50ZWdyYXRpb25UZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL3Rlc3QvYnJvd3Nlci9pbmRleGVkREJGaWxlU2VydmljZS5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBNEMsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6SSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRixPQUFPLEVBQXVHLDJCQUEyQixFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ25MLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFNUQsVUFBVSxDQUFDLDZCQUE2QixFQUFFO0lBRXpDLElBQUksT0FBb0IsQ0FBQztJQUN6QixJQUFJLG9CQUFpRCxDQUFDO0lBQ3RELE1BQU0s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LFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLE9BQU8sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFeEMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRXJELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbEUsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9