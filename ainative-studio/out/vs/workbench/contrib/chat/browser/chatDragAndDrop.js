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
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { $, DragAndDropObserver } from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { UriList } from '../../../../base/common/dataTransfer.js';
import { Mimes } from '../../../../base/common/mime.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { CodeDataTransfers, containsDragType, extractEditorsDropData, extractMarkerDropData, extractSymbolDropData } from '../../../../platform/dnd/browser/dnd.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { isUntitledResourceEditorInput } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { IDiagnosticVariableEntryFilterData } from '../common/chatModel.js';
import { IChatWidgetService } from './chat.js';
import { imageToHash } from './chatPasteProviders.js';
import { resizeImage } from './imageUtils.js';
var ChatDragAndDropType;
(function (ChatDragAndDropType) {
    ChatDragAndDropType[ChatDragAndDropType["FILE_INTERNAL"] = 0] = "FILE_INTERNAL";
    ChatDragAndDropType[ChatDragAndDropType["FILE_EXTERNAL"] = 1] = "FILE_EXTERNAL";
    ChatDragAndDropType[ChatDragAndDropType["FOLDER"] = 2] = "FOLDER";
    ChatDragAndDropType[ChatDragAndDropType["IMAGE"] = 3] = "IMAGE";
    ChatDragAndDropType[ChatDragAndDropType["SYMBOL"] = 4] = "SYMBOL";
    ChatDragAndDropType[ChatDragAndDropType["HTML"] = 5] = "HTML";
    ChatDragAndDropType[ChatDragAndDropType["MARKER"] = 6] = "MARKER";
})(ChatDragAndDropType || (ChatDragAndDropType = {}));
let ChatDragAndDrop = class ChatDragAndDrop extends Themable {
    constructor(attachmentModel, styles, themeService, extensionService, fileService, editorService, dialogService, textModelService, webContentExtractorService, chatWidgetService, logService) {
        super(themeService);
        this.attachmentModel = attachmentModel;
        this.styles = styles;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.editorService = editorService;
        this.dialogService = dialogService;
        this.textModelService = textModelService;
        this.webContentExtractorService = webContentExtractorService;
        this.chatWidgetService = chatWidgetService;
        this.logService = logService;
        this.overlays = new Map();
        this.overlayTextBackground = '';
        this.currentActiveTarget = undefined;
        this.updateStyles();
    }
    addOverlay(target, overlayContainer) {
        this.removeOverlay(target);
        const { overlay, disposable } = this.createOverlay(target, overlayContainer);
        this.overlays.set(target, { overlay, disposable });
    }
    removeOverlay(target) {
        if (this.currentActiveTarget === target) {
            this.currentActiveTarget = undefined;
        }
        const existingOverlay = this.overlays.get(target);
        if (existingOverlay) {
            existingOverlay.overlay.remove();
            existingOverlay.disposable.dispose();
            this.overlays.delete(target);
        }
    }
    createOverlay(target, overlayContainer) {
        const overlay = document.createElement('div');
        overlay.classList.add('chat-dnd-overlay');
        this.updateOverlayStyles(overlay);
        overlayContainer.appendChild(overlay);
        const disposable = new DragAndDropObserver(target, {
            onDragOver: (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (target === this.currentActiveTarget) {
                    return;
                }
                if (this.currentActiveTarget) {
                    this.setOverlay(this.currentActiveTarget, undefined);
                }
                this.currentActiveTarget = target;
                this.onDragEnter(e, target);
            },
            onDragLeave: (e) => {
                if (target === this.currentActiveTarget) {
                    this.currentActiveTarget = undefined;
                }
                this.onDragLeave(e, target);
            },
            onDrop: (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (target !== this.currentActiveTarget) {
                    return;
                }
                this.currentActiveTarget = undefined;
                this.onDrop(e, target);
            },
        });
        return { overlay, disposable };
    }
    onDragEnter(e, target) {
        const estimatedDropType = this.guessDropType(e);
        this.updateDropFeedback(e, target, estimatedDropType);
    }
    onDragLeave(e, target) {
        this.updateDropFeedback(e, target, undefined);
    }
    onDrop(e, target) {
        this.updateDropFeedback(e, target, undefined);
        this.drop(e);
    }
    async drop(e) {
        const contexts = await this.getAttachContext(e);
        if (contexts.length === 0) {
            return;
        }
        this.attachmentModel.addContext(...contexts);
    }
    updateDropFeedback(e, target, dropType) {
        const showOverlay = dropType !== undefined;
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = showOverlay ? 'copy' : 'none';
        }
        this.setOverlay(target, dropType);
    }
    guessDropType(e) {
        // This is an esstimation based on the datatransfer types/items
        if (this.isImageDnd(e)) {
            return this.extensionService.extensions.some(ext => isProposedApiEnabled(ext, 'chatReferenceBinaryData')) ? ChatDragAndDropType.IMAGE : undefined;
        }
        else if (containsDragType(e, 'text/html')) {
            return ChatDragAndDropType.HTML;
        }
        else if (containsDragType(e, CodeDataTransfers.SYMBOLS)) {
            return ChatDragAndDropType.SYMBOL;
        }
        else if (containsDragType(e, CodeDataTransfers.MARKERS)) {
            return ChatDragAndDropType.MARKER;
        }
        else if (containsDragType(e, DataTransfers.FILES)) {
            return ChatDragAndDropType.FILE_EXTERNAL;
        }
        else if (containsDragType(e, DataTransfers.INTERNAL_URI_LIST)) {
            return ChatDragAndDropType.FILE_INTERNAL;
        }
        else if (containsDragType(e, Mimes.uriList, CodeDataTransfers.FILES, DataTransfers.RESOURCES)) {
            return ChatDragAndDropType.FOLDER;
        }
        return undefined;
    }
    isDragEventSupported(e) {
        // if guessed drop type is undefined, it means the drop is not supported
        const dropType = this.guessDropType(e);
        return dropType !== undefined;
    }
    getDropTypeName(type) {
        switch (type) {
            case ChatDragAndDropType.FILE_INTERNAL: return localize('file', 'File');
            case ChatDragAndDropType.FILE_EXTERNAL: return localize('file', 'File');
            case ChatDragAndDropType.FOLDER: return localize('folder', 'Folder');
            case ChatDragAndDropType.IMAGE: return localize('image', 'Image');
            case ChatDragAndDropType.SYMBOL: return localize('symbol', 'Symbol');
            case ChatDragAndDropType.MARKER: return localize('problem', 'Problem');
            case ChatDragAndDropType.HTML: return localize('url', 'URL');
        }
    }
    isImageDnd(e) {
        // Image detection should not have false positives, only false negatives are allowed
        if (containsDragType(e, 'image')) {
            return true;
        }
        if (containsDragType(e, DataTransfers.FILES)) {
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                const file = files[0];
                return file.type.startsWith('image/');
            }
            const items = e.dataTransfer?.items;
            if (items && items.length > 0) {
                const item = items[0];
                return item.type.startsWith('image/');
            }
        }
        return false;
    }
    async getAttachContext(e) {
        if (!this.isDragEventSupported(e)) {
            return [];
        }
        const markerData = extractMarkerDropData(e);
        if (markerData) {
            return this.resolveMarkerAttachContext(markerData);
        }
        if (containsDragType(e, CodeDataTransfers.SYMBOLS)) {
            const data = extractSymbolDropData(e);
            return this.resolveSymbolsAttachContext(data);
        }
        const editorDragData = extractEditorsDropData(e);
        if (editorDragData.length === 0 && !containsDragType(e, DataTransfers.INTERNAL_URI_LIST) && containsDragType(e, Mimes.uriList) && ((containsDragType(e, Mimes.html) || containsDragType(e, Mimes.text)))) {
            return this.resolveHTMLAttachContext(e);
        }
        return coalesce(await Promise.all(editorDragData.map(editorInput => {
            return this.resolveAttachContext(editorInput);
        })));
    }
    async resolveAttachContext(editorInput) {
        // Image
        const imageContext = await getImageAttachContext(editorInput, this.fileService, this.dialogService);
        if (imageContext) {
            return this.extensionService.extensions.some(ext => isProposedApiEnabled(ext, 'chatReferenceBinaryData')) ? imageContext : undefined;
        }
        // File
        return await this.getEditorAttachContext(editorInput);
    }
    async getEditorAttachContext(editor) {
        // untitled editor
        if (isUntitledResourceEditorInput(editor)) {
            return await this.resolveUntitledAttachContext(editor);
        }
        if (!editor.resource) {
            return undefined;
        }
        let stat;
        try {
            stat = await this.fileService.stat(editor.resource);
        }
        catch {
            return undefined;
        }
        if (!stat.isDirectory && !stat.isFile) {
            return undefined;
        }
        return await getResourceAttachContext(editor.resource, stat.isDirectory, this.textModelService);
    }
    async resolveUntitledAttachContext(editor) {
        // If the resource is known, we can use it directly
        if (editor.resource) {
            return await getResourceAttachContext(editor.resource, false, this.textModelService);
        }
        // Otherwise, we need to check if the contents are already open in another editor
        const openUntitledEditors = this.editorService.editors.filter(editor => editor instanceof UntitledTextEditorInput);
        for (const canidate of openUntitledEditors) {
            const model = await canidate.resolve();
            const contents = model.textEditorModel?.getValue();
            if (contents === editor.contents) {
                return await getResourceAttachContext(canidate.resource, false, this.textModelService);
            }
        }
        return undefined;
    }
    resolveSymbolsAttachContext(symbols) {
        return symbols.map(symbol => {
            const resource = URI.file(symbol.fsPath);
            return {
                kind: 'symbol',
                id: symbolId(resource, symbol.range),
                value: { uri: resource, range: symbol.range },
                symbolKind: symbol.kind,
                fullName: `$(${SymbolKinds.toIcon(symbol.kind).id}) ${symbol.name}`,
                name: symbol.name,
            };
        });
    }
    async downloadImageAsUint8Array(url) {
        try {
            const extractedImages = await this.webContentExtractorService.readImage(URI.parse(url), CancellationToken.None);
            if (extractedImages) {
                return extractedImages.buffer;
            }
        }
        catch (error) {
            this.logService.warn('Fetch failed:', error);
        }
        // TODO: use dnd provider to insert text @justschen
        const selection = this.chatWidgetService.lastFocusedWidget?.inputEditor.getSelection();
        if (selection && this.chatWidgetService.lastFocusedWidget) {
            this.chatWidgetService.lastFocusedWidget.inputEditor.executeEdits('chatInsertUrl', [{ range: selection, text: url }]);
        }
        this.logService.warn(`Image URLs must end in .jpg, .png, .gif, .webp, or .bmp. Failed to fetch image from this URL: ${url}`);
        return undefined;
    }
    async resolveHTMLAttachContext(e) {
        const displayName = localize('dragAndDroppedImageName', 'Image from URL');
        let finalDisplayName = displayName;
        for (let appendValue = 2; this.attachmentModel.attachments.some(attachment => attachment.name === finalDisplayName); appendValue++) {
            finalDisplayName = `${displayName} ${appendValue}`;
        }
        const dataFromFile = await this.extractImageFromFile(e);
        if (dataFromFile) {
            return [await this.createImageVariable(await resizeImage(dataFromFile), finalDisplayName)];
        }
        const dataFromUrl = await this.extractImageFromUrl(e);
        const variableEntries = [];
        if (dataFromUrl) {
            for (const url of dataFromUrl) {
                if (/^data:image\/[a-z]+;base64,/.test(url)) {
                    variableEntries.push(await this.createImageVariable(await resizeImage(url), finalDisplayName, URI.parse(url)));
                }
                else if (/^https?:\/\/.+/.test(url)) {
                    const imageData = await this.downloadImageAsUint8Array(url);
                    if (imageData) {
                        variableEntries.push(await this.createImageVariable(await resizeImage(imageData), finalDisplayName, URI.parse(url), url));
                    }
                }
            }
        }
        return variableEntries;
    }
    async createImageVariable(data, name, uri, id) {
        return {
            id: id || await imageToHash(data),
            name: name,
            value: data,
            isImage: true,
            isFile: false,
            isDirectory: false,
            references: uri ? [{ reference: uri, kind: 'reference' }] : []
        };
    }
    resolveMarkerAttachContext(markers) {
        return markers.map((marker) => {
            let filter;
            if (!('severity' in marker)) {
                filter = { filterUri: URI.revive(marker.uri), filterSeverity: MarkerSeverity.Warning };
            }
            else {
                filter = IDiagnosticVariableEntryFilterData.fromMarker(marker);
            }
            return IDiagnosticVariableEntryFilterData.toEntry(filter);
        });
    }
    setOverlay(target, type) {
        // Remove any previous overlay text
        this.overlayText?.remove();
        this.overlayText = undefined;
        const { overlay } = this.overlays.get(target);
        if (type !== undefined) {
            // Render the overlay text
            const iconAndtextElements = renderLabelWithIcons(`$(${Codicon.attach.id}) ${this.getOverlayText(type)}`);
            const htmlElements = iconAndtextElements.map(element => {
                if (typeof element === 'string') {
                    return $('span.overlay-text', undefined, element);
                }
                return element;
            });
            this.overlayText = $('span.attach-context-overlay-text', undefined, ...htmlElements);
            this.overlayText.style.backgroundColor = this.overlayTextBackground;
            overlay.appendChild(this.overlayText);
        }
        overlay.classList.toggle('visible', type !== undefined);
    }
    getOverlayText(type) {
        const typeName = this.getDropTypeName(type);
        return localize('attacAsContext', 'Attach {0} as Context', typeName);
    }
    updateOverlayStyles(overlay) {
        overlay.style.backgroundColor = this.getColor(this.styles.overlayBackground) || '';
        overlay.style.color = this.getColor(this.styles.listForeground) || '';
    }
    updateStyles() {
        this.overlays.forEach(overlay => this.updateOverlayStyles(overlay.overlay));
        this.overlayTextBackground = this.getColor(this.styles.listBackground) || '';
    }
    async extractImageFromFile(e) {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                try {
                    const buffer = await file.arrayBuffer();
                    return new Uint8Array(buffer);
                }
                catch (error) {
                    this.logService.error('Error reading file:', error);
                    return undefined;
                }
            }
        }
        return undefined;
    }
    async extractImageFromUrl(e) {
        const textUrl = e.dataTransfer?.getData('text/uri-list');
        if (textUrl) {
            try {
                const uris = UriList.parse(textUrl);
                if (uris.length > 0) {
                    return uris;
                }
            }
            catch (error) {
                this.logService.error('Error parsing URI list:', error);
                return undefined;
            }
        }
        return undefined;
    }
};
ChatDragAndDrop = __decorate([
    __param(2, IThemeService),
    __param(3, IExtensionService),
    __param(4, IFileService),
    __param(5, IEditorService),
    __param(6, IDialogService),
    __param(7, ITextModelService),
    __param(8, ISharedWebContentExtractorService),
    __param(9, IChatWidgetService),
    __param(10, ILogService)
], ChatDragAndDrop);
export { ChatDragAndDrop };
async function getResourceAttachContext(resource, isDirectory, textModelService) {
    let isOmitted = false;
    if (!isDirectory) {
        try {
            const createdModel = await textModelService.createModelReference(resource);
            createdModel.dispose();
        }
        catch {
            isOmitted = true;
        }
        if (/\.(svg)$/i.test(resource.path)) {
            isOmitted = true;
        }
    }
    return {
        value: resource,
        id: resource.toString(),
        name: basename(resource),
        isFile: !isDirectory,
        isDirectory,
        isOmitted
    };
}
async function getImageAttachContext(editor, fileService, dialogService) {
    if (!editor.resource) {
        return undefined;
    }
    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(editor.resource.path)) {
        const fileName = basename(editor.resource);
        const readFile = await fileService.readFile(editor.resource);
        if (readFile.size > 30 * 1024 * 1024) { // 30 MB
            dialogService.error(localize('imageTooLarge', 'Image is too large'), localize('imageTooLargeMessage', 'The image {0} is too large to be attached.', fileName));
            throw new Error('Image is too large');
        }
        const resizedImage = await resizeImage(readFile.value.buffer);
        return {
            id: editor.resource.toString(),
            name: fileName,
            fullName: editor.resource.path,
            value: resizedImage,
            icon: Codicon.fileMedia,
            isImage: true,
            isFile: false,
            references: [{ reference: editor.resource, kind: 'reference' }]
        };
    }
    return undefined;
}
function symbolId(resource, range) {
    let rangePart = '';
    if (range) {
        rangePart = `:${range.startLineNumber}`;
        if (range.startLineNumber !== range.endLineNumber) {
            rangePart += `-${range.endLineNumber}`;
        }
    }
    return resource.fsPath + rangePart;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdERyYWdBbmREcm9wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXREcmFnQW5kRHJvcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBOEIsc0JBQXNC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