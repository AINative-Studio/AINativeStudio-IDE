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
var AuxiliaryEditorPart_1, AuxiliaryEditorPartImpl_1;
import { onDidChangeFullscreen } from '../../../../base/browser/browser.js';
import { $, hide, show } from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isNative } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { hasCustomTitlebar } from '../../../../platform/window/common/window.js';
import { EditorPart } from './editorPart.js';
import { WindowTitle } from '../titlebar/windowTitle.js';
import { IAuxiliaryWindowService } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService, shouldShowCustomTitleBar } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { ITitleService } from '../../../services/title/browser/titleService.js';
let AuxiliaryEditorPart = class AuxiliaryEditorPart {
    static { AuxiliaryEditorPart_1 = this; }
    static { this.STATUS_BAR_VISIBILITY = 'workbench.statusBar.visible'; }
    constructor(editorPartsView, instantiationService, auxiliaryWindowService, lifecycleService, configurationService, statusbarService, titleService, editorService, layoutService) {
        this.editorPartsView = editorPartsView;
        this.instantiationService = instantiationService;
        this.auxiliaryWindowService = auxiliaryWindowService;
        this.lifecycleService = lifecycleService;
        this.configurationService = configurationService;
        this.statusbarService = statusbarService;
        this.titleService = titleService;
        this.editorService = editorService;
        this.layoutService = layoutService;
    }
    async create(label, options) {
        function computeEditorPartHeightOffset() {
            let editorPartHeightOffset = 0;
            if (statusbarVisible) {
                editorPartHeightOffset += statusbarPart.height;
            }
            if (titlebarPart && titlebarVisible) {
                editorPartHeightOffset += titlebarPart.height;
            }
            return editorPartHeightOffset;
        }
        function updateStatusbarVisibility(fromEvent) {
            if (statusbarVisible) {
                show(statusbarPart.container);
            }
            else {
                hide(statusbarPart.container);
            }
            if (fromEvent) {
                auxiliaryWindow.layout();
            }
        }
        function updateTitlebarVisibility(fromEvent) {
            if (!titlebarPart) {
                return;
            }
            if (titlebarVisible) {
                show(titlebarPart.container);
            }
            else {
                hide(titlebarPart.container);
            }
            if (fromEvent) {
                auxiliaryWindow.layout();
            }
        }
        const disposables = new DisposableStore();
        // Auxiliary Window
        const auxiliaryWindow = disposables.add(await this.auxiliaryWindowService.open(options));
        // Editor Part
        const editorPartContainer = $('.part.editor', { role: 'main' });
        editorPartContainer.style.position = 'relative';
        auxiliaryWindow.container.appendChild(editorPartContainer);
        const editorPart = disposables.add(this.instantiationService.createInstance(AuxiliaryEditorPartImpl, auxiliaryWindow.window.vscodeWindowId, this.editorPartsView, options?.state, label));
        disposables.add(this.editorPartsView.registerPart(editorPart));
        editorPart.create(editorPartContainer);
        // Titlebar
        let titlebarPart = undefined;
        let titlebarVisible = false;
        const useCustomTitle = isNative && hasCustomTitlebar(this.configurationService); // custom title in aux windows only enabled in native
        if (useCustomTitle) {
            titlebarPart = disposables.add(this.titleService.createAuxiliaryTitlebarPart(auxiliaryWindow.container, editorPart));
            titlebarVisible = shouldShowCustomTitleBar(this.configurationService, auxiliaryWindow.window, undefined);
            const handleTitleBarVisibilityEvent = () => {
                const oldTitlebarPartVisible = titlebarVisible;
                titlebarVisible = shouldShowCustomTitleBar(this.configurationService, auxiliaryWindow.window, undefined);
                if (oldTitlebarPartVisible !== titlebarVisible) {
                    updateTitlebarVisibility(true);
                }
            };
            disposables.add(titlebarPart.onDidChange(() => auxiliaryWindow.layout()));
            disposables.add(this.layoutService.onDidChangePartVisibility(() => handleTitleBarVisibilityEvent()));
            disposables.add(onDidChangeFullscreen(windowId => {
                if (windowId !== auxiliaryWindow.window.vscodeWindowId) {
                    return; // ignore all but our window
                }
                handleTitleBarVisibilityEvent();
            }));
            updateTitlebarVisibility(false);
        }
        else {
            disposables.add(this.instantiationService.createInstance(WindowTitle, auxiliaryWindow.window, editorPart));
        }
        // Statusbar
        const statusbarPart = disposables.add(this.statusbarService.createAuxiliaryStatusbarPart(auxiliaryWindow.container));
        let statusbarVisible = this.configurationService.getValue(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY) !== false;
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY)) {
                statusbarVisible = this.configurationService.getValue(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY) !== false;
                updateStatusbarVisibility(true);
            }
        }));
        updateStatusbarVisibility(false);
        // Lifecycle
        const editorCloseListener = disposables.add(Event.once(editorPart.onWillClose)(() => auxiliaryWindow.window.close()));
        disposables.add(Event.once(auxiliaryWindow.onUnload)(() => {
            if (disposables.isDisposed) {
                return; // the close happened as part of an earlier dispose call
            }
            editorCloseListener.dispose();
            editorPart.close();
            disposables.dispose();
        }));
        disposables.add(Event.once(this.lifecycleService.onDidShutdown)(() => disposables.dispose()));
        disposables.add(auxiliaryWindow.onBeforeUnload(event => {
            for (const group of editorPart.groups) {
                for (const editor of group.editors) {
                    // Closing an auxiliary window with opened editors
                    // will move the editors to the main window. As such,
                    // we need to validate that we can move and otherwise
                    // prevent the window from closing.
                    const canMoveVeto = editor.canMove(group.id, this.editorPartsView.mainPart.activeGroup.id);
                    if (typeof canMoveVeto === 'string') {
                        group.openEditor(editor);
                        event.veto(canMoveVeto);
                        break;
                    }
                }
            }
        }));
        // Layout: specifically `onWillLayout` to have a chance
        // to build the aux editor part before other components
        // have a chance to react.
        disposables.add(auxiliaryWindow.onWillLayout(dimension => {
            const titlebarPartHeight = titlebarPart?.height ?? 0;
            titlebarPart?.layout(dimension.width, titlebarPartHeight, 0, 0);
            const editorPartHeight = dimension.height - computeEditorPartHeightOffset();
            editorPart.layout(dimension.width, editorPartHeight, titlebarPartHeight, 0);
            statusbarPart.layout(dimension.width, statusbarPart.height, dimension.height - statusbarPart.height, 0);
        }));
        auxiliaryWindow.layout();
        // Have a InstantiationService that is scoped to the auxiliary window
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IStatusbarService, this.statusbarService.createScoped(statusbarPart, disposables)], [IEditorService, this.editorService.createScoped(editorPart, disposables)])));
        return {
            part: editorPart,
            instantiationService,
            disposables
        };
    }
};
AuxiliaryEditorPart = AuxiliaryEditorPart_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IAuxiliaryWindowService),
    __param(3, ILifecycleService),
    __param(4, IConfigurationService),
    __param(5, IStatusbarService),
    __param(6, ITitleService),
    __param(7, IEditorService),
    __param(8, IWorkbenchLayoutService)
], AuxiliaryEditorPart);
export { AuxiliaryEditorPart };
let AuxiliaryEditorPartImpl = class AuxiliaryEditorPartImpl extends EditorPart {
    static { AuxiliaryEditorPartImpl_1 = this; }
    static { this.COUNTER = 1; }
    constructor(windowId, editorPartsView, state, groupsLabel, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService) {
        const id = AuxiliaryEditorPartImpl_1.COUNTER++;
        super(editorPartsView, `workbench.parts.auxiliaryEditor.${id}`, groupsLabel, windowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService);
        this.state = state;
        this._onWillClose = this._register(new Emitter());
        this.onWillClose = this._onWillClose.event;
    }
    removeGroup(group, preserveFocus) {
        // Close aux window when last group removed
        const groupView = this.assertGroupView(group);
        if (this.count === 1 && this.activeGroup === groupView) {
            this.doRemoveLastGroup(preserveFocus);
        }
        // Otherwise delegate to parent implementation
        else {
            super.removeGroup(group, preserveFocus);
        }
    }
    doRemoveLastGroup(preserveFocus) {
        const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.container);
        // Activate next group
        const mostRecentlyActiveGroups = this.editorPartsView.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current group we are about to dispose
        if (nextActiveGroup) {
            nextActiveGroup.groupsView.activateGroup(nextActiveGroup);
            if (restoreFocus) {
                nextActiveGroup.focus();
            }
        }
        this.doClose(false /* do not merge any groups to main part */);
    }
    loadState() {
        return this.state;
    }
    saveState() {
        return; // disabled, auxiliary editor part state is tracked outside
    }
    close() {
        return this.doClose(true /* merge all groups to main part */);
    }
    doClose(mergeGroupsToMainPart) {
        let result = true;
        if (mergeGroupsToMainPart) {
            result = this.mergeGroupsToMainPart();
        }
        this._onWillClose.fire();
        return result;
    }
    mergeGroupsToMainPart() {
        if (!this.groups.some(group => group.count > 0)) {
            return true; // skip if we have no editors opened
        }
        // Find the most recent group that is not locked
        let targetGroup = undefined;
        for (const group of this.editorPartsView.mainPart.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (!group.isLocked) {
                targetGroup = group;
                break;
            }
        }
        if (!targetGroup) {
            targetGroup = this.editorPartsView.mainPart.addGroup(this.editorPartsView.mainPart.activeGroup, this.partOptions.openSideBySideDirection === 'right' ? 3 /* GroupDirection.RIGHT */ : 1 /* GroupDirection.DOWN */);
        }
        const result = this.mergeAllGroups(targetGroup, {
            // Try to reduce the impact of closing the auxiliary window
            // as much as possible by not changing existing editors
            // in the main window.
            preserveExistingIndex: true
        });
        targetGroup.focus();
        return result;
    }
};
AuxiliaryEditorPartImpl = AuxiliaryEditorPartImpl_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IConfigurationService),
    __param(7, IStorageService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IHostService),
    __param(10, IContextKeyService)
], AuxiliaryEditorPartImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5RWRpdG9yUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9hdXhpbGlhcnlFZGl0b3JQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVqRixPQUFPLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlCQUFpQixDQUFDO0FBRWpFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RCxPQUFPLEVB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