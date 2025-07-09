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
import { EventType, addDisposableListener, h } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, derivedDisposable, derivedWithSetter, observableFromEvent, observableValue } from '../../../../../base/common/observable.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { WorkbenchHoverDelegate } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { LineRange, LineRangeSet } from '../../../../common/core/lineRange.js';
import { OffsetRange } from '../../../../common/core/offsetRange.js';
import { Range } from '../../../../common/core/range.js';
import { TextEdit } from '../../../../common/core/textEdit.js';
import { DetailedLineRangeMapping } from '../../../../common/diff/rangeMapping.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { ActionRunnerWithContext } from '../../multiDiffEditor/utils.js';
import { DiffEditorSash } from '../components/diffEditorSash.js';
import { appendRemoveOnDispose, applyStyle, prependRemoveOnDispose } from '../utils.js';
import { EditorGutter } from '../utils/editorGutter.js';
const emptyArr = [];
const width = 35;
let DiffEditorGutter = class DiffEditorGutter extends Disposable {
    constructor(diffEditorRoot, _diffModel, _editors, _options, _sashLayout, _boundarySashes, _instantiationService, _contextKeyService, _menuService) {
        super();
        this._diffModel = _diffModel;
        this._editors = _editors;
        this._options = _options;
        this._sashLayout = _sashLayout;
        this._boundarySashes = _boundarySashes;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this._menu = this._register(this._menuService.createMenu(MenuId.DiffEditorHunkToolbar, this._contextKeyService));
        this._actions = observableFromEvent(this, this._menu.onDidChange, () => this._menu.getActions());
        this._hasActions = this._actions.map(a => a.length > 0);
        this._showSash = derived(this, reader => this._options.renderSideBySide.read(reader) && this._hasActions.read(reader));
        this.width = derived(this, reader => this._hasActions.read(reader) ? width : 0);
        this.elements = h('div.gutter@gutter', { style: { position: 'absolute', height: '100%', width: width + 'px' } }, []);
        this._currentDiff = derived(this, (reader) => {
            const model = this._diffModel.read(reader);
            if (!model) {
                return undefined;
            }
            const mappings = model.diff.read(reader)?.mappings;
            const cursorPosition = this._editors.modifiedCursor.read(reader);
            if (!cursorPosition) {
                return undefined;
            }
            return mappings?.find(m => m.lineRangeMapping.modified.contains(cursorPosition.lineNumber));
        });
        this._selectedDiffs = derived(this, (reader) => {
            /** @description selectedDiffs */
            const model = this._diffModel.read(reader);
            const diff = model?.diff.read(reader);
            // Return `emptyArr` because it is a constant. [] is always a new array and would trigger a change.
            if (!diff) {
                return emptyArr;
            }
            const selections = this._editors.modifiedSelections.read(reader);
            if (selections.every(s => s.isEmpty())) {
                return emptyArr;
            }
            const selectedLineNumbers = new LineRangeSet(selections.map(s => LineRange.fromRangeInclusive(s)));
            const selectedMappings = diff.mappings.filter(m => m.lineRangeMapping.innerChanges && selectedLineNumbers.intersects(m.lineRangeMapping.modified));
            const result = selectedMappings.map(mapping => ({
                mapping,
                rangeMappings: mapping.lineRangeMapping.innerChanges.filter(c => selections.some(s => Range.areIntersecting(c.modifiedRange, s)))
            }));
            if (result.length === 0 || result.every(r => r.rangeMappings.length === 0)) {
                return emptyArr;
            }
            return result;
        });
        this._register(prependRemoveOnDispose(diffEditorRoot, this.elements.root));
        this._register(addDisposableListener(this.elements.root, 'click', () => {
            this._editors.modified.focus();
        }));
        this._register(applyStyle(this.elements.root, { display: this._hasActions.map(a => a ? 'block' : 'none') }));
        derivedDisposable(this, reader => {
            const showSash = this._showSash.read(reader);
            return !showSash ? undefined : new DiffEditorSash(diffEditorRoot, this._sashLayout.dimensions, this._options.enableSplitViewResizing, this._boundarySashes, derivedWithSetter(this, reader => this._sashLayout.sashLeft.read(reader) - width, (v, tx) => this._sashLayout.sashLeft.set(v + width, tx)), () => this._sashLayout.resetSash());
        }).recomputeInitiallyAndOnChange(this._store);
        const gutterItems = derived(this, reader => {
            const model = this._diffModel.read(reader);
            if (!model) {
                return [];
            }
            const diffs = model.diff.read(reader);
            if (!diffs) {
                return [];
            }
            const selection = this._selectedDiffs.read(reader);
            if (selection.length > 0) {
                const m = DetailedLineRangeMapping.fromRangeMappings(selection.flatMap(s => s.rangeMappings));
                return [
                    new DiffGutterItem(m, true, MenuId.DiffEditorSelectionToolbar, undefined, model.model.original.uri, model.model.modified.uri)
                ];
            }
            const currentDiff = this._currentDiff.read(reader);
            return diffs.mappings.map(m => new DiffGutterItem(m.lineRangeMapping.withInnerChangesFromLineRanges(), m.lineRangeMapping === currentDiff?.lineRangeMapping, MenuId.DiffEditorHunkToolbar, undefined, model.model.original.uri, model.model.modified.uri));
        });
        this._register(new EditorGutter(this._editors.modified, this.elements.root, {
            getIntersectingGutterItems: (range, reader) => gutterItems.read(reader),
            createView: (item, target) => {
                return this._instantiationService.createInstance(DiffToolBar, item, target, this);
            },
        }));
        this._register(addDisposableListener(this.elements.gutter, EventType.MOUSE_WHEEL, (e) => {
            if (this._editors.modified.getOption(108 /* EditorOption.scrollbar */).handleMouseWheel) {
                this._editors.modified.delegateScrollFromMouseWheelEvent(e);
            }
        }, { passive: false }));
    }
    computeStagedValue(mapping) {
        const c = mapping.innerChanges ?? [];
        const modified = new TextModelText(this._editors.modifiedModel.get());
        const original = new TextModelText(this._editors.original.getModel());
        const edit = new TextEdit(c.map(c => c.toTextEdit(modified)));
        const value = edit.apply(original);
        return value;
    }
    layout(left) {
        this.elements.gutter.style.left = left + 'px';
    }
};
DiffEditorGutter = __decorate([
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IMenuService)
], DiffEditorGutter);
export { DiffEditorGutter };
class DiffGutterItem {
    constructor(mapping, showAlways, menuId, rangeOverride, originalUri, modifiedUri) {
        this.mapping = mapping;
        this.showAlways = showAlways;
        this.menuId = menuId;
        this.rangeOverride = rangeOverride;
        this.originalUri = originalUri;
        this.modifiedUri = modifiedUri;
    }
    get id() { return this.mapping.modified.toString(); }
    get range() { return this.rangeOverride ?? this.mapping.modified; }
}
let DiffToolBar = class DiffToolBar extends Disposable {
    constructor(_item, target, gutter, instantiationService) {
        super();
        this._item = _item;
        this._elements = h('div.gutterItem', { style: { height: '20px', width: '34px' } }, [
            h('div.background@background', {}, []),
            h('div.buttons@buttons', {}, []),
        ]);
        this._showAlways = this._item.map(this, item => item.showAlways);
        this._menuId = this._item.map(this, item => item.menuId);
        this._isSmall = observableValue(this, false);
        this._lastItemRange = undefined;
        this._lastViewRange = undefined;
        const hoverDelegate = this._register(instantiationService.createInstance(WorkbenchHoverDelegate, 'element', { instantHover: true }, { position: { hoverPosition: 1 /* HoverPosition.RIGHT */ } }));
        this._register(appendRemoveOnDispose(target, this._elements.root));
        this._register(autorun(reader => {
            /** @description update showAlways */
            const showAlways = this._showAlways.read(reader);
            this._elements.root.classList.toggle('noTransition', true);
            this._elements.root.classList.toggle('showAlways', showAlways);
            setTimeout(() => {
                this._elements.root.classList.toggle('noTransition', false);
            }, 0);
        }));
        this._register(autorunWithStore((reader, store) => {
            this._elements.buttons.replaceChildren();
            const i = store.add(instantiationService.createInstance(MenuWorkbenchToolBar, this._elements.buttons, this._menuId.read(reader), {
                orientation: 1 /* ActionsOrientation.VERTICAL */,
                hoverDelegate,
                toolbarOptions: {
                    primaryGroup: g => g.startsWith('primary'),
                },
                overflowBehavior: { maxItems: this._isSmall.read(reader) ? 1 : 3 },
                hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
                actionRunner: store.add(new ActionRunnerWithContext(() => {
                    const item = this._item.get();
                    const mapping = item.mapping;
                    return {
                        mapping,
                        originalWithModifiedChanges: gutter.computeStagedValue(mapping),
                        originalUri: item.originalUri,
                        modifiedUri: item.modifiedUri,
                    };
                })),
                menuOptions: {
                    shouldForwardArgs: true,
                },
            }));
            store.add(i.onDidChangeMenuItems(() => {
                if (this._lastItemRange) {
                    this.layout(this._lastItemRange, this._lastViewRange);
                }
            }));
        }));
    }
    layout(itemRange, viewRange) {
        this._lastItemRange = itemRange;
        this._lastViewRange = viewRange;
        let itemHeight = this._elements.buttons.clientHeight;
        this._isSmall.set(this._item.get().mapping.original.startLineNumber === 1 && itemRange.length < 30, undefined);
        // Item might have changed
        itemHeight = this._elements.buttons.clientHeight;
        const middleHeight = itemRange.length / 2 - itemHeight / 2;
        const margin = itemHeight;
        let effectiveCheckboxTop = itemRange.start + middleHeight;
        const preferredViewPortRange = OffsetRange.tryCreate(margin, viewRange.endExclusive - margin - itemHeight);
        const preferredParentRange = OffsetRange.tryCreate(itemRange.start + margin, itemRange.endExclusive - itemHeight - margin);
        if (preferredParentRange && preferredViewPortRange && preferredParentRange.start < preferredParentRange.endExclusive) {
            effectiveCheckboxTop = preferredViewPortRange.clip(effectiveCheckboxTop);
            effectiveCheckboxTop = preferredParentRange.clip(effectiveCheckboxTop);
        }
        this._elements.buttons.style.top = `${effectiveCheckboxTop - itemRange.start}px`;
    }
};
DiffToolBar = __decorate([
    __param(3, IInstantiationService)
], DiffToolBar);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVyRmVhdHVyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9mZWF0dXJlcy9ndXR0ZXJGZWF0dXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFLekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBZSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRXZMLE9BQU8sRUFBc0Isb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHdCQUF3QixF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