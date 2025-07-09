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
import './media/workspaceTrustEditor.css';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Severity } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { shieldIcon, WorkspaceTrustEditor } from './workspaceTrustEditor.js';
import { WorkspaceTrustEditorInput } from '../../../services/workspaces/browser/workspaceTrustEditorInput.js';
import { WORKSPACE_TRUST_BANNER, WORKSPACE_TRUST_EMPTY_WINDOW, WORKSPACE_TRUST_ENABLED, WORKSPACE_TRUST_STARTUP_PROMPT, WORKSPACE_TRUST_UNTRUSTED_FILES } from '../../../services/workspaces/common/workspaceTrust.js';
import { EditorExtensions } from '../../../common/editor.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isEmptyWorkspaceIdentifier, isSingleFolderWorkspaceIdentifier, IWorkspaceContextService, toWorkspaceIdentifier } from '../../../../platform/workspace/common/workspace.js';
import { dirname, resolve } from '../../../../base/common/path.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IBannerService } from '../../../services/banner/browser/bannerService.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID } from '../../extensions/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { WORKSPACE_TRUST_SETTING_TAG } from '../../preferences/common/preferences.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { MANAGE_TRUST_COMMAND_ID, WorkspaceTrustContext } from '../common/workspace.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { securityConfigurationNodeBase } from '../../../common/configuration.js';
import { basename, dirname as uriDirname } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
const BANNER_RESTRICTED_MODE = 'workbench.banner.restrictedMode';
const STARTUP_PROMPT_SHOWN_KEY = 'workspace.trust.startupPrompt.shown';
const BANNER_RESTRICTED_MODE_DISMISSED_KEY = 'workbench.banner.restrictedMode.dismissed';
let WorkspaceTrustContextKeys = class WorkspaceTrustContextKeys extends Disposable {
    constructor(contextKeyService, workspaceTrustEnablementService, workspaceTrustManagementService) {
        super();
        this._ctxWorkspaceTrustEnabled = WorkspaceTrustContext.IsEnabled.bindTo(contextKeyService);
        this._ctxWorkspaceTrustEnabled.set(workspaceTrustEnablementService.isWorkspaceTrustEnabled());
        this._ctxWorkspaceTrustState = WorkspaceTrustContext.IsTrusted.bindTo(contextKeyService);
        this._ctxWorkspaceTrustState.set(workspaceTrustManagementService.isWorkspaceTrusted());
        this._register(workspaceTrustManagementService.onDidChangeTrust(trusted => this._ctxWorkspaceTrustState.set(trusted)));
    }
};
WorkspaceTrustContextKeys = __decorate([
    __param(0, IContextKeyService),
    __param(1, IWorkspaceTrustEnablementService),
    __param(2, IWorkspaceTrustManagementService)
], WorkspaceTrustContextKeys);
export { WorkspaceTrustContextKeys };
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkspaceTrustContextKeys, 3 /* LifecyclePhase.Restored */);
/*
 * Trust Request via Service UX handler
 */
