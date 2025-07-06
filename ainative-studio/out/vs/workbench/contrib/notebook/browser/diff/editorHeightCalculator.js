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
import { UnchangedRegion } from '../../../../../editor/browser/widget/diffEditor/diffEditorViewModel.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { getEditorPadding } from './diffCellEditorOptions.js';
import { HeightOfHiddenLinesRegionInDiffEditor } from './diffElementViewModel.js';
let DiffEditorHeightCalculatorService = class DiffEditorHeightCalculatorService {
    constructor(lineHeight, textModelResolverService, editorWorkerService, configurationService) {
        this.lineHeight = lineHeight;
        this.textModelResolverService = textModelResolverService;
        this.editorWorkerService = editorWorkerService;
        this.configurationService = configurationService;
    }
    async diffAndComputeHeight(original, modified) {
        const [originalModel, modifiedModel] = await Promise.all([this.textModelResolverService.createModelReference(original), this.textModelResolverService.createModelReference(modified)]);
        try {
            const diffChanges = await this.editorWorkerService.computeDiff(original, modified, {
                ignoreTrimWhitespace: true,
                maxComputationTimeMs: 0,
                computeMoves: false
            }, 'advanced').then(diff => diff?.changes || []);
            const unchangedRegionFeatureEnabled = this.configurationService.getValue('diffEditor.hideUnchangedRegions.enabled');
            const minimumLineCount = this.configurationService.getValue('diffEditor.hideUnchangedRegions.minimumLineCount');
            const contextLineCount = this.configurationService.getValue('diffEditor.hideUnchangedRegions.contextLineCount');
            const originalLineCount = originalModel.object.textEditorModel.getLineCount();
            const modifiedLineCount = modifiedModel.object.textEditorModel.getLineCount();
            const unchanged = unchangedRegionFeatureEnabled ? UnchangedRegion.fromDiffs(diffChanges, originalLineCount, modifiedLineCount, minimumLineCount ?? 3, contextLineCount ?? 3) : [];
            const numberOfNewLines = diffChanges.reduce((prev, curr) => {
                if (curr.original.isEmpty && !curr.modified.isEmpty) {
                    return prev + curr.modified.length;
                }
                if (!curr.original.isEmpty && !curr.modified.isEmpty && curr.modified.length > curr.original.length) {
                    return prev + curr.modified.length - curr.original.length;
                }
                return prev;
            }, 0);
            const orginalNumberOfLines = originalModel.object.textEditorModel.getLineCount();
            const numberOfHiddenLines = unchanged.reduce((prev, curr) => prev + curr.lineCount, 0);
            const numberOfHiddenSections = unchanged.length;
            const unchangeRegionsHeight = numberOfHiddenSections * HeightOfHiddenLinesRegionInDiffEditor;
            const visibleLineCount = orginalNumberOfLines + numberOfNewLines - numberOfHiddenLines;
            // TODO: When we have a horizontal scrollbar, we need to add 12 to the height.
            // Right now there's no way to determine if a horizontal scrollbar is visible in the editor.
            return (visibleLineCount * this.lineHeight) + getEditorPadding(visibleLineCount).top + getEditorPadding(visibleLineCount).bottom + unchangeRegionsHeight;
        }
        finally {
            originalModel.dispose();
            modifiedModel.dispose();
        }
    }
    computeHeightFromLines(lineCount) {
        return lineCount * this.lineHeight + getEditorPadding(lineCount).top + getEditorPadding(lineCount).bottom;
    }
};
DiffEditorHeightCalculatorService = __decorate([
    __param(1, ITextModelService),
    __param(2, IEditorWorkerService),
    __param(3, IConfigurationService)
], DiffEditorHeightCalculatorService);
export { DiffEditorHeightCalculatorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2VkaXRvckhlaWdodENhbGN1bGF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzlELE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBTzNFLElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQWlDO0lBQzdDLFlBQ2tCLFVBQWtCLEVBQ0Msd0JBQTJDLEVBQ3hDLG1CQUF5QyxFQUN4QyxvQkFBMkM7UUFIbEUsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBbUI7UUFDeEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUN4Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO0lBQ2hGLENBQUM7SUFFRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBYSxFQUFFLFFBQWE7UUFDN0QsTUFBTSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsb0JBQW9CLENBQUMs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