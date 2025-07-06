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
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ChatContextKeys } from './chatContextKeys.js';
export var ChatMessageRole;
(function (ChatMessageRole) {
    ChatMessageRole[ChatMessageRole["System"] = 0] = "System";
    ChatMessageRole[ChatMessageRole["User"] = 1] = "User";
    ChatMessageRole[ChatMessageRole["Assistant"] = 2] = "Assistant";
})(ChatMessageRole || (ChatMessageRole = {}));
/**
 * Enum for supported image MIME types.
 */
export var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (ChatImageMimeType = {}));
/**
 * Specifies the detail level of the image.
 */
export var ImageDetailLevel;
(function (ImageDetailLevel) {
    ImageDetailLevel["Low"] = "low";
    ImageDetailLevel["High"] = "high";
})(ImageDetailLevel || (ImageDetailLevel = {}));
export const ILanguageModelsService = createDecorator('ILanguageModelsService');
const languageModelType = {
    type: 'object',
    properties: {
        vendor: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.vendor', "A globally unique vendor of language models.")
        }
    }
};
export const languageModelExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModels',
    jsonSchema: {
        description: localize('vscode.extension.contributes.languageModels', "Contribute language models of a specific vendor."),
        oneOf: [
            languageModelType,
            {
                type: 'array',
                items: languageModelType
            }
        ]
    },
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            result.push(`onLanguageModelChat:${contrib.vendor}`);
        }
    }
});
let LanguageModelsService = class LanguageModelsService {
    constructor(_extensionService, _logService, _contextKeyService) {
        this._extensionService = _extensionService;
        this._logService = _logService;
        this._contextKeyService = _contextKeyService;
        this._store = new DisposableStore();
        this._providers = new Map();
        this._vendors = new Set();
        this._onDidChangeProviders = this._store.add(new Emitter());
        this.onDidChangeLanguageModels = this._onDidChangeProviders.event;
        this._hasUserSelectableModels = ChatContextKeys.languageModelsAreUserSelectable.bindTo(this._contextKeyService);
        this._store.add(languageModelExtensionPoint.setHandler((extensions) => {
            this._vendors.clear();
            for (const extension of extensions) {
                if (!isProposedApiEnabled(extension.description, 'chatProvider')) {
                    extension.collector.error(localize('vscode.extension.contributes.languageModels.chatProviderRequired', "This contribution point requires the 'chatProvider' proposal."));
                    continue;
                }
                for (const item of Iterable.wrap(extension.value)) {
                    if (this._vendors.has(item.vendor)) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.vendorAlreadyRegistered', "The vendor '{0}' is already registered and cannot be registered twice", item.vendor));
                        continue;
                    }
                    if (isFalsyOrWhitespace(item.vendor)) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.emptyVendor', "The vendor field cannot be empty."));
                        continue;
                    }
                    if (item.vendor.trim() !== item.vendor) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.whitespaceVendor', "The vendor field cannot start or end with whitespace."));
                        continue;
                    }
                    this._vendors.add(item.vendor);
                }
            }
            const removed = [];
            for (const [identifier, value] of this._providers) {
                if (!this._vendors.has(value.metadata.vendor)) {
                    this._providers.delete(identifier);
                    removed.push(identifier);
                }
            }
            if (removed.length > 0) {
                this._onDidChangeProviders.fire({ removed });
            }
        }));
    }
    dispose() {
        this._store.dispose();
        this._providers.clear();
    }
    getLanguageModelIds() {
        return Array.from(this._providers.keys());
    }
    lookupLanguageModel(identifier) {
        return this._providers.get(identifier)?.metadata;
    }
    async selectLanguageModels(selector) {
        if (selector.vendor) {
            // selective activation
            await this._extensionService.activateByEvent(`onLanguageModelChat:${selector.vendor}}`);
        }
        else {
            // activate all extensions that do language models
            const all = Array.from(this._vendors).map(vendor => this._extensionService.activateByEvent(`onLanguageModelChat:${vendor}`));
            await Promise.all(all);
        }
        const result = [];
        for (const [identifier, model] of this._providers) {
            if ((selector.vendor === undefined || model.metadata.vendor === selector.vendor)
                && (selector.family === undefined || model.metadata.family === selector.family)
                && (selector.version === undefined || model.metadata.version === selector.version)
                && (selector.id === undefined || model.metadata.id === selector.id)
                && (!model.metadata.targetExtensions || model.metadata.targetExtensions.some(candidate => ExtensionIdentifier.equals(candidate, selector.extension)))) {
                result.push(identifier);
            }
        }
        this._logService.trace('[LM] selected language models', selector, result);
        return result;
    }
    registerLanguageModelChat(identifier, provider) {
        this._logService.trace('[LM] registering language model chat', identifier, provider.metadata);
        if (!this._vendors.has(provider.metadata.vendor)) {
            throw new Error(`Chat response provider uses UNKNOWN vendor ${provider.metadata.vendor}.`);
        }
        if (this._providers.has(identifier)) {
            throw new Error(`Chat response provider with identifier ${identifier} is already registered.`);
        }
        this._providers.set(identifier, provider);
        this._onDidChangeProviders.fire({ added: [{ identifier, metadata: provider.metadata }] });
        this.updateUserSelectableModelsContext();
        return toDisposable(() => {
            this.updateUserSelectableModelsContext();
            if (this._providers.delete(identifier)) {
                this._onDidChangeProviders.fire({ removed: [identifier] });
                this._logService.trace('[LM] UNregistered language model chat', identifier, provider.metadata);
            }
        });
    }
    updateUserSelectableModelsContext() {
        // This context key to enable the picker is set when there is a default model, and there is at least one other model that is user selectable
        const hasUserSelectableModels = Array.from(this._providers.values()).some(p => p.metadata.isUserSelectable && !p.metadata.isDefault);
        const hasDefaultModel = Array.from(this._providers.values()).some(p => p.metadata.isDefault);
        this._hasUserSelectableModels.set(hasUserSelectableModels && hasDefaultModel);
    }
    async sendChatRequest(identifier, from, messages, options, token) {
        const provider = this._providers.get(identifier);
        if (!provider) {
            throw new Error(`Chat response provider with identifier ${identifier} is not registered.`);
        }
        return provider.sendChatRequest(messages, from, options, token);
    }
    computeTokenLength(identifier, message, token) {
        const provider = this._providers.get(identifier);
        if (!provider) {
            throw new Error(`Chat response provider with identifier ${identifier} is not registered.`);
        }
        return provider.provideTokenCount(message, token);
    }
};
LanguageModelsService = __decorate([
    __param(0, IExtensionService),
    __param(1, ILogService),
    __param(2, IContextKeyService)
], LanguageModelsService);
export { LanguageModelsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9sYW5ndWFnZU1vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRXZELE1BQU0sQ0FBTixJQUFrQixlQUlqQjtBQUpELFdBQWtCLGVBQWU7SUFDaEMseURBQU0sQ0FBQTtJQUNOLHFEQUFJLENBQUE7SUFDSiwrREFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUppQixlQUFlLEtBQWYsZUFB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