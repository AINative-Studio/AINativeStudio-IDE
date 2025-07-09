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
import * as resources from '../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../base/common/strings.js';
import { localize } from '../../../nls.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier, ExtensionIdentifierSet } from '../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Extensions as ViewletExtensions } from '../../browser/panecomposite.js';
import { CustomTreeView, TreeViewPane } from '../../browser/parts/views/treeView.js';
import { ViewPaneContainer } from '../../browser/parts/views/viewPaneContainer.js';
import { registerWorkbenchContribution2 } from '../../common/contributions.js';
import { Extensions as ViewContainerExtensions } from '../../common/views.js';
import { VIEWLET_ID as DEBUG } from '../../contrib/debug/common/debug.js';
import { VIEWLET_ID as EXPLORER } from '../../contrib/files/common/files.js';
import { VIEWLET_ID as REMOTE } from '../../contrib/remote/browser/remoteExplorer.js';
import { VIEWLET_ID as SCM } from '../../contrib/scm/common/scm.js';
import { WebviewViewPane } from '../../contrib/webviewView/browser/webviewViewPane.js';
import { isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../services/extensions/common/extensionsRegistry.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { Extensions as ExtensionFeaturesRegistryExtensions } from '../../services/extensionManagement/common/extensionFeatures.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
const viewsContainerSchema = {
    type: 'object',
    properties: {
        id: {
            description: localize({ key: 'vscode.extension.contributes.views.containers.id', comment: ['Contribution refers to those that an extension contributes to VS Code through an extension/contribution point. '] }, "Unique id used to identify the container in which views can be contributed using 'views' contribution point"),
            type: 'string',
            pattern: '^[a-zA-Z0-9_-]+$'
        },
        title: {
            description: localize('vscode.extension.contributes.views.containers.title', 'Human readable string used to render the container'),
            type: 'string'
        },
        icon: {
            description: localize('vscode.extension.contributes.views.containers.icon', "Path to the container icon. Icons are 24x24 centered on a 50x40 block and have a fill color of 'rgb(215, 218, 224)' or '#d7dae0'. It is recommended that icons be in SVG, though any image file type is accepted."),
            type: 'string'
        }
    },
    required: ['id', 'title', 'icon']
};
export const viewsContainersContribution = {
    description: localize('vscode.extension.contributes.viewsContainers', 'Contributes views containers to the editor'),
    type: 'object',
    properties: {
        'activitybar': {
            description: localize('views.container.activitybar', "Contribute views containers to Activity Bar"),
            type: 'array',
            items: viewsContainerSchema
        },
        'panel': {
            description: localize('views.container.panel', "Contribute views containers to Panel"),
            type: 'array',
            items: viewsContainerSchema
        }
    },
    additionalProperties: false
};
var ViewType;
(function (ViewType) {
    ViewType["Tree"] = "tree";
    ViewType["Webview"] = "webview";
})(ViewType || (ViewType = {}));
var InitialVisibility;
(function (InitialVisibility) {
    InitialVisibility["Visible"] = "visible";
    InitialVisibility["Hidden"] = "hidden";
    InitialVisibility["Collapsed"] = "collapsed";
})(InitialVisibility || (InitialVisibility = {}));
const viewDescriptor = {
    type: 'object',
    required: ['id', 'name', 'icon'],
    defaultSnippets: [{ body: { id: '${1:id}', name: '${2:name}', icon: '${3:icon}' } }],
    properties: {
        type: {
            markdownDescription: localize('vscode.extension.contributes.view.type', "Type of the view. This can either be `tree` for a tree view based view or `webview` for a webview based view. The default is `tree`."),
            type: 'string',
            enum: [
                'tree',
                'webview',
            ],
            markdownEnumDescriptions: [
                localize('vscode.extension.contributes.view.tree', "The view is backed by a `TreeView` created by `createTreeView`."),
                localize('vscode.extension.contributes.view.webview', "The view is backed by a `WebviewView` registered by `registerWebviewViewProvider`."),
            ]
        },
        id: {
            markdownDescription: localize('vscode.extension.contributes.view.id', 'Identifier of the view. This should be unique across all views. It is recommended to include your extension id as part of the view id. Use this to register a data provider through `vscode.window.registerTreeDataProviderForView` API. Also to trigger activating your extension by registering `onView:${id}` event to `activationEvents`.'),
            type: 'string'
        },
        name: {
            description: localize('vscode.extension.contributes.view.name', 'The human-readable name of the view. Will be shown'),
            type: 'string'
        },
        when: {
            description: localize('vscode.extension.contributes.view.when', 'Condition which must be true to show this view'),
            type: 'string'
        },
        icon: {
            description: localize('vscode.extension.contributes.view.icon', "Path to the view icon. View icons are displayed when the name of the view cannot be shown. It is recommended that icons be in SVG, though any image file type is accepted."),
            type: 'string'
        },
        contextualTitle: {
            description: localize('vscode.extension.contributes.view.contextualTitle', "Human-readable context for when the view is moved out of its original location. By default, the view's container name will be used."),
            type: 'string'
        },
        visibility: {
            description: localize('vscode.extension.contributes.view.initialState', "Initial state of the view when the extension is first installed. Once the user has changed the view state by collapsing, moving, or hiding the view, the initial state will not be used again."),
            type: 'string',
            enum: [
                'visible',
                'hidden',
                'collapsed'
            ],
            default: 'visible',
            enumDescriptions: [
                localize('vscode.extension.contributes.view.initialState.visible', "The default initial state for the view. In most containers the view will be expanded, however; some built-in containers (explorer, scm, and debug) show all contributed views collapsed regardless of the `visibility`."),
                localize('vscode.extension.contributes.view.initialState.hidden', "The view will not be shown in the view container, but will be discoverable through the views menu and other view entry points and can be un-hidden by the user."),
                localize('vscode.extension.contributes.view.initialState.collapsed', "The view will show in the view container, but will be collapsed.")
            ]
        },
        initialSize: {
            type: 'number',
            description: localize('vscode.extension.contributs.view.size', "The initial size of the view. The size will behave like the css 'flex' property, and will set the initial size when the view is first shown. In the side bar, this is the height of the view. This value is only respected when the same extension owns both the view and the view container."),
        },
        accessibilityHelpContent: {
            type: 'string',
            markdownDescription: localize('vscode.extension.contributes.view.accessibilityHelpContent', "When the accessibility help dialog is invoked in this view, this content will be presented to the user as a markdown string. Keybindings will be resolved when provided in the format of <keybinding:commandId>. If there is no keybinding, that will be indicated and this command will be included in a quickpick for easy configuration.")
        }
    }
};
const remoteViewDescriptor = {
    type: 'object',
    required: ['id', 'name'],
    properties: {
        id: {
            description: localize('vscode.extension.contributes.view.id', 'Identifier of the view. This should be unique across all views. It is recommended to include your extension id as part of the view id. Use this to register a data provider through `vscode.window.registerTreeDataProviderForView` API. Also to trigger activating your extension by registering `onView:${id}` event to `activationEvents`.'),
            type: 'string'
        },
        name: {
            description: localize('vscode.extension.contributes.view.name', 'The human-readable name of the view. Will be shown'),
            type: 'string'
        },
        when: {
            description: localize('vscode.extension.contributes.view.when', 'Condition which must be true to show this view'),
            type: 'string'
        },
        group: {
            description: localize('vscode.extension.contributes.view.group', 'Nested group in the viewlet'),
            type: 'string'
        },
        remoteName: {
            description: localize('vscode.extension.contributes.view.remoteName', 'The name of the remote type associated with this view'),
            type: ['string', 'array'],
            items: {
                type: 'string'
            }
        }
    }
};
const viewsContribution = {
    description: localize('vscode.extension.contributes.views', "Contributes views to the editor"),
    type: 'object',
    properties: {
        'explorer': {
            description: localize('views.explorer', "Contributes views to Explorer container in the Activity bar"),
            type: 'array',
            items: viewDescriptor,
            default: []
        },
        'debug': {
            description: localize('views.debug', "Contributes views to Debug container in the Activity bar"),
            type: 'array',
            items: viewDescriptor,
            default: []
        },
        'scm': {
            description: localize('views.scm', "Contributes views to SCM container in the Activity bar"),
            type: 'array',
            items: viewDescriptor,
            default: []
        },
        'test': {
            description: localize('views.test', "Contributes views to Test container in the Activity bar"),
            type: 'array',
            items: viewDescriptor,
            default: []
        },
        'remote': {
            description: localize('views.remote', "Contributes views to Remote container in the Activity bar. To contribute to this container, enableProposedApi needs to be turned on"),
            type: 'array',
            items: remoteViewDescriptor,
            default: []
        }
    },
    additionalProperties: {
        description: localize('views.contributed', "Contributes views to contributed views container"),
        type: 'array',
        items: viewDescriptor,
        default: []
    }
};
const viewsContainersExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'viewsContainers',
    jsonSchema: viewsContainersContribution
});
const viewsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'views',
    deps: [viewsContainersExtensionPoint],
    jsonSchema: viewsContribution,
    activationEventsGenerator: (viewExtensionPointTypeArray, result) => {
        for (const viewExtensionPointType of viewExtensionPointTypeArray) {
            for (const viewDescriptors of Object.values(viewExtensionPointType)) {
                for (const viewDescriptor of viewDescriptors) {
                    if (viewDescriptor.id) {
                        result.push(`onView:${viewDescriptor.id}`);
                    }
                }
            }
        }
    }
});
const CUSTOM_VIEWS_START_ORDER = 7;
let ViewsExtensionHandler = class ViewsExtensionHandler {
    static { this.ID = 'workbench.contrib.viewsExtensionHandler'; }
    constructor(instantiationService, logService) {
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        this.viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
        this.handleAndRegisterCustomViewContainers();
        this.handleAndRegisterCustomViews();
    }
    handleAndRegisterCustomViewContainers() {
        viewsContainersExtensionPoint.setHandler((extensions, { added, removed }) => {
            if (removed.length) {
                this.removeCustomViewContainers(removed);
            }
            if (added.length) {
                this.addCustomViewContainers(added, this.viewContainersRegistry.all);
            }
        });
    }
    addCustomViewContainers(extensionPoints, existingViewContainers) {
        const viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        let activityBarOrder = CUSTOM_VIEWS_START_ORDER + viewContainersRegistry.all.filter(v => !!v.extensionId && viewContainersRegistry.getViewContainerLocation(v) === 0 /* ViewContainerLocation.Sidebar */).length;
        let panelOrder = 5 + viewContainersRegistry.all.filter(v => !!v.extensionId && viewContainersRegistry.getViewContainerLocation(v) === 1 /* ViewContainerLocation.Panel */).length + 1;
        for (const { value, collector, description } of extensionPoints) {
            Object.entries(value).forEach(([key, value]) => {
                if (!this.isValidViewsContainer(value, collector)) {
                    return;
                }
                switch (key) {
                    case 'activitybar':
                        activityBarOrder = this.registerCustomViewContainers(value, description, activityBarOrder, existingViewContainers, 0 /* ViewContainerLocation.Sidebar */);
                        break;
                    case 'panel':
                        panelOrder = this.registerCustomViewContainers(value, description, panelOrder, existingViewContainers, 1 /* ViewContainerLocation.Panel */);
                        break;
                }
            });
        }
    }
    removeCustomViewContainers(extensionPoints) {
        const viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        const removedExtensions = extensionPoints.reduce((result, e) => { result.add(e.description.identifier); return result; }, new ExtensionIdentifierSet());
        for (const viewContainer of viewContainersRegistry.all) {
            if (viewContainer.extensionId && removedExtensions.has(viewContainer.extensionId)) {
                // move all views in this container into default view container
                const views = this.viewsRegistry.getViews(viewContainer);
                if (views.length) {
                    this.viewsRegistry.moveViews(views, this.getDefaultViewContainer());
                }
                this.deregisterCustomViewContainer(viewContainer);
            }
        }
    }
    isValidViewsContainer(viewsContainersDescriptors, collector) {
        if (!Array.isArray(viewsContainersDescriptors)) {
            collector.error(localize('viewcontainer requirearray', "views containers must be an array"));
            return false;
        }
        for (const descriptor of viewsContainersDescriptors) {
            if (typeof descriptor.id !== 'string' && isFalsyOrWhitespace(descriptor.id)) {
                collector.error(localize('requireidstring', "property `{0}` is mandatory and must be of type `string` with non-empty value. Only alphanumeric characters, '_', and '-' are allowed.", 'id'));
                return false;
            }
            if (!(/^[a-z0-9_-]+$/i.test(descriptor.id))) {
                collector.error(localize('requireidstring', "property `{0}` is mandatory and must be of type `string` with non-empty value. Only alphanumeric characters, '_', and '-' are allowed.", 'id'));
                return false;
            }
            if (typeof descriptor.title !== 'string') {
                collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'title'));
                return false;
            }
            if (typeof descriptor.icon !== 'string') {
                collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'icon'));
                return false;
            }
            if (isFalsyOrWhitespace(descriptor.title)) {
                collector.warn(localize('requirenonemptystring', "property `{0}` is mandatory and must be of type `string` with non-empty value", 'title'));
                return true;
            }
        }
        return true;
    }
    registerCustomViewContainers(containers, extension, order, existingViewContainers, location) {
        containers.forEach(descriptor => {
            const themeIcon = ThemeIcon.fromString(descriptor.icon);
            const icon = themeIcon || resources.joinPath(extension.extensionLocation, descriptor.icon);
            const id = `workbench.view.extension.${descriptor.id}`;
            const title = descriptor.title || id;
            const viewContainer = this.registerCustomViewContainer(id, title, icon, order++, extension.identifier, location);
            // Move those views that belongs to this container
            if (existingViewContainers.length) {
                const viewsToMove = [];
                for (const existingViewContainer of existingViewContainers) {
                    if (viewContainer !== existingViewContainer) {
                        viewsToMove.push(...this.viewsRegistry.getViews(existingViewContainer).filter(view => view.originalContainerId === descriptor.id));
                    }
                }
                if (viewsToMove.length) {
                    this.viewsRegistry.moveViews(viewsToMove, viewContainer);
                }
            }
        });
        return order;
    }
    registerCustomViewContainer(id, title, icon, order, extensionId, location) {
        let viewContainer = this.viewContainersRegistry.get(id);
        if (!viewContainer) {
            viewContainer = this.viewContainersRegistry.registerViewContainer({
                id,
                title: { value: title, original: title },
                extensionId,
                ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [id, { mergeViewWithContainerWhenSingleView: true }]),
                hideIfEmpty: true,
                order,
                icon,
            }, location);
        }
        return viewContainer;
    }
    deregisterCustomViewContainer(viewContainer) {
        this.viewContainersRegistry.deregisterViewContainer(viewContainer);
        Registry.as(ViewletExtensions.Viewlets).deregisterPaneComposite(viewContainer.id);
    }
    handleAndRegisterCustomViews() {
        viewsExtensionPoint.setHandler((extensions, { added, removed }) => {
            if (removed.length) {
                this.removeViews(removed);
            }
            if (added.length) {
                this.addViews(added);
            }
        });
    }
    addViews(extensions) {
        const viewIds = new Set();
        const allViewDescriptors = [];
        for (const extension of extensions) {
            const { value, collector } = extension;
            Object.entries(value).forEach(([key, value]) => {
                if (!this.isValidViewDescriptors(value, collector)) {
                    return;
                }
                if (key === 'remote' && !isProposedApiEnabled(extension.description, 'contribViewsRemote')) {
                    collector.warn(localize('ViewContainerRequiresProposedAPI', "View container '{0}' requires 'enabledApiProposals: [\"contribViewsRemote\"]' to be added to 'Remote'.", key));
                    return;
                }
                const viewContainer = this.getViewContainer(key);
                if (!viewContainer) {
                    collector.warn(localize('ViewContainerDoesnotExist', "View container '{0}' does not exist and all views registered to it will be added to 'Explorer'.", key));
                }
                const container = viewContainer || this.getDefaultViewContainer();
                const viewDescriptors = [];
                for (let index = 0; index < value.length; index++) {
                    const item = value[index];
                    // validate
                    if (viewIds.has(item.id)) {
                        collector.error(localize('duplicateView1', "Cannot register multiple views with same id `{0}`", item.id));
                        continue;
                    }
                    if (this.viewsRegistry.getView(item.id) !== null) {
                        collector.error(localize('duplicateView2', "A view with id `{0}` is already registered.", item.id));
                        continue;
                    }
                    const order = ExtensionIdentifier.equals(extension.description.identifier, container.extensionId)
                        ? index + 1
                        : container.viewOrderDelegate
                            ? container.viewOrderDelegate.getOrder(item.group)
                            : undefined;
                    let icon;
                    if (typeof item.icon === 'string') {
                        icon = ThemeIcon.fromString(item.icon) || resources.joinPath(extension.description.extensionLocation, item.icon);
                    }
                    const initialVisibility = this.convertInitialVisibility(item.visibility);
                    const type = this.getViewType(item.type);
                    if (!type) {
                        collector.error(localize('unknownViewType', "Unknown view type `{0}`.", item.type));
                        continue;
                    }
                    let weight = undefined;
                    if (typeof item.initialSize === 'number') {
                        if (container.extensionId?.value === extension.description.identifier.value) {
                            weight = item.initialSize;
                        }
                        else {
                            this.logService.warn(`${extension.description.identifier.value} tried to set the view size of ${item.id} but it was ignored because the view container does not belong to it.`);
                        }
                    }
                    let accessibilityHelpContent;
                    if (isProposedApiEnabled(extension.description, 'contribAccessibilityHelpContent') && item.accessibilityHelpContent) {
                        accessibilityHelpContent = new MarkdownString(item.accessibilityHelpContent);
                    }
                    const viewDescriptor = {
                        type: type,
                        ctorDescriptor: type === ViewType.Tree ? new SyncDescriptor(TreeViewPane) : new SyncDescriptor(WebviewViewPane),
                        id: item.id,
                        name: { value: item.name, original: item.name },
                        when: ContextKeyExpr.deserialize(item.when),
                        containerIcon: icon || viewContainer?.icon,
                        containerTitle: item.contextualTitle || (viewContainer && (typeof viewContainer.title === 'string' ? viewContainer.title : viewContainer.title.value)),
                        canToggleVisibility: true,
                        canMoveView: viewContainer?.id !== REMOTE,
                        treeView: type === ViewType.Tree ? this.instantiationService.createInstance(CustomTreeView, item.id, item.name, extension.description.identifier.value) : undefined,
                        collapsed: this.showCollapsed(container) || initialVisibility === InitialVisibility.Collapsed,
                        order: order,
                        extensionId: extension.description.identifier,
                        originalContainerId: key,
                        group: item.group,
                        remoteAuthority: item.remoteName || item.remoteAuthority, // TODO@roblou - delete after remote extensions are updated
                        virtualWorkspace: item.virtualWorkspace,
                        hideByDefault: initialVisibility === InitialVisibility.Hidden,
                        workspace: viewContainer?.id === REMOTE ? true : undefined,
                        weight,
                        accessibilityHelpContent
                    };
                    viewIds.add(viewDescriptor.id);
                    viewDescriptors.push(viewDescriptor);
                }
                allViewDescriptors.push({ viewContainer: container, views: viewDescriptors });
            });
        }
        this.viewsRegistry.registerViews2(allViewDescriptors);
    }
    getViewType(type) {
        if (type === ViewType.Webview) {
            return ViewType.Webview;
        }
        if (!type || type === ViewType.Tree) {
            return ViewType.Tree;
        }
        return undefined;
    }
    getDefaultViewContainer() {
        return this.viewContainersRegistry.get(EXPLORER);
    }
    removeViews(extensions) {
        const removedExtensions = extensions.reduce((result, e) => { result.add(e.description.identifier); return result; }, new ExtensionIdentifierSet());
        for (const viewContainer of this.viewContainersRegistry.all) {
            const removedViews = this.viewsRegistry.getViews(viewContainer).filter(v => v.extensionId && removedExtensions.has(v.extensionId));
            if (removedViews.length) {
                this.viewsRegistry.deregisterViews(removedViews, viewContainer);
                for (const view of removedViews) {
                    const anyView = view;
                    if (anyView.treeView) {
                        anyView.treeView.dispose();
                    }
                }
            }
        }
    }
    convertInitialVisibility(value) {
        if (Object.values(InitialVisibility).includes(value)) {
            return value;
        }
        return undefined;
    }
    isValidViewDescriptors(viewDescriptors, collector) {
        if (!Array.isArray(viewDescriptors)) {
            collector.error(localize('requirearray', "views must be an array"));
            return false;
        }
        for (const descriptor of viewDescriptors) {
            if (typeof descriptor.id !== 'string') {
                collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'id'));
                return false;
            }
            if (typeof descriptor.name !== 'string') {
                collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'name'));
                return false;
            }
            if (descriptor.when && typeof descriptor.when !== 'string') {
                collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'when'));
                return false;
            }
            if (descriptor.icon && typeof descriptor.icon !== 'string') {
                collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'icon'));
                return false;
            }
            if (descriptor.contextualTitle && typeof descriptor.contextualTitle !== 'string') {
                collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'contextualTitle'));
                return false;
            }
            if (descriptor.visibility && !this.convertInitialVisibility(descriptor.visibility)) {
                collector.error(localize('optenum', "property `{0}` can be omitted or must be one of {1}", 'visibility', Object.values(InitialVisibility).join(', ')));
                return false;
            }
        }
        return true;
    }
    getViewContainer(value) {
        switch (value) {
            case 'explorer': return this.viewContainersRegistry.get(EXPLORER);
            case 'debug': return this.viewContainersRegistry.get(DEBUG);
            case 'scm': return this.viewContainersRegistry.get(SCM);
            case 'remote': return this.viewContainersRegistry.get(REMOTE);
            default: return this.viewContainersRegistry.get(`workbench.view.extension.${value}`);
        }
    }
    showCollapsed(container) {
        switch (container.id) {
            case EXPLORER:
            case SCM:
            case DEBUG:
                return true;
        }
        return false;
    }
};
ViewsExtensionHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService)
], ViewsExtensionHandler);
class ViewContainersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.viewsContainers;
    }
    render(manifest) {
        const contrib = manifest.contributes?.viewsContainers || {};
        const viewContainers = Object.keys(contrib).reduce((result, location) => {
            const viewContainersForLocation = contrib[location];
            result.push(...viewContainersForLocation.map(viewContainer => ({ ...viewContainer, location })));
            return result;
        }, []);
        if (!viewContainers.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('view container id', "ID"),
            localize('view container title', "Title"),
            localize('view container location', "Where"),
        ];
        const rows = viewContainers
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(viewContainer => {
            return [
                viewContainer.id,
                viewContainer.title,
                viewContainer.location
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
class ViewsDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.views;
    }
    render(manifest) {
        const contrib = manifest.contributes?.views || {};
        const views = Object.keys(contrib).reduce((result, location) => {
            const viewsForLocation = contrib[location];
            result.push(...viewsForLocation.map(view => ({ ...view, location })));
            return result;
        }, []);
        if (!views.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('view id', "ID"),
            localize('view name title', "Name"),
            localize('view container location', "Where"),
        ];
        const rows = views
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(view => {
            return [
                view.id,
                view.name,
                view.location
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(ExtensionFeaturesRegistryExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'viewsContainers',
    label: localize('viewsContainers', "View Containers"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ViewContainersDataRenderer),
});
Registry.as(ExtensionFeaturesRegistryExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'views',
    label: localize('views', "Views"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ViewsDataRenderer),
});
registerWorkbenchContribution2(ViewsExtensionHandler.ID, ViewsExtensionHandler, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvdmlld3NFeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEtBQUssU0FBUyxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUE2QyxNQUFNLG1EQUFtRCxDQUFDO0FBQzNKLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLElBQUksaUJBQWlCLEVBQXlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRixPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkgsT0FBTyxFQUFFLFVBQVUsSUFBSSx1QkFBdUIsRUFBeUgsTUFBTSx1QkFBdUIsQ0FBQztBQUNyTSxPQUFP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