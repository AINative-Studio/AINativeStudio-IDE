var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { createStringDataTransferItem, VSDataTransfer } from '../../../../base/common/dataTransfer.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../base/common/mime.js';
import { basename, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { IChatWidgetService } from './chat.js';
import { ChatInputPart } from './chatInputPart.js';
import { resizeImage } from './imageUtils.js';
const COPY_MIME_TYPES = 'application/vnd.code.additional-editor-data';
let PasteImageProvider = class PasteImageProvider {
    constructor(chatWidgetService, extensionService, fileService, environmentService, logService) {
        this.chatWidgetService = chatWidgetService;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.kind = new HierarchicalKind('chat.attach.image');
        this.providedPasteEditKinds = [this.kind];
        this.copyMimeTypes = [];
        this.pasteMimeTypes = ['image/*'];
        this.imagesFolder = joinPath(this.environmentService.workspaceStorageHome, 'vscode-chat-images');
        this.cleanupOldImages();
    }
    async provideDocumentPasteEdits(model, ranges, dataTransfer, context, token) {
        if (!this.extensionService.extensions.some(ext => isProposedApiEnabled(ext, 'chatReferenceBinaryData'))) {
            return;
        }
        const supportedMimeTypes = [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/bmp',
            'image/gif',
            'image/tiff'
        ];
        let mimeType;
        let imageItem;
        // Find the first matching image type in the dataTransfer
        for (const type of supportedMimeTypes) {
            imageItem = dataTransfer.get(type);
            if (imageItem) {
                mimeType = type;
                break;
            }
        }
        if (!imageItem || !mimeType) {
            return;
        }
        const currClipboard = await imageItem.asFile()?.data();
        if (token.isCancellationRequested || !currClipboard) {
            return;
        }
        const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
        if (!widget) {
            return;
        }
        const attachedVariables = widget.attachmentModel.attachments;
        const displayName = localize('pastedImageName', 'Pasted Image');
        let tempDisplayName = displayName;
        for (let appendValue = 2; attachedVariables.some(attachment => attachment.name === tempDisplayName); appendValue++) {
            tempDisplayName = `${displayName} ${appendValue}`;
        }
        const fileReference = await this.createFileForMedia(currClipboard, mimeType);
        if (token.isCancellationRequested || !fileReference) {
            return;
        }
        const scaledImageData = await resizeImage(currClipboard);
        if (token.isCancellationRequested || !scaledImageData) {
            return;
        }
        const scaledImageContext = await getImageAttachContext(scaledImageData, mimeType, token, tempDisplayName, fileReference);
        if (token.isCancellationRequested || !scaledImageContext) {
            return;
        }
        widget.attachmentModel.addContext(scaledImageContext);
        // Make sure to attach only new contexts
        const currentContextIds = widget.attachmentModel.getAttachmentIDs();
        if (currentContextIds.has(scaledImageContext.id)) {
            return;
        }
        const edit = createCustomPasteEdit(model, scaledImageContext, mimeType, this.kind, localize('pastedImageAttachment', 'Pasted Image Attachment'), this.chatWidgetService);
        return createEditSession(edit);
    }
    async createFileForMedia(dataTransfer, mimeType) {
        const exists = await this.fileService.exists(this.imagesFolder);
        if (!exists) {
            await this.fileService.createFolder(this.imagesFolder);
        }
        const ext = mimeType.split('/')[1] || 'png';
        const filename = `image-${Date.now()}.${ext}`;
        const fileUri = joinPath(this.imagesFolder, filename);
        const buffer = VSBuffer.wrap(dataTransfer);
        await this.fileService.writeFile(fileUri, buffer);
        return fileUri;
    }
    async cleanupOldImages() {
        const exists = await this.fileService.exists(this.imagesFolder);
        if (!exists) {
            return;
        }
        const duration = 7 * 24 * 60 * 60 * 1000; // 7 days
        const files = await this.fileService.resolve(this.imagesFolder);
        if (!files.children) {
            return;
        }
        await Promise.all(files.children.map(async (file) => {
            try {
                const timestamp = this.getTimestampFromFilename(file.name);
                if (timestamp && (Date.now() - timestamp > duration)) {
                    await this.fileService.del(file.resource);
                }
            }
            catch (err) {
                this.logService.error('Failed to clean up old images', err);
            }
        }));
    }
    getTimestampFromFilename(filename) {
        const match = filename.match(/image-(\d+)\./);
        if (match) {
            return parseInt(match[1], 10);
        }
        return undefined;
    }
};
PasteImageProvider = __decorate([
    __param(2, IFileService),
    __param(3, IEnvironmentService),
    __param(4, ILogService)
], PasteImageProvider);
export { PasteImageProvider };
async function getImageAttachContext(data, mimeType, token, displayName, resource) {
    const imageHash = await imageToHash(data);
    if (token.isCancellationRequested) {
        return undefined;
    }
    return {
        kind: 'image',
        value: data,
        id: imageHash,
        name: displayName,
        isImage: true,
        icon: Codicon.fileMedia,
        mimeType,
        isPasted: true,
        references: [{ reference: resource, kind: 'reference' }]
    };
}
export async function imageToHash(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
export function isImage(array) {
    if (array.length < 4) {
        return false;
    }
    // Magic numbers (identification bytes) for various image formats
    const identifier = {
        png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        jpeg: [0xFF, 0xD8, 0xFF],
        bmp: [0x42, 0x4D],
        gif: [0x47, 0x49, 0x46, 0x38],
        tiff: [0x49, 0x49, 0x2A, 0x00]
    };
    return Object.values(identifier).some((signature) => signature.every((byte, index) => array[index] === byte));
}
export class CopyTextProvider {
    constructor() {
        this.providedPasteEditKinds = [];
        this.copyMimeTypes = [COPY_MIME_TYPES];
        this.pasteMimeTypes = [];
    }
    async prepareDocumentPaste(model, ranges, dataTransfer, token) {
        if (model.uri.scheme === ChatInputPart.INPUT_SCHEME) {
            return;
        }
        const customDataTransfer = new VSDataTransfer();
        const data = { range: ranges[0], uri: model.uri.toJSON() };
        customDataTransfer.append(COPY_MIME_TYPES, createStringDataTransferItem(JSON.stringify(data)));
        return customDataTransfer;
    }
}
export class PasteTextProvider {
    constructor(chatWidgetService, modelService) {
        this.chatWidgetService = chatWidgetService;
        this.modelService = modelService;
        this.kind = new HierarchicalKind('chat.attach.text');
        this.providedPasteEditKinds = [this.kind];
        this.copyMimeTypes = [];
        this.pasteMimeTypes = [COPY_MIME_TYPES];
    }
    async provideDocumentPasteEdits(model, ranges, dataTransfer, context, token) {
        if (model.uri.scheme !== ChatInputPart.INPUT_SCHEME) {
            return;
        }
        const text = dataTransfer.get(Mimes.text);
        const editorData = dataTransfer.get('vscode-editor-data');
        const additionalEditorData = dataTransfer.get(COPY_MIME_TYPES);
        if (!editorData || !text || !additionalEditorData) {
            return;
        }
        const textdata = await text.asString();
        const metadata = JSON.parse(await editorData.asString());
        const additionalData = JSON.parse(await additionalEditorData.asString());
        const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
        if (!widget) {
            return;
        }
        const start = additionalData.range.startLineNumber;
        const end = additionalData.range.endLineNumber;
        if (start === end) {
            const textModel = this.modelService.getModel(URI.revive(additionalData.uri));
            if (!textModel) {
                return;
            }
            // If copied line text data is the entire line content, then we can paste it as a code attachment. Otherwise, we ignore and use default paste provider.
            const lineContent = textModel.getLineContent(start);
            if (lineContent !== textdata) {
                return;
            }
        }
        const copiedContext = getCopiedContext(textdata, URI.revive(additionalData.uri), metadata.mode, additionalData.range);
        if (token.isCancellationRequested || !copiedContext) {
            return;
        }
        const currentContextIds = widget.attachmentModel.getAttachmentIDs();
        if (currentContextIds.has(copiedContext.id)) {
            return;
        }
        const edit = createCustomPasteEdit(model, copiedContext, Mimes.text, this.kind, localize('pastedCodeAttachment', 'Pasted Code Attachment'), this.chatWidgetService);
        edit.yieldTo = [{ kind: HierarchicalKind.Empty.append('text', 'plain') }];
        return createEditSession(edit);
    }
}
function getCopiedContext(code, file, language, range) {
    const fileName = basename(file);
    const start = range.startLineNumber;
    const end = range.endLineNumber;
    const resultText = `Copied Selection of Code: \n\n\n From the file: ${fileName} From lines ${start} to ${end} \n \`\`\`${code}\`\`\``;
    const pastedLines = start === end ? localize('pastedAttachment.oneLine', '1 line') : localize('pastedAttachment.multipleLines', '{0} lines', end + 1 - start);
    return {
        kind: 'paste',
        value: resultText,
        id: `${fileName}${start}${end}${range.startColumn}${range.endColumn}`,
        name: `${fileName} ${pastedLines}`,
        icon: Codicon.code,
        pastedLines,
        language,
        fileName: file.toString(),
        copiedFrom: {
            uri: file,
            range
        },
        code,
        references: [{
                reference: file,
                kind: 'reference'
            }]
    };
}
function createCustomPasteEdit(model, context, handledMimeType, kind, title, chatWidgetService) {
    const customEdit = {
        resource: model.uri,
        variable: context,
        undo: () => {
            const widget = chatWidgetService.getWidgetByInputUri(model.uri);
            if (!widget) {
                throw new Error('No widget found for undo');
            }
            widget.attachmentModel.delete(context.id);
        },
        redo: () => {
            const widget = chatWidgetService.getWidgetByInputUri(model.uri);
            if (!widget) {
                throw new Error('No widget found for redo');
            }
            widget.attachmentModel.addContext(context);
        },
        metadata: { needsConfirmation: false, label: context.name }
    };
    return {
        insertText: '',
        title,
        kind,
        handledMimeType,
        additionalEdit: {
            edits: [customEdit],
        }
    };
}
function createEditSession(edit) {
    return {
        edits: [edit],
        dispose: () => { },
    };
}
let ChatPasteProvidersFeature = class ChatPasteProvidersFeature extends Disposable {
    constructor(languageFeaturesService, chatWidgetService, extensionService, fileService, modelService, environmentService, logService) {
        super();
        this._register(languageFeaturesService.documentPasteEditProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, pattern: '*', hasAccessToAllModels: true }, new PasteImageProvider(chatWidgetService, extensionService, fileService, environmentService, logService)));
        this._register(languageFeaturesService.documentPasteEditProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, pattern: '*', hasAccessToAllModels: true }, new PasteTextProvider(chatWidgetService, modelService)));
        this._register(languageFeaturesService.documentPasteEditProvider.register('*', new CopyTextProvider()));
    }
};
ChatPasteProvidersFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IChatWidgetService),
    __param(2, IExtensionService),
    __param(3, IFileService),
    __param(4, IModelService),
    __param(5, IEnvironmentService),
    __param(6, ILogService)
], ChatPasteProvidersFeature);
export { ChatPasteProvidersFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhc3RlUHJvdmlkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRQYXN0ZVByb3ZpZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSw0QkFBNEIsRUFBOEMsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkosT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFJcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxv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