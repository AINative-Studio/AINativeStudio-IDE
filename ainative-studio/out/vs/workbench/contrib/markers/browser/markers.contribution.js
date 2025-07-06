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
import './markersFileDecorations.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { localize, localize2 } from '../../../../nls.js';
import { Marker, RelatedInformation, ResourceMarkers } from './markersModel.js';
import { MarkersView } from './markersView.js';
import { MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Markers, MarkersContextKeys } from '../common/markers.js';
import Messages from './messages.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { Extensions as ViewContainerExtensions } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getVisbileViewContextKey, FocusedViewContext } from '../../../common/contextkeys.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { viewFilterSubmenu } from '../../../browser/parts/views/viewFilter.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { problemsConfigurationNodeBase } from '../../../common/configuration.js';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: Markers.MARKER_OPEN_ACTION_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(MarkersContextKeys.MarkerFocusContextKey),
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */]
    },
    handler: (accessor, args) => {
        const markersView = accessor.get(IViewsService).getActiveViewWithId(Markers.MARKERS_VIEW_ID);
        markersView.openFileAtElement(markersView.getFocusElement(), false, false, true);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: Markers.MARKER_OPEN_SIDE_ACTION_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(MarkersContextKeys.MarkerFocusContextKey),
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    mac: {
        primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */
    },
    handler: (accessor, args) => {
        const markersView = accessor.get(IViewsService).getActiveViewWithId(Markers.MARKERS_VIEW_ID);
        markersView.openFileAtElement(markersView.getFocusElement(), false, true, true);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: Markers.MARKER_SHOW_PANEL_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: undefined,
    handler: async (accessor, args) => {
        await accessor.get(IViewsService).openView(Markers.MARKERS_VIEW_ID);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: Markers.MARKER_SHOW_QUICK_FIX,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: MarkersContextKeys.MarkerFocusContextKey,
    primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
    handler: (accessor, args) => {
        const markersView = accessor.get(IViewsService).getActiveViewWithId(Markers.MARKERS_VIEW_ID);
        const focusedElement = markersView.getFocusElement();
        if (focusedElement instanceof Marker) {
            markersView.showQuickFixes(focusedElement);
        }
    }
});
// configuration
Registry.as(Extensions.Configuration).registerConfiguration({
    ...problemsConfigurationNodeBase,
    'properties': {
        'problems.autoReveal': {
            'description': Messages.PROBLEMS_PANEL_CONFIGURATION_AUTO_REVEAL,
            'type': 'boolean',
            'default': true
        },
        'problems.defaultViewMode': {
            'description': Messages.PROBLEMS_PANEL_CONFIGURATION_VIEW_MODE,
            'type': 'string',
            'default': 'tree',
            'enum': ['table', 'tree'],
        },
        'problems.showCurrentInStatus': {
            'description': Messages.PROBLEMS_PANEL_CONFIGURATION_SHOW_CURRENT_STATUS,
            'type': 'boolean',
            'default': false
        },
        'problems.sortOrder': {
            'description': Messages.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER,
            'type': 'string',
            'default': 'severity',
            'enum': ['severity', 'position'],
            'enumDescriptions': [
                Messages.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER_SEVERITY,
                Messages.PROBLEMS_PANEL_CONFIGURATION_COMPARE_ORDER_POSITION,
            ],
        },
    }
});
const markersViewIcon = registerIcon('markers-view-icon', Codicon.warning, localize('markersViewIcon', 'View icon of the markers view.'));
// markers view container
const VIEW_CONTAINER = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: Markers.MARKERS_CONTAINER_ID,
    title: Messages.MARKERS_PANEL_TITLE_PROBLEMS,
    icon: markersViewIcon,
    hideIfEmpty: true,
    order: 0,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [Markers.MARKERS_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
    storageId: Markers.MARKERS_VIEW_STORAGE_ID,
}, 1 /* ViewContainerLocation.Panel */, { doNotRegisterOpenCommand: true });
Registry.as(ViewContainerExtensions.ViewsRegistry).registerViews([{
        id: Markers.MARKERS_VIEW_ID,
        containerIcon: markersViewIcon,
        name: Messages.MARKERS_PANEL_TITLE_PROBLEMS,
        canToggleVisibility: true,
        canMoveView: true,
        ctorDescriptor: new SyncDescriptor(MarkersView),
        openCommandActionDescriptor: {
            id: 'workbench.actions.view.problems',
            mnemonicTitle: localize({ key: 'miMarker', comment: ['&& denotes a mnemonic'] }, "&&Problems"),
            keybindings: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 43 /* KeyCode.KeyM */ },
            order: 0,
        }
    }], VIEW_CONTAINER);
