/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../common/lifecycle.js';
import { getWindows, sharedMutationObserver } from './dom.js';
import { mainWindow } from './window.js';
const globalStylesheets = new Map();
export function isGlobalStylesheet(node) {
    return globalStylesheets.has(node);
}
/**
 * A version of createStyleSheet which has a unified API to initialize/set the style content.
 */
export function createStyleSheet2() {
    return new WrappedStyleElement();
}
class WrappedStyleElement {
    constructor() {
        this._currentCssStyle = '';
        this._styleSheet = undefined;
    }
    setStyle(cssStyle) {
        if (cssStyle === this._currentCssStyle) {
            return;
        }
        this._currentCssStyle = cssStyle;
        if (!this._styleSheet) {
            this._styleSheet = createStyleSheet(mainWindow.document.head, (s) => s.innerText = cssStyle);
        }
        else {
            this._styleSheet.innerText = cssStyle;
        }
    }
    dispose() {
        if (this._styleSheet) {
            this._styleSheet.remove();
            this._styleSheet = undefined;
        }
    }
}
export function createStyleSheet(container = mainWindow.document.head, beforeAppend, disposableStore) {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.media = 'screen';
    beforeAppend?.(style);
    container.appendChild(style);
    if (disposableStore) {
        disposableStore.add(toDisposable(() => style.remove()));
    }
    // With <head> as container, the stylesheet becomes global and is tracked
    // to support auxiliary windows to clone the stylesheet.
    if (container === mainWindow.document.head) {
        const globalStylesheetClones = new Set();
        globalStylesheets.set(style, globalStylesheetClones);
        for (const { window: targetWindow, disposables } of getWindows()) {
            if (targetWindow === mainWindow) {
                continue; // main window is already tracked
            }
            const cloneDisposable = disposables.add(cloneGlobalStyleSheet(style, globalStylesheetClones, targetWindow));
            disposableStore?.add(cloneDisposable);
        }
    }
    return style;
}
export function cloneGlobalStylesheets(targetWindow) {
    const disposables = new DisposableStore();
    for (const [globalStylesheet, clonedGlobalStylesheets] of globalStylesheets) {
        disposables.add(cloneGlobalStyleSheet(globalStylesheet, clonedGlobalStylesheets, targetWindow));
    }
    return disposables;
}
function cloneGlobalStyleSheet(globalStylesheet, globalStylesheetClones, targetWindow) {
    const disposables = new DisposableStore();
    const clone = globalStylesheet.cloneNode(true);
    targetWindow.document.head.appendChild(clone);
    disposables.add(toDisposable(() => clone.remove()));
    for (const rule of getDynamicStyleSheetRules(globalStylesheet)) {
        clone.sheet?.insertRule(rule.cssText, clone.sheet?.cssRules.length);
    }
    disposables.add(sharedMutationObserver.observe(globalStylesheet, disposables, { childList: true })(() => {
        clone.textContent = globalStylesheet.textContent;
    }));
    globalStylesheetClones.add(clone);
    disposables.add(toDisposable(() => globalStylesheetClones.delete(clone)));
    return disposables;
}
let _sharedStyleSheet = null;
function getSharedStyleSheet() {
    if (!_sharedStyleSheet) {
        _sharedStyleSheet = createStyleSheet();
    }
    return _sharedStyleSheet;
}
function getDynamicStyleSheetRules(style) {
    if (style?.sheet?.rules) {
        // Chrome, IE
        return style.sheet.rules;
    }
    if (style?.sheet?.cssRules) {
        // FF
        return style.sheet.cssRules;
    }
    return [];
}
export function createCSSRule(selector, cssText, style = getSharedStyleSheet()) {
    if (!style || !cssText) {
        return;
    }
    style.sheet?.insertRule(`${selector} {${cssText}}`, 0);
    // Apply rule also to all cloned global stylesheets
    for (const clonedGlobalStylesheet of globalStylesheets.get(style) ?? []) {
        createCSSRule(selector, cssText, clonedGlobalStylesheet);
    }
}
export function removeCSSRulesContainingSelector(ruleName, style = getSharedStyleSheet()) {
    if (!style) {
        return;
    }
    const rules = getDynamicStyleSheetRules(style);
    const toDelete = [];
    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (isCSSStyleRule(rule) && rule.selectorText.indexOf(ruleName) !== -1) {
            toDelete.push(i);
        }
    }
    for (let i = toDelete.length - 1; i >= 0; i--) {
        style.sheet?.deleteRule(toDelete[i]);
    }
    // Remove rules also from all cloned global stylesheets
    for (const clonedGlobalStylesheet of globalStylesheets.get(style) ?? []) {
        removeCSSRulesContainingSelector(ruleName, clonedGlobalStylesheet);
    }
}
function isCSSStyleRule(rule) {
    return typeof rule.selectorText === 'string';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tU3R5bGVzaGVldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2RvbVN0eWxlc2hlZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFlLE1BQU0sd0JBQXdCLENBQUM7QUFDcEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXpDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQXdILENBQUM7QUFFMUosTUFBTSxVQUFVLGtCQUFrQixDQUFDLElBQVU7SUFDNUMsT0FBTyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBd0IsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxpQkFBaUI7SUFDaEMsT0FBTyxJQUFJLG1CQUFtQixFQUFFLENBQUM7QUFDbEMsQ0FBQztBQUVELE1BQU0sbUJBQW1CO0lBQXpCO1FBQ1MscUJBQWdCLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLGdCQUFXLEdBQWlDLFNBQVMsQ0FBQztJQXFCL0QsQ0FBQztJQW5CTyxRQUFRLENBQUMsUUFBZ0I7UUFDL0IsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDeEMsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDO1FBRWpDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENB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