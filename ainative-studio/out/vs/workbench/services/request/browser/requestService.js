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
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { RequestChannelClient } from '../../../../platform/request/common/requestIpc.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { AbstractRequestService } from '../../../../platform/request/common/request.js';
import { request } from '../../../../base/parts/request/common/requestImpl.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { localize } from '../../../../nls.js';
import { LogService } from '../../../../platform/log/common/logService.js';
import { windowLogGroup } from '../../log/common/logConstants.js';
let BrowserRequestService = class BrowserRequestService extends AbstractRequestService {
    constructor(remoteAgentService, configurationService, loggerService) {
        const logger = loggerService.createLogger(`network`, { name: localize('network', "Network"), group: windowLogGroup });
        const logService = new LogService(logger);
        super(logService);
        this.remoteAgentService = remoteAgentService;
        this.configurationService = configurationService;
        this._register(logger);
        this._register(logService);
    }
    async request(options, token) {
        try {
            if (!options.proxyAuthorization) {
                options.proxyAuthorization = this.configurationService.inspect('http.proxyAuthorization').userLocalValue;
            }
            const context = await this.logAndRequest(options, () => request(options, token, () => navigator.onLine));
            const connection = this.remoteAgentService.getConnection();
            if (connection && context.res.statusCode === 405) {
                return this._makeRemoteRequest(connection, options, token);
            }
            return context;
        }
        catch (error) {
            const connection = this.remoteAgentService.getConnection();
            if (connection) {
                return this._makeRemoteRequest(connection, options, token);
            }
            throw error;
        }
    }
    async resolveProxy(url) {
        return undefined; // not implemented in the web
    }
    async lookupAuthorization(authInfo) {
        return undefined; // not implemented in the web
    }
    async lookupKerberosAuthorization(url) {
        return undefined; // not implemented in the web
    }
    async loadCertificates() {
        return []; // not implemented in the web
    }
    _makeRemoteRequest(connection, options, token) {
        return connection.withChannel('request', channel => new RequestChannelClient(channel).request(options, token));
    }
};
BrowserRequestService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IConfigurationService),
    __param(2, ILoggerService)
], BrowserRequestService);
export { BrowserRequestService };
// --- Internal commands to help authentication for extensions
CommandsRegistry.registerCommand('_workbench.fetchJSON', async function (accessor, url, method) {
    const result = await fetch(url, { method, headers: { Accept: 'application/json' } });
    if (result.ok) {
        return result.json();
    }
    else {
        throw new Error(result.statusText);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlcXVlc3QvYnJvd3Nlci9yZXF1ZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQTBCLE1BQU0sMkNBQTJDLENBQUM7QUFFeEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLHNCQUFzQixFQUEwQyxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0QsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxzQkFBc0I7SUFJaEUsWUFDdUMsa0JBQXVDLEVBQ3JDLG9CQUEyQyxFQUNuRSxhQUE2QjtRQUU3QyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFD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