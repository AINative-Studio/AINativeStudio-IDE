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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlcm5hbFVyaU9wZW5lci9jb21tb24vY29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQThDLFVBQVUsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQzVJLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLFNBQVMsQ0FBQztBQUVwRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyw4QkFBOEIsQ0FBQztBQU0xRSxNQUFNLGlDQUFpQyxHQUFnQjtJQUN0RCxJQUFJLEVBQUUsUUFBUTtJQUNkLElBQUksRUFBRSxFQUFFO0NBQ1IsQ0FBQztBQUVGLE1BQU0sa0JBQWtCLEdBQUc7Ozs7Ozs7Ozs7c0RBVTJCLENBQUM7QUFFdkQsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQXVCO0lBQ3RFLEdBQUcsOEJBQThCO0lBQ2pDLFVBQVUsRUFBRTtRQUNYLENBQUMsMkJBQTJCLENBQUMsRUFBRTtZQUM5QixJQUFJLEVBQUUsUUFBUTtZQUNkLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsOERBQThELENBQUM7WUFDdkgsZUFBZSxFQUFFLENBQUM7b0JBQ2pCLElBQUksRUFBRTt3QkFDTCxhQUFhLEVBQUUsSUFBSTtxQkFDbkI7aUJBQ0QsQ0FBQztZQUNGLG9CQUFvQixFQUFFO2dCQUNyQixLQUFLLEVBQUU7b0JBQ047d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwyREFBMkQsRUFBRSxrQkFBa0IsQ0FBQztxQkFDNUk7b0JBQ0Q7d0JBQ0MsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwyREFBMkQsRUFBRSxrQkFBa0IsQ0FBQzt3QkFDNUksSUFBSSxFQUFFLENBQUMsMEJBQTBCLENBQUM7d0JBQ2xDLGdCQUFnQixFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO3FCQUN6RztvQkFDRCxpQ0FBaUM7aUJBQ2pDO2FBQ0Q7U0FDRDtLQUNEO0NBQ0QsQ0FBQztBQUVGLE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxVQUFvQixFQUFFLGdCQUEwQjtJQUN4RixpQ0FBaUMsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO0lBQ3BELGlDQUFpQyxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO0lBRXRFLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUM7U0FDM0QsZ0NBQWdDLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUN6RSxDQUFDIn0=