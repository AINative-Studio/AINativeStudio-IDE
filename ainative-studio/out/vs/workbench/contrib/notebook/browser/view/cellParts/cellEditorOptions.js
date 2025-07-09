/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../base/common/event.js';
import { localize, localize2 } from '../../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { ActiveEditorContext } from '../../../../../common/contextkeys.js';
import { NotebookMultiCellAction, NOTEBOOK_ACTIONS_CATEGORY } from '../../controller/coreActions.js';
import { NOTEBOOK_CELL_LINE_NUMBERS, NOTEBOOK_EDITOR_FOCUSED } from '../../../common/notebookContextKeys.js';
import { CellContentPart } from '../cellPart.js';
import { NOTEBOOK_EDITOR_ID } from '../../../common/notebookCommon.js';
//todo@Yoyokrazy implenets is needed or not?
export class CellEditorOptions extends CellContentPart {
    set tabSize(value) {
        if (this._tabSize !== value) {
            this._tabSize = value;
            this._onDidChange.fire();
        }
    }
    get tabSize() {
        return this._tabSize;
    }
    set indentSize(value) {
        if (this._indentSize !== value) {
            this._indentSize = value;
            this._onDidChange.fire();
        }
    }
    get indentSize() {
        return this._indentSize;
    }
    set insertSpaces(value) {
        if (this._insertSpaces !== value) {
            this._insertSpaces = value;
            this._onDidChange.fire();
        }
    }
    get insertSpaces() {
        return this._insertSpaces;
    }
    constructor(base, notebookOptions, configurationService) {
        super();
        this.base = base;
        this.notebookOptions = notebookOptions;
        this.configurationService = configurationService;
        this._lineNumbers = 'inherit';
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(base.onDidChange(() => {
            this._recomputeOptions();
        }));
        this._value = this._computeEditorOptions();
    }
    updateState(element, e) {
        if (e.cellLineNumberChanged) {
            this.setLineNumbers(element.lineNumbers);
        }
    }
    _recomputeOptions() {
        this._value = this._computeEditorOptions();
        this._onDidChange.fire();
    }
    _computeEditorOptions() {
        const value = this.base.value; // base IEditorOptions
        // TODO @Yoyokrazy find a different way to get the editor overrides, this is not the right way
        const cellEditorOverridesRaw = this.notebookOptions.getDisplayOptions().editorOptionsCustomizations;
        const indentSize = cellEditorOverridesRaw?.['editor.indentSize'];
        if (indentSize !== undefined) {
            this.indentSize = indentSize;
        }
        const insertSpaces = cellEditorOverridesRaw?.['editor.insertSpaces'];
        if (insertSpaces !== undefined) {
            this.insertSpaces = insertSpaces;
        }
        const tabSize = cellEditorOverridesRaw?.['editor.tabSize'];
        if (tabSize !== undefined) {
            this.tabSize = tabSize;
        }
        let cellRenderLineNumber = value.lineNumbers;
        switch (this._lineNumbers) {
            case 'inherit':
                // inherit from the notebook setting
                if (this.configurationService.getValue('notebook.lineNumbers') === 'on') {
                    if (value.lineNumbers === 'off') {
                        cellRenderLineNumber = 'on';
                    } // otherwise just use the editor setting
                }
                else {
                    cellRenderLineNumber = 'off';
                }
                break;
            case 'on':
                // should turn on, ignore the editor line numbers off options
                if (value.lineNumbers === 'off') {
                    cellRenderLineNumber = 'on';
                } // otherwise just use the editor setting
                break;
            case 'off':
                cellRenderLineNumber = 'off';
                break;
        }
        const overrides = {};
        if (value.lineNumbers !== cellRenderLineNumber) {
            overrides.lineNumbers = cellRenderLineNumber;
        }
        if (this.notebookOptions.getLayoutConfiguration().disableRulers) {
            overrides.rulers = [];
        }
        return {
            ...value,
            ...overrides,
        };
    }
    getUpdatedValue(internalMetadata, cellUri) {
        const options = this.getValue(internalMetadata, cellUri);
        delete options.hover; // This is toggled by a debug editor contribution
        return options;
    }
    getValue(internalMetadata, cellUri) {
        return {
            ...this._value,
            ...{
                padding: this.notebookOptions.computeEditorPadding(internalMetadata, cellUri)
            }
        };
    }
    getDefaultValue() {
        return {
            ...this._value,
            ...{
                padding: { top: 12, bottom: 12 }
            }
        };
    }
    setLineNumbers(lineNumbers) {
        this._lineNumbers = lineNumbers;
        this._recomputeOptions();
    }
}
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'notebook',
    order: 100,
    type: 'object',
    'properties': {
        'notebook.lineNumbers': {
            type: 'string',
            enum: ['off', 'on'],
            default: 'off',
            markdownDescription: localize('notebook.lineNumbers', "Controls the display of line numbers in the cell editor.")
        }
    }
});
registerAction2(class ToggleLineNumberAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.toggleLineNumbers',
            title: localize2('notebook.toggleLineNumbers', 'Toggle Notebook Line Numbers'),
            precondition: NOTEBOOK_EDITOR_FOCUSED,
            menu: [
                {
                    id: MenuId.NotebookToolbar,
                    group: 'notebookLayout',
                    order: 2,
                    when: ContextKeyExpr.equals('config.notebook.globalToolbar', true)
                }
            ],
            category: NOTEBOOK_ACTIONS_CATEGORY,
            f1: true,
            toggled: {
                condition: ContextKeyExpr.notEquals('config.notebook.lineNumbers', 'off'),
                title: localize('notebook.showLineNumbers', "Notebook Line Numbers"),
            }
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const renderLiNumbers = configurationService.getValue('notebook.lineNumbers') === 'on';
        if (renderLiNumbers) {
            configurationService.updateValue('notebook.lineNumbers', 'off');
        }
        else {
            configurationService.updateValue('notebook.lineNumbers', 'on');
        }
    }
});
registerAction2(class ToggleActiveLineNumberAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: 'notebook.cell.toggleLineNumbers',
            title: localize('notebook.cell.toggleLineNumbers.title', "Show Cell Line Numbers"),
            precondition: ActiveEditorContext.isEqualTo(NOTEBOOK_EDITOR_ID),
            menu: [{
                    id: MenuId.NotebookCellTitle,
                    group: 'View',
                    order: 1
                }],
            toggled: ContextKeyExpr.or(NOTEBOOK_CELL_LINE_NUMBERS.isEqualTo('on'), ContextKeyExpr.and(NOTEBOOK_CELL_LINE_NUMBERS.isEqualTo('inherit'), ContextKeyExpr.equals('config.notebook.lineNumbers', 'on')))
        });
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            this.updateCell(accessor.get(IConfigurationService), context.cell);
        }
        else {
            const configurationService = accessor.get(IConfigurationService);
            context.selectedCells.forEach(cell => {
                this.updateCell(configurationService, cell);
            });
        }
    }
    updateCell(configurationService, cell) {
        const renderLineNumbers = configurationService.getValue('notebook.lineNumbers') === 'on';
        const cellLineNumbers = cell.lineNumbers;
        // 'on', 'inherit' 	-> 'on'
        // 'on', 'off'		-> 'off'
        // 'on', 'on'		-> 'on'
        // 'off', 'inherit'	-> 'off'
        // 'off', 'off'		-> 'off'
        // 'off', 'on'		-> 'on'
        const currentLineNumberIsOn = cellLineNumbers === 'on' || (cellLineNumbers === 'inherit' && renderLineNumbers);
        if (currentLineNumberIsOn) {
            cell.lineNumbers = 'off';
        }
        else {
            cell.lineNumbers = 'on';
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXRvck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsRWRpdG9yT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sd0NBQXdDLENBQUM7QUFHeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsVUFBVSxJQUFJLHVCQUF1QixFQUEwQixNQUFNLDBFQUEwRSxDQUFDO0FBQ3pKLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0UsT0FBTyxFQUE4RCx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWpLLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNqRCxPQUFPLEVBQWdDLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFLckcsNENBQTRDO0FBQzVDLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxlQUFlO0lBTXJELElBQUks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