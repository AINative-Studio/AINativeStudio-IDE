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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvZWRpdG9ySGVpZ2h0Q2FsY3VsYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDOUQsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFPM0UsSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBaUM7SUFDN0MsWUFDa0IsVUFBa0IsRUFDQyx3QkFBMkMsRUFDeEMsbUJBQXlDLEVBQ3hDLG9CQUEyQztRQUhsRSxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ0MsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUFtQjtRQUN4Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQ3hDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDaEYsQ0FBQztJQUVFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxRQUFhLEVBQUUsUUFBYTtRQUM3RCxNQUFNLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFR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