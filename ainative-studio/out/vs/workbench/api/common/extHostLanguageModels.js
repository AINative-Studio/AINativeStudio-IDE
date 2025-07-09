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
var ExtHostLanguageModels_1;
import { AsyncIterableObject, AsyncIterableSource } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { CancellationError, transformErrorForSerialization, transformErrorFromSerialization } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, ExtensionIdentifierSet } from '../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { Progress } from '../../../platform/progress/common/progress.js';
import { INTERNAL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostAuthentication } from './extHostAuthentication.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as typeConvert from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
export const IExtHostLanguageModels = createDecorator('IExtHostLanguageModels');
class LanguageModelResponseStream {
    constructor(option, stream) {
        this.option = option;
        this.stream = new AsyncIterableSource();
        this.stream = stream ?? new AsyncIterableSource();
    }
}
class LanguageModelResponse {
    constructor() {
        this._responseStreams = new Map();
        this._defaultStream = new AsyncIterableSource();
        this._isDone = false;
        const that = this;
        this.apiObject = {
            // result: promise,
            get stream() {
                return that._defaultStream.asyncIterable;
            },
            get text() {
                return AsyncIterableObject.map(that._defaultStream.asyncIterable, part => {
                    if (part instanceof extHostTypes.LanguageModelTextPart) {
                        return part.value;
                    }
                    else {
                        return undefined;
                    }
                }).coalesce();
            },
        };
    }
    *_streams() {
        if (this._responseStreams.size > 0) {
            for (const [, value] of this._responseStreams) {
                yield value.stream;
            }
        }
        else {
            yield this._defaultStream;
        }
    }
    handleFragment(fragment) {
        if (this._isDone) {
            return;
        }
        let res = this._responseStreams.get(fragment.index);
        if (!res) {
            if (this._responseStreams.size === 0) {
                // the first response claims the default response
                res = new LanguageModelResponseStream(fragment.index, this._defaultStream);
            }
            else {
                res = new LanguageModelResponseStream(fragment.index);
            }
            this._responseStreams.set(fragment.index, res);
        }
        let out;
        if (fragment.part.type === 'text') {
            out = new extHostTypes.LanguageModelTextPart(fragment.part.value);
        }
        else {
            out = new extHostTypes.LanguageModelToolCallPart(fragment.part.toolCallId, fragment.part.name, fragment.part.parameters);
        }
        res.stream.emitOne(out);
    }
    reject(err) {
        this._isDone = true;
        for (const stream of this._streams()) {
            stream.reject(err);
        }
    }
    resolve() {
        this._isDone = true;
        for (const stream of this._streams()) {
            stream.resolve();
        }
    }
}
let ExtHostLanguageModels = class ExtHostLanguageModels {
    static { ExtHostLanguageModels_1 = this; }
    static { this._idPool = 1; }
    constructor(extHostRpc, _logService, _extHostAuthentication) {
        this._logService = _logService;
        this._extHostAuthentication = _extHostAuthentication;
        this._onDidChangeModelAccess = new Emitter();
        this._onDidChangeProviders = new Emitter();
        this.onDidChangeProviders = this._onDidChangeProviders.event;
        this._languageModels = new Map();
        this._allLanguageModelData = new Map(); // these are ALL models, not just the one in this EH
        this._modelAccessList = new ExtensionIdentifierMap();
        this._pendingRequest = new Map();
        this._ignoredFileProviders = new Map();
        this._languageAccessInformationExtensions = new Set();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadLanguageModels);
    }
    dispose() {
        this._onDidChangeModelAccess.dispose();
        this._onDidChangeProviders.dispose();
    }
    registerLanguageModel(extension, identifier, provider, metadata) {
        const handle = ExtHostLanguageModels_1._idPool++;
        this._languageModels.set(handle, { extension: extension.identifier, provider, languageModelId: identifier });
        let auth;
        if (metadata.auth) {
            auth = {
                providerLabel: extension.displayName || extension.name,
                accountLabel: typeof metadata.auth === 'object' ? metadata.auth.label : undefined
            };
        }
        this._proxy.$registerLanguageModelProvider(handle, `${ExtensionIdentifier.toKey(extension.identifier)}/${identifier}`, {
            extension: extension.identifier,
            id: identifier,
            vendor: metadata.vendor ?? ExtensionIdentifier.toKey(extension.identifier),
            name: metadata.name ?? '',
            family: metadata.family ?? '',
            version: metadata.version,
            maxInputTokens: metadata.maxInputTokens,
            maxOutputTokens: metadata.maxOutputTokens,
            auth,
            targetExtensions: metadata.extensions,
            isDefault: metadata.isDefault,
            isUserSelectable: metadata.isUserSelectable,
            capabilities: metadata.capabilities,
        });
        const responseReceivedListener = provider.onDidReceiveLanguageModelResponse2?.(({ extensionId, participant, tokenCount }) => {
            this._proxy.$whenLanguageModelChatRequestMade(identifier, new ExtensionIdentifier(extensionId), participant, tokenCount);
        });
        return toDisposable(() => {
            this._languageModels.delete(handle);
            this._proxy.$unregisterProvider(handle);
            responseReceivedListener?.dispose();
        });
    }
    async $startChatRequest(handle, requestId, from, messages, options, token) {
        const data = this._languageModels.get(handle);
        if (!data) {
            throw new Error('Provider not found');
        }
        const progress = new Progress(async (fragment) => {
            if (token.isCancellationRequested) {
                this._logService.warn(`[CHAT](${data.extension.value}) CANNOT send progress because the REQUEST IS CANCELLED`);
                return;
            }
            let part;
            if (fragment.part instanceof extHostTypes.LanguageModelToolCallPart) {
                part = { type: 'tool_use', name: fragment.part.name, parameters: fragment.part.input, toolCallId: fragment.part.callId };
            }
            else if (fragment.part instanceof extHostTypes.LanguageModelTextPart) {
                part = { type: 'text', value: fragment.part.value };
            }
            if (!part) {
                this._logService.warn(`[CHAT](${data.extension.value}) UNKNOWN part ${JSON.stringify(fragment)}`);
                return;
            }
            this._proxy.$reportResponsePart(requestId, { index: fragment.index, part });
        });
        let value;
        try {
            if (data.provider.provideLanguageModelResponse2) {
                value = data.provider.provideLanguageModelResponse2(messages.value.map(typeConvert.LanguageModelChatMessage2.to), options, ExtensionIdentifier.toKey(from), progress, token);
            }
            else {
                value = data.provider.provideLanguageModelResponse(messages.value.map(typeConvert.LanguageModelChatMessage2.to), options, ExtensionIdentifier.toKey(from), progress, token);
            }
        }
        catch (err) {
            // synchronously failed
            throw err;
        }
        Promise.resolve(value).then(() => {
            this._proxy.$reportResponseDone(requestId, undefined);
        }, err => {
            this._proxy.$reportResponseDone(requestId, transformErrorForSerialization(err));
        });
    }
    //#region --- token counting
    $provideTokenLength(handle, value, token) {
        const data = this._languageModels.get(handle);
        if (!data) {
            return Promise.resolve(0);
        }
        return Promise.resolve(data.provider.provideTokenCount(value, token));
    }
    //#region --- making request
    $acceptChatModelMetadata(data) {
        if (data.added) {
            for (const { identifier, metadata } of data.added) {
                this._allLanguageModelData.set(identifier, { metadata, apiObjects: new ExtensionIdentifierMap() });
            }
        }
        if (data.removed) {
            for (const id of data.removed) {
                // clean up
                this._allLanguageModelData.delete(id);
                // cancel pending requests for this model
                for (const [key, value] of this._pendingRequest) {
                    if (value.languageModelId === id) {
                        value.res.reject(new CancellationError());
                        this._pendingRequest.delete(key);
                    }
                }
            }
        }
        // TODO@jrieken@TylerLeonhardt - this is a temporary hack to populate the auth providers
        data.added?.forEach(added => this._fakeAuthPopulate(added.metadata));
        this._onDidChangeProviders.fire(undefined);
    }
    async getDefaultLanguageModel(extension) {
        const defaultModelId = Iterable.find(this._allLanguageModelData.entries(), ([, value]) => !!value.metadata.isDefault)?.[0];
        if (!defaultModelId) {
            return;
        }
        return this.getLanguageModelByIdentifier(extension, defaultModelId);
    }
    async getLanguageModelByIdentifier(extension, identifier) {
        const data = this._allLanguageModelData.get(identifier);
        if (!data) {
            // model gone? is this an error on us?
            return;
        }
        // make sure auth information is correct
        if (this._isUsingAuth(extension.identifier, data.metadata)) {
            await this._fakeAuthPopulate(data.metadata);
        }
        let apiObject = data.apiObjects.get(extension.identifier);
        if (!apiObject) {
            const that = this;
            apiObject = {
                id: data.metadata.id,
                vendor: data.metadata.vendor,
                family: data.metadata.family,
                version: data.metadata.version,
                name: data.metadata.name,
                capabilities: {
                    supportsImageToText: data.metadata.capabilities?.vision ?? false,
                    supportsToolCalling: data.metadata.capabilities?.toolCalling ?? false,
                },
                maxInputTokens: data.metadata.maxInputTokens,
                countTokens(text, token) {
                    if (!that._allLanguageModelData.has(identifier)) {
                        throw extHostTypes.LanguageModelError.NotFound(identifier);
                    }
                    return that._computeTokenLength(identifier, text, token ?? CancellationToken.None);
                },
                sendRequest(messages, options, token) {
                    if (!that._allLanguageModelData.has(identifier)) {
                        throw extHostTypes.LanguageModelError.NotFound(identifier);
                    }
                    return that._sendChatRequest(extension, identifier, messages, options ?? {}, token ?? CancellationToken.None);
                }
            };
            Object.freeze(apiObject);
            data.apiObjects.set(extension.identifier, apiObject);
        }
        return apiObject;
    }
    async selectLanguageModels(extension, selector) {
        // this triggers extension activation
        const models = await this._proxy.$selectChatModels({ ...selector, extension: extension.identifier });
        const result = [];
        for (const identifier of models) {
            const model = await this.getLanguageModelByIdentifier(extension, identifier);
            if (model) {
                result.push(model);
            }
        }
        return result;
    }
    async _sendChatRequest(extension, languageModelId, messages, options, token) {
        const internalMessages = this._convertMessages(extension, messages);
        const from = extension.identifier;
        const metadata = this._allLanguageModelData.get(languageModelId)?.metadata;
        if (!metadata || !this._allLanguageModelData.has(languageModelId)) {
            throw extHostTypes.LanguageModelError.NotFound(`Language model '${languageModelId}' is unknown.`);
        }
        if (this._isUsingAuth(from, metadata)) {
            const success = await this._getAuthAccess(extension, { identifier: metadata.extension, displayName: metadata.auth.providerLabel }, options.justification, false);
            if (!success || !this._modelAccessList.get(from)?.has(metadata.extension)) {
                throw extHostTypes.LanguageModelError.NoPermissions(`Language model '${languageModelId}' cannot be used by '${from.value}'.`);
            }
        }
        const requestId = (Math.random() * 1e6) | 0;
        const res = new LanguageModelResponse();
        this._pendingRequest.set(requestId, { languageModelId, res });
        try {
            await this._proxy.$tryStartChatRequest(from, languageModelId, requestId, new SerializableObjectWithBuffers(internalMessages), options, token);
        }
        catch (error) {
            // error'ing here means that the request could NOT be started/made, e.g. wrong model, no access, etc, but
            // later the response can fail as well. Those failures are communicated via the stream-object
            this._pendingRequest.delete(requestId);
            throw extHostTypes.LanguageModelError.tryDeserialize(error) ?? error;
        }
        return res.apiObject;
    }
    _convertMessages(extension, messages) {
        const internalMessages = [];
        for (const message of messages) {
            if (message.role === extHostTypes.LanguageModelChatMessageRole.System) {
                checkProposedApiEnabled(extension, 'languageModelSystem');
            }
            internalMessages.push(typeConvert.LanguageModelChatMessage2.from(message));
        }
        return internalMessages;
    }
    async $acceptResponsePart(requestId, chunk) {
        const data = this._pendingRequest.get(requestId);
        if (data) {
            data.res.handleFragment(chunk);
        }
    }
    async $acceptResponseDone(requestId, error) {
        const data = this._pendingRequest.get(requestId);
        if (!data) {
            return;
        }
        this._pendingRequest.delete(requestId);
        if (error) {
            // we error the stream because that's the only way to signal
            // that the request has failed
            data.res.reject(extHostTypes.LanguageModelError.tryDeserialize(error) ?? transformErrorFromSerialization(error));
        }
        else {
            data.res.resolve();
        }
    }
    // BIG HACK: Using AuthenticationProviders to check access to Language Models
    async _getAuthAccess(from, to, justification, silent) {
        // This needs to be done in both MainThread & ExtHost ChatProvider
        const providerId = INTERNAL_AUTH_PROVIDER_PREFIX + to.identifier.value;
        const session = await this._extHostAuthentication.getSession(from, providerId, [], { silent: true });
        if (session) {
            this.$updateModelAccesslist([{ from: from.identifier, to: to.identifier, enabled: true }]);
            return true;
        }
        if (silent) {
            return false;
        }
        try {
            const detail = justification
                ? localize('chatAccessWithJustification', "Justification: {1}", to.displayName, justification)
                : undefined;
            await this._extHostAuthentication.getSession(from, providerId, [], { forceNewSession: { detail } });
            this.$updateModelAccesslist([{ from: from.identifier, to: to.identifier, enabled: true }]);
            return true;
        }
        catch (err) {
            // ignore
            return false;
        }
    }
    _isUsingAuth(from, toMetadata) {
        // If the 'to' extension uses an auth check
        return !!toMetadata.auth
            // And we're asking from a different extension
            && !ExtensionIdentifier.equals(toMetadata.extension, from);
    }
    async _fakeAuthPopulate(metadata) {
        if (!metadata.auth) {
            return;
        }
        for (const from of this._languageAccessInformationExtensions) {
            try {
                await this._getAuthAccess(from, { identifier: metadata.extension, displayName: '' }, undefined, true);
            }
            catch (err) {
                this._logService.error('Fake Auth request failed');
                this._logService.error(err);
            }
        }
    }
    async _computeTokenLength(languageModelId, value, token) {
        const data = this._allLanguageModelData.get(languageModelId);
        if (!data) {
            throw extHostTypes.LanguageModelError.NotFound(`Language model '${languageModelId}' is unknown.`);
        }
        const local = Iterable.find(this._languageModels.values(), candidate => candidate.languageModelId === languageModelId);
        if (local) {
            // stay inside the EH
            return local.provider.provideTokenCount(value, token);
        }
        return this._proxy.$countTokens(languageModelId, (typeof value === 'string' ? value : typeConvert.LanguageModelChatMessage2.from(value)), token);
    }
    $updateModelAccesslist(data) {
        const updated = new Array();
        for (const { from, to, enabled } of data) {
            const set = this._modelAccessList.get(from) ?? new ExtensionIdentifierSet();
            const oldValue = set.has(to);
            if (oldValue !== enabled) {
                if (enabled) {
                    set.add(to);
                }
                else {
                    set.delete(to);
                }
                this._modelAccessList.set(from, set);
                const newItem = { from, to };
                updated.push(newItem);
                this._onDidChangeModelAccess.fire(newItem);
            }
        }
    }
    createLanguageModelAccessInformation(from) {
        this._languageAccessInformationExtensions.add(from);
        const that = this;
        const _onDidChangeAccess = Event.signal(Event.filter(this._onDidChangeModelAccess.event, e => ExtensionIdentifier.equals(e.from, from.identifier)));
        const _onDidAddRemove = Event.signal(this._onDidChangeProviders.event);
        return {
            get onDidChange() {
                return Event.any(_onDidChangeAccess, _onDidAddRemove);
            },
            canSendRequest(chat) {
                let metadata;
                out: for (const [_, value] of that._allLanguageModelData) {
                    for (const candidate of value.apiObjects.values()) {
                        if (candidate === chat) {
                            metadata = value.metadata;
                            break out;
                        }
                    }
                }
                if (!metadata) {
                    return undefined;
                }
                if (!that._isUsingAuth(from.identifier, metadata)) {
                    return true;
                }
                const list = that._modelAccessList.get(from.identifier);
                if (!list) {
                    return undefined;
                }
                return list.has(metadata.extension);
            }
        };
    }
    fileIsIgnored(extension, uri, token) {
        checkProposedApiEnabled(extension, 'chatParticipantAdditions');
        return this._proxy.$fileIsIgnored(uri, token);
    }
    async $isFileIgnored(handle, uri, token) {
        const provider = this._ignoredFileProviders.get(handle);
        if (!provider) {
            throw new Error('Unknown LanguageModelIgnoredFileProvider');
        }
        return (await provider.provideFileIgnored(URI.revive(uri), token)) ?? false;
    }
    registerIgnoredFileProvider(extension, provider) {
        checkProposedApiEnabled(extension, 'chatParticipantPrivate');
        const handle = ExtHostLanguageModels_1._idPool++;
        this._proxy.$registerFileIgnoreProvider(handle);
        this._ignoredFileProviders.set(handle, provider);
        return toDisposable(() => {
            this._proxy.$unregisterFileIgnoreProvider(handle);
            this._ignoredFileProviders.delete(handle);
        });
    }
};
ExtHostLanguageModels = ExtHostLanguageModels_1 = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService),
    __param(2, IExtHostAuthentication)
], ExtHostLanguageModels);
export { ExtHostLanguageModels };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlTW9kZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RMYW5ndWFnZU1vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFtQiw4QkFBOEIsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JKLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsc0JBQXNCLEVBQXlCLE1BQU0sbURBQW1ELENBQUM7QUFDL0osT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFekUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdkcsT0FBTyxFQUFFLHVCQUF1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