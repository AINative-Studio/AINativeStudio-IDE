/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX21hcmtlckNoZWNrU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9fbWFya2VyQ2hlY2tTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRzVFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFNdkQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFDO0FBRTlGLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUcxQyxZQUNrQyxjQUE4QixFQUNwQix3QkFBa0QsRUFDekQsaUJBQW9DO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBSnlCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUNwQiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ3pELHNCQUFpQixHQUFqQixpQkFBaUIs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