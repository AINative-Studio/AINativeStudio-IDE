/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IBulkEditService, ResourceTextEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { SideBySideDiffElementViewModel } from './diffElementViewModel.js';
import { NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY, NOTEBOOK_DIFF_CELL_INPUT, NOTEBOOK_DIFF_CELL_PROPERTY, NOTEBOOK_DIFF_CELL_PROPERTY_EXPANDED, NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS, NOTEBOOK_DIFF_ITEM_DIFF_STATE, NOTEBOOK_DIFF_ITEM_KIND, NOTEBOOK_DIFF_METADATA, NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN } from './notebookDiffEditorBrowser.js';
import { NotebookTextDiffEditor } from './notebookDiffEditor.js';
import { nextChangeIcon, openAsTextIcon, previousChangeIcon, renderOutputIcon, revertIcon, toggleWhitespace } from '../notebookIcons.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
import { NOTEBOOK_DIFF_EDITOR_ID } from '../../common/notebookCommon.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { NotebookMultiTextDiffEditor } from './notebookMultiDiffEditor.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import product from '../../../../../platform/product/common/product.js';
import { ctxHasEditorModification, ctxHasRequestInProgress } from '../../../chat/browser/chatEditing/chatEditingEditorContextKeys.js';
// ActiveEditorContext.isEqualTo(SearchEditorConstants.SearchEditorID)
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.openFile',
            icon: Codicon.goToFile,
            title: localize2('notebook.diff.openFile', 'Open File'),
            precondition: ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)),
            menu: [{
                    id: MenuId.EditorTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)),
                }]
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const activeEditor = editorService.activeEditorPane;
        if (!activeEditor) {
            return;
        }
        if (activeEditor instanceof NotebookTextDiffEditor || activeEditor instanceof NotebookMultiTextDiffEditor) {
            const diffEditorInput = activeEditor.input;
            const resource = diffEditorInput.modified.resource;
            await editorService.openEditor({ resource });
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.toggleCollapseUnchangedRegions',
            title: localize2('notebook.diff.cell.toggleCollapseUnchangedRegions', 'Toggle Collapse Unchanged Regions'),
            icon: Codicon.map,
            toggled: ContextKeyExpr.has('config.diffEditor.hideUnchangedRegions.enabled'),
            precondition: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID),
            menu: {
                id: MenuId.EditorTitle,
                group: 'navigation',
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID),
            },
        });
    }
    run(accessor, ...args) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('diffEditor.hideUnchangedRegions.enabled');
        configurationService.updateValue('diffEditor.hideUnchangedRegions.enabled', newValue);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.switchToText',
            icon: openAsTextIcon,
            title: localize2('notebook.diff.switchToText', 'Open Text Diff Editor'),
            precondition: ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)),
            menu: [{
                    id: MenuId.EditorTitle,
                    group: 'navigation',
                    when: ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)),
                }]
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const activeEditor = editorService.activeEditorPane;
        if (!activeEditor) {
            return;
        }
        if (activeEditor instanceof NotebookTextDiffEditor || activeEditor instanceof NotebookMultiTextDiffEditor) {
            const diffEditorInput = activeEditor.input;
            await editorService.openEditor({
                original: { resource: diffEditorInput.original.resource },
                modified: { resource: diffEditorInput.resource },
                label: diffEditorInput.getName(),
                options: {
                    preserveFocus: false,
                    override: DEFAULT_EDITOR_ASSOCIATION.id
                }
            });
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.showUnchangedCells',
            title: localize2('showUnchangedCells', 'Show Unchanged Cells'),
            icon: Codicon.unfold,
            precondition: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.has(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key)),
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.has(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key), ContextKeyExpr.equals(NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN.key, true)),
                id: MenuId.EditorTitle,
                order: 22,
                group: 'navigation',
            },
        });
    }
    run(accessor, ...args) {
        const activeEditor = accessor.get(IEditorService).activeEditorPane;
        if (!activeEditor) {
            return;
        }
        if (activeEditor instanceof NotebookMultiTextDiffEditor) {
            activeEditor.showUnchanged();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.hideUnchangedCells',
            title: localize2('hideUnchangedCells', 'Hide Unchanged Cells'),
            icon: Codicon.fold,
            precondition: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.has(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key)),
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.has(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key), ContextKeyExpr.equals(NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN.key, false)),
                id: MenuId.EditorTitle,
                order: 22,
                group: 'navigation',
            },
        });
    }
    run(accessor, ...args) {
        const activeEditor = accessor.get(IEditorService).activeEditorPane;
        if (!activeEditor) {
            return;
        }
        if (activeEditor instanceof NotebookMultiTextDiffEditor) {
            activeEditor.hideUnchanged();
        }
    }
});
registerAction2(class GoToFileAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.2.goToCell',
            title: localize2('goToCell', 'Go To Cell'),
            icon: Codicon.goToFile,
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_KIND.key, 'Cell'), ContextKeyExpr.notEquals(NOTEBOOK_DIFF_ITEM_DIFF_STATE.key, 'delete')),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 0,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookMultiTextDiffEditor)) {
            return;
        }
        await editorService.openEditor({
            resource: uri,
            options: {
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            },
        });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.revertMetadata',
            title: localize('notebook.diff.revertMetadata', "Revert Notebook Metadata"),
            icon: revertIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffDocumentMetadata,
                when: NOTEBOOK_DIFF_METADATA,
            },
            precondition: NOTEBOOK_DIFF_METADATA
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookTextDiffEditor)) {
            return;
        }
        context.modifiedDocumentTextModel.applyEdits([{
                editType: 5 /* CellEditType.DocumentMetadata */,
                metadata: context.originalMetadata.metadata,
            }], true, undefined, () => undefined, undefined, true);
    }
});
const revertInput = localize('notebook.diff.cell.revertInput', "Revert Input");
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.2.cell.revertInput',
            title: revertInput,
            icon: revertIcon,
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_KIND.key, 'Cell'), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_DIFF_STATE.key, 'modified')),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 2,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookMultiTextDiffEditor)) {
            return;
        }
        const item = activeEditorPane.getDiffElementViewModel(uri);
        if (item && item instanceof SideBySideDiffElementViewModel) {
            const modified = item.modified;
            const original = item.original;
            if (!original || !modified) {
                return;
            }
            const bulkEditService = accessor.get(IBulkEditService);
            await bulkEditService.apply([
                new ResourceTextEdit(modified.uri, { range: modified.textModel.getFullModelRange(), text: original.textModel.getValue() }),
            ], { quotableLabel: 'Revert Notebook Cell Content Change' });
        }
    }
});
const revertOutputs = localize('notebook.diff.cell.revertOutputs', "Revert Outputs");
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.2.cell.revertOutputs',
            title: revertOutputs,
            icon: revertIcon,
            f1: false,
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_KIND.key, 'Output'), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_DIFF_STATE.key, 'modified')),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 2,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookMultiTextDiffEditor)) {
            return;
        }
        const item = activeEditorPane.getDiffElementViewModel(uri);
        if (item && item instanceof SideBySideDiffElementViewModel) {
            const original = item.original;
            const modifiedCellIndex = item.modifiedDocument.cells.findIndex(cell => cell.handle === item.modified.handle);
            if (modifiedCellIndex === -1) {
                return;
            }
            item.mainDocumentTextModel.applyEdits([{
                    editType: 2 /* CellEditType.Output */, index: modifiedCellIndex, outputs: original.outputs
                }], true, undefined, () => undefined, undefined, true);
        }
    }
});
const revertMetadata = localize('notebook.diff.cell.revertMetadata', "Revert Metadata");
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diffEditor.2.cell.revertMetadata',
            title: revertMetadata,
            icon: revertIcon,
            f1: false,
            menu: {
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_KIND.key, 'Metadata'), ContextKeyExpr.equals(NOTEBOOK_DIFF_ITEM_DIFF_STATE.key, 'modified')),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 2,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (!(activeEditorPane instanceof NotebookMultiTextDiffEditor)) {
            return;
        }
        const item = activeEditorPane.getDiffElementViewModel(uri);
        if (item && item instanceof SideBySideDiffElementViewModel) {
            const original = item.original;
            const modifiedCellIndex = item.modifiedDocument.cells.findIndex(cell => cell.handle === item.modified.handle);
            if (modifiedCellIndex === -1) {
                return;
            }
            item.mainDocumentTextModel.applyEdits([{
                    editType: 3 /* CellEditType.Metadata */, index: modifiedCellIndex, metadata: original.metadata
                }], true, undefined, () => undefined, undefined, true);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.revertMetadata',
            title: revertMetadata,
            icon: revertIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellMetadataTitle,
                when: NOTEBOOK_DIFF_CELL_PROPERTY
            },
            precondition: NOTEBOOK_DIFF_CELL_PROPERTY
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        if (!(context instanceof SideBySideDiffElementViewModel)) {
            return;
        }
        const original = context.original;
        const modified = context.modified;
        const modifiedCellIndex = context.mainDocumentTextModel.cells.indexOf(modified.textModel);
        if (modifiedCellIndex === -1) {
            return;
        }
        const rawEdits = [{ editType: 3 /* CellEditType.Metadata */, index: modifiedCellIndex, metadata: original.metadata }];
        if (context.original.language && context.modified.language !== context.original.language) {
            rawEdits.push({ editType: 4 /* CellEditType.CellLanguage */, index: modifiedCellIndex, language: context.original.language });
        }
        context.modifiedDocument.applyEdits(rawEdits, true, undefined, () => undefined, undefined, true);
    }
});
// registerAction2(class extends Action2 {
// 	constructor() {
// 		super(
// 			{
// 				id: 'notebook.diff.cell.switchOutputRenderingStyle',
// 				title: localize('notebook.diff.cell.switchOutputRenderingStyle', "Switch Outputs Rendering"),
// 				icon: renderOutputIcon,
// 				f1: false,
// 				menu: {
// 					id: MenuId.NotebookDiffCellOutputsTitle
// 				}
// 			}
// 		);
// 	}
// 	run(accessor: ServicesAccessor, context?: DiffElementViewModelBase) {
// 		if (!context) {
// 			return;
// 		}
// 		context.renderOutput = true;
// 	}
// });
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.switchOutputRenderingStyleToText',
            title: localize('notebook.diff.cell.switchOutputRenderingStyleToText', "Switch Output Rendering"),
            icon: renderOutputIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellOutputsTitle,
                when: NOTEBOOK_DIFF_CELL_PROPERTY_EXPANDED
            }
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        context.renderOutput = !context.renderOutput;
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.revertOutputs',
            title: localize('notebook.diff.cell.revertOutputs', "Revert Outputs"),
            icon: revertIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellOutputsTitle,
                when: NOTEBOOK_DIFF_CELL_PROPERTY
            },
            precondition: NOTEBOOK_DIFF_CELL_PROPERTY
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        if (!(context instanceof SideBySideDiffElementViewModel)) {
            return;
        }
        const original = context.original;
        const modified = context.modified;
        const modifiedCellIndex = context.mainDocumentTextModel.cells.indexOf(modified.textModel);
        if (modifiedCellIndex === -1) {
            return;
        }
        context.mainDocumentTextModel.applyEdits([{
                editType: 2 /* CellEditType.Output */, index: modifiedCellIndex, outputs: original.outputs
            }], true, undefined, () => undefined, undefined, true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.toggle.diff.cell.ignoreTrimWhitespace',
            title: localize('ignoreTrimWhitespace.label', "Show Leading/Trailing Whitespace Differences"),
            icon: toggleWhitespace,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellInputTitle,
                when: NOTEBOOK_DIFF_CELL_INPUT,
                order: 1,
            },
            precondition: NOTEBOOK_DIFF_CELL_INPUT,
            toggled: ContextKeyExpr.equals(NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY, false),
        });
    }
    run(accessor, context) {
        const cell = context;
        if (!cell?.modified) {
            return;
        }
        const uri = cell.modified.uri;
        const configService = accessor.get(ITextResourceConfigurationService);
        const key = 'diffEditor.ignoreTrimWhitespace';
        const val = configService.getValue(uri, key);
        configService.updateValue(uri, key, !val);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.cell.revertInput',
            title: revertInput,
            icon: revertIcon,
            f1: false,
            menu: {
                id: MenuId.NotebookDiffCellInputTitle,
                when: NOTEBOOK_DIFF_CELL_INPUT,
                order: 2
            },
            precondition: NOTEBOOK_DIFF_CELL_INPUT
        });
    }
    run(accessor, context) {
        if (!context) {
            return;
        }
        const original = context.original;
        const modified = context.modified;
        if (!original || !modified) {
            return;
        }
        const bulkEditService = accessor.get(IBulkEditService);
        return bulkEditService.apply([
            new ResourceTextEdit(modified.uri, { range: modified.textModel.getFullModelRange(), text: original.textModel.getValue() }),
        ], { quotableLabel: 'Revert Notebook Cell Content Change' });
    }
});
class ToggleRenderAction extends Action2 {
    constructor(id, title, precondition, toggled, order, toggleOutputs, toggleMetadata) {
        super({
            id: id,
            title,
            precondition: precondition,
            menu: [{
                    id: MenuId.EditorTitle,
                    group: 'notebook',
                    when: precondition,
                    order: order,
                }],
            toggled: toggled
        });
        this.toggleOutputs = toggleOutputs;
        this.toggleMetadata = toggleMetadata;
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        if (this.toggleOutputs !== undefined) {
            const oldValue = configurationService.getValue('notebook.diff.ignoreOutputs');
            configurationService.updateValue('notebook.diff.ignoreOutputs', !oldValue);
        }
        if (this.toggleMetadata !== undefined) {
            const oldValue = configurationService.getValue('notebook.diff.ignoreMetadata');
            configurationService.updateValue('notebook.diff.ignoreMetadata', !oldValue);
        }
    }
}
registerAction2(class extends ToggleRenderAction {
    constructor() {
        super('notebook.diff.showOutputs', localize2('notebook.diff.showOutputs', 'Show Outputs Differences'), ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)), ContextKeyExpr.notEquals('config.notebook.diff.ignoreOutputs', true), 2, true, undefined);
    }
});
registerAction2(class extends ToggleRenderAction {
    constructor() {
        super('notebook.diff.showMetadata', localize2('notebook.diff.showMetadata', 'Show Metadata Differences'), ContextKeyExpr.or(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ActiveEditorContext.isEqualTo(NotebookMultiTextDiffEditor.ID)), ContextKeyExpr.notEquals('config.notebook.diff.ignoreMetadata', true), 1, undefined, true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.action.previous',
            title: localize('notebook.diff.action.previous.title', "Show Previous Change"),
            icon: previousChangeIcon,
            f1: false,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 61 /* KeyCode.F3 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID)
            },
            menu: {
                id: MenuId.EditorTitle,
                group: 'navigation',
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID)
            }
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        if (editorService.activeEditorPane?.getId() !== NOTEBOOK_DIFF_EDITOR_ID) {
            return;
        }
        const editor = editorService.activeEditorPane.getControl();
        editor?.previousChange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.action.next',
            title: localize('notebook.diff.action.next.title', "Show Next Change"),
            icon: nextChangeIcon,
            f1: false,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 61 /* KeyCode.F3 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID)
            },
            menu: {
                id: MenuId.EditorTitle,
                group: 'navigation',
                when: ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID)
            }
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        if (editorService.activeEditorPane?.getId() !== NOTEBOOK_DIFF_EDITOR_ID) {
            return;
        }
        const editor = editorService.activeEditorPane.getControl();
        editor?.nextChange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.diff.inline.toggle',
            title: localize('notebook.diff.inline.toggle.title', "Toggle Inline View"),
            menu: {
                id: MenuId.EditorTitle,
                group: '1_diff',
                order: 10,
                when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(NotebookTextDiffEditor.ID), ContextKeyExpr.equals('config.notebook.diff.experimental.toggleInline', true), ctxHasEditorModification.negate(), ctxHasRequestInProgress.negate())
            }
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        if (editorService.activeEditorPane?.getId() !== NOTEBOOK_DIFF_EDITOR_ID) {
            return;
        }
        const editor = editorService.activeEditorPane.getControl();
        editor?.toggleInlineView();
    }
});
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'notebook',
    order: 100,
    type: 'object',
    'properties': {
        'notebook.diff.ignoreMetadata': {
            type: 'boolean',
            default: false,
            markdownDescription: localize('notebook.diff.ignoreMetadata', "Hide Metadata Differences")
        },
        'notebook.diff.ignoreOutputs': {
            type: 'boolean',
            default: false,
            markdownDescription: localize('notebook.diff.ignoreOutputs', "Hide Outputs Differences")
        },
        'notebook.diff.experimental.toggleInline': {
            type: 'boolean',
            default: typeof product.quality === 'string' && product.quality !== 'stable', // only enable as default in insiders
            markdownDescription: localize('notebook.diff.toggleInline', "Enable the command to toggle the experimental notebook inline diff editor.")
        },
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvbm90ZWJvb2tEaWZmQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQXdCLE1BQU0seURBQXlELENBQUM7QUFFL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFtRSw4QkFBOEIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzVJLE9BQU8sRUFBMkIsd0NBQXdDLEVBQUUsd0JBQXdCLEVBQUUsMkJBQTJCLEVBQUUsb0NBQW9DLEVBQUUsaUNBQWlDLEVBQUUsNkJBQTZCLEVBQUUsdUJBQXVCLEVBQUUsc0JBQXNCLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN6VyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN6SSxPQUFPLEVBQUUsY0FB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