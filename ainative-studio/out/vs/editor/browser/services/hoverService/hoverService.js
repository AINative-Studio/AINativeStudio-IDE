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
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { editorHoverBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { HoverWidget } from './hoverWidget.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { addDisposableListener, EventType, getActiveElement, isAncestorOfActiveElement, isAncestor, getWindow, isHTMLElement, isEditableElement } from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ContextViewHandler } from '../../../../platform/contextview/browser/contextViewService.js';
import { ManagedHoverWidget } from './updatableHoverWidget.js';
import { timeout, TimeoutTimer } from '../../../../base/common/async.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isNumber } from '../../../../base/common/types.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
let HoverService = class HoverService extends Disposable {
    constructor(_instantiationService, _configurationService, contextMenuService, _keybindingService, _layoutService, _accessibilityService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._keybindingService = _keybindingService;
        this._layoutService = _layoutService;
        this._accessibilityService = _accessibilityService;
        this._currentDelayedHoverWasShown = false;
        this._delayedHovers = new Map();
        this._managedHovers = new Map();
        this._register(contextMenuService.onDidShowContextMenu(() => this.hideHover()));
        this._contextViewHandler = this._register(new ContextViewHandler(this._layoutService));
        this._register(KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: 'workbench.action.showHover',
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ - 1,
            when: EditorContextKeys.editorTextFocus.negate(),
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
            handler: () => { this._showAndFocusHoverForActiveElement(); },
        }));
    }
    showInstantHover(options, focus, skipLastFocusedUpdate, dontShow) {
        const hover = this._createHover(options, skipLastFocusedUpdate);
        if (!hover) {
            return undefined;
        }
        this._showHover(hover, options, focus);
        return hover;
    }
    showDelayedHover(options, lifecycleOptions) {
        // Set `id` to default if it's undefined
        if (options.id === undefined) {
            options.id = getHoverIdFromContent(options.content);
        }
        if (!this._currentDelayedHover || this._currentDelayedHoverWasShown) {
            // Current hover is locked, reject
            if (this._currentHover?.isLocked) {
                return undefined;
            }
            // Identity is the same, return current hover
            if (getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
                return this._currentHover;
            }
            // Check group identity, if it's the same skip the delay and show the hover immediately
            if (this._currentHover && !this._currentHover.isDisposed && this._currentDelayedHoverGroupId !== undefined && this._currentDelayedHoverGroupId === lifecycleOptions?.groupId) {
                return this.showInstantHover({
                    ...options,
                    appearance: {
                        ...options.appearance,
                        skipFadeInAnimation: true
                    }
                });
            }
        }
        else if (this._currentDelayedHover && getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
            // If the hover is the same but timeout is not finished yet, return the current hover
            return this._currentDelayedHover;
        }
        const hover = this._createHover(options, undefined);
        if (!hover) {
            this._currentDelayedHover = undefined;
            this._currentDelayedHoverWasShown = false;
            this._currentDelayedHoverGroupId = undefined;
            return undefined;
        }
        this._currentDelayedHover = hover;
        this._currentDelayedHoverWasShown = false;
        this._currentDelayedHoverGroupId = lifecycleOptions?.groupId;
        timeout(this._configurationService.getValue('workbench.hover.delay')).then(() => {
            if (hover && !hover.isDisposed) {
                this._currentDelayedHoverWasShown = true;
                this._showHover(hover, options);
            }
        });
        return hover;
    }
    setupDelayedHover(target, options, lifecycleOptions) {
        const resolveHoverOptions = () => ({
            ...typeof options === 'function' ? options() : options,
            target
        });
        return this._setupDelayedHover(target, resolveHoverOptions, lifecycleOptions);
    }
    setupDelayedHoverAtMouse(target, options, lifecycleOptions) {
        const resolveHoverOptions = (e) => ({
            ...typeof options === 'function' ? options() : options,
            target: {
                targetElements: [target],
                x: e !== undefined ? e.x + 10 : undefined,
            }
        });
        return this._setupDelayedHover(target, resolveHoverOptions, lifecycleOptions);
    }
    _setupDelayedHover(target, resolveHoverOptions, lifecycleOptions) {
        const store = new DisposableStore();
        store.add(addDisposableListener(target, EventType.MOUSE_OVER, e => {
            this.showDelayedHover(resolveHoverOptions(e), {
                groupId: lifecycleOptions?.groupId
            });
        }));
        if (lifecycleOptions?.setupKeyboardEvents) {
            store.add(addDisposableListener(target, EventType.KEY_DOWN, e => {
                const evt = new StandardKeyboardEvent(e);
                if (evt.equals(10 /* KeyCode.Space */) || evt.equals(3 /* KeyCode.Enter */)) {
                    this.showInstantHover(resolveHoverOptions(), true);
                }
            }));
        }
        this._delayedHovers.set(target, { show: (focus) => { this.showInstantHover(resolveHoverOptions(), focus); } });
        store.add(toDisposable(() => this._delayedHovers.delete(target)));
        return store;
    }
    _createHover(options, skipLastFocusedUpdate) {
        this._currentDelayedHover = undefined;
        if (this._currentHover?.isLocked) {
            return undefined;
        }
        // Set `id` to default if it's undefined
        if (options.id === undefined) {
            options.id = getHoverIdFromContent(options.content);
        }
        if (getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
            return undefined;
        }
        this._currentHoverOptions = options;
        this._lastHoverOptions = options;
        const trapFocus = options.trapFocus || this._accessibilityService.isScreenReaderOptimized();
        const activeElement = getActiveElement();
        // HACK, remove this check when #189076 is fixed
        if (!skipLastFocusedUpdate) {
            if (trapFocus && activeElement) {
                if (!activeElement.classList.contains('monaco-hover')) {
                    this._lastFocusedElementBeforeOpen = activeElement;
                }
            }
            else {
                this._lastFocusedElementBeforeOpen = undefined;
            }
        }
        const hoverDisposables = new DisposableStore();
        const hover = this._instantiationService.createInstance(HoverWidget, options);
        if (options.persistence?.sticky) {
            hover.isLocked = true;
        }
        // Adjust target position when a mouse event is provided as the hover position
        if (options.position?.hoverPosition && !isNumber(options.position.hoverPosition)) {
            options.target = {
                targetElements: isHTMLElement(options.target) ? [options.target] : options.target.targetElements,
                x: options.position.hoverPosition.x + 10
            };
        }
        hover.onDispose(() => {
            const hoverWasFocused = this._currentHover?.domNode && isAncestorOfActiveElement(this._currentHover.domNode);
            if (hoverWasFocused) {
                // Required to handle cases such as closing the hover with the escape key
                this._lastFocusedElementBeforeOpen?.focus();
            }
            // Only clear the current options if it's the current hover, the current options help
            // reduce flickering when the same hover is shown multiple times
            if (getHoverOptionsIdentity(this._currentHoverOptions) === getHoverOptionsIdentity(options)) {
                this.doHideHover();
            }
            hoverDisposables.dispose();
        }, undefined, hoverDisposables);
        // Set the container explicitly to enable aux window support
        if (!options.container) {
            const targetElement = isHTMLElement(options.target) ? options.target : options.target.targetElements[0];
            options.container = this._layoutService.getContainer(getWindow(targetElement));
        }
        hover.onRequestLayout(() => this._contextViewHandler.layout(), undefined, hoverDisposables);
        if (options.persistence?.sticky) {
            hoverDisposables.add(addDisposableListener(getWindow(options.container).document, EventType.MOUSE_DOWN, e => {
                if (!isAncestor(e.target, hover.domNode)) {
                    this.doHideHover();
                }
            }));
        }
        else {
            if ('targetElements' in options.target) {
                for (const element of options.target.targetElements) {
                    hoverDisposables.add(addDisposableListener(element, EventType.CLICK, () => this.hideHover()));
                }
            }
            else {
                hoverDisposables.add(addDisposableListener(options.target, EventType.CLICK, () => this.hideHover()));
            }
            const focusedElement = getActiveElement();
            if (focusedElement) {
                const focusedElementDocument = getWindow(focusedElement).document;
                hoverDisposables.add(addDisposableListener(focusedElement, EventType.KEY_DOWN, e => this._keyDown(e, hover, !!options.persistence?.hideOnKeyDown)));
                hoverDisposables.add(addDisposableListener(focusedElementDocument, EventType.KEY_DOWN, e => this._keyDown(e, hover, !!options.persistence?.hideOnKeyDown)));
                hoverDisposables.add(addDisposableListener(focusedElement, EventType.KEY_UP, e => this._keyUp(e, hover)));
                hoverDisposables.add(addDisposableListener(focusedElementDocument, EventType.KEY_UP, e => this._keyUp(e, hover)));
            }
        }
        if ('IntersectionObserver' in mainWindow) {
            const observer = new IntersectionObserver(e => this._intersectionChange(e, hover), { threshold: 0 });
            const firstTargetElement = 'targetElements' in options.target ? options.target.targetElements[0] : options.target;
            observer.observe(firstTargetElement);
            hoverDisposables.add(toDisposable(() => observer.disconnect()));
        }
        this._currentHover = hover;
        return hover;
    }
    _showHover(hover, options, focus) {
        this._contextViewHandler.showContextView(new HoverContextViewDelegate(hover, focus), options.container);
    }
    hideHover(force) {
        if ((!force && this._currentHover?.isLocked) || !this._currentHoverOptions) {
            return;
        }
        this.doHideHover();
    }
    doHideHover() {
        this._currentHover = undefined;
        this._currentHoverOptions = undefined;
        this._contextViewHandler.hideContextView();
    }
    _intersectionChange(entries, hover) {
        const entry = entries[entries.length - 1];
        if (!entry.isIntersecting) {
            hover.dispose();
        }
    }
    showAndFocusLastHover() {
        if (!this._lastHoverOptions) {
            return;
        }
        this.showInstantHover(this._lastHoverOptions, true, true);
    }
    _showAndFocusHoverForActiveElement() {
        // TODO: if hover is visible, focus it to avoid flickering
        let activeElement = getActiveElement();
        while (activeElement) {
            const hover = this._delayedHovers.get(activeElement) ?? this._managedHovers.get(activeElement);
            if (hover) {
                hover.show(true);
                return;
            }
            activeElement = activeElement.parentElement;
        }
    }
    _keyDown(e, hover, hideOnKeyDown) {
        if (e.key === 'Alt') {
            hover.isLocked = true;
            return;
        }
        const event = new StandardKeyboardEvent(e);
        const keybinding = this._keybindingService.resolveKeyboardEvent(event);
        if (keybinding.getSingleModifierDispatchChords().some(value => !!value) || this._keybindingService.softDispatch(event, event.target).kind !== 0 /* ResultKind.NoMatchingKb */) {
            return;
        }
        if (hideOnKeyDown && (!this._currentHoverOptions?.trapFocus || e.key !== 'Tab')) {
            this.hideHover();
            this._lastFocusedElementBeforeOpen?.focus();
        }
    }
    _keyUp(e, hover) {
        if (e.key === 'Alt') {
            hover.isLocked = false;
            // Hide if alt is released while the mouse is not over hover/target
            if (!hover.isMouseIn) {
                this.hideHover();
                this._lastFocusedElementBeforeOpen?.focus();
            }
        }
    }
    // TODO: Investigate performance of this function. There seems to be a lot of content created
    //       and thrown away on start up
    setupManagedHover(hoverDelegate, targetElement, content, options) {
        targetElement.setAttribute('custom-hover', 'true');
        if (targetElement.title !== '') {
            console.warn('HTML element already has a title attribute, which will conflict with the custom hover. Please remove the title attribute.');
            console.trace('Stack trace:', targetElement.title);
            targetElement.title = '';
        }
        let hoverPreparation;
        let hoverWidget;
        const hideHover = (disposeWidget, disposePreparation) => {
            const hadHover = hoverWidget !== undefined;
            if (disposeWidget) {
                hoverWidget?.dispose();
                hoverWidget = undefined;
            }
            if (disposePreparation) {
                hoverPreparation?.dispose();
                hoverPreparation = undefined;
            }
            if (hadHover) {
                hoverDelegate.onDidHideHover?.();
                hoverWidget = undefined;
            }
        };
        const triggerShowHover = (delay, focus, target, trapFocus) => {
            return new TimeoutTimer(async () => {
                if (!hoverWidget || hoverWidget.isDisposed) {
                    hoverWidget = new ManagedHoverWidget(hoverDelegate, target || targetElement, delay > 0);
                    await hoverWidget.update(typeof content === 'function' ? content() : content, focus, { ...options, trapFocus });
                }
            }, delay);
        };
        const store = new DisposableStore();
        let isMouseDown = false;
        store.add(addDisposableListener(targetElement, EventType.MOUSE_DOWN, () => {
            isMouseDown = true;
            hideHover(true, true);
        }, true));
        store.add(addDisposableListener(targetElement, EventType.MOUSE_UP, () => {
            isMouseDown = false;
        }, true));
        store.add(addDisposableListener(targetElement, EventType.MOUSE_LEAVE, (e) => {
            isMouseDown = false;
            hideHover(false, e.fromElement === targetElement);
        }, true));
        store.add(addDisposableListener(targetElement, EventType.MOUSE_OVER, (e) => {
            if (hoverPreparation) {
                return;
            }
            const mouseOverStore = new DisposableStore();
            const target = {
                targetElements: [targetElement],
                dispose: () => { }
            };
            if (hoverDelegate.placement === undefined || hoverDelegate.placement === 'mouse') {
                // track the mouse position
                const onMouseMove = (e) => {
                    target.x = e.x + 10;
                    if ((isHTMLElement(e.target)) && getHoverTargetElement(e.target, targetElement) !== targetElement) {
                        hideHover(true, true);
                    }
                };
                mouseOverStore.add(addDisposableListener(targetElement, EventType.MOUSE_MOVE, onMouseMove, true));
            }
            hoverPreparation = mouseOverStore;
            if ((isHTMLElement(e.target)) && getHoverTargetElement(e.target, targetElement) !== targetElement) {
                return; // Do not show hover when the mouse is over another hover target
            }
            mouseOverStore.add(triggerShowHover(typeof hoverDelegate.delay === 'function' ? hoverDelegate.delay(content) : hoverDelegate.delay, false, target));
        }, true));
        const onFocus = () => {
            if (isMouseDown || hoverPreparation) {
                return;
            }
            const target = {
                targetElements: [targetElement],
                dispose: () => { }
            };
            const toDispose = new DisposableStore();
            const onBlur = () => hideHover(true, true);
            toDispose.add(addDisposableListener(targetElement, EventType.BLUR, onBlur, true));
            toDispose.add(triggerShowHover(typeof hoverDelegate.delay === 'function' ? hoverDelegate.delay(content) : hoverDelegate.delay, false, target));
            hoverPreparation = toDispose;
        };
        // Do not show hover when focusing an input or textarea
        if (!isEditableElement(targetElement)) {
            store.add(addDisposableListener(targetElement, EventType.FOCUS, onFocus, true));
        }
        const hover = {
            show: focus => {
                hideHover(false, true); // terminate a ongoing mouse over preparation
                triggerShowHover(0, focus, undefined, focus); // show hover immediately
            },
            hide: () => {
                hideHover(true, true);
            },
            update: async (newContent, hoverOptions) => {
                content = newContent;
                await hoverWidget?.update(content, undefined, hoverOptions);
            },
            dispose: () => {
                this._managedHovers.delete(targetElement);
                store.dispose();
                hideHover(true, true);
            }
        };
        this._managedHovers.set(targetElement, hover);
        return hover;
    }
    showManagedHover(target) {
        const hover = this._managedHovers.get(target);
        if (hover) {
            hover.show(true);
        }
    }
    dispose() {
        this._managedHovers.forEach(hover => hover.dispose());
        super.dispose();
    }
};
HoverService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IContextMenuService),
    __param(3, IKeybindingService),
    __param(4, ILayoutService),
    __param(5, IAccessibilityService)
], HoverService);
export { HoverService };
function getHoverOptionsIdentity(options) {
    if (options === undefined) {
        return undefined;
    }
    return options?.id ?? options;
}
function getHoverIdFromContent(content) {
    if (isHTMLElement(content)) {
        return undefined;
    }
    if (typeof content === 'string') {
        return content.toString();
    }
    return content.value;
}
class HoverContextViewDelegate {
    get anchorPosition() {
        return this._hover.anchor;
    }
    constructor(_hover, _focus = false) {
        this._hover = _hover;
        this._focus = _focus;
        // Render over all other context views
        this.layer = 1;
    }
    render(container) {
        this._hover.render(container);
        if (this._focus) {
            this._hover.focus();
        }
        return this._hover;
    }
    getAnchor() {
        return {
            x: this._hover.x,
            y: this._hover.y
        };
    }
    layout() {
        this._hover.layout();
    }
}
function getHoverTargetElement(element, stopElement) {
    stopElement = stopElement ?? getWindow(element).document.body;
    while (!element.hasAttribute('custom-hover') && element !== stopElement) {
        element = element.parentElement;
    }
    return element;
}
registerSingleton(IHoverService, HoverService, 1 /* InstantiationType.Delayed */);
registerThemingParticipant((theme, collector) => {
    const hoverBorder = theme.getColor(editorHoverBorder);
    if (hoverBorder) {
        collector.addRule(`.monaco-workbench .workbench-hover .hover-row:not(:first-child):not(:empty) { border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
        collector.addRule(`.monaco-workbench .workbench-hover hr { border-top: 1px solid ${hoverBorder.transparent(0.5)}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3NlcnZpY2VzL2hvdmVyU2VydmljZS9ob3ZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFL0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pMLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRWxGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFB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