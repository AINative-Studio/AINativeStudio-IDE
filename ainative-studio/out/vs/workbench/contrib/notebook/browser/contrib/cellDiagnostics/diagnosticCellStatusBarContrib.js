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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID } from './cellDiagnosticsActions.js';
import { NotebookStatusBarController } from '../cellStatusBar/executionStatusBarItemController.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
let DiagnosticCellStatusBarContrib = class DiagnosticCellStatusBarContrib extends Disposable {
    static { this.id = 'workbench.notebook.statusBar.diagtnostic'; }
    constructor(notebookEditor, instantiationService) {
        super();
        this._register(new NotebookStatusBarController(notebookEditor, (vm, cell) => cell instanceof CodeCellViewModel ?
            instantiationService.createInstance(DiagnosticCellStatusBarItem, vm, cell) :
            Disposable.None));
    }
};
DiagnosticCellStatusBarContrib = __decorate([
    __param(1, IInstantiationService)
], DiagnosticCellStatusBarContrib);
export { DiagnosticCellStatusBarContrib };
registerNotebookContribution(DiagnosticCellStatusBarContrib.id, DiagnosticCellStatusBarContrib);
let DiagnosticCellStatusBarItem = class DiagnosticCellStatusBarItem extends Disposable {
    constructor(_notebookViewModel, cell, keybindingService, chatAgentService) {
        super();
        this._notebookViewModel = _notebookViewModel;
        this.cell = cell;
        this.keybindingService = keybindingService;
        this.chatAgentService = chatAgentService;
        this._currentItemIds = [];
        this._register(autorun((reader) => this.updateSparkleItem(reader.readObservable(cell.executionErrorDiagnostic))));
    }
    hasNotebookAgent() {
        const agents = this.chatAgentService.getAgents();
        return !!agents.find(agent => agent.locations.includes(ChatAgentLocation.Notebook));
    }
    async updateSparkleItem(error) {
        let item;
        if (error?.location && this.hasNotebookAgent()) {
            const keybinding = this.keybindingService.lookupKeybinding(OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID)?.getLabel();
            const tooltip = localize('notebook.cell.status.diagnostic', "Quick Actions {0}", `(${keybinding})`);
            item = {
                text: `$(sparkle)`,
                tooltip,
                alignment: 1 /* CellStatusbarAlignment.Left */,
                command: OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID,
                priority: Number.MAX_SAFE_INTEGER - 1
            };
        }
        const items = item ? [item] : [];
        this._currentItemIds = this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [{ handle: this.cell.handle, items }]);
    }
    dispose() {
        super.dispose();
        this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [{ handle: this.cell.handle, items: [] }]);
    }
};
DiagnosticCellStatusBarItem = __decorate([
    __param(2, IKeybindingService),
    __param(3, IChatAgentService)
], DiagnosticCellStatusBarItem);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY0NlbGxTdGF0dXNCYXJDb250cmliLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jZWxsRGlhZ25vc3RpY3MvZGlhZ25vc3RpY0NlbGxTdGF0dXNCYXJDb250cmliLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ25GLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRW5HLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQStCLFNBQVEsVUFBVTthQUN0RCxPQUFFLEdBQVcsMENBQTBDLEFBQXJELENBQXNEO0lBRS9ELFlBQ0MsY0FBK0IsRUFDUixvQkFBMkM7UUFFbEUsS0FB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