let WorkspaceTrustRequestHandler = class WorkspaceTrustRequestHandler extends Disposable {
    static { this.ID = 'workbench.contrib.workspaceTrustRequestHandler'; }
    constructor(dialogService, commandService, workspaceContextService, workspaceTrustManagementService, workspaceTrustRequestService) {
        super();
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.registerListeners();
    }
    get useWorkspaceLanguage() {
        return !isSingleFolderWorkspaceIdentifier(toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()));
    }
    registerListeners() {
        // Open files trust request
        this._register(this.workspaceTrustRequestService.onDidInitiateOpenFilesTrustRequest(async () => {
            await this.workspaceTrustManagementService.workspaceResolved;
            // Details
            const markdownDetails = [
                this.workspaceContextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ ?
                    localize('openLooseFileWorkspaceDetails', "You are trying to open untrusted files in a workspace which is trusted.") :
                    localize('openLooseFileWindowDetails', "You are trying to open untrusted files in a window which is trusted."),
                localize('openLooseFileLearnMore', "If you don't want to open untrusted files, we recommend to open them in Restricted Mode in a new window as the files may be malicious. See [our docs](https://aka.ms/vscode-workspace-trust) to learn more.")
            ];
            // Dialog
            await this.dialogService.prompt({
                type: Severity.Info,
                message: this.workspaceContextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ ?
                    localize('openLooseFileWorkspaceMesssage', "Do you want to allow untrusted files in this workspace?") :
                    localize('openLooseFileWindowMesssage', "Do you want to allow untrusted files in this window?"),
                buttons: [
                    {
                        label: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, "&&Open"),
                        run: ({ checkboxChecked }) => this.workspaceTrustRequestService.completeOpenFilesTrustRequest(1 /* WorkspaceTrustUriResponse.Open */, !!checkboxChecked)
                    },
                    {
                        label: localize({ key: 'newWindow', comment: ['&& denotes a mnemonic'] }, "Open in &&Restricted Mode"),
                        run: ({ checkboxChecked }) => this.workspaceTrustRequestService.completeOpenFilesTrustRequest(2 /* WorkspaceTrustUriResponse.OpenInNewWindow */, !!checkboxChecked)
                    }
                ],
                cancelButton: {
                    run: () => this.workspaceTrustRequestService.completeOpenFilesTrustRequest(3 /* WorkspaceTrustUriResponse.Cancel */)
                },
                checkbox: {
                    label: localize('openLooseFileWorkspaceCheckbox', "Remember my decision for all workspaces"),
                    checked: false
                },
                custom: {
                    icon: Codicon.shield,
                    markdownDetails: markdownDetails.map(md => { return { markdown: new MarkdownString(md) }; })
                }
            });
        }));
        // Workspace trust request
        this._register(this.workspaceTrustRequestService.onDidInitiateWorkspaceTrustRequest(async (requestOptions) => {
            await this.workspaceTrustManagementService.workspaceResolved;
            // Title
            const message = this.useWorkspaceLanguage ?
                localize('workspaceTrust', "Do you trust the authors of the files in this workspace?") :
                localize('folderTrust', "Do you trust the authors of the files in this folder?");
            // Message
            const defaultDetails = localize('immediateTrustRequestMessage', "A feature you are trying to use may be a security risk if you do not trust the source of the files or folders you currently have open.");
            const details = requestOptions?.message ?? defaultDetails;
            // Buttons
            const buttons = requestOptions?.buttons ?? [
                { label: this.useWorkspaceLanguage ? localize({ key: 'grantWorkspaceTrustButton', comment: ['&& denotes a mnemonic'] }, "&&Trust Workspace & Continue") : localize({ key: 'grantFolderTrustButton', comment: ['&& denotes a mnemonic'] }, "&&Trust Folder & Continue"), type: 'ContinueWithTrust' },
                { label: localize({ key: 'manageWorkspaceTrustButton', comment: ['&& denotes a mnemonic'] }, "&&Manage"), type: 'Manage' }
            ];
            // Add Cancel button if not provided
            if (!buttons.some(b => b.type === 'Cancel')) {
                buttons.push({ label: localize('cancelWorkspaceTrustButton', "Cancel"), type: 'Cancel' });
            }
            // Dialog
            const { result } = await this.dialogService.prompt({
                type: Severity.Info,
                message,
                custom: {
                    icon: Codicon.shield,
                    markdownDetails: [
                        { markdown: new MarkdownString(details) },
                        { markdown: new MarkdownString(localize('immediateTrustRequestLearnMore', "If you don't trust the authors of these files, we do not recommend continuing as the files may be malicious. See [our docs](https://aka.ms/vscode-workspace-trust) to learn more.")) }
                    ]
                },
                buttons: buttons.filter(b => b.type !== 'Cancel').map(button => {
                    return {
                        label: button.label,
                        run: () => button.type
                    };
                }),
                cancelButton: (() => {
                    const cancelButton = buttons.find(b => b.type === 'Cancel');
                    if (!cancelButton) {
                        return undefined;
                    }
                    return {
                        label: cancelButton.label,
                        run: () => cancelButton.type
                    };
                })()
            });
            // Dialog result
            switch (result) {
                case 'ContinueWithTrust':
                    await this.workspaceTrustRequestService.completeWorkspaceTrustRequest(true);
                    break;
                case 'ContinueWithoutTrust':
                    await this.workspaceTrustRequestService.completeWorkspaceTrustRequest(undefined);
                    break;
                case 'Manage':
                    this.workspaceTrustRequestService.cancelWorkspaceTrustRequest();
                    await this.commandService.executeCommand(MANAGE_TRUST_COMMAND_ID);
                    break;
                case 'Cancel':
                    this.workspaceTrustRequestService.cancelWorkspaceTrustRequest();
                    break;
            }
        }));
    }
};
WorkspaceTrustRequestHandler = __decorate([
    __param(0, IDialogService),
    __param(1, ICommandService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkspaceTrustManagementService),
    __param(4, IWorkspaceTrustRequestService)
], WorkspaceTrustRequestHandler);
export { WorkspaceTrustRequestHandler };
/*
 * Trust UX and Startup Handler
 */
