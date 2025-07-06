/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../base/browser/dom.js';
import { structuralEquals } from '../../../../base/common/equals.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, constObservable, derivedObservableWithCache, derivedOpts, derivedWithStore } from '../../../../base/common/observable.js';
import { observableCodeEditor } from '../../../browser/observableCodeEditor.js';
/**
 * Use the editor option to set the placeholder text.
*/
export class PlaceholderTextContribution extends Disposable {
    static get(editor) {
        return editor.getContribution(PlaceholderTextContribution.ID);
    }
    static { this.ID = 'editor.contrib.placeholderText'; }
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._editorObs = observableCodeEditor(this._editor);
        this._placeholderText = this._editorObs.getOption(92 /* EditorOption.placeholder */);
        this._state = derivedOpts({ owner: this, equalsFn: structuralEquals }, reader => {
            const p = this._placeholderText.read(reader);
            if (!p) {
                return undefined;
            }
            if (!this._editorObs.valueIsEmpty.read(reader)) {
                return undefined;
            }
            return { placeholder: p };
        });
        this._shouldViewBeAlive = isOrWasTrue(this, reader => this._state.read(reader)?.placeholder !== undefined);
        this._view = derivedWithStore((reader, store) => {
            if (!this._shouldViewBeAlive.read(reader)) {
                return;
            }
            const element = h('div.editorPlaceholder');
            store.add(autorun(reader => {
                const data = this._state.read(reader);
                const shouldBeVisibile = data?.placeholder !== undefined;
                element.root.style.display = shouldBeVisibile ? 'block' : 'none';
                element.root.innerText = data?.placeholder ?? '';
            }));
            store.add(autorun(reader => {
                const info = this._editorObs.layoutInfo.read(reader);
                element.root.style.left = `${info.contentLeft}px`;
                element.root.style.width = (info.contentWidth - info.verticalScrollbarWidth) + 'px';
                element.root.style.top = `${this._editor.getTopForLineNumber(0)}px`;
            }));
            store.add(autorun(reader => {
                element.root.style.fontFamily = this._editorObs.getOption(51 /* EditorOption.fontFamily */).read(reader);
                element.root.style.fontSize = this._editorObs.getOption(54 /* EditorOption.fontSize */).read(reader) + 'px';
                element.root.style.lineHeight = this._editorObs.getOption(68 /* EditorOption.lineHeight */).read(reader) + 'px';
            }));
            store.add(this._editorObs.createOverlayWidget({
                allowEditorOverflow: false,
                minContentWidthInPx: constObservable(0),
                position: constObservable(null),
                domNode: element.root,
            }));
        });
        this._view.recomputeInitiallyAndOnChange(this._store);
    }
}
function isOrWasTrue(owner, fn) {
    return derivedObservableWithCache(owner, (reader, lastValue) => {
        if (lastValue === true) {
            return true;
        }
        return fn(reader);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhY2Vob2xkZXJUZXh0Q29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcGxhY2Vob2xkZXJUZXh0L2Jyb3dzZXIvcGxhY2Vob2xkZXJUZXh0Q29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQWMsMEJBQTBCLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLHVDQUF1QyxDQUFDO0FBRTlLLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBSWhGOztFQUVFO0FBQ0YsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFVBQVU7SUFDbkQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFtQjtRQUNwQyxPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQThCLDJCQUEyQixDQUFDLEVBQUUsQ0FBRSxDQUFDO0lBQzdGLENBQUM7YUFFc0IsT0FBRSxHQUFHLGdDQUFnQyxBQUFuQyxDQUFvQztJQTRDN0QsWUFDa0IsT0FBb0I7UUFFckMsS0FBSyxFQUFFLENBQUM7UUFGUyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBNUNyQixlQUFVLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWhELHFCQUFnQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxtQ0FBMEIsQ0FBQztRQUV2RSxXQUFNLEdBQUcsV0FBVyxDQUFz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