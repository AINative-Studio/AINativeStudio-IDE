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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZWdpc3RyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy90ZXN0L2Jyb3dzZXIvc25pcHBldHNSZWdpc3RyeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUVwQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsNEJBQTRCLENBQUMsSUFBWSxFQUFFLE1BQWMsRUFBRSxRQUFnQjtRQUNuRixNQUFNLEtBQUssR0FBRztZQUNiLGNBQWMsRUFBRSxDQUFDLFVBQWtCLEVBQUUsRUFBRSxDQUFDLElBQUk7U0FDNUMsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsNEJBQTRCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFD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