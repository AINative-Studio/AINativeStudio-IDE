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
import { compareFileNames } from '../../../../base/common/comparers.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import * as glob from '../../../../base/common/glob.js';
import { DisposableStore, MutableDisposable, Disposable } from '../../../../base/common/lifecycle.js';
import { posix, relative } from '../../../../base/common/path.js';
import { basename, dirname, isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import './media/breadcrumbscontrol.css';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchDataTree, WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { breadcrumbsPickerBackground, widgetBorder, widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { isWorkspace, isWorkspaceFolder, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ResourceLabels, DEFAULT_LABELS_CONTAINER } from '../../labels.js';
import { BreadcrumbsConfig } from './breadcrumbs.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { localize } from '../../../../nls.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
let BreadcrumbsPicker = class BreadcrumbsPicker {
    constructor(parent, resource, _instantiationService, _themeService, _configurationService) {
        this.resource = resource;
        this._instantiationService = _instantiationService;
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this._fakeEvent = new UIEvent('fakeEvent');
        this._onWillPickElement = new Emitter();
        this.onWillPickElement = this._onWillPickElement.event;
        this._previewDispoables = new MutableDisposable();
        this._domNode = document.createElement('div');
        this._domNode.className = 'monaco-breadcrumbs-picker show-file-icons';
        parent.appendChild(this._domNode);
    }
    dispose() {
        this._disposables.dispose();
        this._previewDispoables.dispose();
        this._onWillPickElement.dispose();
        this._domNode.remove();
        setTimeout(() => this._tree.dispose(), 0); // tree cannot be disposed while being opened...
    }
    async show(input, maxHeight, width, arrowSize, arrowOffset) {
        const theme = this._themeService.getColorTheme();
        const color = theme.getColor(breadcrumbsPickerBackground);
        this._arrow = document.createElement('div');
        this._arrow.className = 'arrow';
        this._arrow.style.borderColor = `transparent transparent ${color ? color.toString() : ''}`;
        this._domNode.appendChild(this._arrow);
        this._treeContainer = document.createElement('div');
        this._treeContainer.style.background = color ? color.toString() : '';
        this._treeContainer.style.paddingTop = '2px';
        this._treeContainer.style.borderRadius = '3px';
        this._treeContainer.style.boxShadow = `0 0 8px 2px ${this._themeService.getColorTheme().getColor(widgetShadow)}`;
        this._treeContainer.style.border = `1px solid ${this._themeService.getColorTheme().getColor(widgetBorder)}`;
        this._domNode.appendChild(this._treeContainer);
        this._layoutInfo = { maxHeight, width, arrowSize, arrowOffset, inputHeight: 0 };
        this._tree = this._createTree(this._treeContainer, input);
        this._disposables.add(this._tree.onDidOpen(async (e) => {
            const { element, editorOptions, sideBySide } = e;
            const didReveal = await this._revealElement(element, { ...editorOptions, preserveFocus: false }, sideBySide);
            if (!didReveal) {
                return;
            }
        }));
        this._disposables.add(this._tree.onDidChangeFocus(e => {
            this._previewDispoables.value = this._previewElement(e.elements[0]);
        }));
        this._disposables.add(this._tree.onDidChangeContentHeight(() => {
            this._layout();
        }));
        this._domNode.focus();
        try {
            await this._setInput(input);
            this._layout();
        }
        catch (err) {
            onUnexpectedError(err);
        }
    }
    _layout() {
        const headerHeight = 2 * this._layoutInfo.arrowSize;
        const treeHeight = Math.min(this._layoutInfo.maxHeight - headerHeight, this._tree.contentHeight);
        const totalHeight = treeHeight + headerHeight;
        this._domNode.style.height = `${totalHeight}px`;
        this._domNode.style.width = `${this._layoutInfo.width}px`;
        this._arrow.style.top = `-${2 * this._layoutInfo.arrowSize}px`;
        this._arrow.style.borderWidth = `${this._layoutInfo.arrowSize}px`;
        this._arrow.style.marginLeft = `${this._layoutInfo.arrowOffset}px`;
        this._treeContainer.style.height = `${treeHeight}px`;
        this._treeContainer.style.width = `${this._layoutInfo.width}px`;
        this._tree.layout(treeHeight, this._layoutInfo.width);
    }
    restoreViewState() { }
};
BreadcrumbsPicker = __decorate([
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, IConfigurationService)
], BreadcrumbsPicker);
export { BreadcrumbsPicker };
//#region - Files
class FileVirtualDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(_element) {
        return 'FileStat';
    }
}
class FileIdentityProvider {
    getId(element) {
        if (URI.isUri(element)) {
            return element.toString();
        }
        else if (isWorkspace(element)) {
            return element.id;
        }
        else if (isWorkspaceFolder(element)) {
            return element.uri.toString();
        }
        else {
            return element.resource.toString();
        }
    }
}
let FileDataSource = class FileDataSource {
    constructor(_fileService) {
        this._fileService = _fileService;
    }
    hasChildren(element) {
        return URI.isUri(element)
            || isWorkspace(element)
            || isWorkspaceFolder(element)
            || element.isDirectory;
    }
    async getChildren(element) {
        if (isWorkspace(element)) {
            return element.folders;
        }
        let uri;
        if (isWorkspaceFolder(element)) {
            uri = element.uri;
        }
        else if (URI.isUri(element)) {
            uri = element;
        }
        else {
            uri = element.resource;
        }
        const stat = await this._fileService.resolve(uri);
        return stat.children ?? [];
    }
};
FileDataSource = __decorate([
    __param(0, IFileService)
], FileDataSource);
let FileRenderer = class FileRenderer {
    constructor(_labels, _configService) {
        this._labels = _labels;
        this._configService = _configService;
        this.templateId = 'FileStat';
    }
    renderTemplate(container) {
        return this._labels.create(container, { supportHighlights: true });
    }
    renderElement(node, index, templateData) {
        const fileDecorations = this._configService.getValue('explorer.decorations');
        const { element } = node;
        let resource;
        let fileKind;
        if (isWorkspaceFolder(element)) {
            resource = element.uri;
            fileKind = FileKind.ROOT_FOLDER;
        }
        else {
            resource = element.resource;
            fileKind = element.isDirectory ? FileKind.FOLDER : FileKind.FILE;
        }
        templateData.setFile(resource, {
            fileKind,
            hidePath: true,
            fileDecorations: fileDecorations,
            matches: createMatches(node.filterData),
            extraClasses: ['picker-item']
        });
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
};
FileRenderer = __decorate([
    __param(1, IConfigurationService)
], FileRenderer);
class FileNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element.name;
    }
}
class FileAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('breadcrumbs', "Breadcrumbs");
    }
    getAriaLabel(element) {
        return element.name;
    }
}
let FileFilter = class FileFilter {
    constructor(_workspaceService, configService) {
        this._workspaceService = _workspaceService;
        this._cachedExpressions = new Map();
        this._disposables = new DisposableStore();
        const config = BreadcrumbsConfig.FileExcludes.bindTo(configService);
        const update = () => {
            _workspaceService.getWorkspace().folders.forEach(folder => {
                const excludesConfig = config.getValue({ resource: folder.uri });
                if (!excludesConfig) {
                    return;
                }
                // adjust patterns to be absolute in case they aren't
                // free floating (**/)
                const adjustedConfig = {};
                for (const pattern in excludesConfig) {
                    if (typeof excludesConfig[pattern] !== 'boolean') {
                        continue;
                    }
                    const patternAbs = pattern.indexOf('**/') !== 0
                        ? posix.join(folder.uri.path, pattern)
                        : pattern;
                    adjustedConfig[patternAbs] = excludesConfig[pattern];
                }
                this._cachedExpressions.set(folder.uri.toString(), glob.parse(adjustedConfig));
            });
        };
        update();
        this._disposables.add(config);
        this._disposables.add(config.onDidChange(update));
        this._disposables.add(_workspaceService.onDidChangeWorkspaceFolders(update));
    }
    dispose() {
        this._disposables.dispose();
    }
    filter(element, _parentVisibility) {
        if (isWorkspaceFolder(element)) {
            // not a file
            return true;
        }
        const folder = this._workspaceService.getWorkspaceFolder(element.resource);
        if (!folder || !this._cachedExpressions.has(folder.uri.toString())) {
            // no folder or no filer
            return true;
        }
        const expression = this._cachedExpressions.get(folder.uri.toString());
        return !expression(relative(folder.uri.path, element.resource.path), basename(element.resource));
    }
};
FileFilter = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IConfigurationService)
], FileFilter);
export class FileSorter {
    compare(a, b) {
        if (isWorkspaceFolder(a) && isWorkspaceFolder(b)) {
            return a.index - b.index;
        }
        if (a.isDirectory === b.isDirectory) {
            // same type -> compare on names
            return compareFileNames(a.name, b.name);
        }
        else if (a.isDirectory) {
            return -1;
        }
        else {
            return 1;
        }
    }
}
let BreadcrumbsFilePicker = class BreadcrumbsFilePicker extends BreadcrumbsPicker {
    constructor(parent, resource, instantiationService, themeService, configService, _workspaceService, _editorService) {
        super(parent, resource, instantiationService, themeService, configService);
        this._workspaceService = _workspaceService;
        this._editorService = _editorService;
    }
    _createTree(container) {
        // tree icon theme specials
        this._treeContainer.classList.add('file-icon-themable-tree');
        this._treeContainer.classList.add('show-file-icons');
        const onFileIconThemeChange = (fileIconTheme) => {
            this._treeContainer.classList.toggle('align-icons-and-twisties', fileIconTheme.hasFileIcons && !fileIconTheme.hasFolderIcons);
            this._treeContainer.classList.toggle('hide-arrows', fileIconTheme.hidesExplorerArrows === true);
        };
        this._disposables.add(this._themeService.onDidFileIconThemeChange(onFileIconThemeChange));
        onFileIconThemeChange(this._themeService.getFileIconTheme());
        const labels = this._instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER /* TODO@Jo visibility propagation */);
        this._disposables.add(labels);
        return this._instantiationService.createInstance((WorkbenchAsyncDataTree), 'BreadcrumbsFilePicker', container, new FileVirtualDelegate(), [this._instantiationService.createInstance(FileRenderer, labels)], this._instantiationService.createInstance(FileDataSource), {
            multipleSelectionSupport: false,
            sorter: new FileSorter(),
            filter: this._instantiationService.createInstance(FileFilter),
            identityProvider: new FileIdentityProvider(),
            keyboardNavigationLabelProvider: new FileNavigationLabelProvider(),
            accessibilityProvider: this._instantiationService.createInstance(FileAccessibilityProvider),
            showNotFoundMessage: false,
            overrideStyles: {
                listBackground: breadcrumbsPickerBackground
            },
        });
    }
    async _setInput(element) {
        const { uri, kind } = element;
        let input;
        if (kind === FileKind.ROOT_FOLDER) {
            input = this._workspaceService.getWorkspace();
        }
        else {
            input = dirname(uri);
        }
        const tree = this._tree;
        await tree.setInput(input);
        let focusElement;
        for (const { element } of tree.getNode().children) {
            if (isWorkspaceFolder(element) && isEqual(element.uri, uri)) {
                focusElement = element;
                break;
            }
            else if (isEqual(element.resource, uri)) {
                focusElement = element;
                break;
            }
        }
        if (focusElement) {
            tree.reveal(focusElement, 0.5);
            tree.setFocus([focusElement], this._fakeEvent);
        }
        tree.domFocus();
    }
    _previewElement(_element) {
        return Disposable.None;
    }
    async _revealElement(element, options, sideBySide) {
        if (!isWorkspaceFolder(element) && element.isFile) {
            this._onWillPickElement.fire();
            await this._editorService.openEditor({ resource: element.resource, options }, sideBySide ? SIDE_GROUP : undefined);
            return true;
        }
        return false;
    }
};
BreadcrumbsFilePicker = __decorate([
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IEditorService)
], BreadcrumbsFilePicker);
export { BreadcrumbsFilePicker };
//#endregion
//#region - Outline
let OutlineTreeSorter = class OutlineTreeSorter {
    constructor(comparator, uri, configService) {
        this.comparator = comparator;
        this._order = configService.getValue(uri, 'breadcrumbs.symbolSortOrder');
    }
    compare(a, b) {
        if (this._order === 'name') {
            return this.comparator.compareByName(a, b);
        }
        else if (this._order === 'type') {
            return this.comparator.compareByType(a, b);
        }
        else {
            return this.comparator.compareByPosition(a, b);
        }
    }
};
OutlineTreeSorter = __decorate([
    __param(2, ITextResourceConfigurationService)
], OutlineTreeSorter);
export class BreadcrumbsOutlinePicker extends BreadcrumbsPicker {
    _createTree(container, input) {
        const { config } = input.outline;
        return this._instantiationService.createInstance((WorkbenchDataTree), 'BreadcrumbsOutlinePicker', container, config.delegate, config.renderers, config.treeDataSource, {
            ...config.options,
            sorter: this._instantiationService.createInstance(OutlineTreeSorter, config.comparator, undefined),
            collapseByDefault: true,
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            showNotFoundMessage: false
        });
    }
    _setInput(input) {
        const viewState = input.outline.captureViewState();
        this.restoreViewState = () => { viewState.dispose(); };
        const tree = this._tree;
        tree.setInput(input.outline);
        if (input.element !== input.outline) {
            tree.reveal(input.element, 0.5);
            tree.setFocus([input.element], this._fakeEvent);
        }
        tree.domFocus();
        return Promise.resolve();
    }
    _previewElement(element) {
        const outline = this._tree.getInput();
        return outline.preview(element);
    }
    async _revealElement(element, options, sideBySide) {
        this._onWillPickElement.fire();
        const outline = this._tree.getInput();
        await outline.reveal(element, options, sideBySide, false);
        return true;
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNQaWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvYnJlYWRjcnVtYnNQaWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQWMsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBZSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkgsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBYSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FB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