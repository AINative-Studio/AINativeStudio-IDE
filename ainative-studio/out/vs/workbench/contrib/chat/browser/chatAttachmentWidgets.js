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
import * as dom from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { $, addDisposableListener } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService, FolderThemeIcon } from '../../../../platform/theme/common/themeService.js';
import { revealInSideBarCommand } from '../../files/browser/fileActions.contribution.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { hookUpResourceAttachmentDragAndContextMenu, hookUpSymbolAttachmentDragAndContextMenu } from './chatContentParts/chatAttachmentsContentPart.js';
import { basename, dirname } from '../../../../base/common/path.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
let AbstractChatAttachmentWidget = class AbstractChatAttachmentWidget extends Disposable {
    get onDidDelete() {
        return this._onDidDelete.event;
    }
    constructor(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService) {
        super();
        this.attachment = attachment;
        this.shouldFocusClearButton = shouldFocusClearButton;
        this.hoverDelegate = hoverDelegate;
        this.currentLanguageModel = currentLanguageModel;
        this.commandService = commandService;
        this.openerService = openerService;
        this._onDidDelete = this._register(new Emitter());
        this.element = dom.append(container, $('.chat-attached-context-attachment.show-file-icons'));
        this.label = contextResourceLabels.create(this.element, { supportIcons: true, hoverDelegate, hoverTargetOverride: this.element });
        this._register(this.label);
        this.element.tabIndex = 0;
    }
    modelSupportsVision() {
        return this.currentLanguageModel?.metadata.capabilities?.vision ?? false;
    }
    attachClearButton() {
        const clearButton = new Button(this.element, {
            supportIcons: true,
            hoverDelegate: this.hoverDelegate,
            title: localize('chat.attachment.clearButton', "Remove from context")
        });
        clearButton.icon = Codicon.close;
        this._register(clearButton);
        this._register(Event.once(clearButton.onDidClick)((e) => {
            this._onDidDelete.fire(e);
        }));
        if (this.shouldFocusClearButton) {
            clearButton.focus();
        }
    }
    addResourceOpenHandlers(resource, range) {
        this.element.style.cursor = 'pointer';
        this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e, true);
            if (this.attachment.isDirectory) {
                this.openResource(resource, true);
            }
            else {
                this.openResource(resource, false, range);
            }
        }));
        this._register(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e, true);
                if (this.attachment.isDirectory) {
                    this.openResource(resource, true);
                }
                else {
                    this.openResource(resource, false, range);
                }
            }
        }));
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
};
AbstractChatAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService)
], AbstractChatAttachmentWidget);
let FileAttachmentWidget = class FileAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, range, attachment, currentLanguageModel, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, commandService, openerService, themeService, hoverService, languageModelsService, instantiationService) {
        super(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.themeService = themeService;
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.instantiationService = instantiationService;
        const fileBasename = basename(resource.path);
        const fileDirname = dirname(resource.path);
        const friendlyName = `${fileBasename} ${fileDirname}`;
        const ariaLabel = range ? localize('chat.fileAttachmentWithRange', "Attached file, {0}, line {1} to line {2}", friendlyName, range.startLineNumber, range.endLineNumber) : localize('chat.fileAttachment', "Attached file, {0}", friendlyName);
        this.element.ariaLabel = ariaLabel;
        if (attachment.isOmitted) {
            this.renderOmittedWarning(friendlyName, ariaLabel, hoverDelegate);
        }
        else {
            const fileOptions = { hidePath: true };
            this.label.setFile(resource, attachment.isFile ? {
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
            this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, resource));
        });
        this.addResourceOpenHandlers(resource, range);
        this.attachClearButton();
    }
    renderOmittedWarning(friendlyName, ariaLabel, hoverDelegate) {
        const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$('span.codicon.codicon-warning'));
        const textLabel = dom.$('span.chat-attached-context-custom-text', {}, friendlyName);
        this.element.appendChild(pillIcon);
        this.element.appendChild(textLabel);
        const hoverElement = dom.$('div.chat-attached-context-hover');
        hoverElement.setAttribute('aria-label', ariaLabel);
        this.element.classList.add('warning');
        hoverElement.textContent = localize('chat.fileAttachmentHover', "{0} does not support this {1} type.", this.currentLanguageModel ? this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)?.name : this.currentLanguageModel, 'file');
        this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverElement, { trapFocus: true }));
    }
};
FileAttachmentWidget = __decorate([
    __param(8, ICommandService),
    __param(9, IOpenerService),
    __param(10, IThemeService),
    __param(11, IHoverService),
    __param(12, ILanguageModelsService),
    __param(13, IInstantiationService)
], FileAttachmentWidget);
export { FileAttachmentWidget };
let ImageAttachmentWidget = class ImageAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, attachment, currentLanguageModel, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, commandService, openerService, hoverService, languageModelsService, telemetryService) {
        super(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.telemetryService = telemetryService;
        const ariaLabel = localize('chat.imageAttachment', "Attached image, {0}", attachment.name);
        this.element.ariaLabel = ariaLabel;
        this.element.style.position = 'relative';
        if (attachment.references) {
            this.element.style.cursor = 'pointer';
            const clickHandler = () => {
                if (attachment.references && URI.isUri(attachment.references[0].reference)) {
                    this.openResource(attachment.references[0].reference, false, undefined);
                }
            };
            this._register(addDisposableListener(this.element, 'click', clickHandler));
        }
        const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$(this.modelSupportsVision() ? 'span.codicon.codicon-file-media' : 'span.codicon.codicon-warning'));
        const textLabel = dom.$('span.chat-attached-context-custom-text', {}, attachment.name);
        this.element.appendChild(pillIcon);
        this.element.appendChild(textLabel);
        const hoverElement = dom.$('div.chat-attached-context-hover');
        hoverElement.setAttribute('aria-label', ariaLabel);
        const currentLanguageModelName = this.currentLanguageModel ? this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)?.name ?? this.currentLanguageModel.identifier : 'unknown';
        const supportsVision = this.modelSupportsVision();
        this.telemetryService.publicLog2('copilot.attachImage', {
            currentModel: currentLanguageModelName,
            supportsVision: supportsVision
        });
        if (!supportsVision && this.currentLanguageModel) {
            this.element.classList.add('warning');
            hoverElement.textContent = localize('chat.fileAttachmentHover', "{0} does not support this {1} type.", currentLanguageModelName, 'image');
            this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverElement, { trapFocus: true }));
        }
        else {
            const buffer = attachment.value;
            this.createImageElements(buffer, this.element, hoverElement);
            this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverElement, { trapFocus: false }));
        }
        if (resource) {
            this.addResourceOpenHandlers(resource, undefined);
        }
        this.attachClearButton();
    }
    createImageElements(buffer, widget, hoverElement) {
        const blob = new Blob([buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const pillImg = dom.$('img.chat-attached-context-pill-image', { src: url, alt: '' });
        const pill = dom.$('div.chat-attached-context-pill', {}, pillImg);
        const existingPill = widget.querySelector('.chat-attached-context-pill');
        if (existingPill) {
            existingPill.replaceWith(pill);
        }
        const hoverImage = dom.$('img.chat-attached-context-image', { src: url, alt: '' });
        // Update hover image
        hoverElement.appendChild(hoverImage);
        hoverImage.onload = () => {
            URL.revokeObjectURL(url);
        };
        hoverImage.onerror = () => {
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
ImageAttachmentWidget = __decorate([
    __param(7, ICommandService),
    __param(8, IOpenerService),
    __param(9, IHoverService),
    __param(10, ILanguageModelsService),
    __param(11, ITelemetryService)
], ImageAttachmentWidget);
export { ImageAttachmentWidget };
let PasteAttachmentWidget = class PasteAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, commandService, openerService, hoverService, instantiationService) {
        super(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        const ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        this.element.ariaLabel = ariaLabel;
        const classNames = ['file-icon', `${attachment.language}-lang-file-icon`];
        let resource;
        let range;
        if (attachment.copiedFrom) {
            resource = attachment.copiedFrom.uri;
            range = attachment.copiedFrom.range;
            const filename = basename(resource.path);
            this.label.setLabel(filename, undefined, { extraClasses: classNames });
        }
        else {
            this.label.setLabel(attachment.fileName, undefined, { extraClasses: classNames });
        }
        this.element.appendChild(dom.$('span.attachment-additional-info', {}, `Pasted ${attachment.pastedLines}`));
        this.element.style.position = 'relative';
        const sourceUri = attachment.copiedFrom?.uri;
        const hoverContent = {
            markdown: {
                value: `${sourceUri ? this.instantiationService.invokeFunction(accessor => accessor.get(ILabelService).getUriLabel(sourceUri, { relative: true })) : attachment.fileName}\n\n---\n\n\`\`\`${attachment.language}\n\n${attachment.code}\n\`\`\``,
            },
            markdownNotSupportedFallback: attachment.code,
        };
        this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverContent, { trapFocus: true }));
        const copiedFromResource = attachment.copiedFrom?.uri;
        if (copiedFromResource) {
            this._register(this.instantiationService.invokeFunction(accessor => hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, copiedFromResource)));
            this.addResourceOpenHandlers(copiedFromResource, range);
        }
        this.attachClearButton();
    }
};
PasteAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService),
    __param(8, IHoverService),
    __param(9, IInstantiationService)
], PasteAttachmentWidget);
export { PasteAttachmentWidget };
let DefaultChatAttachmentWidget = class DefaultChatAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, range, attachment, currentLanguageModel, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, commandService, openerService, contextKeyService, instantiationService) {
        super(attachment, shouldFocusClearButton, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        const attachmentLabel = attachment.fullName ?? attachment.name;
        const withIcon = attachment.icon?.id ? `$(${attachment.icon.id}) ${attachmentLabel}` : attachmentLabel;
        this.label.setLabel(withIcon, undefined);
        this.element.ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        if (attachment.kind === 'diagnostic') {
            if (attachment.filterUri) {
                resource = attachment.filterUri ? URI.revive(attachment.filterUri) : undefined;
                range = attachment.filterRange;
            }
            else {
                this.element.style.cursor = 'pointer';
                this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, () => {
                    this.commandService.executeCommand('workbench.panel.markers.view.focus');
                }));
            }
        }
        if (attachment.kind === 'symbol') {
            const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
            this._register(this.instantiationService.invokeFunction(accessor => hookUpSymbolAttachmentDragAndContextMenu(accessor, this.element, scopedContextKeyService, { ...attachment, kind: attachment.symbolKind }, MenuId.ChatInputSymbolAttachmentContext)));
        }
        if (resource) {
            this.addResourceOpenHandlers(resource, range);
        }
        this.attachClearButton();
    }
};
DefaultChatAttachmentWidget = __decorate([
    __param(8, ICommandService),
    __param(9, IOpenerService),
    __param(10, IContextKeyService),
    __param(11, IInstantiationService)
], DefaultChatAttachmentWidget);
export { DefaultChatAttachmentWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QXR0YWNobWVudFdpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUF1QixNQUFN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