/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { LineRange } from '../model/lineRange.js';
import * as nls from '../../../../../nls.js';
export const conflictMarkers = {
    start: '<<<<<<<',
    end: '>>>>>>>',
};
export class MergeMarkersController extends Disposable {
    constructor(editor, mergeEditorViewModel) {
        super();
        this.editor = editor;
        this.mergeEditorViewModel = mergeEditorViewModel;
        this.viewZoneIds = [];
        this.disposableStore = new DisposableStore();
        this._register(editor.onDidChangeModelContent(e => {
            this.updateDecorations();
        }));
        this._register(editor.onDidChangeModel(e => {
            this.updateDecorations();
        }));
        this.updateDecorations();
    }
    updateDecorations() {
        const model = this.editor.getModel();
        const blocks = model ? getBlocks(model, { blockToRemoveStartLinePrefix: conflictMarkers.start, blockToRemoveEndLinePrefix: conflictMarkers.end }) : { blocks: [] };
        this.editor.setHiddenAreas(blocks.blocks.map(b => b.lineRange.deltaEnd(-1).toRange()), this);
        this.editor.changeViewZones(c => {
            this.disposableStore.clear();
            for (const id of this.viewZoneIds) {
                c.removeZone(id);
            }
            this.viewZoneIds.length = 0;
            for (const b of blocks.blocks) {
                const startLine = model.getLineContent(b.lineRange.startLineNumber).substring(0, 20);
                const endLine = model.getLineContent(b.lineRange.endLineNumberExclusive - 1).substring(0, 20);
                const conflictingLinesCount = b.lineRange.lineCount - 2;
                const domNode = h('div', [
                    h('div.conflict-zone-root', [
                        h('pre', [startLine]),
                        h('span.dots', ['...']),
                        h('pre', [endLine]),
                        h('span.text', [
                            conflictingLinesCount === 1
                                ? nls.localize('conflictingLine', "1 Conflicting Line")
                                : nls.localize('conflictingLines', "{0} Conflicting Lines", conflictingLinesCount)
                        ]),
                    ]),
                ]).root;
                this.viewZoneIds.push(c.addZone({
                    afterLineNumber: b.lineRange.endLineNumberExclusive - 1,
                    domNode,
                    heightInLines: 1.5,
                }));
                const updateWidth = () => {
                    const layoutInfo = this.editor.getLayoutInfo();
                    domNode.style.width = `${layoutInfo.contentWidth - layoutInfo.verticalScrollbarWidth}px`;
                };
                this.disposableStore.add(this.editor.onDidLayoutChange(() => {
                    updateWidth();
                }));
                updateWidth();
                this.disposableStore.add(autorun(reader => {
                    /** @description update classname */
                    const vm = this.mergeEditorViewModel.read(reader);
                    if (!vm) {
                        return;
                    }
                    const activeRange = vm.activeModifiedBaseRange.read(reader);
                    const classNames = [];
                    classNames.push('conflict-zone');
                    if (activeRange) {
                        const activeRangeInResult = vm.model.getLineRangeInResult(activeRange.baseRange, reader);
                        if (activeRangeInResult.intersects(b.lineRange)) {
                            classNames.push('focused');
                        }
                    }
                    domNode.className = classNames.join(' ');
                }));
            }
        });
    }
}
function getBlocks(document, configuration) {
    const blocks = [];
    const transformedContent = [];
    let inBlock = false;
    let startLineNumber = -1;
    let curLine = 0;
    for (const line of document.getLinesContent()) {
        curLine++;
        if (!inBlock) {
            if (line.startsWith(configuration.blockToRemoveStartLinePrefix)) {
                inBlock = true;
                startLineNumber = curLine;
            }
            else {
                transformedContent.push(line);
            }
        }
        else {
            if (line.startsWith(configuration.blockToRemoveEndLinePrefix)) {
                inBlock = false;
                blocks.push(new Block(new LineRange(startLineNumber, curLine - startLineNumber + 1)));
                transformedContent.push('');
            }
        }
    }
    return {
        blocks,
        transformedContent: transformedContent.join('\n')
    };
}
class Block {
    constructor(lineRange) {
        this.lineRange = lineRange;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VNYXJrZXJzQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21lcmdlTWFya2Vycy9tZXJnZU1hcmtlcnNDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQWUsTUFBTSwwQ0FBMEMsQ0FBQztBQUdoRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFbEQsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUU3QyxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUc7SUFDOUIsS0FBSyxFQUFFLFNBQVM7SUFDaEIsR0FBRyxFQUFFLFNBQVM7Q0FDZCxDQUFDO0FBRUYsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFVBQVU7SUFJckQsWUFDaUIsTUFBbUIsRUFDbkIsb0JBQW1FO1FBRW5GLEtBQUssRUFBRSxDQUFDO1FBSFEsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNuQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQStDO1FBTG5FLGdCQUFXLEdBQWEsRUFBRSxDQUFDO1FBQzNCLG9CQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQVF4RCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxD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