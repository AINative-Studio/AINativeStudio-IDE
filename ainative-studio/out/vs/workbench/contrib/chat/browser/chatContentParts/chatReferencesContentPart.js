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
var CollapsibleListRenderer_1;
import * as dom from '../../../../../base/browser/dom.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { matchesSomeScheme, Schemas } from '../../../../../base/common/network.js';
import { basename } from '../../../../../base/common/path.js';
import { basenameOrAuthority, isEqualAuthority } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ColorScheme } from '../../../../browser/web.api.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { SETTINGS_AUTHORITY } from '../../../../services/preferences/common/preferences.js';
import { createFileIconThemableTreeContainerScope } from '../../../files/browser/views/explorerView.js';
import { ExplorerFolderContext } from '../../../files/common/files.js';
import { chatEditingWidgetFileStateContextKey } from '../../common/chatEditingService.js';
import { ChatResponseReferencePartStatusKind } from '../../common/chatService.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { IChatWidgetService } from '../chat.js';
import { ChatCollapsibleContentPart } from './chatCollapsibleContentPart.js';
import { ResourcePool } from './chatCollections.js';
export const $ = dom.$;
let ChatCollapsibleListContentPart = class ChatCollapsibleListContentPart extends ChatCollapsibleContentPart {
    constructor(data, labelOverride, context, contentReferencesListPool, openerService, menuService, instantiationService, contextMenuService) {
        super(labelOverride ?? (data.length > 1 ?
            localize('usedReferencesPlural', "Used {0} references", data.length) :
            localize('usedReferencesSingular', "Used {0} reference", 1)), context);
        this.data = data;
        this.contentReferencesListPool = contentReferencesListPool;
        this.openerService = openerService;
        this.menuService = menuService;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
    }
    initContent() {
        const ref = this._register(this.contentReferencesListPool.get());
        const list = ref.object;
        this._register(list.onDidOpen((e) => {
            if (e.element && 'reference' in e.element && typeof e.element.reference === 'object') {
                const uriOrLocation = 'variableName' in e.element.reference ? e.element.reference.value : e.element.reference;
                const uri = URI.isUri(uriOrLocation) ? uriOrLocation :
                    uriOrLocation?.uri;
                if (uri) {
                    this.openerService.open(uri, {
                        fromUserGesture: true,
                        editorOptions: {
                            ...e.editorOptions,
                            ...{
                                selection: uriOrLocation && 'range' in uriOrLocation ? uriOrLocation.range : undefined
                            }
                        }
                    });
                }
            }
        }));
        this._register(list.onContextMenu(e => {
            dom.EventHelper.stop(e.browserEvent, true);
            const uri = e.element && getResourceForElement(e.element);
            if (!uri) {
                return;
            }
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => {
                    const menu = this.menuService.getMenuActions(MenuId.ChatAttachmentsContext, list.contextKeyService, { shouldForwardArgs: true, arg: uri });
                    return getFlatContextMenuActions(menu);
                }
            });
        }));
        const resourceContextKey = this._register(this.instantiationService.createInstance(ResourceContextKey));
        this._register(list.onDidChangeFocus(e => {
            resourceContextKey.reset();
            const element = e.elements.length ? e.elements[0] : undefined;
            const uri = element && getResourceForElement(element);
            resourceContextKey.set(uri ?? null);
        }));
        const maxItemsShown = 6;
        const itemsShown = Math.min(this.data.length, maxItemsShown);
        const height = itemsShown * 22;
        list.layout(height);
        list.getHTMLElement().style.height = `${height}px`;
        list.splice(0, list.length, this.data);
        return list.getHTMLElement().parentElement;
    }
    hasSameContent(other, followingContent, element) {
        return other.kind === 'references' && other.references.length === this.data.length && (!!followingContent.length === this.hasFollowingContent);
    }
};
ChatCollapsibleListContentPart = __decorate([
    __param(4, IOpenerService),
    __param(5, IMenuService),
    __param(6, IInstantiationService),
    __param(7, IContextMenuService)
], ChatCollapsibleListContentPart);
export { ChatCollapsibleListContentPart };
let ChatUsedReferencesListContentPart = class ChatUsedReferencesListContentPart extends ChatCollapsibleListContentPart {
    constructor(data, labelOverride, context, contentReferencesListPool, options, openerService, menuService, instantiationService, contextMenuService) {
        super(data, labelOverride, context, contentReferencesListPool, openerService, menuService, instantiationService, contextMenuService);
        this.options = options;
        if (data.length === 0) {
            dom.hide(this.domNode);
        }
    }
    isExpanded() {
        const element = this.context.element;
        return element.usedReferencesExpanded ?? !!(this.options.expandedWhenEmptyResponse && element.response.value.length === 0);
    }
    setExpanded(value) {
        const element = this.context.element;
        element.usedReferencesExpanded = !this.isExpanded();
    }
};
ChatUsedReferencesListContentPart = __decorate([
    __param(5, IOpenerService),
    __param(6, IMenuService),
    __param(7, IInstantiationService),
    __param(8, IContextMenuService)
], ChatUsedReferencesListContentPart);
export { ChatUsedReferencesListContentPart };
let CollapsibleListPool = class CollapsibleListPool extends Disposable {
    get inUse() {
        return this._pool.inUse;
    }
    constructor(_onDidChangeVisibility, menuId, instantiationService, themeService, labelService) {
        super();
        this._onDidChangeVisibility = _onDidChangeVisibility;
        this.menuId = menuId;
        this.instantiationService = instantiationService;
        this.themeService = themeService;
        this.labelService = labelService;
        this._pool = this._register(new ResourcePool(() => this.listFactory()));
    }
    listFactory() {
        const resourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this._onDidChangeVisibility }));
        const container = $('.chat-used-context-list');
        this._register(createFileIconThemableTreeContainerScope(container, this.themeService));
        const list = this.instantiationService.createInstance((WorkbenchList), 'ChatListRenderer', container, new CollapsibleListDelegate(), [this.instantiationService.createInstance(CollapsibleListRenderer, resourceLabels, this.menuId)], {
            alwaysConsumeMouseWheel: false,
            accessibilityProvider: {
                getAriaLabel: (element) => {
                    if (element.kind === 'warning') {
                        return element.content.value;
                    }
                    const reference = element.reference;
                    if (typeof reference === 'string') {
                        return reference;
                    }
                    else if ('variableName' in reference) {
                        return reference.variableName;
                    }
                    else if (URI.isUri(reference)) {
                        return basename(reference.path);
                    }
                    else {
                        return basename(reference.uri.path);
                    }
                },
                getWidgetAriaLabel: () => localize('chatCollapsibleList', "Collapsible Chat List")
            },
            dnd: {
                getDragURI: (element) => getResourceForElement(element)?.toString() ?? null,
                getDragLabel: (elements, originalEvent) => {
                    const uris = coalesce(elements.map(getResourceForElement));
                    if (!uris.length) {
                        return undefined;
                    }
                    else if (uris.length === 1) {
                        return this.labelService.getUriLabel(uris[0], { relative: true });
                    }
                    else {
                        return `${uris.length}`;
                    }
                },
                dispose: () => { },
                onDragOver: () => false,
                drop: () => { },
                onDragStart: (data, originalEvent) => {
                    try {
                        const elements = data.getData();
                        const uris = coalesce(elements.map(getResourceForElement));
                        this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, uris, originalEvent));
                    }
                    catch {
                        // noop
                    }
                },
            },
        });
        return list;
    }
    get() {
        const object = this._pool.get();
        let stale = false;
        return {
            object,
            isStale: () => stale,
            dispose: () => {
                stale = true;
                this._pool.release(object);
            }
        };
    }
};
CollapsibleListPool = __decorate([
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, ILabelService)
], CollapsibleListPool);
export { CollapsibleListPool };
class CollapsibleListDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return CollapsibleListRenderer.TEMPLATE_ID;
    }
}
let CollapsibleListRenderer = class CollapsibleListRenderer {
    static { CollapsibleListRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'chatCollapsibleListRenderer'; }
    constructor(labels, menuId, themeService, productService, instantiationService, contextKeyService) {
        this.labels = labels;
        this.menuId = menuId;
        this.themeService = themeService;
        this.productService = productService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = CollapsibleListRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const label = templateDisposables.add(this.labels.create(container, { supportHighlights: true, supportIcons: true }));
        let toolbar;
        let actionBarContainer;
        let contextKeyService;
        if (this.menuId) {
            actionBarContainer = $('.chat-collapsible-list-action-bar');
            contextKeyService = templateDisposables.add(this.contextKeyService.createScoped(actionBarContainer));
            const scopedInstantiationService = templateDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyService])));
            toolbar = templateDisposables.add(scopedInstantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, this.menuId, { menuOptions: { shouldForwardArgs: true, arg: undefined } }));
            label.element.appendChild(actionBarContainer);
        }
        return { templateDisposables, label, toolbar, actionBarContainer, contextKeyService };
    }
    getReferenceIcon(data) {
        if (ThemeIcon.isThemeIcon(data.iconPath)) {
            return data.iconPath;
        }
        else {
            return this.themeService.getColorTheme().type === ColorScheme.DARK && data.iconPath?.dark
                ? data.iconPath?.dark
                : data.iconPath?.light;
        }
    }
    renderElement(data, index, templateData, height) {
        if (data.kind === 'warning') {
            templateData.label.setResource({ name: data.content.value }, { icon: Codicon.warning });
            return;
        }
        const reference = data.reference;
        const icon = this.getReferenceIcon(data);
        templateData.label.element.style.display = 'flex';
        let arg;
        if (typeof reference === 'object' && 'variableName' in reference) {
            if (reference.value) {
                const uri = URI.isUri(reference.value) ? reference.value : reference.value.uri;
                templateData.label.setResource({
                    resource: uri,
                    name: basenameOrAuthority(uri),
                    description: `#${reference.variableName}`,
                    range: 'range' in reference.value ? reference.value.range : undefined,
                }, { icon, title: data.options?.status?.description ?? data.title });
            }
            else if (reference.variableName.startsWith('kernelVariable')) {
                const variable = reference.variableName.split(':')[1];
                const asVariableName = `${variable}`;
                const label = `Kernel variable`;
                templateData.label.setLabel(label, asVariableName, { title: data.options?.status?.description });
            }
            else {
                // Nothing else is expected to fall into here
                templateData.label.setLabel('Unknown variable type');
            }
        }
        else if (typeof reference === 'string') {
            templateData.label.setLabel(reference, undefined, { iconPath: URI.isUri(icon) ? icon : undefined, title: data.options?.status?.description ?? data.title });
        }
        else {
            const uri = 'uri' in reference ? reference.uri : reference;
            arg = uri;
            const extraClasses = data.excluded ? ['excluded'] : [];
            if (uri.scheme === 'https' && isEqualAuthority(uri.authority, 'github.com') && uri.path.includes('/tree/')) {
                // Parse a nicer label for GitHub URIs that point at a particular commit + file
                const label = uri.path.split('/').slice(1, 3).join('/');
                const description = uri.path.split('/').slice(5).join('/');
                templateData.label.setResource({ resource: uri, name: label, description }, { icon: Codicon.github, title: data.title, strikethrough: data.excluded, extraClasses });
            }
            else if (uri.scheme === this.productService.urlProtocol && isEqualAuthority(uri.authority, SETTINGS_AUTHORITY)) {
                // a nicer label for settings URIs
                const settingId = uri.path.substring(1);
                templateData.label.setResource({ resource: uri, name: settingId }, { icon: Codicon.settingsGear, title: localize('setting.hover', "Open setting '{0}'", settingId), strikethrough: data.excluded, extraClasses });
            }
            else if (matchesSomeScheme(uri, Schemas.mailto, Schemas.http, Schemas.https)) {
                templateData.label.setResource({ resource: uri, name: uri.toString() }, { icon: icon ?? Codicon.globe, title: data.options?.status?.description ?? data.title ?? uri.toString(), strikethrough: data.excluded, extraClasses });
            }
            else {
                templateData.label.setFile(uri, {
                    fileKind: FileKind.FILE,
                    // Should not have this live-updating data on a historical reference
                    fileDecorations: undefined,
                    range: 'range' in reference ? reference.range : undefined,
                    title: data.options?.status?.description ?? data.title,
                    strikethrough: data.excluded,
                    extraClasses
                });
            }
        }
        for (const selector of ['.monaco-icon-suffix-container', '.monaco-icon-name-container']) {
            const element = templateData.label.element.querySelector(selector);
            if (element) {
                if (data.options?.status?.kind === ChatResponseReferencePartStatusKind.Omitted || data.options?.status?.kind === ChatResponseReferencePartStatusKind.Partial) {
                    element.classList.add('warning');
                }
                else {
                    element.classList.remove('warning');
                }
            }
        }
        if (data.state !== undefined) {
            if (templateData.actionBarContainer) {
                if (data.state === 0 /* WorkingSetEntryState.Modified */ && !templateData.actionBarContainer.classList.contains('modified')) {
                    templateData.actionBarContainer.classList.add('modified');
                    templateData.label.element.querySelector('.monaco-icon-name-container')?.classList.add('modified');
                }
                else if (data.state !== 0 /* WorkingSetEntryState.Modified */) {
                    templateData.actionBarContainer.classList.remove('modified');
                    templateData.label.element.querySelector('.monaco-icon-name-container')?.classList.remove('modified');
                }
            }
            if (templateData.toolbar) {
                templateData.toolbar.context = arg;
            }
            if (templateData.contextKeyService) {
                if (data.state !== undefined) {
                    chatEditingWidgetFileStateContextKey.bindTo(templateData.contextKeyService).set(data.state);
                }
            }
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
CollapsibleListRenderer = CollapsibleListRenderer_1 = __decorate([
    __param(2, IThemeService),
    __param(3, IProductService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], CollapsibleListRenderer);
function getResourceForElement(element) {
    if (element.kind === 'warning') {
        return null;
    }
    const { reference } = element;
    if (typeof reference === 'string' || 'variableName' in reference) {
        return null;
    }
    else if (URI.isUri(reference)) {
        return reference;
    }
    else {
        return reference.uri;
    }
}
//#region Resource context menu
registerAction2(class AddToChatAction extends Action2 {
    static { this.id = 'workbench.action.chat.addToChatAction'; }
    constructor() {
        super({
            id: AddToChatAction.id,
            title: {
                ...localize2('addToChat', "Add File to Chat"),
            },
            f1: false,
            menu: [{
                    id: MenuId.ChatAttachmentsContext,
                    group: 'chat',
                    order: 1,
                    when: ContextKeyExpr.and(ResourceContextKey.IsFileSystemResource, ExplorerFolderContext.negate()),
                }]
        });
    }
    async run(accessor, resource) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const variablesService = accessor.get(IChatVariablesService);
        if (!resource) {
            return;
        }
        const widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        variablesService.attachContext('file', resource, widget.location);
    }
});
registerAction2(class OpenChatReferenceLinkAction extends Action2 {
    static { this.id = 'workbench.action.chat.copyLink'; }
    constructor() {
        super({
            id: OpenChatReferenceLinkAction.id,
            title: {
                ...localize2('copyLink', "Copy Link"),
            },
            f1: false,
            menu: [{
                    id: MenuId.ChatAttachmentsContext,
                    group: 'chat',
                    order: 0,
                    when: ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.http), ResourceContextKey.Scheme.isEqualTo(Schemas.https)),
                }]
        });
    }
    async run(accessor, resource) {
        await accessor.get(IClipboardService).writeResources([resource]);
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlZmVyZW5jZXNDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0UmVmZXJlbmNlc0NvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUMvRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1E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