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
import { assertFn, checkAdjacentItems } from '../../../../../base/common/assert.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { LineRange } from './lineRange.js';
import { DetailedLineRangeMapping, RangeMapping } from './mapping.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
let MergeDiffComputer = class MergeDiffComputer {
    constructor(editorWorkerService, configurationService) {
        this.editorWorkerService = editorWorkerService;
        this.configurationService = configurationService;
        this.mergeAlgorithm = observableConfigValue('mergeEditor.diffAlgorithm', 'advanced', this.configurationService)
            .map(v => v === 'smart' ? 'legacy' : v === 'experimental' ? 'advanced' : v);
    }
    async computeDiff(textModel1, textModel2, reader) {
        const diffAlgorithm = this.mergeAlgorithm.read(reader);
        const inputVersion = textModel1.getVersionId();
        const outputVersion = textModel2.getVersionId();
        const result = await this.editorWorkerService.computeDiff(textModel1.uri, textModel2.uri, {
            ignoreTrimWhitespace: false,
            maxComputationTimeMs: 0,
            computeMoves: false,
        }, diffAlgorithm);
        if (!result) {
            throw new Error('Diff computation failed');
        }
        if (textModel1.isDisposed() || textModel2.isDisposed()) {
            return { diffs: null };
        }
        const changes = result.changes.map(c => new DetailedLineRangeMapping(toLineRange(c.original), textModel1, toLineRange(c.modified), textModel2, c.innerChanges?.map(ic => toRangeMapping(ic))));
        const newInputVersion = textModel1.getVersionId();
        const newOutputVersion = textModel2.getVersionId();
        if (inputVersion !== newInputVersion || outputVersion !== newOutputVersion) {
            return { diffs: null };
        }
        assertFn(() => {
            for (const c of changes) {
                const inputRange = c.inputRange;
                const outputRange = c.outputRange;
                const inputTextModel = c.inputTextModel;
                const outputTextModel = c.outputTextModel;
                for (const map of c.rangeMappings) {
                    let inputRangesValid = inputRange.startLineNumber - 1 <= map.inputRange.startLineNumber
                        && map.inputRange.endLineNumber <= inputRange.endLineNumberExclusive;
                    if (inputRangesValid && map.inputRange.startLineNumber === inputRange.startLineNumber - 1) {
                        inputRangesValid = map.inputRange.endColumn >= inputTextModel.getLineMaxColumn(map.inputRange.startLineNumber);
                    }
                    if (inputRangesValid && map.inputRange.endLineNumber === inputRange.endLineNumberExclusive) {
                        inputRangesValid = map.inputRange.endColumn === 1;
                    }
                    let outputRangesValid = outputRange.startLineNumber - 1 <= map.outputRange.startLineNumber
                        && map.outputRange.endLineNumber <= outputRange.endLineNumberExclusive;
                    if (outputRangesValid && map.outputRange.startLineNumber === outputRange.startLineNumber - 1) {
                        outputRangesValid = map.outputRange.endColumn >= outputTextModel.getLineMaxColumn(map.outputRange.endLineNumber);
                    }
                    if (outputRangesValid && map.outputRange.endLineNumber === outputRange.endLineNumberExclusive) {
                        outputRangesValid = map.outputRange.endColumn === 1;
                    }
                    if (!inputRangesValid || !outputRangesValid) {
                        return false;
                    }
                }
            }
            return changes.length === 0 || (changes[0].inputRange.startLineNumber === changes[0].outputRange.startLineNumber &&
                checkAdjacentItems(changes, (m1, m2) => m2.inputRange.startLineNumber - m1.inputRange.endLineNumberExclusive === m2.outputRange.startLineNumber - m1.outputRange.endLineNumberExclusive &&
                    // There has to be an unchanged line in between (otherwise both diffs should have been joined)
                    m1.inputRange.endLineNumberExclusive < m2.inputRange.startLineNumber &&
                    m1.outputRange.endLineNumberExclusive < m2.outputRange.startLineNumber));
        });
        return {
            diffs: changes
        };
    }
};
MergeDiffComputer = __decorate([
    __param(0, IEditorWorkerService),
    __param(1, IConfigurationService)
], MergeDiffComputer);
export { MergeDiffComputer };
export function toLineRange(range) {
    return new LineRange(range.startLineNumber, range.length);
}
export function toRangeMapping(mapping) {
    return new RangeMapping(mapping.originalRange, mapping.modifiedRange);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tb2RlbC9kaWZmQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBSXBGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBV3RHLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWlCO0lBSzdCLFlBQ3VCLG1CQUEwRCxFQUN6RCxvQkFBNEQ7UUFENUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUN4Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBTm5FLG1CQUFjLEdBQUcscUJBQXFCLENBQ3RELDJCQUEyQixFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUM7YUFDbEUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssY0FBYyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBTTdFLENBQUM7SUFFRCxL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