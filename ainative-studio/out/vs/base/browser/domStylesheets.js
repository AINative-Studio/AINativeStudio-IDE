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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tU3R5bGVzaGVldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvZG9tU3R5bGVzaGVldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQWUsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRixPQUFPLEVBQUUsVUFBVSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFekMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBd0gsQ0FBQztBQUUxSixNQUFNLFVBQVUsa0JBQWtCLENBQUMsSUFBVTtJQUM1QyxPQUFPLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUF3QixDQUFDLENBQUM7QUFDeEQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQjtJQUNoQyxPQUFPLElBQUksbUJBQW1CLEVBQUUsQ0FBQztBQUNsQyxDQUFDO0FBRUQsTUFBTSxtQkFBbUI7SUFBekI7UUFDUyxxQkFBZ0IsR0FBRyxFQUFFLENBQUM7UUFDdEIsZ0JBQVcsR0FBaUMsU0FBUyxDQUFDO0lBcUIvRCxDQUFDO0lBbkJPLFFBQVEsQ0FBQyxRQUFnQjtRQUMvQixJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QyxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUM7UUFFakMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FB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