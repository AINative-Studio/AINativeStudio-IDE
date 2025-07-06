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
import { AsyncReferenceCollection, ReferenceCollection } from '../../../../../../base/common/lifecycle.js';
import { INotebookService } from '../../../common/notebookService.js';
import { bufferToStream, VSBuffer } from '../../../../../../base/common/buffer.js';
import { createDecorator, IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
export const INotebookOriginalModelReferenceFactory = createDecorator('INotebookOriginalModelReferenceFactory');
let OriginalNotebookModelReferenceCollection = class OriginalNotebookModelReferenceCollection extends ReferenceCollection {
    constructor(notebookService, modelService) {
        super();
        this.notebookService = notebookService;
        this.modelService = modelService;
        this.modelsToDispose = new Set();
    }
    async createReferencedObject(key, fileEntry, viewType) {
        this.modelsToDispose.delete(key);
        const uri = fileEntry.originalURI;
        const model = this.notebookService.getNotebookTextModel(uri);
        if (model) {
            return model;
        }
        const modelRef = await this.modelService.createModelReference(uri);
        const bytes = VSBuffer.fromString(modelRef.object.textEditorModel.getValue());
        const stream = bufferToStream(bytes);
        modelRef.dispose();
        return this.notebookService.createNotebookTextModel(viewType, uri, stream);
    }
    destroyReferencedObject(key, modelPromise) {
        this.modelsToDispose.add(key);
        (async () => {
            try {
                const model = await modelPromise;
                if (!this.modelsToDispose.has(key)) {
                    // return if model has been acquired again meanwhile
                    return;
                }
                // Finally we can dispose the model
                model.dispose();
            }
            catch (error) {
                // ignore
            }
            finally {
                this.modelsToDispose.delete(key); // Untrack as being disposed
            }
        })();
    }
};
OriginalNotebookModelReferenceCollection = __decorate([
    __param(0, INotebookService),
    __param(1, ITextModelService)
], OriginalNotebookModelReferenceCollection);
export { OriginalNotebookModelReferenceCollection };
let NotebookOriginalModelReferenceFactory = class NotebookOriginalModelReferenceFactory {
    get resourceModelCollection() {
        if (!this._resourceModelCollection) {
            this._resourceModelCollection = this.instantiationService.createInstance(OriginalNotebookModelReferenceCollection);
        }
        return this._resourceModelCollection;
    }
    get asyncModelCollection() {
        if (!this._asyncModelCollection) {
            this._asyncModelCollection = new AsyncReferenceCollection(this.resourceModelCollection);
        }
        return this._asyncModelCollection;
    }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this._resourceModelCollection = undefined;
        this._asyncModelCollection = undefined;
    }
    getOrCreate(fileEntry, viewType) {
        return this.asyncModelCollection.acquire(fileEntry.originalURI.toString(), fileEntry, viewType);
    }
};
NotebookOriginalModelReferenceFactory = __decorate([
    __param(0, IInstantiationService)
], NotebookOriginalModelReferenceFactory);
export { NotebookOriginalModelReferenceFactory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPcmlnaW5hbE1vZGVsUmVmRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2lubGluZURpZmYvbm90ZWJvb2tPcmlnaW5hbE1vZGVsUmVmRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQWMsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV2SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUMxSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUdoRyxNQUFNLENBQUMsTUFBTSxzQ0FBc0MsR0FBRyxlQUFlLENBQXlDLHdDQUF3QyxDQUFDLENBQUM7QUFRakosSUFBTSx3Q0FBd0MsR0FBOUMsTUFBTSx3Q0FBeUMsU0FBUSxtQkFBK0M7SUFFNUcsWUFBOEIsZUFBa0QsRUFDNUQsWUFBZ0Q7UUFFbkUsS0FBSyxFQUFFLENBQUM7UUFIc0Msb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQzNDLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtRQUZuRCxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFLckQsQ0FBQztJQUVrQixLQUFLLENBQUMsc0JBQXNCLENBQUMsR0FBVyxFQUFFLFNBQTZCLEVBQUUsUUFBZ0I7UUFDM0csSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMs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