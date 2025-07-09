/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from './coreActions.js';
import { getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
import { INotebookEditorService } from '../services/notebookEditorService.js';
import { NotebookSetting } from '../../common/notebookCommon.js';
import { NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR } from '../../common/notebookContextKeys.js';
import { INotebookService } from '../../common/notebookService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
registerAction2(class NotebookConfigureLayoutAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.select',
            title: localize2('workbench.notebook.layout.select.label', "Select between Notebook Layouts"),
            f1: true,
            precondition: ContextKeyExpr.equals(`config.${NotebookSetting.openGettingStarted}`, true),
            category: NOTEBOOK_ACTIONS_CATEGORY,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    group: 'notebookLayout',
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true), ContextKeyExpr.equals(`config.${NotebookSetting.openGettingStarted}`, true)),
                    order: 0
                },
                {
                    id: MenuId.NotebookToolbar,
                    group: 'notebookLayout',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.globalToolbar', true), ContextKeyExpr.equals(`config.${NotebookSetting.openGettingStarted}`, true)),
                    order: 0
                }
            ]
        });
    }
    run(accessor) {
        accessor.get(ICommandService).executeCommand('workbench.action.openWalkthrough', { category: 'notebooks', step: 'notebookProfile' }, true);
    }
});
registerAction2(class NotebookConfigureLayoutAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.configure',
            title: localize2('workbench.notebook.layout.configure.label', "Customize Notebook Layout"),
            f1: true,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            menu: [
                {
                    id: MenuId.NotebookToolbar,
                    group: 'notebookLayout',
                    when: ContextKeyExpr.equals('config.notebook.globalToolbar', true),
                    order: 1
                }
            ]
        });
    }
    run(accessor) {
        accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: '@tag:notebookLayout' });
    }
});
registerAction2(class NotebookConfigureLayoutFromEditorTitle extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.configure.editorTitle',
            title: localize2('workbench.notebook.layout.configure.label', "Customize Notebook Layout"),
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            menu: [
                {
                    id: MenuId.NotebookEditorLayoutConfigure,
                    group: 'notebookLayout',
                    when: NOTEBOOK_IS_ACTIVE_EDITOR,
                    order: 1
                }
            ]
        });
    }
    run(accessor) {
        accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: '@tag:notebookLayout' });
    }
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    submenu: MenuId.NotebookEditorLayoutConfigure,
    rememberDefaultAction: false,
    title: localize2('customizeNotebook', "Customize Notebook..."),
    icon: Codicon.gear,
    group: 'navigation',
    order: -1,
    when: NOTEBOOK_IS_ACTIVE_EDITOR
});
registerAction2(class ToggleLineNumberFromEditorTitle extends Action2 {
    constructor() {
        super({
            id: 'notebook.toggleLineNumbersFromEditorTitle',
            title: localize2('notebook.toggleLineNumbers', 'Toggle Notebook Line Numbers'),
            precondition: NOTEBOOK_EDITOR_FOCUSED,
            menu: [
                {
                    id: MenuId.NotebookEditorLayoutConfigure,
                    group: 'notebookLayoutDetails',
                    order: 1,
                    when: NOTEBOOK_IS_ACTIVE_EDITOR
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
        return accessor.get(ICommandService).executeCommand('notebook.toggleLineNumbers');
    }
});
registerAction2(class ToggleCellToolbarPositionFromEditorTitle extends Action2 {
    constructor() {
        super({
            id: 'notebook.toggleCellToolbarPositionFromEditorTitle',
            title: localize2('notebook.toggleCellToolbarPosition', 'Toggle Cell Toolbar Position'),
            menu: [{
                    id: MenuId.NotebookEditorLayoutConfigure,
                    group: 'notebookLayoutDetails',
                    order: 3
                }],
            category: NOTEBOOK_ACTIONS_CATEGORY,
            f1: false
        });
    }
    async run(accessor, ...args) {
        return accessor.get(ICommandService).executeCommand('notebook.toggleCellToolbarPosition', ...args);
    }
});
registerAction2(class ToggleBreadcrumbFromEditorTitle extends Action2 {
    constructor() {
        super({
            id: 'breadcrumbs.toggleFromEditorTitle',
            title: localize2('notebook.toggleBreadcrumb', 'Toggle Breadcrumbs'),
            menu: [{
                    id: MenuId.NotebookEditorLayoutConfigure,
                    group: 'notebookLayoutDetails',
                    order: 2
                }],
            f1: false
        });
    }
    async run(accessor) {
        return accessor.get(ICommandService).executeCommand('breadcrumbs.toggle');
    }
});
registerAction2(class SaveMimeTypeDisplayOrder extends Action2 {
    constructor() {
        super({
            id: 'notebook.saveMimeTypeOrder',
            title: localize2('notebook.saveMimeTypeOrder', "Save Mimetype Display Order"),
            f1: true,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
        });
    }
    run(accessor) {
        const service = accessor.get(INotebookService);
        const disposables = new DisposableStore();
        const qp = disposables.add(accessor.get(IQuickInputService).createQuickPick());
        qp.placeholder = localize('notebook.placeholder', 'Settings file to save in');
        qp.items = [
            { target: 2 /* ConfigurationTarget.USER */, label: localize('saveTarget.machine', 'User Settings') },
            { target: 5 /* ConfigurationTarget.WORKSPACE */, label: localize('saveTarget.workspace', 'Workspace Settings') },
        ];
        disposables.add(qp.onDidAccept(() => {
            const target = qp.selectedItems[0]?.target;
            if (target !== undefined) {
                service.saveMimeDisplayOrder(target);
            }
            qp.dispose();
        }));
        disposables.add(qp.onDidHide(() => disposables.dispose()));
        qp.show();
    }
});
registerAction2(class NotebookWebviewResetAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.notebook.layout.webview.reset',
            title: localize2('workbench.notebook.layout.webview.reset.label', "Reset Notebook Webview"),
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY
        });
    }
    run(accessor, args) {
        const editorService = accessor.get(IEditorService);
        if (args) {
            const uri = URI.revive(args);
            const notebookEditorService = accessor.get(INotebookEditorService);
            const widgets = notebookEditorService.listNotebookEditors().filter(widget => widget.hasModel() && widget.textModel.uri.toString() === uri.toString());
            for (const widget of widgets) {
                if (widget.hasModel()) {
                    widget.getInnerWebview()?.reload();
                }
            }
        }
        else {
            const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
            if (!editor) {
                return;
            }
            editor.getInnerWebview()?.reload();
        }
    }
});
registerAction2(class ToggleNotebookStickyScroll extends Action2 {
    constructor() {
        super({
            id: 'notebook.action.toggleNotebookStickyScroll',
            title: {
                ...localize2('toggleStickyScroll', "Toggle Notebook Sticky Scroll"),
                mnemonicTitle: localize({ key: 'mitoggleNotebookStickyScroll', comment: ['&& denotes a mnemonic'] }, "&&Toggle Notebook Sticky Scroll"),
            },
            category: Categories.View,
            toggled: {
                condition: ContextKeyExpr.equals('config.notebook.stickyScroll.enabled', true),
                title: localize('notebookStickyScroll', "Toggle Notebook Sticky Scroll"),
                mnemonicTitle: localize({ key: 'mitoggleNotebookStickyScroll', comment: ['&& denotes a mnemonic'] }, "&&Toggle Notebook Sticky Scroll"),
            },
            menu: [
                { id: MenuId.CommandPalette },
                { id: MenuId.NotebookStickyScrollContext, group: 'notebookView', order: 2 },
                { id: MenuId.NotebookToolbarContext, group: 'notebookView', order: 2 }
            ]
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('notebook.stickyScroll.enabled');
        return configurationService.updateValue('notebook.stickyScroll.enabled', newValue);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvbGF5b3V0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDM0gsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSx5REFBeUQsQ0FBQztBQUM3RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FB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