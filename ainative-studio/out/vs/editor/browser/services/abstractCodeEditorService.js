/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheets from '../../../base/browser/domStylesheets.js';
import * as cssJs from '../../../base/browser/cssValue.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, Disposable, toDisposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import * as strings from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { isThemeColor } from '../../common/editorCommon.js';
import { OverviewRulerLane } from '../../common/model.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
let AbstractCodeEditorService = class AbstractCodeEditorService extends Disposable {
    constructor(_themeService) {
        super();
        this._themeService = _themeService;
        this._onWillCreateCodeEditor = this._register(new Emitter());
        this.onWillCreateCodeEditor = this._onWillCreateCodeEditor.event;
        this._onCodeEditorAdd = this._register(new Emitter());
        this.onCodeEditorAdd = this._onCodeEditorAdd.event;
        this._onCodeEditorRemove = this._register(new Emitter());
        this.onCodeEditorRemove = this._onCodeEditorRemove.event;
        this._onWillCreateDiffEditor = this._register(new Emitter());
        this.onWillCreateDiffEditor = this._onWillCreateDiffEditor.event;
        this._onDiffEditorAdd = this._register(new Emitter());
        this.onDiffEditorAdd = this._onDiffEditorAdd.event;
        this._onDiffEditorRemove = this._register(new Emitter());
        this.onDiffEditorRemove = this._onDiffEditorRemove.event;
        this._onDidChangeTransientModelProperty = this._register(new Emitter());
        this.onDidChangeTransientModelProperty = this._onDidChangeTransientModelProperty.event;
        this._onDecorationTypeRegistered = this._register(new Emitter());
        this.onDecorationTypeRegistered = this._onDecorationTypeRegistered.event;
        this._decorationOptionProviders = new Map();
        this._editorStyleSheets = new Map();
        this._codeEditorOpenHandlers = new LinkedList();
        this._transientWatchers = this._register(new DisposableMap());
        this._modelProperties = new Map();
        this._codeEditors = Object.create(null);
        this._diffEditors = Object.create(null);
        this._globalStyleSheet = null;
    }
    willCreateCodeEditor() {
        this._onWillCreateCodeEditor.fire();
    }
    addCodeEditor(editor) {
        this._codeEditors[editor.getId()] = editor;
        this._onCodeEditorAdd.fire(editor);
    }
    removeCodeEditor(editor) {
        if (delete this._codeEditors[editor.getId()]) {
            this._onCodeEditorRemove.fire(editor);
        }
    }
    listCodeEditors() {
        return Object.keys(this._codeEditors).map(id => this._codeEditors[id]);
    }
    willCreateDiffEditor() {
        this._onWillCreateDiffEditor.fire();
    }
    addDiffEditor(editor) {
        this._diffEditors[editor.getId()] = editor;
        this._onDiffEditorAdd.fire(editor);
    }
    removeDiffEditor(editor) {
        if (delete this._diffEditors[editor.getId()]) {
            this._onDiffEditorRemove.fire(editor);
        }
    }
    listDiffEditors() {
        return Object.keys(this._diffEditors).map(id => this._diffEditors[id]);
    }
    getFocusedCodeEditor() {
        let editorWithWidgetFocus = null;
        const editors = this.listCodeEditors();
        for (const editor of editors) {
            if (editor.hasTextFocus()) {
                // bingo!
                return editor;
            }
            if (editor.hasWidgetFocus()) {
                editorWithWidgetFocus = editor;
            }
        }
        return editorWithWidgetFocus;
    }
    _getOrCreateGlobalStyleSheet() {
        if (!this._globalStyleSheet) {
            this._globalStyleSheet = this._createGlobalStyleSheet();
        }
        return this._globalStyleSheet;
    }
    _createGlobalStyleSheet() {
        return new GlobalStyleSheet(domStylesheets.createStyleSheet());
    }
    _getOrCreateStyleSheet(editor) {
        if (!editor) {
            return this._getOrCreateGlobalStyleSheet();
        }
        const domNode = editor.getContainerDomNode();
        if (!dom.isInShadowDOM(domNode)) {
            return this._getOrCreateGlobalStyleSheet();
        }
        const editorId = editor.getId();
        if (!this._editorStyleSheets.has(editorId)) {
            const refCountedStyleSheet = new RefCountedStyleSheet(this, editorId, domStylesheets.createStyleSheet(domNode));
            this._editorStyleSheets.set(editorId, refCountedStyleSheet);
        }
        return this._editorStyleSheets.get(editorId);
    }
    _removeEditorStyleSheets(editorId) {
        this._editorStyleSheets.delete(editorId);
    }
    registerDecorationType(description, key, options, parentTypeKey, editor) {
        let provider = this._decorationOptionProviders.get(key);
        if (!provider) {
            const styleSheet = this._getOrCreateStyleSheet(editor);
            const providerArgs = {
                styleSheet: styleSheet,
                key: key,
                parentTypeKey: parentTypeKey,
                options: options || Object.create(null)
            };
            if (!parentTypeKey) {
                provider = new DecorationTypeOptionsProvider(description, this._themeService, styleSheet, providerArgs);
            }
            else {
                provider = new DecorationSubTypeOptionsProvider(this._themeService, styleSheet, providerArgs);
            }
            this._decorationOptionProviders.set(key, provider);
            this._onDecorationTypeRegistered.fire(key);
        }
        provider.refCount++;
        return {
            dispose: () => {
                this.removeDecorationType(key);
            }
        };
    }
    listDecorationTypes() {
        return Array.from(this._decorationOptionProviders.keys());
    }
    removeDecorationType(key) {
        const provider = this._decorationOptionProviders.get(key);
        if (provider) {
            provider.refCount--;
            if (provider.refCount <= 0) {
                this._decorationOptionProviders.delete(key);
                provider.dispose();
                this.listCodeEditors().forEach((ed) => ed.removeDecorationsByType(key));
            }
        }
    }
    resolveDecorationOptions(decorationTypeKey, writable) {
        const provider = this._decorationOptionProviders.get(decorationTypeKey);
        if (!provider) {
            throw new Error('Unknown decoration type key: ' + decorationTypeKey);
        }
        return provider.getOptions(this, writable);
    }
    resolveDecorationCSSRules(decorationTypeKey) {
        const provider = this._decorationOptionProviders.get(decorationTypeKey);
        if (!provider) {
            return null;
        }
        return provider.resolveDecorationCSSRules();
    }
    setModelProperty(resource, key, value) {
        const key1 = resource.toString();
        let dest;
        if (this._modelProperties.has(key1)) {
            dest = this._modelProperties.get(key1);
        }
        else {
            dest = new Map();
            this._modelProperties.set(key1, dest);
        }
        dest.set(key, value);
    }
    getModelProperty(resource, key) {
        const key1 = resource.toString();
        if (this._modelProperties.has(key1)) {
            const innerMap = this._modelProperties.get(key1);
            return innerMap.get(key);
        }
        return undefined;
    }
    setTransientModelProperty(model, key, value) {
        const uri = model.uri.toString();
        let w = this._transientWatchers.get(uri);
        if (!w) {
            w = new ModelTransientSettingWatcher(uri, model, this);
            this._transientWatchers.set(uri, w);
        }
        const previousValue = w.get(key);
        if (previousValue !== value) {
            w.set(key, value);
            this._onDidChangeTransientModelProperty.fire(model);
        }
    }
    getTransientModelProperty(model, key) {
        const uri = model.uri.toString();
        const watcher = this._transientWatchers.get(uri);
        if (!watcher) {
            return undefined;
        }
        return watcher.get(key);
    }
    getTransientModelProperties(model) {
        const uri = model.uri.toString();
        const watcher = this._transientWatchers.get(uri);
        if (!watcher) {
            return undefined;
        }
        return watcher.keys().map(key => [key, watcher.get(key)]);
    }
    _removeWatcher(w) {
        this._transientWatchers.deleteAndDispose(w.uri);
    }
    async openCodeEditor(input, source, sideBySide) {
        for (const handler of this._codeEditorOpenHandlers) {
            const candidate = await handler(input, source, sideBySide);
            if (candidate !== null) {
                return candidate;
            }
        }
        return null;
    }
    registerCodeEditorOpenHandler(handler) {
        const rm = this._codeEditorOpenHandlers.unshift(handler);
        return toDisposable(rm);
    }
};
AbstractCodeEditorService = __decorate([
    __param(0, IThemeService)
], AbstractCodeEditorService);
export { AbstractCodeEditorService };
export class ModelTransientSettingWatcher extends Disposable {
    constructor(uri, model, owner) {
        super();
        this.uri = uri;
        this._values = {};
        this._register(model.onWillDispose(() => owner._removeWatcher(this)));
    }
    set(key, value) {
        this._values[key] = value;
    }
    get(key) {
        return this._values[key];
    }
    keys() {
        return Object.keys(this._values);
    }
}
class RefCountedStyleSheet {
    get sheet() {
        return this._styleSheet.sheet;
    }
    constructor(parent, editorId, styleSheet) {
        this._parent = parent;
        this._editorId = editorId;
        this._styleSheet = styleSheet;
        this._refCount = 0;
    }
    ref() {
        this._refCount++;
    }
    unref() {
        this._refCount--;
        if (this._refCount === 0) {
            this._styleSheet.remove();
            this._parent._removeEditorStyleSheets(this._editorId);
        }
    }
    insertRule(selector, rule) {
        domStylesheets.createCSSRule(selector, rule, this._styleSheet);
    }
    removeRulesContainingSelector(ruleName) {
        domStylesheets.removeCSSRulesContainingSelector(ruleName, this._styleSheet);
    }
}
export class GlobalStyleSheet {
    get sheet() {
        return this._styleSheet.sheet;
    }
    constructor(styleSheet) {
        this._styleSheet = styleSheet;
    }
    ref() {
    }
    unref() {
    }
    insertRule(selector, rule) {
        domStylesheets.createCSSRule(selector, rule, this._styleSheet);
    }
    removeRulesContainingSelector(ruleName) {
        domStylesheets.removeCSSRulesContainingSelector(ruleName, this._styleSheet);
    }
}
class DecorationSubTypeOptionsProvider {
    constructor(themeService, styleSheet, providerArgs) {
        this._styleSheet = styleSheet;
        this._styleSheet.ref();
        this._parentTypeKey = providerArgs.parentTypeKey;
        this.refCount = 0;
        this._beforeContentRules = new DecorationCSSRules(3 /* ModelDecorationCSSRuleType.BeforeContentClassName */, providerArgs, themeService);
        this._afterContentRules = new DecorationCSSRules(4 /* ModelDecorationCSSRuleType.AfterContentClassName */, providerArgs, themeService);
    }
    getOptions(codeEditorService, writable) {
        const options = codeEditorService.resolveDecorationOptions(this._parentTypeKey, true);
        if (this._beforeContentRules) {
            options.beforeContentClassName = this._beforeContentRules.className;
        }
        if (this._afterContentRules) {
            options.afterContentClassName = this._afterContentRules.className;
        }
        return options;
    }
    resolveDecorationCSSRules() {
        return this._styleSheet.sheet.cssRules;
    }
    dispose() {
        if (this._beforeContentRules) {
            this._beforeContentRules.dispose();
            this._beforeContentRules = null;
        }
        if (this._afterContentRules) {
            this._afterContentRules.dispose();
            this._afterContentRules = null;
        }
        this._styleSheet.unref();
    }
}
class DecorationTypeOptionsProvider {
    constructor(description, themeService, styleSheet, providerArgs) {
        this._disposables = new DisposableStore();
        this.description = description;
        this._styleSheet = styleSheet;
        this._styleSheet.ref();
        this.refCount = 0;
        const createCSSRules = (type) => {
            const rules = new DecorationCSSRules(type, providerArgs, themeService);
            this._disposables.add(rules);
            if (rules.hasContent) {
                return rules.className;
            }
            return undefined;
        };
        const createInlineCSSRules = (type) => {
            const rules = new DecorationCSSRules(type, providerArgs, themeService);
            this._disposables.add(rules);
            if (rules.hasContent) {
                return { className: rules.className, hasLetterSpacing: rules.hasLetterSpacing };
            }
            return null;
        };
        this.className = createCSSRules(0 /* ModelDecorationCSSRuleType.ClassName */);
        const inlineData = createInlineCSSRules(1 /* ModelDecorationCSSRuleType.InlineClassName */);
        if (inlineData) {
            this.inlineClassName = inlineData.className;
            this.inlineClassNameAffectsLetterSpacing = inlineData.hasLetterSpacing;
        }
        this.beforeContentClassName = createCSSRules(3 /* ModelDecorationCSSRuleType.BeforeContentClassName */);
        this.afterContentClassName = createCSSRules(4 /* ModelDecorationCSSRuleType.AfterContentClassName */);
        if (providerArgs.options.beforeInjectedText && providerArgs.options.beforeInjectedText.contentText) {
            const beforeInlineData = createInlineCSSRules(5 /* ModelDecorationCSSRuleType.BeforeInjectedTextClassName */);
            this.beforeInjectedText = {
                content: providerArgs.options.beforeInjectedText.contentText,
                inlineClassName: beforeInlineData?.className,
                inlineClassNameAffectsLetterSpacing: beforeInlineData?.hasLetterSpacing || providerArgs.options.beforeInjectedText.affectsLetterSpacing
            };
        }
        if (providerArgs.options.afterInjectedText && providerArgs.options.afterInjectedText.contentText) {
            const afterInlineData = createInlineCSSRules(6 /* ModelDecorationCSSRuleType.AfterInjectedTextClassName */);
            this.afterInjectedText = {
                content: providerArgs.options.afterInjectedText.contentText,
                inlineClassName: afterInlineData?.className,
                inlineClassNameAffectsLetterSpacing: afterInlineData?.hasLetterSpacing || providerArgs.options.afterInjectedText.affectsLetterSpacing
            };
        }
        this.glyphMarginClassName = createCSSRules(2 /* ModelDecorationCSSRuleType.GlyphMarginClassName */);
        const options = providerArgs.options;
        this.isWholeLine = Boolean(options.isWholeLine);
        this.stickiness = options.rangeBehavior;
        const lightOverviewRulerColor = options.light && options.light.overviewRulerColor || options.overviewRulerColor;
        const darkOverviewRulerColor = options.dark && options.dark.overviewRulerColor || options.overviewRulerColor;
        if (typeof lightOverviewRulerColor !== 'undefined'
            || typeof darkOverviewRulerColor !== 'undefined') {
            this.overviewRuler = {
                color: lightOverviewRulerColor || darkOverviewRulerColor,
                darkColor: darkOverviewRulerColor || lightOverviewRulerColor,
                position: options.overviewRulerLane || OverviewRulerLane.Center
            };
        }
    }
    getOptions(codeEditorService, writable) {
        if (!writable) {
            return this;
        }
        return {
            description: this.description,
            inlineClassName: this.inlineClassName,
            beforeContentClassName: this.beforeContentClassName,
            afterContentClassName: this.afterContentClassName,
            className: this.className,
            glyphMarginClassName: this.glyphMarginClassName,
            isWholeLine: this.isWholeLine,
            overviewRuler: this.overviewRuler,
            stickiness: this.stickiness,
            before: this.beforeInjectedText,
            after: this.afterInjectedText
        };
    }
    resolveDecorationCSSRules() {
        return this._styleSheet.sheet.rules;
    }
    dispose() {
        this._disposables.dispose();
        this._styleSheet.unref();
    }
}
export const _CSS_MAP = {
    color: 'color:{0} !important;',
    opacity: 'opacity:{0};',
    backgroundColor: 'background-color:{0};',
    outline: 'outline:{0};',
    outlineColor: 'outline-color:{0};',
    outlineStyle: 'outline-style:{0};',
    outlineWidth: 'outline-width:{0};',
    border: 'border:{0};',
    borderColor: 'border-color:{0};',
    borderRadius: 'border-radius:{0};',
    borderSpacing: 'border-spacing:{0};',
    borderStyle: 'border-style:{0};',
    borderWidth: 'border-width:{0};',
    fontStyle: 'font-style:{0};',
    fontWeight: 'font-weight:{0};',
    fontSize: 'font-size:{0};',
    fontFamily: 'font-family:{0};',
    textDecoration: 'text-decoration:{0};',
    cursor: 'cursor:{0};',
    letterSpacing: 'letter-spacing:{0};',
    gutterIconPath: 'background:{0} center center no-repeat;',
    gutterIconSize: 'background-size:{0};',
    contentText: 'content:\'{0}\';',
    contentIconPath: 'content:{0};',
    margin: 'margin:{0};',
    padding: 'padding:{0};',
    width: 'width:{0};',
    height: 'height:{0};',
    verticalAlign: 'vertical-align:{0};',
};
class DecorationCSSRules {
    constructor(ruleType, providerArgs, themeService) {
        this._theme = themeService.getColorTheme();
        this._ruleType = ruleType;
        this._providerArgs = providerArgs;
        this._usesThemeColors = false;
        this._hasContent = false;
        this._hasLetterSpacing = false;
        let className = CSSNameHelper.getClassName(this._providerArgs.key, ruleType);
        if (this._providerArgs.parentTypeKey) {
            className = className + ' ' + CSSNameHelper.getClassName(this._providerArgs.parentTypeKey, ruleType);
        }
        this._className = className;
        this._unThemedSelector = CSSNameHelper.getSelector(this._providerArgs.key, this._providerArgs.parentTypeKey, ruleType);
        this._buildCSS();
        if (this._usesThemeColors) {
            this._themeListener = themeService.onDidColorThemeChange(theme => {
                this._theme = themeService.getColorTheme();
                this._removeCSS();
                this._buildCSS();
            });
        }
        else {
            this._themeListener = null;
        }
    }
    dispose() {
        if (this._hasContent) {
            this._removeCSS();
            this._hasContent = false;
        }
        if (this._themeListener) {
            this._themeListener.dispose();
            this._themeListener = null;
        }
    }
    get hasContent() {
        return this._hasContent;
    }
    get hasLetterSpacing() {
        return this._hasLetterSpacing;
    }
    get className() {
        return this._className;
    }
    _buildCSS() {
        const options = this._providerArgs.options;
        let unthemedCSS, lightCSS, darkCSS;
        switch (this._ruleType) {
            case 0 /* ModelDecorationCSSRuleType.ClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationClassName(options);
                lightCSS = this.getCSSTextForModelDecorationClassName(options.light);
                darkCSS = this.getCSSTextForModelDecorationClassName(options.dark);
                break;
            case 1 /* ModelDecorationCSSRuleType.InlineClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationInlineClassName(options);
                lightCSS = this.getCSSTextForModelDecorationInlineClassName(options.light);
                darkCSS = this.getCSSTextForModelDecorationInlineClassName(options.dark);
                break;
            case 2 /* ModelDecorationCSSRuleType.GlyphMarginClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationGlyphMarginClassName(options);
                lightCSS = this.getCSSTextForModelDecorationGlyphMarginClassName(options.light);
                darkCSS = this.getCSSTextForModelDecorationGlyphMarginClassName(options.dark);
                break;
            case 3 /* ModelDecorationCSSRuleType.BeforeContentClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.before);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.before);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.before);
                break;
            case 4 /* ModelDecorationCSSRuleType.AfterContentClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.after);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.after);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.after);
                break;
            case 5 /* ModelDecorationCSSRuleType.BeforeInjectedTextClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.beforeInjectedText);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.beforeInjectedText);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.beforeInjectedText);
                break;
            case 6 /* ModelDecorationCSSRuleType.AfterInjectedTextClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.afterInjectedText);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.afterInjectedText);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.afterInjectedText);
                break;
            default:
                throw new Error('Unknown rule type: ' + this._ruleType);
        }
        const sheet = this._providerArgs.styleSheet;
        let hasContent = false;
        if (unthemedCSS.length > 0) {
            sheet.insertRule(this._unThemedSelector, unthemedCSS);
            hasContent = true;
        }
        if (lightCSS.length > 0) {
            sheet.insertRule(`.vs${this._unThemedSelector}, .hc-light${this._unThemedSelector}`, lightCSS);
            hasContent = true;
        }
        if (darkCSS.length > 0) {
            sheet.insertRule(`.vs-dark${this._unThemedSelector}, .hc-black${this._unThemedSelector}`, darkCSS);
            hasContent = true;
        }
        this._hasContent = hasContent;
    }
    _removeCSS() {
        this._providerArgs.styleSheet.removeRulesContainingSelector(this._unThemedSelector);
    }
    /**
     * Build the CSS for decorations styled via `className`.
     */
    getCSSTextForModelDecorationClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        this.collectCSSText(opts, ['backgroundColor'], cssTextArr);
        this.collectCSSText(opts, ['outline', 'outlineColor', 'outlineStyle', 'outlineWidth'], cssTextArr);
        this.collectBorderSettingsCSSText(opts, cssTextArr);
        return cssTextArr.join('');
    }
    /**
     * Build the CSS for decorations styled via `inlineClassName`.
     */
    getCSSTextForModelDecorationInlineClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        this.collectCSSText(opts, ['fontStyle', 'fontWeight', 'textDecoration', 'cursor', 'color', 'opacity', 'letterSpacing'], cssTextArr);
        if (opts.letterSpacing) {
            this._hasLetterSpacing = true;
        }
        return cssTextArr.join('');
    }
    /**
     * Build the CSS for decorations styled before or after content.
     */
    getCSSTextForModelDecorationContentClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        if (typeof opts !== 'undefined') {
            this.collectBorderSettingsCSSText(opts, cssTextArr);
            if (typeof opts.contentIconPath !== 'undefined') {
                cssTextArr.push(strings.format(_CSS_MAP.contentIconPath, cssJs.asCSSUrl(URI.revive(opts.contentIconPath))));
            }
            if (typeof opts.contentText === 'string') {
                const truncated = opts.contentText.match(/^.*$/m)[0]; // only take first line
                const escaped = truncated.replace(/['\\]/g, '\\$&');
                cssTextArr.push(strings.format(_CSS_MAP.contentText, escaped));
            }
            this.collectCSSText(opts, ['verticalAlign', 'fontStyle', 'fontWeight', 'fontSize', 'fontFamily', 'textDecoration', 'color', 'opacity', 'backgroundColor', 'margin', 'padding'], cssTextArr);
            if (this.collectCSSText(opts, ['width', 'height'], cssTextArr)) {
                cssTextArr.push('display:inline-block;');
            }
        }
        return cssTextArr.join('');
    }
    /**
     * Build the CSS for decorations styled via `glyphMarginClassName`.
     */
    getCSSTextForModelDecorationGlyphMarginClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        if (typeof opts.gutterIconPath !== 'undefined') {
            cssTextArr.push(strings.format(_CSS_MAP.gutterIconPath, cssJs.asCSSUrl(URI.revive(opts.gutterIconPath))));
            if (typeof opts.gutterIconSize !== 'undefined') {
                cssTextArr.push(strings.format(_CSS_MAP.gutterIconSize, opts.gutterIconSize));
            }
        }
        return cssTextArr.join('');
    }
    collectBorderSettingsCSSText(opts, cssTextArr) {
        if (this.collectCSSText(opts, ['border', 'borderColor', 'borderRadius', 'borderSpacing', 'borderStyle', 'borderWidth'], cssTextArr)) {
            cssTextArr.push(strings.format('box-sizing: border-box;'));
            return true;
        }
        return false;
    }
    collectCSSText(opts, properties, cssTextArr) {
        const lenBefore = cssTextArr.length;
        for (const property of properties) {
            const value = this.resolveValue(opts[property]);
            if (typeof value === 'string') {
                cssTextArr.push(strings.format(_CSS_MAP[property], value));
            }
        }
        return cssTextArr.length !== lenBefore;
    }
    resolveValue(value) {
        if (isThemeColor(value)) {
            this._usesThemeColors = true;
            const color = this._theme.getColor(value.id);
            if (color) {
                return color.toString();
            }
            return 'transparent';
        }
        return value;
    }
}
var ModelDecorationCSSRuleType;
(function (ModelDecorationCSSRuleType) {
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["ClassName"] = 0] = "ClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["InlineClassName"] = 1] = "InlineClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["GlyphMarginClassName"] = 2] = "GlyphMarginClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["BeforeContentClassName"] = 3] = "BeforeContentClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["AfterContentClassName"] = 4] = "AfterContentClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["BeforeInjectedTextClassName"] = 5] = "BeforeInjectedTextClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["AfterInjectedTextClassName"] = 6] = "AfterInjectedTextClassName";
})(ModelDecorationCSSRuleType || (ModelDecorationCSSRuleType = {}));
class CSSNameHelper {
    static getClassName(key, type) {
        return 'ced-' + key + '-' + type;
    }
    static getSelector(key, parentKey, ruleType) {
        let selector = '.monaco-editor .' + this.getClassName(key, ruleType);
        if (parentKey) {
            selector = selector + '.' + this.getClassName(parentKey, ruleType);
        }
        if (ruleType === 3 /* ModelDecorationCSSRuleType.BeforeContentClassName */) {
            selector += '::before';
        }
        else if (ruleType === 4 /* ModelDecorationCSSRuleType.AfterContentClassName */) {
            selector += '::after';
        }
        return selector;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RDb2RlRWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9hYnN0cmFjdENvZGVFZGl0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxLQUFLLGNBQWMsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEtBQUssS0FBSyxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQWUsZUFBZSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBR2xELE9BQU8sRUFBNEYsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdEosT0FBTyxFQUFrRyxpQkFBaUIsRUFBMEIsTUFBTSx1QkFBdUIsQ0FBQztBQUVsTCxPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHckYsSUFBZSx5QkFBeUIsR0FBeEMsTUFBZSx5QkFBMEIsU0FBUSxVQUFVO0lBbUNqRSxZQUNnQixhQUE2QztRQUU1RCxLQUFLLEVBQUUsQ0FBQztRQUZ3QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQWhDNUMsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFB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