let WorkspaceTrustUXHandler = class WorkspaceTrustUXHandler extends Disposable {
    constructor(dialogService, workspaceContextService, workspaceTrustEnablementService, workspaceTrustManagementService, configurationService, statusbarService, storageService, workspaceTrustRequestService, bannerService, labelService, hostService, productService, remoteAgentService, environmentService, fileService) {
        super();
        this.dialogService = dialogService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceTrustEnablementService = workspaceTrustEnablementService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.configurationService = configurationService;
        this.statusbarService = statusbarService;
        this.storageService = storageService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.bannerService = bannerService;
        this.labelService = labelService;
        this.hostService = hostService;
        this.productService = productService;
        this.remoteAgentService = remoteAgentService;
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.entryId = `status.workspaceTrust`;
        this.statusbarEntryAccessor = this._register(new MutableDisposable());
        (async () => {
            await this.workspaceTrustManagementService.workspaceTrustInitialized;
            if (this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
                this.registerListeners();
                this.updateStatusbarEntry(this.workspaceTrustManagementService.isWorkspaceTrusted());
                // Show modal dialog
                if (this.hostService.hasFocus) {
                    this.showModalOnStart();
                }
                else {
                    const focusDisposable = this.hostService.onDidChangeFocus(focused => {
                        if (focused) {
                            focusDisposable.dispose();
                            this.showModalOnStart();
                        }
                    });
                }
            }
        })();
    }
    registerListeners() {
        this._register(this.workspaceContextService.onWillChangeWorkspaceFolders(e => {
            if (e.fromCache) {
                return;
            }
            if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
                return;
            }
            const addWorkspaceFolder = async (e) => {
                const trusted = this.workspaceTrustManagementService.isWorkspaceTrusted();
                // Workspace is trusted and there are added/changed folders
                if (trusted && (e.changes.added.length || e.changes.changed.length)) {
                    const addedFoldersTrustInfo = await Promise.all(e.changes.added.map(folder => this.workspaceTrustManagementService.getUriTrustInfo(folder.uri)));
                    if (!addedFoldersTrustInfo.map(info => info.trusted).every(trusted => trusted)) {
                        const { confirmed } = await this.dialogService.confirm({
                            type: Severity.Info,
                            message: localize('addWorkspaceFolderMessage', "Do you trust the authors of the files in this folder?"),
                            detail: localize('addWorkspaceFolderDetail', "You are adding files that are not currently trusted to a trusted workspace. Do you trust the authors of these new files?"),
                            cancelButton: localize('no', 'No'),
                            custom: { icon: Codicon.shield }
                        });
                        // Mark added/changed folders as trusted
                        await this.workspaceTrustManagementService.setUrisTrust(addedFoldersTrustInfo.map(i => i.uri), confirmed);
                    }
                }
            };
            return e.join(addWorkspaceFolder(e));
        }));
        this._register(this.workspaceTrustManagementService.onDidChangeTrust(trusted => {
            this.updateWorkbenchIndicators(trusted);
        }));
        this._register(this.workspaceTrustRequestService.onDidInitiateWorkspaceTrustRequestOnStartup(async () => {
            let titleString;
            let learnMoreString;
            let trustOption;
            let dontTrustOption;
            const isAiGeneratedWorkspace = await this.isAiGeneratedWorkspace();
            if (isAiGeneratedWorkspace && this.productService.aiGeneratedWorkspaceTrust) {
                titleString = this.productService.aiGeneratedWorkspaceTrust.title;
                learnMoreString = this.productService.aiGeneratedWorkspaceTrust.startupTrustRequestLearnMore;
                trustOption = this.productService.aiGeneratedWorkspaceTrust.trustOption;
                dontTrustOption = this.productService.aiGeneratedWorkspaceTrust.dontTrustOption;
            }
            else {
                console.warn('AI generated workspace trust dialog contents not available.');
            }
            const title = titleString ?? (this.useWorkspaceLanguage ?
                localize('workspaceTrust', "Do you trust the authors of the files in this workspace?") :
                localize('folderTrust', "Do you trust the authors of the files in this folder?"));
            let checkboxText;
            const workspaceIdentifier = toWorkspaceIdentifier(this.workspaceContextService.getWorkspace());
            const isSingleFolderWorkspace = isSingleFolderWorkspaceIdentifier(workspaceIdentifier);
            const isEmptyWindow = isEmptyWorkspaceIdentifier(workspaceIdentifier);
            if (!isAiGeneratedWorkspace && this.workspaceTrustManagementService.canSetParentFolderTrust()) {
                const name = basename(uriDirname(workspaceIdentifier.uri));
                checkboxText = localize('checkboxString', "Trust the authors of all files in the parent folder '{0}'", name);
            }
            // Show Workspace Trust Start Dialog
            this.doShowModal(title, { label: trustOption ?? localize({ key: 'trustOption', comment: ['&& denotes a mnemonic'] }, "&&Yes, I trust the authors"), sublabel: isSingleFolderWorkspace ? localize('trustFolderOptionDescription', "Trust folder and enable all features") : localize('trustWorkspaceOptionDescription', "Trust workspace and enable all features") }, { label: dontTrustOption ?? localize({ key: 'dontTrustOption', comment: ['&& denotes a mnemonic'] }, "&&No, I don't trust the authors"), sublabel: isSingleFolderWorkspace ? localize('dontTrustFolderOptionDescription', "Browse folder in restricted mode") : localize('dontTrustWorkspaceOptionDescription', "Browse workspace in restricted mode") }, [
                !isSingleFolderWorkspace ?
                    localize('workspaceStartupTrustDetails', "{0} provides features that may automatically execute files in this workspace.", this.productService.nameShort) :
                    localize('folderStartupTrustDetails', "{0} provides features that may automatically execute files in this folder.", this.productService.nameShort),
                learnMoreString ?? localize('startupTrustRequestLearnMore', "If you don't trust the authors of these files, we recommend to continue in restricted mode as the files may be malicious. See [our docs](https://aka.ms/vscode-workspace-trust) to learn more."),
                !isEmptyWindow ?
                    `\`${this.labelService.getWorkspaceLabel(workspaceIdentifier, { verbose: 2 /* Verbosity.LONG */ })}\`` : '',
            ], checkboxText);
        }));
    }
    updateWorkbenchIndicators(trusted) {
        const bannerItem = this.getBannerItem(!trusted);
        this.updateStatusbarEntry(trusted);
        if (bannerItem) {
            if (!trusted) {
                this.bannerService.show(bannerItem);
            }
            else {
                this.bannerService.hide(BANNER_RESTRICTED_MODE);
            }
        }
    }
    //#region Dialog
    async doShowModal(question, trustedOption, untrustedOption, markdownStrings, trustParentString) {
        await this.dialogService.prompt({
            type: Severity.Info,
            message: question,
            checkbox: trustParentString ? {
                label: trustParentString
            } : undefined,
            buttons: [
                {
                    label: trustedOption.label,
                    run: async ({ checkboxChecked }) => {
                        if (checkboxChecked) {
                            await this.workspaceTrustManagementService.setParentFolderTrust(true);
                        }
                        else {
                            await this.workspaceTrustRequestService.completeWorkspaceTrustRequest(true);
                        }
                    }
                },
                {
                    label: untrustedOption.label,
                    run: () => {
                        this.updateWorkbenchIndicators(false);
                        this.workspaceTrustRequestService.cancelWorkspaceTrustRequest();
                    }
                }
            ],
            custom: {
                buttonDetails: [
                    trustedOption.sublabel,
                    untrustedOption.sublabel
                ],
                disableCloseAction: true,
                icon: Codicon.shield,
                markdownDetails: markdownStrings.map(md => { return { markdown: new MarkdownString(md) }; })
            }
        });
        this.storageService.store(STARTUP_PROMPT_SHOWN_KEY, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async showModalOnStart() {
        if (this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            this.updateWorkbenchIndicators(true);
            return;
        }
        // Don't show modal prompt if workspace trust cannot be changed
        if (!(this.workspaceTrustManagementService.canSetWorkspaceTrust())) {
            return;
        }
        // Don't show modal prompt for virtual workspaces by default
        if (isVirtualWorkspace(this.workspaceContextService.getWorkspace())) {
            this.updateWorkbenchIndicators(false);
            return;
        }
        // Don't show modal prompt for empty workspaces by default
        if (this.workspaceContextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            this.updateWorkbenchIndicators(false);
            return;
        }
        if (this.startupPromptSetting === 'never') {
            this.updateWorkbenchIndicators(false);
            return;
        }
        if (this.startupPromptSetting === 'once' && this.storageService.getBoolean(STARTUP_PROMPT_SHOWN_KEY, 1 /* StorageScope.WORKSPACE */, false)) {
            this.updateWorkbenchIndicators(false);
            return;
        }
        // Use the workspace trust request service to show modal dialog
        this.workspaceTrustRequestService.requestWorkspaceTrustOnStartup();
    }
    get startupPromptSetting() {
        return this.configurationService.getValue(WORKSPACE_TRUST_STARTUP_PROMPT);
    }
    get useWorkspaceLanguage() {
        return !isSingleFolderWorkspaceIdentifier(toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()));
    }
    async isAiGeneratedWorkspace() {
        const aiGeneratedWorkspaces = URI.joinPath(this.environmentService.workspaceStorageHome, 'aiGeneratedWorkspaces.json');
        return await this.fileService.exists(aiGeneratedWorkspaces).then(async (result) => {
            if (result) {
                try {
                    const content = await this.fileService.readFile(aiGeneratedWorkspaces);
                    const workspaces = JSON.parse(content.value.toString());
                    if (workspaces.indexOf(this.workspaceContextService.getWorkspace().folders[0].uri.toString()) > -1) {
                        return true;
                    }
                }
                catch (e) {
                    // Ignore errors when resolving file contents
                }
            }
            return false;
        });
    }
    //#endregion
    //#region Banner
    getBannerItem(restrictedMode) {
        const dismissedRestricted = this.storageService.getBoolean(BANNER_RESTRICTED_MODE_DISMISSED_KEY, 1 /* StorageScope.WORKSPACE */, false);
        // never show the banner
        if (this.bannerSetting === 'never') {
            return undefined;
        }
        // info has been dismissed
        if (this.bannerSetting === 'untilDismissed' && dismissedRestricted) {
            return undefined;
        }
        const actions = [
            {
                label: localize('restrictedModeBannerManage', "Manage"),
                href: 'command:' + MANAGE_TRUST_COMMAND_ID
            },
            {
                label: localize('restrictedModeBannerLearnMore', "Learn More"),
                href: 'https://aka.ms/vscode-workspace-trust'
            }
        ];
        return {
            id: BANNER_RESTRICTED_MODE,
            icon: shieldIcon,
            ariaLabel: this.getBannerItemAriaLabels(),
            message: this.getBannerItemMessages(),
            actions,
            onClose: () => {
                if (restrictedMode) {
                    this.storageService.store(BANNER_RESTRICTED_MODE_DISMISSED_KEY, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                }
            }
        };
    }
    getBannerItemAriaLabels() {
        switch (this.workspaceContextService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */:
                return localize('restrictedModeBannerAriaLabelWindow', "Restricted Mode is intended for safe code browsing. Trust this window to enable all features. Use navigation keys to access banner actions.");
            case 2 /* WorkbenchState.FOLDER */:
                return localize('restrictedModeBannerAriaLabelFolder', "Restricted Mode is intended for safe code browsing. Trust this folder to enable all features. Use navigation keys to access banner actions.");
            case 3 /* WorkbenchState.WORKSPACE */:
                return localize('restrictedModeBannerAriaLabelWorkspace', "Restricted Mode is intended for safe code browsing. Trust this workspace to enable all features. Use navigation keys to access banner actions.");
        }
    }
    getBannerItemMessages() {
        switch (this.workspaceContextService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */:
                return localize('restrictedModeBannerMessageWindow', "Restricted Mode is intended for safe code browsing. Trust this window to enable all features.");
            case 2 /* WorkbenchState.FOLDER */:
                return localize('restrictedModeBannerMessageFolder', "Restricted Mode is intended for safe code browsing. Trust this folder to enable all features.");
            case 3 /* WorkbenchState.WORKSPACE */:
                return localize('restrictedModeBannerMessageWorkspace', "Restricted Mode is intended for safe code browsing. Trust this workspace to enable all features.");
        }
    }
    get bannerSetting() {
        const result = this.configurationService.getValue(WORKSPACE_TRUST_BANNER);
        // In serverless environments, we don't need to aggressively show the banner
        if (result !== 'always' && isWeb && !this.remoteAgentService.getConnection()?.remoteAuthority) {
            return 'never';
        }
        return result;
    }
    //#endregion
    //#region Statusbar
    getRestrictedModeStatusbarEntry() {
        let ariaLabel = '';
        let toolTip;
        switch (this.workspaceContextService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */: {
                ariaLabel = localize('status.ariaUntrustedWindow', "Restricted Mode: Some features are disabled because this window is not trusted.");
                toolTip = {
                    value: localize({ key: 'status.tooltipUntrustedWindow2', comment: ['[abc]({n}) are links.  Only translate `features are disabled` and `window is not trusted`. Do not change brackets and parentheses or {n}'] }, "Running in Restricted Mode\n\nSome [features are disabled]({0}) because this [window is not trusted]({1}).", `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`, `command:${MANAGE_TRUST_COMMAND_ID}`),
                    isTrusted: true,
                    supportThemeIcons: true
                };
                break;
            }
            case 2 /* WorkbenchState.FOLDER */: {
                ariaLabel = localize('status.ariaUntrustedFolder', "Restricted Mode: Some features are disabled because this folder is not trusted.");
                toolTip = {
                    value: localize({ key: 'status.tooltipUntrustedFolder2', comment: ['[abc]({n}) are links.  Only translate `features are disabled` and `folder is not trusted`. Do not change brackets and parentheses or {n}'] }, "Running in Restricted Mode\n\nSome [features are disabled]({0}) because this [folder is not trusted]({1}).", `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`, `command:${MANAGE_TRUST_COMMAND_ID}`),
                    isTrusted: true,
                    supportThemeIcons: true
                };
                break;
            }
            case 3 /* WorkbenchState.WORKSPACE */: {
                ariaLabel = localize('status.ariaUntrustedWorkspace', "Restricted Mode: Some features are disabled because this workspace is not trusted.");
                toolTip = {
                    value: localize({ key: 'status.tooltipUntrustedWorkspace2', comment: ['[abc]({n}) are links. Only translate `features are disabled` and `workspace is not trusted`. Do not change brackets and parentheses or {n}'] }, "Running in Restricted Mode\n\nSome [features are disabled]({0}) because this [workspace is not trusted]({1}).", `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`, `command:${MANAGE_TRUST_COMMAND_ID}`),
                    isTrusted: true,
                    supportThemeIcons: true
                };
                break;
            }
        }
        return {
            name: localize('status.WorkspaceTrust', "Workspace Trust"),
            text: `$(shield) ${localize('untrusted', "Restricted Mode")}`,
            ariaLabel: ariaLabel,
            tooltip: toolTip,
            command: MANAGE_TRUST_COMMAND_ID,
            kind: 'prominent'
        };
    }
    updateStatusbarEntry(trusted) {
        if (trusted && this.statusbarEntryAccessor.value) {
            this.statusbarEntryAccessor.clear();
            return;
        }
        if (!trusted && !this.statusbarEntryAccessor.value) {
            const entry = this.getRestrictedModeStatusbarEntry();
            this.statusbarEntryAccessor.value = this.statusbarService.addEntry(entry, this.entryId, 0 /* StatusbarAlignment.LEFT */, { location: { id: 'status.host', priority: Number.POSITIVE_INFINITY }, alignment: 1 /* StatusbarAlignment.RIGHT */ });
        }
    }
};
WorkspaceTrustUXHandler = __decorate([
    __param(0, IDialogService),
    __param(1, IWorkspaceContextService),
    __param(2, IWorkspaceTrustEnablementService),
    __param(3, IWorkspaceTrustManagementService),
    __param(4, IConfigurationService),
    __param(5, IStatusbarService),
    __param(6, IStorageService),
    __param(7, IWorkspaceTrustRequestService),
    __param(8, IBannerService),
    __param(9, ILabelService),
    __param(10, IHostService),
    __param(11, IProductService),
    __param(12, IRemoteAgentService),
    __param(13, IEnvironmentService),
    __param(14, IFileService)
], WorkspaceTrustUXHandler);
export { WorkspaceTrustUXHandler };
registerWorkbenchContribution2(WorkspaceTrustRequestHandler.ID, WorkspaceTrustRequestHandler, 2 /* WorkbenchPhase.BlockRestore */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkspaceTrustUXHandler, 3 /* LifecyclePhase.Restored */);
/**
 * Trusted Workspace GUI Editor
 */
class WorkspaceTrustEditorInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(input) {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(WorkspaceTrustEditorInput);
    }
}
Registry.as(EditorExtensions.EditorFactory)
    .registerEditorSerializer(WorkspaceTrustEditorInput.ID, WorkspaceTrustEditorInputSerializer);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(WorkspaceTrustEditor, WorkspaceTrustEditor.ID, localize('workspaceTrustEditor', "Workspace Trust Editor")), [
    new SyncDescriptor(WorkspaceTrustEditorInput)
]);
/*
 * Actions
 */
