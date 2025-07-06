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
import { SimpleIconLabel } from '../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { EXPERIMENTAL_INDICATOR_DESCRIPTION, POLICY_SETTING_TAG, PREVIEW_INDICATOR_DESCRIPTION } from '../common/preferences.js';
import { IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const $ = DOM.$;
/**
 * Contains a set of the sync-ignored settings
 * to keep the sync ignored indicator and the getIndicatorsLabelAriaLabel() function in sync.
 * SettingsTreeIndicatorsLabel#updateSyncIgnored provides the source of truth.
 */
let cachedSyncIgnoredSettingsSet = new Set();
/**
 * Contains a copy of the sync-ignored settings to determine when to update
 * cachedSyncIgnoredSettingsSet.
 */
let cachedSyncIgnoredSettings = [];
/**
 * Renders the indicators next to a setting, such as "Also Modified In".
 */
let SettingsTreeIndicatorsLabel = class SettingsTreeIndicatorsLabel {
    constructor(container, configurationService, hoverService, userDataSyncEnablementService, languageService, commandService) {
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.languageService = languageService;
        this.commandService = commandService;
        /** Indicators that each have their own square container at the top-right of the setting */
        this.isolatedIndicators = [];
        this.keybindingListeners = new DisposableStore();
        this.focusedIndex = 0;
        this.defaultHoverOptions = {
            trapFocus: true,
            position: {
                hoverPosition: 2 /* HoverPosition.BELOW */,
            },
            appearance: {
                showPointer: true,
                compact: false,
            }
        };
        this.indicatorsContainerElement = DOM.append(container, $('.setting-indicators-container'));
        this.indicatorsContainerElement.style.display = 'inline';
        this.previewIndicator = this.createPreviewIndicator();
        this.isolatedIndicators = [this.previewIndicator];
        this.workspaceTrustIndicator = this.createWorkspaceTrustIndicator();
        this.scopeOverridesIndicator = this.createScopeOverridesIndicator();
        this.syncIgnoredIndicator = this.createSyncIgnoredIndicator();
        this.defaultOverrideIndicator = this.createDefaultOverrideIndicator();
        this.parenthesizedIndicators = [this.workspaceTrustIndicator, this.scopeOverridesIndicator, this.syncIgnoredIndicator, this.defaultOverrideIndicator];
    }
    addHoverDisposables(disposables, element, showHover) {
        disposables.clear();
        const scheduler = disposables.add(new RunOnceScheduler(() => {
            const hover = showHover(false);
            if (hover) {
                disposables.add(hover);
            }
        }, this.configurationService.getValue('workbench.hover.delay')));
        disposables.add(DOM.addDisposableListener(element, DOM.EventType.MOUSE_OVER, () => {
            if (!scheduler.isScheduled()) {
                scheduler.schedule();
            }
        }));
        disposables.add(DOM.addDisposableListener(element, DOM.EventType.MOUSE_LEAVE, () => {
            scheduler.cancel();
        }));
        disposables.add(DOM.addDisposableListener(element, DOM.EventType.KEY_DOWN, (e) => {
            const evt = new StandardKeyboardEvent(e);
            if (evt.equals(10 /* KeyCode.Space */) || evt.equals(3 /* KeyCode.Enter */)) {
                const hover = showHover(true);
                if (hover) {
                    disposables.add(hover);
                }
                e.preventDefault();
            }
        }));
    }
    createWorkspaceTrustIndicator() {
        const disposables = new DisposableStore();
        const workspaceTrustElement = $('span.setting-indicator.setting-item-workspace-trust');
        const workspaceTrustLabel = disposables.add(new SimpleIconLabel(workspaceTrustElement));
        workspaceTrustLabel.text = '$(shield) ' + localize('workspaceUntrustedLabel', "Requires workspace trust");
        const content = localize('trustLabel', "The setting value can only be applied in a trusted workspace.");
        const showHover = (focus) => {
            return this.hoverService.showInstantHover({
                ...this.defaultHoverOptions,
                content,
                target: workspaceTrustElement,
                actions: [{
                        label: localize('manageWorkspaceTrust', "Manage Workspace Trust"),
                        commandId: 'workbench.trust.manage',
                        run: (target) => {
                            this.commandService.executeCommand('workbench.trust.manage');
                        }
                    }],
            }, focus);
        };
        this.addHoverDisposables(disposables, workspaceTrustElement, showHover);
        return {
            element: workspaceTrustElement,
            label: workspaceTrustLabel,
            disposables
        };
    }
    createScopeOverridesIndicator() {
        const disposables = new DisposableStore();
        // Don't add .setting-indicator class here, because it gets conditionally added later.
        const otherOverridesElement = $('span.setting-item-overrides');
        const otherOverridesLabel = disposables.add(new SimpleIconLabel(otherOverridesElement));
        return {
            element: otherOverridesElement,
            label: otherOverridesLabel,
            disposables
        };
    }
    createSyncIgnoredIndicator() {
        const disposables = new DisposableStore();
        const syncIgnoredElement = $('span.setting-indicator.setting-item-ignored');
        const syncIgnoredLabel = disposables.add(new SimpleIconLabel(syncIgnoredElement));
        syncIgnoredLabel.text = localize('extensionSyncIgnoredLabel', 'Not synced');
        const syncIgnoredHoverContent = localize('syncIgnoredTitle', "This setting is ignored during sync");
        const showHover = (focus) => {
            return this.hoverService.showInstantHover({
                ...this.defaultHoverOptions,
                content: syncIgnoredHoverContent,
                target: syncIgnoredElement
            }, focus);
        };
        this.addHoverDisposables(disposables, syncIgnoredElement, showHover);
        return {
            element: syncIgnoredElement,
            label: syncIgnoredLabel,
            disposables
        };
    }
    createDefaultOverrideIndicator() {
        const disposables = new DisposableStore();
        const defaultOverrideIndicator = $('span.setting-indicator.setting-item-default-overridden');
        const defaultOverrideLabel = disposables.add(new SimpleIconLabel(defaultOverrideIndicator));
        defaultOverrideLabel.text = localize('defaultOverriddenLabel', "Default value changed");
        return {
            element: defaultOverrideIndicator,
            label: defaultOverrideLabel,
            disposables
        };
    }
    createPreviewIndicator() {
        const disposables = new DisposableStore();
        const previewIndicator = $('span.setting-indicator.setting-item-preview');
        const previewLabel = disposables.add(new SimpleIconLabel(previewIndicator));
        return {
            element: previewIndicator,
            label: previewLabel,
            disposables
        };
    }
    render() {
        this.indicatorsContainerElement.innerText = '';
        this.indicatorsContainerElement.style.display = 'none';
        const isolatedIndicatorsToShow = this.isolatedIndicators.filter(indicator => {
            return indicator.element.style.display !== 'none';
        });
        if (isolatedIndicatorsToShow.length) {
            this.indicatorsContainerElement.style.display = 'inline';
            for (let i = 0; i < isolatedIndicatorsToShow.length; i++) {
                DOM.append(this.indicatorsContainerElement, isolatedIndicatorsToShow[i].element);
            }
        }
        const parenthesizedIndicatorsToShow = this.parenthesizedIndicators.filter(indicator => {
            return indicator.element.style.display !== 'none';
        });
        if (parenthesizedIndicatorsToShow.length) {
            this.indicatorsContainerElement.style.display = 'inline';
            DOM.append(this.indicatorsContainerElement, $('span', undefined, '('));
            for (let i = 0; i < parenthesizedIndicatorsToShow.length - 1; i++) {
                DOM.append(this.indicatorsContainerElement, parenthesizedIndicatorsToShow[i].element);
                DOM.append(this.indicatorsContainerElement, $('span.comma', undefined, ' • '));
            }
            DOM.append(this.indicatorsContainerElement, parenthesizedIndicatorsToShow[parenthesizedIndicatorsToShow.length - 1].element);
            DOM.append(this.indicatorsContainerElement, $('span', undefined, ')'));
        }
        this.resetIndicatorNavigationKeyBindings([...isolatedIndicatorsToShow, ...parenthesizedIndicatorsToShow]);
    }
    resetIndicatorNavigationKeyBindings(indicators) {
        this.keybindingListeners.clear();
        this.indicatorsContainerElement.role = indicators.length >= 1 ? 'toolbar' : 'button';
        if (!indicators.length) {
            return;
        }
        const firstElement = indicators[0].focusElement ?? indicators[0].element;
        firstElement.tabIndex = 0;
        this.keybindingListeners.add(DOM.addDisposableListener(this.indicatorsContainerElement, 'keydown', (e) => {
            const ev = new StandardKeyboardEvent(e);
            let handled = true;
            if (ev.equals(14 /* KeyCode.Home */)) {
                this.focusIndicatorAt(indicators, 0);
            }
            else if (ev.equals(13 /* KeyCode.End */)) {
                this.focusIndicatorAt(indicators, indicators.length - 1);
            }
            else if (ev.equals(17 /* KeyCode.RightArrow */)) {
                const indexToFocus = (this.focusedIndex + 1) % indicators.length;
                this.focusIndicatorAt(indicators, indexToFocus);
            }
            else if (ev.equals(15 /* KeyCode.LeftArrow */)) {
                const indexToFocus = this.focusedIndex ? this.focusedIndex - 1 : indicators.length - 1;
                this.focusIndicatorAt(indicators, indexToFocus);
            }
            else {
                handled = false;
            }
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        }));
    }
    focusIndicatorAt(indicators, index) {
        if (index === this.focusedIndex) {
            return;
        }
        const indicator = indicators[index];
        const elementToFocus = indicator.focusElement ?? indicator.element;
        elementToFocus.tabIndex = 0;
        elementToFocus.focus();
        const currentlyFocusedIndicator = indicators[this.focusedIndex];
        const previousFocusedElement = currentlyFocusedIndicator.focusElement ?? currentlyFocusedIndicator.element;
        previousFocusedElement.tabIndex = -1;
        this.focusedIndex = index;
    }
    updateWorkspaceTrust(element) {
        this.workspaceTrustIndicator.element.style.display = element.isUntrusted ? 'inline' : 'none';
        this.render();
    }
    updateSyncIgnored(element, ignoredSettings) {
        this.syncIgnoredIndicator.element.style.display = this.userDataSyncEnablementService.isEnabled()
            && ignoredSettings.includes(element.setting.key) ? 'inline' : 'none';
        this.render();
        if (cachedSyncIgnoredSettings !== ignoredSettings) {
            cachedSyncIgnoredSettings = ignoredSettings;
            cachedSyncIgnoredSettingsSet = new Set(cachedSyncIgnoredSettings);
        }
    }
    updatePreviewIndicator(element) {
        const isPreviewSetting = element.tags?.has('preview');
        const isExperimentalSetting = element.tags?.has('experimental');
        this.previewIndicator.element.style.display = (isPreviewSetting || isExperimentalSetting) ? 'inline' : 'none';
        this.previewIndicator.label.text = isPreviewSetting ?
            localize('previewLabel', "Preview") :
            localize('experimentalLabel', "Experimental");
        const content = isPreviewSetting ? PREVIEW_INDICATOR_DESCRIPTION : EXPERIMENTAL_INDICATOR_DESCRIPTION;
        const showHover = (focus) => {
            return this.hoverService.showInstantHover({
                ...this.defaultHoverOptions,
                content,
                target: this.previewIndicator.element
            }, focus);
        };
        this.addHoverDisposables(this.previewIndicator.disposables, this.previewIndicator.element, showHover);
        this.render();
    }
    getInlineScopeDisplayText(completeScope) {
        const [scope, language] = completeScope.split(':');
        const localizedScope = scope === 'user' ?
            localize('user', "User") : scope === 'workspace' ?
            localize('workspace', "Workspace") : localize('remote', "Remote");
        if (language) {
            return `${this.languageService.getLanguageName(language)} > ${localizedScope}`;
        }
        return localizedScope;
    }
    dispose() {
        this.keybindingListeners.dispose();
        for (const indicator of this.isolatedIndicators) {
            indicator.disposables.dispose();
        }
        for (const indicator of this.parenthesizedIndicators) {
            indicator.disposables.dispose();
        }
    }
    updateScopeOverrides(element, onDidClickOverrideElement, onApplyFilter) {
        this.scopeOverridesIndicator.disposables.clear();
        this.scopeOverridesIndicator.element.innerText = '';
        this.scopeOverridesIndicator.element.style.display = 'none';
        this.scopeOverridesIndicator.focusElement = this.scopeOverridesIndicator.element;
        if (element.hasPolicyValue) {
            // If the setting falls under a policy, then no matter what the user sets, the policy value takes effect.
            this.scopeOverridesIndicator.element.style.display = 'inline';
            this.scopeOverridesIndicator.element.classList.add('setting-indicator');
            this.scopeOverridesIndicator.label.text = '$(briefcase) ' + localize('policyLabelText', "Managed by organization");
            const content = localize('policyDescription', "This setting is managed by your organization and its actual value cannot be changed.");
            const showHover = (focus) => {
                return this.hoverService.showInstantHover({
                    ...this.defaultHoverOptions,
                    content,
                    actions: [{
                            label: localize('policyFilterLink', "View policy settings"),
                            commandId: '_settings.action.viewPolicySettings',
                            run: (_) => {
                                onApplyFilter.fire(`@${POLICY_SETTING_TAG}`);
                            }
                        }],
                    target: this.scopeOverridesIndicator.element
                }, focus);
            };
            this.addHoverDisposables(this.scopeOverridesIndicator.disposables, this.scopeOverridesIndicator.element, showHover);
        }
        else if (element.settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */ && this.configurationService.isSettingAppliedForAllProfiles(element.setting.key)) {
            this.scopeOverridesIndicator.element.style.display = 'inline';
            this.scopeOverridesIndicator.element.classList.add('setting-indicator');
            this.scopeOverridesIndicator.label.text = localize('applicationSetting', "Applies to all profiles");
            const content = localize('applicationSettingDescription', "The setting is not specific to the current profile, and will retain its value when switching profiles.");
            const showHover = (focus) => {
                return this.hoverService.showInstantHover({
                    ...this.defaultHoverOptions,
                    content,
                    target: this.scopeOverridesIndicator.element
                }, focus);
            };
            this.addHoverDisposables(this.scopeOverridesIndicator.disposables, this.scopeOverridesIndicator.element, showHover);
        }
        else if (element.overriddenScopeList.length || element.overriddenDefaultsLanguageList.length) {
            if (element.overriddenScopeList.length === 1 && !element.overriddenDefaultsLanguageList.length) {
                // We can inline the override and show all the text in the label
                // so that users don't have to wait for the hover to load
                // just to click into the one override there is.
                this.scopeOverridesIndicator.element.style.display = 'inline';
                this.scopeOverridesIndicator.element.classList.remove('setting-indicator');
                const prefaceText = element.isConfigured ?
                    localize('alsoConfiguredIn', "Also modified in") :
                    localize('configuredIn', "Modified in");
                this.scopeOverridesIndicator.label.text = `${prefaceText} `;
                const overriddenScope = element.overriddenScopeList[0];
                const view = DOM.append(this.scopeOverridesIndicator.element, $('a.modified-scope', undefined, this.getInlineScopeDisplayText(overriddenScope)));
                view.tabIndex = -1;
                this.scopeOverridesIndicator.focusElement = view;
                const onClickOrKeydown = (e) => {
                    const [scope, language] = overriddenScope.split(':');
                    onDidClickOverrideElement.fire({
                        settingKey: element.setting.key,
                        scope: scope,
                        language
                    });
                    e.preventDefault();
                    e.stopPropagation();
                };
                this.scopeOverridesIndicator.disposables.add(DOM.addDisposableListener(view, DOM.EventType.CLICK, (e) => {
                    onClickOrKeydown(e);
                }));
                this.scopeOverridesIndicator.disposables.add(DOM.addDisposableListener(view, DOM.EventType.KEY_DOWN, (e) => {
                    const ev = new StandardKeyboardEvent(e);
                    if (ev.equals(10 /* KeyCode.Space */) || ev.equals(3 /* KeyCode.Enter */)) {
                        onClickOrKeydown(e);
                    }
                }));
            }
            else {
                this.scopeOverridesIndicator.element.style.display = 'inline';
                this.scopeOverridesIndicator.element.classList.add('setting-indicator');
                const scopeOverridesLabelText = element.isConfigured ?
                    localize('alsoConfiguredElsewhere', "Also modified elsewhere") :
                    localize('configuredElsewhere', "Modified elsewhere");
                this.scopeOverridesIndicator.label.text = scopeOverridesLabelText;
                let contentMarkdownString = '';
                if (element.overriddenScopeList.length) {
                    const prefaceText = element.isConfigured ?
                        localize('alsoModifiedInScopes', "The setting has also been modified in the following scopes:") :
                        localize('modifiedInScopes', "The setting has been modified in the following scopes:");
                    contentMarkdownString = prefaceText;
                    for (const scope of element.overriddenScopeList) {
                        const scopeDisplayText = this.getInlineScopeDisplayText(scope);
                        contentMarkdownString += `\n- [${scopeDisplayText}](${encodeURIComponent(scope)} "${getAccessibleScopeDisplayText(scope, this.languageService)}")`;
                    }
                }
                if (element.overriddenDefaultsLanguageList.length) {
                    if (contentMarkdownString) {
                        contentMarkdownString += `\n\n`;
                    }
                    const prefaceText = localize('hasDefaultOverridesForLanguages', "The following languages have default overrides:");
                    contentMarkdownString += prefaceText;
                    for (const language of element.overriddenDefaultsLanguageList) {
                        const scopeDisplayText = this.languageService.getLanguageName(language);
                        contentMarkdownString += `\n- [${scopeDisplayText}](${encodeURIComponent(`default:${language}`)} "${scopeDisplayText}")`;
                    }
                }
                const content = {
                    value: contentMarkdownString,
                    isTrusted: false,
                    supportHtml: false
                };
                this.scopeOverridesIndicator.disposables.add(this.hoverService.setupDelayedHover(this.scopeOverridesIndicator.element, () => ({
                    ...this.defaultHoverOptions,
                    content,
                    linkHandler: (url) => {
                        const [scope, language] = decodeURIComponent(url).split(':');
                        onDidClickOverrideElement.fire({
                            settingKey: element.setting.key,
                            scope: scope,
                            language
                        });
                    }
                }), { setupKeyboardEvents: true }));
            }
        }
        this.render();
    }
    updateDefaultOverrideIndicator(element) {
        this.defaultOverrideIndicator.element.style.display = 'none';
        let sourceToDisplay = getDefaultValueSourceToDisplay(element);
        if (sourceToDisplay !== undefined) {
            this.defaultOverrideIndicator.element.style.display = 'inline';
            this.defaultOverrideIndicator.disposables.clear();
            // Show source of default value when hovered
            if (Array.isArray(sourceToDisplay) && sourceToDisplay.length === 1) {
                sourceToDisplay = sourceToDisplay[0];
            }
            let defaultOverrideHoverContent;
            if (!Array.isArray(sourceToDisplay)) {
                defaultOverrideHoverContent = localize('defaultOverriddenDetails', "Default setting value overridden by `{0}`", sourceToDisplay);
            }
            else {
                sourceToDisplay = sourceToDisplay.map(source => `\`${source}\``);
                defaultOverrideHoverContent = localize('multipledefaultOverriddenDetails', "A default values has been set by {0}", sourceToDisplay.slice(0, -1).join(', ') + ' & ' + sourceToDisplay.slice(-1));
            }
            const showHover = (focus) => {
                return this.hoverService.showInstantHover({
                    content: new MarkdownString().appendMarkdown(defaultOverrideHoverContent),
                    target: this.defaultOverrideIndicator.element,
                    position: {
                        hoverPosition: 2 /* HoverPosition.BELOW */,
                    },
                    appearance: {
                        showPointer: true,
                        compact: false
                    }
                }, focus);
            };
            this.addHoverDisposables(this.defaultOverrideIndicator.disposables, this.defaultOverrideIndicator.element, showHover);
        }
        this.render();
    }
};
SettingsTreeIndicatorsLabel = __decorate([
    __param(1, IWorkbenchConfigurationService),
    __param(2, IHoverService),
    __param(3, IUserDataSyncEnablementService),
    __param(4, ILanguageService),
    __param(5, ICommandService)
], SettingsTreeIndicatorsLabel);
export { SettingsTreeIndicatorsLabel };
function getDefaultValueSourceToDisplay(element) {
    let sourceToDisplay;
    const defaultValueSource = element.defaultValueSource;
    if (defaultValueSource) {
        if (defaultValueSource instanceof Map) {
            sourceToDisplay = [];
            for (const [, value] of defaultValueSource) {
                const newValue = typeof value !== 'string' ? value.displayName ?? value.id : value;
                if (!sourceToDisplay.includes(newValue)) {
                    sourceToDisplay.push(newValue);
                }
            }
        }
        else if (typeof defaultValueSource === 'string') {
            sourceToDisplay = defaultValueSource;
        }
        else {
            sourceToDisplay = defaultValueSource.displayName ?? defaultValueSource.id;
        }
    }
    return sourceToDisplay;
}
function getAccessibleScopeDisplayText(completeScope, languageService) {
    const [scope, language] = completeScope.split(':');
    const localizedScope = scope === 'user' ?
        localize('user', "User") : scope === 'workspace' ?
        localize('workspace', "Workspace") : localize('remote', "Remote");
    if (language) {
        return localize('modifiedInScopeForLanguage', "The {0} scope for {1}", localizedScope, languageService.getLanguageName(language));
    }
    return localizedScope;
}
function getAccessibleScopeDisplayMidSentenceText(completeScope, languageService) {
    const [scope, language] = completeScope.split(':');
    const localizedScope = scope === 'user' ?
        localize('user', "User") : scope === 'workspace' ?
        localize('workspace', "Workspace") : localize('remote', "Remote");
    if (language) {
        return localize('modifiedInScopeForLanguageMidSentence', "the {0} scope for {1}", localizedScope.toLowerCase(), languageService.getLanguageName(language));
    }
    return localizedScope;
}
export function getIndicatorsLabelAriaLabel(element, configurationService, userDataProfilesService, languageService) {
    const ariaLabelSections = [];
    // Add preview or experimental indicator text
    if (element.tags?.has('preview')) {
        ariaLabelSections.push(localize('previewLabel', "Preview"));
    }
    else if (element.tags?.has('experimental')) {
        ariaLabelSections.push(localize('experimentalLabel', "Experimental"));
    }
    // Add workspace trust text
    if (element.isUntrusted) {
        ariaLabelSections.push(localize('workspaceUntrustedAriaLabel', "Workspace untrusted; setting value not applied"));
    }
    if (element.hasPolicyValue) {
        ariaLabelSections.push(localize('policyDescriptionAccessible', "Managed by organization policy; setting value not applied"));
    }
    else if (element.settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */ && configurationService.isSettingAppliedForAllProfiles(element.setting.key)) {
        ariaLabelSections.push(localize('applicationSettingDescriptionAccessible', "Setting value retained when switching profiles"));
    }
    else {
        // Add other overrides text
        const otherOverridesStart = element.isConfigured ?
            localize('alsoConfiguredIn', "Also modified in") :
            localize('configuredIn', "Modified in");
        const otherOverridesList = element.overriddenScopeList
            .map(scope => getAccessibleScopeDisplayMidSentenceText(scope, languageService)).join(', ');
        if (element.overriddenScopeList.length) {
            ariaLabelSections.push(`${otherOverridesStart} ${otherOverridesList}`);
        }
    }
    // Add sync ignored text
    if (cachedSyncIgnoredSettingsSet.has(element.setting.key)) {
        ariaLabelSections.push(localize('syncIgnoredAriaLabel', "Setting ignored during sync"));
    }
    // Add default override indicator text
    let sourceToDisplay = getDefaultValueSourceToDisplay(element);
    if (sourceToDisplay !== undefined) {
        if (Array.isArray(sourceToDisplay) && sourceToDisplay.length === 1) {
            sourceToDisplay = sourceToDisplay[0];
        }
        let overriddenDetailsText;
        if (!Array.isArray(sourceToDisplay)) {
            overriddenDetailsText = localize('defaultOverriddenDetailsAriaLabel', "{0} overrides the default value", sourceToDisplay);
        }
        else {
            overriddenDetailsText = localize('multipleDefaultOverriddenDetailsAriaLabel', "{0} override the default value", sourceToDisplay.slice(0, -1).join(', ') + ' & ' + sourceToDisplay.slice(-1));
        }
        ariaLabelSections.push(overriddenDetailsText);
    }
    // Add text about default values being overridden in other languages
    const otherLanguageOverridesList = element.overriddenDefaultsLanguageList
        .map(language => languageService.getLanguageName(language)).join(', ');
    if (element.overriddenDefaultsLanguageList.length) {
        const otherLanguageOverridesText = localize('defaultOverriddenLanguagesList', "Language-specific default values exist for {0}", otherLanguageOverridesList);
        ariaLabelSections.push(otherLanguageOverridesText);
    }
    const ariaLabel = ariaLabelSections.join('. ');
    return ariaLabel;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NFZGl0b3JTZXR0aW5nSW5kaWNhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvc2V0dGluZ3NFZGl0b3JTZXR0aW5nSW5kaWNhdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRWxGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVwRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXpGLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBR25GLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTFHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxrQkFBa0IsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2pJLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUc1RSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxD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