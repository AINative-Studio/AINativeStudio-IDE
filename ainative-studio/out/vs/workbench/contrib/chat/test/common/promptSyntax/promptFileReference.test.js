/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { URI } from '../../../../../../base/common/uri.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { extUri } from '../../../../../../base/common/resources.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { MockFilesystem } from './testUtils/mockFilesystem.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../platform/files/common/fileService.js';
import { NullPolicyService } from '../../../../../../platform/policy/common/policy.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { FileReference } from '../../../common/promptSyntax/codecs/tokens/fileReference.js';
import { FilePromptParser } from '../../../common/promptSyntax/parsers/filePromptParser.js';
import { waitRandom, randomBoolean } from '../../../../../../base/test/common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ConfigurationService } from '../../../../../../platform/configuration/common/configurationService.js';
import { InMemoryFileSystemProvider } from '../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NotPromptFile, RecursiveReference, OpenFailed, FolderReference } from '../../../common/promptFileReferenceErrors.js';
/**
 * Represents a file reference with an expected
 * error condition value for testing purposes.
 */
class ExpectedReference {
    constructor(dirname, lineToken, errorCondition) {
        this.lineToken = lineToken;
        this.errorCondition = errorCondition;
        this.uri = extUri.resolvePath(dirname, lineToken.path);
    }
    /**
     * String representation of the expected reference.
     */
    toString() {
        return `file-prompt:${this.uri.path}`;
    }
}
/**
 * A reusable test utility to test the `PromptFileReference` class.
 */
let TestPromptFileReference = class TestPromptFileReference extends Disposable {
    constructor(fileStructure, rootFileUri, expectedReferences, fileService, initService) {
        super();
        this.fileStructure = fileStructure;
        this.rootFileUri = rootFileUri;
        this.expectedReferences = expectedReferences;
        this.fileService = fileService;
        this.initService = initService;
        // create in-memory file system
        const fileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(this.fileService.registerProvider(Schemas.file, fileSystemProvider));
    }
    /**
     * Run the test.
     */
    async run() {
        // create the files structure on the disk
        await (this.initService.createInstance(MockFilesystem, this.fileStructure)).mock();
        // randomly test with and without delay to ensure that the file
        // reference resolution is not susceptible to race conditions
        if (randomBoolean()) {
            await waitRandom(5);
        }
        // start resolving references for the specified root file
        const rootReference = this._register(this.initService.createInstance(FilePromptParser, this.rootFileUri, [])).start();
        // wait until entire prompts tree is resolved
        await rootReference.allSettled();
        // resolve the root file reference including all nested references
        const resolvedReferences = rootReference.allReferences;
        for (let i = 0; i < this.expectedReferences.length; i++) {
            const expectedReference = this.expectedReferences[i];
            const resolvedReference = resolvedReferences[i];
            assert((resolvedReference) &&
                (resolvedReference.uri.toString() === expectedReference.uri.toString()), [
                `Expected ${i}th resolved reference URI to be '${expectedReference.uri}'`,
                `got '${resolvedReference?.uri}'.`,
            ].join(', '));
            if (expectedReference.errorCondition === undefined) {
                assert(resolvedReference.errorCondition === undefined, [
                    `Expected ${i}th error condition to be 'undefined'`,
                    `got '${resolvedReference.errorCondition}'.`,
                ].join(', '));
                continue;
            }
            assert(expectedReference.errorCondition.equal(resolvedReference.errorCondition), [
                `Expected ${i}th error condition to be '${expectedReference.errorCondition}'`,
                `got '${resolvedReference.errorCondition}'.`,
            ].join(', '));
        }
        assert.strictEqual(resolvedReferences.length, this.expectedReferences.length, [
            `\nExpected(${this.expectedReferences.length}): [\n ${this.expectedReferences.join('\n ')}\n]`,
            `Received(${resolvedReferences.length}): [\n ${resolvedReferences.join('\n ')}\n]`,
        ].join('\n'));
    }
};
TestPromptFileReference = __decorate([
    __param(3, IFileService),
    __param(4, IInstantiationService)
], TestPromptFileReference);
/**
 * Create expected file reference for testing purposes.
 *
 * Note! This utility also use for `markdown links` at the moment.
 *
 * @param filePath The expected path of the file reference (without the `#file:` prefix).
 * @param lineNumber The expected line number of the file reference.
 * @param startColumnNumber The expected start column number of the file reference.
 */
