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
import * as dom from '../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { createInstantHoverDelegate } from '../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { basename, dirname } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { fillInSymbolsDragData } from '../../../../../platform/dnd/browser/dnd.js';
import { FileKind, IFileService } from '../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { FolderThemeIcon, IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { revealInSideBarCommand } from '../../../files/browser/fileActions.contribution.js';
import { isImageVariableEntry, isPasteVariableEntry } from '../../common/chatModel.js';
import { ChatResponseReferencePartStatusKind } from '../../common/chatService.js';
import { convertUint8ArrayToString } from '../imageUtils.js';
export const chatAttachmentResourceContextKey = new RawContextKey('chatAttachmentResource', undefined, { type: 'URI', description: localize('resource', "The full value of the chat attachment resource, including scheme and path") });
let ChatAttachmentsContentPart = class ChatAttachmentsContentPart extends Disposable {
    constructor(variables, contentReferences = [], domNode = dom.$('.chat-attached-context'), contextKeyService, instantiationService, openerService, hoverService, commandService, themeService, labelService) {
        super();
        this.variables = variables;
        this.contentReferences = contentReferences;
        this.domNode = domNode;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.hoverService = hoverService;
        this.commandService = commandService;
        this.themeService = themeService;
        this.labelService = labelService;
        this.attachedContextDisposables = this._register(new DisposableStore());
        this._onDidChangeVisibility = this._register(new Emitter());
        this._contextResourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this._onDidChangeVisibility.event }));
        this.initAttachedContext(domNode);
        if (!domNode.childElementCount) {
            this.domNode = undefined;
        }
    }
    // TODO@joyceerhl adopt chat attachment widgets
    initAttachedContext(container) {
        dom.clearNode(container);
        this.attachedContextDisposables.clear();
        const hoverDelegate = this.attachedContextDisposables.add(createInstantHoverDelegate());
        this.variables.forEach(async (attachment) => {
            let resource = URI.isUri(attachment.value) ? attachment.value : attachment.value && typeof attachment.value === 'object' && 'uri' in attachment.value && URI.isUri(attachment.value.uri) ? attachment.value.uri : undefined;
            let range = attachment.value && typeof attachment.value === 'object' && 'range' in attachment.value && Range.isIRange(attachment.value.range) ? attachment.value.range : undefined;
            const widget = dom.append(container, dom.$('.chat-attached-context-attachment.show-file-icons'));
            const label = this._contextResourceLabels.create(widget, { supportIcons: true, hoverDelegate, hoverTargetOverride: widget });
            this.attachedContextDisposables.add(label);
            const correspondingContentReference = this.contentReferences.find((ref) => (typeof ref.reference === 'object' && 'variableName' in ref.reference && ref.reference.variableName === attachment.name) || (URI.isUri(ref.reference) && basename(ref.reference.path) === attachment.name));
            const isAttachmentOmitted = correspondingContentReference?.options?.status?.kind === ChatResponseReferencePartStatusKind.Omitted;
            const isAttachmentPartialOrOmitted = isAttachmentOmitted || correspondingContentReference?.options?.status?.kind === ChatResponseReferencePartStatusKind.Partial;
            let ariaLabel;
            if (resource && (attachment.isFile || attachment.isDirectory)) {
                const fileBasename = basename(resource.path);
                const fileDirname = dirname(resource.path);
                const friendlyName = `${fileBasename} ${fileDirname}`;
                if (isAttachmentOmitted) {
                    ariaLabel = range ? localize('chat.omittedFileAttachmentWithRange', "Omitted: {0}, line {1} to line {2}.", friendlyName, range.startLineNumber, range.endLineNumber) : localize('chat.omittedFileAttachment', "Omitted: {0}.", friendlyName);
                }
                else if (isAttachmentPartialOrOmitted) {
                    ariaLabel = range ? localize('chat.partialFileAttachmentWithRange', "Partially attached: {0}, line {1} to line {2}.", friendlyName, range.startLineNumber, range.endLineNumber) : localize('chat.partialFileAttachment', "Partially attached: {0}.", friendlyName);
                }
                else {
                    ariaLabel = range ? localize('chat.fileAttachmentWithRange3', "Attached: {0}, line {1} to line {2}.", friendlyName, range.startLineNumber, range.endLineNumber) : localize('chat.fileAttachment3', "Attached: {0}.", friendlyName);
                }
                if (attachment.isOmitted) {
                    this.customAttachment(widget, friendlyName, hoverDelegate, ariaLabel, isAttachmentOmitted);
                }
                else {
                    const fileOptions = {
                        hidePath: true,
                        title: correspondingContentReference?.options?.status?.description
                    };
                    label.setFile(resource, attachment.isFile ? {
                        ...fileOptions,
                        fileKind: FileKind.FILE,
                        range,
                    } : {
                        ...fileOptions,
                        fileKind: FileKind.FOLDER,
                        icon: !this.themeService.getFileIconTheme().hasFolderIcons ? FolderThemeIcon : undefined
                    });
                }
                this.instantiationService.invokeFunction(accessor => {
                    if (resource) {
                        this.attachedContextDisposables.add(hookUpResourceAttachmentDragAndContextMenu(accessor, widget, resource));
                    }
                });
            }
            else if (attachment.isImage) {
                ariaLabel = localize('chat.imageAttachment', "Attached image, {0}", attachment.name);
                const isURL = isImageVariableEntry(attachment) && attachment.isURL;
                const hoverElement = this.customAttachment(widget, attachment.name, hoverDelegate, ariaLabel, isAttachmentOmitted, attachment.isImage, isURL, attachment.value);
                if (attachment.references) {
                    widget.style.cursor = 'pointer';
                    const clickHandler = () => {
                        if (attachment.references && URI.isUri(attachment.references[0].reference)) {
                            this.openResource(attachment.references[0].reference, false, undefined);
                        }
                    };
                    this.attachedContextDisposables.add(dom.addDisposableListener(widget, 'click', clickHandler));
                }
                if (!isAttachmentPartialOrOmitted) {
                    const buffer = attachment.value;
                    this.createImageElements(buffer, widget, hoverElement);
                    this.attachedContextDisposables.add(this.hoverService.setupManagedHover(hoverDelegate, widget, hoverElement, { trapFocus: false }));
                }
                widget.style.position = 'relative';
            }
            else if (isPasteVariableEntry(attachment)) {
                ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
                const classNames = ['file-icon', `${attachment.language}-lang-file-icon`];
                if (attachment.copiedFrom) {
                    resource = attachment.copiedFrom.uri;
                    range = attachment.copiedFrom.range;
                    const filename = basename(resource.path);
                    label.setLabel(filename, undefined, { extraClasses: classNames });
                }
                else {
                    label.setLabel(attachment.fileName, undefined, { extraClasses: classNames });
                }
                widget.appendChild(dom.$('span.attachment-additional-info', {}, `Pasted ${attachment.pastedLines}`));
                widget.style.position = 'relative';
                const hoverContent = {
                    markdown: {
                        value: `**${attachment.copiedFrom ? this.labelService.getUriLabel(attachment.copiedFrom.uri, { relative: true }) : attachment.fileName}**\n\n---\n\n\`\`\`${attachment.language}\n${attachment.code}\n\`\`\``,
                    },
                    markdownNotSupportedFallback: attachment.code,
                };
                if (!this.attachedContextDisposables.isDisposed) {
                    this.attachedContextDisposables.add(this.hoverService.setupManagedHover(hoverDelegate, widget, hoverContent, { trapFocus: true }));
                    const resource = attachment.copiedFrom?.uri;
                    if (resource) {
                        this.attachedContextDisposables.add(this.instantiationService.invokeFunction(accessor => hookUpResourceAttachmentDragAndContextMenu(accessor, widget, resource)));
                    }
                }
            }
            else {
                const attachmentLabel = attachment.fullName ?? attachment.name;
                const withIcon = attachment.icon?.id ? `$(${attachment.icon.id}) ${attachmentLabel}` : attachmentLabel;
                label.setLabel(withIcon, correspondingContentReference?.options?.status?.description);
                ariaLabel = localize('chat.attachment3', "Attached context: {0}.", attachment.name);
            }
            if (attachment.kind === 'symbol') {
                const scopedContextKeyService = this.attachedContextDisposables.add(this.contextKeyService.createScoped(widget));
                this.attachedContextDisposables.add(this.instantiationService.invokeFunction(accessor => hookUpSymbolAttachmentDragAndContextMenu(accessor, widget, scopedContextKeyService, { ...attachment, kind: attachment.symbolKind }, MenuId.ChatInputSymbolAttachmentContext)));
            }
            if (isAttachmentPartialOrOmitted) {
                widget.classList.add('warning');
            }
            const description = correspondingContentReference?.options?.status?.description;
            if (isAttachmentPartialOrOmitted) {
                ariaLabel = `${ariaLabel}${description ? ` ${description}` : ''}`;
                for (const selector of ['.monaco-icon-suffix-container', '.monaco-icon-name-container']) {
                    const element = label.element.querySelector(selector);
                    if (element) {
                        element.classList.add('warning');
                    }
                }
            }
            if (this.attachedContextDisposables.isDisposed) {
                return;
            }
            if (resource) {
                widget.style.cursor = 'pointer';
                if (!this.attachedContextDisposables.isDisposed) {
                    this.attachedContextDisposables.add(dom.addDisposableListener(widget, dom.EventType.CLICK, async (e) => {
                        dom.EventHelper.stop(e, true);
                        if (attachment.isDirectory) {
                            this.openResource(resource, true);
                        }
                        else {
                            this.openResource(resource, false, range);
                        }
                    }));
                }
            }
            widget.ariaLabel = ariaLabel;
            widget.tabIndex = 0;
        });
    }
    customAttachment(widget, friendlyName, hoverDelegate, ariaLabel, isAttachmentOmitted, isImage, isURL, value) {
        const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$(isAttachmentOmitted ? 'span.codicon.codicon-warning' : 'span.codicon.codicon-file-media'));
        const textLabel = dom.$('span.chat-attached-context-custom-text', {}, friendlyName);
        widget.appendChild(pillIcon);
        widget.appendChild(textLabel);
        const hoverElement = dom.$('div.chat-attached-context-hover');
        hoverElement.setAttribute('aria-label', ariaLabel);
        if (isURL && !isAttachmentOmitted && value) {
            hoverElement.textContent = localize('chat.imageAttachmentHover', "{0}", convertUint8ArrayToString(value));
            this.attachedContextDisposables.add(this.hoverService.setupManagedHover(hoverDelegate, widget, hoverElement, { trapFocus: true }));
        }
        if (isAttachmentOmitted) {
            widget.classList.add('warning');
            hoverElement.textContent = localize('chat.fileAttachmentHover', "Selected model does not support this {0} type.", isImage ? 'image' : 'file');
            this.attachedContextDisposables.add(this.hoverService.setupManagedHover(hoverDelegate, widget, hoverElement, { trapFocus: true }));
        }
        return hoverElement;
    }
    openResource(resource, isDirectory, range) {
        if (isDirectory) {
            // Reveal Directory in explorer
            this.commandService.executeCommand(revealInSideBarCommand.id, resource);
            return;
        }
        // Open file in editor
        const openTextEditorOptions = range ? { selection: range } : undefined;
        const options = {
            fromUserGesture: true,
            editorOptions: openTextEditorOptions,
        };
        this.openerService.open(resource, options);
    }
    // Helper function to create and replace image
    async createImageElements(buffer, widget, hoverElement) {
        const blob = new Blob([buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const img = dom.$('img.chat-attached-context-image', { src: url, alt: '' });
        const pillImg = dom.$('img.chat-attached-context-pill-image', { src: url, alt: '' });
        const pill = dom.$('div.chat-attached-context-pill', {}, pillImg);
        const existingPill = widget.querySelector('.chat-attached-context-pill');
        if (existingPill) {
            existingPill.replaceWith(pill);
        }
        // Update hover image
        hoverElement.appendChild(img);
        img.onload = () => {
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            // reset to original icon on error or invalid image
            const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$('span.codicon.codicon-file-media'));
            const pill = dom.$('div.chat-attached-context-pill', {}, pillIcon);
            const existingPill = widget.querySelector('.chat-attached-context-pill');
            if (existingPill) {
                existingPill.replaceWith(pill);
            }
        };
    }
};
ChatAttachmentsContentPart = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInstantiationService),
    __param(5, IOpenerService),
    __param(6, IHoverService),
    __param(7, ICommandService),
    __param(8, IThemeService),
    __param(9, ILabelService)
], ChatAttachmentsContentPart);
export { ChatAttachmentsContentPart };
export function hookUpResourceAttachmentDragAndContextMenu(accessor, widget, resource) {
    const contextKeyService = accessor.get(IContextKeyService);
    const instantiationService = accessor.get(IInstantiationService);
    const store = new DisposableStore();
    // Context
    const scopedContextKeyService = store.add(contextKeyService.createScoped(widget));
    store.add(setResourceContext(accessor, scopedContextKeyService, resource));
    // Drag and drop
    widget.draggable = true;
    store.add(dom.addDisposableListener(widget, 'dragstart', e => {
        instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, [resource], e));
        e.dataTransfer?.setDragImage(widget, 0, 0);
    }));
    // Context menu
    store.add(addBasicContextMenu(accessor, widget, scopedContextKeyService, MenuId.ChatInputResourceAttachmentContext, resource));
    return store;
}
export function hookUpSymbolAttachmentDragAndContextMenu(accessor, widget, scopedContextKeyService, attachment, contextMenuId) {
    const instantiationService = accessor.get(IInstantiationService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const textModelService = accessor.get(ITextModelService);
    const store = new DisposableStore();
    // Context
    store.add(setResourceContext(accessor, scopedContextKeyService, attachment.value.uri));
    const chatResourceContext = chatAttachmentResourceContextKey.bindTo(scopedContextKeyService);
    chatResourceContext.set(attachment.value.uri.toString());
    // Drag and drop
    widget.draggable = true;
    store.add(dom.addDisposableListener(widget, 'dragstart', e => {
        instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, [{ resource: attachment.value.uri, selection: attachment.value.range }], e));
        fillInSymbolsDragData([{
                fsPath: attachment.value.uri.fsPath,
                range: attachment.value.range,
                name: attachment.name,
                kind: attachment.kind,
            }], e);
        e.dataTransfer?.setDragImage(widget, 0, 0);
    }));
    // Context menu
    const providerContexts = [
        [EditorContextKeys.hasDefinitionProvider.bindTo(scopedContextKeyService), languageFeaturesService.definitionProvider],
        [EditorContextKeys.hasReferenceProvider.bindTo(scopedContextKeyService), languageFeaturesService.referenceProvider],
        [EditorContextKeys.hasImplementationProvider.bindTo(scopedContextKeyService), languageFeaturesService.implementationProvider],
        [EditorContextKeys.hasTypeDefinitionProvider.bindTo(scopedContextKeyService), languageFeaturesService.typeDefinitionProvider],
    ];
    const updateContextKeys = async () => {
        const modelRef = await textModelService.createModelReference(attachment.value.uri);
        try {
            const model = modelRef.object.textEditorModel;
            for (const [contextKey, registry] of providerContexts) {
                contextKey.set(registry.has(model));
            }
        }
        finally {
            modelRef.dispose();
        }
    };
    store.add(addBasicContextMenu(accessor, widget, scopedContextKeyService, contextMenuId, attachment.value, updateContextKeys));
    return store;
}
function setResourceContext(accessor, scopedContextKeyService, resource) {
    const fileService = accessor.get(IFileService);
    const languageService = accessor.get(ILanguageService);
    const modelService = accessor.get(IModelService);
    const resourceContextKey = new ResourceContextKey(scopedContextKeyService, fileService, languageService, modelService);
    resourceContextKey.set(resource);
    return resourceContextKey;
}
function addBasicContextMenu(accessor, widget, scopedContextKeyService, menuId, arg, updateContextKeys) {
    const contextMenuService = accessor.get(IContextMenuService);
    const menuService = accessor.get(IMenuService);
    return dom.addDisposableListener(widget, dom.EventType.CONTEXT_MENU, async (domEvent) => {
        const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
        dom.EventHelper.stop(domEvent, true);
        try {
            await updateContextKeys?.();
        }
        catch (e) {
            console.error(e);
        }
        contextMenuService.showContextMenu({
            contextKeyService: scopedContextKeyService,
            getAnchor: () => event,
            getActions: () => {
                const menu = menuService.getMenuActions(menuId, scopedContextKeyService, { arg });
                return getFlatContextMenuActions(menu);
            },
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRzQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdEF0dGFjaG1lbnRzQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUcvRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFHdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FB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