/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IApplicationStorageMainService } from '../../../../platform/storage/electron-main/storageMainService.js';
import { PostHog } from 'posthog-node';
import { OPT_OUT_KEY, MACHINE_ID_KEY, LEGACY_OPT_OUT_KEY, LEGACY_MACHINE_ID_KEY } from '../common/storageKeys.js';
const os = isWindows ? 'windows' : isMacintosh ? 'mac' : isLinux ? 'linux' : null;
const _getOSInfo = () => {
    try {
        const { platform, arch } = process; // see platform.ts
        return { platform, arch };
    }
    catch (e) {
        return { osInfo: { platform: '??', arch: '??' } };
    }
};
const osInfo = _getOSInfo();
// we'd like to use devDeviceId on telemetryService, but that gets sanitized by the time it gets here as 'someValue.devDeviceId'
let MetricsMainService = class MetricsMainService extends Disposable {
    // helper - looks like this is stored in a .vscdb file in ~/Library/Application Support/Void
    _memoStorage(key, target, setValIfNotExist) {
        const currVal = this._appStorage.get(key, -1 /* StorageScope.APPLICATION */);
        if (currVal !== undefined)
            return currVal;
        const newVal = setValIfNotExist ?? generateUuid();
        this._appStorage.store(key, newVal, -1 /* StorageScope.APPLICATION */, target);
        return newVal;
    }
    // this is old, eventually we can just delete this since all the keys will have been transferred over
    // returns 'NULL' or the old key
    get oldId() {
        // check new storage key first
        const newKey = 'void.app.oldMachineId';
        const newOldId = this._appStorage.get(newKey, -1 /* StorageScope.APPLICATION */);
        if (newOldId)
            return newOldId;
        // put old key into new key if didn't already
        const oldValue = this._appStorage.get('void.machineId', -1 /* StorageScope.APPLICATION */) ?? 'NULL'; // the old way of getting the key
        this._appStorage.store(newKey, oldValue, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        return oldValue;
        // in a few weeks we can replace above with this
        // private get oldId() {
        // 	return this._memoStorage('void.app.oldMachineId', StorageTarget.MACHINE, 'NULL')
        // }
    }
    // the main id
    get distinctId() {
        // Migrate from legacy key if needed
        this._migrateMachineId();
        const oldId = this.oldId;
        const setValIfNotExist = oldId === 'NULL' ? undefined : oldId;
        return this._memoStorage(MACHINE_ID_KEY, 1 /* StorageTarget.MACHINE */, setValIfNotExist);
    }
    /**
     * Migrate machine ID from legacy 'void.app.machineId' to 'ainative.app.machineId'
     */
    _migrateMachineId() {
        // Check if new key already exists
        const newKeyData = this._appStorage.get(MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */);
        if (newKeyData) {
            return; // Already migrated
        }
        // Read from legacy key
        const legacyData = this._appStorage.get(LEGACY_MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */);
        if (!legacyData) {
            return; // No legacy data to migrate
        }
        // Migrate
        this._appStorage.store(MACHINE_ID_KEY, legacyData, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this._appStorage.remove(LEGACY_MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */);
        console.log('[AINative Migration] Successfully migrated machine ID from void.app.machineId to ainative.app.machineId');
    }
    // just to see if there are ever multiple machineIDs per userID (instead of this, we should just track by the user's email)
    get userId() {
        return this._memoStorage('void.app.userMachineId', 0 /* StorageTarget.USER */);
    }
    constructor(_productService, _envMainService, _appStorage) {
        super();
        this._productService = _productService;
        this._envMainService = _envMainService;
        this._appStorage = _appStorage;
        this._initProperties = {};
        this.capture = (event, params) => {
            const capture = { distinctId: this.distinctId, event, properties: params };
            // console.log('full capture:', this.distinctId)
            this.client.capture(capture);
        };
        this.setOptOut = (newVal) => {
            if (newVal) {
                this._appStorage.store(OPT_OUT_KEY, 'true', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
            else {
                this._appStorage.remove(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */);
            }
        };
        this.client = new PostHog('phc_UanIdujHiLp55BkUTjB1AuBXcasVkdqRwgnwRlWESH2', {
            host: 'https://us.i.posthog.com',
        });
        this.initialize(); // async
    }
    /**
     * Migrate opt-out setting from legacy 'void.app.optOutAll' to 'ainative.app.optOutAll'
     */
    _migrateOptOut() {
        // Check if new key already exists
        const newKeyData = this._appStorage.get(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */);
        if (newKeyData !== undefined) {
            return; // Already migrated
        }
        // Read from legacy key
        const legacyData = this._appStorage.get(LEGACY_OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */);
        if (!legacyData) {
            return; // No legacy data to migrate
        }
        // Migrate
        this._appStorage.store(OPT_OUT_KEY, legacyData, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this._appStorage.remove(LEGACY_OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */);
        console.log('[AINative Migration] Successfully migrated opt-out setting from void.app.optOutAll to ainative.app.optOutAll');
    }
    async initialize() {
        // very important to await whenReady!
        await this._appStorage.whenReady;
        // Migrate legacy storage keys
        this._migrateOptOut();
        const { commit, version, voidVersion, release, quality } = this._productService;
        const isDevMode = !this._envMainService.isBuilt; // found in abstractUpdateService.ts
        // custom properties we identify
        this._initProperties = {
            commit,
            vscodeVersion: version,
            voidVersion: voidVersion,
            release,
            os,
            quality,
            distinctId: this.distinctId,
            distinctIdUser: this.userId,
            oldId: this.oldId,
            isDevMode,
            ...osInfo,
        };
        const identifyMessage = {
            distinctId: this.distinctId,
            properties: this._initProperties,
        };
        const didOptOut = this._appStorage.getBoolean(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */, false);
        console.log('User is opted out of basic Void metrics?', didOptOut);
        if (didOptOut) {
            this.client.optOut();
        }
        else {
            this.client.optIn();
            this.client.identify(identifyMessage);
        }
        console.log('Void posthog metrics info:', JSON.stringify(identifyMessage, null, 2));
    }
    async getDebuggingProperties() {
        return this._initProperties;
    }
};
MetricsMainService = __decorate([
    __param(0, IProductService),
    __param(1, IEnvironmentMainService),
    __param(2, IApplicationStorageMainService)
], MetricsMainService);
export { MetricsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9lbGVjdHJvbi1tYWluL21ldHJpY3NNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUV4RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUdsSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3RDLE9BQU8sRUFDTixXQUFXLEVBQ1gsY0FBYyxFQUNkLGtCQUFrQixFQUNsQixxQkFBcUIsRUFDckIsTUFBTSwwQkFBMEIsQ0FBQztBQUdsQyxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7QUFDakYsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFO0lBQ3ZCLElBQUksQ0FBQztRQUNKLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFB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