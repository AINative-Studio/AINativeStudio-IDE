/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ContributedStatusBarItemController } from '../../../browser/contrib/cellStatusBar/contributedStatusBarItemController.js';
import { INotebookCellStatusBarService } from '../../../common/notebookCellStatusBarService.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { withTestNotebook } from '../testNotebookEditor.js';
suite('Notebook Statusbar', () => {
    const testDisposables = new DisposableStore();
    teardown(() => {
        testDisposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Calls item provider', async function () {
        await withTestNotebook([
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header a', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            const cellStatusbarSvc = accessor.get(INotebookCellStatusBarService);
            testDisposables.add(accessor.createInstance(ContributedStatusBarItemController, editor));
            const provider = testDisposables.add(new class extends Disposable {
                constructor() {
                    super(...arguments);
                    this.provideCalls = 0;
                    this._onProvideCalled = this._register(new Emitter());
                    this.onProvideCalled = this._onProvideCalled.event;
                    this._onDidChangeStatusBarItems = this._register(new Emitter());
                    this.onDidChangeStatusBarItems = this._onDidChangeStatusBarItems.event;
                    this.viewType = editor.textModel.viewType;
                }
                async provideCellStatusBarItems(_uri, index, _token) {
                    if (index === 0) {
                        this.provideCalls++;
                        this._onProvideCalled.fire(this.provideCalls);
                    }
                    return { items: [] };
                }
            });
            const providePromise1 = asPromise(provider.onProvideCalled, 'registering provider');
            testDisposables.add(cellStatusbarSvc.registerCellStatusBarItemProvider(provider));
            assert.strictEqual(await providePromise1, 1, 'should call provider on registration');
            const providePromise2 = asPromise(provider.onProvideCalled, 'updating metadata');
            const cell0 = editor.textModel.cells[0];
            cell0.metadata = { ...cell0.metadata, ...{ newMetadata: true } };
            assert.strictEqual(await providePromise2, 2, 'should call provider on updating metadata');
            const providePromise3 = asPromise(provider.onProvideCalled, 'changing cell language');
            cell0.language = 'newlanguage';
            assert.strictEqual(await providePromise3, 3, 'should call provider on changing language');
            const providePromise4 = asPromise(provider.onProvideCalled, 'manually firing change event');
            provider._onDidChangeStatusBarItems.fire();
            assert.strictEqual(await providePromise4, 4, 'should call provider on manually firing change event');
        });
    });
});
async function asPromise(event, message) {
    const error = new Error('asPromise TIMEOUT reached: ' + message);
    return new Promise((resolve, reject) => {
        const handle = setTimeout(() => {
            sub.dispose();
            reject(error);
        }, 1000);
        const sub = event(e => {
            clearTimeout(handle);
            sub.dispose();
            resolve(e);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0ZWRTdGF0dXNCYXJJdGVtQ29udHJvbGxlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL2NvbnRyaWJ1dGVkU3RhdHVzQmFySXRlbUNvbnRyb2xsZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFekYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sOEVBQThFLENBQUM7QUFDbEksT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBc0MsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUU1RCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFOUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEtBQUs7UUFDaEMsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDbkQsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDMUMsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDckUsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGtDQUFrQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFFekYsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQU0sU0FBUSxVQUFVO2dCQUF4Qjs7b0JBQ2hDLGlCQUFZLEdBQUcsQ0FBQyxDQUFDO29CQUVqQixxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQztvQkFDMUQsb0JBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO29CQUU5QywrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztvQkFDakUsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztvQkFXekUsYUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO2dCQUN0QyxDQUFDO2dCQVZBLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxJQUFTLEVBQUUsS0FBYSxFQUFFLE1BQXlCO29CQUNsRixJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDakIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO3dCQUNwQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDL0MsQ0FBQztvQkFFRCxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUN0QixDQUFDO2FBR0QsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztZQUNwRixlQUFlLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGlDQUFpQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLGVBQWUsRUFBRSxDQUFDLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztZQUVyRixNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1lBQ2pGLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLEtBQUssQ0FBQyxRQUFRLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxlQUFlLEVBQUUsQ0FBQyxFQUFFLDJDQUEyQyxDQUFDLENBQUM7WUFFMUYsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztZQUN0RixLQUFLLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQztZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sZUFBZSxFQUFFLENBQUMsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO1lBRTFGLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLDhCQUE4QixDQUFDLENBQUM7WUFDNUYsUUFBUSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxlQUFlLEVBQUUsQ0FBQyxFQUFFLHNEQUFzRCxDQUFDLENBQUM7UUFDdEcsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsS0FBSyxVQUFVLFNBQVMsQ0FBSSxLQUFlLEVBQUUsT0FBZTtJQUMzRCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsR0FBRyxPQUFPLENBQUMsQ0FBQztJQUNqRSxPQUFPLElBQUksT0FBTyxDQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDOUIsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2YsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRVQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JCLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyQixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyJ9