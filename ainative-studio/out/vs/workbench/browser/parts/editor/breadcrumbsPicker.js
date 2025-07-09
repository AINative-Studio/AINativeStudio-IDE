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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNQaWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2JyZWFkY3J1bWJzUGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFjLE1BQU0sb0NBQW9DLENBQUM7QUFDL0UsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQWUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sZ0NBQWdDLENBQUM7QUFDeEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQWEsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztB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