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
import * as DOM from '../../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { errorStateIcon, executingStateIcon, pendingStateIcon, successStateIcon } from '../../notebookIcons.js';
import { NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
let CollapsedCodeCellExecutionIcon = class CollapsedCodeCellExecutionIcon extends Disposable {
    constructor(_notebookEditor, _cell, _element, _executionStateService) {
        super();
        this._cell = _cell;
        this._element = _element;
        this._executionStateService = _executionStateService;
        this._visible = false;
        this._update();
        this._register(this._executionStateService.onDidChangeExecution(e => {
            if (e.type === NotebookExecutionType.cell && e.affectsCell(this._cell.uri)) {
                this._update();
            }
        }));
        this._register(this._cell.model.onDidChangeInternalMetadata(() => this._update()));
    }
    setVisibility(visible) {
        this._visible = visible;
        this._update();
    }
    _update() {
        if (!this._visible) {
            return;
        }
        const runState = this._executionStateService.getCellExecution(this._cell.uri);
        const item = this._getItemForState(runState, this._cell.model.internalMetadata);
        if (item) {
            this._element.style.display = '';
            DOM.reset(this._element, ...renderLabelWithIcons(item.text));
            this._element.title = item.tooltip ?? '';
        }
        else {
            this._element.style.display = 'none';
            DOM.reset(this._element);
        }
    }
    _getItemForState(runState, internalMetadata) {
        const state = runState?.state;
        const { lastRunSuccess } = internalMetadata;
        if (!state && lastRunSuccess) {
            return {
                text: `$(${successStateIcon.id})`,
                tooltip: localize('notebook.cell.status.success', "Success"),
            };
        }
        else if (!state && lastRunSuccess === false) {
            return {
                text: `$(${errorStateIcon.id})`,
                tooltip: localize('notebook.cell.status.failure', "Failure"),
            };
        }
        else if (state === NotebookCellExecutionState.Pending || state === NotebookCellExecutionState.Unconfirmed) {
            return {
                text: `$(${pendingStateIcon.id})`,
                tooltip: localize('notebook.cell.status.pending', "Pending"),
            };
        }
        else if (state === NotebookCellExecutionState.Executing) {
            const icon = ThemeIcon.modify(executingStateIcon, 'spin');
            return {
                text: `$(${icon.id})`,
                tooltip: localize('notebook.cell.status.executing', "Executing"),
            };
        }
        return;
    }
};
CollapsedCodeCellExecutionIcon = __decorate([
    __param(3, INotebookExecutionStateService)
], CollapsedCodeCellExecutionIcon);
export { CollapsedCodeCellExecutionIcon };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNlbGxFeGVjdXRpb25JY29uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY29kZUNlbGxFeGVjdXRpb25JY29uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDakcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2hILE9BQU8sRUFBRSwwQkFBMEIsRUFBZ0MsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RyxPQUFPLEVBQTBCLDhCQUE4QixFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFPMUksSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO0lBRzdELFlBQ0MsZUFBd0MsRUFDdkIsS0FBcUIsRUFDckIsUUFBcUIsRUFDTixzQkFBOEQ7UUFFOUYsS0FBSyxFQUFFLENBQUM7UUFKUyxVQUFLLEdBQUwsS0FBSyxDQUFnQjtRQUNyQixhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ0UsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFnQztRQU52RixhQUFRLEdBQUcsS0FBSyxDQUFDO1FBVXhCLElBQUks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