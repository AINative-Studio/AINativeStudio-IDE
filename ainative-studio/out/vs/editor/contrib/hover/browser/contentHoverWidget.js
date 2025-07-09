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
var ContentHoverWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ResizableContentWidget } from './resizableContentWidget.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { getHoverAccessibleViewHint, HoverWidget } from '../../../../base/browser/ui/hover/hoverWidget.js';
import { Emitter } from '../../../../base/common/event.js';
const HORIZONTAL_SCROLLING_BY = 30;
let ContentHoverWidget = class ContentHoverWidget extends ResizableContentWidget {
    static { ContentHoverWidget_1 = this; }
    static { this.ID = 'editor.contrib.resizableContentHoverWidget'; }
    static { this._lastDimensions = new dom.Dimension(0, 0); }
    get isVisibleFromKeyboard() {
        return (this._renderedHover?.source === 2 /* HoverStartSource.Keyboard */);
    }
    get isVisible() {
        return this._hoverVisibleKey.get() ?? false;
    }
    get isFocused() {
        return this._hoverFocusedKey.get() ?? false;
    }
    constructor(editor, contextKeyService, _configurationService, _accessibilityService, _keybindingService) {
        const minimumHeight = editor.getOption(68 /* EditorOption.lineHeight */) + 8;
        const minimumWidth = 150;
        const minimumSize = new dom.Dimension(minimumWidth, minimumHeight);
        super(editor, minimumSize);
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._keybindingService = _keybindingService;
        this._hover = this._register(new HoverWidget(true));
        this._onDidResize = this._register(new Emitter());
        this.onDidResize = this._onDidResize.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._minimumSize = minimumSize;
        this._hoverVisibleKey = EditorContextKeys.hoverVisible.bindTo(contextKeyService);
        this._hoverFocusedKey = EditorContextKeys.hoverFocused.bindTo(contextKeyService);
        dom.append(this._resizableNode.domNode, this._hover.containerDomNode);
        this._resizableNode.domNode.style.zIndex = '50';
        this._resizableNode.domNode.className = 'monaco-resizable-hover';
        this._register(this._editor.onDidLayoutChange(() => {
            if (this.isVisible) {
                this._updateMaxDimensions();
            }
        }));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this._updateFont();
            }
        }));
        const focusTracker = this._register(dom.trackFocus(this._resizableNode.domNode));
        this._register(focusTracker.onDidFocus(() => {
            this._hoverFocusedKey.set(true);
        }));
        this._register(focusTracker.onDidBlur(() => {
            this._hoverFocusedKey.set(false);
        }));
        this._register(this._hover.scrollbar.onScroll((e) => {
            this._onDidScroll.fire(e);
        }));
        this._setRenderedHover(undefined);
        this._editor.addContentWidget(this);
    }
    dispose() {
        super.dispose();
        this._renderedHover?.dispose();
        this._editor.removeContentWidget(this);
    }
    getId() {
        return ContentHoverWidget_1.ID;
    }
    static _applyDimensions(container, width, height) {
        const transformedWidth = typeof width === 'number' ? `${width}px` : width;
        const transformedHeight = typeof height === 'number' ? `${height}px` : height;
        container.style.width = transformedWidth;
        container.style.height = transformedHeight;
    }
    _setContentsDomNodeDimensions(width, height) {
        const contentsDomNode = this._hover.contentsDomNode;
        return ContentHoverWidget_1._applyDimensions(contentsDomNode, width, height);
    }
    _setContainerDomNodeDimensions(width, height) {
        const containerDomNode = this._hover.containerDomNode;
        return ContentHoverWidget_1._applyDimensions(containerDomNode, width, height);
    }
    _setScrollableElementDimensions(width, height) {
        const scrollbarDomElement = this._hover.scrollbar.getDomNode();
        return ContentHoverWidget_1._applyDimensions(scrollbarDomElement, width, height);
    }
    _setHoverWidgetDimensions(width, height) {
        this._setContainerDomNodeDimensions(width, height);
        this._setScrollableElementDimensions(width, height);
        this._setContentsDomNodeDimensions(width, height);
        this._layoutContentWidget();
    }
    static _applyMaxDimensions(container, width, height) {
        const transformedWidth = typeof width === 'number' ? `${width}px` : width;
        const transformedHeight = typeof height === 'number' ? `${height}px` : height;
        container.style.maxWidth = transformedWidth;
        container.style.maxHeight = transformedHeight;
    }
    _setHoverWidgetMaxDimensions(width, height) {
        ContentHoverWidget_1._applyMaxDimensions(this._hover.contentsDomNode, width, height);
        ContentHoverWidget_1._applyMaxDimensions(this._hover.scrollbar.getDomNode(), width, height);
        ContentHoverWidget_1._applyMaxDimensions(this._hover.containerDomNode, width, height);
        this._hover.containerDomNode.style.setProperty('--vscode-hover-maxWidth', typeof width === 'number' ? `${width}px` : width);
        this._layoutContentWidget();
    }
    _setAdjustedHoverWidgetDimensions(size) {
        this._setHoverWidgetMaxDimensions('none', 'none');
        this._setHoverWidgetDimensions(size.width, size.height);
    }
    _updateResizableNodeMaxDimensions() {
        const maxRenderingWidth = this._findMaximumRenderingWidth() ?? Infinity;
        const maxRenderingHeight = this._findMaximumRenderingHeight() ?? Infinity;
        this._resizableNode.maxSize = new dom.Dimension(maxRenderingWidth, maxRenderingHeight);
        this._setHoverWidgetMaxDimensions(maxRenderingWidth, maxRenderingHeight);
    }
    _resize(size) {
        ContentHoverWidget_1._lastDimensions = new dom.Dimension(size.width, size.height);
        this._setAdjustedHoverWidgetDimensions(size);
        this._resizableNode.layout(size.height, size.width);
        this._updateResizableNodeMaxDimensions();
        this._hover.scrollbar.scanDomNode();
        this._editor.layoutContentWidget(this);
        this._onDidResize.fire();
    }
    _findAvailableSpaceVertically() {
        const position = this._renderedHover?.showAtPosition;
        if (!position) {
            return;
        }
        return this._positionPreference === 1 /* ContentWidgetPositionPreference.ABOVE */ ?
            this._availableVerticalSpaceAbove(position)
            : this._availableVerticalSpaceBelow(position);
    }
    _findMaximumRenderingHeight() {
        const availableSpace = this._findAvailableSpaceVertically();
        if (!availableSpace) {
            return;
        }
        const children = this._hover.contentsDomNode.children;
        let maximumHeight = children.length - 1;
        Array.from(this._hover.contentsDomNode.children).forEach((hoverPart) => {
            maximumHeight += hoverPart.clientHeight;
        });
        return Math.min(availableSpace, maximumHeight);
    }
    _isHoverTextOverflowing() {
        // To find out if the text is overflowing, we will disable wrapping, check the widths, and then re-enable wrapping
        this._hover.containerDomNode.style.setProperty('--vscode-hover-whiteSpace', 'nowrap');
        this._hover.containerDomNode.style.setProperty('--vscode-hover-sourceWhiteSpace', 'nowrap');
        const overflowing = Array.from(this._hover.contentsDomNode.children).some((hoverElement) => {
            return hoverElement.scrollWidth > hoverElement.clientWidth;
        });
        this._hover.containerDomNode.style.removeProperty('--vscode-hover-whiteSpace');
        this._hover.containerDomNode.style.removeProperty('--vscode-hover-sourceWhiteSpace');
        return overflowing;
    }
    _findMaximumRenderingWidth() {
        if (!this._editor || !this._editor.hasModel()) {
            return;
        }
        const overflowing = this._isHoverTextOverflowing();
        const initialWidth = (typeof this._contentWidth === 'undefined'
            ? 0
            : this._contentWidth);
        if (overflowing || this._hover.containerDomNode.clientWidth < initialWidth) {
            const bodyBoxWidth = dom.getClientArea(this._hover.containerDomNode.ownerDocument.body).width;
            const horizontalPadding = 14;
            return bodyBoxWidth - horizontalPadding;
        }
        else {
            return this._hover.containerDomNode.clientWidth;
        }
    }
    isMouseGettingCloser(posx, posy) {
        if (!this._renderedHover) {
            return false;
        }
        if (this._renderedHover.initialMousePosX === undefined || this._renderedHover.initialMousePosY === undefined) {
            this._renderedHover.initialMousePosX = posx;
            this._renderedHover.initialMousePosY = posy;
            return false;
        }
        const widgetRect = dom.getDomNodePagePosition(this.getDomNode());
        if (this._renderedHover.closestMouseDistance === undefined) {
            this._renderedHover.closestMouseDistance = computeDistanceFromPointToRectangle(this._renderedHover.initialMousePosX, this._renderedHover.initialMousePosY, widgetRect.left, widgetRect.top, widgetRect.width, widgetRect.height);
        }
        const distance = computeDistanceFromPointToRectangle(posx, posy, widgetRect.left, widgetRect.top, widgetRect.width, widgetRect.height);
        if (distance > this._renderedHover.closestMouseDistance + 4 /* tolerance of 4 pixels */) {
            // The mouse is getting farther away
            return false;
        }
        this._renderedHover.closestMouseDistance = Math.min(this._renderedHover.closestMouseDistance, distance);
        return true;
    }
    _setRenderedHover(renderedHover) {
        this._renderedHover?.dispose();
        this._renderedHover = renderedHover;
        this._hoverVisibleKey.set(!!renderedHover);
        this._hover.containerDomNode.classList.toggle('hidden', !renderedHover);
    }
    _updateFont() {
        const { fontSize, lineHeight } = this._editor.getOption(52 /* EditorOption.fontInfo */);
        const contentsDomNode = this._hover.contentsDomNode;
        contentsDomNode.style.fontSize = `${fontSize}px`;
        contentsDomNode.style.lineHeight = `${lineHeight / fontSize}`;
        const codeClasses = Array.prototype.slice.call(this._hover.contentsDomNode.getElementsByClassName('code'));
        codeClasses.forEach(node => this._editor.applyFontInfo(node));
    }
    _updateContent(node) {
        const contentsDomNode = this._hover.contentsDomNode;
        contentsDomNode.style.paddingBottom = '';
        contentsDomNode.textContent = '';
        contentsDomNode.appendChild(node);
    }
    _layoutContentWidget() {
        this._editor.layoutContentWidget(this);
        this._hover.onContentsChanged();
    }
    _updateMaxDimensions() {
        const height = Math.max(this._editor.getLayoutInfo().height / 4, 250, ContentHoverWidget_1._lastDimensions.height);
        const width = Math.max(this._editor.getLayoutInfo().width * 0.66, 750, ContentHoverWidget_1._lastDimensions.width);
        this._resizableNode.maxSize = new dom.Dimension(width, height);
        this._setHoverWidgetMaxDimensions(width, height);
    }
    _render(renderedHover) {
        this._setRenderedHover(renderedHover);
        this._updateFont();
        this._updateContent(renderedHover.domNode);
        this.onContentsChanged();
        // Simply force a synchronous render on the editor
        // such that the widget does not really render with left = '0px'
        this._editor.render();
    }
    getPosition() {
        if (!this._renderedHover) {
            return null;
        }
        return {
            position: this._renderedHover.showAtPosition,
            secondaryPosition: this._renderedHover.showAtSecondaryPosition,
            positionAffinity: this._renderedHover.shouldAppearBeforeContent ? 3 /* PositionAffinity.LeftOfInjectedText */ : undefined,
            preference: [this._positionPreference ?? 1 /* ContentWidgetPositionPreference.ABOVE */]
        };
    }
    show(renderedHover) {
        if (!this._editor || !this._editor.hasModel()) {
            return;
        }
        this._render(renderedHover);
        const widgetHeight = dom.getTotalHeight(this._hover.containerDomNode);
        const widgetPosition = renderedHover.showAtPosition;
        this._positionPreference = this._findPositionPreference(widgetHeight, widgetPosition) ?? 1 /* ContentWidgetPositionPreference.ABOVE */;
        // See https://github.com/microsoft/vscode/issues/140339
        // TODO: Doing a second layout of the hover after force rendering the editor
        this.onContentsChanged();
        if (renderedHover.shouldFocus) {
            this._hover.containerDomNode.focus();
        }
        this._onDidResize.fire();
        // The aria label overrides the label, so if we add to it, add the contents of the hover
        const hoverFocused = this._hover.containerDomNode.ownerDocument.activeElement === this._hover.containerDomNode;
        const accessibleViewHint = hoverFocused && getHoverAccessibleViewHint(this._configurationService.getValue('accessibility.verbosity.hover') === true && this._accessibilityService.isScreenReaderOptimized(), this._keybindingService.lookupKeybinding('editor.action.accessibleView')?.getAriaLabel() ?? '');
        if (accessibleViewHint) {
            this._hover.contentsDomNode.ariaLabel = this._hover.contentsDomNode.textContent + ', ' + accessibleViewHint;
        }
    }
    hide() {
        if (!this._renderedHover) {
            return;
        }
        const hoverStoleFocus = this._renderedHover.shouldFocus || this._hoverFocusedKey.get();
        this._setRenderedHover(undefined);
        this._resizableNode.maxSize = new dom.Dimension(Infinity, Infinity);
        this._resizableNode.clearSashHoverState();
        this._hoverFocusedKey.set(false);
        this._editor.layoutContentWidget(this);
        if (hoverStoleFocus) {
            this._editor.focus();
        }
    }
    _removeConstraintsRenderNormally() {
        // Added because otherwise the initial size of the hover content is smaller than should be
        const layoutInfo = this._editor.getLayoutInfo();
        this._resizableNode.layout(layoutInfo.height, layoutInfo.width);
        this._setHoverWidgetDimensions('auto', 'auto');
        this._updateMaxDimensions();
    }
    setMinimumDimensions(dimensions) {
        // We combine the new minimum dimensions with the previous ones
        this._minimumSize = new dom.Dimension(Math.max(this._minimumSize.width, dimensions.width), Math.max(this._minimumSize.height, dimensions.height));
        this._updateMinimumWidth();
    }
    _updateMinimumWidth() {
        const width = (typeof this._contentWidth === 'undefined'
            ? this._minimumSize.width
            : Math.min(this._contentWidth, this._minimumSize.width));
        // We want to avoid that the hover is artificially large, so we use the content width as minimum width
        this._resizableNode.minSize = new dom.Dimension(width, this._minimumSize.height);
    }
    onContentsChanged() {
        this._removeConstraintsRenderNormally();
        const contentsDomNode = this._hover.contentsDomNode;
        let height = dom.getTotalHeight(contentsDomNode);
        let width = dom.getTotalWidth(contentsDomNode) + 2;
        this._resizableNode.layout(height, width);
        this._setHoverWidgetDimensions(width, height);
        height = dom.getTotalHeight(contentsDomNode);
        width = dom.getTotalWidth(contentsDomNode);
        this._contentWidth = width;
        this._updateMinimumWidth();
        this._resizableNode.layout(height, width);
        if (this._renderedHover?.showAtPosition) {
            const widgetHeight = dom.getTotalHeight(this._hover.containerDomNode);
            this._positionPreference = this._findPositionPreference(widgetHeight, this._renderedHover.showAtPosition);
        }
        this._layoutContentWidget();
    }
    focus() {
        this._hover.containerDomNode.focus();
    }
    scrollUp() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const fontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop - fontInfo.lineHeight });
    }
    scrollDown() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const fontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop + fontInfo.lineHeight });
    }
    scrollLeft() {
        const scrollLeft = this._hover.scrollbar.getScrollPosition().scrollLeft;
        this._hover.scrollbar.setScrollPosition({ scrollLeft: scrollLeft - HORIZONTAL_SCROLLING_BY });
    }
    scrollRight() {
        const scrollLeft = this._hover.scrollbar.getScrollPosition().scrollLeft;
        this._hover.scrollbar.setScrollPosition({ scrollLeft: scrollLeft + HORIZONTAL_SCROLLING_BY });
    }
    pageUp() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const scrollHeight = this._hover.scrollbar.getScrollDimensions().height;
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop - scrollHeight });
    }
    pageDown() {
        const scrollTop = this._hover.scrollbar.getScrollPosition().scrollTop;
        const scrollHeight = this._hover.scrollbar.getScrollDimensions().height;
        this._hover.scrollbar.setScrollPosition({ scrollTop: scrollTop + scrollHeight });
    }
    goToTop() {
        this._hover.scrollbar.setScrollPosition({ scrollTop: 0 });
    }
    goToBottom() {
        this._hover.scrollbar.setScrollPosition({ scrollTop: this._hover.scrollbar.getScrollDimensions().scrollHeight });
    }
};
ContentHoverWidget = ContentHoverWidget_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IAccessibilityService),
    __param(4, IKeybindingService)
], ContentHoverWidget);
export { ContentHoverWidget };
function computeDistanceFromPointToRectangle(pointX, pointY, left, top, width, height) {
    const x = (left + width / 2); // x center of rectangle
    const y = (top + height / 2); // y center of rectangle
    const dx = Math.max(Math.abs(pointX - x) - width / 2, 0);
    const dy = Math.max(Math.abs(pointY - y) - height / 2, 0);
    return Math.sqrt(dx * dx + dy * dy);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvY29udGVudEhvdmVyV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBSXZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxXQUFXLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUUzRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJM0QsTUFBTSx1QkFBdUIsR0FBRyxFQUFFLENBQUM7QUFFNUIsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxzQkFBc0I7O2FBRS9DLE9BQUUsR0FBRyw0Q0FBNEMsQUFBL0MsQ0FBZ0Q7YUFDakQsb0JBQWUsR0FBa0IsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQUFBekMsQ0FBMEM7SUFpQnhFLElBQVcscUJBQXFCO1FBQy9CLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sc0NB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