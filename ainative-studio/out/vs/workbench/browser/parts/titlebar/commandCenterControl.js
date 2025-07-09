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
var CommandCenterCenterViewItem_1;
import { isActiveDocument, reset } from '../../../../base/browser/dom.js';
import { BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { SubmenuAction } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar, WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId, MenuRegistry, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let CommandCenterControl = class CommandCenterControl {
    constructor(windowTitle, hoverDelegate, instantiationService, quickInputService) {
        this._disposables = new DisposableStore();
        this._onDidChangeVisibility = this._disposables.add(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this.element = document.createElement('div');
        this.element.classList.add('command-center');
        const titleToolbar = instantiationService.createInstance(MenuWorkbenchToolBar, this.element, MenuId.CommandCenter, {
            contextMenu: MenuId.TitleBarContext,
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
            toolbarOptions: {
                primaryGroup: () => true,
            },
            telemetrySource: 'commandCenter',
            actionViewItemProvider: (action, options) => {
                if (action instanceof SubmenuItemAction && action.item.submenu === MenuId.CommandCenterCenter) {
                    return instantiationService.createInstance(CommandCenterCenterViewItem, action, windowTitle, { ...options, hoverDelegate });
                }
                else {
                    return createActionViewItem(instantiationService, action, { ...options, hoverDelegate });
                }
            }
        });
        this._disposables.add(Event.filter(quickInputService.onShow, () => isActiveDocument(this.element), this._disposables)(this._setVisibility.bind(this, false)));
        this._disposables.add(quickInputService.onHide(this._setVisibility.bind(this, true)));
        this._disposables.add(titleToolbar);
    }
    _setVisibility(show) {
        this.element.classList.toggle('hide', !show);
        this._onDidChangeVisibility.fire();
    }
    dispose() {
        this._disposables.dispose();
    }
};
CommandCenterControl = __decorate([
    __param(2, IInstantiationService),
    __param(3, IQuickInputService)
], CommandCenterControl);
export { CommandCenterControl };
let CommandCenterCenterViewItem = class CommandCenterCenterViewItem extends BaseActionViewItem {
    static { CommandCenterCenterViewItem_1 = this; }
    static { this._quickOpenCommandId = 'workbench.action.quickOpenWithModes'; }
    constructor(_submenu, _windowTitle, options, _hoverService, _keybindingService, _instaService, _editorGroupService) {
        super(undefined, _submenu.actions.find(action => action.id === 'workbench.action.quickOpenWithModes') ?? _submenu.actions[0], options);
        this._submenu = _submenu;
        this._windowTitle = _windowTitle;
        this._hoverService = _hoverService;
        this._keybindingService = _keybindingService;
        this._instaService = _instaService;
        this._editorGroupService = _editorGroupService;
        this._hoverDelegate = options.hoverDelegate ?? getDefaultHoverDelegate('mouse');
    }
    render(container) {
        super.render(container);
        container.classList.add('command-center-center');
        container.classList.toggle('multiple', (this._submenu.actions.length > 1));
        const hover = this._store.add(this._hoverService.setupManagedHover(this._hoverDelegate, container, this.getTooltip()));
        // update label & tooltip when window title changes
        this._store.add(this._windowTitle.onDidChange(() => {
            hover.update(this.getTooltip());
        }));
        const groups = [];
        for (const action of this._submenu.actions) {
            if (action instanceof SubmenuAction) {
                groups.push(action.actions);
            }
            else {
                groups.push([action]);
            }
        }
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            // nested toolbar
            const toolbar = this._instaService.createInstance(WorkbenchToolBar, container, {
                hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
                telemetrySource: 'commandCenterCenter',
                actionViewItemProvider: (action, options) => {
                    options = {
                        ...options,
                        hoverDelegate: this._hoverDelegate,
                    };
                    if (action.id !== CommandCenterCenterViewItem_1._quickOpenCommandId) {
                        return createActionViewItem(this._instaService, action, options);
                    }
                    const that = this;
                    return this._instaService.createInstance(class CommandCenterQuickPickItem extends BaseActionViewItem {
                        constructor() {
                            super(undefined, action, options);
                        }
                        render(container) {
                            super.render(container);
                            container.classList.toggle('command-center-quick-pick');
                            container.role = 'button';
                            const action = this.action;
                            // icon (search)
                            const searchIcon = document.createElement('span');
                            searchIcon.ariaHidden = 'true';
                            searchIcon.className = action.class ?? '';
                            searchIcon.classList.add('search-icon');
                            // label: just workspace name and optional decorations
                            const label = this._getLabel();
                            const labelElement = document.createElement('span');
                            labelElement.classList.add('search-label');
                            labelElement.innerText = label;
                            reset(container, searchIcon, labelElement);
                            const hover = this._store.add(that._hoverService.setupManagedHover(that._hoverDelegate, container, this.getTooltip()));
                            // update label & tooltip when window title changes
                            this._store.add(that._windowTitle.onDidChange(() => {
                                hover.update(this.getTooltip());
                                labelElement.innerText = this._getLabel();
                            }));
                            // update label & tooltip when tabs visibility changes
                            this._store.add(that._editorGroupService.onDidChangeEditorPartOptions(({ newPartOptions, oldPartOptions }) => {
                                if (newPartOptions.showTabs !== oldPartOptions.showTabs) {
                                    hover.update(this.getTooltip());
                                    labelElement.innerText = this._getLabel();
                                }
                            }));
                        }
                        getTooltip() {
                            return that.getTooltip();
                        }
                        _getLabel() {
                            const { prefix, suffix } = that._windowTitle.getTitleDecorations();
                            let label = that._windowTitle.workspaceName;
                            if (that._windowTitle.isCustomTitleFormat()) {
                                label = that._windowTitle.getWindowTitle();
                            }
                            else if (that._editorGroupService.partOptions.showTabs === 'none') {
                                label = that._windowTitle.fileName ?? label;
                            }
                            if (!label) {
                                label = localize('label.dfl', "Search");
                            }
                            if (prefix) {
                                label = localize('label1', "{0} {1}", prefix, label);
                            }
                            if (suffix) {
                                label = localize('label2', "{0} {1}", label, suffix);
                            }
                            return label.replaceAll(/\r\n|\r|\n/g, '\u23CE');
                        }
                    });
                }
            });
            toolbar.setActions(group);
            this._store.add(toolbar);
            // spacer
            if (i < groups.length - 1) {
                const icon = renderIcon(Codicon.circleSmallFilled);
                icon.style.padding = '0 12px';
                icon.style.height = '100%';
                icon.style.opacity = '0.5';
                container.appendChild(icon);
            }
        }
    }
    getTooltip() {
        // tooltip: full windowTitle
        const kb = this._keybindingService.lookupKeybinding(this.action.id)?.getLabel();
        const title = kb
            ? localize('title', "Search {0} ({1}) \u2014 {2}", this._windowTitle.workspaceName, kb, this._windowTitle.value)
            : localize('title2', "Search {0} \u2014 {1}", this._windowTitle.workspaceName, this._windowTitle.value);
        return title;
    }
};
CommandCenterCenterViewItem = CommandCenterCenterViewItem_1 = __decorate([
    __param(3, IHoverService),
    __param(4, IKeybindingService),
    __param(5, IInstantiationService),
    __param(6, IEditorGroupsService)
], CommandCenterCenterViewItem);
MenuRegistry.appendMenuItem(MenuId.CommandCenter, {
    submenu: MenuId.CommandCenterCenter,
    title: localize('title3', "Command Center"),
    icon: Codicon.shield,
    order: 101,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZENlbnRlckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvdGl0bGViYXIvY29tbWFuZENlbnRlckNvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQThCLE1BQU0sMERBQTBELENBQUM7QUFDMUgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFcEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pGLE9BQU8sRUFBVyxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBc0Isb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3SCxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFB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