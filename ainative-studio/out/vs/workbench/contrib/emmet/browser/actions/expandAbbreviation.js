/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../../nls.js';
import { EmmetEditorAction } from '../emmetActions.js';
import { registerEditorAction } from '../../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
class ExpandAbbreviationAction extends EmmetEditorAction {
    constructor() {
        super({
            id: 'editor.emmet.action.expandAbbreviation',
            label: nls.localize2('expandAbbreviationAction', "Emmet: Expand Abbreviation"),
            precondition: EditorContextKeys.writable,
            actionName: 'expand_abbreviation',
            kbOpts: {
                primary: 2 /* KeyCode.Tab */,
                kbExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EditorContextKeys.tabDoesNotMoveFocus, ContextKeyExpr.has('config.emmet.triggerExpansionOnTab')),
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarEditMenu,
                group: '5_insert',
                title: nls.localize({ key: 'miEmmetExpandAbbreviation', comment: ['&& denotes a mnemonic'] }, "Emmet: E&&xpand Abbreviation"),
                order: 3
            }
        });
    }
}
registerEditorAction(ExpandAbbreviationAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwYW5kQWJicmV2aWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VtbWV0L2Jyb3dzZXIvYWN0aW9ucy9leHBhbmRBYmJyZXZpYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUV0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFFekYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRTNFLE1BQU0sd0JBQXlCLFNBQVEsaUJBQWlCO0lBRXZEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHdDQUF3QztZQUM1QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSw0QkFBNEIsQ0FBQztZQUM5RSxZQUFZLEVBQUUsaUJBQWlCLENBQUMsUUFBUTtZQUN4QyxVQUFVLEVBQUUscUJBQXFCO1lBQ2pDLE1BQU0sRUFBRTtnQkFDUCxPQUFPLHFCQUFhO2dCQUNwQixNQUFNLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDekIsaUJBQWlCLENBQUMsZUFBZSxFQUNqQyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFDckMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUN4RDtnQkFDRCxNQUFNLDBDQUFnQzthQUN0QztZQUNELFFBQVEsRUFBRTtnQkFDVCxNQUFNLEVBQUUsTUFBTSxDQUFDLGVBQWU7Z0JBQzlCLEtBQUssRUFBRSxVQUFVO2dCQUNqQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSwyQkFBMkIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsOEJBQThCLENBQUM7Z0JBQzdILEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUM7SUFFSixDQUFDO0NBQ0Q7QUFFRCxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDIn0=