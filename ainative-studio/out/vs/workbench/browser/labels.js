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
import { localize } from '../../nls.js';
import { URI } from '../../base/common/uri.js';
import { dirname, isEqual, basenameOrAuthority } from '../../base/common/resources.js';
import { IconLabel } from '../../base/browser/ui/iconLabel/iconLabel.js';
import { ILanguageService } from '../../editor/common/languages/language.js';
import { IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IModelService } from '../../editor/common/services/model.js';
import { ITextFileService } from '../services/textfile/common/textfiles.js';
import { IDecorationsService } from '../services/decorations/common/decorations.js';
import { Schemas } from '../../base/common/network.js';
import { FileKind, FILES_ASSOCIATIONS_CONFIG } from '../../platform/files/common/files.js';
import { IThemeService } from '../../platform/theme/common/themeService.js';
import { Event, Emitter } from '../../base/common/event.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { getIconClasses } from '../../editor/common/services/getIconClasses.js';
import { Disposable, dispose, MutableDisposable } from '../../base/common/lifecycle.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { normalizeDriveLetter } from '../../base/common/labels.js';
import { INotebookDocumentService, extractCellOutputDetails } from '../services/notebook/common/notebookDocumentService.js';
function toResource(props) {
    if (!props || !props.resource) {
        return undefined;
    }
    if (URI.isUri(props.resource)) {
        return props.resource;
    }
    return props.resource.primary;
}
export const DEFAULT_LABELS_CONTAINER = {
    onDidChangeVisibility: Event.None
};
let ResourceLabels = class ResourceLabels extends Disposable {
    constructor(container, instantiationService, configurationService, modelService, workspaceService, languageService, decorationsService, themeService, labelService, textFileService) {
        super();
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.modelService = modelService;
        this.workspaceService = workspaceService;
        this.languageService = languageService;
        this.decorationsService = decorationsService;
        this.themeService = themeService;
        this.labelService = labelService;
        this.textFileService = textFileService;
        this._onDidChangeDecorations = this._register(new Emitter());
        this.onDidChangeDecorations = this._onDidChangeDecorations.event;
        this.widgets = [];
        this.labels = [];
        this.registerListeners(container);
    }
    registerListeners(container) {
        // notify when visibility changes
        this._register(container.onDidChangeVisibility(visible => {
            this.widgets.forEach(widget => widget.notifyVisibilityChanged(visible));
        }));
        // notify when extensions are registered with potentially new languages
        this._register(this.languageService.onDidChange(() => this.widgets.forEach(widget => widget.notifyExtensionsRegistered())));
        // notify when model language changes
        this._register(this.modelService.onModelLanguageChanged(e => {
            if (!e.model.uri) {
                return; // we need the resource to compare
            }
            this.widgets.forEach(widget => widget.notifyModelLanguageChanged(e.model));
        }));
        // notify when model is added
        this._register(this.modelService.onModelAdded(model => {
            if (!model.uri) {
                return; // we need the resource to compare
            }
            this.widgets.forEach(widget => widget.notifyModelAdded(model));
        }));
        // notify when workspace folders changes
        this._register(this.workspaceService.onDidChangeWorkspaceFolders(() => {
            this.widgets.forEach(widget => widget.notifyWorkspaceFoldersChange());
        }));
        // notify when file decoration changes
        this._register(this.decorationsService.onDidChangeDecorations(e => {
            let notifyDidChangeDecorations = false;
            this.widgets.forEach(widget => {
                if (widget.notifyFileDecorationsChanges(e)) {
                    notifyDidChangeDecorations = true;
                }
            });
            if (notifyDidChangeDecorations) {
                this._onDidChangeDecorations.fire();
            }
        }));
        // notify when theme changes
        this._register(this.themeService.onDidColorThemeChange(() => this.widgets.forEach(widget => widget.notifyThemeChange())));
        // notify when files.associations changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(FILES_ASSOCIATIONS_CONFIG)) {
                this.widgets.forEach(widget => widget.notifyFileAssociationsChange());
            }
        }));
        // notify when label formatters change
        this._register(this.labelService.onDidChangeFormatters(e => {
            this.widgets.forEach(widget => widget.notifyFormattersChange(e.scheme));
        }));
        // notify when untitled labels change
        this._register(this.textFileService.untitled.onDidChangeLabel(model => {
            this.widgets.forEach(widget => widget.notifyUntitledLabelChange(model.resource));
        }));
    }
    get(index) {
        return this.labels[index];
    }
    create(container, options) {
        const widget = this.instantiationService.createInstance(ResourceLabelWidget, container, options);
        // Only expose a handle to the outside
        const label = {
            element: widget.element,
            onDidRender: widget.onDidRender,
            setLabel: (label, description, options) => widget.setLabel(label, description, options),
            setResource: (label, options) => widget.setResource(label, options),
            setFile: (resource, options) => widget.setFile(resource, options),
            clear: () => widget.clear(),
            dispose: () => this.disposeWidget(widget)
        };
        // Store
        this.labels.push(label);
        this.widgets.push(widget);
        return label;
    }
    disposeWidget(widget) {
        const index = this.widgets.indexOf(widget);
        if (index > -1) {
            this.widgets.splice(index, 1);
            this.labels.splice(index, 1);
        }
        dispose(widget);
    }
    clear() {
        this.widgets = dispose(this.widgets);
        this.labels = [];
    }
    dispose() {
        super.dispose();
        this.clear();
    }
};
ResourceLabels = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, IModelService),
    __param(4, IWorkspaceContextService),
    __param(5, ILanguageService),
    __param(6, IDecorationsService),
    __param(7, IThemeService),
    __param(8, ILabelService),
    __param(9, ITextFileService)
], ResourceLabels);
export { ResourceLabels };
/**
 * Note: please consider to use `ResourceLabels` if you are in need
 * of more than one label for your widget.
 */
