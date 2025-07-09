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
var TextFileContentProvider_1;
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { InputFocusedContextKey } from '../../../../platform/contextkey/common/contextkeys.js';
import { Event } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
/**
 * Explorer viewlet id.
 */
export const VIEWLET_ID = 'workbench.view.explorer';
/**
 * Explorer file view id.
 */
export const VIEW_ID = 'workbench.explorer.fileView';
/**
 * Context Keys to use with keybindings for the Explorer and Open Editors view
 */
export const ExplorerViewletVisibleContext = new RawContextKey('explorerViewletVisible', true, { type: 'boolean', description: localize('explorerViewletVisible', "True when the EXPLORER viewlet is visible.") });
export const FoldersViewVisibleContext = new RawContextKey('foldersViewVisible', true, { type: 'boolean', description: localize('foldersViewVisible', "True when the FOLDERS view (the file tree within the explorer view container) is visible.") });
export const ExplorerFolderContext = new RawContextKey('explorerResourceIsFolder', false, { type: 'boolean', description: localize('explorerResourceIsFolder', "True when the focused item in the EXPLORER is a folder.") });
export const ExplorerResourceReadonlyContext = new RawContextKey('explorerResourceReadonly', false, { type: 'boolean', description: localize('explorerResourceReadonly', "True when the focused item in the EXPLORER is read-only.") });
export const ExplorerResourceWritableContext = ExplorerResourceReadonlyContext.toNegated();
export const ExplorerResourceParentReadOnlyContext = new RawContextKey('explorerResourceParentReadonly', false, { type: 'boolean', description: localize('explorerResourceParentReadonly', "True when the focused item in the EXPLORER's parent is read-only.") });
/**
 * Comma separated list of editor ids that can be used for the selected explorer resource.
 */
export const ExplorerResourceAvailableEditorIdsContext = new RawContextKey('explorerResourceAvailableEditorIds', '');
export const ExplorerRootContext = new RawContextKey('explorerResourceIsRoot', false, { type: 'boolean', description: localize('explorerResourceIsRoot', "True when the focused item in the EXPLORER is a root folder.") });
export const ExplorerResourceCut = new RawContextKey('explorerResourceCut', false, { type: 'boolean', description: localize('explorerResourceCut', "True when an item in the EXPLORER has been cut for cut and paste.") });
export const ExplorerResourceMoveableToTrash = new RawContextKey('explorerResourceMoveableToTrash', false, { type: 'boolean', description: localize('explorerResourceMoveableToTrash', "True when the focused item in the EXPLORER can be moved to trash.") });
export const FilesExplorerFocusedContext = new RawContextKey('filesExplorerFocus', true, { type: 'boolean', description: localize('filesExplorerFocus', "True when the focus is inside the EXPLORER view.") });
export const OpenEditorsFocusedContext = new RawContextKey('openEditorsFocus', true, { type: 'boolean', description: localize('openEditorsFocus', "True when the focus is inside the OPEN EDITORS view.") });
export const ExplorerFocusedContext = new RawContextKey('explorerViewletFocus', true, { type: 'boolean', description: localize('explorerViewletFocus', "True when the focus is inside the EXPLORER viewlet.") });
export const ExplorerFindProviderActive = new RawContextKey('explorerFindProviderActive', false, { type: 'boolean', description: localize('explorerFindProviderActive', "True when the explorer tree is using the explorer find provider.") });
// compressed nodes
export const ExplorerCompressedFocusContext = new RawContextKey('explorerViewletCompressedFocus', true, { type: 'boolean', description: localize('explorerViewletCompressedFocus', "True when the focused item in the EXPLORER view is a compact item.") });
export const ExplorerCompressedFirstFocusContext = new RawContextKey('explorerViewletCompressedFirstFocus', true, { type: 'boolean', description: localize('explorerViewletCompressedFirstFocus', "True when the focus is inside a compact item's first part in the EXPLORER view.") });
export const ExplorerCompressedLastFocusContext = new RawContextKey('explorerViewletCompressedLastFocus', true, { type: 'boolean', description: localize('explorerViewletCompressedLastFocus', "True when the focus is inside a compact item's last part in the EXPLORER view.") });
export const ViewHasSomeCollapsibleRootItemContext = new RawContextKey('viewHasSomeCollapsibleItem', false, { type: 'boolean', description: localize('viewHasSomeCollapsibleItem', "True when a workspace in the EXPLORER view has some collapsible root child.") });
export const FilesExplorerFocusCondition = ContextKeyExpr.and(FoldersViewVisibleContext, FilesExplorerFocusedContext, ContextKeyExpr.not(InputFocusedContextKey));
export const ExplorerFocusCondition = ContextKeyExpr.and(FoldersViewVisibleContext, ExplorerFocusedContext, ContextKeyExpr.not(InputFocusedContextKey));
/**
 * Text file editor id.
 */
export const TEXT_FILE_EDITOR_ID = 'workbench.editors.files.textFileEditor';
/**
 * File editor input id.
 */
export const FILE_EDITOR_INPUT_ID = 'workbench.editors.files.fileEditorInput';
/**
 * Binary file editor id.
 */
export const BINARY_FILE_EDITOR_ID = 'workbench.editors.files.binaryFileEditor';
/**
 * Language identifier for binary files opened as text.
 */
