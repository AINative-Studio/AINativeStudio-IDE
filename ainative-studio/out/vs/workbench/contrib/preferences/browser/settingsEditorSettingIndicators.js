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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NFZGl0b3JTZXR0aW5nSW5kaWNhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3NldHRpbmdzRWRpdG9yU2V0dGluZ0luZGljYXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFcEUsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUV6RixPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUduRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUUxRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsa0JBQWtCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqSSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHNUUsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMs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