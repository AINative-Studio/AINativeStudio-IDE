/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { CellDiagnostics } from '../../../browser/contrib/cellDiagnostics/cellDiagnosticEditorContrib.js';
import { CellKind, NotebookSetting } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
import { setupInstantiationService, TestNotebookExecutionStateService, withTestNotebook } from '../testNotebookEditor.js';
import { nullExtensionDescription } from '../../../../../services/extensions/common/extensions.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
suite('notebookCellDiagnostics', () => {
    let instantiationService;
    let disposables;
    let testExecutionService;
    let markerService;
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    class TestExecutionService extends TestNotebookExecutionStateService {
        constructor() {
            super(...arguments);
            this._onDidChangeExecution = new Emitter();
            this.onDidChangeExecution = this._onDidChangeExecution.event;
        }
        fireExecutionChanged(notebook, cellHandle, changed) {
            this._onDidChangeExecution.fire({
                type: NotebookExecutionType.cell,
                cellHandle,
                notebook,
                affectsNotebook: () => true,
                affectsCell: () => true,
                changed: changed
            });
        }
    }
    setup(function () {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        testExecutionService = new TestExecutionService();
        instantiationService.stub(INotebookExecutionStateService, testExecutionService);
        const agentData = {
            extensionId: nullExtensionDescription.identifier,
            extensionDisplayName: '',
            extensionPublisherId: '',
            name: 'testEditorAgent',
            isDefault: true,
            locations: [ChatAgentLocation.Notebook],
            metadata: {},
            slashCommands: [],
            disambiguation: [],
        };
        const chatAgentService = new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeAgents = Event.None;
            }
            getAgents() {
                return [{
                        id: 'testEditorAgent',
                        ...agentData
                    }];
            }
        };
        instantiationService.stub(IChatAgentService, chatAgentService);
        markerService = new class extends mock() {
            constructor() {
                super(...arguments);
                this._onMarkersUpdated = new Emitter();
                this.onMarkersUpdated = this._onMarkersUpdated.event;
                this.markers = new ResourceMap();
            }
            changeOne(owner, resource, markers) {
                this.markers.set(resource, markers);
                this._onMarkersUpdated.fire();
            }
        };
        instantiationService.stub(IMarkerService, markerService);
        const config = instantiationService.get(IConfigurationService);
        config.setUserConfiguration(NotebookSetting.cellFailureDiagnostics, true);
    });
    test('diagnostic is added for cell execution failure', async function () {
        await withTestNotebook([
            ['print(x)', 'python', CellKind.Code, [], {}]
        ], async (editor, viewModel, store, accessor) => {
            const cell = viewModel.viewCells[0];
            disposables.add(instantiationService.createInstance(CellDiagnostics, editor));
            cell.model.internalMetadata.lastRunSuccess = false;
            cell.model.internalMetadata.error = {
                name: 'error',
                message: 'something bad happened',
                stack: 'line 1 : print(x)',
                uri: cell.uri,
                location: { startColumn: 1, endColumn: 5, startLineNumber: 1, endLineNumber: 1 }
            };
            testExecutionService.fireExecutionChanged(editor.textModel.uri, cell.handle);
            await new Promise(resolve => Event.once(markerService.onMarkersUpdated)(resolve));
            assert.strictEqual(cell?.executionErrorDiagnostic.get()?.message, 'something bad happened');
            assert.equal(markerService.markers.get(cell.uri)?.length, 1);
        }, instantiationService);
    });
    test('diagnostics are cleared only for cell with new execution', async function () {
        await withTestNotebook([
            ['print(x)', 'python', CellKind.Code, [], {}],
            ['print(y)', 'python', CellKind.Code, [], {}]
        ], async (editor, viewModel, store, accessor) => {
            const cell = viewModel.viewCells[0];
            const cell2 = viewModel.viewCells[1];
            disposables.add(instantiationService.createInstance(CellDiagnostics, editor));
            cell.model.internalMetadata.lastRunSuccess = false;
            cell.model.internalMetadata.error = {
                name: 'error',
                message: 'something bad happened',
                stack: 'line 1 : print(x)',
                uri: cell.uri,
                location: { startColumn: 1, endColumn: 5, startLineNumber: 1, endLineNumber: 1 }
            };
            cell2.model.internalMetadata.lastRunSuccess = false;
            cell2.model.internalMetadata.error = {
                name: 'error',
                message: 'another bad thing happened',
                stack: 'line 1 : print(y)',
                uri: cell.uri,
                location: { startColumn: 1, endColumn: 5, startLineNumber: 1, endLineNumber: 1 }
            };
            testExecutionService.fireExecutionChanged(editor.textModel.uri, cell.handle);
            testExecutionService.fireExecutionChanged(editor.textModel.uri, cell2.handle);
            await new Promise(resolve => Event.once(markerService.onMarkersUpdated)(resolve));
            cell.model.internalMetadata.error = undefined;
            // on NotebookCellExecution value will make it look like its currently running
            testExecutionService.fireExecutionChanged(editor.textModel.uri, cell.handle, {});
            await new Promise(resolve => Event.once(markerService.onMarkersUpdated)(resolve));
            assert.strictEqual(cell?.executionErrorDiagnostic.get(), undefined);
            assert.strictEqual(cell2?.executionErrorDiagnostic.get()?.message, 'another bad thing happened', 'cell that was not executed should still have an error');
            assert.equal(markerService.markers.get(cell.uri)?.length, 0);
            assert.equal(markerService.markers.get(cell2.uri)?.length, 1);
        }, instantiationService);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsRGlhZ25vc3RpY3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va0NlbGxEaWFnbm9zdGljcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBR3pHLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuRyxPQUFPLEVBQThCLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBRTFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUF3Riw4QkFBOEIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQy9NLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxpQ0FBaUMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzFILE9BQU8sRUFBRSx3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