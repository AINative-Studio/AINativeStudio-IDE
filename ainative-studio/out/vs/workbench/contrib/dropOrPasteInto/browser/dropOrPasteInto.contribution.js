/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { DropOrPasteIntoCommands } from './commands.js';
import { DropOrPasteSchemaContribution, editorConfiguration } from './configurationSchema.js';
registerWorkbenchContribution2(DropOrPasteIntoCommands.ID, DropOrPasteIntoCommands, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(DropOrPasteSchemaContribution.ID, DropOrPasteSchemaContribution, 4 /* WorkbenchPhase.Eventually */);
Registry.as(Extensions.Configuration)
    .registerConfiguration(editorConfiguration);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcE9yUGFzdGVJbnRvLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kcm9wT3JQYXN0ZUludG8vYnJvd3Nlci9kcm9wT3JQYXN0ZUludG8uY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxVQUFVLEVBQTBCLE1BQU0sb0VBQW9FLENBQUM7QUFDeEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDeEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFOUYsOEJBQThCLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLHVCQUF1QixvQ0FBNEIsQ0FBQztBQUMvRyw4QkFBOEIsQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLEVBQUUsNkJBQTZCLG9DQUE0QixDQUFDO0FBRTNILFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUM7S0FDM0QscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyJ9