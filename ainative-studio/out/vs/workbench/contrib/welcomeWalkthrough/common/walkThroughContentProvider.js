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
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { Schemas } from '../../../../base/common/network.js';
import { Range } from '../../../../editor/common/core/range.js';
import { createTextBufferFactory } from '../../../../editor/common/model/textModel.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
class WalkThroughContentProviderRegistry {
    constructor() {
        this.providers = new Map();
    }
    registerProvider(moduleId, provider) {
        this.providers.set(moduleId, provider);
    }
    getProvider(moduleId) {
        return this.providers.get(moduleId);
    }
}
export const walkThroughContentRegistry = new WalkThroughContentProviderRegistry();
export async function moduleToContent(instantiationService, resource) {
    if (!resource.query) {
        throw new Error('Walkthrough: invalid resource');
    }
    const query = JSON.parse(resource.query);
    if (!query.moduleId) {
        throw new Error('Walkthrough: invalid resource');
    }
    const provider = walkThroughContentRegistry.getProvider(query.moduleId);
    if (!provider) {
        throw new Error(`Walkthrough: no provider registered for ${query.moduleId}`);
    }
    return instantiationService.invokeFunction(provider);
}
let WalkThroughSnippetContentProvider = class WalkThroughSnippetContentProvider {
    static { this.ID = 'workbench.contrib.walkThroughSnippetContentProvider'; }
    constructor(textModelResolverService, languageService, modelService, instantiationService) {
        this.textModelResolverService = textModelResolverService;
        this.languageService = languageService;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.loads = new Map();
        this.textModelResolverService.registerTextModelContentProvider(Schemas.walkThroughSnippet, this);
    }
    async textBufferFactoryFromResource(resource) {
        let ongoing = this.loads.get(resource.toString());
        if (!ongoing) {
            ongoing = moduleToContent(this.instantiationService, resource)
                .then(content => createTextBufferFactory(content))
                .finally(() => this.loads.delete(resource.toString()));
            this.loads.set(resource.toString(), ongoing);
        }
        return ongoing;
    }
    async provideTextContent(resource) {
        const factory = await this.textBufferFactoryFromResource(resource.with({ fragment: '' }));
        let codeEditorModel = this.modelService.getModel(resource);
        if (!codeEditorModel) {
            const j = parseInt(resource.fragment);
            let i = 0;
            const renderer = new marked.marked.Renderer();
            renderer.code = ({ text, lang }) => {
                i++;
                const languageId = typeof lang === 'string' ? this.languageService.getLanguageIdByLanguageName(lang) || '' : '';
                const languageSelection = this.languageService.createById(languageId);
                // Create all models for this resource in one go... we'll need them all and we don't want to re-parse markdown each time
                const model = this.modelService.createModel(text, languageSelection, resource.with({ fragment: `${i}.${lang}` }));
                if (i === j) {
                    codeEditorModel = model;
                }
                return '';
            };
            const textBuffer = factory.create(1 /* DefaultEndOfLine.LF */).textBuffer;
            const lineCount = textBuffer.getLineCount();
            const range = new Range(1, 1, lineCount, textBuffer.getLineLength(lineCount) + 1);
            const markdown = textBuffer.getValueInRange(range, 0 /* EndOfLinePreference.TextDefined */);
            marked.marked(markdown, { renderer });
        }
        return assertIsDefined(codeEditorModel);
    }
};
WalkThroughSnippetContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, IInstantiationService)
], WalkThroughSnippetContentProvider);
export { WalkThroughSnippetContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hDb250ZW50UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lV2Fsa3Rocm91Z2gvY29tbW9uL3dhbGtUaHJvdWdoQ29udGVudFByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBNkIsTUFBTSx1REFBdUQsQ0FBQztBQUNySCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFbkYsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFNckgsTUFBTSxrQ0FBa0M7SUFBeEM7UUFFa0IsY0FBUyxHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFDO0lBUzdFLENBQUM7SUFQQSxnQkFBZ0IsQ0FBQyxRQUFnQixFQUFFLFFBQXFDO1FBQ3ZFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWdCO1FBQzNCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMs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