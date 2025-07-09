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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy90b2tlbnMvZmlsZVJlZmVyZW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNsRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFFNUgsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QyxNQUFNLElBQUksR0FBRyxtQkFBbUIsU0FBUyxDQUFDLE1B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