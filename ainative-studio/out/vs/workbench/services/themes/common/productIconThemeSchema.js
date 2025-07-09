/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { fontIdErrorMessage, fontIdRegex, fontStyleRegex, fontWeightRegex, iconsSchemaId } from '../../../../platform/theme/common/iconRegistry.js';
const schemaId = 'vscode://schemas/product-icon-theme';
const schema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    properties: {
        fonts: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: nls.localize('schema.id', 'The ID of the font.'),
                        pattern: fontIdRegex.source,
                        patternErrorMessage: fontIdErrorMessage
                    },
                    src: {
                        type: 'array',
                        description: nls.localize('schema.src', 'The location of the font.'),
                        items: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: nls.localize('schema.font-path', 'The font path, relative to the current product icon theme file.'),
                                },
                                format: {
                                    type: 'string',
                                    description: nls.localize('schema.font-format', 'The format of the font.'),
                                    enum: ['woff', 'woff2', 'truetype', 'opentype', 'embedded-opentype', 'svg']
                                }
                            },
                            required: [
                                'path',
                                'format'
                            ]
                        }
                    },
                    weight: {
                        type: 'string',
                        description: nls.localize('schema.font-weight', 'The weight of the font. See https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight for valid values.'),
                        anyOf: [
                            { enum: ['normal', 'bold', 'lighter', 'bolder'] },
                            { type: 'string', pattern: fontWeightRegex.source }
                        ]
                    },
                    style: {
                        type: 'string',
                        description: nls.localize('schema.font-style', 'The style of the font. See https://developer.mozilla.org/en-US/docs/Web/CSS/font-style for valid values.'),
                        anyOf: [
                            { enum: ['normal', 'italic', 'oblique'] },
                            { type: 'string', pattern: fontStyleRegex.source }
                        ]
                    }
                },
                required: [
                    'id',
                    'src'
                ]
            }
        },
        iconDefinitions: {
            description: nls.localize('schema.iconDefinitions', 'Association of icon name to a font character.'),
            $ref: iconsSchemaId
        }
    }
};
export function registerProductIconThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(schemaId, schema);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdEljb25UaGVtZVNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi9wcm9kdWN0SWNvblRoZW1lU2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLElBQUksY0FBYyxFQUE2QixNQUFNLHFFQUFxRSxDQUFDO0FBRTlJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVwSixNQUFNLFFBQVEsR0FBRyxxQ0FBcUMsQ0FBQztBQUN2RCxNQUFNLE1BQU0sR0FBZ0I7SUFDM0IsSUFBSSxFQUFFLFFBQVE7SUFDZCxhQUFhLEVBQUUsSUFBSTtJQUNuQixtQkFBbUIsRUFBRSxJQUFJO0lBQ3pCLFVBQVUsRUFBRTtRQUNYLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxPQUFPO1lBQ2IsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2dCQUNkLFVBQVUsRUFBRTtvQkFDWCxFQUFFLEVBQUU7d0JBQ0gsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDO3dCQUM3RCxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU07d0JBQzNCLG1CQUFtQixFQUFFLGtCQUFrQjtxQkFDdkM7b0JBQ0QsR0FBRyxFQUFFO3dCQUNKLElBQUksRUFBRSxPQUFPO3dCQUNiLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSwyQkFBMkIsQ0FBQzt3QkFDcEUsS0FBSyxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFVBQVUsRUFBRTtnQ0FDWCxJQUFJLEVBQUU7b0NBQ0wsSUFBSSxFQUFFLFFBQVE7b0NBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsaUVBQWlFLENBQUM7aUNBQ2hIO2dDQUNELE1BQU0sRUFBRTtvQ0FDUCxJQUFJLEVBQUUsUUFBUTtvQ0FDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx5QkFBeUIsQ0FBQztvQ0FDMUUsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLEtBQUssQ0FBQztpQ0FDM0U7NkJBQ0Q7NEJBQ0QsUUFBUSxFQUFFO2dDQUNULE1BQU07Z0NBQ04sUUFBUTs2QkFDUjt5QkFDRDtxQkFDRDtvQkFDRCxNQUFNLEVBQUU7d0JBQ1AsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsNEdBQTRHLENBQUM7d0JBQzdKLEtBQUssRUFBRTs0QkFDTixFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxFQUFFOzRCQUNqRCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxNQUFNLEVBQUU7eUJBQ25EO3FCQUNEO29CQUNELEtBQUssRUFBRTt3QkFDTixJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSwwR0FBMEcsQ0FBQzt3QkFDMUosS0FBSyxFQUFFOzRCQUNOLEVBQUUsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTs0QkFDekMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxjQUFjLENBQUMsTUFBTSxFQUFFO3lCQUNsRDtxQkFDRDtpQkFDRDtnQkFDRCxRQUFRLEVBQUU7b0JBQ1QsSUFBSTtvQkFDSixLQUFLO2lCQUNMO2FBQ0Q7U0FDRDtRQUNELGVBQWUsRUFBRTtZQUNoQixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwrQ0FBK0MsQ0FBQztZQUNwRyxJQUFJLEVBQUUsYUFBYTtTQUNuQjtLQUNEO0NBQ0QsQ0FBQztBQUVGLE1BQU0sVUFBVSwrQkFBK0I7SUFDOUMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBNEIsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDL0YsY0FBYyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDakQsQ0FBQyJ9