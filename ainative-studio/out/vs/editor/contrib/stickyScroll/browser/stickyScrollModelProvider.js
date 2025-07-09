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
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { OutlineElement, OutlineGroup, OutlineModel } from '../../documentSymbols/browser/outlineModel.js';
import { createCancelablePromise, Delayer } from '../../../../base/common/async.js';
import { FoldingController, RangesLimitReporter } from '../../folding/browser/folding.js';
import { SyntaxRangeProvider } from '../../folding/browser/syntaxRangeProvider.js';
import { IndentRangeProvider } from '../../folding/browser/indentRangeProvider.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { StickyElement, StickyModel, StickyRange } from './stickyScrollElement.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
var ModelProvider;
(function (ModelProvider) {
    ModelProvider["OUTLINE_MODEL"] = "outlineModel";
    ModelProvider["FOLDING_PROVIDER_MODEL"] = "foldingProviderModel";
    ModelProvider["INDENTATION_MODEL"] = "indentationModel";
})(ModelProvider || (ModelProvider = {}));
var Status;
(function (Status) {
    Status[Status["VALID"] = 0] = "VALID";
    Status[Status["INVALID"] = 1] = "INVALID";
    Status[Status["CANCELED"] = 2] = "CANCELED";
})(Status || (Status = {}));
let StickyModelProvider = class StickyModelProvider extends Disposable {
    constructor(_editor, onProviderUpdate, _languageConfigurationService, _languageFeaturesService) {
        super();
        this._editor = _editor;
        this._modelProviders = [];
        this._modelPromise = null;
        this._updateScheduler = this._register(new Delayer(300));
        this._updateOperation = this._register(new DisposableStore());
        switch (this._editor.getOption(120 /* EditorOption.stickyScroll */).defaultModel) {
            case ModelProvider.OUTLINE_MODEL:
                this._modelProviders.push(new StickyModelFromCandidateOutlineProvider(this._editor, _languageFeaturesService));
            // fall through
            case ModelProvider.FOLDING_PROVIDER_MODEL:
                this._modelProviders.push(new StickyModelFromCandidateSyntaxFoldingProvider(this._editor, onProviderUpdate, _languageFeaturesService));
            // fall through
            case ModelProvider.INDENTATION_MODEL:
                this._modelProviders.push(new StickyModelFromCandidateIndentationFoldingProvider(this._editor, _languageConfigurationService));
                break;
        }
    }
    dispose() {
        this._modelProviders.forEach(provider => provider.dispose());
        this._updateOperation.clear();
        this._cancelModelPromise();
        super.dispose();
    }
    _cancelModelPromise() {
        if (this._modelPromise) {
            this._modelPromise.cancel();
            this._modelPromise = null;
        }
    }
    async update(token) {
        this._updateOperation.clear();
        this._updateOperation.add({
            dispose: () => {
                this._cancelModelPromise();
                this._updateScheduler.cancel();
            }
        });
        this._cancelModelPromise();
        return await this._updateScheduler.trigger(async () => {
            for (const modelProvider of this._modelProviders) {
                const { statusPromise, modelPromise } = modelProvider.computeStickyModel(token);
                this._modelPromise = modelPromise;
                const status = await statusPromise;
                if (this._modelPromise !== modelPromise) {
                    return null;
                }
                switch (status) {
                    case Status.CANCELED:
                        this._updateOperation.clear();
                        return null;
                    case Status.VALID:
                        return modelProvider.stickyModel;
                }
            }
            return null;
        }).catch((error) => {
            onUnexpectedError(error);
            return null;
        });
    }
};
StickyModelProvider = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILanguageFeaturesService)
], StickyModelProvider);
export { StickyModelProvider };
class StickyModelCandidateProvider extends Disposable {
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._stickyModel = null;
    }
    get stickyModel() {
        return this._stickyModel;
    }
    _invalid() {
        this._stickyModel = null;
        return Status.INVALID;
    }
    computeStickyModel(token) {
        if (token.isCancellationRequested || !this.isProviderValid()) {
            return { statusPromise: this._invalid(), modelPromise: null };
        }
        const providerModelPromise = createCancelablePromise(token => this.createModelFromProvider(token));
        return {
            statusPromise: providerModelPromise.then(providerModel => {
                if (!this.isModelValid(providerModel)) {
                    return this._invalid();
                }
                if (token.isCancellationRequested) {
                    return Status.CANCELED;
                }
                this._stickyModel = this.createStickyModel(token, providerModel);
                return Status.VALID;
            }).then(undefined, (err) => {
                onUnexpectedError(err);
                return Status.CANCELED;
            }),
            modelPromise: providerModelPromise
        };
    }
    /**
     * Method which checks whether the model returned by the provider is valid and can be used to compute a sticky model.
     * This method by default returns true.
     * @param model model returned by the provider
     * @returns boolean indicating whether the model is valid
     */
    isModelValid(model) {
        return true;
    }
    /**
     * Method which checks whether the provider is valid before applying it to find the provider model.
     * This method by default returns true.
     * @returns boolean indicating whether the provider is valid
     */
    isProviderValid() {
        return true;
    }
}
let StickyModelFromCandidateOutlineProvider = class StickyModelFromCandidateOutlineProvider extends StickyModelCandidateProvider {
    constructor(_editor, _languageFeaturesService) {
        super(_editor);
        this._languageFeaturesService = _languageFeaturesService;
    }
    createModelFromProvider(token) {
        return OutlineModel.create(this._languageFeaturesService.documentSymbolProvider, this._editor.getModel(), token);
    }
    createStickyModel(token, model) {
        const { stickyOutlineElement, providerID } = this._stickyModelFromOutlineModel(model, this._stickyModel?.outlineProviderId);
        const textModel = this._editor.getModel();
        return new StickyModel(textModel.uri, textModel.getVersionId(), stickyOutlineElement, providerID);
    }
    isModelValid(model) {
        return model && model.children.size > 0;
    }
    _stickyModelFromOutlineModel(outlineModel, preferredProvider) {
        let outlineElements;
        // When several possible outline providers
        if (Iterable.first(outlineModel.children.values()) instanceof OutlineGroup) {
            const provider = Iterable.find(outlineModel.children.values(), outlineGroupOfModel => outlineGroupOfModel.id === preferredProvider);
            if (provider) {
                outlineElements = provider.children;
            }
            else {
                let tempID = '';
                let maxTotalSumOfRanges = -1;
                let optimalOutlineGroup = undefined;
                for (const [_key, outlineGroup] of outlineModel.children.entries()) {
                    const totalSumRanges = this._findSumOfRangesOfGroup(outlineGroup);
                    if (totalSumRanges > maxTotalSumOfRanges) {
                        optimalOutlineGroup = outlineGroup;
                        maxTotalSumOfRanges = totalSumRanges;
                        tempID = outlineGroup.id;
                    }
                }
                preferredProvider = tempID;
                outlineElements = optimalOutlineGroup.children;
            }
        }
        else {
            outlineElements = outlineModel.children;
        }
        const stickyChildren = [];
        const outlineElementsArray = Array.from(outlineElements.values()).sort((element1, element2) => {
            const range1 = new StickyRange(element1.symbol.range.startLineNumber, element1.symbol.range.endLineNumber);
            const range2 = new StickyRange(element2.symbol.range.startLineNumber, element2.symbol.range.endLineNumber);
            return this._comparator(range1, range2);
        });
        for (const outlineElement of outlineElementsArray) {
            stickyChildren.push(this._stickyModelFromOutlineElement(outlineElement, outlineElement.symbol.selectionRange.startLineNumber));
        }
        const stickyOutlineElement = new StickyElement(undefined, stickyChildren, undefined);
        return {
            stickyOutlineElement: stickyOutlineElement,
            providerID: preferredProvider
        };
    }
    _stickyModelFromOutlineElement(outlineElement, previousStartLine) {
        const children = [];
        for (const child of outlineElement.children.values()) {
            if (child.symbol.selectionRange.startLineNumber !== child.symbol.range.endLineNumber) {
                if (child.symbol.selectionRange.startLineNumber !== previousStartLine) {
                    children.push(this._stickyModelFromOutlineElement(child, child.symbol.selectionRange.startLineNumber));
                }
                else {
                    for (const subchild of child.children.values()) {
                        children.push(this._stickyModelFromOutlineElement(subchild, child.symbol.selectionRange.startLineNumber));
                    }
                }
            }
        }
        children.sort((child1, child2) => this._comparator(child1.range, child2.range));
        const range = new StickyRange(outlineElement.symbol.selectionRange.startLineNumber, outlineElement.symbol.range.endLineNumber);
        return new StickyElement(range, children, undefined);
    }
    _comparator(range1, range2) {
        if (range1.startLineNumber !== range2.startLineNumber) {
            return range1.startLineNumber - range2.startLineNumber;
        }
        else {
            return range2.endLineNumber - range1.endLineNumber;
        }
    }
    _findSumOfRangesOfGroup(outline) {
        let res = 0;
        for (const child of outline.children.values()) {
            res += this._findSumOfRangesOfGroup(child);
        }
        if (outline instanceof OutlineElement) {
            return res + outline.symbol.range.endLineNumber - outline.symbol.selectionRange.startLineNumber;
        }
        else {
            return res;
        }
    }
};
StickyModelFromCandidateOutlineProvider = __decorate([
    __param(1, ILanguageFeaturesService)
], StickyModelFromCandidateOutlineProvider);
class StickyModelFromCandidateFoldingProvider extends StickyModelCandidateProvider {
    constructor(editor) {
        super(editor);
        this._foldingLimitReporter = new RangesLimitReporter(editor);
    }
    createStickyModel(token, model) {
        const foldingElement = this._fromFoldingRegions(model);
        const textModel = this._editor.getModel();
        return new StickyModel(textModel.uri, textModel.getVersionId(), foldingElement, undefined);
    }
    isModelValid(model) {
        return model !== null;
    }
    _fromFoldingRegions(foldingRegions) {
        const length = foldingRegions.length;
        const orderedStickyElements = [];
        // The root sticky outline element
        const stickyOutlineElement = new StickyElement(undefined, [], undefined);
        for (let i = 0; i < length; i++) {
            // Finding the parent index of the current range
            const parentIndex = foldingRegions.getParentIndex(i);
            let parentNode;
            if (parentIndex !== -1) {
                // Access the reference of the parent node
                parentNode = orderedStickyElements[parentIndex];
            }
            else {
                // In that case the parent node is the root node
                parentNode = stickyOutlineElement;
            }
            const child = new StickyElement(new StickyRange(foldingRegions.getStartLineNumber(i), foldingRegions.getEndLineNumber(i) + 1), [], parentNode);
            parentNode.children.push(child);
            orderedStickyElements.push(child);
        }
        return stickyOutlineElement;
    }
}
let StickyModelFromCandidateIndentationFoldingProvider = class StickyModelFromCandidateIndentationFoldingProvider extends StickyModelFromCandidateFoldingProvider {
    constructor(editor, _languageConfigurationService) {
        super(editor);
        this._languageConfigurationService = _languageConfigurationService;
        this.provider = this._register(new IndentRangeProvider(editor.getModel(), this._languageConfigurationService, this._foldingLimitReporter));
    }
    async createModelFromProvider(token) {
        return this.provider.compute(token);
    }
};
StickyModelFromCandidateIndentationFoldingProvider = __decorate([
    __param(1, ILanguageConfigurationService)
], StickyModelFromCandidateIndentationFoldingProvider);
let StickyModelFromCandidateSyntaxFoldingProvider = class StickyModelFromCandidateSyntaxFoldingProvider extends StickyModelFromCandidateFoldingProvider {
    constructor(editor, onProviderUpdate, _languageFeaturesService) {
        super(editor);
        this._languageFeaturesService = _languageFeaturesService;
        const selectedProviders = FoldingController.getFoldingRangeProviders(this._languageFeaturesService, editor.getModel());
        if (selectedProviders.length > 0) {
            this.provider = this._register(new SyntaxRangeProvider(editor.getModel(), selectedProviders, onProviderUpdate, this._foldingLimitReporter, undefined));
        }
    }
    isProviderValid() {
        return this.provider !== undefined;
    }
    async createModelFromProvider(token) {
        return this.provider?.compute(token) ?? null;
    }
};
StickyModelFromCandidateSyntaxFoldingProvider = __decorate([
    __param(2, ILanguageFeaturesService)
], StickyModelFromCandidateSyntaxFoldingProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsTW9kZWxQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdGlja3lTY3JvbGwvYnJvd3Nlci9zdGlja3lTY3JvbGxNb2RlbFByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFM0csT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUUzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHbkcsSUFBSyxhQUlKO0FBSkQsV0FBSyxhQUFhO0lBQ2pC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