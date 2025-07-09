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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlUmVuZGVyV2hpdGVzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvdG9nZ2xlUmVuZGVyV2hpdGVzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFHMUYsTUFBTSw0QkFBNkIsU0FBUSxPQUFPO2FBRWpDLE9BQUUsR0FBRyxzQ0FBc0MsQ0FBQztJQUU1RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw0QkFBNEIsQ0FBQyxFQUFFO1lBQ25DLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSwwQkFBMEIsQ0FBQztnQkFDbEUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSwwQkFBMEIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUscUJBQXFCLENBQUM7YUFDdkg7WUFDRCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixPQUFPLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsRUFBRSxNQUFNLENBQUM7WUFDM0UsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMscUJBQXFCO2dCQUNoQyxLQUFLLEVBQUUsVUFBVTtnQkFDakIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxHQUFHLENBQUMsUUFBMEI7UUFDdEMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFakUsTUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQVMseUJBQXlCLENBQUMsQ0FBQztRQUUxRixJQUFJLG1CQUEyQixDQUFDO1FBQ2hDLElBQUksZ0JBQWdCLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDakMsbUJBQW1CLEdBQUcsS0FBSyxDQUFDO1FBQzdCLENBQUM7YUFBTSxDQUFDO1lBQ1AsbUJBQW1CLEdBQUcsTUFBTSxDQUFDO1FBQzlCLENBQUM7UUFFRCxPQUFPLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3pGLENBQUM7O0FBR0YsZUFBZSxDQUFDLDRCQUE0QixDQUFDLENBQUMifQ==