let ResourceLabel = class ResourceLabel extends ResourceLabels {
    get element() { return this.label; }
    constructor(container, options, instantiationService, configurationService, modelService, workspaceService, languageService, decorationsService, themeService, labelService, textFileService) {
        super(DEFAULT_LABELS_CONTAINER, instantiationService, configurationService, modelService, workspaceService, languageService, decorationsService, themeService, labelService, textFileService);
        this.label = this._register(this.create(container, options));
    }
};
ResourceLabel = __decorate([
    __param(2, IInstantiationService),
    __param(3, IConfigurationService),
    __param(4, IModelService),
    __param(5, IWorkspaceContextService),
    __param(6, ILanguageService),
    __param(7, IDecorationsService),
    __param(8, IThemeService),
    __param(9, ILabelService),
    __param(10, ITextFileService)
], ResourceLabel);
export { ResourceLabel };
var Redraw;
(function (Redraw) {
    Redraw[Redraw["Basic"] = 1] = "Basic";
    Redraw[Redraw["Full"] = 2] = "Full";
})(Redraw || (Redraw = {}));
let ResourceLabelWidget = class ResourceLabelWidget extends IconLabel {
    constructor(container, options, languageService, modelService, decorationsService, labelService, textFileService, contextService, notebookDocumentService) {
        super(container, options);
        this.languageService = languageService;
        this.modelService = modelService;
        this.decorationsService = decorationsService;
        this.labelService = labelService;
        this.textFileService = textFileService;
        this.contextService = contextService;
        this.notebookDocumentService = notebookDocumentService;
        this._onDidRender = this._register(new Emitter());
        this.onDidRender = this._onDidRender.event;
        this.label = undefined;
        this.decoration = this._register(new MutableDisposable());
        this.options = undefined;
        this.computedIconClasses = undefined;
        this.computedLanguageId = undefined;
        this.computedPathLabel = undefined;
        this.computedWorkspaceFolderLabel = undefined;
        this.needsRedraw = undefined;
        this.isHidden = false;
    }
    notifyVisibilityChanged(visible) {
        if (visible === this.isHidden) {
            this.isHidden = !visible;
            if (visible && this.needsRedraw) {
                this.render({
                    updateIcon: this.needsRedraw === Redraw.Full,
                    updateDecoration: this.needsRedraw === Redraw.Full
                });
                this.needsRedraw = undefined;
            }
        }
    }
    notifyModelLanguageChanged(model) {
        this.handleModelEvent(model);
    }
    notifyModelAdded(model) {
        this.handleModelEvent(model);
    }
    handleModelEvent(model) {
        const resource = toResource(this.label);
        if (!resource) {
            return; // only update if resource exists
        }
        if (isEqual(model.uri, resource)) {
            if (this.computedLanguageId !== model.getLanguageId()) {
                this.computedLanguageId = model.getLanguageId();
                this.render({ updateIcon: true, updateDecoration: false }); // update if the language id of the model has changed from our last known state
            }
        }
    }
    notifyFileDecorationsChanges(e) {
        if (!this.options) {
            return false;
        }
        const resource = toResource(this.label);
        if (!resource) {
            return false;
        }
        if (this.options.fileDecorations && e.affectsResource(resource)) {
            return this.render({ updateIcon: false, updateDecoration: true });
        }
        return false;
    }
    notifyExtensionsRegistered() {
        this.render({ updateIcon: true, updateDecoration: false });
    }
    notifyThemeChange() {
        this.render({ updateIcon: false, updateDecoration: false });
    }
    notifyFileAssociationsChange() {
        this.render({ updateIcon: true, updateDecoration: false });
    }
    notifyFormattersChange(scheme) {
        if (toResource(this.label)?.scheme === scheme) {
            this.render({ updateIcon: false, updateDecoration: false });
        }
    }
    notifyUntitledLabelChange(resource) {
        if (isEqual(resource, toResource(this.label))) {
            this.render({ updateIcon: false, updateDecoration: false });
        }
    }
    notifyWorkspaceFoldersChange() {
        if (typeof this.computedWorkspaceFolderLabel === 'string') {
            const resource = toResource(this.label);
            if (URI.isUri(resource) && this.label?.name === this.computedWorkspaceFolderLabel) {
                this.setFile(resource, this.options);
            }
        }
    }
    setFile(resource, options) {
        const hideLabel = options?.hideLabel;
        let name;
        if (!hideLabel) {
            if (options?.fileKind === FileKind.ROOT_FOLDER) {
                const workspaceFolder = this.contextService.getWorkspaceFolder(resource);
                if (workspaceFolder) {
                    name = workspaceFolder.name;
                    this.computedWorkspaceFolderLabel = name;
                }
            }
            if (!name) {
                name = normalizeDriveLetter(basenameOrAuthority(resource));
            }
        }
        let description;
        if (!options?.hidePath) {
            const descriptionCandidate = this.labelService.getUriLabel(dirname(resource), { relative: true });
            if (descriptionCandidate && descriptionCandidate !== '.') {
                // omit description if its not significant: a relative path
                // of '.' just indicates that there is no parent to the path
                // https://github.com/microsoft/vscode/issues/208692
                description = descriptionCandidate;
            }
        }
        this.setResource({ resource, name, description, range: options?.range }, options);
    }
    setResource(label, options = Object.create(null)) {
        const resource = toResource(label);
        const isSideBySideEditor = label?.resource && !URI.isUri(label.resource);
        if (!options.forceLabel && !isSideBySideEditor && resource?.scheme === Schemas.untitled) {
            // Untitled labels are very dynamic because they may change
            // whenever the content changes (unless a path is associated).
            // As such we always ask the actual editor for it's name and
            // description to get latest in case name/description are
            // provided. If they are not provided from the label we got
            // we assume that the client does not want to display them
            // and as such do not override.
            //
            // We do not touch the label if it represents a primary-secondary
            // because in that case we expect it to carry a proper label
            // and description.
            const untitledModel = this.textFileService.untitled.get(resource);
            if (untitledModel && !untitledModel.hasAssociatedFilePath) {
                if (typeof label.name === 'string') {
                    label.name = untitledModel.name;
                }
                if (typeof label.description === 'string') {
                    const untitledDescription = untitledModel.resource.path;
                    if (label.name !== untitledDescription) {
                        label.description = untitledDescription;
                    }
                    else {
                        label.description = undefined;
                    }
                }
                const untitledTitle = untitledModel.resource.path;
                if (untitledModel.name !== untitledTitle) {
                    options.title = `${untitledModel.name} • ${untitledTitle}`;
                }
                else {
                    options.title = untitledTitle;
                }
            }
        }
        if (!options.forceLabel && !isSideBySideEditor && resource?.scheme === Schemas.vscodeNotebookCell) {
            // Notebook cells are embeded in a notebook document
            // As such we always ask the actual notebook document
            // for its position in the document.
            const notebookDocument = this.notebookDocumentService.getNotebook(resource);
            const cellIndex = notebookDocument?.getCellIndex(resource);
            if (notebookDocument && cellIndex !== undefined && typeof label.name === 'string') {
                options.title = localize('notebookCellLabel', "{0} • Cell {1}", label.name, `${cellIndex + 1}`);
            }
            if (typeof label.name === 'string' && notebookDocument && cellIndex !== undefined && typeof label.name === 'string') {
                label.name = localize('notebookCellLabel', "{0} • Cell {1}", label.name, `${cellIndex + 1}`);
            }
        }
        if (!options.forceLabel && !isSideBySideEditor && resource?.scheme === Schemas.vscodeNotebookCellOutput) {
            const notebookDocument = this.notebookDocumentService.getNotebook(resource);
            const outputUriData = extractCellOutputDetails(resource);
            if (outputUriData?.cellFragment) {
                if (!outputUriData.notebook) {
                    return;
                }
                const cellUri = outputUriData.notebook.with({
                    scheme: Schemas.vscodeNotebookCell,
                    fragment: outputUriData.cellFragment
                });
                const cellIndex = notebookDocument?.getCellIndex(cellUri);
                const outputIndex = outputUriData.outputIndex;
                if (cellIndex !== undefined && outputIndex !== undefined && typeof label.name === 'string') {
                    label.name = localize('notebookCellOutputLabel', "{0} • Cell {1} • Output {2}", label.name, `${cellIndex + 1}`, `${outputIndex + 1}`);
                }
                else if (cellIndex !== undefined && typeof label.name === 'string') {
                    label.name = localize('notebookCellOutputLabelSimple', "{0} • Cell {1} • Output", label.name, `${cellIndex + 1}`);
                }
            }
        }
        const hasResourceChanged = this.hasResourceChanged(label);
        const hasPathLabelChanged = hasResourceChanged || this.hasPathLabelChanged(label);
        const hasFileKindChanged = this.hasFileKindChanged(options);
        const hasIconChanged = this.hasIconChanged(options);
        this.label = label;
        this.options = options;
        if (hasResourceChanged) {
            this.computedLanguageId = undefined; // reset computed language since resource changed
        }
        if (hasPathLabelChanged) {
            this.computedPathLabel = undefined; // reset path label due to resource/path-label change
        }
        this.render({
            updateIcon: hasResourceChanged || hasFileKindChanged || hasIconChanged,
            updateDecoration: hasResourceChanged || hasFileKindChanged
        });
    }
    hasFileKindChanged(newOptions) {
        const newFileKind = newOptions?.fileKind;
        const oldFileKind = this.options?.fileKind;
        return newFileKind !== oldFileKind; // same resource but different kind (file, folder)
    }
    hasResourceChanged(newLabel) {
        const newResource = toResource(newLabel);
        const oldResource = toResource(this.label);
        if (newResource && oldResource) {
            return newResource.toString() !== oldResource.toString();
        }
        if (!newResource && !oldResource) {
            return false;
        }
        return true;
    }
    hasPathLabelChanged(newLabel) {
        const newResource = toResource(newLabel);
        return !!newResource && this.computedPathLabel !== this.labelService.getUriLabel(newResource);
    }
    hasIconChanged(newOptions) {
        return this.options?.icon !== newOptions?.icon;
    }
    clear() {
        this.label = undefined;
        this.options = undefined;
        this.computedLanguageId = undefined;
        this.computedIconClasses = undefined;
        this.computedPathLabel = undefined;
        this.setLabel('');
    }
    render(options) {
        if (this.isHidden) {
            if (this.needsRedraw !== Redraw.Full) {
                this.needsRedraw = (options.updateIcon || options.updateDecoration) ? Redraw.Full : Redraw.Basic;
            }
            return false;
        }
        if (options.updateIcon) {
            this.computedIconClasses = undefined;
        }
        if (!this.label) {
            return false;
        }
        const iconLabelOptions = {
            title: '',
            italic: this.options?.italic,
            strikethrough: this.options?.strikethrough,
            matches: this.options?.matches,
            descriptionMatches: this.options?.descriptionMatches,
            extraClasses: [],
            separator: this.options?.separator,
            domId: this.options?.domId,
            disabledCommand: this.options?.disabledCommand,
            labelEscapeNewLines: this.options?.labelEscapeNewLines,
            descriptionTitle: this.options?.descriptionTitle,
        };
        const resource = toResource(this.label);
        if (this.options?.title !== undefined) {
            iconLabelOptions.title = this.options.title;
        }
        if (resource && resource.scheme !== Schemas.data /* do not accidentally inline Data URIs */
            && ((!this.options?.title)
                || ((typeof this.options.title !== 'string') && !this.options.title.markdownNotSupportedFallback))) {
            if (!this.computedPathLabel) {
                this.computedPathLabel = this.labelService.getUriLabel(resource);
            }
            if (!iconLabelOptions.title || (typeof iconLabelOptions.title === 'string')) {
                iconLabelOptions.title = this.computedPathLabel;
            }
            else if (!iconLabelOptions.title.markdownNotSupportedFallback) {
                iconLabelOptions.title.markdownNotSupportedFallback = this.computedPathLabel;
            }
        }
        if (this.options && !this.options.hideIcon) {
            if (!this.computedIconClasses) {
                this.computedIconClasses = getIconClasses(this.modelService, this.languageService, resource, this.options.fileKind, this.options.icon);
            }
            if (URI.isUri(this.options.icon)) {
                iconLabelOptions.iconPath = this.options.icon;
            }
            iconLabelOptions.extraClasses = this.computedIconClasses.slice(0);
        }
        if (this.options?.extraClasses) {
            iconLabelOptions.extraClasses.push(...this.options.extraClasses);
        }
        if (this.options?.fileDecorations && resource) {
            if (options.updateDecoration) {
                this.decoration.value = this.decorationsService.getDecoration(resource, this.options.fileKind !== FileKind.FILE);
            }
            const decoration = this.decoration.value;
            if (decoration) {
                if (decoration.tooltip) {
                    if (typeof iconLabelOptions.title === 'string') {
                        iconLabelOptions.title = `${iconLabelOptions.title} • ${decoration.tooltip}`;
                    }
                    else if (typeof iconLabelOptions.title?.markdown === 'string') {
                        const title = `${iconLabelOptions.title.markdown} • ${decoration.tooltip}`;
                        iconLabelOptions.title = { markdown: title, markdownNotSupportedFallback: title };
                    }
                }
                if (decoration.strikethrough) {
                    iconLabelOptions.strikethrough = true;
                }
                if (this.options.fileDecorations.colors) {
                    iconLabelOptions.extraClasses.push(decoration.labelClassName);
                }
                if (this.options.fileDecorations.badges) {
                    iconLabelOptions.extraClasses.push(decoration.badgeClassName);
                    iconLabelOptions.extraClasses.push(decoration.iconClassName);
                }
            }
        }
        if (this.label.range) {
            iconLabelOptions.suffix = this.label.range.startLineNumber !== this.label.range.endLineNumber ?
                `:${this.label.range.startLineNumber}-${this.label.range.endLineNumber}` :
                `:${this.label.range.startLineNumber}`;
        }
        this.setLabel(this.label.name ?? '', this.label.description, iconLabelOptions);
        this._onDidRender.fire();
        return true;
    }
    dispose() {
        super.dispose();
        this.label = undefined;
        this.options = undefined;
        this.computedLanguageId = undefined;
        this.computedIconClasses = undefined;
        this.computedPathLabel = undefined;
        this.computedWorkspaceFolderLabel = undefined;
    }
};
ResourceLabelWidget = __decorate([
    __param(2, ILanguageService),
    __param(3, IModelService),
    __param(4, IDecorationsService),
    __param(5, ILabelService),
    __param(6, ITextFileService),
    __param(7, IWorkspaceContextService),
    __param(8, INotebookDocumentService)
], ResourceLabelWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2xhYmVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3hDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxTQUFTLEVBQXFELE1BQU0sOENBQThDLENBQUM7QUFDNUgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVFLE9BQU8sRUFBZSxtQkFBbUIsRUFBa0MsTUFBTSwrQ0FBK0MsQ0FBQztBQUNqSSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FB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