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
import { toAction } from '../../../../base/common/actions.js';
import { getErrorMessage, isCancellationError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, ContextKeyTrueExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataAutoSyncService, IUserDataSyncService, registerConfiguration, UserDataSyncError, USER_DATA_SYNC_SCHEME, IUserDataSyncEnablementService, IUserDataSyncStoreManagementService, USER_DATA_SYNC_LOG_ID } from '../../../../platform/userDataSync/common/userDataSync.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { IActivityService, NumberBadge, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { fromNow } from '../../../../base/common/date.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Extensions } from '../../../common/views.js';
import { UserDataSyncDataViews } from './userDataSyncViews.js';
import { IUserDataSyncWorkbenchService, getSyncAreaLabel, CONTEXT_SYNC_STATE, CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE, CONFIGURE_SYNC_COMMAND_ID, SHOW_SYNC_LOG_COMMAND_ID, SYNC_VIEW_CONTAINER_ID, SYNC_TITLE, SYNC_VIEW_ICON, CONTEXT_HAS_CONFLICTS, DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR } from '../../../services/userDataSync/common/userDataSync.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { ctxIsMergeResultEditor, ctxMergeBaseUri } from '../../mergeEditor/common/mergeEditor.js';
import { IWorkbenchIssueService } from '../../issue/common/issue.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { isWeb } from '../../../../base/common/platform.js';
import { PromptsConfig } from '../../../../platform/prompts/common/config.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const turnOffSyncCommand = { id: 'workbench.userDataSync.actions.turnOff', title: localize2('stop sync', 'Turn Off') };
const configureSyncCommand = { id: CONFIGURE_SYNC_COMMAND_ID, title: localize2('configure sync', 'Configure...') };
const showConflictsCommandId = 'workbench.userDataSync.actions.showConflicts';
const syncNowCommand = {
    id: 'workbench.userDataSync.actions.syncNow',
    title: localize2('sync now', 'Sync Now'),
    description(userDataSyncService) {
        if (userDataSyncService.status === "syncing" /* SyncStatus.Syncing */) {
            return localize('syncing', "syncing");
        }
        if (userDataSyncService.lastSyncTime) {
            return localize('synced with time', "synced {0}", fromNow(userDataSyncService.lastSyncTime, true));
        }
        return undefined;
    }
};
const showSyncSettingsCommand = { id: 'workbench.userDataSync.actions.settings', title: localize2('sync settings', 'Show Settings'), };
const showSyncedDataCommand = { id: 'workbench.userDataSync.actions.showSyncedData', title: localize2('show synced data', 'Show Synced Data'), };
const CONTEXT_TURNING_ON_STATE = new RawContextKey('userDataSyncTurningOn', false);
let UserDataSyncWorkbenchContribution = class UserDataSyncWorkbenchContribution extends Disposable {
    constructor(userDataSyncEnablementService, userDataSyncService, userDataSyncWorkbenchService, contextKeyService, activityService, notificationService, editorService, userDataProfileService, dialogService, quickInputService, instantiationService, outputService, userDataAutoSyncService, textModelResolverService, preferencesService, telemetryService, productService, openerService, authenticationService, userDataSyncStoreManagementService, hostService, commandService, workbenchIssueService, configService) {
        super();
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.activityService = activityService;
        this.notificationService = notificationService;
        this.editorService = editorService;
        this.userDataProfileService = userDataProfileService;
        this.dialogService = dialogService;
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.outputService = outputService;
        this.preferencesService = preferencesService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.openerService = openerService;
        this.authenticationService = authenticationService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.hostService = hostService;
        this.commandService = commandService;
        this.workbenchIssueService = workbenchIssueService;
        this.configService = configService;
        this.globalActivityBadgeDisposable = this._register(new MutableDisposable());
        this.accountBadgeDisposable = this._register(new MutableDisposable());
        this.conflictsDisposables = new Map();
        this.invalidContentErrorDisposables = new Map();
        this.conflictsActionDisposable = this._register(new MutableDisposable());
        this.turningOnSyncContext = CONTEXT_TURNING_ON_STATE.bindTo(contextKeyService);
        if (userDataSyncWorkbenchService.enabled) {
            registerConfiguration();
            this.updateAccountBadge();
            this.updateGlobalActivityBadge();
            this.onDidChangeConflicts(this.userDataSyncService.conflicts);
            this._register(Event.any(Event.debounce(userDataSyncService.onDidChangeStatus, () => undefined, 500), this.userDataSyncEnablementService.onDidChangeEnablement, this.userDataSyncWorkbenchService.onDidChangeAccountStatus)(() => {
                this.updateAccountBadge();
                this.updateGlobalActivityBadge();
            }));
            this._register(userDataSyncService.onDidChangeConflicts(() => this.onDidChangeConflicts(this.userDataSyncService.conflicts)));
            this._register(userDataSyncEnablementService.onDidChangeEnablement(() => this.onDidChangeConflicts(this.userDataSyncService.conflicts)));
            this._register(userDataSyncService.onSyncErrors(errors => this.onSynchronizerErrors(errors)));
            this._register(userDataAutoSyncService.onError(error => this.onAutoSyncError(error)));
            this.registerActions();
            this.registerViews();
            textModelResolverService.registerTextModelContentProvider(USER_DATA_SYNC_SCHEME, instantiationService.createInstance(UserDataRemoteContentProvider));
            this._register(Event.any(userDataSyncService.onDidChangeStatus, userDataSyncEnablementService.onDidChangeEnablement)(() => this.turningOnSync = !userDataSyncEnablementService.isEnabled() && userDataSyncService.status !== "idle" /* SyncStatus.Idle */));
        }
    }
    get turningOnSync() {
        return !!this.turningOnSyncContext.get();
    }
    set turningOnSync(turningOn) {
        this.turningOnSyncContext.set(turningOn);
        this.updateGlobalActivityBadge();
    }
    toKey({ syncResource: resource, profile }) {
        return `${profile.id}:${resource}`;
    }
    onDidChangeConflicts(conflicts) {
        this.updateGlobalActivityBadge();
        this.registerShowConflictsAction();
        if (!this.userDataSyncEnablementService.isEnabled()) {
            return;
        }
        if (conflicts.length) {
            // Clear and dispose conflicts those were cleared
            for (const [key, disposable] of this.conflictsDisposables.entries()) {
                if (!conflicts.some(conflict => this.toKey(conflict) === key)) {
                    disposable.dispose();
                    this.conflictsDisposables.delete(key);
                }
            }
            for (const conflict of this.userDataSyncService.conflicts) {
                const key = this.toKey(conflict);
                // Show conflicts notification if not shown before
                if (!this.conflictsDisposables.has(key)) {
                    const conflictsArea = getSyncAreaLabel(conflict.syncResource);
                    const handle = this.notificationService.prompt(Severity.Warning, localize('conflicts detected', "Unable to sync due to conflicts in {0}. Please resolve them to continue.", conflictsArea.toLowerCase()), [
                        {
                            label: localize('replace remote', "Replace Remote"),
                            run: () => {
                                this.acceptLocal(conflict, conflict.conflicts[0]);
                            }
                        },
                        {
                            label: localize('replace local', "Replace Local"),
                            run: () => {
                                this.acceptRemote(conflict, conflict.conflicts[0]);
                            }
                        },
                        {
                            label: localize('show conflicts', "Show Conflicts"),
                            run: () => {
                                this.telemetryService.publicLog2('sync/showConflicts', { source: conflict.syncResource });
                                this.userDataSyncWorkbenchService.showConflicts(conflict.conflicts[0]);
                            }
                        }
                    ], {
                        sticky: true
                    });
                    this.conflictsDisposables.set(key, toDisposable(() => {
                        // close the conflicts warning notification
                        handle.close();
                        this.conflictsDisposables.delete(key);
                    }));
                }
            }
        }
        else {
            this.conflictsDisposables.forEach(disposable => disposable.dispose());
            this.conflictsDisposables.clear();
        }
    }
    async acceptRemote(syncResource, conflict) {
        try {
            await this.userDataSyncService.accept(syncResource, conflict.remoteResource, undefined, this.userDataSyncEnablementService.isEnabled());
        }
        catch (e) {
            this.notificationService.error(localize('accept failed', "Error while accepting changes. Please check [logs]({0}) for more details.", `command:${SHOW_SYNC_LOG_COMMAND_ID}`));
        }
    }
    async acceptLocal(syncResource, conflict) {
        try {
            await this.userDataSyncService.accept(syncResource, conflict.localResource, undefined, this.userDataSyncEnablementService.isEnabled());
        }
        catch (e) {
            this.notificationService.error(localize('accept failed', "Error while accepting changes. Please check [logs]({0}) for more details.", `command:${SHOW_SYNC_LOG_COMMAND_ID}`));
        }
    }
    onAutoSyncError(error) {
        switch (error.code) {
            case "SessionExpired" /* UserDataSyncErrorCode.SessionExpired */:
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: localize('session expired', "Settings sync was turned off because current session is expired, please sign in again to turn on sync."),
                    actions: {
                        primary: [toAction({
                                id: 'turn on sync',
                                label: localize('turn on sync', "Turn on Settings Sync..."),
                                run: () => this.turnOn()
                            })]
                    }
                });
                break;
            case "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */:
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: localize('turned off', "Settings sync was turned off from another device, please turn on sync again."),
                    actions: {
                        primary: [toAction({
                                id: 'turn on sync',
                                label: localize('turn on sync', "Turn on Settings Sync..."),
                                run: () => this.turnOn()
                            })]
                    }
                });
                break;
            case "TooLarge" /* UserDataSyncErrorCode.TooLarge */:
                if (error.resource === "keybindings" /* SyncResource.Keybindings */ || error.resource === "settings" /* SyncResource.Settings */ || error.resource === "tasks" /* SyncResource.Tasks */) {
                    this.disableSync(error.resource);
                    const sourceArea = getSyncAreaLabel(error.resource);
                    this.handleTooLargeError(error.resource, localize('too large', "Disabled syncing {0} because size of the {1} file to sync is larger than {2}. Please open the file and reduce the size and enable sync", sourceArea.toLowerCase(), sourceArea.toLowerCase(), '100kb'), error);
                }
                break;
            case "LocalTooManyProfiles" /* UserDataSyncErrorCode.LocalTooManyProfiles */:
                this.disableSync("profiles" /* SyncResource.Profiles */);
                this.notificationService.error(localize('too many profiles', "Disabled syncing profiles because there are too many profiles to sync. Settings Sync supports syncing maximum 20 profiles. Please reduce the number of profiles and enable sync"));
                break;
            case "IncompatibleLocalContent" /* UserDataSyncErrorCode.IncompatibleLocalContent */:
            case "Gone" /* UserDataSyncErrorCode.Gone */:
            case "UpgradeRequired" /* UserDataSyncErrorCode.UpgradeRequired */: {
                const message = localize('error upgrade required', "Settings sync is disabled because the current version ({0}, {1}) is not compatible with the sync service. Please update before turning on sync.", this.productService.version, this.productService.commit);
                const operationId = error.operationId ? localize('operationId', "Operation Id: {0}", error.operationId) : undefined;
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: operationId ? `${message} ${operationId}` : message,
                });
                break;
            }
            case "MethodNotFound" /* UserDataSyncErrorCode.MethodNotFound */: {
                const message = localize('method not found', "Settings sync is disabled because the client is making invalid requests. Please report an issue with the logs.");
                const operationId = error.operationId ? localize('operationId', "Operation Id: {0}", error.operationId) : undefined;
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: operationId ? `${message} ${operationId}` : message,
                    actions: {
                        primary: [
                            toAction({
                                id: 'Show Sync Logs',
                                label: localize('show sync logs', "Show Log"),
                                run: () => this.commandService.executeCommand(SHOW_SYNC_LOG_COMMAND_ID)
                            }),
                            toAction({
                                id: 'Report Issue',
                                label: localize('report issue', "Report Issue"),
                                run: () => this.workbenchIssueService.openReporter()
                            })
                        ]
                    }
                });
                break;
            }
            case "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */:
                this.notificationService.notify({
                    severity: Severity.Error,
                    message: localize('error reset required', "Settings sync is disabled because your data in the cloud is older than that of the client. Please clear your data in the cloud before turning on sync."),
                    actions: {
                        primary: [
                            toAction({
                                id: 'reset',
                                label: localize('reset', "Clear Data in Cloud..."),
                                run: () => this.userDataSyncWorkbenchService.resetSyncedData()
                            }),
                            toAction({
                                id: 'show synced data',
                                label: localize('show synced data action', "Show Synced Data"),
                                run: () => this.userDataSyncWorkbenchService.showSyncActivity()
                            })
                        ]
                    }
                });
                return;
            case "ServiceChanged" /* UserDataSyncErrorCode.ServiceChanged */:
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: this.userDataSyncStoreManagementService.userDataSyncStore?.type === 'insiders' ?
                        localize('service switched to insiders', "Settings Sync has been switched to insiders service") :
                        localize('service switched to stable', "Settings Sync has been switched to stable service"),
                });
                return;
            case "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */:
                // Settings sync is using separate service
                if (this.userDataSyncEnablementService.isEnabled()) {
                    this.notificationService.notify({
                        severity: Severity.Info,
                        message: localize('using separate service', "Settings sync now uses a separate service, more information is available in the [Settings Sync Documentation](https://aka.ms/vscode-settings-sync-help#_syncing-stable-versus-insiders)."),
                    });
                }
                // If settings sync got turned off then ask user to turn on sync again.
                else {
                    this.notificationService.notify({
                        severity: Severity.Info,
                        message: localize('service changed and turned off', "Settings sync was turned off because {0} now uses a separate service. Please turn on sync again.", this.productService.nameLong),
                        actions: {
                            primary: [toAction({
                                    id: 'turn on sync',
                                    label: localize('turn on sync', "Turn on Settings Sync..."),
                                    run: () => this.turnOn()
                                })]
                        }
                    });
                }
                return;
        }
    }
    handleTooLargeError(resource, message, error) {
        const operationId = error.operationId ? localize('operationId', "Operation Id: {0}", error.operationId) : undefined;
        this.notificationService.notify({
            severity: Severity.Error,
            message: operationId ? `${message} ${operationId}` : message,
            actions: {
                primary: [toAction({
                        id: 'open sync file',
                        label: localize('open file', "Open {0} File", getSyncAreaLabel(resource)),
                        run: () => resource === "settings" /* SyncResource.Settings */ ? this.preferencesService.openUserSettings({ jsonEditor: true }) : this.preferencesService.openGlobalKeybindingSettings(true)
                    })]
            }
        });
    }
    onSynchronizerErrors(errors) {
        if (errors.length) {
            for (const { profile, syncResource: resource, error } of errors) {
                switch (error.code) {
                    case "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */:
                        this.handleInvalidContentError({ profile, syncResource: resource });
                        break;
                    default: {
                        const key = `${profile.id}:${resource}`;
                        const disposable = this.invalidContentErrorDisposables.get(key);
                        if (disposable) {
                            disposable.dispose();
                            this.invalidContentErrorDisposables.delete(key);
                        }
                    }
                }
            }
        }
        else {
            this.invalidContentErrorDisposables.forEach(disposable => disposable.dispose());
            this.invalidContentErrorDisposables.clear();
        }
    }
    handleInvalidContentError({ profile, syncResource: source }) {
        if (this.userDataProfileService.currentProfile.id !== profile.id) {
            return;
        }
        const key = `${profile.id}:${source}`;
        if (this.invalidContentErrorDisposables.has(key)) {
            return;
        }
        if (source !== "settings" /* SyncResource.Settings */ && source !== "keybindings" /* SyncResource.Keybindings */ && source !== "tasks" /* SyncResource.Tasks */) {
            return;
        }
        if (!this.hostService.hasFocus) {
            return;
        }
        const resource = source === "settings" /* SyncResource.Settings */ ? this.userDataProfileService.currentProfile.settingsResource
            : source === "keybindings" /* SyncResource.Keybindings */ ? this.userDataProfileService.currentProfile.keybindingsResource
                : this.userDataProfileService.currentProfile.tasksResource;
        const editorUri = EditorResourceAccessor.getCanonicalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (isEqual(resource, editorUri)) {
            // Do not show notification if the file in error is active
            return;
        }
        const errorArea = getSyncAreaLabel(source);
        const handle = this.notificationService.notify({
            severity: Severity.Error,
            message: localize('errorInvalidConfiguration', "Unable to sync {0} because the content in the file is not valid. Please open the file and correct it.", errorArea.toLowerCase()),
            actions: {
                primary: [toAction({
                        id: 'open sync file',
                        label: localize('open file', "Open {0} File", errorArea),
                        run: () => source === "settings" /* SyncResource.Settings */ ? this.preferencesService.openUserSettings({ jsonEditor: true }) : this.preferencesService.openGlobalKeybindingSettings(true)
                    })]
            }
        });
        this.invalidContentErrorDisposables.set(key, toDisposable(() => {
            // close the error warning notification
            handle.close();
            this.invalidContentErrorDisposables.delete(key);
        }));
    }
    getConflictsCount() {
        return this.userDataSyncService.conflicts.reduce((result, { conflicts }) => { return result + conflicts.length; }, 0);
    }
    async updateGlobalActivityBadge() {
        this.globalActivityBadgeDisposable.clear();
        let badge = undefined;
        if (this.userDataSyncService.conflicts.length && this.userDataSyncEnablementService.isEnabled()) {
            badge = new NumberBadge(this.getConflictsCount(), () => localize('has conflicts', "{0}: Conflicts Detected", SYNC_TITLE.value));
        }
        else if (this.turningOnSync) {
            badge = new ProgressBadge(() => localize('turning on syncing', "Turning on Settings Sync..."));
        }
        if (badge) {
            this.globalActivityBadgeDisposable.value = this.activityService.showGlobalActivity({ badge });
        }
    }
    async updateAccountBadge() {
        this.accountBadgeDisposable.clear();
        let badge = undefined;
        if (this.userDataSyncService.status !== "uninitialized" /* SyncStatus.Uninitialized */ && this.userDataSyncEnablementService.isEnabled() && this.userDataSyncWorkbenchService.accountStatus === "unavailable" /* AccountStatus.Unavailable */) {
            badge = new NumberBadge(1, () => localize('sign in to sync', "Sign in to Sync Settings"));
        }
        if (badge) {
            this.accountBadgeDisposable.value = this.activityService.showAccountsActivity({ badge });
        }
    }
    async turnOn() {
        try {
            if (!this.userDataSyncWorkbenchService.authenticationProviders.length) {
                throw new Error(localize('no authentication providers', "No authentication providers are available."));
            }
            const turnOn = await this.askToConfigure();
            if (!turnOn) {
                return;
            }
            if (this.userDataSyncStoreManagementService.userDataSyncStore?.canSwitch) {
                await this.selectSettingsSyncService(this.userDataSyncStoreManagementService.userDataSyncStore);
            }
            await this.userDataSyncWorkbenchService.turnOn();
        }
        catch (e) {
            if (isCancellationError(e)) {
                return;
            }
            if (e instanceof UserDataSyncError) {
                switch (e.code) {
                    case "TooLarge" /* UserDataSyncErrorCode.TooLarge */:
                        if (e.resource === "keybindings" /* SyncResource.Keybindings */ || e.resource === "settings" /* SyncResource.Settings */ || e.resource === "tasks" /* SyncResource.Tasks */) {
                            this.handleTooLargeError(e.resource, localize('too large while starting sync', "Settings sync cannot be turned on because size of the {0} file to sync is larger than {1}. Please open the file and reduce the size and turn on sync", getSyncAreaLabel(e.resource).toLowerCase(), '100kb'), e);
                            return;
                        }
                        break;
                    case "IncompatibleLocalContent" /* UserDataSyncErrorCode.IncompatibleLocalContent */:
                    case "Gone" /* UserDataSyncErrorCode.Gone */:
                    case "UpgradeRequired" /* UserDataSyncErrorCode.UpgradeRequired */: {
                        const message = localize('error upgrade required while starting sync', "Settings sync cannot be turned on because the current version ({0}, {1}) is not compatible with the sync service. Please update before turning on sync.", this.productService.version, this.productService.commit);
                        const operationId = e.operationId ? localize('operationId', "Operation Id: {0}", e.operationId) : undefined;
                        this.notificationService.notify({
                            severity: Severity.Error,
                            message: operationId ? `${message} ${operationId}` : message,
                        });
                        return;
                    }
                    case "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */:
                        this.notificationService.notify({
                            severity: Severity.Error,
                            message: localize('error reset required while starting sync', "Settings sync cannot be turned on because your data in the cloud is older than that of the client. Please clear your data in the cloud before turning on sync."),
                            actions: {
                                primary: [
                                    toAction({
                                        id: 'reset',
                                        label: localize('reset', "Clear Data in Cloud..."),
                                        run: () => this.userDataSyncWorkbenchService.resetSyncedData()
                                    }),
                                    toAction({
                                        id: 'show synced data',
                                        label: localize('show synced data action', "Show Synced Data"),
                                        run: () => this.userDataSyncWorkbenchService.showSyncActivity()
                                    })
                                ]
                            }
                        });
                        return;
                    case "Unauthorized" /* UserDataSyncErrorCode.Unauthorized */:
                    case "Forbidden" /* UserDataSyncErrorCode.Forbidden */:
                        this.notificationService.error(localize('auth failed', "Error while turning on Settings Sync: Authentication failed."));
                        return;
                }
                this.notificationService.error(localize('turn on failed with user data sync error', "Error while turning on Settings Sync. Please check [logs]({0}) for more details.", `command:${SHOW_SYNC_LOG_COMMAND_ID}`));
            }
            else {
                this.notificationService.error(localize({ key: 'turn on failed', comment: ['Substitution is for error reason'] }, "Error while turning on Settings Sync. {0}", getErrorMessage(e)));
            }
        }
    }
    async askToConfigure() {
        return new Promise((c, e) => {
            const disposables = new DisposableStore();
            const quickPick = this.quickInputService.createQuickPick();
            disposables.add(quickPick);
            quickPick.title = SYNC_TITLE.value;
            quickPick.ok = false;
            quickPick.customButton = true;
            quickPick.customLabel = localize('sign in and turn on', "Sign in");
            quickPick.description = localize('configure and turn on sync detail', "Please sign in to backup and sync your data across devices.");
            quickPick.canSelectMany = true;
            quickPick.ignoreFocusOut = true;
            quickPick.hideInput = true;
            quickPick.hideCheckAll = true;
            const items = this.getConfigureSyncQuickPickItems();
            quickPick.items = items;
            quickPick.selectedItems = items.filter(item => this.userDataSyncEnablementService.isResourceEnabled(item.id, true));
            let accepted = false;
            disposables.add(Event.any(quickPick.onDidAccept, quickPick.onDidCustom)(() => {
                accepted = true;
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                try {
                    if (accepted) {
                        this.updateConfiguration(items, quickPick.selectedItems);
                    }
                    c(accepted);
                }
                catch (error) {
                    e(error);
                }
                finally {
                    disposables.dispose();
                }
            }));
            quickPick.show();
        });
    }
    getConfigureSyncQuickPickItems() {
        const result = [{
                id: "settings" /* SyncResource.Settings */,
                label: getSyncAreaLabel("settings" /* SyncResource.Settings */)
            }, {
                id: "keybindings" /* SyncResource.Keybindings */,
                label: getSyncAreaLabel("keybindings" /* SyncResource.Keybindings */),
            }, {
                id: "snippets" /* SyncResource.Snippets */,
                label: getSyncAreaLabel("snippets" /* SyncResource.Snippets */)
            }, {
                id: "tasks" /* SyncResource.Tasks */,
                label: getSyncAreaLabel("tasks" /* SyncResource.Tasks */)
            }, {
                id: "globalState" /* SyncResource.GlobalState */,
                label: getSyncAreaLabel("globalState" /* SyncResource.GlobalState */),
            }, {
                id: "extensions" /* SyncResource.Extensions */,
                label: getSyncAreaLabel("extensions" /* SyncResource.Extensions */)
            }, {
                id: "profiles" /* SyncResource.Profiles */,
                label: getSyncAreaLabel("profiles" /* SyncResource.Profiles */),
            }];
        // if the `reusable prompt` feature is enabled and in vscode
        // insiders, add the `Prompts` resource item to the list
        if (PromptsConfig.enabled(this.configService) === true) {
            result.push({
                id: "prompts" /* SyncResource.Prompts */,
                label: getSyncAreaLabel("prompts" /* SyncResource.Prompts */)
            });
        }
        return result;
    }
    updateConfiguration(items, selectedItems) {
        for (const item of items) {
            const wasEnabled = this.userDataSyncEnablementService.isResourceEnabled(item.id);
            const isEnabled = !!selectedItems.filter(selected => selected.id === item.id)[0];
            if (wasEnabled !== isEnabled) {
                this.userDataSyncEnablementService.setResourceEnablement(item.id, isEnabled);
            }
        }
    }
    async configureSyncOptions() {
        return new Promise((c, e) => {
            const disposables = new DisposableStore();
            const quickPick = this.quickInputService.createQuickPick();
            disposables.add(quickPick);
            quickPick.title = localize('configure sync title', "{0}: Configure...", SYNC_TITLE.value);
            quickPick.placeholder = localize('configure sync placeholder', "Choose what to sync");
            quickPick.canSelectMany = true;
            quickPick.ignoreFocusOut = true;
            quickPick.ok = true;
            const items = this.getConfigureSyncQuickPickItems();
            quickPick.items = items;
            quickPick.selectedItems = items.filter(item => this.userDataSyncEnablementService.isResourceEnabled(item.id));
            disposables.add(quickPick.onDidAccept(async () => {
                if (quickPick.selectedItems.length) {
                    this.updateConfiguration(items, quickPick.selectedItems);
                    quickPick.hide();
                }
            }));
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                c();
            }));
            quickPick.show();
        });
    }
    async turnOff() {
        const result = await this.dialogService.confirm({
            message: localize('turn off sync confirmation', "Do you want to turn off sync?"),
            detail: localize('turn off sync detail', "Your settings, keybindings, extensions, snippets and UI State will no longer be synced."),
            primaryButton: localize({ key: 'turn off', comment: ['&& denotes a mnemonic'] }, "&&Turn off"),
            checkbox: this.userDataSyncWorkbenchService.accountStatus === "available" /* AccountStatus.Available */ ? {
                label: localize('turn off sync everywhere', "Turn off sync on all your devices and clear the data from the cloud.")
            } : undefined
        });
        if (result.confirmed) {
            return this.userDataSyncWorkbenchService.turnoff(!!result.checkboxChecked);
        }
    }
    disableSync(source) {
        switch (source) {
            case "settings" /* SyncResource.Settings */: return this.userDataSyncEnablementService.setResourceEnablement("settings" /* SyncResource.Settings */, false);
            case "keybindings" /* SyncResource.Keybindings */: return this.userDataSyncEnablementService.setResourceEnablement("keybindings" /* SyncResource.Keybindings */, false);
            case "snippets" /* SyncResource.Snippets */: return this.userDataSyncEnablementService.setResourceEnablement("snippets" /* SyncResource.Snippets */, false);
            case "tasks" /* SyncResource.Tasks */: return this.userDataSyncEnablementService.setResourceEnablement("tasks" /* SyncResource.Tasks */, false);
            case "extensions" /* SyncResource.Extensions */: return this.userDataSyncEnablementService.setResourceEnablement("extensions" /* SyncResource.Extensions */, false);
            case "globalState" /* SyncResource.GlobalState */: return this.userDataSyncEnablementService.setResourceEnablement("globalState" /* SyncResource.GlobalState */, false);
            case "profiles" /* SyncResource.Profiles */: return this.userDataSyncEnablementService.setResourceEnablement("profiles" /* SyncResource.Profiles */, false);
        }
    }
    showSyncActivity() {
        return this.outputService.showChannel(USER_DATA_SYNC_LOG_ID);
    }
    async selectSettingsSyncService(userDataSyncStore) {
        return new Promise((c, e) => {
            const disposables = new DisposableStore();
            const quickPick = disposables.add(this.quickInputService.createQuickPick());
            quickPick.title = localize('switchSyncService.title', "{0}: Select Service", SYNC_TITLE.value);
            quickPick.description = localize('switchSyncService.description', "Ensure you are using the same settings sync service when syncing with multiple environments");
            quickPick.hideInput = true;
            quickPick.ignoreFocusOut = true;
            const getDescription = (url) => {
                const isDefault = isEqual(url, userDataSyncStore.defaultUrl);
                if (isDefault) {
                    return localize('default', "Default");
                }
                return undefined;
            };
            quickPick.items = [
                {
                    id: 'insiders',
                    label: localize('insiders', "Insiders"),
                    description: getDescription(userDataSyncStore.insidersUrl)
                },
                {
                    id: 'stable',
                    label: localize('stable', "Stable"),
                    description: getDescription(userDataSyncStore.stableUrl)
                }
            ];
            disposables.add(quickPick.onDidAccept(async () => {
                try {
                    await this.userDataSyncStoreManagementService.switch(quickPick.selectedItems[0].id);
                    c();
                }
                catch (error) {
                    e(error);
                }
                finally {
                    quickPick.hide();
                }
            }));
            disposables.add(quickPick.onDidHide(() => disposables.dispose()));
            quickPick.show();
        });
    }
    registerActions() {
        if (this.userDataSyncEnablementService.canToggleEnablement()) {
            this.registerTurnOnSyncAction();
            this.registerTurnOffSyncAction();
        }
        this.registerTurningOnSyncAction();
        this.registerCancelTurnOnSyncAction();
        this.registerSignInAction(); // When Sync is turned on from CLI
        this.registerShowConflictsAction();
        this.registerEnableSyncViewsAction();
        this.registerManageSyncAction();
        this.registerSyncNowAction();
        this.registerConfigureSyncAction();
        this.registerShowSettingsAction();
        this.registerHelpAction();
        this.registerShowLogAction();
        this.registerResetSyncDataAction();
        this.registerAcceptMergesAction();
        if (isWeb) {
            this.registerDownloadSyncActivityAction();
        }
    }
    registerTurnOnSyncAction() {
        const that = this;
        const when = ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT.toNegated(), CONTEXT_TURNING_ON_STATE.negate());
        this._register(registerAction2(class TurningOnSyncAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userDataSync.actions.turnOn',
                    title: localize2('global activity turn on sync', 'Backup and Sync Settings...'),
                    category: SYNC_TITLE,
                    f1: true,
                    precondition: when,
                    menu: [{
                            group: '3_configuration',
                            id: MenuId.GlobalActivity,
                            when,
                            order: 2
                        }, {
                            group: '3_configuration',
                            id: MenuId.MenubarPreferencesMenu,
                            when,
                            order: 2
                        }, {
                            group: '1_settings',
                            id: MenuId.AccountsContext,
                            when,
                            order: 2
                        }]
                });
            }
            async run() {
                return that.turnOn();
            }
        }));
    }
    registerTurningOnSyncAction() {
        const when = ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT.toNegated(), CONTEXT_TURNING_ON_STATE);
        this._register(registerAction2(class TurningOnSyncAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userData.actions.turningOn',
                    title: localize('turning on sync', "Turning on Settings Sync..."),
                    precondition: ContextKeyExpr.false(),
                    menu: [{
                            group: '3_configuration',
                            id: MenuId.GlobalActivity,
                            when,
                            order: 2
                        }, {
                            group: '1_settings',
                            id: MenuId.AccountsContext,
                            when,
                        }]
                });
            }
            async run() { }
        }));
    }
    registerCancelTurnOnSyncAction() {
        const that = this;
        this._register(registerAction2(class TurningOnSyncAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userData.actions.cancelTurnOn',
                    title: localize('cancel turning on sync', "Cancel"),
                    icon: Codicon.stopCircle,
                    menu: {
                        id: MenuId.ViewContainerTitle,
                        when: ContextKeyExpr.and(CONTEXT_TURNING_ON_STATE, ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID)),
                        group: 'navigation',
                        order: 1
                    }
                });
            }
            async run() {
                return that.userDataSyncWorkbenchService.turnoff(false);
            }
        }));
    }
    registerSignInAction() {
        const that = this;
        const id = 'workbench.userData.actions.signin';
        const when = ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE.isEqualTo("unavailable" /* AccountStatus.Unavailable */));
        this._register(registerAction2(class StopSyncAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userData.actions.signin',
                    title: localize('sign in global', "Sign in to Sync Settings"),
                    menu: {
                        group: '3_configuration',
                        id: MenuId.GlobalActivity,
                        when,
                        order: 2
                    }
                });
            }
            async run() {
                try {
                    await that.userDataSyncWorkbenchService.signIn();
                }
                catch (e) {
                    that.notificationService.error(e);
                }
            }
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.AccountsContext, {
            group: '1_settings',
            command: {
                id,
                title: localize('sign in accounts', "Sign in to Sync Settings (1)"),
            },
            when
        }));
    }
    getShowConflictsTitle() {
        return localize2('resolveConflicts_global', "Show Conflicts ({0})", this.getConflictsCount());
    }
    registerShowConflictsAction() {
        this.conflictsActionDisposable.value = undefined;
        const that = this;
        this.conflictsActionDisposable.value = registerAction2(class TurningOnSyncAction extends Action2 {
            constructor() {
                super({
                    id: showConflictsCommandId,
                    get title() { return that.getShowConflictsTitle(); },
                    category: SYNC_TITLE,
                    f1: true,
                    precondition: CONTEXT_HAS_CONFLICTS,
                    menu: [{
                            group: '3_configuration',
                            id: MenuId.GlobalActivity,
                            when: CONTEXT_HAS_CONFLICTS,
                            order: 2
                        }, {
                            group: '3_configuration',
                            id: MenuId.MenubarPreferencesMenu,
                            when: CONTEXT_HAS_CONFLICTS,
                            order: 2
                        }]
                });
            }
            async run() {
                return that.userDataSyncWorkbenchService.showConflicts();
            }
        });
    }
    registerManageSyncAction() {
        const that = this;
        const when = ContextKeyExpr.and(CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE.notEqualsTo("unavailable" /* AccountStatus.Unavailable */), CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */));
        this._register(registerAction2(class SyncStatusAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userDataSync.actions.manage',
                    title: localize('sync is on', "Settings Sync is On"),
                    toggled: ContextKeyTrueExpr.INSTANCE,
                    menu: [
                        {
                            id: MenuId.GlobalActivity,
                            group: '3_configuration',
                            when,
                            order: 2
                        },
                        {
                            id: MenuId.MenubarPreferencesMenu,
                            group: '3_configuration',
                            when,
                            order: 2,
                        },
                        {
                            id: MenuId.AccountsContext,
                            group: '1_settings',
                            when,
                        }
                    ],
                });
            }
            run(accessor) {
                return new Promise((c, e) => {
                    const quickInputService = accessor.get(IQuickInputService);
                    const commandService = accessor.get(ICommandService);
                    const disposables = new DisposableStore();
                    const quickPick = quickInputService.createQuickPick({ useSeparators: true });
                    disposables.add(quickPick);
                    const items = [];
                    if (that.userDataSyncService.conflicts.length) {
                        items.push({ id: showConflictsCommandId, label: `${SYNC_TITLE.value}: ${that.getShowConflictsTitle().original}` });
                        items.push({ type: 'separator' });
                    }
                    items.push({ id: configureSyncCommand.id, label: `${SYNC_TITLE.value}: ${configureSyncCommand.title.original}` });
                    items.push({ id: showSyncSettingsCommand.id, label: `${SYNC_TITLE.value}: ${showSyncSettingsCommand.title.original}` });
                    items.push({ id: showSyncedDataCommand.id, label: `${SYNC_TITLE.value}: ${showSyncedDataCommand.title.original}` });
                    items.push({ type: 'separator' });
                    items.push({ id: syncNowCommand.id, label: `${SYNC_TITLE.value}: ${syncNowCommand.title.original}`, description: syncNowCommand.description(that.userDataSyncService) });
                    if (that.userDataSyncEnablementService.canToggleEnablement()) {
                        const account = that.userDataSyncWorkbenchService.current;
                        items.push({ id: turnOffSyncCommand.id, label: `${SYNC_TITLE.value}: ${turnOffSyncCommand.title.original}`, description: account ? `${account.accountName} (${that.authenticationService.getProvider(account.authenticationProviderId).label})` : undefined });
                    }
                    quickPick.items = items;
                    disposables.add(quickPick.onDidAccept(() => {
                        if (quickPick.selectedItems[0] && quickPick.selectedItems[0].id) {
                            commandService.executeCommand(quickPick.selectedItems[0].id);
                        }
                        quickPick.hide();
                    }));
                    disposables.add(quickPick.onDidHide(() => {
                        disposables.dispose();
                        c();
                    }));
                    quickPick.show();
                });
            }
        }));
    }
    registerEnableSyncViewsAction() {
        const that = this;
        const when = ContextKeyExpr.and(CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */));
        this._register(registerAction2(class SyncStatusAction extends Action2 {
            constructor() {
                super({
                    id: showSyncedDataCommand.id,
                    title: showSyncedDataCommand.title,
                    category: SYNC_TITLE,
                    precondition: when,
                    menu: {
                        id: MenuId.CommandPalette,
                        when
                    }
                });
            }
            run(accessor) {
                return that.userDataSyncWorkbenchService.showSyncActivity();
            }
        }));
    }
    registerSyncNowAction() {
        const that = this;
        this._register(registerAction2(class SyncNowAction extends Action2 {
            constructor() {
                super({
                    id: syncNowCommand.id,
                    title: syncNowCommand.title,
                    category: SYNC_TITLE,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: ContextKeyExpr.and(CONTEXT_SYNC_ENABLEMENT, CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */))
                    }
                });
            }
            run(accessor) {
                return that.userDataSyncWorkbenchService.syncNow();
            }
        }));
    }
    registerTurnOffSyncAction() {
        const that = this;
        this._register(registerAction2(class StopSyncAction extends Action2 {
            constructor() {
                super({
                    id: turnOffSyncCommand.id,
                    title: turnOffSyncCommand.title,
                    category: SYNC_TITLE,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT),
                    },
                });
            }
            async run() {
                try {
                    await that.turnOff();
                }
                catch (e) {
                    if (!isCancellationError(e)) {
                        that.notificationService.error(localize('turn off failed', "Error while turning off Settings Sync. Please check [logs]({0}) for more details.", `command:${SHOW_SYNC_LOG_COMMAND_ID}`));
                    }
                }
            }
        }));
    }
    registerConfigureSyncAction() {
        const that = this;
        const when = ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */), CONTEXT_SYNC_ENABLEMENT);
        this._register(registerAction2(class ConfigureSyncAction extends Action2 {
            constructor() {
                super({
                    id: configureSyncCommand.id,
                    title: configureSyncCommand.title,
                    category: SYNC_TITLE,
                    icon: Codicon.settingsGear,
                    tooltip: localize('configure', "Configure..."),
                    menu: [{
                            id: MenuId.CommandPalette,
                            when
                        }, {
                            id: MenuId.ViewContainerTitle,
                            when: ContextKeyExpr.and(CONTEXT_SYNC_ENABLEMENT, ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID)),
                            group: 'navigation',
                            order: 2
                        }]
                });
            }
            run() { return that.configureSyncOptions(); }
        }));
    }
    registerShowLogAction() {
        const that = this;
        this._register(registerAction2(class ShowSyncActivityAction extends Action2 {
            constructor() {
                super({
                    id: SHOW_SYNC_LOG_COMMAND_ID,
                    title: localize('show sync log title', "{0}: Show Log", SYNC_TITLE.value),
                    tooltip: localize('show sync log toolrip', "Show Log"),
                    icon: Codicon.output,
                    menu: [{
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */)),
                        }, {
                            id: MenuId.ViewContainerTitle,
                            when: ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID),
                            group: 'navigation',
                            order: 1
                        }],
                });
            }
            run() { return that.showSyncActivity(); }
        }));
    }
    registerShowSettingsAction() {
        this._register(registerAction2(class ShowSyncSettingsAction extends Action2 {
            constructor() {
                super({
                    id: showSyncSettingsCommand.id,
                    title: showSyncSettingsCommand.title,
                    category: SYNC_TITLE,
                    menu: {
                        id: MenuId.CommandPalette,
                        when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */)),
                    },
                });
            }
            run(accessor) {
                accessor.get(IPreferencesService).openUserSettings({ jsonEditor: false, query: '@tag:sync' });
            }
        }));
    }
    registerHelpAction() {
        const that = this;
        this._register(registerAction2(class HelpAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userDataSync.actions.help',
                    title: SYNC_TITLE,
                    category: Categories.Help,
                    menu: [{
                            id: MenuId.CommandPalette,
                            when: ContextKeyExpr.and(CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */)),
                        }],
                });
            }
            run() { return that.openerService.open(URI.parse('https://aka.ms/vscode-settings-sync-help')); }
        }));
        MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
            command: {
                id: 'workbench.userDataSync.actions.help',
                title: Categories.Help.value
            },
            when: ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID),
            group: '1_help',
        });
    }
    registerAcceptMergesAction() {
        const that = this;
        this._register(registerAction2(class AcceptMergesAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.userDataSync.actions.acceptMerges',
                    title: localize('complete merges title', "Complete Merge"),
                    menu: [{
                            id: MenuId.EditorContent,
                            when: ContextKeyExpr.and(ctxIsMergeResultEditor, ContextKeyExpr.regex(ctxMergeBaseUri.key, new RegExp(`^${USER_DATA_SYNC_SCHEME}:`))),
                        }],
                });
            }
            async run(accessor, previewResource) {
                const textFileService = accessor.get(ITextFileService);
                await textFileService.save(previewResource);
                const content = await textFileService.read(previewResource);
                await that.userDataSyncService.accept(this.getSyncResource(previewResource), previewResource, content.value, true);
            }
            getSyncResource(previewResource) {
                const conflict = that.userDataSyncService.conflicts.find(({ conflicts }) => conflicts.some(conflict => isEqual(conflict.previewResource, previewResource)));
                if (conflict) {
                    return conflict;
                }
                throw new Error(`Unknown resource: ${previewResource.toString()}`);
            }
        }));
    }
    registerDownloadSyncActivityAction() {
        this._register(registerAction2(class DownloadSyncActivityAction extends Action2 {
            constructor() {
                super(DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR);
            }
            async run(accessor) {
                const userDataSyncWorkbenchService = accessor.get(IUserDataSyncWorkbenchService);
                const notificationService = accessor.get(INotificationService);
                const folder = await userDataSyncWorkbenchService.downloadSyncActivity();
                if (folder) {
                    notificationService.info(localize('download sync activity complete', "Successfully downloaded Settings Sync activity."));
                }
            }
        }));
    }
    registerViews() {
        const container = this.registerViewContainer();
        this.registerDataViews(container);
    }
    registerViewContainer() {
        return Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
            id: SYNC_VIEW_CONTAINER_ID,
            title: SYNC_TITLE,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [SYNC_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
            icon: SYNC_VIEW_ICON,
            hideIfEmpty: true,
        }, 0 /* ViewContainerLocation.Sidebar */);
    }
    registerResetSyncDataAction() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.actions.syncData.reset',
                    title: localize('workbench.actions.syncData.reset', "Clear Data in Cloud..."),
                    menu: [{
                            id: MenuId.ViewContainerTitle,
                            when: ContextKeyExpr.equals('viewContainer', SYNC_VIEW_CONTAINER_ID),
                            group: '0_configure',
                        }],
                });
            }
            run() { return that.userDataSyncWorkbenchService.resetSyncedData(); }
        }));
    }
    registerDataViews(container) {
        this._register(this.instantiationService.createInstance(UserDataSyncDataViews, container));
    }
};
UserDataSyncWorkbenchContribution = __decorate([
    __param(0, IUserDataSyncEnablementService),
    __param(1, IUserDataSyncService),
    __param(2, IUserDataSyncWorkbenchService),
    __param(3, IContextKeyService),
    __param(4, IActivityService),
    __param(5, INotificationService),
    __param(6, IEditorService),
    __param(7, IUserDataProfileService),
    __param(8, IDialogService),
    __param(9, IQuickInputService),
    __param(10, IInstantiationService),
    __param(11, IOutputService),
    __param(12, IUserDataAutoSyncService),
    __param(13, ITextModelService),
    __param(14, IPreferencesService),
    __param(15, ITelemetryService),
    __param(16, IProductService),
    __param(17, IOpenerService),
    __param(18, IAuthenticationService),
    __param(19, IUserDataSyncStoreManagementService),
    __param(20, IHostService),
    __param(21, ICommandService),
    __param(22, IWorkbenchIssueService),
    __param(23, IConfigurationService)
], UserDataSyncWorkbenchContribution);
export { UserDataSyncWorkbenchContribution };
let UserDataRemoteContentProvider = class UserDataRemoteContentProvider {
    constructor(userDataSyncService, modelService, languageService) {
        this.userDataSyncService = userDataSyncService;
        this.modelService = modelService;
        this.languageService = languageService;
    }
    provideTextContent(uri) {
        if (uri.scheme === USER_DATA_SYNC_SCHEME) {
            return this.userDataSyncService.resolveContent(uri).then(content => this.modelService.createModel(content || '', this.languageService.createById('jsonc'), uri));
        }
        return null;
    }
};
UserDataRemoteContentProvider = __decorate([
    __param(0, IUserDataSyncService),
    __param(1, IModelService),
    __param(2, ILanguageService)
], UserDataRemoteContentProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhU3luYy9icm93c2VyL3VzZXJEYXRhU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqSSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQTZCLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDckgsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFF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