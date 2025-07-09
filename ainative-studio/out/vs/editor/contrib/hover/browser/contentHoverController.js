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
var ContentHoverController_1;
import { DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID, SHOW_OR_FOCUS_HOVER_ACTION_ID } from './hoverActionIds.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { InlineSuggestionHintsContentWidget } from '../../inlineCompletions/browser/hintsWidget/inlineCompletionsHintsWidget.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { isMousePositionWithinElement } from './hoverUtils.js';
import { ContentHoverWidgetWrapper } from './contentHoverWidgetWrapper.js';
import './hover.css';
import { Emitter } from '../../../../base/common/event.js';
import { isOnColorDecorator } from '../../colorPicker/browser/hoverColorPicker/hoverColorPicker.js';
// sticky hover widget which doesn't disappear on focus out and such
const _sticky = false;
let ContentHoverController = class ContentHoverController extends Disposable {
    static { ContentHoverController_1 = this; }
    static { this.ID = 'editor.contrib.contentHover'; }
    constructor(_editor, _instantiationService, _keybindingService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this._onHoverContentsChanged = this._register(new Emitter());
        this.onHoverContentsChanged = this._onHoverContentsChanged.event;
        this.shouldKeepOpenOnEditorMouseMoveOrLeave = false;
        this._listenersStore = new DisposableStore();
        this._isMouseDown = false;
        this._reactToEditorMouseMoveRunner = this._register(new RunOnceScheduler(() => {
            if (this._mouseMoveEvent) {
                this._reactToEditorMouseMove(this._mouseMoveEvent);
            }
        }, 0));
        this._hookListeners();
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(62 /* EditorOption.hover */)) {
                this._unhookListeners();
                this._hookListeners();
            }
        }));
    }
    static get(editor) {
        return editor.getContribution(ContentHoverController_1.ID);
    }
    _hookListeners() {
        const hoverOpts = this._editor.getOption(62 /* EditorOption.hover */);
        this._hoverSettings = {
            enabled: hoverOpts.enabled,
            sticky: hoverOpts.sticky,
            hidingDelay: hoverOpts.hidingDelay
        };
        if (!hoverOpts.enabled) {
            this._cancelSchedulerAndHide();
        }
        this._listenersStore.add(this._editor.onMouseDown((e) => this._onEditorMouseDown(e)));
        this._listenersStore.add(this._editor.onMouseUp(() => this._onEditorMouseUp()));
        this._listenersStore.add(this._editor.onMouseMove((e) => this._onEditorMouseMove(e)));
        this._listenersStore.add(this._editor.onKeyDown((e) => this._onKeyDown(e)));
        this._listenersStore.add(this._editor.onMouseLeave((e) => this._onEditorMouseLeave(e)));
        this._listenersStore.add(this._editor.onDidChangeModel(() => this._cancelSchedulerAndHide()));
        this._listenersStore.add(this._editor.onDidChangeModelContent(() => this._cancelScheduler()));
        this._listenersStore.add(this._editor.onDidScrollChange((e) => this._onEditorScrollChanged(e)));
    }
    _unhookListeners() {
        this._listenersStore.clear();
    }
    _cancelSchedulerAndHide() {
        this._cancelScheduler();
        this.hideContentHover();
    }
    _cancelScheduler() {
        this._mouseMoveEvent = undefined;
        this._reactToEditorMouseMoveRunner.cancel();
    }
    _onEditorScrollChanged(e) {
        if (e.scrollTopChanged || e.scrollLeftChanged) {
            this.hideContentHover();
        }
    }
    _onEditorMouseDown(mouseEvent) {
        this._isMouseDown = true;
        const shouldKeepHoverWidgetVisible = this._shouldKeepHoverWidgetVisible(mouseEvent);
        if (shouldKeepHoverWidgetVisible) {
            return;
        }
        this.hideContentHover();
    }
    _shouldKeepHoverWidgetVisible(mouseEvent) {
        return this._isMouseOnContentHoverWidget(mouseEvent) || this._isContentWidgetResizing() || isOnColorDecorator(mouseEvent);
    }
    _isMouseOnContentHoverWidget(mouseEvent) {
        if (!this._contentWidget) {
            return false;
        }
        return isMousePositionWithinElement(this._contentWidget.getDomNode(), mouseEvent.event.posx, mouseEvent.event.posy);
    }
    _onEditorMouseUp() {
        this._isMouseDown = false;
    }
    _onEditorMouseLeave(mouseEvent) {
        if (this.shouldKeepOpenOnEditorMouseMoveOrLeave) {
            return;
        }
        this._cancelScheduler();
        const shouldKeepHoverWidgetVisible = this._shouldKeepHoverWidgetVisible(mouseEvent);
        if (shouldKeepHoverWidgetVisible) {
            return;
        }
        if (_sticky) {
            return;
        }
        this.hideContentHover();
    }
    _shouldKeepCurrentHover(mouseEvent) {
        const contentWidget = this._contentWidget;
        if (!contentWidget) {
            return false;
        }
        const isHoverSticky = this._hoverSettings.sticky;
        const isMouseOnStickyContentHoverWidget = (mouseEvent, isHoverSticky) => {
            const isMouseOnContentHoverWidget = this._isMouseOnContentHoverWidget(mouseEvent);
            return isHoverSticky && isMouseOnContentHoverWidget;
        };
        const isMouseOnColorPickerOrChoosingColor = (mouseEvent) => {
            const isColorPickerVisible = contentWidget.isColorPickerVisible;
            const isMouseOnContentHoverWidget = this._isMouseOnContentHoverWidget(mouseEvent);
            const isMouseOnHoverWithColorPicker = isColorPickerVisible && isMouseOnContentHoverWidget;
            const isMaybeChoosingColor = isColorPickerVisible && this._isMouseDown;
            return isMouseOnHoverWithColorPicker || isMaybeChoosingColor;
        };
        // TODO@aiday-mar verify if the following is necessary code
        const isTextSelectedWithinContentHoverWidget = (mouseEvent, sticky) => {
            const view = mouseEvent.event.browserEvent.view;
            if (!view) {
                return false;
            }
            return sticky && contentWidget.containsNode(view.document.activeElement) && !view.getSelection()?.isCollapsed;
        };
        const isFocused = contentWidget.isFocused;
        const isResizing = contentWidget.isResizing;
        const isStickyAndVisibleFromKeyboard = this._hoverSettings.sticky && contentWidget.isVisibleFromKeyboard;
        return this.shouldKeepOpenOnEditorMouseMoveOrLeave
            || isFocused
            || isResizing
            || isStickyAndVisibleFromKeyboard
            || isMouseOnStickyContentHoverWidget(mouseEvent, isHoverSticky)
            || isMouseOnColorPickerOrChoosingColor(mouseEvent)
            || isTextSelectedWithinContentHoverWidget(mouseEvent, isHoverSticky);
    }
    _onEditorMouseMove(mouseEvent) {
        this._mouseMoveEvent = mouseEvent;
        const shouldKeepCurrentHover = this._shouldKeepCurrentHover(mouseEvent);
        if (shouldKeepCurrentHover) {
            this._reactToEditorMouseMoveRunner.cancel();
            return;
        }
        const shouldRescheduleHoverComputation = this._shouldRescheduleHoverComputation();
        if (shouldRescheduleHoverComputation) {
            if (!this._reactToEditorMouseMoveRunner.isScheduled()) {
                this._reactToEditorMouseMoveRunner.schedule(this._hoverSettings.hidingDelay);
            }
            return;
        }
        this._reactToEditorMouseMove(mouseEvent);
    }
    _shouldRescheduleHoverComputation() {
        const hidingDelay = this._hoverSettings.hidingDelay;
        const isContentHoverWidgetVisible = this._contentWidget?.isVisible ?? false;
        // If the mouse is not over the widget, and if sticky is on,
        // then give it a grace period before reacting to the mouse event
        return isContentHoverWidgetVisible && this._hoverSettings.sticky && hidingDelay > 0;
    }
    _reactToEditorMouseMove(mouseEvent) {
        if (this._hoverSettings.enabled) {
            const contentWidget = this._getOrCreateContentWidget();
            if (contentWidget.showsOrWillShow(mouseEvent)) {
                return;
            }
        }
        if (_sticky) {
            return;
        }
        this.hideContentHover();
    }
    _onKeyDown(e) {
        if (!this._contentWidget) {
            return;
        }
        const isPotentialKeyboardShortcut = this._isPotentialKeyboardShortcut(e);
        const isModifierKeyPressed = this._isModifierKeyPressed(e);
        if (isPotentialKeyboardShortcut || isModifierKeyPressed) {
            return;
        }
        if (this._contentWidget.isFocused && e.keyCode === 2 /* KeyCode.Tab */) {
            return;
        }
        this.hideContentHover();
    }
    _isPotentialKeyboardShortcut(e) {
        if (!this._editor.hasModel() || !this._contentWidget) {
            return false;
        }
        const resolvedKeyboardEvent = this._keybindingService.softDispatch(e, this._editor.getDomNode());
        const moreChordsAreNeeded = resolvedKeyboardEvent.kind === 1 /* ResultKind.MoreChordsNeeded */;
        const isHoverAction = resolvedKeyboardEvent.kind === 2 /* ResultKind.KbFound */
            && (resolvedKeyboardEvent.commandId === SHOW_OR_FOCUS_HOVER_ACTION_ID
                || resolvedKeyboardEvent.commandId === INCREASE_HOVER_VERBOSITY_ACTION_ID
                || resolvedKeyboardEvent.commandId === DECREASE_HOVER_VERBOSITY_ACTION_ID)
            && this._contentWidget.isVisible;
        return moreChordsAreNeeded || isHoverAction;
    }
    _isModifierKeyPressed(e) {
        return e.keyCode === 5 /* KeyCode.Ctrl */
            || e.keyCode === 6 /* KeyCode.Alt */
            || e.keyCode === 57 /* KeyCode.Meta */
            || e.keyCode === 4 /* KeyCode.Shift */;
    }
    hideContentHover() {
        if (_sticky) {
            return;
        }
        if (InlineSuggestionHintsContentWidget.dropDownVisible) {
            return;
        }
        this._contentWidget?.hide();
    }
    _getOrCreateContentWidget() {
        if (!this._contentWidget) {
            this._contentWidget = this._instantiationService.createInstance(ContentHoverWidgetWrapper, this._editor);
            this._listenersStore.add(this._contentWidget.onContentsChanged(() => this._onHoverContentsChanged.fire()));
        }
        return this._contentWidget;
    }
    showContentHover(range, mode, source, focus) {
        this._getOrCreateContentWidget().startShowingAtRange(range, mode, source, focus);
    }
    _isContentWidgetResizing() {
        return this._contentWidget?.widget.isResizing || false;
    }
    focusedHoverPartIndex() {
        return this._getOrCreateContentWidget().focusedHoverPartIndex();
    }
    doesHoverAtIndexSupportVerbosityAction(index, action) {
        return this._getOrCreateContentWidget().doesHoverAtIndexSupportVerbosityAction(index, action);
    }
    updateHoverVerbosityLevel(action, index, focus) {
        this._getOrCreateContentWidget().updateHoverVerbosityLevel(action, index, focus);
    }
    focus() {
        this._contentWidget?.focus();
    }
    focusHoverPartWithIndex(index) {
        this._contentWidget?.focusHoverPartWithIndex(index);
    }
    scrollUp() {
        this._contentWidget?.scrollUp();
    }
    scrollDown() {
        this._contentWidget?.scrollDown();
    }
    scrollLeft() {
        this._contentWidget?.scrollLeft();
    }
    scrollRight() {
        this._contentWidget?.scrollRight();
    }
    pageUp() {
        this._contentWidget?.pageUp();
    }
    pageDown() {
        this._contentWidget?.pageDown();
    }
    goToTop() {
        this._contentWidget?.goToTop();
    }
    goToBottom() {
        this._contentWidget?.goToBottom();
    }
    getWidgetContent() {
        return this._contentWidget?.getWidgetContent();
    }
    getAccessibleWidgetContent() {
        return this._contentWidget?.getAccessibleWidgetContent();
    }
    getAccessibleWidgetContentAtIndex(index) {
        return this._contentWidget?.getAccessibleWidgetContentAtIndex(index);
    }
    get isColorPickerVisible() {
        return this._contentWidget?.isColorPickerVisible;
    }
    get isHoverVisible() {
        return this._contentWidget?.isVisible;
    }
    dispose() {
        super.dispose();
        this._unhookListeners();
        this._listenersStore.dispose();
        this._contentWidget?.dispose();
    }
};
ContentHoverController = ContentHoverController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IKeybindingService)
], ContentHoverController);
export { ContentHoverController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2NvbnRlbnRIb3ZlckNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxrQ0FBa0MsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRTVJLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFNbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDakksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0QsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxhQUFhLENBQUM7QUFDckIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBR3BHLG9FQUFvRTtBQUNwRSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBRW5CO0FBUUssSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVOzthQUs5QixPQUFFLEdBQUcsNkJBQTZCLEFBQWhDLENBQWlDO0lBYzFELFlBQ2tCLE9BQW9CLEVBQ2QscUJBQTZELEVBQ2hFLGtCQUF1RDtRQUUzRSxLQUFLLEVBQUUsQ0FBQztRQUpTLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDRywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQy9DLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFwQjNELDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQy9ELDJCQUFzQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUM7UUFJckUsMkNBQXNDLEdBQVksS0FBSyxDQUFDO1FBRTlDLG9CQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQVFqRCxpQkFBWSxHQUFZLEtBQUssQ0FBQztRQVFyQyxJQUFJLENBQUMsNkJBQTZCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixDQUN2RSxHQUFHLEVBQUU7WUFDSixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNwRCxDQUFDO1FBQ0YsQ0FBQyxFQUFFLENBQUMsQ0FDSixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBNEIsRUFBRSxFQUFFO1lBQ3JGLElBQUksQ0FBQyxDQUFDLFVBQVUsNkJBQW9CLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN2QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQzdCLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBeUIsd0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbEYsQ0FBQztJQUVPLGNBQWM7UUFDckIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLDZCQUFvQixDQUFDO1FBQzdELElBQUksQ0FBQyxjQUFjLEdBQUc7WUFDckIsT0FBTyxFQUFFLFNBQVMsQ0FBQyxPQUFPO1lBQzFCLE1BQU0sRUFBRSxTQUFTLENBQUMsTUFBTTtZQUN4QixXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVc7U0FDbEMsQ0FBQztRQUNGLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDaEMsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBb0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBaUIsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQWUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRyxDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO1FBQ2pDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM3QyxDQUFDO0lBRU8sc0JBQXNCLENBQUMsQ0FBZTtRQUM3QyxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFVBQTZCO1FBQ3ZELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3BGLElBQUksNEJBQTRCLEVBQUUsQ0FBQztZQUNsQyxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFTyw2QkFBNkIsQ0FBQyxVQUFvQztRQUN6RSxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzSCxDQUFDO0lBRU8sNEJBQTRCLENBQUMsVUFBb0M7UUFDeEUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLDRCQUE0QixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNySCxDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO0lBQzNCLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxVQUFvQztRQUMvRCxJQUFJLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxDQUFDO1lBQ2pELE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDeEIsTUFBTSw0QkFBNEIsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEYsSUFBSSw0QkFBNEIsRUFBRSxDQUFDO1lBQ2xDLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVPLHVCQUF1QixDQUFDLFVBQTZCO1FBQzVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDMUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1FBQ2pELE1BQU0saUNBQWlDLEdBQUcsQ0FBQyxVQUE2QixFQUFFLGFBQXNCLEVBQVcsRUFBRTtZQUM1RyxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNsRixPQUFPLGFBQWEsSUFBSSwyQkFBMkIsQ0FBQztRQUNyRCxDQUFDLENBQUM7UUFDRixNQUFNLG1DQUFtQyxHQUFHLENBQUMsVUFBNkIsRUFBVyxFQUFFO1lBQ3RGLE1BQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUFDLG9CQUFvQixDQUFDO1lBQ2hFLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sNkJBQTZCLEdBQUcsb0JBQW9CLElBQUksMkJBQTJCLENBQUM7WUFDMUYsTUFBTSxvQkFBb0IsR0FBRyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3ZFLE9BQU8sNkJBQTZCLElBQUksb0JBQW9CLENBQUM7UUFDOUQsQ0FBQyxDQUFDO1FBQ0YsMkRBQTJEO1FBQzNELE1BQU0sc0NBQXNDLEdBQUcsQ0FBQyxVQUE2QixFQUFFLE1BQWUsRUFBVyxFQUFFO1lBQzFHLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztZQUNoRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBQ0QsT0FBTyxNQUFNLElBQUksYUFBYSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLFdBQVcsQ0FBQztRQUMvRyxDQUFDLENBQUM7UUFDRixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO1FBQzFDLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUM7UUFDNUMsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxhQUFhLENBQUMscUJBQXFCLENBQUM7UUFFekcsT0FBTyxJQUFJLENBQUMsc0NBQXNDO2VBQzlDLFNBQVM7ZUFDVCxVQUFVO2VBQ1YsOEJBQThCO2VBQzlCLGlDQUFpQyxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUM7ZUFDNUQsbUNBQW1DLENBQUMsVUFBVSxDQUFDO2VBQy9DLHNDQUFzQyxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRU8sa0JBQWtCLENBQUMsVUFBNkI7UUFDdkQsSUFBSSxDQUFDLGVBQWUsR0FBRyxVQUFVLENBQUM7UUFDbEMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEUsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1QyxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sZ0NBQWdDLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLENBQUM7UUFDbEYsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztnQkFDdkQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlFLENBQUM7WUFDRCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU8saUNBQWlDO1FBQ3hDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDO1FBQ3BELE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxTQUFTLElBQUksS0FBSyxDQUFDO1FBQzVFLDREQUE0RDtRQUM1RCxpRUFBaUU7UUFDakUsT0FBTywyQkFBMkIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxVQUE2QjtRQUM1RCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDakMsTUFBTSxhQUFhLEdBQThCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ2xGLElBQUksYUFBYSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUMvQyxPQUFPO1lBQ1IsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sVUFBVSxDQUFDLENBQWlCO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RSxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLDJCQUEyQixJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDekQsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxPQUFPLHdCQUFnQixFQUFFLENBQUM7WUFDaEUsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sNEJBQTRCLENBQUMsQ0FBaUI7UUFDckQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdEQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDakcsTUFBTSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLHdDQUFnQyxDQUFDO1FBQ3ZGLE1BQU0sYUFBYSxHQUFHLHFCQUFxQixDQUFDLElBQUksK0JBQXVCO2VBQ25FLENBQUMscUJBQXFCLENBQUMsU0FBUyxLQUFLLDZCQUE2QjttQkFDakUscUJBQXFCLENBQUMsU0FBUyxLQUFLLGtDQUFrQzttQkFDdEUscUJBQXFCLENBQUMsU0FBUyxLQUFLLGtDQUFrQyxDQUFDO2VBQ3hFLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO1FBQ2xDLE9BQU8sbUJBQW1CLElBQUksYUFBYSxDQUFDO0lBQzdDLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxDQUFpQjtRQUM5QyxPQUFPLENBQUMsQ0FBQyxPQUFPLHlCQUFpQjtlQUM3QixDQUFDLENBQUMsT0FBTyx3QkFBZ0I7ZUFDekIsQ0FBQyxDQUFDLE9BQU8sMEJBQWlCO2VBQzFCLENBQUMsQ0FBQyxPQUFPLDBCQUFrQixDQUFDO0lBQ2pDLENBQUM7SUFFTSxnQkFBZ0I7UUFDdEIsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxrQ0FBa0MsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN4RCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVHLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDNUIsQ0FBQztJQUVNLGdCQUFnQixDQUN0QixLQUFZLEVBQ1osSUFBb0IsRUFDcEIsTUFBd0IsRUFDeEIsS0FBYztRQUVkLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDO0lBQ3hELENBQUM7SUFFTSxxQkFBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQ2pFLENBQUM7SUFFTSxzQ0FBc0MsQ0FBQyxLQUFhLEVBQUUsTUFBNEI7UUFDeEYsT0FBTyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxzQ0FBc0MsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUVNLHlCQUF5QixDQUFDLE1BQTRCLEVBQUUsS0FBYSxFQUFFLEtBQWU7UUFDNUYsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVNLHVCQUF1QixDQUFDLEtBQWE7UUFDM0MsSUFBSSxDQUFDLGNBQWMsRUFBRSx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRU0sUUFBUTtRQUNkLElBQUksQ0FBQyxjQUFjLEVBQUUsUUFBUSxFQUFFLENBQUM7SUFDakMsQ0FBQztJQUVNLFVBQVU7UUFDaEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRU0sVUFBVTtRQUNoQixJQUFJLENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFTSxXQUFXO1FBQ2pCLElBQUksQ0FBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLENBQUM7SUFDcEMsQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFTSxRQUFRO1FBQ2QsSUFBSSxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVNLFVBQVU7UUFDaEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRU0sZ0JBQWdCO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO0lBQ2hELENBQUM7SUFFTSwwQkFBMEI7UUFDaEMsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLDBCQUEwQixFQUFFLENBQUM7SUFDMUQsQ0FBQztJQUVNLGlDQUFpQyxDQUFDLEtBQWE7UUFDckQsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFRCxJQUFXLG9CQUFvQjtRQUM5QixPQUFPLElBQUksQ0FBQyxjQUFjLEVBQUUsb0JBQW9CLENBQUM7SUFDbEQsQ0FBQztJQUVELElBQVcsY0FBYztRQUN4QixPQUFPLElBQUksQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDO0lBQ3ZDLENBQUM7SUFFZSxPQUFPO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUM7SUFDaEMsQ0FBQzs7QUF4Vlcsc0JBQXNCO0lBcUJoQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7R0F0QlIsc0JBQXNCLENBeVZsQyJ9