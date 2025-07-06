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
import { URI } from '../../../../base/common/uri.js';
import { Emitter } from '../../../../base/common/event.js';
import { basename } from '../../../../base/common/resources.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ChatPromptAttachmentsCollection } from './chatAttachmentModel/chatPromptAttachmentsCollection.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { resizeImage } from './imageUtils.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { localize } from '../../../../nls.js';
let ChatAttachmentModel = class ChatAttachmentModel extends Disposable {
    constructor(initService, fileService, dialogService) {
        super();
        this.initService = initService;
        this.fileService = fileService;
        this.dialogService = dialogService;
        this._attachments = new Map();
        this._onDidChangeContext = this._register(new Emitter());
        this.onDidChangeContext = this._onDidChangeContext.event;
        this.promptInstructions = this._register(this.initService.createInstance(ChatPromptAttachmentsCollection)).onUpdate(() => {
            this._onDidChangeContext.fire();
        });
    }
    get attachments() {
        return Array.from(this._attachments.values());
    }
    get size() {
        return this._attachments.size;
    }
    get fileAttachments() {
        return this.attachments.reduce((acc, file) => {
            if (file.isFile && URI.isUri(file.value)) {
                acc.push(file.value);
            }
            return acc;
        }, []);
    }
    getAttachmentIDs() {
        return new Set(this._attachments.keys());
    }
    clear() {
        this._attachments.clear();
        this._onDidChangeContext.fire();
    }
    delete(...variableEntryIds) {
        for (const variableEntryId of variableEntryIds) {
            this._attachments.delete(variableEntryId);
        }
        this._onDidChangeContext.fire();
    }
    async addFile(uri, range) {
        if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(uri.path)) {
            this.addContext(await this.asImageVariableEntry(uri));
            return;
        }
        this.addContext(this.asVariableEntry(uri, range));
    }
    addFolder(uri) {
        this.addContext({
            value: uri,
            id: uri.toString(),
            name: basename(uri),
            isFile: false,
            isDirectory: true,
        });
    }
    asVariableEntry(uri, range) {
        return {
            value: range ? { uri, range } : uri,
            id: uri.toString() + (range?.toString() ?? ''),
            name: basename(uri),
            isFile: true,
        };
    }
    async asImageVariableEntry(uri) {
        const fileName = basename(uri);
        const readFile = await this.fileService.readFile(uri);
        if (readFile.size > 30 * 1024 * 1024) { // 30 MB
            this.dialogService.error(localize('imageTooLarge', 'Image is too large'), localize('imageTooLargeMessage', 'The image {0} is too large to be attached.', fileName));
            throw new Error('Image is too large');
        }
        const resizedImage = await resizeImage(readFile.value.buffer);
        return {
            id: uri.toString(),
            name: fileName,
            fullName: uri.path,
            value: resizedImage,
            isImage: true,
            isFile: false,
            references: [{ reference: uri, kind: 'reference' }]
        };
    }
    addContext(...attachments) {
        let hasAdded = false;
        for (const attachment of attachments) {
            if (!this._attachments.has(attachment.id)) {
                this._attachments.set(attachment.id, attachment);
                hasAdded = true;
            }
        }
        if (hasAdded) {
            this._onDidChangeContext.fire();
        }
    }
    clearAndSetContext(...attachments) {
        this.clear();
        this.addContext(...attachments);
    }
};
ChatAttachmentModel = __decorate([
    __param(0, IInstantiationService),
    __param(1, IFileService),
    __param(2, IDialogService)
], ChatAttachmentModel);
export { ChatAttachmentModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QXR0YWNobWVudE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFdkMsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBTWxELFlBQ3dCLFdBQW1ELEVBQzVELFdBQTBDLEVBQ3hDLGFBQThDO1FBRTlELEtBQUssRUFBRSxDQUFDO1FBSmdDLGdCQUFXLEdBQVgsV0FBVyxDQUF1QjtRQUMzQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFXdkQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBcUMs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