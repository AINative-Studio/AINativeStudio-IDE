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
var UserDataSyncMachinesService_1;
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isAndroid, isChrome, isEdge, isFirefox, isSafari, isWeb, platform, PlatformToString } from '../../../base/common/platform.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IProductService } from '../../product/common/productService.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { IStorageService } from '../../storage/common/storage.js';
import { IUserDataSyncLogService, IUserDataSyncStoreService } from './userDataSync.js';
export const IUserDataSyncMachinesService = createDecorator('IUserDataSyncMachinesService');
const currentMachineNameKey = 'sync.currentMachineName';
const Safari = 'Safari';
const Chrome = 'Chrome';
const Edge = 'Edge';
const Firefox = 'Firefox';
const Android = 'Android';
export function isWebPlatform(platform) {
    switch (platform) {
        case Safari:
        case Chrome:
        case Edge:
        case Firefox:
        case Android:
        case PlatformToString(0 /* Platform.Web */):
            return true;
    }
    return false;
}
function getPlatformName() {
    if (isSafari) {
        return Safari;
    }
    if (isChrome) {
        return Chrome;
    }
    if (isEdge) {
        return Edge;
    }
    if (isFirefox) {
        return Firefox;
    }
    if (isAndroid) {
        return Android;
    }
    return PlatformToString(isWeb ? 0 /* Platform.Web */ : platform);
}
let UserDataSyncMachinesService = class UserDataSyncMachinesService extends Disposable {
    static { UserDataSyncMachinesService_1 = this; }
    static { this.VERSION = 1; }
    static { this.RESOURCE = 'machines'; }
    constructor(environmentService, fileService, storageService, userDataSyncStoreService, logService, productService) {
        super();
        this.storageService = storageService;
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.logService = logService;
        this.productService = productService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.userData = null;
        this.currentMachineIdPromise = getServiceMachineId(environmentService, fileService, storageService);
    }
    async getMachines(manifest) {
        const currentMachineId = await this.currentMachineIdPromise;
        const machineData = await this.readMachinesData(manifest);
        return machineData.machines.map(machine => ({ ...machine, ...{ isCurrent: machine.id === currentMachineId } }));
    }
    async addCurrentMachine(manifest) {
        const currentMachineId = await this.currentMachineIdPromise;
        const machineData = await this.readMachinesData(manifest);
        if (!machineData.machines.some(({ id }) => id === currentMachineId)) {
            machineData.machines.push({ id: currentMachineId, name: this.computeCurrentMachineName(machineData.machines), platform: getPlatformName() });
            await this.writeMachinesData(machineData);
        }
    }
    async removeCurrentMachine(manifest) {
        const currentMachineId = await this.currentMachineIdPromise;
        const machineData = await this.readMachinesData(manifest);
        const updatedMachines = machineData.machines.filter(({ id }) => id !== currentMachineId);
        if (updatedMachines.length !== machineData.machines.length) {
            machineData.machines = updatedMachines;
            await this.writeMachinesData(machineData);
        }
    }
    async renameMachine(machineId, name, manifest) {
        const machineData = await this.readMachinesData(manifest);
        const machine = machineData.machines.find(({ id }) => id === machineId);
        if (machine) {
            machine.name = name;
            await this.writeMachinesData(machineData);
            const currentMachineId = await this.currentMachineIdPromise;
            if (machineId === currentMachineId) {
                this.storageService.store(currentMachineNameKey, name, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
        }
    }
    async setEnablements(enablements) {
        const machineData = await this.readMachinesData();
        for (const [machineId, enabled] of enablements) {
            const machine = machineData.machines.find(machine => machine.id === machineId);
            if (machine) {
                machine.disabled = enabled ? undefined : true;
            }
        }
        await this.writeMachinesData(machineData);
    }
    computeCurrentMachineName(machines) {
        const previousName = this.storageService.get(currentMachineNameKey, -1 /* StorageScope.APPLICATION */);
        if (previousName) {
            if (!machines.some(machine => machine.name === previousName)) {
                return previousName;
            }
            this.storageService.remove(currentMachineNameKey, -1 /* StorageScope.APPLICATION */);
        }
        const namePrefix = `${this.productService.embedderIdentifier ? `${this.productService.embedderIdentifier} - ` : ''}${getPlatformName()} (${this.productService.nameShort})`;
        const nameRegEx = new RegExp(`${escapeRegExpCharacters(namePrefix)}\\s#(\\d+)`);
        let nameIndex = 0;
        for (const machine of machines) {
            const matches = nameRegEx.exec(machine.name);
            const index = matches ? parseInt(matches[1]) : 0;
            nameIndex = index > nameIndex ? index : nameIndex;
        }
        return `${namePrefix} #${nameIndex + 1}`;
    }
    async readMachinesData(manifest) {
        this.userData = await this.readUserData(manifest);
        const machinesData = this.parse(this.userData);
        if (machinesData.version !== UserDataSyncMachinesService_1.VERSION) {
            throw new Error(localize('error incompatible', "Cannot read machines data as the current version is incompatible. Please update {0} and try again.", this.productService.nameLong));
        }
        return machinesData;
    }
    async writeMachinesData(machinesData) {
        const content = JSON.stringify(machinesData);
        const ref = await this.userDataSyncStoreService.writeResource(UserDataSyncMachinesService_1.RESOURCE, content, this.userData?.ref || null);
        this.userData = { ref, content };
        this._onDidChange.fire();
    }
    async readUserData(manifest) {
        if (this.userData) {
            const latestRef = manifest && manifest.latest ? manifest.latest[UserDataSyncMachinesService_1.RESOURCE] : undefined;
            // Last time synced resource and latest resource on server are same
            if (this.userData.ref === latestRef) {
                return this.userData;
            }
            // There is no resource on server and last time it was synced with no resource
            if (latestRef === undefined && this.userData.content === null) {
                return this.userData;
            }
        }
        return this.userDataSyncStoreService.readResource(UserDataSyncMachinesService_1.RESOURCE, this.userData);
    }
    parse(userData) {
        if (userData.content !== null) {
            try {
                return JSON.parse(userData.content);
            }
            catch (e) {
                this.logService.error(e);
            }
        }
        return {
            version: UserDataSyncMachinesService_1.VERSION,
            machines: []
        };
    }
};
UserDataSyncMachinesService = UserDataSyncMachinesService_1 = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IFileService),
    __param(2, IStorageService),
    __param(3, IUserDataSyncStoreService),
    __param(4, IUserDataSyncLogService),
    __param(5, IProductService)
], UserDataSyncMachinesService);
export { UserDataSyncMachinesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jTWFjaGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmNNYWNoaW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQVksUUFBUSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDakosT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUM7QUFDL0YsT0FBTyxFQUFnQyx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBZ0JySCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxlQUFlLENBQStCLDhC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