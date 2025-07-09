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
var SettingsEditor2_1;
import * as DOM from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Action } from '../../../../base/common/actions.js';
import { Delayer, raceTimeout } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { fromNow } from '../../../../base/common/date.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, MutableDisposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import './media/settingsEditor2.css';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { asCssVariable, badgeBackground, badgeForeground, contrastBorder, editorForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IUserDataSyncEnablementService, IUserDataSyncService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { SuggestEnabledInput } from '../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { SettingsTargetsWidget } from './preferencesWidgets.js';
import { getCommonlyUsedData, tocData } from './settingsLayout.js';
import { AbstractSettingRenderer, resolveConfiguredUntrustedSettings, createTocTreeForExtensionSettings, resolveSettingsTree, SettingsTree, SettingTreeRenderers } from './settingsTree.js';
import { parseQuery, SearchResultModel, SettingsTreeGroupElement, SettingsTreeModel, SettingsTreeSettingElement } from './settingsTreeModels.js';
import { createTOCIterator, TOCTree, TOCTreeModel } from './tocTree.js';
import { CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_ROW_FOCUS, CONTEXT_SETTINGS_SEARCH_FOCUS, CONTEXT_TOC_ROW_FOCUS, ENABLE_LANGUAGE_FILTER, EXTENSION_FETCH_TIMEOUT_MS, EXTENSION_SETTING_TAG, FEATURE_SETTING_TAG, ID_SETTING_TAG, IPreferencesSearchService, LANGUAGE_SETTING_TAG, MODIFIED_SETTING_TAG, POLICY_SETTING_TAG, REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG, SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, SETTINGS_EDITOR_COMMAND_SUGGEST_FILTERS, WORKSPACE_TRUST_SETTING_TAG, getExperimentalExtensionToggleData } from '../common/preferences.js';
import { settingsHeaderBorder, settingsSashBorder, settingsTextInputBorder } from '../common/settingsEditorColorRegistry.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IPreferencesService, SettingMatchType, SettingValueType, validateSettingsEditorOptions } from '../../../services/preferences/common/preferences.js';
import { Settings2EditorModel, nullRange } from '../../../services/preferences/common/preferencesModels.js';
import { IUserDataSyncWorkbenchService } from '../../../services/userDataSync/common/userDataSync.js';
import { preferencesClearInputIcon, preferencesFilterIcon } from './preferencesIcons.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { APPLICATION_SCOPES, IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { Sizing, SplitView } from '../../../../base/browser/ui/splitview/splitview.js';
import { Color } from '../../../../base/common/color.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { SettingsSearchFilterDropdownMenuActionViewItem } from './settingsSearchMenu.js';
import { IExtensionGalleryService, IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
export var SettingsFocusContext;
(function (SettingsFocusContext) {
    SettingsFocusContext[SettingsFocusContext["Search"] = 0] = "Search";
    SettingsFocusContext[SettingsFocusContext["TableOfContents"] = 1] = "TableOfContents";
    SettingsFocusContext[SettingsFocusContext["SettingTree"] = 2] = "SettingTree";
    SettingsFocusContext[SettingsFocusContext["SettingControl"] = 3] = "SettingControl";
})(SettingsFocusContext || (SettingsFocusContext = {}));
export function createGroupIterator(group) {
    return Iterable.map(group.children, g => {
        return {
            element: g,
            children: g instanceof SettingsTreeGroupElement ?
                createGroupIterator(g) :
                undefined
        };
    });
}
const $ = DOM.$;
const searchBoxLabel = localize('SearchSettings.AriaLabel', "Search settings");
const SEARCH_TOC_BEHAVIOR_KEY = 'workbench.settings.settingsSearchTocBehavior';
const SETTINGS_EDITOR_STATE_KEY = 'settingsEditorState';
let SettingsEditor2 = class SettingsEditor2 extends EditorPane {
    static { SettingsEditor2_1 = this; }
    static { this.ID = 'workbench.editor.settings2'; }
    static { this.NUM_INSTANCES = 0; }
    static { this.SEARCH_DEBOUNCE = 200; }
    static { this.SETTING_UPDATE_FAST_DEBOUNCE = 200; }
    static { this.SETTING_UPDATE_SLOW_DEBOUNCE = 1000; }
    static { this.CONFIG_SCHEMA_UPDATE_DELAYER = 500; }
    static { this.TOC_MIN_WIDTH = 100; }
    static { this.TOC_RESET_WIDTH = 200; }
    static { this.EDITOR_MIN_WIDTH = 500; }
    // Below NARROW_TOTAL_WIDTH, we only render the editor rather than the ToC.
    static { this.NARROW_TOTAL_WIDTH = this.TOC_RESET_WIDTH + this.EDITOR_MIN_WIDTH; }
    static { this.SUGGESTIONS = [
        `@${MODIFIED_SETTING_TAG}`,
        '@tag:notebookLayout',
        '@tag:notebookOutputLayout',
        `@tag:${REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG}`,
        `@tag:${WORKSPACE_TRUST_SETTING_TAG}`,
        '@tag:sync',
        '@tag:usesOnlineServices',
        '@tag:telemetry',
        '@tag:accessibility',
        '@tag:preview',
        '@tag:experimental',
        `@${ID_SETTING_TAG}`,
        `@${EXTENSION_SETTING_TAG}`,
        `@${FEATURE_SETTING_TAG}scm`,
        `@${FEATURE_SETTING_TAG}explorer`,
        `@${FEATURE_SETTING_TAG}search`,
        `@${FEATURE_SETTING_TAG}debug`,
        `@${FEATURE_SETTING_TAG}extensions`,
        `@${FEATURE_SETTING_TAG}terminal`,
        `@${FEATURE_SETTING_TAG}task`,
        `@${FEATURE_SETTING_TAG}problems`,
        `@${FEATURE_SETTING_TAG}output`,
        `@${FEATURE_SETTING_TAG}comments`,
        `@${FEATURE_SETTING_TAG}remote`,
        `@${FEATURE_SETTING_TAG}timeline`,
        `@${FEATURE_SETTING_TAG}notebook`,
        `@${POLICY_SETTING_TAG}`
    ]; }
    static shouldSettingUpdateFast(type) {
        if (Array.isArray(type)) {
            // nullable integer/number or complex
            return false;
        }
        return type === SettingValueType.Enum ||
            type === SettingValueType.Array ||
            type === SettingValueType.BooleanObject ||
            type === SettingValueType.Object ||
            type === SettingValueType.Complex ||
            type === SettingValueType.Boolean ||
            type === SettingValueType.Exclude ||
            type === SettingValueType.Include;
    }
    constructor(group, telemetryService, configurationService, textResourceConfigurationService, themeService, preferencesService, instantiationService, preferencesSearchService, logService, contextKeyService, storageService, editorGroupService, userDataSyncWorkbenchService, userDataSyncEnablementService, workspaceTrustManagementService, extensionService, languageService, extensionManagementService, productService, extensionGalleryService, editorProgressService, userDataProfileService) {
        super(SettingsEditor2_1.ID, group, telemetryService, themeService, storageService);
        this.configurationService = configurationService;
        this.preferencesService = preferencesService;
        this.instantiationService = instantiationService;
        this.preferencesSearchService = preferencesSearchService;
        this.logService = logService;
        this.storageService = storageService;
        this.editorGroupService = editorGroupService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.extensionService = extensionService;
        this.languageService = languageService;
        this.extensionManagementService = extensionManagementService;
        this.productService = productService;
        this.extensionGalleryService = extensionGalleryService;
        this.editorProgressService = editorProgressService;
        this.settingsTreeModel = this._register(new MutableDisposable());
        this.searchInProgress = null;
        this.pendingSettingUpdate = null;
        this._searchResultModel = this._register(new MutableDisposable());
        this.searchResultLabel = null;
        this.lastSyncedLabel = null;
        this.settingsOrderByTocIndex = null;
        this._currentFocusContext = 0 /* SettingsFocusContext.Search */;
        /** Don't spam warnings */
        this.hasWarnedMissingSettings = false;
        this.tocTreeDisposed = false;
        this.tocFocusedElement = null;
        this.treeFocusedElement = null;
        this.settingsTreeScrollTop = 0;
        this.installedExtensionIds = [];
        this.dismissedExtensionSettings = [];
        this.DISMISSED_EXTENSION_SETTINGS_STORAGE_KEY = 'settingsEditor2.dismissedExtensionSettings';
        this.DISMISSED_EXTENSION_SETTINGS_DELIMITER = '\t';
        this.searchDelayer = new Delayer(300);
        this.viewState = { settingsTarget: 3 /* ConfigurationTarget.USER_LOCAL */ };
        this.settingFastUpdateDelayer = new Delayer(SettingsEditor2_1.SETTING_UPDATE_FAST_DEBOUNCE);
        this.settingSlowUpdateDelayer = new Delayer(SettingsEditor2_1.SETTING_UPDATE_SLOW_DEBOUNCE);
        this.searchInputDelayer = new Delayer(SettingsEditor2_1.SEARCH_DEBOUNCE);
        this.updatedConfigSchemaDelayer = new Delayer(SettingsEditor2_1.CONFIG_SCHEMA_UPDATE_DELAYER);
        this.inSettingsEditorContextKey = CONTEXT_SETTINGS_EDITOR.bindTo(contextKeyService);
        this.searchFocusContextKey = CONTEXT_SETTINGS_SEARCH_FOCUS.bindTo(contextKeyService);
        this.tocRowFocused = CONTEXT_TOC_ROW_FOCUS.bindTo(contextKeyService);
        this.settingRowFocused = CONTEXT_SETTINGS_ROW_FOCUS.bindTo(contextKeyService);
        this.scheduledRefreshes = new Map();
        this.editorMemento = this.getEditorMemento(editorGroupService, textResourceConfigurationService, SETTINGS_EDITOR_STATE_KEY);
        this.dismissedExtensionSettings = this.storageService
            .get(this.DISMISSED_EXTENSION_SETTINGS_STORAGE_KEY, 0 /* StorageScope.PROFILE */, '')
            .split(this.DISMISSED_EXTENSION_SETTINGS_DELIMITER);
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.source !== 7 /* ConfigurationTarget.DEFAULT */) {
                this.onConfigUpdate(e.affectedKeys);
            }
        }));
        this._register(userDataProfileService.onDidChangeCurrentProfile(e => {
            e.join(this.whenCurrentProfileChanged());
        }));
        this._register(workspaceTrustManagementService.onDidChangeTrust(() => {
            this.searchResultModel?.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted());
            if (this.settingsTreeModel.value) {
                this.settingsTreeModel.value.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted());
                this.renderTree();
            }
        }));
        this._register(configurationService.onDidChangeRestrictedSettings(e => {
            if (e.default.length && this.currentSettingsModel) {
                this.updateElementsByKey(new Set(e.default));
            }
        }));
        this._register(extensionManagementService.onDidInstallExtensions(() => {
            this.refreshInstalledExtensionsList();
        }));
        this._register(extensionManagementService.onDidUninstallExtension(() => {
            this.refreshInstalledExtensionsList();
        }));
        this.modelDisposables = this._register(new DisposableStore());
        if (ENABLE_LANGUAGE_FILTER && !SettingsEditor2_1.SUGGESTIONS.includes(`@${LANGUAGE_SETTING_TAG}`)) {
            SettingsEditor2_1.SUGGESTIONS.push(`@${LANGUAGE_SETTING_TAG}`);
        }
        this.inputChangeListener = this._register(new MutableDisposable());
    }
    async whenCurrentProfileChanged() {
        this.updatedConfigSchemaDelayer.trigger(() => {
            this.dismissedExtensionSettings = this.storageService
                .get(this.DISMISSED_EXTENSION_SETTINGS_STORAGE_KEY, 0 /* StorageScope.PROFILE */, '')
                .split(this.DISMISSED_EXTENSION_SETTINGS_DELIMITER);
            this.onConfigUpdate(undefined, true);
        });
    }
    get minimumWidth() { return SettingsEditor2_1.EDITOR_MIN_WIDTH; }
    get maximumWidth() { return Number.POSITIVE_INFINITY; }
    get minimumHeight() { return 180; }
    // these setters need to exist because this extends from EditorPane
    set minimumWidth(value) { }
    set maximumWidth(value) { }
    get currentSettingsModel() {
        return this.searchResultModel || this.settingsTreeModel.value;
    }
    get searchResultModel() {
        return this._searchResultModel.value ?? null;
    }
    set searchResultModel(value) {
        this._searchResultModel.value = value ?? undefined;
        this.rootElement.classList.toggle('search-mode', !!this._searchResultModel.value);
    }
    get focusedSettingDOMElement() {
        const focused = this.settingsTree.getFocus()[0];
        if (!(focused instanceof SettingsTreeSettingElement)) {
            return;
        }
        return this.settingRenderers.getDOMElementsForSettingKey(this.settingsTree.getHTMLElement(), focused.setting.key)[0];
    }
    get currentFocusContext() {
        return this._currentFocusContext;
    }
    createEditor(parent) {
        parent.setAttribute('tabindex', '-1');
        this.rootElement = DOM.append(parent, $('.settings-editor', { tabindex: '-1' }));
        this.createHeader(this.rootElement);
        this.createBody(this.rootElement);
        this.addCtrlAInterceptor(this.rootElement);
        this.updateStyles();
        this._register(registerNavigableContainer({
            name: 'settingsEditor2',
            focusNotifiers: [this],
            focusNextWidget: () => {
                if (this.searchWidget.inputWidget.hasWidgetFocus()) {
                    this.focusTOC();
                }
            },
            focusPreviousWidget: () => {
                if (!this.searchWidget.inputWidget.hasWidgetFocus()) {
                    this.focusSearch();
                }
            }
        }));
    }
    async setInput(input, options, context, token) {
        this.inSettingsEditorContextKey.set(true);
        await super.setInput(input, options, context, token);
        if (!this.input) {
            return;
        }
        const model = await this.input.resolve();
        if (token.isCancellationRequested || !(model instanceof Settings2EditorModel)) {
            return;
        }
        this.modelDisposables.clear();
        this.modelDisposables.add(model.onDidChangeGroups(() => {
            this.updatedConfigSchemaDelayer.trigger(() => {
                this.onConfigUpdate(undefined, false, true);
            });
        }));
        this.defaultSettingsEditorModel = model;
        options = options || validateSettingsEditorOptions({});
        if (!this.viewState.settingsTarget || !this.settingsTargetsWidget.settingsTarget) {
            const optionsHasViewStateTarget = options.viewState && options.viewState.settingsTarget;
            if (!options.target && !optionsHasViewStateTarget) {
                options.target = 3 /* ConfigurationTarget.USER_LOCAL */;
            }
        }
        this._setOptions(options);
        // Don't block setInput on render (which can trigger an async search)
        this.onConfigUpdate(undefined, true).then(() => {
            // This event runs when the editor closes.
            this.inputChangeListener.value = input.onWillDispose(() => {
                this.searchWidget.setValue('');
            });
            // Init TOC selection
            this.updateTreeScrollSync();
        });
        await this.refreshInstalledExtensionsList();
    }
    async refreshInstalledExtensionsList() {
        const installedExtensions = await this.extensionManagementService.getInstalled();
        this.installedExtensionIds = installedExtensions
            .filter(ext => ext.manifest.contributes?.configuration)
            .map(ext => ext.identifier.id);
    }
    restoreCachedState() {
        const cachedState = this.input && this.editorMemento.loadEditorState(this.group, this.input);
        if (cachedState && typeof cachedState.target === 'object') {
            cachedState.target = URI.revive(cachedState.target);
        }
        if (cachedState) {
            const settingsTarget = cachedState.target;
            this.settingsTargetsWidget.settingsTarget = settingsTarget;
            this.viewState.settingsTarget = settingsTarget;
            if (!this.searchWidget.getValue()) {
                this.searchWidget.setValue(cachedState.searchQuery);
            }
        }
        if (this.input) {
            this.editorMemento.clearEditorState(this.input, this.group);
        }
        return cachedState ?? null;
    }
    getViewState() {
        return this.viewState;
    }
    setOptions(options) {
        super.setOptions(options);
        if (options) {
            this._setOptions(options);
        }
    }
    _setOptions(options) {
        if (options.focusSearch && !platform.isIOS) {
            // isIOS - #122044
            this.focusSearch();
        }
        const recoveredViewState = options.viewState ?
            options.viewState : undefined;
        const query = recoveredViewState?.query ?? options.query;
        if (query !== undefined) {
            this.searchWidget.setValue(query);
            this.viewState.query = query;
        }
        const target = options.folderUri ?? recoveredViewState?.settingsTarget ?? options.target;
        if (target) {
            this.settingsTargetsWidget.updateTarget(target);
        }
    }
    clearInput() {
        this.inSettingsEditorContextKey.set(false);
        super.clearInput();
    }
    layout(dimension) {
        this.dimension = dimension;
        if (!this.isVisible()) {
            return;
        }
        this.layoutSplitView(dimension);
        const innerWidth = Math.min(this.headerContainer.clientWidth, dimension.width) - 24 * 2; // 24px padding on left and right;
        // minus padding inside inputbox, countElement width, controls width, extra padding before countElement
        const monacoWidth = innerWidth - 10 - this.countElement.clientWidth - this.controlsElement.clientWidth - 12;
        this.searchWidget.layout(new DOM.Dimension(monacoWidth, 20));
        this.rootElement.classList.toggle('narrow-width', dimension.width < SettingsEditor2_1.NARROW_TOTAL_WIDTH);
    }
    focus() {
        super.focus();
        if (this._currentFocusContext === 0 /* SettingsFocusContext.Search */) {
            if (!platform.isIOS) {
                // #122044
                this.focusSearch();
            }
        }
        else if (this._currentFocusContext === 3 /* SettingsFocusContext.SettingControl */) {
            const element = this.focusedSettingDOMElement;
            if (element) {
                const control = element.querySelector(AbstractSettingRenderer.CONTROL_SELECTOR);
                if (control) {
                    control.focus();
                    return;
                }
            }
        }
        else if (this._currentFocusContext === 2 /* SettingsFocusContext.SettingTree */) {
            this.settingsTree.domFocus();
        }
        else if (this._currentFocusContext === 1 /* SettingsFocusContext.TableOfContents */) {
            this.tocTree.domFocus();
        }
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        if (!visible) {
            // Wait for editor to be removed from DOM #106303
            setTimeout(() => {
                this.searchWidget.onHide();
                this.settingRenderers.cancelSuggesters();
            }, 0);
        }
    }
    focusSettings(focusSettingInput = false) {
        const focused = this.settingsTree.getFocus();
        if (!focused.length) {
            this.settingsTree.focusFirst();
        }
        this.settingsTree.domFocus();
        if (focusSettingInput) {
            const controlInFocusedRow = this.settingsTree.getHTMLElement().querySelector(`.focused ${AbstractSettingRenderer.CONTROL_SELECTOR}`);
            if (controlInFocusedRow) {
                controlInFocusedRow.focus();
            }
        }
    }
    focusTOC() {
        this.tocTree.domFocus();
    }
    showContextMenu() {
        const focused = this.settingsTree.getFocus()[0];
        const rowElement = this.focusedSettingDOMElement;
        if (rowElement && focused instanceof SettingsTreeSettingElement) {
            this.settingRenderers.showContextMenu(focused, rowElement);
        }
    }
    focusSearch(filter, selectAll = true) {
        if (filter && this.searchWidget) {
            this.searchWidget.setValue(filter);
        }
        // Do not select all if the user is already searching.
        this.searchWidget.focus(selectAll && !this.searchInputDelayer.isTriggered);
    }
    clearSearchResults() {
        this.searchWidget.setValue('');
        this.focusSearch();
    }
    clearSearchFilters() {
        const query = this.searchWidget.getValue();
        const splitQuery = query.split(' ').filter(word => {
            return word.length && !SettingsEditor2_1.SUGGESTIONS.some(suggestion => word.startsWith(suggestion));
        });
        this.searchWidget.setValue(splitQuery.join(' '));
    }
    updateInputAriaLabel() {
        let label = searchBoxLabel;
        if (this.searchResultLabel) {
            label += `. ${this.searchResultLabel}`;
        }
        if (this.lastSyncedLabel) {
            label += `. ${this.lastSyncedLabel}`;
        }
        this.searchWidget.updateAriaLabel(label);
    }
    /**
     * Render the header of the Settings editor, which includes the content above the splitview.
     */
    createHeader(parent) {
        this.headerContainer = DOM.append(parent, $('.settings-header'));
        const searchContainer = DOM.append(this.headerContainer, $('.search-container'));
        const clearInputAction = this._register(new Action(SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, localize('clearInput', "Clear Settings Search Input"), ThemeIcon.asClassName(preferencesClearInputIcon), false, async () => this.clearSearchResults()));
        const filterAction = this._register(new Action(SETTINGS_EDITOR_COMMAND_SUGGEST_FILTERS, localize('filterInput', "Filter Settings"), ThemeIcon.asClassName(preferencesFilterIcon)));
        this.searchWidget = this._register(this.instantiationService.createInstance(SuggestEnabledInput, `${SettingsEditor2_1.ID}.searchbox`, searchContainer, {
            triggerCharacters: ['@', ':'],
            provideResults: (query) => {
                // Based on testing, the trigger character is always at the end of the query.
                // for the ':' trigger, only return suggestions if there was a '@' before it in the same word.
                const queryParts = query.split(/\s/g);
                if (queryParts[queryParts.length - 1].startsWith(`@${LANGUAGE_SETTING_TAG}`)) {
                    const sortedLanguages = this.languageService.getRegisteredLanguageIds().map(languageId => {
                        return `@${LANGUAGE_SETTING_TAG}${languageId} `;
                    }).sort();
                    return sortedLanguages.filter(langFilter => !query.includes(langFilter));
                }
                else if (queryParts[queryParts.length - 1].startsWith(`@${EXTENSION_SETTING_TAG}`)) {
                    const installedExtensionsTags = this.installedExtensionIds.map(extensionId => {
                        return `@${EXTENSION_SETTING_TAG}${extensionId} `;
                    }).sort();
                    return installedExtensionsTags.filter(extFilter => !query.includes(extFilter));
                }
                else if (queryParts[queryParts.length - 1].startsWith('@')) {
                    return SettingsEditor2_1.SUGGESTIONS.filter(tag => !query.includes(tag)).map(tag => tag.endsWith(':') ? tag : tag + ' ');
                }
                return [];
            }
        }, searchBoxLabel, 'settingseditor:searchinput' + SettingsEditor2_1.NUM_INSTANCES++, {
            placeholderText: searchBoxLabel,
            focusContextKey: this.searchFocusContextKey,
            styleOverrides: {
                inputBorder: settingsTextInputBorder
            }
            // TODO: Aria-live
        }));
        this._register(this.searchWidget.onDidFocus(() => {
            this._currentFocusContext = 0 /* SettingsFocusContext.Search */;
        }));
        this.countElement = DOM.append(searchContainer, DOM.$('.settings-count-widget.monaco-count-badge.long'));
        this.countElement.style.backgroundColor = asCssVariable(badgeBackground);
        this.countElement.style.color = asCssVariable(badgeForeground);
        this.countElement.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        this._register(this.searchWidget.onInputDidChange(() => {
            const searchVal = this.searchWidget.getValue();
            clearInputAction.enabled = !!searchVal;
            this.searchInputDelayer.trigger(() => this.onSearchInputChanged());
        }));
        const headerControlsContainer = DOM.append(this.headerContainer, $('.settings-header-controls'));
        headerControlsContainer.style.borderColor = asCssVariable(settingsHeaderBorder);
        const targetWidgetContainer = DOM.append(headerControlsContainer, $('.settings-target-container'));
        this.settingsTargetsWidget = this._register(this.instantiationService.createInstance(SettingsTargetsWidget, targetWidgetContainer, { enableRemoteSettings: true }));
        this.settingsTargetsWidget.settingsTarget = 3 /* ConfigurationTarget.USER_LOCAL */;
        this._register(this.settingsTargetsWidget.onDidTargetChange(target => this.onDidSettingsTargetChange(target)));
        this._register(DOM.addDisposableListener(targetWidgetContainer, DOM.EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 18 /* KeyCode.DownArrow */) {
                this.focusSettings();
            }
        }));
        if (this.userDataSyncWorkbenchService.enabled && this.userDataSyncEnablementService.canToggleEnablement()) {
            const syncControls = this._register(this.instantiationService.createInstance(SyncControls, this.window, headerControlsContainer));
            this._register(syncControls.onDidChangeLastSyncedLabel(lastSyncedLabel => {
                this.lastSyncedLabel = lastSyncedLabel;
                this.updateInputAriaLabel();
            }));
        }
        this.controlsElement = DOM.append(searchContainer, DOM.$('.settings-clear-widget'));
        const actionBar = this._register(new ActionBar(this.controlsElement, {
            actionViewItemProvider: (action, options) => {
                if (action.id === filterAction.id) {
                    return this.instantiationService.createInstance(SettingsSearchFilterDropdownMenuActionViewItem, action, options, this.actionRunner, this.searchWidget);
                }
                return undefined;
            }
        }));
        actionBar.push([clearInputAction, filterAction], { label: false, icon: true });
    }
    onDidSettingsTargetChange(target) {
        this.viewState.settingsTarget = target;
        // TODO Instead of rebuilding the whole model, refresh and uncache the inspected setting value
        this.onConfigUpdate(undefined, true);
    }
    onDidDismissExtensionSetting(extensionId) {
        if (!this.dismissedExtensionSettings.includes(extensionId)) {
            this.dismissedExtensionSettings.push(extensionId);
        }
        this.storageService.store(this.DISMISSED_EXTENSION_SETTINGS_STORAGE_KEY, this.dismissedExtensionSettings.join(this.DISMISSED_EXTENSION_SETTINGS_DELIMITER), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.onConfigUpdate(undefined, true);
    }
    onDidClickSetting(evt, recursed) {
        const targetElement = this.currentSettingsModel?.getElementsByName(evt.targetKey)?.[0];
        let revealFailed = false;
        if (targetElement) {
            let sourceTop = 0.5;
            try {
                const _sourceTop = this.settingsTree.getRelativeTop(evt.source);
                if (_sourceTop !== null) {
                    sourceTop = _sourceTop;
                }
            }
            catch {
                // e.g. clicked a searched element, now the search has been cleared
            }
            // If we search for something and focus on a category, the settings tree
            // only renders settings in that category.
            // If the target display category is different than the source's, unfocus the category
            // so that we can render all found settings again.
            // Then, the reveal call will correctly find the target setting.
            if (this.viewState.filterToCategory && evt.source.displayCategory !== targetElement.displayCategory) {
                this.tocTree.setFocus([]);
            }
            try {
                this.settingsTree.reveal(targetElement, sourceTop);
            }
            catch (_) {
                // The listwidget couldn't find the setting to reveal,
                // even though it's in the model, meaning there might be a filter
                // preventing it from showing up.
                revealFailed = true;
            }
            if (!revealFailed) {
                // We need to shift focus from the setting that contains the link to the setting that's
                // linked. Clicking on the link sets focus on the setting that contains the link,
                // which is why we need the setTimeout.
                setTimeout(() => {
                    this.settingsTree.setFocus([targetElement]);
                }, 50);
                const domElements = this.settingRenderers.getDOMElementsForSettingKey(this.settingsTree.getHTMLElement(), evt.targetKey);
                if (domElements && domElements[0]) {
                    const control = domElements[0].querySelector(AbstractSettingRenderer.CONTROL_SELECTOR);
                    if (control) {
                        control.focus();
                    }
                }
            }
        }
        if (!recursed && (!targetElement || revealFailed)) {
            // We'll call this event handler again after clearing the search query,
            // so that more settings show up in the list.
            const p = this.triggerSearch('');
            p.then(() => {
                this.searchWidget.setValue('');
                this.onDidClickSetting(evt, true);
            });
        }
    }
    switchToSettingsFile() {
        const query = parseQuery(this.searchWidget.getValue()).query;
        return this.openSettingsFile({ query });
    }
    async openSettingsFile(options) {
        const currentSettingsTarget = this.settingsTargetsWidget.settingsTarget;
        const openOptions = { jsonEditor: true, groupId: this.group.id, ...options };
        if (currentSettingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
            if (options?.revealSetting) {
                const configurationProperties = Registry.as(Extensions.Configuration).getConfigurationProperties();
                const configurationScope = configurationProperties[options?.revealSetting.key]?.scope;
                if (configurationScope && APPLICATION_SCOPES.includes(configurationScope)) {
                    return this.preferencesService.openApplicationSettings(openOptions);
                }
            }
            return this.preferencesService.openUserSettings(openOptions);
        }
        else if (currentSettingsTarget === 4 /* ConfigurationTarget.USER_REMOTE */) {
            return this.preferencesService.openRemoteSettings(openOptions);
        }
        else if (currentSettingsTarget === 5 /* ConfigurationTarget.WORKSPACE */) {
            return this.preferencesService.openWorkspaceSettings(openOptions);
        }
        else if (URI.isUri(currentSettingsTarget)) {
            return this.preferencesService.openFolderSettings({ folderUri: currentSettingsTarget, ...openOptions });
        }
        return undefined;
    }
    createBody(parent) {
        this.bodyContainer = DOM.append(parent, $('.settings-body'));
        this.noResultsMessage = DOM.append(this.bodyContainer, $('.no-results-message'));
        this.noResultsMessage.innerText = localize('noResults', "No Settings Found");
        this.clearFilterLinkContainer = $('span.clear-search-filters');
        this.clearFilterLinkContainer.textContent = ' - ';
        const clearFilterLink = DOM.append(this.clearFilterLinkContainer, $('a.pointer.prominent', { tabindex: 0 }, localize('clearSearchFilters', 'Clear Filters')));
        this._register(DOM.addDisposableListener(clearFilterLink, DOM.EventType.CLICK, (e) => {
            DOM.EventHelper.stop(e, false);
            this.clearSearchFilters();
        }));
        DOM.append(this.noResultsMessage, this.clearFilterLinkContainer);
        this.noResultsMessage.style.color = asCssVariable(editorForeground);
        this.tocTreeContainer = $('.settings-toc-container');
        this.settingsTreeContainer = $('.settings-tree-container');
        this.createTOC(this.tocTreeContainer);
        this.createSettingsTree(this.settingsTreeContainer);
        this.splitView = this._register(new SplitView(this.bodyContainer, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            proportionalLayout: true
        }));
        const startingWidth = this.storageService.getNumber('settingsEditor2.splitViewWidth', 0 /* StorageScope.PROFILE */, SettingsEditor2_1.TOC_RESET_WIDTH);
        this.splitView.addView({
            onDidChange: Event.None,
            element: this.tocTreeContainer,
            minimumSize: SettingsEditor2_1.TOC_MIN_WIDTH,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                this.tocTreeContainer.style.width = `${width}px`;
                this.tocTree.layout(height, width);
            }
        }, startingWidth, undefined, true);
        this.splitView.addView({
            onDidChange: Event.None,
            element: this.settingsTreeContainer,
            minimumSize: SettingsEditor2_1.EDITOR_MIN_WIDTH,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                this.settingsTreeContainer.style.width = `${width}px`;
                this.settingsTree.layout(height, width);
            }
        }, Sizing.Distribute, undefined, true);
        this._register(this.splitView.onDidSashReset(() => {
            const totalSize = this.splitView.getViewSize(0) + this.splitView.getViewSize(1);
            this.splitView.resizeView(0, SettingsEditor2_1.TOC_RESET_WIDTH);
            this.splitView.resizeView(1, totalSize - SettingsEditor2_1.TOC_RESET_WIDTH);
        }));
        this._register(this.splitView.onDidSashChange(() => {
            const width = this.splitView.getViewSize(0);
            this.storageService.store('settingsEditor2.splitViewWidth', width, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }));
        const borderColor = this.theme.getColor(settingsSashBorder);
        this.splitView.style({ separatorBorder: borderColor });
    }
    addCtrlAInterceptor(container) {
        this._register(DOM.addStandardDisposableListener(container, DOM.EventType.KEY_DOWN, (e) => {
            if (e.keyCode === 31 /* KeyCode.KeyA */ &&
                (platform.isMacintosh ? e.metaKey : e.ctrlKey) &&
                !DOM.isEditableElement(e.target)) {
                // Avoid browser ctrl+a
                e.browserEvent.stopPropagation();
                e.browserEvent.preventDefault();
            }
        }));
    }
    createTOC(container) {
        this.tocTreeModel = this.instantiationService.createInstance(TOCTreeModel, this.viewState);
        this.tocTree = this._register(this.instantiationService.createInstance(TOCTree, DOM.append(container, $('.settings-toc-wrapper', {
            'role': 'navigation',
            'aria-label': localize('settings', "Settings"),
        })), this.viewState));
        this.tocTreeDisposed = false;
        this._register(this.tocTree.onDidFocus(() => {
            this._currentFocusContext = 1 /* SettingsFocusContext.TableOfContents */;
        }));
        this._register(this.tocTree.onDidChangeFocus(e => {
            const element = e.elements?.[0] ?? null;
            if (this.tocFocusedElement === element) {
                return;
            }
            this.tocFocusedElement = element;
            this.tocTree.setSelection(element ? [element] : []);
            if (this.searchResultModel) {
                if (this.viewState.filterToCategory !== element) {
                    this.viewState.filterToCategory = element ?? undefined;
                    // Force render in this case, because
                    // onDidClickSetting relies on the updated view.
                    this.renderTree(undefined, true);
                    this.settingsTree.scrollTop = 0;
                }
            }
            else if (element && (!e.browserEvent || !e.browserEvent.fromScroll)) {
                this.settingsTree.reveal(element, 0);
                this.settingsTree.setFocus([element]);
            }
        }));
        this._register(this.tocTree.onDidFocus(() => {
            this.tocRowFocused.set(true);
        }));
        this._register(this.tocTree.onDidBlur(() => {
            this.tocRowFocused.set(false);
        }));
        this._register(this.tocTree.onDidDispose(() => {
            this.tocTreeDisposed = true;
        }));
    }
    applyFilter(filter) {
        if (this.searchWidget && !this.searchWidget.getValue().includes(filter)) {
            // Prepend the filter to the query.
            const newQuery = `${filter} ${this.searchWidget.getValue().trimStart()}`;
            this.focusSearch(newQuery, false);
        }
    }
    removeLanguageFilters() {
        if (this.searchWidget && this.searchWidget.getValue().includes(`@${LANGUAGE_SETTING_TAG}`)) {
            const query = this.searchWidget.getValue().split(' ');
            const newQuery = query.filter(word => !word.startsWith(`@${LANGUAGE_SETTING_TAG}`)).join(' ');
            this.focusSearch(newQuery, false);
        }
    }
    createSettingsTree(container) {
        this.settingRenderers = this._register(this.instantiationService.createInstance(SettingTreeRenderers));
        this._register(this.settingRenderers.onDidChangeSetting(e => this.onDidChangeSetting(e.key, e.value, e.type, e.manualReset, e.scope)));
        this._register(this.settingRenderers.onDidDismissExtensionSetting((e) => this.onDidDismissExtensionSetting(e)));
        this._register(this.settingRenderers.onDidOpenSettings(settingKey => {
            this.openSettingsFile({ revealSetting: { key: settingKey, edit: true } });
        }));
        this._register(this.settingRenderers.onDidClickSettingLink(settingName => this.onDidClickSetting(settingName)));
        this._register(this.settingRenderers.onDidFocusSetting(element => {
            this.settingsTree.setFocus([element]);
            this._currentFocusContext = 3 /* SettingsFocusContext.SettingControl */;
            this.settingRowFocused.set(false);
        }));
        this._register(this.settingRenderers.onDidChangeSettingHeight((params) => {
            const { element, height } = params;
            try {
                this.settingsTree.updateElementHeight(element, height);
            }
            catch (e) {
                // the element was not found
            }
        }));
        this._register(this.settingRenderers.onApplyFilter((filter) => this.applyFilter(filter)));
        this._register(this.settingRenderers.onDidClickOverrideElement((element) => {
            this.removeLanguageFilters();
            if (element.language) {
                this.applyFilter(`@${LANGUAGE_SETTING_TAG}${element.language}`);
            }
            if (element.scope === 'workspace') {
                this.settingsTargetsWidget.updateTarget(5 /* ConfigurationTarget.WORKSPACE */);
            }
            else if (element.scope === 'user') {
                this.settingsTargetsWidget.updateTarget(3 /* ConfigurationTarget.USER_LOCAL */);
            }
            else if (element.scope === 'remote') {
                this.settingsTargetsWidget.updateTarget(4 /* ConfigurationTarget.USER_REMOTE */);
            }
            this.applyFilter(`@${ID_SETTING_TAG}${element.settingKey}`);
        }));
        this.settingsTree = this._register(this.instantiationService.createInstance(SettingsTree, container, this.viewState, this.settingRenderers.allRenderers));
        this._register(this.settingsTree.onDidScroll(() => {
            if (this.settingsTree.scrollTop === this.settingsTreeScrollTop) {
                return;
            }
            this.settingsTreeScrollTop = this.settingsTree.scrollTop;
            // setTimeout because calling setChildren on the settingsTree can trigger onDidScroll, so it fires when
            // setChildren has called on the settings tree but not the toc tree yet, so their rendered elements are out of sync
            setTimeout(() => {
                this.updateTreeScrollSync();
            }, 0);
        }));
        this._register(this.settingsTree.onDidFocus(() => {
            const classList = container.ownerDocument.activeElement?.classList;
            if (classList && classList.contains('monaco-list') && classList.contains('settings-editor-tree')) {
                this._currentFocusContext = 2 /* SettingsFocusContext.SettingTree */;
                this.settingRowFocused.set(true);
                this.treeFocusedElement ??= this.settingsTree.firstVisibleElement ?? null;
                if (this.treeFocusedElement) {
                    this.treeFocusedElement.tabbable = true;
                }
            }
        }));
        this._register(this.settingsTree.onDidBlur(() => {
            this.settingRowFocused.set(false);
            // Clear out the focused element, otherwise it could be
            // out of date during the next onDidFocus event.
            this.treeFocusedElement = null;
        }));
        // There is no different select state in the settings tree
        this._register(this.settingsTree.onDidChangeFocus(e => {
            const element = e.elements[0];
            if (this.treeFocusedElement === element) {
                return;
            }
            if (this.treeFocusedElement) {
                this.treeFocusedElement.tabbable = false;
            }
            this.treeFocusedElement = element;
            if (this.treeFocusedElement) {
                this.treeFocusedElement.tabbable = true;
            }
            this.settingsTree.setSelection(element ? [element] : []);
        }));
    }
    onDidChangeSetting(key, value, type, manualReset, scope) {
        const parsedQuery = parseQuery(this.searchWidget.getValue());
        const languageFilter = parsedQuery.languageFilter;
        if (manualReset || (this.pendingSettingUpdate && this.pendingSettingUpdate.key !== key)) {
            this.updateChangedSetting(key, value, manualReset, languageFilter, scope);
        }
        this.pendingSettingUpdate = { key, value, languageFilter };
        if (SettingsEditor2_1.shouldSettingUpdateFast(type)) {
            this.settingFastUpdateDelayer.trigger(() => this.updateChangedSetting(key, value, manualReset, languageFilter, scope));
        }
        else {
            this.settingSlowUpdateDelayer.trigger(() => this.updateChangedSetting(key, value, manualReset, languageFilter, scope));
        }
    }
    updateTreeScrollSync() {
        this.settingRenderers.cancelSuggesters();
        if (this.searchResultModel) {
            return;
        }
        if (!this.tocTreeModel) {
            return;
        }
        const elementToSync = this.settingsTree.firstVisibleElement;
        const element = elementToSync instanceof SettingsTreeSettingElement ? elementToSync.parent :
            elementToSync instanceof SettingsTreeGroupElement ? elementToSync :
                null;
        // It's possible for this to be called when the TOC and settings tree are out of sync - e.g. when the settings tree has deferred a refresh because
        // it is focused. So, bail if element doesn't exist in the TOC.
        let nodeExists = true;
        try {
            this.tocTree.getNode(element);
        }
        catch (e) {
            nodeExists = false;
        }
        if (!nodeExists) {
            return;
        }
        if (element && this.tocTree.getSelection()[0] !== element) {
            const ancestors = this.getAncestors(element);
            ancestors.forEach(e => this.tocTree.expand(e));
            this.tocTree.reveal(element);
            const elementTop = this.tocTree.getRelativeTop(element);
            if (typeof elementTop !== 'number') {
                return;
            }
            this.tocTree.collapseAll();
            ancestors.forEach(e => this.tocTree.expand(e));
            if (elementTop < 0 || elementTop > 1) {
                this.tocTree.reveal(element);
            }
            else {
                this.tocTree.reveal(element, elementTop);
            }
            this.tocTree.expand(element);
            this.tocTree.setSelection([element]);
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            fakeKeyboardEvent.fromScroll = true;
            this.tocTree.setFocus([element], fakeKeyboardEvent);
        }
    }
    getAncestors(element) {
        const ancestors = [];
        while (element.parent) {
            if (element.parent.id !== 'root') {
                ancestors.push(element.parent);
            }
            element = element.parent;
        }
        return ancestors.reverse();
    }
    updateChangedSetting(key, value, manualReset, languageFilter, scope) {
        // ConfigurationService displays the error if this fails.
        // Force a render afterwards because onDidConfigurationUpdate doesn't fire if the update doesn't result in an effective setting value change.
        const settingsTarget = this.settingsTargetsWidget.settingsTarget;
        const resource = URI.isUri(settingsTarget) ? settingsTarget : undefined;
        const configurationTarget = (resource ? 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ : settingsTarget) ?? 3 /* ConfigurationTarget.USER_LOCAL */;
        const overrides = { resource, overrideIdentifiers: languageFilter ? [languageFilter] : undefined };
        const configurationTargetIsWorkspace = configurationTarget === 5 /* ConfigurationTarget.WORKSPACE */ || configurationTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
        const userPassedInManualReset = configurationTargetIsWorkspace || !!languageFilter;
        const isManualReset = userPassedInManualReset ? manualReset : value === undefined;
        // If the user is changing the value back to the default, and we're not targeting a workspace scope, do a 'reset' instead
        const inspected = this.configurationService.inspect(key, overrides);
        if (!userPassedInManualReset && inspected.defaultValue === value) {
            value = undefined;
        }
        return this.configurationService.updateValue(key, value, overrides, configurationTarget, { handleDirtyFile: 'save' })
            .then(() => {
            const query = this.searchWidget.getValue();
            if (query.includes(`@${MODIFIED_SETTING_TAG}`)) {
                // The user might have reset a setting.
                this.refreshTOCTree();
            }
            this.renderTree(key, isManualReset);
            this.pendingSettingUpdate = null;
            const reportModifiedProps = {
                key,
                query,
                searchResults: this.searchResultModel?.getUniqueResults() ?? null,
                rawResults: this.searchResultModel?.getRawResults() ?? null,
                showConfiguredOnly: !!this.viewState.tagFilters && this.viewState.tagFilters.has(MODIFIED_SETTING_TAG),
                isReset: typeof value === 'undefined',
                settingsTarget: this.settingsTargetsWidget.settingsTarget
            };
            return this.reportModifiedSetting(reportModifiedProps);
        });
    }
    reportModifiedSetting(props) {
        let groupId = undefined;
        let nlpIndex = undefined;
        let displayIndex = undefined;
        if (props.searchResults) {
            displayIndex = props.searchResults.filterMatches.findIndex(m => m.setting.key === props.key);
            if (this.searchResultModel) {
                const rawResults = this.searchResultModel.getRawResults();
                if (rawResults[0 /* SearchResultIdx.Local */] && displayIndex >= 0) {
                    const settingInLocalResults = rawResults[0 /* SearchResultIdx.Local */].filterMatches.some(m => m.setting.key === props.key);
                    groupId = settingInLocalResults ? 'local' : 'remote';
                }
                if (rawResults[1 /* SearchResultIdx.Remote */]) {
                    const _nlpIndex = rawResults[1 /* SearchResultIdx.Remote */].filterMatches.findIndex(m => m.setting.key === props.key);
                    nlpIndex = _nlpIndex >= 0 ? _nlpIndex : undefined;
                }
            }
        }
        const reportedTarget = props.settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */ ? 'user' :
            props.settingsTarget === 4 /* ConfigurationTarget.USER_REMOTE */ ? 'user_remote' :
                props.settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */ ? 'workspace' :
                    'folder';
        const data = {
            key: props.key,
            groupId,
            nlpIndex,
            displayIndex,
            showConfiguredOnly: props.showConfiguredOnly,
            isReset: props.isReset,
            target: reportedTarget
        };
        this.telemetryService.publicLog2('settingsEditor.settingModified', data);
    }
    scheduleRefresh(element, key = '') {
        if (key && this.scheduledRefreshes.has(key)) {
            return;
        }
        if (!key) {
            dispose(this.scheduledRefreshes.values());
            this.scheduledRefreshes.clear();
        }
        const store = new DisposableStore();
        const scheduledRefreshTracker = DOM.trackFocus(element);
        store.add(scheduledRefreshTracker);
        store.add(scheduledRefreshTracker.onDidBlur(() => {
            this.scheduledRefreshes.get(key)?.dispose();
            this.scheduledRefreshes.delete(key);
            this.onConfigUpdate(new Set([key]));
        }));
        this.scheduledRefreshes.set(key, store);
    }
    createSettingsOrderByTocIndex(resolvedSettingsRoot) {
        const index = new Map();
        function indexSettings(resolvedSettingsRoot, counter = 0) {
            if (resolvedSettingsRoot.settings) {
                for (const setting of resolvedSettingsRoot.settings) {
                    if (!index.has(setting.key)) {
                        index.set(setting.key, counter++);
                    }
                }
            }
            if (resolvedSettingsRoot.children) {
                for (const child of resolvedSettingsRoot.children) {
                    counter = indexSettings(child, counter);
                }
            }
            return counter;
        }
        indexSettings(resolvedSettingsRoot);
        return index;
    }
    refreshModels(resolvedSettingsRoot) {
        // Both calls to refreshModels require a valid settingsTreeModel.
        this.settingsTreeModel.value.update(resolvedSettingsRoot);
        this.tocTreeModel.settingsTreeRoot = this.settingsTreeModel.value.root;
        this.settingsOrderByTocIndex = this.createSettingsOrderByTocIndex(resolvedSettingsRoot);
    }
    async onConfigUpdate(keys, forceRefresh = false, schemaChange = false) {
        if (keys && this.settingsTreeModel) {
            return this.updateElementsByKey(keys);
        }
        if (!this.defaultSettingsEditorModel) {
            return;
        }
        const groups = this.defaultSettingsEditorModel.settingsGroups.slice(1); // Without commonlyUsed
        const coreSettings = groups.filter(g => !g.extensionInfo);
        const settingsResult = resolveSettingsTree(tocData, coreSettings, this.logService);
        const resolvedSettingsRoot = settingsResult.tree;
        // Warn for settings not included in layout
        if (settingsResult.leftoverSettings.size && !this.hasWarnedMissingSettings) {
            const settingKeyList = [];
            settingsResult.leftoverSettings.forEach(s => {
                settingKeyList.push(s.key);
            });
            this.logService.warn(`SettingsEditor2: Settings not included in settingsLayout.ts: ${settingKeyList.join(', ')}`);
            this.hasWarnedMissingSettings = true;
        }
        const additionalGroups = [];
        let setAdditionalGroups = false;
        const toggleData = await getExperimentalExtensionToggleData(this.extensionGalleryService, this.productService);
        if (toggleData && groups.filter(g => g.extensionInfo).length) {
            for (const key in toggleData.settingsEditorRecommendedExtensions) {
                const extension = toggleData.recommendedExtensionsGalleryInfo[key];
                if (!extension) {
                    continue;
                }
                const extensionId = extension.identifier.id;
                // prevent race between extension update handler and this (onConfigUpdate) handler
                await this.refreshInstalledExtensionsList();
                const extensionInstalled = this.installedExtensionIds.includes(extensionId);
                // Drill down to see whether the group and setting already exist
                // and need to be removed.
                const matchingGroupIndex = groups.findIndex(g => g.extensionInfo && g.extensionInfo.id.toLowerCase() === extensionId.toLowerCase() &&
                    g.sections.length === 1 && g.sections[0].settings.length === 1 && g.sections[0].settings[0].displayExtensionId);
                if (extensionInstalled || this.dismissedExtensionSettings.includes(extensionId)) {
                    if (matchingGroupIndex !== -1) {
                        groups.splice(matchingGroupIndex, 1);
                        setAdditionalGroups = true;
                    }
                    continue;
                }
                if (matchingGroupIndex !== -1) {
                    continue;
                }
                // Create the entry. extensionInstalled is false in this case.
                let manifest = null;
                try {
                    manifest = await raceTimeout(this.extensionGalleryService.getManifest(extension, CancellationToken.None), EXTENSION_FETCH_TIMEOUT_MS) ?? null;
                }
                catch (e) {
                    // Likely a networking issue.
                    // Skip adding a button for this extension to the Settings editor.
                    continue;
                }
                if (manifest === null) {
                    continue;
                }
                const contributesConfiguration = manifest?.contributes?.configuration;
                let groupTitle;
                if (!Array.isArray(contributesConfiguration)) {
                    groupTitle = contributesConfiguration?.title;
                }
                else if (contributesConfiguration.length === 1) {
                    groupTitle = contributesConfiguration[0].title;
                }
                const recommendationInfo = toggleData.settingsEditorRecommendedExtensions[key];
                const extensionName = extension.displayName ?? extension.name ?? extensionId;
                const settingKey = `${key}.manageExtension`;
                const setting = {
                    range: nullRange,
                    key: settingKey,
                    keyRange: nullRange,
                    value: null,
                    valueRange: nullRange,
                    description: [recommendationInfo.onSettingsEditorOpen?.descriptionOverride ?? extension.description],
                    descriptionIsMarkdown: false,
                    descriptionRanges: [],
                    scope: 4 /* ConfigurationScope.WINDOW */,
                    type: 'null',
                    displayExtensionId: extensionId,
                    extensionGroupTitle: groupTitle ?? extensionName,
                    categoryLabel: 'Extensions',
                    title: extensionName
                };
                const additionalGroup = {
                    sections: [{
                            settings: [setting],
                        }],
                    id: extensionId,
                    title: setting.extensionGroupTitle,
                    titleRange: nullRange,
                    range: nullRange,
                    extensionInfo: {
                        id: extensionId,
                        displayName: extension.displayName,
                    }
                };
                groups.push(additionalGroup);
                additionalGroups.push(additionalGroup);
                setAdditionalGroups = true;
            }
        }
        resolvedSettingsRoot.children.push(await createTocTreeForExtensionSettings(this.extensionService, groups.filter(g => g.extensionInfo)));
        const commonlyUsedDataToUse = getCommonlyUsedData(toggleData);
        const commonlyUsed = resolveSettingsTree(commonlyUsedDataToUse, groups, this.logService);
        resolvedSettingsRoot.children.unshift(commonlyUsed.tree);
        if (toggleData && setAdditionalGroups) {
            // Add the additional groups to the model to help with searching.
            this.defaultSettingsEditorModel.setAdditionalGroups(additionalGroups);
        }
        if (!this.workspaceTrustManagementService.isWorkspaceTrusted() && (this.viewState.settingsTarget instanceof URI || this.viewState.settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */)) {
            const configuredUntrustedWorkspaceSettings = resolveConfiguredUntrustedSettings(groups, this.viewState.settingsTarget, this.viewState.languageFilter, this.configurationService);
            if (configuredUntrustedWorkspaceSettings.length) {
                resolvedSettingsRoot.children.unshift({
                    id: 'workspaceTrust',
                    label: localize('settings require trust', "Workspace Trust"),
                    settings: configuredUntrustedWorkspaceSettings
                });
            }
        }
        this.searchResultModel?.updateChildren();
        if (this.settingsTreeModel.value) {
            this.refreshModels(resolvedSettingsRoot);
            if (schemaChange && this.searchResultModel) {
                // If an extension's settings were just loaded and a search is active, retrigger the search so it shows up
                return await this.onSearchInputChanged();
            }
            this.refreshTOCTree();
            this.renderTree(undefined, forceRefresh);
        }
        else {
            this.settingsTreeModel.value = this.instantiationService.createInstance(SettingsTreeModel, this.viewState, this.workspaceTrustManagementService.isWorkspaceTrusted());
            this.refreshModels(resolvedSettingsRoot);
            // Don't restore the cached state if we already have a query value from calling _setOptions().
            const cachedState = !this.viewState.query ? this.restoreCachedState() : undefined;
            if (cachedState?.searchQuery || this.searchWidget.getValue()) {
                await this.onSearchInputChanged();
            }
            else {
                this.refreshTOCTree();
                this.refreshTree();
                this.tocTree.collapseAll();
            }
        }
    }
    updateElementsByKey(keys) {
        if (keys.size) {
            if (this.searchResultModel) {
                keys.forEach(key => this.searchResultModel.updateElementsByName(key));
            }
            if (this.settingsTreeModel.value) {
                keys.forEach(key => this.settingsTreeModel.value.updateElementsByName(key));
            }
            keys.forEach(key => this.renderTree(key));
        }
        else {
            this.renderTree();
        }
    }
    getActiveControlInSettingsTree() {
        const element = this.settingsTree.getHTMLElement();
        const activeElement = element.ownerDocument.activeElement;
        return (activeElement && DOM.isAncestorOfActiveElement(element)) ?
            activeElement :
            null;
    }
    renderTree(key, force = false) {
        if (!force && key && this.scheduledRefreshes.has(key)) {
            this.updateModifiedLabelForKey(key);
            return;
        }
        // If the context view is focused, delay rendering settings
        if (this.contextViewFocused()) {
            const element = this.window.document.querySelector('.context-view');
            if (element) {
                this.scheduleRefresh(element, key);
            }
            return;
        }
        // If a setting control is currently focused, schedule a refresh for later
        const activeElement = this.getActiveControlInSettingsTree();
        const focusedSetting = activeElement && this.settingRenderers.getSettingDOMElementForDOMElement(activeElement);
        if (focusedSetting && !force) {
            // If a single setting is being refreshed, it's ok to refresh now if that is not the focused setting
            if (key) {
                const focusedKey = focusedSetting.getAttribute(AbstractSettingRenderer.SETTING_KEY_ATTR);
                if (focusedKey === key &&
                    // update `list`s live, as they have a separate "submit edit" step built in before this
                    (focusedSetting.parentElement && !focusedSetting.parentElement.classList.contains('setting-item-list'))) {
                    this.updateModifiedLabelForKey(key);
                    this.scheduleRefresh(focusedSetting, key);
                    return;
                }
            }
            else {
                this.scheduleRefresh(focusedSetting);
                return;
            }
        }
        this.renderResultCountMessages();
        if (key) {
            const elements = this.currentSettingsModel?.getElementsByName(key);
            if (elements?.length) {
                if (elements.length >= 2) {
                    console.warn('More than one setting with key ' + key + ' found');
                }
                this.refreshSingleElement(elements[0]);
            }
            else {
                // Refresh requested for a key that we don't know about
                return;
            }
        }
        else {
            this.refreshTree();
        }
        return;
    }
    contextViewFocused() {
        return !!DOM.findParentWithClass(this.rootElement.ownerDocument.activeElement, 'context-view');
    }
    refreshSingleElement(element) {
        if (this.isVisible()) {
            if (!element.setting.deprecationMessage || element.isConfigured) {
                this.settingsTree.rerender(element);
            }
        }
    }
    refreshTree() {
        if (this.isVisible() && this.currentSettingsModel) {
            this.settingsTree.setChildren(null, createGroupIterator(this.currentSettingsModel.root));
        }
    }
    refreshTOCTree() {
        if (this.isVisible()) {
            this.tocTreeModel.update();
            this.tocTree.setChildren(null, createTOCIterator(this.tocTreeModel, this.tocTree));
        }
    }
    updateModifiedLabelForKey(key) {
        if (!this.currentSettingsModel) {
            return;
        }
        const dataElements = this.currentSettingsModel.getElementsByName(key);
        const isModified = dataElements && dataElements[0] && dataElements[0].isConfigured; // all elements are either configured or not
        const elements = this.settingRenderers.getDOMElementsForSettingKey(this.settingsTree.getHTMLElement(), key);
        if (elements && elements[0]) {
            elements[0].classList.toggle('is-configured', !!isModified);
        }
    }
    async onSearchInputChanged() {
        if (!this.currentSettingsModel) {
            // Initializing search widget value
            return;
        }
        const query = this.searchWidget.getValue().trim();
        this.viewState.query = query;
        await this.triggerSearch(query.replace(/\u203A/g, ' '));
    }
    parseSettingFromJSON(query) {
        const match = query.match(/"([a-zA-Z.]+)": /);
        return match && match[1];
    }
    /**
     * Toggles the visibility of the Settings editor table of contents during a search
     * depending on the behavior.
     */
    toggleTocBySearchBehaviorType() {
        const tocBehavior = this.configurationService.getValue(SEARCH_TOC_BEHAVIOR_KEY);
        const hideToc = tocBehavior === 'hide';
        if (hideToc) {
            this.splitView.setViewVisible(0, false);
            this.splitView.style({
                separatorBorder: Color.transparent
            });
        }
        else {
            this.layoutSplitView(this.dimension);
        }
    }
    async triggerSearch(query) {
        const progressRunner = this.editorProgressService.show(true, 800);
        this.viewState.tagFilters = new Set();
        this.viewState.extensionFilters = new Set();
        this.viewState.featureFilters = new Set();
        this.viewState.idFilters = new Set();
        this.viewState.languageFilter = undefined;
        if (query) {
            const parsedQuery = parseQuery(query);
            query = parsedQuery.query;
            parsedQuery.tags.forEach(tag => this.viewState.tagFilters.add(tag));
            parsedQuery.extensionFilters.forEach(extensionId => this.viewState.extensionFilters.add(extensionId));
            parsedQuery.featureFilters.forEach(feature => this.viewState.featureFilters.add(feature));
            parsedQuery.idFilters.forEach(id => this.viewState.idFilters.add(id));
            this.viewState.languageFilter = parsedQuery.languageFilter;
        }
        this.settingsTargetsWidget.updateLanguageFilterIndicators(this.viewState.languageFilter);
        if (query && query !== '@') {
            query = this.parseSettingFromJSON(query) || query;
            await this.triggerFilterPreferences(query);
            this.toggleTocBySearchBehaviorType();
        }
        else {
            if (this.viewState.tagFilters.size || this.viewState.extensionFilters.size || this.viewState.featureFilters.size || this.viewState.idFilters.size || this.viewState.languageFilter) {
                this.searchResultModel = this.createFilterModel();
            }
            else {
                this.searchResultModel = null;
            }
            this.searchDelayer.cancel();
            if (this.searchInProgress) {
                this.searchInProgress.dispose(true);
                this.searchInProgress = null;
            }
            this.tocTree.setFocus([]);
            this.viewState.filterToCategory = undefined;
            this.tocTreeModel.currentSearchModel = this.searchResultModel;
            if (this.searchResultModel) {
                // Added a filter model
                this.tocTree.setSelection([]);
                this.tocTree.expandAll();
                this.refreshTOCTree();
                this.renderResultCountMessages();
                this.refreshTree();
                this.toggleTocBySearchBehaviorType();
            }
            else if (!this.tocTreeDisposed) {
                // Leaving search mode
                this.tocTree.collapseAll();
                this.refreshTOCTree();
                this.renderResultCountMessages();
                this.refreshTree();
                this.layoutSplitView(this.dimension);
            }
        }
        progressRunner.done();
    }
    /**
     * Return a fake SearchResultModel which can hold a flat list of all settings, to be filtered (@modified etc)
     */
    createFilterModel() {
        const filterModel = this.instantiationService.createInstance(SearchResultModel, this.viewState, this.settingsOrderByTocIndex, this.workspaceTrustManagementService.isWorkspaceTrusted());
        const fullResult = {
            filterMatches: [],
            exactMatch: false,
        };
        for (const g of this.defaultSettingsEditorModel.settingsGroups.slice(1)) {
            for (const sect of g.sections) {
                for (const setting of sect.settings) {
                    fullResult.filterMatches.push({ setting, matches: [], matchType: SettingMatchType.None, keyMatchScore: 0, score: 0 });
                }
            }
        }
        filterModel.setResult(0, fullResult);
        return filterModel;
    }
    async triggerFilterPreferences(query) {
        if (this.searchInProgress) {
            this.searchInProgress.dispose(true);
            this.searchInProgress = null;
        }
        // Trigger the local search. If it didn't find an exact match, trigger the remote search.
        const searchInProgress = this.searchInProgress = new CancellationTokenSource();
        return this.searchDelayer.trigger(async () => {
            if (searchInProgress.token.isCancellationRequested) {
                return;
            }
            const localResults = await this.localFilterPreferences(query, searchInProgress.token);
            if (localResults && !localResults.exactMatch && !searchInProgress.token.isCancellationRequested) {
                await this.remoteSearchPreferences(query, searchInProgress.token);
            }
            // Update UI only after all the search results are in
            // ref https://github.com/microsoft/vscode/issues/224946
            this.onDidFinishSearch();
        });
    }
    onDidFinishSearch() {
        this.tocTreeModel.currentSearchModel = this.searchResultModel;
        this.tocTreeModel.update();
        this.tocTree.setFocus([]);
        this.viewState.filterToCategory = undefined;
        this.tocTree.expandAll();
        this.settingsTree.scrollTop = 0;
        this.refreshTOCTree();
        this.renderTree(undefined, true);
    }
    localFilterPreferences(query, token) {
        const localSearchProvider = this.preferencesSearchService.getLocalSearchProvider(query);
        return this.searchWithProvider(0 /* SearchResultIdx.Local */, localSearchProvider, token);
    }
    remoteSearchPreferences(query, token) {
        const remoteSearchProvider = this.preferencesSearchService.getRemoteSearchProvider(query);
        if (!remoteSearchProvider) {
            return Promise.resolve(null);
        }
        return this.searchWithProvider(1 /* SearchResultIdx.Remote */, remoteSearchProvider, token);
    }
    async searchWithProvider(type, searchProvider, token) {
        const result = await this._searchPreferencesModel(this.defaultSettingsEditorModel, searchProvider, token);
        if (token.isCancellationRequested) {
            // Handle cancellation like this because cancellation is lost inside the search provider due to async/await
            return null;
        }
        this.searchResultModel ??= this.instantiationService.createInstance(SearchResultModel, this.viewState, this.settingsOrderByTocIndex, this.workspaceTrustManagementService.isWorkspaceTrusted());
        this.searchResultModel.setResult(type, result);
        return result;
    }
    renderResultCountMessages() {
        if (!this.currentSettingsModel) {
            return;
        }
        this.clearFilterLinkContainer.style.display = this.viewState.tagFilters && this.viewState.tagFilters.size > 0
            ? 'initial'
            : 'none';
        if (!this.searchResultModel) {
            if (this.countElement.style.display !== 'none') {
                this.searchResultLabel = null;
                this.updateInputAriaLabel();
                this.countElement.style.display = 'none';
                this.countElement.innerText = '';
                this.layout(this.dimension);
            }
            this.rootElement.classList.remove('no-results');
            this.splitView.el.style.visibility = 'visible';
            return;
        }
        else {
            const count = this.searchResultModel.getUniqueResultsCount();
            let resultString;
            switch (count) {
                case 0:
                    resultString = localize('noResults', "No Settings Found");
                    break;
                case 1:
                    resultString = localize('oneResult', "1 Setting Found");
                    break;
                default: resultString = localize('moreThanOneResult', "{0} Settings Found", count);
            }
            this.searchResultLabel = resultString;
            this.updateInputAriaLabel();
            this.countElement.innerText = resultString;
            aria.status(resultString);
            if (this.countElement.style.display !== 'block') {
                this.countElement.style.display = 'block';
                this.layout(this.dimension);
            }
            this.rootElement.classList.toggle('no-results', count === 0);
            this.splitView.el.style.visibility = count === 0 ? 'hidden' : 'visible';
        }
    }
    async _searchPreferencesModel(model, provider, token) {
        try {
            return await provider.searchModel(model, token);
        }
        catch (err) {
            if (isCancellationError(err)) {
                return Promise.reject(err);
            }
            else {
                return null;
            }
        }
    }
    layoutSplitView(dimension) {
        if (!this.isVisible()) {
            return;
        }
        const listHeight = dimension.height - (72 + 11 + 14 /* header height + editor padding */);
        this.splitView.el.style.height = `${listHeight}px`;
        // We call layout first so the splitView has an idea of how much
        // space it has, otherwise setViewVisible results in the first panel
        // showing up at the minimum size whenever the Settings editor
        // opens for the first time.
        this.splitView.layout(this.bodyContainer.clientWidth, listHeight);
        const tocBehavior = this.configurationService.getValue(SEARCH_TOC_BEHAVIOR_KEY);
        const hideTocForSearch = tocBehavior === 'hide' && this.searchResultModel;
        if (!hideTocForSearch) {
            const firstViewWasVisible = this.splitView.isViewVisible(0);
            const firstViewVisible = this.bodyContainer.clientWidth >= SettingsEditor2_1.NARROW_TOTAL_WIDTH;
            this.splitView.setViewVisible(0, firstViewVisible);
            // If the first view is again visible, and we have enough space, immediately set the
            // editor to use the reset width rather than the cached min width
            if (!firstViewWasVisible && firstViewVisible && this.bodyContainer.clientWidth >= SettingsEditor2_1.EDITOR_MIN_WIDTH + SettingsEditor2_1.TOC_RESET_WIDTH) {
                this.splitView.resizeView(0, SettingsEditor2_1.TOC_RESET_WIDTH);
            }
            this.splitView.style({
                separatorBorder: firstViewVisible ? this.theme.getColor(settingsSashBorder) : Color.transparent
            });
        }
    }
    saveState() {
        if (this.isVisible()) {
            const searchQuery = this.searchWidget.getValue().trim();
            const target = this.settingsTargetsWidget.settingsTarget;
            if (this.input) {
                this.editorMemento.saveEditorState(this.group, this.input, { searchQuery, target });
            }
        }
        else if (this.input) {
            this.editorMemento.clearEditorState(this.input, this.group);
        }
        super.saveState();
    }
};
SettingsEditor2 = SettingsEditor2_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IWorkbenchConfigurationService),
    __param(3, ITextResourceConfigurationService),
    __param(4, IThemeService),
    __param(5, IPreferencesService),
    __param(6, IInstantiationService),
    __param(7, IPreferencesSearchService),
    __param(8, ILogService),
    __param(9, IContextKeyService),
    __param(10, IStorageService),
    __param(11, IEditorGroupsService),
    __param(12, IUserDataSyncWorkbenchService),
    __param(13, IUserDataSyncEnablementService),
    __param(14, IWorkspaceTrustManagementService),
    __param(15, IExtensionService),
    __param(16, ILanguageService),
    __param(17, IExtensionManagementService),
    __param(18, IProductService),
    __param(19, IExtensionGalleryService),
    __param(20, IEditorProgressService),
    __param(21, IUserDataProfileService)
], SettingsEditor2);
export { SettingsEditor2 };
let SyncControls = class SyncControls extends Disposable {
    constructor(window, container, commandService, userDataSyncService, userDataSyncEnablementService, telemetryService) {
        super();
        this.commandService = commandService;
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this._onDidChangeLastSyncedLabel = this._register(new Emitter());
        this.onDidChangeLastSyncedLabel = this._onDidChangeLastSyncedLabel.event;
        const headerRightControlsContainer = DOM.append(container, $('.settings-right-controls'));
        const turnOnSyncButtonContainer = DOM.append(headerRightControlsContainer, $('.turn-on-sync'));
        this.turnOnSyncButton = this._register(new Button(turnOnSyncButtonContainer, { title: true, ...defaultButtonStyles }));
        this.lastSyncedLabel = DOM.append(headerRightControlsContainer, $('.last-synced-label'));
        DOM.hide(this.lastSyncedLabel);
        this.turnOnSyncButton.enabled = true;
        this.turnOnSyncButton.label = localize('turnOnSyncButton', "Backup and Sync Settings");
        DOM.hide(this.turnOnSyncButton.element);
        this._register(this.turnOnSyncButton.onDidClick(async () => {
            await this.commandService.executeCommand('workbench.userDataSync.actions.turnOn');
        }));
        this.updateLastSyncedTime();
        this._register(this.userDataSyncService.onDidChangeLastSyncTime(() => {
            this.updateLastSyncedTime();
        }));
        const updateLastSyncedTimer = this._register(new DOM.WindowIntervalTimer());
        updateLastSyncedTimer.cancelAndSet(() => this.updateLastSyncedTime(), 60 * 1000, window);
        this.update();
        this._register(this.userDataSyncService.onDidChangeStatus(() => {
            this.update();
        }));
        this._register(this.userDataSyncEnablementService.onDidChangeEnablement(() => {
            this.update();
        }));
    }
    updateLastSyncedTime() {
        const last = this.userDataSyncService.lastSyncTime;
        let label;
        if (typeof last === 'number') {
            const d = fromNow(last, true, undefined, true);
            label = localize('lastSyncedLabel', "Last synced: {0}", d);
        }
        else {
            label = '';
        }
        this.lastSyncedLabel.textContent = label;
        this._onDidChangeLastSyncedLabel.fire(label);
    }
    update() {
        if (this.userDataSyncService.status === "uninitialized" /* SyncStatus.Uninitialized */) {
            return;
        }
        if (this.userDataSyncEnablementService.isEnabled() || this.userDataSyncService.status !== "idle" /* SyncStatus.Idle */) {
            DOM.show(this.lastSyncedLabel);
            DOM.hide(this.turnOnSyncButton.element);
        }
        else {
            DOM.hide(this.lastSyncedLabel);
            DOM.show(this.turnOnSyncButton.element);
        }
    }
};
SyncControls = __decorate([
    __param(2, ICommandService),
    __param(3, IUserDataSyncService),
    __param(4, IUserDataSyncEnablementService),
    __param(5, ITelemetryService)
], SyncControls);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NFZGl0b3IyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvc2V0dGluZ3NFZGl0b3IyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sS0FBSyxJQUFJLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFvQixpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pJLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7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