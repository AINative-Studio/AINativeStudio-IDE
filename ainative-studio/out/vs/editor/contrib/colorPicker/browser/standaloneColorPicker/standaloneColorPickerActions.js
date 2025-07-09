/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, EditorAction2 } from '../../../../browser/editorExtensions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { EditorContextKeys } from '../../../../common/editorContextKeys.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { StandaloneColorPickerController } from './standaloneColorPickerController.js';
export class ShowOrFocusStandaloneColorPicker extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.showOrFocusStandaloneColorPicker',
            title: {
                ...localize2('showOrFocusStandaloneColorPicker', "Show or Focus Standalone Color Picker"),
                mnemonicTitle: localize({ key: 'mishowOrFocusStandaloneColorPicker', comment: ['&& denotes a mnemonic'] }, "&&Show or Focus Standalone Color Picker"),
            },
            precondition: undefined,
            menu: [
                { id: MenuId.CommandPalette },
            ],
            metadata: {
                description: localize2('showOrFocusStandaloneColorPickerDescription', "Show or focus a standalone color picker which uses the default color provider. It displays hex/rgb/hsl colors."),
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        StandaloneColorPickerController.get(editor)?.showOrFocus();
    }
}
export class HideStandaloneColorPicker extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.hideColorPicker',
            label: localize2({
                key: 'hideColorPicker',
                comment: [
                    'Action that hides the color picker'
                ]
            }, "Hide the Color Picker"),
            precondition: EditorContextKeys.standaloneColorPickerVisible.isEqualTo(true),
            kbOpts: {
                primary: 9 /* KeyCode.Escape */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            metadata: {
                description: localize2('hideColorPickerDescription', "Hide the standalone color picker."),
            }
        });
    }
    run(_accessor, editor) {
        StandaloneColorPickerController.get(editor)?.hide();
    }
}
export class InsertColorWithStandaloneColorPicker extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertColorWithStandaloneColorPicker',
            label: localize2({
                key: 'insertColorWithStandaloneColorPicker',
                comment: [
                    'Action that inserts color with standalone color picker'
                ]
            }, "Insert Color with Standalone Color Picker"),
            precondition: EditorContextKeys.standaloneColorPickerFocused.isEqualTo(true),
            kbOpts: {
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            metadata: {
                description: localize2('insertColorWithStandaloneColorPickerDescription', "Insert hex/rgb/hsl colors with the focused standalone color picker."),
            }
        });
    }
    run(_accessor, editor) {
        StandaloneColorPickerController.get(editor)?.insertColor();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL3N0YW5kYWxvbmVDb2xvclBpY2tlci9zdGFuZGFsb25lQ29sb3JQaWNrZXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFvQixNQUFNLHlDQUF5QyxDQUFDO0FBRXhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXZGLE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxhQUFhO0lBQ2xFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdEQUFnRDtZQUNwRCxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsa0NBQWtDLEVBQUUsdUNBQXVDLENBQUM7Z0JBQ3pGLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsb0NBQW9DLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLHlDQUF5QyxDQUFDO2FBQ3JKO1lBQ0QsWUFBWSxFQUFFLFNBQVM7WUFDdkIsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxjQUFjLEVBQUU7YUFDN0I7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLFNBQVMsQ0FBQyw2Q0FBNkMsRUFBRSxnSEFBZ0gsQ0FBQzthQUN2TDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxnQkFBZ0IsQ0FBQyxTQUEyQixFQUFFLE1BQW1CO1FBQ2hFLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQztJQUM1RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsWUFBWTtJQUMxRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwrQkFBK0I7WUFDbkMsS0FBSyxFQUFFLFNBQVMsQ0FBQztnQkFDaEIsR0FBRyxFQUFFLGlCQUFpQjtnQkFDdEIsT0FBTyxFQUFFO29CQUNSLG9DQUFvQztpQkFDcEM7YUFDRCxFQUFFLHVCQUF1QixDQUFDO1lBQzNCLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBQzVFLE1BQU0sRUFBRTtnQkFDUCxPQUFPLHdCQUFnQjtnQkFDdkIsTUFBTSwwQ0FBZ0M7YUFDdEM7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxtQ0FBbUMsQ0FBQzthQUN6RjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFDTSxHQUFHLENBQUMsU0FBMkIsRUFBRSxNQUFtQjtRQUMxRCwrQkFBK0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDckQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG9DQUFxQyxTQUFRLFlBQVk7SUFDckU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0RBQW9EO1lBQ3hELEtBQUssRUFBRSxTQUFTLENBQUM7Z0JBQ2hCLEdBQUcsRUFBRSxzQ0FBc0M7Z0JBQzNDLE9BQU8sRUFBRTtvQkFDUix3REFBd0Q7aUJBQ3hEO2FBQ0QsRUFBRSwyQ0FBMkMsQ0FBQztZQUMvQyxZQUFZLEVBQUUsaUJBQWlCLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztZQUM1RSxNQUFNLEVBQUU7Z0JBQ1AsT0FBTyx1QkFBZTtnQkFDdEIsTUFBTSwwQ0FBZ0M7YUFDdEM7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLFNBQVMsQ0FBQyxpREFBaUQsRUFBRSxxRUFBcUUsQ0FBQzthQUNoSjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFDTSxHQUFHLENBQUMsU0FBMkIsRUFBRSxNQUFtQjtRQUMxRCwrQkFBK0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUM7SUFDNUQsQ0FBQztDQUNEIn0=