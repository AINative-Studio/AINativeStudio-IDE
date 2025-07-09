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
var ActionButtonRenderer_1, InputRenderer_1, ResourceGroupRenderer_1, ResourceRenderer_1, SCMInputWidget_1;
import './media/scm.css';
import { Event, Emitter } from '../../../../base/common/event.js';
import { basename, dirname } from '../../../../base/common/resources.js';
import { Disposable, DisposableStore, combinedDisposable, dispose, toDisposable, MutableDisposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { ViewPane, ViewAction } from '../../../browser/parts/views/viewPane.js';
import { append, $, Dimension, trackFocus, clearNode, isPointerEvent, isActiveElement } from '../../../../base/browser/dom.js';
import { asCSSUrl } from '../../../../base/browser/cssValue.js';
import { ISCMViewService, ISCMService, SCMInputChangeReason, VIEW_PANE_ID } from '../common/scm.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextViewService, IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService, ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { MenuItemAction, IMenuService, registerAction2, MenuId, MenuRegistry, Action2 } from '../../../../platform/actions/common/actions.js';
import { ActionRunner, Action, Separator, toAction } from '../../../../base/common/actions.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { isSCMResource, isSCMResourceGroup, isSCMRepository, isSCMInput, collectContextMenuActions, getActionViewItemProvider, isSCMActionButton, isSCMViewService, isSCMResourceNode, connectPrimaryMenu } from './util.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { disposableTimeout, Sequencer, ThrottledDelayer, Throttler } from '../../../../base/common/async.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { compareFileNames, comparePaths } from '../../../../base/common/comparers.js';
import { createMatches } from '../../../../base/common/filters.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { localize } from '../../../../nls.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { getSimpleEditorOptions, setupSimpleEditorSelectionStyling } from '../../codeEditor/browser/simpleEditorOptions.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { MenuPreventer } from '../../codeEditor/browser/menuPreventer.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { EditorDictation } from '../../codeEditor/browser/dictation/editorDictation.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import * as platform from '../../../../base/common/platform.js';
import { compare, format } from '../../../../base/common/strings.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ColorDetector } from '../../../../editor/contrib/colorPicker/browser/colorDetector.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { RepositoryActionRunner, RepositoryRenderer } from './scmRepositoryRenderer.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { createActionViewItem, getFlatActionBarActions, getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MarkdownRenderer, openLinkFromMarkdown } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { Button, ButtonWithDropdown } from '../../../../base/browser/ui/button/button.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { RepositoryContextKeys } from './scmViewService.js';
import { DragAndDropController } from '../../../../editor/contrib/dnd/browser/dnd.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { defaultButtonStyles, defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { Schemas } from '../../../../base/common/network.js';
import { fillEditorsDragData } from '../../../browser/dnd.js';
import { CodeDataTransfers } from '../../../../platform/dnd/browser/dnd.js';
import { FormatOnType } from '../../../../editor/contrib/format/browser/formatActions.js';
import { EditorOptions } from '../../../../editor/common/config/editorOptions.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { clamp, rot } from '../../../../base/common/numbers.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { OpenScmGroupAction } from '../../multiDiffEditor/browser/scmMultiDiffSourceResolver.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { autorun, runOnChange } from '../../../../base/common/observable.js';
import { PlaceholderTextContribution } from '../../../../editor/contrib/placeholderText/browser/placeholderTextContribution.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
function processResourceFilterData(uri, filterData) {
    if (!filterData) {
        return [undefined, undefined];
    }
    if (!filterData.label) {
        const matches = createMatches(filterData);
        return [matches, undefined];
    }
    const fileName = basename(uri);
    const label = filterData.label;
    const pathLength = label.length - fileName.length;
    const matches = createMatches(filterData.score);
    // FileName match
    if (label === fileName) {
        return [matches, undefined];
    }
    // FilePath match
    const labelMatches = [];
    const descriptionMatches = [];
    for (const match of matches) {
        if (match.start > pathLength) {
            // Label match
            labelMatches.push({
                start: match.start - pathLength,
                end: match.end - pathLength
            });
        }
        else if (match.end < pathLength) {
            // Description match
            descriptionMatches.push(match);
        }
        else {
            // Spanning match
            labelMatches.push({
                start: 0,
                end: match.end - pathLength
            });
            descriptionMatches.push({
                start: match.start,
                end: pathLength
            });
        }
    }
    return [labelMatches, descriptionMatches];
}
let ActionButtonRenderer = class ActionButtonRenderer {
    static { ActionButtonRenderer_1 = this; }
    static { this.DEFAULT_HEIGHT = 28; }
    static { this.TEMPLATE_ID = 'actionButton'; }
    get templateId() { return ActionButtonRenderer_1.TEMPLATE_ID; }
    constructor(commandService, contextMenuService, notificationService) {
        this.commandService = commandService;
        this.contextMenuService = contextMenuService;
        this.notificationService = notificationService;
        this.actionButtons = new Map();
    }
    renderTemplate(container) {
        // hack
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        // Use default cursor & disable hover for list item
        container.parentElement.parentElement.classList.add('cursor-default', 'force-no-hover');
        const buttonContainer = append(container, $('.button-container'));
        const actionButton = new SCMActionButton(buttonContainer, this.contextMenuService, this.commandService, this.notificationService);
        return { actionButton, disposable: Disposable.None, templateDisposable: actionButton };
    }
    renderElement(node, index, templateData, height) {
        templateData.disposable.dispose();
        const disposables = new DisposableStore();
        const actionButton = node.element;
        templateData.actionButton.setButton(node.element.button);
        // Remember action button
        this.actionButtons.set(actionButton, templateData.actionButton);
        disposables.add({ dispose: () => this.actionButtons.delete(actionButton) });
        templateData.disposable = disposables;
    }
    renderCompressedElements() {
        throw new Error('Should never happen since node is incompressible');
    }
    focusActionButton(actionButton) {
        this.actionButtons.get(actionButton)?.focus();
    }
    disposeElement(node, index, template) {
        template.disposable.dispose();
    }
    disposeTemplate(templateData) {
        templateData.disposable.dispose();
        templateData.templateDisposable.dispose();
    }
};
ActionButtonRenderer = ActionButtonRenderer_1 = __decorate([
    __param(0, ICommandService),
    __param(1, IContextMenuService),
    __param(2, INotificationService)
], ActionButtonRenderer);
export { ActionButtonRenderer };
class SCMTreeDragAndDrop {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    getDragURI(element) {
        if (isSCMResource(element)) {
            return element.sourceUri.toString();
        }
        return null;
    }
    onDragStart(data, originalEvent) {
        const items = SCMTreeDragAndDrop.getResourcesFromDragAndDropData(data);
        if (originalEvent.dataTransfer && items?.length) {
            this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, items, originalEvent));
            const fileResources = items.filter(s => s.scheme === Schemas.file).map(r => r.fsPath);
            if (fileResources.length) {
                originalEvent.dataTransfer.setData(CodeDataTransfers.FILES, JSON.stringify(fileResources));
            }
        }
    }
    getDragLabel(elements, originalEvent) {
        if (elements.length === 1) {
            const element = elements[0];
            if (isSCMResource(element)) {
                return basename(element.sourceUri);
            }
        }
        return String(elements.length);
    }
    onDragOver(data, targetElement, targetIndex, targetSector, originalEvent) {
        return true;
    }
    drop(data, targetElement, targetIndex, targetSector, originalEvent) { }
    static getResourcesFromDragAndDropData(data) {
        const uris = [];
        for (const element of [...data.context ?? [], ...data.elements]) {
            if (isSCMResource(element)) {
                uris.push(element.sourceUri);
            }
        }
        return uris;
    }
    dispose() { }
}
let InputRenderer = class InputRenderer {
    static { InputRenderer_1 = this; }
    static { this.DEFAULT_HEIGHT = 26; }
    static { this.TEMPLATE_ID = 'input'; }
    get templateId() { return InputRenderer_1.TEMPLATE_ID; }
    constructor(outerLayout, overflowWidgetsDomNode, updateHeight, instantiationService) {
        this.outerLayout = outerLayout;
        this.overflowWidgetsDomNode = overflowWidgetsDomNode;
        this.updateHeight = updateHeight;
        this.instantiationService = instantiationService;
        this.inputWidgets = new Map();
        this.contentHeights = new WeakMap();
        this.editorSelections = new WeakMap();
    }
    renderTemplate(container) {
        // hack
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie');
        // Disable hover for list item
        container.parentElement.parentElement.classList.add('force-no-hover');
        const templateDisposable = new DisposableStore();
        const inputElement = append(container, $('.scm-input'));
        const inputWidget = this.instantiationService.createInstance(SCMInputWidget, inputElement, this.overflowWidgetsDomNode);
        templateDisposable.add(inputWidget);
        return { inputWidget, inputWidgetHeight: InputRenderer_1.DEFAULT_HEIGHT, elementDisposables: new DisposableStore(), templateDisposable };
    }
    renderElement(node, index, templateData) {
        const input = node.element;
        templateData.inputWidget.input = input;
        // Remember widget
        this.inputWidgets.set(input, templateData.inputWidget);
        templateData.elementDisposables.add({
            dispose: () => this.inputWidgets.delete(input)
        });
        // Widget cursor selections
        const selections = this.editorSelections.get(input);
        if (selections) {
            templateData.inputWidget.selections = selections;
        }
        templateData.elementDisposables.add(toDisposable(() => {
            const selections = templateData.inputWidget.selections;
            if (selections) {
                this.editorSelections.set(input, selections);
            }
        }));
        // Reset widget height so it's recalculated
        templateData.inputWidgetHeight = InputRenderer_1.DEFAULT_HEIGHT;
        // Rerender the element whenever the editor content height changes
        const onDidChangeContentHeight = () => {
            const contentHeight = templateData.inputWidget.getContentHeight();
            this.contentHeights.set(input, contentHeight);
            if (templateData.inputWidgetHeight !== contentHeight) {
                this.updateHeight(input, contentHeight + 10);
                templateData.inputWidgetHeight = contentHeight;
                templateData.inputWidget.layout();
            }
        };
        const startListeningContentHeightChange = () => {
            templateData.elementDisposables.add(templateData.inputWidget.onDidChangeContentHeight(onDidChangeContentHeight));
            onDidChangeContentHeight();
        };
        // Setup height change listener on next tick
        disposableTimeout(startListeningContentHeightChange, 0, templateData.elementDisposables);
        // Layout the editor whenever the outer layout happens
        const layoutEditor = () => templateData.inputWidget.layout();
        templateData.elementDisposables.add(this.outerLayout.onDidChange(layoutEditor));
        layoutEditor();
    }
    renderCompressedElements() {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(group, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
    getHeight(input) {
        return (this.contentHeights.get(input) ?? InputRenderer_1.DEFAULT_HEIGHT) + 10;
    }
    getRenderedInputWidget(input) {
        return this.inputWidgets.get(input);
    }
    getFocusedInput() {
        for (const [input, inputWidget] of this.inputWidgets) {
            if (inputWidget.hasFocus()) {
                return input;
            }
        }
        return undefined;
    }
    clearValidation() {
        for (const [, inputWidget] of this.inputWidgets) {
            inputWidget.clearValidation();
        }
    }
};
InputRenderer = InputRenderer_1 = __decorate([
    __param(3, IInstantiationService)
], InputRenderer);
let ResourceGroupRenderer = class ResourceGroupRenderer {
    static { ResourceGroupRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'resource group'; }
    get templateId() { return ResourceGroupRenderer_1.TEMPLATE_ID; }
    constructor(actionViewItemProvider, actionRunner, commandService, contextKeyService, contextMenuService, keybindingService, menuService, scmViewService, telemetryService) {
        this.actionViewItemProvider = actionViewItemProvider;
        this.actionRunner = actionRunner;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.scmViewService = scmViewService;
        this.telemetryService = telemetryService;
    }
    renderTemplate(container) {
        // hack
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-twistie');
        const element = append(container, $('.resource-group'));
        const name = append(element, $('.name'));
        const actionsContainer = append(element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, {
            actionViewItemProvider: this.actionViewItemProvider,
            actionRunner: this.actionRunner
        }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService);
        const countContainer = append(element, $('.count'));
        const count = new CountBadge(countContainer, {}, defaultCountBadgeStyles);
        const disposables = combinedDisposable(actionBar, count);
        return { name, count, actionBar, elementDisposables: new DisposableStore(), disposables };
    }
    renderElement(node, index, template) {
        const group = node.element;
        template.name.textContent = group.label;
        template.count.setCount(group.resources.length);
        const menus = this.scmViewService.menus.getRepositoryMenus(group.provider);
        template.elementDisposables.add(connectPrimaryMenu(menus.getResourceGroupMenu(group), primary => {
            template.actionBar.setActions(primary);
        }, 'inline'));
        template.actionBar.context = group;
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(group, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(template) {
        template.elementDisposables.dispose();
        template.disposables.dispose();
    }
};
ResourceGroupRenderer = ResourceGroupRenderer_1 = __decorate([
    __param(2, ICommandService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IKeybindingService),
    __param(6, IMenuService),
    __param(7, ISCMViewService),
    __param(8, ITelemetryService)
], ResourceGroupRenderer);
class RepositoryPaneActionRunner extends ActionRunner {
    constructor(getSelectedResources) {
        super();
        this.getSelectedResources = getSelectedResources;
    }
    async runAction(action, context) {
        if (!(action instanceof MenuItemAction)) {
            return super.runAction(action, context);
        }
        const isContextResourceGroup = isSCMResourceGroup(context);
        const selection = this.getSelectedResources().filter(r => isSCMResourceGroup(r) === isContextResourceGroup);
        const contextIsSelected = selection.some(s => s === context);
        const actualContext = contextIsSelected ? selection : [context];
        const args = actualContext.map(e => ResourceTree.isResourceNode(e) ? ResourceTree.collect(e) : [e]).flat();
        await action.run(...args);
    }
}
let ResourceRenderer = class ResourceRenderer {
    static { ResourceRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'resource'; }
    get templateId() { return ResourceRenderer_1.TEMPLATE_ID; }
    constructor(viewMode, labels, actionViewItemProvider, actionRunner, commandService, contextKeyService, contextMenuService, keybindingService, labelService, menuService, scmViewService, telemetryService, themeService) {
        this.viewMode = viewMode;
        this.labels = labels;
        this.actionViewItemProvider = actionViewItemProvider;
        this.actionRunner = actionRunner;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.keybindingService = keybindingService;
        this.labelService = labelService;
        this.menuService = menuService;
        this.scmViewService = scmViewService;
        this.telemetryService = telemetryService;
        this.themeService = themeService;
        this.disposables = new DisposableStore();
        this.renderedResources = new Map();
        themeService.onDidColorThemeChange(this.onDidColorThemeChange, this, this.disposables);
    }
    renderTemplate(container) {
        const element = append(container, $('.resource'));
        const name = append(element, $('.name'));
        const fileLabel = this.labels.create(name, { supportDescriptionHighlights: true, supportHighlights: true });
        const actionsContainer = append(fileLabel.element, $('.actions'));
        const actionBar = new WorkbenchToolBar(actionsContainer, {
            actionViewItemProvider: this.actionViewItemProvider,
            actionRunner: this.actionRunner
        }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService);
        const decorationIcon = append(element, $('.decoration-icon'));
        const actionBarMenuListener = new MutableDisposable();
        const disposables = combinedDisposable(actionBar, fileLabel, actionBarMenuListener);
        return { element, name, fileLabel, decorationIcon, actionBar, actionBarMenu: undefined, actionBarMenuListener, elementDisposables: new DisposableStore(), disposables };
    }
    renderElement(node, index, template) {
        const resourceOrFolder = node.element;
        const iconResource = ResourceTree.isResourceNode(resourceOrFolder) ? resourceOrFolder.element : resourceOrFolder;
        const uri = ResourceTree.isResourceNode(resourceOrFolder) ? resourceOrFolder.uri : resourceOrFolder.sourceUri;
        const fileKind = ResourceTree.isResourceNode(resourceOrFolder) ? FileKind.FOLDER : FileKind.FILE;
        const tooltip = !ResourceTree.isResourceNode(resourceOrFolder) && resourceOrFolder.decorations.tooltip || '';
        const hidePath = this.viewMode() === "tree" /* ViewMode.Tree */;
        let matches;
        let descriptionMatches;
        let strikethrough;
        if (ResourceTree.isResourceNode(resourceOrFolder)) {
            if (resourceOrFolder.element) {
                const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.element.resourceGroup.provider);
                this._renderActionBar(template, resourceOrFolder, menus.getResourceMenu(resourceOrFolder.element));
                template.element.classList.toggle('faded', resourceOrFolder.element.decorations.faded);
                strikethrough = resourceOrFolder.element.decorations.strikeThrough;
            }
            else {
                const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.context.provider);
                this._renderActionBar(template, resourceOrFolder, menus.getResourceFolderMenu(resourceOrFolder.context));
                matches = createMatches(node.filterData);
                template.element.classList.remove('faded');
            }
        }
        else {
            const menus = this.scmViewService.menus.getRepositoryMenus(resourceOrFolder.resourceGroup.provider);
            this._renderActionBar(template, resourceOrFolder, menus.getResourceMenu(resourceOrFolder));
            [matches, descriptionMatches] = processResourceFilterData(uri, node.filterData);
            template.element.classList.toggle('faded', resourceOrFolder.decorations.faded);
            strikethrough = resourceOrFolder.decorations.strikeThrough;
        }
        const renderedData = {
            tooltip, uri, fileLabelOptions: { hidePath, fileKind, matches, descriptionMatches, strikethrough }, iconResource
        };
        this.renderIcon(template, renderedData);
        this.renderedResources.set(template, renderedData);
        template.elementDisposables.add(toDisposable(() => this.renderedResources.delete(template)));
        template.element.setAttribute('data-tooltip', tooltip);
    }
    disposeElement(resource, index, template) {
        template.elementDisposables.clear();
    }
    renderCompressedElements(node, index, template, height) {
        const compressed = node.element;
        const folder = compressed.elements[compressed.elements.length - 1];
        const label = compressed.elements.map(e => e.name);
        const fileKind = FileKind.FOLDER;
        const matches = createMatches(node.filterData);
        template.fileLabel.setResource({ resource: folder.uri, name: label }, {
            fileDecorations: { colors: false, badges: true },
            fileKind,
            matches,
            separator: this.labelService.getSeparator(folder.uri.scheme)
        });
        const menus = this.scmViewService.menus.getRepositoryMenus(folder.context.provider);
        this._renderActionBar(template, folder, menus.getResourceFolderMenu(folder.context));
        template.name.classList.remove('strike-through');
        template.element.classList.remove('faded');
        template.decorationIcon.style.display = 'none';
        template.decorationIcon.style.backgroundImage = '';
        template.element.setAttribute('data-tooltip', '');
    }
    disposeCompressedElements(node, index, template, height) {
        template.elementDisposables.clear();
    }
    disposeTemplate(template) {
        template.elementDisposables.dispose();
        template.disposables.dispose();
    }
    _renderActionBar(template, resourceOrFolder, menu) {
        if (!template.actionBarMenu || template.actionBarMenu !== menu) {
            template.actionBarMenu = menu;
            template.actionBarMenuListener.value = connectPrimaryMenu(menu, primary => {
                template.actionBar.setActions(primary);
            }, 'inline');
        }
        template.actionBar.context = resourceOrFolder;
    }
    onDidColorThemeChange() {
        for (const [template, data] of this.renderedResources) {
            this.renderIcon(template, data);
        }
    }
    renderIcon(template, data) {
        const theme = this.themeService.getColorTheme();
        const icon = theme.type === ColorScheme.LIGHT ? data.iconResource?.decorations.icon : data.iconResource?.decorations.iconDark;
        template.fileLabel.setFile(data.uri, {
            ...data.fileLabelOptions,
            fileDecorations: { colors: false, badges: !icon },
        });
        if (icon) {
            if (ThemeIcon.isThemeIcon(icon)) {
                template.decorationIcon.className = `decoration-icon ${ThemeIcon.asClassName(icon)}`;
                if (icon.color) {
                    template.decorationIcon.style.color = theme.getColor(icon.color.id)?.toString() ?? '';
                }
                template.decorationIcon.style.display = '';
                template.decorationIcon.style.backgroundImage = '';
            }
            else {
                template.decorationIcon.className = 'decoration-icon';
                template.decorationIcon.style.color = '';
                template.decorationIcon.style.display = '';
                template.decorationIcon.style.backgroundImage = asCSSUrl(icon);
            }
            template.decorationIcon.title = data.tooltip;
        }
        else {
            template.decorationIcon.className = 'decoration-icon';
            template.decorationIcon.style.color = '';
            template.decorationIcon.style.display = 'none';
            template.decorationIcon.style.backgroundImage = '';
            template.decorationIcon.title = '';
        }
    }
    dispose() {
        this.disposables.dispose();
    }
};
ResourceRenderer = ResourceRenderer_1 = __decorate([
    __param(4, ICommandService),
    __param(5, IContextKeyService),
    __param(6, IContextMenuService),
    __param(7, IKeybindingService),
    __param(8, ILabelService),
    __param(9, IMenuService),
    __param(10, ISCMViewService),
    __param(11, ITelemetryService),
    __param(12, IThemeService)
], ResourceRenderer);
class ListDelegate {
    constructor(inputRenderer) {
        this.inputRenderer = inputRenderer;
    }
    getHeight(element) {
        if (isSCMInput(element)) {
            return this.inputRenderer.getHeight(element);
        }
        else if (isSCMActionButton(element)) {
            return ActionButtonRenderer.DEFAULT_HEIGHT + 8;
        }
        else {
            return 22;
        }
    }
    getTemplateId(element) {
        if (isSCMRepository(element)) {
            return RepositoryRenderer.TEMPLATE_ID;
        }
        else if (isSCMInput(element)) {
            return InputRenderer.TEMPLATE_ID;
        }
        else if (isSCMActionButton(element)) {
            return ActionButtonRenderer.TEMPLATE_ID;
        }
        else if (isSCMResourceGroup(element)) {
            return ResourceGroupRenderer.TEMPLATE_ID;
        }
        else if (isSCMResource(element) || isSCMResourceNode(element)) {
            return ResourceRenderer.TEMPLATE_ID;
        }
        else {
            throw new Error('Unknown element');
        }
    }
}
class SCMTreeCompressionDelegate {
    isIncompressible(element) {
        if (ResourceTree.isResourceNode(element)) {
            return element.childrenCount === 0 || !element.parent || !element.parent.parent;
        }
        return true;
    }
}
class SCMTreeFilter {
    filter(element) {
        if (isSCMResourceGroup(element)) {
            return element.resources.length > 0 || !element.hideWhenEmpty;
        }
        else {
            return true;
        }
    }
}
export class SCMTreeSorter {
    constructor(viewMode, viewSortKey) {
        this.viewMode = viewMode;
        this.viewSortKey = viewSortKey;
    }
    compare(one, other) {
        if (isSCMRepository(one)) {
            if (!isSCMRepository(other)) {
                throw new Error('Invalid comparison');
            }
            return 0;
        }
        if (isSCMInput(one)) {
            return -1;
        }
        else if (isSCMInput(other)) {
            return 1;
        }
        if (isSCMActionButton(one)) {
            return -1;
        }
        else if (isSCMActionButton(other)) {
            return 1;
        }
        if (isSCMResourceGroup(one)) {
            return isSCMResourceGroup(other) ? 0 : -1;
        }
        // Resource (List)
        if (this.viewMode() === "list" /* ViewMode.List */) {
            // FileName
            if (this.viewSortKey() === "name" /* ViewSortKey.Name */) {
                const oneName = basename(one.sourceUri);
                const otherName = basename(other.sourceUri);
                return compareFileNames(oneName, otherName);
            }
            // Status
            if (this.viewSortKey() === "status" /* ViewSortKey.Status */) {
                const oneTooltip = one.decorations.tooltip ?? '';
                const otherTooltip = other.decorations.tooltip ?? '';
                if (oneTooltip !== otherTooltip) {
                    return compare(oneTooltip, otherTooltip);
                }
            }
            // Path (default)
            const onePath = one.sourceUri.fsPath;
            const otherPath = other.sourceUri.fsPath;
            return comparePaths(onePath, otherPath);
        }
        // Resource (Tree)
        const oneIsDirectory = ResourceTree.isResourceNode(one);
        const otherIsDirectory = ResourceTree.isResourceNode(other);
        if (oneIsDirectory !== otherIsDirectory) {
            return oneIsDirectory ? -1 : 1;
        }
        const oneName = ResourceTree.isResourceNode(one) ? one.name : basename(one.sourceUri);
        const otherName = ResourceTree.isResourceNode(other) ? other.name : basename(other.sourceUri);
        return compareFileNames(oneName, otherName);
    }
}
let SCMTreeKeyboardNavigationLabelProvider = class SCMTreeKeyboardNavigationLabelProvider {
    constructor(viewMode, labelService) {
        this.viewMode = viewMode;
        this.labelService = labelService;
    }
    getKeyboardNavigationLabel(element) {
        if (ResourceTree.isResourceNode(element)) {
            return element.name;
        }
        else if (isSCMRepository(element) || isSCMInput(element) || isSCMActionButton(element)) {
            return undefined;
        }
        else if (isSCMResourceGroup(element)) {
            return element.label;
        }
        else {
            if (this.viewMode() === "list" /* ViewMode.List */) {
                // In List mode match using the file name and the path.
                // Since we want to match both on the file name and the
                // full path we return an array of labels. A match in the
                // file name takes precedence over a match in the path.
                const fileName = basename(element.sourceUri);
                const filePath = this.labelService.getUriLabel(element.sourceUri, { relative: true });
                return [fileName, filePath];
            }
            else {
                // In Tree mode only match using the file name
                return basename(element.sourceUri);
            }
        }
    }
    getCompressedNodeKeyboardNavigationLabel(elements) {
        const folders = elements;
        return folders.map(e => e.name).join('/');
    }
};
SCMTreeKeyboardNavigationLabelProvider = __decorate([
    __param(1, ILabelService)
], SCMTreeKeyboardNavigationLabelProvider);
export { SCMTreeKeyboardNavigationLabelProvider };
function getSCMResourceId(element) {
    if (isSCMRepository(element)) {
        const provider = element.provider;
        return `repo:${provider.id}`;
    }
    else if (isSCMInput(element)) {
        const provider = element.repository.provider;
        return `input:${provider.id}`;
    }
    else if (isSCMActionButton(element)) {
        const provider = element.repository.provider;
        return `actionButton:${provider.id}`;
    }
    else if (isSCMResourceGroup(element)) {
        const provider = element.provider;
        return `resourceGroup:${provider.id}/${element.id}`;
    }
    else if (isSCMResource(element)) {
        const group = element.resourceGroup;
        const provider = group.provider;
        return `resource:${provider.id}/${group.id}/${element.sourceUri.toString()}`;
    }
    else if (isSCMResourceNode(element)) {
        const group = element.context;
        return `folder:${group.provider.id}/${group.id}/$FOLDER/${element.uri.toString()}`;
    }
    else {
        throw new Error('Invalid tree element');
    }
}
class SCMResourceIdentityProvider {
    getId(element) {
        return getSCMResourceId(element);
    }
}
let SCMAccessibilityProvider = class SCMAccessibilityProvider {
    constructor(accessibilityService, configurationService, keybindingService, labelService) {
        this.accessibilityService = accessibilityService;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return localize('scm', "Source Control Management");
    }
    getAriaLabel(element) {
        if (ResourceTree.isResourceNode(element)) {
            return this.labelService.getUriLabel(element.uri, { relative: true, noPrefix: true }) || element.name;
        }
        else if (isSCMRepository(element)) {
            return `${element.provider.name} ${element.provider.label}`;
        }
        else if (isSCMInput(element)) {
            const verbosity = this.configurationService.getValue("accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */) === true;
            if (!verbosity || !this.accessibilityService.isScreenReaderOptimized()) {
                return localize('scmInput', "Source Control Input");
            }
            const kbLabel = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
            return kbLabel
                ? localize('scmInputRow.accessibilityHelp', "Source Control Input, Use {0} to open Source Control Accessibility Help.", kbLabel)
                : localize('scmInputRow.accessibilityHelpNoKb', "Source Control Input, Run the Open Accessibility Help command for more information.");
        }
        else if (isSCMActionButton(element)) {
            return element.button?.command.title ?? '';
        }
        else if (isSCMResourceGroup(element)) {
            return element.label;
        }
        else {
            const result = [];
            result.push(basename(element.sourceUri));
            if (element.decorations.tooltip) {
                result.push(element.decorations.tooltip);
            }
            const path = this.labelService.getUriLabel(dirname(element.sourceUri), { relative: true, noPrefix: true });
            if (path) {
                result.push(path);
            }
            return result.join(', ');
        }
    }
};
SCMAccessibilityProvider = __decorate([
    __param(0, IAccessibilityService),
    __param(1, IConfigurationService),
    __param(2, IKeybindingService),
    __param(3, ILabelService)
], SCMAccessibilityProvider);
export { SCMAccessibilityProvider };
var ViewMode;
(function (ViewMode) {
    ViewMode["List"] = "list";
    ViewMode["Tree"] = "tree";
})(ViewMode || (ViewMode = {}));
var ViewSortKey;
(function (ViewSortKey) {
    ViewSortKey["Path"] = "path";
    ViewSortKey["Name"] = "name";
    ViewSortKey["Status"] = "status";
})(ViewSortKey || (ViewSortKey = {}));
const Menus = {
    ViewSort: new MenuId('SCMViewSort'),
    Repositories: new MenuId('SCMRepositories'),
    ChangesSettings: new MenuId('SCMChangesSettings'),
};
export const ContextKeys = {
    SCMViewMode: new RawContextKey('scmViewMode', "list" /* ViewMode.List */),
    SCMViewSortKey: new RawContextKey('scmViewSortKey', "path" /* ViewSortKey.Path */),
    SCMViewAreAllRepositoriesCollapsed: new RawContextKey('scmViewAreAllRepositoriesCollapsed', false),
    SCMViewIsAnyRepositoryCollapsible: new RawContextKey('scmViewIsAnyRepositoryCollapsible', false),
    SCMProvider: new RawContextKey('scmProvider', undefined),
    SCMProviderRootUri: new RawContextKey('scmProviderRootUri', undefined),
    SCMProviderHasRootUri: new RawContextKey('scmProviderHasRootUri', undefined),
    SCMHistoryItemCount: new RawContextKey('scmHistoryItemCount', 0),
    SCMCurrentHistoryItemRefHasRemote: new RawContextKey('scmCurrentHistoryItemRefHasRemote', false),
    SCMCurrentHistoryItemRefInFilter: new RawContextKey('scmCurrentHistoryItemRefInFilter', false),
    RepositoryCount: new RawContextKey('scmRepositoryCount', 0),
    RepositoryVisibilityCount: new RawContextKey('scmRepositoryVisibleCount', 0),
    RepositoryVisibility(repository) {
        return new RawContextKey(`scmRepositoryVisible:${repository.provider.id}`, false);
    }
};
MenuRegistry.appendMenuItem(MenuId.SCMTitle, {
    title: localize('sortAction', "View & Sort"),
    submenu: Menus.ViewSort,
    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.RepositoryCount.notEqualsTo(0)),
    group: '0_view&sort',
    order: 1
});
MenuRegistry.appendMenuItem(Menus.ViewSort, {
    title: localize('repositories', "Repositories"),
    submenu: Menus.Repositories,
    when: ContextKeyExpr.greater(ContextKeys.RepositoryCount.key, 1),
    group: '0_repositories'
});
class RepositoryVisibilityAction extends Action2 {
    constructor(repository) {
        super({
            id: `workbench.scm.action.toggleRepositoryVisibility.${repository.provider.id}`,
            title: repository.provider.name,
            f1: false,
            precondition: ContextKeyExpr.or(ContextKeys.RepositoryVisibilityCount.notEqualsTo(1), ContextKeys.RepositoryVisibility(repository).isEqualTo(false)),
            toggled: ContextKeys.RepositoryVisibility(repository).isEqualTo(true),
            menu: { id: Menus.Repositories, group: '0_repositories' }
        });
        this.repository = repository;
    }
    run(accessor) {
        const scmViewService = accessor.get(ISCMViewService);
        scmViewService.toggleVisibility(this.repository);
    }
}
let RepositoryVisibilityActionController = class RepositoryVisibilityActionController {
    constructor(contextKeyService, scmViewService, scmService) {
        this.contextKeyService = contextKeyService;
        this.scmViewService = scmViewService;
        this.items = new Map();
        this.disposables = new DisposableStore();
        this.repositoryCountContextKey = ContextKeys.RepositoryCount.bindTo(contextKeyService);
        this.repositoryVisibilityCountContextKey = ContextKeys.RepositoryVisibilityCount.bindTo(contextKeyService);
        scmViewService.onDidChangeVisibleRepositories(this.onDidChangeVisibleRepositories, this, this.disposables);
        scmService.onDidAddRepository(this.onDidAddRepository, this, this.disposables);
        scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposables);
        for (const repository of scmService.repositories) {
            this.onDidAddRepository(repository);
        }
    }
    onDidAddRepository(repository) {
        const action = registerAction2(class extends RepositoryVisibilityAction {
            constructor() {
                super(repository);
            }
        });
        const contextKey = ContextKeys.RepositoryVisibility(repository).bindTo(this.contextKeyService);
        contextKey.set(this.scmViewService.isVisible(repository));
        this.items.set(repository, {
            contextKey,
            dispose() {
                contextKey.reset();
                action.dispose();
            }
        });
        this.updateRepositoryContextKeys();
    }
    onDidRemoveRepository(repository) {
        this.items.get(repository)?.dispose();
        this.items.delete(repository);
        this.updateRepositoryContextKeys();
    }
    onDidChangeVisibleRepositories() {
        let count = 0;
        for (const [repository, item] of this.items) {
            const isVisible = this.scmViewService.isVisible(repository);
            item.contextKey.set(isVisible);
            if (isVisible) {
                count++;
            }
        }
        this.repositoryCountContextKey.set(this.items.size);
        this.repositoryVisibilityCountContextKey.set(count);
    }
    updateRepositoryContextKeys() {
        this.repositoryCountContextKey.set(this.items.size);
        this.repositoryVisibilityCountContextKey.set(Iterable.reduce(this.items.keys(), (r, repository) => r + (this.scmViewService.isVisible(repository) ? 1 : 0), 0));
    }
    dispose() {
        this.disposables.dispose();
        dispose(this.items.values());
        this.items.clear();
    }
};
RepositoryVisibilityActionController = __decorate([
    __param(0, IContextKeyService),
    __param(1, ISCMViewService),
    __param(2, ISCMService)
], RepositoryVisibilityActionController);
class SetListViewModeAction extends ViewAction {
    constructor(id = 'workbench.scm.action.setListViewMode', menu = {}) {
        super({
            id,
            title: localize('setListViewMode', "View as List"),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.listTree,
            toggled: ContextKeys.SCMViewMode.isEqualTo("list" /* ViewMode.List */),
            menu: { id: Menus.ViewSort, group: '1_viewmode', ...menu }
        });
    }
    async runInView(_, view) {
        view.viewMode = "list" /* ViewMode.List */;
    }
}
class SetListViewModeNavigationAction extends SetListViewModeAction {
    constructor() {
        super('workbench.scm.action.setListViewModeNavigation', {
            id: MenuId.SCMTitle,
            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.RepositoryCount.notEqualsTo(0), ContextKeys.SCMViewMode.isEqualTo("tree" /* ViewMode.Tree */)),
            group: 'navigation',
            order: -1000
        });
    }
}
class SetTreeViewModeAction extends ViewAction {
    constructor(id = 'workbench.scm.action.setTreeViewMode', menu = {}) {
        super({
            id,
            title: localize('setTreeViewMode', "View as Tree"),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.listFlat,
            toggled: ContextKeys.SCMViewMode.isEqualTo("tree" /* ViewMode.Tree */),
            menu: { id: Menus.ViewSort, group: '1_viewmode', ...menu }
        });
    }
    async runInView(_, view) {
        view.viewMode = "tree" /* ViewMode.Tree */;
    }
}
class SetTreeViewModeNavigationAction extends SetTreeViewModeAction {
    constructor() {
        super('workbench.scm.action.setTreeViewModeNavigation', {
            id: MenuId.SCMTitle,
            when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.RepositoryCount.notEqualsTo(0), ContextKeys.SCMViewMode.isEqualTo("list" /* ViewMode.List */)),
            group: 'navigation',
            order: -1000
        });
    }
}
registerAction2(SetListViewModeAction);
registerAction2(SetTreeViewModeAction);
registerAction2(SetListViewModeNavigationAction);
registerAction2(SetTreeViewModeNavigationAction);
class RepositorySortAction extends ViewAction {
    constructor(sortKey, title) {
        super({
            id: `workbench.scm.action.repositories.setSortKey.${sortKey}`,
            title,
            viewId: VIEW_PANE_ID,
            f1: false,
            toggled: RepositoryContextKeys.RepositorySortKey.isEqualTo(sortKey),
            menu: [
                {
                    id: Menus.Repositories,
                    group: '1_sort'
                },
                {
                    id: MenuId.SCMSourceControlTitle,
                    group: '1_sort',
                },
            ]
        });
        this.sortKey = sortKey;
    }
    runInView(accessor) {
        accessor.get(ISCMViewService).toggleSortKey(this.sortKey);
    }
}
class RepositorySortByDiscoveryTimeAction extends RepositorySortAction {
    constructor() {
        super("discoveryTime" /* ISCMRepositorySortKey.DiscoveryTime */, localize('repositorySortByDiscoveryTime', "Sort by Discovery Time"));
    }
}
class RepositorySortByNameAction extends RepositorySortAction {
    constructor() {
        super("name" /* ISCMRepositorySortKey.Name */, localize('repositorySortByName', "Sort by Name"));
    }
}
class RepositorySortByPathAction extends RepositorySortAction {
    constructor() {
        super("path" /* ISCMRepositorySortKey.Path */, localize('repositorySortByPath', "Sort by Path"));
    }
}
registerAction2(RepositorySortByDiscoveryTimeAction);
registerAction2(RepositorySortByNameAction);
registerAction2(RepositorySortByPathAction);
class SetSortKeyAction extends ViewAction {
    constructor(sortKey, title) {
        super({
            id: `workbench.scm.action.setSortKey.${sortKey}`,
            title,
            viewId: VIEW_PANE_ID,
            f1: false,
            toggled: ContextKeys.SCMViewSortKey.isEqualTo(sortKey),
            precondition: ContextKeys.SCMViewMode.isEqualTo("list" /* ViewMode.List */),
            menu: { id: Menus.ViewSort, group: '2_sort' }
        });
        this.sortKey = sortKey;
    }
    async runInView(_, view) {
        view.viewSortKey = this.sortKey;
    }
}
class SetSortByNameAction extends SetSortKeyAction {
    constructor() {
        super("name" /* ViewSortKey.Name */, localize('sortChangesByName', "Sort Changes by Name"));
    }
}
class SetSortByPathAction extends SetSortKeyAction {
    constructor() {
        super("path" /* ViewSortKey.Path */, localize('sortChangesByPath', "Sort Changes by Path"));
    }
}
class SetSortByStatusAction extends SetSortKeyAction {
    constructor() {
        super("status" /* ViewSortKey.Status */, localize('sortChangesByStatus', "Sort Changes by Status"));
    }
}
registerAction2(SetSortByNameAction);
registerAction2(SetSortByPathAction);
registerAction2(SetSortByStatusAction);
class CollapseAllRepositoriesAction extends ViewAction {
    constructor() {
        super({
            id: `workbench.scm.action.collapseAllRepositories`,
            title: localize('collapse all', "Collapse All Repositories"),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.SCMTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.SCMViewIsAnyRepositoryCollapsible.isEqualTo(true), ContextKeys.SCMViewAreAllRepositoriesCollapsed.isEqualTo(false))
            }
        });
    }
    async runInView(_, view) {
        view.collapseAllRepositories();
    }
}
class ExpandAllRepositoriesAction extends ViewAction {
    constructor() {
        super({
            id: `workbench.scm.action.expandAllRepositories`,
            title: localize('expand all', "Expand All Repositories"),
            viewId: VIEW_PANE_ID,
            f1: false,
            icon: Codicon.expandAll,
            menu: {
                id: MenuId.SCMTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_PANE_ID), ContextKeys.SCMViewIsAnyRepositoryCollapsible.isEqualTo(true), ContextKeys.SCMViewAreAllRepositoriesCollapsed.isEqualTo(true))
            }
        });
    }
    async runInView(_, view) {
        view.expandAllRepositories();
    }
}
registerAction2(CollapseAllRepositoriesAction);
registerAction2(ExpandAllRepositoriesAction);
var SCMInputWidgetCommandId;
(function (SCMInputWidgetCommandId) {
    SCMInputWidgetCommandId["CancelAction"] = "scm.input.cancelAction";
})(SCMInputWidgetCommandId || (SCMInputWidgetCommandId = {}));
var SCMInputWidgetStorageKey;
(function (SCMInputWidgetStorageKey) {
    SCMInputWidgetStorageKey["LastActionId"] = "scm.input.lastActionId";
})(SCMInputWidgetStorageKey || (SCMInputWidgetStorageKey = {}));
let SCMInputWidgetActionRunner = class SCMInputWidgetActionRunner extends ActionRunner {
    get runningActions() { return this._runningActions; }
    constructor(input, storageService) {
        super();
        this.input = input;
        this.storageService = storageService;
        this._runningActions = new Set();
    }
    async runAction(action) {
        try {
            // Cancel previous action
            if (this.runningActions.size !== 0) {
                this._cts?.cancel();
                if (action.id === "scm.input.cancelAction" /* SCMInputWidgetCommandId.CancelAction */) {
                    return;
                }
            }
            // Create action context
            const context = [];
            for (const group of this.input.repository.provider.groups) {
                context.push({
                    resourceGroupId: group.id,
                    resources: [...group.resources.map(r => r.sourceUri)]
                });
            }
            // Run action
            this._runningActions.add(action);
            this._cts = new CancellationTokenSource();
            await action.run(...[this.input.repository.provider.rootUri, context, this._cts.token]);
        }
        finally {
            this._runningActions.delete(action);
            // Save last action
            if (this._runningActions.size === 0) {
                this.storageService.store("scm.input.lastActionId" /* SCMInputWidgetStorageKey.LastActionId */, action.id, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            }
        }
    }
};
SCMInputWidgetActionRunner = __decorate([
    __param(1, IStorageService)
], SCMInputWidgetActionRunner);
let SCMInputWidgetToolbar = class SCMInputWidgetToolbar extends WorkbenchToolBar {
    get dropdownActions() { return this._dropdownActions; }
    get dropdownAction() { return this._dropdownAction; }
    constructor(container, options, menuService, contextKeyService, contextMenuService, commandService, keybindingService, storageService, telemetryService) {
        super(container, { resetMenu: MenuId.SCMInputBox, ...options }, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService);
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.storageService = storageService;
        this._dropdownActions = [];
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._disposables = this._register(new MutableDisposable());
        this._dropdownAction = new Action('scmInputMoreActions', localize('scmInputMoreActions', "More Actions..."), 'codicon-chevron-down');
        this._cancelAction = new MenuItemAction({
            id: "scm.input.cancelAction" /* SCMInputWidgetCommandId.CancelAction */,
            title: localize('scmInputCancelAction', "Cancel"),
            icon: Codicon.stopCircle,
        }, undefined, undefined, undefined, undefined, contextKeyService, commandService);
    }
    setInput(input) {
        this._disposables.value = new DisposableStore();
        const contextKeyService = this.contextKeyService.createOverlay([
            ['scmProvider', input.repository.provider.contextValue],
            ['scmProviderRootUri', input.repository.provider.rootUri?.toString()],
            ['scmProviderHasRootUri', !!input.repository.provider.rootUri]
        ]);
        const menu = this._disposables.value.add(this.menuService.createMenu(MenuId.SCMInputBox, contextKeyService, { emitEventsForSubmenuChanges: true }));
        const isEnabled = () => {
            return input.repository.provider.groups.some(g => g.resources.length > 0);
        };
        const updateToolbar = () => {
            const actions = getFlatActionBarActions(menu.getActions({ shouldForwardArgs: true }));
            for (const action of actions) {
                action.enabled = isEnabled();
            }
            this._dropdownAction.enabled = isEnabled();
            let primaryAction = undefined;
            if (actions.length === 1) {
                primaryAction = actions[0];
            }
            else if (actions.length > 1) {
                const lastActionId = this.storageService.get("scm.input.lastActionId" /* SCMInputWidgetStorageKey.LastActionId */, 0 /* StorageScope.PROFILE */, '');
                primaryAction = actions.find(a => a.id === lastActionId) ?? actions[0];
            }
            this._dropdownActions = actions.length === 1 ? [] : actions;
            super.setActions(primaryAction ? [primaryAction] : [], []);
            this._onDidChange.fire();
        };
        this._disposables.value.add(menu.onDidChange(() => updateToolbar()));
        this._disposables.value.add(input.repository.provider.onDidChangeResources(() => updateToolbar()));
        this._disposables.value.add(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, "scm.input.lastActionId" /* SCMInputWidgetStorageKey.LastActionId */, this._disposables.value)(() => updateToolbar()));
        this.actionRunner = this._disposables.value.add(new SCMInputWidgetActionRunner(input, this.storageService));
        this._disposables.value.add(this.actionRunner.onWillRun(e => {
            if (this.actionRunner.runningActions.size === 0) {
                super.setActions([this._cancelAction], []);
                this._onDidChange.fire();
            }
        }));
        this._disposables.value.add(this.actionRunner.onDidRun(e => {
            if (this.actionRunner.runningActions.size === 0) {
                updateToolbar();
            }
        }));
        updateToolbar();
    }
};
SCMInputWidgetToolbar = __decorate([
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, ICommandService),
    __param(6, IKeybindingService),
    __param(7, IStorageService),
    __param(8, ITelemetryService)
], SCMInputWidgetToolbar);
class SCMInputWidgetEditorOptions {
    constructor(overflowWidgetsDomNode, configurationService) {
        this.overflowWidgetsDomNode = overflowWidgetsDomNode;
        this.configurationService = configurationService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.defaultInputFontFamily = DEFAULT_FONT_FAMILY;
        this._disposables = new DisposableStore();
        const onDidChangeConfiguration = Event.filter(this.configurationService.onDidChangeConfiguration, e => {
            return e.affectsConfiguration('editor.accessibilitySupport') ||
                e.affectsConfiguration('editor.cursorBlinking') ||
                e.affectsConfiguration('editor.cursorStyle') ||
                e.affectsConfiguration('editor.cursorWidth') ||
                e.affectsConfiguration('editor.emptySelectionClipboard') ||
                e.affectsConfiguration('editor.fontFamily') ||
                e.affectsConfiguration('editor.rulers') ||
                e.affectsConfiguration('editor.wordWrap') ||
                e.affectsConfiguration('scm.inputFontFamily') ||
                e.affectsConfiguration('scm.inputFontSize');
        }, this._disposables);
        this._disposables.add(onDidChangeConfiguration(() => this._onDidChange.fire()));
    }
    getEditorConstructionOptions() {
        return {
            ...getSimpleEditorOptions(this.configurationService),
            ...this.getEditorOptions(),
            dragAndDrop: true,
            dropIntoEditor: { enabled: true },
            formatOnType: true,
            lineDecorationsWidth: 6,
            overflowWidgetsDomNode: this.overflowWidgetsDomNode,
            padding: { top: 2, bottom: 2 },
            quickSuggestions: false,
            renderWhitespace: 'none',
            scrollbar: {
                alwaysConsumeMouseWheel: false,
                vertical: 'hidden'
            },
            wrappingIndent: 'none',
            wrappingStrategy: 'advanced',
        };
    }
    getEditorOptions() {
        const fontFamily = this._getEditorFontFamily();
        const fontSize = this._getEditorFontSize();
        const lineHeight = this._getEditorLineHeight(fontSize);
        const accessibilitySupport = this.configurationService.getValue('editor.accessibilitySupport');
        const cursorBlinking = this.configurationService.getValue('editor.cursorBlinking');
        const cursorStyle = this.configurationService.getValue('editor.cursorStyle');
        const cursorWidth = this.configurationService.getValue('editor.cursorWidth') ?? 1;
        const emptySelectionClipboard = this.configurationService.getValue('editor.emptySelectionClipboard') === true;
        return { ...this._getEditorLanguageConfiguration(), accessibilitySupport, cursorBlinking, cursorStyle, cursorWidth, fontFamily, fontSize, lineHeight, emptySelectionClipboard };
    }
    _getEditorFontFamily() {
        const inputFontFamily = this.configurationService.getValue('scm.inputFontFamily').trim();
        if (inputFontFamily.toLowerCase() === 'editor') {
            return this.configurationService.getValue('editor.fontFamily').trim();
        }
        if (inputFontFamily.length !== 0 && inputFontFamily.toLowerCase() !== 'default') {
            return inputFontFamily;
        }
        return this.defaultInputFontFamily;
    }
    _getEditorFontSize() {
        return this.configurationService.getValue('scm.inputFontSize');
    }
    _getEditorLanguageConfiguration() {
        // editor.rulers
        const rulersConfig = this.configurationService.inspect('editor.rulers', { overrideIdentifier: 'scminput' });
        const rulers = rulersConfig.overrideIdentifiers?.includes('scminput') ? EditorOptions.rulers.validate(rulersConfig.value) : [];
        // editor.wordWrap
        const wordWrapConfig = this.configurationService.inspect('editor.wordWrap', { overrideIdentifier: 'scminput' });
        const wordWrap = wordWrapConfig.overrideIdentifiers?.includes('scminput') ? EditorOptions.wordWrap.validate(wordWrapConfig.value) : 'on';
        return { rulers, wordWrap };
    }
    _getEditorLineHeight(fontSize) {
        return Math.round(fontSize * 1.5);
    }
    dispose() {
        this._disposables.dispose();
    }
}
let SCMInputWidget = class SCMInputWidget {
    static { SCMInputWidget_1 = this; }
    static { this.ValidationTimeouts = {
        [2 /* InputValidationType.Information */]: 5000,
        [1 /* InputValidationType.Warning */]: 8000,
        [0 /* InputValidationType.Error */]: 10000
    }; }
    get input() {
        return this.model?.input;
    }
    set input(input) {
        if (input === this.input) {
            return;
        }
        this.clearValidation();
        this.element.classList.remove('synthetic-focus');
        this.repositoryDisposables.clear();
        this.repositoryIdContextKey.set(input?.repository.id);
        if (!input) {
            this.inputEditor.setModel(undefined);
            this.model = undefined;
            return;
        }
        const textModel = input.repository.provider.inputBoxTextModel;
        this.inputEditor.setModel(textModel);
        if (this.configurationService.getValue('editor.wordBasedSuggestions', { resource: textModel.uri }) !== 'off') {
            this.configurationService.updateValue('editor.wordBasedSuggestions', 'off', { resource: textModel.uri }, 8 /* ConfigurationTarget.MEMORY */);
        }
        // Validation
        const validationDelayer = new ThrottledDelayer(200);
        const validate = async () => {
            const position = this.inputEditor.getSelection()?.getStartPosition();
            const offset = position && textModel.getOffsetAt(position);
            const value = textModel.getValue();
            this.setValidation(await input.validateInput(value, offset || 0));
        };
        const triggerValidation = () => validationDelayer.trigger(validate);
        this.repositoryDisposables.add(validationDelayer);
        this.repositoryDisposables.add(this.inputEditor.onDidChangeCursorPosition(triggerValidation));
        // Adaptive indentation rules
        const opts = this.modelService.getCreationOptions(textModel.getLanguageId(), textModel.uri, textModel.isForSimpleWidget);
        const onEnter = Event.filter(this.inputEditor.onKeyDown, e => e.keyCode === 3 /* KeyCode.Enter */, this.repositoryDisposables);
        this.repositoryDisposables.add(onEnter(() => textModel.detectIndentation(opts.insertSpaces, opts.tabSize)));
        // Keep model in sync with API
        textModel.setValue(input.value);
        this.repositoryDisposables.add(input.onDidChange(({ value, reason }) => {
            const currentValue = textModel.getValue();
            if (value === currentValue) { // circuit breaker
                return;
            }
            textModel.pushStackElement();
            textModel.pushEditOperations(null, [EditOperation.replaceMove(textModel.getFullModelRange(), value)], () => []);
            const position = reason === SCMInputChangeReason.HistoryPrevious
                ? textModel.getFullModelRange().getStartPosition()
                : textModel.getFullModelRange().getEndPosition();
            this.inputEditor.setPosition(position);
            this.inputEditor.revealPositionInCenterIfOutsideViewport(position);
        }));
        this.repositoryDisposables.add(input.onDidChangeFocus(() => this.focus()));
        this.repositoryDisposables.add(input.onDidChangeValidationMessage((e) => this.setValidation(e, { focus: true, timeout: true })));
        this.repositoryDisposables.add(input.onDidChangeValidateInput((e) => triggerValidation()));
        // Keep API in sync with model and validate
        this.repositoryDisposables.add(textModel.onDidChangeContent(() => {
            input.setValue(textModel.getValue(), true);
            triggerValidation();
        }));
        // Aria label & placeholder text
        const accessibilityVerbosityConfig = observableConfigValue("accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */, true, this.configurationService);
        const getAriaLabel = (placeholder, verbosity) => {
            verbosity = verbosity ?? accessibilityVerbosityConfig.get();
            if (!verbosity || !this.accessibilityService.isScreenReaderOptimized()) {
                return placeholder;
            }
            const kbLabel = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
            return kbLabel
                ? localize('scmInput.accessibilityHelp', "{0}, Use {1} to open Source Control Accessibility Help.", placeholder, kbLabel)
                : localize('scmInput.accessibilityHelpNoKb', "{0}, Run the Open Accessibility Help command for more information.", placeholder);
        };
        const getPlaceholderText = () => {
            const binding = this.keybindingService.lookupKeybinding('scm.acceptInput');
            const label = binding ? binding.getLabel() : (platform.isMacintosh ? 'Cmd+Enter' : 'Ctrl+Enter');
            return format(input.placeholder, label);
        };
        const updatePlaceholderText = () => {
            const placeholder = getPlaceholderText();
            const ariaLabel = getAriaLabel(placeholder);
            this.inputEditor.updateOptions({ ariaLabel, placeholder });
        };
        this.repositoryDisposables.add(input.onDidChangePlaceholder(updatePlaceholderText));
        this.repositoryDisposables.add(this.keybindingService.onDidUpdateKeybindings(updatePlaceholderText));
        this.repositoryDisposables.add(runOnChange(accessibilityVerbosityConfig, verbosity => {
            const placeholder = getPlaceholderText();
            const ariaLabel = getAriaLabel(placeholder, verbosity);
            this.inputEditor.updateOptions({ ariaLabel });
        }));
        updatePlaceholderText();
        // Update input template
        let commitTemplate = '';
        this.repositoryDisposables.add(autorun(reader => {
            if (!input.visible) {
                return;
            }
            const oldCommitTemplate = commitTemplate;
            commitTemplate = input.repository.provider.commitTemplate.read(reader);
            const value = textModel.getValue();
            if (value && value !== oldCommitTemplate) {
                return;
            }
            textModel.setValue(commitTemplate);
        }));
        // Update input enablement
        const updateEnablement = (enabled) => {
            this.inputEditor.updateOptions({ readOnly: !enabled });
        };
        this.repositoryDisposables.add(input.onDidChangeEnablement(enabled => updateEnablement(enabled)));
        updateEnablement(input.enabled);
        // Toolbar
        this.toolbar.setInput(input);
        // Save model
        this.model = { input, textModel };
    }
    get selections() {
        return this.inputEditor.getSelections();
    }
    set selections(selections) {
        if (selections) {
            this.inputEditor.setSelections(selections);
        }
    }
    setValidation(validation, options) {
        if (this._validationTimer) {
            clearTimeout(this._validationTimer);
            this._validationTimer = 0;
        }
        this.validation = validation;
        this.renderValidation();
        if (options?.focus && !this.hasFocus()) {
            this.focus();
        }
        if (validation && options?.timeout) {
            this._validationTimer = setTimeout(() => this.setValidation(undefined), SCMInputWidget_1.ValidationTimeouts[validation.type]);
        }
    }
    constructor(container, overflowWidgetsDomNode, contextKeyService, modelService, keybindingService, configurationService, instantiationService, scmViewService, contextViewService, openerService, accessibilityService) {
        this.modelService = modelService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.scmViewService = scmViewService;
        this.contextViewService = contextViewService;
        this.openerService = openerService;
        this.accessibilityService = accessibilityService;
        this.disposables = new DisposableStore();
        this.repositoryDisposables = new DisposableStore();
        this.validationHasFocus = false;
        // This is due to "Setup height change listener on next tick" above
        // https://github.com/microsoft/vscode/issues/108067
        this.lastLayoutWasTrash = false;
        this.shouldFocusAfterLayout = false;
        this.element = append(container, $('.scm-editor'));
        this.editorContainer = append(this.element, $('.scm-editor-container'));
        this.toolbarContainer = append(this.element, $('.scm-editor-toolbar'));
        this.contextKeyService = contextKeyService.createScoped(this.element);
        this.repositoryIdContextKey = this.contextKeyService.createKey('scmRepository', undefined);
        this.inputEditorOptions = new SCMInputWidgetEditorOptions(overflowWidgetsDomNode, this.configurationService);
        this.disposables.add(this.inputEditorOptions.onDidChange(this.onDidChangeEditorOptions, this));
        this.disposables.add(this.inputEditorOptions);
        const codeEditorWidgetOptions = {
            contributions: EditorExtensionsRegistry.getSomeEditorContributions([
                CodeActionController.ID,
                ColorDetector.ID,
                ContextMenuController.ID,
                CopyPasteController.ID,
                DragAndDropController.ID,
                DropIntoEditorController.ID,
                EditorDictation.ID,
                FormatOnType.ID,
                ContentHoverController.ID,
                GlyphHoverController.ID,
                InlineCompletionsController.ID,
                LinkDetector.ID,
                MenuPreventer.ID,
                MessageController.ID,
                PlaceholderTextContribution.ID,
                SelectionClipboardContributionID,
                SnippetController2.ID,
                SuggestController.ID
            ]),
            isSimpleWidget: true
        };
        const services = new ServiceCollection([IContextKeyService, this.contextKeyService]);
        const instantiationService2 = instantiationService.createChild(services, this.disposables);
        const editorConstructionOptions = this.inputEditorOptions.getEditorConstructionOptions();
        this.inputEditor = instantiationService2.createInstance(CodeEditorWidget, this.editorContainer, editorConstructionOptions, codeEditorWidgetOptions);
        this.disposables.add(this.inputEditor);
        this.disposables.add(this.inputEditor.onDidFocusEditorText(() => {
            if (this.input?.repository) {
                this.scmViewService.focus(this.input.repository);
            }
            this.element.classList.add('synthetic-focus');
            this.renderValidation();
        }));
        this.disposables.add(this.inputEditor.onDidBlurEditorText(() => {
            this.element.classList.remove('synthetic-focus');
            setTimeout(() => {
                if (!this.validation || !this.validationHasFocus) {
                    this.clearValidation();
                }
            }, 0);
        }));
        this.disposables.add(this.inputEditor.onDidBlurEditorWidget(() => {
            CopyPasteController.get(this.inputEditor)?.clearWidgets();
            DropIntoEditorController.get(this.inputEditor)?.clearWidgets();
        }));
        const firstLineKey = this.contextKeyService.createKey('scmInputIsInFirstPosition', false);
        const lastLineKey = this.contextKeyService.createKey('scmInputIsInLastPosition', false);
        this.disposables.add(this.inputEditor.onDidChangeCursorPosition(({ position }) => {
            const viewModel = this.inputEditor._getViewModel();
            const lastLineNumber = viewModel.getLineCount();
            const lastLineCol = viewModel.getLineLength(lastLineNumber) + 1;
            const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);
            firstLineKey.set(viewPosition.lineNumber === 1 && viewPosition.column === 1);
            lastLineKey.set(viewPosition.lineNumber === lastLineNumber && viewPosition.column === lastLineCol);
        }));
        this.disposables.add(this.inputEditor.onDidScrollChange(e => {
            this.toolbarContainer.classList.toggle('scroll-decoration', e.scrollTop > 0);
        }));
        Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.showInputActionButton'))(() => this.layout(), this, this.disposables);
        this.onDidChangeContentHeight = Event.signal(Event.filter(this.inputEditor.onDidContentSizeChange, e => e.contentHeightChanged, this.disposables));
        // Toolbar
        this.toolbar = instantiationService2.createInstance(SCMInputWidgetToolbar, this.toolbarContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction && this.toolbar.dropdownActions.length > 1) {
                    return instantiationService.createInstance(DropdownWithPrimaryActionViewItem, action, this.toolbar.dropdownAction, this.toolbar.dropdownActions, '', { actionRunner: this.toolbar.actionRunner, hoverDelegate: options.hoverDelegate });
                }
                return createActionViewItem(instantiationService, action, options);
            },
            menuOptions: {
                shouldForwardArgs: true
            }
        });
        this.disposables.add(this.toolbar.onDidChange(() => this.layout()));
        this.disposables.add(this.toolbar);
    }
    getContentHeight() {
        const lineHeight = this.inputEditor.getOption(68 /* EditorOption.lineHeight */);
        const { top, bottom } = this.inputEditor.getOption(88 /* EditorOption.padding */);
        const inputMinLinesConfig = this.configurationService.getValue('scm.inputMinLineCount');
        const inputMinLines = typeof inputMinLinesConfig === 'number' ? clamp(inputMinLinesConfig, 1, 50) : 1;
        const editorMinHeight = inputMinLines * lineHeight + top + bottom;
        const inputMaxLinesConfig = this.configurationService.getValue('scm.inputMaxLineCount');
        const inputMaxLines = typeof inputMaxLinesConfig === 'number' ? clamp(inputMaxLinesConfig, 1, 50) : 10;
        const editorMaxHeight = inputMaxLines * lineHeight + top + bottom;
        return clamp(this.inputEditor.getContentHeight(), editorMinHeight, editorMaxHeight);
    }
    layout() {
        const editorHeight = this.getContentHeight();
        const toolbarWidth = this.getToolbarWidth();
        const dimension = new Dimension(this.element.clientWidth - toolbarWidth, editorHeight);
        if (dimension.width < 0) {
            this.lastLayoutWasTrash = true;
            return;
        }
        this.lastLayoutWasTrash = false;
        this.inputEditor.layout(dimension);
        this.renderValidation();
        const showInputActionButton = this.configurationService.getValue('scm.showInputActionButton') === true;
        this.toolbarContainer.classList.toggle('hidden', !showInputActionButton || this.toolbar?.isEmpty() === true);
        if (this.shouldFocusAfterLayout) {
            this.shouldFocusAfterLayout = false;
            this.focus();
        }
    }
    focus() {
        if (this.lastLayoutWasTrash) {
            this.lastLayoutWasTrash = false;
            this.shouldFocusAfterLayout = true;
            return;
        }
        this.inputEditor.focus();
        this.element.classList.add('synthetic-focus');
    }
    hasFocus() {
        return this.inputEditor.hasTextFocus();
    }
    onDidChangeEditorOptions() {
        this.inputEditor.updateOptions(this.inputEditorOptions.getEditorOptions());
    }
    renderValidation() {
        this.clearValidation();
        this.element.classList.toggle('validation-info', this.validation?.type === 2 /* InputValidationType.Information */);
        this.element.classList.toggle('validation-warning', this.validation?.type === 1 /* InputValidationType.Warning */);
        this.element.classList.toggle('validation-error', this.validation?.type === 0 /* InputValidationType.Error */);
        if (!this.validation || !this.inputEditor.hasTextFocus()) {
            return;
        }
        const disposables = new DisposableStore();
        this.validationContextView = this.contextViewService.showContextView({
            getAnchor: () => this.element,
            render: container => {
                this.element.style.borderBottomLeftRadius = '0';
                this.element.style.borderBottomRightRadius = '0';
                const validationContainer = append(container, $('.scm-editor-validation-container'));
                validationContainer.classList.toggle('validation-info', this.validation.type === 2 /* InputValidationType.Information */);
                validationContainer.classList.toggle('validation-warning', this.validation.type === 1 /* InputValidationType.Warning */);
                validationContainer.classList.toggle('validation-error', this.validation.type === 0 /* InputValidationType.Error */);
                validationContainer.style.width = `${this.element.clientWidth + 2}px`;
                const element = append(validationContainer, $('.scm-editor-validation'));
                const message = this.validation.message;
                if (typeof message === 'string') {
                    element.textContent = message;
                }
                else {
                    const tracker = trackFocus(element);
                    disposables.add(tracker);
                    disposables.add(tracker.onDidFocus(() => (this.validationHasFocus = true)));
                    disposables.add(tracker.onDidBlur(() => {
                        this.validationHasFocus = false;
                        this.element.style.borderBottomLeftRadius = '2px';
                        this.element.style.borderBottomRightRadius = '2px';
                        this.contextViewService.hideContextView();
                    }));
                    const renderer = this.instantiationService.createInstance(MarkdownRenderer, {});
                    const renderedMarkdown = renderer.render(message, {
                        actionHandler: {
                            callback: (link) => {
                                openLinkFromMarkdown(this.openerService, link, message.isTrusted);
                                this.element.style.borderBottomLeftRadius = '2px';
                                this.element.style.borderBottomRightRadius = '2px';
                                this.contextViewService.hideContextView();
                            },
                            disposables: disposables
                        },
                    });
                    disposables.add(renderedMarkdown);
                    element.appendChild(renderedMarkdown.element);
                }
                const actionsContainer = append(validationContainer, $('.scm-editor-validation-actions'));
                const actionbar = new ActionBar(actionsContainer);
                const action = new Action('scmInputWidget.validationMessage.close', localize('label.close', "Close"), ThemeIcon.asClassName(Codicon.close), true, () => {
                    this.contextViewService.hideContextView();
                    this.element.style.borderBottomLeftRadius = '2px';
                    this.element.style.borderBottomRightRadius = '2px';
                });
                disposables.add(actionbar);
                actionbar.push(action, { icon: true, label: false });
                return Disposable.None;
            },
            onHide: () => {
                this.validationHasFocus = false;
                this.element.style.borderBottomLeftRadius = '2px';
                this.element.style.borderBottomRightRadius = '2px';
                disposables.dispose();
            },
            anchorAlignment: 0 /* AnchorAlignment.LEFT */
        });
    }
    getToolbarWidth() {
        const showInputActionButton = this.configurationService.getValue('scm.showInputActionButton');
        if (!this.toolbar || !showInputActionButton || this.toolbar?.isEmpty() === true) {
            return 0;
        }
        return this.toolbar.dropdownActions.length === 0 ?
            26 /* 22px action + 4px margin */ :
            39 /* 35px action + 4px margin */;
    }
    clearValidation() {
        this.validationContextView?.close();
        this.validationContextView = undefined;
        this.validationHasFocus = false;
    }
    dispose() {
        this.input = undefined;
        this.repositoryDisposables.dispose();
        this.clearValidation();
        this.disposables.dispose();
    }
};
SCMInputWidget = SCMInputWidget_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, IModelService),
    __param(4, IKeybindingService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService),
    __param(7, ISCMViewService),
    __param(8, IContextViewService),
    __param(9, IOpenerService),
    __param(10, IAccessibilityService)
], SCMInputWidget);
let SCMViewPane = class SCMViewPane extends ViewPane {
    get viewMode() { return this._viewMode; }
    set viewMode(mode) {
        if (this._viewMode === mode) {
            return;
        }
        this._viewMode = mode;
        // Update sort key based on view mode
        this.viewSortKey = this.getViewSortKey();
        this.updateChildren();
        this.onDidActiveEditorChange();
        this._onDidChangeViewMode.fire(mode);
        this.viewModeContextKey.set(mode);
        this.updateIndentStyles(this.themeService.getFileIconTheme());
        this.storageService.store(`scm.viewMode`, mode, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    get viewSortKey() { return this._viewSortKey; }
    set viewSortKey(sortKey) {
        if (this._viewSortKey === sortKey) {
            return;
        }
        this._viewSortKey = sortKey;
        this.updateChildren();
        this.viewSortKeyContextKey.set(sortKey);
        this._onDidChangeViewSortKey.fire(sortKey);
        if (this._viewMode === "list" /* ViewMode.List */) {
            this.storageService.store(`scm.viewSortKey`, sortKey, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        }
    }
    constructor(options, commandService, editorService, menuService, scmService, scmViewService, storageService, uriIdentityService, keybindingService, themeService, contextMenuService, instantiationService, viewDescriptorService, configurationService, contextKeyService, openerService, hoverService) {
        super({ ...options, titleMenuId: MenuId.SCMTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.commandService = commandService;
        this.editorService = editorService;
        this.menuService = menuService;
        this.scmService = scmService;
        this.scmViewService = scmViewService;
        this.storageService = storageService;
        this.uriIdentityService = uriIdentityService;
        this._onDidChangeViewMode = new Emitter();
        this.onDidChangeViewMode = this._onDidChangeViewMode.event;
        this._onDidChangeViewSortKey = new Emitter();
        this.onDidChangeViewSortKey = this._onDidChangeViewSortKey.event;
        this.items = new DisposableMap();
        this.visibilityDisposables = new DisposableStore();
        this.treeOperationSequencer = new Sequencer();
        this.revealResourceThrottler = new Throttler();
        this.updateChildrenThrottler = new Throttler();
        this.disposables = new DisposableStore();
        // View mode and sort key
        this._viewMode = this.getViewMode();
        this._viewSortKey = this.getViewSortKey();
        // Context Keys
        this.viewModeContextKey = ContextKeys.SCMViewMode.bindTo(contextKeyService);
        this.viewModeContextKey.set(this._viewMode);
        this.viewSortKeyContextKey = ContextKeys.SCMViewSortKey.bindTo(contextKeyService);
        this.viewSortKeyContextKey.set(this.viewSortKey);
        this.areAllRepositoriesCollapsedContextKey = ContextKeys.SCMViewAreAllRepositoriesCollapsed.bindTo(contextKeyService);
        this.isAnyRepositoryCollapsibleContextKey = ContextKeys.SCMViewIsAnyRepositoryCollapsible.bindTo(contextKeyService);
        this.scmProviderContextKey = ContextKeys.SCMProvider.bindTo(contextKeyService);
        this.scmProviderRootUriContextKey = ContextKeys.SCMProviderRootUri.bindTo(contextKeyService);
        this.scmProviderHasRootUriContextKey = ContextKeys.SCMProviderHasRootUri.bindTo(contextKeyService);
        this._onDidLayout = new Emitter();
        this.layoutCache = { height: undefined, width: undefined, onDidChange: this._onDidLayout.event };
        this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, undefined, this.disposables)(e => {
            switch (e.key) {
                case 'scm.viewMode':
                    this.viewMode = this.getViewMode();
                    break;
                case 'scm.viewSortKey':
                    this.viewSortKey = this.getViewSortKey();
                    break;
            }
        }, this, this.disposables);
        this.storageService.onWillSaveState(e => {
            this.viewMode = this.getViewMode();
            this.viewSortKey = this.getViewSortKey();
            this.storeTreeViewState();
        }, this, this.disposables);
        Event.any(this.scmService.onDidAddRepository, this.scmService.onDidRemoveRepository)(() => this._onDidChangeViewWelcomeState.fire(), this, this.disposables);
        this.disposables.add(this.revealResourceThrottler);
        this.disposables.add(this.updateChildrenThrottler);
    }
    layoutBody(height = this.layoutCache.height, width = this.layoutCache.width) {
        if (height === undefined) {
            return;
        }
        if (width !== undefined) {
            super.layoutBody(height, width);
        }
        this.layoutCache.height = height;
        this.layoutCache.width = width;
        this._onDidLayout.fire();
        this.treeContainer.style.height = `${height}px`;
        this.tree.layout(height, width);
    }
    renderBody(container) {
        super.renderBody(container);
        // Tree
        this.treeContainer = append(container, $('.scm-view.show-file-icons'));
        this.treeContainer.classList.add('file-icon-themable-tree');
        this.treeContainer.classList.add('show-file-icons');
        const updateActionsVisibility = () => this.treeContainer.classList.toggle('show-actions', this.configurationService.getValue('scm.alwaysShowActions'));
        Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.alwaysShowActions'), this.disposables)(updateActionsVisibility, this, this.disposables);
        updateActionsVisibility();
        const updateProviderCountVisibility = () => {
            const value = this.configurationService.getValue('scm.providerCountBadge');
            this.treeContainer.classList.toggle('hide-provider-counts', value === 'hidden');
            this.treeContainer.classList.toggle('auto-provider-counts', value === 'auto');
        };
        Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.providerCountBadge'), this.disposables)(updateProviderCountVisibility, this, this.disposables);
        updateProviderCountVisibility();
        const viewState = this.loadTreeViewState();
        this.createTree(this.treeContainer, viewState);
        this.onDidChangeBodyVisibility(async (visible) => {
            if (visible) {
                this.treeOperationSequencer.queue(async () => {
                    await this.tree.setInput(this.scmViewService, viewState);
                    Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.alwaysShowRepositories'), this.visibilityDisposables)(() => {
                        this.updateActions();
                        this.updateChildren();
                    }, this, this.visibilityDisposables);
                    Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.inputMinLineCount') ||
                        e.affectsConfiguration('scm.inputMaxLineCount') ||
                        e.affectsConfiguration('scm.showActionButton'), this.visibilityDisposables)(() => this.updateChildren(), this, this.visibilityDisposables);
                    // Add visible repositories
                    this.editorService.onDidActiveEditorChange(this.onDidActiveEditorChange, this, this.visibilityDisposables);
                    this.scmViewService.onDidChangeVisibleRepositories(this.onDidChangeVisibleRepositories, this, this.visibilityDisposables);
                    this.onDidChangeVisibleRepositories({ added: this.scmViewService.visibleRepositories, removed: Iterable.empty() });
                    // Restore scroll position
                    if (typeof this.treeScrollTop === 'number') {
                        this.tree.scrollTop = this.treeScrollTop;
                        this.treeScrollTop = undefined;
                    }
                    this.updateRepositoryCollapseAllContextKeys();
                });
            }
            else {
                this.visibilityDisposables.clear();
                this.onDidChangeVisibleRepositories({ added: Iterable.empty(), removed: [...this.items.keys()] });
                this.treeScrollTop = this.tree.scrollTop;
                this.updateRepositoryCollapseAllContextKeys();
            }
        }, this, this.disposables);
        this.disposables.add(this.instantiationService.createInstance(RepositoryVisibilityActionController));
        this.themeService.onDidFileIconThemeChange(this.updateIndentStyles, this, this.disposables);
        this.updateIndentStyles(this.themeService.getFileIconTheme());
    }
    createTree(container, viewState) {
        const overflowWidgetsDomNode = $('.scm-overflow-widgets-container.monaco-editor');
        this.inputRenderer = this.instantiationService.createInstance(InputRenderer, this.layoutCache, overflowWidgetsDomNode, (input, height) => {
            try {
                // Attempt to update the input element height. There is an
                // edge case where the input has already been disposed and
                // updating the height would fail.
                this.tree.updateElementHeight(input, height);
            }
            catch { }
        });
        this.actionButtonRenderer = this.instantiationService.createInstance(ActionButtonRenderer);
        this.listLabels = this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility });
        this.disposables.add(this.listLabels);
        const resourceActionRunner = new RepositoryPaneActionRunner(() => this.getSelectedResources());
        resourceActionRunner.onWillRun(() => this.tree.domFocus(), this, this.disposables);
        this.disposables.add(resourceActionRunner);
        const treeDataSource = this.instantiationService.createInstance(SCMTreeDataSource, () => this.viewMode);
        this.disposables.add(treeDataSource);
        const compressionEnabled = observableConfigValue('scm.compactFolders', true, this.configurationService);
        this.tree = this.instantiationService.createInstance(WorkbenchCompressibleAsyncDataTree, 'SCM Tree Repo', container, new ListDelegate(this.inputRenderer), new SCMTreeCompressionDelegate(), [
            this.inputRenderer,
            this.actionButtonRenderer,
            this.instantiationService.createInstance(RepositoryRenderer, MenuId.SCMTitle, getActionViewItemProvider(this.instantiationService)),
            this.instantiationService.createInstance(ResourceGroupRenderer, getActionViewItemProvider(this.instantiationService), resourceActionRunner),
            this.instantiationService.createInstance(ResourceRenderer, () => this.viewMode, this.listLabels, getActionViewItemProvider(this.instantiationService), resourceActionRunner)
        ], treeDataSource, {
            horizontalScrolling: false,
            setRowLineHeight: false,
            transformOptimization: false,
            filter: new SCMTreeFilter(),
            dnd: new SCMTreeDragAndDrop(this.instantiationService),
            identityProvider: new SCMResourceIdentityProvider(),
            sorter: new SCMTreeSorter(() => this.viewMode, () => this.viewSortKey),
            keyboardNavigationLabelProvider: this.instantiationService.createInstance(SCMTreeKeyboardNavigationLabelProvider, () => this.viewMode),
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            compressionEnabled: compressionEnabled.get(),
            collapseByDefault: (e) => {
                // Repository, Resource Group, Resource Folder (Tree)
                if (isSCMRepository(e) || isSCMResourceGroup(e) || isSCMResourceNode(e)) {
                    return false;
                }
                // History Item Group, History Item, or History Item Change
                return (viewState?.expanded ?? []).indexOf(getSCMResourceId(e)) === -1;
            },
            accessibilityProvider: this.instantiationService.createInstance(SCMAccessibilityProvider)
        });
        this.disposables.add(this.tree);
        this.tree.onDidOpen(this.open, this, this.disposables);
        this.tree.onContextMenu(this.onListContextMenu, this, this.disposables);
        this.tree.onDidScroll(this.inputRenderer.clearValidation, this.inputRenderer, this.disposables);
        Event.filter(this.tree.onDidChangeCollapseState, e => isSCMRepository(e.node.element?.element), this.disposables)(this.updateRepositoryCollapseAllContextKeys, this, this.disposables);
        this.disposables.add(autorun(reader => {
            this.tree.updateOptions({
                compressionEnabled: compressionEnabled.read(reader)
            });
        }));
        append(container, overflowWidgetsDomNode);
    }
    async open(e) {
        if (!e.element) {
            return;
        }
        else if (isSCMRepository(e.element)) {
            this.scmViewService.focus(e.element);
            return;
        }
        else if (isSCMInput(e.element)) {
            this.scmViewService.focus(e.element.repository);
            const widget = this.inputRenderer.getRenderedInputWidget(e.element);
            if (widget) {
                widget.focus();
                this.tree.setFocus([], e.browserEvent);
                const selection = this.tree.getSelection();
                if (selection.length === 1 && selection[0] === e.element) {
                    setTimeout(() => this.tree.setSelection([]));
                }
            }
            return;
        }
        else if (isSCMActionButton(e.element)) {
            this.scmViewService.focus(e.element.repository);
            // Focus the action button
            this.actionButtonRenderer.focusActionButton(e.element);
            this.tree.setFocus([], e.browserEvent);
            return;
        }
        else if (isSCMResourceGroup(e.element)) {
            const provider = e.element.provider;
            const repository = Iterable.find(this.scmService.repositories, r => r.provider === provider);
            if (repository) {
                this.scmViewService.focus(repository);
            }
            return;
        }
        else if (isSCMResource(e.element)) {
            if (e.element.command?.id === API_OPEN_EDITOR_COMMAND_ID || e.element.command?.id === API_OPEN_DIFF_EDITOR_COMMAND_ID) {
                if (isPointerEvent(e.browserEvent) && e.browserEvent.button === 1) {
                    const resourceGroup = e.element.resourceGroup;
                    const title = `${resourceGroup.provider.label}: ${resourceGroup.label}`;
                    await OpenScmGroupAction.openMultiFileDiffEditor(this.editorService, title, resourceGroup.provider.rootUri, resourceGroup.id, {
                        ...e.editorOptions,
                        viewState: {
                            revealData: {
                                resource: {
                                    original: e.element.multiDiffEditorOriginalUri,
                                    modified: e.element.multiDiffEditorModifiedUri,
                                }
                            }
                        },
                        preserveFocus: true,
                    });
                }
                else {
                    await this.commandService.executeCommand(e.element.command.id, ...(e.element.command.arguments || []), e);
                }
            }
            else {
                await e.element.open(!!e.editorOptions.preserveFocus);
                if (e.editorOptions.pinned) {
                    const activeEditorPane = this.editorService.activeEditorPane;
                    activeEditorPane?.group.pinEditor(activeEditorPane.input);
                }
            }
            const provider = e.element.resourceGroup.provider;
            const repository = Iterable.find(this.scmService.repositories, r => r.provider === provider);
            if (repository) {
                this.scmViewService.focus(repository);
            }
        }
        else if (isSCMResourceNode(e.element)) {
            const provider = e.element.context.provider;
            const repository = Iterable.find(this.scmService.repositories, r => r.provider === provider);
            if (repository) {
                this.scmViewService.focus(repository);
            }
            return;
        }
    }
    onDidActiveEditorChange() {
        if (!this.configurationService.getValue('scm.autoReveal')) {
            return;
        }
        const uri = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (!uri) {
            return;
        }
        // Do not set focus/selection when the resource is already focused and selected
        if (this.tree.getFocus().some(e => isSCMResource(e) && this.uriIdentityService.extUri.isEqual(e.sourceUri, uri)) &&
            this.tree.getSelection().some(e => isSCMResource(e) && this.uriIdentityService.extUri.isEqual(e.sourceUri, uri))) {
            return;
        }
        this.revealResourceThrottler.queue(() => this.treeOperationSequencer.queue(async () => {
            for (const repository of this.scmViewService.visibleRepositories) {
                const item = this.items.get(repository);
                if (!item) {
                    continue;
                }
                // go backwards from last group
                for (let j = repository.provider.groups.length - 1; j >= 0; j--) {
                    const groupItem = repository.provider.groups[j];
                    const resource = this.viewMode === "tree" /* ViewMode.Tree */
                        ? groupItem.resourceTree.getNode(uri)?.element
                        : groupItem.resources.find(r => this.uriIdentityService.extUri.isEqual(r.sourceUri, uri));
                    if (resource) {
                        await this.tree.expandTo(resource);
                        this.tree.reveal(resource);
                        this.tree.setSelection([resource]);
                        this.tree.setFocus([resource]);
                        return;
                    }
                }
            }
        }));
    }
    onDidChangeVisibleRepositories({ added, removed }) {
        // Added repositories
        for (const repository of added) {
            const repositoryDisposables = new DisposableStore();
            repositoryDisposables.add(autorun(reader => {
                /** @description action button */
                repository.provider.actionButton.read(reader);
                this.updateChildren(repository);
            }));
            repositoryDisposables.add(repository.input.onDidChangeVisibility(() => this.updateChildren(repository)));
            repositoryDisposables.add(repository.provider.onDidChangeResourceGroups(() => this.updateChildren(repository)));
            const resourceGroupDisposables = repositoryDisposables.add(new DisposableMap());
            const onDidChangeResourceGroups = () => {
                for (const [resourceGroup] of resourceGroupDisposables) {
                    if (!repository.provider.groups.includes(resourceGroup)) {
                        resourceGroupDisposables.deleteAndDispose(resourceGroup);
                    }
                }
                for (const resourceGroup of repository.provider.groups) {
                    if (!resourceGroupDisposables.has(resourceGroup)) {
                        const disposableStore = new DisposableStore();
                        disposableStore.add(resourceGroup.onDidChange(() => this.updateChildren(repository)));
                        disposableStore.add(resourceGroup.onDidChangeResources(() => this.updateChildren(repository)));
                        resourceGroupDisposables.set(resourceGroup, disposableStore);
                    }
                }
            };
            repositoryDisposables.add(repository.provider.onDidChangeResourceGroups(onDidChangeResourceGroups));
            onDidChangeResourceGroups();
            this.items.set(repository, repositoryDisposables);
        }
        // Removed repositories
        for (const repository of removed) {
            this.items.deleteAndDispose(repository);
        }
        this.updateChildren();
        this.onDidActiveEditorChange();
    }
    onListContextMenu(e) {
        if (!e.element) {
            const menu = this.menuService.getMenuActions(Menus.ViewSort, this.contextKeyService);
            const actions = getFlatContextMenuActions(menu);
            return this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions,
                onHide: () => { }
            });
        }
        const element = e.element;
        let context = element;
        let actions = [];
        let actionRunner = new RepositoryPaneActionRunner(() => this.getSelectedResources());
        if (isSCMRepository(element)) {
            const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
            const menu = menus.repositoryContextMenu;
            context = element.provider;
            actionRunner = new RepositoryActionRunner(() => this.getSelectedRepositories());
            actions = collectContextMenuActions(menu);
        }
        else if (isSCMInput(element) || isSCMActionButton(element)) {
            // noop
        }
        else if (isSCMResourceGroup(element)) {
            const menus = this.scmViewService.menus.getRepositoryMenus(element.provider);
            const menu = menus.getResourceGroupMenu(element);
            actions = collectContextMenuActions(menu);
        }
        else if (isSCMResource(element)) {
            const menus = this.scmViewService.menus.getRepositoryMenus(element.resourceGroup.provider);
            const menu = menus.getResourceMenu(element);
            actions = collectContextMenuActions(menu);
        }
        else if (isSCMResourceNode(element)) {
            if (element.element) {
                const menus = this.scmViewService.menus.getRepositoryMenus(element.element.resourceGroup.provider);
                const menu = menus.getResourceMenu(element.element);
                actions = collectContextMenuActions(menu);
            }
            else {
                const menus = this.scmViewService.menus.getRepositoryMenus(element.context.provider);
                const menu = menus.getResourceFolderMenu(element.context);
                actions = collectContextMenuActions(menu);
            }
        }
        actionRunner.onWillRun(() => this.tree.domFocus());
        this.contextMenuService.showContextMenu({
            actionRunner,
            getAnchor: () => e.anchor,
            getActions: () => actions,
            getActionsContext: () => context,
            onHide: () => actionRunner.dispose()
        });
    }
    getSelectedRepositories() {
        const focusedRepositories = this.tree.getFocus().filter(r => !!r && isSCMRepository(r));
        const selectedRepositories = this.tree.getSelection().filter(r => !!r && isSCMRepository(r));
        return Array.from(new Set([...focusedRepositories, ...selectedRepositories]));
    }
    getSelectedResources() {
        return this.tree.getSelection().filter(r => isSCMResourceGroup(r) || isSCMResource(r) || isSCMResourceNode(r));
    }
    getViewMode() {
        let mode = this.configurationService.getValue('scm.defaultViewMode') === 'list' ? "list" /* ViewMode.List */ : "tree" /* ViewMode.Tree */;
        const storageMode = this.storageService.get(`scm.viewMode`, 1 /* StorageScope.WORKSPACE */);
        if (typeof storageMode === 'string') {
            mode = storageMode;
        }
        return mode;
    }
    getViewSortKey() {
        // Tree
        if (this._viewMode === "tree" /* ViewMode.Tree */) {
            return "path" /* ViewSortKey.Path */;
        }
        // List
        let viewSortKey;
        const viewSortKeyString = this.configurationService.getValue('scm.defaultViewSortKey');
        switch (viewSortKeyString) {
            case 'name':
                viewSortKey = "name" /* ViewSortKey.Name */;
                break;
            case 'status':
                viewSortKey = "status" /* ViewSortKey.Status */;
                break;
            default:
                viewSortKey = "path" /* ViewSortKey.Path */;
                break;
        }
        const storageSortKey = this.storageService.get(`scm.viewSortKey`, 1 /* StorageScope.WORKSPACE */);
        if (typeof storageSortKey === 'string') {
            viewSortKey = storageSortKey;
        }
        return viewSortKey;
    }
    loadTreeViewState() {
        const storageViewState = this.storageService.get('scm.viewState2', 1 /* StorageScope.WORKSPACE */);
        if (!storageViewState) {
            return undefined;
        }
        try {
            const treeViewState = JSON.parse(storageViewState);
            return treeViewState;
        }
        catch {
            return undefined;
        }
    }
    storeTreeViewState() {
        if (this.tree) {
            this.storageService.store('scm.viewState2', JSON.stringify(this.tree.getViewState()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    updateChildren(element) {
        this.updateChildrenThrottler.queue(() => this.treeOperationSequencer.queue(async () => {
            const focusedInput = this.inputRenderer.getFocusedInput();
            if (element && this.tree.hasNode(element)) {
                // Refresh specific repository
                await this.tree.updateChildren(element);
            }
            else {
                // Refresh the entire tree
                await this.tree.updateChildren(undefined);
            }
            if (focusedInput) {
                this.inputRenderer.getRenderedInputWidget(focusedInput)?.focus();
            }
            this.updateScmProviderContextKeys();
            this.updateRepositoryCollapseAllContextKeys();
        }));
    }
    updateIndentStyles(theme) {
        this.treeContainer.classList.toggle('list-view-mode', this.viewMode === "list" /* ViewMode.List */);
        this.treeContainer.classList.toggle('tree-view-mode', this.viewMode === "tree" /* ViewMode.Tree */);
        this.treeContainer.classList.toggle('align-icons-and-twisties', (this.viewMode === "list" /* ViewMode.List */ && theme.hasFileIcons) || (theme.hasFileIcons && !theme.hasFolderIcons));
        this.treeContainer.classList.toggle('hide-arrows', this.viewMode === "tree" /* ViewMode.Tree */ && theme.hidesExplorerArrows === true);
    }
    updateScmProviderContextKeys() {
        const alwaysShowRepositories = this.configurationService.getValue('scm.alwaysShowRepositories');
        if (!alwaysShowRepositories && this.items.size === 1) {
            const provider = Iterable.first(this.items.keys()).provider;
            this.scmProviderContextKey.set(provider.contextValue);
            this.scmProviderRootUriContextKey.set(provider.rootUri?.toString());
            this.scmProviderHasRootUriContextKey.set(!!provider.rootUri);
        }
        else {
            this.scmProviderContextKey.set(undefined);
            this.scmProviderRootUriContextKey.set(undefined);
            this.scmProviderHasRootUriContextKey.set(false);
        }
    }
    updateRepositoryCollapseAllContextKeys() {
        if (!this.isBodyVisible() || this.items.size === 1) {
            this.isAnyRepositoryCollapsibleContextKey.set(false);
            this.areAllRepositoriesCollapsedContextKey.set(false);
            return;
        }
        this.isAnyRepositoryCollapsibleContextKey.set(this.scmViewService.visibleRepositories.some(r => this.tree.hasNode(r) && this.tree.isCollapsible(r)));
        this.areAllRepositoriesCollapsedContextKey.set(this.scmViewService.visibleRepositories.every(r => this.tree.hasNode(r) && (!this.tree.isCollapsible(r) || this.tree.isCollapsed(r))));
    }
    collapseAllRepositories() {
        for (const repository of this.scmViewService.visibleRepositories) {
            if (this.tree.isCollapsible(repository)) {
                this.tree.collapse(repository);
            }
        }
    }
    expandAllRepositories() {
        for (const repository of this.scmViewService.visibleRepositories) {
            if (this.tree.isCollapsible(repository)) {
                this.tree.expand(repository);
            }
        }
    }
    focusPreviousInput() {
        this.treeOperationSequencer.queue(() => this.focusInput(-1));
    }
    focusNextInput() {
        this.treeOperationSequencer.queue(() => this.focusInput(1));
    }
    async focusInput(delta) {
        if (!this.scmViewService.focusedRepository ||
            this.scmViewService.visibleRepositories.length === 0) {
            return;
        }
        let input = this.scmViewService.focusedRepository.input;
        const repositories = this.scmViewService.visibleRepositories;
        // One visible repository and the input is already focused
        if (repositories.length === 1 && this.inputRenderer.getRenderedInputWidget(input)?.hasFocus() === true) {
            return;
        }
        // Multiple visible repositories and the input already focused
        if (repositories.length > 1 && this.inputRenderer.getRenderedInputWidget(input)?.hasFocus() === true) {
            const focusedRepositoryIndex = repositories.indexOf(this.scmViewService.focusedRepository);
            const newFocusedRepositoryIndex = rot(focusedRepositoryIndex + delta, repositories.length);
            input = repositories[newFocusedRepositoryIndex].input;
        }
        await this.tree.expandTo(input);
        this.tree.reveal(input);
        this.inputRenderer.getRenderedInputWidget(input)?.focus();
    }
    focusPreviousResourceGroup() {
        this.treeOperationSequencer.queue(() => this.focusResourceGroup(-1));
    }
    focusNextResourceGroup() {
        this.treeOperationSequencer.queue(() => this.focusResourceGroup(1));
    }
    async focusResourceGroup(delta) {
        if (!this.scmViewService.focusedRepository ||
            this.scmViewService.visibleRepositories.length === 0) {
            return;
        }
        const treeHasDomFocus = isActiveElement(this.tree.getHTMLElement());
        const resourceGroups = this.scmViewService.focusedRepository.provider.groups;
        const focusedResourceGroup = this.tree.getFocus().find(e => isSCMResourceGroup(e));
        const focusedResourceGroupIndex = treeHasDomFocus && focusedResourceGroup ? resourceGroups.indexOf(focusedResourceGroup) : -1;
        let resourceGroupNext;
        if (focusedResourceGroupIndex === -1) {
            // First visible resource group
            for (const resourceGroup of resourceGroups) {
                if (this.tree.hasNode(resourceGroup)) {
                    resourceGroupNext = resourceGroup;
                    break;
                }
            }
        }
        else {
            // Next/Previous visible resource group
            let index = rot(focusedResourceGroupIndex + delta, resourceGroups.length);
            while (index !== focusedResourceGroupIndex) {
                if (this.tree.hasNode(resourceGroups[index])) {
                    resourceGroupNext = resourceGroups[index];
                    break;
                }
                index = rot(index + delta, resourceGroups.length);
            }
        }
        if (resourceGroupNext) {
            await this.tree.expandTo(resourceGroupNext);
            this.tree.reveal(resourceGroupNext);
            this.tree.setSelection([resourceGroupNext]);
            this.tree.setFocus([resourceGroupNext]);
            this.tree.domFocus();
        }
    }
    shouldShowWelcome() {
        return this.scmService.repositoryCount === 0;
    }
    getActionsContext() {
        return this.scmViewService.visibleRepositories.length === 1 ? this.scmViewService.visibleRepositories[0].provider : undefined;
    }
    focus() {
        super.focus();
        this.treeOperationSequencer.queue(() => {
            return new Promise(resolve => {
                if (this.isExpanded()) {
                    if (this.tree.getFocus().length === 0) {
                        for (const repository of this.scmViewService.visibleRepositories) {
                            const widget = this.inputRenderer.getRenderedInputWidget(repository.input);
                            if (widget) {
                                widget.focus();
                                resolve();
                                return;
                            }
                        }
                    }
                    this.tree.domFocus();
                    resolve();
                }
            });
        });
    }
    dispose() {
        this.visibilityDisposables.dispose();
        this.disposables.dispose();
        this.items.dispose();
        super.dispose();
    }
};
SCMViewPane = __decorate([
    __param(1, ICommandService),
    __param(2, IEditorService),
    __param(3, IMenuService),
    __param(4, ISCMService),
    __param(5, ISCMViewService),
    __param(6, IStorageService),
    __param(7, IUriIdentityService),
    __param(8, IKeybindingService),
    __param(9, IThemeService),
    __param(10, IContextMenuService),
    __param(11, IInstantiationService),
    __param(12, IViewDescriptorService),
    __param(13, IConfigurationService),
    __param(14, IContextKeyService),
    __param(15, IOpenerService),
    __param(16, IHoverService)
], SCMViewPane);
export { SCMViewPane };
let SCMTreeDataSource = class SCMTreeDataSource extends Disposable {
    constructor(viewMode, configurationService, scmViewService) {
        super();
        this.viewMode = viewMode;
        this.configurationService = configurationService;
        this.scmViewService = scmViewService;
    }
    async getChildren(inputOrElement) {
        const repositoryCount = this.scmViewService.visibleRepositories.length;
        const showActionButton = this.configurationService.getValue('scm.showActionButton') === true;
        const alwaysShowRepositories = this.configurationService.getValue('scm.alwaysShowRepositories') === true;
        if (isSCMViewService(inputOrElement) && (repositoryCount > 1 || alwaysShowRepositories)) {
            return this.scmViewService.visibleRepositories;
        }
        else if ((isSCMViewService(inputOrElement) && repositoryCount === 1 && !alwaysShowRepositories) || isSCMRepository(inputOrElement)) {
            const children = [];
            inputOrElement = isSCMRepository(inputOrElement) ? inputOrElement : this.scmViewService.visibleRepositories[0];
            const actionButton = inputOrElement.provider.actionButton.get();
            const resourceGroups = inputOrElement.provider.groups;
            // SCM Input
            if (inputOrElement.input.visible) {
                children.push(inputOrElement.input);
            }
            // Action Button
            if (showActionButton && actionButton) {
                children.push({
                    type: 'actionButton',
                    repository: inputOrElement,
                    button: actionButton
                });
            }
            // ResourceGroups
            const hasSomeChanges = resourceGroups.some(group => group.resources.length > 0);
            if (hasSomeChanges || (repositoryCount === 1 && (!showActionButton || !actionButton))) {
                children.push(...resourceGroups);
            }
            return children;
        }
        else if (isSCMResourceGroup(inputOrElement)) {
            if (this.viewMode() === "list" /* ViewMode.List */) {
                // Resources (List)
                return inputOrElement.resources;
            }
            else if (this.viewMode() === "tree" /* ViewMode.Tree */) {
                // Resources (Tree)
                const children = [];
                for (const node of inputOrElement.resourceTree.root.children) {
                    children.push(node.element && node.childrenCount === 0 ? node.element : node);
                }
                return children;
            }
        }
        else if (isSCMResourceNode(inputOrElement)) {
            // Resources (Tree), History item changes (Tree)
            const children = [];
            for (const node of inputOrElement.children) {
                children.push(node.element && node.childrenCount === 0 ? node.element : node);
            }
            return children;
        }
        return [];
    }
    getParent(element) {
        if (isSCMResourceNode(element)) {
            if (element.parent === element.context.resourceTree.root) {
                return element.context;
            }
            else if (element.parent) {
                return element.parent;
            }
            else {
                throw new Error('Invalid element passed to getParent');
            }
        }
        else if (isSCMResource(element)) {
            if (this.viewMode() === "list" /* ViewMode.List */) {
                return element.resourceGroup;
            }
            const node = element.resourceGroup.resourceTree.getNode(element.sourceUri);
            const result = node?.parent;
            if (!result) {
                throw new Error('Invalid element passed to getParent');
            }
            if (result === element.resourceGroup.resourceTree.root) {
                return element.resourceGroup;
            }
            return result;
        }
        else if (isSCMInput(element)) {
            return element.repository;
        }
        else if (isSCMResourceGroup(element)) {
            const repository = this.scmViewService.visibleRepositories.find(r => r.provider === element.provider);
            if (!repository) {
                throw new Error('Invalid element passed to getParent');
            }
            return repository;
        }
        else {
            throw new Error('Unexpected call to getParent');
        }
    }
    hasChildren(inputOrElement) {
        if (isSCMViewService(inputOrElement)) {
            return this.scmViewService.visibleRepositories.length !== 0;
        }
        else if (isSCMRepository(inputOrElement)) {
            return true;
        }
        else if (isSCMInput(inputOrElement)) {
            return false;
        }
        else if (isSCMActionButton(inputOrElement)) {
            return false;
        }
        else if (isSCMResourceGroup(inputOrElement)) {
            return true;
        }
        else if (isSCMResource(inputOrElement)) {
            return false;
        }
        else if (ResourceTree.isResourceNode(inputOrElement)) {
            return inputOrElement.childrenCount > 0;
        }
        else {
            throw new Error('hasChildren not implemented.');
        }
    }
};
SCMTreeDataSource = __decorate([
    __param(1, IConfigurationService),
    __param(2, ISCMViewService)
], SCMTreeDataSource);
export class SCMActionButton {
    constructor(container, contextMenuService, commandService, notificationService) {
        this.container = container;
        this.contextMenuService = contextMenuService;
        this.commandService = commandService;
        this.notificationService = notificationService;
        this.disposables = new MutableDisposable();
    }
    dispose() {
        this.disposables?.dispose();
    }
    setButton(button) {
        // Clear old button
        this.clear();
        if (!button) {
            return;
        }
        if (button.secondaryCommands?.length) {
            const actions = [];
            for (let index = 0; index < button.secondaryCommands.length; index++) {
                const commands = button.secondaryCommands[index];
                for (const command of commands) {
                    actions.push(toAction({
                        id: command.id,
                        label: command.title,
                        enabled: true,
                        run: async () => {
                            await this.executeCommand(command.id, ...(command.arguments || []));
                        }
                    }));
                }
                if (commands.length) {
                    actions.push(new Separator());
                }
            }
            // Remove last separator
            actions.pop();
            // ButtonWithDropdown
            this.button = new ButtonWithDropdown(this.container, {
                actions: actions,
                addPrimaryActionToDropdown: false,
                contextMenuProvider: this.contextMenuService,
                title: button.command.tooltip,
                supportIcons: true,
                ...defaultButtonStyles
            });
        }
        else {
            // Button
            this.button = new Button(this.container, { supportIcons: true, supportShortLabel: !!button.command.shortTitle, title: button.command.tooltip, ...defaultButtonStyles });
        }
        this.button.enabled = button.enabled;
        this.button.label = button.command.title;
        if (this.button instanceof Button && button.command.shortTitle) {
            this.button.labelShort = button.command.shortTitle;
        }
        this.button.onDidClick(async () => await this.executeCommand(button.command.id, ...(button.command.arguments || [])), null, this.disposables.value);
        this.disposables.value.add(this.button);
    }
    focus() {
        this.button?.focus();
    }
    clear() {
        this.disposables.value = new DisposableStore();
        this.button = undefined;
        clearNode(this.container);
    }
    async executeCommand(commandId, ...args) {
        try {
            await this.commandService.executeCommand(commandId, ...args);
        }
        catch (ex) {
            this.notificationService.error(ex);
        }
    }
}
setupSimpleEditorSelectionStyling('.scm-view .scm-editor-container');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtVmlld1BhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtVmlld1BhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBZSxVQUFVLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0ssT0FBTyxFQUFFLFFBQVEsRUFBb0IsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRSxPQUFPLEVBQXFHLGVBQWUsRUFBd0MsV0FBVyxFQUFFLG9CQUFvQixFQUFFLFlBQVksRUFBc0csTUFBTSxrQkFBa0IsQ0FBQztBQUNqVixPQUFPLEVBQUUsY0FBYyxFQUFxQyxNQUFNLDRCQUE0QixDQUFDO0FBQy9GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixN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