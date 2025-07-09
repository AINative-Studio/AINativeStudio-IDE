/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
export class ToggleRenderControlCharacterAction extends Action2 {
    static { this.ID = 'editor.action.toggleRenderControlCharacter'; }
    constructor() {
        super({
            id: ToggleRenderControlCharacterAction.ID,
            title: {
                ...localize2('toggleRenderControlCharacters', "Toggle Control Characters"),
                mnemonicTitle: localize({ key: 'miToggleRenderControlCharacters', comment: ['&& denotes a mnemonic'] }, "Render &&Control Characters"),
            },
            category: Categories.View,
            f1: true,
            toggled: ContextKeyExpr.equals('config.editor.renderControlCharacters', true),
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '4_editor',
                order: 5
            }
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const newRenderControlCharacters = !configurationService.getValue('editor.renderControlCharacters');
        return configurationService.updateValue('editor.renderControlCharacters', newRenderControlCharacters);
    }
}
registerAction2(ToggleRenderControlCharacterAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlUmVuZGVyQ29udHJvbENoYXJhY3Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvdG9nZ2xlUmVuZGVyQ29udHJvbENoYXJhY3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFHMUYsTUFBTSxPQUFPLGtDQUFtQyxTQUFRLE9BQU87YUFFOUMsT0FBRSxHQUFHLDRDQUE0QyxDQUFDO0lBRWxFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQyxDQUFDLEVBQUU7WUFDekMsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLCtCQUErQixFQUFFLDJCQUEyQixDQUFDO2dCQUMxRSxhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLGlDQUFpQyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSw2QkFBNkIsQ0FBQzthQUN0STtZQUNELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLHVDQUF1QyxFQUFFLElBQUksQ0FBQztZQUM3RSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxxQkFBcUI7Z0JBQ2hDLEtBQUssRUFBRSxVQUFVO2dCQUNqQixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLEdBQUcsQ0FBQyxRQUEwQjtRQUN0QyxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUVqRSxNQUFNLDBCQUEwQixHQUFHLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFVLGdDQUFnQyxDQUFDLENBQUM7UUFDN0csT0FBTyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsZ0NBQWdDLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztJQUN2RyxDQUFDOztBQUdGLGVBQWUsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDIn0=