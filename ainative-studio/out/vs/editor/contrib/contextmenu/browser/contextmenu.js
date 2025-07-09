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
var ContextMenuController_1;
import * as dom from '../../../../base/browser/dom.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../base/common/platform.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { IMenuService, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService, isStandaloneEditorWorkspace } from '../../../../platform/workspace/common/workspace.js';
let ContextMenuController = class ContextMenuController {
    static { ContextMenuController_1 = this; }
    static { this.ID = 'editor.contrib.contextmenu'; }
    static get(editor) {
        return editor.getContribution(ContextMenuController_1.ID);
    }
    constructor(editor, _contextMenuService, _contextViewService, _contextKeyService, _keybindingService, _menuService, _configurationService, _workspaceContextService) {
        this._contextMenuService = _contextMenuService;
        this._contextViewService = _contextViewService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._menuService = _menuService;
        this._configurationService = _configurationService;
        this._workspaceContextService = _workspaceContextService;
        this._toDispose = new DisposableStore();
        this._contextMenuIsBeingShownCount = 0;
        this._editor = editor;
        this._toDispose.add(this._editor.onContextMenu((e) => this._onContextMenu(e)));
        this._toDispose.add(this._editor.onMouseWheel((e) => {
            if (this._contextMenuIsBeingShownCount > 0) {
                const view = this._contextViewService.getContextViewElement();
                const target = e.srcElement;
                // Event triggers on shadow root host first
                // Check if the context view is under this host before hiding it #103169
                if (!(target.shadowRoot && dom.getShadowRoot(view) === target.shadowRoot)) {
                    this._contextViewService.hideContextView();
                }
            }
        }));
        this._toDispose.add(this._editor.onKeyDown((e) => {
            if (!this._editor.getOption(24 /* EditorOption.contextmenu */)) {
                return; // Context menu is turned off through configuration
            }
            if (e.keyCode === 58 /* KeyCode.ContextMenu */) {
                // Chrome is funny like that
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu();
            }
        }));
    }
    _onContextMenu(e) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (!this._editor.getOption(24 /* EditorOption.contextmenu */)) {
            this._editor.focus();
            // Ensure the cursor is at the position of the mouse click
            if (e.target.position && !this._editor.getSelection().containsPosition(e.target.position)) {
                this._editor.setPosition(e.target.position);
            }
            return; // Context menu is turned off through configuration
        }
        if (e.target.type === 12 /* MouseTargetType.OVERLAY_WIDGET */) {
            return; // allow native menu on widgets to support right click on input field for example in find
        }
        if (e.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ && e.target.detail.injectedText) {
            return; // allow native menu on injected text
        }
        e.event.preventDefault();
        e.event.stopPropagation();
        if (e.target.type === 11 /* MouseTargetType.SCROLLBAR */) {
            return this._showScrollbarContextMenu(e.event);
        }
        if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */ && e.target.type !== 7 /* MouseTargetType.CONTENT_EMPTY */ && e.target.type !== 1 /* MouseTargetType.TEXTAREA */) {
            return; // only support mouse click into text or native context menu key for now
        }
        // Ensure the editor gets focus if it hasn't, so the right events are being sent to other contributions
        this._editor.focus();
        // Ensure the cursor is at the position of the mouse click
        if (e.target.position) {
            let hasSelectionAtPosition = false;
            for (const selection of this._editor.getSelections()) {
                if (selection.containsPosition(e.target.position)) {
                    hasSelectionAtPosition = true;
                    break;
                }
            }
            if (!hasSelectionAtPosition) {
                this._editor.setPosition(e.target.position);
            }
        }
        // Unless the user triggerd the context menu through Shift+F10, use the mouse position as menu position
        let anchor = null;
        if (e.target.type !== 1 /* MouseTargetType.TEXTAREA */) {
            anchor = e.event;
        }
        // Show the context menu
        this.showContextMenu(anchor);
    }
    showContextMenu(anchor) {
        if (!this._editor.getOption(24 /* EditorOption.contextmenu */)) {
            return; // Context menu is turned off through configuration
        }
        if (!this._editor.hasModel()) {
            return;
        }
        // Find actions available for menu
        const menuActions = this._getMenuActions(this._editor.getModel(), this._editor.contextMenuId);
        // Show menu if we have actions to show
        if (menuActions.length > 0) {
            this._doShowContextMenu(menuActions, anchor);
        }
    }
    _getMenuActions(model, menuId) {
        const result = [];
        // get menu groups
        const groups = this._menuService.getMenuActions(menuId, this._contextKeyService, { arg: model.uri });
        // translate them into other actions
        for (const group of groups) {
            const [, actions] = group;
            let addedItems = 0;
            for (const action of actions) {
                if (action instanceof SubmenuItemAction) {
                    const subActions = this._getMenuActions(model, action.item.submenu);
                    if (subActions.length > 0) {
                        result.push(new SubmenuAction(action.id, action.label, subActions));
                        addedItems++;
                    }
                }
                else {
                    result.push(action);
                    addedItems++;
                }
            }
            if (addedItems) {
                result.push(new Separator());
            }
        }
        if (result.length) {
            result.pop(); // remove last separator
        }
        return result;
    }
    _doShowContextMenu(actions, event = null) {
        if (!this._editor.hasModel()) {
            return;
        }
        // Disable hover
        const oldHoverSetting = this._editor.getOption(62 /* EditorOption.hover */);
        this._editor.updateOptions({
            hover: {
                enabled: false
            }
        });
        let anchor = event;
        if (!anchor) {
            // Ensure selection is visible
            this._editor.revealPosition(this._editor.getPosition(), 1 /* ScrollType.Immediate */);
            this._editor.render();
            const cursorCoords = this._editor.getScrolledVisiblePosition(this._editor.getPosition());
            // Translate to absolute editor position
            const editorCoords = dom.getDomNodePagePosition(this._editor.getDomNode());
            const posx = editorCoords.left + cursorCoords.left;
            const posy = editorCoords.top + cursorCoords.top + cursorCoords.height;
            anchor = { x: posx, y: posy };
        }
        const useShadowDOM = this._editor.getOption(132 /* EditorOption.useShadowDOM */) && !isIOS; // Do not use shadow dom on IOS #122035
        // Show menu
        this._contextMenuIsBeingShownCount++;
        this._contextMenuService.showContextMenu({
            domForShadowRoot: useShadowDOM ? this._editor.getOverflowWidgetsDomNode() ?? this._editor.getDomNode() : undefined,
            getAnchor: () => anchor,
            getActions: () => actions,
            getActionViewItem: (action) => {
                const keybinding = this._keybindingFor(action);
                if (keybinding) {
                    return new ActionViewItem(action, action, { label: true, keybinding: keybinding.getLabel(), isMenu: true });
                }
                const customActionViewItem = action;
                if (typeof customActionViewItem.getActionViewItem === 'function') {
                    return customActionViewItem.getActionViewItem();
                }
                return new ActionViewItem(action, action, { icon: true, label: true, isMenu: true });
            },
            getKeyBinding: (action) => {
                return this._keybindingFor(action);
            },
            onHide: (wasCancelled) => {
                this._contextMenuIsBeingShownCount--;
                this._editor.updateOptions({
                    hover: oldHoverSetting
                });
            }
        });
    }
    _showScrollbarContextMenu(anchor) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (isStandaloneEditorWorkspace(this._workspaceContextService.getWorkspace())) {
            // can't update the configuration properly in the standalone editor
            return;
        }
        const minimapOptions = this._editor.getOption(74 /* EditorOption.minimap */);
        let lastId = 0;
        const createAction = (opts) => {
            return {
                id: `menu-action-${++lastId}`,
                label: opts.label,
                tooltip: '',
                class: undefined,
                enabled: (typeof opts.enabled === 'undefined' ? true : opts.enabled),
                checked: opts.checked,
                run: opts.run
            };
        };
        const createSubmenuAction = (label, actions) => {
            return new SubmenuAction(`menu-action-${++lastId}`, label, actions, undefined);
        };
        const createEnumAction = (label, enabled, configName, configuredValue, options) => {
            if (!enabled) {
                return createAction({ label, enabled, run: () => { } });
            }
            const createRunner = (value) => {
                return () => {
                    this._configurationService.updateValue(configName, value);
                };
            };
            const actions = [];
            for (const option of options) {
                actions.push(createAction({
                    label: option.label,
                    checked: configuredValue === option.value,
                    run: createRunner(option.value)
                }));
            }
            return createSubmenuAction(label, actions);
        };
        const actions = [];
        actions.push(createAction({
            label: nls.localize('context.minimap.minimap', "Minimap"),
            checked: minimapOptions.enabled,
            run: () => {
                this._configurationService.updateValue(`editor.minimap.enabled`, !minimapOptions.enabled);
            }
        }));
        actions.push(new Separator());
        actions.push(createAction({
            label: nls.localize('context.minimap.renderCharacters', "Render Characters"),
            enabled: minimapOptions.enabled,
            checked: minimapOptions.renderCharacters,
            run: () => {
                this._configurationService.updateValue(`editor.minimap.renderCharacters`, !minimapOptions.renderCharacters);
            }
        }));
        actions.push(createEnumAction(nls.localize('context.minimap.size', "Vertical size"), minimapOptions.enabled, 'editor.minimap.size', minimapOptions.size, [{
                label: nls.localize('context.minimap.size.proportional', "Proportional"),
                value: 'proportional'
            }, {
                label: nls.localize('context.minimap.size.fill', "Fill"),
                value: 'fill'
            }, {
                label: nls.localize('context.minimap.size.fit', "Fit"),
                value: 'fit'
            }]));
        actions.push(createEnumAction(nls.localize('context.minimap.slider', "Slider"), minimapOptions.enabled, 'editor.minimap.showSlider', minimapOptions.showSlider, [{
                label: nls.localize('context.minimap.slider.mouseover', "Mouse Over"),
                value: 'mouseover'
            }, {
                label: nls.localize('context.minimap.slider.always', "Always"),
                value: 'always'
            }]));
        const useShadowDOM = this._editor.getOption(132 /* EditorOption.useShadowDOM */) && !isIOS; // Do not use shadow dom on IOS #122035
        this._contextMenuIsBeingShownCount++;
        this._contextMenuService.showContextMenu({
            domForShadowRoot: useShadowDOM ? this._editor.getDomNode() : undefined,
            getAnchor: () => anchor,
            getActions: () => actions,
            onHide: (wasCancelled) => {
                this._contextMenuIsBeingShownCount--;
                this._editor.focus();
            }
        });
    }
    _keybindingFor(action) {
        return this._keybindingService.lookupKeybinding(action.id);
    }
    dispose() {
        if (this._contextMenuIsBeingShownCount > 0) {
            this._contextViewService.hideContextView();
        }
        this._toDispose.dispose();
    }
};
ContextMenuController = ContextMenuController_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IContextViewService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IMenuService),
    __param(6, IConfigurationService),
    __param(7, IWorkspaceContextService)
], ContextMenuController);
export { ContextMenuController };
class ShowContextMenu extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.showContextMenu',
            label: nls.localize2('action.showContextMenu.label', "Show Editor Context Menu"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 1024 /* KeyMod.Shift */ | 68 /* KeyCode.F10 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor) {
        ContextMenuController.get(editor)?.showContextMenu();
    }
}
registerEditorContribution(ContextMenuController.ID, ContextMenuController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(ShowContextMenu);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29udGV4dG1lbnUvYnJvd3Nlci9jb250ZXh0bWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUd2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFMUYsT0FBTyxFQUFXLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUd2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxZQUFZLEVBQW1DLG9CQUFvQixFQUFFLDBCQUEwQixFQUFvQixNQUFNLHNDQUFzQyxDQUFDO0FBR3pLLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLFlBQVksRUFBVSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG9EQUFv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