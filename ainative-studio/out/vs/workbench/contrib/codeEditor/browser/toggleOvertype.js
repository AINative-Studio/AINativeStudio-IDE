/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { InputMode } from '../../../../editor/common/inputMode.js';
export class ToggleOvertypeInsertMode extends Action2 {
    constructor() {
        super({
            id: 'editor.action.toggleOvertypeInsertMode',
            title: {
                ...localize2('toggleOvertypeInsertMode', "Toggle Overtype/Insert Mode"),
                mnemonicTitle: localize({ key: 'mitoggleOvertypeInsertMode', comment: ['&& denotes a mnemonic'] }, "&&Toggle Overtype/Insert Mode"),
            },
            metadata: {
                description: localize2('toggleOvertypeMode.description', "Toggle between overtype and insert mode"),
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 19 /* KeyCode.Insert */,
                mac: { primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */ },
            },
            f1: true,
            category: Categories.View
        });
    }
    async run(accessor) {
        const oldInputMode = InputMode.getInputMode();
        const newInputMode = oldInputMode === 'insert' ? 'overtype' : 'insert';
        InputMode.setInputMode(newInputMode);
    }
}
registerAction2(ToggleOvertypeInsertMode);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlT3ZlcnR5cGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3RvZ2dsZU92ZXJ0eXBlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFJMUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRW5FLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxPQUFPO0lBRXBEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHdDQUF3QztZQUM1QyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsNkJBQTZCLENBQUM7Z0JBQ3ZFLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsNEJBQTRCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLCtCQUErQixDQUFDO2FBQ25JO1lBQ0QsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxTQUFTLENBQUMsZ0NBQWdDLEVBQUUseUNBQXlDLENBQUM7YUFDbkc7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsTUFBTSw2Q0FBbUM7Z0JBQ3pDLE9BQU8seUJBQWdCO2dCQUN2QixHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsZ0RBQTJCLHdCQUFlLEVBQUU7YUFDNUQ7WUFDRCxFQUFFLEVBQUUsSUFBSTtZQUNSLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUM1QyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDOUMsTUFBTSxZQUFZLEdBQUcsWUFBWSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDdkUsU0FBUyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN0QyxDQUFDO0NBQ0Q7QUFFRCxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyJ9