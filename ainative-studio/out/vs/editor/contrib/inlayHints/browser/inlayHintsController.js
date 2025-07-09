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
var InlayHintsController_1;
import { isHTMLElement, ModifierKeyEmitter } from '../../../../base/browser/dom.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { disposableTimeout, RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { DynamicCssRules } from '../../../browser/editorDom.js';
import { StableEditorScrollState } from '../../../browser/stableEditorScroll.js';
import { EDITOR_FONT_DEFAULTS } from '../../../common/config/editorOptions.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
import * as languages from '../../../common/languages.js';
import { InjectedTextCursorStops } from '../../../common/model.js';
import { ModelDecorationInjectedTextOptions } from '../../../common/model/textModel.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { ClickLinkGesture } from '../../gotoSymbol/browser/link/clickLinkGesture.js';
import { InlayHintAnchor, InlayHintsFragments } from './inlayHints.js';
import { goToDefinitionWithLocation, showGoToContextMenu } from './inlayHintsLocations.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import * as colors from '../../../../platform/theme/common/colorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
// --- hint caching service (per session)
class InlayHintsCache {
    constructor() {
        this._entries = new LRUCache(50);
    }
    get(model) {
        const key = InlayHintsCache._key(model);
        return this._entries.get(key);
    }
    set(model, value) {
        const key = InlayHintsCache._key(model);
        this._entries.set(key, value);
    }
    static _key(model) {
        return `${model.uri.toString()}/${model.getVersionId()}`;
    }
}
const IInlayHintsCache = createDecorator('IInlayHintsCache');
registerSingleton(IInlayHintsCache, InlayHintsCache, 1 /* InstantiationType.Delayed */);
// --- rendered label
export class RenderedInlayHintLabelPart {
    constructor(item, index) {
        this.item = item;
        this.index = index;
    }
    get part() {
        const label = this.item.hint.label;
        if (typeof label === 'string') {
            return { label };
        }
        else {
            return label[this.index];
        }
    }
}
class ActiveInlayHintInfo {
    constructor(part, hasTriggerModifier) {
        this.part = part;
        this.hasTriggerModifier = hasTriggerModifier;
    }
}
var RenderMode;
(function (RenderMode) {
    RenderMode[RenderMode["Normal"] = 0] = "Normal";
    RenderMode[RenderMode["Invisible"] = 1] = "Invisible";
})(RenderMode || (RenderMode = {}));
// --- controller
let InlayHintsController = class InlayHintsController {
    static { InlayHintsController_1 = this; }
    static { this.ID = 'editor.contrib.InlayHints'; }
    static { this._MAX_DECORATORS = 1500; }
    static { this._whitespaceData = {}; }
    static get(editor) {
        return editor.getContribution(InlayHintsController_1.ID) ?? undefined;
    }
    constructor(_editor, _languageFeaturesService, _featureDebounce, _inlayHintsCache, _commandService, _notificationService, _instaService) {
        this._editor = _editor;
        this._languageFeaturesService = _languageFeaturesService;
        this._inlayHintsCache = _inlayHintsCache;
        this._commandService = _commandService;
        this._notificationService = _notificationService;
        this._instaService = _instaService;
        this._disposables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._decorationsMetadata = new Map();
        this._ruleFactory = new DynamicCssRules(this._editor);
        this._activeRenderMode = 0 /* RenderMode.Normal */;
        this._debounceInfo = _featureDebounce.for(_languageFeaturesService.inlayHintsProvider, 'InlayHint', { min: 25 });
        this._disposables.add(_languageFeaturesService.inlayHintsProvider.onDidChange(() => this._update()));
        this._disposables.add(_editor.onDidChangeModel(() => this._update()));
        this._disposables.add(_editor.onDidChangeModelLanguage(() => this._update()));
        this._disposables.add(_editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(146 /* EditorOption.inlayHints */)) {
                this._update();
            }
        }));
        this._update();
    }
    dispose() {
        this._sessionDisposables.dispose();
        this._removeAllDecorations();
        this._disposables.dispose();
    }
    _update() {
        this._sessionDisposables.clear();
        this._removeAllDecorations();
        const options = this._editor.getOption(146 /* EditorOption.inlayHints */);
        if (options.enabled === 'off') {
            return;
        }
        const model = this._editor.getModel();
        if (!model || !this._languageFeaturesService.inlayHintsProvider.has(model)) {
            return;
        }
        if (options.enabled === 'on') {
            // different "on" modes: always
            this._activeRenderMode = 0 /* RenderMode.Normal */;
        }
        else {
            // different "on" modes: offUnlessPressed, or onUnlessPressed
            let defaultMode;
            let altMode;
            if (options.enabled === 'onUnlessPressed') {
                defaultMode = 0 /* RenderMode.Normal */;
                altMode = 1 /* RenderMode.Invisible */;
            }
            else {
                defaultMode = 1 /* RenderMode.Invisible */;
                altMode = 0 /* RenderMode.Normal */;
            }
            this._activeRenderMode = defaultMode;
            this._sessionDisposables.add(ModifierKeyEmitter.getInstance().event(e => {
                if (!this._editor.hasModel()) {
                    return;
                }
                const newRenderMode = e.altKey && e.ctrlKey && !(e.shiftKey || e.metaKey) ? altMode : defaultMode;
                if (newRenderMode !== this._activeRenderMode) {
                    this._activeRenderMode = newRenderMode;
                    const model = this._editor.getModel();
                    const copies = this._copyInlayHintsWithCurrentAnchor(model);
                    this._updateHintsDecorators([model.getFullModelRange()], copies);
                    scheduler.schedule(0);
                }
            }));
        }
        // iff possible, quickly update from cache
        const cached = this._inlayHintsCache.get(model);
        if (cached) {
            this._updateHintsDecorators([model.getFullModelRange()], cached);
        }
        this._sessionDisposables.add(toDisposable(() => {
            // cache items when switching files etc
            if (!model.isDisposed()) {
                this._cacheHintsForFastRestore(model);
            }
        }));
        let cts;
        const watchedProviders = new Set();
        const scheduler = new RunOnceScheduler(async () => {
            const t1 = Date.now();
            cts?.dispose(true);
            cts = new CancellationTokenSource();
            const listener = model.onWillDispose(() => cts?.cancel());
            try {
                const myToken = cts.token;
                const inlayHints = await InlayHintsFragments.create(this._languageFeaturesService.inlayHintsProvider, model, this._getHintsRanges(), myToken);
                scheduler.delay = this._debounceInfo.update(model, Date.now() - t1);
                if (myToken.isCancellationRequested) {
                    inlayHints.dispose();
                    return;
                }
                // listen to provider changes
                for (const provider of inlayHints.provider) {
                    if (typeof provider.onDidChangeInlayHints === 'function' && !watchedProviders.has(provider)) {
                        watchedProviders.add(provider);
                        this._sessionDisposables.add(provider.onDidChangeInlayHints(() => {
                            if (!scheduler.isScheduled()) { // ignore event when request is already scheduled
                                scheduler.schedule();
                            }
                        }));
                    }
                }
                this._sessionDisposables.add(inlayHints);
                this._updateHintsDecorators(inlayHints.ranges, inlayHints.items);
                this._cacheHintsForFastRestore(model);
            }
            catch (err) {
                onUnexpectedError(err);
            }
            finally {
                cts.dispose();
                listener.dispose();
            }
        }, this._debounceInfo.get(model));
        this._sessionDisposables.add(scheduler);
        this._sessionDisposables.add(toDisposable(() => cts?.dispose(true)));
        scheduler.schedule(0);
        this._sessionDisposables.add(this._editor.onDidScrollChange((e) => {
            // update when scroll position changes
            // uses scrollTopChanged has weak heuristic to differenatiate between scrolling due to
            // typing or due to "actual" scrolling
            if (e.scrollTopChanged || !scheduler.isScheduled()) {
                scheduler.schedule();
            }
        }));
        const cursor = this._sessionDisposables.add(new MutableDisposable());
        this._sessionDisposables.add(this._editor.onDidChangeModelContent((e) => {
            cts?.cancel();
            // mark current cursor position and time after which the whole can be updated/redrawn
            const delay = Math.max(scheduler.delay, 800);
            this._cursorInfo = { position: this._editor.getPosition(), notEarlierThan: Date.now() + delay };
            cursor.value = disposableTimeout(() => scheduler.schedule(0), delay);
            scheduler.schedule();
        }));
        this._sessionDisposables.add(this._editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(146 /* EditorOption.inlayHints */)) {
                scheduler.schedule();
            }
        }));
        // mouse gestures
        this._sessionDisposables.add(this._installDblClickGesture(() => scheduler.schedule(0)));
        this._sessionDisposables.add(this._installLinkGesture());
        this._sessionDisposables.add(this._installContextMenu());
    }
    _installLinkGesture() {
        const store = new DisposableStore();
        const gesture = store.add(new ClickLinkGesture(this._editor));
        // let removeHighlight = () => { };
        const sessionStore = new DisposableStore();
        store.add(sessionStore);
        store.add(gesture.onMouseMoveOrRelevantKeyDown(e => {
            const [mouseEvent] = e;
            const labelPart = this._getInlayHintLabelPart(mouseEvent);
            const model = this._editor.getModel();
            if (!labelPart || !model) {
                sessionStore.clear();
                return;
            }
            // resolve the item
            const cts = new CancellationTokenSource();
            sessionStore.add(toDisposable(() => cts.dispose(true)));
            labelPart.item.resolve(cts.token);
            // render link => when the modifier is pressed and when there is a command or location
            this._activeInlayHintPart = labelPart.part.command || labelPart.part.location
                ? new ActiveInlayHintInfo(labelPart, mouseEvent.hasTriggerModifier)
                : undefined;
            const lineNumber = model.validatePosition(labelPart.item.hint.position).lineNumber;
            const range = new Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber));
            const lineHints = this._getInlineHintsForRange(range);
            this._updateHintsDecorators([range], lineHints);
            sessionStore.add(toDisposable(() => {
                this._activeInlayHintPart = undefined;
                this._updateHintsDecorators([range], lineHints);
            }));
        }));
        store.add(gesture.onCancel(() => sessionStore.clear()));
        store.add(gesture.onExecute(async (e) => {
            const label = this._getInlayHintLabelPart(e);
            if (label) {
                const part = label.part;
                if (part.location) {
                    // location -> execute go to def
                    this._instaService.invokeFunction(goToDefinitionWithLocation, e, this._editor, part.location);
                }
                else if (languages.Command.is(part.command)) {
                    // command -> execute it
                    await this._invokeCommand(part.command, label.item);
                }
            }
        }));
        return store;
    }
    _getInlineHintsForRange(range) {
        const lineHints = new Set();
        for (const data of this._decorationsMetadata.values()) {
            if (range.containsRange(data.item.anchor.range)) {
                lineHints.add(data.item);
            }
        }
        return Array.from(lineHints);
    }
    _installDblClickGesture(updateInlayHints) {
        return this._editor.onMouseUp(async (e) => {
            if (e.event.detail !== 2) {
                return;
            }
            const part = this._getInlayHintLabelPart(e);
            if (!part) {
                return;
            }
            e.event.preventDefault();
            await part.item.resolve(CancellationToken.None);
            if (isNonEmptyArray(part.item.hint.textEdits)) {
                const edits = part.item.hint.textEdits.map(edit => EditOperation.replace(Range.lift(edit.range), edit.text));
                this._editor.executeEdits('inlayHint.default', edits);
                updateInlayHints();
            }
        });
    }
    _installContextMenu() {
        return this._editor.onContextMenu(async (e) => {
            if (!(isHTMLElement(e.event.target))) {
                return;
            }
            const part = this._getInlayHintLabelPart(e);
            if (part) {
                await this._instaService.invokeFunction(showGoToContextMenu, this._editor, e.event.target, part);
            }
        });
    }
    _getInlayHintLabelPart(e) {
        if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
            return undefined;
        }
        const options = e.target.detail.injectedText?.options;
        if (options instanceof ModelDecorationInjectedTextOptions && options?.attachedData instanceof RenderedInlayHintLabelPart) {
            return options.attachedData;
        }
        return undefined;
    }
    async _invokeCommand(command, item) {
        try {
            await this._commandService.executeCommand(command.id, ...(command.arguments ?? []));
        }
        catch (err) {
            this._notificationService.notify({
                severity: Severity.Error,
                source: item.provider.displayName,
                message: err
            });
        }
    }
    _cacheHintsForFastRestore(model) {
        const hints = this._copyInlayHintsWithCurrentAnchor(model);
        this._inlayHintsCache.set(model, hints);
    }
    // return inlay hints but with an anchor that reflects "updates"
    // that happened after receiving them, e.g adding new lines before a hint
    _copyInlayHintsWithCurrentAnchor(model) {
        const items = new Map();
        for (const [id, obj] of this._decorationsMetadata) {
            if (items.has(obj.item)) {
                // an inlay item can be rendered as multiple decorations
                // but they will all uses the same range
                continue;
            }
            const range = model.getDecorationRange(id);
            if (range) {
                // update range with whatever the editor has tweaked it to
                const anchor = new InlayHintAnchor(range, obj.item.anchor.direction);
                const copy = obj.item.with({ anchor });
                items.set(obj.item, copy);
            }
        }
        return Array.from(items.values());
    }
    _getHintsRanges() {
        const extra = 30;
        const model = this._editor.getModel();
        const visibleRanges = this._editor.getVisibleRangesPlusViewportAboveBelow();
        const result = [];
        for (const range of visibleRanges.sort(Range.compareRangesUsingStarts)) {
            const extendedRange = model.validateRange(new Range(range.startLineNumber - extra, range.startColumn, range.endLineNumber + extra, range.endColumn));
            if (result.length === 0 || !Range.areIntersectingOrTouching(result[result.length - 1], extendedRange)) {
                result.push(extendedRange);
            }
            else {
                result[result.length - 1] = Range.plusRange(result[result.length - 1], extendedRange);
            }
        }
        return result;
    }
    _updateHintsDecorators(ranges, items) {
        const itemFixedLengths = new Map();
        if (this._cursorInfo
            && this._cursorInfo.notEarlierThan > Date.now()
            && ranges.some(range => range.containsPosition(this._cursorInfo.position))) {
            // collect inlay hints that are on the same line and before the cursor. Those "old" hints
            // define fixed lengths so that the cursor does not jump back and worth while typing.
            const { position } = this._cursorInfo;
            this._cursorInfo = undefined;
            const lengths = new Map();
            for (const deco of this._editor.getLineDecorations(position.lineNumber) ?? []) {
                const data = this._decorationsMetadata.get(deco.id);
                if (deco.range.startColumn > position.column) {
                    continue;
                }
                const opts = data?.decoration.options[data.item.anchor.direction];
                if (opts && opts.attachedData !== InlayHintsController_1._whitespaceData) {
                    const len = lengths.get(data.item) ?? 0;
                    lengths.set(data.item, len + opts.content.length);
                }
            }
            // on the cursor line and before the cursor-column
            const newItemsWithFixedLength = items.filter(item => item.anchor.range.startLineNumber === position.lineNumber && item.anchor.range.endColumn <= position.column);
            const fixedLengths = Array.from(lengths.values());
            // match up fixed lengths with items and distribute the remaining lengths to the last item
            let lastItem;
            while (true) {
                const targetItem = newItemsWithFixedLength.shift();
                const fixedLength = fixedLengths.shift();
                if (!fixedLength && !targetItem) {
                    break; // DONE
                }
                if (targetItem) {
                    itemFixedLengths.set(targetItem, fixedLength ?? 0);
                    lastItem = targetItem;
                }
                else if (lastItem && fixedLength) {
                    // still lengths but no more item. give it all to the last
                    let len = itemFixedLengths.get(lastItem);
                    len += fixedLength;
                    len += fixedLengths.reduce((p, c) => p + c, 0);
                    fixedLengths.length = 0;
                    break; // DONE
                }
            }
        }
        // utils to collect/create injected text decorations
        const newDecorationsData = [];
        const addInjectedText = (item, ref, content, cursorStops, attachedData) => {
            const opts = {
                content,
                inlineClassNameAffectsLetterSpacing: true,
                inlineClassName: ref.className,
                cursorStops,
                attachedData
            };
            newDecorationsData.push({
                item,
                classNameRef: ref,
                decoration: {
                    range: item.anchor.range,
                    options: {
                        // className: "rangeHighlight", // DEBUG highlight to see to what range a hint is attached
                        description: 'InlayHint',
                        showIfCollapsed: item.anchor.range.isEmpty(), // "original" range is empty
                        collapseOnReplaceEdit: !item.anchor.range.isEmpty(),
                        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */,
                        [item.anchor.direction]: this._activeRenderMode === 0 /* RenderMode.Normal */ ? opts : undefined
                    }
                }
            });
        };
        const addInjectedWhitespace = (item, isLast) => {
            const marginRule = this._ruleFactory.createClassNameRef({
                width: `${(fontSize / 3) | 0}px`,
                display: 'inline-block'
            });
            addInjectedText(item, marginRule, '\u200a', isLast ? InjectedTextCursorStops.Right : InjectedTextCursorStops.None, InlayHintsController_1._whitespaceData);
        };
        //
        const { fontSize, fontFamily, padding, isUniform } = this._getLayoutInfo();
        const maxLength = this._editor.getOption(146 /* EditorOption.inlayHints */).maximumLength;
        const fontFamilyVar = '--code-editorInlayHintsFontFamily';
        this._editor.getContainerDomNode().style.setProperty(fontFamilyVar, fontFamily);
        let currentLineInfo = { line: 0, totalLen: 0 };
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (currentLineInfo.line !== item.anchor.range.startLineNumber) {
                currentLineInfo = { line: item.anchor.range.startLineNumber, totalLen: 0 };
            }
            if (maxLength && currentLineInfo.totalLen > maxLength) {
                continue;
            }
            // whitespace leading the actual label
            if (item.hint.paddingLeft) {
                addInjectedWhitespace(item, false);
            }
            // the label with its parts
            const parts = typeof item.hint.label === 'string'
                ? [{ label: item.hint.label }]
                : item.hint.label;
            const itemFixedLength = itemFixedLengths.get(item);
            let itemActualLength = 0;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFirst = i === 0;
                const isLast = i === parts.length - 1;
                const cssProperties = {
                    fontSize: `${fontSize}px`,
                    fontFamily: `var(${fontFamilyVar}), ${EDITOR_FONT_DEFAULTS.fontFamily}`,
                    verticalAlign: isUniform ? 'baseline' : 'middle',
                    unicodeBidi: 'isolate'
                };
                if (isNonEmptyArray(item.hint.textEdits)) {
                    cssProperties.cursor = 'default';
                }
                this._fillInColors(cssProperties, item.hint);
                if ((part.command || part.location) && this._activeInlayHintPart?.part.item === item && this._activeInlayHintPart.part.index === i) {
                    // active link!
                    cssProperties.textDecoration = 'underline';
                    if (this._activeInlayHintPart.hasTriggerModifier) {
                        cssProperties.color = themeColorFromId(colors.editorActiveLinkForeground);
                        cssProperties.cursor = 'pointer';
                    }
                }
                let textlabel = part.label;
                currentLineInfo.totalLen += textlabel.length;
                let tooLong = false;
                const over = maxLength !== 0 ? (currentLineInfo.totalLen - maxLength) : 0;
                if (over > 0) {
                    textlabel = textlabel.slice(0, -over) + '…';
                    tooLong = true;
                }
                itemActualLength += textlabel.length;
                if (itemFixedLength !== undefined) {
                    const overFixedLength = itemActualLength - itemFixedLength;
                    if (overFixedLength >= 0) {
                        // longer than fixed length, trim
                        itemActualLength -= overFixedLength;
                        textlabel = textlabel.slice(0, -(1 + overFixedLength)) + '…';
                        tooLong = true;
                    }
                }
                if (padding) {
                    if (isFirst && (isLast || tooLong)) {
                        // only element
                        cssProperties.padding = `1px ${Math.max(1, fontSize / 4) | 0}px`;
                        cssProperties.borderRadius = `${(fontSize / 4) | 0}px`;
                    }
                    else if (isFirst) {
                        // first element
                        cssProperties.padding = `1px 0 1px ${Math.max(1, fontSize / 4) | 0}px`;
                        cssProperties.borderRadius = `${(fontSize / 4) | 0}px 0 0 ${(fontSize / 4) | 0}px`;
                    }
                    else if ((isLast || tooLong)) {
                        // last element
                        cssProperties.padding = `1px ${Math.max(1, fontSize / 4) | 0}px 1px 0`;
                        cssProperties.borderRadius = `0 ${(fontSize / 4) | 0}px ${(fontSize / 4) | 0}px 0`;
                    }
                    else {
                        cssProperties.padding = `1px 0 1px 0`;
                    }
                }
                addInjectedText(item, this._ruleFactory.createClassNameRef(cssProperties), fixSpace(textlabel), isLast && !item.hint.paddingRight ? InjectedTextCursorStops.Right : InjectedTextCursorStops.None, new RenderedInlayHintLabelPart(item, i));
                if (tooLong) {
                    break;
                }
            }
            if (itemFixedLength !== undefined && itemActualLength < itemFixedLength) {
                // shorter than fixed length, pad
                const pad = (itemFixedLength - itemActualLength);
                addInjectedText(item, this._ruleFactory.createClassNameRef({}), '\u200a'.repeat(pad), InjectedTextCursorStops.None);
            }
            // whitespace trailing the actual label
            if (item.hint.paddingRight) {
                addInjectedWhitespace(item, true);
            }
            if (newDecorationsData.length > InlayHintsController_1._MAX_DECORATORS) {
                break;
            }
        }
        // collect all decoration ids that are affected by the ranges
        // and only update those decorations
        const decorationIdsToReplace = [];
        for (const [id, metadata] of this._decorationsMetadata) {
            const range = this._editor.getModel()?.getDecorationRange(id);
            if (range && ranges.some(r => r.containsRange(range))) {
                decorationIdsToReplace.push(id);
                metadata.classNameRef.dispose();
                this._decorationsMetadata.delete(id);
            }
        }
        const scrollState = StableEditorScrollState.capture(this._editor);
        this._editor.changeDecorations(accessor => {
            const newDecorationIds = accessor.deltaDecorations(decorationIdsToReplace, newDecorationsData.map(d => d.decoration));
            for (let i = 0; i < newDecorationIds.length; i++) {
                const data = newDecorationsData[i];
                this._decorationsMetadata.set(newDecorationIds[i], data);
            }
        });
        scrollState.restore(this._editor);
    }
    _fillInColors(props, hint) {
        if (hint.kind === languages.InlayHintKind.Parameter) {
            props.backgroundColor = themeColorFromId(colors.editorInlayHintParameterBackground);
            props.color = themeColorFromId(colors.editorInlayHintParameterForeground);
        }
        else if (hint.kind === languages.InlayHintKind.Type) {
            props.backgroundColor = themeColorFromId(colors.editorInlayHintTypeBackground);
            props.color = themeColorFromId(colors.editorInlayHintTypeForeground);
        }
        else {
            props.backgroundColor = themeColorFromId(colors.editorInlayHintBackground);
            props.color = themeColorFromId(colors.editorInlayHintForeground);
        }
    }
    _getLayoutInfo() {
        const options = this._editor.getOption(146 /* EditorOption.inlayHints */);
        const padding = options.padding;
        const editorFontSize = this._editor.getOption(54 /* EditorOption.fontSize */);
        const editorFontFamily = this._editor.getOption(51 /* EditorOption.fontFamily */);
        let fontSize = options.fontSize;
        if (!fontSize || fontSize < 5 || fontSize > editorFontSize) {
            fontSize = editorFontSize;
        }
        const fontFamily = options.fontFamily || editorFontFamily;
        const isUniform = !padding
            && fontFamily === editorFontFamily
            && fontSize === editorFontSize;
        return { fontSize, fontFamily, padding, isUniform };
    }
    _removeAllDecorations() {
        this._editor.removeDecorations(Array.from(this._decorationsMetadata.keys()));
        for (const obj of this._decorationsMetadata.values()) {
            obj.classNameRef.dispose();
        }
        this._decorationsMetadata.clear();
    }
    // --- accessibility
    getInlayHintsForLine(line) {
        if (!this._editor.hasModel()) {
            return [];
        }
        const set = new Set();
        const result = [];
        for (const deco of this._editor.getLineDecorations(line)) {
            const data = this._decorationsMetadata.get(deco.id);
            if (data && !set.has(data.item.hint)) {
                set.add(data.item.hint);
                result.push(data.item);
            }
        }
        return result;
    }
};
InlayHintsController = InlayHintsController_1 = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageFeatureDebounceService),
    __param(3, IInlayHintsCache),
    __param(4, ICommandService),
    __param(5, INotificationService),
    __param(6, IInstantiationService)
], InlayHintsController);
export { InlayHintsController };
// Prevents the view from potentially visible whitespace
function fixSpace(str) {
    const noBreakWhitespace = '\xa0';
    return str.replace(/[ \t]/g, noBreakWhitespace);
}
CommandsRegistry.registerCommand('_executeInlayHintProvider', async (accessor, ...args) => {
    const [uri, range] = args;
    assertType(URI.isUri(uri));
    assertType(Range.isIRange(range));
    const { inlayHintsProvider } = accessor.get(ILanguageFeaturesService);
    const ref = await accessor.get(ITextModelService).createModelReference(uri);
    try {
        const model = await InlayHintsFragments.create(inlayHintsProvider, ref.object.textEditorModel, [Range.lift(range)], CancellationToken.None);
        const result = model.items.map(i => i.hint);
        setTimeout(() => model.dispose(), 0); // dispose after sending to ext host
        return result;
    }
    finally {
        ref.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0NvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5sYXlIaW50cy9icm93c2VyL2lubGF5SGludHNDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFxQyxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNuRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRixPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVB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