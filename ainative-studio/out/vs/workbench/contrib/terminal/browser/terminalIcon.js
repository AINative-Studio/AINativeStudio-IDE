/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hash } from '../../../../base/common/hash.js';
import { URI } from '../../../../base/common/uri.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import { ansiColorMap } from '../common/terminalColorRegistry.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export function getColorClass(terminalOrColorKey) {
    let color = undefined;
    if (typeof terminalOrColorKey === 'string') {
        color = terminalOrColorKey;
    }
    else if (terminalOrColorKey.color) {
        color = terminalOrColorKey.color.replace(/\./g, '_');
    }
    else if (ThemeIcon.isThemeIcon(terminalOrColorKey.icon) && terminalOrColorKey.icon.color) {
        color = terminalOrColorKey.icon.color.id.replace(/\./g, '_');
    }
    if (color) {
        return `terminal-icon-${color.replace(/\./g, '_')}`;
    }
    return undefined;
}
export function getStandardColors(colorTheme) {
    const standardColors = [];
    for (const colorKey in ansiColorMap) {
        const color = colorTheme.getColor(colorKey);
        if (color && !colorKey.toLowerCase().includes('bright')) {
            standardColors.push(colorKey);
        }
    }
    return standardColors;
}
export function createColorStyleElement(colorTheme) {
    const disposable = new DisposableStore();
    const standardColors = getStandardColors(colorTheme);
    const styleElement = createStyleSheet(undefined, undefined, disposable);
    let css = '';
    for (const colorKey of standardColors) {
        const colorClass = getColorClass(colorKey);
        const color = colorTheme.getColor(colorKey);
        if (color) {
            css += (`.monaco-workbench .${colorClass} .codicon:first-child:not(.codicon-split-horizontal):not(.codicon-trashcan):not(.file-icon)` +
                `{ color: ${color} !important; }`);
        }
    }
    styleElement.textContent = css;
    return disposable;
}
export function getColorStyleContent(colorTheme, editor) {
    const standardColors = getStandardColors(colorTheme);
    let css = '';
    for (const colorKey of standardColors) {
        const colorClass = getColorClass(colorKey);
        const color = colorTheme.getColor(colorKey);
        if (color) {
            if (editor) {
                css += (`.monaco-workbench .show-file-icons .predefined-file-icon.terminal-tab.${colorClass}::before,` +
                    `.monaco-workbench .show-file-icons .file-icon.terminal-tab.${colorClass}::before` +
                    `{ color: ${color} !important; }`);
            }
            else {
                css += (`.monaco-workbench .${colorClass} .codicon:first-child:not(.codicon-split-horizontal):not(.codicon-trashcan):not(.file-icon)` +
                    `{ color: ${color} !important; }`);
            }
        }
    }
    return css;
}
export function getUriClasses(terminal, colorScheme, extensionContributed) {
    const icon = terminal.icon;
    if (!icon) {
        return undefined;
    }
    const iconClasses = [];
    let uri = undefined;
    if (extensionContributed) {
        if (typeof icon === 'string' && (icon.startsWith('$(') || getIconRegistry().getIcon(icon))) {
            return iconClasses;
        }
        else if (typeof icon === 'string') {
            uri = URI.parse(icon);
        }
    }
    if (icon instanceof URI) {
        uri = icon;
    }
    else if (icon instanceof Object && 'light' in icon && 'dark' in icon) {
        uri = colorScheme === ColorScheme.LIGHT ? icon.light : icon.dark;
    }
    if (uri instanceof URI) {
        const uriIconKey = hash(uri.path).toString(36);
        const className = `terminal-uri-icon-${uriIconKey}`;
        iconClasses.push(className);
        iconClasses.push(`terminal-uri-icon`);
    }
    return iconClasses;
}
export function getIconId(accessor, terminal) {
    if (!terminal.icon || (terminal.icon instanceof Object && !('id' in terminal.icon))) {
        return accessor.get(ITerminalProfileResolverService).getDefaultIcon().id;
    }
    return typeof terminal.icon === 'string' ? terminal.icon : terminal.icon.id;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJY29uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxJY29uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDeEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQU9wRixNQUFNLFVBQVUsYUFBYSxDQUFDLGtCQUE2RjtJQUMxSCxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUM7SUFDdEIsSUFBSSxPQUFPLGtCQUFrQixLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzVDLEtBQUssR0FBRyxrQkFBa0IsQ0FBQztJQUM1QixDQUFDO1NBQU0sSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQyxLQUFLLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdEQsQ0FBQztTQUFNLElBQUksU0FBUyxDQUFD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