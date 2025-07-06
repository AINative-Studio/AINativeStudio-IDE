/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { LogLevel as LogServiceLevel } from '../../../platform/log/common/log.js';
import { LogLevel, createHttpPatch, createProxyResolver, createTlsPatch, createNetPatch, loadSystemCertificates } from '@vscode/proxy-agent';
import { createRequire } from 'node:module';
import { lookupKerberosAuthorization } from '../../../platform/request/node/requestService.js';
import * as proxyAgent from '@vscode/proxy-agent';
const require = createRequire(import.meta.url);
const http = require('http');
const https = require('https');
const tls = require('tls');
const net = require('net');
const systemCertificatesV2Default = false;
const useElectronFetchDefault = false;
export function connectProxyResolver(extHostWorkspace, configProvider, extensionService, extHostLogService, mainThreadTelemetry, initData, disposables) {
    const isRemote = initData.remote.isRemote;
    const useHostProxyDefault = initData.environment.useHostProxy ?? !isRemote;
    const fallbackToLocalKerberos = useHostProxyDefault;
    const loadLocalCertificates = useHostProxyDefault;
    const isUseHostProxyEnabled = () => !isRemote || configProvider.getConfiguration('http').get('useLocalProxyConfiguration', useHostProxyDefault);
    const params = {
        resolveProxy: url => extHostWorkspace.resolveProxy(url),
        lookupProxyAuthorization: lookupProxyAuthorization.bind(undefined, extHostWorkspace, extHostLogService, mainThreadTelemetry, configProvider, {}, {}, initData.remote.isRemote, fallbackToLocalKerberos),
        getProxyURL: () => getExtHostConfigValue(configProvider, isRemote, 'http.proxy'),
        getProxySupport: () => getExtHostConfigValue(configProvider, isRemote, 'http.proxySupport') || 'off',
        getNoProxyConfig: () => getExtHostConfigValue(configProvider, isRemote, 'http.noProxy') || [],
        isAdditionalFetchSupportEnabled: () => getExtHostConfigValue(configProvider, isRemote, 'http.fetchAdditionalSupport', true),
        addCertificatesV1: () => certSettingV1(configProvider, isRemote),
        addCertificatesV2: () => certSettingV2(configProvider, isRemote),
        log: extHostLogService,
        getLogLevel: () => {
            const level = extHostLogService.getLevel();
            switch (level) {
                case LogServiceLevel.Trace: return LogLevel.Trace;
                case LogServiceLevel.Debug: return LogLevel.Debug;
                case LogServiceLevel.Info: return LogLevel.Info;
                case LogServiceLevel.Warning: return LogLevel.Warning;
                case LogServiceLevel.Error: return LogLevel.Error;
                case LogServiceLevel.Off: return LogLevel.Off;
                default: return never(level);
            }
            function never(level) {
                extHostLogService.error('Unknown log level', level);
                return LogLevel.Debug;
            }
        },
        proxyResolveTelemetry: () => { },
        isUseHostProxyEnabled,
        loadAdditionalCertificates: async () => {
            const promises = [];
            if (initData.remote.isRemote) {
                promises.push(loadSystemCertificates({ log: extHostLogService }));
            }
            if (loadLocalCertificates) {
                extHostLogService.trace('ProxyResolver#loadAdditionalCertificates: Loading certificates from main process');
                const certs = extHostWorkspace.loadCertificates(); // Loading from main process to share cache.
                certs.then(certs => extHostLogService.trace('ProxyResolver#loadAdditionalCertificates: Loaded certificates from main process', certs.length));
                promises.push(certs);
            }
            // Using https.globalAgent because it is shared with proxy.test.ts and mutable.
            if (initData.environment.extensionTestsLocationURI && https.globalAgent.testCertificates?.length) {
                extHostLogService.trace('ProxyResolver#loadAdditionalCertificates: Loading test certificates');
                promises.push(Promise.resolve(https.globalAgent.testCertificates));
            }
            return (await Promise.all(promises)).flat();
        },
        env: process.env,
    };
    const { resolveProxyWithRequest, resolveProxyURL } = createProxyResolver(params);
    const target = proxyAgent.default || proxyAgent;
    target.resolveProxyURL = resolveProxyURL;
    patchGlobalFetch(params, configProvider, mainThreadTelemetry, initData, resolveProxyURL, disposables);
    const lookup = createPatchedModules(params, resolveProxyWithRequest);
    return configureModuleLoading(extensionService, lookup);
}
const unsafeHeaders = [
    'content-length',
    'host',
    'trailer',
    'te',
    'upgrade',
    'cookie2',
    'keep-alive',
    'transfer-encoding',
    'set-cookie',
];
function patchGlobalFetch(params, configProvider, mainThreadTelemetry, initData, resolveProxyURL, disposables) {
    if (!globalThis.__vscodeOriginalFetch) {
        const originalFetch = globalThis.fetch;
        globalThis.__vscodeOriginalFetch = originalFetch;
        const patchedFetch = proxyAgent.createFetchPatch(params, originalFetch, resolveProxyURL);
        globalThis.__vscodePatchedFetch = patchedFetch;
        let useElectronFetch = false;
        if (!initData.remote.isRemote) {
            useElectronFetch = configProvider.getConfiguration('http').get('electronFetch', useElectronFetchDefault);
            disposables.add(configProvider.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('http.electronFetch')) {
                    useElectronFetch = configProvider.getConfiguration('http').get('electronFetch', useElectronFetchDefault);
                }
            }));
        }
        // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
        globalThis.fetch = async function fetch(input, init) {
            function getRequestProperty(name) {
                return init && name in init ? init[name] : typeof input === 'object' && 'cache' in input ? input[name] : undefined;
            }
            // Limitations: https://github.com/electron/electron/pull/36733#issuecomment-1405615494
            // net.fetch fails on manual redirect: https://github.com/electron/electron/issues/43715
            const urlString = typeof input === 'string' ? input : 'cache' in input ? input.url : input.toString();
            const isDataUrl = urlString.startsWith('data:');
            if (isDataUrl) {
                recordFetchFeatureUse(mainThreadTelemetry, 'data');
            }
            const isBlobUrl = urlString.startsWith('blob:');
            if (isBlobUrl) {
                recordFetchFeatureUse(mainThreadTelemetry, 'blob');
            }
            const isManualRedirect = getRequestProperty('redirect') === 'manual';
            if (isManualRedirect) {
                recordFetchFeatureUse(mainThreadTelemetry, 'manualRedirect');
            }
            const integrity = getRequestProperty('integrity');
            if (integrity) {
                recordFetchFeatureUse(mainThreadTelemetry, 'integrity');
            }
            if (!useElectronFetch || isDataUrl || isBlobUrl || isManualRedirect || integrity) {
                const response = await patchedFetch(input, init);
                monitorResponseProperties(mainThreadTelemetry, response, urlString);
                return response;
            }
            // Unsupported headers: https://source.chromium.org/chromium/chromium/src/+/main:services/network/public/cpp/header_util.cc;l=32;drc=ee7299f8961a1b05a3554efcc496b6daa0d7f6e1
            if (init?.headers) {
                const headers = new Headers(init.headers);
                for (const header of unsafeHeaders) {
                    headers.delete(header);
                }
                init = { ...init, headers };
            }
            // Support for URL: https://github.com/electron/electron/issues/43712
            const electronInput = input instanceof URL ? input.toString() : input;
            const electron = require('electron');
            const response = await electron.net.fetch(electronInput, init);
            monitorResponseProperties(mainThreadTelemetry, response, urlString);
            return response;
        };
    }
}
function monitorResponseProperties(mainThreadTelemetry, response, urlString) {
    const originalUrl = response.url;
    Object.defineProperty(response, 'url', {
        get() {
            recordFetchFeatureUse(mainThreadTelemetry, 'url');
            return originalUrl || urlString;
        }
    });
    const originalType = response.type;
    Object.defineProperty(response, 'type', {
        get() {
            recordFetchFeatureUse(mainThreadTelemetry, 'typeProperty');
            return originalType !== 'default' ? originalType : 'basic';
        }
    });
}
const fetchFeatureUse = {
    url: 0,
    typeProperty: 0,
    data: 0,
    blob: 0,
    integrity: 0,
    manualRedirect: 0,
};
let timer;
const enableFeatureUseTelemetry = false;
function recordFetchFeatureUse(mainThreadTelemetry, feature) {
    if (enableFeatureUseTelemetry && !fetchFeatureUse[feature]++) {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            mainThreadTelemetry.$publicLog2('fetchFeatureUse', fetchFeatureUse);
        }, 10000); // collect additional features for 10 seconds
        timer.unref();
    }
}
function createPatchedModules(params, resolveProxy) {
    function mergeModules(module, patch) {
        const target = module.default || module;
        target.__vscodeOriginal = Object.assign({}, target);
        return Object.assign(target, patch);
    }
    return {
        http: mergeModules(http, createHttpPatch(params, http, resolveProxy)),
        https: mergeModules(https, createHttpPatch(params, https, resolveProxy)),
        net: mergeModules(net, createNetPatch(params, net)),
        tls: mergeModules(tls, createTlsPatch(params, tls))
    };
}
function certSettingV1(configProvider, isRemote) {
    return !getExtHostConfigValue(configProvider, isRemote, 'http.experimental.systemCertificatesV2', systemCertificatesV2Default) && !!getExtHostConfigValue(configProvider, isRemote, 'http.systemCertificates');
}
function certSettingV2(configProvider, isRemote) {
    return !!getExtHostConfigValue(configProvider, isRemote, 'http.experimental.systemCertificatesV2', systemCertificatesV2Default) && !!getExtHostConfigValue(configProvider, isRemote, 'http.systemCertificates');
}
const modulesCache = new Map();
function configureModuleLoading(extensionService, lookup) {
    return extensionService.getExtensionPathIndex()
        .then(extensionPaths => {
        const node_module = require('module');
        const original = node_module._load;
        node_module._load = function load(request, parent, isMain) {
            if (request === 'net') {
                return lookup.net;
            }
            if (request === 'tls') {
                return lookup.tls;
            }
            if (request !== 'http' && request !== 'https' && request !== 'undici') {
                return original.apply(this, arguments);
            }
            const ext = extensionPaths.findSubstr(URI.file(parent.filename));
            let cache = modulesCache.get(ext);
            if (!cache) {
                modulesCache.set(ext, cache = {});
            }
            if (!cache[request]) {
                if (request === 'undici') {
                    const undici = original.apply(this, arguments);
                    proxyAgent.patchUndici(undici);
                    cache[request] = undici;
                }
                else {
                    const mod = lookup[request];
                    cache[request] = { ...mod }; // Copy to work around #93167.
                }
            }
            return cache[request];
        };
    });
}
async function lookupProxyAuthorization(extHostWorkspace, extHostLogService, mainThreadTelemetry, configProvider, proxyAuthenticateCache, basicAuthCache, isRemote, fallbackToLocalKerberos, proxyURL, proxyAuthenticate, state) {
    const cached = proxyAuthenticateCache[proxyURL];
    if (proxyAuthenticate) {
        proxyAuthenticateCache[proxyURL] = proxyAuthenticate;
    }
    extHostLogService.trace('ProxyResolver#lookupProxyAuthorization callback', `proxyURL:${proxyURL}`, `proxyAuthenticate:${proxyAuthenticate}`, `proxyAuthenticateCache:${cached}`);
    const header = proxyAuthenticate || cached;
    const authenticate = Array.isArray(header) ? header : typeof header === 'string' ? [header] : [];
    sendTelemetry(mainThreadTelemetry, authenticate, isRemote);
    if (authenticate.some(a => /^(Negotiate|Kerberos)( |$)/i.test(a)) && !state.kerberosRequested) {
        state.kerberosRequested = true;
        try {
            const spnConfig = getExtHostConfigValue(configProvider, isRemote, 'http.proxyKerberosServicePrincipal');
            const response = await lookupKerberosAuthorization(proxyURL, spnConfig, extHostLogService, 'ProxyResolver#lookupProxyAuthorization');
            return 'Negotiate ' + response;
        }
        catch (err) {
            extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Kerberos authentication failed', err);
        }
        if (isRemote && fallbackToLocalKerberos) {
            extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Kerberos authentication lookup on host', `proxyURL:${proxyURL}`);
            const auth = await extHostWorkspace.lookupKerberosAuthorization(proxyURL);
            if (auth) {
                return 'Negotiate ' + auth;
            }
        }
    }
    const basicAuthHeader = authenticate.find(a => /^Basic( |$)/i.test(a));
    if (basicAuthHeader) {
        try {
            const cachedAuth = basicAuthCache[proxyURL];
            if (cachedAuth) {
                if (state.basicAuthCacheUsed) {
                    extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication deleting cached credentials', `proxyURL:${proxyURL}`);
                    delete basicAuthCache[proxyURL];
                }
                else {
                    extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication using cached credentials', `proxyURL:${proxyURL}`);
                    state.basicAuthCacheUsed = true;
                    return cachedAuth;
                }
            }
            state.basicAuthAttempt = (state.basicAuthAttempt || 0) + 1;
            const realm = / realm="([^"]+)"/i.exec(basicAuthHeader)?.[1];
            extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication lookup', `proxyURL:${proxyURL}`, `realm:${realm}`);
            const url = new URL(proxyURL);
            const authInfo = {
                scheme: 'basic',
                host: url.hostname,
                port: Number(url.port),
                realm: realm || '',
                isProxy: true,
                attempt: state.basicAuthAttempt,
            };
            const credentials = await extHostWorkspace.lookupAuthorization(authInfo);
            if (credentials) {
                extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication received credentials', `proxyURL:${proxyURL}`, `realm:${realm}`);
                const auth = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
                basicAuthCache[proxyURL] = auth;
                return auth;
            }
            else {
                extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication received no credentials', `proxyURL:${proxyURL}`, `realm:${realm}`);
            }
        }
        catch (err) {
            extHostLogService.error('ProxyResolver#lookupProxyAuthorization Basic authentication failed', err);
        }
    }
    return undefined;
}
let telemetrySent = false;
const enableProxyAuthenticationTelemetry = false;
function sendTelemetry(mainThreadTelemetry, authenticate, isRemote) {
    if (!enableProxyAuthenticationTelemetry || telemetrySent || !authenticate.length) {
        return;
    }
    telemetrySent = true;
    mainThreadTelemetry.$publicLog2('proxyAuthenticationRequest', {
        authenticationType: authenticate.map(a => a.split(' ')[0]).join(','),
        extensionHostType: isRemote ? 'remote' : 'local',
    });
}
function getExtHostConfigValue(configProvider, isRemote, key, fallback) {
    if (isRemote) {
        return configProvider.getConfiguration().get(key) ?? fallback;
    }
    const values = configProvider.getConfiguration().inspect(key);
    return values?.globalLocalValue ?? values?.defaultValue ?? fallback;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHlSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9wcm94eVJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQWUsUUFBUSxJQUFJLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBeUMsY0FBYyxFQUFFLHNCQUFzQixFQUEyQixNQUFNLHFCQUFxQixDQUFDO0FBRzdNLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFHNUMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDL0YsT0FBTyxLQUFLLFVBQVUsTUFBTSxxQkFBcUIsQ0FBQztBQUVsRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMvQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0IsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLE1BQU0sR0FBRyxHQUFtQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDM0MsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRTNCLE1BQU0sMkJBQTJCLEdBQUcsS0FBSyxDQUFDO0FBQzFDLE1BQU0sdUJBQXVCLEdBQUcsS0FBSyxDQUFDO0FBRXRDLE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsZ0JBQTJDLEVBQzNDLGNBQXFDLEVBQ3JDLGdC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