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
import './media/chatStatus.css';
import { safeIntl } from '../../../../base/common/date.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { language } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { IStatusbarService, ShowTooltipCommand } from '../../../services/statusbar/browser/statusbar.js';
import { $, addDisposableListener, append, clearNode, EventHelper, EventType } from '../../../../base/browser/dom.js';
import { ChatEntitlement, ChatSentiment, IChatEntitlementService } from '../common/chatEntitlementService.js';
import { defaultButtonStyles, defaultCheckboxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Checkbox } from '../../../../base/browser/ui/toggle/toggle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { contrastBorder, inputValidationErrorBorder, inputValidationInfoBorder, inputValidationWarningBorder, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Color } from '../../../../base/common/color.js';
import { Gesture, EventType as TouchEventType } from '../../../../base/browser/touch.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import product from '../../../../platform/product/common/product.js';
import { isObject } from '../../../../base/common/types.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IChatStatusItemService } from './chatStatusItemService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
const gaugeBackground = registerColor('gauge.background', {
    dark: inputValidationInfoBorder,
    light: inputValidationInfoBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeBackground', "Gauge background color."));
registerColor('gauge.foreground', {
    dark: transparent(gaugeBackground, 0.3),
    light: transparent(gaugeBackground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize('gaugeForeground', "Gauge foreground color."));
registerColor('gauge.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeBorder', "Gauge border color."));
const gaugeWarningBackground = registerColor('gauge.warningBackground', {
    dark: inputValidationWarningBorder,
    light: inputValidationWarningBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeWarningBackground', "Gauge warning background color."));
registerColor('gauge.warningForeground', {
    dark: transparent(gaugeWarningBackground, 0.3),
    light: transparent(gaugeWarningBackground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize('gaugeWarningForeground', "Gauge warning foreground color."));
const gaugeErrorBackground = registerColor('gauge.errorBackground', {
    dark: inputValidationErrorBorder,
    light: inputValidationErrorBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeErrorBackground', "Gauge error background color."));
registerColor('gauge.errorForeground', {
    dark: transparent(gaugeErrorBackground, 0.3),
    light: transparent(gaugeErrorBackground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize('gaugeErrorForeground', "Gauge error foreground color."));
//#endregion
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    completionsEnablementSetting: product.defaultChatAgent?.completionsEnablementSetting ?? '',
    nextEditSuggestionsSetting: product.defaultChatAgent?.nextEditSuggestionsSetting ?? ''
};
let ChatStatusBarEntry = class ChatStatusBarEntry extends Disposable {
    static { this.ID = 'workbench.contrib.chatStatusBarEntry'; }
    constructor(chatEntitlementService, instantiationService, statusbarService, editorService, configurationService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.instantiationService = instantiationService;
        this.statusbarService = statusbarService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.entry = undefined;
        this.dashboard = new Lazy(() => this.instantiationService.createInstance(ChatStatusDashboard));
        this.activeCodeEditorListener = this._register(new MutableDisposable());
        this.create();
        this.registerListeners();
    }
    async create() {
        const hidden = this.chatEntitlementService.sentiment === ChatSentiment.Disabled;
        if (!hidden) {
            this.entry ||= this.statusbarService.addEntry(this.getEntryProps(), 'chat.statusBarEntry', 1 /* StatusbarAlignment.RIGHT */, { location: { id: 'status.editor.mode', priority: 100.1 }, alignment: 1 /* StatusbarAlignment.RIGHT */ });
            // TODO@bpasero: remove this eventually
            const completionsStatusId = `${defaultChat.extensionId}.status`;
            this.statusbarService.updateEntryVisibility(completionsStatusId, false);
            this.statusbarService.overrideEntry(completionsStatusId, { name: localize('codeCompletionsStatus', "Copilot Code Completions"), text: localize('codeCompletionsStatusText', "$(copilot) Completions") });
        }
        else {
            this.entry?.dispose();
            this.entry = undefined;
        }
    }
    registerListeners() {
        this._register(this.chatEntitlementService.onDidChangeQuotaExceeded(() => this.entry?.update(this.getEntryProps())));
        this._register(this.chatEntitlementService.onDidChangeSentiment(() => this.entry?.update(this.getEntryProps())));
        this._register(this.chatEntitlementService.onDidChangeEntitlement(() => this.entry?.update(this.getEntryProps())));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onDidActiveEditorChange()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(defaultChat.completionsEnablementSetting)) {
                this.entry?.update(this.getEntryProps());
            }
        }));
    }
    onDidActiveEditorChange() {
        this.entry?.update(this.getEntryProps());
        this.activeCodeEditorListener.clear();
        // Listen to language changes in the active code editor
        const activeCodeEditor = getCodeEditor(this.editorService.activeTextEditorControl);
        if (activeCodeEditor) {
            this.activeCodeEditorListener.value = activeCodeEditor.onDidChangeModelLanguage(() => {
                this.entry?.update(this.getEntryProps());
            });
        }
    }
    getEntryProps() {
        let text = '$(copilot)';
        let ariaLabel = localize('chatStatus', "Copilot Status");
        let kind;
        if (!isNewUser(this.chatEntitlementService)) {
            const { chatQuotaExceeded, completionsQuotaExceeded } = this.chatEntitlementService.quotas;
            // Signed out
            if (this.chatEntitlementService.entitlement === ChatEntitlement.Unknown) {
                const signedOutWarning = localize('notSignedIntoCopilot', "Signed out");
                text = `$(copilot-not-connected) ${signedOutWarning}`;
                ariaLabel = signedOutWarning;
                kind = 'prominent';
            }
            // Quota Exceeded
            else if (chatQuotaExceeded || completionsQuotaExceeded) {
                let quotaWarning;
                if (chatQuotaExceeded && !completionsQuotaExceeded) {
                    quotaWarning = localize('chatQuotaExceededStatus', "Chat limit reached");
                }
                else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                    quotaWarning = localize('completionsQuotaExceededStatus', "Completions limit reached");
                }
                else {
                    quotaWarning = localize('chatAndCompletionsQuotaExceededStatus', "Limit reached");
                }
                text = `$(copilot-warning) ${quotaWarning}`;
                ariaLabel = quotaWarning;
                kind = 'prominent';
            }
            // Completions Disabled
            else if (this.editorService.activeTextEditorLanguageId && !isCompletionsEnabled(this.configurationService, this.editorService.activeTextEditorLanguageId)) {
                text = `$(copilot-not-connected)`;
                ariaLabel = localize('completionsDisabledStatus', "Code Completions Disabled");
            }
        }
        return {
            name: localize('chatStatus', "Copilot Status"),
            text,
            ariaLabel,
            command: ShowTooltipCommand,
            showInAllWindows: true,
            kind,
            tooltip: { element: token => this.dashboard.value.show(token) }
        };
    }
    dispose() {
        super.dispose();
        this.entry?.dispose();
        this.entry = undefined;
    }
};
ChatStatusBarEntry = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IInstantiationService),
    __param(2, IStatusbarService),
    __param(3, IEditorService),
    __param(4, IConfigurationService)
], ChatStatusBarEntry);
export { ChatStatusBarEntry };
function isNewUser(chatEntitlementService) {
    return chatEntitlementService.sentiment !== ChatSentiment.Installed || // copilot not installed
        chatEntitlementService.entitlement === ChatEntitlement.Available; // not yet signed up to copilot
}
function canUseCopilot(chatEntitlementService) {
    const newUser = isNewUser(chatEntitlementService);
    const signedOut = chatEntitlementService.entitlement === ChatEntitlement.Unknown;
    const allQuotaReached = chatEntitlementService.quotas.chatQuotaExceeded && chatEntitlementService.quotas.completionsQuotaExceeded;
    return !newUser && !signedOut && !allQuotaReached;
}
function isCompletionsEnabled(configurationService, modeId = '*') {
    const result = configurationService.getValue(defaultChat.completionsEnablementSetting);
    if (!isObject(result)) {
        return false;
    }
    if (typeof result[modeId] !== 'undefined') {
        return Boolean(result[modeId]); // go with setting if explicitly defined
    }
    return Boolean(result['*']); // fallback to global setting otherwise
}
let ChatStatusDashboard = class ChatStatusDashboard extends Disposable {
    constructor(chatEntitlementService, chatStatusItemService, commandService, configurationService, editorService, hoverService, languageService, openerService, telemetryService, textResourceConfigurationService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.chatStatusItemService = chatStatusItemService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.hoverService = hoverService;
        this.languageService = languageService;
        this.openerService = openerService;
        this.telemetryService = telemetryService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.element = $('div.chat-status-bar-entry-tooltip');
        this.dateFormatter = new Lazy(() => safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' }));
        this.entryDisposables = this._register(new MutableDisposable());
    }
    show(token) {
        clearNode(this.element);
        const disposables = this.entryDisposables.value = new DisposableStore();
        disposables.add(token.onCancellationRequested(() => disposables.dispose()));
        let needsSeparator = false;
        const addSeparator = (label) => {
            if (needsSeparator) {
                this.element.appendChild($('hr'));
                needsSeparator = false;
            }
            if (label) {
                this.element.appendChild($('div.header', undefined, label));
            }
            needsSeparator = true;
        };
        // Quota Indicator
        if (this.chatEntitlementService.entitlement === ChatEntitlement.Limited) {
            const { chatTotal, chatRemaining, completionsTotal, completionsRemaining, quotaResetDate, chatQuotaExceeded, completionsQuotaExceeded } = this.chatEntitlementService.quotas;
            addSeparator(localize('usageTitle', "Copilot Free Plan Usage"));
            const chatQuotaIndicator = this.createQuotaIndicator(this.element, chatTotal, chatRemaining, localize('chatsLabel', "Chat messages"));
            const completionsQuotaIndicator = this.createQuotaIndicator(this.element, completionsTotal, completionsRemaining, localize('completionsLabel', "Code completions"));
            this.element.appendChild($('div.description', undefined, localize('limitQuota', "Limits will reset on {0}.", this.dateFormatter.value.format(quotaResetDate))));
            if (chatQuotaExceeded || completionsQuotaExceeded) {
                const upgradePlanButton = disposables.add(new Button(this.element, { ...defaultButtonStyles, secondary: canUseCopilot(this.chatEntitlementService) /* use secondary color when copilot can still be used */ }));
                upgradePlanButton.label = localize('upgradeToCopilotPro', "Upgrade to Copilot Pro");
                disposables.add(upgradePlanButton.onDidClick(() => this.runCommandAndClose('workbench.action.chat.upgradePlan')));
            }
            (async () => {
                await this.chatEntitlementService.update(token);
                if (token.isCancellationRequested) {
                    return;
                }
                const { chatTotal, chatRemaining, completionsTotal, completionsRemaining } = this.chatEntitlementService.quotas;
                chatQuotaIndicator(chatTotal, chatRemaining);
                completionsQuotaIndicator(completionsTotal, completionsRemaining);
            })();
        }
        // Contributions
        {
            for (const item of this.chatStatusItemService.getEntries()) {
                addSeparator(undefined);
                const chatItemDisposables = disposables.add(new MutableDisposable());
                let rendered = this.renderContributedChatStatusItem(item);
                chatItemDisposables.value = rendered.disposables;
                this.element.appendChild(rendered.element);
                disposables.add(this.chatStatusItemService.onDidChange(e => {
                    if (e.entry.id === item.id) {
                        const oldEl = rendered.element;
                        rendered = this.renderContributedChatStatusItem(e.entry);
                        chatItemDisposables.value = rendered.disposables;
                        oldEl.replaceWith(rendered.element);
                    }
                }));
            }
        }
        // Settings
        {
            addSeparator(localize('settingsTitle', "Settings"));
            this.createSettings(this.element, disposables);
        }
        // New to Copilot / Signed out
        {
            const newUser = isNewUser(this.chatEntitlementService);
            const signedOut = this.chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            if (newUser || signedOut) {
                addSeparator(undefined);
                this.element.appendChild($('div.description', undefined, newUser ? localize('activateDescription', "Set up Copilot to use AI features.") : localize('signInDescription', "Sign in to use Copilot AI features.")));
                const button = disposables.add(new Button(this.element, { ...defaultButtonStyles }));
                button.label = newUser ? localize('activateCopilotButton', "Set up Copilot") : localize('signInToUseCopilotButton', "Sign in to use Copilot");
                disposables.add(button.onDidClick(() => this.runCommandAndClose(newUser ? 'workbench.action.chat.triggerSetup' : () => this.chatEntitlementService.requests?.value.signIn())));
            }
        }
        return this.element;
    }
    renderContributedChatStatusItem(item) {
        const disposables = new DisposableStore();
        const entryEl = $('div.contribution');
        entryEl.appendChild($('div.header', undefined, item.label));
        const bodyEl = entryEl.appendChild($('div.body'));
        const descriptionEl = bodyEl.appendChild($('span.description'));
        this.renderTextPlus(descriptionEl, item.description, disposables);
        if (item.detail) {
            const itemElement = bodyEl.appendChild($('div.detail-item'));
            this.renderTextPlus(itemElement, item.detail, disposables);
        }
        return { element: entryEl, disposables };
    }
    renderTextPlus(target, text, store) {
        for (const node of parseLinkedText(text).nodes) {
            if (typeof node === 'string') {
                const parts = renderLabelWithIcons(node);
                target.append(...parts);
            }
            else {
                store.add(new Link(target, node, undefined, this.hoverService, this.openerService));
            }
        }
    }
    runCommandAndClose(commandOrFn) {
        if (typeof commandOrFn === 'function') {
            commandOrFn();
        }
        else {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: commandOrFn, from: 'chat-status' });
            this.commandService.executeCommand(commandOrFn);
        }
        this.hoverService.hideHover(true);
    }
    createQuotaIndicator(container, total, remaining, label) {
        const quotaText = $('span');
        const quotaBit = $('div.quota-bit');
        const quotaIndicator = container.appendChild($('div.quota-indicator', undefined, $('div.quota-label', undefined, $('span', undefined, label), quotaText), $('div.quota-bar', undefined, quotaBit)));
        const update = (total, remaining) => {
            quotaIndicator.classList.remove('error');
            quotaIndicator.classList.remove('warning');
            if (typeof total === 'number' && typeof remaining === 'number') {
                let usedPercentage = Math.round(((total - remaining) / total) * 100);
                if (total !== remaining && usedPercentage === 0) {
                    usedPercentage = 1; // indicate minimal usage as 1%
                }
                quotaText.textContent = localize('quotaDisplay', "{0}%", usedPercentage);
                quotaBit.style.width = `${usedPercentage}%`;
                if (usedPercentage >= 90) {
                    quotaIndicator.classList.add('error');
                }
                else if (usedPercentage >= 75) {
                    quotaIndicator.classList.add('warning');
                }
            }
        };
        update(total, remaining);
        return update;
    }
    createSettings(container, disposables) {
        const modeId = this.editorService.activeTextEditorLanguageId;
        const settings = container.appendChild($('div.settings'));
        // --- Code Completions
        {
            const globalSetting = append(settings, $('div.setting'));
            this.createCodeCompletionsSetting(globalSetting, localize('settings.codeCompletions', "Code Completions (all files)"), '*', disposables);
            if (modeId) {
                const languageSetting = append(settings, $('div.setting'));
                this.createCodeCompletionsSetting(languageSetting, localize('settings.codeCompletionsLanguage', "Code Completions ({0})", this.languageService.getLanguageName(modeId) ?? modeId), modeId, disposables);
            }
        }
        // --- Next Edit Suggestions
        {
            const setting = append(settings, $('div.setting'));
            this.createNextEditSuggestionsSetting(setting, localize('settings.nextEditSuggestions', "Next Edit Suggestions"), modeId, this.getCompletionsSettingAccessor(modeId), disposables);
        }
        return settings;
    }
    createSetting(container, settingId, label, accessor, disposables) {
        const checkbox = disposables.add(new Checkbox(label, Boolean(accessor.readSetting()), defaultCheckboxStyles));
        container.appendChild(checkbox.domNode);
        const settingLabel = append(container, $('span.setting-label', undefined, label));
        disposables.add(Gesture.addTarget(settingLabel));
        [EventType.CLICK, TouchEventType.Tap].forEach(eventType => {
            disposables.add(addDisposableListener(settingLabel, eventType, e => {
                if (checkbox?.enabled) {
                    EventHelper.stop(e, true);
                    checkbox.checked = !checkbox.checked;
                    accessor.writeSetting(checkbox.checked);
                    checkbox.focus();
                }
            }));
        });
        disposables.add(checkbox.onChange(() => {
            accessor.writeSetting(checkbox.checked);
        }));
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(settingId)) {
                checkbox.checked = Boolean(accessor.readSetting());
            }
        }));
        if (!canUseCopilot(this.chatEntitlementService)) {
            container.classList.add('disabled');
            checkbox.disable();
        }
        return checkbox;
    }
    createCodeCompletionsSetting(container, label, modeId, disposables) {
        this.createSetting(container, defaultChat.completionsEnablementSetting, label, this.getCompletionsSettingAccessor(modeId), disposables);
    }
    getCompletionsSettingAccessor(modeId = '*') {
        const settingId = defaultChat.completionsEnablementSetting;
        return {
            readSetting: () => isCompletionsEnabled(this.configurationService, modeId),
            writeSetting: (value) => {
                let result = this.configurationService.getValue(settingId);
                if (!isObject(result)) {
                    result = Object.create(null);
                }
                return this.configurationService.updateValue(settingId, { ...result, [modeId]: value });
            }
        };
    }
    createNextEditSuggestionsSetting(container, label, modeId, completionsSettingAccessor, disposables) {
        const nesSettingId = defaultChat.nextEditSuggestionsSetting;
        const completionsSettingId = defaultChat.completionsEnablementSetting;
        const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        const checkbox = this.createSetting(container, nesSettingId, label, {
            readSetting: () => this.textResourceConfigurationService.getValue(resource, nesSettingId),
            writeSetting: (value) => this.textResourceConfigurationService.updateValue(resource, nesSettingId, value)
        }, disposables);
        // enablement of NES depends on completions setting
        // so we have to update our checkbox state accordingly
        if (!completionsSettingAccessor.readSetting()) {
            container.classList.add('disabled');
            checkbox.disable();
        }
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(completionsSettingId)) {
                if (completionsSettingAccessor.readSetting() && canUseCopilot(this.chatEntitlementService)) {
                    checkbox.enable();
                    container.classList.remove('disabled');
                }
                else {
                    checkbox.disable();
                    container.classList.add('disabled');
                }
            }
        }));
    }
};
ChatStatusDashboard = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IChatStatusItemService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IEditorService),
    __param(5, IHoverService),
    __param(6, ILanguageService),
    __param(7, IOpenerService),
    __param(8, ITelemetryService),
    __param(9, ITextResourceConfigurationService)
], ChatStatusDashboard);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUE0QyxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBMEMsTUFBTSxrREFBa0QsQ0FBQztBQUMzTCxPQUFPLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RILE9BQU8sRUFBRSxlQUFlLEVBQTBCLGFBQWEsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXRJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9B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