/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3NpZGViYXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBSzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBSWxHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUU5RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRS9FLDBEQUEwRDtBQUcxRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLEtBQWdDLEVBQUUsT0FBb0QsRUFBRSxFQUFFO0lBQzNILElBQUksQ0FBQyxLQUFLO1FBQ1QsT0FBTyxJQUFJLENBQUE7SUFFWiw4Q0FBOEM7SUFDOUMsSUFBSSxLQUFLLENBQUMsU0FBUyxLQUFLLEtB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