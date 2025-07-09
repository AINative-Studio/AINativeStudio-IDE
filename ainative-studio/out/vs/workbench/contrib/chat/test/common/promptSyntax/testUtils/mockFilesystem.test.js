/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MockFilesystem } from './mockFilesystem.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
/**
 * Validates that file at {@link filePath} has expected attributes.
 */
const validateFile = async (filePath, expectedFile, fileService) => {
    let readFile;
    try {
        readFile = await fileService.resolve(URI.file(filePath));
    }
    catch (error) {
        throw new Error(`Failed to read file '${filePath}': ${error}.`);
    }
    assert.strictEqual(readFile.name, expectedFile.name, `File '${filePath}' must have correct 'name'.`);
    assert.deepStrictEqual(readFile.resource, expectedFile.resource, `File '${filePath}' must have correct 'URI'.`);
    assert.strictEqual(readFile.isFile, expectedFile.isFile, `File '${filePath}' must have correct 'isFile' value.`);
    assert.strictEqual(readFile.isDirectory, expectedFile.isDirectory, `File '${filePath}' must have correct 'isDirectory' value.`);
    assert.strictEqual(readFile.isSymbolicLink, expectedFile.isSymbolicLink, `File '${filePath}' must have correct 'isSymbolicLink' value.`);
    assert.strictEqual(readFile.children, undefined, `File '${filePath}' must not have children.`);
    const fileContents = await fileService.readFile(readFile.resource);
    assert.strictEqual(fileContents.value.toString(), expectedFile.contents, `File '${expectedFile.resource.fsPath}' must have correct contents.`);
};
/**
 * Validates that folder at {@link folderPath} has expected attributes.
 */
const validateFolder = async (folderPath, expectedFolder, fileService) => {
    let readFolder;
    try {
        readFolder = await fileService.resolve(URI.file(folderPath));
    }
    catch (error) {
        throw new Error(`Failed to read folder '${folderPath}': ${error}.`);
    }
    assert.strictEqual(readFolder.name, expectedFolder.name, `Folder '${folderPath}' must have correct 'name'.`);
    assert.deepStrictEqual(readFolder.resource, expectedFolder.resource, `Folder '${folderPath}' must have correct 'URI'.`);
    assert.strictEqual(readFolder.isFile, expectedFolder.isFile, `Folder '${folderPath}' must have correct 'isFile' value.`);
    assert.strictEqual(readFolder.isDirectory, expectedFolder.isDirectory, `Folder '${folderPath}' must have correct 'isDirectory' value.`);
    assert.strictEqual(readFolder.isSymbolicLink, expectedFolder.isSymbolicLink, `Folder '${folderPath}' must have correct 'isSymbolicLink' value.`);
    assertDefined(readFolder.children, `Folder '${folderPath}' must have children.`);
    assert.strictEqual(readFolder.children.length, expectedFolder.children.length, `Folder '${folderPath}' must have correct number of children.`);
    for (const expectedChild of expectedFolder.children) {
        const childPath = URI.joinPath(expectedFolder.resource, expectedChild.name).fsPath;
        if ('children' in expectedChild) {
            await validateFolder(childPath, expectedChild, fileService);
            continue;
        }
        await validateFile(childPath, expectedChild, fileService);
    }
};
suite('MockFilesystem', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let initService;
    let fileService;
    setup(async () => {
        initService = disposables.add(new TestInstantiationService());
        initService.stub(ILogService, new NullLogService());
        fileService = disposables.add(initService.createInstance(FileService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        initService.stub(IFileService, fileService);
    });
    test('• mocks file structure', async () => {
        const mockFilesystem = initService.createInstance(MockFilesystem, [
            {
                name: '/root/folder',
                children: [
                    {
                        name: 'file.txt',
                        contents: 'contents',
                    },
                    {
                        name: 'Subfolder',
                        children: [
                            {
                                name: 'test.ts',
                                contents: 'other contents',
                            },
                            {
                                name: 'file.test.ts',
                                contents: 'hello test',
                            },
                            {
                                name: '.file-2.TEST.ts',
                                contents: 'test hello',
                            },
                        ]
                    }
                ]
            }
        ]);
        await mockFilesystem.mock();
        /**
         * Validate files and folders next.
         */
        await validateFolder('/root/folder', {
            resource: URI.file('/root/folder'),
            name: 'folder',
            isFile: false,
            isDirectory: true,
            isSymbolicLink: false,
            children: [
                {
                    resource: URI.file('/root/folder/file.txt'),
                    name: 'file.txt',
                    isFile: true,
                    isDirectory: false,
                    isSymbolicLink: false,
                    contents: 'contents',
                },
                {
                    resource: URI.file('/root/folder/Subfolder'),
                    name: 'Subfolder',
                    isFile: false,
                    isDirectory: true,
                    isSymbolicLink: false,
                    children: [
                        {
                            resource: URI.file('/root/folder/Subfolder/test.ts'),
                            name: 'test.ts',
                            isFile: true,
                            isDirectory: false,
                            isSymbolicLink: false,
                            contents: 'other contents',
                        },
                        {
                            resource: URI.file('/root/folder/Subfolder/file.test.ts'),
                            name: 'file.test.ts',
                            isFile: true,
                            isDirectory: false,
                            isSymbolicLink: false,
                            contents: 'hello test',
                        },
                        {
                            resource: URI.file('/root/folder/Subfolder/.file-2.TEST.ts'),
                            name: '.file-2.TEST.ts',
                            isFile: true,
                            isDirectory: false,
                            isSymbolicLink: false,
                            contents: 'test hello',
                        },
                    ],
                }
            ],
        }, fileService);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0ZpbGVzeXN0ZW0udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC90ZXN0VXRpbHMvbW9ja0ZpbGVzeXN0ZW0udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxZQUFZLEVBQWEsTUFBTSxxREFBcUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxRkFBcUYsQ0FBQztBQThCL0g7O0dBRUc7QUFDSCxNQUFNLFlBQVksR0FBRyxLQUFLLEVBQ3pCLFFBQWdCLEVBQ2hCLFlBQTJCLEVBQzNCLFdBQXlCLEVBQ3hCLEVBQUU7SUFDSCxJQUFJLFFBQStCLENBQUM7SUFDcEMsSUFBSSxDQUFDO1FBQ0osUUFBUSxHQUFHLE1BQU0sV0FBVyxDQUFDLE9BQU8sQ0FBQyxH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