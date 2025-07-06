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
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import * as dom from '../../../../../base/browser/dom.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { convertBufferRangeToViewport } from './terminalLinkHelpers.js';
import { isMacintosh } from '../../../../../base/common/platform.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
let TerminalLink = class TerminalLink extends Disposable {
    get onInvalidated() { return this._onInvalidated.event; }
    get type() { return this._type; }
    constructor(_xterm, range, text, uri, parsedLink, actions, _viewportY, _activateCallback, _tooltipCallback, _isHighConfidenceLink, label, _type, _configurationService) {
        super();
        this._xterm = _xterm;
        this.range = range;
        this.text = text;
        this.uri = uri;
        this.parsedLink = parsedLink;
        this.actions = actions;
        this._viewportY = _viewportY;
        this._activateCallback = _activateCallback;
        this._tooltipCallback = _tooltipCallback;
        this._isHighConfidenceLink = _isHighConfidenceLink;
        this.label = label;
        this._type = _type;
        this._configurationService = _configurationService;
        this._tooltipScheduler = this._register(new MutableDisposable());
        this._hoverListeners = this._register(new MutableDisposable());
        this._onInvalidated = new Emitter();
        this.decorations = {
            pointerCursor: false,
            underline: this._isHighConfidenceLink
        };
    }
    activate(event, text) {
        this._activateCallback(event, text);
    }
    hover(event, text) {
        const w = dom.getWindow(event);
        const d = w.document;
        // Listen for modifier before handing it off to the hover to handle so it gets disposed correctly
        const hoverListeners = this._hoverListeners.value = new DisposableStore();
        hoverListeners.add(dom.addDisposableListener(d, 'keydown', e => {
            if (!e.repeat && this._isModifierDown(e)) {
                this._enableDecorations();
            }
        }));
        hoverListeners.add(dom.addDisposableListener(d, 'keyup', e => {
            if (!e.repeat && !this._isModifierDown(e)) {
                this._disableDecorations();
            }
        }));
        // Listen for when the terminal renders on the same line as the link
        hoverListeners.add(this._xterm.onRender(e => {
            const viewportRangeY = this.range.start.y - this._viewportY;
            if (viewportRangeY >= e.start && viewportRangeY <= e.end) {
                this._onInvalidated.fire();
            }
        }));
        // Only show the tooltip and highlight for high confidence links (not word/search workspace
        // links). Feedback was that this makes using the terminal overly noisy.
        if (this._isHighConfidenceLink) {
            this._tooltipScheduler.value = new RunOnceScheduler(() => {
                this._tooltipCallback(this, convertBufferRangeToViewport(this.range, this._viewportY), this._isHighConfidenceLink ? () => this._enableDecorations() : undefined, this._isHighConfidenceLink ? () => this._disableDecorations() : undefined);
                // Clear out scheduler until next hover event
                this._tooltipScheduler.clear();
            }, this._configurationService.getValue('workbench.hover.delay'));
            this._tooltipScheduler.value.schedule();
        }
        const origin = { x: event.pageX, y: event.pageY };
        hoverListeners.add(dom.addDisposableListener(d, dom.EventType.MOUSE_MOVE, e => {
            // Update decorations
            if (this._isModifierDown(e)) {
                this._enableDecorations();
            }
            else {
                this._disableDecorations();
            }
            // Reset the scheduler if the mouse moves too much
            if (Math.abs(e.pageX - origin.x) > w.devicePixelRatio * 2 || Math.abs(e.pageY - origin.y) > w.devicePixelRatio * 2) {
                origin.x = e.pageX;
                origin.y = e.pageY;
                this._tooltipScheduler.value?.schedule();
            }
        }));
    }
    leave() {
        this._hoverListeners.clear();
        this._tooltipScheduler.clear();
    }
    _enableDecorations() {
        if (!this.decorations.pointerCursor) {
            this.decorations.pointerCursor = true;
        }
        if (!this.decorations.underline) {
            this.decorations.underline = true;
        }
    }
    _disableDecorations() {
        if (this.decorations.pointerCursor) {
            this.decorations.pointerCursor = false;
        }
        if (this.decorations.underline !== this._isHighConfidenceLink) {
            this.decorations.underline = this._isHighConfidenceLink;
        }
    }
    _isModifierDown(event) {
        const multiCursorModifier = this._configurationService.getValue('editor.multiCursorModifier');
        if (multiCursorModifier === 'ctrlCmd') {
            return !!event.altKey;
        }
        return isMacintosh ? event.metaKey : event.ctrlKey;
    }
};
TerminalLink = __decorate([
    __param(12, IConfigurationService)
], TerminalLink);
export { TerminalLink };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMaW5rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBTS9GLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxVQUFVO0lBTzNDLElBQUksYUFBYSxLQUFrQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUV0RSxJQUFJLElBQUksS0FBdUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUVuRCxZQUNrQixNQUFnQixFQUN4QixLQUFtQixFQUNuQixJQUFZLEVBQ1osR0FBb0IsRUFDcEIsVUFBbUMsRUFDbkMsT0FBbUMsRUFDM0IsVUFBa0IsRUFDbEIsaUJBQWdGLEVBQ2hGLGdCQUFpSixFQUNqSixxQkFBOEIsRUFDdEMsS0FBeUIsRUFDakIsS0FBdUIsRUFDakIscUJBQTZEO1FB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