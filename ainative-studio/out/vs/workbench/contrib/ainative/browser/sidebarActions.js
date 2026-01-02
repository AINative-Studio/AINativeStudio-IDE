/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { AINATIVE_VIEW_CONTAINER_ID, AINATIVE_VIEW_ID } from './sidebarPane.js';
import { IMetricsService } from '../common/metricsService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { AINATIVE_TOGGLE_SETTINGS_ACTION_ID } from './ainativeSettingsPane.js';
import { AINATIVE_CTRL_L_ACTION_ID } from './actionIDs.js';
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
const AINATIVE_OPEN_SIDEBAR_ACTION_ID = 'void.sidebar.open';
registerAction2(class extends Action2 {
    constructor() {
        super({ id: AINATIVE_OPEN_SIDEBAR_ACTION_ID, title: localize2('voidOpenSidebar', 'AINative Studio: Open Sidebar'), f1: true });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const chatThreadsService = accessor.get(IChatThreadService);
        viewsService.openViewContainer(AINATIVE_VIEW_CONTAINER_ID);
        await chatThreadsService.focusCurrentChat();
    }
});
// cmd L
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_CTRL_L_ACTION_ID,
            f1: true,
            title: localize2('voidCmdL', 'AINative Studio: Add Selection to Chat'),
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
        const wasAlreadyOpen = viewsService.isViewContainerVisible(AINATIVE_VIEW_CONTAINER_ID);
        if (!wasAlreadyOpen) {
            await commandService.executeCommand(AINATIVE_OPEN_SIDEBAR_ACTION_ID);
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
const AINATIVE_CMD_SHIFT_L_ACTION_ID = 'void.cmdShiftL';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_CMD_SHIFT_L_ACTION_ID,
            title: 'New Chat',
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
            icon: { id: 'add' },
            menu: [{ id: MenuId.ViewTitle, group: 'navigation', when: ContextKeyExpr.equals('view', AINATIVE_VIEW_ID), }],
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
            menu: [{ id: MenuId.ViewTitle, group: 'navigation', when: ContextKeyExpr.equals('view', AINATIVE_VIEW_ID), }]
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
        commandService.executeCommand(AINATIVE_CMD_SHIFT_L_ACTION_ID);
    }
});
// Settings gear
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'void.settingsAction',
            title: `AINative Studio Settings`,
            icon: { id: 'settings-gear' },
            menu: [{ id: MenuId.ViewTitle, group: 'navigation', when: ContextKeyExpr.equals('view', AINATIVE_VIEW_ID), }]
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand(AINATIVE_TOGGLE_SETTINGS_ACTION_ID);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvc2lkZWJhckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFLMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFJbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDL0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDM0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUvRSwwREFBMEQ7QUFHMUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxLQUFnQyxFQUFFLE9BQW9ELEVBQUUsRUFBRTtJQUMzSCxJQUFJLENBQUMsS0FBSztRQUNULE9BQU8sSUFBSSxDQUFBO0lBRVosOENBQThDO0lBQzlDLElBQUksS0FBSyxDQUFDLFNBQVMs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