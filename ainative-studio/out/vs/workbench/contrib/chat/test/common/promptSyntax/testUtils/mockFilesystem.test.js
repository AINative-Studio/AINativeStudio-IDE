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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0ZpbGVzeXN0ZW0udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3Rlc3RVdGlscy9tb2NrRmlsZXN5c3RlbS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDOUYsT0FBTyxFQUFFLFlBQVksRUFBYSxNQUFNLHFEQUFxRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ3RILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFGQUFxRixDQUFDO0FBOEIvSDs7R0FFRztBQUNILE1BQU0sWUFBWSxHQUFHLEtBQUssRUFDekIsUUFBZ0IsRUFDaEIsWUFBMkIsRUFDM0IsV0FBeUIsRUFDeEIsRUFBRTtJQUNILElBQUksUUFBK0IsQ0FBQztJQUNwQyxJQUFJLENBQUM7UUFDSixRQUFRLEdBQUcsTUFBTSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixRQUFRLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsUUFBUSxDQUFDLElBQUksRUFDYixZQUFZLENBQUMsSUFBSSxFQUNqQixTQUFTLFFBQVEsNkJBQTZCLENBQzlDLENBQUM7SUFFRixNQUFNLENBQUMsZUFBZSxDQUNyQixRQUFRLENBQUMsUUFBUSxFQUNqQixZQUFZLENBQUMsUUFBUSxFQUNyQixTQUFTLFFBQVEsNEJBQTRCLENBQzdDLENBQUM7SUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixRQUFRLENBQUMsTUFBTSxFQUNmLFlBQVksQ0FBQyxNQUFNLEVBQ25CLFNBQVMsUUFBUSxxQ0FBcUMsQ0FDdEQsQ0FBQztJQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFFBQVEsQ0FBQyxXQUFXLEVBQ3BCLFlBQVksQ0FBQyxXQUFXLEVBQ3hCLFNBQVMsUUFBUSwwQ0FBMEMsQ0FDM0QsQ0FBQztJQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFFBQVEsQ0FBQyxjQUFjLEVBQ3ZCLFlBQVksQ0FBQyxjQUFjLEVBQzNCLFNBQVMsUUFBUSw2Q0FBNkMsQ0FDOUQsQ0FBQztJQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFFBQVEsQ0FBQyxRQUFRLEVBQ2pCLFNBQVMsRUFDVCxTQUFTLFFBQVEsMkJBQTJCLENBQzVDLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRyxNQUFNLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFlBQVksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQzdCLFlBQVksQ0FBQyxRQUFRLEVBQ3JCLFNBQVMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLCtCQUErQixDQUNwRSxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBRUY7O0dBRUc7QUFDSCxNQUFNLGNBQWMsR0FBRyxLQUFLLEVBQzNCLFVBQWtCLEVBQ2xCLGNBQStCLEVBQy9CLFdBQXlCLEVBQ3hCLEVBQUU7SUFDSCxJQUFJLFVBQWlDLENBQUM7SUFDdEMsSUFBSSxDQUFDO1FBQ0osVUFBVSxHQUFHLE1BQU0sV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsVUFBVSxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxJQUFJLEVBQ2YsY0FBYyxDQUFDLElBQUksRUFDbkIsV0FBVyxVQUFVLDZCQUE2QixDQUNsRCxDQUFDO0lBRUYsTUFBTSxDQUFDLGVBQWUsQ0FDckIsVUFBVSxDQUFDLFFBQVEsRUFDbkIsY0FBYyxDQUFDLFFBQVEsRUFDdkIsV0FBVyxVQUFVLDRCQUE0QixDQUNqRCxDQUFDO0lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLE1BQU0sRUFDakIsY0FBYyxDQUFDLE1BQU0sRUFDckIsV0FBVyxVQUFVLHFDQUFxQyxDQUMxRCxDQUFDO0lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFdBQVcsRUFDdEIsY0FBYyxDQUFDLFdBQVcsRUFDMUIsV0FBVyxVQUFVLDBDQUEwQyxDQUMvRCxDQUFDO0lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLGNBQWMsRUFDekIsY0FBYyxDQUFDLGNBQWMsRUFDN0IsV0FBVyxVQUFVLDZDQUE2QyxDQUNsRSxDQUFDO0lBRUYsYUFBYSxDQUNaLFVBQVUsQ0FBQyxRQUFRLEVBQ25CLFdBQVcsVUFBVSx1QkFBdUIsQ0FDNUMsQ0FBQztJQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUMxQixjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFDOUIsV0FBVyxVQUFVLHlDQUF5QyxDQUM5RCxDQUFDO0lBRUYsS0FBSyxNQUFNLGFBQWEsSUFBSSxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckQsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFFbkYsSUFBSSxVQUFVLElBQUksYUFBYSxFQUFFLENBQUM7WUFDakMsTUFBTSxjQUFjLENBQ25CLFNBQVMsRUFDVCxhQUFhLEVBQ2IsV0FBVyxDQUNYLENBQUM7WUFFRixTQUFTO1FBQ1YsQ0FBQztRQUVELE1BQU0sWUFBWSxDQUNqQixTQUFTLEVBQ1QsYUFBYSxFQUNiLFdBQVcsQ0FDWCxDQUFDO0lBQ0gsQ0FBQztBQUNGLENBQUMsQ0FBQztBQUVGLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxJQUFJLFdBQXFDLENBQUM7SUFDMUMsSUFBSSxXQUF5QixDQUFDO0lBQzlCLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUM5RCxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFFcEQsV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUM3RSxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUVoRixXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6QyxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRTtZQUNqRTtnQkFDQyxJQUFJLEVBQUUsY0FBYztnQkFDcEIsUUFBUSxFQUFFO29CQUNUO3dCQUNDLElBQUksRUFBRSxVQUFVO3dCQUNoQixRQUFRLEVBQUUsVUFBVTtxQkFDcEI7b0JBQ0Q7d0JBQ0MsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLFFBQVEsRUFBRTs0QkFDVDtnQ0FDQyxJQUFJLEVBQUUsU0FBUztnQ0FDZixRQUFRLEVBQUUsZ0JBQWdCOzZCQUMxQjs0QkFDRDtnQ0FDQyxJQUFJLEVBQUUsY0FBYztnQ0FDcEIsUUFBUSxFQUFFLFlBQVk7NkJBQ3RCOzRCQUNEO2dDQUNDLElBQUksRUFBRSxpQkFBaUI7Z0NBQ3ZCLFFBQVEsRUFBRSxZQUFZOzZCQUN0Qjt5QkFDRDtxQkFDRDtpQkFDRDthQUNEO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFNUI7O1dBRUc7UUFFSCxNQUFNLGNBQWMsQ0FDbkIsY0FBYyxFQUNkO1lBQ0MsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQ2xDLElBQUksRUFBRSxRQUFRO1lBQ2QsTUFBTSxFQUFFLEtBQUs7WUFDYixXQUFXLEVBQUUsSUFBSTtZQUNqQixjQUFjLEVBQUUsS0FBSztZQUNyQixRQUFRLEVBQUU7Z0JBQ1Q7b0JBQ0MsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUM7b0JBQzNDLElBQUksRUFBRSxVQUFVO29CQUNoQixNQUFNLEVBQUUsSUFBSTtvQkFDWixXQUFXLEVBQUUsS0FBSztvQkFDbEIsY0FBYyxFQUFFLEtBQUs7b0JBQ3JCLFFBQVEsRUFBRSxVQUFVO2lCQUNwQjtnQkFDRDtvQkFDQyxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQztvQkFDNUMsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLE1BQU0sRUFBRSxLQUFLO29CQUNiLFdBQVcsRUFBRSxJQUFJO29CQUNqQixjQUFjLEVBQUUsS0FBSztvQkFDckIsUUFBUSxFQUFFO3dCQUNUOzRCQUNDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDOzRCQUNwRCxJQUFJLEVBQUUsU0FBUzs0QkFDZixNQUFNLEVBQUUsSUFBSTs0QkFDWixXQUFXLEVBQUUsS0FBSzs0QkFDbEIsY0FBYyxFQUFFLEtBQUs7NEJBQ3JCLFFBQVEsRUFBRSxnQkFBZ0I7eUJBQzFCO3dCQUNEOzRCQUNDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDOzRCQUN6RCxJQUFJLEVBQUUsY0FBYzs0QkFDcEIsTUFBTSxFQUFFLElBQUk7NEJBQ1osV0FBVyxFQUFFLEtBQUs7NEJBQ2xCLGNBQWMsRUFBRSxLQUFLOzRCQUNyQixRQUFRLEVBQUUsWUFBWTt5QkFDdEI7d0JBQ0Q7NEJBQ0MsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLENBQUM7NEJBQzVELElBQUksRUFBRSxpQkFBaUI7NEJBQ3ZCLE1BQU0sRUFBRSxJQUFJOzRCQUNaLFdBQVcsRUFBRSxLQUFLOzRCQUNsQixjQUFjLEVBQUUsS0FBSzs0QkFDckIsUUFBUSxFQUFFLFlBQVk7eUJBQ3RCO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRCxFQUNELFdBQVcsQ0FDWCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9