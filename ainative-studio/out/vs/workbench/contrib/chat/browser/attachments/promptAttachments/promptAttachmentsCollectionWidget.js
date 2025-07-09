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
import { Emitter } from '../../../../../../base/common/event.js';
import { PromptAttachmentWidget } from './promptAttachmentWidget.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * Widget for a collection of prompt instructions attachments.
 * See {@linkcode PromptAttachmentWidget}.
 */
let PromptAttachmentsCollectionWidget = class PromptAttachmentsCollectionWidget extends Disposable {
    /**
     * Subscribe to the `onAttachmentsCountChange` event.
     * @param callback Function to invoke when number of attachments change.
     */
    onAttachmentsCountChange(callback) {
        this._register(this._onAttachmentsCountChange.event(callback));
        return this;
    }
    /**
     * Get all `URI`s of all valid references, including all
     * the possible references nested inside the children.
     */
    get references() {
        return this.model.references;
    }
    /**
     * Get the list of all prompt instruction attachment variables, including all
     * nested child references of each attachment explicitly attached by user.
     */
    get chatAttachments() {
        return this.model.chatAttachments;
    }
    /**
     * Check if child widget list is empty (no attachments present).
     */
    get empty() {
        return this.children.length === 0;
    }
    constructor(model, resourceLabels, initService, logService) {
        super();
        this.model = model;
        this.resourceLabels = resourceLabels;
        this.initService = initService;
        this.logService = logService;
        /**
         * List of child instruction attachment widgets.
         */
        this.children = [];
        /**
         * Event that fires when number of attachments change
         *
         * See {@linkcode onAttachmentsCountChange}.
         */
        this._onAttachmentsCountChange = this._register(new Emitter());
        this.render = this.render.bind(this);
        // when a new attachment model is added, create a new child widget for it
        this.model.onAdd((attachment) => {
            const widget = this.initService.createInstance(PromptAttachmentWidget, attachment, this.resourceLabels);
            // handle the child widget disposal event, removing it from the list
            widget.onDispose(this.handleAttachmentDispose.bind(this, widget));
            // register the new child widget
            this.children.push(widget);
            // if parent node is present - append the wiget to it, otherwise wait
            // until the `render` method will be called
            if (this.parentNode) {
                this.parentNode.appendChild(widget.domNode);
            }
            // fire the event to notify about the change in the number of attachments
            this._onAttachmentsCountChange.fire();
        });
    }
    /**
     * Handle child widget disposal.
     * @param widget The child widget that was disposed.
     */
    handleAttachmentDispose(widget) {
        // common prefix for all log messages
        const logPrefix = `[onChildDispose] Widget for instructions attachment '${widget.uri.path}'`;
        // flag to check if the widget was found in the children list
        let widgetExists = false;
        // filter out disposed child widget from the list
        this.children = this.children.filter((child) => {
            if (child === widget) {
                // because we filter out all objects here it might be ok to have multiple of them, but
                // it also highlights a potential issue in our logic somewhere else, so trace a warning here
                if (widgetExists) {
                    this.logService.warn(`${logPrefix} is present in the children references list multiple times.`);
                }
                widgetExists = true;
                return false;
            }
            return true;
        });
        // no widget was found in the children list, while it might be ok it also
        // highlights a potential issue in our logic, so trace a warning here
        if (!widgetExists) {
            this.logService.warn(`${logPrefix} was disposed, but was not found in the child references.`);
        }
        if (!this.parentNode) {
            this.logService.warn(`${logPrefix} no parent node reference found.`);
        }
        // remove the child widget root node from the DOM
        this.parentNode?.removeChild(widget.domNode);
        // fire the event to notify about the change in the number of attachments
        this._onAttachmentsCountChange.fire();
        return this;
    }
    /**
     * Render attachments into the provided `parentNode`.
     *
     * Note! this method assumes that the provided `parentNode` is cleared by the caller.
     */
    render(parentNode) {
        this.parentNode = parentNode;
        for (const widget of this.children) {
            this.parentNode.appendChild(widget.domNode);
        }
        return this;
    }
    /**
     * Dispose of the widget, including all the child
     * widget instances.
     */
    dispose() {
        for (const child of this.children) {
            child.dispose();
        }
        super.dispose();
    }
};
PromptAttachmentsCollectionWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], PromptAttachmentsCollectionWidget);
export { PromptAttachmentsCollectionWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0QXR0YWNobWVudHNDb2xsZWN0aW9uV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hdHRhY2htZW50cy9wcm9tcHRBdHRhY2htZW50cy9wcm9tcHRBdHRhY2htZW50c0NvbGxlY3Rpb25XaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFHekc7OztHQUdHO0FBQ0ksSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBa0MsU0FBUSxVQUFVO0lBWWhFOzs7T0FHRztJQUNJLHdCQUF3QixDQUFDLFFBQXVCO1FBQ3RELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRS9ELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQU9EOzs7T0FHRztJQUNILElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFXLGVBQWU7UUFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFX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