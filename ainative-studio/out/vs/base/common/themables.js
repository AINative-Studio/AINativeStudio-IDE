/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from './codicons.js';
export var ThemeColor;
(function (ThemeColor) {
    function isThemeColor(obj) {
        return obj && typeof obj === 'object' && typeof obj.id === 'string';
    }
    ThemeColor.isThemeColor = isThemeColor;
})(ThemeColor || (ThemeColor = {}));
export function themeColorFromId(id) {
    return { id };
}
export var ThemeIcon;
(function (ThemeIcon) {
    ThemeIcon.iconNameSegment = '[A-Za-z0-9]+';
    ThemeIcon.iconNameExpression = '[A-Za-z0-9-]+';
    ThemeIcon.iconModifierExpression = '~[A-Za-z]+';
    ThemeIcon.iconNameCharacter = '[A-Za-z0-9~-]';
    const ThemeIconIdRegex = new RegExp(`^(${ThemeIcon.iconNameExpression})(${ThemeIcon.iconModifierExpression})?$`);
    function asClassNameArray(icon) {
        const match = ThemeIconIdRegex.exec(icon.id);
        if (!match) {
            return asClassNameArray(Codicon.error);
        }
        const [, id, modifier] = match;
        const classNames = ['codicon', 'codicon-' + id];
        if (modifier) {
            classNames.push('codicon-modifier-' + modifier.substring(1));
        }
        return classNames;
    }
    ThemeIcon.asClassNameArray = asClassNameArray;
    function asClassName(icon) {
        return asClassNameArray(icon).join(' ');
    }
    ThemeIcon.asClassName = asClassName;
    function asCSSSelector(icon) {
        return '.' + asClassNameArray(icon).join('.');
    }
    ThemeIcon.asCSSSelector = asCSSSelector;
    function isThemeIcon(obj) {
        return obj && typeof obj === 'object' && typeof obj.id === 'string' && (typeof obj.color === 'undefined' || ThemeColor.isThemeColor(obj.color));
    }
    ThemeIcon.isThemeIcon = isThemeIcon;
    const _regexFromString = new RegExp(`^\\$\\((${ThemeIcon.iconNameExpression}(?:${ThemeIcon.iconModifierExpression})?)\\)$`);
    function fromString(str) {
        const match = _regexFromString.exec(str);
        if (!match) {
            return undefined;
        }
        const [, name] = match;
        return { id: name };
    }
    ThemeIcon.fromString = fromString;
    function fromId(id) {
        return { id };
    }
    ThemeIcon.fromId = fromId;
    function modify(icon, modifier) {
        let id = icon.id;
        const tildeIndex = id.lastIndexOf('~');
        if (tildeIndex !== -1) {
            id = id.substring(0, tildeIndex);
        }
        if (modifier) {
            id = `${id}~${modifier}`;
        }
        return { id };
    }
    ThemeIcon.modify = modify;
    function getModifier(icon) {
        const tildeIndex = icon.id.lastIndexOf('~');
        if (tildeIndex !== -1) {
            return icon.id.substring(tildeIndex + 1);
        }
        return undefined;
    }
    ThemeIcon.getModifier = getModifier;
    function isEqual(ti1, ti2) {
        return ti1.id === ti2.id && ti1.color?.id === ti2.color?.id;
    }
    ThemeIcon.isEqual = isEqual;
})(ThemeIcon || (ThemeIcon = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWFibGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3RoZW1hYmxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBVXhDLE1BQU0sS0FBVyxVQUFVLENBSTFCO0FBSkQsV0FBaUIsVUFBVTtJQUMxQixTQUFnQixZQUFZLENBQUMsR0FBUTtRQUNwQyxPQUFPLEdBQUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksT0FBb0IsR0FBSSxDQUFDLEVBQUUsS0FBSyxRQUFRLENBQUM7SUFDbkYsQ0FBQztJQUZlLHVCQUFZLGVBRTNCLENBQUE7QUFDRixDQUFDLEVBSmdCLFVBQVUsS0FBVixVQUFVLFFBSTFCO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLEVBQW1CO0lBQ25ELE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQztBQUNmLENBQUM7QUFRRCxNQUFNLEtBQVcsU0FBUyxDQXdFekI7QUF4RUQsV0FBaUIsU0FBUztJQUNaLHlCQUFlLEdBQUcsY0FBYyxDQUFDO0lBQ2pDLDRCQUFrQixHQUFHLGVBQWUsQ0FBQztJQUNyQyxnQ0FBc0IsR0FBRyxZQUFZLENBQUM7SUFDdEMsMkJBQWlCLEdBQUcsZUFBZSxDQUFDO0lBRWpELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxNQUFNLENBQUMsS0FBSyxVQUFBLGtCQUFrQixLQUFLLFVBQUEsc0JBQXNCLEtBQUssQ0FBQyxDQUFDO0lBRTdGLFNBQWdCLGdCQUFnQixDQUFDLElBQWU7UUFDL0MsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7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