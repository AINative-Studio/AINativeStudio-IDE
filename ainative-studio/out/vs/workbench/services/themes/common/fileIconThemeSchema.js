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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUljb25UaGVtZVNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi9maWxlSWNvblRoZW1lU2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLElBQUksY0FBYyxFQUE2QixNQUFNLHFFQUFxRSxDQUFDO0FBRTlJLE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFcEssTUFBTSxRQUFRLEdBQUcsNkJBQTZCLENBQUM7QUFDL0MsTUFBTSxNQUFNLEdBQWdCO0lBQzNCLElBQUksRUFBRSxRQUFRO0lBQ2QsYUFBYSxFQUFFLElBQUk7SUFDbkIsbUJBQW1CLEVBQUUsSUFBSTtJQUN6QixXQUFXLEVBQUU7UUFDWixjQUFjLEVBQUU7WUFDZixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLG9JQUFvSSxDQUFDO1NBQ3hMO1FBQ0QsTUFBTSxFQUFFO1lBQ1AsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUscUdBQXFHLENBQUM7U0FFako7UUFDRCxJQUFJLEVBQUU7WUFDTCxJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxzR0FBc0csQ0FBQztTQUVoSjtRQUNE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