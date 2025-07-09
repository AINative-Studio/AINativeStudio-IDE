/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditContext } from './editContextFactory.js';
const COLOR_FOR_CONTROL_BOUNDS = 'blue';
const COLOR_FOR_SELECTION_BOUNDS = 'red';
const COLOR_FOR_CHARACTER_BOUNDS = 'green';
export class DebugEditContext {
    constructor(window, options) {
        this._isDebugging = true;
        this._controlBounds = null;
        this._selectionBounds = null;
        this._characterBounds = null;
        this._ontextupdateWrapper = new EventListenerWrapper('textupdate', this);
        this._ontextformatupdateWrapper = new EventListenerWrapper('textformatupdate', this);
        this._oncharacterboundsupdateWrapper = new EventListenerWrapper('characterboundsupdate', this);
        this._oncompositionstartWrapper = new EventListenerWrapper('compositionstart', this);
        this._oncompositionendWrapper = new EventListenerWrapper('compositionend', this);
        this._listenerMap = new Map();
        this._disposables = [];
        this._editContext = EditContext.create(window, options);
    }
    get text() {
        return this._editContext.text;
    }
    get selectionStart() {
        return this._editContext.selectionStart;
    }
    get selectionEnd() {
        return this._editContext.selectionEnd;
    }
    get characterBoundsRangeStart() {
        return this._editContext.characterBoundsRangeStart;
    }
    updateText(rangeStart, rangeEnd, text) {
        this._editContext.updateText(rangeStart, rangeEnd, text);
        this.renderDebug();
    }
    updateSelection(start, end) {
        this._editContext.updateSelection(start, end);
        this.renderDebug();
    }
    updateControlBounds(controlBounds) {
        this._editContext.updateControlBounds(controlBounds);
        this._controlBounds = controlBounds;
        this.renderDebug();
    }
    updateSelectionBounds(selectionBounds) {
        this._editContext.updateSelectionBounds(selectionBounds);
        this._selectionBounds = selectionBounds;
        this.renderDebug();
    }
    updateCharacterBounds(rangeStart, characterBounds) {
        this._editContext.updateCharacterBounds(rangeStart, characterBounds);
        this._characterBounds = { rangeStart, characterBounds };
        this.renderDebug();
    }
    attachedElements() {
        return this._editContext.attachedElements();
    }
    characterBounds() {
        return this._editContext.characterBounds();
    }
    get ontextupdate() { return this._ontextupdateWrapper.eventHandler; }
    set ontextupdate(value) { this._ontextupdateWrapper.eventHandler = value; }
    get ontextformatupdate() { return this._ontextformatupdateWrapper.eventHandler; }
    set ontextformatupdate(value) { this._ontextformatupdateWrapper.eventHandler = value; }
    get oncharacterboundsupdate() { return this._oncharacterboundsupdateWrapper.eventHandler; }
    set oncharacterboundsupdate(value) { this._oncharacterboundsupdateWrapper.eventHandler = value; }
    get oncompositionstart() { return this._oncompositionstartWrapper.eventHandler; }
    set oncompositionstart(value) { this._oncompositionstartWrapper.eventHandler = value; }
    get oncompositionend() { return this._oncompositionendWrapper.eventHandler; }
    set oncompositionend(value) { this._oncompositionendWrapper.eventHandler = value; }
    addEventListener(type, listener, options) {
        if (!listener) {
            return;
        }
        const debugListener = (event) => {
            if (this._isDebugging) {
                this.renderDebug();
                console.log(`DebugEditContex.on_${type}`, event);
            }
            if (typeof listener === 'function') {
                listener.call(this, event);
            }
            else if (typeof listener === 'object' && 'handleEvent' in listener) {
                listener.handleEvent(event);
            }
        };
        this._listenerMap.set(listener, debugListener);
        this._editContext.addEventListener(type, debugListener, options);
        this.renderDebug();
    }
    removeEventListener(type, listener, options) {
        if (!listener) {
            return;
        }
        const debugListener = this._listenerMap.get(listener);
        if (debugListener) {
            this._editContext.removeEventListener(type, debugListener, options);
            this._listenerMap.delete(listener);
        }
        this.renderDebug();
    }
    dispatchEvent(event) {
        return this._editContext.dispatchEvent(event);
    }
    startDebugging() {
        this._isDebugging = true;
        this.renderDebug();
    }
    endDebugging() {
        this._isDebugging = false;
        this.renderDebug();
    }
    renderDebug() {
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
        if (!this._isDebugging || this._listenerMap.size === 0) {
            return;
        }
        if (this._controlBounds) {
            this._disposables.push(createRect(this._controlBounds, COLOR_FOR_CONTROL_BOUNDS));
        }
        if (this._selectionBounds) {
            this._disposables.push(createRect(this._selectionBounds, COLOR_FOR_SELECTION_BOUNDS));
        }
        if (this._characterBounds) {
            for (const rect of this._characterBounds.characterBounds) {
                this._disposables.push(createRect(rect, COLOR_FOR_CHARACTER_BOUNDS));
            }
        }
        this._disposables.push(createDiv(this._editContext.text, this._editContext.selectionStart, this._editContext.selectionEnd));
    }
}
function createDiv(text, selectionStart, selectionEnd) {
    const ret = document.createElement('div');
    ret.className = 'debug-rect-marker';
    ret.style.position = 'absolute';
    ret.style.zIndex = '999999999';
    ret.style.bottom = '50px';
    ret.style.left = '60px';
    ret.style.backgroundColor = 'white';
    ret.style.border = '1px solid black';
    ret.style.padding = '5px';
    ret.style.whiteSpace = 'pre';
    ret.style.font = '12px monospace';
    ret.style.pointerEvents = 'none';
    const before = text.substring(0, selectionStart);
    const selected = text.substring(selectionStart, selectionEnd) || '|';
    const after = text.substring(selectionEnd) + ' ';
    const beforeNode = document.createTextNode(before);
    ret.appendChild(beforeNode);
    const selectedNode = document.createElement('span');
    selectedNode.style.backgroundColor = 'yellow';
    selectedNode.appendChild(document.createTextNode(selected));
    selectedNode.style.minWidth = '2px';
    selectedNode.style.minHeight = '16px';
    ret.appendChild(selectedNode);
    const afterNode = document.createTextNode(after);
    ret.appendChild(afterNode);
    // eslint-disable-next-line no-restricted-syntax
    document.body.appendChild(ret);
    return {
        dispose: () => {
            ret.remove();
        }
    };
}
function createRect(rect, color) {
    const ret = document.createElement('div');
    ret.className = 'debug-rect-marker';
    ret.style.position = 'absolute';
    ret.style.zIndex = '999999999';
    ret.style.outline = `2px solid ${color}`;
    ret.style.pointerEvents = 'none';
    ret.style.top = rect.top + 'px';
    ret.style.left = rect.left + 'px';
    ret.style.width = rect.width + 'px';
    ret.style.height = rect.height + 'px';
    // eslint-disable-next-line no-restricted-syntax
    document.body.appendChild(ret);
    return {
        dispose: () => {
            ret.remove();
        }
    };
}
class EventListenerWrapper {
    constructor(_eventType, _target) {
        this._eventType = _eventType;
        this._target = _target;
        this._eventHandler = null;
    }
    get eventHandler() {
        return this._eventHandler;
    }
    set eventHandler(value) {
        if (this._eventHandler) {
            this._target.removeEventListener(this._eventType, this._eventHandler);
        }
        this._eventHandler = value;
        if (value) {
            this._target.addEventListener(this._eventType, value);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFZGl0Q29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL2VkaXRDb250ZXh0L25hdGl2ZS9kZWJ1Z0VkaXRDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RCxNQUFNLHdCQUF3QixHQUFHLE1BQU0sQ0FBQztBQUN4QyxNQUFNLDBCQUEwQixHQUFHLEtBQUssQ0FBQztBQUN6QyxNQUFNLDBCQUEwQixHQUFHLE9BQU8sQ0FBQztBQUUzQyxNQUFNLE9BQU8sZ0JBQWdCO0lBUTVCLFlBQVksTUFBYyxFQUFFLE9BQXFDO1FBUHpELGlCQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLG1CQUFjLEdBQW1CLElBQUksQ0FBQztRQUN0QyxxQkFBZ0IsR0FBbUIsSUFBSSxDQUFDO1FBQ3hDLHFCQUFnQixHQUE4RCxJQUFJLENBQUM7UUF1RDFFLHlCQUFvQixHQUFHLElBQUksb0JBQW9CLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BFLCtCQUEwQixHQUFHLElBQUksb0JBQW9CLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEYsb0NBQStCLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRiwrQkFBMEIsR0FBRyxJQUFJLG9CQUFvQixDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hGLDZCQUF3QixHQUFHLElBQUksb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFjNUUsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBMEUsQ0FBQztRQThDMUcs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