// workbench
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
// actions
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.table.${Markers.MARKERS_VIEW_ID}.viewAsTree`,
            title: localize('viewAsTree', "View as Tree"),
            metadata: {
                description: localize2('viewAsTreeDescription', "Show the problems view as a tree.")
            },
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID), MarkersContextKeys.MarkersViewModeContextKey.isEqualTo("table" /* MarkersViewMode.Table */)),
                group: 'navigation',
                order: 3
            },
            icon: Codicon.listTree,
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        view.setViewMode("tree" /* MarkersViewMode.Tree */);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.table.${Markers.MARKERS_VIEW_ID}.viewAsTable`,
            title: localize('viewAsTable', "View as Table"),
            metadata: {
                description: localize2('viewAsTableDescription', "Show the problems view as a table.")
            },
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID), MarkersContextKeys.MarkersViewModeContextKey.isEqualTo("tree" /* MarkersViewMode.Tree */)),
                group: 'navigation',
                order: 3
            },
            icon: Codicon.listFlat,
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        view.setViewMode("table" /* MarkersViewMode.Table */);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleErrors`,
            title: localize('show errors', "Show Errors"),
            metadata: {
                description: localize2('toggleErrorsDescription', "Show or hide errors in the problems view.")
            },
            category: localize('problems', "Problems"),
            toggled: MarkersContextKeys.ShowErrorsFilterContextKey,
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 1
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showErrors = !view.filters.showErrors;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleWarnings`,
            title: localize('show warnings', "Show Warnings"),
            metadata: {
                description: localize2('toggleWarningsDescription', "Show or hide warnings in the problems view.")
            },
            category: localize('problems', "Problems"),
            toggled: MarkersContextKeys.ShowWarningsFilterContextKey,
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 2
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showWarnings = !view.filters.showWarnings;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleInfos`,
            title: localize('show infos', "Show Infos"),
            category: localize('problems', "Problems"),
            toggled: MarkersContextKeys.ShowInfoFilterContextKey,
            metadata: {
                description: localize2('toggleInfosDescription', "Show or hide infos in the problems view.")
            },
            menu: {
                id: viewFilterSubmenu,
                group: '1_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 3
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.showInfos = !view.filters.showInfos;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleActiveFile`,
            title: localize('show active file', "Show Active File Only"),
            metadata: {
                description: localize2('toggleActiveFileDescription', "Show or hide problems (errors, warnings, info) only from the active file in the problems view.")
            },
            category: localize('problems', "Problems"),
            toggled: MarkersContextKeys.ShowActiveFileFilterContextKey,
            menu: {
                id: viewFilterSubmenu,
                group: '2_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 1
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.activeFile = !view.filters.activeFile;
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.${Markers.MARKERS_VIEW_ID}.toggleExcludedFiles`,
            title: localize('show excluded files', "Show Excluded Files"),
            metadata: {
                description: localize2('toggleExcludedFilesDescription', "Show or hide excluded files in the problems view.")
            },
            category: localize('problems', "Problems"),
            toggled: MarkersContextKeys.ShowExcludedFilesFilterContextKey.negate(),
            menu: {
                id: viewFilterSubmenu,
                group: '2_filter',
                when: ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID),
                order: 2
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        view.filters.excludedFiles = !view.filters.excludedFiles;
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.problems.focus',
            title: Messages.MARKERS_PANEL_SHOW_LABEL,
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        accessor.get(IViewsService).openView(Markers.MARKERS_VIEW_ID, true);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        const when = ContextKeyExpr.and(FocusedViewContext.isEqualTo(Markers.MARKERS_VIEW_ID), MarkersContextKeys.MarkersTreeVisibilityContextKey, MarkersContextKeys.RelatedInformationFocusContextKey.toNegated());
        super({
            id: Markers.MARKER_COPY_ACTION_ID,
            title: localize2('copyMarker', 'Copy'),
            menu: {
                id: MenuId.ProblemsPanelContext,
                when,
                group: 'navigation'
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
                when
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, markersView) {
        const clipboardService = serviceAccessor.get(IClipboardService);
        const selection = markersView.getFocusedSelectedElements() || markersView.getAllResourceMarkers();
        const markers = [];
        const addMarker = (marker) => {
            if (!markers.includes(marker)) {
                markers.push(marker);
            }
        };
        for (const selected of selection) {
            if (selected instanceof ResourceMarkers) {
                selected.markers.forEach(addMarker);
            }
            else if (selected instanceof Marker) {
                addMarker(selected);
            }
        }
        if (markers.length) {
            await clipboardService.writeText(`[${markers}]`);
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKER_COPY_MESSAGE_ACTION_ID,
            title: localize2('copyMessage', 'Copy Message'),
            menu: {
                id: MenuId.ProblemsPanelContext,
                when: MarkersContextKeys.MarkerFocusContextKey,
                group: 'navigation'
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, markersView) {
        const clipboardService = serviceAccessor.get(IClipboardService);
        const element = markersView.getFocusElement();
        if (element instanceof Marker) {
            await clipboardService.writeText(element.marker.message);
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.RELATED_INFORMATION_COPY_MESSAGE_ACTION_ID,
            title: localize2('copyMessage', 'Copy Message'),
            menu: {
                id: MenuId.ProblemsPanelContext,
                when: MarkersContextKeys.RelatedInformationFocusContextKey,
                group: 'navigation'
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, markersView) {
        const clipboardService = serviceAccessor.get(IClipboardService);
        const element = markersView.getFocusElement();
        if (element instanceof RelatedInformation) {
            await clipboardService.writeText(element.raw.message);
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.FOCUS_PROBLEMS_FROM_FILTER,
            title: localize('focusProblemsList', "Focus problems view"),
            keybinding: {
                when: MarkersContextKeys.MarkerViewFilterFocusContextKey,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.focus();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKERS_VIEW_FOCUS_FILTER,
            title: localize('focusProblemsFilter', "Focus problems filter"),
            keybinding: {
                when: FocusedViewContext.isEqualTo(Markers.MARKERS_VIEW_ID),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.focusFilter();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKERS_VIEW_SHOW_MULTILINE_MESSAGE,
            title: localize2('show multiline', "Show message in multiple lines"),
            category: localize('problems', "Problems"),
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.has(getVisbileViewContextKey(Markers.MARKERS_VIEW_ID))
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.setMultiline(true);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKERS_VIEW_SHOW_SINGLELINE_MESSAGE,
            title: localize2('show singleline', "Show message in single line"),
            category: localize('problems', "Problems"),
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.has(getVisbileViewContextKey(Markers.MARKERS_VIEW_ID))
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.setMultiline(false);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: Markers.MARKERS_VIEW_CLEAR_FILTER_TEXT,
            title: localize('clearFiltersText', "Clear filters text"),
            category: localize('problems', "Problems"),
            keybinding: {
                when: MarkersContextKeys.MarkerViewFilterFocusContextKey,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 9 /* KeyCode.Escape */
            },
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, markersView) {
        markersView.clearFilterText();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: `workbench.actions.treeView.${Markers.MARKERS_VIEW_ID}.collapseAll`,
            title: localize('collapseAll', "Collapse All"),
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', Markers.MARKERS_VIEW_ID), MarkersContextKeys.MarkersViewModeContextKey.isEqualTo("tree" /* MarkersViewMode.Tree */)),
                group: 'navigation',
                order: 2,
            },
            icon: Codicon.collapseAll,
            viewId: Markers.MARKERS_VIEW_ID
        });
    }
    async runInView(serviceAccessor, view) {
        return view.collapseAll();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: Markers.TOGGLE_MARKERS_VIEW_ACTION_ID,
            title: Messages.MARKERS_PANEL_TOGGLE_LABEL,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        if (viewsService.isViewVisible(Markers.MARKERS_VIEW_ID)) {
            viewsService.closeView(Markers.MARKERS_VIEW_ID);
        }
        else {
            viewsService.openView(Markers.MARKERS_VIEW_ID, true);
        }
    }
});
let MarkersStatusBarContributions = class MarkersStatusBarContributions extends Disposable {
    constructor(markerService, statusbarService, configurationService) {
        super();
        this.markerService = markerService;
        this.statusbarService = statusbarService;
        this.configurationService = configurationService;
        this.markersStatusItem = this._register(this.statusbarService.addEntry(this.getMarkersItem(), 'status.problems', 0 /* StatusbarAlignment.LEFT */, 50 /* Medium Priority */));
        const addStatusBarEntry = () => {
            this.markersStatusItemOff = this.statusbarService.addEntry(this.getMarkersItemTurnedOff(), 'status.problemsVisibility', 0 /* StatusbarAlignment.LEFT */, 49);
        };
        // Add the status bar entry if the problems is not visible
        let config = this.configurationService.getValue('problems.visibility');
        if (!config) {
            addStatusBarEntry();
        }
        this._register(this.markerService.onMarkerChanged(() => {
            this.markersStatusItem.update(this.getMarkersItem());
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('problems.visibility')) {
                this.markersStatusItem.update(this.getMarkersItem());
                // Update based on what setting was changed to.
                config = this.configurationService.getValue('problems.visibility');
                if (!config && !this.markersStatusItemOff) {
                    addStatusBarEntry();
                }
                else if (config && this.markersStatusItemOff) {
                    this.markersStatusItemOff.dispose();
                    this.markersStatusItemOff = undefined;
                }
            }
        }));
    }
    getMarkersItem() {
        const markersStatistics = this.markerService.getStatistics();
        const tooltip = this.getMarkersTooltip(markersStatistics);
        return {
            name: localize('status.problems', "Problems"),
            text: this.getMarkersText(markersStatistics),
            ariaLabel: tooltip,
            tooltip,
            command: 'workbench.actions.view.toggleProblems'
        };
    }
    getMarkersItemTurnedOff() {
        // Update to true, config checked before `getMarkersItemTurnedOff` is called.
        this.statusbarService.updateEntryVisibility('status.problemsVisibility', true);
        const openSettingsCommand = 'workbench.action.openSettings';
        const configureSettingsLabel = '@id:problems.visibility';
        const tooltip = localize('status.problemsVisibilityOff', "Problems are turned off. Click to open settings.");
        return {
            name: localize('status.problemsVisibility', "Problems Visibility"),
            text: '$(whole-word)',
            ariaLabel: tooltip,
            tooltip,
            kind: 'warning',
            command: { title: openSettingsCommand, arguments: [configureSettingsLabel], id: openSettingsCommand }
        };
    }
    getMarkersTooltip(stats) {
        const errorTitle = (n) => localize('totalErrors', "Errors: {0}", n);
        const warningTitle = (n) => localize('totalWarnings', "Warnings: {0}", n);
        const infoTitle = (n) => localize('totalInfos', "Infos: {0}", n);
        const titles = [];
        if (stats.errors > 0) {
            titles.push(errorTitle(stats.errors));
        }
        if (stats.warnings > 0) {
            titles.push(warningTitle(stats.warnings));
        }
        if (stats.infos > 0) {
            titles.push(infoTitle(stats.infos));
        }
        if (titles.length === 0) {
            return localize('noProblems', "No Problems");
        }
        return titles.join(', ');
    }
    getMarkersText(stats) {
        const problemsText = [];
        // Errors
        problemsText.push('$(error) ' + this.packNumber(stats.errors));
        // Warnings
        problemsText.push('$(warning) ' + this.packNumber(stats.warnings));
        // Info (only if any)
        if (stats.infos > 0) {
            problemsText.push('$(info) ' + this.packNumber(stats.infos));
        }
        return problemsText.join(' ');
    }
    packNumber(n) {
        const manyProblems = localize('manyProblems', "10K+");
        return n > 9999 ? manyProblems : n > 999 ? n.toString().charAt(0) + 'K' : n.toString();
    }
};
MarkersStatusBarContributions = __decorate([
    __param(0, IMarkerService),
    __param(1, IStatusbarService),
    __param(2, IConfigurationService)
], MarkersStatusBarContributions);
workbenchRegistry.registerWorkbenchContribution(MarkersStatusBarContributions, 3 /* LifecyclePhase.Restored */);
let ActivityUpdater = class ActivityUpdater extends Disposable {
    constructor(activityService, markerService) {
        super();
        this.activityService = activityService;
        this.markerService = markerService;
        this.activity = this._register(new MutableDisposable());
        this._register(this.markerService.onMarkerChanged(() => this.updateBadge()));
        this.updateBadge();
    }
    updateBadge() {
        const { errors, warnings, infos } = this.markerService.getStatistics();
        const total = errors + warnings + infos;
        if (total > 0) {
            const message = localize('totalProblems', 'Total {0} Problems', total);
            this.activity.value = this.activityService.showViewActivity(Markers.MARKERS_VIEW_ID, { badge: new NumberBadge(total, () => message) });
        }
        else {
            this.activity.value = undefined;
        }
    }
};
ActivityUpdater = __decorate([
    __param(0, IActivityService),
    __param(1, IMarkerService)
], ActivityUpdater);
workbenchRegistry.registerWorkbenchContribution(ActivityUpdater, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vycy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL2Jyb3dzZXIvbWFya2Vycy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSxvRUFBb0UsQ0FBQztBQUN4SCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBRXRILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBbUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDcEYsT0FBTyxRQUFRLE1BQU0sZUFBZSxDQUFDO0FBQ3JDLE9BQU8sRUFBbUMsVUFBVSxJQUFJLG1CQUFtQixFQUEwQixNQUFNLGtDQUFrQyxDQUFDO0FBRzlJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFD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