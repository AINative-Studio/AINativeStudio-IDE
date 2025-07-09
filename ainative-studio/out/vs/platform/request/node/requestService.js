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
import { parse as parseUrl } from 'url';
import { Promises } from '../../../base/common/async.js';
import { streamToBufferReadableStream } from '../../../base/common/buffer.js';
import { CancellationError, getErrorMessage } from '../../../base/common/errors.js';
import { isBoolean, isNumber } from '../../../base/common/types.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { getResolvedShellEnv } from '../../shell/node/shellEnv.js';
import { ILogService } from '../../log/common/log.js';
import { AbstractRequestService } from '../common/request.js';
import { getProxyAgent } from './proxy.js';
import { createGunzip } from 'zlib';
/**
 * This service exposes the `request` API, while using the global
 * or configured proxy settings.
 */
let RequestService = class RequestService extends AbstractRequestService {
    constructor(machine, configurationService, environmentService, logService) {
        super(logService);
        this.machine = machine;
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.configure();
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('http')) {
                this.configure();
            }
        }));
    }
    configure() {
        this.proxyUrl = this.getConfigValue('http.proxy');
        this.strictSSL = !!this.getConfigValue('http.proxyStrictSSL');
        this.authorization = this.getConfigValue('http.proxyAuthorization');
    }
    async request(options, token) {
        const { proxyUrl, strictSSL } = this;
        let shellEnv = undefined;
        try {
            shellEnv = await getResolvedShellEnv(this.configurationService, this.logService, this.environmentService.args, process.env);
        }
        catch (error) {
            if (!this.shellEnvErrorLogged) {
                this.shellEnvErrorLogged = true;
                this.logService.error(`resolving shell environment failed`, getErrorMessage(error));
            }
        }
        const env = {
            ...process.env,
            ...shellEnv
        };
        const agent = options.agent ? options.agent : await getProxyAgent(options.url || '', env, { proxyUrl, strictSSL });
        options.agent = agent;
        options.strictSSL = strictSSL;
        if (this.authorization) {
            options.headers = {
                ...(options.headers || {}),
                'Proxy-Authorization': this.authorization
            };
        }
        return this.logAndRequest(options, () => nodeRequest(options, token));
    }
    async resolveProxy(url) {
        return undefined; // currently not implemented in node
    }
    async lookupAuthorization(authInfo) {
        return undefined; // currently not implemented in node
    }
    async lookupKerberosAuthorization(urlStr) {
        try {
            const spnConfig = this.getConfigValue('http.proxyKerberosServicePrincipal');
            const response = await lookupKerberosAuthorization(urlStr, spnConfig, this.logService, 'RequestService#lookupKerberosAuthorization');
            return 'Negotiate ' + response;
        }
        catch (err) {
            this.logService.debug('RequestService#lookupKerberosAuthorization Kerberos authentication failed', err);
            return undefined;
        }
    }
    async loadCertificates() {
        const proxyAgent = await import('@vscode/proxy-agent');
        return proxyAgent.loadSystemCertificates({ log: this.logService });
    }
    getConfigValue(key) {
        if (this.machine === 'remote') {
            return this.configurationService.getValue(key);
        }
        const values = this.configurationService.inspect(key);
        return values.userLocalValue || values.defaultValue;
    }
};
RequestService = __decorate([
    __param(1, IConfigurationService),
    __param(2, INativeEnvironmentService),
    __param(3, ILogService)
], RequestService);
export { RequestService };
export async function lookupKerberosAuthorization(urlStr, spnConfig, logService, logPrefix) {
    const importKerberos = await import('kerberos');
    const kerberos = importKerberos.default || importKerberos;
    const url = new URL(urlStr);
    const spn = spnConfig
        || (process.platform === 'win32' ? `HTTP/${url.hostname}` : `HTTP@${url.hostname}`);
    logService.debug(`${logPrefix} Kerberos authentication lookup`, `proxyURL:${url}`, `spn:${spn}`);
    const client = await kerberos.initializeClient(spn);
    return client.step('');
}
async function getNodeRequest(options) {
    const endpoint = parseUrl(options.url);
    const module = endpoint.protocol === 'https:' ? await import('https') : await import('http');
    return module.request;
}
export async function nodeRequest(options, token) {
    return Promises.withAsyncBody(async (resolve, reject) => {
        const endpoint = parseUrl(options.url);
        const rawRequest = options.getRawRequest
            ? options.getRawRequest(options)
            : await getNodeRequest(options);
        const opts = {
            hostname: endpoint.hostname,
            port: endpoint.port ? parseInt(endpoint.port) : (endpoint.protocol === 'https:' ? 443 : 80),
            protocol: endpoint.protocol,
            path: endpoint.path,
            method: options.type || 'GET',
            headers: options.headers,
            agent: options.agent,
            rejectUnauthorized: isBoolean(options.strictSSL) ? options.strictSSL : true
        };
        if (options.user && options.password) {
            opts.auth = options.user + ':' + options.password;
        }
        if (options.disableCache) {
            opts.cache = 'no-store';
        }
        const req = rawRequest(opts, (res) => {
            const followRedirects = isNumber(options.followRedirects) ? options.followRedirects : 3;
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && followRedirects > 0 && res.headers['location']) {
                nodeRequest({
                    ...options,
                    url: res.headers['location'],
                    followRedirects: followRedirects - 1
                }, token).then(resolve, reject);
            }
            else {
                let stream = res;
                // Responses from Electron net module should be treated as response
                // from browser, which will apply gzip filter and decompress the response
                // using zlib before passing the result to us. Following step can be bypassed
                // in this case and proceed further.
                // Refs https://source.chromium.org/chromium/chromium/src/+/main:net/url_request/url_request_http_job.cc;l=1266-1318
                if (!options.isChromiumNetwork && res.headers['content-encoding'] === 'gzip') {
                    stream = res.pipe(createGunzip());
                }
                resolve({ res, stream: streamToBufferReadableStream(stream) });
            }
        });
        req.on('error', reject);
        // Handle timeout
        if (options.timeout) {
            // Chromium network requests do not support the `timeout` option
            if (options.isChromiumNetwork) {
                // Use Node's setTimeout for Chromium network requests
                const timeout = setTimeout(() => {
                    req.abort();
                    reject(new Error(`Request timeout after ${options.timeout}ms`));
                }, options.timeout);
                // Clear timeout when request completes
                req.on('response', () => clearTimeout(timeout));
                req.on('error', () => clearTimeout(timeout));
                req.on('abort', () => clearTimeout(timeout));
            }
            else {
                req.setTimeout(options.timeout);
            }
        }
        // Chromium will abort the request if forbidden headers are set.
        // Ref https://source.chromium.org/chromium/chromium/src/+/main:services/network/public/cpp/header_util.cc;l=14-48;
        // for additional context.
        if (options.isChromiumNetwork) {
            req.removeHeader('Content-Length');
        }
        if (options.data) {
            if (typeof options.data === 'string') {
                req.write(options.data);
            }
        }
        req.end();
        token.onCancellationRequested(() => {
            req.abort();
            reject(new CancellationError());
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVxdWVzdC9ub2RlL3JlcXVlc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxLQUFLLElBQUksUUFBUSxFQUFFLE1BQU0sS0FBSyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHNCQUFzQixFQUEwQyxNQUFNLHNCQUFzQixDQUFDO0FBQ3RHLE9BQU8sRUFBUyxhQUFhLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLE1BQU0sQ0FBQztBQWFwQzs7O0dBR0c7QUFDSSxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsc0JBQXNCO0lBU3pELFlBQ2tCLE9BQTJCLEVBQ0osb0JBQTJDLEVBQ3ZDLGtCQUE2QyxFQUM1RSxVQUF1QjtRQUVwQyxLQUFLLENB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