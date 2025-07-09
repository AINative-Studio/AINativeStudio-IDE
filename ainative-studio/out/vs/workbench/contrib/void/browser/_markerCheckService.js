/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import * as dom from '../../../../base/browser/dom.js';
export const IMarkerCheckService = createDecorator('markerCheckService');
let MarkerCheckService = class MarkerCheckService extends Disposable {
    constructor(_markerService, _languageFeaturesService, _textModelService) {
        super();
        this._markerService = _markerService;
        this._languageFeaturesService = _languageFeaturesService;
        this._textModelService = _textModelService;
        const check = async () => {
            const allMarkers = this._markerService.read();
            const errors = allMarkers.filter(marker => marker.severity === MarkerSeverity.Error);
            if (errors.length > 0) {
                for (const error of errors) {
                    console.log(`----------------------------------------------`);
                    console.log(`${error.resource.fsPath}: ${error.startLineNumber} ${error.message} ${error.severity}`); // ! all errors in the file
                    try {
                        // Get the text model for the file
                        const modelReference = await this._textModelService.createModelReference(error.resource);
                        const model = modelReference.object.textEditorModel;
                        // Create a range from the marker
                        const range = new Range(error.startLineNumber, error.startColumn, error.endLineNumber, error.endColumn);
                        // Get code action providers for this model
                        const codeActionProvider = this._languageFeaturesService.codeActionProvider;
                        const providers = codeActionProvider.ordered(model);
                        if (providers.length > 0) {
                            // Request code actions from each provider
                            for (const provider of providers) {
                                const context = {
                                    trigger: 1 /* CodeActionTriggerType.Invoke */, // keeping 'trigger' since it works
                                    only: 'quickfix' // adding this to filter for quick fixes
                                };
                                const actions = await provider.provideCodeActions(model, range, context, CancellationToken.None);
                                if (actions?.actions?.length) {
                                    const quickFixes = actions.actions.filter(action => action.isPreferred); // ! all quickFixes for the error
                                    // const quickFixesForImports = actions.actions.filter(action => action.isPreferred && action.title.includes('import'));  // ! all possible imports
                                    // quickFixesForImports
                                    if (quickFixes.length > 0) {
                                        console.log('Available Quick Fixes:');
                                        quickFixes.forEach(action => {
                                            console.log(`- ${action.title}`);
                                        });
                                    }
                                }
                            }
                        }
                        // Dispose the model reference
                        modelReference.dispose();
                    }
                    catch (e) {
                        console.error('Error getting quick fixes:', e);
                    }
                }
            }
        };
        const { window } = dom.getActiveWindow();
        window.setInterval(check, 5000);
    }
    fixErrorsInFiles(uris, contextSoFar) {
        // const allMarkers = this._markerService.read();
        // check errors in files
        // give LLM errors in files
    }
};
MarkerCheckService = __decorate([
    __param(0, IMarkerService),
    __param(1, ILanguageFeaturesService),
    __param(2, ITextModelService)
], MarkerCheckService);
registerSingleton(IMarkerCheckService, MarkerCheckService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX21hcmtlckNoZWNrU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvX21hcmtlckNoZWNrU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUc1RSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBTXZELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQUU5RixJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFHMUMsWUFDa0MsY0FBOEIsRUFDcEIsd0JBQWtELEVBQ3pELGlCQUFvQztRQUV4RSxLQUFLLEVBQUUsQ0FBQztRQUp5QixtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDcEIsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtRQUN6RCxzQkFBaUIsR0FBakIsaUJBQWlC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