export const BINARY_TEXT_FILE_MODE = 'code-text-binary';
export var SortOrder;
(function (SortOrder) {
    SortOrder["Default"] = "default";
    SortOrder["Mixed"] = "mixed";
    SortOrder["FilesFirst"] = "filesFirst";
    SortOrder["Type"] = "type";
    SortOrder["Modified"] = "modified";
    SortOrder["FoldersNestsFiles"] = "foldersNestsFiles";
})(SortOrder || (SortOrder = {}));
export var UndoConfirmLevel;
(function (UndoConfirmLevel) {
    UndoConfirmLevel["Verbose"] = "verbose";
    UndoConfirmLevel["Default"] = "default";
    UndoConfirmLevel["Light"] = "light";
})(UndoConfirmLevel || (UndoConfirmLevel = {}));
export var LexicographicOptions;
(function (LexicographicOptions) {
    LexicographicOptions["Default"] = "default";
    LexicographicOptions["Upper"] = "upper";
    LexicographicOptions["Lower"] = "lower";
    LexicographicOptions["Unicode"] = "unicode";
})(LexicographicOptions || (LexicographicOptions = {}));
let TextFileContentProvider = TextFileContentProvider_1 = class TextFileContentProvider extends Disposable {
    constructor(textFileService, fileService, languageService, modelService) {
        super();
        this.textFileService = textFileService;
        this.fileService = fileService;
        this.languageService = languageService;
        this.modelService = modelService;
        this.fileWatcherDisposable = this._register(new MutableDisposable());
    }
    static async open(resource, scheme, label, editorService, options) {
        await editorService.openEditor({
            original: { resource: TextFileContentProvider_1.resourceToTextFile(scheme, resource) },
            modified: { resource },
            label,
            options
        });
    }
    static resourceToTextFile(scheme, resource) {
        return resource.with({ scheme, query: JSON.stringify({ scheme: resource.scheme, query: resource.query }) });
    }
    static textFileToResource(resource) {
        const { scheme, query } = JSON.parse(resource.query);
        return resource.with({ scheme, query });
    }
    async provideTextContent(resource) {
        if (!resource.query) {
            // We require the URI to use the `query` to transport the original scheme and query
            // as done by `resourceToTextFile`
            return null;
        }
        const savedFileResource = TextFileContentProvider_1.textFileToResource(resource);
        // Make sure our text file is resolved up to date
        const codeEditorModel = await this.resolveEditorModel(resource);
        // Make sure to keep contents up to date when it changes
        if (!this.fileWatcherDisposable.value) {
            const disposables = new DisposableStore();
            this.fileWatcherDisposable.value = disposables;
            disposables.add(this.fileService.onDidFilesChange(changes => {
                if (changes.contains(savedFileResource, 0 /* FileChangeType.UPDATED */)) {
                    this.resolveEditorModel(resource, false /* do not create if missing */); // update model when resource changes
                }
            }));
            if (codeEditorModel) {
                disposables.add(Event.once(codeEditorModel.onWillDispose)(() => this.fileWatcherDisposable.clear()));
            }
        }
        return codeEditorModel;
    }
    async resolveEditorModel(resource, createAsNeeded = true) {
        const savedFileResource = TextFileContentProvider_1.textFileToResource(resource);
        const content = await this.textFileService.readStream(savedFileResource);
        let codeEditorModel = this.modelService.getModel(resource);
        if (codeEditorModel) {
            this.modelService.updateModel(codeEditorModel, content.value);
        }
        else if (createAsNeeded) {
            const textFileModel = this.modelService.getModel(savedFileResource);
            let languageSelector;
            if (textFileModel) {
                languageSelector = this.languageService.createById(textFileModel.getLanguageId());
            }
            else {
                languageSelector = this.languageService.createByFilepathOrFirstLine(savedFileResource);
            }
            codeEditorModel = this.modelService.createModel(content.value, languageSelector, resource);
        }
        return codeEditorModel;
    }
};
TextFileContentProvider = TextFileContentProvider_1 = __decorate([
    __param(0, ITextFileService),
    __param(1, IFileService),
    __param(2, ILanguageService),
    __param(3, IModelService)
], TextFileContentProvider);
export { TextFileContentProvider };
export class OpenEditor {
    static { this.COUNTER = 0; }
    constructor(_editor, _group) {
        this._editor = _editor;
        this._group = _group;
        this.id = OpenEditor.COUNTER++;
    }
    get editor() {
        return this._editor;
    }
    get group() {
        return this._group;
    }
    get groupId() {
        return this._group.id;
    }
    getId() {
        return `openeditor:${this.groupId}:${this.id}`;
    }
    isPreview() {
        return !this._group.isPinned(this.editor);
    }
    isSticky() {
        return this._group.isSticky(this.editor);
    }
    getResource() {
        return EditorResourceAccessor.getOriginalUri(this.editor, { supportSideBySide: SideBySideEditor.PRIMARY });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvY29tbW9uL2ZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQW9ELHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFdkksT0FBTyxFQUFzRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5SSxPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXJHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBc0IsTUFBTSxpREFBaUQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUUvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRzlDOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLHlCQUF5QixDQUFDO0FBRXBEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLDZCQUE2QixDQUFDO0FBRXJEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxhQUFhLENBQVUsd0JBQXdCLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxF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