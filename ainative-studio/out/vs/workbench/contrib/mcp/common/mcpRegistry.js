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
import { StringSHA1 } from '../../../../base/common/hash.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, observableValue } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { McpRegistryInputStorage } from './mcpRegistryInputStorage.js';
import { McpServerConnection } from './mcpServerConnection.js';
const createTrustMemento = observableMemento({
    defaultValue: {},
    key: 'mcp.trustedCollections'
});
const collectionPrefixLen = 3;
let McpRegistry = class McpRegistry extends Disposable {
    get delegates() {
        return this._delegates;
    }
    constructor(_instantiationService, _configurationResolverService, _dialogService, _storageService, _productService, _notificationService, _editorService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationResolverService = _configurationResolverService;
        this._dialogService = _dialogService;
        this._storageService = _storageService;
        this._productService = _productService;
        this._notificationService = _notificationService;
        this._editorService = _editorService;
        this._trustPrompts = new Map();
        this._collections = observableValue('collections', []);
        this._delegates = [];
        this.collections = this._collections;
        this._collectionToPrefixes = this._collections.map(c => {
            const hashes = c.map((collection) => {
                const sha = new StringSHA1();
                sha.update(collection.id);
                return { view: 0, hash: sha.digest(), collection };
            });
            const view = (h) => h.hash.slice(h.view, h.view + collectionPrefixLen);
            let collided = false;
            do {
                hashes.sort((a, b) => view(a).localeCompare(view(b)) || a.collection.id.localeCompare(b.collection.id));
                collided = false;
                for (let i = 1; i < hashes.length; i++) {
                    const prev = hashes[i - 1];
                    const curr = hashes[i];
                    if (view(prev) === view(curr) && curr.view + collectionPrefixLen < curr.hash.length) {
                        curr.view++;
                        collided = true;
                    }
                }
            } while (collided);
            return Object.fromEntries(hashes.map(h => [h.collection.id, view(h) + '.']));
        });
        this._workspaceStorage = new Lazy(() => this._register(this._instantiationService.createInstance(McpRegistryInputStorage, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */)));
        this._profileStorage = new Lazy(() => this._register(this._instantiationService.createInstance(McpRegistryInputStorage, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)));
        this._trustMemento = new Lazy(() => this._register(createTrustMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */, this._storageService)));
        this._lazyCollectionsToUpdate = new Set();
        this._ongoingLazyActivations = observableValue(this, 0);
        this.lazyCollectionState = derived(reader => {
            if (this._ongoingLazyActivations.read(reader) > 0) {
                return 1 /* LazyCollectionState.LoadingUnknown */;
            }
            const collections = this._collections.read(reader);
            return collections.some(c => c.lazy && c.lazy.isCached === false) ? 0 /* LazyCollectionState.HasUnknown */ : 2 /* LazyCollectionState.AllKnown */;
        });
        this._onDidChangeInputs = this._register(new Emitter());
        this.onDidChangeInputs = this._onDidChangeInputs.event;
    }
    registerDelegate(delegate) {
        this._delegates.push(delegate);
        this._delegates.sort((a, b) => b.priority - a.priority);
        return {
            dispose: () => {
                const index = this._delegates.indexOf(delegate);
                if (index !== -1) {
                    this._delegates.splice(index, 1);
                }
            }
        };
    }
    registerCollection(collection) {
        const currentCollections = this._collections.get();
        const toReplace = currentCollections.find(c => c.lazy && c.id === collection.id);
        // Incoming collections replace the "lazy" versions. See `ExtensionMcpDiscovery` for an example.
        if (toReplace) {
            this._lazyCollectionsToUpdate.add(collection.id);
            this._collections.set(currentCollections.map(c => c === toReplace ? collection : c), undefined);
        }
        else {
            this._collections.set([...currentCollections, collection], undefined);
        }
        return {
            dispose: () => {
                const currentCollections = this._collections.get();
                this._collections.set(currentCollections.filter(c => c !== collection), undefined);
            }
        };
    }
    collectionToolPrefix(collection) {
        return this._collectionToPrefixes.map(p => p[collection.id] ?? '');
    }
    async discoverCollections() {
        const toDiscover = this._collections.get().filter(c => c.lazy && !c.lazy.isCached);
        this._ongoingLazyActivations.set(this._ongoingLazyActivations.get() + 1, undefined);
        await Promise.all(toDiscover.map(c => c.lazy?.load())).finally(() => {
            this._ongoingLazyActivations.set(this._ongoingLazyActivations.get() - 1, undefined);
        });
        const found = [];
        const current = this._collections.get();
        for (const collection of toDiscover) {
            const rec = current.find(c => c.id === collection.id);
            if (!rec) {
                // ignored
            }
            else if (rec.lazy) {
                rec.lazy.removed?.(); // did not get replaced by the non-lazy version
            }
            else {
                found.push(rec);
            }
        }
        return found;
    }
    _getInputStorage(scope) {
        return scope === 1 /* StorageScope.WORKSPACE */ ? this._workspaceStorage.value : this._profileStorage.value;
    }
    _getInputStorageInConfigTarget(configTarget) {
        return this._getInputStorage(configTarget === 5 /* ConfigurationTarget.WORKSPACE */ || configTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */
            ? 1 /* StorageScope.WORKSPACE */
            : 0 /* StorageScope.PROFILE */);
    }
    async clearSavedInputs(scope, inputId) {
        const storage = this._getInputStorage(scope);
        if (inputId) {
            await storage.clear(inputId);
        }
        else {
            storage.clearAll();
        }
        this._onDidChangeInputs.fire();
    }
    async editSavedInput(inputId, folderData, configSection, target) {
        const storage = this._getInputStorageInConfigTarget(target);
        const expr = ConfigurationResolverExpression.parse(inputId);
        const stored = await storage.getMap();
        const previous = stored[inputId].value;
        await this._configurationResolverService.resolveWithInteraction(folderData, expr, configSection, previous ? { [inputId.slice(2, -1)]: previous } : {}, target);
        await this._updateStorageWithExpressionInputs(storage, expr);
    }
    getSavedInputs(scope) {
        return this._getInputStorage(scope).getMap();
    }
    resetTrust() {
        this._trustMemento.value.set({}, undefined);
    }
    getTrust(collectionRef) {
        return derived(reader => {
            const collection = this._collections.read(reader).find(c => c.id === collectionRef.id);
            if (!collection || collection.isTrustedByDefault) {
                return true;
            }
            const memento = this._trustMemento.value.read(reader);
            return memento.hasOwnProperty(collection.id) ? memento[collection.id] : undefined;
        });
    }
    _promptForTrust(collection) {
        // Collect all trust prompts for a single config so that concurrently trying to start N
        // servers in a config don't result in N different dialogs
        let resultPromise = this._trustPrompts.get(collection.id);
        resultPromise ??= this._promptForTrustOpenDialog(collection).finally(() => {
            this._trustPrompts.delete(collection.id);
        });
        this._trustPrompts.set(collection.id, resultPromise);
        return resultPromise;
    }
    async _promptForTrustOpenDialog(collection) {
        const originURI = collection.presentation?.origin;
        const labelWithOrigin = originURI ? `[\`${basename(originURI)}\`](${originURI})` : collection.label;
        const result = await this._dialogService.prompt({
            message: localize('trustTitleWithOrigin', 'Trust MCP servers from {0}?', collection.label),
            custom: {
                markdownDetails: [{
                        markdown: new MarkdownString(localize('mcp.trust.details', '{0} discovered Model Context Protocol servers from {1} (`{2}`). {0} can use their capabilities in Chat.\n\nDo you want to allow running MCP servers from {3}?', this._productService.nameShort, collection.label, collection.serverDefinitions.get().map(s => s.label).join('`, `'), labelWithOrigin)),
                        dismissOnLinkClick: true,
                    }]
            },
            buttons: [
                { label: localize('mcp.trust.yes', 'Trust'), run: () => true },
                { label: localize('mcp.trust.no', 'Do not trust'), run: () => false }
            ],
        });
        return result.result;
    }
    async _updateStorageWithExpressionInputs(inputStorage, expr) {
        const secrets = {};
        const inputs = {};
        for (const [replacement, resolved] of expr.resolved()) {
            if (resolved.input?.type === 'promptString' && resolved.input.password) {
                secrets[replacement.id] = resolved;
            }
            else {
                inputs[replacement.id] = resolved;
            }
        }
        inputStorage.setPlainText(inputs);
        await inputStorage.setSecrets(secrets);
        this._onDidChangeInputs.fire();
    }
    async _replaceVariablesInLaunch(definition, launch) {
        if (!definition.variableReplacement) {
            return launch;
        }
        const { section, target, folder } = definition.variableReplacement;
        const inputStorage = this._getInputStorageInConfigTarget(target);
        const previouslyStored = await inputStorage.getMap();
        // pre-fill the variables we already resolved to avoid extra prompting
        const expr = ConfigurationResolverExpression.parse(launch);
        for (const replacement of expr.unresolved()) {
            if (previouslyStored.hasOwnProperty(replacement.id)) {
                expr.resolve(replacement, previouslyStored[replacement.id]);
            }
        }
        // resolve variables requiring user input
        await this._configurationResolverService.resolveWithInteraction(folder, expr, section, undefined, target);
        await this._updateStorageWithExpressionInputs(inputStorage, expr);
        // resolve other non-interactive variables, returning the final object
        return await this._configurationResolverService.resolveAsync(folder, expr);
    }
    async resolveConnection({ collectionRef, definitionRef, forceTrust, logger }) {
        const collection = this._collections.get().find(c => c.id === collectionRef.id);
        const definition = collection?.serverDefinitions.get().find(s => s.id === definitionRef.id);
        if (!collection || !definition) {
            throw new Error(`Collection or definition not found for ${collectionRef.id} and ${definitionRef.id}`);
        }
        const delegate = this._delegates.find(d => d.canStart(collection, definition));
        if (!delegate) {
            throw new Error('No delegate found that can handle the connection');
        }
        if (!collection.isTrustedByDefault) {
            const memento = this._trustMemento.value.get();
            const trusted = memento.hasOwnProperty(collection.id) ? memento[collection.id] : undefined;
            if (trusted) {
                // continue
            }
            else if (trusted === undefined || forceTrust) {
                const trustValue = await this._promptForTrust(collection);
                if (trustValue !== undefined) {
                    this._trustMemento.value.set({ ...memento, [collection.id]: trustValue }, undefined);
                }
                if (!trustValue) {
                    return;
                }
            }
            else /** trusted === false && !forceTrust */ {
                return undefined;
            }
        }
        let launch;
        try {
            launch = await this._replaceVariablesInLaunch(definition, definition.launch);
        }
        catch (e) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize('mcp.launchError', 'Error starting {0}: {1}', definition.label, String(e)),
                actions: {
                    primary: collection.presentation?.origin && [
                        {
                            id: 'mcp.launchError.openConfig',
                            class: undefined,
                            enabled: true,
                            tooltip: '',
                            label: localize('mcp.launchError.openConfig', 'Open Configuration'),
                            run: () => this._editorService.openEditor({
                                resource: collection.presentation.origin,
                                options: { selection: definition.presentation?.origin?.range }
                            }),
                        }
                    ]
                }
            });
            return;
        }
        return this._instantiationService.createInstance(McpServerConnection, collection, definition, delegate, launch, logger);
    }
};
McpRegistry = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationResolverService),
    __param(2, IDialogService),
    __param(3, IStorageService),
    __param(4, IProductService),
    __param(5, INotificationService),
    __param(6, IEditorService)
], McpRegistry);
export { McpRegistry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FB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