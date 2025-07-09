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
import { app } from 'electron';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Event } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEncryptionMainService } from '../../encryption/common/encryptionService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IApplicationStorageMainService } from '../../storage/electron-main/storageMainService.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
export const IProxyAuthService = createDecorator('proxyAuthService');
let ProxyAuthService = class ProxyAuthService extends Disposable {
    constructor(logService, windowsMainService, encryptionMainService, applicationStorageMainService, configurationService, environmentMainService) {
        super();
        this.logService = logService;
        this.windowsMainService = windowsMainService;
        this.encryptionMainService = encryptionMainService;
        this.applicationStorageMainService = applicationStorageMainService;
        this.configurationService = configurationService;
        this.environmentMainService = environmentMainService;
        this.PROXY_CREDENTIALS_SERVICE_KEY = 'proxy-credentials://';
        this.pendingProxyResolves = new Map();
        this.currentDialog = undefined;
        this.cancelledAuthInfoHashes = new Set();
        this.sessionCredentials = new Map();
        this.registerListeners();
    }
    registerListeners() {
        const onLogin = Event.fromNodeEventEmitter(app, 'login', (event, _webContents, req, authInfo, callback) => ({ event, authInfo: { ...authInfo, attempt: req.firstAuthAttempt ? 1 : 2 }, callback }));
        this._register(onLogin(this.onLogin, this));
    }
    async lookupAuthorization(authInfo) {
        return this.onLogin({ authInfo });
    }
    async onLogin({ event, authInfo, callback }) {
        if (!authInfo.isProxy) {
            return; // only for proxy
        }
        // Signal we handle this event on our own, otherwise
        // Electron will ignore our provided credentials.
        event?.preventDefault();
        // Compute a hash over the authentication info to be used
        // with the credentials store to return the right credentials
        // given the properties of the auth request
        // (see https://github.com/microsoft/vscode/issues/109497)
        const authInfoHash = String(hash({ scheme: authInfo.scheme, host: authInfo.host, port: authInfo.port }));
        let credentials = undefined;
        let pendingProxyResolve = this.pendingProxyResolves.get(authInfoHash);
        if (!pendingProxyResolve) {
            this.logService.trace('auth#onLogin (proxy) - no pending proxy handling found, starting new');
            pendingProxyResolve = this.resolveProxyCredentials(authInfo, authInfoHash);
            this.pendingProxyResolves.set(authInfoHash, pendingProxyResolve);
            try {
                credentials = await pendingProxyResolve;
            }
            finally {
                this.pendingProxyResolves.delete(authInfoHash);
            }
        }
        else {
            this.logService.trace('auth#onLogin (proxy) - pending proxy handling found');
            credentials = await pendingProxyResolve;
        }
        // According to Electron docs, it is fine to call back without
        // username or password to signal that the authentication was handled
        // by us, even though without having credentials received:
        //
        // > If `callback` is called without a username or password, the authentication
        // > request will be cancelled and the authentication error will be returned to the
        // > page.
        callback?.(credentials?.username, credentials?.password);
        return credentials;
    }
    async resolveProxyCredentials(authInfo, authInfoHash) {
        this.logService.trace('auth#resolveProxyCredentials (proxy) - enter');
        try {
            const credentials = await this.doResolveProxyCredentials(authInfo, authInfoHash);
            if (credentials) {
                this.logService.trace('auth#resolveProxyCredentials (proxy) - got credentials');
                return credentials;
            }
            else {
                this.logService.trace('auth#resolveProxyCredentials (proxy) - did not get credentials');
            }
        }
        finally {
            this.logService.trace('auth#resolveProxyCredentials (proxy) - exit');
        }
        return undefined;
    }
    async doResolveProxyCredentials(authInfo, authInfoHash) {
        this.logService.trace('auth#doResolveProxyCredentials - enter', authInfo);
        // For testing.
        if (this.environmentMainService.extensionTestsLocationURI) {
            try {
                const decodedRealm = Buffer.from(authInfo.realm, 'base64').toString('utf-8');
                if (decodedRealm.startsWith('{')) {
                    return JSON.parse(decodedRealm);
                }
            }
            catch {
                // ignore
            }
            return undefined;
        }
        // Reply with manually supplied credentials. Fail if they are wrong.
        const newHttpProxy = (this.configurationService.getValue('http.proxy') || '').trim()
            || (process.env['https_proxy'] || process.env['HTTPS_PROXY'] || process.env['http_proxy'] || process.env['HTTP_PROXY'] || '').trim()
            || undefined;
        if (newHttpProxy?.indexOf('@') !== -1) {
            const uri = URI.parse(newHttpProxy);
            const i = uri.authority.indexOf('@');
            if (i !== -1) {
                if (authInfo.attempt > 1) {
                    this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - ignoring previously used config/envvar credentials');
                    return undefined; // We tried already, let the user handle it.
                }
                this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - found config/envvar credentials to use');
                const credentials = uri.authority.substring(0, i);
                const j = credentials.indexOf(':');
                if (j !== -1) {
                    return {
                        username: credentials.substring(0, j),
                        password: credentials.substring(j + 1)
                    };
                }
                else {
                    return {
                        username: credentials,
                        password: ''
                    };
                }
            }
        }
        // Reply with session credentials unless we used them already.
        // In that case we need to show a login dialog again because
        // they seem invalid.
        const sessionCredentials = authInfo.attempt === 1 && this.sessionCredentials.get(authInfoHash);
        if (sessionCredentials) {
            this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - found session credentials to use');
            const { username, password } = sessionCredentials;
            return { username, password };
        }
        let storedUsername;
        let storedPassword;
        try {
            // Try to find stored credentials for the given auth info
            const encryptedValue = this.applicationStorageMainService.get(this.PROXY_CREDENTIALS_SERVICE_KEY + authInfoHash, -1 /* StorageScope.APPLICATION */);
            if (encryptedValue) {
                const credentials = JSON.parse(await this.encryptionMainService.decrypt(encryptedValue));
                storedUsername = credentials.username;
                storedPassword = credentials.password;
            }
        }
        catch (error) {
            this.logService.error(error); // handle errors by asking user for login via dialog
        }
        // Reply with stored credentials unless we used them already.
        // In that case we need to show a login dialog again because
        // they seem invalid.
        if (authInfo.attempt === 1 && typeof storedUsername === 'string' && typeof storedPassword === 'string') {
            this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - found stored credentials to use');
            this.sessionCredentials.set(authInfoHash, { username: storedUsername, password: storedPassword });
            return { username: storedUsername, password: storedPassword };
        }
        const previousDialog = this.currentDialog;
        const currentDialog = this.currentDialog = (async () => {
            await previousDialog;
            const credentials = await this.showProxyCredentialsDialog(authInfo, authInfoHash, storedUsername, storedPassword);
            if (this.currentDialog === currentDialog) {
                this.currentDialog = undefined;
            }
            return credentials;
        })();
        return currentDialog;
    }
    async showProxyCredentialsDialog(authInfo, authInfoHash, storedUsername, storedPassword) {
        if (this.cancelledAuthInfoHashes.has(authInfoHash)) {
            this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - login dialog was cancelled before, not showing again');
            return undefined;
        }
        // Find suitable window to show dialog: prefer to show it in the
        // active window because any other network request will wait on
        // the credentials and we want the user to present the dialog.
        const window = this.windowsMainService.getFocusedWindow() || this.windowsMainService.getLastActiveWindow();
        if (!window) {
            this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - no opened window found to show dialog in');
            return undefined; // unexpected
        }
        this.logService.trace(`auth#doResolveProxyCredentials (proxy) - asking window ${window.id} to handle proxy login`);
        // Open proxy dialog
        const sessionCredentials = this.sessionCredentials.get(authInfoHash);
        const payload = {
            authInfo,
            username: sessionCredentials?.username ?? storedUsername, // prefer to show already used username (if any) over stored
            password: sessionCredentials?.password ?? storedPassword, // prefer to show already used password (if any) over stored
            replyChannel: `vscode:proxyAuthResponse:${generateUuid()}`
        };
        window.sendWhenReady('vscode:openProxyAuthenticationDialog', CancellationToken.None, payload);
        // Handle reply
        const loginDialogCredentials = await new Promise(resolve => {
            const proxyAuthResponseHandler = async (event, channel, reply /* canceled */) => {
                if (channel === payload.replyChannel) {
                    this.logService.trace(`auth#doResolveProxyCredentials - exit - received credentials from window ${window.id}`);
                    window.win?.webContents.off('ipc-message', proxyAuthResponseHandler);
                    // We got credentials from the window
                    if (reply) {
                        const credentials = { username: reply.username, password: reply.password };
                        // Update stored credentials based on `remember` flag
                        try {
                            if (reply.remember) {
                                const encryptedSerializedCredentials = await this.encryptionMainService.encrypt(JSON.stringify(credentials));
                                this.applicationStorageMainService.store(this.PROXY_CREDENTIALS_SERVICE_KEY + authInfoHash, encryptedSerializedCredentials, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                            }
                            else {
                                this.applicationStorageMainService.remove(this.PROXY_CREDENTIALS_SERVICE_KEY + authInfoHash, -1 /* StorageScope.APPLICATION */);
                            }
                        }
                        catch (error) {
                            this.logService.error(error); // handle gracefully
                        }
                        resolve({ username: credentials.username, password: credentials.password });
                    }
                    // We did not get any credentials from the window (e.g. cancelled)
                    else {
                        this.cancelledAuthInfoHashes.add(authInfoHash);
                        resolve(undefined);
                    }
                }
            };
            window.win?.webContents.on('ipc-message', proxyAuthResponseHandler);
        });
        // Remember credentials for the session in case
        // the credentials are wrong and we show the dialog
        // again
        this.sessionCredentials.set(authInfoHash, loginDialogCredentials);
        return loginDialogCredentials;
    }
};
ProxyAuthService = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, IEncryptionMainService),
    __param(3, IApplicationStorageMainService),
    __param(4, IConfigurationService),
    __param(5, IEnvironmentMainService)
], ProxyAuthService);
export { ProxyAuthService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9uYXRpdmUvZWxlY3Ryb24tbWFpbi9hdXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQW9HLE1BQU0sVUFBVSxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUd0RCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQVk3RSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLGtCQUFrQixDQUFDLENBQUM7QUFNakYsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBYS9DLFlBQ2MsVUFBd0MsRUFDaEMsa0JBQXdELEVBQ3JELHFCQUE4RCxFQUN0RCw2QkFBOEUsRUFDdkYsb0JBQTRELEVBQzFELHNCQUFnRTtRQUV6RixLQUFLLEVBQUUsQ0FBQztRQVBzQixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2YsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUNwQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBQ3JDLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBZ0M7UUFDdEUseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUN6QywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBZnpFLGtDQUE2QixHQUFHLHNCQUFzQixDQUFDO1FBRWhFLHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUE0QyxDQUFDO1FBQzNFLGtCQUFhLEdBQWlELFNBQVMsQ0FBQztRQUV4RSw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBRTVDLHVCQUFrQixHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFDO1FBWXZFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUFhLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxLQUFvQixFQUFFLFlBQXlCLEVBQUUsR0FBMEMsRUFBRSxRQUEwQixFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRSxHQUFHLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBd0IsQ0FBQSxDQUFDLENBQUM7UUFDMVQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsUUFBa0I7UUFDM0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFjO1FBQzlELElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdkIsT0FBTyxDQUFDLGlCQUFpQjtRQUMxQixDQUFDO1FBRUQsb0RBQW9EO1FBQ3BELGlEQUFpRDtRQUNqRCxLQUFLLEVBQUUsY0FBYyxFQUFFLENBQUM7UUFFeEIseURBQXlEO1FBQ3pELDZEQUE2RDtRQUM3RCwyQ0FBMkM7UUFDM0MsMERBQTBEO1FBQzFELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV6RyxJQUFJLFdBQVcsR0FBNEIsU0FBUyxDQUFDO1FBQ3JELElBQUksbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxzRUFBc0UsQ0FBQyxDQUFDO1lBRTlGLG1CQUFtQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDM0UsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUNqRSxJQUFJLENBQUM7Z0JBQ0osV0FBVyxHQUFHLE1BQU0sbUJBQW1CLENBQUM7WUFDekMsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEQsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQztZQUU3RSxXQUFXLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQztRQUN6QyxDQUFDO1FBRUQsOERBQThEO1FBQzlELHFFQUFxRTtRQUNyRSwwREFBMEQ7UUFDMUQsRUFBRTtRQUNGLCtFQUErRTtRQUMvRSxtRkFBbUY7UUFDbkYsVUFBVTtRQUNWLFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3pELE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFTyxLQUFLLENBQUMsdUJBQXVCLENBQUMsUUFBa0IsRUFBRSxZQUFvQjtRQUM3RSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO1FBRXRFLElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNqRixJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO2dCQUVoRixPQUFPLFdBQVcsQ0FBQztZQUNwQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztZQUN6RixDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVPLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxRQUFrQixFQUFFLFlBQW9CO1FBQy9FLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTFFLGVBQWU7UUFDZixJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQzNELElBQUksQ0FBQztnQkFDSixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUM3RSxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDbEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNqQyxDQUFDO1lBQ0YsQ0FBQztZQUFDLE1BQU0sQ0FBQztnQkFDUixTQUFTO1lBQ1YsQ0FBQztZQUNELE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxvRUFBb0U7UUFDcEUsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFTLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRTtlQUN4RixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFO2VBQ2pJLFNBQVMsQ0FBQztRQUVkLElBQUksWUFBWSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBYSxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDZCxJQUFJLFFBQVEsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzFCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLG9HQUFvRyxDQUFDLENBQUM7b0JBQzVILE9BQU8sU0FBUyxDQUFDLENBQUMsNENBQTRDO2dCQUMvRCxDQUFDO2dCQUNELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHdGQUF3RixDQUFDLENBQUM7Z0JBQ2hILE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDZCxPQUFPO3dCQUNOLFFBQVEsRUFBRSxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ3JDLFFBQVEsRUFBRSxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ3RDLENBQUM7Z0JBQ0gsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU87d0JBQ04sUUFBUSxFQUFFLFdBQVc7d0JBQ3JCLFFBQVEsRUFBRSxFQUFFO3FCQUNaLENBQUM7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsOERBQThEO1FBQzlELDREQUE0RDtRQUM1RCxxQkFBcUI7UUFDckIsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsT0FBTyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9GLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxrRkFBa0YsQ0FBQyxDQUFDO1lBRTFHLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsa0JBQWtCLENBQUM7WUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQztRQUMvQixDQUFDO1FBRUQsSUFBSSxjQUFrQyxDQUFDO1FBQ3ZDLElBQUksY0FBa0MsQ0FBQztRQUN2QyxJQUFJLENBQUM7WUFDSix5REFBeUQ7WUFDekQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEdBQUcsWUFBWSxvQ0FBMkIsQ0FBQztZQUMzSSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLFdBQVcsR0FBZ0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDdEcsY0FBYyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7Z0JBQ3RDLGNBQWMsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDO1lBQ3ZDLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLG9EQUFvRDtRQUNuRixDQUFDO1FBRUQsNkRBQTZEO1FBQzdELDREQUE0RDtRQUM1RCxxQkFBcUI7UUFDckIsSUFBSSxRQUFRLENBQUMsT0FBTyxLQUFLLENBQUMsSUFBSSxPQUFPLGNBQWMsS0FBSyxRQUFRLElBQUksT0FBTyxjQUFjLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDeEcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUZBQWlGLENBQUMsQ0FBQztZQUV6RyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxDQUFDO1FBQy9ELENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQzFDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN0RCxNQUFNLGNBQWMsQ0FBQztZQUNyQixNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNsSCxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssYUFBYyxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO1lBQ2hDLENBQUM7WUFDRCxPQUFPLFdBQVcsQ0FBQztRQUNwQixDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ0wsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztJQUVPLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxRQUFrQixFQUFFLFlBQW9CLEVBQUUsY0FBa0MsRUFBRSxjQUFrQztRQUN4SixJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUNwRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxzR0FBc0csQ0FBQyxDQUFDO1lBRTlILE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxnRUFBZ0U7UUFDaEUsK0RBQStEO1FBQy9ELDhEQUE4RDtRQUM5RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywwRkFBMEYsQ0FBQyxDQUFDO1lBRWxILE9BQU8sU0FBUyxDQUFDLENBQUMsYUFBYTtRQUNoQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsMERBQTBELE1BQU0sQ0FBQyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFFbkgsb0JBQW9CO1FBQ3BCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNyRSxNQUFNLE9BQU8sR0FBRztZQUNmLFFBQVE7WUFDUixRQUFRLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxJQUFJLGNBQWMsRUFBRSw0REFBNEQ7WUFDdEgsUUFBUSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsSUFBSSxjQUFjLEVBQUUsNERBQTREO1lBQ3RILFlBQVksRUFBRSw0QkFBNEIsWUFBWSxFQUFFLEVBQUU7U0FDMUQsQ0FBQztRQUNGLE1BQU0sQ0FBQyxhQUFhLENBQUMsc0NBQXNDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTlGLGVBQWU7UUFDZixNQUFNLHNCQUFzQixHQUFHLE1BQU0sSUFBSSxPQUFPLENBQTBCLE9BQU8sQ0FBQyxFQUFFO1lBQ25GLE1BQU0sd0JBQXdCLEdBQUcsS0FBSyxFQUFFLEtBQW9CLEVBQUUsT0FBZSxFQUFFLEtBQXNELENBQUMsY0FBYyxFQUFFLEVBQUU7Z0JBQ3ZKLElBQUksT0FBTyxLQUFLLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDdEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNEVBQTRFLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUMvRyxNQUFNLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLHdCQUF3QixDQUFDLENBQUM7b0JBRXJFLHFDQUFxQztvQkFDckMsSUFBSSxLQUFLLEVBQUUsQ0FBQzt3QkFDWCxNQUFNLFdBQVcsR0FBZ0IsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUV4RixxREFBcUQ7d0JBQ3JELElBQUksQ0FBQzs0QkFDSixJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQ0FDcEIsTUFBTSw4QkFBOEIsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dDQUM3RyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUN2QyxJQUFJLENBQUMsNkJBQTZCLEdBQUcsWUFBWSxFQUNqRCw4QkFBOEIsbUVBSTlCLENBQUM7NEJBQ0gsQ0FBQztpQ0FBTSxDQUFDO2dDQUNQLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixHQUFHLFlBQVksb0NBQTJCLENBQUM7NEJBQ3hILENBQUM7d0JBQ0YsQ0FBQzt3QkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDOzRCQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLG9CQUFvQjt3QkFDbkQsQ0FBQzt3QkFFRCxPQUFPLENBQUMsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7b0JBQzdFLENBQUM7b0JBRUQsa0VBQWtFO3lCQUM3RCxDQUFDO3dCQUNMLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7d0JBQy9DLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDcEIsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDO1lBRUYsTUFBTSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3JFLENBQUMsQ0FBQyxDQUFDO1FBRUgsK0NBQStDO1FBQy9DLG1EQUFtRDtRQUNuRCxRQUFRO1FBQ1IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUVsRSxPQUFPLHNCQUFzQixDQUFDO0lBQy9CLENBQUM7Q0FDRCxDQUFBO0FBOVFZLGdCQUFnQjtJQWMxQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLDhCQUE4QixDQUFBO0lBQzlCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx1QkFBdUIsQ0FBQTtHQW5CYixnQkFBZ0IsQ0E4UTVCIn0=