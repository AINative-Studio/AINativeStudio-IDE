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
import { ProgressBar } from '../../../../../../base/browser/ui/progressbar/progressbar.js';
import { defaultProgressBarStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { CellContentPart } from '../cellPart.js';
import { NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
let CellProgressBar = class CellProgressBar extends CellContentPart {
    constructor(editorContainer, collapsedInputContainer, _notebookExecutionStateService) {
        super();
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._progressBar = this._register(new ProgressBar(editorContainer, defaultProgressBarStyles));
        this._progressBar.hide();
        this._collapsedProgressBar = this._register(new ProgressBar(collapsedInputContainer, defaultProgressBarStyles));
        this._collapsedProgressBar.hide();
    }
    didRenderCell(element) {
        this._updateForExecutionState(element);
    }
    updateForExecutionState(element, e) {
        this._updateForExecutionState(element, e);
    }
    updateState(element, e) {
        if (e.metadataChanged || e.internalMetadataChanged) {
            this._updateForExecutionState(element);
        }
        if (e.inputCollapsedChanged) {
            const exeState = this._notebookExecutionStateService.getCellExecution(element.uri);
            if (element.isInputCollapsed) {
                this._progressBar.hide();
                if (exeState?.state === NotebookCellExecutionState.Executing) {
                    this._updateForExecutionState(element);
                }
            }
            else {
                this._collapsedProgressBar.hide();
                if (exeState?.state === NotebookCellExecutionState.Executing) {
                    this._updateForExecutionState(element);
                }
            }
        }
    }
    _updateForExecutionState(element, e) {
        const exeState = e?.changed ?? this._notebookExecutionStateService.getCellExecution(element.uri);
        const progressBar = element.isInputCollapsed ? this._collapsedProgressBar : this._progressBar;
        if (exeState?.state === NotebookCellExecutionState.Executing && (!exeState.didPause || element.isInputCollapsed)) {
            showProgressBar(progressBar);
        }
        else {
            progressBar.hide();
        }
    }
};
CellProgressBar = __decorate([
    __param(2, INotebookExecutionStateService)
], CellProgressBar);
export { CellProgressBar };
function showProgressBar(progressBar) {
    progressBar.infinite().show(500);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFByb2dyZXNzQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbFByb2dyZXNzQmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUdyRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDakQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0UsT0FBTyxFQUFtQyw4QkFBOEIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVILElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWdCLFNBQVEsZUFBZTtJQUluRCxZQUNDLGVBQTRCLEVBQzVCLHVCQUFvQyxFQUNhLDhCQUE4RDtRQUMvRyxLQUFLLEVBQUUsQ0FBQztRQUR5QyxtQ0FBOEIsR0FBOUIsOEJBQThCLENBQWdDO1FBRy9HLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxlQUFlLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBQy9GLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFekIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxXQUFXLENBQUMsdUJBQXVCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBQ2hILElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRVEsYUFBYSxDQUFDLE9BQXVCO1FBQzdDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRVEsdUJBQXVCLENBQUMsT0FBdUIsRUFBRSxDQUFrQztRQUMzRixJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFUSxXQUFXLENBQUMsT0FBdUIsRUFBRSxDQUFnQztRQUM3RSxJQUFJLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkYsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxRQUFRLEVBQUUsS0FBSyxLQUFLLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUM5RCxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3hDLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNsQyxJQUFJLFFBQVEsRUFBRSxLQUFLLEtBQUssMEJBQTBCLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQzlELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDeEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLHdCQUF3QixDQUFDLE9BQXVCLEVBQUUsQ0FBbUM7UUFDNUYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSSxJQUFJLENBQUMsOEJBQThCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pHLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQzlGLElBQUksUUFBUSxFQUFFLEtBQUssS0FBSywwQkFBMEIsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUNsSCxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUIsQ0FBQzthQUFNLENBQUM7WUFDUCxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBdkRZLGVBQWU7SUFPekIsV0FBQSw4QkFBOEIsQ0FBQTtHQVBwQixlQUFlLENBdUQzQjs7QUFFRCxTQUFTLGVBQWUsQ0FBQyxXQUF3QjtJQUNoRCxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xDLENBQUMifQ==