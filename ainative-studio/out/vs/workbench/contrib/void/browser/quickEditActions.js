/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { roundRangeToLines } from './sidebarActions.js';
import { VOID_CTRL_K_ACTION_ID } from './actionIDs.js';
import { localize2 } from '../../../../nls.js';
import { IMetricsService } from '../common/metricsService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_CTRL_K_ACTION_ID,
            f1: true,
            title: localize2('voidQuickEditAction', 'Void: Quick Edit'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
                when: ContextKeyExpr.deserialize('editorFocus && !terminalFocus'),
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(ICodeEditorService);
        const metricsService = accessor.get(IMetricsService);
        metricsService.capture('Ctrl+K', {});
        const editor = editorService.getActiveCodeEditor();
        if (!editor)
            return;
        const model = editor.getModel();
        if (!model)
            return;
        const selection = roundRangeToLines(editor.getSelection(), { emptySelectionBehavior: 'line' });
        if (!selection)
            return;
        const { startLineNumber: startLine, endLineNumber: endLine } = selection;
        const editCodeService = accessor.get(IEditCodeService);
        editCodeService.addCtrlKZone({ startLine, endLine, editor });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tFZGl0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvcXVpY2tFZGl0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUcxRixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBbUJ0RixlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFFQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUscUJBQXFCO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxrQkFBa0IsQ0FBQztZQUMzRCxVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLGlEQUE2QjtnQkFDdEMsTUFBTSwwQ0FBZ0M7Z0JBQ3RDLElBQUksRUFBRSxjQUFjLENBQUMsV0FBVyxDQUFDLCtCQUErQixDQUFDO2FBQ2pFO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFFbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDcEQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFcEMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDbEQsSUFBSSxDQUFDLE1BQU07WUFBRSxPQUFPO1FBQ3BCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMvQixJQUFJLENBQUMsS0FBSztZQUFFLE9BQU87UUFDbkIsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUM5RixJQUFJLENBQUMsU0FBUztZQUFFLE9BQU87UUFHdkIsTUFBTSxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLFNBQVMsQ0FBQTtRQUV4RSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEQsZUFBZSxDQUFDLFlBQVksQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0NBQ0QsQ0FBQyxDQUFDIn0=