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
import { TreeFindMode } from '../../../../base/browser/ui/tree/abstractTree.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { createMatches } from '../../../../base/common/filters.js';
import { normalizeDriveLetter, tildify } from '../../../../base/common/labels.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { isAbsolute, normalize, posix } from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { ltrim } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchCompressibleObjectTree } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { CONTEXT_LOADED_SCRIPTS_ITEM_TYPE, IDebugService, LOADED_SCRIPTS_VIEW_ID } from '../common/debug.js';
import { DebugContentProvider } from '../common/debugContentProvider.js';
import { renderViewTree } from './baseDebugView.js';
const NEW_STYLE_COMPRESS = true;
// RFC 2396, Appendix A: https://www.ietf.org/rfc/rfc2396.txt
const URI_SCHEMA_PATTERN = /^[a-zA-Z][a-zA-Z0-9\+\-\.]+:/;
class BaseTreeItem {
    constructor(_parent, _label, isIncompressible = false) {
        this._parent = _parent;
        this._label = _label;
        this.isIncompressible = isIncompressible;
        this._children = new Map();
        this._showedMoreThanOne = false;
    }
    updateLabel(label) {
        this._label = label;
    }
    isLeaf() {
        return this._children.size === 0;
    }
    getSession() {
        if (this._parent) {
            return this._parent.getSession();
        }
        return undefined;
    }
    setSource(session, source) {
        this._source = source;
        this._children.clear();
        if (source.raw && source.raw.sources) {
            for (const src of source.raw.sources) {
                if (src.name && src.path) {
                    const s = new BaseTreeItem(this, src.name);
                    this._children.set(src.path, s);
                    const ss = session.getSource(src);
                    s.setSource(session, ss);
                }
            }
        }
    }
    createIfNeeded(key, factory) {
        let child = this._children.get(key);
        if (!child) {
            child = factory(this, key);
            this._children.set(key, child);
        }
        return child;
    }
    getChild(key) {
        return this._children.get(key);
    }
    remove(key) {
        this._children.delete(key);
    }
    removeFromParent() {
        if (this._parent) {
            this._parent.remove(this._label);
            if (this._parent._children.size === 0) {
                this._parent.removeFromParent();
            }
        }
    }
    getTemplateId() {
        return 'id';
    }
    // a dynamic ID based on the parent chain; required for reparenting (see #55448)
    getId() {
        const parent = this.getParent();
        return parent ? `${parent.getId()}/${this.getInternalId()}` : this.getInternalId();
    }
    getInternalId() {
        return this._label;
    }
    // skips intermediate single-child nodes
    getParent() {
        if (this._parent) {
            if (this._parent.isSkipped()) {
                return this._parent.getParent();
            }
            return this._parent;
        }
        return undefined;
    }
    isSkipped() {
        if (this._parent) {
            if (this._parent.oneChild()) {
                return true; // skipped if I'm the only child of my parents
            }
            return false;
        }
        return true; // roots are never skipped
    }
    // skips intermediate single-child nodes
    hasChildren() {
        const child = this.oneChild();
        if (child) {
            return child.hasChildren();
        }
        return this._children.size > 0;
    }
    // skips intermediate single-child nodes
    getChildren() {
        const child = this.oneChild();
        if (child) {
            return child.getChildren();
        }
        const array = [];
        for (const child of this._children.values()) {
            array.push(child);
        }
        return array.sort((a, b) => this.compare(a, b));
    }
    // skips intermediate single-child nodes
    getLabel(separateRootFolder = true) {
        const child = this.oneChild();
        if (child) {
            const sep = (this instanceof RootFolderTreeItem && separateRootFolder) ? ' • ' : posix.sep;
            return `${this._label}${sep}${child.getLabel()}`;
        }
        return this._label;
    }
    // skips intermediate single-child nodes
    getHoverLabel() {
        if (this._source && this._parent && this._parent._source) {
            return this._source.raw.path || this._source.raw.name;
        }
        const label = this.getLabel(false);
        const parent = this.getParent();
        if (parent) {
            const hover = parent.getHoverLabel();
            if (hover) {
                return `${hover}/${label}`;
            }
        }
        return label;
    }
    // skips intermediate single-child nodes
    getSource() {
        const child = this.oneChild();
        if (child) {
            return child.getSource();
        }
        return this._source;
    }
    compare(a, b) {
        if (a._label && b._label) {
            return a._label.localeCompare(b._label);
        }
        return 0;
    }
    oneChild() {
        if (!this._source && !this._showedMoreThanOne && this.skipOneChild()) {
            if (this._children.size === 1) {
                return this._children.values().next().value;
            }
            // if a node had more than one child once, it will never be skipped again
            if (this._children.size > 1) {
                this._showedMoreThanOne = true;
            }
        }
        return undefined;
    }
    skipOneChild() {
        if (NEW_STYLE_COMPRESS) {
            // if the root node has only one Session, don't show the session
            return this instanceof RootTreeItem;
        }
        else {
            return !(this instanceof RootFolderTreeItem) && !(this instanceof SessionTreeItem);
        }
    }
}
class RootFolderTreeItem extends BaseTreeItem {
    constructor(parent, folder) {
        super(parent, folder.name, true);
        this.folder = folder;
    }
}
class RootTreeItem extends BaseTreeItem {
    constructor(_pathService, _contextService, _labelService) {
        super(undefined, 'Root');
        this._pathService = _pathService;
        this._contextService = _contextService;
        this._labelService = _labelService;
    }
    add(session) {
        return this.createIfNeeded(session.getId(), () => new SessionTreeItem(this._labelService, this, session, this._pathService, this._contextService));
    }
    find(session) {
        return this.getChild(session.getId());
    }
}
class SessionTreeItem extends BaseTreeItem {
    static { this.URL_REGEXP = /^(https?:\/\/[^/]+)(\/.*)$/; }
    constructor(labelService, parent, session, _pathService, rootProvider) {
        super(parent, session.getLabel(), true);
        this._pathService = _pathService;
        this.rootProvider = rootProvider;
        this._map = new Map();
        this._labelService = labelService;
        this._session = session;
    }
    getInternalId() {
        return this._session.getId();
    }
    getSession() {
        return this._session;
    }
    getHoverLabel() {
        return undefined;
    }
    hasChildren() {
        return true;
    }
    compare(a, b) {
        const acat = this.category(a);
        const bcat = this.category(b);
        if (acat !== bcat) {
            return acat - bcat;
        }
        return super.compare(a, b);
    }
    category(item) {
        // workspace scripts come at the beginning in "folder" order
        if (item instanceof RootFolderTreeItem) {
            return item.folder.index;
        }
        // <...> come at the very end
        const l = item.getLabel();
        if (l && /^<.+>$/.test(l)) {
            return 1000;
        }
        // everything else in between
        return 999;
    }
    async addPath(source) {
        let folder;
        let url;
        let path = source.raw.path;
        if (!path) {
            return;
        }
        if (this._labelService && URI_SCHEMA_PATTERN.test(path)) {
            path = this._labelService.getUriLabel(URI.parse(path));
        }
        const match = SessionTreeItem.URL_REGEXP.exec(path);
        if (match && match.length === 3) {
            url = match[1];
            path = decodeURI(match[2]);
        }
        else {
            if (isAbsolute(path)) {
                const resource = URI.file(path);
                // return early if we can resolve a relative path label from the root folder
                folder = this.rootProvider ? this.rootProvider.getWorkspaceFolder(resource) : null;
                if (folder) {
                    // strip off the root folder path
                    path = normalize(ltrim(resource.path.substring(folder.uri.path.length), posix.sep));
                    const hasMultipleRoots = this.rootProvider.getWorkspace().folders.length > 1;
                    if (hasMultipleRoots) {
                        path = posix.sep + path;
                    }
                    else {
                        // don't show root folder
                        folder = null;
                    }
                }
                else {
                    // on unix try to tildify absolute paths
                    path = normalize(path);
                    if (isWindows) {
                        path = normalizeDriveLetter(path);
                    }
                    else {
                        path = tildify(path, (await this._pathService.userHome()).fsPath);
                    }
                }
            }
        }
        let leaf = this;
        path.split(/[\/\\]/).forEach((segment, i) => {
            if (i === 0 && folder) {
                const f = folder;
                leaf = leaf.createIfNeeded(folder.name, parent => new RootFolderTreeItem(parent, f));
            }
            else if (i === 0 && url) {
                leaf = leaf.createIfNeeded(url, parent => new BaseTreeItem(parent, url));
            }
            else {
                leaf = leaf.createIfNeeded(segment, parent => new BaseTreeItem(parent, segment));
            }
        });
        leaf.setSource(this._session, source);
        if (source.raw.path) {
            this._map.set(source.raw.path, leaf);
        }
    }
    removePath(source) {
        if (source.raw.path) {
            const leaf = this._map.get(source.raw.path);
            if (leaf) {
                leaf.removeFromParent();
                return true;
            }
        }
        return false;
    }
}
/**
 * This maps a model item into a view model item.
 */
