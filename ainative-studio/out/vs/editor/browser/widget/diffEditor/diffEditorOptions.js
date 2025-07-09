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
import { derived, derivedConstOnceDefined, observableFromEvent, observableValue } from '../../../../base/common/observable.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { diffEditorDefaultOptions } from '../../../common/config/diffEditor.js';
import { clampedFloat, clampedInt, boolean as validateBooleanOption, stringSet as validateStringSetOption } from '../../../common/config/editorOptions.js';
import { allowsTrueInlineDiffRendering } from './components/diffEditorViewZones/diffEditorViewZones.js';
let DiffEditorOptions = class DiffEditorOptions {
    get editorOptions() { return this._options; }
    constructor(options, _accessibilityService) {
        this._accessibilityService = _accessibilityService;
        this._diffEditorWidth = observableValue(this, 0);
        this._screenReaderMode = observableFromEvent(this, this._accessibilityService.onDidChangeScreenReaderOptimized, () => this._accessibilityService.isScreenReaderOptimized());
        this.couldShowInlineViewBecauseOfSize = derived(this, reader => this._options.read(reader).renderSideBySide && this._diffEditorWidth.read(reader) <= this._options.read(reader).renderSideBySideInlineBreakpoint);
        this.renderOverviewRuler = derived(this, reader => this._options.read(reader).renderOverviewRuler);
        this.renderSideBySide = derived(this, reader => {
            if (this.compactMode.read(reader)) {
                if (this.shouldRenderInlineViewInSmartMode.read(reader)) {
                    return false;
                }
            }
            return this._options.read(reader).renderSideBySide
                && !(this._options.read(reader).useInlineViewWhenSpaceIsLimited && this.couldShowInlineViewBecauseOfSize.read(reader) && !this._screenReaderMode.read(reader));
        });
        this.readOnly = derived(this, reader => this._options.read(reader).readOnly);
        this.shouldRenderOldRevertArrows = derived(this, reader => {
            if (!this._options.read(reader).renderMarginRevertIcon) {
                return false;
            }
            if (!this.renderSideBySide.read(reader)) {
                return false;
            }
            if (this.readOnly.read(reader)) {
                return false;
            }
            if (this.shouldRenderGutterMenu.read(reader)) {
                return false;
            }
            return true;
        });
        this.shouldRenderGutterMenu = derived(this, reader => this._options.read(reader).renderGutterMenu);
        this.renderIndicators = derived(this, reader => this._options.read(reader).renderIndicators);
        this.enableSplitViewResizing = derived(this, reader => this._options.read(reader).enableSplitViewResizing);
        this.splitViewDefaultRatio = derived(this, reader => this._options.read(reader).splitViewDefaultRatio);
        this.ignoreTrimWhitespace = derived(this, reader => this._options.read(reader).ignoreTrimWhitespace);
        this.maxComputationTimeMs = derived(this, reader => this._options.read(reader).maxComputationTime);
        this.showMoves = derived(this, reader => this._options.read(reader).experimental.showMoves && this.renderSideBySide.read(reader));
        this.isInEmbeddedEditor = derived(this, reader => this._options.read(reader).isInEmbeddedEditor);
        this.diffWordWrap = derived(this, reader => this._options.read(reader).diffWordWrap);
        this.originalEditable = derived(this, reader => this._options.read(reader).originalEditable);
        this.diffCodeLens = derived(this, reader => this._options.read(reader).diffCodeLens);
        this.accessibilityVerbose = derived(this, reader => this._options.read(reader).accessibilityVerbose);
        this.diffAlgorithm = derived(this, reader => this._options.read(reader).diffAlgorithm);
        this.showEmptyDecorations = derived(this, reader => this._options.read(reader).experimental.showEmptyDecorations);
        this.onlyShowAccessibleDiffViewer = derived(this, reader => this._options.read(reader).onlyShowAccessibleDiffViewer);
        this.compactMode = derived(this, reader => this._options.read(reader).compactMode);
        this.trueInlineDiffRenderingEnabled = derived(this, reader => this._options.read(reader).experimental.useTrueInlineView);
        this.useTrueInlineDiffRendering = derived(this, reader => !this.renderSideBySide.read(reader) && this.trueInlineDiffRenderingEnabled.read(reader));
        this.hideUnchangedRegions = derived(this, reader => this._options.read(reader).hideUnchangedRegions.enabled);
        this.hideUnchangedRegionsRevealLineCount = derived(this, reader => this._options.read(reader).hideUnchangedRegions.revealLineCount);
        this.hideUnchangedRegionsContextLineCount = derived(this, reader => this._options.read(reader).hideUnchangedRegions.contextLineCount);
        this.hideUnchangedRegionsMinimumLineCount = derived(this, reader => this._options.read(reader).hideUnchangedRegions.minimumLineCount);
        this._model = observableValue(this, undefined);
        this.shouldRenderInlineViewInSmartMode = this._model
            .map(this, model => derivedConstOnceDefined(this, reader => {
            const diffs = model?.diff.read(reader);
            return diffs ? isSimpleDiff(diffs, this.trueInlineDiffRenderingEnabled.read(reader)) : undefined;
        }))
            .flatten()
            .map(this, v => !!v);
        this.inlineViewHideOriginalLineNumbers = this.compactMode;
        const optionsCopy = { ...options, ...validateDiffEditorOptions(options, diffEditorDefaultOptions) };
        this._options = observableValue(this, optionsCopy);
    }
    updateOptions(changedOptions) {
        const newDiffEditorOptions = validateDiffEditorOptions(changedOptions, this._options.get());
        const newOptions = { ...this._options.get(), ...changedOptions, ...newDiffEditorOptions };
        this._options.set(newOptions, undefined, { changedOptions: changedOptions });
    }
    setWidth(width) {
        this._diffEditorWidth.set(width, undefined);
    }
    setModel(model) {
        this._model.set(model, undefined);
    }
};
DiffEditorOptions = __decorate([
    __param(1, IAccessibilityService)
], DiffEditorOptions);
export { DiffEditorOptions };
function isSimpleDiff(diff, supportsTrueDiffRendering) {
    return diff.mappings.every(m => isInsertion(m.lineRangeMapping) || isDeletion(m.lineRangeMapping) || (supportsTrueDiffRendering && allowsTrueInlineDiffRendering(m.lineRangeMapping)));
}
function isInsertion(mapping) {
    return mapping.original.length === 0;
}
function isDeletion(mapping) {
    return mapping.modified.length === 0;
}
function validateDiffEditorOptions(options, defaults) {
    return {
        enableSplitViewResizing: validateBooleanOption(options.enableSplitViewResizing, defaults.enableSplitViewResizing),
        splitViewDefaultRatio: clampedFloat(options.splitViewDefaultRatio, 0.5, 0.1, 0.9),
        renderSideBySide: validateBooleanOption(options.renderSideBySide, defaults.renderSideBySide),
        renderMarginRevertIcon: validateBooleanOption(options.renderMarginRevertIcon, defaults.renderMarginRevertIcon),
        maxComputationTime: clampedInt(options.maxComputationTime, defaults.maxComputationTime, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        maxFileSize: clampedInt(options.maxFileSize, defaults.maxFileSize, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        ignoreTrimWhitespace: validateBooleanOption(options.ignoreTrimWhitespace, defaults.ignoreTrimWhitespace),
        renderIndicators: validateBooleanOption(options.renderIndicators, defaults.renderIndicators),
        originalEditable: validateBooleanOption(options.originalEditable, defaults.originalEditable),
        diffCodeLens: validateBooleanOption(options.diffCodeLens, defaults.diffCodeLens),
        renderOverviewRuler: validateBooleanOption(options.renderOverviewRuler, defaults.renderOverviewRuler),
        diffWordWrap: validateStringSetOption(options.diffWordWrap, defaults.diffWordWrap, ['off', 'on', 'inherit']),
        diffAlgorithm: validateStringSetOption(options.diffAlgorithm, defaults.diffAlgorithm, ['legacy', 'advanced'], { 'smart': 'legacy', 'experimental': 'advanced' }),
        accessibilityVerbose: validateBooleanOption(options.accessibilityVerbose, defaults.accessibilityVerbose),
        experimental: {
            showMoves: validateBooleanOption(options.experimental?.showMoves, defaults.experimental.showMoves),
            showEmptyDecorations: validateBooleanOption(options.experimental?.showEmptyDecorations, defaults.experimental.showEmptyDecorations),
            useTrueInlineView: validateBooleanOption(options.experimental?.useTrueInlineView, defaults.experimental.useTrueInlineView),
        },
        hideUnchangedRegions: {
            enabled: validateBooleanOption(options.hideUnchangedRegions?.enabled ?? options.experimental?.collapseUnchangedRegions, defaults.hideUnchangedRegions.enabled),
            contextLineCount: clampedInt(options.hideUnchangedRegions?.contextLineCount, defaults.hideUnchangedRegions.contextLineCount, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
            minimumLineCount: clampedInt(options.hideUnchangedRegions?.minimumLineCount, defaults.hideUnchangedRegions.minimumLineCount, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
            revealLineCount: clampedInt(options.hideUnchangedRegions?.revealLineCount, defaults.hideUnchangedRegions.revealLineCount, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        },
        isInEmbeddedEditor: validateBooleanOption(options.isInEmbeddedEditor, defaults.isInEmbeddedEditor),
        onlyShowAccessibleDiffViewer: validateBooleanOption(options.onlyShowAccessibleDiffViewer, defaults.onlyShowAccessibleDiffViewer),
        renderSideBySideInlineBreakpoint: clampedInt(options.renderSideBySideInlineBreakpoint, defaults.renderSideBySideInlineBreakpoint, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
        useInlineViewWhenSpaceIsLimited: validateBooleanOption(options.useInlineViewWhenSpaceIsLimited, defaults.useInlineViewWhenSpaceIsLimited),
        renderGutterMenu: validateBooleanOption(options.renderGutterMenu, defaults.renderGutterMenu),
        compactMode: validateBooleanOption(options.compactMode, defaults.compactMode),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZGlmZkVkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUEyRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFeEwsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUEwRixZQUFZLEVBQUUsVUFBVSxFQUFFLE9BQU8sSUFBSSxxQkFBcUIsRUFBRSxTQUFTLElBQUksdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVuUCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUdqRyxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFpQjtJQUc3QixJQUFXLGFBQWEsS0FBZ0YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQU0vSCxZQUNDLE9BQXFDLEVBQ2QscUJBQTZEO1FBQTVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFOcEUscUJBQWdCLEdBQUcsZUFBZSxDQUFTLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwRCxzQkFBaUIsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFVeEsscUNB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