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
import * as dom from '../../../../base/browser/dom.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalService, terminalEditorId } from './terminal.js';
import { getTerminalActionBarArgs } from './terminalMenus.js';
import { ITerminalProfileResolverService, ITerminalProfileService } from '../common/terminal.js';
import { openContextMenu } from './terminalContextMenu.js';
import { ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
let TerminalEditor = class TerminalEditor extends EditorPane {
    constructor(group, telemetryService, themeService, storageService, _terminalEditorService, _terminalProfileResolverService, _terminalService, _terminalConfigurationService, contextKeyService, menuService, _instantiationService, _contextMenuService, _terminalProfileService, _workbenchLayoutService) {
        super(terminalEditorId, group, telemetryService, themeService, storageService);
        this._terminalEditorService = _terminalEditorService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._terminalService = _terminalService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._terminalProfileService = _terminalProfileService;
        this._workbenchLayoutService = _workbenchLayoutService;
        this._editorInput = undefined;
        this._cancelContextMenu = false;
        this._newDropdown = this._register(new MutableDisposable());
        this._disposableStore = this._register(new DisposableStore());
        this._dropdownMenu = this._register(menuService.createMenu(MenuId.TerminalNewDropdownContext, contextKeyService));
        this._instanceMenu = this._register(menuService.createMenu(MenuId.TerminalInstanceContext, contextKeyService));
        this._register(this._terminalProfileService.onDidChangeAvailableProfiles(profiles => this._updateTabActionBar(profiles)));
    }
    async setInput(newInput, options, context, token) {
        this._editorInput?.terminalInstance?.detachFromElement();
        this._editorInput = newInput;
        await super.setInput(newInput, options, context, token);
        this._editorInput.terminalInstance?.attachToElement(this._overflowGuardElement);
        if (this._lastDimension) {
            this.layout(this._lastDimension);
        }
        this._editorInput.terminalInstance?.setVisible(this.isVisible() && this._workbenchLayoutService.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, this.window));
        if (this._editorInput.terminalInstance) {
            // since the editor does not monitor focus changes, for ex. between the terminal
            // panel and the editors, this is needed so that the active instance gets set
            // when focus changes between them.
            this._register(this._editorInput.terminalInstance.onDidFocus(() => this._setActiveInstance()));
            this._editorInput.setCopyLaunchConfig(this._editorInput.terminalInstance.shellLaunchConfig);
        }
    }
    clearInput() {
        super.clearInput();
        if (this._overflowGuardElement && this._editorInput?.terminalInstance?.domElement.parentElement === this._overflowGuardElement) {
            this._editorInput.terminalInstance?.detachFromElement();
        }
        this._editorInput = undefined;
    }
    _setActiveInstance() {
        if (!this._editorInput?.terminalInstance) {
            return;
        }
        this._terminalEditorService.setActiveInstance(this._editorInput.terminalInstance);
    }
    focus() {
        super.focus();
        this._editorInput?.terminalInstance?.focus(true);
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    createEditor(parent) {
        this._editorInstanceElement = parent;
        this._overflowGuardElement = dom.$('.terminal-overflow-guard.terminal-editor');
        this._editorInstanceElement.appendChild(this._overflowGuardElement);
        this._registerListeners();
    }
    _registerListeners() {
        if (!this._editorInstanceElement) {
            return;
        }
        this._register(dom.addDisposableListener(this._editorInstanceElement, 'mousedown', async (event) => {
            const terminal = this._terminalEditorService.activeInstance;
            if (this._terminalEditorService.instances.length > 0 && terminal) {
                const result = await terminal.handleMouseEvent(event, this._instanceMenu);
                if (typeof result === 'object' && result.cancelContextMenu) {
                    this._cancelContextMenu = true;
                }
            }
        }));
        this._register(dom.addDisposableListener(this._editorInstanceElement, 'contextmenu', (event) => {
            const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
            if (rightClickBehavior === 'nothing' && !event.shiftKey) {
                event.preventDefault();
                event.stopImmediatePropagation();
                this._cancelContextMenu = false;
                return;
            }
            else if (!this._cancelContextMenu && rightClickBehavior !== 'copyPaste' && rightClickBehavior !== 'paste') {
                if (!this._cancelContextMenu) {
                    openContextMenu(this.window, event, this._editorInput?.terminalInstance, this._instanceMenu, this._contextMenuService);
                }
                event.preventDefault();
                event.stopImmediatePropagation();
                this._cancelContextMenu = false;
            }
        }));
    }
    _updateTabActionBar(profiles) {
        const actions = getTerminalActionBarArgs(TerminalLocation.Editor, profiles, this._getDefaultProfileName(), this._terminalProfileService.contributedProfiles, this._terminalService, this._dropdownMenu, this._disposableStore);
        this._newDropdown.value?.update(actions.dropdownAction, actions.dropdownMenuActions);
    }
    layout(dimension) {
        const instance = this._editorInput?.terminalInstance;
        if (instance) {
            instance.attachToElement(this._overflowGuardElement);
            instance.layout(dimension);
        }
        this._lastDimension = dimension;
    }
    setVisible(visible) {
        super.setVisible(visible);
        this._editorInput?.terminalInstance?.setVisible(visible && this._workbenchLayoutService.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, this.window));
    }
    getActionViewItem(action, options) {
        switch (action.id) {
            case "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */: {
                if (action instanceof MenuItemAction) {
                    const location = { viewColumn: ACTIVE_GROUP };
                    this._disposableStore.clear();
                    const actions = getTerminalActionBarArgs(location, this._terminalProfileService.availableProfiles, this._getDefaultProfileName(), this._terminalProfileService.contributedProfiles, this._terminalService, this._dropdownMenu, this._disposableStore);
                    this._newDropdown.value = this._instantiationService.createInstance(DropdownWithPrimaryActionViewItem, action, actions.dropdownAction, actions.dropdownMenuActions, actions.className, { hoverDelegate: options.hoverDelegate });
                    this._newDropdown.value?.update(actions.dropdownAction, actions.dropdownMenuActions);
                    return this._newDropdown.value;
                }
            }
        }
        return super.getActionViewItem(action, options);
    }
    _getDefaultProfileName() {
        let defaultProfileName;
        try {
            defaultProfileName = this._terminalProfileService.getDefaultProfileName();
        }
        catch (e) {
            defaultProfileName = this._terminalProfileResolverService.defaultProfileName;
        }
        return defaultProfileName;
    }
};
TerminalEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, ITerminalEditorService),
    __param(5, ITerminalProfileResolverService),
    __param(6, ITerminalService),
    __param(7, ITerminalConfigurationService),
    __param(8, IContextKeyService),
    __param(9, IMenuService),
    __param(10, IInstantiationService),
    __param(11, IContextMenuService),
    __param(12, ITerminalProfileService),
    __param(13, IWorkbenchLayoutService)
], TerminalEditor);
export { TerminalEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBSXZELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQzlILE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUUxSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5RCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsdUJBQXVCLEVBQXFCLE1BQU0sdUJBQXVCLENBQUM7QUFFcEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxN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