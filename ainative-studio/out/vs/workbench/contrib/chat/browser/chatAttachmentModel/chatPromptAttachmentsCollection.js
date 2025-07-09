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
import { ChatPromptAttachmentModel } from './chatPromptAttachmentModel.js';
import { PromptsConfig } from '../../../../../platform/prompts/common/config.js';
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
/**
 * Utility to convert a {@link reference} to a chat variable entry.
 * The `id` of the chat variable can be one of the following:
 *
 * - `vscode.prompt.instructions__<URI>`: for all non-root prompt file references
 * - `vscode.prompt.instructions.root__<URI>`: for *root* prompt file references
 * - `<URI>`: for the rest of references(the ones that do not point to a prompt file)
 *
 * @param reference A reference object to convert to a chat variable entry.
 * @param isRoot If the reference is the root reference in the references tree.
 * 				 This object most likely was explicitly attached by the user.
 */
export const toChatVariable = (reference, isRoot) => {
    const { uri, isPromptFile: isPromptFile } = reference;
    // default `id` is the stringified `URI`
    let id = `${uri}`;
    // for prompt files, we add a prefix to the `id`
    if (isPromptFile) {
        // the default prefix that is used for all prompt files
        let prefix = 'vscode.prompt.instructions';
        // if the reference is the root object, add the `.root` suffix
        if (isRoot) {
            prefix += '.root';
        }
        // final `id` for all `prompt files` starts with the well-defined
        // part that the copilot extension(or other chatbot) can rely on
        id = `${prefix}__${id}`;
    }
    return {
        id,
        name: uri.fsPath,
        value: uri,
        isSelection: false,
        enabled: true,
        isFile: true,
    };
};
/**
 * Model for a collection of prompt instruction attachments.
 * See {@linkcode ChatPromptAttachmentModel} for individual attachment.
 */
let ChatPromptAttachmentsCollection = class ChatPromptAttachmentsCollection extends Disposable {
    /**
     * Get all `URI`s of all valid references, including all
     * the possible references nested inside the children.
     */
    get references() {
        const result = [];
        for (const child of this.attachments.values()) {
            result.push(...child.references);
        }
        return result;
    }
    /**
     * Get the list of all prompt instruction attachment variables, including all
     * nested child references of each attachment explicitly attached by user.
     */
    get chatAttachments() {
        const result = [];
        const attachments = [...this.attachments.values()];
        for (const attachment of attachments) {
            const { reference } = attachment;
            // the usual URIs list of prompt instructions is `bottom-up`, therefore
            // we do the same herfe - first add all child references of the model
            result.push(...reference.allValidReferences.map((link) => {
                return toChatVariable(link, false);
            }));
            // then add the root reference of the model itself
            result.push(toChatVariable(reference, true));
        }
        return result;
    }
    /**
     * Promise that resolves when parsing of all attached prompt instruction
     * files completes, including parsing of all its possible child references.
     */
    async allSettled() {
        const attachments = [...this.attachments.values()];
        await Promise.allSettled(attachments.map((attachment) => {
            return attachment.allSettled;
        }));
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
     * The `onAdd` event fires when a new prompt instruction attachment is added.
     *
     * @param callback Function to invoke on add.
     */
    onAdd(callback) {
        this._register(this._onAdd.event(callback));
        return this;
    }
    constructor(initService, configService) {
        super();
        this.initService = initService;
        this.configService = configService;
        /**
         * List of all prompt instruction attachments.
         */
        this.attachments = this._register(new DisposableMap());
        /**
         * Event that fires then this model is updated.
         *
         * See {@linkcode onUpdate}.
         */
        this._onUpdate = this._register(new Emitter());
        /**
         * Event that fires when a new prompt instruction attachment is added.
         * See {@linkcode onAdd}.
         */
        this._onAdd = this._register(new Emitter());
        this._onUpdate.fire = this._onUpdate.fire.bind(this._onUpdate);
    }
    /**
     * Add a prompt instruction attachment instance with the provided `URI`.
     * @param uri URI of the prompt instruction attachment to add.
     */
    add(uri) {
        // if already exists, nothing to do
        if (this.attachments.has(uri.path)) {
            return this;
        }
        const instruction = this.initService.createInstance(ChatPromptAttachmentModel, uri)
            .onUpdate(this._onUpdate.fire)
            .onDispose(() => {
            // note! we have to use `deleteAndLeak` here, because the `*AndDispose`
            //       alternative results in an infinite loop of calling this callback
            this.attachments.deleteAndLeak(uri.path);
            this._onUpdate.fire();
        });
        this.attachments.set(uri.path, instruction);
        instruction.resolve();
        this._onAdd.fire(instruction);
        this._onUpdate.fire();
        return this;
    }
    /**
     * Remove a prompt instruction attachment instance by provided `URI`.
     * @param uri URI of the prompt instruction attachment to remove.
     */
    remove(uri) {
        // if does not exist, nothing to do
        if (!this.attachments.has(uri.path)) {
            return this;
        }
        this.attachments.deleteAndDispose(uri.path);
        return this;
    }
    /**
     * Checks if the prompt instructions feature is enabled in the user settings.
     */
    get featureEnabled() {
        return PromptsConfig.enabled(this.configService);
    }
};
ChatPromptAttachmentsCollection = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService)
], ChatPromptAttachmentsCollection);
export { ChatPromptAttachmentsCollection };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdEF0dGFjaG1lbnRzQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEF0dGFjaG1lbnRNb2RlbC9jaGF0UHJvbXB0QXR0YWNobWVudHNDb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0Rzs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxDQUM3QixTQUE2RCxFQUM3RCxNQUFlLEVBQ2EsRUFBRTtJQUM5QixNQUFNLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFFdEQsd0NBQXdDO0lBQ3hDLElBQUksRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFFbEIsZ0RBQWdEO0lBQ2hELElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEIsdURBQXVEO1FBQ3ZELElBQUksTUFBTSxHQUFHLDRCQUE0QixDQUFDO1FBQzFDLDhEQUE4RDtRQUM5RCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLE9B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