/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as css from '../../../base/browser/cssValue.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { getIconRegistry } from '../common/iconRegistry.js';
export function getIconsStyleSheet(themeService) {
    const disposable = new DisposableStore();
    const onDidChangeEmmiter = disposable.add(new Emitter());
    const iconRegistry = getIconRegistry();
    disposable.add(iconRegistry.onDidChange(() => onDidChangeEmmiter.fire()));
    if (themeService) {
        disposable.add(themeService.onDidProductIconThemeChange(() => onDidChangeEmmiter.fire()));
    }
    return {
        dispose: () => disposable.dispose(),
        onDidChange: onDidChangeEmmiter.event,
        getCSS() {
            const productIconTheme = themeService ? themeService.getProductIconTheme() : new UnthemedProductIconTheme();
            const usedFontIds = {};
            const rules = new css.Builder();
            const rootAttribs = new css.Builder();
            for (const contribution of iconRegistry.getIcons()) {
                const definition = productIconTheme.getIcon(contribution);
                if (!definition) {
                    continue;
                }
                const fontContribution = definition.font;
                const fontFamilyVar = css.inline `--vscode-icon-${css.className(contribution.id)}-font-family`;
                const contentVar = css.inline `--vscode-icon-${css.className(contribution.id)}-content`;
                if (fontContribution) {
                    usedFontIds[fontContribution.id] = fontContribution.definition;
                    rootAttribs.push(css.inline `${fontFamilyVar}: ${css.stringValue(fontContribution.id)};`, css.inline `${contentVar}: ${css.stringValue(definition.fontCharacter)};`);
                    rules.push(css.inline `.codicon-${css.className(contribution.id)}:before { content: ${css.stringValue(definition.fontCharacter)}; font-family: ${css.stringValue(fontContribution.id)}; }`);
                }
                else {
                    rootAttribs.push(css.inline `${contentVar}: ${css.stringValue(definition.fontCharacter)}; ${fontFamilyVar}: 'codicon';`);
                    rules.push(css.inline `.codicon-${css.className(contribution.id)}:before { content: ${css.stringValue(definition.fontCharacter)}; }`);
                }
            }
            for (const id in usedFontIds) {
                const definition = usedFontIds[id];
                const fontWeight = definition.weight ? css.inline `font-weight: ${css.identValue(definition.weight)};` : css.inline ``;
                const fontStyle = definition.style ? css.inline `font-style: ${css.identValue(definition.style)};` : css.inline ``;
                const src = new css.Builder();
                for (const l of definition.src) {
                    src.push(css.inline `${css.asCSSUrl(l.location)} format(${css.stringValue(l.format)})`);
                }
                rules.push(css.inline `@font-face { src: ${src.join(', ')}; font-family: ${css.stringValue(id)};${fontWeight}${fontStyle} font-display: block; }`);
            }
            rules.push(css.inline `:root { ${rootAttribs.join(' ')} }`);
            return rules.join('\n');
        }
    };
}
export class UnthemedProductIconTheme {
    getIcon(contribution) {
        const iconRegistry = getIconRegistry();
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbnNTdHlsZVNoZWV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2Jyb3dzZXIvaWNvbnNTdHlsZVNoZWV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sbUNBQW1DLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBd0MsTUFBTSwyQkFBMkIsQ0FBQztBQVFsRyxNQUFNLFVBQVUsa0JBQWtCLENBQUMsWUFBdUM7SUFDekUsTUFBTSxVQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUV6QyxNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sWUFBWSxHQUFHLGVBQWUsRUFBRSxDQUFDO0lBQ3ZDLFVBQVUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUUsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQixVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFB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