// Configure Workspace Trust Settings
const CONFIGURE_TRUST_COMMAND_ID = 'workbench.trust.configure';
const WORKSPACES_CATEGORY = localize2('workspacesCategory', 'Workspaces');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: CONFIGURE_TRUST_COMMAND_ID,
            title: localize2('configureWorkspaceTrustSettings', "Configure Workspace Trust Settings"),
            precondition: ContextKeyExpr.and(WorkspaceTrustContext.IsEnabled, ContextKeyExpr.equals(`config.${WORKSPACE_TRUST_ENABLED}`, true)),
            category: WORKSPACES_CATEGORY,
            f1: true
        });
    }
    run(accessor) {
        accessor.get(IPreferencesService).openUserSettings({ jsonEditor: false, query: `@tag:${WORKSPACE_TRUST_SETTING_TAG}` });
    }
});
// Manage Workspace Trust
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: MANAGE_TRUST_COMMAND_ID,
            title: localize2('manageWorkspaceTrust', "Manage Workspace Trust"),
            precondition: ContextKeyExpr.and(WorkspaceTrustContext.IsEnabled, ContextKeyExpr.equals(`config.${WORKSPACE_TRUST_ENABLED}`, true)),
            category: WORKSPACES_CATEGORY,
            f1: true,
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        const input = instantiationService.createInstance(WorkspaceTrustEditorInput);
        editorService.openEditor(input, { pinned: true });
        return;
    }
});
/*
 * Configuration
 */
