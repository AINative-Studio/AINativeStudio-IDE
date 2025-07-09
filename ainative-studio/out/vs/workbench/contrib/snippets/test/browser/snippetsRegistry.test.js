/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { getNonWhitespacePrefix } from '../../browser/snippetsService.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('getNonWhitespacePrefix', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertGetNonWhitespacePrefix(line, column, expected) {
        const model = {
            getLineContent: (lineNumber) => line
        };
        const actual = getNonWhitespacePrefix(model, new Position(1, column));
        assert.strictEqual(actual, expected);
    }
    test('empty line', () => {
        assertGetNonWhitespacePrefix('', 1, '');
    });
    test('singleWordLine', () => {
        assertGetNonWhitespacePrefix('something', 1, '');
        assertGetNonWhitespacePrefix('something', 2, 's');
        assertGetNonWhitespacePrefix('something', 3, 'so');
        assertGetNonWhitespacePrefix('something', 4, 'som');
        assertGetNonWhitespacePrefix('something', 5, 'some');
        assertGetNonWhitespacePrefix('something', 6, 'somet');
        assertGetNonWhitespacePrefix('something', 7, 'someth');
        assertGetNonWhitespacePrefix('something', 8, 'somethi');
        assertGetNonWhitespacePrefix('something', 9, 'somethin');
        assertGetNonWhitespacePrefix('something', 10, 'something');
    });
    test('two word line', () => {
        assertGetNonWhitespacePrefix('something interesting', 1, '');
        assertGetNonWhitespacePrefix('something interesting', 2, 's');
        assertGetNonWhitespacePrefix('something interesting', 3, 'so');
        assertGetNonWhitespacePrefix('something interesting', 4, 'som');
        assertGetNonWhitespacePrefix('something interesting', 5, 'some');
        assertGetNonWhitespacePrefix('something interesting', 6, 'somet');
        assertGetNonWhitespacePrefix('something interesting', 7, 'someth');
        assertGetNonWhitespacePrefix('something interesting', 8, 'somethi');
        assertGetNonWhitespacePrefix('something interesting', 9, 'somethin');
        assertGetNonWhitespacePrefix('something interesting', 10, 'something');
        assertGetNonWhitespacePrefix('something interesting', 11, '');
        assertGetNonWhitespacePrefix('something interesting', 12, 'i');
        assertGetNonWhitespacePrefix('something interesting', 13, 'in');
        assertGetNonWhitespacePrefix('something interesting', 14, 'int');
        assertGetNonWhitespacePrefix('something interesting', 15, 'inte');
        assertGetNonWhitespacePrefix('something interesting', 16, 'inter');
        assertGetNonWhitespacePrefix('something interesting', 17, 'intere');
        assertGetNonWhitespacePrefix('something interesting', 18, 'interes');
        assertGetNonWhitespacePrefix('something interesting', 19, 'interest');
        assertGetNonWhitespacePrefix('something interesting', 20, 'interesti');
        assertGetNonWhitespacePrefix('something interesting', 21, 'interestin');
        assertGetNonWhitespacePrefix('something interesting', 22, 'interesting');
    });
    test('many separators', () => {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions?redirectlocale=en-US&redirectslug=JavaScript%2FGuide%2FRegular_Expressions#special-white-space
        // \s matches a single white space character, including space, tab, form feed, line feed.
        // Equivalent to [ \f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff].
        assertGetNonWhitespacePrefix('something interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\tinteresting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\finteresting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\vinteresting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\u00a0interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\u2000interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\u2028interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\u3000interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\ufeffinteresting', 22, 'interesting');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZWdpc3RyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL3Rlc3QvYnJvd3Nlci9zbmlwcGV0c1JlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBRXBDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyw0QkFBNEIsQ0FBQyxJQUFZLEVBQUUsTUFBYyxFQUFFLFFBQWdCO1FBQ25GLE1BQU0sS0FBSyxHQUFHO1lBQ2IsY0FBYyxFQUFFLENBQUMsVUFBa0IsRUFBRSxFQUFFLENBQUMsSUFBSTtTQUM1QyxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2Qiw0QkFBNEIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQiw0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