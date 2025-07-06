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
import { createURI } from '../testUtils/createUri.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { ExpectedReference } from '../testUtils/expectedReference.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { OpenFailed } from '../../../../common/promptFileReferenceErrors.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { randomBoolean } from '../../../../../../../base/test/common/testUtils.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { createTextModel } from '../../../../../../../editor/test/common/testTextModel.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { TextModelPromptParser } from '../../../../common/promptSyntax/parsers/textModelPromptParser.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
/**
 * Test helper to run unit tests for the {@link TextModelPromptParser}
 * class using different test input parameters
 */
let TextModelPromptParserTest = class TextModelPromptParserTest extends Disposable {
    constructor(uri, initialContents, fileService, initService) {
        super();
        // create in-memory file system for this test instance
        const fileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(fileService.registerProvider(Schemas.file, fileSystemProvider));
        // both line endings should yield the same results
        const lineEnding = (randomBoolean()) ? '\r\n' : '\n';
        // create the underlying model
        this.model = this._register(createTextModel(initialContents.join(lineEnding), 'fooLang', undefined, uri));
        // create the parser instance
        this.parser = this._register(initService.createInstance(TextModelPromptParser, this.model, [])).start();
    }
    /**
     * Validate the current state of the parser.
     */
    async validateReferences(expectedReferences) {
        await this.parser.allSettled();
        const { references } = this.parser;
        for (let i = 0; i < expectedReferences.length; i++) {
            const reference = references[i];
            assertDefined(reference, `Expected reference #${i} be ${expectedReferences[i]}, got 'undefined'.`);
            expectedReferences[i].validateEqual(reference);
        }
        assert.strictEqual(expectedReferences.length, references.length, `[${this.model.uri}] Unexpected number of references.`);
    }
};
TextModelPromptParserTest = __decorate([
    __param(2, IFileService),
    __param(3, IInstantiationService)
], TextModelPromptParserTest);
suite('TextModelPromptParser', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IFileService, disposables.add(instantiationService.createInstance(FileService)));
    });
    /**
     * Create a new test instance with provided input parameters.
     */
    const createTest = (uri, initialContents) => {
        return disposables.add(instantiationService.createInstance(TextModelPromptParserTest, uri, initialContents));
    };
    test('core logic #1', async () => {
        const test = createTest(createURI('/foo/bar.md'), [
            /* 01 */ "The quick brown fox tries #file:/abs/path/to/file.md online yoga for the first time.",
            /* 02 */ "Maria discovered a stray turtle roaming in her kitchen.",
            /* 03 */ "Why did the robot write a poem about existential dread?",
            /* 04 */ "Sundays are made for two things: pancakes and procrastination.",
            /* 05 */ "Sometimes, the best code is the one you never have to write.",
            /* 06 */ "A lone kangaroo once hopped into the local cafe, seeking free Wi-Fi.",
            /* 07 */ "Critical #file:./folder/binary.file thinking is like coffee; best served strong [md link](/etc/hosts/random-file.txt) and without sugar.",
            /* 08 */ "Music is the mind’s way of doodling in the air.",
            /* 09 */ "Stargazing is just turning your eyes into cosmic explorers.",
            /* 10 */ "Never trust a balloon salesman who hates birthdays.",
            /* 11 */ "Running backward can be surprisingly enlightening.",
            /* 12 */ "There’s an art to whispering loudly.",
        ]);
        await test.validateReferences([
            new ExpectedReference({
                uri: createURI('/abs/path/to/file.md'),
                text: '#file:/abs/path/to/file.md',
                path: '/abs/path/to/file.md',
                startLine: 1,
                startColumn: 27,
                pathStartColumn: 33,
                childrenOrError: new OpenFailed(createURI('/abs/path/to/file.md'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/foo/folder/binary.file'),
                text: '#file:./folder/binary.file',
                path: './folder/binary.file',
                startLine: 7,
                startColumn: 10,
                pathStartColumn: 16,
                childrenOrError: new OpenFailed(createURI('/foo/folder/binary.file'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/etc/hosts/random-file.txt'),
                text: '[md link](/etc/hosts/random-file.txt)',
                path: '/etc/hosts/random-file.txt',
                startLine: 7,
                startColumn: 81,
                pathStartColumn: 91,
                childrenOrError: new OpenFailed(createURI('/etc/hosts/random-file.txt'), 'File not found.'),
            }),
        ]);
    });
    test('core logic #2', async () => {
        const test = createTest(createURI('/absolute/folder/and/a/filename.txt'), [
            /* 01 */ "The penguin wore sunglasses but never left the iceberg.",
            /* 02 */ "I once saw a cloud that looked like an antique teapot.",
            /* 03 */ "Midnight snacks are the secret to eternal [link text](./foo-bar-baz/another-file.ts) happiness.",
            /* 04 */ "A stray sock in the hallway is a sign of chaotic creativity.",
            /* 05 */ "Dogs dream in colorful squeaks and belly rubs.",
            /* 06 */ "Never [caption](../../../c/file_name.prompt.md)\t underestimate the power of a well-timed nap.",
            /* 07 */ "The cactus on my desk has a thriving Instagram account.",
            /* 08 */ "In an alternate universe, pigeons deliver sushi by drone.",
            /* 09 */ "Lunar rainbows only appear when you sing in falsetto.",
            /* 10 */ "Carrots have secret telepathic abilities, but only on Tuesdays.",
            /* 11 */ "Sometimes, the best advice comes \t\t#file:../../main.rs\t#file:./somefolder/../samefile.jpeg\tfrom a talking dishwasher.",
            /* 12 */ "Paper airplanes believe they can fly until proven otherwise.",
            /* 13 */ "A library without stories is just a room full of silent trees.",
            /* 14 */ "The invisible cat meows only when it sees a postman.",
            /* 15 */ "Code reviews are like detective novels without the plot twists."
        ]);
        await test.validateReferences([
            new ExpectedReference({
                uri: createURI('/absolute/folder/and/a/foo-bar-baz/another-file.ts'),
                text: '[link text](./foo-bar-baz/another-file.ts)',
                path: './foo-bar-baz/another-file.ts',
                startLine: 3,
                startColumn: 43,
                pathStartColumn: 55,
                childrenOrError: new OpenFailed(createURI('/absolute/folder/and/a/foo-bar-baz/another-file.ts'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/absolute/c/file_name.prompt.md'),
                text: '[caption](../../../c/file_name.prompt.md)',
                path: '../../../c/file_name.prompt.md',
                startLine: 6,
                startColumn: 7,
                pathStartColumn: 17,
                childrenOrError: new OpenFailed(createURI('/absolute/c/file_name.prompt.md'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/absolute/folder/main.rs'),
                text: '#file:../../main.rs',
                path: '../../main.rs',
                startLine: 11,
                startColumn: 36,
                pathStartColumn: 42,
                childrenOrError: new OpenFailed(createURI('/absolute/folder/main.rs'), 'File not found.'),
            }),
            new ExpectedReference({
                uri: createURI('/absolute/folder/and/a/samefile.jpeg'),
                text: '#file:./somefolder/../samefile.jpeg',
                path: './somefolder/../samefile.jpeg',
                startLine: 11,
                startColumn: 56,
                pathStartColumn: 62,
                childrenOrError: new OpenFailed(createURI('/absolute/folder/and/a/samefile.jpeg'), 'File not found.'),
            }),
        ]);
    });
    test('gets disposed with the model', async () => {
        const test = createTest(createURI('/some/path/file.prompt.md'), [
            'line1',
            'line2',
            'line3',
        ]);
        // no references in the model contents
        await test.validateReferences([]);
        test.model.dispose();
        assert(test.parser.disposed, 'The parser should be disposed with its model.');
    });
    test('toString() implementation', async () => {
        const modelUri = createURI('/Users/legomushroom/repos/prompt-snippets/README.md');
        const test = createTest(modelUri, [
            'line1',
            'line2',
            'line3',
        ]);
        assert.strictEqual(test.parser.toString(), `text-model-prompt:${modelUri.path}`, 'The parser should provide correct `toString()` implementation.');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUHJvbXB0UGFyc2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3RleHRNb2RlbFByb21wdFBhcnNlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDNUcsT0FBTyxF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