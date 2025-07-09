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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9zZXJ2aWNlL3Byb21wdHNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRW5GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDM0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDNUcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUZBQXFGLENBQUM7QUFDL0gsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUZBQXFGLENBQUM7QUFFL0g7O0dBRUc7QUFDSCxNQUFNLFlBQVk7SUFDakIsWUFDaUIsR0FBUSxFQUNSLFNBQWdCLEVBQ2hCLFNBQWdCO1FBRmhCLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixjQUFTLEdBQVQsU0FBUyxDQUFPO1FBQ2hCLGNBQVMsR0FBVCxTQUFTLENBQU87SUFDN0IsQ0FBQztJQUVMOztPQUVHO0lBQ0ksV0FBVyxDQUFDLElBQTBCO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxJQUFJLEVBQ1QsTUFBTSxFQUNOLDhCQUE4QixDQUM5QixDQUFDO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDbkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDbkIsNkJBQTZCLENBQzdCLENBQUM7UUFFRixNQUFNLENBQ0wsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUN0Qyx1QkFBdUIsSUFBSSxDQUFDLFNBQVMsV0FBVyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQzlELENBQUM7UUFFRixhQUFhLENBQ1osSUFBSSxDQUFDLFNBQVMsRUFDZCw4QkFBOEIsQ0FDOUIsQ0FBQztRQUVGLE1BQU0sQ0FDTCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQzFDLHVCQUF1QixJQUFJLENBQUMsU0FBUyxXQUFXLElBQUksQ0FBQyxTQUFTLElBQUksQ0FDbEUsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFdBQVcsR0FBRyxDQUNuQixLQUFzQyxFQUN0QyxhQUFzQyxFQUNyQyxFQUFFO0lBQ0gsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUM7WUFDSixhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN4QyxDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxNQUFNLEVBQ1osYUFBYSxDQUFDLE1BQU0sRUFDcEIsOEJBQThCLENBQzlCLENBQUM7QUFDSCxDQUFDLENBQUM7QUFFRixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsSUFBSSxPQUF3QixDQUFDO0lBQzdCLElBQUksb0JBQThDLENBQUM7SUFFbkQsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLG9CQUFvQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7UUFDdkUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDN0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLG9CQUFvQixDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNHLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUM1QixJQUFJLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDcEQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDO1lBRXpCOztlQUVHO1lBRUgsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQzdDLGdFQUFnRSxFQUNoRSxNQUFNLEVBQ04sU0FBUyxFQUNULFNBQVMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUMvQyxDQUFDLENBQUM7WUFFSCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDdEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDckIsMkNBQTJDLENBQzNDLENBQUM7WUFFRixNQUFNLENBQ0wsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUNqQiwrQkFBK0IsQ0FDL0IsQ0FBQztZQUVGLE1BQU0sQ0FDTCxPQUFPLFlBQVkscUJBQXFCLEVBQ3hDLHVEQUF1RCxDQUN2RCxDQUFDO1lBRUY7O2VBRUc7WUFFSCxNQUFNLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QixXQUFXLENBQ1YsT0FBTyxDQUFDLGFBQWEsRUFDckI7Z0JBQ0MsSUFBSSxZQUFZLENBQ2YsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLEVBQzdDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDMUIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUN6QjtnQkFDRCxJQUFJLFlBQVksQ0FDZixTQUFTLENBQUMsZUFBZSxDQUFDLEVBQzFCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDMUIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUM1QjthQUNELENBQ0QsQ0FBQztZQUVGLHNDQUFzQztZQUN0QyxNQUFNLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVwQjs7O2VBR0c7WUFFSCxrRUFBa0U7WUFDbEUsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sRUFDUCxTQUFTLEVBQ1QscUNBQXFDLENBQ3JDLENBQUM7WUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUN4QixNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUNyQiw2Q0FBNkMsQ0FDN0MsQ0FBQztZQUVGOztlQUVHO1lBRUgsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQzdDLG9EQUFvRCxFQUNwRCxNQUFNLEVBQ04sU0FBUyxFQUNULFNBQVMsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUN6RCxDQUFDLENBQUM7WUFFSCxzQ0FBc0M7WUFDdEMsTUFBTSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFcEIsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQ3RCLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQ3JCLDJDQUEyQyxDQUMzQyxDQUFDO1lBRUYsTUFBTSxDQUNMLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFDakIsK0JBQStCLENBQy9CLENBQUM7WUFFRixNQUFNLENBQ0wsT0FBTyxZQUFZLHFCQUFxQixFQUN4Qyx1REFBdUQsQ0FDdkQsQ0FBQztZQUVGLE1BQU0sQ0FDTCxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQ2pCLCtCQUErQixDQUMvQixDQUFDO1lBRUYsTUFBTSxDQUNMLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFDakIsK0JBQStCLENBQy9CLENBQUM7WUFFRixNQUFNLENBQ0wsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUNuQixpQ0FBaUMsQ0FDakMsQ0FBQztZQUVGOztlQUVHO1lBRUgsTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFeEIsTUFBTSxDQUFDLGNBQWMsQ0FDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDdEIsZ0NBQWdDLENBQ2hDLENBQUM7WUFFRixXQUFXLENBQ1YsT0FBTyxDQUFDLGFBQWEsRUFDckI7Z0JBQ0MsSUFBSSxZQUFZLENBQ2YsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEVBQy9CLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFDNUIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUM1QjthQUNELENBQ0QsQ0FBQztZQUVGOzs7ZUFHRztZQUVILE1BQU0sU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRTFCLCtDQUErQztZQUMvQyxXQUFXLENBQ1YsU0FBUyxDQUFDLGFBQWEsRUFDdkI7Z0JBQ0MsSUFBSSxZQUFZLENBQ2YsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLEVBQzdDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDMUIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUN6QjtnQkFDRCxJQUFJLFlBQVksQ0FDZixTQUFTLENBQUMsZUFBZSxDQUFDLEVBQzFCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDMUIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUM1QjthQUNELENBQ0QsQ0FBQztZQUVGLHNDQUFzQztZQUN0QyxNQUFNLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVwQjs7O2VBR0c7WUFDSCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFbEIsTUFBTSxDQUNMLE9BQU8sQ0FBQyxRQUFRLEVBQ2hCLDJCQUEyQixDQUMzQixDQUFDO1lBRUYsTUFBTSxDQUNMLFNBQVMsQ0FBQyxRQUFRLEVBQ2xCLDZCQUE2QixDQUM3QixDQUFDO1lBRUYsTUFBTSxDQUNMLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFDakIsK0JBQStCLENBQy9CLENBQUM7WUFHRjs7O2VBR0c7WUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFckQsTUFBTSxDQUNMLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFDbkIsaUNBQWlDLENBQ2pDLENBQUM7WUFFRixNQUFNLENBQUMsY0FBYyxDQUNwQixTQUFTLEVBQ1QsT0FBTyxFQUNQLGlEQUFpRCxDQUNqRCxDQUFDO1lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDeEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDckIsNkNBQTZDLENBQzdDLENBQUM7WUFFRjs7ZUFFRztZQUVILE1BQU0sU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRTFCLHFEQUFxRDtZQUNyRCxXQUFXLENBQ1YsU0FBUyxDQUFDLGFBQWEsRUFDdkI7Z0JBQ0MsSUFBSSxZQUFZLENBQ2YsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLEVBQzdDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDMUIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUN6QjtnQkFDRCxJQUFJLFlBQVksQ0FDZixTQUFTLENBQUMsZUFBZSxDQUFDLEVBQzFCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDMUIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUM1QjthQUNELENBQ0QsQ0FBQztZQUVGLHNDQUFzQztZQUN0QyxNQUFNLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVwQjs7OztlQUlHO1lBRUgsK0NBQStDO1lBQy9DLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUVqQiwwQ0FBMEM7WUFDMUMsTUFBTSxDQUNMLE9BQU8sQ0FBQyxRQUFRLEVBQ2hCLDJCQUEyQixDQUMzQixDQUFDO1lBRUYscURBQXFEO1lBQ3JELE1BQU0sQ0FDTCxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQ25CLGlDQUFpQyxDQUNqQyxDQUFDO1lBRUY7Ozs7ZUFJRztZQUVILDZEQUE2RDtZQUM3RCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FDL0MscUdBQXFHLEVBQ3JHLE1BQU0sRUFDTixTQUFTLEVBQ1QsU0FBUyxDQUFDLDhDQUE4QyxDQUFDLENBQ3pELENBQUMsQ0FBQztZQUNILE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUV2RCxNQUFNLENBQ0wsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUNuQixpQ0FBaUMsQ0FDakMsQ0FBQztZQUVGLE1BQU0sQ0FBQyxjQUFjLENBQ3BCLFNBQVMsRUFDVCxPQUFPLEVBQ1AsaUNBQWlDLENBQ2pDLENBQUM7WUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUN4QixNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUNyQiw2Q0FBNkMsQ0FDN0MsQ0FBQztZQUVGOztlQUVHO1lBRUgsTUFBTSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFMUIsa0NBQWtDO1lBQ2xDLFdBQVcsQ0FDVixTQUFTLENBQUMsYUFBYSxFQUN2QjtnQkFDQywrQkFBK0I7Z0JBQy9CLElBQUksWUFBWSxDQUNmLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUMvQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQzVCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FDNUI7Z0JBQ0QseUJBQXlCO2dCQUN6QixJQUFJLFlBQVksQ0FDZixTQUFTLENBQUMsc0VBQXNFLENBQUMsRUFDakYsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUMxQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQzVCO2FBQ0QsQ0FDRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbEQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDO1lBRXpCLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUM1QyxrRkFBa0YsRUFDbEYsTUFBTSxFQUNOLFNBQVMsRUFDVCxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FDbEMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRWpELGdCQUFnQjtZQUNoQixNQUFNLENBQ0wsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUNoQiw4QkFBOEIsQ0FDOUIsQ0FBQztZQUNGLE1BQU0sQ0FDTCxNQUFNLFlBQVkscUJBQXFCLEVBQ3ZDLHNEQUFzRCxDQUN0RCxDQUFDO1lBRUYsTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFdkIsV0FBVyxDQUNWLE1BQU0sQ0FBQyxhQUFhLEVBQ3BCO2dCQUNDLElBQUksWUFBWSxDQUNmLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMzQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQzFCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FDNUI7Z0JBQ0QsSUFBSSxZQUFZLENBQ2YsU0FBUyxDQUFDLDJCQUEyQixDQUFDLEVBQ3RDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDMUIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUM1QjthQUNELENBQ0QsQ0FBQztZQUVGLEtBQUssQ0FBQyxVQUFVLENBQUM7Z0JBQ2hCO29CQUNDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO29CQUNuQyxJQUFJLEVBQUUsMkJBQTJCO2lCQUNqQzthQUNELENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRXZCLFdBQVcsQ0FDVixNQUFNLENBQUMsYUFBYSxFQUNwQjtnQkFDQyxzQkFBc0I7Z0JBQ3RCLElBQUksWUFBWSxDQUNmLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMzQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQzFCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FDNUI7Z0JBQ0Qsc0NBQXNDO2dCQUN0QyxJQUFJLFlBQVksQ0FDZixTQUFTLENBQUMsMkJBQTJCLENBQUMsRUFDdEMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUMxQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQzVCO2FBQ0QsQ0FDRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSztZQUNoRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FDNUMsMkJBQTJCLEVBQzNCLFNBQVMsRUFDVCxTQUFTLEVBQ1QsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUM1QyxDQUFDLENBQUM7WUFFSCxvQ0FBb0M7WUFDcEMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRWhCLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO2dCQUNsQixPQUFPLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsQ0FBQyxFQUFFLHFEQUFxRCxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=