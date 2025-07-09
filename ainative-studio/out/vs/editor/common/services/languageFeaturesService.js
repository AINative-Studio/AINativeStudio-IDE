/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LanguageFeatureRegistry } from '../languageFeatureRegistry.js';
import { ILanguageFeaturesService } from './languageFeatures.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
export class LanguageFeaturesService {
    constructor() {
        this.referenceProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.renameProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.newSymbolNamesProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.codeActionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.definitionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.typeDefinitionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.declarationProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.implementationProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentSymbolProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlayHintsProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.colorProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.codeLensProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentFormattingEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentRangeFormattingEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.onTypeFormattingEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.signatureHelpProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.hoverProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentHighlightProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.multiDocumentHighlightProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.selectionRangeProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.foldingRangeProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.linkProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlineCompletionsProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlineEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.completionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.linkedEditingRangeProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlineValuesProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.evaluatableExpressionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentRangeSemanticTokensProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentSemanticTokensProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentDropEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentPasteEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
    }
    setNotebookTypeResolver(resolver) {
        this._notebookTypeResolver = resolver;
    }
    _score(uri) {
        return this._notebookTypeResolver?.(uri);
    }
}
registerSingleton(ILanguageFeaturesService, LanguageFeaturesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VGZWF0dXJlc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9sYW5ndWFnZUZlYXR1cmVzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQXNDLE1BQU0sK0JBQStCLENBQUM7QUFFNUcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTVHLE1BQU0sT0FBTyx1QkFBdUI7SUFBcEM7UUFJVSxzQkFBaUIsR0FBRyxJQUFJLHVCQUF1QixDQUFvQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNGLG1CQUFjLEdBQUcsSUFBSSx1QkFBdUIsQ0FBaUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyRiwyQkFBc0IsR0FBRyxJQUFJLHVCQUF1QixDQUF5QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JHLHVCQUFrQixHQUFHLElBQUksdUJBQXVCLENBQXFCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDN0YsdUJBQWtCLEdBQUcsSUFBSSx1QkFBdUIsQ0FBcUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3RiwyQkFBc0IsR0FBRyxJQUFJLHVCQUF1QixDQUF5QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENB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