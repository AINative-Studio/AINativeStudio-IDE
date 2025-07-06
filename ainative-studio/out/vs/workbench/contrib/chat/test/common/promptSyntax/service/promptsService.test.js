/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createURI } from '../testUtils/createUri.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { waitRandom } from '../../../../../../../base/test/common/testUtils.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { createTextModel } from '../../../../../../../editor/test/common/testTextModel.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { PromptsService } from '../../../../common/promptSyntax/service/promptsService.js';
import { TextModelPromptParser } from '../../../../common/promptSyntax/parsers/textModelPromptParser.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { TestConfigurationService } from '../../../../../../../platform/configuration/test/common/testConfigurationService.js';
/**
 * Helper class to assert the properties of a link.
 */
class ExpectedLink {
    constructor(uri, fullRange, linkRange) {
        this.uri = uri;
        this.fullRange = fullRange;
        this.linkRange = linkRange;
    }
    /**
     * Assert a provided link has the same properties as this object.
     */
    assertEqual(link) {
        assert.strictEqual(link.type, 'file', 'Link must have correct type.');
        assert.strictEqual(link.uri.toString(), this.uri.toString(), 'Link must have correct URI.');
        assert(this.fullRange.equalsRange(link.range), `Full range must be '${this.fullRange}', got '${link.range}'.`);
        assertDefined(link.linkRange, 'Link must have a link range.');
        assert(this.linkRange.equalsRange(link.linkRange), `Link range must be '${this.linkRange}', got '${link.linkRange}'.`);
    }
}
/**
 * Asserts that provided links are equal to the expected links.
 * @param links Links to assert.
 * @param expectedLinks Expected links to compare against.
 */