Registry.as(ConfigurationExtensions.Configuration)
    .registerConfiguration({
    ...securityConfigurationNodeBase,
    properties: {
        [WORKSPACE_TRUST_ENABLED]: {
            type: 'boolean',
            default: true,
            description: localize('workspace.trust.description', "Controls whether or not Workspace Trust is enabled within VS Code."),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */,
        },
        [WORKSPACE_TRUST_STARTUP_PROMPT]: {
            type: 'string',
            default: 'once',
            description: localize('workspace.trust.startupPrompt.description', "Controls when the startup prompt to trust a workspace is shown."),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            enum: ['always', 'once', 'never'],
            enumDescriptions: [
                localize('workspace.trust.startupPrompt.always', "Ask for trust every time an untrusted workspace is opened."),
                localize('workspace.trust.startupPrompt.once', "Ask for trust the first time an untrusted workspace is opened."),
                localize('workspace.trust.startupPrompt.never', "Do not ask for trust when an untrusted workspace is opened."),
            ]
        },
        [WORKSPACE_TRUST_BANNER]: {
            type: 'string',
            default: 'untilDismissed',
            description: localize('workspace.trust.banner.description', "Controls when the restricted mode banner is shown."),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            enum: ['always', 'untilDismissed', 'never'],
            enumDescriptions: [
                localize('workspace.trust.banner.always', "Show the banner every time an untrusted workspace is open."),
                localize('workspace.trust.banner.untilDismissed', "Show the banner when an untrusted workspace is opened until dismissed."),
                localize('workspace.trust.banner.never', "Do not show the banner when an untrusted workspace is open."),
            ]
        },
        [WORKSPACE_TRUST_UNTRUSTED_FILES]: {
            type: 'string',
            default: 'prompt',
            markdownDescription: localize('workspace.trust.untrustedFiles.description', "Controls how to handle opening untrusted files in a trusted workspace. This setting also applies to opening files in an empty window which is trusted via `#{0}#`.", WORKSPACE_TRUST_EMPTY_WINDOW),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */,
            enum: ['prompt', 'open', 'newWindow'],
            enumDescriptions: [
                localize('workspace.trust.untrustedFiles.prompt', "Ask how to handle untrusted files for each workspace. Once untrusted files are introduced to a trusted workspace, you will not be prompted again."),
                localize('workspace.trust.untrustedFiles.open', "Always allow untrusted files to be introduced to a trusted workspace without prompting."),
                localize('workspace.trust.untrustedFiles.newWindow', "Always open untrusted files in a separate window in restricted mode without prompting."),
            ]
        },
        [WORKSPACE_TRUST_EMPTY_WINDOW]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('workspace.trust.emptyWindow.description', "Controls whether or not the empty window is trusted by default within VS Code. When used with `#{0}#`, you can enable the full functionality of VS Code without prompting in an empty window.", WORKSPACE_TRUST_UNTRUSTED_FILES),
            tags: [WORKSPACE_TRUST_SETTING_TAG],
            scope: 1 /* ConfigurationScope.APPLICATION */
        }
    }
});
let WorkspaceTrustTelemetryContribution = class WorkspaceTrustTelemetryContribution extends Disposable {
    constructor(environmentService, telemetryService, workspaceContextService, workspaceTrustEnablementService, workspaceTrustManagementService) {
        super();
        this.environmentService = environmentService;
        this.telemetryService = telemetryService;
        this.workspaceContextService = workspaceContextService;
        this.workspaceTrustEnablementService = workspaceTrustEnablementService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.workspaceTrustManagementService.workspaceTrustInitialized
            .then(() => {
            this.logInitialWorkspaceTrustInfo();
            this.logWorkspaceTrust(this.workspaceTrustManagementService.isWorkspaceTrusted());
            this._register(this.workspaceTrustManagementService.onDidChangeTrust(isTrusted => this.logWorkspaceTrust(isTrusted)));
        });
    }
    logInitialWorkspaceTrustInfo() {
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            const disabledByCliFlag = this.environmentService.disableWorkspaceTrust;
            this.telemetryService.publicLog2('workspaceTrustDisabled', {
                reason: disabledByCliFlag ? 'cli' : 'setting'
            });
            return;
        }
        this.telemetryService.publicLog2('workspaceTrustFolderCounts', {
            trustedFoldersCount: this.workspaceTrustManagementService.getTrustedUris().length,
        });
    }
    async logWorkspaceTrust(isTrusted) {
        if (!this.workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            return;
        }
        this.telemetryService.publicLog2('workspaceTrustStateChanged', {
            workspaceId: this.workspaceContextService.getWorkspace().id,
            isTrusted: isTrusted
        });
        if (isTrusted) {
            const getDepth = (folder) => {
                let resolvedPath = resolve(folder);
                let depth = 0;
                while (dirname(resolvedPath) !== resolvedPath && depth < 100) {
                    resolvedPath = dirname(resolvedPath);
                    depth++;
                }
                return depth;
            };
            for (const folder of this.workspaceContextService.getWorkspace().folders) {
                const { trusted, uri } = await this.workspaceTrustManagementService.getUriTrustInfo(folder.uri);
                if (!trusted) {
                    continue;
                }
                const workspaceFolderDepth = getDepth(folder.uri.fsPath);
                const trustedFolderDepth = getDepth(uri.fsPath);
                const delta = workspaceFolderDepth - trustedFolderDepth;
                this.telemetryService.publicLog2('workspaceFolderDepthBelowTrustedFolder', { workspaceFolderDepth, trustedFolderDepth, delta });
            }
        }
    }
};
WorkspaceTrustTelemetryContribution = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, ITelemetryService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkspaceTrustEnablementService),
    __param(4, IWorkspaceTrustManagementService)
], WorkspaceTrustTelemetryContribution);
Registry.as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(WorkspaceTrustTelemetryContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93b3Jrc3BhY2UvYnJvd3Nlci93b3Jrc3BhY2UuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sa0NBQWtDLENBQUM7QUFDMUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFzQixVQUFVLElBQUksdUJBQXVCLEVBQTBCLE1BQU0sb0VBQW9FLENBQUM7QUFDdkssT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxnQ0FBZ0MsRUFBRSw2QkFBNkIsRUFBNkIsTUFBTSx5REFBeUQsQ0FBQztBQUN2TSxPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUEyRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTlMLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxP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