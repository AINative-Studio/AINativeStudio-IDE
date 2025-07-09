/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import * as JSONContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { ConfigureSnippetsAction } from './commands/configureSnippets.js';
import { ApplyFileSnippetAction } from './commands/fileTemplateSnippets.js';
import { InsertSnippetAction } from './commands/insertSnippet.js';
import { SurroundWithSnippetEditorAction } from './commands/surroundWithSnippet.js';
import { SnippetCodeActions } from './snippetCodeActionProvider.js';
import { ISnippetsService } from './snippets.js';
import { SnippetsService } from './snippetsService.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import './tabCompletion.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
// service
registerSingleton(ISnippetsService, SnippetsService, 1 /* InstantiationType.Delayed */);
// actions
registerAction2(InsertSnippetAction);
CommandsRegistry.registerCommandAlias('editor.action.showSnippets', 'editor.action.insertSnippet');
registerAction2(SurroundWithSnippetEditorAction);
registerAction2(ApplyFileSnippetAction);
registerAction2(ConfigureSnippetsAction);
// workbench contribs
const workbenchContribRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContribRegistry.registerWorkbenchContribution(SnippetCodeActions, 3 /* LifecyclePhase.Restored */);
// config
Registry
    .as(Extensions.Configuration)
    .registerConfiguration({
    ...editorConfigurationBaseNode,
    'properties': {
        'editor.snippets.codeActions.enabled': {
            'description': nls.localize('editor.snippets.codeActions.enabled', 'Controls if surround-with-snippets or file template snippets show as Code Actions.'),
            'type': 'boolean',
            'default': true
        }
    }
});
// schema
const languageScopeSchemaId = 'vscode://schemas/snippets';
const snippetSchemaProperties = {
    prefix: {
        description: nls.localize('snippetSchema.json.prefix', 'The prefix to use when selecting the snippet in intellisense'),
        type: ['string', 'array']
    },
    isFileTemplate: {
        description: nls.localize('snippetSchema.json.isFileTemplate', 'The snippet is meant to populate or replace a whole file'),
        type: 'boolean'
    },
    body: {
        markdownDescription: nls.localize('snippetSchema.json.body', 'The snippet content. Use `$1`, `${1:defaultText}` to define cursor positions, use `$0` for the final cursor position. Insert variable values with `${varName}` and `${varName:defaultText}`, e.g. `This is file: $TM_FILENAME`.'),
        type: ['string', 'array'],
        items: {
            type: 'string'
        }
    },
    description: {
        description: nls.localize('snippetSchema.json.description', 'The snippet description.'),
        type: ['string', 'array']
    }
};
const languageScopeSchema = {
    id: languageScopeSchemaId,
    allowComments: true,
    allowTrailingCommas: true,
    defaultSnippets: [{
            label: nls.localize('snippetSchema.json.default', "Empty snippet"),
            body: { '${1:snippetName}': { 'prefix': '${2:prefix}', 'body': '${3:snippet}', 'description': '${4:description}' } }
        }],
    type: 'object',
    description: nls.localize('snippetSchema.json', 'User snippet configuration'),
    additionalProperties: {
        type: 'object',
        required: ['body'],
        properties: snippetSchemaProperties,
        additionalProperties: false
    }
};
const globalSchemaId = 'vscode://schemas/global-snippets';
const globalSchema = {
    id: globalSchemaId,
    allowComments: true,
    allowTrailingCommas: true,
    defaultSnippets: [{
            label: nls.localize('snippetSchema.json.default', "Empty snippet"),
            body: { '${1:snippetName}': { 'scope': '${2:scope}', 'prefix': '${3:prefix}', 'body': '${4:snippet}', 'description': '${5:description}' } }
        }],
    type: 'object',
    description: nls.localize('snippetSchema.json', 'User snippet configuration'),
    additionalProperties: {
        type: 'object',
        required: ['body'],
        properties: {
            ...snippetSchemaProperties,
            scope: {
                description: nls.localize('snippetSchema.json.scope', "A list of language names to which this snippet applies, e.g. 'typescript,javascript'."),
                type: 'string'
            }
        },
        additionalProperties: false
    }
};
const reg = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
reg.registerSchema(languageScopeSchemaId, languageScopeSchema);
reg.registerSchema(globalSchemaId, globalSchema);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvc25pcHBldHMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEtBQUssd0JBQXdCLE1BQU0scUVBQXFFLENBQUM7QUFDaEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQW1DLE1BQU0sa0NBQWtDLENBQUM7QUFDdEgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUV2RCxPQUFPLEVBQUUsVUFBVSxFQUEwQixNQUFNLG9FQUFvRSxDQUFDO0FBRXhILE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFNUcsVUFBVTtBQUNWLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLGVBQWUsb0NBQTRCLENBQUM7QUFFaEYsVUFBVTtBQUNWLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3JDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLDRCQUE0QixFQUFFLDZCQUE2QixDQUFDLENBQUM7QUFDbkcsZUFBZSxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDakQsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDeEMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFFekMscUJBQXFCO0FBQ3JCLE1BQU0sd0JBQXdCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDN0csd0JBQXdCLENBQUMsNkJBQTZCLENBQUMsa0JBQWtCLGtDQUEwQixDQUFDO0FBRXBHLFNBQVM7QUFDVCxRQUFRO0tBQ04sRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDO0tBQ3BELHFCQUFxQixDQUFDO0lBQ3RCLEdBQUcsMkJBQTJCO0lBQzlCLFlBQVksRUFBRTtRQUNiLHFDQUFxQyxFQUFFO1lBQ3RDLGFBQWEsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLG9GQUFvRixDQUFDO1lBQ3hKLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFNBQVMsRUFBRSxJQUFJO1NBQ2Y7S0FDRDtDQUNELENBQUMsQ0FBQztBQUdKLFNBQVM7QUFDVCxNQUFNLHFCQUFxQixHQUFHLDJCQUEyQixDQUFDO0FBRTFELE1BQU0sdUJBQXVCLEdBQW1CO0lBQy9DLE1BQU0sRUFBRTtRQUNQLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDhEQUE4RCxDQUFDO1FBQ3RILElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FDekI7SUFDRCxjQUFjLEVBQUU7UUFDZixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSwwREFBMEQsQ0FBQztRQUMxSCxJQUFJLEVBQUUsU0FBUztLQUNmO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxpT0FBaU8sQ0FBQztRQUMvUixJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO1FBQ3pCLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxRQUFRO1NBQ2Q7S0FDRDtJQUNELFdBQVcsRUFBRTtRQUNaLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLDBCQUEwQixDQUFDO1FBQ3ZGLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7S0FDekI7Q0FDRCxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBZ0I7SUFDeEMsRUFBRSxFQUFFLHFCQUFxQjtJQUN6QixhQUFhLEVBQUUsSUFBSTtJQUNuQixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLGVBQWUsRUFBRSxDQUFDO1lBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLGVBQWUsQ0FBQztZQUNsRSxJQUFJLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsRUFBRTtTQUNwSCxDQUFDO0lBQ0YsSUFBSSxFQUFFLFFBQVE7SUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSw0QkFBNEIsQ0FBQztJQUM3RSxvQkFBb0IsRUFBRTtRQUNyQixJQUFJLEVBQUUsUUFBUTtRQUNkLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNsQixVQUFVLEVBQUUsdUJBQXVCO1FBQ25DLG9CQUFvQixFQUFFLEtBQUs7S0FDM0I7Q0FDRCxDQUFDO0FBR0YsTUFBTSxjQUFjLEdBQUcsa0NBQWtDLENBQUM7QUFDMUQsTUFBTSxZQUFZLEdBQWdCO0lBQ2pDLEVBQUUsRUFBRSxjQUFjO0lBQ2xCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLG1CQUFtQixFQUFFLElBQUk7SUFDekIsZUFBZSxFQUFFLENBQUM7WUFDakIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsZUFBZSxDQUFDO1lBQ2xFLElBQUksRUFBRSxFQUFFLGtCQUFrQixFQUFFLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLEVBQUU7U0FDM0ksQ0FBQztJQUNGLElBQUksRUFBRSxRQUFRO0lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsNEJBQTRCLENBQUM7SUFDN0Usb0JBQW9CLEVBQUU7UUFDckIsSUFBSSxFQUFFLFFBQVE7UUFDZCxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUM7UUFDbEIsVUFBVSxFQUFFO1lBQ1gsR0FBRyx1QkFBdUI7WUFDMUIsS0FBSyxFQUFFO2dCQUNOLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHVGQUF1RixDQUFDO2dCQUM5SSxJQUFJLEVBQUUsUUFBUTthQUNkO1NBQ0Q7UUFDRCxvQkFBb0IsRUFBRSxLQUFLO0tBQzNCO0NBQ0QsQ0FBQztBQUVGLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXFELHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ2xJLEdBQUcsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUMvRCxHQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQyJ9