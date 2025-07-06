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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0QXR0YWNobWVudHNDb2xsZWN0aW9uV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2F0dGFjaG1lbnRzL3Byb21wdEF0dGFjaG1lbnRzL3Byb21wdEF0dGFjaG1lbnRzQ29sbGVjdGlvbldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUd6Rzs7O0dBR0c7QUFDSSxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFrQyxTQUFRLFVBQVU7SUFZaEU7OztPQUdHO0lBQ0ksd0JBQXdCLENBQUMsUUFBdUI7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFL0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBT0Q7OztPQUdHO0lBQ0gsSUFBVyxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7SUFDOUIsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsZUFBZTtRQUN6QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO0lBQ25DLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcs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