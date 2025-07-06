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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RyZWVTaXR0ZXIvYnJvd3Nlci90cmVlU2l0dGVyVG9rZW5pemF0aW9uRmVhdHVyZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBMEMsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNsSixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVwRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakU7O0dBRUc7QUFDSCxJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFrQzthQUV2QixPQUFFLEdBQUcsc0RBQXNELEFBQXpELENBQTBEO0lBRTVFLFlBQzJCLDhCQUF3RCxFQUNsRCw4QkFBOEQsSUFDM0YsQ0FBQzs7QUFQQSxrQ0FBa0M7SUFLckMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLDhCQUE4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