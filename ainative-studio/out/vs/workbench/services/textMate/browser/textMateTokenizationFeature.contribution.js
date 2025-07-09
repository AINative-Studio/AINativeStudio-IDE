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
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ITextMateTokenizationService } from './textMateTokenizationFeature.js';
import { TextMateTokenizationFeature } from './textMateTokenizationFeatureImpl.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
/**
 * Makes sure the ITextMateTokenizationService is instantiated
 */
let TextMateTokenizationInstantiator = class TextMateTokenizationInstantiator {
    static { this.ID = 'workbench.contrib.textMateTokenizationInstantiator'; }
    constructor(_textMateTokenizationService) { }
};
TextMateTokenizationInstantiator = __decorate([
    __param(0, ITextMateTokenizationService)
], TextMateTokenizationInstantiator);
registerSingleton(ITextMateTokenizationService, TextMateTokenizationFeature, 0 /* InstantiationType.Eager */);
registerWorkbenchContribution2(TextMateTokenizationInstantiator.ID, TextMateTokenizationInstantiator, 2 /* WorkbenchPhase.BlockRestore */);
CommandsRegistry.registerCommand('_workbench.colorizeTextMateTokens', async (accessor, resource) => {
    const textModelService = accessor.get(ITextFileService);
    const textModel = resource ? (await textModelService.files.resolve(resource)).textEditorModel : undefined;
    if (!textModel) {
        throw new Error(`Cannot resolve text model for resource ${resource}`);
    }
    const tokenizer = await TokenizationRegistry.getOrCreate(textModel.getLanguageId());
    if (!tokenizer) {
        throw new Error(`Cannot resolve tokenizer for language ${textModel.getLanguageId()}`);
    }
    const stopwatch = new StopWatch();
    let state = tokenizer.getInitialState();
    for (let i = 1; i <= textModel.getLineCount(); i++) {
        state = tokenizer.tokenizeEncoded(textModel.getLineContent(i), true, state).endState;
    }
    stopwatch.stop();
    return { tokenizeTime: stopwatch.elapsed() };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25GZWF0dXJlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci90ZXh0TWF0ZVRva2VuaXphdGlvbkZlYXR1cmUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFHcEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFOztHQUVHO0FBQ0gsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBZ0M7YUFFckIsT0FBRSxHQUFHLG9EQUFvRCxBQUF2RCxDQUF3RDtJQUUxRSxZQUMrQiw0QkFBMEQsSUFDckYsQ0FBQzs7QUFOQSxnQ0FBZ0M7SUFLbkMsV0FBQSw0QkFBNEIsQ0FBQTtHQUx6QixnQ0FBZ0MsQ0FPckM7QUFFRCxpQkFBaUIsQ0FBQyw0QkFBNEIsRUFBRSwyQkFBMkIsa0NBQTBCLENBQUM7QUFFdEcsOEJBQThCLENBQUMsZ0NBQWdDLENBQUMsRUFBRSxFQUFFLGdDQUFnQyxzQ0FBOEIsQ0FBQztBQUVuSSxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsUUFBYyxFQUFxQyxFQUFFO0lBQzdKLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3hELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUMxRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7SUFDcEYsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7SUFDbEMsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNwRCxLQUFLLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUM7SUFDdEYsQ0FBQztJQUNELFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNqQixPQUFPLEVBQUUsWUFBWSxFQUFFLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDIn0=