function asTreeElement(item, viewState) {
    const children = item.getChildren();
    const collapsed = viewState ? !viewState.expanded.has(item.getId()) : !(item instanceof SessionTreeItem);
    return {
        element: item,
        collapsed,
        collapsible: item.hasChildren(),
        children: children.map(i => asTreeElement(i, viewState))
    };
}
let LoadedScriptsView = class LoadedScriptsView extends ViewPane {
    constructor(options, contextMenuService, keybindingService, instantiationService, viewDescriptorService, configurationService, editorService, contextKeyService, contextService, debugService, labelService, pathService, openerService, themeService, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorService = editorService;
        this.contextService = contextService;
        this.debugService = debugService;
        this.labelService = labelService;
        this.pathService = pathService;
        this.treeNeedsRefreshOnVisible = false;
        this.loadedScriptsItemType = CONTEXT_LOADED_SCRIPTS_ITEM_TYPE.bindTo(contextKeyService);
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-loaded-scripts', 'show-file-icons');
        this.treeContainer = renderViewTree(container);
        this.filter = new LoadedScriptsFilter();
        const root = new RootTreeItem(this.pathService, this.contextService, this.labelService);
        this.treeLabels = this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility });
        this._register(this.treeLabels);
        const onFileIconThemeChange = (fileIconTheme) => {
            this.treeContainer.classList.toggle('align-icons-and-twisties', fileIconTheme.hasFileIcons && !fileIconTheme.hasFolderIcons);
            this.treeContainer.classList.toggle('hide-arrows', fileIconTheme.hidesExplorerArrows === true);
        };
        this._register(this.themeService.onDidFileIconThemeChange(onFileIconThemeChange));
        onFileIconThemeChange(this.themeService.getFileIconTheme());
        this.tree = this.instantiationService.createInstance((WorkbenchCompressibleObjectTree), 'LoadedScriptsView', this.treeContainer, new LoadedScriptsDelegate(), [new LoadedScriptsRenderer(this.treeLabels)], {
            compressionEnabled: NEW_STYLE_COMPRESS,
            collapseByDefault: true,
            hideTwistiesOfChildlessElements: true,
            identityProvider: {
                getId: (element) => element.getId()
            },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (element) => {
                    return element.getLabel();
                },
                getCompressedNodeKeyboardNavigationLabel: (elements) => {
                    return elements.map(e => e.getLabel()).join('/');
                }
            },
            filter: this.filter,
            accessibilityProvider: new LoadedSciptsAccessibilityProvider(),
            overrideStyles: this.getLocationBasedColors().listOverrideStyles
        });
        const updateView = (viewState) => this.tree.setChildren(null, asTreeElement(root, viewState).children);
        updateView();
        this.changeScheduler = new RunOnceScheduler(() => {
            this.treeNeedsRefreshOnVisible = false;
            if (this.tree) {
                updateView();
            }
        }, 300);
        this._register(this.changeScheduler);
        this._register(this.tree.onDidOpen(e => {
            if (e.element instanceof BaseTreeItem) {
                const source = e.element.getSource();
                if (source && source.available) {
                    const nullRange = { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 };
                    source.openInEditor(this.editorService, nullRange, e.editorOptions.preserveFocus, e.sideBySide, e.editorOptions.pinned);
                }
            }
        }));
        this._register(this.tree.onDidChangeFocus(() => {
            const focus = this.tree.getFocus();
            if (focus instanceof SessionTreeItem) {
                this.loadedScriptsItemType.set('session');
            }
            else {
                this.loadedScriptsItemType.reset();
            }
        }));
        const scheduleRefreshOnVisible = () => {
            if (this.isBodyVisible()) {
                this.changeScheduler.schedule();
            }
            else {
                this.treeNeedsRefreshOnVisible = true;
            }
        };
        const addSourcePathsToSession = async (session) => {
            if (session.capabilities.supportsLoadedSourcesRequest) {
                const sessionNode = root.add(session);
                const paths = await session.getLoadedSources();
                for (const path of paths) {
                    await sessionNode.addPath(path);
                }
                scheduleRefreshOnVisible();
            }
        };
        const registerSessionListeners = (session) => {
            this._register(session.onDidChangeName(async () => {
                const sessionRoot = root.find(session);
                if (sessionRoot) {
                    sessionRoot.updateLabel(session.getLabel());
                    scheduleRefreshOnVisible();
                }
            }));
            this._register(session.onDidLoadedSource(async (event) => {
                let sessionRoot;
                switch (event.reason) {
                    case 'new':
                    case 'changed':
                        sessionRoot = root.add(session);
                        await sessionRoot.addPath(event.source);
                        scheduleRefreshOnVisible();
                        if (event.reason === 'changed') {
                            DebugContentProvider.refreshDebugContent(event.source.uri);
                        }
                        break;
                    case 'removed':
                        sessionRoot = root.find(session);
                        if (sessionRoot && sessionRoot.removePath(event.source)) {
                            scheduleRefreshOnVisible();
                        }
                        break;
                    default:
                        this.filter.setFilter(event.source.name);
                        this.tree.refilter();
                        break;
                }
            }));
        };
        this._register(this.debugService.onDidNewSession(registerSessionListeners));
        this.debugService.getModel().getSessions().forEach(registerSessionListeners);
        this._register(this.debugService.onDidEndSession(({ session }) => {
            root.remove(session.getId());
            this.changeScheduler.schedule();
        }));
        this.changeScheduler.schedule(0);
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible && this.treeNeedsRefreshOnVisible) {
                this.changeScheduler.schedule();
            }
        }));
        // feature: expand all nodes when filtering (not when finding)
        let viewState;
        this._register(this.tree.onDidChangeFindPattern(pattern => {
            if (this.tree.findMode === TreeFindMode.Highlight) {
                return;
            }
            if (!viewState && pattern) {
                const expanded = new Set();
                const visit = (node) => {
                    if (node.element && !node.collapsed) {
                        expanded.add(node.element.getId());
                    }
                    for (const child of node.children) {
                        visit(child);
                    }
                };
                visit(this.tree.getNode());
                viewState = { expanded };
                this.tree.expandAll();
            }
            else if (!pattern && viewState) {
                this.tree.setFocus([]);
                updateView(viewState);
                viewState = undefined;
            }
        }));
        // populate tree model with source paths from all debug sessions
        this.debugService.getModel().getSessions().forEach(session => addSourcePathsToSession(session));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    collapseAll() {
        this.tree.collapseAll();
    }
    dispose() {
        dispose(this.tree);
        dispose(this.treeLabels);
        super.dispose();
    }
};
LoadedScriptsView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IKeybindingService),
    __param(3, IInstantiationService),
    __param(4, IViewDescriptorService),
    __param(5, IConfigurationService),
    __param(6, IEditorService),
    __param(7, IContextKeyService),
    __param(8, IWorkspaceContextService),
    __param(9, IDebugService),
    __param(10, ILabelService),
    __param(11, IPathService),
    __param(12, IOpenerService),
    __param(13, IThemeService),
    __param(14, IHoverService)
], LoadedScriptsView);
export { LoadedScriptsView };
class LoadedScriptsDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return LoadedScriptsRenderer.ID;
    }
}
class LoadedScriptsRenderer {
    static { this.ID = 'lsrenderer'; }
    constructor(labels) {
        this.labels = labels;
    }
    get templateId() {
        return LoadedScriptsRenderer.ID;
    }
    renderTemplate(container) {
        const label = this.labels.create(container, { supportHighlights: true });
        return { label };
    }
    renderElement(node, index, data) {
        const element = node.element;
        const label = element.getLabel();
        this.render(element, label, data, node.filterData);
    }
    renderCompressedElements(node, index, data, height) {
        const element = node.element.elements[node.element.elements.length - 1];
        const labels = node.element.elements.map(e => e.getLabel());
        this.render(element, labels, data, node.filterData);
    }
    render(element, labels, data, filterData) {
        const label = {
            name: labels
        };
        const options = {
            title: element.getHoverLabel()
        };
        if (element instanceof RootFolderTreeItem) {
            options.fileKind = FileKind.ROOT_FOLDER;
        }
        else if (element instanceof SessionTreeItem) {
            options.title = nls.localize('loadedScriptsSession', "Debug Session");
            options.hideIcon = true;
        }
        else if (element instanceof BaseTreeItem) {
            const src = element.getSource();
            if (src && src.uri) {
                label.resource = src.uri;
                options.fileKind = FileKind.FILE;
            }
            else {
                options.fileKind = FileKind.FOLDER;
            }
        }
        options.matches = createMatches(filterData);
        data.label.setResource(label, options);
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
    }
}
class LoadedSciptsAccessibilityProvider {
    getWidgetAriaLabel() {
        return nls.localize({ comment: ['Debug is a noun in this context, not a verb.'], key: 'loadedScriptsAriaLabel' }, "Debug Loaded Scripts");
    }
    getAriaLabel(element) {
        if (element instanceof RootFolderTreeItem) {
            return nls.localize('loadedScriptsRootFolderAriaLabel', "Workspace folder {0}, loaded script, debug", element.getLabel());
        }
        if (element instanceof SessionTreeItem) {
            return nls.localize('loadedScriptsSessionAriaLabel', "Session {0}, loaded script, debug", element.getLabel());
        }
        if (element.hasChildren()) {
            return nls.localize('loadedScriptsFolderAriaLabel', "Folder {0}, loaded script, debug", element.getLabel());
        }
        else {
            return nls.localize('loadedScriptsSourceAriaLabel', "{0}, loaded script, debug", element.getLabel());
        }
    }
}
class LoadedScriptsFilter {
    setFilter(filterText) {
        this.filterText = filterText;
    }
    filter(element, parentVisibility) {
        if (!this.filterText) {
            return 1 /* TreeVisibility.Visible */;
        }
        if (element.isLeaf()) {
            const name = element.getLabel();
            if (name.indexOf(this.filterText) >= 0) {
                return 1 /* TreeVisibility.Visible */;
            }
            return 0 /* TreeVisibility.Hidden */;
        }
        return 2 /* TreeVisibility.Recurse */;
    }
}
registerAction2(class Collapse extends ViewAction {
    constructor() {
        super({
            id: 'loadedScripts.collapse',
            viewId: LOADED_SCRIPTS_VIEW_ID,
            title: nls.localize('collapse', "Collapse All"),
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                order: 30,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', LOADED_SCRIPTS_VIEW_ID)
            }
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVkU2NyaXB0c1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9sb2FkZWRTY3JpcHRzVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFJaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQWMsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQWtCLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx3QkFBd0IsRUFBb0IsTUFBTSxvREFBb0QsQ0FBQztBQUNoSCxPQUFPLEVBQThELGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3hILE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFaEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsYUFBYSxFQUFpQixzQkFBc0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzVILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVwRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQztBQUVoQyw2REFBNkQ7QUFDN0QsTUFBTSxrQkFBa0IsR0FBRyw4QkFBOEIsQ0FBQztBQUkxRCxNQUFNLFlBQVk7SUFNakIsWUFBb0IsT0FBaUMsRUFBVSxNQUFjLEVBQWtCLG1CQUFtQixLQUFLO1FBQW5HLFlBQU8sR0FBUCxPQUFPLENBQTBCO1FBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFrQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVE7UUFIL0csY0FBUyxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBSW5ELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7SUFDakMsQ0FBQztJQUVELFdBQVcsQ0FBQyxLQUFhO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELFVBQVU7UUFDVCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbEMsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxTQUFTLENBQUMsT0FBc0IsRUFBRSxNQUFjO1FBQy9DLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkIsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN0QyxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUMxQixNQUFNLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNoQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNsQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDMUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELGNBQWMsQ0FBeUIsR0FBVyxFQUFFLE9BQW1EO1FBQ3RHLElBQUksS0FBSyxHQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoQyxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsUUFBUSxDQUFDLEdBQVc7UUFDbkIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQVc7UUFDakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELGdCQUFnQjtRQUNmLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ2pDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELGFBQWE7UUFDWixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxnRkFBZ0Y7SUFDaEYsS0FBSztRQUNKLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUNwRixDQUFDO0lBRUQsYUFBYTtRQUNaLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQsd0NBQXdDO0lBQ3hDLFNBQVM7UUFDUixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztnQkFDOUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDckIsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxTQUFTO1FBQ1IsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQzdCLE9BQU8sSUFBSSxDQUFDLENBQUMsOENBQThDO1lBQzVELENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxDQUFDLDBCQUEwQjtJQUN4QyxDQUFDO0lBRUQsd0NBQXdDO0lBQ3hDLFdBQVc7UUFDVixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUIsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQsd0NBQXdDO0lBQ3hDLFdBQVc7UUFDVixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUIsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBbUIsRUFBRSxDQUFDO1FBQ2pDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzdDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELHdDQUF3QztJQUN4QyxRQUFRLENBQUMsa0JBQWtCLEdBQUcsSUFBSTtRQUNqQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUIsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxZQUFZLGtCQUFrQixJQUFJLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUMzRixPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7UUFDbEQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQsd0NBQXdDO0lBQ3hDLGFBQWE7UUFDWixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzFELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztRQUN2RCxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNyQyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLE9BQU8sR0FBRyxLQUFLLElBQUksS0FBSyxFQUFFLENBQUM7WUFDNUIsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCx3Q0FBd0M7SUFDeEMsU0FBUztRQUNSLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM5QixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDMUIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRVMsT0FBTyxDQUFDLENBQWUsRUFBRSxDQUFlO1FBQ2pELElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUIsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVPLFFBQVE7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUN0RSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMvQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDO1lBQzdDLENBQUM7WUFDRCx5RUFBeUU7WUFDekUsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztZQUNoQyxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFTyxZQUFZO1FBQ25CLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixnRUFBZ0U7WUFDaEUsT0FBTyxJQUFJLFlBQVksWUFBWSxDQUFDO1FBQ3JDLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLENBQUMsSUFBSSxZQUFZLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxlQUFlLENBQUMsQ0FBQztRQUNwRixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxrQkFBbUIsU0FBUSxZQUFZO0lBRTVDLFlBQVksTUFBb0IsRUFBUyxNQUF3QjtRQUNoRSxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFETyxXQUFNLEdBQU4sTUFBTSxDQUFrQjtJQUVqRSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLFlBQWEsU0FBUSxZQUFZO0lBRXRDLFlBQW9CLFlBQTBCLEVBQVUsZUFBeUMsRUFBVSxhQUE0QjtRQUN0SSxLQUFLLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRE4saUJBQVksR0FBWixZQUFZLENBQWM7UUFBVSxvQkFBZSxHQUFmLGVBQWUsQ0FBMEI7UUFBVSxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtJQUV2SSxDQUFDO0lBRUQsR0FBRyxDQUFDLE9BQXNCO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDcEosQ0FBQztJQUVELElBQUksQ0FBQyxPQUFzQjtRQUMxQixPQUF3QixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7Q0FDRDtBQUVELE1BQU0sZUFBZ0IsU0FBUSxZQUFZO2FBRWpCLGVBQVUsR0FBRyw0QkFBNEIsQUFBL0IsQ0FBZ0M7SUFNbEUsWUFBWSxZQUEyQixFQUFFLE1BQW9CLEVBQUUsT0FBc0IsRUFBVSxZQUEwQixFQUFVLFlBQXNDO1FBQ3hLLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRHNELGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQVUsaUJBQVksR0FBWixZQUFZLENBQTBCO1FBSGpLLFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQztRQUs5QyxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQztRQUNsQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztJQUN6QixDQUFDO0lBRVEsYUFBYTtRQUNyQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVRLFVBQVU7UUFDbEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7SUFFUSxhQUFhO1FBQ3JCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFUSxXQUFXO1FBQ25CLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVrQixPQUFPLENBQUMsQ0FBZSxFQUFFLENBQWU7UUFDMUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLElBQUksSUFBSSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ25CLE9BQU8sSUFBSSxHQUFHLElBQUksQ0FBQztRQUNwQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRU8sUUFBUSxDQUFDLElBQWtCO1FBRWxDLDREQUE0RDtRQUM1RCxJQUFJLElBQUksWUFBWSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDMUIsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQWM7UUFFM0IsSUFBSSxNQUErQixDQUFDO1FBQ3BDLElBQUksR0FBVyxDQUFDO1FBRWhCLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQzNCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3pELElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BELElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNmLElBQUksR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN0QixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUVoQyw0RUFBNEU7Z0JBQzVFLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ25GLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osaUNBQWlDO29CQUNqQyxJQUFJLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDcEYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUM3RSxJQUFJLGdCQUFnQixFQUFFLENBQUM7d0JBQ3RCLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQztvQkFDekIsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLHlCQUF5Qjt3QkFDekIsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDZixDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCx3Q0FBd0M7b0JBQ3hDLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3ZCLElBQUksU0FBUyxFQUFFLENBQUM7d0JBQ2YsSUFBSSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNuQyxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbkUsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksR0FBaUIsSUFBSSxDQUFDO1FBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzNDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDdkIsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDO2dCQUNqQixJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RixDQUFDO2lCQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2xGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVLENBQUMsTUFBYztRQUN4QixJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1QyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN4QixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDOztBQU9GOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQUMsSUFBa0IsRUFBRSxTQUFzQjtJQUNoRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDcEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxZQUFZLGVBQWUsQ0FBQyxDQUFDO0lBRXpHLE9BQU87UUFDTixPQUFPLEVBQUUsSUFBSTtRQUNiLFNBQVM7UUFDVCxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUMvQixRQUFRLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7S0FDeEQsQ0FBQztBQUNILENBQUM7QUFFTSxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFFBQVE7SUFVOUMsWUFDQyxPQUE0QixFQUNQLGtCQUF1QyxFQUN4QyxpQkFBcUMsRUFDbEMsb0JBQTJDLEVBQzFDLHFCQUE2QyxFQUM5QyxvQkFBMkMsRUFDbEQsYUFBOEMsRUFDMUMsaUJBQXFDLEVBQy9CLGNBQXlELEVBQ3BFLFlBQTRDLEVBQzVDLFlBQTRDLEVBQzdDLFdBQTBDLEVBQ3hDLGFBQTZCLEVBQzlCLFlBQTJCLEVBQzNCLFlBQTJCO1FBRTFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztRQVZ0SixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFFbkIsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQzNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQzVCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBZmpELDhCQUF5QixHQUFHLEtBQUssQ0FBQztRQXFCekMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLGdDQUFnQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3pGLENBQUM7SUFFa0IsVUFBVSxDQUFDLFNBQXNCO1FBQ25ELEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3pDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFbkUsSUFBSSxDQUFDLGFBQWEsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFL0MsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFFeEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV4RixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQztRQUN0SSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVoQyxNQUFNLHFCQUFxQixHQUFHLENBQUMsYUFBNkIsRUFBRSxFQUFFO1lBQy9ELElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsRUFBRSxhQUFhLENBQUMsWUFBWSxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzdILElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLG1CQUFtQixLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ2hHLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDbEYscUJBQXFCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFFNUQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUEsK0JBQThELENBQUEsRUFDbEgsbUJBQW1CLEVBQ25CLElBQUksQ0FBQyxhQUFhLEVBQ2xCLElBQUkscUJBQXFCLEVBQUUsRUFDM0IsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUM1QztZQUNDLGtCQUFrQixFQUFFLGtCQUFrQjtZQUN0QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLCtCQUErQixFQUFFLElBQUk7WUFDckMsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEtBQUssRUFBRSxDQUFDLE9BQTBCLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUU7YUFDdEQ7WUFDRCwrQkFBK0IsRUFBRTtnQkFDaEMsMEJBQTBCLEVBQUUsQ0FBQyxPQUEwQixFQUFFLEVBQUU7b0JBQzFELE9BQU8sT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUMzQixDQUFDO2dCQUNELHdDQUF3QyxFQUFFLENBQUMsUUFBNkIsRUFBRSxFQUFFO29CQUMzRSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2xELENBQUM7YUFDRDtZQUNELE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixxQkFBcUIsRUFBRSxJQUFJLGlDQUFpQyxFQUFFO1lBQzlELGNBQWMsRUFBRSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxrQkFBa0I7U0FDaEUsQ0FDRCxDQUFDO1FBRUYsTUFBTSxVQUFVLEdBQUcsQ0FBQyxTQUFzQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVwSCxVQUFVLEVBQUUsQ0FBQztRQUViLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDaEQsSUFBSSxDQUFDLHlCQUF5QixHQUFHLEtBQUssQ0FBQztZQUN2QyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDZixVQUFVLEVBQUUsQ0FBQztZQUNkLENBQUM7UUFDRixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDUixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVyQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RDLElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSxZQUFZLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNoQyxNQUFNLFNBQVMsR0FBRyxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDekYsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pILENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDOUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxJQUFJLEtBQUssWUFBWSxlQUFlLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMzQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSx3QkFBd0IsR0FBRyxHQUFHLEVBQUU7WUFDckMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQztZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsTUFBTSx1QkFBdUIsR0FBRyxLQUFLLEVBQUUsT0FBc0IsRUFBRSxFQUFFO1lBQ2hFLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO2dCQUN2RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN0QyxNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUMvQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUMxQixNQUFNLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7Z0JBQ0Qsd0JBQXdCLEVBQUUsQ0FBQztZQUM1QixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLE9BQXNCLEVBQUUsRUFBRTtZQUMzRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQ2pELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3ZDLElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2pCLFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7b0JBQzVDLHdCQUF3QixFQUFFLENBQUM7Z0JBQzVCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFDLEtBQUssRUFBQyxFQUFFO2dCQUN0RCxJQUFJLFdBQTRCLENBQUM7Z0JBQ2pDLFFBQVEsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN0QixLQUFLLEtBQUssQ0FBQztvQkFDWCxLQUFLLFNBQVM7d0JBQ2IsV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ2hDLE1BQU0sV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBQ3hDLHdCQUF3QixFQUFFLENBQUM7d0JBQzNCLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQzs0QkFDaEMsb0JBQW9CLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFDNUQsQ0FBQzt3QkFDRCxNQUFNO29CQUNQLEtBQUssU0FBUzt3QkFDYixXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDakMsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzs0QkFDekQsd0JBQXdCLEVBQUUsQ0FBQzt3QkFDNUIsQ0FBQzt3QkFDRCxNQUFNO29CQUNQO3dCQUNDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3pDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQ3JCLE1BQU07Z0JBQ1IsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRTdFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7WUFDaEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUN2RCxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztnQkFDL0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLDhEQUE4RDtRQUM5RCxJQUFJLFNBQWlDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3pELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNuRCxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxTQUFTLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQzNCLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7Z0JBQ25DLE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBZ0QsRUFBRSxFQUFFO29CQUNsRSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ3JDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO29CQUNwQyxDQUFDO29CQUVELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNuQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2QsQ0FBQztnQkFDRixDQUFDLENBQUM7Z0JBRUYsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDM0IsU0FBUyxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdkIsQ0FBQztpQkFBTSxJQUFJLENBQUMsT0FBTyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDdkIsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN0QixTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQ3ZCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosZ0VBQWdFO1FBQ2hFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNqRyxDQUFDO0lBRWtCLFVBQVUsQ0FBQyxNQUFjLEVBQUUsS0FBYTtRQUMxRCxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELFdBQVc7UUFDVixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0QsQ0FBQTtBQW5PWSxpQkFBaUI7SUFZM0IsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxhQUFhLENBQUE7SUFDYixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxhQUFhLENBQUE7SUFDYixZQUFBLGFBQWEsQ0FBQTtHQXpCSCxpQkFBaUIsQ0FtTzdCOztBQUVELE1BQU0scUJBQXFCO0lBRTFCLFNBQVMsQ0FBQyxPQUEwQjtRQUNuQyxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBMEI7UUFDdkMsT0FBTyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7SUFDakMsQ0FBQztDQUNEO0FBTUQsTUFBTSxxQkFBcUI7YUFFVixPQUFFLEdBQUcsWUFBWSxDQUFDO0lBRWxDLFlBQ1MsTUFBc0I7UUFBdEIsV0FBTSxHQUFOLE1BQU0sQ0FBZ0I7SUFFL0IsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8scUJBQXFCLENBQUMsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDbEIsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUF5QyxFQUFFLEtBQWEsRUFBRSxJQUFvQztRQUUzRyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUVqQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQsd0JBQXdCLENBQUMsSUFBOEQsRUFBRSxLQUFhLEVBQUUsSUFBb0MsRUFBRSxNQUEwQjtRQUV2SyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFNUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVPLE1BQU0sQ0FBQyxPQUFxQixFQUFFLE1BQXlCLEVBQUUsSUFBb0MsRUFBRSxVQUFrQztRQUV4SSxNQUFNLEtBQUssR0FBd0I7WUFDbEMsSUFBSSxFQUFFLE1BQU07U0FDWixDQUFDO1FBQ0YsTUFBTSxPQUFPLEdBQTBCO1lBQ3RDLEtBQUssRUFBRSxPQUFPLENBQUMsYUFBYSxFQUFFO1NBQzlCLENBQUM7UUFFRixJQUFJLE9BQU8sWUFBWSxrQkFBa0IsRUFBRSxDQUFDO1lBRTNDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQztRQUV6QyxDQUFDO2FBQU0sSUFBSSxPQUFPLFlBQVksZUFBZSxFQUFFLENBQUM7WUFFL0MsT0FBTyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQ3RFLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBRXpCLENBQUM7YUFBTSxJQUFJLE9BQU8sWUFBWSxZQUFZLEVBQUUsQ0FBQztZQUU1QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEMsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNwQixLQUFLLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7Z0JBQ3pCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztZQUNsQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ3BDLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFNUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBNEM7UUFDM0QsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5QixDQUFDOztBQUdGLE1BQU0saUNBQWlDO0lBRXRDLGtCQUFrQjtRQUNqQixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyw4Q0FBOEMsQ0FBQyxFQUFFLEdBQUcsRUFBRSx3QkFBd0IsRUFBRSxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFDM0ksQ0FBQztJQUVELFlBQVksQ0FBQyxPQUEwQjtRQUV0QyxJQUFJLE9BQU8sWUFBWSxrQkFBa0IsRUFBRSxDQUFDO1lBQzNDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSw0Q0FBNEMsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzSCxDQUFDO1FBRUQsSUFBSSxPQUFPLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDeEMsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLG1DQUFtQyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQy9HLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1lBQzNCLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxrQ0FBa0MsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUM3RyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSwyQkFBMkIsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN0RyxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxtQkFBbUI7SUFJeEIsU0FBUyxDQUFDLFVBQWtCO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQzlCLENBQUM7SUFFRCxNQUFNLENBQUMsT0FBcUIsRUFBRSxnQkFBZ0M7UUFFN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixzQ0FBOEI7UUFDL0IsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDdEIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLHNDQUE4QjtZQUMvQixDQUFDO1lBQ0QscUNBQTZCO1FBQzlCLENBQUM7UUFDRCxzQ0FBOEI7SUFDL0IsQ0FBQztDQUNEO0FBQ0QsZUFBZSxDQUFDLE1BQU0sUUFBUyxTQUFRLFVBQTZCO0lBQ25FO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHdCQUF3QjtZQUM1QixNQUFNLEVBQUUsc0JBQXNCO1lBQzlCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUM7WUFDL0MsRUFBRSxFQUFFLEtBQUs7WUFDVCxJQUFJLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDekIsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUztnQkFDcEIsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQzthQUMzRDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxTQUFTLENBQUMsU0FBMkIsRUFBRSxJQUF1QjtRQUM3RCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDcEIsQ0FBQztDQUNELENBQUMsQ0FBQyJ9