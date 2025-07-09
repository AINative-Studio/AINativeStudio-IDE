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
import { OPT_OUT_KEY } from '../common/storageKeys.js';
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
        const oldId = this.oldId;
        const setValIfNotExist = oldId === 'NULL' ? undefined : oldId;
        return this._memoStorage('void.app.machineId', 1 /* StorageTarget.MACHINE */, setValIfNotExist);
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
    async initialize() {
        // very important to await whenReady!
        await this._appStorage.whenReady;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvZWxlY3Ryb24tbWFpbi9tZXRyaWNzTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFeEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFHbEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHdkQsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0FBQ2pGLE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRTtJQUN2QixJQUFJLENBQUM7UUFDSixNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQSxDQUFDLGtCQUFrQjtRQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLElB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