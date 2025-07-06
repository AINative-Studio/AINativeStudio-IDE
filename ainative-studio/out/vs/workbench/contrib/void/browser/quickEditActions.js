/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tFZGl0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9xdWlja0VkaXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBRzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFtQnRGLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUVDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxxQkFBcUI7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsU0FBUyxDQUFDLHFCQUFxQixFQUFFLGtCQUFrQixDQUFDO1lBQzNELFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsaURBQTZCO2dCQUN0QyxNQUFNLDBDQUFnQztnQkFDdEMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxXQUFXLENBQUMsK0JBQStCLENBQUM7YUFDakU7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUVuQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDdEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxjQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVwQyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUNsRCxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU87UUFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLElBQUksQ0FBQyxLQUFLO1lBQUUsT0FBTztRQUNuQixNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQzlGLElBQUksQ0FBQyxTQUFTO1lBQUUsT0FBTztRQUd2QixNQUFNLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLEdBQUcsU0FBUyxDQUFBO1FBRXhFLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0RCxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzdELENBQUM7Q0FDRCxDQUFDLENBQUMifQ==