/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, addDisposableListener, EventType, getActiveElement, getWindow, isAncestor, isHTMLElement } from '../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { Menu } from '../../../base/browser/ui/menu/menu.js';
import { ActionRunner } from '../../../base/common/actions.js';
import { isCancellationError } from '../../../base/common/errors.js';
import { combinedDisposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { defaultMenuStyles } from '../../theme/browser/defaultStyles.js';
export class ContextMenuHandler {
    constructor(contextViewService, telemetryService, notificationService, keybindingService) {
        this.contextViewService = contextViewService;
        this.telemetryService = telemetryService;
        this.notificationService = notificationService;
        this.keybindingService = keybindingService;
        this.focusToReturn = null;
        this.lastContainer = null;
        this.block = null;
        this.blockDisposable = null;
        this.options = { blockMouse: true };
    }
    configure(options) {
        this.options = options;
    }
    showContextMenu(delegate) {
        const actions = delegate.getActions();
        if (!actions.length) {
            return; // Don't render an empty context menu
        }
        this.focusToReturn = getActiveElement();
        let menu;
        const shadowRootElement = isHTMLElement(delegate.domForShadowRoot) ? delegate.domForShadowRoot : undefined;
        this.contextViewService.showContextView({
            getAnchor: () => delegate.getAnchor(),
            canRelayout: false,
            anchorAlignment: delegate.anchorAlignment,
            anchorAxisAlignment: delegate.anchorAxisAlignment,
            layer: delegate.layer,
            render: (container) => {
                this.lastContainer = container;
                const className = delegate.getMenuClassName ? delegate.getMenuClassName() : '';
                if (className) {
                    container.className += ' ' + className;
                }
                // Render invisible div to block mouse interaction in the rest of the UI
                if (this.options.blockMouse) {
                    this.block = container.appendChild($('.context-view-block'));
                    this.block.style.position = 'fixed';
                    this.block.style.cursor = 'initial';
                    this.block.style.left = '0';
                    this.block.style.top = '0';
                    this.block.style.width = '100%';
                    this.block.style.height = '100%';
                    this.block.style.zIndex = '-1';
                    this.blockDisposable?.dispose();
                    this.blockDisposable = addDisposableListener(this.block, EventType.MOUSE_DOWN, e => e.stopPropagation());
                }
                const menuDisposables = new DisposableStore();
                const actionRunner = delegate.actionRunner || menuDisposables.add(new ActionRunner());
                actionRunner.onWillRun(evt => this.onActionRun(evt, !delegate.skipTelemetry), this, menuDisposables);
                actionRunner.onDidRun(this.onDidActionRun, this, menuDisposables);
                menu = new Menu(container, actions, {
                    actionViewItemProvider: delegate.getActionViewItem,
                    context: delegate.getActionsContext ? delegate.getActionsContext() : null,
                    actionRunner,
                    getKeyBinding: delegate.getKeyBinding ? delegate.getKeyBinding : action => this.keybindingService.lookupKeybinding(action.id)
                }, defaultMenuStyles);
                menu.onDidCancel(() => this.contextViewService.hideContextView(true), null, menuDisposables);
                menu.onDidBlur(() => this.contextViewService.hideContextView(true), null, menuDisposables);
                const targetWindow = getWindow(container);
                menuDisposables.add(addDisposableListener(targetWindow, EventType.BLUR, () => this.contextViewService.hideContextView(true)));
                menuDisposables.add(addDisposableListener(targetWindow, EventType.MOUSE_DOWN, (e) => {
                    if (e.defaultPrevented) {
                        return;
                    }
                    const event = new StandardMouseEvent(targetWindow, e);
                    let element = event.target;
                    // Don't do anything as we are likely creating a context menu
                    if (event.rightButton) {
                        return;
                    }
                    while (element) {
                        if (element === container) {
                            return;
                        }
                        element = element.parentElement;
                    }
                    this.contextViewService.hideContextView(true);
                }));
                return combinedDisposable(menuDisposables, menu);
            },
            focus: () => {
                menu?.focus(!!delegate.autoSelectFirstItem);
            },
            onHide: (didCancel) => {
                delegate.onHide?.(!!didCancel);
                if (this.block) {
                    this.block.remove();
                    this.block = null;
                }
                this.blockDisposable?.dispose();
                this.blockDisposable = null;
                if (!!this.lastContainer && (getActiveElement() === this.lastContainer || isAncestor(getActiveElement(), this.lastContainer))) {
                    this.focusToReturn?.focus();
                }
                this.lastContainer = null;
            }
        }, shadowRootElement, !!shadowRootElement);
    }
    onActionRun(e, logTelemetry) {
        if (logTelemetry) {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: 'contextMenu' });
        }
        this.contextViewService.hideContextView(false);
    }
    onDidActionRun(e) {
        if (e.error && !isCancellationError(e.error)) {
            this.notificationService.error(e.error);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dE1lbnVIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbnRleHR2aWV3L2Jyb3dzZXIvY29udGV4dE1lbnVIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDM0ksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQWtGLE1BQU0saUNBQWlDLENBQUM7QUFDL0ksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBS3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBT3pFLE1BQU0sT0FBTyxrQkFBa0I7SUFPOUIsWUFDUyxrQkFBdUMsRUFDdkMsZ0JBQW1DLEVBQ25DLG1CQUF5QyxFQUN6QyxpQkFBcUM7UUFIckMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN2QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ25DLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDekMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQVZ0QyxrQkFBYSxHQUF1QixJQUFJLENBQUM7UUFDekMsa0JBQWEsR0FBdUIsSUFBSSxDQUFDO1FBQ3pDLFVBQUssR0FBdUIsSUFBSSxD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