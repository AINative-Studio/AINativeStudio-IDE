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
var ExtHostDecorations_1;
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { Disposable, FileDecoration } from './extHostTypes.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { asArray, groupBy } from '../../../base/common/arrays.js';
import { compare, count } from '../../../base/common/strings.js';
import { dirname } from '../../../base/common/path.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
let ExtHostDecorations = class ExtHostDecorations {
    static { ExtHostDecorations_1 = this; }
    static { this._handlePool = 0; }
    static { this._maxEventSize = 250; }
    constructor(extHostRpc, _logService) {
        this._logService = _logService;
        this._provider = new Map();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadDecorations);
    }
    registerFileDecorationProvider(provider, extensionDescription) {
        const handle = ExtHostDecorations_1._handlePool++;
        this._provider.set(handle, { provider, extensionDescription });
        this._proxy.$registerDecorationProvider(handle, extensionDescription.identifier.value);
        const listener = provider.onDidChangeFileDecorations && provider.onDidChangeFileDecorations(e => {
            if (!e) {
                this._proxy.$onDidChange(handle, null);
                return;
            }
            const array = asArray(e);
            if (array.length <= ExtHostDecorations_1._maxEventSize) {
                this._proxy.$onDidChange(handle, array);
                return;
            }
            // too many resources per event. pick one resource per folder, starting
            // with parent folders
            this._logService.warn('[Decorations] CAPPING events from decorations provider', extensionDescription.identifier.value, array.length);
            const mapped = array.map(uri => ({ uri, rank: count(uri.path, '/') }));
            const groups = groupBy(mapped, (a, b) => a.rank - b.rank || compare(a.uri.path, b.uri.path));
            const picked = [];
            outer: for (const uris of groups) {
                let lastDirname;
                for (const obj of uris) {
                    const myDirname = dirname(obj.uri.path);
                    if (lastDirname !== myDirname) {
                        lastDirname = myDirname;
                        if (picked.push(obj.uri) >= ExtHostDecorations_1._maxEventSize) {
                            break outer;
                        }
                    }
                }
            }
            this._proxy.$onDidChange(handle, picked);
        });
        return new Disposable(() => {
            listener?.dispose();
            this._proxy.$unregisterDecorationProvider(handle);
            this._provider.delete(handle);
        });
    }
    async $provideDecorations(handle, requests, token) {
        if (!this._provider.has(handle)) {
            // might have been unregistered in the meantime
            return Object.create(null);
        }
        const result = Object.create(null);
        const { provider, extensionDescription: extensionId } = this._provider.get(handle);
        await Promise.all(requests.map(async (request) => {
            try {
                const { uri, id } = request;
                const data = await Promise.resolve(provider.provideFileDecoration(URI.revive(uri), token));
                if (!data) {
                    return;
                }
                try {
                    FileDecoration.validate(data);
                    if (data.badge && typeof data.badge !== 'string') {
                        checkProposedApiEnabled(extensionId, 'codiconDecoration');
                    }
                    result[id] = [data.propagate, data.tooltip, data.badge, data.color];
                }
                catch (e) {
                    this._logService.warn(`INVALID decoration from extension '${extensionId.identifier.value}': ${e}`);
                }
            }
            catch (err) {
                this._logService.error(err);
            }
        }));
        return result;
    }
};
ExtHostDecorations = ExtHostDecorations_1 = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService)
], ExtHostDecorations);
export { ExtHostDecorations };
export const IExtHostDecorations = createDecorator('IExtHostDecorations');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3REZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxXQUFXLEVBQTJHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0osT0FBTyxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUcvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFPbEYsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7O2FBRWYsZ0JBQVcsR0FBRyxDQUFDLEFBQUosQ0FBSzthQUNoQixrQkFBYSxHQUFHLEdBQUcsQUFBTixDQUFPO0lBTW5DLFlBQ3FCLFVBQThCLEVBQ3JDLFdBQXlDO1FBQXhCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBTHRDLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQztRQU81RCxJQUFJ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