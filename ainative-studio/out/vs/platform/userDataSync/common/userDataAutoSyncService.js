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
import { createCancelablePromise, disposableTimeout, ThrottledDelayer, timeout } from '../../../base/common/async.js';
import { toLocalISOString } from '../../../base/common/date.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../base/common/lifecycle.js';
import { isWeb } from '../../../base/common/platform.js';
import { isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IProductService } from '../../product/common/productService.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, UserDataAutoSyncError, UserDataSyncError } from './userDataSync.js';
import { IUserDataSyncAccountService } from './userDataSyncAccount.js';
import { IUserDataSyncMachinesService } from './userDataSyncMachines.js';
const disableMachineEventuallyKey = 'sync.disableMachineEventually';
const sessionIdKey = 'sync.sessionId';
const storeUrlKey = 'sync.storeUrl';
const productQualityKey = 'sync.productQuality';
let UserDataAutoSyncService = class UserDataAutoSyncService extends Disposable {
    get syncUrl() {
        const value = this.storageService.get(storeUrlKey, -1 /* StorageScope.APPLICATION */);
        return value ? URI.parse(value) : undefined;
    }
    set syncUrl(syncUrl) {
        if (syncUrl) {
            this.storageService.store(storeUrlKey, syncUrl.toString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(storeUrlKey, -1 /* StorageScope.APPLICATION */);
        }
    }
    get productQuality() {
        return this.storageService.get(productQualityKey, -1 /* StorageScope.APPLICATION */);
    }
    set productQuality(productQuality) {
        if (productQuality) {
            this.storageService.store(productQualityKey, productQuality, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(productQualityKey, -1 /* StorageScope.APPLICATION */);
        }
    }
    constructor(productService, userDataSyncStoreManagementService, userDataSyncStoreService, userDataSyncEnablementService, userDataSyncService, logService, userDataSyncAccountService, telemetryService, userDataSyncMachinesService, storageService) {
        super();
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataSyncService = userDataSyncService;
        this.logService = logService;
        this.userDataSyncAccountService = userDataSyncAccountService;
        this.telemetryService = telemetryService;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this.storageService = storageService;
        this.autoSync = this._register(new MutableDisposable());
        this.successiveFailures = 0;
        this.lastSyncTriggerTime = undefined;
        this.suspendUntilRestart = false;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this.sources = [];
        this.syncTriggerDelayer = this._register(new ThrottledDelayer(this.getSyncTriggerDelayTime()));
        this.lastSyncUrl = this.syncUrl;
        this.syncUrl = userDataSyncStoreManagementService.userDataSyncStore?.url;
        this.previousProductQuality = this.productQuality;
        this.productQuality = productService.quality;
        if (this.syncUrl) {
            this.logService.info('[AutoSync] Using settings sync service', this.syncUrl.toString());
            this._register(userDataSyncStoreManagementService.onDidChangeUserDataSyncStore(() => {
                if (!isEqual(this.syncUrl, userDataSyncStoreManagementService.userDataSyncStore?.url)) {
                    this.lastSyncUrl = this.syncUrl;
                    this.syncUrl = userDataSyncStoreManagementService.userDataSyncStore?.url;
                    if (this.syncUrl) {
                        this.logService.info('[AutoSync] Using settings sync service', this.syncUrl.toString());
                    }
                }
            }));
            if (this.userDataSyncEnablementService.isEnabled()) {
                this.logService.info('[AutoSync] Enabled.');
            }
            else {
                this.logService.info('[AutoSync] Disabled.');
            }
            this.updateAutoSync();
            if (this.hasToDisableMachineEventually()) {
                this.disableMachineEventually();
            }
            this._register(userDataSyncAccountService.onDidChangeAccount(() => this.updateAutoSync()));
            this._register(userDataSyncStoreService.onDidChangeDonotMakeRequestsUntil(() => this.updateAutoSync()));
            this._register(userDataSyncService.onDidChangeLocal(source => this.triggerSync([source])));
            this._register(Event.filter(this.userDataSyncEnablementService.onDidChangeResourceEnablement, ([, enabled]) => enabled)(() => this.triggerSync(['resourceEnablement'])));
            this._register(this.userDataSyncStoreManagementService.onDidChangeUserDataSyncStore(() => this.triggerSync(['userDataSyncStoreChanged'])));
        }
    }
    updateAutoSync() {
        const { enabled, message } = this.isAutoSyncEnabled();
        if (enabled) {
            if (this.autoSync.value === undefined) {
                this.autoSync.value = new AutoSync(this.lastSyncUrl, 1000 * 60 * 5 /* 5 miutes */, this.userDataSyncStoreManagementService, this.userDataSyncStoreService, this.userDataSyncService, this.userDataSyncMachinesService, this.logService, this.telemetryService, this.storageService);
                this.autoSync.value.register(this.autoSync.value.onDidStartSync(() => this.lastSyncTriggerTime = new Date().getTime()));
                this.autoSync.value.register(this.autoSync.value.onDidFinishSync(e => this.onDidFinishSync(e)));
                if (this.startAutoSync()) {
                    this.autoSync.value.start();
                }
            }
        }
        else {
            this.syncTriggerDelayer.cancel();
            if (this.autoSync.value !== undefined) {
                if (message) {
                    this.logService.info(message);
                }
                this.autoSync.clear();
            }
            /* log message when auto sync is not disabled by user */
            else if (message && this.userDataSyncEnablementService.isEnabled()) {
                this.logService.info(message);
            }
        }
    }
    // For tests purpose only
    startAutoSync() { return true; }
    isAutoSyncEnabled() {
        if (!this.userDataSyncEnablementService.isEnabled()) {
            return { enabled: false, message: '[AutoSync] Disabled.' };
        }
        if (!this.userDataSyncAccountService.account) {
            return { enabled: false, message: '[AutoSync] Suspended until auth token is available.' };
        }
        if (this.userDataSyncStoreService.donotMakeRequestsUntil) {
            return { enabled: false, message: `[AutoSync] Suspended until ${toLocalISOString(this.userDataSyncStoreService.donotMakeRequestsUntil)} because server is not accepting requests until then.` };
        }
        if (this.suspendUntilRestart) {
            return { enabled: false, message: '[AutoSync] Suspended until restart.' };
        }
        return { enabled: true };
    }
    async turnOn() {
        this.stopDisableMachineEventually();
        this.lastSyncUrl = this.syncUrl;
        this.updateEnablement(true);
    }
    async turnOff(everywhere, softTurnOffOnError, donotRemoveMachine) {
        try {
            // Remove machine
            if (this.userDataSyncAccountService.account && !donotRemoveMachine) {
                await this.userDataSyncMachinesService.removeCurrentMachine();
            }
            // Disable Auto Sync
            this.updateEnablement(false);
            // Reset Session
            this.storageService.remove(sessionIdKey, -1 /* StorageScope.APPLICATION */);
            // Reset
            if (everywhere) {
                await this.userDataSyncService.reset();
            }
            else {
                await this.userDataSyncService.resetLocal();
            }
        }
        catch (error) {
            this.logService.error(error);
            if (softTurnOffOnError) {
                this.updateEnablement(false);
            }
            else {
                throw error;
            }
        }
    }
    updateEnablement(enabled) {
        if (this.userDataSyncEnablementService.isEnabled() !== enabled) {
            this.userDataSyncEnablementService.setEnablement(enabled);
            this.updateAutoSync();
        }
    }
    hasProductQualityChanged() {
        return !!this.previousProductQuality && !!this.productQuality && this.previousProductQuality !== this.productQuality;
    }
    async onDidFinishSync(error) {
        this.logService.debug('[AutoSync] Sync Finished');
        if (!error) {
            // Sync finished without errors
            this.successiveFailures = 0;
            return;
        }
        // Error while syncing
        const userDataSyncError = UserDataSyncError.toUserDataSyncError(error);
        // Session got expired
        if (userDataSyncError.code === "SessionExpired" /* UserDataSyncErrorCode.SessionExpired */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info('[AutoSync] Turned off sync because current session is expired');
        }
        // Turned off from another device
        else if (userDataSyncError.code === "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info('[AutoSync] Turned off sync because sync is turned off in the cloud');
        }
        // Exceeded Rate Limit on Client
        else if (userDataSyncError.code === "LocalTooManyRequests" /* UserDataSyncErrorCode.LocalTooManyRequests */) {
            this.suspendUntilRestart = true;
            this.logService.info('[AutoSync] Suspended sync because of making too many requests to server');
            this.updateAutoSync();
        }
        // Exceeded Rate Limit on Server
        else if (userDataSyncError.code === "RemoteTooManyRequests" /* UserDataSyncErrorCode.TooManyRequests */) {
            await this.turnOff(false, true /* force soft turnoff on error */, true /* do not disable machine because disabling a machine makes request to server and can fail with TooManyRequests */);
            this.disableMachineEventually();
            this.logService.info('[AutoSync] Turned off sync because of making too many requests to server');
        }
        // Method Not Found
        else if (userDataSyncError.code === "MethodNotFound" /* UserDataSyncErrorCode.MethodNotFound */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info('[AutoSync] Turned off sync because current client is making requests to server that are not supported');
        }
        // Upgrade Required or Gone
        else if (userDataSyncError.code === "UpgradeRequired" /* UserDataSyncErrorCode.UpgradeRequired */ || userDataSyncError.code === "Gone" /* UserDataSyncErrorCode.Gone */) {
            await this.turnOff(false, true /* force soft turnoff on error */, true /* do not disable machine because disabling a machine makes request to server and can fail with upgrade required or gone */);
            this.disableMachineEventually();
            this.logService.info('[AutoSync] Turned off sync because current client is not compatible with server. Requires client upgrade.');
        }
        // Incompatible Local Content
        else if (userDataSyncError.code === "IncompatibleLocalContent" /* UserDataSyncErrorCode.IncompatibleLocalContent */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info(`[AutoSync] Turned off sync because server has ${userDataSyncError.resource} content with newer version than of client. Requires client upgrade.`);
        }
        // Incompatible Remote Content
        else if (userDataSyncError.code === "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */) {
            await this.turnOff(false, true /* force soft turnoff on error */);
            this.logService.info(`[AutoSync] Turned off sync because server has ${userDataSyncError.resource} content with older version than of client. Requires server reset.`);
        }
        // Service changed
        else if (userDataSyncError.code === "ServiceChanged" /* UserDataSyncErrorCode.ServiceChanged */ || userDataSyncError.code === "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */) {
            // Check if default settings sync service has changed in web without changing the product quality
            // Then turn off settings sync and ask user to turn on again
            if (isWeb && userDataSyncError.code === "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */ && !this.hasProductQualityChanged()) {
                await this.turnOff(false, true /* force soft turnoff on error */);
                this.logService.info('[AutoSync] Turned off sync because default sync service is changed.');
            }
            // Service has changed by the user. So turn off and turn on sync.
            // Show a prompt to the user about service change.
            else {
                await this.turnOff(false, true /* force soft turnoff on error */, true /* do not disable machine */);
                await this.turnOn();
                this.logService.info('[AutoSync] Sync Service changed. Turned off auto sync, reset local state and turned on auto sync.');
            }
        }
        else {
            this.logService.error(userDataSyncError);
            this.successiveFailures++;
        }
        this._onError.fire(userDataSyncError);
    }
    async disableMachineEventually() {
        this.storageService.store(disableMachineEventuallyKey, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await timeout(1000 * 60 * 10);
        // Return if got stopped meanwhile.
        if (!this.hasToDisableMachineEventually()) {
            return;
        }
        this.stopDisableMachineEventually();
        // disable only if sync is disabled
        if (!this.userDataSyncEnablementService.isEnabled() && this.userDataSyncAccountService.account) {
            await this.userDataSyncMachinesService.removeCurrentMachine();
        }
    }
    hasToDisableMachineEventually() {
        return this.storageService.getBoolean(disableMachineEventuallyKey, -1 /* StorageScope.APPLICATION */, false);
    }
    stopDisableMachineEventually() {
        this.storageService.remove(disableMachineEventuallyKey, -1 /* StorageScope.APPLICATION */);
    }
    async triggerSync(sources, options) {
        if (this.autoSync.value === undefined) {
            return this.syncTriggerDelayer.cancel();
        }
        if (options?.skipIfSyncedRecently && this.lastSyncTriggerTime && new Date().getTime() - this.lastSyncTriggerTime < 10_000) {
            this.logService.debug('[AutoSync] Skipping because sync was triggered recently.', sources);
            return;
        }
        this.sources.push(...sources);
        return this.syncTriggerDelayer.trigger(async () => {
            this.logService.trace('[AutoSync] Activity sources', ...this.sources);
            this.sources = [];
            if (this.autoSync.value) {
                await this.autoSync.value.sync('Activity', !!options?.disableCache);
            }
        }, this.successiveFailures
            ? Math.min(this.getSyncTriggerDelayTime() * this.successiveFailures, 60_000) /* Delay linearly until max 1 minute */
            : options?.immediately ? 0 : this.getSyncTriggerDelayTime());
    }
    getSyncTriggerDelayTime() {
        if (this.lastSyncTriggerTime && new Date().getTime() - this.lastSyncTriggerTime > 10_000) {
            this.logService.debug('[AutoSync] Sync immediately because last sync was triggered more than 10 seconds ago.');
            return 0;
        }
        return 3_000; /* Debounce for 3 seconds if there are no failures */
    }
};
UserDataAutoSyncService = __decorate([
    __param(0, IProductService),
    __param(1, IUserDataSyncStoreManagementService),
    __param(2, IUserDataSyncStoreService),
    __param(3, IUserDataSyncEnablementService),
    __param(4, IUserDataSyncService),
    __param(5, IUserDataSyncLogService),
    __param(6, IUserDataSyncAccountService),
    __param(7, ITelemetryService),
    __param(8, IUserDataSyncMachinesService),
    __param(9, IStorageService)
], UserDataAutoSyncService);
export { UserDataAutoSyncService };
class AutoSync extends Disposable {
    static { this.INTERVAL_SYNCING = 'Interval'; }
    constructor(lastSyncUrl, interval /* in milliseconds */, userDataSyncStoreManagementService, userDataSyncStoreService, userDataSyncService, userDataSyncMachinesService, logService, telemetryService, storageService) {
        super();
        this.lastSyncUrl = lastSyncUrl;
        this.interval = interval;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncMachinesService = userDataSyncMachinesService;
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.storageService = storageService;
        this.intervalHandler = this._register(new MutableDisposable());
        this._onDidStartSync = this._register(new Emitter());
        this.onDidStartSync = this._onDidStartSync.event;
        this._onDidFinishSync = this._register(new Emitter());
        this.onDidFinishSync = this._onDidFinishSync.event;
        this.manifest = null;
    }
    start() {
        this._register(this.onDidFinishSync(() => this.waitUntilNextIntervalAndSync()));
        this._register(toDisposable(() => {
            if (this.syncPromise) {
                this.syncPromise.cancel();
                this.logService.info('[AutoSync] Cancelled sync that is in progress');
                this.syncPromise = undefined;
            }
            this.syncTask?.stop();
            this.logService.info('[AutoSync] Stopped');
        }));
        this.sync(AutoSync.INTERVAL_SYNCING, false);
    }
    waitUntilNextIntervalAndSync() {
        this.intervalHandler.value = disposableTimeout(() => {
            this.sync(AutoSync.INTERVAL_SYNCING, false);
            this.intervalHandler.value = undefined;
        }, this.interval);
    }
    sync(reason, disableCache) {
        const syncPromise = createCancelablePromise(async (token) => {
            if (this.syncPromise) {
                try {
                    // Wait until existing sync is finished
                    this.logService.debug('[AutoSync] Waiting until sync is finished.');
                    await this.syncPromise;
                }
                catch (error) {
                    if (isCancellationError(error)) {
                        // Cancelled => Disposed. Donot continue sync.
                        return;
                    }
                }
            }
            return this.doSync(reason, disableCache, token);
        });
        this.syncPromise = syncPromise;
        this.syncPromise.finally(() => this.syncPromise = undefined);
        return this.syncPromise;
    }
    hasSyncServiceChanged() {
        return this.lastSyncUrl !== undefined && !isEqual(this.lastSyncUrl, this.userDataSyncStoreManagementService.userDataSyncStore?.url);
    }
    async hasDefaultServiceChanged() {
        const previous = await this.userDataSyncStoreManagementService.getPreviousUserDataSyncStore();
        const current = this.userDataSyncStoreManagementService.userDataSyncStore;
        // check if defaults changed
        return !!current && !!previous &&
            (!isEqual(current.defaultUrl, previous.defaultUrl) ||
                !isEqual(current.insidersUrl, previous.insidersUrl) ||
                !isEqual(current.stableUrl, previous.stableUrl));
    }
    async doSync(reason, disableCache, token) {
        this.logService.info(`[AutoSync] Triggered by ${reason}`);
        this._onDidStartSync.fire();
        let error;
        try {
            await this.createAndRunSyncTask(disableCache, token);
        }
        catch (e) {
            this.logService.error(e);
            error = e;
            if (UserDataSyncError.toUserDataSyncError(e).code === "MethodNotFound" /* UserDataSyncErrorCode.MethodNotFound */) {
                try {
                    this.logService.info('[AutoSync] Client is making invalid requests. Cleaning up data...');
                    await this.userDataSyncService.cleanUpRemoteData();
                    this.logService.info('[AutoSync] Retrying sync...');
                    await this.createAndRunSyncTask(disableCache, token);
                    error = undefined;
                }
                catch (e1) {
                    this.logService.error(e1);
                    error = e1;
                }
            }
        }
        this._onDidFinishSync.fire(error);
    }
    async createAndRunSyncTask(disableCache, token) {
        this.syncTask = await this.userDataSyncService.createSyncTask(this.manifest, disableCache);
        if (token.isCancellationRequested) {
            return;
        }
        this.manifest = this.syncTask.manifest;
        // Server has no data but this machine was synced before
        if (this.manifest === null && await this.userDataSyncService.hasPreviouslySynced()) {
            if (this.hasSyncServiceChanged()) {
                if (await this.hasDefaultServiceChanged()) {
                    throw new UserDataAutoSyncError(localize('default service changed', "Cannot sync because default service has changed"), "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */);
                }
                else {
                    throw new UserDataAutoSyncError(localize('service changed', "Cannot sync because sync service has changed"), "ServiceChanged" /* UserDataSyncErrorCode.ServiceChanged */);
                }
            }
            else {
                // Sync was turned off in the cloud
                throw new UserDataAutoSyncError(localize('turned off', "Cannot sync because syncing is turned off in the cloud"), "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */);
            }
        }
        const sessionId = this.storageService.get(sessionIdKey, -1 /* StorageScope.APPLICATION */);
        // Server session is different from client session
        if (sessionId && this.manifest && sessionId !== this.manifest.session) {
            if (this.hasSyncServiceChanged()) {
                if (await this.hasDefaultServiceChanged()) {
                    throw new UserDataAutoSyncError(localize('default service changed', "Cannot sync because default service has changed"), "DefaultServiceChanged" /* UserDataSyncErrorCode.DefaultServiceChanged */);
                }
                else {
                    throw new UserDataAutoSyncError(localize('service changed', "Cannot sync because sync service has changed"), "ServiceChanged" /* UserDataSyncErrorCode.ServiceChanged */);
                }
            }
            else {
                throw new UserDataAutoSyncError(localize('session expired', "Cannot sync because current session is expired"), "SessionExpired" /* UserDataSyncErrorCode.SessionExpired */);
            }
        }
        const machines = await this.userDataSyncMachinesService.getMachines(this.manifest || undefined);
        // Return if cancellation is requested
        if (token.isCancellationRequested) {
            return;
        }
        const currentMachine = machines.find(machine => machine.isCurrent);
        // Check if sync was turned off from other machine
        if (currentMachine?.disabled) {
            // Throw TurnedOff error
            throw new UserDataAutoSyncError(localize('turned off machine', "Cannot sync because syncing is turned off on this machine from another machine."), "TurnedOff" /* UserDataSyncErrorCode.TurnedOff */);
        }
        const startTime = new Date().getTime();
        await this.syncTask.run();
        this.telemetryService.publicLog2('settingsSync:sync', { duration: new Date().getTime() - startTime });
        // After syncing, get the manifest if it was not available before
        if (this.manifest === null) {
            try {
                this.manifest = await this.userDataSyncStoreService.manifest(null);
            }
            catch (error) {
                throw new UserDataAutoSyncError(toErrorMessage(error), error instanceof UserDataSyncError ? error.code : "Unknown" /* UserDataSyncErrorCode.Unknown */);
            }
        }
        // Update local session id
        if (this.manifest && this.manifest.session !== sessionId) {
            this.storageService.store(sessionIdKey, this.manifest.session, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        // Return if cancellation is requested
        if (token.isCancellationRequested) {
            return;
        }
        // Add current machine
        if (!currentMachine) {
            await this.userDataSyncMachinesService.addCurrentMachine(this.manifest || undefined);
        }
    }
    register(t) {
        return super._register(t);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhQXV0b1N5bmNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFekksT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUM7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFrRSx1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