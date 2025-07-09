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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEF0dGFjaG1lbnRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXZDLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQU1sRCxZQUN3QixXQUFtRCxFQUM1RCxXQUEwQyxFQUN4QyxhQUE4QztRQUU5RCxLQUFLLEVBQUUsQ0FBQztRQUpnQyxnQkFBVyxHQUFYLFdBQVcsQ0FBdUI7UUFDM0MsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDdkIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBV3ZELGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQXFD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