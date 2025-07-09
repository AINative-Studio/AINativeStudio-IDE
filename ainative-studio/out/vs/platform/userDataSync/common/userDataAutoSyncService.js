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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YUF1dG9TeW5jU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXpJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0csT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGlDQUFpQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3hFLE9BQU8sRUFBa0Us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