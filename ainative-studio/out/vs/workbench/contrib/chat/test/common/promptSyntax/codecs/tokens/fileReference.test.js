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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL3Rva2Vucy9maWxlUmVmZXJlbmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDNUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxjQUFjLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUU1SCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLG1CQUFtQixTQUFTLENBQUMsTUFB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