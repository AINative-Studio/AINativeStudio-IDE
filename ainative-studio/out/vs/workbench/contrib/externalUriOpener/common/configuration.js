/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export const defaultExternalUriOpenerId = 'default';
export const externalUriOpenersSettingId = 'workbench.externalUriOpeners';
const externalUriOpenerIdSchemaAddition = {
    type: 'string',
    enum: []
};
const exampleUriPatterns = `
- \`https://microsoft.com\`: Matches this specific domain using https
- \`https://microsoft.com:8080\`: Matches this specific domain on this port using https
- \`https://microsoft.com:*\`: Matches this specific domain on any port using https
- \`https://microsoft.com/foo\`: Matches \`https://microsoft.com/foo\` and \`https://microsoft.com/foo/bar\`, but not \`https://microsoft.com/foobar\` or \`https://microsoft.com/bar\`
- \`https://*.microsoft.com\`: Match all domains ending in \`microsoft.com\` using https
- \`microsoft.com\`: Match this specific domain using either http or https
- \`*.microsoft.com\`: Match all domains ending in \`microsoft.com\` using either http or https
- \`http://192.168.0.1\`: Matches this specific IP using http
- \`http://192.168.0.*\`: Matches all IP's with this prefix using http
- \`*\`: Match all domains using either http or https`;
export const externalUriOpenersConfigurationNode = {
    ...workbenchConfigurationNodeBase,
    properties: {
        [externalUriOpenersSettingId]: {
            type: 'object',
            markdownDescription: nls.localize('externalUriOpeners', "Configure the opener to use for external URIs (http, https)."),
            defaultSnippets: [{
                    body: {
                        'example.com': '$1'
                    }
                }],
            additionalProperties: {
                anyOf: [
                    {
                        type: 'string',
                        markdownDescription: nls.localize('externalUriOpeners.uri', "Map URI pattern to an opener id.\nExample patterns: \n{0}", exampleUriPatterns),
                    },
                    {
                        type: 'string',
                        markdownDescription: nls.localize('externalUriOpeners.uri', "Map URI pattern to an opener id.\nExample patterns: \n{0}", exampleUriPatterns),
                        enum: [defaultExternalUriOpenerId],
                        enumDescriptions: [nls.localize('externalUriOpeners.defaultId', "Open using VS Code's standard opener.")],
                    },
                    externalUriOpenerIdSchemaAddition
                ]
            }
        }
    }
};
export function updateContributedOpeners(enumValues, enumDescriptions) {
    externalUriOpenerIdSchemaAddition.enum = enumValues;
    externalUriOpenerIdSchemaAddition.enumDescriptions = enumDescriptions;
    Registry.as(Extensions.Configuration)
        .notifyConfigurationSchemaUpdated(externalUriOpenersConfigurationNode);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZXJuYWxVcmlPcGVuZXIvY29tbW9uL2NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUE4QyxVQUFVLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUM1SSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxTQUFTLENBQUM7QUFFcEQsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsOEJBQThCLENBQUM7QUFNMUUsTUFBTSxpQ0FBaUMsR0FBZ0I7SUFDdEQsSUFBSSxFQUFFLFFBQVE7SUFDZCxJQUFJLEVBQUUsRUFBRTtDQUNSLENBQUM7QUFFRixNQUFNLGtCQUFrQixHQUFHOzs7Ozs7Ozs7O3NEQVUyQixDQUFDO0FBRXZELE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUF1QjtJQUN0RSxHQUFHLDhCQUE4QjtJQUNqQyxVQUFVLEVBQUU7UUFDWCxDQUFDLDJCQUEyQixDQUFDLEVBQUU7WUFDOUIsSUFBSSxFQUFFLFFBQVE7WUFDZCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDhEQUE4RCxDQUFDO1lBQ3ZILGVBQWUsRUFBRSxDQUFDO29CQUNqQixJQUFJLEVBQUU7d0JBQ0wsYUFBYSxFQUFFLElBQUk7cUJBQ25CO2lCQUNELENBQUM7WUFDRixvQkFBb0IsRUFBRTtnQkFDckIsS0FBSyxFQUFFO29CQUNOO3dCQUNDLElBQUksRUFBRSxRQUFRO3dCQUNkLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsMkRBQTJELEVBQUUsa0JBQWtCLENBQUM7cUJBQzVJO29CQUNEO3dCQUNDLElBQUksRUFBRSxRQUFRO3dCQUNkLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsMkRBQTJELEVBQUUsa0JBQWtCLENBQUM7d0JBQzVJLElBQUksRUFBRSxDQUFDLDBCQUEwQixDQUFDO3dCQUNsQyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsOEJBQThCLEVBQUUsdUNBQXVDLENBQUMsQ0FBQztxQkFDekc7b0JBQ0QsaUNBQWlDO2lCQUNqQzthQUNEO1NBQ0Q7S0FDRDtDQUNELENBQUM7QUFFRixNQUFNLFVBQVUsd0JBQXdCLENBQUMsVUFBb0IsRUFBRSxnQkFBMEI7SUFDeEYsaUNBQWlDLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztJQUNwRCxpQ0FBaUMsQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQztJQUV0RSxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDO1NBQzNELGdDQUFnQyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDekUsQ0FBQyJ9