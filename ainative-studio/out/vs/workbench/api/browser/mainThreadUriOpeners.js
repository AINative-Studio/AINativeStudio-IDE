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
import { Action } from '../../../base/common/actions.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { localize } from '../../../nls.js';
import { INotificationService, Severity } from '../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { defaultExternalUriOpenerId } from '../../contrib/externalUriOpener/common/configuration.js';
import { ContributedExternalUriOpenersStore } from '../../contrib/externalUriOpener/common/contributedOpeners.js';
import { IExternalUriOpenerService } from '../../contrib/externalUriOpener/common/externalUriOpenerService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadUriOpeners = class MainThreadUriOpeners extends Disposable {
    constructor(context, storageService, externalUriOpenerService, extensionService, openerService, notificationService) {
        super();
        this.extensionService = extensionService;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this._registeredOpeners = new Map();
        this.proxy = context.getProxy(ExtHostContext.ExtHostUriOpeners);
        this._register(externalUriOpenerService.registerExternalOpenerProvider(this));
        this._contributedExternalUriOpenersStore = this._register(new ContributedExternalUriOpenersStore(storageService, extensionService));
    }
    async *getOpeners(targetUri) {
        // Currently we only allow openers for http and https urls
        if (targetUri.scheme !== Schemas.http && targetUri.scheme !== Schemas.https) {
            return;
        }
        await this.extensionService.activateByEvent(`onOpenExternalUri:${targetUri.scheme}`);
        for (const [id, openerMetadata] of this._registeredOpeners) {
            if (openerMetadata.schemes.has(targetUri.scheme)) {
                yield this.createOpener(id, openerMetadata);
            }
        }
    }
    createOpener(id, metadata) {
        return {
            id: id,
            label: metadata.label,
            canOpen: (uri, token) => {
                return this.proxy.$canOpenUri(id, uri, token);
            },
            openExternalUri: async (uri, ctx, token) => {
                try {
                    await this.proxy.$openUri(id, { resolvedUri: uri, sourceUri: ctx.sourceUri }, token);
                }
                catch (e) {
                    if (!isCancellationError(e)) {
                        const openDefaultAction = new Action('default', localize('openerFailedUseDefault', "Open using default opener"), undefined, undefined, async () => {
                            await this.openerService.open(uri, {
                                allowTunneling: false,
                                allowContributedOpeners: defaultExternalUriOpenerId,
                            });
                        });
                        openDefaultAction.tooltip = uri.toString();
                        this.notificationService.notify({
                            severity: Severity.Error,
                            message: localize({
                                key: 'openerFailedMessage',
                                comment: ['{0} is the id of the opener. {1} is the url being opened.'],
                            }, 'Could not open uri with \'{0}\': {1}', id, e.toString()),
                            actions: {
                                primary: [
                                    openDefaultAction
                                ]
                            }
                        });
                    }
                }
                return true;
            },
        };
    }
    async $registerUriOpener(id, schemes, extensionId, label) {
        if (this._registeredOpeners.has(id)) {
            throw new Error(`Opener with id '${id}' already registered`);
        }
        this._registeredOpeners.set(id, {
            schemes: new Set(schemes),
            label,
            extensionId,
        });
        this._contributedExternalUriOpenersStore.didRegisterOpener(id, extensionId.value);
    }
    async $unregisterUriOpener(id) {
        this._registeredOpeners.delete(id);
        this._contributedExternalUriOpenersStore.delete(id);
    }
    dispose() {
        super.dispose();
        this._registeredOpeners.clear();
    }
};
MainThreadUriOpeners = __decorate([
    extHostNamedCustomer(MainContext.MainThreadUriOpeners),
    __param(1, IStorageService),
    __param(2, IExternalUriOpenerService),
    __param(3, IExtensionService),
    __param(4, IOpenerService),
    __param(5, INotificationService)
], MainThreadUriOpeners);
export { MainThreadUriOpeners };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFVyaU9wZW5lcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRVcmlPcGVuZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDdkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUEwQixXQUFXLEVBQTZCLE1BQU0sK0JBQStCLENBQUM7QUFDL0gsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDckcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDbEgsT0FBTyxFQUErQyx5QkFBeUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQzVKLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQVN0RyxJQUFNLG9CQUFvQixHQUExQixN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