/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BrowserFeatures } from '../../../base/browser/canIUse.js';
import * as dom from '../../../base/browser/dom.js';
import { EventType, Gesture } from '../../../base/browser/touch.js';
import { mainWindow } from '../../../base/browser/window.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import { MouseHandler } from './mouseHandler.js';
import { EditorMouseEvent, EditorPointerEventFactory } from '../editorDom.js';
import { TextAreaSyntethicEvents } from './editContext/textArea/textAreaEditContextInput.js';
/**
 * Currently only tested on iOS 13/ iPadOS.
 */
export class PointerEventHandler extends MouseHandler {
    constructor(context, viewController, viewHelper) {
        super(context, viewController, viewHelper);
        this._register(Gesture.addTarget(this.viewHelper.linesContentDomNode));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Tap, (e) => this.onTap(e)));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Change, (e) => this.onChange(e)));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Contextmenu, (e) => this._onContextMenu(new EditorMouseEvent(e, false, this.viewHelper.viewDomNode), false)));
        this._lastPointerType = 'mouse';
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, 'pointerdown', (e) => {
            const pointerType = e.pointerType;
            if (pointerType === 'mouse') {
                this._lastPointerType = 'mouse';
                return;
            }
            else if (pointerType === 'touch') {
                this._lastPointerType = 'touch';
            }
            else {
                this._lastPointerType = 'pen';
            }
        }));
        // PonterEvents
        const pointerEvents = new EditorPointerEventFactory(this.viewHelper.viewDomNode);
        this._register(pointerEvents.onPointerMove(this.viewHelper.viewDomNode, (e) => this._onMouseMove(e)));
        this._register(pointerEvents.onPointerUp(this.viewHelper.viewDomNode, (e) => this._onMouseUp(e)));
        this._register(pointerEvents.onPointerLeave(this.viewHelper.viewDomNode, (e) => this._onMouseLeave(e)));
        this._register(pointerEvents.onPointerDown(this.viewHelper.viewDomNode, (e, pointerId) => this._onMouseDown(e, pointerId)));
    }
    onTap(event) {
        if (!event.initialTarget || !this.viewHelper.linesContentDomNode.contains(event.initialTarget)) {
            return;
        }
        event.preventDefault();
        this.viewHelper.focusTextArea();
        this._dispatchGesture(event, /*inSelectionMode*/ false);
    }
    onChange(event) {
        if (this._lastPointerType === 'touch') {
            this._context.viewModel.viewLayout.deltaScrollNow(-event.translationX, -event.translationY);
        }
        if (this._lastPointerType === 'pen') {
            this._dispatchGesture(event, /*inSelectionMode*/ true);
        }
    }
    _dispatchGesture(event, inSelectionMode) {
        const target = this._createMouseTarget(new EditorMouseEvent(event, false, this.viewHelper.viewDomNode), false);
        if (target.position) {
            this.viewController.dispatchMouse({
                position: target.position,
                mouseColumn: target.position.column,
                startedOnLineNumbers: false,
                revealType: 1 /* NavigationCommandRevealType.Minimal */,
                mouseDownCount: event.tapCount,
                inSelectionMode,
                altKey: false,
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
                leftButton: false,
                middleButton: false,
                onInjectedText: target.type === 6 /* MouseTargetType.CONTENT_TEXT */ && target.detail.injectedText !== null
            });
        }
    }
    _onMouseDown(e, pointerId) {
        if (e.browserEvent.pointerType === 'touch') {
            return;
        }
        super._onMouseDown(e, pointerId);
    }
}
class TouchHandler extends MouseHandler {
    constructor(context, viewController, viewHelper) {
        super(context, viewController, viewHelper);
        this._register(Gesture.addTarget(this.viewHelper.linesContentDomNode));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Tap, (e) => this.onTap(e)));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Change, (e) => this.onChange(e)));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Contextmenu, (e) => this._onContextMenu(new EditorMouseEvent(e, false, this.viewHelper.viewDomNode), false)));
    }
    onTap(event) {
        event.preventDefault();
        this.viewHelper.focusTextArea();
        const target = this._createMouseTarget(new EditorMouseEvent(event, false, this.viewHelper.viewDomNode), false);
        if (target.position) {
            // Send the tap event also to the <textarea> (for input purposes)
            const event = document.createEvent('CustomEvent');
            event.initEvent(TextAreaSyntethicEvents.Tap, false, true);
            this.viewHelper.dispatchTextAreaEvent(event);
            this.viewController.moveTo(target.position, 1 /* NavigationCommandRevealType.Minimal */);
        }
    }
    onChange(e) {
        this._context.viewModel.viewLayout.deltaScrollNow(-e.translationX, -e.translationY);
    }
}
export class PointerHandler extends Disposable {
    constructor(context, viewController, viewHelper) {
        super();
        const isPhone = platform.isIOS || (platform.isAndroid && platform.isMobile);
        if (isPhone && BrowserFeatures.pointerEvents) {
            this.handler = this._register(new PointerEventHandler(context, viewController, viewHelper));
        }
        else if (mainWindow.TouchEvent) {
            this.handler = this._register(new TouchHandler(context, viewController, viewHelper));
        }
        else {
            this.handler = this._register(new MouseHandler(context, viewController, viewHelper));
        }
    }
    getTargetAtClientPoint(clientX, clientY) {
        return this.handler.getTargetAtClientPoint(clientX, clientY);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9pbnRlckhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9wb2ludGVySGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkUsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBZ0IsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUF5QixZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUd4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUc5RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUU3Rjs7R0FFRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxZQUFZO0lBRXBELFlBQVksT0FBb0IsRUFBRSxjQUE4QixFQUFFLFVBQWlDO1FBQ2xHLEtBQUssQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRTNDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENB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