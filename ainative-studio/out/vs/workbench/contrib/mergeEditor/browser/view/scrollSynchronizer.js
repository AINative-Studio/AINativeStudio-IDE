/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorunWithStore } from '../../../../../base/common/observable.js';
import { DocumentLineRangeMap } from '../model/mapping.js';
import { ReentrancyBarrier } from '../../../../../base/common/controlFlow.js';
export class ScrollSynchronizer extends Disposable {
    get model() { return this.viewModel.get()?.model; }
    get shouldAlignResult() { return this.layout.get().kind === 'columns'; }
    get shouldAlignBase() { return this.layout.get().kind === 'mixed' && !this.layout.get().showBaseAtTop; }
    constructor(viewModel, input1View, input2View, baseView, inputResultView, layout) {
        super();
        this.viewModel = viewModel;
        this.input1View = input1View;
        this.input2View = input2View;
        this.baseView = baseView;
        this.inputResultView = inputResultView;
        this.layout = layout;
        this.reentrancyBarrier = new ReentrancyBarrier();
        const handleInput1OnScroll = this.updateScrolling = () => {
            if (!this.model) {
                return;
            }
            this.input2View.editor.setScrollTop(this.input1View.editor.getScrollTop(), 1 /* ScrollType.Immediate */);
            if (this.shouldAlignResult) {
                this.inputResultView.editor.setScrollTop(this.input1View.editor.getScrollTop(), 1 /* ScrollType.Immediate */);
            }
            else {
                const mappingInput1Result = this.model.input1ResultMapping.get();
                this.synchronizeScrolling(this.input1View.editor, this.inputResultView.editor, mappingInput1Result);
            }
            const baseView = this.baseView.get();
            if (baseView) {
                if (this.shouldAlignBase) {
                    this.baseView.get()?.editor.setScrollTop(this.input1View.editor.getScrollTop(), 1 /* ScrollType.Immediate */);
                }
                else {
                    const mapping = new DocumentLineRangeMap(this.model.baseInput1Diffs.get(), -1).reverse();
                    this.synchronizeScrolling(this.input1View.editor, baseView.editor, mapping);
                }
            }
        };
        this._store.add(this.input1View.editor.onDidScrollChange(this.reentrancyBarrier.makeExclusiveOrSkip((c) => {
            if (c.scrollTopChanged) {
                handleInput1OnScroll();
            }
            if (c.scrollLeftChanged) {
                this.baseView.get()?.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.input2View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.inputResultView.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
            }
        })));
        this._store.add(this.input2View.editor.onDidScrollChange(this.reentrancyBarrier.makeExclusiveOrSkip((c) => {
            if (!this.model) {
                return;
            }
            if (c.scrollTopChanged) {
                this.input1View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                if (this.shouldAlignResult) {
                    this.inputResultView.editor.setScrollTop(this.input2View.editor.getScrollTop(), 1 /* ScrollType.Immediate */);
                }
                else {
                    const mappingInput2Result = this.model.input2ResultMapping.get();
                    this.synchronizeScrolling(this.input2View.editor, this.inputResultView.editor, mappingInput2Result);
                }
                const baseView = this.baseView.get();
                if (baseView && this.model) {
                    if (this.shouldAlignBase) {
                        this.baseView.get()?.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                    }
                    else {
                        const mapping = new DocumentLineRangeMap(this.model.baseInput2Diffs.get(), -1).reverse();
                        this.synchronizeScrolling(this.input2View.editor, baseView.editor, mapping);
                    }
                }
            }
            if (c.scrollLeftChanged) {
                this.baseView.get()?.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.input1View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.inputResultView.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
            }
        })));
        this._store.add(this.inputResultView.editor.onDidScrollChange(this.reentrancyBarrier.makeExclusiveOrSkip((c) => {
            if (c.scrollTopChanged) {
                if (this.shouldAlignResult) {
                    this.input1View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                    this.input2View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                }
                else {
                    const mapping1 = this.model?.resultInput1Mapping.get();
                    this.synchronizeScrolling(this.inputResultView.editor, this.input1View.editor, mapping1);
                    const mapping2 = this.model?.resultInput2Mapping.get();
                    this.synchronizeScrolling(this.inputResultView.editor, this.input2View.editor, mapping2);
                }
                const baseMapping = this.model?.resultBaseMapping.get();
                const baseView = this.baseView.get();
                if (baseView && this.model) {
                    this.synchronizeScrolling(this.inputResultView.editor, baseView.editor, baseMapping);
                }
            }
            if (c.scrollLeftChanged) {
                this.baseView.get()?.editor?.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.input1View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                this.input2View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
            }
        })));
        this._store.add(autorunWithStore((reader, store) => {
            /** @description set baseViewEditor.onDidScrollChange */
            const baseView = this.baseView.read(reader);
            if (baseView) {
                store.add(baseView.editor.onDidScrollChange(this.reentrancyBarrier.makeExclusiveOrSkip((c) => {
                    if (c.scrollTopChanged) {
                        if (!this.model) {
                            return;
                        }
                        if (this.shouldAlignBase) {
                            this.input1View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                            this.input2View.editor.setScrollTop(c.scrollTop, 1 /* ScrollType.Immediate */);
                        }
                        else {
                            const baseInput1Mapping = new DocumentLineRangeMap(this.model.baseInput1Diffs.get(), -1);
                            this.synchronizeScrolling(baseView.editor, this.input1View.editor, baseInput1Mapping);
                            const baseInput2Mapping = new DocumentLineRangeMap(this.model.baseInput2Diffs.get(), -1);
                            this.synchronizeScrolling(baseView.editor, this.input2View.editor, baseInput2Mapping);
                        }
                        const baseMapping = this.model?.baseResultMapping.get();
                        this.synchronizeScrolling(baseView.editor, this.inputResultView.editor, baseMapping);
                    }
                    if (c.scrollLeftChanged) {
                        this.inputResultView.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                        this.input1View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                        this.input2View.editor.setScrollLeft(c.scrollLeft, 1 /* ScrollType.Immediate */);
                    }
                })));
            }
        }));
    }
    synchronizeScrolling(scrollingEditor, targetEditor, mapping) {
        if (!mapping) {
            return;
        }
        const visibleRanges = scrollingEditor.getVisibleRanges();
        if (visibleRanges.length === 0) {
            return;
        }
        const topLineNumber = visibleRanges[0].startLineNumber - 1;
        const result = mapping.project(topLineNumber);
        const sourceRange = result.inputRange;
        const targetRange = result.outputRange;
        const resultStartTopPx = targetEditor.getTopForLineNumber(targetRange.startLineNumber);
        const resultEndPx = targetEditor.getTopForLineNumber(targetRange.endLineNumberExclusive);
        const sourceStartTopPx = scrollingEditor.getTopForLineNumber(sourceRange.startLineNumber);
        const sourceEndPx = scrollingEditor.getTopForLineNumber(sourceRange.endLineNumberExclusive);
        const factor = Math.min((scrollingEditor.getScrollTop() - sourceStartTopPx) / (sourceEndPx - sourceStartTopPx), 1);
        const resultScrollPosition = resultStartTopPx + (resultEndPx - resultStartTopPx) * factor;
        targetEditor.setScrollTop(resultScrollPosition, 1 /* ScrollType.Immediate */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsU3luY2hyb25pemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L3Njcm9sbFN5bmNocm9uaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFlLE1BQU0sMENBQTBDLENBQUM7QUFHekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFPOUUsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFDakQsSUFBWSxLQUFLLEtBQUssT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFNM0QsSUFBWSxpQkFBaUIsS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDaEYsSUFBWSxlQUFlLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFFaEgsWUFDa0IsU0FBd0QsRUFDeEQsVUFBK0IsRUFDL0IsVUFBK0IsRUFDL0IsUUFBcUQsRUFDckQsZUFBcUMsRUFDckMsTUFBdUM7UUFFeEQsS0FBSyxFQUFFLENBQUM7UUFQUyxjQUFTLEdBQVQsU0FBUyxDQUErQztRQUN4RCxl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