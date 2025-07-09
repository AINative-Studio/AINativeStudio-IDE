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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { FileKind, FileType } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ResourcePool } from './chatCollections.js';
import { createFileIconThemableTreeContainerScope } from '../../../files/browser/views/explorerView.js';
const $ = dom.$;
let ChatTreeContentPart = class ChatTreeContentPart extends Disposable {
    constructor(data, element, treePool, treeDataIndex, openerService) {
        super();
        this.openerService = openerService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const ref = this._register(treePool.get());
        this.tree = ref.object;
        this.onDidFocus = this.tree.onDidFocus;
        this._register(this.tree.onDidOpen((e) => {
            if (e.element && !('children' in e.element)) {
                this.openerService.open(e.element.uri);
            }
        }));
        this._register(this.tree.onDidChangeCollapseState(() => {
            this._onDidChangeHeight.fire();
        }));
        this._register(this.tree.onContextMenu((e) => {
            e.browserEvent.preventDefault();
            e.browserEvent.stopPropagation();
        }));
        this.tree.setInput(data).then(() => {
            if (!ref.isStale()) {
                this.tree.layout();
                this._onDidChangeHeight.fire();
            }
        });
        this.domNode = this.tree.getHTMLElement().parentElement;
    }
    domFocus() {
        this.tree.domFocus();
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'treeData';
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatTreeContentPart = __decorate([
    __param(4, IOpenerService)
], ChatTreeContentPart);
export { ChatTreeContentPart };
let TreePool = class TreePool extends Disposable {
    get inUse() {
        return this._pool.inUse;
    }
    constructor(_onDidChangeVisibility, instantiationService, configService, themeService) {
        super();
        this._onDidChangeVisibility = _onDidChangeVisibility;
        this.instantiationService = instantiationService;
        this.configService = configService;
        this.themeService = themeService;
        this._pool = this._register(new ResourcePool(() => this.treeFactory()));
    }
    treeFactory() {
        const resourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this._onDidChangeVisibility }));
        const container = $('.interactive-response-progress-tree');
        this._register(createFileIconThemableTreeContainerScope(container, this.themeService));
        const tree = this.instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'ChatListRenderer', container, new ChatListTreeDelegate(), new ChatListTreeCompressionDelegate(), [new ChatListTreeRenderer(resourceLabels, this.configService.getValue('explorer.decorations'))], new ChatListTreeDataSource(), {
            collapseByDefault: () => false,
            expandOnlyOnTwistieClick: () => false,
            identityProvider: {
                getId: (e) => e.uri.toString()
            },
            accessibilityProvider: {
                getAriaLabel: (element) => element.label,
                getWidgetAriaLabel: () => localize('treeAriaLabel', "File Tree")
            },
            alwaysConsumeMouseWheel: false
        });
        return tree;
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
TreePool = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, IThemeService)
], TreePool);
export { TreePool };
class ChatListTreeDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return ChatListTreeDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        return 'chatListTreeTemplate';
    }
}
class ChatListTreeCompressionDelegate {
    isIncompressible(element) {
        return !element.children;
    }
}
class ChatListTreeRenderer {
    constructor(labels, decorations) {
        this.labels = labels;
        this.decorations = decorations;
        this.templateId = 'chatListTreeTemplate';
    }
    renderCompressedElements(element, index, templateData, height) {
        templateData.label.element.style.display = 'flex';
        const label = element.element.elements.map((e) => e.label);
        templateData.label.setResource({ resource: element.element.elements[0].uri, name: label }, {
            title: element.element.elements[0].label,
            fileKind: element.children ? FileKind.FOLDER : FileKind.FILE,
            extraClasses: ['explorer-item'],
            fileDecorations: this.decorations
        });
    }
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const label = templateDisposables.add(this.labels.create(container, { supportHighlights: true }));
        return { templateDisposables, label };
    }
    renderElement(element, index, templateData, height) {
        templateData.label.element.style.display = 'flex';
        if (!element.children.length && element.element.type !== FileType.Directory) {
            templateData.label.setFile(element.element.uri, {
                fileKind: FileKind.FILE,
                hidePath: true,
                fileDecorations: this.decorations,
            });
        }
        else {
            templateData.label.setResource({ resource: element.element.uri, name: element.element.label }, {
                title: element.element.label,
                fileKind: FileKind.FOLDER,
                fileDecorations: this.decorations
            });
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class ChatListTreeDataSource {
    hasChildren(element) {
        return !!element.children;
    }
    async getChildren(element) {
        return element.children ?? [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRyZWVDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0VHJlZUNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFNMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDekcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQWtCLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRS9FLE9BQU8sRUFBd0IsWUFBWSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFJMUUsT0FBTyxFQUFFLHdDQUF3QyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHeEcsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVULElBQU0sbUJBQW1C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