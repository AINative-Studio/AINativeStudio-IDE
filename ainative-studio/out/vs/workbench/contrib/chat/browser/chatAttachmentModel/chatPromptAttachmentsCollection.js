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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdEF0dGFjaG1lbnRzQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QXR0YWNobWVudE1vZGVsL2NoYXRQcm9tcHRBdHRhY2htZW50c0NvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVqRixPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLENBQzdCLFNBQTZELEVBQzdELE1BQWUsRUFDYSxFQUFFO0lBQzlCLE1BQU0sRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxHQUFHLFNBQVMsQ0FBQztJQUV0RCx3Q0FBd0M7SUFDeEMsSUFBSSxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUVsQixnREFBZ0Q7SUFDaEQsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQix1REFBdUQ7UUFDdkQsSUFBSSxNQUFNLEdBQUcsNEJBQTRCLENBQUM7UUFDMUMsOERBQThEO1FBQzlELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksT0FB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