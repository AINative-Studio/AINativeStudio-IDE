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
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableFromEvent } from '../../../../base/common/observable.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { CellKind, NotebookCellExecutionState } from '../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../common/notebookExecutionStateService.js';
import { getAllOutputsText } from './viewModel/cellOutputTextHelper.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
let NotebookAccessibilityProvider = class NotebookAccessibilityProvider extends Disposable {
    constructor(viewModel, isReplHistory, notebookExecutionStateService, keybindingService, configurationService, accessibilityService) {
        super();
        this.viewModel = viewModel;
        this.isReplHistory = isReplHistory;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this._onDidAriaLabelChange = new Emitter();
        this.onDidAriaLabelChange = this._onDidAriaLabelChange.event;
        this._register(Event.debounce(this.notebookExecutionStateService.onDidChangeExecution, (last, e) => this.mergeEvents(last, e), 100)((updates) => {
            if (!updates.length) {
                return;
            }
            const viewModel = this.viewModel();
            if (viewModel) {
                for (const update of updates) {
                    const cellModel = viewModel.getCellByHandle(update.cellHandle);
                    if (cellModel) {
                        this._onDidAriaLabelChange.fire(cellModel);
                    }
                }
                const lastUpdate = updates[updates.length - 1];
                if (this.shouldReadCellOutputs(lastUpdate.state)) {
                    const cell = viewModel.getCellByHandle(lastUpdate.cellHandle);
                    if (cell && cell.outputsViewModels.length) {
                        const text = getAllOutputsText(viewModel.notebookDocument, cell, true);
                        alert(text);
                    }
                }
            }
        }, this));
    }
    shouldReadCellOutputs(state) {
        return state === undefined // execution completed
            && this.isReplHistory
            && this.accessibilityService.isScreenReaderOptimized()
            && this.configurationService.getValue('accessibility.replEditor.readLastExecutionOutput');
    }
    get verbositySettingId() {
        return this.isReplHistory ?
            "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */ :
            "accessibility.verbosity.notebook" /* AccessibilityVerbositySettingId.Notebook */;
    }
    getAriaLabel(element) {
        const event = Event.filter(this.onDidAriaLabelChange, e => e === element);
        return observableFromEvent(this, event, () => {
            const viewModel = this.viewModel();
            if (!viewModel) {
                return '';
            }
            const index = viewModel.getCellIndex(element);
            if (index >= 0) {
                return this.getLabel(element);
            }
            return '';
        });
    }
    createItemLabel(executionLabel, cellKind) {
        return this.isReplHistory ?
            `cell${executionLabel}` :
            `${cellKind === CellKind.Markup ? 'markdown' : 'code'} cell${executionLabel}`;
    }
    getLabel(element) {
        const executionState = this.notebookExecutionStateService.getCellExecution(element.uri)?.state;
        const executionLabel = executionState === NotebookCellExecutionState.Executing
            ? ', executing'
            : executionState === NotebookCellExecutionState.Pending
                ? ', pending'
                : '';
        return this.createItemLabel(executionLabel, element.cellKind);
    }
    get widgetAriaLabelName() {
        return this.isReplHistory ?
            nls.localize('replHistoryTreeAriaLabel', "REPL Editor History") :
            nls.localize('notebookTreeAriaLabel', "Notebook");
    }
    getWidgetAriaLabel() {
        const keybinding = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
        if (this.configurationService.getValue(this.verbositySettingId)) {
            return keybinding
                ? nls.localize('notebookTreeAriaLabelHelp', "{0}\nUse {1} for accessibility help", this.widgetAriaLabelName, keybinding)
                : nls.localize('notebookTreeAriaLabelHelpNoKb', "{0}\nRun the Open Accessibility Help command for more information", this.widgetAriaLabelName);
        }
        return this.widgetAriaLabelName;
    }
    mergeEvents(last, e) {
        const viewModel = this.viewModel();
        const result = last || [];
        if (viewModel && e.type === NotebookExecutionType.cell && e.affectsNotebook(viewModel.uri)) {
            const index = result.findIndex(update => update.cellHandle === e.cellHandle);
            if (index >= 0) {
                result.splice(index, 1);
            }
            result.push({ cellHandle: e.cellHandle, state: e.changed?.state });
        }
        return result;
    }
};
NotebookAccessibilityProvider = __decorate([
    __param(2, INotebookExecutionStateService),
    __param(3, IKeybindingService),
    __param(4, IConfigurationService),
    __param(5, IAccessibilityService)
], NotebookAccessibilityProvider);
export { NotebookAccessibilityProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tBY2Nlc3NpYmlsaXR5UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rQWNjZXNzaWJpbGl0eVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFJMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ25GLE9BQU8sRUFBZ0UsOEJBQThCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqTCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFJMUQsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxVQUFVO0lBSTVELFlBQ2tCLFNBQThDLEVBQzlDLGFBQXNCLEVBQ1AsNkJBQThFLEVBQzFGLGlCQUFzRCxFQUNuRCxvQkFBNEQsRUFDNUQs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