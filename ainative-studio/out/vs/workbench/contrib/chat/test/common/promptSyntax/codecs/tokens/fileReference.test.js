/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { randomInt } from '../../../../../../../../base/common/numbers.js';
import { Range } from '../../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../../base/common/types.js';
import { BaseToken } from '../../../../../../../../editor/common/codecs/baseToken.js';
import { PromptToken } from '../../../../../common/promptSyntax/codecs/tokens/promptToken.js';
import { FileReference } from '../../../../../common/promptSyntax/codecs/tokens/fileReference.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../base/test/common/utils.js';
import { PromptVariable, PromptVariableWithData } from '../../../../../common/promptSyntax/codecs/tokens/promptVariable.js';
suite('FileReference', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('• linkRange', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const path = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.txt`;
        const columnEndNumber = columnStartNumber + path.length;
        const range = new Range(lineNumber, columnStartNumber, lineNumber, columnEndNumber);
        const fileReference = new FileReference(range, path);
        const { linkRange } = fileReference;
        assertDefined(linkRange, 'The link range must be defined.');
        const expectedLinkRange = new Range(lineNumber, columnStartNumber + '#file:'.length, lineNumber, columnStartNumber + path.length);
        assert(expectedLinkRange.equalsRange(linkRange), `Expected link range to be ${expectedLinkRange}, got ${linkRange}.`);
    });
    test('• path', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const link = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.txt`;
        const columnEndNumber = columnStartNumber + link.length;
        const range = new Range(lineNumber, columnStartNumber, lineNumber, columnEndNumber);
        const fileReference = new FileReference(range, link);
        assert.strictEqual(fileReference.path, link, 'Must return the correct link path.');
    });
    test('• extends `PromptVariableWithData` and others', () => {
        const lineNumber = randomInt(100, 1);
        const columnStartNumber = randomInt(100, 1);
        const link = `/temp/test/file-${randomInt(Number.MAX_SAFE_INTEGER)}.txt`;
        const columnEndNumber = columnStartNumber + link.length;
        const range = new Range(lineNumber, columnStartNumber, lineNumber, columnEndNumber);
        const fileReference = new FileReference(range, link);
        assert(fileReference instanceof PromptVariableWithData, 'Must extend `PromptVariableWithData`.');
        assert(fileReference instanceof PromptVariable, 'Must extend `PromptVariable`.');
        assert(fileReference instanceof PromptToken, 'Must extend `PromptToken`.');
        assert(fileReference instanceof BaseToken, 'Must extend `BaseToken`.');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvdG9rZW5zL2ZpbGVSZWZlcmVuY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM1RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDbEcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBRTVILEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDeEIsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsTUFBTSxJQUFJLEdBQUcsbUJBQW1CLFNBQVMsQ0FB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