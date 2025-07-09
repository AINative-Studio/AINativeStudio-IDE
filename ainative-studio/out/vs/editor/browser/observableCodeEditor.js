/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equalsIfDefined, itemsEquals } from '../../base/common/equals.js';
import { Disposable, DisposableStore, toDisposable } from '../../base/common/lifecycle.js';
import { TransactionImpl, autorun, autorunOpts, derived, derivedOpts, derivedWithSetter, observableFromEvent, observableSignal, observableValue, observableValueOpts } from '../../base/common/observable.js';
import { OffsetRange } from '../common/core/offsetRange.js';
import { Position } from '../common/core/position.js';
import { Selection } from '../common/core/selection.js';
import { Point } from './point.js';
/**
 * Returns a facade for the code editor that provides observables for various states/events.
*/
export function observableCodeEditor(editor) {
    return ObservableCodeEditor.get(editor);
}
export class ObservableCodeEditor extends Disposable {
    static { this._map = new Map(); }
    /**
     * Make sure that editor is not disposed yet!
    */
    static get(editor) {
        let result = ObservableCodeEditor._map.get(editor);
        if (!result) {
            result = new ObservableCodeEditor(editor);
            ObservableCodeEditor._map.set(editor, result);
            const d = editor.onDidDispose(() => {
                const item = ObservableCodeEditor._map.get(editor);
                if (item) {
                    ObservableCodeEditor._map.delete(editor);
                    item.dispose();
                    d.dispose();
                }
            });
        }
        return result;
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            this._currentTransaction = new TransactionImpl(() => {
                /** @description Update editor state */
            });
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            const t = this._currentTransaction;
            this._currentTransaction = undefined;
            t.finish();
        }
    }
    constructor(editor) {
        super();
        this.editor = editor;
        this._updateCounter = 0;
        this._currentTransaction = undefined;
        this._model = observableValue(this, this.editor.getModel());
        this.model = this._model;
        this.isReadonly = observableFromEvent(this, this.editor.onDidChangeConfiguration, () => this.editor.getOption(96 /* EditorOption.readOnly */));
        this._versionId = observableValueOpts({ owner: this, lazy: true }, this.editor.getModel()?.getVersionId() ?? null);
        this.versionId = this._versionId;
        this._selections = observableValueOpts({ owner: this, equalsFn: equalsIfDefined(itemsEquals(Selection.selectionsEqual)), lazy: true }, this.editor.getSelections() ?? null);
        this.selections = this._selections;
        this.positions = derivedOpts({ owner: this, equalsFn: equalsIfDefined(itemsEquals(Position.equals)) }, reader => this.selections.read(reader)?.map(s => s.getStartPosition()) ?? null);
        this.isFocused = observableFromEvent(this, e => {
            const d1 = this.editor.onDidFocusEditorWidget(e);
            const d2 = this.editor.onDidBlurEditorWidget(e);
            return {
                dispose() {
                    d1.dispose();
                    d2.dispose();
                }
            };
        }, () => this.editor.hasWidgetFocus());
        this.isTextFocused = observableFromEvent(this, e => {
            const d1 = this.editor.onDidFocusEditorText(e);
            const d2 = this.editor.onDidBlurEditorText(e);
            return {
                dispose() {
                    d1.dispose();
                    d2.dispose();
                }
            };
        }, () => this.editor.hasTextFocus());
        this.inComposition = observableFromEvent(this, e => {
            const d1 = this.editor.onDidCompositionStart(() => {
                e(undefined);
            });
            const d2 = this.editor.onDidCompositionEnd(() => {
                e(undefined);
            });
            return {
                dispose() {
                    d1.dispose();
                    d2.dispose();
                }
            };
        }, () => this.editor.inComposition);
        this.value = derivedWithSetter(this, reader => { this.versionId.read(reader); return this.model.read(reader)?.getValue() ?? ''; }, (value, tx) => {
            const model = this.model.get();
            if (model !== null) {
                if (value !== model.getValue()) {
                    model.setValue(value);
                }
            }
        });
        this.valueIsEmpty = derived(this, reader => { this.versionId.read(reader); return this.editor.getModel()?.getValueLength() === 0; });
        this.cursorSelection = derivedOpts({ owner: this, equalsFn: equalsIfDefined(Selection.selectionsEqual) }, reader => this.selections.read(reader)?.[0] ?? null);
        this.cursorPosition = derivedOpts({ owner: this, equalsFn: Position.equals }, reader => this.selections.read(reader)?.[0]?.getPosition() ?? null);
        this.cursorLineNumber = derived(this, reader => this.cursorPosition.read(reader)?.lineNumber ?? null);
        this.onDidType = observableSignal(this);
        this.onDidPaste = observableSignal(this);
        this.scrollTop = observableFromEvent(this.editor.onDidScrollChange, () => this.editor.getScrollTop());
        this.scrollLeft = observableFromEvent(this.editor.onDidScrollChange, () => this.editor.getScrollLeft());
        this.layoutInfo = observableFromEvent(this.editor.onDidLayoutChange, () => this.editor.getLayoutInfo());
        this.layoutInfoContentLeft = this.layoutInfo.map(l => l.contentLeft);
        this.layoutInfoDecorationsLeft = this.layoutInfo.map(l => l.decorationsLeft);
        this.layoutInfoWidth = this.layoutInfo.map(l => l.width);
        this.layoutInfoMinimap = this.layoutInfo.map(l => l.minimap);
        this.layoutInfoVerticalScrollbarWidth = this.layoutInfo.map(l => l.verticalScrollbarWidth);
        this.contentWidth = observableFromEvent(this.editor.onDidContentSizeChange, () => this.editor.getContentWidth());
        this._widgetCounter = 0;
        this.openedPeekWidgets = observableValue(this, 0);
        this._register(this.editor.onBeginUpdate(() => this._beginUpdate()));
        this._register(this.editor.onEndUpdate(() => this._endUpdate()));
        this._register(this.editor.onDidChangeModel(() => {
            this._beginUpdate();
            try {
                this._model.set(this.editor.getModel(), this._currentTransaction);
                this._forceUpdate();
            }
            finally {
                this._endUpdate();
            }
        }));
        this._register(this.editor.onDidType((e) => {
            this._beginUpdate();
            try {
                this._forceUpdate();
                this.onDidType.trigger(this._currentTransaction, e);
            }
            finally {
                this._endUpdate();
            }
        }));
        this._register(this.editor.onDidPaste((e) => {
            this._beginUpdate();
            try {
                this._forceUpdate();
                this.onDidPaste.trigger(this._currentTransaction, e);
            }
            finally {
                this._endUpdate();
            }
        }));
        this._register(this.editor.onDidChangeModelContent(e => {
            this._beginUpdate();
            try {
                this._versionId.set(this.editor.getModel()?.getVersionId() ?? null, this._currentTransaction, e);
                this._forceUpdate();
            }
            finally {
                this._endUpdate();
            }
        }));
        this._register(this.editor.onDidChangeCursorSelection(e => {
            this._beginUpdate();
            try {
                this._selections.set(this.editor.getSelections(), this._currentTransaction, e);
                this._forceUpdate();
            }
            finally {
                this._endUpdate();
            }
        }));
    }
    forceUpdate(cb) {
        this._beginUpdate();
        try {
            this._forceUpdate();
            if (!cb) {
                return undefined;
            }
            return cb(this._currentTransaction);
        }
        finally {
            this._endUpdate();
        }
    }
    _forceUpdate() {
        this._beginUpdate();
        try {
            this._model.set(this.editor.getModel(), this._currentTransaction);
            this._versionId.set(this.editor.getModel()?.getVersionId() ?? null, this._currentTransaction, undefined);
            this._selections.set(this.editor.getSelections(), this._currentTransaction, undefined);
        }
        finally {
            this._endUpdate();
        }
    }
    getOption(id) {
        return observableFromEvent(this, cb => this.editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(id)) {
                cb(undefined);
            }
        }), () => this.editor.getOption(id));
    }
    setDecorations(decorations) {
        const d = new DisposableStore();
        const decorationsCollection = this.editor.createDecorationsCollection();
        d.add(autorunOpts({ owner: this, debugName: () => `Apply decorations from ${decorations.debugName}` }, reader => {
            const d = decorations.read(reader);
            decorationsCollection.set(d);
        }));
        d.add({
            dispose: () => {
                decorationsCollection.clear();
            }
        });
        return d;
    }
    createOverlayWidget(widget) {
        const overlayWidgetId = 'observableOverlayWidget' + (this._widgetCounter++);
        const w = {
            getDomNode: () => widget.domNode,
            getPosition: () => widget.position.get(),
            getId: () => overlayWidgetId,
            allowEditorOverflow: widget.allowEditorOverflow,
            getMinContentWidthInPx: () => widget.minContentWidthInPx.get(),
        };
        this.editor.addOverlayWidget(w);
        const d = autorun(reader => {
            widget.position.read(reader);
            widget.minContentWidthInPx.read(reader);
            this.editor.layoutOverlayWidget(w);
        });
        return toDisposable(() => {
            d.dispose();
            this.editor.removeOverlayWidget(w);
        });
    }
    createContentWidget(widget) {
        const contentWidgetId = 'observableContentWidget' + (this._widgetCounter++);
        const w = {
            getDomNode: () => widget.domNode,
            getPosition: () => widget.position.get(),
            getId: () => contentWidgetId,
            allowEditorOverflow: widget.allowEditorOverflow,
        };
        this.editor.addContentWidget(w);
        const d = autorun(reader => {
            widget.position.read(reader);
            this.editor.layoutContentWidget(w);
        });
        return toDisposable(() => {
            d.dispose();
            this.editor.removeContentWidget(w);
        });
    }
    observeLineOffsetRange(lineRange, store) {
        const start = this.observePosition(lineRange.map(r => new Position(r.startLineNumber, 1)), store);
        const end = this.observePosition(lineRange.map(r => new Position(r.endLineNumberExclusive + 1, 1)), store);
        return derived(reader => {
            start.read(reader);
            end.read(reader);
            const range = lineRange.read(reader);
            const lineCount = this.model.read(reader)?.getLineCount();
            const s = ((typeof lineCount !== 'undefined' && range.startLineNumber > lineCount
                ? this.editor.getBottomForLineNumber(lineCount)
                : this.editor.getTopForLineNumber(range.startLineNumber))
                - this.scrollTop.read(reader));
            const e = range.isEmpty ? s : (this.editor.getBottomForLineNumber(range.endLineNumberExclusive - 1) - this.scrollTop.read(reader));
            return new OffsetRange(s, e);
        });
    }
    observePosition(position, store) {
        let pos = position.get();
        const result = observableValueOpts({ owner: this, debugName: () => `topLeftOfPosition${pos?.toString()}`, equalsFn: equalsIfDefined(Point.equals) }, new Point(0, 0));
        const contentWidgetId = `observablePositionWidget` + (this._widgetCounter++);
        const domNode = document.createElement('div');
        const w = {
            getDomNode: () => domNode,
            getPosition: () => {
                return pos ? { preference: [0 /* ContentWidgetPositionPreference.EXACT */], position: position.get() } : null;
            },
            getId: () => contentWidgetId,
            allowEditorOverflow: false,
            afterRender: (position, coordinate) => {
                const model = this._model.get();
                if (model && pos && pos.lineNumber > model.getLineCount()) {
                    // the position is after the last line
                    result.set(new Point(0, this.editor.getBottomForLineNumber(model.getLineCount()) - this.scrollTop.get()), undefined);
                }
                else {
                    result.set(coordinate ? new Point(coordinate.left, coordinate.top) : null, undefined);
                }
            },
        };
        this.editor.addContentWidget(w);
        store.add(autorun(reader => {
            pos = position.read(reader);
            this.editor.layoutContentWidget(w);
        }));
        store.add(toDisposable(() => {
            this.editor.removeContentWidget(w);
        }));
        return result;
    }
    isTargetHovered(predicate, store) {
        const isHovered = observableValue('isInjectedTextHovered', false);
        store.add(this.editor.onMouseMove(e => {
            const val = predicate(e);
            isHovered.set(val, undefined);
        }));
        store.add(this.editor.onMouseLeave(E => {
            isHovered.set(false, undefined);
        }));
        return isHovered;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUNvZGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvb2JzZXJ2YWJsZUNvZGVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RyxPQUFPLEVBQW9ELGVBQWUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHaFEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFLeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVuQzs7RUFFRTtBQUNGLE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxNQUFtQjtJQUN2RCxPQUFPLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRUQsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7YUFDM0IsU0FBSSxHQUFHLElBQUksR0FBRyxFQUFxQyxBQUEvQyxDQUFnRDtJQUU1RTs7TUFFRTtJQUNLLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDcEMsSUFBSSxNQUFNLEdBQUcsb0JBQW9CLENB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