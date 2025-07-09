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
import { USUAL_WORD_SEPARATORS } from '../../../common/core/wordHelper.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { DocumentHighlightKind } from '../../../common/languages.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
class TextualDocumentHighlightProvider {
    constructor() {
        this.selector = { language: '*' };
    }
    provideDocumentHighlights(model, position, token) {
        const result = [];
        const word = model.getWordAtPosition({
            lineNumber: position.lineNumber,
            column: position.column
        });
        if (!word) {
            return Promise.resolve(result);
        }
        if (model.isDisposed()) {
            return;
        }
        const matches = model.findMatches(word.word, true, false, true, USUAL_WORD_SEPARATORS, false);
        return matches.map(m => ({
            range: m.range,
            kind: DocumentHighlightKind.Text
        }));
    }
    provideMultiDocumentHighlights(primaryModel, position, otherModels, token) {
        const result = new ResourceMap();
        const word = primaryModel.getWordAtPosition({
            lineNumber: position.lineNumber,
            column: position.column
        });
        if (!word) {
            return Promise.resolve(result);
        }
        for (const model of [primaryModel, ...otherModels]) {
            if (model.isDisposed()) {
                continue;
            }
            const matches = model.findMatches(word.word, true, false, true, USUAL_WORD_SEPARATORS, false);
            const highlights = matches.map(m => ({
                range: m.range,
                kind: DocumentHighlightKind.Text
            }));
            if (highlights) {
                result.set(model.uri, highlights);
            }
        }
        return result;
    }
}
let TextualMultiDocumentHighlightFeature = class TextualMultiDocumentHighlightFeature extends Disposable {
    constructor(languageFeaturesService) {
        super();
        this._register(languageFeaturesService.documentHighlightProvider.register('*', new TextualDocumentHighlightProvider()));
        this._register(languageFeaturesService.multiDocumentHighlightProvider.register('*', new TextualDocumentHighlightProvider()));
    }
};
TextualMultiDocumentHighlightFeature = __decorate([
    __param(0, ILanguageFeaturesService)
], TextualMultiDocumentHighlightFeature);
export { TextualMultiDocumentHighlightFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVhbEhpZ2hsaWdodFByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3dvcmRIaWdobGlnaHRlci9icm93c2VyL3RleHR1YWxIaWdobGlnaHRQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQXFCLHFCQUFxQixFQUE2RSxNQUFNLDhCQUE4QixDQUFDO0FBSW5LLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFJN0QsTUFBTSxnQ0FBZ0M7SUFBdEM7UUFFQyxhQUFRLEdBQW1CLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBeUQ5QyxDQUFDO0lBdkRBLHlCQUF5QixDQUFDLEtBQWlCLEVBQUUsUUFBa0IsRUFBRSxLQUF3QjtRQUN4RixNQUFNLE1BQU0sR0FBd0IsRUFBRSxDQUFDO1FBRXZDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztZQUNwQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDL0IsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoQyxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5RixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3hCLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztZQUNkLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxJQUFJO1NBQ2hDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELDhCQUE4QixDQUFDLFlBQXdCLEVBQUUsUUFBa0IsRUFBRSxXQUF5QixFQUFFLEtBQXdCO1FBRS9ILE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxFQUF1QixDQUFDO1FBRXRELE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztZQUMzQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDL0IsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO1NBQ3ZCLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoQyxDQUFDO1FBR0QsS0FBSyxNQUFNLEtBQUssSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDcEQsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDeEIsU0FBUztZQUNWLENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUYsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3BDLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSztnQkFDZCxJQUFJLEVBQUUscUJBQXFCLENBQUMsSUFBSTthQUNoQyxDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNuQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUVEO0FBRU0sSUFBTSxvQ0FBb0MsR0FBMUMsTUFBTSxvQ0FBcUMsU0FBUSxVQUFVO0lBQ25FLFlBQzJCLHVCQUFpRDtRQUUzRSxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hILElBQUksQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsOEJBQThCLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlILENBQUM7Q0FDRCxDQUFBO0FBUlksb0NBQW9DO0lBRTlDLFdBQUEsd0JBQXdCLENBQUE7R0FGZCxvQ0FBb0MsQ0FRaEQifQ==