const createTestFileReference = (filePath, lineNumber, startColumnNumber) => {
    const range = new Range(lineNumber, startColumnNumber, lineNumber, startColumnNumber + `#file:${filePath}`.length);
    return new FileReference(range, filePath);
};
suite('PromptFileReference (Unix)', function () {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        const nullPolicyService = new NullPolicyService();
        const nullLogService = testDisposables.add(new NullLogService());
        const nullFileService = testDisposables.add(new FileService(nullLogService));
        const nullConfigService = testDisposables.add(new ConfigurationService(URI.file('/config.json'), nullFileService, nullPolicyService, nullLogService));
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IFileService, nullFileService);
        instantiationService.stub(ILogService, nullLogService);
        instantiationService.stub(IConfigurationService, nullConfigService);
    });
    test('• resolves nested file references', async function () {
        if (isWindows) {
            this.skip();
        }
        const rootFolderName = 'resolves-nested-file-references';
        const rootFolder = `/${rootFolderName}`;
        const rootUri = URI.file(rootFolder);
        const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
        /**
         * The file structure to be created on the disk for the test.
         */
        [{
                name: rootFolderName,
                children: [
                    {
                        name: 'file1.prompt.md',
                        contents: '## Some Header\nsome contents\n ',
                    },
                    {
                        name: 'file2.prompt.md',
                        contents: '## Files\n\t- this file #file:folder1/file3.prompt.md \n\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!\n ',
                    },
                    {
                        name: 'folder1',
                        children: [
                            {
                                name: 'file3.prompt.md',
                                contents: `\n[](./some-other-folder/non-existing-folder)\n\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md contents\n some more\t content`,
                            },
                            {
                                name: 'some-other-folder',
                                children: [
                                    {
                                        name: 'file4.prompt.md',
                                        contents: 'this file has a non-existing #file:./some-non-existing/file.prompt.md\t\treference\n\n\nand some\n non-prompt #file:./some-non-prompt-file.md\t\t \t[](../../folder1/)\t',
                                    },
                                    {
                                        name: 'file.txt',
                                        contents: 'contents of a non-prompt-snippet file',
                                    },
                                    {
                                        name: 'yetAnotherFolder🤭',
                                        children: [
                                            {
                                                name: 'another-file.prompt.md',
                                                contents: `[](${rootFolder}/folder1/some-other-folder)\nanother-file.prompt.md contents\t [#file:file.txt](../file.txt)`,
                                            },
                                            {
                                                name: 'one_more_file_just_in_case.prompt.md',
                                                contents: 'one_more_file_just_in_case.prompt.md contents',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }], 
        /**
         * The root file path to start the resolve process from.
         */
        URI.file(`/${rootFolderName}/file2.prompt.md`), 
        /**
         * The expected references to be resolved.
         */
        [
            new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 2, 14)),
            new ExpectedReference(URI.joinPath(rootUri, './folder1'), createTestFileReference(`./some-other-folder/non-existing-folder`, 2, 1), new OpenFailed(URI.joinPath(rootUri, './folder1/some-other-folder/non-existing-folder'), 'Reference to non-existing file cannot be opened.')),
            new ExpectedReference(URI.joinPath(rootUri, './folder1'), createTestFileReference(`/${rootFolderName}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md`, 3, 26)),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('.', 1, 1), new FolderReference(URI.joinPath(rootUri, './folder1/some-other-folder'), 'This folder is not a prompt file!')),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder/yetAnotherFolder🤭'), createTestFileReference('../file.txt', 2, 35), new NotPromptFile(URI.joinPath(rootUri, './folder1/some-other-folder/file.txt'), 'Ughh oh, that is not a prompt file!')),
            new ExpectedReference(rootUri, createTestFileReference('./folder1/some-other-folder/file4.prompt.md', 3, 14)),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('./some-non-existing/file.prompt.md', 1, 30), new OpenFailed(URI.joinPath(rootUri, './folder1/some-other-folder/some-non-existing/file.prompt.md'), 'Failed to open non-existring prompt snippets file')),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('./some-non-prompt-file.md', 5, 13), new OpenFailed(URI.joinPath(rootUri, './folder1/some-other-folder/some-non-prompt-file.md'), 'Oh no!')),
            new ExpectedReference(URI.joinPath(rootUri, './some-other-folder/folder1'), createTestFileReference('../../folder1', 5, 48), new FolderReference(URI.joinPath(rootUri, './folder1'), 'Uggh ohh!')),
        ]));
        await test.run();
    });
    test('• does not fall into infinite reference recursion', async function () {
        if (isWindows) {
            this.skip();
        }
        const rootFolderName = 'infinite-recursion';
        const rootFolder = `/${rootFolderName}`;
        const rootUri = URI.file(rootFolder);
        const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
        /**
         * The file structure to be created on the disk for the test.
         */
        [{
                name: rootFolderName,
                children: [
                    {
                        name: 'file1.md',
                        contents: '## Some Header\nsome contents\n ',
                    },
                    {
                        name: 'file2.prompt.md',
                        contents: `## Files\n\t- this file #file:folder1/file3.prompt.md \n\t- also this #file:./folder1/some-other-folder/file4.prompt.md\n\n#file:${rootFolder}/folder1/some-other-folder/file5.prompt.md\t please!\n\t[some (snippet!) #name))](./file1.md)`,
                    },
                    {
                        name: 'folder1',
                        children: [
                            {
                                name: 'file3.prompt.md',
                                contents: `\n\n\t- some seemingly random [another-file.prompt.md](${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md) contents\n some more\t content`,
                            },
                            {
                                name: 'some-other-folder',
                                children: [
                                    {
                                        name: 'file4.prompt.md',
                                        contents: 'this file has a non-existing #file:../some-non-existing/file.prompt.md\t\treference',
                                    },
                                    {
                                        name: 'file5.prompt.md',
                                        contents: 'this file has a relative recursive #file:../../file2.prompt.md\nreference\n ',
                                    },
                                    {
                                        name: 'yetAnotherFolder🤭',
                                        children: [
                                            {
                                                name: 'another-file.prompt.md',
                                                // absolute path with recursion
                                                contents: `some test goes\t\nhere #file:${rootFolder}/file2.prompt.md`,
                                            },
                                            {
                                                name: 'one_more_file_just_in_case.prompt.md',
                                                contents: 'one_more_file_just_in_case.prompt.md contents',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }], 
        /**
         * The root file path to start the resolve process from.
         */
        URI.file(`/${rootFolderName}/file2.prompt.md`), 
        /**
         * The expected references to be resolved.
         */
        [
            new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 2, 9)),
            new ExpectedReference(URI.joinPath(rootUri, './folder1'), createTestFileReference(`${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md`, 3, 23)),
            /**
             * This reference should be resolved with a recursive
             * reference error condition. (the absolute reference case)
             */
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder/yetAnotherFolder🤭'), createTestFileReference(`${rootFolder}/file2.prompt.md`, 2, 6), new RecursiveReference(URI.joinPath(rootUri, './file2.prompt.md'), [
                '/infinite-recursion/file2.prompt.md',
                '/infinite-recursion/folder1/file3.prompt.md',
                '/infinite-recursion/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md',
                '/infinite-recursion/file2.prompt.md',
            ])),
            new ExpectedReference(rootUri, createTestFileReference('./folder1/some-other-folder/file4.prompt.md', 3, 14), undefined),
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('../some-non-existing/file.prompt.md', 1, 30), new OpenFailed(URI.joinPath(rootUri, './folder1/some-non-existing/file.prompt.md'), 'Uggh ohh!')),
            new ExpectedReference(rootUri, createTestFileReference(`${rootFolder}/folder1/some-other-folder/file5.prompt.md`, 5, 1), undefined),
            /**
             * This reference should be resolved with a recursive
             * reference error condition. (the relative reference case)
             */
            new ExpectedReference(URI.joinPath(rootUri, './folder1/some-other-folder'), createTestFileReference('../../file2.prompt.md', 1, 36), new RecursiveReference(URI.joinPath(rootUri, './file2.prompt.md'), [
                '/infinite-recursion/file2.prompt.md',
                '/infinite-recursion/folder1/some-other-folder/file5.prompt.md',
                '/infinite-recursion/file2.prompt.md',
            ])),
            new ExpectedReference(rootUri, createTestFileReference('./file1.md', 6, 2), new NotPromptFile(URI.joinPath(rootUri, './file1.md'), 'Uggh oh!')),
        ]));
        await test.run();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3Byb21wdEZpbGVSZWZlcmVuY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUUzRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxh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