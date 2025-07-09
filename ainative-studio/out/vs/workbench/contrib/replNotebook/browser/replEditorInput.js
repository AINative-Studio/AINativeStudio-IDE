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
var ReplEditorInput_1;
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IInteractiveHistoryService } from '../../interactive/browser/interactiveHistoryService.js';
import { CellKind, NotebookSetting } from '../../notebook/common/notebookCommon.js';
import { NotebookEditorInput } from '../../notebook/common/notebookEditorInput.js';
import { INotebookEditorModelResolverService } from '../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const replTabIcon = registerIcon('repl-editor-label-icon', Codicon.debugLineByLine, localize('replEditorLabelIcon', 'Icon of the REPL editor label.'));
let ReplEditorInput = class ReplEditorInput extends NotebookEditorInput {
    static { ReplEditorInput_1 = this; }
    static { this.ID = 'workbench.editorinputs.replEditorInput'; }
    constructor(resource, label, _notebookService, _notebookModelResolverService, _fileDialogService, labelService, fileService, filesConfigurationService, extensionService, editorService, textResourceConfigurationService, customEditorLabelService, historyService, _textModelService, configurationService) {
        super(resource, undefined, 'jupyter-notebook', {}, _notebookService, _notebookModelResolverService, _fileDialogService, labelService, fileService, filesConfigurationService, extensionService, editorService, textResourceConfigurationService, customEditorLabelService);
        this.historyService = historyService;
        this._textModelService = _textModelService;
        this.isDisposing = false;
        this.isScratchpad = resource.scheme === 'untitled' && configurationService.getValue(NotebookSetting.InteractiveWindowPromptToSave) !== true;
        this.label = label ?? this.createEditorLabel(resource);
    }
    getIcon() {
        return replTabIcon;
    }
    createEditorLabel(resource) {
        if (!resource) {
            return 'REPL';
        }
        if (resource.scheme === 'untitled') {
            const match = new RegExp('Untitled-(\\d+)\.').exec(resource.path);
            if (match?.length === 2) {
                return `REPL - ${match[1]}`;
            }
        }
        const filename = resource.path.split('/').pop();
        return filename ? `REPL - ${filename}` : 'REPL';
    }
    get typeId() {
        return ReplEditorInput_1.ID;
    }
    get editorId() {
        return 'repl';
    }
    getName() {
        return this.label;
    }
    get editorInputs() {
        return [this];
    }
    get capabilities() {
        const capabilities = super.capabilities;
        const scratchPad = this.isScratchpad ? 512 /* EditorInputCapabilities.Scratchpad */ : 0;
        return capabilities
            | 2 /* EditorInputCapabilities.Readonly */
            | scratchPad;
    }
    async resolve() {
        const model = await super.resolve();
        if (model) {
            this.ensureInputBoxCell(model.notebook);
        }
        return model;
    }
    ensureInputBoxCell(notebook) {
        const lastCell = notebook.cells[notebook.cells.length - 1];
        if (!lastCell || lastCell.cellKind === CellKind.Markup || lastCell.outputs.length > 0 || lastCell.internalMetadata.executionOrder !== undefined) {
            notebook.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: notebook.cells.length,
                    count: 0,
                    cells: [
                        {
                            cellKind: CellKind.Code,
                            language: 'python',
                            mime: undefined,
                            outputs: [],
                            source: ''
                        }
                    ]
                }
            ], true, undefined, () => undefined, undefined, false);
        }
    }
    async resolveInput(notebook) {
        if (this.inputModelRef) {
            return this.inputModelRef.object.textEditorModel;
        }
        const lastCell = notebook.cells[notebook.cells.length - 1];
        if (!lastCell) {
            throw new Error('The REPL editor requires at least one cell for the input box.');
        }
        this.inputModelRef = await this._textModelService.createModelReference(lastCell.uri);
        return this.inputModelRef.object.textEditorModel;
    }
    dispose() {
        if (!this.isDisposing) {
            this.isDisposing = true;
            this.editorModelReference?.object.revert({ soft: true });
            this.inputModelRef?.dispose();
            super.dispose();
        }
    }
};
ReplEditorInput = ReplEditorInput_1 = __decorate([
    __param(2, INotebookService),
    __param(3, INotebookEditorModelResolverService),
    __param(4, IFileDialogService),
    __param(5, ILabelService),
    __param(6, IFileService),
    __param(7, IFilesConfigurationService),
    __param(8, IExtensionService),
    __param(9, IEditorService),
    __param(10, ITextResourceConfigurationService),
    __param(11, ICustomEditorLabelService),
    __param(12, IInteractiveHistoryService),
    __param(13, ITextModelService),
    __param(14, IConfigurationService)
], ReplEditorInput);
export { ReplEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlcGxOb3RlYm9vay9icm93c2VyL3JlcGxFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUE0QixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFM0UsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFcEcsT0FBTyxFQUFnQixRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEcsT0FBTyxFQUFpQyxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xILE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsMEJBQTBC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