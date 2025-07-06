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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RDb2RlRWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3NlcnZpY2VzL2Fic3RyYWN0Q29kZUVkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEtBQUssY0FBYyxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sS0FBSyxLQUFLLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBZSxlQUFlLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHbEQsT0FBTyxFQUE0RixZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0SixPQUFPLEVBQWtHLGlCQUFpQixFQUEwQixNQUFNLHVCQUF1QixDQUFDO0FBRWxMLE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUdyRixJQUFlLHlCQUF5QixHQUF4QyxNQUFlLHlCQUEwQixTQUFRLFVBQVU7SUFtQ2pFLFlBQ2dCLGFBQTZDO1FBRTVELEtBQUssRUFBRSxDQUFDO1FBRndCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBaEM1Qyw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFR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