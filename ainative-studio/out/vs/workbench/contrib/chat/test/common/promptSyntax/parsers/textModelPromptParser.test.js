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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUHJvbXB0UGFyc2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy90ZXh0TW9kZWxQcm9tcHRQYXJzZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRXRELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVHLE9BQU8s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