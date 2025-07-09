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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IProductService } from '../../product/common/productService.js';
import { IStorageService } from '../../storage/common/storage.js';
import { AbstractUserDataSyncStoreManagementService } from './userDataSyncStoreService.js';
export class UserDataSyncAccountServiceChannel {
    constructor(service) {
        this.service = service;
    }
    listen(_, event) {
        switch (event) {
            case 'onDidChangeAccount': return this.service.onDidChangeAccount;
            case 'onTokenFailed': return this.service.onTokenFailed;
        }
        throw new Error(`[UserDataSyncAccountServiceChannel] Event not found: ${event}`);
    }
    call(context, command, args) {
        switch (command) {
            case '_getInitialData': return Promise.resolve(this.service.account);
            case 'updateAccount': return this.service.updateAccount(args);
        }
        throw new Error('Invalid call');
    }
}
export class UserDataSyncAccountServiceChannelClient extends Disposable {
    get account() { return this._account; }
    get onTokenFailed() { return this.channel.listen('onTokenFailed'); }
    constructor(channel) {
        super();
        this.channel = channel;
        this._onDidChangeAccount = this._register(new Emitter());
        this.onDidChangeAccount = this._onDidChangeAccount.event;
        this.channel.call('_getInitialData').then(account => {
            this._account = account;
            this._register(this.channel.listen('onDidChangeAccount')(account => {
                this._account = account;
                this._onDidChangeAccount.fire(account);
            }));
        });
    }
    updateAccount(account) {
        return this.channel.call('updateAccount', account);
    }
}
export class UserDataSyncStoreManagementServiceChannel {
    constructor(service) {
        this.service = service;
    }
    listen(_, event) {
        switch (event) {
            case 'onDidChangeUserDataSyncStore': return this.service.onDidChangeUserDataSyncStore;
        }
        throw new Error(`[UserDataSyncStoreManagementServiceChannel] Event not found: ${event}`);
    }
    call(context, command, args) {
        switch (command) {
            case 'switch': return this.service.switch(args[0]);
            case 'getPreviousUserDataSyncStore': return this.service.getPreviousUserDataSyncStore();
        }
        throw new Error('Invalid call');
    }
}
let UserDataSyncStoreManagementServiceChannelClient = class UserDataSyncStoreManagementServiceChannelClient extends AbstractUserDataSyncStoreManagementService {
    constructor(channel, productService, configurationService, storageService) {
        super(productService, configurationService, storageService);
        this.channel = channel;
        this._register(this.channel.listen('onDidChangeUserDataSyncStore')(() => this.updateUserDataSyncStore()));
    }
    async switch(type) {
        return this.channel.call('switch', [type]);
    }
    async getPreviousUserDataSyncStore() {
        const userDataSyncStore = await this.channel.call('getPreviousUserDataSyncStore');
        return this.revive(userDataSyncStore);
    }
    revive(userDataSyncStore) {
        return {
            url: URI.revive(userDataSyncStore.url),
            type: userDataSyncStore.type,
            defaultUrl: URI.revive(userDataSyncStore.defaultUrl),
            insidersUrl: URI.revive(userDataSyncStore.insidersUrl),
            stableUrl: URI.revive(userDataSyncStore.stableUrl),
            canSwitch: userDataSyncStore.canSwitch,
            authenticationProviders: userDataSyncStore.authenticationProviders,
        };
    }
};
UserDataSyncStoreManagementServiceChannelClient = __decorate([
    __param(1, IProductService),
    __param(2, IConfigurationService),
    __param(3, IStorageService)
], UserDataSyncStoreManagementServiceChannelClient);
export { UserDataSyncStoreManagementServiceChannelClient };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHbEUsT0FBTyxFQUFFLDBDQUEwQyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFM0YsTUFBTSxPQUFPLGlDQUFpQztJQUM3QyxZQUE2QixPQUFvQztRQUFwQyxZQUFPLEdBQVAsT0FBTyxDQUE2QjtJQUFJLENBQUM7SUFFdEUsTUFBTSxDQUFDLENBQVUsRUFBRSxLQUFhO1FBQy9CLFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLG9CQUFvQixDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1lBQ2xFLEtBQUssZUFBZSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUN6RCxDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQVksRUFBRSxPQUFl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