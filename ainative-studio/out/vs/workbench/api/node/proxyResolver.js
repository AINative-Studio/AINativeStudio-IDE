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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHlSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvcHJveHlSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFlLFFBQVEsSUFBSSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRixPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxjQUFjLEVBQXlDLGNBQWMsRUFBRSxzQkFBc0IsRUFBMkIsTUFBTSxxQkFBcUIsQ0FBQztBQUc3TSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRzVDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQy9GLE9BQU8sS0FBSyxVQUFVLE1BQU0scUJBQXFCLENBQUM7QUFFbEQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0MsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixNQUFNLEdBQUcsR0FBbUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUUzQixNQUFNLDJCQUEyQixHQUFHLEtBQUssQ0FBQztBQUMxQyxNQUFNLHVCQUF1QixHQUFHLEtBQUssQ0FBQztBQUV0QyxNQUFNLFVBQVUsb0JBQW9CLENBQ25DLGdCQUEyQyxFQUMzQyxjQUFxQyxFQUNyQyxn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