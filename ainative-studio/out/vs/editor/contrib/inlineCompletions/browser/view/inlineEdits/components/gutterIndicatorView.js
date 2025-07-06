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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9jb21wb25lbnRzL2d1dHRlckluZGljYXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMxSSxPQUFPLEVBQW9DLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxTSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDNUcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSx5REFBeUQsQ0FBQztBQUN2SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRzNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFLekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXZHLE9BQU8sRUFBb0IsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsNkJBQTZCLEVBQUUsb0NBQW9DLEVBQUUsZ0NBQWdDLEVBQUUsb0NBQW9DLEVBQUUsc0NBQXNDLEVBQUUsa0NBQWtDLEVBQUUsc0NBQXNDLEVBQUUsdUNBQXVDLEVBQUUsbUNBQW1DLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDNWEsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUV0RSxtRUFBbUU7QUFDbkUsSUFBSyxRQUlKO0FBSkQsV0FBSyxRQUFRO0lBQ1osbUNBQXVCLENBQUE7SUFDdkIscUNBQXlCLENBQUE7SUFDekIsNkJBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQUpJLFFBQVEsS0FBUixRQUFRLFFBSVo7QUFFTSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFFekQsSUFBWSxLQUFLO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDaEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQUMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFBQyxDQUFDO1FBQ2hGLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQWlCRCxJQUFZLFlBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MscUNBQTRCLFFBQVEsQ0FBQyxTQUFTLENBQWEsQ0FBQztJQUNqSSxDQUFDO0lBQ0QsSUFBWSxZQUFZLENBQUMsS0FBZTtRQUN2QyxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxRQUFRLENBQUMsU0FBUztnQkFDdEIsTUFBTSxJQUFJLGtCQUFrQixDQUFDLDBDQUEwQyxDQUFDLENBQUM7WUFDMUUsS0FBSyxRQUFRLENBQUMsVUFBVTtnQkFDdkIsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUM5QyxNQUFNO1lBQ1AsS0FBSyxRQUFRLENBQUMsTUFBTTtnQkFDbkIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN6QyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDL0MsTUFBTTtRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLGdFQUErQyxDQUFDO0lBQ3ZILENBQUM7SUFFRCxZQUNrQixVQUFnQyxFQUNoQyxjQUFrRCxFQUNsRCxlQUFvQyxFQUNwQyxLQUE4QyxFQUM5QyxNQUFpRCxFQUNqRCx5QkFBK0MsRUFDL0MsY0FBNEMsRUFDOUMsYUFBNEMsRUFDcEMscUJBQTZELEVBQ25FLGVBQWlELEVBQzNDLHFCQUE2RCxFQUNyRSxZQUEyQjtRQUUxQyxLQUFLLEVBQUUsQ0FBQztRQWJTLGVBQVUsR0FBVixVQUFVLENBQXNCO1FBQ2hDLG1CQUFjLEdBQWQsY0FBYyxDQUFvQztRQUNsRCxvQkFBZSxHQUFmLGVBQWUsQ0FBcUI7UUFDcEMsVUFBSyxHQUFMLEtBQUssQ0FBeUM7UUFDOUMsV0FBTSxHQUFOLE1BQU0sQ0FBMkM7UUFDakQsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFzQjtRQUMvQyxtQkFBYyxHQUFkLGNBQWMsQ0FBOEI7UUFDN0Isa0JBQWEsR0FBYixhQUFhLENBQWM7UUFDbkIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNsRCxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDMUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQTlDcEUsd0JBQW1CLEdBQUcsT0FBTyxDQUFxQixNQUFNLENBQUMsRUFBRTtZQUMzRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQUMsT0FBTyxTQUFTLENBQUM7WUFBQyxDQUFDO1lBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFNBQVMsQ0FBQztZQUFDLENBQUM7WUFDakMsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUtjLGdDQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDdEUscUNBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUMzRSxzQ0FBaUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBNk01RSxzQkFBaUIsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXJELFdBQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQUMsT0FBTyxTQUFTLENBQUM7WUFBQyxDQUFDO1lBQ2pDLE9BQU87Z0JBQ04sS0FBSztnQkFDTCxlQUFlLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQzthQUMzRSxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFYyw0QkFBdUIsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3RSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCO1lBQ2xFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF3QixDQUFDLHdCQUF3QixDQUFDO1lBQy9JLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFTCx3QkFBbUIsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQzdELElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztZQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLGVBQWUsQ0FBQztZQUNyRSxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxtQ0FBMEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFM0YsSUFBSSxVQUFVLEtBQUssU0FBUyxJQUFJLGlCQUFpQixDQUFDLFVBQVUsc0NBQThCLEVBQUUsQ0FBQztnQkFDNUYsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1lBRUQsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLDJDQUFtQyxFQUFFLENBQUM7Z0JBQ3JFLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxVQUFVLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFDLFVBQVUsS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDekYsT0FBTyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzlCLENBQUM7Z0JBQ0QsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1lBRUQsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLDJDQUFtQyxFQUFFLENBQUM7Z0JBQ3JFLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUNyQixPQUFPLEVBQUUsQ0FBQztnQkFDWCxDQUFDO2dCQUNELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM1RSxJQUFJLGtCQUFrQixLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM5QixPQUFPLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsQ0FBQztnQkFDRCxPQUFPLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLENBQUM7WUFFRCxJQUFJLGlCQUFpQixDQUFDLFVBQVUseUNBQWlDLEVBQUUsQ0FBQztnQkFDbkUsSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDaEMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQy9DLENBQUM7Z0JBQ0QsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1lBRUQsT0FBTyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7UUFFYyxZQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNqRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQUMsT0FBTyxTQUFTLENBQUM7WUFBQyxDQUFDO1lBRTdCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV2RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsa0NBQXlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25GLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQztZQUN4QixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUM7WUFDdEIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1lBRXZCLDJDQUEyQztZQUMzQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDLENBQUM7WUFDcEcsTUFBTSx3QkFBd0IsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUU3RixrREFBa0Q7WUFDbEQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRS9LLG1DQUFtQztZQUNuQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyRCxJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFFN0UsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBRXhCLDJDQUEyQztZQUMzQyxRQUFRLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNsRCxDQUFDLENBQUMsYUFBYTtnQkFDZixDQUFDLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsNENBQTRDO1lBRWxLLDRDQUE0QztZQUM1QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5RixJQUFJLFlBQVksR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JELE9BQWdCO2dCQUNoQixDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hDLEtBQWMsQ0FBQyxDQUFDO29CQUNoQixRQUFpQixDQUFDO1lBRXBCLDREQUE0RDtZQUM1RCxJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQztZQUN4QixJQUFJLE1BQU0sSUFBSSxRQUFRLENBQUMsR0FBRyxLQUFLLFVBQVUsQ0FBQyxHQUFHLEdBQUcsVUFBVSxFQUFFLENBQUM7Z0JBQzVELFFBQVEsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxlQUFlLEdBQUcsV0FBVyxHQUFHLFlBQVksQ0FBQyxDQUFDO2dCQUN0SSxjQUFjLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixHQUFHLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuSixRQUFRLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEQsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDO1lBQ1QsSUFBSSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN0SCxJQUFJLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDakMsWUFBWSxHQUFHLE9BQU8sQ0FBQztZQUN4QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN2SSxDQUFDO1lBRUQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLFFBQVEsWUFBWSxFQUFFLENBQUM7Z0JBQ3RCLEtBQUssT0FBTztvQkFBRSxRQUFRLEdBQUcsQ0FBQyxDQUFDO29CQUFDLE1BQU07Z0JBQ2xDLEtBQUssUUFBUTtvQkFBRSxRQUFRLEdBQUcsRUFBRSxDQUFDO29CQUFDLE1BQU07Z0JBQ3BDLEtBQUssS0FBSztvQkFBRSxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQUMsTUFBTTtZQUNuQyxDQUFDO1lBRUQsT0FBTztnQkFDTixJQUFJO2dCQUNKLElBQUk7Z0JBQ0osUUFBUTtnQkFDUixNQUFNO2dCQUNOLFFBQVE7Z0JBQ1IsUUFBUTtnQkFDUixVQUFVO2dCQUNWLGNBQWM7YUFDZCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFYyxhQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBa0IsQ0FBQztRQUNuQyxrQkFBYSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUMsbUJBQWMsR0FBeUIsSUFBSSxDQUFDLGFBQWEsQ0FBQztRQUN6RCx1QkFBa0IsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELGdDQUEyQixHQUF5QixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUF5Q3RHLGVBQVUsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ3BELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFBQyxPQUFPLG1CQUFtQixDQUFDLFFBQVEsQ0FBQztZQUFDLENBQUM7WUFDcEQsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztRQUVjLGVBQVUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ25DLEtBQUssRUFBRSxvQ0FBb0M7WUFDM0MsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQzFELElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUMvQixJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3JCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNuQixDQUFDO1lBQ0YsQ0FBQztZQUNELFFBQVEsRUFBRSxDQUFDO1lBQ1gsS0FBSyxFQUFFO2dCQUNOLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixRQUFRLEVBQUUsU0FBUzthQUNuQjtTQUNELEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUNMLEtBQUssRUFBRTtvQkFDTixRQUFRLEVBQUUsVUFBVTtvQkFDcEIsVUFBVSxFQUFFLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQztvQkFDeEQsWUFBWSxFQUFFLEtBQUs7b0JBQ25CLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUM7aUJBQ2xEO2FBQ0QsQ0FBQztZQUNGLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQ0wsS0FBSyxFQUFFLE1BQU07Z0JBQ2IsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUNsQixZQUFZLEVBQUUsR0FBRyxFQUFFO29CQUNsQixnREFBZ0Q7b0JBQ2hELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDbkIsQ0FBQztnQkFDRCxLQUFLLEVBQUU7b0JBQ04sTUFBTSxFQUFFLFNBQVM7b0JBQ2pCLE1BQU0sRUFBRSxNQUFNO29CQUNkLFFBQVEsRUFBRSxVQUFVO29CQUNwQixlQUFlLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7b0JBQ25FLENBQUMsd0JBQStCLENBQUMsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztvQkFDckYsTUFBTSxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDckUsU0FBUyxFQUFFLFlBQVk7b0JBQ3ZCLFlBQVksRUFBRSxLQUFLO29CQUNuQixPQUFPLEVBQUUsTUFBTTtvQkFDZixjQUFjLEVBQUUsUUFBUTtvQkFDeEIsVUFBVSxFQUFFLDJEQUEyRDtvQkFDdkUsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQztpQkFDdEQ7YUFDRCxFQUFFO2dCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ0wsU0FBUyxFQUFFLGFBQWE7b0JBQ3hCLEtBQUssRUFBRTt3QkFDTixVQUFVLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsSUFBSSxDQUFDO3dCQUNoRCxPQUFPLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7d0JBQ3RFLFVBQVUsRUFBRSxRQUFRO3dCQUNwQixjQUFjLEVBQUUsVUFBVTt3QkFDMUIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQzt3QkFDOUMsTUFBTSxFQUFFLE1BQU07d0JBQ2QsS0FBSyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO3FCQUN6RDtpQkFDRCxFQUNBLElBQUksQ0FBQyxtQkFBbUIsQ0FDeEI7Z0JBQ0QsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDTCxLQUFLLEVBQUU7d0JBQ04sTUFBTSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEtBQUssQ0FBQzt3QkFDM0MsVUFBVSxFQUFFLHlCQUF5Qjt3QkFDckMsT0FBTyxFQUFFLE1BQU07d0JBQ2YsVUFBVSxFQUFFLFFBQVE7d0JBQ3BCLGNBQWMsRUFBRSxRQUFRO3dCQUN4QixNQUFNLEVBQUUsTUFBTTt3QkFDZCxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksQ0FBQztxQkFDL0M7aUJBQ0QsRUFBRTtvQkFDRixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztpQkFDdkIsQ0FBQzthQUNGLENBQUM7U0FDRixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBMWE1QixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDL0QsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDWCxLQUFLLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU87b0JBQ3pDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxzQ0FBc0MsRUFBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO29CQUMvRyxVQUFVLEVBQUUscUJBQXFCLENBQUMsc0NBQXNDLEVBQUUsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDL0csTUFBTSxFQUFFLHFCQUFxQixDQUFDLGtDQUFrQyxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7aUJBQ3ZHLENBQUM7Z0JBQ0YsS0FBSyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPO29CQUNyQyxVQUFVLEVBQUUscUJBQXFCLENBQUMsb0NBQW9DLEVBQUUsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDN0csVUFBVSxFQUFFLHFCQUFxQixDQUFDLG9DQUFvQyxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7b0JBQzdHLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxnQ0FBZ0MsRUFBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO2lCQUNyRyxDQUFDO2dCQUNGLEtBQUssbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTztvQkFDdkMsVUFBVSxFQUFFLHFCQUFxQixDQUFDLHVDQUF1QyxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7b0JBQ2hILFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyx1Q0FBdUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFO29CQUNoSCxNQUFNLEVBQUUscUJBQXFCLENBQUMsbUNBQW1DLEVBQUUsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRTtpQkFDeEcsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQztZQUNsRCxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPO1lBQ2hDLFFBQVEsRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDO1lBQy9CLG1CQUFtQixFQUFFLEtBQUs7WUFDMUIsbUJBQW1CLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztTQUN2QyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBb0IsRUFBRSxFQUFFO1lBQzFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEcsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO1lBQzVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsaUNBQWlDLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRWxHLDRDQUE0QztRQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUNqRixJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMxQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9ELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNqRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQUMsT0FBTztZQUFDLENBQUM7WUFDdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDL0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsb0NBQW9DLEVBQUUsUUFBUSxDQUFDLE1BQU0sZ0VBQStDLENBQUM7WUFDakksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0MsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRTlDLElBQUksc0JBQXNCLEdBQUcsS0FBSyxDQUFDO1FBQ25DLElBQUkseUJBQXlCLEdBQUcsS0FBSyxDQUFDO1FBQ3RDLElBQUksMkJBQTJCLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUksNEJBQTRCLEdBQUcsQ0FBQyxDQUFDO1FBRXJDLGdDQUFnQztRQUNoQyxlQUFlLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ3RFLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUFDLE9BQU87WUFBQyxDQUFDO1lBQ2pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7WUFFbkMsWUFBWTtZQUNaLFFBQVEsUUFBUSxFQUFFLENBQUM7Z0JBQ2xCLEtBQUssUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUNyRSxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO3dCQUMvQixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEIsQ0FBQztvQkFDRCxNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDMUIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ3pCLE1BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7WUFFRCx1QkFBdUI7WUFDdkIsUUFBUSxRQUFRLEVBQUUsQ0FBQztnQkFDbEIsS0FBSyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFDekIsSUFBSSxFQUFFLDJCQUEyQixJQUFJLENBQUMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO3dCQUNsRSxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUM7b0JBQ3pDLENBQUM7b0JBQ0QsTUFBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQzFCLElBQUksRUFBRSw0QkFBNEIsSUFBSSxDQUFDLElBQUkseUJBQXlCLEVBQUUsQ0FBQzt3QkFDdEUsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO29CQUNyQyxDQUFDO29CQUNELE1BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosbURBQW1EO1FBQ25ELGVBQWUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDckYsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixzQkFBc0IsR0FBRyxJQUFJLENBQUM7WUFDL0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixxREFBcUQ7UUFDckQsZUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUN0RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQUMsT0FBTztZQUFDLENBQUM7WUFDdEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtnQkFDL0IseUJBQXlCLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxlQUFlLENBQUM7SUFDeEIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO1lBQ2xELE9BQU8sSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUMzQyxDQUFDO1FBQ0Qsb0JBQW9CO1FBQ3BCOzs7Ozs7O2lDQU95QjtRQUV6QixtQkFBbUI7UUFDbkIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQy9DO2dCQUNDLE9BQU8sRUFBRSxhQUFhLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQzVFLGFBQWEsRUFBRSxNQUFNO2dCQUNyQixNQUFNLEVBQUUsQ0FBQzthQUNUO1lBQ0Q7Z0JBQ0MsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsYUFBYSxFQUFFLE1BQU07Z0JBQ3JCLE1BQU0sRUFBRSxDQUFDO2FBQ1Q7U0FDRCxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFdEIsT0FBTyxTQUFTLENBQUMsUUFBUSxDQUFDO0lBQzNCLENBQUM7SUE2SU8sVUFBVTtRQUNqQixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUM5QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDOUMsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUM1RSwwQkFBMEIsRUFDMUIsSUFBSSxDQUFDLEtBQUssRUFDVixDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ2YsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEMsQ0FBQztZQUNELENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUNkLENBQUMsRUFDRCxJQUFJLENBQUMsVUFBVSxDQUNmLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBRTdCLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLGVBQWUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdGLGVBQWUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdGLGVBQWUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkYsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQztZQUM3QyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPO1lBQzdCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztTQUN4QixDQUE0QixDQUFDO1FBQzlCLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDUCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDeEMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2pGLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDekMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO2FBQU0sQ0FBQztZQUNQLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQixDQUFDO0lBQ0YsQ0FBQztDQW9GRCxDQUFBO0FBdGVZLDBCQUEwQjtJQW1EcEMsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLGFBQWEsQ0FBQTtHQXZESCwwQkFBMEIsQ0FzZXRDIn0=