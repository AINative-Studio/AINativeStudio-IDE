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
var InstallAction_1, InstallInOtherServerAction_1, UninstallAction_1, UpdateAction_1, ToggleAutoUpdateForExtensionAction_1, ToggleAutoUpdatesForPublisherAction_1, MigrateDeprecatedExtensionAction_1, ManageExtensionAction_1, TogglePreReleaseExtensionAction_1, InstallAnotherVersionAction_1, EnableForWorkspaceAction_1, EnableGloballyAction_1, DisableForWorkspaceAction_1, DisableGloballyAction_1, ExtensionRuntimeStateAction_1, SetColorThemeAction_1, SetFileIconThemeAction_1, SetProductIconThemeAction_1, SetLanguageAction_1, ClearLanguageAction_1, ShowRecommendedExtensionAction_1, InstallRecommendedExtensionAction_1, IgnoreExtensionRecommendationAction_1, UndoIgnoreExtensionRecommendationAction_1, ExtensionStatusLabelAction_1, ToggleSyncExtensionAction_1, ExtensionStatusAction_1, InstallSpecificVersionOfExtensionAction_1;
import './media/extensionActions.css';
import { localize, localize2 } from '../../../../nls.js';
import { Action, Separator, SubmenuAction } from '../../../../base/common/actions.js';
import { Delayer, Promises, Throttler } from '../../../../base/common/async.js';
import * as DOM from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import * as json from '../../../../base/common/json.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { disposeIfDisposable } from '../../../../base/common/lifecycle.js';
import { IExtensionsWorkbenchService, TOGGLE_IGNORE_EXTENSION_ACTION_ID, SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID, THEME_ACTIONS_GROUP, INSTALL_ACTIONS_GROUP, UPDATE_ACTIONS_GROUP, AutoUpdateConfigurationKey } from '../common/extensions.js';
import { ExtensionsConfigurationInitialContent } from '../common/extensionsFileTemplate.js';
import { IExtensionGalleryService, IAllowedExtensionsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService, IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { areSameExtensions, getExtensionId } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { ExtensionIdentifier, isLanguagePackExtension, getWorkspaceSupportTypeMessage, isApplicationScopedExtension } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IExtensionService, toExtension, toExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { URI } from '../../../../base/common/uri.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { buttonBackground, buttonForeground, buttonHoverBackground, registerColor, editorWarningForeground, editorInfoForeground, editorErrorForeground, buttonSeparator } from '../../../../platform/theme/common/colorRegistry.js';
import { IJSONEditingService } from '../../../services/configuration/common/jsonEditing.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId, IMenuService } from '../../../../platform/actions/common/actions.js';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from '../../../browser/actions/workspaceCommands.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { EXTENSIONS_CONFIG } from '../../../services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import { getErrorMessage, isCancellationError } from '../../../../base/common/errors.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { errorIcon, infoIcon, manageExtensionIcon, syncEnabledIcon, syncIgnoredIcon, trustIcon, warningIcon } from './extensionsIcons.js';
import { isIOS, isWeb, language } from '../../../../base/common/platform.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { escapeMarkdownSyntaxTokens, MarkdownString } from '../../../../base/common/htmlContent.js';
import { fromNow } from '../../../../base/common/date.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { getLocale } from '../../../../platform/languagePacks/common/languagePacks.js';
import { ILocaleService } from '../../../services/localization/common/locale.js';
import { isString } from '../../../../base/common/types.js';
import { showWindowLogActionId } from '../../../services/log/common/logConstants.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Extensions, IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { ActionWithDropdownActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { IAuthenticationUsageService } from '../../../services/authentication/browser/authenticationUsageService.js';
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
let PromptExtensionInstallFailureAction = class PromptExtensionInstallFailureAction extends Action {
    constructor(extension, options, version, installOperation, error, productService, openerService, notificationService, dialogService, commandService, logService, extensionManagementServerService, instantiationService, galleryService, extensionManifestPropertiesService) {
        super('extension.promptExtensionInstallFailure');
        this.extension = extension;
        this.options = options;
        this.version = version;
        this.installOperation = installOperation;
        this.error = error;
        this.productService = productService;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.logService = logService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.instantiationService = instantiationService;
        this.galleryService = galleryService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
    }
    async run() {
        if (isCancellationError(this.error)) {
            return;
        }
        this.logService.error(this.error);
        if (this.error.name === "Unsupported" /* ExtensionManagementErrorCode.Unsupported */) {
            const productName = isWeb ? localize('VS Code for Web', "{0} for the Web", this.productService.nameLong) : this.productService.nameLong;
            const message = localize('cannot be installed', "The '{0}' extension is not available in {1}. Click 'More Information' to learn more.", this.extension.displayName || this.extension.identifier.id, productName);
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Info,
                message,
                primaryButton: localize({ key: 'more information', comment: ['&& denotes a mnemonic'] }, "&&More Information"),
                cancelButton: localize('close', "Close")
            });
            if (confirmed) {
                this.openerService.open(isWeb ? URI.parse('https://aka.ms/vscode-web-extensions-guide') : URI.parse('https://aka.ms/vscode-remote'));
            }
            return;
        }
        if ("ReleaseVersionNotFound" /* ExtensionManagementErrorCode.ReleaseVersionNotFound */ === this.error.name) {
            await this.dialogService.prompt({
                type: 'error',
                message: getErrorMessage(this.error),
                buttons: [{
                        label: localize('install prerelease', "Install Pre-Release"),
                        run: () => {
                            const installAction = this.instantiationService.createInstance(InstallAction, { installPreReleaseVersion: true });
                            installAction.extension = this.extension;
                            return installAction.run();
                        }
                    }],
                cancelButton: localize('cancel', "Cancel")
            });
            return;
        }
        if (["Incompatible" /* ExtensionManagementErrorCode.Incompatible */, "IncompatibleApi" /* ExtensionManagementErrorCode.IncompatibleApi */, "IncompatibleTargetPlatform" /* ExtensionManagementErrorCode.IncompatibleTargetPlatform */, "Malicious" /* ExtensionManagementErrorCode.Malicious */, "Deprecated" /* ExtensionManagementErrorCode.Deprecated */].includes(this.error.name)) {
            await this.dialogService.info(getErrorMessage(this.error));
            return;
        }
        if ("PackageNotSigned" /* ExtensionManagementErrorCode.PackageNotSigned */ === this.error.name) {
            await this.dialogService.prompt({
                type: 'error',
                message: localize('not signed', "'{0}' is an extension from an unknown source. Are you sure you want to install?", this.extension.displayName),
                detail: getErrorMessage(this.error),
                buttons: [{
                        label: localize('install anyway', "Install Anyway"),
                        run: () => {
                            const installAction = this.instantiationService.createInstance(InstallAction, { ...this.options, donotVerifySignature: true, });
                            installAction.extension = this.extension;
                            return installAction.run();
                        }
                    }],
                cancelButton: true
            });
            return;
        }
        if ("SignatureVerificationFailed" /* ExtensionManagementErrorCode.SignatureVerificationFailed */ === this.error.name || "SignatureVerificationInternal" /* ExtensionManagementErrorCode.SignatureVerificationInternal */ === this.error.name) {
            await this.dialogService.prompt({
                type: 'error',
                message: localize('verification failed', "Cannot install '{0}' extension because {1} cannot verify the extension signature", this.extension.displayName, this.productService.nameLong),
                detail: getErrorMessage(this.error),
                buttons: [{
                        label: localize('learn more', "Learn More"),
                        run: () => this.openerService.open('https://code.visualstudio.com/docs/editor/extension-marketplace#_the-extension-signature-cannot-be-verified-by-vs-code')
                    }, {
                        label: localize('install donot verify', "Install Anyway (Don't Verify Signature)"),
                        run: () => {
                            const installAction = this.instantiationService.createInstance(InstallAction, { ...this.options, donotVerifySignature: true, });
                            installAction.extension = this.extension;
                            return installAction.run();
                        }
                    }],
                cancelButton: true
            });
            return;
        }
        const operationMessage = this.installOperation === 3 /* InstallOperation.Update */ ? localize('update operation', "Error while updating '{0}' extension.", this.extension.displayName || this.extension.identifier.id)
            : localize('install operation', "Error while installing '{0}' extension.", this.extension.displayName || this.extension.identifier.id);
        let additionalMessage;
        const promptChoices = [];
        const downloadUrl = await this.getDownloadUrl();
        if (downloadUrl) {
            additionalMessage = localize('check logs', "Please check the [log]({0}) for more details.", `command:${showWindowLogActionId}`);
            promptChoices.push({
                label: localize('download', "Try Downloading Manually..."),
                run: () => this.openerService.open(downloadUrl).then(() => {
                    this.notificationService.prompt(Severity.Info, localize('install vsix', 'Once downloaded, please manually install the downloaded VSIX of \'{0}\'.', this.extension.identifier.id), [{
                            label: localize('installVSIX', "Install from VSIX..."),
                            run: () => this.commandService.executeCommand(SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID)
                        }]);
                })
            });
        }
        const message = `${operationMessage}${additionalMessage ? ` ${additionalMessage}` : ''}`;
        this.notificationService.prompt(Severity.Error, message, promptChoices);
    }
    async getDownloadUrl() {
        if (isIOS) {
            return undefined;
        }
        if (!this.extension.gallery) {
            return undefined;
        }
        if (!this.extensionManagementServerService.localExtensionManagementServer && !this.extensionManagementServerService.remoteExtensionManagementServer) {
            return undefined;
        }
        let targetPlatform = this.extension.gallery.properties.targetPlatform;
        if (targetPlatform !== "universal" /* TargetPlatform.UNIVERSAL */ && targetPlatform !== "undefined" /* TargetPlatform.UNDEFINED */ && this.extensionManagementServerService.remoteExtensionManagementServer) {
            try {
                const manifest = await this.galleryService.getManifest(this.extension.gallery, CancellationToken.None);
                if (manifest && this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(manifest)) {
                    targetPlatform = await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getTargetPlatform();
                }
            }
            catch (error) {
                this.logService.error(error);
                return undefined;
            }
        }
        if (targetPlatform === "unknown" /* TargetPlatform.UNKNOWN */) {
            return undefined;
        }
        const [extension] = await this.galleryService.getExtensions([{
                ...this.extension.identifier,
                version: this.version
            }], {
            targetPlatform
        }, CancellationToken.None);
        if (!extension) {
            return undefined;
        }
        return URI.parse(extension.assets.download.uri);
    }
};
PromptExtensionInstallFailureAction = __decorate([
    __param(5, IProductService),
    __param(6, IOpenerService),
    __param(7, INotificationService),
    __param(8, IDialogService),
    __param(9, ICommandService),
    __param(10, ILogService),
    __param(11, IExtensionManagementServerService),
    __param(12, IInstantiationService),
    __param(13, IExtensionGalleryService),
    __param(14, IExtensionManifestPropertiesService)
], PromptExtensionInstallFailureAction);
export { PromptExtensionInstallFailureAction };
export class ExtensionAction extends Action {
    constructor() {
        super(...arguments);
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._extension = null;
        this._hidden = false;
        this.hideOnDisabled = true;
    }
    static { this.EXTENSION_ACTION_CLASS = 'extension-action'; }
    static { this.TEXT_ACTION_CLASS = `${ExtensionAction.EXTENSION_ACTION_CLASS} text`; }
    static { this.LABEL_ACTION_CLASS = `${ExtensionAction.EXTENSION_ACTION_CLASS} label`; }
    static { this.PROMINENT_LABEL_ACTION_CLASS = `${ExtensionAction.LABEL_ACTION_CLASS} prominent`; }
    static { this.ICON_ACTION_CLASS = `${ExtensionAction.EXTENSION_ACTION_CLASS} icon`; }
    get extension() { return this._extension; }
    set extension(extension) { this._extension = extension; this.update(); }
    get hidden() { return this._hidden; }
    set hidden(hidden) {
        if (this._hidden !== hidden) {
            this._hidden = hidden;
            this._onDidChange.fire({ hidden });
        }
    }
    _setEnabled(value) {
        super._setEnabled(value);
        if (this.hideOnDisabled) {
            this.hidden = !value;
        }
    }
}
export class ButtonWithDropDownExtensionAction extends ExtensionAction {
    get menuActions() { return [...this._menuActions]; }
    get extension() {
        return super.extension;
    }
    set extension(extension) {
        this.extensionActions.forEach(a => a.extension = extension);
        super.extension = extension;
    }
    constructor(id, clazz, actionsGroups) {
        clazz = `${clazz} action-dropdown`;
        super(id, undefined, clazz);
        this.actionsGroups = actionsGroups;
        this.menuActionClassNames = [];
        this._menuActions = [];
        this.menuActionClassNames = clazz.split(' ');
        this.hideOnDisabled = false;
        this.extensionActions = actionsGroups.flat();
        this.update();
        this._register(Event.any(...this.extensionActions.map(a => a.onDidChange))(() => this.update(true)));
        this.extensionActions.forEach(a => this._register(a));
    }
    update(donotUpdateActions) {
        if (!donotUpdateActions) {
            this.extensionActions.forEach(a => a.update());
        }
        const actionsGroups = this.actionsGroups.map(actionsGroup => actionsGroup.filter(a => !a.hidden));
        let actions = [];
        for (const visibleActions of actionsGroups) {
            if (visibleActions.length) {
                actions = [...actions, ...visibleActions, new Separator()];
            }
        }
        actions = actions.length ? actions.slice(0, actions.length - 1) : actions;
        this.primaryAction = actions[0];
        this._menuActions = actions.length > 1 ? actions : [];
        this._onDidChange.fire({ menuActions: this._menuActions });
        if (this.primaryAction) {
            this.hidden = false;
            this.enabled = this.primaryAction.enabled;
            this.label = this.getLabel(this.primaryAction);
            this.tooltip = this.primaryAction.tooltip;
        }
        else {
            this.hidden = true;
            this.enabled = false;
        }
    }
    async run() {
        if (this.enabled) {
            await this.primaryAction?.run();
        }
    }
    getLabel(action) {
        return action.label;
    }
}
export class ButtonWithDropdownExtensionActionViewItem extends ActionWithDropdownActionViewItem {
    constructor(action, options, contextMenuProvider) {
        super(null, action, options, contextMenuProvider);
        this._register(action.onDidChange(e => {
            if (e.hidden !== undefined || e.menuActions !== undefined) {
                this.updateClass();
            }
        }));
    }
    render(container) {
        super.render(container);
        this.updateClass();
    }
    updateClass() {
        super.updateClass();
        if (this.element && this.dropdownMenuActionViewItem?.element) {
            this.element.classList.toggle('hide', this._action.hidden);
            const isMenuEmpty = this._action.menuActions.length === 0;
            this.element.classList.toggle('empty', isMenuEmpty);
            this.dropdownMenuActionViewItem.element.classList.toggle('hide', isMenuEmpty);
        }
    }
}
let InstallAction = class InstallAction extends ExtensionAction {
    static { InstallAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent install`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    set manifest(manifest) {
        this._manifest = manifest;
        this.updateLabel();
    }
    constructor(options, extensionsWorkbenchService, instantiationService, runtimeExtensionService, workbenchThemeService, labelService, dialogService, preferencesService, telemetryService, contextService, allowedExtensionsService, extensionGalleryManifestService) {
        super('extensions.install', localize('install', "Install"), InstallAction_1.CLASS, false);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.instantiationService = instantiationService;
        this.runtimeExtensionService = runtimeExtensionService;
        this.workbenchThemeService = workbenchThemeService;
        this.labelService = labelService;
        this.dialogService = dialogService;
        this.preferencesService = preferencesService;
        this.telemetryService = telemetryService;
        this.contextService = contextService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this._manifest = null;
        this.updateThrottler = new Throttler();
        this.hideOnDisabled = false;
        this.options = { isMachineScoped: false, ...options };
        this.update();
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this.update()));
        this._register(this.labelService.onDidChangeFormatters(() => this.updateLabel(), this));
    }
    update() {
        this.updateThrottler.queue(() => this.computeAndUpdateEnablement());
    }
    async computeAndUpdateEnablement() {
        this.enabled = false;
        this.class = InstallAction_1.HIDE;
        this.hidden = true;
        if (!this.extension) {
            return;
        }
        if (this.extension.isBuiltin) {
            return;
        }
        if (this.extensionsWorkbenchService.canSetLanguage(this.extension)) {
            return;
        }
        if (this.extension.state !== 3 /* ExtensionState.Uninstalled */) {
            return;
        }
        if (this.options.installPreReleaseVersion && (!this.extension.hasPreReleaseVersion || this.allowedExtensionsService.isAllowed({ id: this.extension.identifier.id, publisherDisplayName: this.extension.publisherDisplayName, prerelease: true }) !== true)) {
            return;
        }
        if (!this.options.installPreReleaseVersion && !this.extension.hasReleaseVersion) {
            return;
        }
        this.hidden = false;
        this.class = InstallAction_1.CLASS;
        if (await this.extensionsWorkbenchService.canInstall(this.extension) === true) {
            this.enabled = true;
            this.updateLabel();
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        if (this.extension.gallery && !this.extension.gallery.isSigned && (await this.extensionGalleryManifestService.getExtensionGalleryManifest())?.capabilities.signing?.allRepositorySigned) {
            const { result } = await this.dialogService.prompt({
                type: Severity.Warning,
                message: localize('not signed', "'{0}' is an extension from an unknown source. Are you sure you want to install?", this.extension.displayName),
                detail: localize('not signed detail', "Extension is not signed."),
                buttons: [
                    {
                        label: localize('install anyway', "Install Anyway"),
                        run: () => {
                            this.options.donotVerifySignature = true;
                            return true;
                        }
                    }
                ],
                cancelButton: {
                    run: () => false
                }
            });
            if (!result) {
                return;
            }
        }
        if (this.extension.deprecationInfo) {
            let detail = localize('deprecated message', "This extension is deprecated as it is no longer being maintained.");
            let DeprecationChoice;
            (function (DeprecationChoice) {
                DeprecationChoice[DeprecationChoice["InstallAnyway"] = 0] = "InstallAnyway";
                DeprecationChoice[DeprecationChoice["ShowAlternateExtension"] = 1] = "ShowAlternateExtension";
                DeprecationChoice[DeprecationChoice["ConfigureSettings"] = 2] = "ConfigureSettings";
                DeprecationChoice[DeprecationChoice["Cancel"] = 3] = "Cancel";
            })(DeprecationChoice || (DeprecationChoice = {}));
            const buttons = [
                {
                    label: localize('install anyway', "Install Anyway"),
                    run: () => DeprecationChoice.InstallAnyway
                }
            ];
            if (this.extension.deprecationInfo.extension) {
                detail = localize('deprecated with alternate extension message', "This extension is deprecated. Use the {0} extension instead.", this.extension.deprecationInfo.extension.displayName);
                const alternateExtension = this.extension.deprecationInfo.extension;
                buttons.push({
                    label: localize({ key: 'Show alternate extension', comment: ['&& denotes a mnemonic'] }, "&&Open {0}", this.extension.deprecationInfo.extension.displayName),
                    run: async () => {
                        const [extension] = await this.extensionsWorkbenchService.getExtensions([{ id: alternateExtension.id, preRelease: alternateExtension.preRelease }], CancellationToken.None);
                        await this.extensionsWorkbenchService.open(extension);
                        return DeprecationChoice.ShowAlternateExtension;
                    }
                });
            }
            else if (this.extension.deprecationInfo.settings) {
                detail = localize('deprecated with alternate settings message', "This extension is deprecated as this functionality is now built-in to VS Code.");
                const settings = this.extension.deprecationInfo.settings;
                buttons.push({
                    label: localize({ key: 'configure in settings', comment: ['&& denotes a mnemonic'] }, "&&Configure Settings"),
                    run: async () => {
                        await this.preferencesService.openSettings({ query: settings.map(setting => `@id:${setting}`).join(' ') });
                        return DeprecationChoice.ConfigureSettings;
                    }
                });
            }
            else if (this.extension.deprecationInfo.additionalInfo) {
                detail = new MarkdownString(`${detail} ${this.extension.deprecationInfo.additionalInfo}`);
            }
            const { result } = await this.dialogService.prompt({
                type: Severity.Warning,
                message: localize('install confirmation', "Are you sure you want to install '{0}'?", this.extension.displayName),
                detail: isString(detail) ? detail : undefined,
                custom: isString(detail) ? undefined : {
                    markdownDetails: [{
                            markdown: detail
                        }]
                },
                buttons,
                cancelButton: {
                    run: () => DeprecationChoice.Cancel
                }
            });
            if (result !== DeprecationChoice.InstallAnyway) {
                return;
            }
        }
        this.extensionsWorkbenchService.open(this.extension, { showPreReleaseVersion: this.options.installPreReleaseVersion });
        alert(localize('installExtensionStart', "Installing extension {0} started. An editor is now open with more details on this extension", this.extension.displayName));
        /* __GDPR__
            "extensions:action:install" : {
                "owner": "sandy081",
                "actionId" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                "${include}": [
                    "${GalleryExtensionTelemetryData}"
                ]
            }
        */
        this.telemetryService.publicLog('extensions:action:install', { ...this.extension.telemetryData, actionId: this.id });
        const extension = await this.install(this.extension);
        if (extension?.local) {
            alert(localize('installExtensionComplete', "Installing extension {0} is completed.", this.extension.displayName));
            const runningExtension = await this.getRunningExtension(extension.local);
            if (runningExtension && !(runningExtension.activationEvents && runningExtension.activationEvents.some(activationEent => activationEent.startsWith('onLanguage')))) {
                const action = await this.getThemeAction(extension);
                if (action) {
                    action.extension = extension;
                    try {
                        return action.run({ showCurrentTheme: true, ignoreFocusLost: true });
                    }
                    finally {
                        action.dispose();
                    }
                }
            }
        }
    }
    async getThemeAction(extension) {
        const colorThemes = await this.workbenchThemeService.getColorThemes();
        if (colorThemes.some(theme => isThemeFromExtension(theme, extension))) {
            return this.instantiationService.createInstance(SetColorThemeAction);
        }
        const fileIconThemes = await this.workbenchThemeService.getFileIconThemes();
        if (fileIconThemes.some(theme => isThemeFromExtension(theme, extension))) {
            return this.instantiationService.createInstance(SetFileIconThemeAction);
        }
        const productIconThemes = await this.workbenchThemeService.getProductIconThemes();
        if (productIconThemes.some(theme => isThemeFromExtension(theme, extension))) {
            return this.instantiationService.createInstance(SetProductIconThemeAction);
        }
        return undefined;
    }
    async install(extension) {
        try {
            return await this.extensionsWorkbenchService.install(extension, this.options);
        }
        catch (error) {
            await this.instantiationService.createInstance(PromptExtensionInstallFailureAction, extension, this.options, extension.latestVersion, 2 /* InstallOperation.Install */, error).run();
            return undefined;
        }
    }
    async getRunningExtension(extension) {
        const runningExtension = await this.runtimeExtensionService.getExtension(extension.identifier.id);
        if (runningExtension) {
            return runningExtension;
        }
        if (this.runtimeExtensionService.canAddExtension(toExtensionDescription(extension))) {
            return new Promise((c, e) => {
                const disposable = this.runtimeExtensionService.onDidChangeExtensions(async () => {
                    const runningExtension = await this.runtimeExtensionService.getExtension(extension.identifier.id);
                    if (runningExtension) {
                        disposable.dispose();
                        c(runningExtension);
                    }
                });
            });
        }
        return null;
    }
    updateLabel() {
        this.label = this.getLabel();
    }
    getLabel(primary) {
        if (this.extension?.isWorkspaceScoped && this.extension.resourceExtension && this.contextService.isInsideWorkspace(this.extension.resourceExtension.location)) {
            return localize('install workspace version', "Install Workspace Extension");
        }
        /* install pre-release version */
        if (this.options.installPreReleaseVersion && this.extension?.hasPreReleaseVersion) {
            return primary ? localize('install pre-release', "Install Pre-Release") : localize('install pre-release version', "Install Pre-Release Version");
        }
        /* install released version that has a pre release version */
        if (this.extension?.hasPreReleaseVersion) {
            return primary ? localize('install', "Install") : localize('install release version', "Install Release Version");
        }
        return localize('install', "Install");
    }
};
InstallAction = InstallAction_1 = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IInstantiationService),
    __param(3, IExtensionService),
    __param(4, IWorkbenchThemeService),
    __param(5, ILabelService),
    __param(6, IDialogService),
    __param(7, IPreferencesService),
    __param(8, ITelemetryService),
    __param(9, IWorkspaceContextService),
    __param(10, IAllowedExtensionsService),
    __param(11, IExtensionGalleryManifestService)
], InstallAction);
export { InstallAction };
let InstallDropdownAction = class InstallDropdownAction extends ButtonWithDropDownExtensionAction {
    set manifest(manifest) {
        this.extensionActions.forEach(a => a.manifest = manifest);
        this.update();
    }
    constructor(instantiationService, extensionsWorkbenchService) {
        super(`extensions.installActions`, InstallAction.CLASS, [
            [
                instantiationService.createInstance(InstallAction, { installPreReleaseVersion: extensionsWorkbenchService.preferPreReleases }),
                instantiationService.createInstance(InstallAction, { installPreReleaseVersion: !extensionsWorkbenchService.preferPreReleases }),
            ]
        ]);
    }
    getLabel(action) {
        return action.getLabel(true);
    }
};
InstallDropdownAction = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionsWorkbenchService)
], InstallDropdownAction);
export { InstallDropdownAction };
export class InstallingLabelAction extends ExtensionAction {
    static { this.LABEL = localize('installing', "Installing"); }
    static { this.CLASS = `${ExtensionAction.LABEL_ACTION_CLASS} install installing`; }
    constructor() {
        super('extension.installing', InstallingLabelAction.LABEL, InstallingLabelAction.CLASS, false);
    }
    update() {
        this.class = `${InstallingLabelAction.CLASS}${this.extension && this.extension.state === 0 /* ExtensionState.Installing */ ? '' : ' hide'}`;
    }
}
let InstallInOtherServerAction = class InstallInOtherServerAction extends ExtensionAction {
    static { InstallInOtherServerAction_1 = this; }
    static { this.INSTALL_LABEL = localize('install', "Install"); }
    static { this.INSTALLING_LABEL = localize('installing', "Installing"); }
    static { this.Class = `${ExtensionAction.LABEL_ACTION_CLASS} prominent install-other-server`; }
    static { this.InstallingClass = `${ExtensionAction.LABEL_ACTION_CLASS} install-other-server installing`; }
    constructor(id, server, canInstallAnyWhere, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService) {
        super(id, InstallInOtherServerAction_1.INSTALL_LABEL, InstallInOtherServerAction_1.Class, false);
        this.server = server;
        this.canInstallAnyWhere = canInstallAnyWhere;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.updateWhenCounterExtensionChanges = true;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = InstallInOtherServerAction_1.Class;
        if (this.canInstall()) {
            const extensionInOtherServer = this.extensionsWorkbenchService.installed.filter(e => areSameExtensions(e.identifier, this.extension.identifier) && e.server === this.server)[0];
            if (extensionInOtherServer) {
                // Getting installed in other server
                if (extensionInOtherServer.state === 0 /* ExtensionState.Installing */ && !extensionInOtherServer.local) {
                    this.enabled = true;
                    this.label = InstallInOtherServerAction_1.INSTALLING_LABEL;
                    this.class = InstallInOtherServerAction_1.InstallingClass;
                }
            }
            else {
                // Not installed in other server
                this.enabled = true;
                this.label = this.getInstallLabel();
            }
        }
    }
    canInstall() {
        // Disable if extension is not installed or not an user extension
        if (!this.extension
            || !this.server
            || !this.extension.local
            || this.extension.state !== 1 /* ExtensionState.Installed */
            || this.extension.type !== 1 /* ExtensionType.User */
            || this.extension.enablementState === 2 /* EnablementState.DisabledByEnvironment */ || this.extension.enablementState === 0 /* EnablementState.DisabledByTrustRequirement */ || this.extension.enablementState === 5 /* EnablementState.DisabledByVirtualWorkspace */) {
            return false;
        }
        if (isLanguagePackExtension(this.extension.local.manifest)) {
            return true;
        }
        // Prefers to run on UI
        if (this.server === this.extensionManagementServerService.localExtensionManagementServer && this.extensionManifestPropertiesService.prefersExecuteOnUI(this.extension.local.manifest)) {
            return true;
        }
        // Prefers to run on Workspace
        if (this.server === this.extensionManagementServerService.remoteExtensionManagementServer && this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(this.extension.local.manifest)) {
            return true;
        }
        // Prefers to run on Web
        if (this.server === this.extensionManagementServerService.webExtensionManagementServer && this.extensionManifestPropertiesService.prefersExecuteOnWeb(this.extension.local.manifest)) {
            return true;
        }
        if (this.canInstallAnyWhere) {
            // Can run on UI
            if (this.server === this.extensionManagementServerService.localExtensionManagementServer && this.extensionManifestPropertiesService.canExecuteOnUI(this.extension.local.manifest)) {
                return true;
            }
            // Can run on Workspace
            if (this.server === this.extensionManagementServerService.remoteExtensionManagementServer && this.extensionManifestPropertiesService.canExecuteOnWorkspace(this.extension.local.manifest)) {
                return true;
            }
        }
        return false;
    }
    async run() {
        if (!this.extension?.local) {
            return;
        }
        if (!this.extension?.server) {
            return;
        }
        if (!this.server) {
            return;
        }
        this.extensionsWorkbenchService.open(this.extension);
        alert(localize('installExtensionStart', "Installing extension {0} started. An editor is now open with more details on this extension", this.extension.displayName));
        return this.extensionsWorkbenchService.installInServer(this.extension, this.server);
    }
};
InstallInOtherServerAction = InstallInOtherServerAction_1 = __decorate([
    __param(3, IExtensionsWorkbenchService),
    __param(4, IExtensionManagementServerService),
    __param(5, IExtensionManifestPropertiesService)
], InstallInOtherServerAction);
export { InstallInOtherServerAction };
let RemoteInstallAction = class RemoteInstallAction extends InstallInOtherServerAction {
    constructor(canInstallAnyWhere, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService) {
        super(`extensions.remoteinstall`, extensionManagementServerService.remoteExtensionManagementServer, canInstallAnyWhere, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService);
    }
    getInstallLabel() {
        return this.extensionManagementServerService.remoteExtensionManagementServer
            ? localize({ key: 'install in remote', comment: ['This is the name of the action to install an extension in remote server. Placeholder is for the name of remote server.'] }, "Install in {0}", this.extensionManagementServerService.remoteExtensionManagementServer.label)
            : InstallInOtherServerAction.INSTALL_LABEL;
    }
};
RemoteInstallAction = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IExtensionManagementServerService),
    __param(3, IExtensionManifestPropertiesService)
], RemoteInstallAction);
export { RemoteInstallAction };
let LocalInstallAction = class LocalInstallAction extends InstallInOtherServerAction {
    constructor(extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService) {
        super(`extensions.localinstall`, extensionManagementServerService.localExtensionManagementServer, false, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService);
    }
    getInstallLabel() {
        return localize('install locally', "Install Locally");
    }
};
LocalInstallAction = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IExtensionManagementServerService),
    __param(2, IExtensionManifestPropertiesService)
], LocalInstallAction);
export { LocalInstallAction };
let WebInstallAction = class WebInstallAction extends InstallInOtherServerAction {
    constructor(extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService) {
        super(`extensions.webInstall`, extensionManagementServerService.webExtensionManagementServer, false, extensionsWorkbenchService, extensionManagementServerService, extensionManifestPropertiesService);
    }
    getInstallLabel() {
        return localize('install browser', "Install in Browser");
    }
};
WebInstallAction = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IExtensionManagementServerService),
    __param(2, IExtensionManifestPropertiesService)
], WebInstallAction);
export { WebInstallAction };
let UninstallAction = class UninstallAction extends ExtensionAction {
    static { UninstallAction_1 = this; }
    static { this.UninstallLabel = localize('uninstallAction', "Uninstall"); }
    static { this.UninstallingLabel = localize('Uninstalling', "Uninstalling"); }
    static { this.UninstallClass = `${ExtensionAction.LABEL_ACTION_CLASS} uninstall`; }
    static { this.UnInstallingClass = `${ExtensionAction.LABEL_ACTION_CLASS} uninstall uninstalling`; }
    constructor(extensionsWorkbenchService, dialogService) {
        super('extensions.uninstall', UninstallAction_1.UninstallLabel, UninstallAction_1.UninstallClass, false);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.dialogService = dialogService;
        this.update();
    }
    update() {
        if (!this.extension) {
            this.enabled = false;
            return;
        }
        const state = this.extension.state;
        if (state === 2 /* ExtensionState.Uninstalling */) {
            this.label = UninstallAction_1.UninstallingLabel;
            this.class = UninstallAction_1.UnInstallingClass;
            this.enabled = false;
            return;
        }
        this.label = UninstallAction_1.UninstallLabel;
        this.class = UninstallAction_1.UninstallClass;
        this.tooltip = UninstallAction_1.UninstallLabel;
        if (state !== 1 /* ExtensionState.Installed */) {
            this.enabled = false;
            return;
        }
        if (this.extension.isBuiltin) {
            this.enabled = false;
            return;
        }
        this.enabled = true;
    }
    async run() {
        if (!this.extension) {
            return;
        }
        alert(localize('uninstallExtensionStart', "Uninstalling extension {0} started.", this.extension.displayName));
        try {
            await this.extensionsWorkbenchService.uninstall(this.extension);
            alert(localize('uninstallExtensionComplete', "Please reload Visual Studio Code to complete the uninstallation of the extension {0}.", this.extension.displayName));
        }
        catch (error) {
            if (!isCancellationError(error)) {
                this.dialogService.error(getErrorMessage(error));
            }
        }
    }
};
UninstallAction = UninstallAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IDialogService)
], UninstallAction);
export { UninstallAction };
let UpdateAction = class UpdateAction extends ExtensionAction {
    static { UpdateAction_1 = this; }
    static { this.EnabledClass = `${this.LABEL_ACTION_CLASS} prominent update`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(verbose, extensionsWorkbenchService, dialogService, openerService, instantiationService) {
        super(`extensions.update`, localize('update', "Update"), UpdateAction_1.DisabledClass, false);
        this.verbose = verbose;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.dialogService = dialogService;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this.updateThrottler = new Throttler();
        this.update();
    }
    update() {
        this.updateThrottler.queue(() => this.computeAndUpdateEnablement());
        if (this.extension) {
            this.label = this.verbose ? localize('update to', "Update to v{0}", this.extension.latestVersion) : localize('update', "Update");
        }
    }
    async computeAndUpdateEnablement() {
        this.enabled = false;
        this.class = UpdateAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (this.extension.deprecationInfo) {
            return;
        }
        const canInstall = await this.extensionsWorkbenchService.canInstall(this.extension);
        const isInstalled = this.extension.state === 1 /* ExtensionState.Installed */;
        this.enabled = canInstall === true && isInstalled && this.extension.outdated;
        this.class = this.enabled ? UpdateAction_1.EnabledClass : UpdateAction_1.DisabledClass;
    }
    async run() {
        if (!this.extension) {
            return;
        }
        const consent = await this.extensionsWorkbenchService.shouldRequireConsentToUpdate(this.extension);
        if (consent) {
            const { result } = await this.dialogService.prompt({
                type: 'warning',
                title: localize('updateExtensionConsentTitle', "Update {0} Extension", this.extension.displayName),
                message: localize('updateExtensionConsent', "{0}\n\nWould you like to update the extension?", consent),
                buttons: [{
                        label: localize('update', "Update"),
                        run: () => 'update'
                    }, {
                        label: localize('review', "Review"),
                        run: () => 'review'
                    }, {
                        label: localize('cancel', "Cancel"),
                        run: () => 'cancel'
                    }]
            });
            if (result === 'cancel') {
                return;
            }
            if (result === 'review') {
                if (this.extension.hasChangelog()) {
                    return this.extensionsWorkbenchService.open(this.extension, { tab: "changelog" /* ExtensionEditorTab.Changelog */ });
                }
                if (this.extension.repository) {
                    return this.openerService.open(this.extension.repository);
                }
                return this.extensionsWorkbenchService.open(this.extension);
            }
        }
        alert(localize('updateExtensionStart', "Updating extension {0} to version {1} started.", this.extension.displayName, this.extension.latestVersion));
        return this.install(this.extension);
    }
    async install(extension) {
        const options = extension.local?.preRelease ? { installPreReleaseVersion: true } : undefined;
        try {
            await this.extensionsWorkbenchService.install(extension, options);
            alert(localize('updateExtensionComplete', "Updating extension {0} to version {1} completed.", extension.displayName, extension.latestVersion));
        }
        catch (err) {
            this.instantiationService.createInstance(PromptExtensionInstallFailureAction, extension, options, extension.latestVersion, 3 /* InstallOperation.Update */, err).run();
        }
    }
};
UpdateAction = UpdateAction_1 = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IDialogService),
    __param(3, IOpenerService),
    __param(4, IInstantiationService)
], UpdateAction);
export { UpdateAction };
let ToggleAutoUpdateForExtensionAction = class ToggleAutoUpdateForExtensionAction extends ExtensionAction {
    static { ToggleAutoUpdateForExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.toggleAutoUpdateForExtension'; }
    static { this.LABEL = localize2('enableAutoUpdateLabel', "Auto Update"); }
    static { this.EnabledClass = `${ExtensionAction.EXTENSION_ACTION_CLASS} auto-update`; }
    static { this.DisabledClass = `${this.EnabledClass} hide`; }
    constructor(extensionsWorkbenchService, extensionEnablementService, allowedExtensionsService, configurationService) {
        super(ToggleAutoUpdateForExtensionAction_1.ID, ToggleAutoUpdateForExtensionAction_1.LABEL.value, ToggleAutoUpdateForExtensionAction_1.DisabledClass);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.allowedExtensionsService = allowedExtensionsService;
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(AutoUpdateConfigurationKey)) {
                this.update();
            }
        }));
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(e => this.update()));
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ToggleAutoUpdateForExtensionAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (this.extension.isBuiltin) {
            return;
        }
        if (this.extension.deprecationInfo?.disallowInstall) {
            return;
        }
        const extension = this.extension.local ?? this.extension.gallery;
        if (extension && this.allowedExtensionsService.isAllowed(extension) !== true) {
            return;
        }
        if (this.extensionsWorkbenchService.getAutoUpdateValue() === 'onlyEnabledExtensions' && !this.extensionEnablementService.isEnabledEnablementState(this.extension.enablementState)) {
            return;
        }
        this.enabled = true;
        this.class = ToggleAutoUpdateForExtensionAction_1.EnabledClass;
        this.checked = this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension);
    }
    async run() {
        if (!this.extension) {
            return;
        }
        const enableAutoUpdate = !this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension);
        await this.extensionsWorkbenchService.updateAutoUpdateEnablementFor(this.extension, enableAutoUpdate);
        if (enableAutoUpdate) {
            alert(localize('enableAutoUpdate', "Enabled auto updates for", this.extension.displayName));
        }
        else {
            alert(localize('disableAutoUpdate', "Disabled auto updates for", this.extension.displayName));
        }
    }
};
ToggleAutoUpdateForExtensionAction = ToggleAutoUpdateForExtensionAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IWorkbenchExtensionEnablementService),
    __param(2, IAllowedExtensionsService),
    __param(3, IConfigurationService)
], ToggleAutoUpdateForExtensionAction);
export { ToggleAutoUpdateForExtensionAction };
let ToggleAutoUpdatesForPublisherAction = class ToggleAutoUpdatesForPublisherAction extends ExtensionAction {
    static { ToggleAutoUpdatesForPublisherAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.toggleAutoUpdatesForPublisher'; }
    static { this.LABEL = localize('toggleAutoUpdatesForPublisherLabel', "Auto Update All (From Publisher)"); }
    constructor(extensionsWorkbenchService) {
        super(ToggleAutoUpdatesForPublisherAction_1.ID, ToggleAutoUpdatesForPublisherAction_1.LABEL);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
    }
    update() { }
    async run() {
        if (!this.extension) {
            return;
        }
        alert(localize('ignoreExtensionUpdatePublisher', "Ignoring updates published by {0}.", this.extension.publisherDisplayName));
        const enableAutoUpdate = !this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension.publisher);
        await this.extensionsWorkbenchService.updateAutoUpdateEnablementFor(this.extension.publisher, enableAutoUpdate);
        if (enableAutoUpdate) {
            alert(localize('enableAutoUpdate', "Enabled auto updates for", this.extension.displayName));
        }
        else {
            alert(localize('disableAutoUpdate', "Disabled auto updates for", this.extension.displayName));
        }
    }
};
ToggleAutoUpdatesForPublisherAction = ToggleAutoUpdatesForPublisherAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService)
], ToggleAutoUpdatesForPublisherAction);
export { ToggleAutoUpdatesForPublisherAction };
let MigrateDeprecatedExtensionAction = class MigrateDeprecatedExtensionAction extends ExtensionAction {
    static { MigrateDeprecatedExtensionAction_1 = this; }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} migrate`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(small, extensionsWorkbenchService) {
        super('extensionsAction.migrateDeprecatedExtension', localize('migrateExtension', "Migrate"), MigrateDeprecatedExtensionAction_1.DisabledClass, false);
        this.small = small;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = MigrateDeprecatedExtensionAction_1.DisabledClass;
        if (!this.extension?.local) {
            return;
        }
        if (this.extension.state !== 1 /* ExtensionState.Installed */) {
            return;
        }
        if (!this.extension.deprecationInfo?.extension) {
            return;
        }
        const id = this.extension.deprecationInfo.extension.id;
        if (this.extensionsWorkbenchService.local.some(e => areSameExtensions(e.identifier, { id }))) {
            return;
        }
        this.enabled = true;
        this.class = MigrateDeprecatedExtensionAction_1.EnabledClass;
        this.tooltip = localize('migrate to', "Migrate to {0}", this.extension.deprecationInfo.extension.displayName);
        this.label = this.small ? localize('migrate', "Migrate") : this.tooltip;
    }
    async run() {
        if (!this.extension?.deprecationInfo?.extension) {
            return;
        }
        const local = this.extension.local;
        await this.extensionsWorkbenchService.uninstall(this.extension);
        const [extension] = await this.extensionsWorkbenchService.getExtensions([{ id: this.extension.deprecationInfo.extension.id, preRelease: this.extension.deprecationInfo?.extension?.preRelease }], CancellationToken.None);
        await this.extensionsWorkbenchService.install(extension, { isMachineScoped: local?.isMachineScoped });
    }
};
MigrateDeprecatedExtensionAction = MigrateDeprecatedExtensionAction_1 = __decorate([
    __param(1, IExtensionsWorkbenchService)
], MigrateDeprecatedExtensionAction);
export { MigrateDeprecatedExtensionAction };
let DropDownExtensionAction = class DropDownExtensionAction extends ExtensionAction {
    constructor(id, label, cssClass, enabled, instantiationService) {
        super(id, label, cssClass, enabled);
        this.instantiationService = instantiationService;
        this._actionViewItem = null;
    }
    createActionViewItem(options) {
        this._actionViewItem = this.instantiationService.createInstance(DropDownExtensionActionViewItem, this, options);
        return this._actionViewItem;
    }
    run(actionGroups) {
        this._actionViewItem?.showMenu(actionGroups);
        return Promise.resolve();
    }
};
DropDownExtensionAction = __decorate([
    __param(4, IInstantiationService)
], DropDownExtensionAction);
export { DropDownExtensionAction };
let DropDownExtensionActionViewItem = class DropDownExtensionActionViewItem extends ActionViewItem {
    constructor(action, options, contextMenuService) {
        super(null, action, { ...options, icon: true, label: true });
        this.contextMenuService = contextMenuService;
    }
    showMenu(menuActionGroups) {
        if (this.element) {
            const actions = this.getActions(menuActionGroups);
            const elementPosition = DOM.getDomNodePagePosition(this.element);
            const anchor = { x: elementPosition.left, y: elementPosition.top + elementPosition.height + 10 };
            this.contextMenuService.showContextMenu({
                getAnchor: () => anchor,
                getActions: () => actions,
                actionRunner: this.actionRunner,
                onHide: () => disposeIfDisposable(actions)
            });
        }
    }
    getActions(menuActionGroups) {
        let actions = [];
        for (const menuActions of menuActionGroups) {
            actions = [...actions, ...menuActions, new Separator()];
        }
        return actions.length ? actions.slice(0, actions.length - 1) : actions;
    }
};
DropDownExtensionActionViewItem = __decorate([
    __param(2, IContextMenuService)
], DropDownExtensionActionViewItem);
export { DropDownExtensionActionViewItem };
async function getContextMenuActionsGroups(extension, contextKeyService, instantiationService) {
    return instantiationService.invokeFunction(async (accessor) => {
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const extensionEnablementService = accessor.get(IWorkbenchExtensionEnablementService);
        const menuService = accessor.get(IMenuService);
        const extensionRecommendationsService = accessor.get(IExtensionRecommendationsService);
        const extensionIgnoredRecommendationsService = accessor.get(IExtensionIgnoredRecommendationsService);
        const workbenchThemeService = accessor.get(IWorkbenchThemeService);
        const authenticationUsageService = accessor.get(IAuthenticationUsageService);
        const allowedExtensionsService = accessor.get(IAllowedExtensionsService);
        const cksOverlay = [];
        if (extension) {
            cksOverlay.push(['extension', extension.identifier.id]);
            cksOverlay.push(['isBuiltinExtension', extension.isBuiltin]);
            cksOverlay.push(['isDefaultApplicationScopedExtension', extension.local && isApplicationScopedExtension(extension.local.manifest)]);
            cksOverlay.push(['isApplicationScopedExtension', extension.local && extension.local.isApplicationScoped]);
            cksOverlay.push(['isWorkspaceScopedExtension', extension.isWorkspaceScoped]);
            cksOverlay.push(['isGalleryExtension', !!extension.identifier.uuid]);
            if (extension.local) {
                cksOverlay.push(['extensionSource', extension.local.source]);
            }
            cksOverlay.push(['extensionHasConfiguration', extension.local && !!extension.local.manifest.contributes && !!extension.local.manifest.contributes.configuration]);
            cksOverlay.push(['extensionHasKeybindings', extension.local && !!extension.local.manifest.contributes && !!extension.local.manifest.contributes.keybindings]);
            cksOverlay.push(['extensionHasCommands', extension.local && !!extension.local.manifest.contributes && !!extension.local.manifest.contributes?.commands]);
            cksOverlay.push(['isExtensionRecommended', !!extensionRecommendationsService.getAllRecommendationsWithReason()[extension.identifier.id.toLowerCase()]]);
            cksOverlay.push(['isExtensionWorkspaceRecommended', extensionRecommendationsService.getAllRecommendationsWithReason()[extension.identifier.id.toLowerCase()]?.reasonId === 0 /* ExtensionRecommendationReason.Workspace */]);
            cksOverlay.push(['isUserIgnoredRecommendation', extensionIgnoredRecommendationsService.globalIgnoredRecommendations.some(e => e === extension.identifier.id.toLowerCase())]);
            cksOverlay.push(['isExtensionPinned', extension.pinned]);
            cksOverlay.push(['isExtensionEnabled', extensionEnablementService.isEnabledEnablementState(extension.enablementState)]);
            switch (extension.state) {
                case 0 /* ExtensionState.Installing */:
                    cksOverlay.push(['extensionStatus', 'installing']);
                    break;
                case 1 /* ExtensionState.Installed */:
                    cksOverlay.push(['extensionStatus', 'installed']);
                    break;
                case 2 /* ExtensionState.Uninstalling */:
                    cksOverlay.push(['extensionStatus', 'uninstalling']);
                    break;
                case 3 /* ExtensionState.Uninstalled */:
                    cksOverlay.push(['extensionStatus', 'uninstalled']);
                    break;
            }
            cksOverlay.push(['installedExtensionIsPreReleaseVersion', !!extension.local?.isPreReleaseVersion]);
            cksOverlay.push(['installedExtensionIsOptedToPreRelease', !!extension.local?.preRelease]);
            cksOverlay.push(['galleryExtensionIsPreReleaseVersion', !!extension.gallery?.properties.isPreReleaseVersion]);
            cksOverlay.push(['galleryExtensionHasPreReleaseVersion', extension.gallery?.hasPreReleaseVersion]);
            cksOverlay.push(['extensionHasPreReleaseVersion', extension.hasPreReleaseVersion]);
            cksOverlay.push(['extensionHasReleaseVersion', extension.hasReleaseVersion]);
            cksOverlay.push(['extensionDisallowInstall', extension.isMalicious || extension.deprecationInfo?.disallowInstall]);
            cksOverlay.push(['isExtensionAllowed', allowedExtensionsService.isAllowed({ id: extension.identifier.id, publisherDisplayName: extension.publisherDisplayName }) === true]);
            cksOverlay.push(['isPreReleaseExtensionAllowed', allowedExtensionsService.isAllowed({ id: extension.identifier.id, publisherDisplayName: extension.publisherDisplayName, prerelease: true }) === true]);
            cksOverlay.push(['extensionIsUnsigned', extension.gallery && !extension.gallery.isSigned]);
            const [colorThemes, fileIconThemes, productIconThemes, extensionUsesAuth] = await Promise.all([workbenchThemeService.getColorThemes(), workbenchThemeService.getFileIconThemes(), workbenchThemeService.getProductIconThemes(), authenticationUsageService.extensionUsesAuth(extension.identifier.id.toLowerCase())]);
            cksOverlay.push(['extensionHasColorThemes', colorThemes.some(theme => isThemeFromExtension(theme, extension))]);
            cksOverlay.push(['extensionHasFileIconThemes', fileIconThemes.some(theme => isThemeFromExtension(theme, extension))]);
            cksOverlay.push(['extensionHasProductIconThemes', productIconThemes.some(theme => isThemeFromExtension(theme, extension))]);
            cksOverlay.push(['extensionHasAccountPreferences', extensionUsesAuth]);
            cksOverlay.push(['canSetLanguage', extensionsWorkbenchService.canSetLanguage(extension)]);
            cksOverlay.push(['isActiveLanguagePackExtension', extension.gallery && language === getLocale(extension.gallery)]);
        }
        const actionsGroups = menuService.getMenuActions(MenuId.ExtensionContext, contextKeyService.createOverlay(cksOverlay), { shouldForwardArgs: true });
        return actionsGroups;
    });
}
function toActions(actionsGroups, instantiationService) {
    const result = [];
    for (const [, actions] of actionsGroups) {
        result.push(actions.map(action => {
            if (action instanceof SubmenuAction) {
                return action;
            }
            return instantiationService.createInstance(MenuItemExtensionAction, action);
        }));
    }
    return result;
}
export async function getContextMenuActions(extension, contextKeyService, instantiationService) {
    const actionsGroups = await getContextMenuActionsGroups(extension, contextKeyService, instantiationService);
    return toActions(actionsGroups, instantiationService);
}
let ManageExtensionAction = class ManageExtensionAction extends DropDownExtensionAction {
    static { ManageExtensionAction_1 = this; }
    static { this.ID = 'extensions.manage'; }
    static { this.Class = `${ExtensionAction.ICON_ACTION_CLASS} manage ` + ThemeIcon.asClassName(manageExtensionIcon); }
    static { this.HideManageExtensionClass = `${this.Class} hide`; }
    constructor(instantiationService, extensionService, contextKeyService) {
        super(ManageExtensionAction_1.ID, '', '', true, instantiationService);
        this.extensionService = extensionService;
        this.contextKeyService = contextKeyService;
        this.tooltip = localize('manage', "Manage");
        this.update();
    }
    async getActionGroups() {
        const groups = [];
        const contextMenuActionsGroups = await getContextMenuActionsGroups(this.extension, this.contextKeyService, this.instantiationService);
        const themeActions = [], installActions = [], updateActions = [], otherActionGroups = [];
        for (const [group, actions] of contextMenuActionsGroups) {
            if (group === INSTALL_ACTIONS_GROUP) {
                installActions.push(...toActions([[group, actions]], this.instantiationService)[0]);
            }
            else if (group === UPDATE_ACTIONS_GROUP) {
                updateActions.push(...toActions([[group, actions]], this.instantiationService)[0]);
            }
            else if (group === THEME_ACTIONS_GROUP) {
                themeActions.push(...toActions([[group, actions]], this.instantiationService)[0]);
            }
            else {
                otherActionGroups.push(...toActions([[group, actions]], this.instantiationService));
            }
        }
        if (themeActions.length) {
            groups.push(themeActions);
        }
        groups.push([
            this.instantiationService.createInstance(EnableGloballyAction),
            this.instantiationService.createInstance(EnableForWorkspaceAction)
        ]);
        groups.push([
            this.instantiationService.createInstance(DisableGloballyAction),
            this.instantiationService.createInstance(DisableForWorkspaceAction)
        ]);
        if (updateActions.length) {
            groups.push(updateActions);
        }
        groups.push([
            ...(installActions.length ? installActions : []),
            this.instantiationService.createInstance(InstallAnotherVersionAction, this.extension, false),
            this.instantiationService.createInstance(UninstallAction),
        ]);
        otherActionGroups.forEach(actions => groups.push(actions));
        groups.forEach(group => group.forEach(extensionAction => {
            if (extensionAction instanceof ExtensionAction) {
                extensionAction.extension = this.extension;
            }
        }));
        return groups;
    }
    async run() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        return super.run(await this.getActionGroups());
    }
    update() {
        this.class = ManageExtensionAction_1.HideManageExtensionClass;
        this.enabled = false;
        if (this.extension) {
            const state = this.extension.state;
            this.enabled = state === 1 /* ExtensionState.Installed */;
            this.class = this.enabled || state === 2 /* ExtensionState.Uninstalling */ ? ManageExtensionAction_1.Class : ManageExtensionAction_1.HideManageExtensionClass;
        }
    }
};
ManageExtensionAction = ManageExtensionAction_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionService),
    __param(2, IContextKeyService)
], ManageExtensionAction);
export { ManageExtensionAction };
export class ExtensionEditorManageExtensionAction extends DropDownExtensionAction {
    constructor(contextKeyService, instantiationService) {
        super('extensionEditor.manageExtension', '', `${ExtensionAction.ICON_ACTION_CLASS} manage ${ThemeIcon.asClassName(manageExtensionIcon)}`, true, instantiationService);
        this.contextKeyService = contextKeyService;
        this.tooltip = localize('manage', "Manage");
    }
    update() { }
    async run() {
        const actionGroups = [];
        (await getContextMenuActions(this.extension, this.contextKeyService, this.instantiationService)).forEach(actions => actionGroups.push(actions));
        actionGroups.forEach(group => group.forEach(extensionAction => {
            if (extensionAction instanceof ExtensionAction) {
                extensionAction.extension = this.extension;
            }
        }));
        return super.run(actionGroups);
    }
}
let MenuItemExtensionAction = class MenuItemExtensionAction extends ExtensionAction {
    constructor(action, extensionsWorkbenchService) {
        super(action.id, action.label);
        this.action = action;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
    }
    get enabled() {
        return this.action.enabled;
    }
    set enabled(value) {
        this.action.enabled = value;
    }
    update() {
        if (!this.extension) {
            return;
        }
        if (this.action.id === TOGGLE_IGNORE_EXTENSION_ACTION_ID) {
            this.checked = !this.extensionsWorkbenchService.isExtensionIgnoredToSync(this.extension);
        }
        else if (this.action.id === ToggleAutoUpdateForExtensionAction.ID) {
            this.checked = this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension);
        }
        else if (this.action.id === ToggleAutoUpdatesForPublisherAction.ID) {
            this.checked = this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension.publisher);
        }
        else {
            this.checked = this.action.checked;
        }
    }
    async run() {
        if (this.extension) {
            const id = this.extension.local ? getExtensionId(this.extension.local.manifest.publisher, this.extension.local.manifest.name)
                : this.extension.gallery ? getExtensionId(this.extension.gallery.publisher, this.extension.gallery.name)
                    : this.extension.identifier.id;
            const extensionArg = {
                id: this.extension.identifier.id,
                version: this.extension.version,
                location: this.extension.local?.location,
                galleryLink: this.extension.url
            };
            await this.action.run(id, extensionArg);
        }
    }
};
MenuItemExtensionAction = __decorate([
    __param(1, IExtensionsWorkbenchService)
], MenuItemExtensionAction);
export { MenuItemExtensionAction };
let TogglePreReleaseExtensionAction = class TogglePreReleaseExtensionAction extends ExtensionAction {
    static { TogglePreReleaseExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.togglePreRlease'; }
    static { this.LABEL = localize('togglePreRleaseLabel', "Pre-Release"); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} pre-release`; }
    static { this.DisabledClass = `${this.EnabledClass} hide`; }
    constructor(extensionsWorkbenchService, allowedExtensionsService) {
        super(TogglePreReleaseExtensionAction_1.ID, TogglePreReleaseExtensionAction_1.LABEL, TogglePreReleaseExtensionAction_1.DisabledClass);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.allowedExtensionsService = allowedExtensionsService;
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this.update()));
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = TogglePreReleaseExtensionAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (this.extension.isBuiltin) {
            return;
        }
        if (this.extension.state !== 1 /* ExtensionState.Installed */) {
            return;
        }
        if (!this.extension.hasPreReleaseVersion) {
            return;
        }
        if (!this.extension.gallery) {
            return;
        }
        if (this.extension.preRelease) {
            if (!this.extension.isPreReleaseVersion) {
                return;
            }
            if (this.allowedExtensionsService.isAllowed({ id: this.extension.identifier.id, publisherDisplayName: this.extension.publisherDisplayName }) !== true) {
                return;
            }
        }
        if (!this.extension.preRelease) {
            if (!this.extension.gallery.hasPreReleaseVersion) {
                return;
            }
            if (this.allowedExtensionsService.isAllowed(this.extension.gallery) !== true) {
                return;
            }
        }
        this.enabled = true;
        this.class = TogglePreReleaseExtensionAction_1.EnabledClass;
        if (this.extension.preRelease) {
            this.label = localize('togglePreRleaseDisableLabel', "Switch to Release Version");
            this.tooltip = localize('togglePreRleaseDisableTooltip', "This will switch and enable updates to release versions");
        }
        else {
            this.label = localize('switchToPreReleaseLabel', "Switch to Pre-Release Version");
            this.tooltip = localize('switchToPreReleaseTooltip', "This will switch to pre-release version and enable updates to latest version always");
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        this.extensionsWorkbenchService.open(this.extension, { showPreReleaseVersion: !this.extension.preRelease });
        await this.extensionsWorkbenchService.togglePreRelease(this.extension);
    }
};
TogglePreReleaseExtensionAction = TogglePreReleaseExtensionAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IAllowedExtensionsService)
], TogglePreReleaseExtensionAction);
export { TogglePreReleaseExtensionAction };
let InstallAnotherVersionAction = class InstallAnotherVersionAction extends ExtensionAction {
    static { InstallAnotherVersionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.install.anotherVersion'; }
    static { this.LABEL = localize('install another version', "Install Specific Version..."); }
    constructor(extension, whenInstalled, extensionsWorkbenchService, extensionManagementService, extensionGalleryService, quickInputService, instantiationService, dialogService, allowedExtensionsService) {
        super(InstallAnotherVersionAction_1.ID, InstallAnotherVersionAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.whenInstalled = whenInstalled;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionManagementService = extensionManagementService;
        this.extensionGalleryService = extensionGalleryService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.allowedExtensionsService = allowedExtensionsService;
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this.update()));
        this.extension = extension;
        this.update();
    }
    update() {
        this.enabled = !!this.extension && !this.extension.isBuiltin && !!this.extension.identifier.uuid && !this.extension.deprecationInfo
            && this.allowedExtensionsService.isAllowed({ id: this.extension.identifier.id, publisherDisplayName: this.extension.publisherDisplayName }) === true;
        if (this.enabled && this.whenInstalled) {
            this.enabled = !!this.extension?.local && !!this.extension.server && this.extension.state === 1 /* ExtensionState.Installed */;
        }
    }
    async run() {
        if (!this.enabled) {
            return;
        }
        if (!this.extension) {
            return;
        }
        const targetPlatform = this.extension.server ? await this.extension.server.extensionManagementService.getTargetPlatform() : await this.extensionManagementService.getTargetPlatform();
        const allVersions = await this.extensionGalleryService.getAllCompatibleVersions(this.extension.identifier, this.extension.local?.preRelease ?? this.extension.gallery?.properties.isPreReleaseVersion ?? false, targetPlatform);
        if (!allVersions.length) {
            await this.dialogService.info(localize('no versions', "This extension has no other versions."));
            return;
        }
        const picks = allVersions.map((v, i) => {
            return {
                id: v.version,
                label: v.version,
                description: `${fromNow(new Date(Date.parse(v.date)), true)}${v.isPreReleaseVersion ? ` (${localize('pre-release', "pre-release")})` : ''}${v.version === this.extension?.local?.manifest.version ? ` (${localize('current', "current")})` : ''}`,
                ariaLabel: `${v.isPreReleaseVersion ? 'Pre-Release version' : 'Release version'} ${v.version}`,
                isPreReleaseVersion: v.isPreReleaseVersion
            };
        });
        const pick = await this.quickInputService.pick(picks, {
            placeHolder: localize('selectVersion', "Select Version to Install"),
            matchOnDetail: true
        });
        if (pick) {
            if (this.extension.local?.manifest.version === pick.id) {
                return;
            }
            const options = { installPreReleaseVersion: pick.isPreReleaseVersion, version: pick.id };
            try {
                await this.extensionsWorkbenchService.install(this.extension, options);
            }
            catch (error) {
                this.instantiationService.createInstance(PromptExtensionInstallFailureAction, this.extension, options, pick.id, 2 /* InstallOperation.Install */, error).run();
            }
        }
        return null;
    }
};
InstallAnotherVersionAction = InstallAnotherVersionAction_1 = __decorate([
    __param(2, IExtensionsWorkbenchService),
    __param(3, IWorkbenchExtensionManagementService),
    __param(4, IExtensionGalleryService),
    __param(5, IQuickInputService),
    __param(6, IInstantiationService),
    __param(7, IDialogService),
    __param(8, IAllowedExtensionsService)
], InstallAnotherVersionAction);
export { InstallAnotherVersionAction };
let EnableForWorkspaceAction = class EnableForWorkspaceAction extends ExtensionAction {
    static { EnableForWorkspaceAction_1 = this; }
    static { this.ID = 'extensions.enableForWorkspace'; }
    static { this.LABEL = localize('enableForWorkspaceAction', "Enable (Workspace)"); }
    constructor(extensionsWorkbenchService, extensionEnablementService) {
        super(EnableForWorkspaceAction_1.ID, EnableForWorkspaceAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.tooltip = localize('enableForWorkspaceActionToolTip', "Enable this extension only in this workspace");
        this.update();
    }
    update() {
        this.enabled = false;
        if (this.extension && this.extension.local && !this.extension.isWorkspaceScoped) {
            this.enabled = this.extension.state === 1 /* ExtensionState.Installed */
                && !this.extensionEnablementService.isEnabled(this.extension.local)
                && this.extensionEnablementService.canChangeWorkspaceEnablement(this.extension.local);
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        return this.extensionsWorkbenchService.setEnablement(this.extension, 12 /* EnablementState.EnabledWorkspace */);
    }
};
EnableForWorkspaceAction = EnableForWorkspaceAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IWorkbenchExtensionEnablementService)
], EnableForWorkspaceAction);
export { EnableForWorkspaceAction };
let EnableGloballyAction = class EnableGloballyAction extends ExtensionAction {
    static { EnableGloballyAction_1 = this; }
    static { this.ID = 'extensions.enableGlobally'; }
    static { this.LABEL = localize('enableGloballyAction', "Enable"); }
    constructor(extensionsWorkbenchService, extensionEnablementService) {
        super(EnableGloballyAction_1.ID, EnableGloballyAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.tooltip = localize('enableGloballyActionToolTip', "Enable this extension");
        this.update();
    }
    update() {
        this.enabled = false;
        if (this.extension && this.extension.local && !this.extension.isWorkspaceScoped) {
            this.enabled = this.extension.state === 1 /* ExtensionState.Installed */
                && this.extensionEnablementService.isDisabledGlobally(this.extension.local)
                && this.extensionEnablementService.canChangeEnablement(this.extension.local);
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        return this.extensionsWorkbenchService.setEnablement(this.extension, 11 /* EnablementState.EnabledGlobally */);
    }
};
EnableGloballyAction = EnableGloballyAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IWorkbenchExtensionEnablementService)
], EnableGloballyAction);
export { EnableGloballyAction };
let DisableForWorkspaceAction = class DisableForWorkspaceAction extends ExtensionAction {
    static { DisableForWorkspaceAction_1 = this; }
    static { this.ID = 'extensions.disableForWorkspace'; }
    static { this.LABEL = localize('disableForWorkspaceAction', "Disable (Workspace)"); }
    constructor(workspaceContextService, extensionsWorkbenchService, extensionEnablementService, extensionService) {
        super(DisableForWorkspaceAction_1.ID, DisableForWorkspaceAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.workspaceContextService = workspaceContextService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionService = extensionService;
        this.tooltip = localize('disableForWorkspaceActionToolTip', "Disable this extension only in this workspace");
        this.update();
        this._register(this.extensionService.onDidChangeExtensions(() => this.update()));
    }
    update() {
        this.enabled = false;
        if (this.extension && this.extension.local && !this.extension.isWorkspaceScoped && this.extensionService.extensions.some(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier) && this.workspaceContextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */)) {
            this.enabled = this.extension.state === 1 /* ExtensionState.Installed */
                && (this.extension.enablementState === 11 /* EnablementState.EnabledGlobally */ || this.extension.enablementState === 12 /* EnablementState.EnabledWorkspace */)
                && this.extensionEnablementService.canChangeWorkspaceEnablement(this.extension.local);
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        return this.extensionsWorkbenchService.setEnablement(this.extension, 10 /* EnablementState.DisabledWorkspace */);
    }
};
DisableForWorkspaceAction = DisableForWorkspaceAction_1 = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IWorkbenchExtensionEnablementService),
    __param(3, IExtensionService)
], DisableForWorkspaceAction);
export { DisableForWorkspaceAction };
let DisableGloballyAction = class DisableGloballyAction extends ExtensionAction {
    static { DisableGloballyAction_1 = this; }
    static { this.ID = 'extensions.disableGlobally'; }
    static { this.LABEL = localize('disableGloballyAction', "Disable"); }
    constructor(extensionsWorkbenchService, extensionEnablementService, extensionService) {
        super(DisableGloballyAction_1.ID, DisableGloballyAction_1.LABEL, ExtensionAction.LABEL_ACTION_CLASS);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionService = extensionService;
        this.tooltip = localize('disableGloballyActionToolTip', "Disable this extension");
        this.update();
        this._register(this.extensionService.onDidChangeExtensions(() => this.update()));
    }
    update() {
        this.enabled = false;
        if (this.extension && this.extension.local && !this.extension.isWorkspaceScoped && this.extensionService.extensions.some(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier))) {
            this.enabled = this.extension.state === 1 /* ExtensionState.Installed */
                && (this.extension.enablementState === 11 /* EnablementState.EnabledGlobally */ || this.extension.enablementState === 12 /* EnablementState.EnabledWorkspace */)
                && this.extensionEnablementService.canChangeEnablement(this.extension.local);
        }
    }
    async run() {
        if (!this.extension) {
            return;
        }
        return this.extensionsWorkbenchService.setEnablement(this.extension, 9 /* EnablementState.DisabledGlobally */);
    }
};
DisableGloballyAction = DisableGloballyAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IWorkbenchExtensionEnablementService),
    __param(2, IExtensionService)
], DisableGloballyAction);
export { DisableGloballyAction };
let EnableDropDownAction = class EnableDropDownAction extends ButtonWithDropDownExtensionAction {
    constructor(instantiationService) {
        super('extensions.enable', ExtensionAction.LABEL_ACTION_CLASS, [
            [
                instantiationService.createInstance(EnableGloballyAction),
                instantiationService.createInstance(EnableForWorkspaceAction)
            ]
        ]);
    }
};
EnableDropDownAction = __decorate([
    __param(0, IInstantiationService)
], EnableDropDownAction);
export { EnableDropDownAction };
let DisableDropDownAction = class DisableDropDownAction extends ButtonWithDropDownExtensionAction {
    constructor(instantiationService) {
        super('extensions.disable', ExtensionAction.LABEL_ACTION_CLASS, [[
                instantiationService.createInstance(DisableGloballyAction),
                instantiationService.createInstance(DisableForWorkspaceAction)
            ]]);
    }
};
DisableDropDownAction = __decorate([
    __param(0, IInstantiationService)
], DisableDropDownAction);
export { DisableDropDownAction };
let ExtensionRuntimeStateAction = class ExtensionRuntimeStateAction extends ExtensionAction {
    static { ExtensionRuntimeStateAction_1 = this; }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} reload`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(hostService, extensionsWorkbenchService, updateService, extensionService, productService, telemetryService) {
        super('extensions.runtimeState', '', ExtensionRuntimeStateAction_1.DisabledClass, false);
        this.hostService = hostService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.updateService = updateService;
        this.extensionService = extensionService;
        this.productService = productService;
        this.telemetryService = telemetryService;
        this.updateWhenCounterExtensionChanges = true;
        this._register(this.extensionService.onDidChangeExtensions(() => this.update()));
        this.update();
    }
    update() {
        this.enabled = false;
        this.tooltip = '';
        this.class = ExtensionRuntimeStateAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        const state = this.extension.state;
        if (state === 0 /* ExtensionState.Installing */ || state === 2 /* ExtensionState.Uninstalling */) {
            return;
        }
        if (this.extension.local && this.extension.local.manifest && this.extension.local.manifest.contributes && this.extension.local.manifest.contributes.localizations && this.extension.local.manifest.contributes.localizations.length > 0) {
            return;
        }
        const runtimeState = this.extension.runtimeState;
        if (!runtimeState) {
            return;
        }
        this.enabled = true;
        this.class = ExtensionRuntimeStateAction_1.EnabledClass;
        this.tooltip = runtimeState.reason;
        this.label = runtimeState.action === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */ ? localize('reload window', 'Reload Window')
            : runtimeState.action === "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */ ? localize('restart extensions', 'Restart Extensions')
                : runtimeState.action === "quitAndInstall" /* ExtensionRuntimeActionType.QuitAndInstall */ ? localize('restart product', 'Restart to Update')
                    : runtimeState.action === "applyUpdate" /* ExtensionRuntimeActionType.ApplyUpdate */ || runtimeState.action === "downloadUpdate" /* ExtensionRuntimeActionType.DownloadUpdate */ ? localize('update product', 'Update {0}', this.productService.nameShort) : '';
    }
    async run() {
        const runtimeState = this.extension?.runtimeState;
        if (!runtimeState?.action) {
            return;
        }
        this.telemetryService.publicLog2('extensions:runtimestate:action', {
            action: runtimeState.action
        });
        if (runtimeState?.action === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */) {
            return this.hostService.reload();
        }
        else if (runtimeState?.action === "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */) {
            return this.extensionsWorkbenchService.updateRunningExtensions();
        }
        else if (runtimeState?.action === "downloadUpdate" /* ExtensionRuntimeActionType.DownloadUpdate */) {
            return this.updateService.downloadUpdate();
        }
        else if (runtimeState?.action === "applyUpdate" /* ExtensionRuntimeActionType.ApplyUpdate */) {
            return this.updateService.applyUpdate();
        }
        else if (runtimeState?.action === "quitAndInstall" /* ExtensionRuntimeActionType.QuitAndInstall */) {
            return this.updateService.quitAndInstall();
        }
    }
};
ExtensionRuntimeStateAction = ExtensionRuntimeStateAction_1 = __decorate([
    __param(0, IHostService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IUpdateService),
    __param(3, IExtensionService),
    __param(4, IProductService),
    __param(5, ITelemetryService)
], ExtensionRuntimeStateAction);
export { ExtensionRuntimeStateAction };
function isThemeFromExtension(theme, extension) {
    return !!(extension && theme.extensionData && ExtensionIdentifier.equals(theme.extensionData.extensionId, extension.identifier.id));
}
function getQuickPickEntries(themes, currentTheme, extension, showCurrentTheme) {
    const picks = [];
    for (const theme of themes) {
        if (isThemeFromExtension(theme, extension) && !(showCurrentTheme && theme === currentTheme)) {
            picks.push({ label: theme.label, id: theme.id });
        }
    }
    if (showCurrentTheme) {
        picks.push({ type: 'separator', label: localize('current', "current") });
        picks.push({ label: currentTheme.label, id: currentTheme.id });
    }
    return picks;
}
let SetColorThemeAction = class SetColorThemeAction extends ExtensionAction {
    static { SetColorThemeAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.setColorTheme'; }
    static { this.TITLE = localize2('workbench.extensions.action.setColorTheme', 'Set Color Theme'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} theme`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionService, workbenchThemeService, quickInputService, extensionEnablementService) {
        super(SetColorThemeAction_1.ID, SetColorThemeAction_1.TITLE.value, SetColorThemeAction_1.DisabledClass, false);
        this.workbenchThemeService = workbenchThemeService;
        this.quickInputService = quickInputService;
        this.extensionEnablementService = extensionEnablementService;
        this._register(Event.any(extensionService.onDidChangeExtensions, workbenchThemeService.onDidColorThemeChange)(() => this.update(), this));
        this.update();
    }
    update() {
        this.workbenchThemeService.getColorThemes().then(colorThemes => {
            this.enabled = this.computeEnablement(colorThemes);
            this.class = this.enabled ? SetColorThemeAction_1.EnabledClass : SetColorThemeAction_1.DisabledClass;
        });
    }
    computeEnablement(colorThemes) {
        return !!this.extension && this.extension.state === 1 /* ExtensionState.Installed */ && this.extensionEnablementService.isEnabledEnablementState(this.extension.enablementState) && colorThemes.some(th => isThemeFromExtension(th, this.extension));
    }
    async run({ showCurrentTheme, ignoreFocusLost } = { showCurrentTheme: false, ignoreFocusLost: false }) {
        const colorThemes = await this.workbenchThemeService.getColorThemes();
        if (!this.computeEnablement(colorThemes)) {
            return;
        }
        const currentTheme = this.workbenchThemeService.getColorTheme();
        const delayer = new Delayer(100);
        const picks = getQuickPickEntries(colorThemes, currentTheme, this.extension, showCurrentTheme);
        const pickedTheme = await this.quickInputService.pick(picks, {
            placeHolder: localize('select color theme', "Select Color Theme"),
            onDidFocus: item => delayer.trigger(() => this.workbenchThemeService.setColorTheme(item.id, undefined)),
            ignoreFocusLost
        });
        return this.workbenchThemeService.setColorTheme(pickedTheme ? pickedTheme.id : currentTheme.id, 'auto');
    }
};
SetColorThemeAction = SetColorThemeAction_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IWorkbenchThemeService),
    __param(2, IQuickInputService),
    __param(3, IWorkbenchExtensionEnablementService)
], SetColorThemeAction);
export { SetColorThemeAction };
let SetFileIconThemeAction = class SetFileIconThemeAction extends ExtensionAction {
    static { SetFileIconThemeAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.setFileIconTheme'; }
    static { this.TITLE = localize2('workbench.extensions.action.setFileIconTheme', 'Set File Icon Theme'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} theme`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionService, workbenchThemeService, quickInputService, extensionEnablementService) {
        super(SetFileIconThemeAction_1.ID, SetFileIconThemeAction_1.TITLE.value, SetFileIconThemeAction_1.DisabledClass, false);
        this.workbenchThemeService = workbenchThemeService;
        this.quickInputService = quickInputService;
        this.extensionEnablementService = extensionEnablementService;
        this._register(Event.any(extensionService.onDidChangeExtensions, workbenchThemeService.onDidFileIconThemeChange)(() => this.update(), this));
        this.update();
    }
    update() {
        this.workbenchThemeService.getFileIconThemes().then(fileIconThemes => {
            this.enabled = this.computeEnablement(fileIconThemes);
            this.class = this.enabled ? SetFileIconThemeAction_1.EnabledClass : SetFileIconThemeAction_1.DisabledClass;
        });
    }
    computeEnablement(colorThemfileIconThemess) {
        return !!this.extension && this.extension.state === 1 /* ExtensionState.Installed */ && this.extensionEnablementService.isEnabledEnablementState(this.extension.enablementState) && colorThemfileIconThemess.some(th => isThemeFromExtension(th, this.extension));
    }
    async run({ showCurrentTheme, ignoreFocusLost } = { showCurrentTheme: false, ignoreFocusLost: false }) {
        const fileIconThemes = await this.workbenchThemeService.getFileIconThemes();
        if (!this.computeEnablement(fileIconThemes)) {
            return;
        }
        const currentTheme = this.workbenchThemeService.getFileIconTheme();
        const delayer = new Delayer(100);
        const picks = getQuickPickEntries(fileIconThemes, currentTheme, this.extension, showCurrentTheme);
        const pickedTheme = await this.quickInputService.pick(picks, {
            placeHolder: localize('select file icon theme', "Select File Icon Theme"),
            onDidFocus: item => delayer.trigger(() => this.workbenchThemeService.setFileIconTheme(item.id, undefined)),
            ignoreFocusLost
        });
        return this.workbenchThemeService.setFileIconTheme(pickedTheme ? pickedTheme.id : currentTheme.id, 'auto');
    }
};
SetFileIconThemeAction = SetFileIconThemeAction_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IWorkbenchThemeService),
    __param(2, IQuickInputService),
    __param(3, IWorkbenchExtensionEnablementService)
], SetFileIconThemeAction);
export { SetFileIconThemeAction };
let SetProductIconThemeAction = class SetProductIconThemeAction extends ExtensionAction {
    static { SetProductIconThemeAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.setProductIconTheme'; }
    static { this.TITLE = localize2('workbench.extensions.action.setProductIconTheme', 'Set Product Icon Theme'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} theme`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionService, workbenchThemeService, quickInputService, extensionEnablementService) {
        super(SetProductIconThemeAction_1.ID, SetProductIconThemeAction_1.TITLE.value, SetProductIconThemeAction_1.DisabledClass, false);
        this.workbenchThemeService = workbenchThemeService;
        this.quickInputService = quickInputService;
        this.extensionEnablementService = extensionEnablementService;
        this._register(Event.any(extensionService.onDidChangeExtensions, workbenchThemeService.onDidProductIconThemeChange)(() => this.update(), this));
        this.update();
    }
    update() {
        this.workbenchThemeService.getProductIconThemes().then(productIconThemes => {
            this.enabled = this.computeEnablement(productIconThemes);
            this.class = this.enabled ? SetProductIconThemeAction_1.EnabledClass : SetProductIconThemeAction_1.DisabledClass;
        });
    }
    computeEnablement(productIconThemes) {
        return !!this.extension && this.extension.state === 1 /* ExtensionState.Installed */ && this.extensionEnablementService.isEnabledEnablementState(this.extension.enablementState) && productIconThemes.some(th => isThemeFromExtension(th, this.extension));
    }
    async run({ showCurrentTheme, ignoreFocusLost } = { showCurrentTheme: false, ignoreFocusLost: false }) {
        const productIconThemes = await this.workbenchThemeService.getProductIconThemes();
        if (!this.computeEnablement(productIconThemes)) {
            return;
        }
        const currentTheme = this.workbenchThemeService.getProductIconTheme();
        const delayer = new Delayer(100);
        const picks = getQuickPickEntries(productIconThemes, currentTheme, this.extension, showCurrentTheme);
        const pickedTheme = await this.quickInputService.pick(picks, {
            placeHolder: localize('select product icon theme', "Select Product Icon Theme"),
            onDidFocus: item => delayer.trigger(() => this.workbenchThemeService.setProductIconTheme(item.id, undefined)),
            ignoreFocusLost
        });
        return this.workbenchThemeService.setProductIconTheme(pickedTheme ? pickedTheme.id : currentTheme.id, 'auto');
    }
};
SetProductIconThemeAction = SetProductIconThemeAction_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IWorkbenchThemeService),
    __param(2, IQuickInputService),
    __param(3, IWorkbenchExtensionEnablementService)
], SetProductIconThemeAction);
export { SetProductIconThemeAction };
let SetLanguageAction = class SetLanguageAction extends ExtensionAction {
    static { SetLanguageAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.setDisplayLanguage'; }
    static { this.TITLE = localize2('workbench.extensions.action.setDisplayLanguage', 'Set Display Language'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} language`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionsWorkbenchService) {
        super(SetLanguageAction_1.ID, SetLanguageAction_1.TITLE.value, SetLanguageAction_1.DisabledClass, false);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = SetLanguageAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (!this.extensionsWorkbenchService.canSetLanguage(this.extension)) {
            return;
        }
        if (this.extension.gallery && language === getLocale(this.extension.gallery)) {
            return;
        }
        this.enabled = true;
        this.class = SetLanguageAction_1.EnabledClass;
    }
    async run() {
        return this.extension && this.extensionsWorkbenchService.setLanguage(this.extension);
    }
};
SetLanguageAction = SetLanguageAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService)
], SetLanguageAction);
export { SetLanguageAction };
let ClearLanguageAction = class ClearLanguageAction extends ExtensionAction {
    static { ClearLanguageAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.clearLanguage'; }
    static { this.TITLE = localize2('workbench.extensions.action.clearLanguage', 'Clear Display Language'); }
    static { this.EnabledClass = `${ExtensionAction.LABEL_ACTION_CLASS} language`; }
    static { this.DisabledClass = `${this.EnabledClass} disabled`; }
    constructor(extensionsWorkbenchService, localeService) {
        super(ClearLanguageAction_1.ID, ClearLanguageAction_1.TITLE.value, ClearLanguageAction_1.DisabledClass, false);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.localeService = localeService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ClearLanguageAction_1.DisabledClass;
        if (!this.extension) {
            return;
        }
        if (!this.extensionsWorkbenchService.canSetLanguage(this.extension)) {
            return;
        }
        if (this.extension.gallery && language !== getLocale(this.extension.gallery)) {
            return;
        }
        this.enabled = true;
        this.class = ClearLanguageAction_1.EnabledClass;
    }
    async run() {
        return this.extension && this.localeService.clearLocalePreference();
    }
};
ClearLanguageAction = ClearLanguageAction_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, ILocaleService)
], ClearLanguageAction);
export { ClearLanguageAction };
let ShowRecommendedExtensionAction = class ShowRecommendedExtensionAction extends Action {
    static { ShowRecommendedExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.showRecommendedExtension'; }
    static { this.LABEL = localize('showRecommendedExtension', "Show Recommended Extension"); }
    constructor(extensionId, extensionWorkbenchService) {
        super(ShowRecommendedExtensionAction_1.ID, ShowRecommendedExtensionAction_1.LABEL, undefined, false);
        this.extensionWorkbenchService = extensionWorkbenchService;
        this.extensionId = extensionId;
    }
    async run() {
        await this.extensionWorkbenchService.openSearch(`@id:${this.extensionId}`);
        const [extension] = await this.extensionWorkbenchService.getExtensions([{ id: this.extensionId }], { source: 'install-recommendation' }, CancellationToken.None);
        if (extension) {
            return this.extensionWorkbenchService.open(extension);
        }
        return null;
    }
};
ShowRecommendedExtensionAction = ShowRecommendedExtensionAction_1 = __decorate([
    __param(1, IExtensionsWorkbenchService)
], ShowRecommendedExtensionAction);
export { ShowRecommendedExtensionAction };
let InstallRecommendedExtensionAction = class InstallRecommendedExtensionAction extends Action {
    static { InstallRecommendedExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.installRecommendedExtension'; }
    static { this.LABEL = localize('installRecommendedExtension', "Install Recommended Extension"); }
    constructor(extensionId, instantiationService, extensionWorkbenchService) {
        super(InstallRecommendedExtensionAction_1.ID, InstallRecommendedExtensionAction_1.LABEL, undefined, false);
        this.instantiationService = instantiationService;
        this.extensionWorkbenchService = extensionWorkbenchService;
        this.extensionId = extensionId;
    }
    async run() {
        await this.extensionWorkbenchService.openSearch(`@id:${this.extensionId}`);
        const [extension] = await this.extensionWorkbenchService.getExtensions([{ id: this.extensionId }], { source: 'install-recommendation' }, CancellationToken.None);
        if (extension) {
            await this.extensionWorkbenchService.open(extension);
            try {
                await this.extensionWorkbenchService.install(extension);
            }
            catch (err) {
                this.instantiationService.createInstance(PromptExtensionInstallFailureAction, extension, undefined, extension.latestVersion, 2 /* InstallOperation.Install */, err).run();
            }
        }
    }
};
InstallRecommendedExtensionAction = InstallRecommendedExtensionAction_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IExtensionsWorkbenchService)
], InstallRecommendedExtensionAction);
export { InstallRecommendedExtensionAction };
let IgnoreExtensionRecommendationAction = class IgnoreExtensionRecommendationAction extends Action {
    static { IgnoreExtensionRecommendationAction_1 = this; }
    static { this.ID = 'extensions.ignore'; }
    static { this.Class = `${ExtensionAction.LABEL_ACTION_CLASS} ignore`; }
    constructor(extension, extensionRecommendationsManagementService) {
        super(IgnoreExtensionRecommendationAction_1.ID, 'Ignore Recommendation');
        this.extension = extension;
        this.extensionRecommendationsManagementService = extensionRecommendationsManagementService;
        this.class = IgnoreExtensionRecommendationAction_1.Class;
        this.tooltip = localize('ignoreExtensionRecommendation', "Do not recommend this extension again");
        this.enabled = true;
    }
    run() {
        this.extensionRecommendationsManagementService.toggleGlobalIgnoredRecommendation(this.extension.identifier.id, true);
        return Promise.resolve();
    }
};
IgnoreExtensionRecommendationAction = IgnoreExtensionRecommendationAction_1 = __decorate([
    __param(1, IExtensionIgnoredRecommendationsService)
], IgnoreExtensionRecommendationAction);
export { IgnoreExtensionRecommendationAction };
let UndoIgnoreExtensionRecommendationAction = class UndoIgnoreExtensionRecommendationAction extends Action {
    static { UndoIgnoreExtensionRecommendationAction_1 = this; }
    static { this.ID = 'extensions.ignore'; }
    static { this.Class = `${ExtensionAction.LABEL_ACTION_CLASS} undo-ignore`; }
    constructor(extension, extensionRecommendationsManagementService) {
        super(UndoIgnoreExtensionRecommendationAction_1.ID, 'Undo');
        this.extension = extension;
        this.extensionRecommendationsManagementService = extensionRecommendationsManagementService;
        this.class = UndoIgnoreExtensionRecommendationAction_1.Class;
        this.tooltip = localize('undo', "Undo");
        this.enabled = true;
    }
    run() {
        this.extensionRecommendationsManagementService.toggleGlobalIgnoredRecommendation(this.extension.identifier.id, false);
        return Promise.resolve();
    }
};
UndoIgnoreExtensionRecommendationAction = UndoIgnoreExtensionRecommendationAction_1 = __decorate([
    __param(1, IExtensionIgnoredRecommendationsService)
], UndoIgnoreExtensionRecommendationAction);
export { UndoIgnoreExtensionRecommendationAction };
let AbstractConfigureRecommendedExtensionsAction = class AbstractConfigureRecommendedExtensionsAction extends Action {
    constructor(id, label, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService) {
        super(id, label);
        this.contextService = contextService;
        this.fileService = fileService;
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.jsonEditingService = jsonEditingService;
        this.textModelResolverService = textModelResolverService;
    }
    openExtensionsFile(extensionsFileResource) {
        return this.getOrCreateExtensionsFile(extensionsFileResource)
            .then(({ created, content }) => this.getSelectionPosition(content, extensionsFileResource, ['recommendations'])
            .then(selection => this.editorService.openEditor({
            resource: extensionsFileResource,
            options: {
                pinned: created,
                selection
            }
        })), error => Promise.reject(new Error(localize('OpenExtensionsFile.failed', "Unable to create 'extensions.json' file inside the '.vscode' folder ({0}).", error))));
    }
    openWorkspaceConfigurationFile(workspaceConfigurationFile) {
        return this.getOrUpdateWorkspaceConfigurationFile(workspaceConfigurationFile)
            .then(content => this.getSelectionPosition(content.value.toString(), content.resource, ['extensions', 'recommendations']))
            .then(selection => this.editorService.openEditor({
            resource: workspaceConfigurationFile,
            options: {
                selection,
                forceReload: true // because content has changed
            }
        }));
    }
    getOrUpdateWorkspaceConfigurationFile(workspaceConfigurationFile) {
        return Promise.resolve(this.fileService.readFile(workspaceConfigurationFile))
            .then(content => {
            const workspaceRecommendations = json.parse(content.value.toString())['extensions'];
            if (!workspaceRecommendations || !workspaceRecommendations.recommendations) {
                return this.jsonEditingService.write(workspaceConfigurationFile, [{ path: ['extensions'], value: { recommendations: [] } }], true)
                    .then(() => this.fileService.readFile(workspaceConfigurationFile));
            }
            return content;
        });
    }
    getSelectionPosition(content, resource, path) {
        const tree = json.parseTree(content);
        const node = json.findNodeAtLocation(tree, path);
        if (node && node.parent && node.parent.children) {
            const recommendationsValueNode = node.parent.children[1];
            const lastExtensionNode = recommendationsValueNode.children && recommendationsValueNode.children.length ? recommendationsValueNode.children[recommendationsValueNode.children.length - 1] : null;
            const offset = lastExtensionNode ? lastExtensionNode.offset + lastExtensionNode.length : recommendationsValueNode.offset + 1;
            return Promise.resolve(this.textModelResolverService.createModelReference(resource))
                .then(reference => {
                const position = reference.object.textEditorModel.getPositionAt(offset);
                reference.dispose();
                return {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                };
            });
        }
        return Promise.resolve(undefined);
    }
    getOrCreateExtensionsFile(extensionsFileResource) {
        return Promise.resolve(this.fileService.readFile(extensionsFileResource)).then(content => {
            return { created: false, extensionsFileResource, content: content.value.toString() };
        }, err => {
            return this.textFileService.write(extensionsFileResource, ExtensionsConfigurationInitialContent).then(() => {
                return { created: true, extensionsFileResource, content: ExtensionsConfigurationInitialContent };
            });
        });
    }
};
AbstractConfigureRecommendedExtensionsAction = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IFileService),
    __param(4, ITextFileService),
    __param(5, IEditorService),
    __param(6, IJSONEditingService),
    __param(7, ITextModelService)
], AbstractConfigureRecommendedExtensionsAction);
export { AbstractConfigureRecommendedExtensionsAction };
let ConfigureWorkspaceRecommendedExtensionsAction = class ConfigureWorkspaceRecommendedExtensionsAction extends AbstractConfigureRecommendedExtensionsAction {
    static { this.ID = 'workbench.extensions.action.configureWorkspaceRecommendedExtensions'; }
    static { this.LABEL = localize('configureWorkspaceRecommendedExtensions', "Configure Recommended Extensions (Workspace)"); }
    constructor(id, label, fileService, textFileService, contextService, editorService, jsonEditingService, textModelResolverService) {
        super(id, label, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService);
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.update(), this));
        this.update();
    }
    update() {
        this.enabled = this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */;
    }
    run() {
        switch (this.contextService.getWorkbenchState()) {
            case 2 /* WorkbenchState.FOLDER */:
                return this.openExtensionsFile(this.contextService.getWorkspace().folders[0].toResource(EXTENSIONS_CONFIG));
            case 3 /* WorkbenchState.WORKSPACE */:
                return this.openWorkspaceConfigurationFile(this.contextService.getWorkspace().configuration);
        }
        return Promise.resolve();
    }
};
ConfigureWorkspaceRecommendedExtensionsAction = __decorate([
    __param(2, IFileService),
    __param(3, ITextFileService),
    __param(4, IWorkspaceContextService),
    __param(5, IEditorService),
    __param(6, IJSONEditingService),
    __param(7, ITextModelService)
], ConfigureWorkspaceRecommendedExtensionsAction);
export { ConfigureWorkspaceRecommendedExtensionsAction };
let ConfigureWorkspaceFolderRecommendedExtensionsAction = class ConfigureWorkspaceFolderRecommendedExtensionsAction extends AbstractConfigureRecommendedExtensionsAction {
    static { this.ID = 'workbench.extensions.action.configureWorkspaceFolderRecommendedExtensions'; }
    static { this.LABEL = localize('configureWorkspaceFolderRecommendedExtensions', "Configure Recommended Extensions (Workspace Folder)"); }
    constructor(id, label, fileService, textFileService, contextService, editorService, jsonEditingService, textModelResolverService, commandService) {
        super(id, label, contextService, fileService, textFileService, editorService, jsonEditingService, textModelResolverService);
        this.commandService = commandService;
    }
    run() {
        const folderCount = this.contextService.getWorkspace().folders.length;
        const pickFolderPromise = folderCount === 1 ? Promise.resolve(this.contextService.getWorkspace().folders[0]) : this.commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
        return Promise.resolve(pickFolderPromise)
            .then(workspaceFolder => {
            if (workspaceFolder) {
                return this.openExtensionsFile(workspaceFolder.toResource(EXTENSIONS_CONFIG));
            }
            return null;
        });
    }
};
ConfigureWorkspaceFolderRecommendedExtensionsAction = __decorate([
    __param(2, IFileService),
    __param(3, ITextFileService),
    __param(4, IWorkspaceContextService),
    __param(5, IEditorService),
    __param(6, IJSONEditingService),
    __param(7, ITextModelService),
    __param(8, ICommandService)
], ConfigureWorkspaceFolderRecommendedExtensionsAction);
export { ConfigureWorkspaceFolderRecommendedExtensionsAction };
let ExtensionStatusLabelAction = class ExtensionStatusLabelAction extends Action {
    static { ExtensionStatusLabelAction_1 = this; }
    static { this.ENABLED_CLASS = `${ExtensionAction.TEXT_ACTION_CLASS} extension-status-label`; }
    static { this.DISABLED_CLASS = `${this.ENABLED_CLASS} hide`; }
    get extension() { return this._extension; }
    set extension(extension) {
        if (!(this._extension && extension && areSameExtensions(this._extension.identifier, extension.identifier))) {
            // Different extension. Reset
            this.initialStatus = null;
            this.status = null;
            this.enablementState = null;
        }
        this._extension = extension;
        this.update();
    }
    constructor(extensionService, extensionManagementServerService, extensionEnablementService) {
        super('extensions.action.statusLabel', '', ExtensionStatusLabelAction_1.DISABLED_CLASS, false);
        this.extensionService = extensionService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionEnablementService = extensionEnablementService;
        this.initialStatus = null;
        this.status = null;
        this.version = null;
        this.enablementState = null;
        this._extension = null;
    }
    update() {
        const label = this.computeLabel();
        this.label = label || '';
        this.class = label ? ExtensionStatusLabelAction_1.ENABLED_CLASS : ExtensionStatusLabelAction_1.DISABLED_CLASS;
    }
    computeLabel() {
        if (!this.extension) {
            return null;
        }
        const currentStatus = this.status;
        const currentVersion = this.version;
        const currentEnablementState = this.enablementState;
        this.status = this.extension.state;
        this.version = this.extension.version;
        if (this.initialStatus === null) {
            this.initialStatus = this.status;
        }
        this.enablementState = this.extension.enablementState;
        const canAddExtension = () => {
            const runningExtension = this.extensionService.extensions.filter(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier))[0];
            if (this.extension.local) {
                if (runningExtension && this.extension.version === runningExtension.version) {
                    return true;
                }
                return this.extensionService.canAddExtension(toExtensionDescription(this.extension.local));
            }
            return false;
        };
        const canRemoveExtension = () => {
            if (this.extension.local) {
                if (this.extensionService.extensions.every(e => !(areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier) && this.extension.server === this.extensionManagementServerService.getExtensionManagementServer(toExtension(e))))) {
                    return true;
                }
                return this.extensionService.canRemoveExtension(toExtensionDescription(this.extension.local));
            }
            return false;
        };
        if (currentStatus !== null) {
            if (currentStatus === 0 /* ExtensionState.Installing */ && this.status === 1 /* ExtensionState.Installed */) {
                if (this.initialStatus === 3 /* ExtensionState.Uninstalled */ && canAddExtension()) {
                    return localize('installed', "Installed");
                }
                if (this.initialStatus === 1 /* ExtensionState.Installed */ && this.version !== currentVersion && canAddExtension()) {
                    return localize('updated', "Updated");
                }
                return null;
            }
            if (currentStatus === 2 /* ExtensionState.Uninstalling */ && this.status === 3 /* ExtensionState.Uninstalled */) {
                this.initialStatus = this.status;
                return canRemoveExtension() ? localize('uninstalled', "Uninstalled") : null;
            }
        }
        if (currentEnablementState !== null) {
            const currentlyEnabled = this.extensionEnablementService.isEnabledEnablementState(currentEnablementState);
            const enabled = this.extensionEnablementService.isEnabledEnablementState(this.enablementState);
            if (!currentlyEnabled && enabled) {
                return canAddExtension() ? localize('enabled', "Enabled") : null;
            }
            if (currentlyEnabled && !enabled) {
                return canRemoveExtension() ? localize('disabled', "Disabled") : null;
            }
        }
        return null;
    }
    run() {
        return Promise.resolve();
    }
};
ExtensionStatusLabelAction = ExtensionStatusLabelAction_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IExtensionManagementServerService),
    __param(2, IWorkbenchExtensionEnablementService)
], ExtensionStatusLabelAction);
export { ExtensionStatusLabelAction };
let ToggleSyncExtensionAction = class ToggleSyncExtensionAction extends DropDownExtensionAction {
    static { ToggleSyncExtensionAction_1 = this; }
    static { this.IGNORED_SYNC_CLASS = `${ExtensionAction.ICON_ACTION_CLASS} extension-sync ${ThemeIcon.asClassName(syncIgnoredIcon)}`; }
    static { this.SYNC_CLASS = `${this.ICON_ACTION_CLASS} extension-sync ${ThemeIcon.asClassName(syncEnabledIcon)}`; }
    constructor(configurationService, extensionsWorkbenchService, userDataSyncEnablementService, instantiationService) {
        super('extensions.sync', '', ToggleSyncExtensionAction_1.SYNC_CLASS, false, instantiationService);
        this.configurationService = configurationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this._register(Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('settingsSync.ignoredExtensions'))(() => this.update()));
        this._register(userDataSyncEnablementService.onDidChangeEnablement(() => this.update()));
        this.update();
    }
    update() {
        this.enabled = !!this.extension && this.userDataSyncEnablementService.isEnabled() && this.extension.state === 1 /* ExtensionState.Installed */;
        if (this.extension) {
            const isIgnored = this.extensionsWorkbenchService.isExtensionIgnoredToSync(this.extension);
            this.class = isIgnored ? ToggleSyncExtensionAction_1.IGNORED_SYNC_CLASS : ToggleSyncExtensionAction_1.SYNC_CLASS;
            this.tooltip = isIgnored ? localize('ignored', "This extension is ignored during sync") : localize('synced', "This extension is synced");
        }
    }
    async run() {
        return super.run([
            [
                new Action('extensions.syncignore', this.extensionsWorkbenchService.isExtensionIgnoredToSync(this.extension) ? localize('sync', "Sync this extension") : localize('do not sync', "Do not sync this extension"), undefined, true, () => this.extensionsWorkbenchService.toggleExtensionIgnoredToSync(this.extension))
            ]
        ]);
    }
};
ToggleSyncExtensionAction = ToggleSyncExtensionAction_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IUserDataSyncEnablementService),
    __param(3, IInstantiationService)
], ToggleSyncExtensionAction);
export { ToggleSyncExtensionAction };
let ExtensionStatusAction = class ExtensionStatusAction extends ExtensionAction {
    static { ExtensionStatusAction_1 = this; }
    static { this.CLASS = `${ExtensionAction.ICON_ACTION_CLASS} extension-status`; }
    get status() { return this._status; }
    constructor(extensionManagementServerService, labelService, commandService, workspaceTrustEnablementService, workspaceTrustService, extensionsWorkbenchService, extensionService, extensionManifestPropertiesService, contextService, productService, allowedExtensionsService, workbenchExtensionEnablementService, extensionFeaturesManagementService, extensionGalleryManifestService) {
        super('extensions.status', '', `${ExtensionStatusAction_1.CLASS} hide`, false);
        this.extensionManagementServerService = extensionManagementServerService;
        this.labelService = labelService;
        this.commandService = commandService;
        this.workspaceTrustEnablementService = workspaceTrustEnablementService;
        this.workspaceTrustService = workspaceTrustService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionService = extensionService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.contextService = contextService;
        this.productService = productService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.workbenchExtensionEnablementService = workbenchExtensionEnablementService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.updateWhenCounterExtensionChanges = true;
        this._status = [];
        this._onDidChangeStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this.updateThrottler = new Throttler();
        this._register(this.labelService.onDidChangeFormatters(() => this.update(), this));
        this._register(this.extensionService.onDidChangeExtensions(() => this.update()));
        this._register(this.extensionFeaturesManagementService.onDidChangeAccessData(() => this.update()));
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this.update()));
        this.update();
    }
    update() {
        this.updateThrottler.queue(() => this.computeAndUpdateStatus());
    }
    async computeAndUpdateStatus() {
        this.updateStatus(undefined, true);
        this.enabled = false;
        if (!this.extension) {
            return;
        }
        if (this.extension.isMalicious) {
            this.updateStatus({ icon: warningIcon, message: new MarkdownString(localize('malicious tooltip', "This extension was reported to be problematic.")) }, true);
            return;
        }
        if (this.extension.state === 3 /* ExtensionState.Uninstalled */ && this.extension.gallery && !this.extension.gallery.isSigned && (await this.extensionGalleryManifestService.getExtensionGalleryManifest())?.capabilities.signing?.allRepositorySigned) {
            this.updateStatus({ icon: warningIcon, message: new MarkdownString(localize('not signed tooltip', "This extension is not signed by the Extension Marketplace.")) }, true);
            return;
        }
        if (this.extension.deprecationInfo) {
            if (this.extension.deprecationInfo.extension) {
                const link = `[${this.extension.deprecationInfo.extension.displayName}](${URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.deprecationInfo.extension.id]))}`)})`;
                this.updateStatus({ icon: warningIcon, message: new MarkdownString(localize('deprecated with alternate extension tooltip', "This extension is deprecated. Use the {0} extension instead.", link)) }, true);
            }
            else if (this.extension.deprecationInfo.settings) {
                const link = `[${localize('settings', "settings")}](${URI.parse(`command:workbench.action.openSettings?${encodeURIComponent(JSON.stringify([this.extension.deprecationInfo.settings.map(setting => `@id:${setting}`).join(' ')]))}`)})`;
                this.updateStatus({ icon: warningIcon, message: new MarkdownString(localize('deprecated with alternate settings tooltip', "This extension is deprecated as this functionality is now built-in to VS Code. Configure these {0} to use this functionality.", link)) }, true);
            }
            else {
                const message = new MarkdownString(localize('deprecated tooltip', "This extension is deprecated as it is no longer being maintained."));
                if (this.extension.deprecationInfo.additionalInfo) {
                    message.appendMarkdown(` ${this.extension.deprecationInfo.additionalInfo}`);
                }
                this.updateStatus({ icon: warningIcon, message }, true);
            }
            return;
        }
        if (this.extensionsWorkbenchService.canSetLanguage(this.extension)) {
            return;
        }
        if (this.extension.outdated && this.extensionsWorkbenchService.isAutoUpdateEnabledFor(this.extension)) {
            const message = await this.extensionsWorkbenchService.shouldRequireConsentToUpdate(this.extension);
            if (message) {
                const markdown = new MarkdownString();
                markdown.appendMarkdown(`${message} `);
                markdown.appendMarkdown(localize('auto update message', "Please [review the extension]({0}) and update it manually.", this.extension.hasChangelog()
                    ? URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id, "changelog" /* ExtensionEditorTab.Changelog */]))}`).toString()
                    : this.extension.repository
                        ? this.extension.repository
                        : URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id]))}`).toString()));
                this.updateStatus({ icon: warningIcon, message: markdown }, true);
            }
        }
        if (this.extension.gallery && this.extension.state === 3 /* ExtensionState.Uninstalled */) {
            const result = await this.extensionsWorkbenchService.canInstall(this.extension);
            if (result !== true) {
                this.updateStatus({ icon: warningIcon, message: result }, true);
                return;
            }
        }
        if (!this.extension.local ||
            !this.extension.server ||
            this.extension.state !== 1 /* ExtensionState.Installed */) {
            return;
        }
        // Extension is disabled by allowed list
        if (this.extension.enablementState === 7 /* EnablementState.DisabledByAllowlist */) {
            const result = this.allowedExtensionsService.isAllowed(this.extension.local);
            if (result !== true) {
                this.updateStatus({ icon: warningIcon, message: new MarkdownString(localize('disabled - not allowed', "This extension is disabled because {0}", result.value)) }, true);
                return;
            }
        }
        // Extension is disabled by environment
        if (this.extension.enablementState === 2 /* EnablementState.DisabledByEnvironment */) {
            this.updateStatus({ message: new MarkdownString(localize('disabled by environment', "This extension is disabled by the environment.")) }, true);
            return;
        }
        // Extension is enabled by environment
        if (this.extension.enablementState === 3 /* EnablementState.EnabledByEnvironment */) {
            this.updateStatus({ message: new MarkdownString(localize('enabled by environment', "This extension is enabled because it is required in the current environment.")) }, true);
            return;
        }
        // Extension is disabled by virtual workspace
        if (this.extension.enablementState === 5 /* EnablementState.DisabledByVirtualWorkspace */) {
            const details = getWorkspaceSupportTypeMessage(this.extension.local.manifest.capabilities?.virtualWorkspaces);
            this.updateStatus({ icon: infoIcon, message: new MarkdownString(details ? escapeMarkdownSyntaxTokens(details) : localize('disabled because of virtual workspace', "This extension has been disabled because it does not support virtual workspaces.")) }, true);
            return;
        }
        // Limited support in Virtual Workspace
        if (isVirtualWorkspace(this.contextService.getWorkspace())) {
            const virtualSupportType = this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(this.extension.local.manifest);
            const details = getWorkspaceSupportTypeMessage(this.extension.local.manifest.capabilities?.virtualWorkspaces);
            if (virtualSupportType === 'limited' || details) {
                this.updateStatus({ icon: warningIcon, message: new MarkdownString(details ? escapeMarkdownSyntaxTokens(details) : localize('extension limited because of virtual workspace', "This extension has limited features because the current workspace is virtual.")) }, true);
                return;
            }
        }
        if (!this.workspaceTrustService.isWorkspaceTrusted() &&
            // Extension is disabled by untrusted workspace
            (this.extension.enablementState === 0 /* EnablementState.DisabledByTrustRequirement */ ||
                // All disabled dependencies of the extension are disabled by untrusted workspace
                (this.extension.enablementState === 8 /* EnablementState.DisabledByExtensionDependency */ && this.workbenchExtensionEnablementService.getDependenciesEnablementStates(this.extension.local).every(([, enablementState]) => this.workbenchExtensionEnablementService.isEnabledEnablementState(enablementState) || enablementState === 0 /* EnablementState.DisabledByTrustRequirement */)))) {
            this.enabled = true;
            const untrustedDetails = getWorkspaceSupportTypeMessage(this.extension.local.manifest.capabilities?.untrustedWorkspaces);
            this.updateStatus({ icon: trustIcon, message: new MarkdownString(untrustedDetails ? escapeMarkdownSyntaxTokens(untrustedDetails) : localize('extension disabled because of trust requirement', "This extension has been disabled because the current workspace is not trusted.")) }, true);
            return;
        }
        // Limited support in Untrusted Workspace
        if (this.workspaceTrustEnablementService.isWorkspaceTrustEnabled() && !this.workspaceTrustService.isWorkspaceTrusted()) {
            const untrustedSupportType = this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(this.extension.local.manifest);
            const untrustedDetails = getWorkspaceSupportTypeMessage(this.extension.local.manifest.capabilities?.untrustedWorkspaces);
            if (untrustedSupportType === 'limited' || untrustedDetails) {
                this.enabled = true;
                this.updateStatus({ icon: trustIcon, message: new MarkdownString(untrustedDetails ? escapeMarkdownSyntaxTokens(untrustedDetails) : localize('extension limited because of trust requirement', "This extension has limited features because the current workspace is not trusted.")) }, true);
                return;
            }
        }
        // Extension is disabled by extension kind
        if (this.extension.enablementState === 1 /* EnablementState.DisabledByExtensionKind */) {
            if (!this.extensionsWorkbenchService.installed.some(e => areSameExtensions(e.identifier, this.extension.identifier) && e.server !== this.extension.server)) {
                let message;
                // Extension on Local Server
                if (this.extensionManagementServerService.localExtensionManagementServer === this.extension.server) {
                    if (this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(this.extension.local.manifest)) {
                        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
                            message = new MarkdownString(`${localize('Install in remote server to enable', "This extension is disabled in this workspace because it is defined to run in the Remote Extension Host. Please install the extension in '{0}' to enable.", this.extensionManagementServerService.remoteExtensionManagementServer.label)} [${localize('learn more', "Learn More")}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`);
                        }
                    }
                }
                // Extension on Remote Server
                else if (this.extensionManagementServerService.remoteExtensionManagementServer === this.extension.server) {
                    if (this.extensionManifestPropertiesService.prefersExecuteOnUI(this.extension.local.manifest)) {
                        if (this.extensionManagementServerService.localExtensionManagementServer) {
                            message = new MarkdownString(`${localize('Install in local server to enable', "This extension is disabled in this workspace because it is defined to run in the Local Extension Host. Please install the extension locally to enable.", this.extensionManagementServerService.remoteExtensionManagementServer.label)} [${localize('learn more', "Learn More")}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`);
                        }
                        else if (isWeb) {
                            message = new MarkdownString(`${localize('Defined to run in desktop', "This extension is disabled because it is defined to run only in {0} for the Desktop.", this.productService.nameLong)} [${localize('learn more', "Learn More")}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`);
                        }
                    }
                }
                // Extension on Web Server
                else if (this.extensionManagementServerService.webExtensionManagementServer === this.extension.server) {
                    message = new MarkdownString(`${localize('Cannot be enabled', "This extension is disabled because it is not supported in {0} for the Web.", this.productService.nameLong)} [${localize('learn more', "Learn More")}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`);
                }
                if (message) {
                    this.updateStatus({ icon: warningIcon, message }, true);
                }
                return;
            }
        }
        const extensionId = new ExtensionIdentifier(this.extension.identifier.id);
        const features = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeatures();
        for (const feature of features) {
            const status = this.extensionFeaturesManagementService.getAccessData(extensionId, feature.id)?.current?.status;
            const manageAccessLink = `[${localize('manage access', 'Manage Access')}](${URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id, "features" /* ExtensionEditorTab.Features */, false, feature.id]))}`)})`;
            if (status?.severity === Severity.Error) {
                this.updateStatus({ icon: errorIcon, message: new MarkdownString().appendText(status.message).appendMarkdown(` ${manageAccessLink}`) }, true);
                return;
            }
            if (status?.severity === Severity.Warning) {
                this.updateStatus({ icon: warningIcon, message: new MarkdownString().appendText(status.message).appendMarkdown(` ${manageAccessLink}`) }, true);
                return;
            }
        }
        // Remote Workspace
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            if (isLanguagePackExtension(this.extension.local.manifest)) {
                if (!this.extensionsWorkbenchService.installed.some(e => areSameExtensions(e.identifier, this.extension.identifier) && e.server !== this.extension.server)) {
                    const message = this.extension.server === this.extensionManagementServerService.localExtensionManagementServer
                        ? new MarkdownString(localize('Install language pack also in remote server', "Install the language pack extension on '{0}' to enable it there also.", this.extensionManagementServerService.remoteExtensionManagementServer.label))
                        : new MarkdownString(localize('Install language pack also locally', "Install the language pack extension locally to enable it there also."));
                    this.updateStatus({ icon: infoIcon, message }, true);
                }
                return;
            }
            const runningExtension = this.extensionService.extensions.filter(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier))[0];
            const runningExtensionServer = runningExtension ? this.extensionManagementServerService.getExtensionManagementServer(toExtension(runningExtension)) : null;
            if (this.extension.server === this.extensionManagementServerService.localExtensionManagementServer && runningExtensionServer === this.extensionManagementServerService.remoteExtensionManagementServer) {
                if (this.extensionManifestPropertiesService.prefersExecuteOnWorkspace(this.extension.local.manifest)) {
                    this.updateStatus({ icon: infoIcon, message: new MarkdownString(`${localize('enabled remotely', "This extension is enabled in the Remote Extension Host because it prefers to run there.")} [${localize('learn more', "Learn More")}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`) }, true);
                }
                return;
            }
            if (this.extension.server === this.extensionManagementServerService.remoteExtensionManagementServer && runningExtensionServer === this.extensionManagementServerService.localExtensionManagementServer) {
                if (this.extensionManifestPropertiesService.prefersExecuteOnUI(this.extension.local.manifest)) {
                    this.updateStatus({ icon: infoIcon, message: new MarkdownString(`${localize('enabled locally', "This extension is enabled in the Local Extension Host because it prefers to run there.")} [${localize('learn more', "Learn More")}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`) }, true);
                }
                return;
            }
            if (this.extension.server === this.extensionManagementServerService.remoteExtensionManagementServer && runningExtensionServer === this.extensionManagementServerService.webExtensionManagementServer) {
                if (this.extensionManifestPropertiesService.canExecuteOnWeb(this.extension.local.manifest)) {
                    this.updateStatus({ icon: infoIcon, message: new MarkdownString(`${localize('enabled in web worker', "This extension is enabled in the Web Worker Extension Host because it prefers to run there.")} [${localize('learn more', "Learn More")}](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)`) }, true);
                }
                return;
            }
        }
        // Extension is disabled by its dependency
        if (this.extension.enablementState === 8 /* EnablementState.DisabledByExtensionDependency */) {
            this.updateStatus({
                icon: warningIcon,
                message: new MarkdownString(localize('extension disabled because of dependency', "This extension depends on an extension that is disabled."))
                    .appendMarkdown(`&nbsp;[${localize('dependencies', "Show Dependencies")}](${URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([this.extension.identifier.id, "dependencies" /* ExtensionEditorTab.Dependencies */]))}`)})`)
            }, true);
            return;
        }
        if (!this.extension.local.isValid) {
            const errors = this.extension.local.validations.filter(([severity]) => severity === Severity.Error).map(([, message]) => message);
            this.updateStatus({ icon: warningIcon, message: new MarkdownString(errors.join(' ').trim()) }, true);
            return;
        }
        const isEnabled = this.workbenchExtensionEnablementService.isEnabled(this.extension.local);
        const isRunning = this.extensionService.extensions.some(e => areSameExtensions({ id: e.identifier.value, uuid: e.uuid }, this.extension.identifier));
        if (!this.extension.isWorkspaceScoped && isEnabled && isRunning) {
            if (this.extension.enablementState === 12 /* EnablementState.EnabledWorkspace */) {
                this.updateStatus({ message: new MarkdownString(localize('workspace enabled', "This extension is enabled for this workspace by the user.")) }, true);
                return;
            }
            if (this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
                if (this.extension.server === this.extensionManagementServerService.remoteExtensionManagementServer) {
                    this.updateStatus({ message: new MarkdownString(localize('extension enabled on remote', "Extension is enabled on '{0}'", this.extension.server.label)) }, true);
                    return;
                }
            }
            if (this.extension.enablementState === 11 /* EnablementState.EnabledGlobally */) {
                return;
            }
        }
        if (!isEnabled && !isRunning) {
            if (this.extension.enablementState === 9 /* EnablementState.DisabledGlobally */) {
                this.updateStatus({ message: new MarkdownString(localize('globally disabled', "This extension is disabled globally by the user.")) }, true);
                return;
            }
            if (this.extension.enablementState === 10 /* EnablementState.DisabledWorkspace */) {
                this.updateStatus({ message: new MarkdownString(localize('workspace disabled', "This extension is disabled for this workspace by the user.")) }, true);
                return;
            }
        }
    }
    updateStatus(status, updateClass) {
        if (status) {
            if (this._status.some(s => s.message.value === status.message.value && s.icon?.id === status.icon?.id)) {
                return;
            }
        }
        else {
            if (this._status.length === 0) {
                return;
            }
            this._status = [];
        }
        if (status) {
            this._status.push(status);
            this._status.sort((a, b) => b.icon === trustIcon ? -1 :
                a.icon === trustIcon ? 1 :
                    b.icon === errorIcon ? -1 :
                        a.icon === errorIcon ? 1 :
                            b.icon === warningIcon ? -1 :
                                a.icon === warningIcon ? 1 :
                                    b.icon === infoIcon ? -1 :
                                        a.icon === infoIcon ? 1 :
                                            0);
        }
        if (updateClass) {
            if (status?.icon === errorIcon) {
                this.class = `${ExtensionStatusAction_1.CLASS} extension-status-error ${ThemeIcon.asClassName(errorIcon)}`;
            }
            else if (status?.icon === warningIcon) {
                this.class = `${ExtensionStatusAction_1.CLASS} extension-status-warning ${ThemeIcon.asClassName(warningIcon)}`;
            }
            else if (status?.icon === infoIcon) {
                this.class = `${ExtensionStatusAction_1.CLASS} extension-status-info ${ThemeIcon.asClassName(infoIcon)}`;
            }
            else if (status?.icon === trustIcon) {
                this.class = `${ExtensionStatusAction_1.CLASS} ${ThemeIcon.asClassName(trustIcon)}`;
            }
            else {
                this.class = `${ExtensionStatusAction_1.CLASS} hide`;
            }
        }
        this._onDidChangeStatus.fire();
    }
    async run() {
        if (this._status[0]?.icon === trustIcon) {
            return this.commandService.executeCommand('workbench.trust.manage');
        }
    }
};
ExtensionStatusAction = ExtensionStatusAction_1 = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, ILabelService),
    __param(2, ICommandService),
    __param(3, IWorkspaceTrustEnablementService),
    __param(4, IWorkspaceTrustManagementService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IExtensionService),
    __param(7, IExtensionManifestPropertiesService),
    __param(8, IWorkspaceContextService),
    __param(9, IProductService),
    __param(10, IAllowedExtensionsService),
    __param(11, IWorkbenchExtensionEnablementService),
    __param(12, IExtensionFeaturesManagementService),
    __param(13, IExtensionGalleryManifestService)
], ExtensionStatusAction);
export { ExtensionStatusAction };
let InstallSpecificVersionOfExtensionAction = class InstallSpecificVersionOfExtensionAction extends Action {
    static { InstallSpecificVersionOfExtensionAction_1 = this; }
    static { this.ID = 'workbench.extensions.action.install.specificVersion'; }
    static { this.LABEL = localize('install previous version', "Install Specific Version of Extension..."); }
    constructor(id = InstallSpecificVersionOfExtensionAction_1.ID, label = InstallSpecificVersionOfExtensionAction_1.LABEL, extensionsWorkbenchService, quickInputService, instantiationService, extensionEnablementService) {
        super(id, label);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.extensionEnablementService = extensionEnablementService;
    }
    get enabled() {
        return this.extensionsWorkbenchService.local.some(l => this.isEnabled(l));
    }
    async run() {
        const extensionPick = await this.quickInputService.pick(this.getExtensionEntries(), { placeHolder: localize('selectExtension', "Select Extension"), matchOnDetail: true });
        if (extensionPick && extensionPick.extension) {
            const action = this.instantiationService.createInstance(InstallAnotherVersionAction, extensionPick.extension, true);
            await action.run();
            await this.extensionsWorkbenchService.openSearch(extensionPick.extension.identifier.id);
        }
    }
    isEnabled(extension) {
        const action = this.instantiationService.createInstance(InstallAnotherVersionAction, extension, true);
        return action.enabled && !!extension.local && this.extensionEnablementService.isEnabled(extension.local);
    }
    async getExtensionEntries() {
        const installed = await this.extensionsWorkbenchService.queryLocal();
        const entries = [];
        for (const extension of installed) {
            if (this.isEnabled(extension)) {
                entries.push({
                    id: extension.identifier.id,
                    label: extension.displayName || extension.identifier.id,
                    description: extension.identifier.id,
                    extension,
                });
            }
        }
        return entries.sort((e1, e2) => e1.extension.displayName.localeCompare(e2.extension.displayName));
    }
};
InstallSpecificVersionOfExtensionAction = InstallSpecificVersionOfExtensionAction_1 = __decorate([
    __param(2, IExtensionsWorkbenchService),
    __param(3, IQuickInputService),
    __param(4, IInstantiationService),
    __param(5, IWorkbenchExtensionEnablementService)
], InstallSpecificVersionOfExtensionAction);
export { InstallSpecificVersionOfExtensionAction };
let AbstractInstallExtensionsInServerAction = class AbstractInstallExtensionsInServerAction extends Action {
    constructor(id, extensionsWorkbenchService, quickInputService, notificationService, progressService) {
        super(id);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.quickInputService = quickInputService;
        this.notificationService = notificationService;
        this.progressService = progressService;
        this.extensions = undefined;
        this.update();
        this.extensionsWorkbenchService.queryLocal().then(() => this.updateExtensions());
        this._register(this.extensionsWorkbenchService.onChange(() => {
            if (this.extensions) {
                this.updateExtensions();
            }
        }));
    }
    updateExtensions() {
        this.extensions = this.extensionsWorkbenchService.local;
        this.update();
    }
    update() {
        this.enabled = !!this.extensions && this.getExtensionsToInstall(this.extensions).length > 0;
        this.tooltip = this.label;
    }
    async run() {
        return this.selectAndInstallExtensions();
    }
    async queryExtensionsToInstall() {
        const local = await this.extensionsWorkbenchService.queryLocal();
        return this.getExtensionsToInstall(local);
    }
    async selectAndInstallExtensions() {
        const quickPick = this.quickInputService.createQuickPick();
        quickPick.busy = true;
        const disposable = quickPick.onDidAccept(() => {
            disposable.dispose();
            quickPick.hide();
            quickPick.dispose();
            this.onDidAccept(quickPick.selectedItems);
        });
        quickPick.show();
        const localExtensionsToInstall = await this.queryExtensionsToInstall();
        quickPick.busy = false;
        if (localExtensionsToInstall.length) {
            quickPick.title = this.getQuickPickTitle();
            quickPick.placeholder = localize('select extensions to install', "Select extensions to install");
            quickPick.canSelectMany = true;
            localExtensionsToInstall.sort((e1, e2) => e1.displayName.localeCompare(e2.displayName));
            quickPick.items = localExtensionsToInstall.map(extension => ({ extension, label: extension.displayName, description: extension.version }));
        }
        else {
            quickPick.hide();
            quickPick.dispose();
            this.notificationService.notify({
                severity: Severity.Info,
                message: localize('no local extensions', "There are no extensions to install.")
            });
        }
    }
    async onDidAccept(selectedItems) {
        if (selectedItems.length) {
            const localExtensionsToInstall = selectedItems.filter(r => !!r.extension).map(r => r.extension);
            if (localExtensionsToInstall.length) {
                await this.progressService.withProgress({
                    location: 15 /* ProgressLocation.Notification */,
                    title: localize('installing extensions', "Installing Extensions...")
                }, () => this.installExtensions(localExtensionsToInstall));
                this.notificationService.info(localize('finished installing', "Successfully installed extensions."));
            }
        }
    }
};
AbstractInstallExtensionsInServerAction = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IQuickInputService),
    __param(3, INotificationService),
    __param(4, IProgressService)
], AbstractInstallExtensionsInServerAction);
export { AbstractInstallExtensionsInServerAction };
let InstallLocalExtensionsInRemoteAction = class InstallLocalExtensionsInRemoteAction extends AbstractInstallExtensionsInServerAction {
    constructor(extensionsWorkbenchService, quickInputService, progressService, notificationService, extensionManagementServerService, extensionGalleryService, instantiationService, fileService, logService) {
        super('workbench.extensions.actions.installLocalExtensionsInRemote', extensionsWorkbenchService, quickInputService, notificationService, progressService);
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionGalleryService = extensionGalleryService;
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.logService = logService;
    }
    get label() {
        if (this.extensionManagementServerService && this.extensionManagementServerService.remoteExtensionManagementServer) {
            return localize('select and install local extensions', "Install Local Extensions in '{0}'...", this.extensionManagementServerService.remoteExtensionManagementServer.label);
        }
        return '';
    }
    getQuickPickTitle() {
        return localize('install local extensions title', "Install Local Extensions in '{0}'", this.extensionManagementServerService.remoteExtensionManagementServer.label);
    }
    getExtensionsToInstall(local) {
        return local.filter(extension => {
            const action = this.instantiationService.createInstance(RemoteInstallAction, true);
            action.extension = extension;
            return action.enabled;
        });
    }
    async installExtensions(localExtensionsToInstall) {
        const galleryExtensions = [];
        const vsixs = [];
        const targetPlatform = await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getTargetPlatform();
        await Promises.settled(localExtensionsToInstall.map(async (extension) => {
            if (this.extensionGalleryService.isEnabled()) {
                const gallery = (await this.extensionGalleryService.getExtensions([{ ...extension.identifier, preRelease: !!extension.local?.preRelease }], { targetPlatform, compatible: true }, CancellationToken.None))[0];
                if (gallery) {
                    galleryExtensions.push(gallery);
                    return;
                }
            }
            const vsix = await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.zip(extension.local);
            vsixs.push(vsix);
        }));
        await Promises.settled(galleryExtensions.map(gallery => this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.installFromGallery(gallery)));
        try {
            await Promises.settled(vsixs.map(vsix => this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.install(vsix)));
        }
        finally {
            try {
                await Promise.allSettled(vsixs.map(vsix => this.fileService.del(vsix)));
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
};
InstallLocalExtensionsInRemoteAction = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IQuickInputService),
    __param(2, IProgressService),
    __param(3, INotificationService),
    __param(4, IExtensionManagementServerService),
    __param(5, IExtensionGalleryService),
    __param(6, IInstantiationService),
    __param(7, IFileService),
    __param(8, ILogService)
], InstallLocalExtensionsInRemoteAction);
export { InstallLocalExtensionsInRemoteAction };
let InstallRemoteExtensionsInLocalAction = class InstallRemoteExtensionsInLocalAction extends AbstractInstallExtensionsInServerAction {
    constructor(id, extensionsWorkbenchService, quickInputService, progressService, notificationService, extensionManagementServerService, extensionGalleryService, fileService, logService) {
        super(id, extensionsWorkbenchService, quickInputService, notificationService, progressService);
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionGalleryService = extensionGalleryService;
        this.fileService = fileService;
        this.logService = logService;
    }
    get label() {
        return localize('select and install remote extensions', "Install Remote Extensions Locally...");
    }
    getQuickPickTitle() {
        return localize('install remote extensions', "Install Remote Extensions Locally");
    }
    getExtensionsToInstall(local) {
        return local.filter(extension => extension.type === 1 /* ExtensionType.User */ && extension.server !== this.extensionManagementServerService.localExtensionManagementServer
            && !this.extensionsWorkbenchService.installed.some(e => e.server === this.extensionManagementServerService.localExtensionManagementServer && areSameExtensions(e.identifier, extension.identifier)));
    }
    async installExtensions(extensions) {
        const galleryExtensions = [];
        const vsixs = [];
        const targetPlatform = await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.getTargetPlatform();
        await Promises.settled(extensions.map(async (extension) => {
            if (this.extensionGalleryService.isEnabled()) {
                const gallery = (await this.extensionGalleryService.getExtensions([{ ...extension.identifier, preRelease: !!extension.local?.preRelease }], { targetPlatform, compatible: true }, CancellationToken.None))[0];
                if (gallery) {
                    galleryExtensions.push(gallery);
                    return;
                }
            }
            const vsix = await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.zip(extension.local);
            vsixs.push(vsix);
        }));
        await Promises.settled(galleryExtensions.map(gallery => this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.installFromGallery(gallery)));
        try {
            await Promises.settled(vsixs.map(vsix => this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.install(vsix)));
        }
        finally {
            try {
                await Promise.allSettled(vsixs.map(vsix => this.fileService.del(vsix)));
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
};
InstallRemoteExtensionsInLocalAction = __decorate([
    __param(1, IExtensionsWorkbenchService),
    __param(2, IQuickInputService),
    __param(3, IProgressService),
    __param(4, INotificationService),
    __param(5, IExtensionManagementServerService),
    __param(6, IExtensionGalleryService),
    __param(7, IFileService),
    __param(8, ILogService)
], InstallRemoteExtensionsInLocalAction);
export { InstallRemoteExtensionsInLocalAction };
CommandsRegistry.registerCommand('workbench.extensions.action.showExtensionsForLanguage', function (accessor, fileExtension) {
    const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
    return extensionsWorkbenchService.openSearch(`ext:${fileExtension.replace(/^\./, '')}`);
});
export const showExtensionsWithIdsCommandId = 'workbench.extensions.action.showExtensionsWithIds';
CommandsRegistry.registerCommand(showExtensionsWithIdsCommandId, function (accessor, extensionIds) {
    const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
    return extensionsWorkbenchService.openSearch(extensionIds.map(id => `@id:${id}`).join(' '));
});
registerColor('extensionButton.background', {
    dark: buttonBackground,
    light: buttonBackground,
    hcDark: null,
    hcLight: null
}, localize('extensionButtonBackground', "Button background color for extension actions."));
registerColor('extensionButton.foreground', {
    dark: buttonForeground,
    light: buttonForeground,
    hcDark: null,
    hcLight: null
}, localize('extensionButtonForeground', "Button foreground color for extension actions."));
registerColor('extensionButton.hoverBackground', {
    dark: buttonHoverBackground,
    light: buttonHoverBackground,
    hcDark: null,
    hcLight: null
}, localize('extensionButtonHoverBackground', "Button background hover color for extension actions."));
registerColor('extensionButton.separator', buttonSeparator, localize('extensionButtonSeparator', "Button separator color for extension actions"));
export const extensionButtonProminentBackground = registerColor('extensionButton.prominentBackground', {
    dark: buttonBackground,
    light: buttonBackground,
    hcDark: null,
    hcLight: null
}, localize('extensionButtonProminentBackground', "Button background color for extension actions that stand out (e.g. install button)."));
registerColor('extensionButton.prominentForeground', {
    dark: buttonForeground,
    light: buttonForeground,
    hcDark: null,
    hcLight: null
}, localize('extensionButtonProminentForeground', "Button foreground color for extension actions that stand out (e.g. install button)."));
registerColor('extensionButton.prominentHoverBackground', {
    dark: buttonHoverBackground,
    light: buttonHoverBackground,
    hcDark: null,
    hcLight: null
}, localize('extensionButtonProminentHoverBackground', "Button background hover color for extension actions that stand out (e.g. install button)."));
registerThemingParticipant((theme, collector) => {
    const errorColor = theme.getColor(editorErrorForeground);
    if (errorColor) {
        collector.addRule(`.extension-editor .header .actions-status-container > .status ${ThemeIcon.asCSSSelector(errorIcon)} { color: ${errorColor}; }`);
        collector.addRule(`.extension-editor .body .subcontent .runtime-status ${ThemeIcon.asCSSSelector(errorIcon)} { color: ${errorColor}; }`);
        collector.addRule(`.monaco-hover.extension-hover .markdown-hover .hover-contents ${ThemeIcon.asCSSSelector(errorIcon)} { color: ${errorColor}; }`);
    }
    const warningColor = theme.getColor(editorWarningForeground);
    if (warningColor) {
        collector.addRule(`.extension-editor .header .actions-status-container > .status ${ThemeIcon.asCSSSelector(warningIcon)} { color: ${warningColor}; }`);
        collector.addRule(`.extension-editor .body .subcontent .runtime-status ${ThemeIcon.asCSSSelector(warningIcon)} { color: ${warningColor}; }`);
        collector.addRule(`.monaco-hover.extension-hover .markdown-hover .hover-contents ${ThemeIcon.asCSSSelector(warningIcon)} { color: ${warningColor}; }`);
    }
    const infoColor = theme.getColor(editorInfoForeground);
    if (infoColor) {
        collector.addRule(`.extension-editor .header .actions-status-container > .status ${ThemeIcon.asCSSSelector(infoIcon)} { color: ${infoColor}; }`);
        collector.addRule(`.extension-editor .body .subcontent .runtime-status ${ThemeIcon.asCSSSelector(infoIcon)} { color: ${infoColor}; }`);
        collector.addRule(`.monaco-hover.extension-hover .markdown-hover .hover-contents ${ThemeIcon.asCSSSelector(infoIcon)} { color: ${infoColor}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbnNBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDhCQUE4QixDQUFDO0FBQ3RDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFXLE1BQU0sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFzQixNQUFNLG9DQUFvQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hGLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sRUFBOEIsMkJBQTJCLEVBQXVCLGlDQUFpQyxFQUFFLHdDQUF3QyxFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFpRSwwQkFBMEIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2pXLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVGLE9BQU8sRUFBcUIsd0JBQXdCLEVBQW1GLHlCQUF5QixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDalAsT0FB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