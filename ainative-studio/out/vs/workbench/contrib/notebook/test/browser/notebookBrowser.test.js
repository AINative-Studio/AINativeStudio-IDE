/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellKind } from '../../common/notebookCommon.js';
/**
 * Return a set of ranges for the cells matching the given predicate
 */
function getRanges(cells, included) {
    const ranges = [];
    let currentRange;
    cells.forEach((cell, idx) => {
        if (included(cell)) {
            if (!currentRange) {
                currentRange = { start: idx, end: idx + 1 };
                ranges.push(currentRange);
            }
            else {
                currentRange.end = idx + 1;
            }
        }
        else {
            currentRange = undefined;
        }
    });
    return ranges;
}
suite('notebookBrowser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getRanges', function () {
        const predicate = (cell) => cell.cellKind === CellKind.Code;
        test('all code', function () {
            const cells = [
                { cellKind: CellKind.Code },
                { cellKind: CellKind.Code },
            ];
            assert.deepStrictEqual(getRanges(cells, predicate), [{ start: 0, end: 2 }]);
        });
        test('none code', function () {
            const cells = [
                { cellKind: CellKind.Markup },
                { cellKind: CellKind.Markup },
            ];
            assert.deepStrictEqual(getRanges(cells, predicate), []);
        });
        test('start code', function () {
            const cells = [
                { cellKind: CellKind.Code },
                { cellKind: CellKind.Markup },
            ];
            assert.deepStrictEqual(getRanges(cells, predicate), [{ start: 0, end: 1 }]);
        });
        test('random', function () {
            const cells = [
                { cellKind: CellKind.Code },
                { cellKind: CellKind.Code },
                { cellKind: CellKind.Markup },
                { cellKind: CellKind.Code },
                { cellKind: CellKind.Markup },
                { cellKind: CellKind.Markup },
                { cellKind: CellKind.Code },
            ];
            assert.deepStrictEqual(getRanges(cells, predicate), [{ start: 0, end: 2 }, { start: 3, end: 4 }, { start: 6, end: 7 }]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tCcm93c2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rQnJvd3Nlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHMUQ7O0dBRUc7QUFDSCxTQUFTLFNBQVMsQ0FBQyxLQUF1QixFQUFFLFFBQTJDO0lBQ3RGLE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUM7SUFDaEMsSUFBSSxZQUFvQyxDQUFDO0lBRXpDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDM0IsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLFlBQVksR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMzQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsWUFBWSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLFlBQVksR0FBRyxTQUFTLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FB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