/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { assertThrowsAsync, ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { insertCellAtIndex } from '../../browser/controller/cellOperations.js';
import { NotebookExecutionService } from '../../browser/services/notebookExecutionServiceImpl.js';
import { NotebookKernelService } from '../../browser/services/notebookKernelServiceImpl.js';
import { CellKind } from '../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelHistoryService, INotebookKernelService } from '../../common/notebookKernelService.js';
import { INotebookLoggingService } from '../../common/notebookLoggingService.js';
import { INotebookService } from '../../common/notebookService.js';
import { setupInstantiationService, withTestNotebook as _withTestNotebook } from './testNotebookEditor.js';
suite('NotebookExecutionService', () => {
    let instantiationService;
    let contextKeyService;
    let kernelService;
    let disposables;
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
        });
        instantiationService.stub(INotebookLoggingService, new class extends mock() {
            debug(category, output) {
                //
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
        instantiationService.stub(INotebookKernelHistoryService, new class extends mock() {
            getKernels(notebook) {
                return kernelService.getMatchingKernel(notebook);
            }
            addMostRecentKernel(kernel) { }
        });
        instantiationService.stub(ICommandService, new class extends mock() {
            executeCommand(_commandId, ..._args) {
                return Promise.resolve(undefined);
            }
        });
        kernelService = disposables.add(instantiationService.createInstance(NotebookKernelService));
        instantiationService.set(INotebookKernelService, kernelService);
        contextKeyService = instantiationService.get(IContextKeyService);
    });
    async function withTestNotebook(cells, callback) {
        return _withTestNotebook(cells, (editor, viewModel, disposables) => callback(viewModel, viewModel.notebookDocument, disposables));
    }
    // test('ctor', () => {
    // 	instantiationService.createInstance(NotebookEditorKernelManager, { activeKernel: undefined, viewModel: undefined });
    // 	const contextKeyService = instantiationService.get(IContextKeyService);
    // 	assert.strictEqual(contextKeyService.getContextKeyValue(NOTEBOOK_KERNEL_COUNT.key), 0);
    // });
    test('cell is not runnable when no kernel is selected', async () => {
        await withTestNotebook([], async (viewModel, textModel, disposables) => {
            const executionService = instantiationService.createInstance(NotebookExecutionService);
            const cell = insertCellAtIndex(viewModel, 1, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true);
            await assertThrowsAsync(async () => await executionService.executeNotebookCells(textModel, [cell.model], contextKeyService));
        });
    });
    test('cell is not runnable when kernel does not support the language', async () => {
        await withTestNotebook([], async (viewModel, textModel) => {
            disposables.add(kernelService.registerKernel(new TestNotebookKernel({ languages: ['testlang'] })));
            const executionService = disposables.add(instantiationService.createInstance(NotebookExecutionService));
            const cell = disposables.add(insertCellAtIndex(viewModel, 1, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            await assertThrowsAsync(async () => await executionService.executeNotebookCells(textModel, [cell.model], contextKeyService));
        });
    });
    test('cell is runnable when kernel does support the language', async () => {
        await withTestNotebook([], async (viewModel, textModel) => {
            const kernel = new TestNotebookKernel({ languages: ['javascript'] });
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, textModel);
            const executionService = disposables.add(instantiationService.createInstance(NotebookExecutionService));
            const executeSpy = sinon.spy();
            kernel.executeNotebookCellsRequest = executeSpy;
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            await executionService.executeNotebookCells(viewModel.notebookDocument, [cell.model], contextKeyService);
            assert.strictEqual(executeSpy.calledOnce, true);
        });
    });
    test('Completes unconfirmed executions', async function () {
        return withTestNotebook([], async (viewModel, textModel) => {
            let didExecute = false;
            const kernel = new class extends TestNotebookKernel {
                constructor() {
                    super({ languages: ['javascript'] });
                    this.id = 'mySpecialId';
                }
                async executeNotebookCellsRequest() {
                    didExecute = true;
                    return;
                }
            };
            disposables.add(kernelService.registerKernel(kernel));
            kernelService.selectKernelForNotebook(kernel, textModel);
            const executionService = disposables.add(instantiationService.createInstance(NotebookExecutionService));
            const exeStateService = instantiationService.get(INotebookExecutionStateService);
            const cell = disposables.add(insertCellAtIndex(viewModel, 0, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true));
            await executionService.executeNotebookCells(textModel, [cell.model], contextKeyService);
            assert.strictEqual(didExecute, true);
            assert.strictEqual(exeStateService.getCellExecution(cell.uri), undefined);
        });
    });
});
class TestNotebookKernel {
    provideVariables(notebookUri, parentId, kind, start, token) {
        return AsyncIterableObject.EMPTY;
    }
    executeNotebookCellsRequest() {
        throw new Error('Method not implemented.');
    }
    cancelNotebookCellExecution() {
        throw new Error('Method not implemented.');
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
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rRXhlY3V0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFB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