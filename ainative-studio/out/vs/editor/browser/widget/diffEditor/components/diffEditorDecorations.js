/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { derived } from '../../../../../base/common/observable.js';
import { allowsTrueInlineDiffRendering } from './diffEditorViewZones/diffEditorViewZones.js';
import { MovedBlocksLinesFeature } from '../features/movedBlocksLinesFeature.js';
import { diffAddDecoration, diffAddDecorationEmpty, diffDeleteDecoration, diffDeleteDecorationEmpty, diffLineAddDecorationBackground, diffLineAddDecorationBackgroundWithIndicator, diffLineDeleteDecorationBackground, diffLineDeleteDecorationBackgroundWithIndicator, diffWholeLineAddDecoration, diffWholeLineDeleteDecoration } from '../registrations.contribution.js';
import { applyObservableDecorations } from '../utils.js';
export class DiffEditorDecorations extends Disposable {
    constructor(_editors, _diffModel, _options, widget) {
        super();
        this._editors = _editors;
        this._diffModel = _diffModel;
        this._options = _options;
        this._decorations = derived(this, (reader) => {
            const diffModel = this._diffModel.read(reader);
            const diff = diffModel?.diff.read(reader);
            if (!diff) {
                return null;
            }
            const movedTextToCompare = this._diffModel.read(reader).movedTextToCompare.read(reader);
            const renderIndicators = this._options.renderIndicators.read(reader);
            const showEmptyDecorations = this._options.showEmptyDecorations.read(reader);
            const originalDecorations = [];
            const modifiedDecorations = [];
            if (!movedTextToCompare) {
                for (const m of diff.mappings) {
                    if (!m.lineRangeMapping.original.isEmpty) {
                        originalDecorations.push({ range: m.lineRangeMapping.original.toInclusiveRange(), options: renderIndicators ? diffLineDeleteDecorationBackgroundWithIndicator : diffLineDeleteDecorationBackground });
                    }
                    if (!m.lineRangeMapping.modified.isEmpty) {
                        modifiedDecorations.push({ range: m.lineRangeMapping.modified.toInclusiveRange(), options: renderIndicators ? diffLineAddDecorationBackgroundWithIndicator : diffLineAddDecorationBackground });
                    }
                    if (m.lineRangeMapping.modified.isEmpty || m.lineRangeMapping.original.isEmpty) {
                        if (!m.lineRangeMapping.original.isEmpty) {
                            originalDecorations.push({ range: m.lineRangeMapping.original.toInclusiveRange(), options: diffWholeLineDeleteDecoration });
                        }
                        if (!m.lineRangeMapping.modified.isEmpty) {
                            modifiedDecorations.push({ range: m.lineRangeMapping.modified.toInclusiveRange(), options: diffWholeLineAddDecoration });
                        }
                    }
                    else {
                        const useInlineDiff = this._options.useTrueInlineDiffRendering.read(reader) && allowsTrueInlineDiffRendering(m.lineRangeMapping);
                        for (const i of m.lineRangeMapping.innerChanges || []) {
                            // Don't show empty markers outside the line range
                            if (m.lineRangeMapping.original.contains(i.originalRange.startLineNumber)) {
                                originalDecorations.push({ range: i.originalRange, options: (i.originalRange.isEmpty() && showEmptyDecorations) ? diffDeleteDecorationEmpty : diffDeleteDecoration });
                            }
                            if (m.lineRangeMapping.modified.contains(i.modifiedRange.startLineNumber)) {
                                modifiedDecorations.push({ range: i.modifiedRange, options: (i.modifiedRange.isEmpty() && showEmptyDecorations && !useInlineDiff) ? diffAddDecorationEmpty : diffAddDecoration });
                            }
                            if (useInlineDiff) {
                                const deletedText = diffModel.model.original.getValueInRange(i.originalRange);
                                modifiedDecorations.push({
                                    range: i.modifiedRange,
                                    options: {
                                        description: 'deleted-text',
                                        before: {
                                            content: deletedText,
                                            inlineClassName: 'inline-deleted-text',
                                        },
                                        zIndex: 100000,
                                        showIfCollapsed: true,
                                    }
                                });
                            }
                        }
                    }
                }
            }
            if (movedTextToCompare) {
                for (const m of movedTextToCompare.changes) {
                    const fullRangeOriginal = m.original.toInclusiveRange();
                    if (fullRangeOriginal) {
                        originalDecorations.push({ range: fullRangeOriginal, options: renderIndicators ? diffLineDeleteDecorationBackgroundWithIndicator : diffLineDeleteDecorationBackground });
                    }
                    const fullRangeModified = m.modified.toInclusiveRange();
                    if (fullRangeModified) {
                        modifiedDecorations.push({ range: fullRangeModified, options: renderIndicators ? diffLineAddDecorationBackgroundWithIndicator : diffLineAddDecorationBackground });
                    }
                    for (const i of m.innerChanges || []) {
                        originalDecorations.push({ range: i.originalRange, options: diffDeleteDecoration });
                        modifiedDecorations.push({ range: i.modifiedRange, options: diffAddDecoration });
                    }
                }
            }
            const activeMovedText = this._diffModel.read(reader).activeMovedText.read(reader);
            for (const m of diff.movedTexts) {
                originalDecorations.push({
                    range: m.lineRangeMapping.original.toInclusiveRange(), options: {
                        description: 'moved',
                        blockClassName: 'movedOriginal' + (m === activeMovedText ? ' currentMove' : ''),
                        blockPadding: [MovedBlocksLinesFeature.movedCodeBlockPadding, 0, MovedBlocksLinesFeature.movedCodeBlockPadding, MovedBlocksLinesFeature.movedCodeBlockPadding],
                    }
                });
                modifiedDecorations.push({
                    range: m.lineRangeMapping.modified.toInclusiveRange(), options: {
                        description: 'moved',
                        blockClassName: 'movedModified' + (m === activeMovedText ? ' currentMove' : ''),
                        blockPadding: [4, 0, 4, 4],
                    }
                });
            }
            return { originalDecorations, modifiedDecorations };
        });
        this._register(applyObservableDecorations(this._editors.original, this._decorations.map(d => d?.originalDecorations || [])));
        this._register(applyObservableDecorations(this._editors.modified, this._decorations.map(d => d?.modifiedDecorations || [])));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckRlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2NvbXBvbmVudHMvZGlmZkVkaXRvckRlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFaEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFJN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHNCQUFzQixFQUFFLG9CQUFvQixFQUFFLHlCQUF5QixFQUFFLCtCQUErQixFQUFFLDRDQUE0QyxFQUFFLGtDQUFrQyxFQUFFLCtDQUErQyxFQUFFLDBCQUEwQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN1csT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBR3pELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxVQUFVO0lBQ3BELFlBQ2tCLFFBQTJCLEVBQzNCLFVBQXdELEVBQ3hELFFBQTJCLEVBQzVDLE1BQXdCO1FBRXhCLEtBQUssRUFBRSxDQUFDO1FBTFMsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFDM0IsZUFBVSxHQUFWLFVBQVUsQ0FBOEM7UUFDeEQsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFTNUIsaUJBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDeEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVB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