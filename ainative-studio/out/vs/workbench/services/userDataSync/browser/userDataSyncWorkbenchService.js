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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jV29ya2JlbmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVN5bmMvYnJvd3Nlci91c2VyRGF0YVN5bmNXb3JrYmVuY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQTJCLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLG1DQUFtQyxFQUFjLDhCQUE4QixFQUEyQyxxQkFBcUIsRUFBRSxxQkFBcUIsR0FBRyxNQUFNLDBEQUEwRCxDQUFDO0FBQ3RWLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsNkJBQTZCLEVBQXVDLHVCQUF1QixFQUFFLGtCQUFrQixFQUFFLHFCQUFxQixFQUFFLHdCQUF3QixFQUFFLDZCQUE2QixFQUFFLHNCQUFzQixFQUFFLFVBQVUsRUFBRSxzQkFBc0IsRUFBRSxrQ0FBa0MsRUFBRSxxQkFBcUIsRUFBOEIsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNqWixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUcsT0FBTyxFQUE0RCxzQkFBc0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2pKLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxrQkFBa0IsRUFBdUIsTUFBTSxzREFBc0QsQ0FBQztB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