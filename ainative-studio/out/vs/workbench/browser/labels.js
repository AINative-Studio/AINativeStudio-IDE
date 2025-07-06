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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvbGFiZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDeEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFNBQVMsRUFBcUQsTUFBTSw4Q0FBOEMsQ0FBQztBQUM1SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFlLG1CQUFtQixFQUFrQyxNQUFNLCtDQUErQyxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFM0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFD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