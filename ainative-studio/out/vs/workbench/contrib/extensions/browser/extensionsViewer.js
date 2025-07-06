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
var ExtensionRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { dispose, Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { Action } from '../../../../base/common/actions.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { Event } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IListService, WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Renderer } from './extensionsList.js';
import { listFocusForeground, listFocusBackground, foreground, editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { getAriaLabelForExtension } from './extensionsViews.js';
let ExtensionsGridView = class ExtensionsGridView extends Disposable {
    constructor(parent, delegate, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.element = dom.append(parent, dom.$('.extensions-grid-view'));
        this.renderer = this.instantiationService.createInstance(Renderer, { onFocus: Event.None, onBlur: Event.None, filters: {} }, { hoverOptions: { position() { return 2 /* HoverPosition.BELOW */; } } });
        this.delegate = delegate;
        this.disposableStore = this._register(new DisposableStore());
    }
    setExtensions(extensions) {
        this.disposableStore.clear();
        extensions.forEach((e, index) => this.renderExtension(e, index));
    }
    renderExtension(extension, index) {
        const extensionContainer = dom.append(this.element, dom.$('.extension-container'));
        extensionContainer.style.height = `${this.delegate.getHeight()}px`;
        extensionContainer.setAttribute('tabindex', '0');
        const template = this.renderer.renderTemplate(extensionContainer);
        this.disposableStore.add(toDisposable(() => this.renderer.disposeTemplate(template)));
        const openExtensionAction = this.instantiationService.createInstance(OpenExtensionAction);
        openExtensionAction.extension = extension;
        template.name.setAttribute('tabindex', '0');
        const handleEvent = (e) => {
            if (e instanceof StandardKeyboardEvent && e.keyCode !== 3 /* KeyCode.Enter */) {
                return;
            }
            openExtensionAction.run(e.ctrlKey || e.metaKey);
            e.stopPropagation();
            e.preventDefault();
        };
        this.disposableStore.add(dom.addDisposableListener(template.name, dom.EventType.CLICK, (e) => handleEvent(new StandardMouseEvent(dom.getWindow(template.name), e))));
        this.disposableStore.add(dom.addDisposableListener(template.name, dom.EventType.KEY_DOWN, (e) => handleEvent(new StandardKeyboardEvent(e))));
        this.disposableStore.add(dom.addDisposableListener(extensionContainer, dom.EventType.KEY_DOWN, (e) => handleEvent(new StandardKeyboardEvent(e))));
        this.renderer.renderElement(extension, index, template);
    }
};
ExtensionsGridView = __decorate([
    __param(2, IInstantiationService)
], ExtensionsGridView);
export { ExtensionsGridView };
class AsyncDataSource {
    hasChildren({ hasChildren }) {
        return hasChildren;
    }
    getChildren(extensionData) {
        return extensionData.getChildren();
    }
}
class VirualDelegate {
    getHeight(element) {
        return 62;
    }
    getTemplateId({ extension }) {
        return extension ? ExtensionRenderer.TEMPLATE_ID : UnknownExtensionRenderer.TEMPLATE_ID;
    }
}
let ExtensionRenderer = class ExtensionRenderer {
    static { ExtensionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'extension-template'; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    get templateId() {
        return ExtensionRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        container.classList.add('extension');
        const icon = dom.append(container, dom.$('img.icon'));
        const details = dom.append(container, dom.$('.details'));
        const header = dom.append(details, dom.$('.header'));
        const name = dom.append(header, dom.$('span.name'));
        const openExtensionAction = this.instantiationService.createInstance(OpenExtensionAction);
        const extensionDisposables = [dom.addDisposableListener(name, 'click', (e) => {
                openExtensionAction.run(e.ctrlKey || e.metaKey);
                e.stopPropagation();
                e.preventDefault();
            })];
        const identifier = dom.append(header, dom.$('span.identifier'));
        const footer = dom.append(details, dom.$('.footer'));
        const author = dom.append(footer, dom.$('.author'));
        return {
            icon,
            name,
            identifier,
            author,
            extensionDisposables,
            set extensionData(extensionData) {
                openExtensionAction.extension = extensionData.extension;
            }
        };
    }
    renderElement(node, index, data) {
        const extension = node.element.extension;
        data.extensionDisposables.push(dom.addDisposableListener(data.icon, 'error', () => data.icon.src = extension.iconUrlFallback, { once: true }));
        data.icon.src = extension.iconUrl;
        if (!data.icon.complete) {
            data.icon.style.visibility = 'hidden';
            data.icon.onload = () => data.icon.style.visibility = 'inherit';
        }
        else {
            data.icon.style.visibility = 'inherit';
        }
        data.name.textContent = extension.displayName;
        data.identifier.textContent = extension.identifier.id;
        data.author.textContent = extension.publisherDisplayName;
        data.extensionData = node.element;
    }
    disposeTemplate(templateData) {
        templateData.extensionDisposables = dispose(templateData.extensionDisposables);
    }
};
ExtensionRenderer = ExtensionRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], ExtensionRenderer);
class UnknownExtensionRenderer {
    static { this.TEMPLATE_ID = 'unknown-extension-template'; }
    get templateId() {
        return UnknownExtensionRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const messageContainer = dom.append(container, dom.$('div.unknown-extension'));
        dom.append(messageContainer, dom.$('span.error-marker')).textContent = localize('error', "Error");
        dom.append(messageContainer, dom.$('span.message')).textContent = localize('Unknown Extension', "Unknown Extension:");
        const identifier = dom.append(messageContainer, dom.$('span.message'));
        return { identifier };
    }
    renderElement(node, index, data) {
        data.identifier.textContent = node.element.extension.identifier.id;
    }
    disposeTemplate(data) {
    }
}
let OpenExtensionAction = class OpenExtensionAction extends Action {
    constructor(extensionsWorkdbenchService) {
        super('extensions.action.openExtension', '');
        this.extensionsWorkdbenchService = extensionsWorkdbenchService;
    }
    set extension(extension) {
        this._extension = extension;
    }
    run(sideByside) {
        if (this._extension) {
            return this.extensionsWorkdbenchService.open(this._extension, { sideByside });
        }
        return Promise.resolve();
    }
};
OpenExtensionAction = __decorate([
    __param(0, IExtensionsWorkbenchService)
], OpenExtensionAction);
let ExtensionsTree = class ExtensionsTree extends WorkbenchAsyncDataTree {
    constructor(input, container, overrideStyles, contextKeyService, listService, instantiationService, configurationService, extensionsWorkdbenchService) {
        const delegate = new VirualDelegate();
        const dataSource = new AsyncDataSource();
        const renderers = [instantiationService.createInstance(ExtensionRenderer), instantiationService.createInstance(UnknownExtensionRenderer)];
        const identityProvider = {
            getId({ extension, parent }) {
                return parent ? this.getId(parent) + '/' + extension.identifier.id : extension.identifier.id;
            }
        };
        super('ExtensionsTree', container, delegate, renderers, dataSource, {
            indent: 40,
            identityProvider,
            multipleSelectionSupport: false,
            overrideStyles,
            accessibilityProvider: {
                getAriaLabel(extensionData) {
                    return getAriaLabelForExtension(extensionData.extension);
                },
                getWidgetAriaLabel() {
                    return localize('extensions', "Extensions");
                }
            }
        }, instantiationService, contextKeyService, listService, configurationService);
        this.setInput(input);
        this.disposables.add(this.onDidChangeSelection(event => {
            if (dom.isKeyboardEvent(event.browserEvent)) {
                extensionsWorkdbenchService.open(event.elements[0].extension, { sideByside: false });
            }
        }));
    }
};
ExtensionsTree = __decorate([
    __param(3, IContextKeyService),
    __param(4, IListService),
    __param(5, IInstantiationService),
    __param(6, IConfigurationService),
    __param(7, IExtensionsWorkbenchService)
], ExtensionsTree);
export { ExtensionsTree };
export class ExtensionData {
    constructor(extension, parent, getChildrenExtensionIds, extensionsWorkbenchService) {
        this.extension = extension;
        this.parent = parent;
        this.getChildrenExtensionIds = getChildrenExtensionIds;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.childrenExtensionIds = this.getChildrenExtensionIds(extension);
    }
    get hasChildren() {
        return isNonEmptyArray(this.childrenExtensionIds);
    }
    async getChildren() {
        if (this.hasChildren) {
            const result = await getExtensions(this.childrenExtensionIds, this.extensionsWorkbenchService);
            return result.map(extension => new ExtensionData(extension, this, this.getChildrenExtensionIds, this.extensionsWorkbenchService));
        }
        return null;
    }
}
export async function getExtensions(extensions, extensionsWorkbenchService) {
    const localById = extensionsWorkbenchService.local.reduce((result, e) => { result.set(e.identifier.id.toLowerCase(), e); return result; }, new Map());
    const result = [];
    const toQuery = [];
    for (const extensionId of extensions) {
        const id = extensionId.toLowerCase();
        const local = localById.get(id);
        if (local) {
            result.push(local);
        }
        else {
            toQuery.push(id);
        }
    }
    if (toQuery.length) {
        const galleryResult = await extensionsWorkbenchService.getExtensions(toQuery.map(id => ({ id })), CancellationToken.None);
        result.push(...galleryResult);
    }
    return result;
}
registerThemingParticipant((theme, collector) => {
    const focusBackground = theme.getColor(listFocusBackground);
    if (focusBackground) {
        collector.addRule(`.extensions-grid-view .extension-container:focus { background-color: ${focusBackground}; outline: none; }`);
    }
    const focusForeground = theme.getColor(listFocusForeground);
    if (focusForeground) {
        collector.addRule(`.extensions-grid-view .extension-container:focus { color: ${focusForeground}; }`);
    }
    const foregroundColor = theme.getColor(foreground);
    const editorBackgroundColor = theme.getColor(editorBackground);
    if (foregroundColor && editorBackgroundColor) {
        const authorForeground = foregroundColor.transparent(.9).makeOpaque(editorBackgroundColor);
        collector.addRule(`.extensions-grid-view .extension-container:not(.disabled) .author { color: ${authorForeground}; }`);
        const disabledExtensionForeground = foregroundColor.transparent(.5).makeOpaque(editorBackgroundColor);
        collector.addRule(`.extensions-grid-view .extension-container.disabled { color: ${disabledExtensionForeground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zVmlld2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQWUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSwyQkFBMkIsRUFBYyxNQUFNLHlCQUF5QixDQUFDO0FBQ2xGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLDBCQUEwQixFQUFtQyxNQUFNLG1EQUFtRCxDQUFDO0FBR2hJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQVksUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDekQs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