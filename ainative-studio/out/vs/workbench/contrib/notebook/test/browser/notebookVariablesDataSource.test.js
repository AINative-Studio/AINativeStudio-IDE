/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncIterableSource } from '../../../../../base/common/async.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NotebookVariableDataSource } from '../../browser/contrib/notebookVariables/notebookVariablesDataSource.js';
suite('NotebookVariableDataSource', () => {
    let dataSource;
    const notebookModel = { uri: 'one.ipynb', languages: ['python'] };
    let provideVariablesCalled;
    let results;
    const kernel = new class extends mock() {
        constructor() {
            super(...arguments);
            this.hasVariableProvider = true;
        }
        provideVariables(notebookUri, parentId, kind, start, token) {
            provideVariablesCalled = true;
            const source = new AsyncIterableSource();
            for (let i = 0; i < results.length; i++) {
                if (token.isCancellationRequested) {
                    break;
                }
                if (results[i].action) {
                    results[i].action();
                }
                source.emitOne(results[i]);
            }
            setTimeout(() => source.resolve(), 0);
            return source.asyncIterable;
        }
    };
    const kernelService = new class extends mock() {
        getMatchingKernel(notebook) {
            return { selected: kernel, all: [], suggestions: [], hidden: [] };
        }
    };
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        provideVariablesCalled = false;
        dataSource = new NotebookVariableDataSource(kernelService);
        results = [
            { id: 1, name: 'a', value: '1', hasNamedChildren: false, indexedChildrenCount: 0 },
        ];
    });
    test('Root element should return children', async () => {
        const variables = await dataSource.getChildren({ kind: 'root', notebook: notebookModel });
        assert.strictEqual(variables.length, 1);
    });
    test('Get children of list element', async () => {
        const parent = { kind: 'variable', notebook: notebookModel, id: '1', extHostId: 1, name: 'list', value: '[...]', hasNamedChildren: false, indexedChildrenCount: 5 };
        results = [
            { id: 2, name: 'first', value: '1', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 3, name: 'second', value: '2', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 4, name: 'third', value: '3', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 5, name: 'fourth', value: '4', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 6, name: 'fifth', value: '5', hasNamedChildren: false, indexedChildrenCount: 0 },
        ];
        const variables = await dataSource.getChildren(parent);
        assert.strictEqual(variables.length, 5);
    });
    test('Get children for large list', async () => {
        const parent = { kind: 'variable', notebook: notebookModel, id: '1', extHostId: 1, name: 'list', value: '[...]', hasNamedChildren: false, indexedChildrenCount: 2000 };
        results = [];
        const variables = await dataSource.getChildren(parent);
        assert(variables.length > 1, 'We should have results for groups of children');
        assert(!provideVariablesCalled, 'provideVariables should not be called');
        assert.equal(variables[0].extHostId, parent.extHostId, 'ExtHostId should match the parent since we will use it to get the real children');
    });
    test('Get children for very large list', async () => {
        const parent = { kind: 'variable', notebook: notebookModel, id: '1', extHostId: 1, name: 'list', value: '[...]', hasNamedChildren: false, indexedChildrenCount: 1_000_000 };
        results = [];
        const groups = await dataSource.getChildren(parent);
        const children = await dataSource.getChildren(groups[99]);
        assert(children.length === 100, 'We should have a full page of child groups');
        assert(!provideVariablesCalled, 'provideVariables should not be called');
        assert.equal(children[0].extHostId, parent.extHostId, 'ExtHostId should match the parent since we will use it to get the real children');
    });
    test('Cancel while enumerating through children', async () => {
        const parent = { kind: 'variable', notebook: notebookModel, id: '1', extHostId: 1, name: 'list', value: '[...]', hasNamedChildren: false, indexedChildrenCount: 10 };
        results = [
            { id: 2, name: 'first', value: '1', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 3, name: 'second', value: '2', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 4, name: 'third', value: '3', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 5, name: 'fourth', value: '4', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 5, name: 'fifth', value: '4', hasNamedChildren: false, indexedChildrenCount: 0, action: () => dataSource.cancel() },
            { id: 7, name: 'sixth', value: '6', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 8, name: 'seventh', value: '7', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 9, name: 'eighth', value: '8', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 10, name: 'ninth', value: '9', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 11, name: 'tenth', value: '10', hasNamedChildren: false, indexedChildrenCount: 0 },
        ];
        const variables = await dataSource.getChildren(parent);
        assert.equal(variables.length, 5, 'Iterating should have been cancelled');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNEYXRhU291cmNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rVmFyaWFibGVzRGF0YVNvdXJjZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQXVCLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHL0YsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBNEIsMEJBQTBCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUs5SSxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBQ3hDLElBQUksVUFBc0MsQ0FBQztJQUMzQyxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQWtDLENBQUM7SUFDbEcsSUFBSSxzQkFBK0IsQ0FBQztJQUdwQyxJQUFJLE9BQW9DLENBQUM7SUFFekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUFtQjtRQUFyQzs7WUFDVCx3QkFBbUIsR0FBRyxJQUFJLENBQUM7UUF1QnJDLENBQUM7UUF0QlMsZ0JBQWdCLENBQ3hCLFdBQWdCLEVBQ2hCLFFBQTRCLEVBQzVCLElBQXlCLEVBQ3pCLEtBQWEsRUFDYixLQUF3QjtZQUV4QixzQkFBc0IsR0FBRyxJQUFJLENBQUM7WUFDOUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsRUFBbUIsQ0FB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