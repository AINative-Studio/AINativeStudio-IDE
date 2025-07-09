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
import { n, trackFocus } from '../../../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { timeout } from '../../../../../../../base/common/async.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { BugIndicatingError } from '../../../../../../../base/common/errors.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable, derived, observableFromEvent, observableValue, runOnChange } from '../../../../../../../base/common/observable.js';
import { debouncedObservable } from '../../../../../../../base/common/observableInternal/utils.js';
import { IAccessibilityService } from '../../../../../../../platform/accessibility/common/accessibility.js';
import { IHoverService } from '../../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../../../platform/storage/common/storage.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { Point } from '../../../../../../browser/point.js';
import { Rect } from '../../../../../../browser/rect.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { StickyScrollController } from '../../../../../stickyScroll/browser/stickyScrollController.js';
import { InlineEditTabAction } from '../inlineEditsViewInterface.js';
import { getEditorBlendedColor, inlineEditIndicatorBackground, inlineEditIndicatorPrimaryBackground, inlineEditIndicatorPrimaryBorder, inlineEditIndicatorPrimaryForeground, inlineEditIndicatorSecondaryBackground, inlineEditIndicatorSecondaryBorder, inlineEditIndicatorSecondaryForeground, inlineEditIndicatorsuccessfulBackground, inlineEditIndicatorsuccessfulBorder, inlineEditIndicatorsuccessfulForeground } from '../theme.js';
import { mapOutFalsy, rectToProps } from '../utils/utils.js';
import { GutterIndicatorMenuContent } from './gutterIndicatorMenu.js';
// Represents the user's familiarity with the inline edits feature.
var UserKind;
(function (UserKind) {
    UserKind["FirstTime"] = "firstTime";
    UserKind["SecondTime"] = "secondTime";
    UserKind["Active"] = "active";
})(UserKind || (UserKind = {}));
let InlineEditsGutterIndicator = class InlineEditsGutterIndicator extends Disposable {
    get model() {
        const model = this._model.get();
        if (!model) {
            throw new BugIndicatingError('Inline Edit Model not available');
        }
        return model;
    }
    get _newUserType() {
        return this._storageService.get('inlineEditsGutterIndicatorUserKind', -1 /* StorageScope.APPLICATION */, UserKind.FirstTime);
    }
    set _newUserType(value) {
        switch (value) {
            case UserKind.FirstTime:
                throw new BugIndicatingError('UserKind should not be set to first time');
            case UserKind.SecondTime:
                this._firstToSecondTimeUserDisposable.clear();
                break;
            case UserKind.Active:
                this._newUserAnimationDisposable.clear();
                this._firstToSecondTimeUserDisposable.clear();
                this._secondTimeToActiveUserDisposable.clear();
                break;
        }
        this._storageService.store('inlineEditsGutterIndicatorUserKind', value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    constructor(_editorObs, _originalRange, _verticalOffset, _host, _model, _isHoveringOverInlineEdit, _focusIsInMenu, _hoverService, _instantiationService, _storageService, _accessibilityService, themeService) {
        super();
        this._editorObs = _editorObs;
        this._originalRange = _originalRange;
        this._verticalOffset = _verticalOffset;
        this._host = _host;
        this._model = _model;
        this._isHoveringOverInlineEdit = _isHoveringOverInlineEdit;
        this._focusIsInMenu = _focusIsInMenu;
        this._hoverService = _hoverService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._accessibilityService = _accessibilityService;
        this._activeCompletionId = derived(reader => {
            const layout = this._layout.read(reader);
            if (!layout) {
                return undefined;
            }
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            return model.inlineEdit.inlineCompletion.id;
        });
        this._newUserAnimationDisposable = this._register(new MutableDisposable());
        this._firstToSecondTimeUserDisposable = this._register(new MutableDisposable());
        this._secondTimeToActiveUserDisposable = this._register(new MutableDisposable());
        this._originalRangeObs = mapOutFalsy(this._originalRange);
        this._state = derived(reader => {
            const range = this._originalRangeObs.read(reader);
            if (!range) {
                return undefined;
            }
            return {
                range,
                lineOffsetRange: this._editorObs.observeLineOffsetRange(range, this._store),
            };
        });
        this._stickyScrollController = StickyScrollController.get(this._editorObs.editor);
        this._stickyScrollHeight = this._stickyScrollController
            ? observableFromEvent(this._stickyScrollController.onDidChangeStickyScrollHeight, () => this._stickyScrollController.stickyScrollWidgetHeight)
            : constObservable(0);
        this._lineNumberToRender = derived(this, reader => {
            if (this._verticalOffset.read(reader) !== 0) {
                return '';
            }
            const lineNumber = this._originalRange.read(reader)?.startLineNumber;
            const lineNumberOptions = this._editorObs.getOption(69 /* EditorOption.lineNumbers */).read(reader);
            if (lineNumber === undefined || lineNumberOptions.renderType === 0 /* RenderLineNumbersType.Off */) {
                return '';
            }
            if (lineNumberOptions.renderType === 3 /* RenderLineNumbersType.Interval */) {
                const cursorPosition = this._editorObs.cursorPosition.read(reader);
                if (lineNumber % 10 === 0 || cursorPosition && cursorPosition.lineNumber === lineNumber) {
                    return lineNumber.toString();
                }
                return '';
            }
            if (lineNumberOptions.renderType === 2 /* RenderLineNumbersType.Relative */) {
                const cursorPosition = this._editorObs.cursorPosition.read(reader);
                if (!cursorPosition) {
                    return '';
                }
                const relativeLineNumber = Math.abs(lineNumber - cursorPosition.lineNumber);
                if (relativeLineNumber === 0) {
                    return lineNumber.toString();
                }
                return relativeLineNumber.toString();
            }
            if (lineNumberOptions.renderType === 4 /* RenderLineNumbersType.Custom */) {
                if (lineNumberOptions.renderFn) {
                    return lineNumberOptions.renderFn(lineNumber);
                }
                return '';
            }
            return lineNumber.toString();
        });
        this._layout = derived(this, reader => {
            const s = this._state.read(reader);
            if (!s) {
                return undefined;
            }
            const layout = this._editorObs.layoutInfo.read(reader);
            const lineHeight = this._editorObs.getOption(68 /* EditorOption.lineHeight */).read(reader);
            const bottomPadding = 1;
            const leftPadding = 1;
            const rightPadding = 1;
            // Entire editor area without sticky scroll
            const fullViewPort = Rect.fromLeftTopRightBottom(0, 0, layout.width, layout.height - bottomPadding);
            const viewPortWithStickyScroll = fullViewPort.withTop(this._stickyScrollHeight.read(reader));
            // The glyph margin area across all relevant lines
            const targetVertRange = s.lineOffsetRange.read(reader);
            const targetRect = Rect.fromRanges(OffsetRange.fromTo(leftPadding + layout.glyphMarginLeft, layout.decorationsLeft + layout.decorationsWidth - rightPadding), targetVertRange);
            // The gutter view container (pill)
            const pillOffset = this._verticalOffset.read(reader);
            let pillRect = targetRect.withHeight(lineHeight).withWidth(22).translateY(pillOffset);
            const pillRectMoved = pillRect.moveToBeContainedIn(viewPortWithStickyScroll);
            const rect = targetRect;
            // Move pill to be in viewport if it is not
            pillRect = (targetRect.containsRect(pillRectMoved))
                ? pillRectMoved
                : pillRectMoved.moveToBeContainedIn(fullViewPort.intersect(targetRect.union(fullViewPort.withHeight(lineHeight)))); //viewPortWithStickyScroll.intersect(rect)!;
            // docked = pill was already in the viewport
            const docked = rect.containsRect(pillRect) && viewPortWithStickyScroll.containsRect(pillRect);
            let iconDirecion = targetRect.containsRect(pillRect) ?
                'right'
                : pillRect.top > targetRect.top ?
                    'top' :
                    'bottom';
            // Grow icon the the whole glyph margin area if it is docked
            let lineNumberRect = pillRect.withWidth(0);
            let iconRect = pillRect;
            if (docked && pillRect.top === targetRect.top + pillOffset) {
                pillRect = pillRect.withWidth(layout.decorationsLeft + layout.decorationsWidth - layout.glyphMarginLeft - leftPadding - rightPadding);
                lineNumberRect = pillRect.intersectHorizontal(new OffsetRange(0, Math.max(layout.lineNumbersLeft + layout.lineNumbersWidth - leftPadding - 1, 0)));
                iconRect = iconRect.translateX(lineNumberRect.width);
            }
            let icon;
            if (docked && (this._isHoveredOverIconDebounced.read(reader) || this._isHoveredOverInlineEditDebounced.read(reader))) {
                icon = renderIcon(Codicon.check);
                iconDirecion = 'right';
            }
            else {
                icon = this._tabAction.read(reader) === InlineEditTabAction.Accept ? renderIcon(Codicon.keyboardTab) : renderIcon(Codicon.arrowRight);
            }
            let rotation = 0;
            switch (iconDirecion) {
                case 'right':
                    rotation = 0;
                    break;
                case 'bottom':
                    rotation = 90;
                    break;
                case 'top':
                    rotation = -90;
                    break;
            }
            return {
                rect,
                icon,
                rotation,
                docked,
                iconRect,
                pillRect,
                lineHeight,
                lineNumberRect,
            };
        });
        this._iconRef = n.ref();
        this._hoverVisible = observableValue(this, false);
        this.isHoverVisible = this._hoverVisible;
        this._isHoveredOverIcon = observableValue(this, false);
        this._isHoveredOverIconDebounced = debouncedObservable(this._isHoveredOverIcon, 100);
        this._tabAction = derived(this, reader => {
            const model = this._model.read(reader);
            if (!model) {
                return InlineEditTabAction.Inactive;
            }
            return model.tabAction.read(reader);
        });
        this._indicator = n.div({
            class: 'inline-edits-view-gutter-indicator',
            onclick: () => {
                const docked = this._layout.map(l => l && l.docked).get();
                this._editorObs.editor.focus();
                if (docked) {
                    this.model.accept();
                }
                else {
                    this.model.jump();
                }
            },
            tabIndex: 0,
            style: {
                position: 'absolute',
                overflow: 'visible',
            },
        }, mapOutFalsy(this._layout).map(layout => !layout ? [] : [
            n.div({
                style: {
                    position: 'absolute',
                    background: asCssVariable(inlineEditIndicatorBackground),
                    borderRadius: '4px',
                    ...rectToProps(reader => layout.read(reader).rect),
                }
            }),
            n.div({
                class: 'icon',
                ref: this._iconRef,
                onmouseenter: () => {
                    // TODO show hover when hovering ghost text etc.
                    this._showHover();
                },
                style: {
                    cursor: 'pointer',
                    zIndex: '1000',
                    position: 'absolute',
                    backgroundColor: this._gutterIndicatorStyles.map(v => v.background),
                    ['--vscodeIconForeground']: this._gutterIndicatorStyles.map(v => v.foreground),
                    border: this._gutterIndicatorStyles.map(v => `1px solid ${v.border}`),
                    boxSizing: 'border-box',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s ease-in-out, width 0.2s ease-in-out',
                    ...rectToProps(reader => layout.read(reader).pillRect),
                }
            }, [
                n.div({
                    className: 'line-number',
                    style: {
                        lineHeight: layout.map(l => `${l.lineHeight}px`),
                        display: layout.map(l => l.lineNumberRect.width > 0 ? 'flex' : 'none'),
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        width: layout.map(l => l.lineNumberRect.width),
                        height: '100%',
                        color: this._gutterIndicatorStyles.map(v => v.foreground),
                    }
                }, this._lineNumberToRender),
                n.div({
                    style: {
                        rotate: layout.map(i => `${i.rotation}deg`),
                        transition: 'rotate 0.2s ease-in-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        width: layout.map(l => `${l.iconRect.width}px`),
                    }
                }, [
                    layout.map(i => i.icon),
                ])
            ]),
        ])).keepUpdated(this._store);
        this._gutterIndicatorStyles = this._tabAction.map((v, reader) => {
            switch (v) {
                case InlineEditTabAction.Inactive: return {
                    background: getEditorBlendedColor(inlineEditIndicatorSecondaryBackground, themeService).read(reader).toString(),
                    foreground: getEditorBlendedColor(inlineEditIndicatorSecondaryForeground, themeService).read(reader).toString(),
                    border: getEditorBlendedColor(inlineEditIndicatorSecondaryBorder, themeService).read(reader).toString(),
                };
                case InlineEditTabAction.Jump: return {
                    background: getEditorBlendedColor(inlineEditIndicatorPrimaryBackground, themeService).read(reader).toString(),
                    foreground: getEditorBlendedColor(inlineEditIndicatorPrimaryForeground, themeService).read(reader).toString(),
                    border: getEditorBlendedColor(inlineEditIndicatorPrimaryBorder, themeService).read(reader).toString()
                };
                case InlineEditTabAction.Accept: return {
                    background: getEditorBlendedColor(inlineEditIndicatorsuccessfulBackground, themeService).read(reader).toString(),
                    foreground: getEditorBlendedColor(inlineEditIndicatorsuccessfulForeground, themeService).read(reader).toString(),
                    border: getEditorBlendedColor(inlineEditIndicatorsuccessfulBorder, themeService).read(reader).toString()
                };
            }
        });
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._indicator.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
        this._register(this._editorObs.editor.onMouseMove((e) => {
            const el = this._iconRef.element;
            const rect = el.getBoundingClientRect();
            const rectangularArea = Rect.fromLeftTopWidthHeight(rect.left, rect.top, rect.width, rect.height);
            const point = new Point(e.event.posx, e.event.posy);
            this._isHoveredOverIcon.set(rectangularArea.containsPoint(point), undefined);
        }));
        this._register(this._editorObs.editor.onDidScrollChange(() => {
            this._isHoveredOverIcon.set(false, undefined);
        }));
        this._isHoveredOverInlineEditDebounced = debouncedObservable(this._isHoveringOverInlineEdit, 100);
        // pulse animation when hovering inline edit
        this._register(runOnChange(this._isHoveredOverInlineEditDebounced, (isHovering) => {
            if (isHovering) {
                this._triggerAnimation();
            }
        }));
        if (this._newUserType === UserKind.Active) {
            this._register(this.setupNewUserExperience());
        }
        this._register(autorun(reader => {
            this._indicator.readEffect(reader);
            if (this._indicator.element) {
                this._editorObs.editor.applyFontInfo(this._indicator.element);
            }
        }));
        this._register(autorunWithStore((reader, store) => {
            const host = this._host.read(reader);
            if (!host) {
                return;
            }
            store.add(host.onDidAccept(() => {
                this._storageService.store('inlineEditsGutterIndicatorUserKind', UserKind.Active, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            }));
        }));
    }
    setupNewUserExperience() {
        if (this._newUserType === UserKind.Active) {
            return Disposable.None;
        }
        const disposableStore = new DisposableStore();
        let userHasHoveredOverIcon = false;
        let inlineEditHasBeenAccepted = false;
        let firstTimeUserAnimationCount = 0;
        let secondTimeUserAnimationCount = 0;
        // pulse animation for new users
        disposableStore.add(runOnChange(this._activeCompletionId, async (id) => {
            if (id === undefined) {
                return;
            }
            const userType = this._newUserType;
            // Animation
            switch (userType) {
                case UserKind.FirstTime: {
                    for (let i = 0; i < 3 && this._activeCompletionId.get() === id; i++) {
                        await this._triggerAnimation();
                        await timeout(500);
                    }
                    break;
                }
                case UserKind.SecondTime: {
                    this._triggerAnimation();
                    break;
                }
            }
            // User Kind Transition
            switch (userType) {
                case UserKind.FirstTime: {
                    if (++firstTimeUserAnimationCount >= 5 || userHasHoveredOverIcon) {
                        this._newUserType = UserKind.SecondTime;
                    }
                    break;
                }
                case UserKind.SecondTime: {
                    if (++secondTimeUserAnimationCount >= 5 && inlineEditHasBeenAccepted) {
                        this._newUserType = UserKind.Active;
                    }
                    break;
                }
            }
        }));
        // Remember when the user has hovered over the icon
        disposableStore.add(runOnChange(this._isHoveredOverIconDebounced, async (isHovered) => {
            if (isHovered) {
                userHasHoveredOverIcon = true;
            }
        }));
        // Remember when the user has accepted an inline edit
        disposableStore.add(autorunWithStore((reader, store) => {
            const host = this._host.read(reader);
            if (!host) {
                return;
            }
            store.add(host.onDidAccept(() => {
                inlineEditHasBeenAccepted = true;
            }));
        }));
        return disposableStore;
    }
    _triggerAnimation() {
        if (this._accessibilityService.isMotionReduced()) {
            return new Animation(null, null).finished;
        }
        // WIGGLE ANIMATION:
        /* this._iconRef.element.animate([
            { transform: 'rotate(0) scale(1)', offset: 0 },
            { transform: 'rotate(14.4deg) scale(1.1)', offset: 0.15 },
            { transform: 'rotate(-14.4deg) scale(1.2)', offset: 0.3 },
            { transform: 'rotate(14.4deg) scale(1.1)', offset: 0.45 },
            { transform: 'rotate(-14.4deg) scale(1.2)', offset: 0.6 },
            { transform: 'rotate(0) scale(1)', offset: 1 }
        ], { duration: 800 }); */
        // PULSE ANIMATION:
        const animation = this._iconRef.element.animate([
            {
                outline: `2px solid ${this._gutterIndicatorStyles.map(v => v.border).get()}`,
                outlineOffset: '-1px',
                offset: 0
            },
            {
                outline: `2px solid transparent`,
                outlineOffset: '10px',
                offset: 1
            },
        ], { duration: 500 });
        return animation.finished;
    }
    _showHover() {
        if (this._hoverVisible.get()) {
            return;
        }
        const disposableStore = new DisposableStore();
        const content = disposableStore.add(this._instantiationService.createInstance(GutterIndicatorMenuContent, this.model, (focusEditor) => {
            if (focusEditor) {
                this._editorObs.editor.focus();
            }
            h?.dispose();
        }, this._editorObs).toDisposableLiveElement());
        const focusTracker = disposableStore.add(trackFocus(content.element));
        disposableStore.add(focusTracker.onDidBlur(() => this._focusIsInMenu.set(false, undefined)));
        disposableStore.add(focusTracker.onDidFocus(() => this._focusIsInMenu.set(true, undefined)));
        disposableStore.add(toDisposable(() => this._focusIsInMenu.set(false, undefined)));
        const h = this._hoverService.showInstantHover({
            target: this._iconRef.element,
            content: content.element,
        });
        if (h) {
            this._hoverVisible.set(true, undefined);
            disposableStore.add(this._editorObs.editor.onDidScrollChange(() => h.dispose()));
            disposableStore.add(h.onDispose(() => {
                this._hoverVisible.set(false, undefined);
                disposableStore.dispose();
            }));
        }
        else {
            disposableStore.dispose();
        }
    }
};
InlineEditsGutterIndicator = __decorate([
    __param(7, IHoverService),
    __param(8, IInstantiationService),
    __param(9, IStorageService),
    __param(10, IAccessibilityService),
    __param(11, IThemeService)
], InlineEditsGutterIndicator);
export { InlineEditsGutterIndicator };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvY29tcG9uZW50cy9ndXR0ZXJJbmRpY2F0b3JWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDMUksT0FBTyxFQUFvQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMU0sT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDNUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0s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