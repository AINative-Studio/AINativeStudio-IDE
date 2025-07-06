/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { VOID_VIEW_CONTAINER_ID, VOID_VIEW_ID } from './sidebarPane.js';
import { IMetricsService } from '../common/metricsService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { VOID_TOGGLE_SETTINGS_ACTION_ID } from './voidSettingsPane.js';
import { VOID_CTRL_L_ACTION_ID } from './actionIDs.js';
import { localize2 } from '../../../../nls.js';
import { IChatThreadService } from './chatThreadService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
// ---------- Register commands and keybindings ----------
export const roundRangeToLines = (range, options) => {
    if (!range)
        return null;
    // treat as no selection if selection is empty
    if (range.endColumn === range.startColumn && range.endLineNumber === range.startLineNumber) {
        if (options.emptySelectionBehavior === 'null')
            return null;
        else if (options.emptySelectionBehavior === 'line')
            return { startLineNumber: range.startLineNumber, startColumn: 1, endLineNumber: range.startLineNumber, endColumn: 1 };
    }
    // IRange is 1-indexed
    const endLine = range.endColumn === 1 ? range.endLineNumber - 1 : range.endLineNumber; // e.g. if the user triple clicks, it selects column=0, line=line -> column=0, line=line+1
    const newRange = {
        startLineNumber: range.startLineNumber,
        startColumn: 1,
        endLineNumber: endLine,
        endColumn: Number.MAX_SAFE_INTEGER
    };
    return newRange;
};
// const getContentInRange = (model: ITextModel, range: IRange | null) => {
// 	if (!range)
// 		return null
// 	const content = model.getValueInRange(range)
// 	const trimmedContent = content
// 		.replace(/^\s*\n/g, '') // trim pure whitespace lines from start
// 		.replace(/\n\s*$/g, '') // trim pure whitespace lines from end
// 	return trimmedContent
// }
const VOID_OPEN_SIDEBAR_ACTION_ID = 'void.sidebar.open';
registerAction2(class extends Action2 {
    constructor() {
        super({ id: VOID_OPEN_SIDEBAR_ACTION_ID, title: localize2('voidOpenSidebar', 'Void: Open Sidebar'), f1: true });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const chatThreadsService = accessor.get(IChatThreadService);
        viewsService.openViewContainer(VOID_VIEW_CONTAINER_ID);
        await chatThreadsService.focusCurrentChat();
    }
});
// cmd L
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_CTRL_L_ACTION_ID,
            f1: true,
            title: localize2('voidCmdL', 'Void: Add Selection to Chat'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */,
                weight: 605 /* KeybindingWeight.VoidExtension */
            }
        });
    }
    async run(accessor) {
        // Get services
        const commandService = accessor.get(ICommandService);
        const viewsService = accessor.get(IViewsService);
        const metricsService = accessor.get(IMetricsService);
        const editorService = accessor.get(ICodeEditorService);
        const chatThreadService = accessor.get(IChatThreadService);
        metricsService.capture('Ctrl+L', {});
        // capture selection and model before opening the chat panel
        const editor = editorService.getActiveCodeEditor();
        const model = editor?.getModel();
        if (!model)
            return;
        const selectionRange = roundRangeToLines(editor?.getSelection(), { emptySelectionBehavior: 'null' });
        // open panel
        const wasAlreadyOpen = viewsService.isViewContainerVisible(VOID_VIEW_CONTAINER_ID);
        if (!wasAlreadyOpen) {
            await commandService.executeCommand(VOID_OPEN_SIDEBAR_ACTION_ID);
        }
        // Add selection to chat
        // add line selection
        if (selectionRange) {
            editor?.setSelection({
                startLineNumber: selectionRange.startLineNumber,
                endLineNumber: selectionRange.endLineNumber,
                startColumn: 1,
                endColumn: Number.MAX_SAFE_INTEGER
            });
            chatThreadService.addNewStagingSelection({
                type: 'CodeSelection',
                uri: model.uri,
                language: model.getLanguageId(),
                range: [selectionRange.startLineNumber, selectionRange.endLineNumber],
                state: { wasAddedAsCurrentFile: false },
            });
        }
        // add file
        else {
            chatThreadService.addNewStagingSelection({
                type: 'File',
                uri: model.uri,
                language: model.getLanguageId(),
                state: { wasAddedAsCurrentFile: false },
            });
        }
        await chatThreadService.focusCurrentChat();
    }
});
// New chat keybind + menu button
const VOID_CMD_SHIFT_L_ACTION_ID = 'void.cmdShiftL';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_CMD_SHIFT_L_ACTION_ID,
            title: 'New Chat',
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
            icon: { id: 'add' },
            menu: [{ id: MenuId.ViewTitle, group: 'navigation', when: ContextKeyExpr.equals('view', VOID_VIEW_ID), }],
        });
    }
    async run(accessor) {
        const metricsService = accessor.get(IMetricsService);
        const chatThreadsService = accessor.get(IChatThreadService);
        const editorService = accessor.get(ICodeEditorService);
        metricsService.capture('Chat Navigation', { type: 'Start New Chat' });
        // get current selections and value to transfer
        const oldThreadId = chatThreadsService.state.currentThreadId;
        const oldThread = chatThreadsService.state.allThreads[oldThreadId];
        const oldUI = await oldThread?.state.mountedInfo?.whenMounted;
        const oldSelns = oldThread?.state.stagingSelections;
        const oldVal = oldUI?.textAreaRef?.current?.value;
        // open and focus new thread
        chatThreadsService.openNewThread();
        await chatThreadsService.focusCurrentChat();
        // set new thread values
        const newThreadId = chatThreadsService.state.currentThreadId;
        const newThread = chatThreadsService.state.allThreads[newThreadId];
        const newUI = await newThread?.state.mountedInfo?.whenMounted;
        chatThreadsService.setCurrentThreadState({ stagingSelections: oldSelns, });
        if (newUI?.textAreaRef?.current && oldVal)
            newUI.textAreaRef.current.value = oldVal;
        // if has selection, add it
        const editor = editorService.getActiveCodeEditor();
        const model = editor?.getModel();
        if (!model)
            return;
        const selectionRange = roundRangeToLines(editor?.getSelection(), { emptySelectionBehavior: 'null' });
        if (!selectionRange)
            return;
        editor?.setSelection({ startLineNumber: selectionRange.startLineNumber, endLineNumber: selectionRange.endLineNumber, startColumn: 1, endColumn: Number.MAX_SAFE_INTEGER });
        chatThreadsService.addNewStagingSelection({
            type: 'CodeSelection',
            uri: model.uri,
            language: model.getLanguageId(),
            range: [selectionRange.startLineNumber, selectionRange.endLineNumber],
            state: { wasAddedAsCurrentFile: false },
        });
    }
});
// History menu button
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'void.historyAction',
            title: 'View Past Chats',
            icon: { id: 'history' },
            menu: [{ id: MenuId.ViewTitle, group: 'navigation', when: ContextKeyExpr.equals('view', VOID_VIEW_ID), }]
        });
    }
    async run(accessor) {
        // do not do anything if there are no messages (without this it clears all of the user's selections if the button is pressed)
        // TODO the history button should be disabled in this case so we can remove this logic
        const thread = accessor.get(IChatThreadService).getCurrentThread();
        if (thread.messages.length === 0) {
            return;
        }
        const metricsService = accessor.get(IMetricsService);
        const commandService = accessor.get(ICommandService);
        metricsService.capture('Chat Navigation', { type: 'History' });
        commandService.executeCommand(VOID_CMD_SHIFT_L_ACTION_ID);
    }
});
// Settings gear
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'void.settingsAction',
            title: `Void's Settings`,
            icon: { id: 'settings-gear' },
            menu: [{ id: MenuId.ViewTitle, group: 'navigation', when: ContextKeyExpr.equals('view', VOID_VIEW_ID), }]
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand(VOID_TOGGLE_SETTINGS_ACTION_ID);
    }
});
// export class TabSwitchListener extends Disposable {
// 	constructor(
// 		onSwitchTab: () => void,
// 		@ICodeEditorService private readonly _editorService: ICodeEditorService,
// 	) {
// 		super()
// 		// when editor switches tabs (models)
// 		const addTabSwitchListeners = (editor: ICodeEditor) => {
// 			this._register(editor.onDidChangeModel(e => {
// 				if (e.newModelUrl?.scheme !== 'file') return
// 				onSwitchTab()
// 			}))
// 		}
// 		const initializeEditor = (editor: ICodeEditor) => {
// 			addTabSwitchListeners(editor)
// 		}
// 		// initialize current editors + any new editors
// 		for (let editor of this._editorService.listCodeEditors()) initializeEditor(editor)
// 		this._register(this._editorService.onCodeEditorAdd(editor => { initializeEditor(editor) }))
// 	}
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvc2lkZWJhckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFLMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFJbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsMERBQTBEO0FBRzFELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsS0FBZ0MsRUFBRSxPQUFvRCxFQUFFLEVBQUU7SUFDM0gsSUFBSSxDQUFDLEtBQUs7UUFDVCxPQUFPLElBQUksQ0FBQTtJQUVaLDhDQUE4QztJQUM5QyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsYUFBYSxLQUFLLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUM1RixJQUFJLE9BQU8sQ0FBQyxzQkFBc0IsS0FBSyxNQUFNO1lBQzVDLE9BQU8sSUFBSSxDQUFBO2FBQ1AsSUFBSSxPQUFPLENBQUMsc0JBQXNCLEtBQUssTUFBTTtZQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUE7SUFDdkgsQ0FBQztJQUVELHNCQUFzQjtJQUN0QixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUEsQ0FBQywwRkFBMEY7SUFDaEwsTUFBTSxRQUFRLEdBQVc7UUFDeEIsZUFBZSxFQUFFLEtBQUssQ0FBQyxlQUFlO1FBQ3RDLFdBQVcsRUFBRSxDQUFDO1FBQ2QsYUFBYSxFQUFFLE9BQU87UUFDdEIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7S0FDbEMsQ0FBQTtJQUNELE9BQU8sUUFBUSxDQUFBO0FBQ2hCLENBQUMsQ0FBQTtBQUVELDJFQUEyRTtBQUMzRSxlQUFlO0FBQ2YsZ0JBQWdCO0FBQ2hCLGdEQUFnRDtBQUNoRCxrQ0FBa0M7QUFDbEMscUVBQXFFO0FBQ3JFLG1FQUFtRTtBQUNuRSx5QkFBeUI7QUFDekIsSUFBSTtBQUlKLE1BQU0sMkJBQTJCLEdBQUcsbUJBQW1CLENBQUE7QUFDdkQsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLDJCQUEyQixFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNqSCxDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzNELFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtJQUM1QyxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBR0YsUUFBUTtBQUNSLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxxQkFBcUI7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSw2QkFBNkIsQ0FBQztZQUMzRCxVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLGlEQUE2QjtnQkFDdEMsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxlQUFlO1FBQ2YsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDcEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRTFELGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXBDLDREQUE0RDtRQUM1RCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUNsRCxNQUFNLEtBQUssR0FBRyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFNO1FBRWxCLE1BQU0sY0FBYyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsRUFBRSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFFcEcsYUFBYTtRQUNiLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ2xGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUNqRSxDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLHFCQUFxQjtRQUNyQixJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sRUFBRSxZQUFZLENBQUM7Z0JBQ3BCLGVBQWUsRUFBRSxjQUFjLENBQUMsZUFBZTtnQkFDL0MsYUFBYSxFQUFFLGNBQWMsQ0FBQyxhQUFhO2dCQUMzQyxXQUFXLEVBQUUsQ0FBQztnQkFDZCxTQUFTLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjthQUNsQyxDQUFDLENBQUE7WUFDRixpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDeEMsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztnQkFDZCxRQUFRLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRTtnQkFDL0IsS0FBSyxFQUFFLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsYUFBYSxDQUFDO2dCQUNyRSxLQUFLLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxLQUFLLEVBQUU7YUFDdkMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELFdBQVc7YUFDTixDQUFDO1lBQ0wsaUJBQWlCLENBQUMsc0JBQXNCLENBQUM7Z0JBQ3hDLElBQUksRUFBRSxNQUFNO2dCQUNaLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztnQkFDZCxRQUFRLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRTtnQkFDL0IsS0FBSyxFQUFFLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxFQUFFO2FBQ3ZDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxNQUFNLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLENBQUE7SUFDM0MsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUdGLGlDQUFpQztBQUNqQyxNQUFNLDBCQUEwQixHQUFHLGdCQUFnQixDQUFBO0FBQ25ELGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQkFBMEI7WUFDOUIsS0FBSyxFQUFFLFVBQVU7WUFDakIsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxtREFBNkIsd0JBQWU7Z0JBQ3JELE1BQU0sMENBQWdDO2FBQ3RDO1lBQ0QsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRTtZQUNuQixJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxHQUFHLENBQUM7U0FDekcsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFFbkMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMzRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDdEQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7UUFFckUsK0NBQStDO1FBQy9DLE1BQU0sV0FBVyxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUE7UUFDNUQsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUVsRSxNQUFNLEtBQUssR0FBRyxNQUFNLFNBQVMsRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQTtRQUU3RCxNQUFNLFFBQVEsR0FBRyxTQUFTLEVBQUUsS0FBSyxDQUFDLGlCQUFpQixDQUFBO1FBQ25ELE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQTtRQUVqRCw0QkFBNEI7UUFDNUIsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDbEMsTUFBTSxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBRzNDLHdCQUF3QjtRQUN4QixNQUFNLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFBO1FBQzVELE1BQU0sU0FBUyxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFbEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxTQUFTLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUE7UUFDN0Qsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFBO1FBQzFFLElBQUksS0FBSyxFQUFFLFdBQVcsRUFBRSxPQUFPLElBQUksTUFBTTtZQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUE7UUFHbkYsMkJBQTJCO1FBQzNCLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ2xELE1BQU0sS0FBSyxHQUFHLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU07UUFDbEIsTUFBTSxjQUFjLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxFQUFFLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUNwRyxJQUFJLENBQUMsY0FBYztZQUFFLE9BQU07UUFDM0IsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFLGVBQWUsRUFBRSxjQUFjLENBQUMsZUFBZSxFQUFFLGFBQWEsRUFBRSxjQUFjLENBQUMsYUFBYSxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7UUFDMUssa0JBQWtCLENBQUMsc0JBQXNCLENBQUM7WUFDekMsSUFBSSxFQUFFLGVBQWU7WUFDckIsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHO1lBQ2QsUUFBUSxFQUFFLEtBQUssQ0FBQyxhQUFhLEVBQUU7WUFDL0IsS0FBSyxFQUFFLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsYUFBYSxDQUFDO1lBQ3JFLEtBQUssRUFBRSxFQUFFLHFCQUFxQixFQUFFLEtBQUssRUFBRTtTQUN2QyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsc0JBQXNCO0FBQ3RCLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxvQkFBb0I7WUFDeEIsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFO1lBQ3ZCLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQztTQUN6RyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUVuQyw2SEFBNkg7UUFDN0gsc0ZBQXNGO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ2xFLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRXBELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFcEQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBQzlELGNBQWMsQ0FBQyxjQUFjLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtJQUUxRCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBR0YsZ0JBQWdCO0FBQ2hCLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxxQkFBcUI7WUFDekIsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFO1lBQzdCLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQztTQUN6RyxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BELGNBQWMsQ0FBQyxjQUFjLENBQUMsOEJBQThCLENBQUMsQ0FBQTtJQUM5RCxDQUFDO0NBQ0QsQ0FBQyxDQUFBO0FBS0Ysc0RBQXNEO0FBRXRELGdCQUFnQjtBQUNoQiw2QkFBNkI7QUFDN0IsNkVBQTZFO0FBQzdFLE9BQU87QUFDUCxZQUFZO0FBRVosMENBQTBDO0FBQzFDLDZEQUE2RDtBQUM3RCxtREFBbUQ7QUFDbkQsbURBQW1EO0FBQ25ELG9CQUFvQjtBQUNwQixTQUFTO0FBQ1QsTUFBTTtBQUVOLHdEQUF3RDtBQUN4RCxtQ0FBbUM7QUFDbkMsTUFBTTtBQUVOLG9EQUFvRDtBQUNwRCx1RkFBdUY7QUFDdkYsZ0dBQWdHO0FBQ2hHLEtBQUs7QUFDTCxJQUFJIn0=