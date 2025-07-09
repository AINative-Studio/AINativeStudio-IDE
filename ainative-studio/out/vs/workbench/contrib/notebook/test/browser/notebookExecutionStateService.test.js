/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncIterableObject, DeferredPromise } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { insertCellAtIndex } from '../../browser/controller/cellOperations.js';
import { NotebookExecutionService } from '../../browser/services/notebookExecutionServiceImpl.js';
import { NotebookExecutionStateService } from '../../browser/services/notebookExecutionStateServiceImpl.js';
import { NotebookKernelService } from '../../browser/services/notebookKernelServiceImpl.js';
import { CellKind, CellUri, NotebookExecutionState } from '../../common/notebookCommon.js';
import { CellExecutionUpdateType, INotebookExecutionService } from '../../common/notebookExecutionService.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../common/notebookKernelService.js';
import { INotebookLoggingService } from '../../common/notebookLoggingService.js';
import { INotebookService } from '../../common/notebookService.js';
import { setupInstantiationService, withTestNotebook as _withTestNotebook } from './testNotebookEditor.js';
suite('NotebookExecutionStateService', () => {
    let instantiationService;
    let kernelService;
    let disposables;
    let testNotebookModel;
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.stub(INotebookService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidAddNotebookDocument = Event.None;
                this.onWillRemoveNotebookDocument = Event.None;
            }
            getNotebookTextModels() { return []; }
            getNotebookTextModel(uri) {
                return testNotebookModel;
            }
        });
        instantiationService.stub(IMenuService, new class extends mock() {
            createMenu() {
                return new class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.onDidChange = Event.None;
                    }
                    getActions() { return []; }
                    dispose() { }
                };
            }
        });
        instantiationService.stub(INotebookLoggingService, new class extends mock() {
            debug(category, output) {
                //
            }
        });
        kernelService = disposables.add(instantiationService.createInstance(NotebookKernelService));
        instantiationService.set(INotebookKernelService, kernelService);
        instantiationService.set(INotebookExecutionService, disposables.add(instantiationService.createInstance(NotebookExecutionService)));
        instantiationService.set(INotebookExecutionStateService, disposables.add(instantiationService.createInstance(NotebookExecutionStateService)));
    });
    async function withTestNotebook(cells, callback) {
        return _withTestNotebook(cells, (editor, viewModel) => callback(viewModel, viewModel.notebookDocument, disposables));
    }
    function testCancelOnDelete(expectedCancels, implementsInterrupt) {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            let cancels = 0;
            const kernel = new class extends TestNotebookKernel {
                constructor() {
                    super({ languages: ['javascript'] });
                    this.implementsInterrupt = implementsInterrupt;
                }
                async executeNotebookCellsRequest() { }
                async cancelNotebookCellExecution(_uri, handles) {
                    cancels += handles.length;
                }
            };
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            // Should cancel executing and pending cells, when kernel does not implement interrupt
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            const cell2 = disposables.add(insertCellAtIndex(viewModel, 1, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            const cell3 = disposables.add(insertCellAtIndex(viewModel, 2, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            insertCellAtIndex(viewModel, 3, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true); // Not deleted
            const exe = executionStateService.createCellExecution(viewModel.uri, cell.handle); // Executing
            exe.confirm();
            exe.update([{ editType: CellExecutionUpdateType.ExecutionState, executionOrder: 1 }]);
            const exe2 = executionStateService.createCellExecution(viewModel.uri, cell2.handle); // Pending
            exe2.confirm();
            executionStateService.createCellExecution(viewModel.uri, cell3.handle); // Unconfirmed
            assert.strictEqual(cancels, 0);
            viewModel.notebookDocument.applyEdits([{
                    editType: 1 /* CellEditType.Replace */, index: 0, count: 3, cells: []
                }], true, undefined, () => undefined, undefined, false);
            assert.strictEqual(cancels, expectedCancels);
        });
    }
    // TODO@roblou Could be a test just for NotebookExecutionListeners, which can be a standalone contribution
    test('cancel execution when cell is deleted', async function () {
        return testCancelOnDelete(3, false);
    });
    test('cancel execution when cell is deleted in interrupt-type kernel', async function () {
        return testCancelOnDelete(1, true);
    });
    test('fires onDidChangeCellExecution when cell is completed while deleted', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true);
            const exe = executionStateService.createCellExecution(viewModel.uri, cell.handle);
            let didFire = false;
            disposables.add(executionStateService.onDidChangeExecution(e => {
                if (e.type === NotebookExecutionType.cell) {
                    didFire = !e.changed;
                }
            }));
            viewModel.notebookDocument.applyEdits([{
                    editType: 1 /* CellEditType.Replace */, index: 0, count: 1, cells: []
                }], true, undefined, () => undefined, undefined, false);
            exe.complete({});
            assert.strictEqual(didFire, true);
        });
    });
    test('does not fire onDidChangeCellExecution for output updates', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            const exe = executionStateService.createCellExecution(viewModel.uri, cell.handle);
            let didFire = false;
            disposables.add(executionStateService.onDidChangeExecution(e => {
                if (e.type === NotebookExecutionType.cell) {
                    didFire = true;
                }
            }));
            exe.update([{ editType: CellExecutionUpdateType.OutputItems, items: [], outputId: '1' }]);
            assert.strictEqual(didFire, false);
            exe.update([{ editType: CellExecutionUpdateType.ExecutionState, executionOrder: 123 }]);
            assert.strictEqual(didFire, true);
            exe.complete({});
        });
    });
    // #142466
    test('getCellExecution and onDidChangeCellExecution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            const deferred = new DeferredPromise();
            disposables.add(executionStateService.onDidChangeExecution(e => {
                if (e.type === NotebookExecutionType.cell) {
                    const cellUri = CellUri.generate(e.notebook, e.cellHandle);
                    const exe = executionStateService.getCellExecution(cellUri);
                    assert.ok(exe);
                    assert.strictEqual(e.notebook.toString(), exe.notebook.toString());
                    assert.strictEqual(e.cellHandle, exe.cellHandle);
                    assert.strictEqual(exe.notebook.toString(), e.changed?.notebook.toString());
                    assert.strictEqual(exe.cellHandle, e.changed?.cellHandle);
                    deferred.complete();
                }
            }));
            executionStateService.createCellExecution(viewModel.uri, cell.handle);
            return deferred.p;
        });
    });
    test('getExecution and onDidChangeExecution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const eventRaisedWithExecution = [];
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            executionStateService.onDidChangeExecution(e => eventRaisedWithExecution.push(e.type === NotebookExecutionType.notebook && !!e.changed), this, disposables);
            const deferred = new DeferredPromise();
            disposables.add(executionStateService.onDidChangeExecution(e => {
                if (e.type === NotebookExecutionType.notebook) {
                    const exe = executionStateService.getExecution(viewModel.uri);
                    assert.ok(exe);
                    assert.strictEqual(e.notebook.toString(), exe.notebook.toString());
                    assert.ok(e.affectsNotebook(viewModel.uri));
                    assert.deepStrictEqual(eventRaisedWithExecution, [true]);
                    deferred.complete();
                }
            }));
            executionStateService.createExecution(viewModel.uri);
            return deferred.p;
        });
    });
    test('getExecution and onDidChangeExecution 2', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const deferred = new DeferredPromise();
            const expectedNotebookEventStates = [NotebookExecutionState.Unconfirmed, NotebookExecutionState.Pending, NotebookExecutionState.Executing, undefined];
            executionStateService.onDidChangeExecution(e => {
                if (e.type === NotebookExecutionType.notebook) {
                    const expectedState = expectedNotebookEventStates.shift();
                    if (typeof expectedState === 'number') {
                        const exe = executionStateService.getExecution(viewModel.uri);
                        assert.ok(exe);
                        assert.strictEqual(e.notebook.toString(), exe.notebook.toString());
                        assert.strictEqual(e.changed?.state, expectedState);
                    }
                    else {
                        assert.ok(e.changed === undefined);
                    }
                    assert.ok(e.affectsNotebook(viewModel.uri));
                    if (expectedNotebookEventStates.length === 0) {
                        deferred.complete();
                    }
                }
            }, this, disposables);
            const execution = executionStateService.createExecution(viewModel.uri);
            execution.confirm();
            execution.begin();
            execution.complete();
            return deferred.p;
        });
    });
    test('force-cancel works for Cell Execution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            executionStateService.createCellExecution(viewModel.uri, cell.handle);
            const exe = executionStateService.getCellExecution(cell.uri);
            assert.ok(exe);
            executionStateService.forceCancelNotebookExecutions(viewModel.uri);
            const exe2 = executionStateService.getCellExecution(cell.uri);
            assert.strictEqual(exe2, undefined);
        });
    });
    test('force-cancel works for Notebook Execution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const eventRaisedWithExecution = [];
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            executionStateService.onDidChangeExecution(e => eventRaisedWithExecution.push(e.type === NotebookExecutionType.notebook && !!e.changed), this, disposables);
            executionStateService.createExecution(viewModel.uri);
            const exe = executionStateService.getExecution(viewModel.uri);
            assert.ok(exe);
            assert.deepStrictEqual(eventRaisedWithExecution, [true]);
            executionStateService.forceCancelNotebookExecutions(viewModel.uri);
            const exe2 = executionStateService.getExecution(viewModel.uri);
            assert.deepStrictEqual(eventRaisedWithExecution, [true, false]);
            assert.strictEqual(exe2, undefined);
        });
    });
    test('force-cancel works for Cell and Notebook Execution', async function () {
        return withTestNotebook([], async (viewModel, _document, disposables) => {
            testNotebookModel = viewModel.notebookDocument;
            const kernel = new TestNotebookKernel();
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, viewModel.notebookDocument);
            const executionStateService = instantiationService.get(INotebookExecutionStateService);
            executionStateService.createExecution(viewModel.uri);
            executionStateService.createExecution(viewModel.uri);
            const cellExe = executionStateService.getExecution(viewModel.uri);
            const exe = executionStateService.getExecution(viewModel.uri);
            assert.ok(cellExe);
            assert.ok(exe);
            executionStateService.forceCancelNotebookExecutions(viewModel.uri);
            const cellExe2 = executionStateService.getExecution(viewModel.uri);
            const exe2 = executionStateService.getExecution(viewModel.uri);
            assert.strictEqual(cellExe2, undefined);
            assert.strictEqual(exe2, undefined);
        });
    });
});
class TestNotebookKernel {
    async executeNotebookCellsRequest() { }
    async cancelNotebookCellExecution(uri, cellHandles) { }
    provideVariables(notebookUri, parentId, kind, start, token) {
        return AsyncIterableObject.EMPTY;
    }
    constructor(opts) {
        this.id = 'test';
        this.label = '';
        this.viewType = '*';
        this.onDidChange = Event.None;
        this.extension = new ExtensionIdentifier('test');
        this.localResourceRoot = URI.file('/test');
        this.preloadUris = [];
        this.preloadProvides = [];
        this.supportedLanguages = [];
        this.supportedLanguages = opts?.languages ?? [PLAINTEXT_LANGUAGE_ID];
        if (opts?.id) {
            this.id = opts?.id;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQVMsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDNUcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFHNUYsT0FBTyxF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