/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { CodeActionsContribution, editorConfiguration, notebookEditorConfiguration } from './codeActionsContribution.js';
Registry.as(Extensions.Configuration)
    .registerConfiguration(editorConfiguration);
Registry.as(Extensions.Configuration)
    .registerConfiguration(notebookEditorConfiguration);
Registry.as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(CodeActionsContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVBY3Rpb25zL2Jyb3dzZXIvY29kZUFjdGlvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQTBCLE1BQU0sb0VBQW9FLENBQUM7QUFDeEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBbUMsVUFBVSxJQUFJLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdEgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFekgsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFBQWEsQ0FBQztLQUMzRCxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTdDLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUM7S0FDM0QscUJBQXFCLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUVyRCxRQUFRLENBQUMsRUFBRSxDQUFrQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7S0FDekUsNkJBQTZCLENBQUMsdUJBQXVCLG9DQUE0QixDQUFDIn0=