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
var UserDataSyncWorkbenchService_1;
import { IUserDataSyncService, isAuthenticationProvider, IUserDataAutoSyncService, IUserDataSyncStoreManagementService, IUserDataSyncEnablementService, USER_DATA_SYNC_SCHEME, USER_DATA_SYNC_LOG_ID, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IUserDataSyncWorkbenchService, CONTEXT_SYNC_ENABLEMENT, CONTEXT_SYNC_STATE, CONTEXT_ACCOUNT_STATE, SHOW_SYNC_LOG_COMMAND_ID, CONTEXT_ENABLE_ACTIVITY_VIEWS, SYNC_VIEW_CONTAINER_ID, SYNC_TITLE, SYNC_CONFLICTS_VIEW_ID, CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW, CONTEXT_HAS_CONFLICTS, getSyncAreaLabel } from '../common/userDataSync.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { getCurrentAuthenticationSessionInfo } from '../../authentication/browser/authenticationService.js';
import { IAuthenticationService } from '../../authentication/common/authentication.js';
import { IUserDataSyncAccountService } from '../../../../platform/userDataSync/common/userDataSyncAccount.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { localize } from '../../../../nls.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { URI } from '../../../../base/common/uri.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../views/common/viewsService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { UserDataSyncStoreClient } from '../../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { UserDataSyncStoreTypeSynchronizer } from '../../../../platform/userDataSync/common/globalStateSync.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { raceCancellationError } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isDiffEditorInput } from '../../../common/editor.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IUserDataInitializationService } from '../../userData/browser/userDataInit.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { IUserDataSyncMachinesService } from '../../../../platform/userDataSync/common/userDataSyncMachines.js';
import { equals } from '../../../../base/common/arrays.js';
class UserDataSyncAccount {
    constructor(authenticationProviderId, session) {
        this.authenticationProviderId = authenticationProviderId;
        this.session = session;
    }
    get sessionId() { return this.session.id; }
    get accountName() { return this.session.account.label; }
    get accountId() { return this.session.account.id; }
    get token() { return this.session.idToken || this.session.accessToken; }
}
export function isMergeEditorInput(editor) {
    const candidate = editor;
    return URI.isUri(candidate?.base) && URI.isUri(candidate?.input1?.uri) && URI.isUri(candidate?.input2?.uri) && URI.isUri(candidate?.result);
}
let UserDataSyncWorkbenchService = class UserDataSyncWorkbenchService extends Disposable {
    static { UserDataSyncWorkbenchService_1 = this; }
    static { this.DONOT_USE_WORKBENCH_SESSION_STORAGE_KEY = 'userDataSyncAccount.donotUseWorkbenchSession'; }
    static { this.CACHED_AUTHENTICATION_PROVIDER_KEY = 'userDataSyncAccountProvider'; }
    static { this.CACHED_SESSION_STORAGE_KEY = 'userDataSyncAccountPreference'; }
    get enabled() { return !!this.userDataSyncStoreManagementService.userDataSyncStore; }
    get authenticationProviders() { return this._authenticationProviders; }
    get accountStatus() { return this._accountStatus; }
    get current() { return this._current; }
    constructor(userDataSyncService, uriIdentityService, authenticationService, userDataSyncAccountService, quickInputService, storageService, userDataSyncEnablementService, userDataAutoSyncService, logService, productService, extensionService, environmentService, secretStorageService, notificationService, progressService, dialogService, contextKeyService, viewsService, viewDescriptorService, userDataSyncStoreManagementService, lifecycleService, instantiationService, editorService, userDataInitializationService, fileService, fileDialogService, userDataSyncMachinesService) {
        super();
        this.userDataSyncService = userDataSyncService;
        this.uriIdentityService = uriIdentityService;
        this.authenticationService = authenticationService;
        this.userDataSyncAccountService = userDataSyncAccountService;
        this.quickInputService = quickInputService;
        this.storageService = storageService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataAutoSyncService = userDataAutoSyncService;
        this.logService = logService;
        this.productService = productService;
        this.extensionService = extensionService;
        this.environmentService = environmentService;
        this.secretStorageService = secretStorageService;
        this.notificationService = notificationService;
        this.progressService = progressService;
        this.dialogService = dialogService;
        this.viewsService = viewsService;
        this.viewDescriptorService = viewDescriptorService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.lifecycleService = lifecycleService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.userDataInitializationService = userDataInitializationService;
        this.fileService = fileService;
        this.fileDialogService = fileDialogService;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this._authenticationProviders = [];
        this._accountStatus = "uninitialized" /* AccountStatus.Uninitialized */;
        this._onDidChangeAccountStatus = this._register(new Emitter());
        this.onDidChangeAccountStatus = this._onDidChangeAccountStatus.event;
        this._onDidTurnOnSync = this._register(new Emitter());
        this.onDidTurnOnSync = this._onDidTurnOnSync.event;
        this.turnOnSyncCancellationToken = undefined;
        this._cachedCurrentAuthenticationProviderId = null;
        this._cachedCurrentSessionId = null;
        this.syncEnablementContext = CONTEXT_SYNC_ENABLEMENT.bindTo(contextKeyService);
        this.syncStatusContext = CONTEXT_SYNC_STATE.bindTo(contextKeyService);
        this.accountStatusContext = CONTEXT_ACCOUNT_STATE.bindTo(contextKeyService);
        this.activityViewsEnablementContext = CONTEXT_ENABLE_ACTIVITY_VIEWS.bindTo(contextKeyService);
        this.hasConflicts = CONTEXT_HAS_CONFLICTS.bindTo(contextKeyService);
        this.enableConflictsViewContext = CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW.bindTo(contextKeyService);
        if (this.userDataSyncStoreManagementService.userDataSyncStore) {
            this.syncStatusContext.set(this.userDataSyncService.status);
            this._register(userDataSyncService.onDidChangeStatus(status => this.syncStatusContext.set(status)));
            this.syncEnablementContext.set(userDataSyncEnablementService.isEnabled());
            this._register(userDataSyncEnablementService.onDidChangeEnablement(enabled => this.syncEnablementContext.set(enabled)));
            this.waitAndInitialize();
        }
    }
    updateAuthenticationProviders() {
        const oldValue = this._authenticationProviders;
        this._authenticationProviders = (this.userDataSyncStoreManagementService.userDataSyncStore?.authenticationProviders || []).filter(({ id }) => this.authenticationService.declaredProviders.some(provider => provider.id === id));
        this.logService.trace('Settings Sync: Authentication providers updated', this._authenticationProviders.map(({ id }) => id));
        return equals(oldValue, this._authenticationProviders, (a, b) => a.id === b.id);
    }
    isSupportedAuthenticationProviderId(authenticationProviderId) {
        return this.authenticationProviders.some(({ id }) => id === authenticationProviderId);
    }
    async waitAndInitialize() {
        try {
            /* wait */
            await Promise.all([this.extensionService.whenInstalledExtensionsRegistered(), this.userDataInitializationService.whenInitializationFinished()]);
            /* initialize */
            await this.initialize();
        }
        catch (error) {
            // Do not log if the current window is running extension tests
            if (!this.environmentService.extensionTestsLocationURI) {
                this.logService.error(error);
            }
        }
    }
    async initialize() {
        if (isWeb) {
            const authenticationSession = await getCurrentAuthenticationSessionInfo(this.secretStorageService, this.productService);
            if (this.currentSessionId === undefined && authenticationSession?.id) {
                if (this.environmentService.options?.settingsSyncOptions?.authenticationProvider && this.environmentService.options.settingsSyncOptions.enabled) {
                    this.currentSessionId = authenticationSession.id;
                }
                // Backward compatibility
                else if (this.useWorkbenchSessionId) {
                    this.currentSessionId = authenticationSession.id;
                }
                this.useWorkbenchSessionId = false;
            }
        }
        const initPromise = this.update('initialize');
        this._register(this.authenticationService.onDidChangeDeclaredProviders(() => {
            if (this.updateAuthenticationProviders()) {
                // Trigger update only after the initialization is done
                initPromise.finally(() => this.update('declared authentication providers changed'));
            }
        }));
        await initPromise;
        this._register(Event.filter(Event.any(this.authenticationService.onDidRegisterAuthenticationProvider, this.authenticationService.onDidUnregisterAuthenticationProvider), info => this.isSupportedAuthenticationProviderId(info.id))(() => this.update('authentication provider change')));
        this._register(Event.filter(this.userDataSyncAccountService.onTokenFailed, isSuccessive => !isSuccessive)(() => this.update('token failure')));
        this._register(Event.filter(this.authenticationService.onDidChangeSessions, e => this.isSupportedAuthenticationProviderId(e.providerId))(({ event }) => this.onDidChangeSessions(event)));
        this._register(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, UserDataSyncWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, this._store)(() => this.onDidChangeStorage()));
        this._register(Event.filter(this.userDataSyncAccountService.onTokenFailed, bailout => bailout)(() => this.onDidAuthFailure()));
        this.hasConflicts.set(this.userDataSyncService.conflicts.length > 0);
        this._register(this.userDataSyncService.onDidChangeConflicts(conflicts => {
            this.hasConflicts.set(conflicts.length > 0);
            if (!conflicts.length) {
                this.enableConflictsViewContext.reset();
            }
            // Close merge editors with no conflicts
            this.editorService.editors.filter(input => {
                const remoteResource = isDiffEditorInput(input) ? input.original.resource : isMergeEditorInput(input) ? input.input1.uri : undefined;
                if (remoteResource?.scheme !== USER_DATA_SYNC_SCHEME) {
                    return false;
                }
                return !this.userDataSyncService.conflicts.some(({ conflicts }) => conflicts.some(({ previewResource }) => this.uriIdentityService.extUri.isEqual(previewResource, input.resource)));
            }).forEach(input => input.dispose());
        }));
    }
    async update(reason) {
        this.logService.trace(`Settings Sync: Updating due to ${reason}`);
        this.updateAuthenticationProviders();
        await this.updateCurrentAccount();
        if (this._current) {
            this.currentAuthenticationProviderId = this._current.authenticationProviderId;
        }
        await this.updateToken(this._current);
        this.updateAccountStatus(this._current ? "available" /* AccountStatus.Available */ : "unavailable" /* AccountStatus.Unavailable */);
    }
    async updateCurrentAccount() {
        this.logService.trace('Settings Sync: Updating the current account');
        const currentSessionId = this.currentSessionId;
        const currentAuthenticationProviderId = this.currentAuthenticationProviderId;
        if (currentSessionId) {
            const authenticationProviders = currentAuthenticationProviderId ? this.authenticationProviders.filter(({ id }) => id === currentAuthenticationProviderId) : this.authenticationProviders;
            for (const { id, scopes } of authenticationProviders) {
                const sessions = (await this.authenticationService.getSessions(id, scopes)) || [];
                for (const session of sessions) {
                    if (session.id === currentSessionId) {
                        this._current = new UserDataSyncAccount(id, session);
                        this.logService.trace('Settings Sync: Updated the current account', this._current.accountName);
                        return;
                    }
                }
            }
        }
        this._current = undefined;
    }
    async updateToken(current) {
        let value = undefined;
        if (current) {
            try {
                this.logService.trace('Settings Sync: Updating the token for the account', current.accountName);
                const token = current.token;
                this.traceOrInfo('Settings Sync: Token updated for the account', current.accountName);
                value = { token, authenticationProviderId: current.authenticationProviderId };
            }
            catch (e) {
                this.logService.error(e);
            }
        }
        await this.userDataSyncAccountService.updateAccount(value);
    }
    traceOrInfo(msg, ...args) {
        if (this.environmentService.isBuilt) {
            this.logService.info(msg, ...args);
        }
        else {
            this.logService.trace(msg, ...args);
        }
    }
    updateAccountStatus(accountStatus) {
        this.logService.trace(`Settings Sync: Updating the account status to ${accountStatus}`);
        if (this._accountStatus !== accountStatus) {
            const previous = this._accountStatus;
            this.traceOrInfo(`Settings Sync: Account status changed from ${previous} to ${accountStatus}`);
            this._accountStatus = accountStatus;
            this.accountStatusContext.set(accountStatus);
            this._onDidChangeAccountStatus.fire(accountStatus);
        }
    }
    async turnOn() {
        if (!this.authenticationProviders.length) {
            throw new Error(localize('no authentication providers', "Settings sync cannot be turned on because there are no authentication providers available."));
        }
        if (this.userDataSyncEnablementService.isEnabled()) {
            return;
        }
        if (this.userDataSyncService.status !== "idle" /* SyncStatus.Idle */) {
            throw new Error('Cannot turn on sync while syncing');
        }
        const picked = await this.pick();
        if (!picked) {
            throw new CancellationError();
        }
        // User did not pick an account or login failed
        if (this.accountStatus !== "available" /* AccountStatus.Available */) {
            throw new Error(localize('no account', "No account available"));
        }
        const turnOnSyncCancellationToken = this.turnOnSyncCancellationToken = new CancellationTokenSource();
        const disposable = isWeb ? Disposable.None : this.lifecycleService.onBeforeShutdown(e => e.veto((async () => {
            const { confirmed } = await this.dialogService.confirm({
                type: 'warning',
                message: localize('sync in progress', "Settings Sync is being turned on. Would you like to cancel it?"),
                title: localize('settings sync', "Settings Sync"),
                primaryButton: localize({ key: 'yes', comment: ['&& denotes a mnemonic'] }, "&&Yes"),
                cancelButton: localize('no', "No")
            });
            if (confirmed) {
                turnOnSyncCancellationToken.cancel();
            }
            return !confirmed;
        })(), 'veto.settingsSync'));
        try {
            await this.doTurnOnSync(turnOnSyncCancellationToken.token);
        }
        finally {
            disposable.dispose();
            this.turnOnSyncCancellationToken = undefined;
        }
        await this.userDataAutoSyncService.turnOn();
        if (this.userDataSyncStoreManagementService.userDataSyncStore?.canSwitch) {
            await this.synchroniseUserDataSyncStoreType();
        }
        this.currentAuthenticationProviderId = this.current?.authenticationProviderId;
        if (this.environmentService.options?.settingsSyncOptions?.enablementHandler && this.currentAuthenticationProviderId) {
            this.environmentService.options.settingsSyncOptions.enablementHandler(true, this.currentAuthenticationProviderId);
        }
        this.notificationService.info(localize('sync turned on', "{0} is turned on", SYNC_TITLE.value));
        this._onDidTurnOnSync.fire();
    }
    async turnoff(everywhere) {
        if (this.userDataSyncEnablementService.isEnabled()) {
            await this.userDataAutoSyncService.turnOff(everywhere);
            if (this.environmentService.options?.settingsSyncOptions?.enablementHandler && this.currentAuthenticationProviderId) {
                this.environmentService.options.settingsSyncOptions.enablementHandler(false, this.currentAuthenticationProviderId);
            }
        }
        if (this.turnOnSyncCancellationToken) {
            this.turnOnSyncCancellationToken.cancel();
        }
    }
    async synchroniseUserDataSyncStoreType() {
        if (!this.userDataSyncAccountService.account) {
            throw new Error('Cannot update because you are signed out from settings sync. Please sign in and try again.');
        }
        if (!isWeb || !this.userDataSyncStoreManagementService.userDataSyncStore) {
            // Not supported
            return;
        }
        const userDataSyncStoreUrl = this.userDataSyncStoreManagementService.userDataSyncStore.type === 'insiders' ? this.userDataSyncStoreManagementService.userDataSyncStore.stableUrl : this.userDataSyncStoreManagementService.userDataSyncStore.insidersUrl;
        const userDataSyncStoreClient = this.instantiationService.createInstance(UserDataSyncStoreClient, userDataSyncStoreUrl);
        userDataSyncStoreClient.setAuthToken(this.userDataSyncAccountService.account.token, this.userDataSyncAccountService.account.authenticationProviderId);
        await this.instantiationService.createInstance(UserDataSyncStoreTypeSynchronizer, userDataSyncStoreClient).sync(this.userDataSyncStoreManagementService.userDataSyncStore.type);
    }
    syncNow() {
        return this.userDataAutoSyncService.triggerSync(['Sync Now'], { immediately: true, disableCache: true });
    }
    async doTurnOnSync(token) {
        const disposables = new DisposableStore();
        const manualSyncTask = await this.userDataSyncService.createManualSyncTask();
        try {
            await this.progressService.withProgress({
                location: 10 /* ProgressLocation.Window */,
                title: SYNC_TITLE.value,
                command: SHOW_SYNC_LOG_COMMAND_ID,
                delay: 500,
            }, async (progress) => {
                progress.report({ message: localize('turning on', "Turning on...") });
                disposables.add(this.userDataSyncService.onDidChangeStatus(status => {
                    if (status === "hasConflicts" /* SyncStatus.HasConflicts */) {
                        progress.report({ message: localize('resolving conflicts', "Resolving conflicts...") });
                    }
                    else {
                        progress.report({ message: localize('syncing...', "Turning on...") });
                    }
                }));
                await manualSyncTask.merge();
                if (this.userDataSyncService.status === "hasConflicts" /* SyncStatus.HasConflicts */) {
                    await this.handleConflictsWhileTurningOn(token);
                }
                await manualSyncTask.apply();
            });
        }
        catch (error) {
            await manualSyncTask.stop();
            throw error;
        }
        finally {
            disposables.dispose();
        }
    }
    async handleConflictsWhileTurningOn(token) {
        const conflicts = this.userDataSyncService.conflicts;
        const andSeparator = localize('and', ' and ');
        let conflictsText = '';
        for (let i = 0; i < conflicts.length; i++) {
            if (i === conflicts.length - 1 && i !== 0) {
                conflictsText += andSeparator;
            }
            else if (i !== 0) {
                conflictsText += ', ';
            }
            conflictsText += getSyncAreaLabel(conflicts[i].syncResource);
        }
        const singleConflictResource = conflicts.length === 1 ? getSyncAreaLabel(conflicts[0].syncResource) : undefined;
        await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('conflicts detected', "Conflicts Detected in {0}", conflictsText),
            detail: localize('resolve', "Please resolve conflicts to turn on..."),
            buttons: [
                {
                    label: localize({ key: 'show conflicts', comment: ['&& denotes a mnemonic'] }, "&&Show Conflicts"),
                    run: async () => {
                        const waitUntilConflictsAreResolvedPromise = raceCancellationError(Event.toPromise(Event.filter(this.userDataSyncService.onDidChangeConflicts, conficts => conficts.length === 0)), token);
                        await this.showConflicts(this.userDataSyncService.conflicts[0]?.conflicts[0]);
                        await waitUntilConflictsAreResolvedPromise;
                    }
                },
                {
                    label: singleConflictResource ? localize({ key: 'replace local single', comment: ['&& denotes a mnemonic'] }, "Accept &&Remote {0}", singleConflictResource) : localize({ key: 'replace local', comment: ['&& denotes a mnemonic'] }, "Accept &&Remote"),
                    run: async () => this.replace(true)
                },
                {
                    label: singleConflictResource ? localize({ key: 'replace remote single', comment: ['&& denotes a mnemonic'] }, "Accept &&Local {0}", singleConflictResource) : localize({ key: 'replace remote', comment: ['&& denotes a mnemonic'] }, "Accept &&Local"),
                    run: () => this.replace(false)
                },
            ],
            cancelButton: {
                run: () => {
                    throw new CancellationError();
                }
            }
        });
    }
    async replace(local) {
        for (const conflict of this.userDataSyncService.conflicts) {
            for (const preview of conflict.conflicts) {
                await this.accept({ syncResource: conflict.syncResource, profile: conflict.profile }, local ? preview.remoteResource : preview.localResource, undefined, { force: true });
            }
        }
    }
    async accept(resource, conflictResource, content, apply) {
        return this.userDataSyncService.accept(resource, conflictResource, content, apply);
    }
    async showConflicts(conflictToOpen) {
        if (!this.userDataSyncService.conflicts.length) {
            return;
        }
        this.enableConflictsViewContext.set(true);
        const view = await this.viewsService.openView(SYNC_CONFLICTS_VIEW_ID);
        if (view && conflictToOpen) {
            await view.open(conflictToOpen);
        }
    }
    async resetSyncedData() {
        const { confirmed } = await this.dialogService.confirm({
            type: 'info',
            message: localize('reset', "This will clear your data in the cloud and stop sync on all your devices."),
            title: localize('reset title', "Clear"),
            primaryButton: localize({ key: 'resetButton', comment: ['&& denotes a mnemonic'] }, "&&Reset"),
        });
        if (confirmed) {
            await this.userDataSyncService.resetRemote();
        }
    }
    async getAllLogResources() {
        const logsFolders = [];
        const stat = await this.fileService.resolve(this.uriIdentityService.extUri.dirname(this.environmentService.logsHome));
        if (stat.children) {
            logsFolders.push(...stat.children
                .filter(stat => stat.isDirectory && /^\d{8}T\d{6}$/.test(stat.name))
                .sort()
                .reverse()
                .map(d => d.resource));
        }
        const result = [];
        for (const logFolder of logsFolders) {
            const folderStat = await this.fileService.resolve(logFolder);
            const childStat = folderStat.children?.find(stat => this.uriIdentityService.extUri.basename(stat.resource).startsWith(`${USER_DATA_SYNC_LOG_ID}.`));
            if (childStat) {
                result.push(childStat.resource);
            }
        }
        return result;
    }
    async showSyncActivity() {
        this.activityViewsEnablementContext.set(true);
        await this.waitForActiveSyncViews();
        await this.viewsService.openViewContainer(SYNC_VIEW_CONTAINER_ID);
    }
    async downloadSyncActivity() {
        const result = await this.fileDialogService.showOpenDialog({
            title: localize('download sync activity dialog title', "Select folder to download Settings Sync activity"),
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: localize('download sync activity dialog open label', "Save"),
        });
        if (!result?.[0]) {
            return;
        }
        return this.progressService.withProgress({ location: 10 /* ProgressLocation.Window */ }, async () => {
            const machines = await this.userDataSyncMachinesService.getMachines();
            const currentMachine = machines.find(m => m.isCurrent);
            const name = (currentMachine ? currentMachine.name + ' - ' : '') + 'Settings Sync Activity';
            const stat = await this.fileService.resolve(result[0]);
            const nameRegEx = new RegExp(`${escapeRegExpCharacters(name)}\\s(\\d+)`);
            const indexes = [];
            for (const child of stat.children ?? []) {
                if (child.name === name) {
                    indexes.push(0);
                }
                else {
                    const matches = nameRegEx.exec(child.name);
                    if (matches) {
                        indexes.push(parseInt(matches[1]));
                    }
                }
            }
            indexes.sort((a, b) => a - b);
            const folder = this.uriIdentityService.extUri.joinPath(result[0], indexes[0] !== 0 ? name : `${name} ${indexes[indexes.length - 1] + 1}`);
            await Promise.all([
                this.userDataSyncService.saveRemoteActivityData(this.uriIdentityService.extUri.joinPath(folder, 'remoteActivity.json')),
                (async () => {
                    const logResources = await this.getAllLogResources();
                    await Promise.all(logResources.map(async (logResource) => this.fileService.copy(logResource, this.uriIdentityService.extUri.joinPath(folder, 'logs', `${this.uriIdentityService.extUri.basename(this.uriIdentityService.extUri.dirname(logResource))}.log`))));
                })(),
                this.fileService.copy(this.environmentService.userDataSyncHome, this.uriIdentityService.extUri.joinPath(folder, 'localActivity')),
            ]);
            return folder;
        });
    }
    async waitForActiveSyncViews() {
        const viewContainer = this.viewDescriptorService.getViewContainerById(SYNC_VIEW_CONTAINER_ID);
        if (viewContainer) {
            const model = this.viewDescriptorService.getViewContainerModel(viewContainer);
            if (!model.activeViewDescriptors.length) {
                await Event.toPromise(Event.filter(model.onDidChangeActiveViewDescriptors, e => model.activeViewDescriptors.length > 0));
            }
        }
    }
    async signIn() {
        const currentAuthenticationProviderId = this.currentAuthenticationProviderId;
        const authenticationProvider = currentAuthenticationProviderId ? this.authenticationProviders.find(p => p.id === currentAuthenticationProviderId) : undefined;
        if (authenticationProvider) {
            await this.doSignIn(authenticationProvider);
        }
        else {
            if (!this.authenticationProviders.length) {
                throw new Error(localize('no authentication providers during signin', "Cannot sign in because there are no authentication providers available."));
            }
            await this.pick();
        }
    }
    async pick() {
        const result = await this.doPick();
        if (!result) {
            return false;
        }
        await this.doSignIn(result);
        return true;
    }
    async doPick() {
        if (this.authenticationProviders.length === 0) {
            return undefined;
        }
        const authenticationProviders = [...this.authenticationProviders].sort(({ id }) => id === this.currentAuthenticationProviderId ? -1 : 1);
        const allAccounts = new Map();
        if (authenticationProviders.length === 1) {
            const accounts = await this.getAccounts(authenticationProviders[0].id, authenticationProviders[0].scopes);
            if (accounts.length) {
                allAccounts.set(authenticationProviders[0].id, accounts);
            }
            else {
                // Single auth provider and no accounts
                return authenticationProviders[0];
            }
        }
        let result;
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        const promise = new Promise(c => {
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                c(result);
            }));
        });
        quickPick.title = SYNC_TITLE.value;
        quickPick.ok = false;
        quickPick.ignoreFocusOut = true;
        quickPick.placeholder = localize('choose account placeholder', "Select an account to sign in");
        quickPick.show();
        if (authenticationProviders.length > 1) {
            quickPick.busy = true;
            for (const { id, scopes } of authenticationProviders) {
                const accounts = await this.getAccounts(id, scopes);
                if (accounts.length) {
                    allAccounts.set(id, accounts);
                }
            }
            quickPick.busy = false;
        }
        quickPick.items = this.createQuickpickItems(authenticationProviders, allAccounts);
        disposables.add(quickPick.onDidAccept(() => {
            result = quickPick.selectedItems[0]?.account ? quickPick.selectedItems[0]?.account : quickPick.selectedItems[0]?.authenticationProvider;
            quickPick.hide();
        }));
        return promise;
    }
    async getAccounts(authenticationProviderId, scopes) {
        const accounts = new Map();
        let currentAccount = null;
        const sessions = await this.authenticationService.getSessions(authenticationProviderId, scopes) || [];
        for (const session of sessions) {
            const account = new UserDataSyncAccount(authenticationProviderId, session);
            accounts.set(account.accountId, account);
            if (account.sessionId === this.currentSessionId) {
                currentAccount = account;
            }
        }
        if (currentAccount) {
            // Always use current account if available
            accounts.set(currentAccount.accountId, currentAccount);
        }
        return currentAccount ? [...accounts.values()] : [...accounts.values()].sort(({ sessionId }) => sessionId === this.currentSessionId ? -1 : 1);
    }
    createQuickpickItems(authenticationProviders, allAccounts) {
        const quickPickItems = [];
        // Signed in Accounts
        if (allAccounts.size) {
            quickPickItems.push({ type: 'separator', label: localize('signed in', "Signed in") });
            for (const authenticationProvider of authenticationProviders) {
                const accounts = (allAccounts.get(authenticationProvider.id) || []).sort(({ sessionId }) => sessionId === this.currentSessionId ? -1 : 1);
                const providerName = this.authenticationService.getProvider(authenticationProvider.id).label;
                for (const account of accounts) {
                    quickPickItems.push({
                        label: `${account.accountName} (${providerName})`,
                        description: account.sessionId === this.current?.sessionId ? localize('last used', "Last Used with Sync") : undefined,
                        account,
                        authenticationProvider,
                    });
                }
            }
            quickPickItems.push({ type: 'separator', label: localize('others', "Others") });
        }
        // Account Providers
        for (const authenticationProvider of authenticationProviders) {
            const provider = this.authenticationService.getProvider(authenticationProvider.id);
            if (!allAccounts.has(authenticationProvider.id) || provider.supportsMultipleAccounts) {
                const providerName = provider.label;
                quickPickItems.push({ label: localize('sign in using account', "Sign in with {0}", providerName), authenticationProvider });
            }
        }
        return quickPickItems;
    }
    async doSignIn(accountOrAuthProvider) {
        let sessionId;
        if (isAuthenticationProvider(accountOrAuthProvider)) {
            if (this.environmentService.options?.settingsSyncOptions?.authenticationProvider?.id === accountOrAuthProvider.id) {
                sessionId = await this.environmentService.options?.settingsSyncOptions?.authenticationProvider?.signIn();
            }
            else {
                sessionId = (await this.authenticationService.createSession(accountOrAuthProvider.id, accountOrAuthProvider.scopes)).id;
            }
            this.currentAuthenticationProviderId = accountOrAuthProvider.id;
        }
        else {
            if (this.environmentService.options?.settingsSyncOptions?.authenticationProvider?.id === accountOrAuthProvider.authenticationProviderId) {
                sessionId = await this.environmentService.options?.settingsSyncOptions?.authenticationProvider?.signIn();
            }
            else {
                sessionId = accountOrAuthProvider.sessionId;
            }
            this.currentAuthenticationProviderId = accountOrAuthProvider.authenticationProviderId;
        }
        this.currentSessionId = sessionId;
        await this.update('sign in');
    }
    async onDidAuthFailure() {
        this.currentSessionId = undefined;
        await this.update('auth failure');
    }
    onDidChangeSessions(e) {
        if (this.currentSessionId && e.removed?.find(session => session.id === this.currentSessionId)) {
            this.currentSessionId = undefined;
        }
        this.update('change in sessions');
    }
    onDidChangeStorage() {
        if (this.currentSessionId !== this.getStoredCachedSessionId() /* This checks if current window changed the value or not */) {
            this._cachedCurrentSessionId = null;
            this.update('change in storage');
        }
    }
    get currentAuthenticationProviderId() {
        if (this._cachedCurrentAuthenticationProviderId === null) {
            this._cachedCurrentAuthenticationProviderId = this.storageService.get(UserDataSyncWorkbenchService_1.CACHED_AUTHENTICATION_PROVIDER_KEY, -1 /* StorageScope.APPLICATION */);
        }
        return this._cachedCurrentAuthenticationProviderId;
    }
    set currentAuthenticationProviderId(currentAuthenticationProviderId) {
        if (this._cachedCurrentAuthenticationProviderId !== currentAuthenticationProviderId) {
            this._cachedCurrentAuthenticationProviderId = currentAuthenticationProviderId;
            if (currentAuthenticationProviderId === undefined) {
                this.storageService.remove(UserDataSyncWorkbenchService_1.CACHED_AUTHENTICATION_PROVIDER_KEY, -1 /* StorageScope.APPLICATION */);
            }
            else {
                this.storageService.store(UserDataSyncWorkbenchService_1.CACHED_AUTHENTICATION_PROVIDER_KEY, currentAuthenticationProviderId, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
        }
    }
    get currentSessionId() {
        if (this._cachedCurrentSessionId === null) {
            this._cachedCurrentSessionId = this.getStoredCachedSessionId();
        }
        return this._cachedCurrentSessionId;
    }
    set currentSessionId(cachedSessionId) {
        if (this._cachedCurrentSessionId !== cachedSessionId) {
            this._cachedCurrentSessionId = cachedSessionId;
            if (cachedSessionId === undefined) {
                this.logService.info('Settings Sync: Reset current session');
                this.storageService.remove(UserDataSyncWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            else {
                this.logService.info('Settings Sync: Updated current session', cachedSessionId);
                this.storageService.store(UserDataSyncWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, cachedSessionId, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
        }
    }
    getStoredCachedSessionId() {
        return this.storageService.get(UserDataSyncWorkbenchService_1.CACHED_SESSION_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
    }
    get useWorkbenchSessionId() {
        return !this.storageService.getBoolean(UserDataSyncWorkbenchService_1.DONOT_USE_WORKBENCH_SESSION_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
    }
    set useWorkbenchSessionId(useWorkbenchSession) {
        this.storageService.store(UserDataSyncWorkbenchService_1.DONOT_USE_WORKBENCH_SESSION_STORAGE_KEY, !useWorkbenchSession, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
};
UserDataSyncWorkbenchService = UserDataSyncWorkbenchService_1 = __decorate([
    __param(0, IUserDataSyncService),
    __param(1, IUriIdentityService),
    __param(2, IAuthenticationService),
    __param(3, IUserDataSyncAccountService),
    __param(4, IQuickInputService),
    __param(5, IStorageService),
    __param(6, IUserDataSyncEnablementService),
    __param(7, IUserDataAutoSyncService),
    __param(8, ILogService),
    __param(9, IProductService),
    __param(10, IExtensionService),
    __param(11, IBrowserWorkbenchEnvironmentService),
    __param(12, ISecretStorageService),
    __param(13, INotificationService),
    __param(14, IProgressService),
    __param(15, IDialogService),
    __param(16, IContextKeyService),
    __param(17, IViewsService),
    __param(18, IViewDescriptorService),
    __param(19, IUserDataSyncStoreManagementService),
    __param(20, ILifecycleService),
    __param(21, IInstantiationService),
    __param(22, IEditorService),
    __param(23, IUserDataInitializationService),
    __param(24, IFileService),
    __param(25, IFileDialogService),
    __param(26, IUserDataSyncMachinesService)
], UserDataSyncWorkbenchService);
export { UserDataSyncWorkbenchService };
registerSingleton(IUserDataSyncWorkbenchService, UserDataSyncWorkbenchService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jV29ya2JlbmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFTeW5jL2Jyb3dzZXIvdXNlckRhdGFTeW5jV29ya2JlbmNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUEyQix3QkFBd0IsRUFBRSx3QkFBd0IsRUFBRSxtQ0FBbUMsRUFBYyw4QkFBOEIsRUFBMkMscUJBQXFCLEVBQUUscUJBQXFCLEdBQUcsTUFBTSwwREFBMEQsQ0FBQztBQUN0VixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLDZCQUE2QixFQUF1Qyx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRSxxQkFBcUIsRUFBRSx3QkFBd0IsRUFBRSw2QkFBNkIsRUFBRSxzQkFBc0IsRUFBRSxVQUFVLEVBQUUsc0JBQXNCLEVBQUUsa0NBQWtDLEVBQUUscUJBQXFCLEVBQThCLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDalosT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzVHLE9BQU8sRUFBNEQsc0JBQXNCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNqSixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUM5RyxPQUFPLEVBQUUsa0JBQWtCLEVBQXVCLE1BQU0sc0RBQXNELENBQUM7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