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
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Action } from '../../../../base/common/actions.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ContextScopedHistoryInputBox } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { asCssVariable, badgeBackground, badgeForeground, contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isWorkspaceFolder, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { settingsEditIcon, settingsScopeDropDownIcon } from './preferencesIcons.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let FolderSettingsActionViewItem = class FolderSettingsActionViewItem extends BaseActionViewItem {
    constructor(action, contextService, contextMenuService, hoverService) {
        super(null, action);
        this.contextService = contextService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this._folderSettingCounts = new Map();
        const workspace = this.contextService.getWorkspace();
        this._folder = workspace.folders.length === 1 ? workspace.folders[0] : null;
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.onWorkspaceFoldersChanged()));
    }
    get folder() {
        return this._folder;
    }
    set folder(folder) {
        this._folder = folder;
        this.update();
    }
    setCount(settingsTarget, count) {
        const workspaceFolder = this.contextService.getWorkspaceFolder(settingsTarget);
        if (!workspaceFolder) {
            throw new Error('unknown folder');
        }
        const folder = workspaceFolder.uri;
        this._folderSettingCounts.set(folder.toString(), count);
        this.update();
    }
    render(container) {
        this.element = container;
        this.container = container;
        this.labelElement = DOM.$('.action-title');
        this.detailsElement = DOM.$('.action-details');
        this.dropDownElement = DOM.$('.dropdown-icon.hide' + ThemeIcon.asCSSSelector(settingsScopeDropDownIcon));
        this.anchorElement = DOM.$('a.action-label.folder-settings', {
            role: 'button',
            'aria-haspopup': 'true',
            'tabindex': '0'
        }, this.labelElement, this.detailsElement, this.dropDownElement);
        this.anchorElementHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.anchorElement, ''));
        this._register(DOM.addDisposableListener(this.anchorElement, DOM.EventType.MOUSE_DOWN, e => DOM.EventHelper.stop(e)));
        this._register(DOM.addDisposableListener(this.anchorElement, DOM.EventType.CLICK, e => this.onClick(e)));
        this._register(DOM.addDisposableListener(this.container, DOM.EventType.KEY_UP, e => this.onKeyUp(e)));
        DOM.append(this.container, this.anchorElement);
        this.update();
    }
    onKeyUp(event) {
        const keyboardEvent = new StandardKeyboardEvent(event);
        switch (keyboardEvent.keyCode) {
            case 3 /* KeyCode.Enter */:
            case 10 /* KeyCode.Space */:
                this.onClick(event);
                return;
        }
    }
    onClick(event) {
        DOM.EventHelper.stop(event, true);
        if (!this.folder || this._action.checked) {
            this.showMenu();
        }
        else {
            this._action.run(this._folder);
        }
    }
    updateEnabled() {
        this.update();
    }
    updateChecked() {
        this.update();
    }
    onWorkspaceFoldersChanged() {
        const oldFolder = this._folder;
        const workspace = this.contextService.getWorkspace();
        if (oldFolder) {
            this._folder = workspace.folders.filter(folder => isEqual(folder.uri, oldFolder.uri))[0] || workspace.folders[0];
        }
        this._folder = this._folder ? this._folder : workspace.folders.length === 1 ? workspace.folders[0] : null;
        this.update();
        if (this._action.checked) {
            this._action.run(this._folder);
        }
    }
    update() {
        let total = 0;
        this._folderSettingCounts.forEach(n => total += n);
        const workspace = this.contextService.getWorkspace();
        if (this._folder) {
            this.labelElement.textContent = this._folder.name;
            this.anchorElementHover.update(this._folder.name);
            const detailsText = this.labelWithCount(this._action.label, total);
            this.detailsElement.textContent = detailsText;
            this.dropDownElement.classList.toggle('hide', workspace.folders.length === 1 || !this._action.checked);
        }
        else {
            const labelText = this.labelWithCount(this._action.label, total);
            this.labelElement.textContent = labelText;
            this.detailsElement.textContent = '';
            this.anchorElementHover.update(this._action.label);
            this.dropDownElement.classList.remove('hide');
        }
        this.anchorElement.classList.toggle('checked', this._action.checked);
        this.container.classList.toggle('disabled', !this._action.enabled);
    }
    showMenu() {
        this.contextMenuService.showContextMenu({
            getAnchor: () => this.container,
            getActions: () => this.getDropdownMenuActions(),
            getActionViewItem: () => undefined,
            onHide: () => {
                this.anchorElement.blur();
            }
        });
    }
    getDropdownMenuActions() {
        const actions = [];
        const workspaceFolders = this.contextService.getWorkspace().folders;
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ && workspaceFolders.length > 0) {
            actions.push(...workspaceFolders.map((folder, index) => {
                const folderCount = this._folderSettingCounts.get(folder.uri.toString());
                return {
                    id: 'folderSettingsTarget' + index,
                    label: this.labelWithCount(folder.name, folderCount),
                    tooltip: this.labelWithCount(folder.name, folderCount),
                    checked: !!this.folder && isEqual(this.folder.uri, folder.uri),
                    enabled: true,
                    class: undefined,
                    run: () => this._action.run(folder)
                };
            }));
        }
        return actions;
    }
    labelWithCount(label, count) {
        // Append the count if it's >0 and not undefined
        if (count) {
            label += ` (${count})`;
        }
        return label;
    }
};
FolderSettingsActionViewItem = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IContextMenuService),
    __param(3, IHoverService)
], FolderSettingsActionViewItem);
export { FolderSettingsActionViewItem };
let SettingsTargetsWidget = class SettingsTargetsWidget extends Widget {
    constructor(parent, options, contextService, instantiationService, environmentService, labelService, languageService) {
        super();
        this.contextService = contextService;
        this.instantiationService = instantiationService;
        this.environmentService = environmentService;
        this.labelService = labelService;
        this.languageService = languageService;
        this._settingsTarget = null;
        this._onDidTargetChange = this._register(new Emitter());
        this.onDidTargetChange = this._onDidTargetChange.event;
        this.options = options ?? {};
        this.create(parent);
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.onWorkbenchStateChanged()));
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.update()));
    }
    resetLabels() {
        const remoteAuthority = this.environmentService.remoteAuthority;
        const hostLabel = remoteAuthority && this.labelService.getHostLabel(Schemas.vscodeRemote, remoteAuthority);
        this.userLocalSettings.label = localize('userSettings', "User");
        this.userRemoteSettings.label = localize('userSettingsRemote', "Remote") + (hostLabel ? ` [${hostLabel}]` : '');
        this.workspaceSettings.label = localize('workspaceSettings', "Workspace");
        this.folderSettingsAction.label = localize('folderSettings', "Folder");
    }
    create(parent) {
        const settingsTabsWidget = DOM.append(parent, DOM.$('.settings-tabs-widget'));
        this.settingsSwitcherBar = this._register(new ActionBar(settingsTabsWidget, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            focusOnlyEnabledItems: true,
            ariaLabel: localize('settingsSwitcherBarAriaLabel', "Settings Switcher"),
            ariaRole: 'tablist',
            actionViewItemProvider: (action, options) => action.id === 'folderSettings' ? this.folderSettings : undefined
        }));
        this.userLocalSettings = new Action('userSettings', '', '.settings-tab', true, () => this.updateTarget(3 /* ConfigurationTarget.USER_LOCAL */));
        this.userLocalSettings.tooltip = localize('userSettings', "User");
        this.userRemoteSettings = new Action('userSettingsRemote', '', '.settings-tab', true, () => this.updateTarget(4 /* ConfigurationTarget.USER_REMOTE */));
        const remoteAuthority = this.environmentService.remoteAuthority;
        const hostLabel = remoteAuthority && this.labelService.getHostLabel(Schemas.vscodeRemote, remoteAuthority);
        this.userRemoteSettings.tooltip = localize('userSettingsRemote', "Remote") + (hostLabel ? ` [${hostLabel}]` : '');
        this.workspaceSettings = new Action('workspaceSettings', '', '.settings-tab', false, () => this.updateTarget(5 /* ConfigurationTarget.WORKSPACE */));
        this.folderSettingsAction = new Action('folderSettings', '', '.settings-tab', false, async (folder) => {
            this.updateTarget(isWorkspaceFolder(folder) ? folder.uri : 3 /* ConfigurationTarget.USER_LOCAL */);
        });
        this.folderSettings = this.instantiationService.createInstance(FolderSettingsActionViewItem, this.folderSettingsAction);
        this.resetLabels();
        this.update();
        this.settingsSwitcherBar.push([this.userLocalSettings, this.userRemoteSettings, this.workspaceSettings, this.folderSettingsAction]);
    }
    get settingsTarget() {
        return this._settingsTarget;
    }
    set settingsTarget(settingsTarget) {
        this._settingsTarget = settingsTarget;
        this.userLocalSettings.checked = 3 /* ConfigurationTarget.USER_LOCAL */ === this.settingsTarget;
        this.userRemoteSettings.checked = 4 /* ConfigurationTarget.USER_REMOTE */ === this.settingsTarget;
        this.workspaceSettings.checked = 5 /* ConfigurationTarget.WORKSPACE */ === this.settingsTarget;
        if (this.settingsTarget instanceof URI) {
            this.folderSettings.action.checked = true;
            this.folderSettings.folder = this.contextService.getWorkspaceFolder(this.settingsTarget);
        }
        else {
            this.folderSettings.action.checked = false;
        }
    }
    setResultCount(settingsTarget, count) {
        if (settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */) {
            let label = localize('workspaceSettings', "Workspace");
            if (count) {
                label += ` (${count})`;
            }
            this.workspaceSettings.label = label;
        }
        else if (settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
            let label = localize('userSettings', "User");
            if (count) {
                label += ` (${count})`;
            }
            this.userLocalSettings.label = label;
        }
        else if (settingsTarget instanceof URI) {
            this.folderSettings.setCount(settingsTarget, count);
        }
    }
    updateLanguageFilterIndicators(filter) {
        this.resetLabels();
        if (filter) {
            const languageToUse = this.languageService.getLanguageName(filter);
            if (languageToUse) {
                const languageSuffix = ` [${languageToUse}]`;
                this.userLocalSettings.label += languageSuffix;
                this.userRemoteSettings.label += languageSuffix;
                this.workspaceSettings.label += languageSuffix;
                this.folderSettingsAction.label += languageSuffix;
            }
        }
    }
    onWorkbenchStateChanged() {
        this.folderSettings.folder = null;
        this.update();
        if (this.settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */ && this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            this.updateTarget(3 /* ConfigurationTarget.USER_LOCAL */);
        }
    }
    updateTarget(settingsTarget) {
        const isSameTarget = this.settingsTarget === settingsTarget ||
            settingsTarget instanceof URI &&
                this.settingsTarget instanceof URI &&
                isEqual(this.settingsTarget, settingsTarget);
        if (!isSameTarget) {
            this.settingsTarget = settingsTarget;
            this._onDidTargetChange.fire(this.settingsTarget);
        }
        return Promise.resolve(undefined);
    }
    async update() {
        this.settingsSwitcherBar.domNode.classList.toggle('empty-workbench', this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */);
        this.userRemoteSettings.enabled = !!(this.options.enableRemoteSettings && this.environmentService.remoteAuthority);
        this.workspaceSettings.enabled = this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */;
        this.folderSettings.action.enabled = this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ && this.contextService.getWorkspace().folders.length > 0;
        this.workspaceSettings.tooltip = localize('workspaceSettings', "Workspace");
    }
};
SettingsTargetsWidget = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IInstantiationService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ILabelService),
    __param(6, ILanguageService)
], SettingsTargetsWidget);
export { SettingsTargetsWidget };
let SearchWidget = class SearchWidget extends Widget {
    constructor(parent, options, contextViewService, instantiationService, contextKeyService, keybindingService) {
        super();
        this.options = options;
        this.contextViewService = contextViewService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onFocus = this._register(new Emitter());
        this.onFocus = this._onFocus.event;
        this.create(parent);
    }
    create(parent) {
        this.domNode = DOM.append(parent, DOM.$('div.settings-header-widget'));
        this.createSearchContainer(DOM.append(this.domNode, DOM.$('div.settings-search-container')));
        this.controlsDiv = DOM.append(this.domNode, DOM.$('div.settings-search-controls'));
        if (this.options.showResultCount) {
            this.countElement = DOM.append(this.controlsDiv, DOM.$('.settings-count-widget'));
            this.countElement.style.backgroundColor = asCssVariable(badgeBackground);
            this.countElement.style.color = asCssVariable(badgeForeground);
            this.countElement.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        }
        this.inputBox.inputElement.setAttribute('aria-live', this.options.ariaLive || 'off');
        if (this.options.ariaLabelledBy) {
            this.inputBox.inputElement.setAttribute('aria-labelledBy', this.options.ariaLabelledBy);
        }
        const focusTracker = this._register(DOM.trackFocus(this.inputBox.inputElement));
        this._register(focusTracker.onDidFocus(() => this._onFocus.fire()));
        const focusKey = this.options.focusKey;
        if (focusKey) {
            this._register(focusTracker.onDidFocus(() => focusKey.set(true)));
            this._register(focusTracker.onDidBlur(() => focusKey.set(false)));
        }
    }
    createSearchContainer(searchContainer) {
        this.searchContainer = searchContainer;
        const searchInput = DOM.append(this.searchContainer, DOM.$('div.settings-search-input'));
        this.inputBox = this._register(this.createInputBox(searchInput));
        this._register(this.inputBox.onDidChange(value => this._onDidChange.fire(value)));
    }
    createInputBox(parent) {
        const showHistoryHint = () => showHistoryKeybindingHint(this.keybindingService);
        return new ContextScopedHistoryInputBox(parent, this.contextViewService, { ...this.options, showHistoryHint }, this.contextKeyService);
    }
    showMessage(message) {
        // Avoid setting the aria-label unnecessarily, the screenreader will read the count every time it's set, since it's aria-live:assertive. #50968
        if (this.countElement && message !== this.countElement.textContent) {
            this.countElement.textContent = message;
            this.inputBox.inputElement.setAttribute('aria-label', message);
            this.inputBox.inputElement.style.paddingRight = this.getControlsWidth() + 'px';
        }
    }
    layout(dimension) {
        if (dimension.width < 400) {
            this.countElement?.classList.add('hide');
            this.inputBox.inputElement.style.paddingRight = '0px';
        }
        else {
            this.countElement?.classList.remove('hide');
            this.inputBox.inputElement.style.paddingRight = this.getControlsWidth() + 'px';
        }
    }
    getControlsWidth() {
        const countWidth = this.countElement ? DOM.getTotalWidth(this.countElement) : 0;
        return countWidth + 20;
    }
    focus() {
        this.inputBox.focus();
        if (this.getValue()) {
            this.inputBox.select();
        }
    }
    hasFocus() {
        return this.inputBox.hasFocus();
    }
    clear() {
        this.inputBox.value = '';
    }
    getValue() {
        return this.inputBox.value;
    }
    setValue(value) {
        return this.inputBox.value = value;
    }
    dispose() {
        this.options.focusKey?.set(false);
        super.dispose();
    }
};
SearchWidget = __decorate([
    __param(2, IContextViewService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IKeybindingService)
], SearchWidget);
export { SearchWidget };
export class EditPreferenceWidget extends Disposable {
    constructor(editor) {
        super();
        this.editor = editor;
        this._line = -1;
        this._preferences = [];
        this._onClick = this._register(new Emitter());
        this.onClick = this._onClick.event;
        this._editPreferenceDecoration = this.editor.createDecorationsCollection();
        this._register(this.editor.onMouseDown((e) => {
            if (e.target.type !== 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ || e.target.detail.isAfterLines || !this.isVisible()) {
                return;
            }
            this._onClick.fire(e);
        }));
    }
    get preferences() {
        return this._preferences;
    }
    getLine() {
        return this._line;
    }
    show(line, hoverMessage, preferences) {
        this._preferences = preferences;
        const newDecoration = [];
        this._line = line;
        newDecoration.push({
            options: {
                description: 'edit-preference-widget-decoration',
                glyphMarginClassName: ThemeIcon.asClassName(settingsEditIcon),
                glyphMarginHoverMessage: new MarkdownString().appendText(hoverMessage),
                stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            },
            range: {
                startLineNumber: line,
                startColumn: 1,
                endLineNumber: line,
                endColumn: 1
            }
        });
        this._editPreferenceDecoration.set(newDecoration);
    }
    hide() {
        this._editPreferenceDecoration.clear();
    }
    isVisible() {
        return this._editPreferenceDecoration.length > 0;
    }
    dispose() {
        this.hide();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvcHJlZmVyZW5jZXNXaWRnZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxvREFBb0QsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQTBCLE1BQU0sMERBQTBELENBQUM7QUFFdEgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDbEgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFF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