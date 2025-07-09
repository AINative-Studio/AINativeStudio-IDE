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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc1ZpZXdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFlLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsMkJBQTJCLEVBQWMsTUFBTSx5QkFBeUIsQ0FBQztBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSwwQkFBMEIsRUFBbUMsTUFBTSxtREFBbUQsQ0FBQztBQUdoSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFZLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3pE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