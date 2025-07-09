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
import { throttle } from '../../../../../../base/common/decorators.js';
import { Disposable, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { IUserActivityService } from '../../../../../services/userActivity/common/userActivityService.js';
let ExecutionEditorProgressController = class ExecutionEditorProgressController extends Disposable {
    static { this.id = 'workbench.notebook.executionEditorProgress'; }
    constructor(_notebookEditor, _notebookExecutionStateService, _userActivity) {
        super();
        this._notebookEditor = _notebookEditor;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._userActivity = _userActivity;
        this._activityMutex = this._register(new MutableDisposable());
        this._register(_notebookEditor.onDidScroll(() => this._update()));
        this._register(_notebookExecutionStateService.onDidChangeExecution(e => {
            if (e.notebook.toString() !== this._notebookEditor.textModel?.uri.toString()) {
                return;
            }
            this._update();
        }));
        this._register(_notebookEditor.onDidChangeModel(() => this._update()));
    }
    _update() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const cellExecutions = this._notebookExecutionStateService.getCellExecutionsForNotebook(this._notebookEditor.textModel?.uri)
            .filter(exe => exe.state === NotebookCellExecutionState.Executing);
        const notebookExecution = this._notebookExecutionStateService.getExecution(this._notebookEditor.textModel?.uri);
        const executionIsVisible = (exe) => {
            for (const range of this._notebookEditor.visibleRanges) {
                for (const cell of this._notebookEditor.getCellsInRange(range)) {
                    if (cell.handle === exe.cellHandle) {
                        const top = this._notebookEditor.getAbsoluteTopOfElement(cell);
                        if (this._notebookEditor.scrollTop < top + 5) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };
        const hasAnyExecution = cellExecutions.length || notebookExecution;
        if (hasAnyExecution && !this._activityMutex.value) {
            this._activityMutex.value = this._userActivity.markActive();
        }
        else if (!hasAnyExecution && this._activityMutex.value) {
            this._activityMutex.clear();
        }
        const shouldShowEditorProgressbarForCellExecutions = cellExecutions.length && !cellExecutions.some(executionIsVisible) && !cellExecutions.some(e => e.isPaused);
        const showEditorProgressBar = !!notebookExecution || shouldShowEditorProgressbarForCellExecutions;
        if (showEditorProgressBar) {
            this._notebookEditor.showProgress();
        }
        else {
            this._notebookEditor.hideProgress();
        }
    }
};
__decorate([
    throttle(100)
], ExecutionEditorProgressController.prototype, "_update", null);
ExecutionEditorProgressController = __decorate([
    __param(1, INotebookExecutionStateService),
    __param(2, IUserActivityService)
], ExecutionEditorProgressController);
export { ExecutionEditorProgressController };
registerNotebookContribution(ExecutionEditorProgressController.id, ExecutionEditorProgressController);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0aW9uRWRpdG9yUHJvZ3Jlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2V4ZWN1dGUvZXhlY3V0aW9uRWRpdG9yUHJvZ3Jlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUzRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRSxPQUFPLEVBQTBCLDhCQUE4QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDMUgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFFbkcsSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBa0MsU0FBUSxVQUFVO2FBQ3pELE9BQUUsR0FBVyw0Q0FBNEMsQUFBdkQsQ0FBd0Q7SUFJakUsWUFDa0IsZUFBZ0MsRUFDakIsOEJBQStFLEVBQ3pGLGFBQW9EO1FBRTFFLEtBQUssRUFBRSxDQUFDO1FBSlMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ0EsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFnQztRQUN4RSxrQkFBYSxHQUFiLGFBQWEsQ0FBc0I7UUFMMUQsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBU3pFLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUs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