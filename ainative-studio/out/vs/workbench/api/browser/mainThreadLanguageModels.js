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
import { AsyncIterableSource, DeferredPromise } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { transformErrorForSerialization, transformErrorFromSerialization } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { resizeImage } from '../../contrib/chat/browser/imageUtils.js';
import { ILanguageModelIgnoredFilesService } from '../../contrib/chat/common/ignoredFiles.js';
import { ILanguageModelStatsService } from '../../contrib/chat/common/languageModelStats.js';
import { ILanguageModelsService } from '../../contrib/chat/common/languageModels.js';
import { IAuthenticationAccessService } from '../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationService, INTERNAL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { LanguageModelError } from '../common/extHostTypes.js';
let MainThreadLanguageModels = class MainThreadLanguageModels {
    constructor(extHostContext, _chatProviderService, _languageModelStatsService, _logService, _authenticationService, _authenticationAccessService, _extensionService, _ignoredFilesService) {
        this._chatProviderService = _chatProviderService;
        this._languageModelStatsService = _languageModelStatsService;
        this._logService = _logService;
        this._authenticationService = _authenticationService;
        this._authenticationAccessService = _authenticationAccessService;
        this._extensionService = _extensionService;
        this._ignoredFilesService = _ignoredFilesService;
        this._store = new DisposableStore();
        this._providerRegistrations = new DisposableMap();
        this._pendingProgress = new Map();
        this._ignoredFileProviderRegistrations = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostChatProvider);
        this._proxy.$acceptChatModelMetadata({ added: _chatProviderService.getLanguageModelIds().map(id => ({ identifier: id, metadata: _chatProviderService.lookupLanguageModel(id) })) });
        this._store.add(_chatProviderService.onDidChangeLanguageModels(this._proxy.$acceptChatModelMetadata, this._proxy));
    }
    dispose() {
        this._providerRegistrations.dispose();
        this._ignoredFileProviderRegistrations.dispose();
        this._store.dispose();
    }
    $registerLanguageModelProvider(handle, identifier, metadata) {
        const dipsosables = new DisposableStore();
        dipsosables.add(this._chatProviderService.registerLanguageModelChat(identifier, {
            metadata,
            sendChatRequest: async (messages, from, options, token) => {
                const requestId = (Math.random() * 1e6) | 0;
                const defer = new DeferredPromise();
                const stream = new AsyncIterableSource();
                try {
                    this._pendingProgress.set(requestId, { defer, stream });
                    await Promise.all(messages.flatMap(msg => msg.content)
                        .filter(part => part.type === 'image_url')
                        .map(async (part) => {
                        part.value.data = VSBuffer.wrap(await resizeImage(part.value.data.buffer));
                    }));
                    await this._proxy.$startChatRequest(handle, requestId, from, new SerializableObjectWithBuffers(messages), options, token);
                }
                catch (err) {
                    this._pendingProgress.delete(requestId);
                    throw err;
                }
                return {
                    result: defer.p,
                    stream: stream.asyncIterable
                };
            },
            provideTokenCount: (str, token) => {
                return this._proxy.$provideTokenLength(handle, str, token);
            },
        }));
        if (metadata.auth) {
            dipsosables.add(this._registerAuthenticationProvider(metadata.extension, metadata.auth));
        }
        this._providerRegistrations.set(handle, dipsosables);
    }
    async $reportResponsePart(requestId, chunk) {
        const data = this._pendingProgress.get(requestId);
        this._logService.trace('[LM] report response PART', Boolean(data), requestId, chunk);
        if (data) {
            data.stream.emitOne(chunk);
        }
    }
    async $reportResponseDone(requestId, err) {
        const data = this._pendingProgress.get(requestId);
        this._logService.trace('[LM] report response DONE', Boolean(data), requestId, err);
        if (data) {
            this._pendingProgress.delete(requestId);
            if (err) {
                const error = LanguageModelError.tryDeserialize(err) ?? transformErrorFromSerialization(err);
                data.stream.reject(error);
                data.defer.error(error);
            }
            else {
                data.stream.resolve();
                data.defer.complete(undefined);
            }
        }
    }
    $unregisterProvider(handle) {
        this._providerRegistrations.deleteAndDispose(handle);
    }
    $selectChatModels(selector) {
        return this._chatProviderService.selectLanguageModels(selector);
    }
    $whenLanguageModelChatRequestMade(identifier, extensionId, participant, tokenCount) {
        this._languageModelStatsService.update(identifier, extensionId, participant, tokenCount);
    }
    async $tryStartChatRequest(extension, providerId, requestId, messages, options, token) {
        this._logService.trace('[CHAT] request STARTED', extension.value, requestId);
        let response;
        try {
            response = await this._chatProviderService.sendChatRequest(providerId, extension, messages.value, options, token);
        }
        catch (err) {
            this._logService.error('[CHAT] request FAILED', extension.value, requestId, err);
            throw err;
        }
        // !!! IMPORTANT !!!
        // This method must return before the response is done (has streamed all parts)
        // and because of that we consume the stream without awaiting
        // !!! IMPORTANT !!!
        const streaming = (async () => {
            try {
                for await (const part of response.stream) {
                    this._logService.trace('[CHAT] request PART', extension.value, requestId, part);
                    await this._proxy.$acceptResponsePart(requestId, part);
                }
                this._logService.trace('[CHAT] request DONE', extension.value, requestId);
            }
            catch (err) {
                this._logService.error('[CHAT] extension request ERRORED in STREAM', err, extension.value, requestId);
                this._proxy.$acceptResponseDone(requestId, transformErrorForSerialization(err));
            }
        })();
        // When the response is done (signaled via its result) we tell the EH
        Promise.allSettled([response.result, streaming]).then(() => {
            this._logService.debug('[CHAT] extension request DONE', extension.value, requestId);
            this._proxy.$acceptResponseDone(requestId, undefined);
        }, err => {
            this._logService.error('[CHAT] extension request ERRORED', err, extension.value, requestId);
            this._proxy.$acceptResponseDone(requestId, transformErrorForSerialization(err));
        });
    }
    $countTokens(provider, value, token) {
        return this._chatProviderService.computeTokenLength(provider, value, token);
    }
    _registerAuthenticationProvider(extension, auth) {
        // This needs to be done in both MainThread & ExtHost ChatProvider
        const authProviderId = INTERNAL_AUTH_PROVIDER_PREFIX + extension.value;
        // Only register one auth provider per extension
        if (this._authenticationService.getProviderIds().includes(authProviderId)) {
            return Disposable.None;
        }
        const accountLabel = auth.accountLabel ?? localize('languageModelsAccountId', 'Language Models');
        const disposables = new DisposableStore();
        this._authenticationService.registerAuthenticationProvider(authProviderId, new LanguageModelAccessAuthProvider(authProviderId, auth.providerLabel, accountLabel));
        disposables.add(toDisposable(() => {
            this._authenticationService.unregisterAuthenticationProvider(authProviderId);
        }));
        disposables.add(this._authenticationAccessService.onDidChangeExtensionSessionAccess(async (e) => {
            const allowedExtensions = this._authenticationAccessService.readAllowedExtensions(authProviderId, accountLabel);
            const accessList = [];
            for (const allowedExtension of allowedExtensions) {
                const from = await this._extensionService.getExtension(allowedExtension.id);
                if (from) {
                    accessList.push({
                        from: from.identifier,
                        to: extension,
                        enabled: allowedExtension.allowed ?? true
                    });
                }
            }
            this._proxy.$updateModelAccesslist(accessList);
        }));
        return disposables;
    }
    $fileIsIgnored(uri, token) {
        return this._ignoredFilesService.fileIsIgnored(URI.revive(uri), token);
    }
    $registerFileIgnoreProvider(handle) {
        this._ignoredFileProviderRegistrations.set(handle, this._ignoredFilesService.registerIgnoredFileProvider({
            isFileIgnored: async (uri, token) => this._proxy.$isFileIgnored(handle, uri, token)
        }));
    }
    $unregisterFileIgnoreProvider(handle) {
        this._ignoredFileProviderRegistrations.deleteAndDispose(handle);
    }
};
MainThreadLanguageModels = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLanguageModels),
    __param(1, ILanguageModelsService),
    __param(2, ILanguageModelStatsService),
    __param(3, ILogService),
    __param(4, IAuthenticationService),
    __param(5, IAuthenticationAccessService),
    __param(6, IExtensionService),
    __param(7, ILanguageModelIgnoredFilesService)
], MainThreadLanguageModels);
export { MainThreadLanguageModels };
// The fake AuthenticationProvider that will be used to gate access to the Language Model. There will be one per provider.
class LanguageModelAccessAuthProvider {
    constructor(id, label, _accountLabel) {
        this.id = id;
        this.label = label;
        this._accountLabel = _accountLabel;
        this.supportsMultipleAccounts = false;
        // Important for updating the UI
        this._onDidChangeSessions = new Emitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
    }
    async getSessions(scopes) {
        // If there are no scopes and no session that means no extension has requested a session yet
        // and the user is simply opening the Account menu. In that case, we should not return any "sessions".
        if (scopes === undefined && !this._session) {
            return [];
        }
        if (this._session) {
            return [this._session];
        }
        return [await this.createSession(scopes || [])];
    }
    async createSession(scopes) {
        this._session = this._createFakeSession(scopes);
        this._onDidChangeSessions.fire({ added: [this._session], changed: [], removed: [] });
        return this._session;
    }
    removeSession(sessionId) {
        if (this._session) {
            this._onDidChangeSessions.fire({ added: [], changed: [], removed: [this._session] });
            this._session = undefined;
        }
        return Promise.resolve();
    }
    _createFakeSession(scopes) {
        return {
            id: 'fake-session',
            account: {
                id: this.id,
                label: this._accountLabel,
            },
            accessToken: 'fake-access-token',
            scopes,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlTW9kZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTGFuZ3VhZ2VNb2RlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUxRCxPQUFPLEVBQW1CLDhCQUE4QixFQUFFLCtCQUErQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbEksT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdGLE9BQU8sRUFBMkgsc0JBQXNCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5TSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUNwSCxPQUFPLEVBQXFGLHNCQUFzQixFQUFFLDZC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