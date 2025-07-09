/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { Extensions as IconRegistryExtensions } from '../../../../platform/theme/common/iconRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import * as resources from '../../../../base/common/resources.js';
import { extname, posix } from '../../../../base/common/path.js';
const iconRegistry = Registry.as(IconRegistryExtensions.IconContribution);
const iconReferenceSchema = iconRegistry.getIconReferenceSchema();
const iconIdPattern = `^${ThemeIcon.iconNameSegment}(-${ThemeIcon.iconNameSegment})+$`;
const iconConfigurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'icons',
    jsonSchema: {
        description: nls.localize('contributes.icons', 'Contributes extension defined themable icons'),
        type: 'object',
        propertyNames: {
            pattern: iconIdPattern,
            description: nls.localize('contributes.icon.id', 'The identifier of the themable icon'),
            patternErrorMessage: nls.localize('contributes.icon.id.format', 'Identifiers can only contain letters, digits and minuses and need to consist of at least two segments in the form `component-iconname`.'),
        },
        additionalProperties: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: nls.localize('contributes.icon.description', 'The description of the themable icon'),
                },
                default: {
                    anyOf: [
                        iconReferenceSchema,
                        {
                            type: 'object',
                            properties: {
                                fontPath: {
                                    description: nls.localize('contributes.icon.default.fontPath', 'The path of the icon font that defines the icon.'),
                                    type: 'string'
                                },
                                fontCharacter: {
                                    description: nls.localize('contributes.icon.default.fontCharacter', 'The character for the icon in the icon font.'),
                                    type: 'string'
                                }
                            },
                            required: ['fontPath', 'fontCharacter'],
                            defaultSnippets: [{ body: { fontPath: '${1:myiconfont.woff}', fontCharacter: '${2:\\\\E001}' } }]
                        }
                    ],
                    description: nls.localize('contributes.icon.default', 'The default of the icon. Either a reference to an existing ThemeIcon or an icon in an icon font.'),
                }
            },
            required: ['description', 'default'],
            defaultSnippets: [{ body: { description: '${1:my icon}', default: { fontPath: '${2:myiconfont.woff}', fontCharacter: '${3:\\\\E001}' } } }]
        },
        defaultSnippets: [{ body: { '${1:my-icon-id}': { description: '${2:my icon}', default: { fontPath: '${3:myiconfont.woff}', fontCharacter: '${4:\\\\E001}' } } } }]
    }
});
export class IconExtensionPoint {
    constructor() {
        iconConfigurationExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || typeof extensionValue !== 'object') {
                    collector.error(nls.localize('invalid.icons.configuration', "'configuration.icons' must be an object with the icon names as properties."));
                    return;
                }
                for (const id in extensionValue) {
                    if (!id.match(iconIdPattern)) {
                        collector.error(nls.localize('invalid.icons.id.format', "'configuration.icons' keys represent the icon id and can only contain letter, digits and minuses. They need to consist of at least two segments in the form `component-iconname`."));
                        return;
                    }
                    const iconContribution = extensionValue[id];
                    if (typeof iconContribution.description !== 'string' || iconContribution.description.length === 0) {
                        collector.error(nls.localize('invalid.icons.description', "'configuration.icons.description' must be defined and can not be empty"));
                        return;
                    }
                    const defaultIcon = iconContribution.default;
                    if (typeof defaultIcon === 'string') {
                        iconRegistry.registerIcon(id, { id: defaultIcon }, iconContribution.description);
                    }
                    else if (typeof defaultIcon === 'object' && typeof defaultIcon.fontPath === 'string' && typeof defaultIcon.fontCharacter === 'string') {
                        const fileExt = extname(defaultIcon.fontPath).substring(1);
                        const format = formatMap[fileExt];
                        if (!format) {
                            collector.warn(nls.localize('invalid.icons.default.fontPath.extension', "Expected `contributes.icons.default.fontPath` to have file extension 'woff', woff2' or 'ttf', is '{0}'.", fileExt));
                            return;
                        }
                        const extensionLocation = extension.description.extensionLocation;
                        const iconFontLocation = resources.joinPath(extensionLocation, defaultIcon.fontPath);
                        const fontId = getFontId(extension.description, defaultIcon.fontPath);
                        const definition = iconRegistry.registerIconFont(fontId, { src: [{ location: iconFontLocation, format }] });
                        if (!resources.isEqualOrParent(iconFontLocation, extensionLocation)) {
                            collector.warn(nls.localize('invalid.icons.default.fontPath.path', "Expected `contributes.icons.default.fontPath` ({0}) to be included inside extension's folder ({0}).", iconFontLocation.path, extensionLocation.path));
                            return;
                        }
                        iconRegistry.registerIcon(id, {
                            fontCharacter: defaultIcon.fontCharacter,
                            font: {
                                id: fontId,
                                definition
                            }
                        }, iconContribution.description);
                    }
                    else {
                        collector.error(nls.localize('invalid.icons.default', "'configuration.icons.default' must be either a reference to the id of an other theme icon (string) or a icon definition (object) with properties `fontPath` and `fontCharacter`."));
                    }
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const id in extensionValue) {
                    iconRegistry.deregisterIcon(id);
                }
            }
        });
    }
}
const formatMap = {
    'ttf': 'truetype',
    'woff': 'woff',
    'woff2': 'woff2'
};
function getFontId(description, fontPath) {
    return posix.join(description.identifier.value, fontPath);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkV4dGVuc2lvblBvaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL2ljb25FeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ25GLE9BQU8sRUFBaUIsVUFBVSxJQUFJLHNCQUFzQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFTakUsTUFBTSxZQUFZLEdBQWtCLFFBQVEsQ0FBQyxFQUFFLENBQWdCLHNCQUFzQixDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFeEcsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztBQUNsRSxNQUFNLGFBQWEsR0FBRyxJQUFJLFNBQVMsQ0FBQyxlQUFlLEtBQUssU0FBUyxDQUFDLGVBQWUsS0FBSyxDQUFDO0FBRXZGLE1BQU0seUJBQXlCLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBQXNCO0lBQ2hHLGNBQWMsRUFBRSxPQUFPO0lBQ3ZCLFVBQVUsRUFBRTtRQUNYLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDhDQUE4QyxDQUFDO1FBQzlGLElBQUksRUFB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