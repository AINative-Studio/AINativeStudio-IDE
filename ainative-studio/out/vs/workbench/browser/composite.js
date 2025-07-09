/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ActionRunner } from '../../base/common/actions.js';
import { Component } from '../common/component.js';
import { Emitter } from '../../base/common/event.js';
import { trackFocus } from '../../base/browser/dom.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { assertIsDefined } from '../../base/common/types.js';
/**
 * Composites are layed out in the sidebar and panel part of the workbench. At a time only one composite
 * can be open in the sidebar, and only one composite can be open in the panel.
 *
 * Each composite has a minimized representation that is good enough to provide some
 * information about the state of the composite data.
 *
 * The workbench will keep a composite alive after it has been created and show/hide it based on
 * user interaction. The lifecycle of a composite goes in the order create(), setVisible(true|false),
 * layout(), focus(), dispose(). During use of the workbench, a composite will often receive a setVisible,
 * layout and focus call, but only one create and dispose call.
 */
export class Composite extends Component {
    get onDidFocus() {
        if (!this._onDidFocus) {
            this._onDidFocus = this.registerFocusTrackEvents().onDidFocus;
        }
        return this._onDidFocus.event;
    }
    get onDidBlur() {
        if (!this._onDidBlur) {
            this._onDidBlur = this.registerFocusTrackEvents().onDidBlur;
        }
        return this._onDidBlur.event;
    }
    hasFocus() {
        return this._hasFocus;
    }
    registerFocusTrackEvents() {
        const container = assertIsDefined(this.getContainer());
        const focusTracker = this._register(trackFocus(container));
        const onDidFocus = this._onDidFocus = this._register(new Emitter());
        this._register(focusTracker.onDidFocus(() => {
            this._hasFocus = true;
            onDidFocus.fire();
        }));
        const onDidBlur = this._onDidBlur = this._register(new Emitter());
        this._register(focusTracker.onDidBlur(() => {
            this._hasFocus = false;
            onDidBlur.fire();
        }));
        return { onDidFocus, onDidBlur };
    }
    constructor(id, telemetryService, themeService, storageService) {
        super(id, themeService, storageService);
        this.telemetryService = telemetryService;
        this._onTitleAreaUpdate = this._register(new Emitter());
        this.onTitleAreaUpdate = this._onTitleAreaUpdate.event;
        this._hasFocus = false;
        this.visible = false;
    }
    getTitle() {
        return undefined;
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Called to create this composite on the provided parent. This method is only
     * called once during the lifetime of the workbench.
     * Note that DOM-dependent calculations should be performed from the setVisible()
     * call. Only then the composite will be part of the DOM.
     */
    create(parent) {
        this.parent = parent;
    }
    /**
     * Returns the container this composite is being build in.
     */
    getContainer() {
        return this.parent;
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Called to indicate that the composite has become visible or hidden. This method
     * is called more than once during workbench lifecycle depending on the user interaction.
     * The composite will be on-DOM if visible is set to true and off-DOM otherwise.
     *
     * Typically this operation should be fast though because setVisible might be called many times during a session.
     * If there is a long running operation it is fine to have it running in the background asyncly and return before.
     */
    setVisible(visible) {
        if (this.visible !== !!visible) {
            this.visible = visible;
        }
    }
    /**
     * Called when this composite should receive keyboard focus.
     */
    focus() {
        // Subclasses can implement
    }
    /**
     *
     * @returns the action runner for this composite
     */
    getMenuIds() {
        return [];
    }
    /**
     * Returns an array of actions to show in the action bar of the composite.
     */
    getActions() {
        return [];
    }
    /**
     * Returns an array of actions to show in the action bar of the composite
     * in a less prominent way then action from getActions.
     */
    getSecondaryActions() {
        return [];
    }
    /**
     * Returns an array of actions to show in the context menu of the composite
     */
    getContextMenuActions() {
        return [];
    }
    /**
     * For any of the actions returned by this composite, provide an IActionViewItem in
     * cases where the implementor of the composite wants to override the presentation
     * of an action. Returns undefined to indicate that the action is not rendered through
     * an action item.
     */
    getActionViewItem(action, options) {
        return undefined;
    }
    /**
     * Provide a context to be passed to the toolbar.
     */
    getActionsContext() {
        return null;
    }
    /**
     * Returns the instance of IActionRunner to use with this composite for the
     * composite tool bar.
     */
    getActionRunner() {
        if (!this.actionRunner) {
            this.actionRunner = this._register(new ActionRunner());
        }
        return this.actionRunner;
    }
    /**
     * Method for composite implementors to indicate to the composite container that the title or the actions
     * of the composite have changed. Calling this method will cause the container to ask for title (getTitle())
     * and actions (getActions(), getSecondaryActions()) if the composite is visible or the next time the composite
     * gets visible.
     */
    updateTitleArea() {
        this._onTitleAreaUpdate.fire();
    }
    /**
     * Returns true if this composite is currently visible and false otherwise.
     */
    isVisible() {
        return this.visible;
    }
    /**
     * Returns the underlying composite control or `undefined` if it is not accessible.
     */
    getControl() {
        return undefined;
    }
}
/**
 * A composite descriptor is a lightweight descriptor of a composite in the workbench.
 */
export class CompositeDescriptor {
    constructor(ctor, id, name, cssClass, order, requestedIndex) {
        this.ctor = ctor;
        this.id = id;
        this.name = name;
        this.cssClass = cssClass;
        this.order = order;
        this.requestedIndex = requestedIndex;
    }
    instantiate(instantiationService) {
        return instantiationService.createInstance(this.ctor);
    }
}
export class CompositeRegistry extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidRegister = this._register(new Emitter());
        this.onDidRegister = this._onDidRegister.event;
        this._onDidDeregister = this._register(new Emitter());
        this.onDidDeregister = this._onDidDeregister.event;
        this.composites = [];
    }
    registerComposite(descriptor) {
        if (this.compositeById(descriptor.id)) {
            return;
        }
        this.composites.push(descriptor);
        this._onDidRegister.fire(descriptor);
    }
    deregisterComposite(id) {
        const descriptor = this.compositeById(id);
        if (!descriptor) {
            return;
        }
        this.composites.splice(this.composites.indexOf(descriptor), 1);
        this._onDidDeregister.fire(descriptor);
    }
    getComposite(id) {
        return this.compositeById(id);
    }
    getComposites() {
        return this.composites.slice(0);
    }
    compositeById(id) {
        return this.composites.find(composite => composite.id === id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2NvbXBvc2l0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQTBCLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUduRCxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHNUQsT0FBTyxFQUFFLFVBQVUsRUFBMkIsTUFBTSwyQkFBMkIsQ0FBQztBQUVoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBTTdEOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxPQUFnQixTQUFVLFNBQVEsU0FBUztJQU1oRCxJQUFJLFVBQVU7UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUMsVUFBVSxDQUFDO1FBQy9ELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO0lBQy9CLENBQUM7SUFHRCxJQUFJLFNBQVM7UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUMsU0FBUyxDQUFDO1FBQzdELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO0lBQzlCLENBQUM7SUFHRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENB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