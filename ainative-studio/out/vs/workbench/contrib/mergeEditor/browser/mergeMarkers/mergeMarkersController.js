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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VNYXJrZXJzQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbWVyZ2VNYXJrZXJzL21lcmdlTWFya2Vyc0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBZSxNQUFNLDBDQUEwQyxDQUFDO0FBR2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVsRCxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBRTdDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRztJQUM5QixLQUFLLEVBQUUsU0FBUztJQUNoQixHQUFHLEVBQUUsU0FBUztDQUNkLENBQUM7QUFFRixNQUFNLE9BQU8sc0JBQXVCLFNBQVEsVUFBVTtJQUlyRCxZQUNpQixNQUFtQixFQUNuQixvQkFBbUU7UUFFbkYsS0FBSyxFQUFFLENBQUM7UUFIUSxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBK0M7UUFMbkUsZ0JBQVcsR0FBYSxFQUFFLENBQUM7UUFDM0Isb0JBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBUXhELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENB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