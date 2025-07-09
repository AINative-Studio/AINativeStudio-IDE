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
var UntitledTextEditorService_1;
import { URI } from '../../../../base/common/uri.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { UntitledTextEditorModel } from './untitledTextEditorModel.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export const IUntitledTextEditorService = createDecorator('untitledTextEditorService');
let UntitledTextEditorService = class UntitledTextEditorService extends Disposable {
    static { UntitledTextEditorService_1 = this; }
    static { this.UNTITLED_WITHOUT_ASSOCIATED_RESOURCE_REGEX = /Untitled-\d+/; }
    constructor(instantiationService, configurationService) {
        super();
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeEncoding = this._register(new Emitter());
        this.onDidChangeEncoding = this._onDidChangeEncoding.event;
        this._onDidCreate = this._register(new Emitter());
        this.onDidCreate = this._onDidCreate.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._onDidChangeLabel = this._register(new Emitter());
        this.onDidChangeLabel = this._onDidChangeLabel.event;
        this.mapResourceToModel = new ResourceMap();
    }
    get(resource) {
        return this.mapResourceToModel.get(resource);
    }
    getValue(resource) {
        return this.get(resource)?.textEditorModel?.getValue();
    }
    async resolve(options) {
        const model = this.doCreateOrGet(options);
        await model.resolve();
        return model;
    }
    create(options) {
        return this.doCreateOrGet(options);
    }
    doCreateOrGet(options = Object.create(null)) {
        const massagedOptions = this.massageOptions(options);
        // Return existing instance if asked for it
        if (massagedOptions.untitledResource && this.mapResourceToModel.has(massagedOptions.untitledResource)) {
            return this.mapResourceToModel.get(massagedOptions.untitledResource);
        }
        // Create new instance otherwise
        return this.doCreate(massagedOptions);
    }
    massageOptions(options) {
        const massagedOptions = Object.create(null);
        // Figure out associated and untitled resource
        if (options.associatedResource) {
            massagedOptions.untitledResource = URI.from({
                scheme: Schemas.untitled,
                authority: options.associatedResource.authority,
                fragment: options.associatedResource.fragment,
                path: options.associatedResource.path,
                query: options.associatedResource.query
            });
            massagedOptions.associatedResource = options.associatedResource;
        }
        else {
            if (options.untitledResource?.scheme === Schemas.untitled) {
                massagedOptions.untitledResource = options.untitledResource;
            }
        }
        // Language id
        if (options.languageId) {
            massagedOptions.languageId = options.languageId;
        }
        else if (!massagedOptions.associatedResource) {
            const configuration = this.configurationService.getValue();
            if (configuration.files?.defaultLanguage) {
                massagedOptions.languageId = configuration.files.defaultLanguage;
            }
        }
        // Take over encoding and initial value
        massagedOptions.encoding = options.encoding;
        massagedOptions.initialValue = options.initialValue;
        return massagedOptions;
    }
    doCreate(options) {
        // Create a new untitled resource if none is provided
        let untitledResource = options.untitledResource;
        if (!untitledResource) {
            let counter = 1;
            do {
                untitledResource = URI.from({ scheme: Schemas.untitled, path: `Untitled-${counter}` });
                counter++;
            } while (this.mapResourceToModel.has(untitledResource));
        }
        // Create new model with provided options
        const model = this._register(this.instantiationService.createInstance(UntitledTextEditorModel, untitledResource, !!options.associatedResource, options.initialValue, options.languageId, options.encoding));
        this.registerModel(model);
        return model;
    }
    registerModel(model) {
        // Install model listeners
        const modelListeners = new DisposableStore();
        modelListeners.add(model.onDidChangeDirty(() => this._onDidChangeDirty.fire(model)));
        modelListeners.add(model.onDidChangeName(() => this._onDidChangeLabel.fire(model)));
        modelListeners.add(model.onDidChangeEncoding(() => this._onDidChangeEncoding.fire(model)));
        modelListeners.add(model.onWillDispose(() => this._onWillDispose.fire(model)));
        // Remove from cache on dispose
        Event.once(model.onWillDispose)(() => {
            // Registry
            this.mapResourceToModel.delete(model.resource);
            // Listeners
            modelListeners.dispose();
        });
        // Add to cache
        this.mapResourceToModel.set(model.resource, model);
        // Emit as event
        this._onDidCreate.fire(model);
        // If the model is dirty right from the beginning,
        // make sure to emit this as an event
        if (model.isDirty()) {
            this._onDidChangeDirty.fire(model);
        }
    }
    isUntitledWithAssociatedResource(resource) {
        return resource.scheme === Schemas.untitled && resource.path.length > 1 && !UntitledTextEditorService_1.UNTITLED_WITHOUT_ASSOCIATED_RESOURCE_REGEX.test(resource.path);
    }
    canDispose(model) {
        if (model.isDisposed()) {
            return true; // quick return if model already disposed
        }
        // promise based return in all other cases
        return this.doCanDispose(model);
    }
    async doCanDispose(model) {
        // dirty model: we do not allow to dispose dirty models to prevent
        // data loss cases. dirty models can only be disposed when they are
        // either saved or reverted
        if (model.isDirty()) {
            await Event.toPromise(model.onDidChangeDirty);
            return this.canDispose(model);
        }
        return true;
    }
    notifyDidSave(source, target) {
        this._onDidSave.fire({ source, target });
    }
};
UntitledTextEditorService = UntitledTextEditorService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService)
], UntitledTextEditorService);
export { UntitledTextEditorService };
registerSingleton(IUntitledTextEditorService, UntitledTextEditorService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdW50aXRsZWQvY29tbW9uL3VudGl0bGVkVGV4dEVkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEgsT0FBTyxFQUFFLHVCQUF1QixFQUE0QixNQUFNLDhCQUE4QixDQUFDO0FBRWpHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUUvRyxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQTZCLDJCQUEyQixDQUFDLENBQUM7QUFtSjVHLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsVUFBVTs7YUFJaEMsK0NBQTBDLEdBQUcsY0FBYyxBQUFqQixDQUFrQjtJQXNCcEYsWUFDd0Isb0JBQTRELEVBQzVELG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQztRQUhnQyx5QkFBb0IsR0FB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