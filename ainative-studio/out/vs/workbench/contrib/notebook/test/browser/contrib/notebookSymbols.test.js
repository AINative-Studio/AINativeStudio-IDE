/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { NotebookOutlineEntryFactory } from '../../../browser/viewModel/notebookOutlineEntryFactory.js';
suite('Notebook Symbols', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    const symbolsPerTextModel = {};
    function setSymbolsForTextModel(symbols, textmodelId = 'textId') {
        symbolsPerTextModel[textmodelId] = symbols;
    }
    const executionService = new class extends mock() {
        getCellExecution() { return undefined; }
    };
    class OutlineModelStub {
        constructor(textId) {
            this.textId = textId;
        }
        getTopLevelSymbols() {
            return symbolsPerTextModel[this.textId];
        }
    }
    const outlineModelService = new class extends mock() {
        getOrCreate(model, arg1) {
            const outline = new OutlineModelStub(model.id);
            return Promise.resolve(outline);
        }
        getDebounceValue(arg0) {
            return 0;
        }
    };
    const textModelService = new class extends mock() {
        createModelReference(uri) {
            return Promise.resolve({
                object: {
                    textEditorModel: {
                        id: uri.toString(),
                        getVersionId() { return 1; }
                    }
                },
                dispose() { }
            });
        }
    };
    function createCellViewModel(version = 1, textmodelId = 'textId') {
        return {
            id: textmodelId,
            uri: { toString() { return textmodelId; } },
            textBuffer: {
                getLineCount() { return 0; }
            },
            getText() {
                return '# code';
            },
            model: {
                textModel: {
                    id: textmodelId,
                    getVersionId() { return version; }
                }
            },
            resolveTextModel() {
                return this.model.textModel;
            },
        };
    }
    test('Cell without symbols cache', function () {
        setSymbolsForTextModel([{ name: 'var', range: {} }]);
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        const entries = entryFactory.getOutlineEntries(createCellViewModel(), 0);
        assert.equal(entries.length, 1, 'no entries created');
        assert.equal(entries[0].label, '# code', 'entry should fall back to first line of cell');
    });
    test('Cell with simple symbols', async function () {
        setSymbolsForTextModel([{ name: 'var1', range: {} }, { name: 'var2', range: {} }]);
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        const cell = createCellViewModel();
        await entryFactory.cacheSymbols(cell, CancellationToken.None);
        const entries = entryFactory.getOutlineEntries(cell, 0);
        assert.equal(entries.length, 3, 'wrong number of outline entries');
        assert.equal(entries[0].label, '# code');
        assert.equal(entries[1].label, 'var1');
        // 6 levels for markdown, all code symbols are greater than the max markdown level
        assert.equal(entries[1].level, 8);
        assert.equal(entries[1].index, 1);
        assert.equal(entries[2].label, 'var2');
        assert.equal(entries[2].level, 8);
        assert.equal(entries[2].index, 2);
    });
    test('Cell with nested symbols', async function () {
        setSymbolsForTextModel([
            { name: 'root1', range: {}, children: [{ name: 'nested1', range: {} }, { name: 'nested2', range: {} }] },
            { name: 'root2', range: {}, children: [{ name: 'nested1', range: {} }] }
        ]);
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        const cell = createCellViewModel();
        await entryFactory.cacheSymbols(cell, CancellationToken.None);
        const entries = entryFactory.getOutlineEntries(createCellViewModel(), 0);
        assert.equal(entries.length, 6, 'wrong number of outline entries');
        assert.equal(entries[0].label, '# code');
        assert.equal(entries[1].label, 'root1');
        assert.equal(entries[1].level, 8);
        assert.equal(entries[2].label, 'nested1');
        assert.equal(entries[2].level, 9);
        assert.equal(entries[3].label, 'nested2');
        assert.equal(entries[3].level, 9);
        assert.equal(entries[4].label, 'root2');
        assert.equal(entries[4].level, 8);
        assert.equal(entries[5].label, 'nested1');
        assert.equal(entries[5].level, 9);
    });
    test('Multiple Cells with symbols', async function () {
        setSymbolsForTextModel([{ name: 'var1', range: {} }], '$1');
        setSymbolsForTextModel([{ name: 'var2', range: {} }], '$2');
        const entryFactory = new NotebookOutlineEntryFactory(executionService, outlineModelService, textModelService);
        const cell1 = createCellViewModel(1, '$1');
        const cell2 = createCellViewModel(1, '$2');
        await entryFactory.cacheSymbols(cell1, CancellationToken.None);
        await entryFactory.cacheSymbols(cell2, CancellationToken.None);
        const entries1 = entryFactory.getOutlineEntries(createCellViewModel(1, '$1'), 0);
        const entries2 = entryFactory.getOutlineEntries(createCellViewModel(1, '$2'), 0);
        assert.equal(entries1.length, 2, 'wrong number of outline entries');
        assert.equal(entries1[0].label, '# code');
        assert.equal(entries1[1].label, 'var1');
        assert.equal(entries2.length, 2, 'wrong number of outline entries');
        assert.equal(entries2[0].label, '# code');
        assert.equal(entries2[1].label, 'var2');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTeW1ib2xzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tTeW1ib2xzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUl0RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQU94RyxLQUFLLENBQUMsa0JBQWtCLEVBQUU7SUFDekIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLG1CQUFtQixHQUF5QyxFQUFFLENBQUM7SUFDckUsU0FBUyxzQkFBc0IsQ0FBQyxPQUE2QixFQUFFLFdBQVcsR0FBRyxRQUFRO1FBQ3BGLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxHQUFHLE9BQU8sQ0FBQztJQUM1QyxDQUFDO0lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQWtDO1FBQ3ZFLGdCQUFnQixLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztLQUNqRCxDQUFDO0lBRUYsTUFBTSxnQkFBZ0I7UUFDckIsWUFBb0IsTUFBYztZQUFkLFdBQU0sR0FBTixNQUFNLENBQVE7UUFBSSxDQUFDO1FBRXZDLGtCQUFrQjtZQUNqQixPQUFPLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6QyxDQUFDO0tBQ0Q7SUFD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