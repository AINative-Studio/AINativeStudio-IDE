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
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import './media/debugViewlet.css';
import * as nls from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ViewPaneContainer, ViewsSubMenu } from '../../../browser/parts/views/viewPaneContainer.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { FocusSessionActionViewItem, StartDebugActionViewItem } from './debugActionViewItems.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL, DEBUG_START_COMMAND_ID, DEBUG_START_LABEL, DISCONNECT_ID, FOCUS_SESSION_ID, SELECT_AND_START_ID, STOP_ID } from './debugCommands.js';
import { debugConfigure } from './debugIcons.js';
import { createDisconnectMenuItemAction } from './debugToolBar.js';
import { WelcomeView } from './welcomeView.js';
import { BREAKPOINTS_VIEW_ID, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE, CONTEXT_DEBUG_UX, CONTEXT_DEBUG_UX_KEY, getStateLabel, IDebugService, REPL_VIEW_ID, VIEWLET_ID, EDITOR_CONTRIBUTION_ID } from '../common/debug.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let DebugViewPaneContainer = class DebugViewPaneContainer extends ViewPaneContainer {
    constructor(layoutService, telemetryService, progressService, debugService, instantiationService, contextService, storageService, themeService, contextMenuService, extensionService, configurationService, contextViewService, contextKeyService, viewDescriptorService, logService) {
        super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
        this.progressService = progressService;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.contextKeyService = contextKeyService;
        this.paneListeners = new Map();
        this.stopActionViewItemDisposables = this._register(new DisposableStore());
        // When there are potential updates to the docked debug toolbar we need to update it
        this._register(this.debugService.onDidChangeState(state => this.onDebugServiceStateChange(state)));
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(new Set([CONTEXT_DEBUG_UX_KEY, 'inDebugMode']))) {
                this.updateTitleArea();
            }
        }));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.updateTitleArea()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('debug.toolBarLocation') || e.affectsConfiguration('debug.hideLauncherWhileDebugging')) {
                this.updateTitleArea();
            }
        }));
    }
    create(parent) {
        super.create(parent);
        parent.classList.add('debug-viewlet');
    }
    focus() {
        super.focus();
        if (this.startDebugActionViewItem) {
            this.startDebugActionViewItem.focus();
        }
        else {
            this.focusView(WelcomeView.ID);
        }
    }
    getActionViewItem(action, options) {
        if (action.id === DEBUG_START_COMMAND_ID) {
            this.startDebugActionViewItem = this.instantiationService.createInstance(StartDebugActionViewItem, null, action, options);
            return this.startDebugActionViewItem;
        }
        if (action.id === FOCUS_SESSION_ID) {
            return new FocusSessionActionViewItem(action, undefined, this.debugService, this.contextViewService, this.configurationService);
        }
        if (action.id === STOP_ID || action.id === DISCONNECT_ID) {
            this.stopActionViewItemDisposables.clear();
            const item = this.instantiationService.invokeFunction(accessor => createDisconnectMenuItemAction(action, this.stopActionViewItemDisposables, accessor, { hoverDelegate: options.hoverDelegate }));
            if (item) {
                return item;
            }
        }
        return createActionViewItem(this.instantiationService, action, options);
    }
    focusView(id) {
        const view = this.getView(id);
        if (view) {
            view.focus();
        }
    }
    onDebugServiceStateChange(state) {
        if (this.progressResolve) {
            this.progressResolve();
            this.progressResolve = undefined;
        }
        if (state === 1 /* State.Initializing */) {
            this.progressService.withProgress({ location: VIEWLET_ID, }, _progress => {
                return new Promise(resolve => this.progressResolve = resolve);
            });
        }
    }
    addPanes(panes) {
        super.addPanes(panes);
        for (const { pane: pane } of panes) {
            // attach event listener to
            if (pane.id === BREAKPOINTS_VIEW_ID) {
                this.breakpointView = pane;
                this.updateBreakpointsMaxSize();
            }
            else {
                this.paneListeners.set(pane.id, pane.onDidChange(() => this.updateBreakpointsMaxSize()));
            }
        }
    }
    removePanes(panes) {
        super.removePanes(panes);
        for (const pane of panes) {
            dispose(this.paneListeners.get(pane.id));
            this.paneListeners.delete(pane.id);
        }
    }
    updateBreakpointsMaxSize() {
        if (this.breakpointView) {
            // We need to update the breakpoints view since all other views are collapsed #25384
            const allOtherCollapsed = this.panes.every(view => !view.isExpanded() || view === this.breakpointView);
            this.breakpointView.maximumBodySize = allOtherCollapsed ? Number.POSITIVE_INFINITY : this.breakpointView.minimumBodySize;
        }
    }
};
DebugViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IProgressService),
    __param(3, IDebugService),
    __param(4, IInstantiationService),
    __param(5, IWorkspaceContextService),
    __param(6, IStorageService),
    __param(7, IThemeService),
    __param(8, IContextMenuService),
    __param(9, IExtensionService),
    __param(10, IConfigurationService),
    __param(11, IContextViewService),
    __param(12, IContextKeyService),
    __param(13, IViewDescriptorService),
    __param(14, ILogService)
], DebugViewPaneContainer);
export { DebugViewPaneContainer };
MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_UX.notEqualsTo('simple'), WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_DEBUG_STATE.isEqualTo('inactive'), ContextKeyExpr.notEquals('config.debug.toolBarLocation', 'docked')), ContextKeyExpr.or(ContextKeyExpr.not('config.debug.hideLauncherWhileDebugging'), ContextKeyExpr.not('inDebugMode'))),
    order: 10,
    group: 'navigation',
    command: {
        precondition: CONTEXT_DEBUG_STATE.notEqualsTo(getStateLabel(1 /* State.Initializing */)),
        id: DEBUG_START_COMMAND_ID,
        title: DEBUG_START_LABEL
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: DEBUG_CONFIGURE_COMMAND_ID,
            title: {
                value: DEBUG_CONFIGURE_LABEL,
                original: 'Open \'launch.json\'',
                mnemonicTitle: nls.localize({ key: 'miOpenConfigurations', comment: ['&& denotes a mnemonic'] }, "Open &&Configurations")
            },
            metadata: {
                description: nls.localize2('openLaunchConfigDescription', 'Opens the file used to configure how your program is debugged')
            },
            f1: true,
            icon: debugConfigure,
            precondition: CONTEXT_DEBUG_UX.notEqualsTo('simple'),
            menu: [{
                    id: MenuId.ViewContainerTitle,
                    group: 'navigation',
                    order: 20,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_UX.notEqualsTo('simple'), WorkbenchStateContext.notEqualsTo('empty'), ContextKeyExpr.or(CONTEXT_DEBUG_STATE.isEqualTo('inactive'), ContextKeyExpr.notEquals('config.debug.toolBarLocation', 'docked')))
                }, {
                    id: MenuId.ViewContainerTitle,
                    order: 20,
                    // Show in debug viewlet secondary actions when debugging and debug toolbar is docked
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_STATE.notEqualsTo('inactive'), ContextKeyExpr.equals('config.debug.toolBarLocation', 'docked'))
                }, {
                    id: MenuId.MenubarDebugMenu,
                    group: '2_configuration',
                    order: 1,
                    when: CONTEXT_DEBUGGERS_AVAILABLE
                }]
        });
    }
    async run(accessor, opts) {
        const debugService = accessor.get(IDebugService);
        const quickInputService = accessor.get(IQuickInputService);
        const configurationManager = debugService.getConfigurationManager();
        let launch;
        if (configurationManager.selectedConfiguration.name) {
            launch = configurationManager.selectedConfiguration.launch;
        }
        else {
            const launches = configurationManager.getLaunches().filter(l => !l.hidden);
            if (launches.length === 1) {
                launch = launches[0];
            }
            else {
                const picks = launches.map(l => ({ label: l.name, launch: l }));
                const picked = await quickInputService.pick(picks, {
                    activeItem: picks[0],
                    placeHolder: nls.localize({ key: 'selectWorkspaceFolder', comment: ['User picks a workspace folder or a workspace configuration file here. Workspace configuration files can contain settings and thus a launch.json configuration can be written into one.'] }, "Select a workspace folder to create a launch.json file in or add it to the workspace config file")
                });
                if (picked) {
                    launch = picked.launch;
                }
            }
        }
        if (launch) {
            const { editor } = await launch.openConfigFile({ preserveFocus: false });
            if (editor && opts?.addNew) {
                const codeEditor = editor.getControl();
                if (codeEditor) {
                    await codeEditor.getContribution(EDITOR_CONTRIBUTION_ID)?.addLaunchConfiguration();
                }
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'debug.toggleReplIgnoreFocus',
            title: nls.localize('debugPanel', "Debug Console"),
            toggled: ContextKeyExpr.has(`view.${REPL_VIEW_ID}.visible`),
            menu: [{
                    id: ViewsSubMenu,
                    group: '3_toggleRepl',
                    order: 30,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID))
                }]
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        if (viewsService.isViewVisible(REPL_VIEW_ID)) {
            viewsService.closeView(REPL_VIEW_ID);
        }
        else {
            await viewsService.openView(REPL_VIEW_ID);
        }
    }
});
MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
    when: ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_STATE.notEqualsTo('inactive'), ContextKeyExpr.or(ContextKeyExpr.equals('config.debug.toolBarLocation', 'docked'), ContextKeyExpr.has('config.debug.hideLauncherWhileDebugging'))),
    order: 10,
    command: {
        id: SELECT_AND_START_ID,
        title: nls.localize('startAdditionalSession', "Start Additional Session"),
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaWV3bGV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdWaWV3bGV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFrQixZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFB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