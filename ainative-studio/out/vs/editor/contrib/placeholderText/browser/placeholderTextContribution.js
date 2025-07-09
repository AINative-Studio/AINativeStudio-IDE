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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhY2Vob2xkZXJUZXh0Q29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3BsYWNlaG9sZGVyVGV4dC9icm93c2VyL3BsYWNlaG9sZGVyVGV4dENvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFjLDBCQUEwQixFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBd0IsTUFBTSx1Q0FBdUMsQ0FBQztBQUU5SyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUloRjs7RUFFRTtBQUNGLE1BQU0sT0FBTywyQkFBNEIsU0FBUSxVQUFVO0lBQ25ELE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDcEMsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUE4QiwyQkFBMkIsQ0FBQyxFQUFFLENBQUUsQ0FBQztJQUM3RixDQUFDO2FBRXNCLE9BQUUsR0FBRyxnQ0FBZ0MsQUFBbkMsQ0FBb0M7SUE0QzdELFlBQ2tCLE9BQW9CO1FBRXJDLEtBQUssRUFBRSxDQUFDO1FBRlMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQTVDckIsZUFBVSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVoRCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsbUNBQTBCLENBQUM7UUFFdkUsV0FBTSxHQUFHLFdBQVcsQ0FB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