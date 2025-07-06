/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL21ldHJpY3NNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUV4RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUdsSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUd2RCxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7QUFDakYsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFO0lBQ3ZCLElBQUksQ0FBQztRQUNKLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFBLENBQUMsa0JBQWtCO1FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFB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