/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CellDiagnostics_1;
import { Disposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { CellKind, NotebookSetting } from '../../../common/notebookCommon.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { Event } from '../../../../../../base/common/event.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
let CellDiagnostics = class CellDiagnostics extends Disposable {
    static { CellDiagnostics_1 = this; }
    static { this.ID = 'workbench.notebook.cellDiagnostics'; }
    constructor(notebookEditor, notebookExecutionStateService, markerService, chatAgentService, configurationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.markerService = markerService;
        this.chatAgentService = chatAgentService;
        this.configurationService = configurationService;
        this.enabled = false;
        this.listening = false;
        this.diagnosticsByHandle = new Map();
        this.updateEnabled();
        this._register(chatAgentService.onDidChangeAgents(() => this.updateEnabled()));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.cellFailureDiagnostics)) {
                this.updateEnabled();
            }
        }));
    }
    hasNotebookAgent() {
        const agents = this.chatAgentService.getAgents();
        return !!agents.find(agent => agent.locations.includes(ChatAgentLocation.Notebook));
    }
    updateEnabled() {
        const settingEnabled = this.configurationService.getValue(NotebookSetting.cellFailureDiagnostics);
        if (this.enabled && (!settingEnabled || !this.hasNotebookAgent())) {
            this.enabled = false;
            this.clearAll();
        }
        else if (!this.enabled && settingEnabled && this.hasNotebookAgent()) {
            this.enabled = true;
            if (!this.listening) {
                this.listening = true;
                this._register(Event.accumulate(this.notebookExecutionStateService.onDidChangeExecution, 200)((e) => this.handleChangeExecutionState(e)));
            }
        }
    }
    handleChangeExecutionState(changes) {
        if (!this.enabled) {
            return;
        }
        const handled = new Set();
        for (const e of changes.reverse()) {
            const notebookUri = this.notebookEditor.textModel?.uri;
            if (e.type === NotebookExecutionType.cell && notebookUri && e.affectsNotebook(notebookUri) && !handled.has(e.cellHandle)) {
                handled.add(e.cellHandle);
                if (!!e.changed) {
                    // cell is running
                    this.clear(e.cellHandle);
                }
                else {
                    this.setDiagnostics(e.cellHandle);
                }
            }
        }
    }
    clearAll() {
        for (const handle of this.diagnosticsByHandle.keys()) {
            this.clear(handle);
        }
    }
    clear(cellHandle) {
        const disposables = this.diagnosticsByHandle.get(cellHandle);
        if (disposables) {
            for (const disposable of disposables) {
                disposable.dispose();
            }
            this.diagnosticsByHandle.delete(cellHandle);
        }
    }
    setDiagnostics(cellHandle) {
        if (this.diagnosticsByHandle.has(cellHandle)) {
            // multiple diagnostics per cell not supported for now
            return;
        }
        const cell = this.notebookEditor.getCellByHandle(cellHandle);
        if (!cell || cell.cellKind !== CellKind.Code) {
            return;
        }
        const metadata = cell.model.internalMetadata;
        if (cell instanceof CodeCellViewModel && !metadata.lastRunSuccess && metadata?.error?.location) {
            const disposables = [];
            const errorLabel = metadata.error.name ? `${metadata.error.name}: ${metadata.error.message}` : metadata.error.message;
            const marker = this.createMarkerData(errorLabel, metadata.error.location);
            this.markerService.changeOne(CellDiagnostics_1.ID, cell.uri, [marker]);
            disposables.push(toDisposable(() => this.markerService.changeOne(CellDiagnostics_1.ID, cell.uri, [])));
            cell.executionErrorDiagnostic.set(metadata.error, undefined);
            disposables.push(toDisposable(() => cell.executionErrorDiagnostic.set(undefined, undefined)));
            disposables.push(cell.model.onDidChangeOutputs(() => {
                if (cell.model.outputs.length === 0) {
                    this.clear(cellHandle);
                }
            }));
            disposables.push(cell.model.onDidChangeContent(() => {
                this.clear(cellHandle);
            }));
            this.diagnosticsByHandle.set(cellHandle, disposables);
        }
    }
    createMarkerData(message, location) {
        return {
            severity: 8,
            message: message,
            startLineNumber: location.startLineNumber + 1,
            startColumn: location.startColumn + 1,
            endLineNumber: location.endLineNumber + 1,
            endColumn: location.endColumn + 1,
            source: 'Cell Execution Error'
        };
    }
    dispose() {
        super.dispose();
        this.clearAll();
    }
};
CellDiagnostics = CellDiagnostics_1 = __decorate([
    __param(1, INotebookExecutionStateService),
    __param(2, IMarkerService),
    __param(3, IChatAgentService),
    __param(4, IConfigurationService)
], CellDiagnostics);
export { CellDiagnostics };
registerNotebookContribution(CellDiagnostics.ID, CellDiagnostics);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERpYWdub3N0aWNFZGl0b3JDb250cmliLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jZWxsRGlhZ25vc3RpY3MvY2VsbERpYWdub3N0aWNFZGl0b3JDb250cmliLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25HLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVuRyxPQUFPLEVBQWdFLDhCQUE4QixFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDdkwsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxVQUFVOzthQUV2QyxPQUFFLEdBQVcsb0NBQW9DLEFBQS9DLENBQWdEO0lBTXpELFlBQ2tCLGNBQStCLEVBQ2hCLDZCQUE4RSxFQUM5RixhQUE4QyxFQUMzQyxnQkFBb0QsRUFDaEQsb0JBQTREO1FBRW5GLEtBQUssRUFBRSxDQUFDO1FBTlMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ0Msa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFnQztRQUM3RSxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDMUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUMvQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBVDVFLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFDaEIsY0FBUyxHQUFHLEtBQUssQ0FBQztRQUNsQix3QkFBbUIsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQVduRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNsRSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDdEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNqRCxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRU8sYUFBYTtRQUNwQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ2xHLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ25FLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQixDQUFDO2FBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksY0FBYyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDdkUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FDOUIsSUFBSSxDQUFDLDZCQUE2QixDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FDNUQsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTywwQkFBMEIsQ0FBQyxPQUEwRTtRQUM1RyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNsQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBRW5DLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQztZQUN2RCxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLENBQUMsSUFBSSxJQUFJLFdBQVcsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDMUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDakIsa0JBQWtCO29CQUNsQixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDMUIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sUUFBUTtRQUNmLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDdEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUssQ0FBQyxVQUFrQjtRQUM5QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDdEMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLENBQUM7WUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdDLENBQUM7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUFDLFVBQWtCO1FBQ3hDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzlDLHNEQUFzRDtZQUN0RCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDO1FBQzdDLElBQUksSUFBSSxZQUFZLGlCQUFpQixJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsSUFBSSxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ2hHLE1BQU0sV0FBVyxHQUFrQixFQUFFLENBQUM7WUFDdEMsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7WUFDdEgsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLGlCQUFlLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLGlCQUFlLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM3RCxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUYsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRTtnQkFDbkQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3hCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0osV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRTtnQkFDbkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDdkQsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxPQUFlLEVBQUUsUUFBZ0I7UUFDekQsT0FBTztZQUNOLFFBQVEsRUFBRSxDQUFDO1lBQ1gsT0FBTyxFQUFFLE9BQU87WUFDaEIsZUFBZSxFQUFFLFFBQVEsQ0FBQyxlQUFlLEdBQUcsQ0FBQztZQUM3QyxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsR0FBRyxDQUFDO1lBQ3JDLGFBQWEsRUFBRSxRQUFRLENBQUMsYUFBYSxHQUFHLENBQUM7WUFDekMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQztZQUNqQyxNQUFNLEVBQUUsc0JBQXNCO1NBQzlCLENBQUM7SUFDSCxDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDakIsQ0FBQzs7QUFwSVcsZUFBZTtJQVV6QixXQUFBLDhCQUE4QixDQUFBO0lBQzlCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHFCQUFxQixDQUFBO0dBYlgsZUFBZSxDQXNJM0I7O0FBRUQsNEJBQTRCLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQyJ9