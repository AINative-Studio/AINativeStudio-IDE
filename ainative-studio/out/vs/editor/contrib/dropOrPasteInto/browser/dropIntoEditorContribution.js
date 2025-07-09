/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorCommand, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { DefaultDropProvidersFeature } from './defaultProviders.js';
import { DropIntoEditorController, changeDropTypeCommandId, dropWidgetVisibleCtx } from './dropIntoEditorController.js';
registerEditorContribution(DropIntoEditorController.ID, DropIntoEditorController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorFeature(DefaultDropProvidersFeature);
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: changeDropTypeCommandId,
            precondition: dropWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
            }
        });
    }
    runEditorCommand(_accessor, editor, _args) {
        DropIntoEditorController.get(editor)?.changeDropType();
    }
});
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.hideDropWidget',
            precondition: dropWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            }
        });
    }
    runEditorCommand(_accessor, editor, _args) {
        DropIntoEditorController.get(editor)?.clearWidgets();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcEludG9FZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZHJvcE9yUGFzdGVJbnRvL2Jyb3dzZXIvZHJvcEludG9FZGl0b3JDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLGFBQWEsRUFBcUQscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzSyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsdUJBQXVCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV4SCwwQkFBMEIsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUUsd0JBQXdCLGlFQUF5RCxDQUFDO0FBQzFJLHFCQUFxQixDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFbkQscUJBQXFCLENBQUMsSUFBSSxLQUFNLFNBQVEsYUFBYTtJQUNwRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1QkFBdUI7WUFDM0IsWUFBWSxFQUFFLG9CQUFvQjtZQUNsQyxNQUFNLEVBQUU7Z0JBQ1AsTUFBTSwwQ0FBZ0M7Z0JBQ3RDLE9BQU8sRUFBRSxtREFBK0I7YUFDeEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRWUsZ0JBQWdCLENBQUMsU0FBa0MsRUFBRSxNQUFtQixFQUFFLEtBQVU7UUFDbkcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLGNBQWMsRUFBRSxDQUFDO0lBQ3hELENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxxQkFBcUIsQ0FBQyxJQUFJLEtBQU0sU0FBUSxhQUFhO0lBQ3BEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVCQUF1QjtZQUMzQixZQUFZLEVBQUUsb0JBQW9CO1lBQ2xDLE1BQU0sRUFBRTtnQkFDUCxNQUFNLDBDQUFnQztnQkFDdEMsT0FBTyx3QkFBZ0I7YUFDdkI7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRWUsZ0JBQWdCLENBQUMsU0FBa0MsRUFBRSxNQUFtQixFQUFFLEtBQVU7UUFDbkcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDO0lBQ3RELENBQUM7Q0FDRCxDQUFDLENBQUMifQ==