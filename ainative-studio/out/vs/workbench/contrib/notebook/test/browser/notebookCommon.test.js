/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { CellKind, CellUri, diff, MimeTypeDisplayOrder, NotebookWorkingCopyTypeIdentifier } from '../../common/notebookCommon.js';
import { cellIndexesToRanges, cellRangesToIndexes, reduceCellRanges } from '../../common/notebookRange.js';
import { setupInstantiationService, TestCell } from './testNotebookEditor.js';
suite('NotebookCommon', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let disposables;
    let instantiationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        languageService = instantiationService.get(ILanguageService);
    });
    test('sortMimeTypes default orders', function () {
        assert.deepStrictEqual(new MimeTypeDisplayOrder().sort([
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.latex,
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text
        ]), [
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.latex,
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text
        ]);
        assert.deepStrictEqual(new MimeTypeDisplayOrder().sort([
            'application/json',
            Mimes.latex,
            Mimes.markdown,
            'application/javascript',
            'text/html',
            Mimes.text,
            'image/png',
            'image/jpeg',
            'image/svg+xml'
        ]), [
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.latex,
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text
        ]);
        assert.deepStrictEqual(new MimeTypeDisplayOrder().sort([
            Mimes.markdown,
            'application/json',
            Mimes.text,
            'image/jpeg',
            'application/javascript',
            'text/html',
            'image/png',
            'image/svg+xml'
        ]), [
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text
        ]);
        disposables.dispose();
    });
    test('sortMimeTypes user orders', function () {
        assert.deepStrictEqual(new MimeTypeDisplayOrder([
            'image/png',
            Mimes.text,
            Mimes.markdown,
            'text/html',
            'application/json'
        ]).sort([
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text
        ]), [
            'image/png',
            Mimes.text,
            Mimes.markdown,
            'text/html',
            'application/json',
            'application/javascript',
            'image/svg+xml',
            'image/jpeg',
        ]);
        assert.deepStrictEqual(new MimeTypeDisplayOrder([
            'application/json',
            'text/html',
            'text/html',
            Mimes.markdown,
            'application/json'
        ]).sort([
            Mimes.markdown,
            'application/json',
            Mimes.text,
            'application/javascript',
            'text/html',
            'image/svg+xml',
            'image/jpeg',
            'image/png'
        ]), [
            'application/json',
            'text/html',
            Mimes.markdown,
            'application/javascript',
            'image/svg+xml',
            'image/png',
            'image/jpeg',
            Mimes.text
        ]);
        disposables.dispose();
    });
    test('prioritizes mimetypes', () => {
        const m = new MimeTypeDisplayOrder([
            Mimes.markdown,
            'text/html',
            'application/json'
        ]);
        assert.deepStrictEqual(m.toArray(), [Mimes.markdown, 'text/html', 'application/json']);
        // no-op if already in the right order
        m.prioritize('text/html', ['application/json']);
        assert.deepStrictEqual(m.toArray(), [Mimes.markdown, 'text/html', 'application/json']);
        // sorts to highest priority
        m.prioritize('text/html', ['application/json', Mimes.markdown]);
        assert.deepStrictEqual(m.toArray(), ['text/html', Mimes.markdown, 'application/json']);
        // adds in new type
        m.prioritize('text/plain', ['application/json', Mimes.markdown]);
        assert.deepStrictEqual(m.toArray(), ['text/plain', 'text/html', Mimes.markdown, 'application/json']);
        // moves multiple, preserves order
        m.prioritize(Mimes.markdown, ['text/plain', 'application/json', Mimes.markdown]);
        assert.deepStrictEqual(m.toArray(), ['text/html', Mimes.markdown, 'text/plain', 'application/json']);
        // deletes multiple
        m.prioritize('text/plain', ['text/plain', 'text/html', Mimes.markdown]);
        assert.deepStrictEqual(m.toArray(), ['text/plain', 'text/html', Mimes.markdown, 'application/json']);
        // handles multiple mimetypes, unknown mimetype
        const m2 = new MimeTypeDisplayOrder(['a', 'b']);
        m2.prioritize('b', ['a', 'b', 'a', 'q']);
        assert.deepStrictEqual(m2.toArray(), ['b', 'a']);
        disposables.dispose();
    });
    test('sortMimeTypes glob', function () {
        assert.deepStrictEqual(new MimeTypeDisplayOrder([
            'application/vnd-vega*',
            Mimes.markdown,
            'text/html',
            'application/json'
        ]).sort([
            'application/json',
            'application/javascript',
            'text/html',
            'application/vnd-plot.json',
            'application/vnd-vega.json'
        ]), [
            'application/vnd-vega.json',
            'text/html',
            'application/json',
            'application/vnd-plot.json',
            'application/javascript',
        ], 'glob *');
        disposables.dispose();
    });
    test('diff cells', function () {
        const cells = [];
        for (let i = 0; i < 5; i++) {
            cells.push(disposables.add(new TestCell('notebook', i, `var a = ${i};`, 'javascript', CellKind.Code, [], languageService)));
        }
        assert.deepStrictEqual(diff(cells, [], (cell) => {
            return cells.indexOf(cell) > -1;
        }), [
            {
                start: 0,
                deleteCount: 5,
                toInsert: []
            }
        ]);
        assert.deepStrictEqual(diff([], cells, (cell) => {
            return false;
        }), [
            {
                start: 0,
                deleteCount: 0,
                toInsert: cells
            }
        ]);
        const cellA = disposables.add(new TestCell('notebook', 6, 'var a = 6;', 'javascript', CellKind.Code, [], languageService));
        const cellB = disposables.add(new TestCell('notebook', 7, 'var a = 7;', 'javascript', CellKind.Code, [], languageService));
        const modifiedCells = [
            cells[0],
            cells[1],
            cellA,
            cells[3],
            cellB,
            cells[4]
        ];
        const splices = diff(cells, modifiedCells, (cell) => {
            return cells.indexOf(cell) > -1;
        });
        assert.deepStrictEqual(splices, [
            {
                start: 2,
                deleteCount: 1,
                toInsert: [cellA]
            },
            {
                start: 4,
                deleteCount: 0,
                toInsert: [cellB]
            }
        ]);
        disposables.dispose();
    });
});
suite('CellUri', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse, generate (file-scheme)', function () {
        const nb = URI.parse('file:///bar/følder/file.nb');
        const id = 17;
        const data = CellUri.generate(nb, id);
        const actual = CellUri.parse(data);
        assert.ok(Boolean(actual));
        assert.strictEqual(actual?.handle, id);
        assert.strictEqual(actual?.notebook.toString(), nb.toString());
    });
    test('parse, generate (foo-scheme)', function () {
        const nb = URI.parse('foo:///bar/følder/file.nb');
        const id = 17;
        const data = CellUri.generate(nb, id);
        const actual = CellUri.parse(data);
        assert.ok(Boolean(actual));
        assert.strictEqual(actual?.handle, id);
        assert.strictEqual(actual?.notebook.toString(), nb.toString());
    });
    test('stable order', function () {
        const nb = URI.parse('foo:///bar/følder/file.nb');
        const handles = [1, 2, 9, 10, 88, 100, 666666, 7777777];
        const uris = handles.map(h => CellUri.generate(nb, h)).sort();
        const strUris = uris.map(String).sort();
        const parsedUris = strUris.map(s => URI.parse(s));
        const actual = parsedUris.map(u => CellUri.parse(u)?.handle);
        assert.deepStrictEqual(actual, handles);
    });
});
suite('CellRange', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Cell range to index', function () {
        assert.deepStrictEqual(cellRangesToIndexes([]), []);
        assert.deepStrictEqual(cellRangesToIndexes([{ start: 0, end: 0 }]), []);
        assert.deepStrictEqual(cellRangesToIndexes([{ start: 0, end: 1 }]), [0]);
        assert.deepStrictEqual(cellRangesToIndexes([{ start: 0, end: 2 }]), [0, 1]);
        assert.deepStrictEqual(cellRangesToIndexes([{ start: 0, end: 2 }, { start: 2, end: 3 }]), [0, 1, 2]);
        assert.deepStrictEqual(cellRangesToIndexes([{ start: 0, end: 2 }, { start: 3, end: 4 }]), [0, 1, 3]);
    });
    test('Cell index to range', function () {
        assert.deepStrictEqual(cellIndexesToRanges([]), []);
        assert.deepStrictEqual(cellIndexesToRanges([0]), [{ start: 0, end: 1 }]);
        assert.deepStrictEqual(cellIndexesToRanges([0, 1]), [{ start: 0, end: 2 }]);
        assert.deepStrictEqual(cellIndexesToRanges([0, 1, 2]), [{ start: 0, end: 3 }]);
        assert.deepStrictEqual(cellIndexesToRanges([0, 1, 3]), [{ start: 0, end: 2 }, { start: 3, end: 4 }]);
        assert.deepStrictEqual(cellIndexesToRanges([1, 0]), [{ start: 0, end: 2 }]);
        assert.deepStrictEqual(cellIndexesToRanges([1, 2, 0]), [{ start: 0, end: 3 }]);
        assert.deepStrictEqual(cellIndexesToRanges([3, 1, 0]), [{ start: 0, end: 2 }, { start: 3, end: 4 }]);
        assert.deepStrictEqual(cellIndexesToRanges([9, 10]), [{ start: 9, end: 11 }]);
        assert.deepStrictEqual(cellIndexesToRanges([10, 9]), [{ start: 9, end: 11 }]);
    });
    test('Reduce ranges', function () {
        assert.deepStrictEqual(reduceCellRanges([{ start: 0, end: 1 }, { start: 1, end: 2 }]), [{ start: 0, end: 2 }]);
        assert.deepStrictEqual(reduceCellRanges([{ start: 0, end: 2 }, { start: 1, end: 3 }]), [{ start: 0, end: 3 }]);
        assert.deepStrictEqual(reduceCellRanges([{ start: 1, end: 3 }, { start: 0, end: 2 }]), [{ start: 0, end: 3 }]);
        assert.deepStrictEqual(reduceCellRanges([{ start: 0, end: 2 }, { start: 4, end: 5 }]), [{ start: 0, end: 2 }, { start: 4, end: 5 }]);
        assert.deepStrictEqual(reduceCellRanges([
            { start: 0, end: 1 },
            { start: 1, end: 2 },
            { start: 4, end: 6 }
        ]), [
            { start: 0, end: 2 },
            { start: 4, end: 6 }
        ]);
        assert.deepStrictEqual(reduceCellRanges([
            { start: 0, end: 1 },
            { start: 1, end: 3 },
            { start: 3, end: 4 }
        ]), [
            { start: 0, end: 4 }
        ]);
    });
    test('Reduce ranges 2, empty ranges', function () {
        assert.deepStrictEqual(reduceCellRanges([{ start: 0, end: 0 }, { start: 0, end: 0 }]), [{ start: 0, end: 0 }]);
        assert.deepStrictEqual(reduceCellRanges([{ start: 0, end: 0 }, { start: 1, end: 2 }]), [{ start: 1, end: 2 }]);
        assert.deepStrictEqual(reduceCellRanges([{ start: 2, end: 2 }]), [{ start: 2, end: 2 }]);
    });
});
suite('NotebookWorkingCopyTypeIdentifier', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('supports notebook type only', function () {
        const viewType = 'testViewType';
        const type = NotebookWorkingCopyTypeIdentifier.create(viewType);
        assert.deepEqual(NotebookWorkingCopyTypeIdentifier.parse(type), { notebookType: viewType, viewType });
        assert.strictEqual(NotebookWorkingCopyTypeIdentifier.parse('something'), undefined);
    });
    test('supports different viewtype', function () {
        const notebookType = { notebookType: 'testNotebookType', viewType: 'testViewType' };
        const type = NotebookWorkingCopyTypeIdentifier.create(notebookType.notebookType, notebookType.viewType);
        assert.deepEqual(NotebookWorkingCopyTypeIdentifier.parse(type), notebookType);
        assert.strictEqual(NotebookWorkingCopyTypeIdentifier.parse('something'), undefined);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDb21tb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tDb21tb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLGlDQUFpQyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbEksT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDM0csT0FBTyxFQUFFLHlCQUF5QixFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTlFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLFdBQTRCLENBQUM7SUFDakMsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLGVBQWlDLENBQUM7SUFFdEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLG9C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LEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUdILEtBQUssQ0FBQyxXQUFXLEVBQUU7SUFFbEIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7UUFDM0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RSxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RSxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRyxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQkFBcUIsRUFBRTtRQUMzQixNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXJHLE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRSxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVyRyxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RSxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFlLEVBQUU7UUFDckIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRyxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9HLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0csTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXJJLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUM7WUFDdkMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxFQUFFO1lBQ0gsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQztZQUN2QyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtZQUNwQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtZQUNwQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtTQUNwQixDQUFDLEVBQUU7WUFDSCxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtTQUNwQixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrQkFBK0IsRUFBRTtRQUNyQyxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9HLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0csTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILEtBQUssQ0FBQyxtQ0FBbUMsRUFBRTtJQUMxQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtRQUNuQyxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUM7UUFDaEMsTUFBTSxJQUFJLEdBQUcsaUNBQWlDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxTQUFTLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3RHLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3JGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1FBQ25DLE1BQU0sWUFBWSxHQUFHLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsQ0FBQztRQUNwRixNQUFNLElBQUksR0FBRyxpQ0FBaUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDckYsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9