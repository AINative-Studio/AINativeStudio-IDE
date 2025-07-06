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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvcHJvbXB0RmlsZVJlZmVyZW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRTNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLGFB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