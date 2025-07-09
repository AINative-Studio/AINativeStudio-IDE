/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLast } from '../../../../base/common/arraysFind.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunHandleChanges, autorunOpts, autorunWithStore, observableValue, transaction } from '../../../../base/common/observable.js';
import { ElementSizeObserver } from '../../config/elementSizeObserver.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TextLength } from '../../../common/core/textLength.js';
export function joinCombine(arr1, arr2, keySelector, combine) {
    if (arr1.length === 0) {
        return arr2;
    }
    if (arr2.length === 0) {
        return arr1;
    }
    const result = [];
    let i = 0;
    let j = 0;
    while (i < arr1.length && j < arr2.length) {
        const val1 = arr1[i];
        const val2 = arr2[j];
        const key1 = keySelector(val1);
        const key2 = keySelector(val2);
        if (key1 < key2) {
            result.push(val1);
            i++;
        }
        else if (key1 > key2) {
            result.push(val2);
            j++;
        }
        else {
            result.push(combine(val1, val2));
            i++;
            j++;
        }
    }
    while (i < arr1.length) {
        result.push(arr1[i]);
        i++;
    }
    while (j < arr2.length) {
        result.push(arr2[j]);
        j++;
    }
    return result;
}
// TODO make utility
export function applyObservableDecorations(editor, decorations) {
    const d = new DisposableStore();
    const decorationsCollection = editor.createDecorationsCollection();
    d.add(autorunOpts({ debugName: () => `Apply decorations from ${decorations.debugName}` }, reader => {
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
export function appendRemoveOnDispose(parent, child) {
    parent.appendChild(child);
    return toDisposable(() => {
        child.remove();
    });
}
export function prependRemoveOnDispose(parent, child) {
    parent.prepend(child);
    return toDisposable(() => {
        child.remove();
    });
}
export class ObservableElementSizeObserver extends Disposable {
    get width() { return this._width; }
    get height() { return this._height; }
    get automaticLayout() { return this._automaticLayout; }
    constructor(element, dimension) {
        super();
        this._automaticLayout = false;
        this.elementSizeObserver = this._register(new ElementSizeObserver(element, dimension));
        this._width = observableValue(this, this.elementSizeObserver.getWidth());
        this._height = observableValue(this, this.elementSizeObserver.getHeight());
        this._register(this.elementSizeObserver.onDidChange(e => transaction(tx => {
            /** @description Set width/height from elementSizeObserver */
            this._width.set(this.elementSizeObserver.getWidth(), tx);
            this._height.set(this.elementSizeObserver.getHeight(), tx);
        })));
    }
    observe(dimension) {
        this.elementSizeObserver.observe(dimension);
    }
    setAutomaticLayout(automaticLayout) {
        this._automaticLayout = automaticLayout;
        if (automaticLayout) {
            this.elementSizeObserver.startObserving();
        }
        else {
            this.elementSizeObserver.stopObserving();
        }
    }
}
export function animatedObservable(targetWindow, base, store) {
    let targetVal = base.get();
    let startVal = targetVal;
    let curVal = targetVal;
    const result = observableValue('animatedValue', targetVal);
    let animationStartMs = -1;
    const durationMs = 300;
    let animationFrame = undefined;
    store.add(autorunHandleChanges({
        createEmptyChangeSummary: () => ({ animate: false }),
        handleChange: (ctx, s) => {
            if (ctx.didChange(base)) {
                s.animate = s.animate || ctx.change;
            }
            return true;
        }
    }, (reader, s) => {
        /** @description update value */
        if (animationFrame !== undefined) {
            targetWindow.cancelAnimationFrame(animationFrame);
            animationFrame = undefined;
        }
        startVal = curVal;
        targetVal = base.read(reader);
        animationStartMs = Date.now() - (s.animate ? 0 : durationMs);
        update();
    }));
    function update() {
        const passedMs = Date.now() - animationStartMs;
        curVal = Math.floor(easeOutExpo(passedMs, startVal, targetVal - startVal, durationMs));
        if (passedMs < durationMs) {
            animationFrame = targetWindow.requestAnimationFrame(update);
        }
        else {
            curVal = targetVal;
        }
        result.set(curVal, undefined);
    }
    return result;
}
function easeOutExpo(t, b, c, d) {
    return t === d ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
}
export function deepMerge(source1, source2) {
    const result = {};
    for (const key in source1) {
        result[key] = source1[key];
    }
    for (const key in source2) {
        const source2Value = source2[key];
        if (typeof result[key] === 'object' && source2Value && typeof source2Value === 'object') {
            result[key] = deepMerge(result[key], source2Value);
        }
        else {
            result[key] = source2Value;
        }
    }
    return result;
}
export class ViewZoneOverlayWidget extends Disposable {
    constructor(editor, viewZone, htmlElement) {
        super();
        this._register(new ManagedOverlayWidget(editor, htmlElement));
        this._register(applyStyle(htmlElement, {
            height: viewZone.actualHeight,
            top: viewZone.actualTop,
        }));
    }
}
export class PlaceholderViewZone {
    get afterLineNumber() { return this._afterLineNumber.get(); }
    constructor(_afterLineNumber, heightInPx) {
        this._afterLineNumber = _afterLineNumber;
        this.heightInPx = heightInPx;
        this.domNode = document.createElement('div');
        this._actualTop = observableValue(this, undefined);
        this._actualHeight = observableValue(this, undefined);
        this.actualTop = this._actualTop;
        this.actualHeight = this._actualHeight;
        this.showInHiddenAreas = true;
        this.onChange = this._afterLineNumber;
        this.onDomNodeTop = (top) => {
            this._actualTop.set(top, undefined);
        };
        this.onComputedHeight = (height) => {
            this._actualHeight.set(height, undefined);
        };
    }
}
export class ManagedOverlayWidget {
    static { this._counter = 0; }
    constructor(_editor, _domElement) {
        this._editor = _editor;
        this._domElement = _domElement;
        this._overlayWidgetId = `managedOverlayWidget-${ManagedOverlayWidget._counter++}`;
        this._overlayWidget = {
            getId: () => this._overlayWidgetId,
            getDomNode: () => this._domElement,
            getPosition: () => null
        };
        this._editor.addOverlayWidget(this._overlayWidget);
    }
    dispose() {
        this._editor.removeOverlayWidget(this._overlayWidget);
    }
}
export function applyStyle(domNode, style) {
    return autorun(reader => {
        /** @description applyStyle */
        for (let [key, val] of Object.entries(style)) {
            if (val && typeof val === 'object' && 'read' in val) {
                val = val.read(reader);
            }
            if (typeof val === 'number') {
                val = `${val}px`;
            }
            key = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            domNode.style[key] = val;
        }
    });
}
export function applyViewZones(editor, viewZones, setIsUpdating, zoneIds) {
    const store = new DisposableStore();
    const lastViewZoneIds = [];
    store.add(autorunWithStore((reader, store) => {
        /** @description applyViewZones */
        const curViewZones = viewZones.read(reader);
        const viewZonIdsPerViewZone = new Map();
        const viewZoneIdPerOnChangeObservable = new Map();
        // Add/remove view zones
        if (setIsUpdating) {
            setIsUpdating(true);
        }
        editor.changeViewZones(a => {
            for (const id of lastViewZoneIds) {
                a.removeZone(id);
                zoneIds?.delete(id);
            }
            lastViewZoneIds.length = 0;
            for (const z of curViewZones) {
                const id = a.addZone(z);
                if (z.setZoneId) {
                    z.setZoneId(id);
                }
                lastViewZoneIds.push(id);
                zoneIds?.add(id);
                viewZonIdsPerViewZone.set(z, id);
            }
        });
        if (setIsUpdating) {
            setIsUpdating(false);
        }
        // Layout zone on change
        store.add(autorunHandleChanges({
            createEmptyChangeSummary() {
                return { zoneIds: [] };
            },
            handleChange(context, changeSummary) {
                const id = viewZoneIdPerOnChangeObservable.get(context.changedObservable);
                if (id !== undefined) {
                    changeSummary.zoneIds.push(id);
                }
                return true;
            },
        }, (reader, changeSummary) => {
            /** @description layoutZone on change */
            for (const vz of curViewZones) {
                if (vz.onChange) {
                    viewZoneIdPerOnChangeObservable.set(vz.onChange, viewZonIdsPerViewZone.get(vz));
                    vz.onChange.read(reader);
                }
            }
            if (setIsUpdating) {
                setIsUpdating(true);
            }
            editor.changeViewZones(a => { for (const id of changeSummary.zoneIds) {
                a.layoutZone(id);
            } });
            if (setIsUpdating) {
                setIsUpdating(false);
            }
        }));
    }));
    store.add({
        dispose() {
            if (setIsUpdating) {
                setIsUpdating(true);
            }
            editor.changeViewZones(a => { for (const id of lastViewZoneIds) {
                a.removeZone(id);
            } });
            zoneIds?.clear();
            if (setIsUpdating) {
                setIsUpdating(false);
            }
        }
    });
    return store;
}
export class DisposableCancellationTokenSource extends CancellationTokenSource {
    dispose() {
        super.dispose(true);
    }
}
export function translatePosition(posInOriginal, mappings) {
    const mapping = findLast(mappings, m => m.original.startLineNumber <= posInOriginal.lineNumber);
    if (!mapping) {
        // No changes before the position
        return Range.fromPositions(posInOriginal);
    }
    if (mapping.original.endLineNumberExclusive <= posInOriginal.lineNumber) {
        const newLineNumber = posInOriginal.lineNumber - mapping.original.endLineNumberExclusive + mapping.modified.endLineNumberExclusive;
        return Range.fromPositions(new Position(newLineNumber, posInOriginal.column));
    }
    if (!mapping.innerChanges) {
        // Only for legacy algorithm
        return Range.fromPositions(new Position(mapping.modified.startLineNumber, 1));
    }
    const innerMapping = findLast(mapping.innerChanges, m => m.originalRange.getStartPosition().isBeforeOrEqual(posInOriginal));
    if (!innerMapping) {
        const newLineNumber = posInOriginal.lineNumber - mapping.original.startLineNumber + mapping.modified.startLineNumber;
        return Range.fromPositions(new Position(newLineNumber, posInOriginal.column));
    }
    if (innerMapping.originalRange.containsPosition(posInOriginal)) {
        return innerMapping.modifiedRange;
    }
    else {
        const l = lengthBetweenPositions(innerMapping.originalRange.getEndPosition(), posInOriginal);
        return Range.fromPositions(l.addToPosition(innerMapping.modifiedRange.getEndPosition()));
    }
}
function lengthBetweenPositions(position1, position2) {
    if (position1.lineNumber === position2.lineNumber) {
        return new TextLength(0, position2.column - position1.column);
    }
    else {
        return new TextLength(position2.lineNumber - position1.lineNumber, position2.column - 1);
    }
}
export function filterWithPrevious(arr, filter) {
    let prev;
    return arr.filter(cur => {
        const result = filter(cur, prev);
        prev = cur;
        return result;
    });
}
export class RefCounted {
    static create(value, debugOwner = undefined) {
        return new BaseRefCounted(value, value, debugOwner);
    }
    static createWithDisposable(value, disposable, debugOwner = undefined) {
        const store = new DisposableStore();
        store.add(disposable);
        store.add(value);
        return new BaseRefCounted(value, store, debugOwner);
    }
    static createOfNonDisposable(value, disposable, debugOwner = undefined) {
        return new BaseRefCounted(value, disposable, debugOwner);
    }
}
class BaseRefCounted extends RefCounted {
    constructor(object, _disposable, _debugOwner) {
        super();
        this.object = object;
        this._disposable = _disposable;
        this._debugOwner = _debugOwner;
        this._refCount = 1;
        this._isDisposed = false;
        this._owners = [];
        if (_debugOwner) {
            this._addOwner(_debugOwner);
        }
    }
    _addOwner(debugOwner) {
        if (debugOwner) {
            this._owners.push(debugOwner);
        }
    }
    createNewRef(debugOwner) {
        this._refCount++;
        if (debugOwner) {
            this._addOwner(debugOwner);
        }
        return new ClonedRefCounted(this, debugOwner);
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        this._decreaseRefCount(this._debugOwner);
    }
    _decreaseRefCount(debugOwner) {
        this._refCount--;
        if (this._refCount === 0) {
            this._disposable.dispose();
        }
        if (debugOwner) {
            const idx = this._owners.indexOf(debugOwner);
            if (idx !== -1) {
                this._owners.splice(idx, 1);
            }
        }
    }
}
class ClonedRefCounted extends RefCounted {
    constructor(_base, _debugOwner) {
        super();
        this._base = _base;
        this._debugOwner = _debugOwner;
        this._isDisposed = false;
    }
    get object() { return this._base.object; }
    createNewRef(debugOwner) {
        return this._base.createNewRef(debugOwner);
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        this._base._decreaseRefCount(this._debugOwner);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUEyQixZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxSCxPQUFPLEVBQTJELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVNLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWhFLE1BQU0sVUFBVSxXQUFXLENBQUksSUFBa0IsRUFBRSxJQUFrQixFQUFFLFdBQStCLEVBQUUsT0FBNEI7SUFDbkksSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBUSxFQUFFLENBQUM7SUFDdkIsSUFBSSxDQUFDLEdBQUcs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