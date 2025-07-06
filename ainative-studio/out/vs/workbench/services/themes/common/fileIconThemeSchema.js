/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as JSONExtensions } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { fontWeightRegex, fontStyleRegex, fontSizeRegex, fontIdRegex, fontColorRegex, fontIdErrorMessage } from '../../../../platform/theme/common/iconRegistry.js';
const schemaId = 'vscode://schemas/icon-theme';
const schema = {
    type: 'object',
    allowComments: true,
    allowTrailingCommas: true,
    definitions: {
        folderExpanded: {
            type: 'string',
            description: nls.localize('schema.folderExpanded', 'The folder icon for expanded folders. The expanded folder icon is optional. If not set, the icon defined for folder will be shown.')
        },
        folder: {
            type: 'string',
            description: nls.localize('schema.folder', 'The folder icon for collapsed folders, and if folderExpanded is not set, also for expanded folders.')
        },
        file: {
            type: 'string',
            description: nls.localize('schema.file', 'The default file icon, shown for all files that don\'t match any extension, filename or language id.')
        },
        rootFolder: {
            type: 'string',
            description: nls.localize('schema.rootFolder', 'The folder icon for collapsed root folders, and if rootFolderExpanded is not set, also for expanded root folders.')
        },
        rootFolderExpanded: {
            type: 'string',
            description: nls.localize('schema.rootFolderExpanded', 'The folder icon for expanded root folders. The expanded root folder icon is optional. If not set, the icon defined for root folder will be shown.')
        },
        rootFolderNames: {
            type: 'object',
            description: nls.localize('schema.rootFolderNames', 'Associates root folder names to icons. The object key is the root folder name. No patterns or wildcards are allowed. Root folder name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.folderName', 'The ID of the icon definition for the association.')
            }
        },
        rootFolderNamesExpanded: {
            type: 'object',
            description: nls.localize('schema.rootFolderNamesExpanded', 'Associates root folder names to icons for expanded root folders. The object key is the root folder name. No patterns or wildcards are allowed. Root folder name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.rootFolderNameExpanded', 'The ID of the icon definition for the association.')
            }
        },
        folderNames: {
            type: 'object',
            description: nls.localize('schema.folderNames', 'Associates folder names to icons. The object key is the folder name, not including any path segments. No patterns or wildcards are allowed. Folder name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.folderName', 'The ID of the icon definition for the association.')
            }
        },
        folderNamesExpanded: {
            type: 'object',
            description: nls.localize('schema.folderNamesExpanded', 'Associates folder names to icons for expanded folders. The object key is the folder name, not including any path segments. No patterns or wildcards are allowed. Folder name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.folderNameExpanded', 'The ID of the icon definition for the association.')
            }
        },
        fileExtensions: {
            type: 'object',
            description: nls.localize('schema.fileExtensions', 'Associates file extensions to icons. The object key is the file extension name. The extension name is the last segment of a file name after the last dot (not including the dot). Extensions are compared case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.fileExtension', 'The ID of the icon definition for the association.')
            }
        },
        fileNames: {
            type: 'object',
            description: nls.localize('schema.fileNames', 'Associates file names to icons. The object key is the full file name, but not including any path segments. File name can include dots and a possible file extension. No patterns or wildcards are allowed. File name matching is case insensitive.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.fileName', 'The ID of the icon definition for the association.')
            }
        },
        languageIds: {
            type: 'object',
            description: nls.localize('schema.languageIds', 'Associates languages to icons. The object key is the language id as defined in the language contribution point.'),
            additionalProperties: {
                type: 'string',
                description: nls.localize('schema.languageId', 'The ID of the icon definition for the association.')
            }
        },
        associations: {
            type: 'object',
            properties: {
                folderExpanded: {
                    $ref: '#/definitions/folderExpanded'
                },
                folder: {
                    $ref: '#/definitions/folder'
                },
                file: {
                    $ref: '#/definitions/file'
                },
                folderNames: {
                    $ref: '#/definitions/folderNames'
                },
                folderNamesExpanded: {
                    $ref: '#/definitions/folderNamesExpanded'
                },
                rootFolder: {
                    $ref: '#/definitions/rootFolder'
                },
                rootFolderExpanded: {
                    $ref: '#/definitions/rootFolderExpanded'
                },
                rootFolderNames: {
                    $ref: '#/definitions/rootFolderNames'
                },
                rootFolderNamesExpanded: {
                    $ref: '#/definitions/rootFolderNamesExpanded'
                },
                fileExtensions: {
                    $ref: '#/definitions/fileExtensions'
                },
                fileNames: {
                    $ref: '#/definitions/fileNames'
                },
                languageIds: {
                    $ref: '#/definitions/languageIds'
                }
            }
        }
    },
    properties: {
        fonts: {
            type: 'array',
            description: nls.localize('schema.fonts', 'Fonts that are used in the icon definitions.'),
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
                                    description: nls.localize('schema.font-path', 'The font path, relative to the current file icon theme file.'),
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
                        pattern: fontWeightRegex.source
                    },
                    style: {
                        type: 'string',
                        description: nls.localize('schema.font-style', 'The style of the font. See https://developer.mozilla.org/en-US/docs/Web/CSS/font-style for valid values.'),
                        pattern: fontStyleRegex.source
                    },
                    size: {
                        type: 'string',
                        description: nls.localize('schema.font-size', 'The default size of the font. We strongly recommend using a percentage value, for example: 125%.'),
                        pattern: fontSizeRegex.source
                    }
                },
                required: [
                    'id',
                    'src'
                ]
            }
        },
        iconDefinitions: {
            type: 'object',
            description: nls.localize('schema.iconDefinitions', 'Description of all icons that can be used when associating files to icons.'),
            additionalProperties: {
                type: 'object',
                description: nls.localize('schema.iconDefinition', 'An icon definition. The object key is the ID of the definition.'),
                properties: {
                    iconPath: {
                        type: 'string',
                        description: nls.localize('schema.iconPath', 'When using a SVG or PNG: The path to the image. The path is relative to the icon set file.')
                    },
                    fontCharacter: {
                        type: 'string',
                        description: nls.localize('schema.fontCharacter', 'When using a glyph font: The character in the font to use.')
                    },
                    fontColor: {
                        type: 'string',
                        format: 'color-hex',
                        description: nls.localize('schema.fontColor', 'When using a glyph font: The color to use.'),
                        pattern: fontColorRegex.source
                    },
                    fontSize: {
                        type: 'string',
                        description: nls.localize('schema.fontSize', 'When using a font: The font size in percentage to the text font. If not set, defaults to the size in the font definition.'),
                        pattern: fontSizeRegex.source
                    },
                    fontId: {
                        type: 'string',
                        description: nls.localize('schema.fontId', 'When using a font: The id of the font. If not set, defaults to the first font definition.'),
                        pattern: fontIdRegex.source,
                        patternErrorMessage: fontIdErrorMessage
                    }
                }
            }
        },
        folderExpanded: {
            $ref: '#/definitions/folderExpanded'
        },
        folder: {
            $ref: '#/definitions/folder'
        },
        file: {
            $ref: '#/definitions/file'
        },
        folderNames: {
            $ref: '#/definitions/folderNames'
        },
        folderNamesExpanded: {
            $ref: '#/definitions/folderNamesExpanded'
        },
        rootFolder: {
            $ref: '#/definitions/rootFolder'
        },
        rootFolderExpanded: {
            $ref: '#/definitions/rootFolderExpanded'
        },
        rootFolderNames: {
            $ref: '#/definitions/rootFolderNames'
        },
        rootFolderNamesExpanded: {
            $ref: '#/definitions/rootFolderNamesExpanded'
        },
        fileExtensions: {
            $ref: '#/definitions/fileExtensions'
        },
        fileNames: {
            $ref: '#/definitions/fileNames'
        },
        languageIds: {
            $ref: '#/definitions/languageIds'
        },
        light: {
            $ref: '#/definitions/associations',
            description: nls.localize('schema.light', 'Optional associations for file icons in light color themes.')
        },
        highContrast: {
            $ref: '#/definitions/associations',
            description: nls.localize('schema.highContrast', 'Optional associations for file icons in high contrast color themes.')
        },
        hidesExplorerArrows: {
            type: 'boolean',
            description: nls.localize('schema.hidesExplorerArrows', 'Configures whether the file explorer\'s arrows should be hidden when this theme is active.')
        },
        showLanguageModeIcons: {
            type: 'boolean',
            description: nls.localize('schema.showLanguageModeIcons', 'Configures whether the default language icons should be used if the theme does not define an icon for a language.')
        }
    }
};
export function registerFileIconThemeSchemas() {
    const schemaRegistry = Registry.as(JSONExtensions.JSONContribution);
    schemaRegistry.registerSchema(schemaId, schema);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUljb25UaGVtZVNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vZmlsZUljb25UaGVtZVNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxJQUFJLGNBQWMsRUFBNkIsTUFBTSxxRUFBcUUsQ0FBQztBQUU5SSxPQUFPLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXBLLE1BQU0sUUFBUSxHQUFHLDZCQUE2QixDQUFDO0FBQy9DLE1BQU0sTUFBTSxHQUFnQjtJQUMzQixJQUFJLEVBQUUsUUFBUTtJQUNkLGFBQWEsRUFBRSxJQUFJO0lBQ25CLG1CQUFtQixFQUFFLElBQUk7SUFDekIsV0FBVyxFQUFFO1FBQ1osY0FBYyxFQUFFO1lBQ2YsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxvSUFBb0ksQ0FBQztTQUN4TDtRQUNELE1BQU0sRUFBRTtZQUNQLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLHFHQUFxRyxDQUFDO1NBRWpKO1FBQ0QsSUFBSSxFQUFFO1lBQ0wsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsc0dBQXNHLENBQUM7U0FFaEo7UUFDRCxVQUFVLEVBQUU7WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLG1IQUFtSCxDQUFDO1NBQ25LO1FBQ0Qsa0JBQWtCLEVBQUU7WUFDbkIsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxtSkFBbUosQ0FBQztTQUMzTTtRQUNELGVBQWUsRUFBRTtZQUNoQixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHFLQUFxSyxDQUFDO1lBQzFOLG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxvREFBb0QsQ0FBQzthQUNwRztTQUNEO1FBQ0QsdUJBQXVCLEVBQUU7WUFDeEIsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSwrTEFBK0wsQ0FBQztZQUM1UCxvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUsb0RBQW9ELENBQUM7YUFDaEg7U0FDRDtRQUNELFdBQVcsRUFBRTtZQUNaLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsdUxBQXVMLENBQUM7WUFDeE8sb0JBQW9CLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLG9EQUFvRCxDQUFDO2FBQ3BHO1NBQ0Q7UUFDRCxtQkFBbUIsRUFBRTtZQUNwQixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDRNQUE0TSxDQUFDO1lBQ3JRLG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxvREFBb0QsQ0FBQzthQUM1RztTQUNEO1FBQ0QsY0FBYyxFQUFFO1lBQ2YsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSw2TkFBNk4sQ0FBQztZQUVqUixvQkFBb0IsRUFBRTtnQkFDckIsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsb0RBQW9ELENBQUM7YUFDdkc7U0FDRDtRQUNELFNBQVMsRUFBRTtZQUNWLElBQUksRUFBRSxRQUFRO1lBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsb1BBQW9QLENBQUM7WUFFblMsb0JBQW9CLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLG9EQUFvRCxDQUFDO2FBQ2xHO1NBQ0Q7UUFDRCxXQUFXLEVBQUU7WUFDWixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGlIQUFpSCxDQUFDO1lBRWxLLG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxvREFBb0QsQ0FBQzthQUNwRztTQUNEO1FBQ0QsWUFBWSxFQUFFO1lBQ2IsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsY0FBYyxFQUFFO29CQUNmLElBQUksRUFBRSw4QkFBOEI7aUJBQ3BDO2dCQUNELE1BQU0sRUFBRTtvQkFDUCxJQUFJLEVBQUUsc0JBQXNCO2lCQUM1QjtnQkFDRCxJQUFJLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLG9CQUFvQjtpQkFDMUI7Z0JBQ0QsV0FBVyxFQUFFO29CQUNaLElBQUksRUFBRSwyQkFBMkI7aUJBQ2pDO2dCQUNELG1CQUFtQixFQUFFO29CQUNwQixJQUFJLEVBQUUsbUNBQW1DO2lCQUN6QztnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsSUFBSSxFQUFFLDBCQUEwQjtpQkFDaEM7Z0JBQ0Qsa0JBQWtCLEVBQUU7b0JBQ25CLElBQUksRUFBRSxrQ0FBa0M7aUJBQ3hDO2dCQUNELGVBQWUsRUFBRTtvQkFDaEIsSUFBSSxFQUFFLCtCQUErQjtpQkFDckM7Z0JBQ0QsdUJBQXVCLEVBQUU7b0JBQ3hCLElBQUksRUFBRSx1Q0FBdUM7aUJBQzdDO2dCQUNELGNBQWMsRUFBRTtvQkFDZixJQUFJLEVBQUUsOEJBQThCO2lCQUNwQztnQkFDRCxTQUFTLEVBQUU7b0JBQ1YsSUFBSSxFQUFFLHlCQUF5QjtpQkFDL0I7Z0JBQ0QsV0FBVyxFQUFFO29CQUNaLElBQUksRUFBRSwyQkFBMkI7aUJBQ2pDO2FBQ0Q7U0FDRDtLQUNEO0lBQ0QsVUFBVSxFQUFFO1FBQ1gsS0FBSyxFQUFFO1lBQ04sSUFBSSxFQUFFLE9BQU87WUFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsOENBQThDLENBQUM7WUFDekYsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2dCQUNkLFVBQVUsRUFBRTtvQkFDWCxFQUFFLEVBQUU7d0JBQ0gsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDO3dCQUM3RCxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU07d0JBQzNCLG1CQUFtQixFQUFFLGtCQUFrQjtxQkFDdkM7b0JBQ0QsR0FBRyxFQUFFO3dCQUNKLElBQUksRUFBRSxPQUFPO3dCQUNiLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSwyQkFBMkIsQ0FBQzt3QkFDcEUsS0FBSyxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFVBQVUsRUFBRTtnQ0FDWCxJQUFJLEVBQUU7b0NBQ0wsSUFBSSxFQUFFLFFBQVE7b0NBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsOERBQThELENBQUM7aUNBQzdHO2dDQUNELE1BQU0sRUFBRTtvQ0FDUCxJQUFJLEVBQUUsUUFBUTtvQ0FDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx5QkFBeUIsQ0FBQztvQ0FDMUUsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLEtBQUssQ0FBQztpQ0FDM0U7NkJBQ0Q7NEJBQ0QsUUFBUSxFQUFFO2dDQUNULE1BQU07Z0NBQ04sUUFBUTs2QkFDUjt5QkFDRDtxQkFDRDtvQkFDRCxNQUFNLEVBQUU7d0JBQ1AsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsNEdBQTRHLENBQUM7d0JBQzdKLE9BQU8sRUFBRSxlQUFlLENBQUMsTUFBTTtxQkFDL0I7b0JBQ0QsS0FBSyxFQUFFO3dCQUNOLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDBHQUEwRyxDQUFDO3dCQUMxSixPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU07cUJBQzlCO29CQUNELElBQUksRUFBRTt3QkFDTCxJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxrR0FBa0csQ0FBQzt3QkFDakosT0FBTyxFQUFFLGFBQWEsQ0FBQyxNQUFNO3FCQUM3QjtpQkFDRDtnQkFDRCxRQUFRLEVBQUU7b0JBQ1QsSUFBSTtvQkFDSixLQUFLO2lCQUNMO2FBQ0Q7U0FDRDtRQUNELGVBQWUsRUFBRTtZQUNoQixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDRFQUE0RSxDQUFDO1lBQ2pJLG9CQUFvQixFQUFFO2dCQUNyQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxpRUFBaUUsQ0FBQztnQkFDckgsVUFBVSxFQUFFO29CQUNYLFFBQVEsRUFBRTt3QkFDVCxJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSw0RkFBNEYsQ0FBQztxQkFDMUk7b0JBQ0QsYUFBYSxFQUFFO3dCQUNkLElBQUksRUFBRSxRQUFRO3dCQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDREQUE0RCxDQUFDO3FCQUMvRztvQkFDRCxTQUFTLEVBQUU7d0JBQ1YsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsTUFBTSxFQUFFLFdBQVc7d0JBQ25CLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDRDQUE0QyxDQUFDO3dCQUMzRixPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU07cUJBQzlCO29CQUNELFFBQVEsRUFBRTt3QkFDVCxJQUFJLEVBQUUsUUFBUTt3QkFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSwySEFBMkgsQ0FBQzt3QkFDekssT0FBTyxFQUFFLGFBQWEsQ0FBQyxNQUFNO3FCQUM3QjtvQkFDRCxNQUFNLEVBQUU7d0JBQ1AsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLDJGQUEyRixDQUFDO3dCQUN2SSxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU07d0JBQzNCLG1CQUFtQixFQUFFLGtCQUFrQjtxQkFDdkM7aUJBQ0Q7YUFDRDtTQUNEO1FBQ0QsY0FBYyxFQUFFO1lBQ2YsSUFBSSxFQUFFLDhCQUE4QjtTQUNwQztRQUNELE1BQU0sRUFBRTtZQUNQLElBQUksRUFBRSxzQkFBc0I7U0FDNUI7UUFDRCxJQUFJLEVBQUU7WUFDTCxJQUFJLEVBQUUsb0JBQW9CO1NBQzFCO1FBQ0QsV0FBVyxFQUFFO1lBQ1osSUFBSSxFQUFFLDJCQUEyQjtTQUNqQztRQUNELG1CQUFtQixFQUFFO1lBQ3BCLElBQUksRUFBRSxtQ0FBbUM7U0FDekM7UUFDRCxVQUFVLEVBQUU7WUFDWCxJQUFJLEVBQUUsMEJBQTBCO1NBQ2hDO1FBQ0Qsa0JBQWtCLEVBQUU7WUFDbkIsSUFBSSxFQUFFLGtDQUFrQztTQUN4QztRQUNELGVBQWUsRUFBRTtZQUNoQixJQUFJLEVBQUUsK0JBQStCO1NBQ3JDO1FBQ0QsdUJBQXVCLEVBQUU7WUFDeEIsSUFBSSxFQUFFLHVDQUF1QztTQUM3QztRQUNELGNBQWMsRUFBRTtZQUNmLElBQUksRUFBRSw4QkFBOEI7U0FDcEM7UUFDRCxTQUFTLEVBQUU7WUFDVixJQUFJLEVBQUUseUJBQXlCO1NBQy9CO1FBQ0QsV0FBVyxFQUFFO1lBQ1osSUFBSSxFQUFFLDJCQUEyQjtTQUNqQztRQUNELEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSw0QkFBNEI7WUFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLDZEQUE2RCxDQUFDO1NBQ3hHO1FBQ0QsWUFBWSxFQUFFO1lBQ2IsSUFBSSxFQUFFLDRCQUE0QjtZQUNsQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxxRUFBcUUsQ0FBQztTQUN2SDtRQUNELG1CQUFtQixFQUFFO1lBQ3BCLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsNEZBQTRGLENBQUM7U0FDcko7UUFDRCxxQkFBcUIsRUFBRTtZQUN0QixJQUFJLEVBQUUsU0FBUztZQUNmLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLG1IQUFtSCxDQUFDO1NBQzlLO0tBQ0Q7Q0FDRCxDQUFDO0FBRUYsTUFBTSxVQUFVLDRCQUE0QjtJQUMzQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUE0QixjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUMvRixjQUFjLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNqRCxDQUFDIn0=