const assertLinks = (links, expectedLinks) => {
    for (let i = 0; i < links.length; i++) {
        try {
            expectedLinks[i].assertEqual(links[i]);
        }
        catch (error) {
            throw new Error(`link#${i}: ${error}`);
        }
    }
    assert.strictEqual(links.length, expectedLinks.length, `Links count must be correct.`);
};
suite('PromptsService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    let instantiationService;
    setup(async () => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IFileService, disposables.add(instantiationService.createInstance(FileService)));
        service = disposables.add(instantiationService.createInstance(PromptsService));
    });
    suite('• getParserFor', () => {
        test('• provides cached parser instance', async () => {
            const langId = 'fooLang';
            /**
             * Create a text model, get a parser for it, and perform basic assertions.
             */
            const model1 = disposables.add(createTextModel('test1\n\t#file:./file.md\n\n\n   [bin file](/root/tmp.bin)\t\n', langId, undefined, createURI('/Users/vscode/repos/test/file1.txt')));
            const parser1 = service.getSyntaxParserFor(model1);
            assert.strictEqual(parser1.uri.toString(), model1.uri.toString(), 'Must create parser1 with the correct URI.');
            assert(!parser1.disposed, 'Parser1 must not be disposed.');
            assert(parser1 instanceof TextModelPromptParser, 'Parser1 must be an instance of TextModelPromptParser.');
            /**
             * Validate that all links of the model are correctly parsed.
             */
            await parser1.settled();
            assertLinks(parser1.allReferences, [
                new ExpectedLink(createURI('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(createURI('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await waitRandom(5);
            /**
             * Next, get parser for the same exact model and
             * validate that the same cached object is returned.
             */
            // get the same parser again, the call must return the same object
            const parser1_1 = service.getSyntaxParserFor(model1);
            assert.strictEqual(parser1, parser1_1, 'Must return the same parser object.');
            assert.strictEqual(parser1_1.uri.toString(), model1.uri.toString(), 'Must create parser1_1 with the correct URI.');
            /**
             * Get parser for a different model and perform basic assertions.
             */
            const model2 = disposables.add(createTextModel('some text #file:/absolute/path.txt  \t\ntest-text2', langId, undefined, createURI('/Users/vscode/repos/test/some-folder/file.md')));
            // wait for some random amount of time
            await waitRandom(5);
            const parser2 = service.getSyntaxParserFor(model2);
            assert.strictEqual(parser2.uri.toString(), model2.uri.toString(), 'Must create parser2 with the correct URI.');
            assert(!parser2.disposed, 'Parser2 must not be disposed.');
            assert(parser2 instanceof TextModelPromptParser, 'Parser2 must be an instance of TextModelPromptParser.');
            assert(!parser2.disposed, 'Parser2 must not be disposed.');
            assert(!parser1.disposed, 'Parser1 must not be disposed.');
            assert(!parser1_1.disposed, 'Parser1_1 must not be disposed.');
            /**
             * Validate that all links of the model 2 are correctly parsed.
             */
            await parser2.settled();
            assert.notStrictEqual(parser1.uri.toString(), parser2.uri.toString(), 'Parser2 must have its own URI.');
            assertLinks(parser2.allReferences, [
                new ExpectedLink(createURI('/absolute/path.txt'), new Range(1, 11, 1, 11 + 24), new Range(1, 17, 1, 17 + 18)),
            ]);
            /**
             * Validate the first parser was not affected by the presence
             * of the second parser.
             */
            await parser1_1.settled();
            // parser1_1 has the same exact links as before
            assertLinks(parser1_1.allReferences, [
                new ExpectedLink(createURI('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(createURI('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await waitRandom(5);
            /**
             * Dispose the first parser, perform basic validations, and confirm
             * that the second parser is not affected by the disposal of the first one.
             */
            parser1.dispose();
            assert(parser1.disposed, 'Parser1 must be disposed.');
            assert(parser1_1.disposed, 'Parser1_1 must be disposed.');
            assert(!parser2.disposed, 'Parser2 must not be disposed.');
            /**
             * Get parser for the first model again. Confirm that we get
             * a new non-disposed parser object back with correct properties.
             */
            const parser1_2 = service.getSyntaxParserFor(model1);
            assert(!parser1_2.disposed, 'Parser1_2 must not be disposed.');
            assert.notStrictEqual(parser1_2, parser1, 'Must create a new parser object for the model1.');
            assert.strictEqual(parser1_2.uri.toString(), model1.uri.toString(), 'Must create parser1_2 with the correct URI.');
            /**
             * Validate that the contents of the second parser did not change.
             */
            await parser1_2.settled();
            // parser1_2 must have the same exact links as before
            assertLinks(parser1_2.allReferences, [
                new ExpectedLink(createURI('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(createURI('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await waitRandom(5);
            /**
             * This time dispose model of the second parser instead of
             * the parser itself. Validate that the parser is disposed too, but
             * the newly created first parser is not affected.
             */
            // dispose the `model` of the second parser now
            model2.dispose();
            // assert that the parser is also disposed
            assert(parser2.disposed, 'Parser2 must be disposed.');
            // sanity check that the other parser is not affected
            assert(!parser1_2.disposed, 'Parser1_2 must not be disposed.');
            /**
             * Create a new second parser with new model - we cannot use
             * the old one because it was disposed. This new model also has
             * a different second link.
             */
            // we cannot use the same model since it was already disposed
            const model2_1 = disposables.add(createTextModel('some text #file:/absolute/path.txt  \n [caption](.copilot/prompts/test.prompt.md)\t\n\t\n more text', langId, undefined, createURI('/Users/vscode/repos/test/some-folder/file.md')));
            const parser2_1 = service.getSyntaxParserFor(model2_1);
            assert(!parser2_1.disposed, 'Parser2_1 must not be disposed.');
            assert.notStrictEqual(parser2_1, parser2, 'Parser2_1 must be a new object.');
            assert.strictEqual(parser2_1.uri.toString(), model2.uri.toString(), 'Must create parser2_1 with the correct URI.');
            /**
             * Validate that new model2 contents are parsed correctly.
             */
            await parser2_1.settled();
            // parser2_1 must have 2 links now
            assertLinks(parser2_1.allReferences, [
                // the first link didn't change
                new ExpectedLink(createURI('/absolute/path.txt'), new Range(1, 11, 1, 11 + 24), new Range(1, 17, 1, 17 + 18)),
                // the second link is new
                new ExpectedLink(createURI('/Users/vscode/repos/test/some-folder/.copilot/prompts/test.prompt.md'), new Range(2, 2, 2, 2 + 42), new Range(2, 12, 2, 12 + 31)),
            ]);
        });
        test('• auto-updated on model changes', async () => {
            const langId = 'bazLang';
            const model = disposables.add(createTextModel(' \t #file:../file.md\ntest1\n\t\n  [another file](/Users/root/tmp/file2.txt)\t\n', langId, undefined, createURI('/repos/test/file1.txt')));
            const parser = service.getSyntaxParserFor(model);
            // sanity checks
            assert(!parser.disposed, 'Parser must not be disposed.');
            assert(parser instanceof TextModelPromptParser, 'Parser must be an instance of TextModelPromptParser.');
            await parser.settled();
            assertLinks(parser.allReferences, [
                new ExpectedLink(createURI('/repos/file.md'), new Range(1, 4, 1, 4 + 16), new Range(1, 10, 1, 10 + 10)),
                new ExpectedLink(createURI('/Users/root/tmp/file2.txt'), new Range(4, 3, 4, 3 + 41), new Range(4, 18, 4, 18 + 25)),
            ]);
            model.applyEdits([
                {
                    range: new Range(4, 18, 4, 18 + 25),
                    text: '/Users/root/tmp/file3.txt',
                },
            ]);
            await parser.settled();
            assertLinks(parser.allReferences, [
                // link1 didn't change
                new ExpectedLink(createURI('/repos/file.md'), new Range(1, 4, 1, 4 + 16), new Range(1, 10, 1, 10 + 10)),
                // link2 changed in the file name only
                new ExpectedLink(createURI('/Users/root/tmp/file3.txt'), new Range(4, 3, 4, 3 + 41), new Range(4, 18, 4, 18 + 25)),
            ]);
        });
        test('• throws if disposed model provided', async function () {
            const model = disposables.add(createTextModel('test1\ntest2\n\ntest3\t\n', 'barLang', undefined, URI.parse('./github/prompts/file.prompt.md')));
            // dispose the model before using it
            model.dispose();
            assert.throws(() => {
                service.getSyntaxParserFor(model);
            }, 'Cannot create a prompt parser for a disposed model.');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3NlcnZpY2UvcHJvbXB0c1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxRkFB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