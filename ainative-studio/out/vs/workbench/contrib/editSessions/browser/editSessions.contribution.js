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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRTZXNzaW9ucy9icm93c2VyL2VkaXRTZXNzaW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEcsT0FBTyxFQUFtQyxVQUFVLElBQUksbUJBQW1CLEVBQTBCLE1BQU0sa0NBQWtDLENBQUM7QUFDOUksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0MsTUFBTSxpREFBaUQsQ0FBQztBQUNwSCxPQUFPLEVBQUUsT0FBTyxFQUFtQixNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWpJLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLDJCQUEyQixFQUFVLFVBQVUsRUFBdUIsUUFBUSxFQUFFLDBCQUEwQixFQUFFLDBCQUEwQixFQUFFLHdCQUF3QixFQUFFLHVCQUF1QixFQUFFLHVCQUF1QixFQUFFLG1CQUFtQixFQUFFLHVCQUF1QixFQUFFLDBCQUEwQixFQUFFLDRCQUE0QixFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdGEsT0FBTyxFQUFrQixXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFD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