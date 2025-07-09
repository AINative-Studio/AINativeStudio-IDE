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
var BulkEditPreviewContribution_1;
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { BulkEditPane } from './bulkEditPane.js';
import { Extensions as ViewContainerExtensions } from '../../../../common/views.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { FocusedViewContext } from '../../../../common/contextkeys.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ViewPaneContainer } from '../../../../browser/parts/views/viewPaneContainer.js';
import { RawContextKey, IContextKeyService, ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { WorkbenchListFocusContextKey } from '../../../../../platform/list/browser/listService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { MenuId, registerAction2, Action2 } from '../../../../../platform/actions/common/actions.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../../base/common/severity.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { IPaneCompositePartService } from '../../../../services/panecomposite/browser/panecomposite.js';
async function getBulkEditPane(viewsService) {
    const view = await viewsService.openView(BulkEditPane.ID, true);
    if (view instanceof BulkEditPane) {
        return view;
    }
    return undefined;
}
let UXState = class UXState {
    constructor(_paneCompositeService, _editorGroupsService) {
        this._paneCompositeService = _paneCompositeService;
        this._editorGroupsService = _editorGroupsService;
        this._activePanel = _paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */)?.getId();
    }
    async restore(panels, editors) {
        // (1) restore previous panel
        if (panels) {
            if (typeof this._activePanel === 'string') {
                await this._paneCompositeService.openPaneComposite(this._activePanel, 1 /* ViewContainerLocation.Panel */);
            }
            else {
                this._paneCompositeService.hideActivePaneComposite(1 /* ViewContainerLocation.Panel */);
            }
        }
        // (2) close preview editors
        if (editors) {
            for (const group of this._editorGroupsService.groups) {
                const previewEditors = [];
                for (const input of group.editors) {
                    const resource = EditorResourceAccessor.getCanonicalUri(input, { supportSideBySide: SideBySideEditor.PRIMARY });
                    if (resource?.scheme === BulkEditPane.Schema) {
                        previewEditors.push(input);
                    }
                }
                if (previewEditors.length) {
                    group.closeEditors(previewEditors, { preserveFocus: true });
                }
            }
        }
    }
};
UXState = __decorate([
    __param(0, IPaneCompositePartService),
    __param(1, IEditorGroupsService)
], UXState);
class PreviewSession {
    constructor(uxState, cts = new CancellationTokenSource()) {
        this.uxState = uxState;
        this.cts = cts;
    }
}
let BulkEditPreviewContribution = class BulkEditPreviewContribution {
    static { BulkEditPreviewContribution_1 = this; }
    static { this.ID = 'workbench.contrib.bulkEditPreview'; }
    static { this.ctxEnabled = new RawContextKey('refactorPreview.enabled', false); }
    constructor(_paneCompositeService, _viewsService, _editorGroupsService, _dialogService, bulkEditService, contextKeyService) {
        this._paneCompositeService = _paneCompositeService;
        this._viewsService = _viewsService;
        this._editorGroupsService = _editorGroupsService;
        this._dialogService = _dialogService;
        bulkEditService.setPreviewHandler(edits => this._previewEdit(edits));
        this._ctxEnabled = BulkEditPreviewContribution_1.ctxEnabled.bindTo(contextKeyService);
    }
    async _previewEdit(edits) {
        this._ctxEnabled.set(true);
        const uxState = this._activeSession?.uxState ?? new UXState(this._paneCompositeService, this._editorGroupsService);
        const view = await getBulkEditPane(this._viewsService);
        if (!view) {
            this._ctxEnabled.set(false);
            return edits;
        }
        // check for active preview session and let the user decide
        if (view.hasInput()) {
            const { confirmed } = await this._dialogService.confirm({
                type: Severity.Info,
                message: localize('overlap', "Another refactoring is being previewed."),
                detail: localize('detail', "Press 'Continue' to discard the previous refactoring and continue with the current refactoring."),
                primaryButton: localize({ key: 'continue', comment: ['&& denotes a mnemonic'] }, "&&Continue")
            });
            if (!confirmed) {
                return [];
            }
        }
        // session
        let session;
        if (this._activeSession) {
            await this._activeSession.uxState.restore(false, true);
            this._activeSession.cts.dispose(true);
            session = new PreviewSession(uxState);
        }
        else {
            session = new PreviewSession(uxState);
        }
        this._activeSession = session;
        // the actual work...
        try {
            return await view.setInput(edits, session.cts.token) ?? [];
        }
        finally {
            // restore UX state
            if (this._activeSession === session) {
                await this._activeSession.uxState.restore(true, true);
                this._activeSession.cts.dispose();
                this._ctxEnabled.set(false);
                this._activeSession = undefined;
            }
        }
    }
};
BulkEditPreviewContribution = BulkEditPreviewContribution_1 = __decorate([
    __param(0, IPaneCompositePartService),
    __param(1, IViewsService),
    __param(2, IEditorGroupsService),
    __param(3, IDialogService),
    __param(4, IBulkEditService),
    __param(5, IContextKeyService)
], BulkEditPreviewContribution);
// CMD: accept
registerAction2(class ApplyAction extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.apply',
            title: localize2('apply', "Apply Refactoring"),
            category: localize2('cat', "Refactor Preview"),
            icon: Codicon.check,
            precondition: ContextKeyExpr.and(BulkEditPreviewContribution.ctxEnabled, BulkEditPane.ctxHasCheckedChanges),
            menu: [{
                    id: MenuId.BulkEditContext,
                    order: 1
                }],
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
                when: ContextKeyExpr.and(BulkEditPreviewContribution.ctxEnabled, FocusedViewContext.isEqualTo(BulkEditPane.ID)),
                primary: 2048 /* KeyMod.CtrlCmd */ + 3 /* KeyCode.Enter */,
            }
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.accept();
    }
});
// CMD: discard
registerAction2(class DiscardAction extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.discard',
            title: localize2('Discard', "Discard Refactoring"),
            category: localize2('cat', "Refactor Preview"),
            icon: Codicon.clearAll,
            precondition: BulkEditPreviewContribution.ctxEnabled,
            menu: [{
                    id: MenuId.BulkEditContext,
                    order: 2
                }]
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.discard();
    }
});
// CMD: toggle change
registerAction2(class ToggleAction extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.toggleCheckedState',
            title: localize2('toogleSelection', "Toggle Change"),
            category: localize2('cat', "Refactor Preview"),
            precondition: BulkEditPreviewContribution.ctxEnabled,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: WorkbenchListFocusContextKey,
                primary: 10 /* KeyCode.Space */,
            },
            menu: {
                id: MenuId.BulkEditContext,
                group: 'navigation'
            }
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.toggleChecked();
    }
});
// CMD: toggle category
registerAction2(class GroupByFile extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.groupByFile',
            title: localize2('groupByFile', "Group Changes By File"),
            category: localize2('cat', "Refactor Preview"),
            icon: Codicon.ungroupByRefType,
            precondition: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile.negate(), BulkEditPreviewContribution.ctxEnabled),
            menu: [{
                    id: MenuId.BulkEditTitle,
                    when: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile.negate()),
                    group: 'navigation',
                    order: 3,
                }]
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.groupByFile();
    }
});
registerAction2(class GroupByType extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.groupByType',
            title: localize2('groupByType', "Group Changes By Type"),
            category: localize2('cat', "Refactor Preview"),
            icon: Codicon.groupByRefType,
            precondition: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile, BulkEditPreviewContribution.ctxEnabled),
            menu: [{
                    id: MenuId.BulkEditTitle,
                    when: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile),
                    group: 'navigation',
                    order: 3
                }]
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.groupByType();
    }
});
registerAction2(class ToggleGrouping extends Action2 {
    constructor() {
        super({
            id: 'refactorPreview.toggleGrouping',
            title: localize2('groupByType', "Group Changes By Type"),
            category: localize2('cat', "Refactor Preview"),
            icon: Codicon.listTree,
            toggled: BulkEditPane.ctxGroupByFile.negate(),
            precondition: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPreviewContribution.ctxEnabled),
            menu: [{
                    id: MenuId.BulkEditContext,
                    order: 3
                }]
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await getBulkEditPane(viewsService);
        view?.toggleGrouping();
    }
});
registerWorkbenchContribution2(BulkEditPreviewContribution.ID, BulkEditPreviewContribution, 2 /* WorkbenchPhase.BlockRestore */);
const refactorPreviewViewIcon = registerIcon('refactor-preview-view-icon', Codicon.lightbulb, localize('refactorPreviewViewIcon', 'View icon of the refactor preview view.'));
const container = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: BulkEditPane.ID,
    title: localize2('panel', "Refactor Preview"),
    hideIfEmpty: true,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [BulkEditPane.ID, { mergeViewWithContainerWhenSingleView: true }]),
    icon: refactorPreviewViewIcon,
    storageId: BulkEditPane.ID
}, 1 /* ViewContainerLocation.Panel */);
Registry.as(ViewContainerExtensions.ViewsRegistry).registerViews([{
        id: BulkEditPane.ID,
        name: localize2('panel', "Refactor Preview"),
        when: BulkEditPreviewContribution.ctxEnabled,
        ctorDescriptor: new SyncDescriptor(BulkEditPane),
        containerIcon: refactorPreviewViewIcon,
    }], container);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2J1bGtFZGl0L2Jyb3dzZXIvcHJldmlldy9idWxrRWRpdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMvRSxPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckcsT0FBTyxFQUFFLGdCQUFnQixFQUFnQixNQUFNLDJEQUEyRCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQTJCLFVBQVUsSUFBSSx1QkFBdUIsRUFBeUMsTUFBTSw2QkFBNkIsQ0FBQztBQUNwSixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFlLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBR2pHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM3RixPQUFPLEVBQUUsTUFBTSxF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