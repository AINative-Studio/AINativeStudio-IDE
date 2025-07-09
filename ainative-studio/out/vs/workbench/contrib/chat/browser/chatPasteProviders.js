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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhc3RlUHJvdmlkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0UGFzdGVQcm92aWRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsNEJBQTRCLEVBQThDLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25KLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBSXBFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUs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