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
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { TreeSitterTextModelService } from '../../../../editor/common/services/treeSitter/treeSitterParserService.js';
import { ITreeSitterImporter, ITreeSitterParserService, TreeSitterImporter } from '../../../../editor/common/services/treeSitterParserService.js';
import { ITreeSitterTokenizationFeature } from './treeSitterTokenizationFeature.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { TreeSitterTokenizationRegistry } from '../../../../editor/common/languages.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
/**
 * Makes sure the ITreeSitterTokenizationService is instantiated
 */
let TreeSitterTokenizationInstantiator = class TreeSitterTokenizationInstantiator {
    static { this.ID = 'workbench.contrib.treeSitterTokenizationInstantiator'; }
    constructor(_treeSitterTokenizationService, _treeSitterTokenizationFeature) { }
};
TreeSitterTokenizationInstantiator = __decorate([
    __param(0, ITreeSitterParserService),
    __param(1, ITreeSitterTokenizationFeature)
], TreeSitterTokenizationInstantiator);
registerSingleton(ITreeSitterImporter, TreeSitterImporter, 0 /* InstantiationType.Eager */);
registerSingleton(ITreeSitterParserService, TreeSitterTextModelService, 0 /* InstantiationType.Eager */);
registerWorkbenchContribution2(TreeSitterTokenizationInstantiator.ID, TreeSitterTokenizationInstantiator, 2 /* WorkbenchPhase.BlockRestore */);
CommandsRegistry.registerCommand('_workbench.colorizeTreeSitterTokens', async (accessor, resource) => {
    const treeSitterParserService = accessor.get(ITreeSitterParserService);
    const textModelService = accessor.get(ITextFileService);
    const textModel = resource ? (await textModelService.files.resolve(resource)).textEditorModel : undefined;
    if (!textModel) {
        throw new Error(`Cannot resolve text model for resource ${resource}`);
    }
    const tokenizer = await TreeSitterTokenizationRegistry.getOrCreate(textModel.getLanguageId());
    if (!tokenizer) {
        throw new Error(`Cannot resolve tokenizer for language ${textModel.getLanguageId()}`);
    }
    const textModelTreeSitter = await treeSitterParserService.getTextModelTreeSitter(textModel);
    if (!textModelTreeSitter) {
        throw new Error(`Cannot resolve tree sitter parser for language ${textModel.getLanguageId()}`);
    }
    const stopwatch = new StopWatch();
    await textModelTreeSitter.parse();
    stopwatch.stop();
    let captureTime = 0;
    let metadataTime = 0;
    for (let i = 1; i <= textModel.getLineCount(); i++) {
        const result = tokenizer.tokenizeEncodedInstrumented(i, textModel);
        if (result) {
            captureTime += result.captureTime;
            metadataTime += result.metadataTime;
        }
    }
    textModelTreeSitter.dispose();
    textModel.dispose();
    return { parseTime: stopwatch.elapsed(), captureTime, metadataTime };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90cmVlU2l0dGVyL2Jyb3dzZXIvdHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDdEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDbEosT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFcEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFOztHQUVHO0FBQ0gsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBa0M7YUFFdkIsT0FBRSxHQUFHLHNEQUFzRCxBQUF6RCxDQUEwRDtJQUU1RSxZQUMyQiw4QkFBd0QsRUFDbEQsOEJBQThELElBQzNGLENBQUM7O0FBUEEsa0NBQWtDO0lBS3JDLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSw4QkFB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