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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { FilePromptParser } from '../../common/promptSyntax/parsers/filePromptParser.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
/**
 * Model for a single chat prompt instructions attachment.
 */
let ChatPromptAttachmentModel = class ChatPromptAttachmentModel extends Disposable {
    /**
     * Get the prompt instructions reference instance.
     */
    get reference() {
        return this._reference;
    }
    /**
     * Get `URI` for the main reference and `URI`s of all valid child
     * references it may contain, including reference of this model itself.
     */
    get references() {
        const { reference } = this;
        const { errorCondition } = this.reference;
        // return no references if the attachment is disabled
        // or if this object itself has an error
        if (errorCondition) {
            return [];
        }
        // otherwise return `URI` for the main reference and
        // all valid child `URI` references it may contain
        return [
            ...reference.allValidReferencesUris,
            reference.uri,
        ];
    }
    /**
     * Promise that resolves when the prompt is fully parsed,
     * including all its possible nested child references.
     */
    get allSettled() {
        return this.reference.allSettled();
    }
    /**
     * Get the top-level error of the prompt instructions
     * reference, if any.
     */
    get topError() {
        return this.reference.topError;
    }
    /**
     * Subscribe to the `onUpdate` event.
     * @param callback Function to invoke on update.
     */
    onUpdate(callback) {
        this._register(this._onUpdate.event(callback));
        return this;
    }
    /**
     * Subscribe to the `onDispose` event.
     * @param callback Function to invoke on dispose.
     */
    onDispose(callback) {
        this._register(this._onDispose.event(callback));
        return this;
    }
    constructor(uri, initService) {
        super();
        this.initService = initService;
        /**
         * Event that fires when the error condition of the prompt
         * reference changes.
         *
         * See {@linkcode onUpdate}.
         */
        this._onUpdate = this._register(new Emitter());
        /**
         * Event that fires when the object is disposed.
         *
         * See {@linkcode onDispose}.
         */
        this._onDispose = this._register(new Emitter());
        this._onUpdate.fire = this._onUpdate.fire.bind(this._onUpdate);
        this._reference = this._register(this.initService.createInstance(FilePromptParser, uri, []))
            .onUpdate(this._onUpdate.fire);
    }
    /**
     * Start resolving the prompt instructions reference and child references
     * that it may contain.
     */
    resolve() {
        this._reference.start();
        return this;
    }
    dispose() {
        this._onDispose.fire();
        super.dispose();
    }
};
ChatPromptAttachmentModel = __decorate([
    __param(1, IInstantiationService)
], ChatPromptAttachmentModel);
export { ChatPromptAttachmentModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdEF0dGFjaG1lbnRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEF0dGFjaG1lbnRNb2RlbC9jaGF0UHJvbXB0QXR0YWNobWVudE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEc7O0dBRUc7QUFDSSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7SUFNeEQ7O09BRUc7SUFDSCxJQUFXLFNBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFXLFVBQVU7UUFDcEIsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUUxQyxxREFBcUQ7UUFDckQsd0NBQXdDO1FBQ3hDLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsb0RBQW9EO1FBQ3BELGtEQUFrRDtRQUNsRCxPQUFPO1lBQ04sR0FBRyxTQUFTLENBQUMsc0JBQXNCO1lBQ25DLFNBQVMsQ0FBQyxHQUFHO1NBQ2IsQ0FBQztJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFXLFFBQVE7UUFDbEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztJQUNoQyxDQUFDO0lBU0Q7OztPQUdHO0lBQ0ksUUFBUSxDQUFDLFFBQXVCO1FBQ3RDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUUvQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFRRDs7O09BR0c7SUFDSSxTQUFTLENBQUMsUUFBdUI7UUFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRWhELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELFlBQ0MsR0FBUSxFQUNlLFdBQW1EO1FBRTFFLEtBQUssRUFBRSxDQUFDO1FBRmdDLGdCQUFXLEdBQVgsV0FBVyxDQUF1QjtRQW5DM0U7Ozs7O1dBS0c7UUFDTyxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFXMUQ7Ozs7V0FJRztRQUNPLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQWlCMUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzFGLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7O09BR0c7SUFDSSxPQUFPO1FBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV4QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFdkIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FDRCxDQUFBO0FBOUdZLHlCQUF5QjtJQXNGbkMsV0FBQSxxQkFBcUIsQ0FBQTtHQXRGWCx5QkFBeUIsQ0E4R3JDIn0=