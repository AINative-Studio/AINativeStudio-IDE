/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { streamToBuffer } from '../../../base/common/buffer.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { Extensions } from '../../configuration/common/configurationRegistry.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Registry } from '../../registry/common/platform.js';
export const IRequestService = createDecorator('requestService');
class LoggableHeaders {
    constructor(original) {
        this.original = original;
    }
    toJSON() {
        if (!this.headers) {
            const headers = Object.create(null);
            for (const key in this.original) {
                if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'proxy-authorization') {
                    headers[key] = '*****';
                }
                else {
                    headers[key] = this.original[key];
                }
            }
            this.headers = headers;
        }
        return this.headers;
    }
}
export class AbstractRequestService extends Disposable {
    constructor(logService) {
        super();
        this.logService = logService;
        this.counter = 0;
    }
    async logAndRequest(options, request) {
        const prefix = `#${++this.counter}: ${options.url}`;
        this.logService.trace(`${prefix} - begin`, options.type, new LoggableHeaders(options.headers ?? {}));
        try {
            const result = await request();
            this.logService.trace(`${prefix} - end`, options.type, result.res.statusCode, result.res.headers);
            return result;
        }
        catch (error) {
            this.logService.error(`${prefix} - error`, options.type, getErrorMessage(error));
            throw error;
        }
    }
}
export function isSuccess(context) {
    return (context.res.statusCode && context.res.statusCode >= 200 && context.res.statusCode < 300) || context.res.statusCode === 1223;
}
export function hasNoContent(context) {
    return context.res.statusCode === 204;
}
export async function asText(context) {
    if (hasNoContent(context)) {
        return null;
    }
    const buffer = await streamToBuffer(context.stream);
    return buffer.toString();
}
export async function asTextOrError(context) {
    if (!isSuccess(context)) {
        throw new Error('Server returned ' + context.res.statusCode);
    }
    return asText(context);
}
export async function asJson(context) {
    if (!isSuccess(context)) {
        throw new Error('Server returned ' + context.res.statusCode);
    }
    if (hasNoContent(context)) {
        return null;
    }
    const buffer = await streamToBuffer(context.stream);
    const str = buffer.toString();
    try {
        return JSON.parse(str);
    }
    catch (err) {
        err.message += ':\n' + str;
        throw err;
    }
}
export function updateProxyConfigurationsScope(useHostProxy, useHostProxyDefault) {
    registerProxyConfigurations(useHostProxy, useHostProxyDefault);
}
export const USER_LOCAL_AND_REMOTE_SETTINGS = [
    'http.proxy',
    'http.proxyStrictSSL',
    'http.proxyKerberosServicePrincipal',
    'http.noProxy',
    'http.proxyAuthorization',
    'http.proxySupport',
    'http.systemCertificates',
    'http.experimental.systemCertificatesV2',
    'http.fetchAdditionalSupport',
];
let proxyConfiguration = [];
let previousUseHostProxy = undefined;
let previousUseHostProxyDefault = undefined;
function registerProxyConfigurations(useHostProxy = true, useHostProxyDefault = true) {
    if (previousUseHostProxy === useHostProxy && previousUseHostProxyDefault === useHostProxyDefault) {
        return;
    }
    previousUseHostProxy = useHostProxy;
    previousUseHostProxyDefault = useHostProxyDefault;
    const configurationRegistry = Registry.as(Extensions.Configuration);
    const oldProxyConfiguration = proxyConfiguration;
    proxyConfiguration = [
        {
            id: 'http',
            order: 15,
            title: localize('httpConfigurationTitle', "HTTP"),
            type: 'object',
            scope: 2 /* ConfigurationScope.MACHINE */,
            properties: {
                'http.useLocalProxyConfiguration': {
                    type: 'boolean',
                    default: useHostProxyDefault,
                    markdownDescription: localize('useLocalProxy', "Controls whether in the remote extension host the local proxy configuration should be used. This setting only applies as a remote setting during [remote development](https://aka.ms/vscode-remote)."),
                    restricted: true
                },
            }
        },
        {
            id: 'http',
            order: 15,
            title: localize('httpConfigurationTitle', "HTTP"),
            type: 'object',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            properties: {
                'http.electronFetch': {
                    type: 'boolean',
                    default: false,
                    description: localize('electronFetch', "Controls whether use of Electron's fetch implementation instead of Node.js' should be enabled. All local extensions will get Electron's fetch implementation for the global fetch API."),
                    restricted: true
                },
            }
        },
        {
            id: 'http',
            order: 15,
            title: localize('httpConfigurationTitle', "HTTP"),
            type: 'object',
            scope: useHostProxy ? 1 /* ConfigurationScope.APPLICATION */ : 2 /* ConfigurationScope.MACHINE */,
            properties: {
                'http.proxy': {
                    type: 'string',
                    pattern: '^(https?|socks|socks4a?|socks5h?)://([^:]*(:[^@]*)?@)?([^:]+|\\[[:0-9a-fA-F]+\\])(:\\d+)?/?$|^$',
                    markdownDescription: localize('proxy', "The proxy setting to use. If not set, will be inherited from the `http_proxy` and `https_proxy` environment variables. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`'),
                    restricted: true
                },
                'http.proxyStrictSSL': {
                    type: 'boolean',
                    default: true,
                    markdownDescription: localize('strictSSL', "Controls whether the proxy server certificate should be verified against the list of supplied CAs. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`'),
                    restricted: true
                },
                'http.proxyKerberosServicePrincipal': {
                    type: 'string',
                    markdownDescription: localize('proxyKerberosServicePrincipal', "Overrides the principal service name for Kerberos authentication with the HTTP proxy. A default based on the proxy hostname is used when this is not set. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`'),
                    restricted: true
                },
                'http.noProxy': {
                    type: 'array',
                    items: { type: 'string' },
                    markdownDescription: localize('noProxy', "Specifies domain names for which proxy settings should be ignored for HTTP/HTTPS requests. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`'),
                    restricted: true
                },
                'http.proxyAuthorization': {
                    type: ['null', 'string'],
                    default: null,
                    markdownDescription: localize('proxyAuthorization', "The value to send as the `Proxy-Authorization` header for every network request. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`'),
                    restricted: true
                },
                'http.proxySupport': {
                    type: 'string',
                    enum: ['off', 'on', 'fallback', 'override'],
                    enumDescriptions: [
                        localize('proxySupportOff', "Disable proxy support for extensions."),
                        localize('proxySupportOn', "Enable proxy support for extensions."),
                        localize('proxySupportFallback', "Enable proxy support for extensions, fall back to request options, when no proxy found."),
                        localize('proxySupportOverride', "Enable proxy support for extensions, override request options."),
                    ],
                    default: 'override',
                    markdownDescription: localize('proxySupport', "Use the proxy support for extensions. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`'),
                    restricted: true
                },
                'http.systemCertificates': {
                    type: 'boolean',
                    default: true,
                    markdownDescription: localize('systemCertificates', "Controls whether CA certificates should be loaded from the OS. On Windows and macOS, a reload of the window is required after turning this off. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`'),
                    restricted: true
                },
                'http.experimental.systemCertificatesV2': {
                    type: 'boolean',
                    tags: ['experimental'],
                    default: false,
                    markdownDescription: localize('systemCertificatesV2', "Controls whether experimental loading of CA certificates from the OS should be enabled. This uses a more general approach than the default implementation. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`'),
                    restricted: true
                },
                'http.fetchAdditionalSupport': {
                    type: 'boolean',
                    default: true,
                    markdownDescription: localize('fetchAdditionalSupport', "Controls whether Node.js' fetch implementation should be extended with additional support. Currently proxy support ({1}) and system certificates ({2}) are added when the corresponding settings are enabled. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`', '`#http.proxySupport#`', '`#http.systemCertificates#`'),
                    restricted: true
                }
            }
        }
    ];
    configurationRegistry.updateConfigurations({ add: proxyConfiguration, remove: oldProxyConfiguration });
}
registerProxyConfigurations();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZXF1ZXN0L2NvbW1vbi9yZXF1ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQXNCLFVBQVUsRUFBOEMsTUFBTSxxREFBcUQsQ0FBQztBQUNqSixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGdCQUFnQixDQUFDLENBQUM7QUEyQmxGLE1BQU0sZUFBZTtJQUlwQixZQUE2QixRQUFrQjtRQUFsQixhQUFRLEdBQVIsUUFBUSxDQUFVO0lBQUksQ0FBQztJQUVwRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3BDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxlQUFlLElBQUksR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLHFCQUFxQixFQUFFLENBQUM7b0JBQzFGLE9BQU8sQ0FBQyxH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