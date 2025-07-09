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
var CategoryElementRenderer_1, FileElementRenderer_1, TextEditElementRenderer_1;
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { HighlightedLabel } from '../../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { Range } from '../../../../../editor/common/core/range.js';
import * as dom from '../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { BulkFileOperations } from './bulkEditPreview.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { localize } from '../../../../../nls.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IconLabel } from '../../../../../base/browser/ui/iconLabel/iconLabel.js';
import { basename } from '../../../../../base/common/resources.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { compare } from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { ResourceFileEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { SnippetParser } from '../../../../../editor/contrib/snippet/browser/snippetParser.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import * as css from '../../../../../base/browser/cssValue.js';
export class CategoryElement {
    constructor(parent, category) {
        this.parent = parent;
        this.category = category;
    }
    isChecked() {
        const model = this.parent;
        let checked = true;
        for (const file of this.category.fileOperations) {
            for (const edit of file.originalEdits.values()) {
                checked = checked && model.checked.isChecked(edit);
            }
        }
        return checked;
    }
    setChecked(value) {
        const model = this.parent;
        for (const file of this.category.fileOperations) {
            for (const edit of file.originalEdits.values()) {
                model.checked.updateChecked(edit, value);
            }
        }
    }
}
export class FileElement {
    constructor(parent, edit) {
        this.parent = parent;
        this.edit = edit;
    }
    isChecked() {
        const model = this.parent instanceof CategoryElement ? this.parent.parent : this.parent;
        let checked = true;
        // only text edit children -> reflect children state
        if (this.edit.type === 1 /* BulkFileOperationType.TextEdit */) {
            checked = !this.edit.textEdits.every(edit => !model.checked.isChecked(edit.textEdit));
        }
        // multiple file edits -> reflect single state
        for (const edit of this.edit.originalEdits.values()) {
            if (edit instanceof ResourceFileEdit) {
                checked = checked && model.checked.isChecked(edit);
            }
        }
        // multiple categories and text change -> read all elements
        if (this.parent instanceof CategoryElement && this.edit.type === 1 /* BulkFileOperationType.TextEdit */) {
            for (const category of model.categories) {
                for (const file of category.fileOperations) {
                    if (file.uri.toString() === this.edit.uri.toString()) {
                        for (const edit of file.originalEdits.values()) {
                            if (edit instanceof ResourceFileEdit) {
                                checked = checked && model.checked.isChecked(edit);
                            }
                        }
                    }
                }
            }
        }
        return checked;
    }
    setChecked(value) {
        const model = this.parent instanceof CategoryElement ? this.parent.parent : this.parent;
        for (const edit of this.edit.originalEdits.values()) {
            model.checked.updateChecked(edit, value);
        }
        // multiple categories and file change -> update all elements
        if (this.parent instanceof CategoryElement && this.edit.type !== 1 /* BulkFileOperationType.TextEdit */) {
            for (const category of model.categories) {
                for (const file of category.fileOperations) {
                    if (file.uri.toString() === this.edit.uri.toString()) {
                        for (const edit of file.originalEdits.values()) {
                            model.checked.updateChecked(edit, value);
                        }
                    }
                }
            }
        }
    }
    isDisabled() {
        if (this.parent instanceof CategoryElement && this.edit.type === 1 /* BulkFileOperationType.TextEdit */) {
            const model = this.parent.parent;
            let checked = true;
            for (const category of model.categories) {
                for (const file of category.fileOperations) {
                    if (file.uri.toString() === this.edit.uri.toString()) {
                        for (const edit of file.originalEdits.values()) {
                            if (edit instanceof ResourceFileEdit) {
                                checked = checked && model.checked.isChecked(edit);
                            }
                        }
                    }
                }
            }
            return !checked;
        }
        return false;
    }
}
export class TextEditElement {
    constructor(parent, idx, edit, prefix, selecting, inserting, suffix) {
        this.parent = parent;
        this.idx = idx;
        this.edit = edit;
        this.prefix = prefix;
        this.selecting = selecting;
        this.inserting = inserting;
        this.suffix = suffix;
    }
    isChecked() {
        let model = this.parent.parent;
        if (model instanceof CategoryElement) {
            model = model.parent;
        }
        return model.checked.isChecked(this.edit.textEdit);
    }
    setChecked(value) {
        let model = this.parent.parent;
        if (model instanceof CategoryElement) {
            model = model.parent;
        }
        // check/uncheck this element
        model.checked.updateChecked(this.edit.textEdit, value);
        // make sure parent is checked when this element is checked...
        if (value) {
            for (const edit of this.parent.edit.originalEdits.values()) {
                if (edit instanceof ResourceFileEdit) {
                    model.checked.updateChecked(edit, value);
                }
            }
        }
    }
    isDisabled() {
        return this.parent.isDisabled();
    }
}
// --- DATA SOURCE
let BulkEditDataSource = class BulkEditDataSource {
    constructor(_textModelService, _instantiationService) {
        this._textModelService = _textModelService;
        this._instantiationService = _instantiationService;
        this.groupByFile = true;
    }
    hasChildren(element) {
        if (element instanceof FileElement) {
            return element.edit.textEdits.length > 0;
        }
        if (element instanceof TextEditElement) {
            return false;
        }
        return true;
    }
    async getChildren(element) {
        // root -> file/text edits
        if (element instanceof BulkFileOperations) {
            return this.groupByFile
                ? element.fileOperations.map(op => new FileElement(element, op))
                : element.categories.map(cat => new CategoryElement(element, cat));
        }
        // category
        if (element instanceof CategoryElement) {
            return Array.from(element.category.fileOperations, op => new FileElement(element, op));
        }
        // file: text edit
        if (element instanceof FileElement && element.edit.textEdits.length > 0) {
            // const previewUri = BulkEditPreviewProvider.asPreviewUri(element.edit.resource);
            let textModel;
            let textModelDisposable;
            try {
                const ref = await this._textModelService.createModelReference(element.edit.uri);
                textModel = ref.object.textEditorModel;
                textModelDisposable = ref;
            }
            catch {
                textModel = this._instantiationService.createInstance(TextModel, '', PLAINTEXT_LANGUAGE_ID, TextModel.DEFAULT_CREATION_OPTIONS, null);
                textModelDisposable = textModel;
            }
            const result = element.edit.textEdits.map((edit, idx) => {
                const range = textModel.validateRange(edit.textEdit.textEdit.range);
                //prefix-math
                const startTokens = textModel.tokenization.getLineTokens(range.startLineNumber);
                let prefixLen = 23; // default value for the no tokens/grammar case
                for (let idx = startTokens.findTokenIndexAtOffset(range.startColumn - 1) - 1; prefixLen < 50 && idx >= 0; idx--) {
                    prefixLen = range.startColumn - startTokens.getStartOffset(idx);
                }
                //suffix-math
                const endTokens = textModel.tokenization.getLineTokens(range.endLineNumber);
                let suffixLen = 0;
                for (let idx = endTokens.findTokenIndexAtOffset(range.endColumn - 1); suffixLen < 50 && idx < endTokens.getCount(); idx++) {
                    suffixLen += endTokens.getEndOffset(idx) - endTokens.getStartOffset(idx);
                }
                return new TextEditElement(element, idx, edit, textModel.getValueInRange(new Range(range.startLineNumber, range.startColumn - prefixLen, range.startLineNumber, range.startColumn)), textModel.getValueInRange(range), !edit.textEdit.textEdit.insertAsSnippet ? edit.textEdit.textEdit.text : SnippetParser.asInsertText(edit.textEdit.textEdit.text), textModel.getValueInRange(new Range(range.endLineNumber, range.endColumn, range.endLineNumber, range.endColumn + suffixLen)));
            });
            textModelDisposable.dispose();
            return result;
        }
        return [];
    }
};
BulkEditDataSource = __decorate([
    __param(0, ITextModelService),
    __param(1, IInstantiationService)
], BulkEditDataSource);
export { BulkEditDataSource };
export class BulkEditSorter {
    compare(a, b) {
        if (a instanceof FileElement && b instanceof FileElement) {
            return compareBulkFileOperations(a.edit, b.edit);
        }
        if (a instanceof TextEditElement && b instanceof TextEditElement) {
            return Range.compareRangesUsingStarts(a.edit.textEdit.textEdit.range, b.edit.textEdit.textEdit.range);
        }
        return 0;
    }
}
export function compareBulkFileOperations(a, b) {
    return compare(a.uri.toString(), b.uri.toString());
}
// --- ACCESSI
let BulkEditAccessibilityProvider = class BulkEditAccessibilityProvider {
    constructor(_labelService) {
        this._labelService = _labelService;
    }
    getWidgetAriaLabel() {
        return localize('bulkEdit', "Bulk Edit");
    }
    getRole(_element) {
        return 'checkbox';
    }
    getAriaLabel(element) {
        if (element instanceof FileElement) {
            if (element.edit.textEdits.length > 0) {
                if (element.edit.type & 8 /* BulkFileOperationType.Rename */ && element.edit.newUri) {
                    return localize('aria.renameAndEdit', "Renaming {0} to {1}, also making text edits", this._labelService.getUriLabel(element.edit.uri, { relative: true }), this._labelService.getUriLabel(element.edit.newUri, { relative: true }));
                }
                else if (element.edit.type & 2 /* BulkFileOperationType.Create */) {
                    return localize('aria.createAndEdit', "Creating {0}, also making text edits", this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
                else if (element.edit.type & 4 /* BulkFileOperationType.Delete */) {
                    return localize('aria.deleteAndEdit', "Deleting {0}, also making text edits", this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
                else {
                    return localize('aria.editOnly', "{0}, making text edits", this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
            }
            else {
                if (element.edit.type & 8 /* BulkFileOperationType.Rename */ && element.edit.newUri) {
                    return localize('aria.rename', "Renaming {0} to {1}", this._labelService.getUriLabel(element.edit.uri, { relative: true }), this._labelService.getUriLabel(element.edit.newUri, { relative: true }));
                }
                else if (element.edit.type & 2 /* BulkFileOperationType.Create */) {
                    return localize('aria.create', "Creating {0}", this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
                else if (element.edit.type & 4 /* BulkFileOperationType.Delete */) {
                    return localize('aria.delete', "Deleting {0}", this._labelService.getUriLabel(element.edit.uri, { relative: true }));
                }
            }
        }
        if (element instanceof TextEditElement) {
            if (element.selecting.length > 0 && element.inserting.length > 0) {
                // edit: replace
                return localize('aria.replace', "line {0}, replacing {1} with {2}", element.edit.textEdit.textEdit.range.startLineNumber, element.selecting, element.inserting);
            }
            else if (element.selecting.length > 0 && element.inserting.length === 0) {
                // edit: delete
                return localize('aria.del', "line {0}, removing {1}", element.edit.textEdit.textEdit.range.startLineNumber, element.selecting);
            }
            else if (element.selecting.length === 0 && element.inserting.length > 0) {
                // edit: insert
                return localize('aria.insert', "line {0}, inserting {1}", element.edit.textEdit.textEdit.range.startLineNumber, element.selecting);
            }
        }
        return null;
    }
};
BulkEditAccessibilityProvider = __decorate([
    __param(0, ILabelService)
], BulkEditAccessibilityProvider);
export { BulkEditAccessibilityProvider };
// --- IDENT
export class BulkEditIdentityProvider {
    getId(element) {
        if (element instanceof FileElement) {
            return element.edit.uri + (element.parent instanceof CategoryElement ? JSON.stringify(element.parent.category.metadata) : '');
        }
        else if (element instanceof TextEditElement) {
            return element.parent.edit.uri.toString() + element.idx;
        }
        else {
            return JSON.stringify(element.category.metadata);
        }
    }
}
// --- RENDERER
class CategoryElementTemplate {
    constructor(container) {
        container.classList.add('category');
        this.icon = document.createElement('div');
        container.appendChild(this.icon);
        this.label = new IconLabel(container);
    }
}
let CategoryElementRenderer = class CategoryElementRenderer {
    static { CategoryElementRenderer_1 = this; }
    static { this.id = 'CategoryElementRenderer'; }
    constructor(_themeService) {
        this._themeService = _themeService;
        this.templateId = CategoryElementRenderer_1.id;
    }
    renderTemplate(container) {
        return new CategoryElementTemplate(container);
    }
    renderElement(node, _index, template) {
        template.icon.style.setProperty('--background-dark', null);
        template.icon.style.setProperty('--background-light', null);
        template.icon.style.color = '';
        const { metadata } = node.element.category;
        if (ThemeIcon.isThemeIcon(metadata.iconPath)) {
            // css
            const className = ThemeIcon.asClassName(metadata.iconPath);
            template.icon.className = className ? `theme-icon ${className}` : '';
            template.icon.style.color = metadata.iconPath.color ? this._themeService.getColorTheme().getColor(metadata.iconPath.color.id)?.toString() ?? '' : '';
        }
        else if (URI.isUri(metadata.iconPath)) {
            // background-image
            template.icon.className = 'uri-icon';
            template.icon.style.setProperty('--background-dark', css.asCSSUrl(metadata.iconPath));
            template.icon.style.setProperty('--background-light', css.asCSSUrl(metadata.iconPath));
        }
        else if (metadata.iconPath) {
            // background-image
            template.icon.className = 'uri-icon';
            template.icon.style.setProperty('--background-dark', css.asCSSUrl(metadata.iconPath.dark));
            template.icon.style.setProperty('--background-light', css.asCSSUrl(metadata.iconPath.light));
        }
        template.label.setLabel(metadata.label, metadata.description, {
            descriptionMatches: createMatches(node.filterData),
        });
    }
    disposeTemplate(template) {
        template.label.dispose();
    }
};
CategoryElementRenderer = CategoryElementRenderer_1 = __decorate([
    __param(0, IThemeService)
], CategoryElementRenderer);
export { CategoryElementRenderer };
let FileElementTemplate = class FileElementTemplate {
    constructor(container, resourceLabels, _labelService) {
        this._labelService = _labelService;
        this._disposables = new DisposableStore();
        this._localDisposables = new DisposableStore();
        this._checkbox = document.createElement('input');
        this._checkbox.className = 'edit-checkbox';
        this._checkbox.type = 'checkbox';
        this._checkbox.setAttribute('role', 'checkbox');
        container.appendChild(this._checkbox);
        this._label = resourceLabels.create(container, { supportHighlights: true });
        this._details = document.createElement('span');
        this._details.className = 'details';
        container.appendChild(this._details);
    }
    dispose() {
        this._localDisposables.dispose();
        this._disposables.dispose();
        this._label.dispose();
    }
    set(element, score) {
        this._localDisposables.clear();
        this._checkbox.checked = element.isChecked();
        this._checkbox.disabled = element.isDisabled();
        this._localDisposables.add(dom.addDisposableListener(this._checkbox, 'change', () => {
            element.setChecked(this._checkbox.checked);
        }));
        if (element.edit.type & 8 /* BulkFileOperationType.Rename */ && element.edit.newUri) {
            // rename: oldName → newName
            this._label.setResource({
                resource: element.edit.uri,
                name: localize('rename.label', "{0} → {1}", this._labelService.getUriLabel(element.edit.uri, { relative: true }), this._labelService.getUriLabel(element.edit.newUri, { relative: true })),
            }, {
                fileDecorations: { colors: true, badges: false }
            });
            this._details.innerText = localize('detail.rename', "(renaming)");
        }
        else {
            // create, delete, edit: NAME
            const options = {
                matches: createMatches(score),
                fileKind: FileKind.FILE,
                fileDecorations: { colors: true, badges: false },
                extraClasses: []
            };
            if (element.edit.type & 2 /* BulkFileOperationType.Create */) {
                this._details.innerText = localize('detail.create', "(creating)");
            }
            else if (element.edit.type & 4 /* BulkFileOperationType.Delete */) {
                this._details.innerText = localize('detail.del', "(deleting)");
                options.extraClasses.push('delete');
            }
            else {
                this._details.innerText = '';
            }
            this._label.setFile(element.edit.uri, options);
        }
    }
};
FileElementTemplate = __decorate([
    __param(2, ILabelService)
], FileElementTemplate);
let FileElementRenderer = class FileElementRenderer {
    static { FileElementRenderer_1 = this; }
    static { this.id = 'FileElementRenderer'; }
    constructor(_resourceLabels, _labelService) {
        this._resourceLabels = _resourceLabels;
        this._labelService = _labelService;
        this.templateId = FileElementRenderer_1.id;
    }
    renderTemplate(container) {
        return new FileElementTemplate(container, this._resourceLabels, this._labelService);
    }
    renderElement(node, _index, template) {
        template.set(node.element, node.filterData);
    }
    disposeTemplate(template) {
        template.dispose();
    }
};
FileElementRenderer = FileElementRenderer_1 = __decorate([
    __param(1, ILabelService)
], FileElementRenderer);
export { FileElementRenderer };
let TextEditElementTemplate = class TextEditElementTemplate {
    constructor(container, _themeService) {
        this._themeService = _themeService;
        this._disposables = new DisposableStore();
        this._localDisposables = new DisposableStore();
        container.classList.add('textedit');
        this._checkbox = document.createElement('input');
        this._checkbox.className = 'edit-checkbox';
        this._checkbox.type = 'checkbox';
        this._checkbox.setAttribute('role', 'checkbox');
        container.appendChild(this._checkbox);
        this._icon = document.createElement('div');
        container.appendChild(this._icon);
        this._label = this._disposables.add(new HighlightedLabel(container));
    }
    dispose() {
        this._localDisposables.dispose();
        this._disposables.dispose();
    }
    set(element) {
        this._localDisposables.clear();
        this._localDisposables.add(dom.addDisposableListener(this._checkbox, 'change', e => {
            element.setChecked(this._checkbox.checked);
            e.preventDefault();
        }));
        if (element.parent.isChecked()) {
            this._checkbox.checked = element.isChecked();
            this._checkbox.disabled = element.isDisabled();
        }
        else {
            this._checkbox.checked = element.isChecked();
            this._checkbox.disabled = element.isDisabled();
        }
        let value = '';
        value += element.prefix;
        value += element.selecting;
        value += element.inserting;
        value += element.suffix;
        const selectHighlight = { start: element.prefix.length, end: element.prefix.length + element.selecting.length, extraClasses: ['remove'] };
        const insertHighlight = { start: selectHighlight.end, end: selectHighlight.end + element.inserting.length, extraClasses: ['insert'] };
        let title;
        const { metadata } = element.edit.textEdit;
        if (metadata && metadata.description) {
            title = localize('title', "{0} - {1}", metadata.label, metadata.description);
        }
        else if (metadata) {
            title = metadata.label;
        }
        const iconPath = metadata?.iconPath;
        if (!iconPath) {
            this._icon.style.display = 'none';
        }
        else {
            this._icon.style.display = 'block';
            this._icon.style.setProperty('--background-dark', null);
            this._icon.style.setProperty('--background-light', null);
            if (ThemeIcon.isThemeIcon(iconPath)) {
                // css
                const className = ThemeIcon.asClassName(iconPath);
                this._icon.className = className ? `theme-icon ${className}` : '';
                this._icon.style.color = iconPath.color ? this._themeService.getColorTheme().getColor(iconPath.color.id)?.toString() ?? '' : '';
            }
            else if (URI.isUri(iconPath)) {
                // background-image
                this._icon.className = 'uri-icon';
                this._icon.style.setProperty('--background-dark', css.asCSSUrl(iconPath));
                this._icon.style.setProperty('--background-light', css.asCSSUrl(iconPath));
            }
            else {
                // background-image
                this._icon.className = 'uri-icon';
                this._icon.style.setProperty('--background-dark', css.asCSSUrl(iconPath.dark));
                this._icon.style.setProperty('--background-light', css.asCSSUrl(iconPath.light));
            }
        }
        this._label.set(value, [selectHighlight, insertHighlight], title, true);
        this._icon.title = title || '';
    }
};
TextEditElementTemplate = __decorate([
    __param(1, IThemeService)
], TextEditElementTemplate);
let TextEditElementRenderer = class TextEditElementRenderer {
    static { TextEditElementRenderer_1 = this; }
    static { this.id = 'TextEditElementRenderer'; }
    constructor(_themeService) {
        this._themeService = _themeService;
        this.templateId = TextEditElementRenderer_1.id;
    }
    renderTemplate(container) {
        return new TextEditElementTemplate(container, this._themeService);
    }
    renderElement({ element }, _index, template) {
        template.set(element);
    }
    disposeTemplate(_template) { }
};
TextEditElementRenderer = TextEditElementRenderer_1 = __decorate([
    __param(0, IThemeService)
], TextEditElementRenderer);
export { TextEditElementRenderer };
export class BulkEditDelegate {
    getHeight() {
        return 23;
    }
    getTemplateId(element) {
        if (element instanceof FileElement) {
            return FileElementRenderer.id;
        }
        else if (element instanceof TextEditElement) {
            return TextEditElementRenderer.id;
        }
        else {
            return CategoryElementRenderer.id;
        }
    }
}
export class BulkEditNaviLabelProvider {
    getKeyboardNavigationLabel(element) {
        if (element instanceof FileElement) {
            return basename(element.edit.uri);
        }
        else if (element instanceof CategoryElement) {
            return element.category.metadata.label;
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2J1bGtFZGl0L2Jyb3dzZXIvcHJldmlldy9idWxrRWRpdFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQWMsTUFBTSxxRUFBcUUsQ0FBQztBQUVuSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUUxRCxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBd0UsTUFBTSxzQkFBc0IsQ0FBQztBQUNoSSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU5RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxF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