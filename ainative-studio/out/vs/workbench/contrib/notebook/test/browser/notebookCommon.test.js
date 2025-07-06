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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDb21tb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rQ29tbW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzNHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUU5RSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxXQUE0QixDQUFDO0lBQ2pDLElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxlQUFpQyxDQUFDO0lBRXRDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNw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QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RSxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFckcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDL0UsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZUFBZSxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0csTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRyxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9HLE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVySSxNQUFNLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDO1lBQ3ZDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FB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