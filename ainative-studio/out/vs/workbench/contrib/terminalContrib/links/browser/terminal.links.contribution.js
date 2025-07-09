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
var TerminalLinkContribution_1;
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { isDetachedTerminalInstance } from '../../../terminal/browser/terminal.js';
import { registerActiveInstanceAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { isTerminalProcessManager } from '../../../terminal/common/terminal.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { ITerminalLinkProviderService } from './links.js';
import { TerminalLinkManager } from './terminalLinkManager.js';
import { TerminalLinkProviderService } from './terminalLinkProviderService.js';
import { TerminalLinkQuickpick } from './terminalLinkQuickpick.js';
import { TerminalLinkResolver } from './terminalLinkResolver.js';
// #region Services
registerSingleton(ITerminalLinkProviderService, TerminalLinkProviderService, 1 /* InstantiationType.Delayed */);
// #endregion
// #region Terminal Contributions
let TerminalLinkContribution = class TerminalLinkContribution extends DisposableStore {
    static { TerminalLinkContribution_1 = this; }
    static { this.ID = 'terminal.link'; }
    static get(instance) {
        return instance.getContribution(TerminalLinkContribution_1.ID);
    }
    constructor(_ctx, _instantiationService, _terminalLinkProviderService) {
        super();
        this._ctx = _ctx;
        this._instantiationService = _instantiationService;
        this._terminalLinkProviderService = _terminalLinkProviderService;
        this._linkResolver = this._instantiationService.createInstance(TerminalLinkResolver);
    }
    xtermReady(xterm) {
        const linkManager = this._linkManager = this.add(this._instantiationService.createInstance(TerminalLinkManager, xterm.raw, this._ctx.processManager, this._ctx.instance.capabilities, this._linkResolver));
        // Set widget manager
        if (isTerminalProcessManager(this._ctx.processManager)) {
            const disposable = linkManager.add(Event.once(this._ctx.processManager.onProcessReady)(() => {
                linkManager.setWidgetManager(this._ctx.widgetManager);
                this.delete(disposable);
            }));
        }
        else {
            linkManager.setWidgetManager(this._ctx.widgetManager);
        }
        // Attach the external link provider to the instance and listen for changes
        if (!isDetachedTerminalInstance(this._ctx.instance)) {
            for (const linkProvider of this._terminalLinkProviderService.linkProviders) {
                linkManager.externalProvideLinksCb = linkProvider.provideLinks.bind(linkProvider, this._ctx.instance);
            }
            linkManager.add(this._terminalLinkProviderService.onDidAddLinkProvider(e => {
                linkManager.externalProvideLinksCb = e.provideLinks.bind(e, this._ctx.instance);
            }));
        }
        linkManager.add(this._terminalLinkProviderService.onDidRemoveLinkProvider(() => linkManager.externalProvideLinksCb = undefined));
    }
    async showLinkQuickpick(extended) {
        if (!this._terminalLinkQuickpick) {
            this._terminalLinkQuickpick = this.add(this._instantiationService.createInstance(TerminalLinkQuickpick));
            this._terminalLinkQuickpick.onDidRequestMoreLinks(() => {
                this.showLinkQuickpick(true);
            });
        }
        const links = await this._getLinks();
        return await this._terminalLinkQuickpick.show(this._ctx.instance, links);
    }
    async _getLinks() {
        if (!this._linkManager) {
            throw new Error('terminal links are not ready, cannot generate link quick pick');
        }
        return this._linkManager.getLinks();
    }
    async openRecentLink(type) {
        if (!this._linkManager) {
            throw new Error('terminal links are not ready, cannot open a link');
        }
        this._linkManager.openRecentLink(type);
    }
};
TerminalLinkContribution = TerminalLinkContribution_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITerminalLinkProviderService)
], TerminalLinkContribution);
registerTerminalContribution(TerminalLinkContribution.ID, TerminalLinkContribution, true);
// #endregion
// #region Actions
const category = terminalStrings.actionCategory;
registerActiveInstanceAction({
    id: "workbench.action.terminal.openDetectedLink" /* TerminalLinksCommandId.OpenDetectedLink */,
    title: localize2('workbench.action.terminal.openDetectedLink', 'Open Detected Link...'),
    f1: true,
    category,
    precondition: TerminalContextKeys.terminalHasBeenCreated,
    keybinding: [{
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            when: TerminalContextKeys.focus
        }, {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
            when: ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal" /* AccessibleViewProviderId.Terminal */))
        },
    ],
    run: (activeInstance) => TerminalLinkContribution.get(activeInstance)?.showLinkQuickpick()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.openUrlLink" /* TerminalLinksCommandId.OpenWebLink */,
    title: localize2('workbench.action.terminal.openLastUrlLink', 'Open Last URL Link'),
    metadata: {
        description: localize2('workbench.action.terminal.openLastUrlLink.description', 'Opens the last detected URL/URI link in the terminal')
    },
    f1: true,
    category,
    precondition: TerminalContextKeys.terminalHasBeenCreated,
    run: (activeInstance) => TerminalLinkContribution.get(activeInstance)?.openRecentLink('url')
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.openFileLink" /* TerminalLinksCommandId.OpenFileLink */,
    title: localize2('workbench.action.terminal.openLastLocalFileLink', 'Open Last Local File Link'),
    f1: true,
    category,
    precondition: TerminalContextKeys.terminalHasBeenCreated,
    run: (activeInstance) => TerminalLinkContribution.get(activeInstance)?.openRecentLink('localFile')
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwubGlua3MuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsLmxpbmtzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFbEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQUUsK0JBQStCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN0SSxPQUFPLEVBQTRELDBCQUEwQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDN0ksT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDNUYsT0FBTyxFQUFFLDRCQUE0QixFQUEwRixNQUFNLGlEQUFpRCxDQUFDO0FBQ3ZMLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxZ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