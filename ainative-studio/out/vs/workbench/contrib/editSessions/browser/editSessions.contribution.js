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
var EditSessionsContribution_1;
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { IEditSessionsStorageService, ChangeType, FileType, EDIT_SESSION_SYNC_CATEGORY, EDIT_SESSIONS_CONTAINER_ID, EditSessionSchemaVersion, IEditSessionsLogService, EDIT_SESSIONS_VIEW_ICON, EDIT_SESSIONS_TITLE, EDIT_SESSIONS_SHOW_VIEW, EDIT_SESSIONS_DATA_VIEW_ID, decodeEditSessionFileContent, hashedEditSessionId, editSessionsLogId, EDIT_SESSIONS_PENDING } from '../common/editSessions.js';
import { ISCMService } from '../../scm/common/scm.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../base/common/uri.js';
import { basename, joinPath, relativePath } from '../../../../base/common/resources.js';
import { encodeBase64 } from '../../../../base/common/buffer.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { EditSessionsWorkbenchService } from './editSessionsStorageService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { UserDataSyncStoreError } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { getFileNamesMessage, IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { Schemas } from '../../../../base/common/network.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { EditSessionsLogService } from '../common/editSessionsLogService.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditSessionsDataViews } from './editSessionsViews.js';
import { EditSessionsFileSystemProvider } from './editSessionsFileSystemProvider.js';
import { isNative, isWeb } from '../../../../base/common/platform.js';
import { VirtualWorkspaceContext, WorkspaceFolderCountContext } from '../../../common/contextkeys.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { equals } from '../../../../base/common/objects.js';
import { EditSessionIdentityMatch, IEditSessionIdentityService } from '../../../../platform/workspace/common/editSessions.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { WorkspaceStateSynchroniser } from '../common/workspaceStateSync.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { EditSessionsStoreClient } from '../common/editSessionsStorageClient.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceIdentityService } from '../../../services/workspaces/common/workspaceIdentityService.js';
import { hashAsync } from '../../../../base/common/hash.js';
registerSingleton(IEditSessionsLogService, EditSessionsLogService, 1 /* InstantiationType.Delayed */);
registerSingleton(IEditSessionsStorageService, EditSessionsWorkbenchService, 1 /* InstantiationType.Delayed */);
const continueWorkingOnCommand = {
    id: '_workbench.editSessions.actions.continueEditSession',
    title: localize2('continue working on', 'Continue Working On...'),
    precondition: WorkspaceFolderCountContext.notEqualsTo('0'),
    f1: true
};
const openLocalFolderCommand = {
    id: '_workbench.editSessions.actions.continueEditSession.openLocalFolder',
    title: localize2('continue edit session in local folder', 'Open In Local Folder'),
    category: EDIT_SESSION_SYNC_CATEGORY,
    precondition: ContextKeyExpr.and(IsWebContext.toNegated(), VirtualWorkspaceContext)
};
const showOutputChannelCommand = {
    id: 'workbench.editSessions.actions.showOutputChannel',
    title: localize2('show log', "Show Log"),
    category: EDIT_SESSION_SYNC_CATEGORY
};
const installAdditionalContinueOnOptionsCommand = {
    id: 'workbench.action.continueOn.extensions',
    title: localize('continueOn.installAdditional', 'Install additional development environment options'),
};
registerAction2(class extends Action2 {
    constructor() {
        super({ ...installAdditionalContinueOnOptionsCommand, f1: false });
    }
    async run(accessor) {
        return accessor.get(IExtensionsWorkbenchService).openSearch('@tag:continueOn');
    }
});
const resumeProgressOptionsTitle = `[${localize('resuming working changes window', 'Resuming working changes...')}](command:${showOutputChannelCommand.id})`;
const resumeProgressOptions = {
    location: 10 /* ProgressLocation.Window */,
    type: 'syncing',
};
const queryParamName = 'editSessionId';
const useEditSessionsWithContinueOn = 'workbench.editSessions.continueOn';
let EditSessionsContribution = class EditSessionsContribution extends Disposable {
    static { EditSessionsContribution_1 = this; }
    static { this.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY = 'applicationLaunchedViaContinueOn'; }
    constructor(editSessionsStorageService, fileService, progressService, openerService, telemetryService, scmService, notificationService, dialogService, logService, environmentService, instantiationService, productService, configurationService, contextService, editSessionIdentityService, quickInputService, commandService, contextKeyService, fileDialogService, lifecycleService, storageService, activityService, editorService, remoteAgentService, extensionService, requestService, userDataProfilesService, uriIdentityService, workspaceIdentityService) {
        super();
        this.editSessionsStorageService = editSessionsStorageService;
        this.fileService = fileService;
        this.progressService = progressService;
        this.openerService = openerService;
        this.telemetryService = telemetryService;
        this.scmService = scmService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.productService = productService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.editSessionIdentityService = editSessionIdentityService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.fileDialogService = fileDialogService;
        this.lifecycleService = lifecycleService;
        this.storageService = storageService;
        this.activityService = activityService;
        this.editorService = editorService;
        this.remoteAgentService = remoteAgentService;
        this.extensionService = extensionService;
        this.requestService = requestService;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceIdentityService = workspaceIdentityService;
        this.continueEditSessionOptions = [];
        this.accountsMenuBadgeDisposable = this._register(new MutableDisposable());
        this.registeredCommands = new Set();
        this.shouldShowViewsContext = EDIT_SESSIONS_SHOW_VIEW.bindTo(this.contextKeyService);
        this.pendingEditSessionsContext = EDIT_SESSIONS_PENDING.bindTo(this.contextKeyService);
        this.pendingEditSessionsContext.set(false);
        if (!this.productService['editSessions.store']?.url) {
            return;
        }
        this.editSessionsStorageClient = new EditSessionsStoreClient(URI.parse(this.productService['editSessions.store'].url), this.productService, this.requestService, this.logService, this.environmentService, this.fileService, this.storageService);
        this.editSessionsStorageService.storeClient = this.editSessionsStorageClient;
        this.workspaceStateSynchronizer = new WorkspaceStateSynchroniser(this.userDataProfilesService.defaultProfile, undefined, this.editSessionsStorageClient, this.logService, this.fileService, this.environmentService, this.telemetryService, this.configurationService, this.storageService, this.uriIdentityService, this.workspaceIdentityService, this.editSessionsStorageService);
        this.autoResumeEditSession();
        this.registerActions();
        this.registerViews();
        this.registerContributedEditSessionOptions();
        this._register(this.fileService.registerProvider(EditSessionsFileSystemProvider.SCHEMA, new EditSessionsFileSystemProvider(this.editSessionsStorageService)));
        this.lifecycleService.onWillShutdown((e) => {
            if (e.reason !== 3 /* ShutdownReason.RELOAD */ && this.editSessionsStorageService.isSignedIn && this.configurationService.getValue('workbench.experimental.cloudChanges.autoStore') === 'onShutdown' && !isWeb) {
                e.join(this.autoStoreEditSession(), { id: 'autoStoreWorkingChanges', label: localize('autoStoreWorkingChanges', 'Storing current working changes...') });
            }
        });
        this._register(this.editSessionsStorageService.onDidSignIn(() => this.updateAccountsMenuBadge()));
        this._register(this.editSessionsStorageService.onDidSignOut(() => this.updateAccountsMenuBadge()));
    }
    async autoResumeEditSession() {
        const shouldAutoResumeOnReload = this.configurationService.getValue('workbench.cloudChanges.autoResume') === 'onReload';
        if (this.environmentService.editSessionId !== undefined) {
            this.logService.info(`Resuming cloud changes, reason: found editSessionId ${this.environmentService.editSessionId} in environment service...`);
            await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(this.environmentService.editSessionId, undefined, undefined, undefined, progress).finally(() => this.environmentService.editSessionId = undefined));
        }
        else if (shouldAutoResumeOnReload && this.editSessionsStorageService.isSignedIn) {
            this.logService.info('Resuming cloud changes, reason: cloud changes enabled...');
            // Attempt to resume edit session based on edit workspace identifier
            // Note: at this point if the user is not signed into edit sessions,
            // we don't want them to be prompted to sign in and should just return early
            await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(undefined, true, undefined, undefined, progress));
        }
        else if (shouldAutoResumeOnReload) {
            // The application has previously launched via a protocol URL Continue On flow
            const hasApplicationLaunchedFromContinueOnFlow = this.storageService.getBoolean(EditSessionsContribution_1.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
            this.logService.info(`Prompting to enable cloud changes, has application previously launched from Continue On flow: ${hasApplicationLaunchedFromContinueOnFlow}`);
            const handlePendingEditSessions = () => {
                // display a badge in the accounts menu but do not prompt the user to sign in again
                this.logService.info('Showing badge to enable cloud changes in accounts menu...');
                this.updateAccountsMenuBadge();
                this.pendingEditSessionsContext.set(true);
                // attempt a resume if we are in a pending state and the user just signed in
                const disposable = this.editSessionsStorageService.onDidSignIn(async () => {
                    disposable.dispose();
                    this.logService.info('Showing badge to enable cloud changes in accounts menu succeeded, resuming cloud changes...');
                    await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(undefined, true, undefined, undefined, progress));
                    this.storageService.remove(EditSessionsContribution_1.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
                    this.environmentService.continueOn = undefined;
                });
            };
            if ((this.environmentService.continueOn !== undefined) &&
                !this.editSessionsStorageService.isSignedIn &&
                // and user has not yet been prompted to sign in on this machine
                hasApplicationLaunchedFromContinueOnFlow === false) {
                // store the fact that we prompted the user
                this.storageService.store(EditSessionsContribution_1.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                this.logService.info('Prompting to enable cloud changes...');
                await this.editSessionsStorageService.initialize('read');
                if (this.editSessionsStorageService.isSignedIn) {
                    this.logService.info('Prompting to enable cloud changes succeeded, resuming cloud changes...');
                    await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(undefined, true, undefined, undefined, progress));
                }
                else {
                    handlePendingEditSessions();
                }
            }
            else if (!this.editSessionsStorageService.isSignedIn &&
                // and user has been prompted to sign in on this machine
                hasApplicationLaunchedFromContinueOnFlow === true) {
                handlePendingEditSessions();
            }
        }
        else {
            this.logService.debug('Auto resuming cloud changes disabled.');
        }
    }
    updateAccountsMenuBadge() {
        if (this.editSessionsStorageService.isSignedIn) {
            return this.accountsMenuBadgeDisposable.clear();
        }
        const badge = new NumberBadge(1, () => localize('check for pending cloud changes', 'Check for pending cloud changes'));
        this.accountsMenuBadgeDisposable.value = this.activityService.showAccountsActivity({ badge });
    }
    async autoStoreEditSession() {
        const cancellationTokenSource = new CancellationTokenSource();
        await this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            type: 'syncing',
            title: localize('store working changes', 'Storing working changes...')
        }, async () => this.storeEditSession(false, cancellationTokenSource.token), () => {
            cancellationTokenSource.cancel();
            cancellationTokenSource.dispose();
        });
    }
    registerViews() {
        const container = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
            id: EDIT_SESSIONS_CONTAINER_ID,
            title: EDIT_SESSIONS_TITLE,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [EDIT_SESSIONS_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
            icon: EDIT_SESSIONS_VIEW_ICON,
            hideIfEmpty: true
        }, 0 /* ViewContainerLocation.Sidebar */, { doNotRegisterOpenCommand: true });
        this._register(this.instantiationService.createInstance(EditSessionsDataViews, container));
    }
    registerActions() {
        this.registerContinueEditSessionAction();
        this.registerResumeLatestEditSessionAction();
        this.registerStoreLatestEditSessionAction();
        this.registerContinueInLocalFolderAction();
        this.registerShowEditSessionViewAction();
        this.registerShowEditSessionOutputChannelAction();
    }
    registerShowEditSessionOutputChannelAction() {
        this._register(registerAction2(class ShowEditSessionOutput extends Action2 {
            constructor() {
                super(showOutputChannelCommand);
            }
            run(accessor, ...args) {
                const outputChannel = accessor.get(IOutputService);
                void outputChannel.showChannel(editSessionsLogId);
            }
        }));
    }
    registerShowEditSessionViewAction() {
        const that = this;
        this._register(registerAction2(class ShowEditSessionView extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.showEditSessions',
                    title: localize2('show cloud changes', 'Show Cloud Changes'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    f1: true
                });
            }
            async run(accessor) {
                that.shouldShowViewsContext.set(true);
                const viewsService = accessor.get(IViewsService);
                await viewsService.openView(EDIT_SESSIONS_DATA_VIEW_ID);
            }
        }));
    }
    registerContinueEditSessionAction() {
        const that = this;
        this._register(registerAction2(class ContinueEditSessionAction extends Action2 {
            constructor() {
                super(continueWorkingOnCommand);
            }
            async run(accessor, workspaceUri, destination) {
                // First ask the user to pick a destination, if necessary
                let uri = workspaceUri;
                if (!destination && !uri) {
                    destination = await that.pickContinueEditSessionDestination();
                    if (!destination) {
                        that.telemetryService.publicLog2('continueOn.editSessions.pick.outcome', { outcome: 'noSelection' });
                        return;
                    }
                }
                // Determine if we need to store an edit session, asking for edit session auth if necessary
                const shouldStoreEditSession = await that.shouldContinueOnWithEditSession();
                // Run the store action to get back a ref
                let ref;
                if (shouldStoreEditSession) {
                    that.telemetryService.publicLog2('continueOn.editSessions.store');
                    const cancellationTokenSource = new CancellationTokenSource();
                    try {
                        ref = await that.progressService.withProgress({
                            location: 15 /* ProgressLocation.Notification */,
                            cancellable: true,
                            type: 'syncing',
                            title: localize('store your working changes', 'Storing your working changes...')
                        }, async () => {
                            const ref = await that.storeEditSession(false, cancellationTokenSource.token);
                            if (ref !== undefined) {
                                that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeSucceeded', hashedId: hashedEditSessionId(ref) });
                            }
                            else {
                                that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeSkipped' });
                            }
                            return ref;
                        }, () => {
                            cancellationTokenSource.cancel();
                            cancellationTokenSource.dispose();
                            that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeCancelledByUser' });
                        });
                    }
                    catch (ex) {
                        that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeFailed' });
                        throw ex;
                    }
                }
                // Append the ref to the URI
                uri = destination ? await that.resolveDestination(destination) : uri;
                if (uri === undefined) {
                    return;
                }
                if (ref !== undefined && uri !== 'noDestinationUri') {
                    const encodedRef = encodeURIComponent(ref);
                    uri = uri.with({
                        query: uri.query.length > 0 ? (uri.query + `&${queryParamName}=${encodedRef}&continueOn=1`) : `${queryParamName}=${encodedRef}&continueOn=1`
                    });
                    // Open the URI
                    that.logService.info(`Opening ${uri.toString()}`);
                    await that.openerService.open(uri, { openExternal: true });
                }
                else if (!shouldStoreEditSession && uri !== 'noDestinationUri') {
                    // Open the URI without an edit session ref
                    that.logService.info(`Opening ${uri.toString()}`);
                    await that.openerService.open(uri, { openExternal: true });
                }
                else if (ref === undefined && shouldStoreEditSession) {
                    that.logService.warn(`Failed to store working changes when invoking ${continueWorkingOnCommand.id}.`);
                }
            }
        }));
    }
    registerResumeLatestEditSessionAction() {
        const that = this;
        this._register(registerAction2(class ResumeLatestEditSessionAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.resumeLatest',
                    title: localize2('resume latest cloud changes', 'Resume Latest Changes from Cloud'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    f1: true,
                });
            }
            async run(accessor, editSessionId, forceApplyUnrelatedChange) {
                await that.progressService.withProgress({ ...resumeProgressOptions, title: resumeProgressOptionsTitle }, async () => await that.resumeEditSession(editSessionId, undefined, forceApplyUnrelatedChange));
            }
        }));
        this._register(registerAction2(class ResumeLatestEditSessionAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.resumeFromSerializedPayload',
                    title: localize2('resume cloud changes', 'Resume Changes from Serialized Data'),
                    category: 'Developer',
                    f1: true,
                });
            }
            async run(accessor, editSessionId) {
                const data = await that.quickInputService.input({ prompt: 'Enter serialized data' });
                if (data) {
                    that.editSessionsStorageService.lastReadResources.set('editSessions', { content: data, ref: '' });
                }
                await that.progressService.withProgress({ ...resumeProgressOptions, title: resumeProgressOptionsTitle }, async () => await that.resumeEditSession(editSessionId, undefined, undefined, undefined, undefined, data));
            }
        }));
    }
    registerStoreLatestEditSessionAction() {
        const that = this;
        this._register(registerAction2(class StoreLatestEditSessionAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.storeCurrent',
                    title: localize2('store working changes in cloud', 'Store Working Changes in Cloud'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    f1: true,
                });
            }
            async run(accessor) {
                const cancellationTokenSource = new CancellationTokenSource();
                await that.progressService.withProgress({
                    location: 15 /* ProgressLocation.Notification */,
                    title: localize('storing working changes', 'Storing working changes...')
                }, async () => {
                    that.telemetryService.publicLog2('editSessions.store');
                    await that.storeEditSession(true, cancellationTokenSource.token);
                }, () => {
                    cancellationTokenSource.cancel();
                    cancellationTokenSource.dispose();
                });
            }
        }));
    }
    async resumeEditSession(ref, silent, forceApplyUnrelatedChange, applyPartialMatch, progress, serializedData) {
        // Wait for the remote environment to become available, if any
        await this.remoteAgentService.getEnvironment();
        // Edit sessions are not currently supported in empty workspaces
        // https://github.com/microsoft/vscode/issues/159220
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return;
        }
        this.logService.info(ref !== undefined ? `Resuming changes from cloud with ref ${ref}...` : 'Checking for pending cloud changes...');
        if (silent && !(await this.editSessionsStorageService.initialize('read', true))) {
            return;
        }
        this.telemetryService.publicLog2('editSessions.resume');
        performance.mark('code/willResumeEditSessionFromIdentifier');
        progress?.report({ message: localize('checkingForWorkingChanges', 'Checking for pending cloud changes...') });
        const data = serializedData ? { content: serializedData, ref: '' } : await this.editSessionsStorageService.read('editSessions', ref);
        if (!data) {
            if (ref === undefined && !silent) {
                this.notificationService.info(localize('no cloud changes', 'There are no changes to resume from the cloud.'));
            }
            else if (ref !== undefined) {
                this.notificationService.warn(localize('no cloud changes for ref', 'Could not resume changes from the cloud for ID {0}.', ref));
            }
            this.logService.info(ref !== undefined ? `Aborting resuming changes from cloud as no edit session content is available to be applied from ref ${ref}.` : `Aborting resuming edit session as no edit session content is available to be applied`);
            return;
        }
        progress?.report({ message: resumeProgressOptionsTitle });
        const editSession = JSON.parse(data.content);
        ref = data.ref;
        if (editSession.version > EditSessionSchemaVersion) {
            this.notificationService.error(localize('client too old', "Please upgrade to a newer version of {0} to resume your working changes from the cloud.", this.productService.nameLong));
            this.telemetryService.publicLog2('editSessions.resume.outcome', { hashedId: hashedEditSessionId(ref), outcome: 'clientUpdateNeeded' });
            return;
        }
        try {
            const { changes, conflictingChanges } = await this.generateChanges(editSession, ref, forceApplyUnrelatedChange, applyPartialMatch);
            if (changes.length === 0) {
                return;
            }
            // TODO@joyceerhl Provide the option to diff files which would be overwritten by edit session contents
            if (conflictingChanges.length > 0) {
                // Allow to show edit sessions
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Warning,
                    message: conflictingChanges.length > 1 ?
                        localize('resume edit session warning many', 'Resuming your working changes from the cloud will overwrite the following {0} files. Do you want to proceed?', conflictingChanges.length) :
                        localize('resume edit session warning 1', 'Resuming your working changes from the cloud will overwrite {0}. Do you want to proceed?', basename(conflictingChanges[0].uri)),
                    detail: conflictingChanges.length > 1 ? getFileNamesMessage(conflictingChanges.map((c) => c.uri)) : undefined
                });
                if (!confirmed) {
                    return;
                }
            }
            for (const { uri, type, contents } of changes) {
                if (type === ChangeType.Addition) {
                    await this.fileService.writeFile(uri, decodeEditSessionFileContent(editSession.version, contents));
                }
                else if (type === ChangeType.Deletion && await this.fileService.exists(uri)) {
                    await this.fileService.del(uri);
                }
            }
            await this.workspaceStateSynchronizer?.apply();
            this.logService.info(`Deleting edit session with ref ${ref} after successfully applying it to current workspace...`);
            await this.editSessionsStorageService.delete('editSessions', ref);
            this.logService.info(`Deleted edit session with ref ${ref}.`);
            this.telemetryService.publicLog2('editSessions.resume.outcome', { hashedId: hashedEditSessionId(ref), outcome: 'resumeSucceeded' });
        }
        catch (ex) {
            this.logService.error('Failed to resume edit session, reason: ', ex.toString());
            this.notificationService.error(localize('resume failed', "Failed to resume your working changes from the cloud."));
        }
        performance.mark('code/didResumeEditSessionFromIdentifier');
    }
    async generateChanges(editSession, ref, forceApplyUnrelatedChange = false, applyPartialMatch = false) {
        const changes = [];
        const conflictingChanges = [];
        const workspaceFolders = this.contextService.getWorkspace().folders;
        const cancellationTokenSource = new CancellationTokenSource();
        for (const folder of editSession.folders) {
            let folderRoot;
            if (folder.canonicalIdentity) {
                // Look for an edit session identifier that we can use
                for (const f of workspaceFolders) {
                    const identity = await this.editSessionIdentityService.getEditSessionIdentifier(f, cancellationTokenSource.token);
                    this.logService.info(`Matching identity ${identity} against edit session folder identity ${folder.canonicalIdentity}...`);
                    if (equals(identity, folder.canonicalIdentity) || forceApplyUnrelatedChange) {
                        folderRoot = f;
                        break;
                    }
                    if (identity !== undefined) {
                        const match = await this.editSessionIdentityService.provideEditSessionIdentityMatch(f, identity, folder.canonicalIdentity, cancellationTokenSource.token);
                        if (match === EditSessionIdentityMatch.Complete) {
                            folderRoot = f;
                            break;
                        }
                        else if (match === EditSessionIdentityMatch.Partial &&
                            this.configurationService.getValue('workbench.experimental.cloudChanges.partialMatches.enabled') === true) {
                            if (!applyPartialMatch) {
                                // Surface partially matching edit session
                                this.notificationService.prompt(Severity.Info, localize('editSessionPartialMatch', 'You have pending working changes in the cloud for this workspace. Would you like to resume them?'), [{ label: localize('resume', 'Resume'), run: () => this.resumeEditSession(ref, false, undefined, true) }]);
                            }
                            else {
                                folderRoot = f;
                                break;
                            }
                        }
                    }
                }
            }
            else {
                folderRoot = workspaceFolders.find((f) => f.name === folder.name);
            }
            if (!folderRoot) {
                this.logService.info(`Skipping applying ${folder.workingChanges.length} changes from edit session with ref ${ref} as no matching workspace folder was found.`);
                return { changes: [], conflictingChanges: [], contributedStateHandlers: [] };
            }
            const localChanges = new Set();
            for (const repository of this.scmService.repositories) {
                if (repository.provider.rootUri !== undefined &&
                    this.contextService.getWorkspaceFolder(repository.provider.rootUri)?.name === folder.name) {
                    const repositoryChanges = this.getChangedResources(repository);
                    repositoryChanges.forEach((change) => localChanges.add(change.toString()));
                }
            }
            for (const change of folder.workingChanges) {
                const uri = joinPath(folderRoot.uri, change.relativeFilePath);
                changes.push({ uri, type: change.type, contents: change.contents });
                if (await this.willChangeLocalContents(localChanges, uri, change)) {
                    conflictingChanges.push({ uri, type: change.type, contents: change.contents });
                }
            }
        }
        return { changes, conflictingChanges };
    }
    async willChangeLocalContents(localChanges, uriWithIncomingChanges, incomingChange) {
        if (!localChanges.has(uriWithIncomingChanges.toString())) {
            return false;
        }
        const { contents, type } = incomingChange;
        switch (type) {
            case (ChangeType.Addition): {
                const [originalContents, incomingContents] = await Promise.all([
                    hashAsync(contents),
                    hashAsync(encodeBase64((await this.fileService.readFile(uriWithIncomingChanges)).value))
                ]);
                return originalContents !== incomingContents;
            }
            case (ChangeType.Deletion): {
                return await this.fileService.exists(uriWithIncomingChanges);
            }
            default:
                throw new Error('Unhandled change type.');
        }
    }
    async storeEditSession(fromStoreCommand, cancellationToken) {
        const folders = [];
        let editSessionSize = 0;
        let hasEdits = false;
        // Save all saveable editors before building edit session contents
        await this.editorService.saveAll();
        for (const repository of this.scmService.repositories) {
            // Look through all resource groups and compute which files were added/modified/deleted
            const trackedUris = this.getChangedResources(repository); // A URI might appear in more than one resource group
            const workingChanges = [];
            const { rootUri } = repository.provider;
            const workspaceFolder = rootUri ? this.contextService.getWorkspaceFolder(rootUri) : undefined;
            let name = workspaceFolder?.name;
            for (const uri of trackedUris) {
                const workspaceFolder = this.contextService.getWorkspaceFolder(uri);
                if (!workspaceFolder) {
                    this.logService.info(`Skipping working change ${uri.toString()} as no associated workspace folder was found.`);
                    continue;
                }
                await this.editSessionIdentityService.onWillCreateEditSessionIdentity(workspaceFolder, cancellationToken);
                name = name ?? workspaceFolder.name;
                const relativeFilePath = relativePath(workspaceFolder.uri, uri) ?? uri.path;
                // Only deal with file contents for now
                try {
                    if (!(await this.fileService.stat(uri)).isFile) {
                        continue;
                    }
                }
                catch { }
                hasEdits = true;
                if (await this.fileService.exists(uri)) {
                    const contents = encodeBase64((await this.fileService.readFile(uri)).value);
                    editSessionSize += contents.length;
                    if (editSessionSize > this.editSessionsStorageService.SIZE_LIMIT) {
                        this.notificationService.error(localize('payload too large', 'Your working changes exceed the size limit and cannot be stored.'));
                        return undefined;
                    }
                    workingChanges.push({ type: ChangeType.Addition, fileType: FileType.File, contents: contents, relativeFilePath: relativeFilePath });
                }
                else {
                    // Assume it's a deletion
                    workingChanges.push({ type: ChangeType.Deletion, fileType: FileType.File, contents: undefined, relativeFilePath: relativeFilePath });
                }
            }
            let canonicalIdentity = undefined;
            if (workspaceFolder !== null && workspaceFolder !== undefined) {
                canonicalIdentity = await this.editSessionIdentityService.getEditSessionIdentifier(workspaceFolder, cancellationToken);
            }
            // TODO@joyceerhl debt: don't store working changes as a child of the folder
            folders.push({ workingChanges, name: name ?? '', canonicalIdentity: canonicalIdentity ?? undefined, absoluteUri: workspaceFolder?.uri.toString() });
        }
        // Store contributed workspace state
        await this.workspaceStateSynchronizer?.sync();
        if (!hasEdits) {
            this.logService.info('Skipped storing working changes in the cloud as there are no edits to store.');
            if (fromStoreCommand) {
                this.notificationService.info(localize('no working changes to store', 'Skipped storing working changes in the cloud as there are no edits to store.'));
            }
            return undefined;
        }
        const data = { folders, version: 2, workspaceStateId: this.editSessionsStorageService.lastWrittenResources.get('workspaceState')?.ref };
        try {
            this.logService.info(`Storing edit session...`);
            const ref = await this.editSessionsStorageService.write('editSessions', data);
            this.logService.info(`Stored edit session with ref ${ref}.`);
            return ref;
        }
        catch (ex) {
            this.logService.error(`Failed to store edit session, reason: `, ex.toString());
            if (ex instanceof UserDataSyncStoreError) {
                switch (ex.code) {
                    case "TooLarge" /* UserDataSyncErrorCode.TooLarge */:
                        // Uploading a payload can fail due to server size limits
                        this.telemetryService.publicLog2('editSessions.upload.failed', { reason: 'TooLarge' });
                        this.notificationService.error(localize('payload too large', 'Your working changes exceed the size limit and cannot be stored.'));
                        break;
                    default:
                        this.telemetryService.publicLog2('editSessions.upload.failed', { reason: 'unknown' });
                        this.notificationService.error(localize('payload failed', 'Your working changes cannot be stored.'));
                        break;
                }
            }
        }
        return undefined;
    }
    getChangedResources(repository) {
        return repository.provider.groups.reduce((resources, resourceGroups) => {
            resourceGroups.resources.forEach((resource) => resources.add(resource.sourceUri));
            return resources;
        }, new Set()); // A URI might appear in more than one resource group
    }
    hasEditSession() {
        for (const repository of this.scmService.repositories) {
            if (this.getChangedResources(repository).size > 0) {
                return true;
            }
        }
        return false;
    }
    async shouldContinueOnWithEditSession() {
        // If the user is already signed in, we should store edit session
        if (this.editSessionsStorageService.isSignedIn) {
            return this.hasEditSession();
        }
        // If the user has been asked before and said no, don't use edit sessions
        if (this.configurationService.getValue(useEditSessionsWithContinueOn) === 'off') {
            this.telemetryService.publicLog2('continueOn.editSessions.canStore.outcome', { outcome: 'disabledEditSessionsViaSetting' });
            return false;
        }
        // Prompt the user to use edit sessions if they currently could benefit from using it
        if (this.hasEditSession()) {
            const disposables = new DisposableStore();
            const quickpick = disposables.add(this.quickInputService.createQuickPick());
            quickpick.placeholder = localize('continue with cloud changes', "Select whether to bring your working changes with you");
            quickpick.ok = false;
            quickpick.ignoreFocusOut = true;
            const withCloudChanges = { label: localize('with cloud changes', "Yes, continue with my working changes") };
            const withoutCloudChanges = { label: localize('without cloud changes', "No, continue without my working changes") };
            quickpick.items = [withCloudChanges, withoutCloudChanges];
            const continueWithCloudChanges = await new Promise((resolve, reject) => {
                disposables.add(quickpick.onDidAccept(() => {
                    resolve(quickpick.selectedItems[0] === withCloudChanges);
                    disposables.dispose();
                }));
                disposables.add(quickpick.onDidHide(() => {
                    reject(new CancellationError());
                    disposables.dispose();
                }));
                quickpick.show();
            });
            if (!continueWithCloudChanges) {
                this.telemetryService.publicLog2('continueOn.editSessions.canStore.outcome', { outcome: 'didNotEnableEditSessionsWhenPrompted' });
                return continueWithCloudChanges;
            }
            const initialized = await this.editSessionsStorageService.initialize('write');
            if (!initialized) {
                this.telemetryService.publicLog2('continueOn.editSessions.canStore.outcome', { outcome: 'didNotEnableEditSessionsWhenPrompted' });
            }
            return initialized;
        }
        return false;
    }
    //#region Continue Edit Session extension contribution point
    registerContributedEditSessionOptions() {
        continueEditSessionExtPoint.setHandler(extensions => {
            const continueEditSessionOptions = [];
            for (const extension of extensions) {
                if (!isProposedApiEnabled(extension.description, 'contribEditSessions')) {
                    continue;
                }
                if (!Array.isArray(extension.value)) {
                    continue;
                }
                for (const contribution of extension.value) {
                    const command = MenuRegistry.getCommand(contribution.command);
                    if (!command) {
                        return;
                    }
                    const icon = command.icon;
                    const title = typeof command.title === 'string' ? command.title : command.title.value;
                    const when = ContextKeyExpr.deserialize(contribution.when);
                    continueEditSessionOptions.push(new ContinueEditSessionItem(ThemeIcon.isThemeIcon(icon) ? `$(${icon.id}) ${title}` : title, command.id, command.source?.title, when, contribution.documentation));
                    if (contribution.qualifiedName) {
                        this.generateStandaloneOptionCommand(command.id, contribution.qualifiedName, contribution.category ?? command.category, when, contribution.remoteGroup);
                    }
                }
            }
            this.continueEditSessionOptions = continueEditSessionOptions;
        });
    }
    generateStandaloneOptionCommand(commandId, qualifiedName, category, when, remoteGroup) {
        const command = {
            id: `${continueWorkingOnCommand.id}.${commandId}`,
            title: { original: qualifiedName, value: qualifiedName },
            category: typeof category === 'string' ? { original: category, value: category } : category,
            precondition: when,
            f1: true
        };
        if (!this.registeredCommands.has(command.id)) {
            this.registeredCommands.add(command.id);
            this._register(registerAction2(class StandaloneContinueOnOption extends Action2 {
                constructor() {
                    super(command);
                }
                async run(accessor) {
                    return accessor.get(ICommandService).executeCommand(continueWorkingOnCommand.id, undefined, commandId);
                }
            }));
            if (remoteGroup !== undefined) {
                MenuRegistry.appendMenuItem(MenuId.StatusBarRemoteIndicatorMenu, {
                    group: remoteGroup,
                    command: command,
                    when: command.precondition
                });
            }
        }
    }
    registerContinueInLocalFolderAction() {
        const that = this;
        this._register(registerAction2(class ContinueInLocalFolderAction extends Action2 {
            constructor() {
                super(openLocalFolderCommand);
            }
            async run(accessor) {
                const selection = await that.fileDialogService.showOpenDialog({
                    title: localize('continueEditSession.openLocalFolder.title.v2', 'Select a local folder to continue working in'),
                    canSelectFolders: true,
                    canSelectMany: false,
                    canSelectFiles: false,
                    availableFileSystems: [Schemas.file]
                });
                return selection?.length !== 1 ? undefined : URI.from({
                    scheme: that.productService.urlProtocol,
                    authority: Schemas.file,
                    path: selection[0].path
                });
            }
        }));
        if (getVirtualWorkspaceLocation(this.contextService.getWorkspace()) !== undefined && isNative) {
            this.generateStandaloneOptionCommand(openLocalFolderCommand.id, localize('continueWorkingOn.existingLocalFolder', 'Continue Working in Existing Local Folder'), undefined, openLocalFolderCommand.precondition, undefined);
        }
    }
    async pickContinueEditSessionDestination() {
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        const workspaceContext = this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */
            ? this.contextService.getWorkspace().folders[0].name
            : this.contextService.getWorkspace().folders.map((folder) => folder.name).join(', ');
        quickPick.placeholder = localize('continueEditSessionPick.title.v2', "Select a development environment to continue working on {0} in", `'${workspaceContext}'`);
        quickPick.items = this.createPickItems();
        this.extensionService.onDidChangeExtensions(() => {
            quickPick.items = this.createPickItems();
        });
        const command = await new Promise((resolve, reject) => {
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                resolve(undefined);
            }));
            disposables.add(quickPick.onDidAccept((e) => {
                const selection = quickPick.activeItems[0].command;
                if (selection === installAdditionalContinueOnOptionsCommand.id) {
                    void this.commandService.executeCommand(installAdditionalContinueOnOptionsCommand.id);
                }
                else {
                    resolve(selection);
                    quickPick.hide();
                }
            }));
            quickPick.show();
            disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
                if (e.item.documentation !== undefined) {
                    const uri = URI.isUri(e.item.documentation) ? URI.parse(e.item.documentation) : await this.commandService.executeCommand(e.item.documentation);
                    void this.openerService.open(uri, { openExternal: true });
                }
            }));
        });
        quickPick.dispose();
        return command;
    }
    async resolveDestination(command) {
        try {
            const uri = await this.commandService.executeCommand(command);
            // Some continue on commands do not return a URI
            // to support extensions which want to be in control
            // of how the destination is opened
            if (uri === undefined) {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'noDestinationUri' });
                return 'noDestinationUri';
            }
            if (URI.isUri(uri)) {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'resolvedUri' });
                return uri;
            }
            this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'invalidDestination' });
            return undefined;
        }
        catch (ex) {
            if (ex instanceof CancellationError) {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'cancelled' });
            }
            else {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'unknownError' });
            }
            return undefined;
        }
    }
    createPickItems() {
        const items = [...this.continueEditSessionOptions].filter((option) => option.when === undefined || this.contextKeyService.contextMatchesRules(option.when));
        if (getVirtualWorkspaceLocation(this.contextService.getWorkspace()) !== undefined && isNative) {
            items.push(new ContinueEditSessionItem('$(folder) ' + localize('continueEditSessionItem.openInLocalFolder.v2', 'Open in Local Folder'), openLocalFolderCommand.id, localize('continueEditSessionItem.builtin', 'Built-in')));
        }
        const sortedItems = items.sort((item1, item2) => item1.label.localeCompare(item2.label));
        return sortedItems.concat({ type: 'separator' }, new ContinueEditSessionItem(installAdditionalContinueOnOptionsCommand.title, installAdditionalContinueOnOptionsCommand.id));
    }
};
EditSessionsContribution = EditSessionsContribution_1 = __decorate([
    __param(0, IEditSessionsStorageService),
    __param(1, IFileService),
    __param(2, IProgressService),
    __param(3, IOpenerService),
    __param(4, ITelemetryService),
    __param(5, ISCMService),
    __param(6, INotificationService),
    __param(7, IDialogService),
    __param(8, IEditSessionsLogService),
    __param(9, IEnvironmentService),
    __param(10, IInstantiationService),
    __param(11, IProductService),
    __param(12, IConfigurationService),
    __param(13, IWorkspaceContextService),
    __param(14, IEditSessionIdentityService),
    __param(15, IQuickInputService),
    __param(16, ICommandService),
    __param(17, IContextKeyService),
    __param(18, IFileDialogService),
    __param(19, ILifecycleService),
    __param(20, IStorageService),
    __param(21, IActivityService),
    __param(22, IEditorService),
    __param(23, IRemoteAgentService),
    __param(24, IExtensionService),
    __param(25, IRequestService),
    __param(26, IUserDataProfilesService),
    __param(27, IUriIdentityService),
    __param(28, IWorkspaceIdentityService)
], EditSessionsContribution);
export { EditSessionsContribution };
const infoButtonClass = ThemeIcon.asClassName(Codicon.info);
class ContinueEditSessionItem {
    constructor(label, command, description, when, documentation) {
        this.label = label;
        this.command = command;
        this.description = description;
        this.when = when;
        this.documentation = documentation;
        if (documentation !== undefined) {
            this.buttons = [{
                    iconClass: infoButtonClass,
                    tooltip: localize('learnMoreTooltip', 'Learn More'),
                }];
        }
    }
}
const continueEditSessionExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'continueEditSession',
    jsonSchema: {
        description: localize('continueEditSessionExtPoint', 'Contributes options for continuing the current edit session in a different environment'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                command: {
                    description: localize('continueEditSessionExtPoint.command', 'Identifier of the command to execute. The command must be declared in the \'commands\'-section and return a URI representing a different environment where the current edit session can be continued.'),
                    type: 'string'
                },
                group: {
                    description: localize('continueEditSessionExtPoint.group', 'Group into which this item belongs.'),
                    type: 'string'
                },
                qualifiedName: {
                    description: localize('continueEditSessionExtPoint.qualifiedName', 'A fully qualified name for this item which is used for display in menus.'),
                    type: 'string'
                },
                description: {
                    description: localize('continueEditSessionExtPoint.description', "The url, or a command that returns the url, to the option's documentation page."),
                    type: 'string'
                },
                remoteGroup: {
                    description: localize('continueEditSessionExtPoint.remoteGroup', 'Group into which this item belongs in the remote indicator.'),
                    type: 'string'
                },
                when: {
                    description: localize('continueEditSessionExtPoint.when', 'Condition which must be true to show this item.'),
                    type: 'string'
                }
            },
            required: ['command']
        }
    }
});
//#endregion
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(EditSessionsContribution, 3 /* LifecyclePhase.Restored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    'properties': {
        'workbench.experimental.cloudChanges.autoStore': {
            enum: ['onShutdown', 'off'],
            enumDescriptions: [
                localize('autoStoreWorkingChanges.onShutdown', "Automatically store current working changes in the cloud on window close."),
                localize('autoStoreWorkingChanges.off', "Never attempt to automatically store working changes in the cloud.")
            ],
            'type': 'string',
            'tags': ['experimental', 'usesOnlineServices'],
            'default': 'off',
            'markdownDescription': localize('autoStoreWorkingChangesDescription', "Controls whether to automatically store available working changes in the cloud for the current workspace. This setting has no effect in the web."),
        },
        'workbench.cloudChanges.autoResume': {
            enum: ['onReload', 'off'],
            enumDescriptions: [
                localize('autoResumeWorkingChanges.onReload', "Automatically resume available working changes from the cloud on window reload."),
                localize('autoResumeWorkingChanges.off', "Never attempt to resume working changes from the cloud.")
            ],
            'type': 'string',
            'tags': ['usesOnlineServices'],
            'default': 'onReload',
            'markdownDescription': localize('autoResumeWorkingChanges', "Controls whether to automatically resume available working changes stored in the cloud for the current workspace."),
        },
        'workbench.cloudChanges.continueOn': {
            enum: ['prompt', 'off'],
            enumDescriptions: [
                localize('continueOnCloudChanges.promptForAuth', 'Prompt the user to sign in to store working changes in the cloud with Continue Working On.'),
                localize('continueOnCloudChanges.off', 'Do not store working changes in the cloud with Continue Working On unless the user has already turned on Cloud Changes.')
            ],
            type: 'string',
            tags: ['usesOnlineServices'],
            default: 'prompt',
            markdownDescription: localize('continueOnCloudChanges', 'Controls whether to prompt the user to store working changes in the cloud when using Continue Working On.')
        },
        'workbench.experimental.cloudChanges.partialMatches.enabled': {
            'type': 'boolean',
            'tags': ['experimental', 'usesOnlineServices'],
            'default': false,
            'markdownDescription': localize('cloudChangesPartialMatchesEnabled', "Controls whether to surface cloud changes which partially match the current session.")
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0U2Vzc2lvbnMvYnJvd3Nlci9lZGl0U2Vzc2lvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RHLE9BQU8sRUFBbUMsVUFBVSxJQUFJLG1CQUFtQixFQUEwQixNQUFNLGtDQUFrQyxDQUFDO0FBQzlJLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQWtDLE1BQU0saURBQWlELENBQUM7QUFDcEgsT0FBTyxFQUFFLE9BQU8sRUFBbUIsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVqSSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSwyQkFBMkIsRUFBVSxVQUFVLEVBQXVCLFFBQVEsRUFBRSwwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSx3QkFBd0IsRUFBRSx1QkFBdUIsRUFBRSx1QkFBdUIsRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSwwQkFBMEIsRUFBRSw0QkFBNEIsRUFBRSxtQkFBbUIsRUFBRSxpQkFBaUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RhLE9BQU8sRUFBa0IsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FB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