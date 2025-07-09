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
import * as DOM from '../../../../base/browser/dom.js';
import { Action } from '../../../../base/common/actions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import Messages from './messages.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { MarkersContextKeys } from '../common/markers.js';
import './markersViewActions.css';
export class MarkersFilters extends Disposable {
    constructor(options, contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._excludedFiles = MarkersContextKeys.ShowExcludedFilesFilterContextKey.bindTo(this.contextKeyService);
        this._activeFile = MarkersContextKeys.ShowActiveFileFilterContextKey.bindTo(this.contextKeyService);
        this._showWarnings = MarkersContextKeys.ShowWarningsFilterContextKey.bindTo(this.contextKeyService);
        this._showErrors = MarkersContextKeys.ShowErrorsFilterContextKey.bindTo(this.contextKeyService);
        this._showInfos = MarkersContextKeys.ShowInfoFilterContextKey.bindTo(this.contextKeyService);
        this._showErrors.set(options.showErrors);
        this._showWarnings.set(options.showWarnings);
        this._showInfos.set(options.showInfos);
        this._excludedFiles.set(options.excludedFiles);
        this._activeFile.set(options.activeFile);
        this.filterHistory = options.filterHistory;
    }
    get excludedFiles() {
        return !!this._excludedFiles.get();
    }
    set excludedFiles(filesExclude) {
        if (this._excludedFiles.get() !== filesExclude) {
            this._excludedFiles.set(filesExclude);
            this._onDidChange.fire({ excludedFiles: true });
        }
    }
    get activeFile() {
        return !!this._activeFile.get();
    }
    set activeFile(activeFile) {
        if (this._activeFile.get() !== activeFile) {
            this._activeFile.set(activeFile);
            this._onDidChange.fire({ activeFile: true });
        }
    }
    get showWarnings() {
        return !!this._showWarnings.get();
    }
    set showWarnings(showWarnings) {
        if (this._showWarnings.get() !== showWarnings) {
            this._showWarnings.set(showWarnings);
            this._onDidChange.fire({ showWarnings: true });
        }
    }
    get showErrors() {
        return !!this._showErrors.get();
    }
    set showErrors(showErrors) {
        if (this._showErrors.get() !== showErrors) {
            this._showErrors.set(showErrors);
            this._onDidChange.fire({ showErrors: true });
        }
    }
    get showInfos() {
        return !!this._showInfos.get();
    }
    set showInfos(showInfos) {
        if (this._showInfos.get() !== showInfos) {
            this._showInfos.set(showInfos);
            this._onDidChange.fire({ showInfos: true });
        }
    }
}
export class QuickFixAction extends Action {
    static { this.ID = 'workbench.actions.problems.quickfix'; }
    static { this.CLASS = 'markers-panel-action-quickfix ' + ThemeIcon.asClassName(Codicon.lightBulb); }
    static { this.AUTO_FIX_CLASS = QuickFixAction.CLASS + ' autofixable'; }
    get quickFixes() {
        return this._quickFixes;
    }
    set quickFixes(quickFixes) {
        this._quickFixes = quickFixes;
        this.enabled = this._quickFixes.length > 0;
    }
    autoFixable(autofixable) {
        this.class = autofixable ? QuickFixAction.AUTO_FIX_CLASS : QuickFixAction.CLASS;
    }
    constructor(marker) {
        super(QuickFixAction.ID, Messages.MARKERS_PANEL_ACTION_TOOLTIP_QUICKFIX, QuickFixAction.CLASS, false);
        this.marker = marker;
        this._onShowQuickFixes = this._register(new Emitter());
        this.onShowQuickFixes = this._onShowQuickFixes.event;
        this._quickFixes = [];
    }
    run() {
        this._onShowQuickFixes.fire();
        return Promise.resolve();
    }
}
let QuickFixActionViewItem = class QuickFixActionViewItem extends ActionViewItem {
    constructor(action, options, contextMenuService) {
        super(null, action, { ...options, icon: true, label: false });
        this.contextMenuService = contextMenuService;
    }
    onClick(event) {
        DOM.EventHelper.stop(event, true);
        this.showQuickFixes();
    }
    showQuickFixes() {
        if (!this.element) {
            return;
        }
        if (!this.isEnabled()) {
            return;
        }
        const elementPosition = DOM.getDomNodePagePosition(this.element);
        const quickFixes = this.action.quickFixes;
        if (quickFixes.length) {
            this.contextMenuService.showContextMenu({
                getAnchor: () => ({ x: elementPosition.left + 10, y: elementPosition.top + elementPosition.height + 4 }),
                getActions: () => quickFixes
            });
        }
    }
};
QuickFixActionViewItem = __decorate([
    __param(2, IContextMenuService)
], QuickFixActionViewItem);
export { QuickFixActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc1ZpZXdBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtlcnMvYnJvd3Nlci9tYXJrZXJzVmlld0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxRQUFRLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdsRSxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUEwQixNQUFNLDBEQUEwRCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzFELE9BQU8sMEJBQTBCLENBQUM7QUFtQmxDLE1BQU0sT0FBTyxjQUFlLFNBQVEsVUFBVTtJQUs3QyxZQUFZLE9BQStCLEVBQW1CLGlCQUFxQztRQUNsRyxLQUFLLEVBQUUsQ0FBQztRQURxRCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBSGxGLGlCQUFZLEdBQXdDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQThCLENBQUMsQ0FBQztRQUN0SCxnQkFBVyxHQUFzQyxJQUFJLENBQUMsWUFBWSxDQUFD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