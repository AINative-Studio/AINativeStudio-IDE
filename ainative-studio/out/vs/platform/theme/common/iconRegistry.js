/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Codicon } from '../../../base/common/codicons.js';
import { getCodiconFontCharacters } from '../../../base/common/codiconsUtil.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Emitter } from '../../../base/common/event.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { Extensions as JSONExtensions } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
//  ------ API types
// icon registry
export const Extensions = {
    IconContribution: 'base.contributions.icons'
};
export var IconContribution;
(function (IconContribution) {
    function getDefinition(contribution, registry) {
        let definition = contribution.defaults;
        while (ThemeIcon.isThemeIcon(definition)) {
            const c = iconRegistry.getIcon(definition.id);
            if (!c) {
                return undefined;
            }
            definition = c.defaults;
        }
        return definition;
    }
    IconContribution.getDefinition = getDefinition;
})(IconContribution || (IconContribution = {}));
export var IconFontDefinition;
(function (IconFontDefinition) {
    function toJSONObject(iconFont) {
        return {
            weight: iconFont.weight,
            style: iconFont.style,
            src: iconFont.src.map(s => ({ format: s.format, location: s.location.toString() }))
        };
    }
    IconFontDefinition.toJSONObject = toJSONObject;
    function fromJSONObject(json) {
        const stringOrUndef = (s) => isString(s) ? s : undefined;
        if (json && Array.isArray(json.src) && json.src.every((s) => isString(s.format) && isString(s.location))) {
            return {
                weight: stringOrUndef(json.weight),
                style: stringOrUndef(json.style),
                src: json.src.map((s) => ({ format: s.format, location: URI.parse(s.location) }))
            };
        }
        return undefined;
    }
    IconFontDefinition.fromJSONObject = fromJSONObject;
})(IconFontDefinition || (IconFontDefinition = {}));
// regexes for validation of font properties
export const fontIdRegex = /^([\w_-]+)$/;
export const fontStyleRegex = /^(normal|italic|(oblique[ \w\s-]+))$/;
export const fontWeightRegex = /^(normal|bold|lighter|bolder|(\d{0-1000}))$/;
export const fontSizeRegex = /^([\w_.%+-]+)$/;
export const fontFormatRegex = /^woff|woff2|truetype|opentype|embedded-opentype|svg$/;
export const fontColorRegex = /^#[0-9a-fA-F]{0,6}$/;
export const fontIdErrorMessage = localize('schema.fontId.formatError', 'The font ID must only contain letters, numbers, underscores and dashes.');
class IconRegistry {
    constructor() {
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.iconSchema = {
            definitions: {
                icons: {
                    type: 'object',
                    properties: {
                        fontId: { type: 'string', description: localize('iconDefinition.fontId', 'The id of the font to use. If not set, the font that is defined first is used.'), pattern: fontIdRegex.source, patternErrorMessage: fontIdErrorMessage },
                        fontCharacter: { type: 'string', description: localize('iconDefinition.fontCharacter', 'The font character associated with the icon definition.') }
                    },
                    additionalProperties: false,
                    defaultSnippets: [{ body: { fontCharacter: '\\\\e030' } }]
                }
            },
            type: 'object',
            properties: {}
        };
        this.iconReferenceSchema = { type: 'string', pattern: `^${ThemeIcon.iconNameExpression}$`, enum: [], enumDescriptions: [] };
        this.iconsById = {};
        this.iconFontsById = {};
    }
    registerIcon(id, defaults, description, deprecationMessage) {
        const existing = this.iconsById[id];
        if (existing) {
            if (description && !existing.description) {
                existing.description = description;
                this.iconSchema.properties[id].markdownDescription = `${description} $(${id})`;
                const enumIndex = this.iconReferenceSchema.enum.indexOf(id);
                if (enumIndex !== -1) {
                    this.iconReferenceSchema.enumDescriptions[enumIndex] = description;
                }
                this._onDidChange.fire();
            }
            return existing;
        }
        const iconContribution = { id, description, defaults, deprecationMessage };
        this.iconsById[id] = iconContribution;
        const propertySchema = { $ref: '#/definitions/icons' };
        if (deprecationMessage) {
            propertySchema.deprecationMessage = deprecationMessage;
        }
        if (description) {
            propertySchema.markdownDescription = `${description}: $(${id})`;
        }
        this.iconSchema.properties[id] = propertySchema;
        this.iconReferenceSchema.enum.push(id);
        this.iconReferenceSchema.enumDescriptions.push(description || '');
        this._onDidChange.fire();
        return { id };
    }
    deregisterIcon(id) {
        delete this.iconsById[id];
        delete this.iconSchema.properties[id];
        const index = this.iconReferenceSchema.enum.indexOf(id);
        if (index !== -1) {
            this.iconReferenceSchema.enum.splice(index, 1);
            this.iconReferenceSchema.enumDescriptions.splice(index, 1);
        }
        this._onDidChange.fire();
    }
    getIcons() {
        return Object.keys(this.iconsById).map(id => this.iconsById[id]);
    }
    getIcon(id) {
        return this.iconsById[id];
    }
    getIconSchema() {
        return this.iconSchema;
    }
    getIconReferenceSchema() {
        return this.iconReferenceSchema;
    }
    registerIconFont(id, definition) {
        const existing = this.iconFontsById[id];
        if (existing) {
            return existing;
        }
        this.iconFontsById[id] = definition;
        this._onDidChange.fire();
        return definition;
    }
    deregisterIconFont(id) {
        delete this.iconFontsById[id];
    }
    getIconFont(id) {
        return this.iconFontsById[id];
    }
    toString() {
        const sorter = (i1, i2) => {
            return i1.id.localeCompare(i2.id);
        };
        const classNames = (i) => {
            while (ThemeIcon.isThemeIcon(i.defaults)) {
                i = this.iconsById[i.defaults.id];
            }
            return `codicon codicon-${i ? i.id : ''}`;
        };
        const reference = [];
        reference.push(`| preview     | identifier                        | default codicon ID                | description`);
        reference.push(`| ----------- | --------------------------------- | --------------------------------- | --------------------------------- |`);
        const contributions = Object.keys(this.iconsById).map(key => this.iconsById[key]);
        for (const i of contributions.filter(i => !!i.description).sort(sorter)) {
            reference.push(`|<i class="${classNames(i)}"></i>|${i.id}|${ThemeIcon.isThemeIcon(i.defaults) ? i.defaults.id : i.id}|${i.description || ''}|`);
        }
        reference.push(`| preview     | identifier                        `);
        reference.push(`| ----------- | --------------------------------- |`);
        for (const i of contributions.filter(i => !ThemeIcon.isThemeIcon(i.defaults)).sort(sorter)) {
            reference.push(`|<i class="${classNames(i)}"></i>|${i.id}|`);
        }
        return reference.join('\n');
    }
}
const iconRegistry = new IconRegistry();
platform.Registry.add(Extensions.IconContribution, iconRegistry);
export function registerIcon(id, defaults, description, deprecationMessage) {
    return iconRegistry.registerIcon(id, defaults, description, deprecationMessage);
}
export function getIconRegistry() {
    return iconRegistry;
}
function initialize() {
    const codiconFontCharacters = getCodiconFontCharacters();
    for (const icon in codiconFontCharacters) {
        const fontCharacter = '\\' + codiconFontCharacters[icon].toString(16);
        iconRegistry.registerIcon(icon, { fontCharacter });
    }
}
initialize();
export const iconsSchemaId = 'vscode://schemas/icons';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(iconsSchemaId, iconRegistry.getIconSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(iconsSchemaId), 200);
iconRegistry.onDidChange(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
//setTimeout(_ => console.log(iconRegistry.toString()), 5000);
// common icons
export const widgetClose = registerIcon('widget-close', Codicon.close, localize('widgetClose', 'Icon for the close action in widgets.'));
export const gotoPreviousLocation = registerIcon('goto-previous-location', Codicon.arrowUp, localize('previousChangeIcon', 'Icon for goto previous editor location.'));
export const gotoNextLocation = registerIcon('goto-next-location', Codicon.arrowDown, localize('nextChangeIcon', 'Icon for goto next editor location.'));
export const syncing = ThemeIcon.modify(Codicon.sync, 'spin');
export const spinningLoading = ThemeIcon.modify(Codicon.loading, 'spin');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2NvbW1vbi9pY29uUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxTQUFTLEVBQWtCLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxVQUFVLElBQUksY0FBYyxFQUE2QixNQUFNLHNEQUFzRCxDQUFDO0FBQy9ILE9BQU8sS0FBSyxRQUFRLE1BQU0sbUNBQW1DLENBQUM7QUFFOUQsb0JBQW9CO0FBR3BCLGdCQUFnQjtBQUNoQixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUc7SUFDekIsZ0JBQWdCLEVBQUUsMEJBQTBCO0NBQzVDLENBQUM7QUFpQkYsTUFBTSxLQUFXLGdCQUFnQixDQVloQztBQVpELFdBQWlCLGdCQUFnQjtJQUNoQyxTQUFnQixhQUFhLENBQUMsWUFBOEIsRUFBRSxRQUF1QjtRQUNwRixJQUFJLFVBQVUsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO1FBQ3ZDLE9BQU8sU0FBUyxDQUFDLFdBQVcsQ0FB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