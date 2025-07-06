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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9zbmlwcGV0cy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sS0FBSyx3QkFBd0IsTUFBTSxxRUFBcUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBbUMsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRXZELE9BQU8sRUFBRSxVQUFVLEVBQTBCLE1BQU0sb0VBQW9F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