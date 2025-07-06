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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRyZWVDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRUcmVlQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQU0xRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBa0IsY0FBYyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFL0UsT0FBTyxFQUF3QixZQUFZLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUkxRSxPQUFPLEVBQUUsd0NBQXdDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUd4RyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRVQsSUFBTSxtQkFBbUIs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