/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
class ToggleRenderWhitespaceAction extends Action2 {
    static { this.ID = 'editor.action.toggleRenderWhitespace'; }
    constructor() {
        super({
            id: ToggleRenderWhitespaceAction.ID,
            title: {
                ...localize2('toggleRenderWhitespace', "Toggle Render Whitespace"),
                mnemonicTitle: localize({ key: 'miToggleRenderWhitespace', comment: ['&& denotes a mnemonic'] }, "&&Render Whitespace"),
            },
            category: Categories.View,
            f1: true,
            toggled: ContextKeyExpr.notEquals('config.editor.renderWhitespace', 'none'),
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '4_editor',
                order: 4
            }
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const renderWhitespace = configurationService.getValue('editor.renderWhitespace');
        let newRenderWhitespace;
        if (renderWhitespace === 'none') {
            newRenderWhitespace = 'all';
        }
        else {
            newRenderWhitespace = 'none';
        }
        return configurationService.updateValue('editor.renderWhitespace', newRenderWhitespace);
    }
}
registerAction2(ToggleRenderWhitespaceAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlUmVuZGVyV2hpdGVzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci90b2dnbGVSZW5kZXJXaGl0ZXNwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUcxRixNQUFNLDRCQUE2QixTQUFRLE9BQU87YUFFakMsT0FBRSxHQUFHLHNDQUFzQyxDQUFDO0lBRTVEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRCQUE0QixDQUFDLEVBQUU7WUFDbkMsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLHdCQUF3QixFQUFFLDBCQUEwQixDQUFDO2dCQUNsRSxhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLDBCQUEwQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQzthQUN2SDtZQUNELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxjQUFjLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxFQUFFLE1BQU0sQ0FBQztZQUMzRSxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxxQkFBcUI7Z0JBQ2hDLEtBQUssRUFBRSxVQUFVO2dCQUNqQixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLEdBQUcsQ0FBQyxRQUEwQjtRQUN0QyxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUVqRSxNQUFNLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyx5QkFBeUIsQ0FBQyxDQUFDO1FBRTFGLElBQUksbUJBQTJCLENBQUM7UUFDaEMsSUFBSSxnQkFBZ0IsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNqQyxtQkFBbUIsR0FBRyxLQUFLLENBQUM7UUFDN0IsQ0FBQzthQUFNLENBQUM7WUFDUCxtQkFBbUIsR0FBRyxNQUFNLENBQUM7UUFDOUIsQ0FBQztRQUVELE9BQU8sb0JBQW9CLENBQUMsV0FBVyxDQUFDLHlCQUF5QixFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDekYsQ0FBQzs7QUFHRixlQUFlLENBQUMsNEJBQTRCLENBQUMsQ0FBQyJ9