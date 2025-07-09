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
import { localize } from '../../../../../../nls.js';
import { URI } from '../../../../../../base/common/uri.js';
import * as dom from '../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { ResourceContextKey } from '../../../../../common/contextkeys.js';
import { Button } from '../../../../../../base/browser/ui/button/button.js';
import { basename, dirname } from '../../../../../../base/common/resources.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { StandardMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { FileKind, IFileService } from '../../../../../../platform/files/common/files.js';
import { IMenuService, MenuId } from '../../../../../../platform/actions/common/actions.js';
import { getCleanPromptName } from '../../../../../../platform/prompts/common/constants.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { getDefaultHoverDelegate } from '../../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { getFlatContextMenuActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
/**
 * Widget for a single prompt instructions attachment.
 */
let PromptAttachmentWidget = class PromptAttachmentWidget extends Disposable {
    /**
     * Get the `URI` associated with the model reference.
     */
    get uri() {
        return this.model.reference.uri;
    }
    /**
     * Subscribe to the `onDispose` event.
     * @param callback Function to invoke on dispose.
     */
    onDispose(callback) {
        this._register(this._onDispose.event(callback));
        return this;
    }
    constructor(model, resourceLabels, contextKeyService, contextMenuService, hoverService, labelService, menuService, fileService, languageService, modelService) {
        super();
        this.model = model;
        this.resourceLabels = resourceLabels;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        this.menuService = menuService;
        this.fileService = fileService;
        this.languageService = languageService;
        this.modelService = modelService;
        /**
         * Event that fires when the object is disposed.
         *
         * See {@linkcode onDispose}.
         */
        this._onDispose = this._register(new Emitter());
        /**
         * Temporary disposables used for rendering purposes.
         */
        this.renderDisposables = this._register(new DisposableStore());
        this.domNode = dom.$('.chat-prompt-attachment.chat-attached-context-attachment.show-file-icons.implicit');
        this.render = this.render.bind(this);
        this.dispose = this.dispose.bind(this);
        this.model.onUpdate(this.render);
        this.model.onDispose(this.dispose);
        this.render();
    }
    /**
     * Render this widget.
     */
    render() {
        dom.clearNode(this.domNode);
        this.renderDisposables.clear();
        this.domNode.classList.remove('warning', 'error', 'disabled');
        const { topError } = this.model;
        const label = this.resourceLabels.create(this.domNode, { supportIcons: true });
        const file = this.model.reference.uri;
        const fileBasename = basename(file);
        const fileDirname = dirname(file);
        const friendlyName = `${fileBasename} ${fileDirname}`;
        const ariaLabel = localize('chat.promptAttachment', "Prompt attachment, {0}", friendlyName);
        const uriLabel = this.labelService.getUriLabel(file, { relative: true });
        const promptLabel = localize('prompt', "Prompt");
        let title = `${promptLabel} ${uriLabel}`;
        // if there are some errors/warning during the process of resolving
        // attachment references (including all the nested child references),
        // add the issue details in the hover title for the attachment, one
        // error/warning at a time because there is a limited space available
        if (topError) {
            const { errorSubject: subject } = topError;
            const isError = (subject === 'root');
            this.domNode.classList.add((isError) ? 'error' : 'warning');
            const severity = (isError)
                ? localize('error', "Error")
                : localize('warning', "Warning");
            title += `\n[${severity}]: ${topError.localizedMessage}`;
        }
        const fileWithoutExtension = getCleanPromptName(file);
        label.setFile(URI.file(fileWithoutExtension), {
            fileKind: FileKind.FILE,
            hidePath: true,
            range: undefined,
            title,
            icon: ThemeIcon.fromId(Codicon.bookmark.id),
            extraClasses: [],
        });
        this.domNode.ariaLabel = ariaLabel;
        this.domNode.tabIndex = 0;
        const hintElement = dom.append(this.domNode, dom.$('span.chat-implicit-hint', undefined, promptLabel));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), hintElement, title));
        // create the `remove` button
        const removeButton = this.renderDisposables.add(new Button(this.domNode, {
            supportIcons: true,
            title: localize('remove', "Remove"),
        }));
        removeButton.icon = Codicon.close;
        this.renderDisposables.add(removeButton.onDidClick((e) => {
            e.stopPropagation();
            this.model.dispose();
        }));
        // context menu
        const scopedContextKeyService = this.renderDisposables.add(this.contextKeyService.createScoped(this.domNode));
        const resourceContextKey = this.renderDisposables.add(new ResourceContextKey(scopedContextKeyService, this.fileService, this.languageService, this.modelService));
        resourceContextKey.set(file);
        this.renderDisposables.add(dom.addDisposableListener(this.domNode, dom.EventType.CONTEXT_MENU, async (domEvent) => {
            const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
            dom.EventHelper.stop(domEvent, true);
            this.contextMenuService.showContextMenu({
                contextKeyService: scopedContextKeyService,
                getAnchor: () => event,
                getActions: () => {
                    const menu = this.menuService.getMenuActions(MenuId.ChatInputResourceAttachmentContext, scopedContextKeyService, { arg: file });
                    return getFlatContextMenuActions(menu);
                },
            });
        }));
    }
    dispose() {
        this._onDispose.fire();
        super.dispose();
    }
};
PromptAttachmentWidget = __decorate([
    __param(2, IContextKeyService),
    __param(3, IContextMenuService),
    __param(4, IHoverService),
    __param(5, ILabelService),
    __param(6, IMenuService),
    __param(7, IFileService),
    __param(8, ILanguageService),
    __param(9, IModelService)
], PromptAttachmentWidget);
export { PromptAttachmentWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0QXR0YWNobWVudFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYXR0YWNobWVudHMvcHJvbXB0QXR0YWNobWVudHMvcHJvbXB0QXR0YWNobWVudFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztB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