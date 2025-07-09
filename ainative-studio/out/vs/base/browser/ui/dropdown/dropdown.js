/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, addDisposableListener, append, EventHelper, EventType, isMouseEvent } from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { EventType as GestureEventType, Gesture } from '../../touch.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { ActionRunner } from '../../../common/actions.js';
import { Emitter } from '../../../common/event.js';
import './dropdown.css';
class BaseDropdown extends ActionRunner {
    constructor(container, options) {
        super();
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._element = append(container, $('.monaco-dropdown'));
        this._label = append(this._element, $('.dropdown-label'));
        let labelRenderer = options.labelRenderer;
        if (!labelRenderer) {
            labelRenderer = (container) => {
                container.textContent = options.label || '';
                return null;
            };
        }
        for (const event of [EventType.CLICK, EventType.MOUSE_DOWN, GestureEventType.Tap]) {
            this._register(addDisposableListener(this.element, event, e => EventHelper.stop(e, true))); // prevent default click behaviour to trigger
        }
        for (const event of [EventType.MOUSE_DOWN, GestureEventType.Tap]) {
            this._register(addDisposableListener(this._label, event, e => {
                if (isMouseEvent(e) && (e.detail > 1 || e.button !== 0)) {
                    // prevent right click trigger to allow separate context menu (https://github.com/microsoft/vscode/issues/151064)
                    // prevent multiple clicks to open multiple context menus (https://github.com/microsoft/vscode/issues/41363)
                    return;
                }
                if (this.visible) {
                    this.hide();
                }
                else {
                    this.show();
                }
            }));
        }
        this._register(addDisposableListener(this._label, EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                EventHelper.stop(e, true); // https://github.com/microsoft/vscode/issues/57997
                if (this.visible) {
                    this.hide();
                }
                else {
                    this.show();
                }
            }
        }));
        const cleanupFn = labelRenderer(this._label);
        if (cleanupFn) {
            this._register(cleanupFn);
        }
        this._register(Gesture.addTarget(this._label));
    }
    get element() {
        return this._element;
    }
    get label() {
        return this._label;
    }
    set tooltip(tooltip) {
        if (this._label) {
            if (!this.hover && tooltip !== '') {
                this.hover = this._register(getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this._label, tooltip));
            }
            else if (this.hover) {
                this.hover.update(tooltip);
            }
        }
    }
    show() {
        if (!this.visible) {
            this.visible = true;
            this._onDidChangeVisibility.fire(true);
        }
    }
    hide() {
        if (this.visible) {
            this.visible = false;
            this._onDidChangeVisibility.fire(false);
        }
    }
    isVisible() {
        return !!this.visible;
    }
    onEvent(_e, activeElement) {
        this.hide();
    }
    dispose() {
        super.dispose();
        this.hide();
        if (this.boxContainer) {
            this.boxContainer.remove();
            this.boxContainer = undefined;
        }
        if (this.contents) {
            this.contents.remove();
            this.contents = undefined;
        }
        if (this._label) {
            this._label.remove();
            this._label = undefined;
        }
    }
}
export function isActionProvider(obj) {
    const candidate = obj;
    return typeof candidate?.getActions === 'function';
}
export class DropdownMenu extends BaseDropdown {
    constructor(container, _options) {
        super(container, _options);
        this._options = _options;
        this._actions = [];
        this.actions = _options.actions || [];
    }
    set menuOptions(options) {
        this._menuOptions = options;
    }
    get menuOptions() {
        return this._menuOptions;
    }
    get actions() {
        if (this._options.actionProvider) {
            return this._options.actionProvider.getActions();
        }
        return this._actions;
    }
    set actions(actions) {
        this._actions = actions;
    }
    show() {
        super.show();
        this.element.classList.add('active');
        this._options.contextMenuProvider.showContextMenu({
            getAnchor: () => this.element,
            getActions: () => this.actions,
            getActionsContext: () => this.menuOptions ? this.menuOptions.context : null,
            getActionViewItem: (action, options) => this.menuOptions && this.menuOptions.actionViewItemProvider ? this.menuOptions.actionViewItemProvider(action, options) : undefined,
            getKeyBinding: action => this.menuOptions && this.menuOptions.getKeyBinding ? this.menuOptions.getKeyBinding(action) : undefined,
            getMenuClassName: () => this._options.menuClassName || '',
            onHide: () => this.onHide(),
            actionRunner: this.menuOptions ? this.menuOptions.actionRunner : undefined,
            anchorAlignment: this.menuOptions ? this.menuOptions.anchorAlignment : 0 /* AnchorAlignment.LEFT */,
            domForShadowRoot: this._options.menuAsChild ? this.element : undefined,
            skipTelemetry: this._options.skipTelemetry
        });
    }
    hide() {
        super.hide();
    }
    onHide() {
        this.hide();
        this.element.classList.remove('active');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2Ryb3Bkb3duL2Ryb3Bkb3duLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLElBQUksZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFHeEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0UsT0FBTyxFQUFFLFlBQVksRUFBVyxNQUFNLDRCQUE0QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUduRCxPQUFPLGdCQUFnQixDQUFDO0FBV3hCLE1BQU0sWUFBYSxTQUFRLFlBQVk7SUFZdEMsWUFBWSxTQUFzQixFQUFFLE9BQTZCO1FBQ2hFLEtBQUssRUFBRSxDQUFDO1FBTkQsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUM7UUFDL0QsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztRQU9sRSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUV6RCxJQUFJLENBQUMsTUFBTSxHQUFHLE1B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