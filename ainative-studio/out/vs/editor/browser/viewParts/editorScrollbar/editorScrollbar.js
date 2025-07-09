/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { SmoothScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
import { getThemeTypeSelector } from '../../../../platform/theme/common/themeService.js';
/**
 * The editor scrollbar built on VS Code's scrollable element that sits beside
 * the minimap.
 */
export class EditorScrollbar extends ViewPart {
    constructor(context, linesContent, viewDomNode, overflowGuardDomNode) {
        super(context);
        const options = this._context.configuration.options;
        const scrollbar = options.get(108 /* EditorOption.scrollbar */);
        const mouseWheelScrollSensitivity = options.get(76 /* EditorOption.mouseWheelScrollSensitivity */);
        const fastScrollSensitivity = options.get(42 /* EditorOption.fastScrollSensitivity */);
        const scrollPredominantAxis = options.get(111 /* EditorOption.scrollPredominantAxis */);
        const scrollbarOptions = {
            listenOnDomNode: viewDomNode.domNode,
            className: 'editor-scrollable' + ' ' + getThemeTypeSelector(context.theme.type),
            useShadows: false,
            lazyRender: true,
            vertical: scrollbar.vertical,
            horizontal: scrollbar.horizontal,
            verticalHasArrows: scrollbar.verticalHasArrows,
            horizontalHasArrows: scrollbar.horizontalHasArrows,
            verticalScrollbarSize: scrollbar.verticalScrollbarSize,
            verticalSliderSize: scrollbar.verticalSliderSize,
            horizontalScrollbarSize: scrollbar.horizontalScrollbarSize,
            horizontalSliderSize: scrollbar.horizontalSliderSize,
            handleMouseWheel: scrollbar.handleMouseWheel,
            alwaysConsumeMouseWheel: scrollbar.alwaysConsumeMouseWheel,
            arrowSize: scrollbar.arrowSize,
            mouseWheelScrollSensitivity: mouseWheelScrollSensitivity,
            fastScrollSensitivity: fastScrollSensitivity,
            scrollPredominantAxis: scrollPredominantAxis,
            scrollByPage: scrollbar.scrollByPage,
        };
        this.scrollbar = this._register(new SmoothScrollableElement(linesContent.domNode, scrollbarOptions, this._context.viewLayout.getScrollable()));
        PartFingerprints.write(this.scrollbar.getDomNode(), 6 /* PartFingerprint.ScrollableElement */);
        this.scrollbarDomNode = createFastDomNode(this.scrollbar.getDomNode());
        this.scrollbarDomNode.setPosition('absolute');
        this._setLayout();
        // When having a zone widget that calls .focus() on one of its dom elements,
        // the browser will try desperately to reveal that dom node, unexpectedly
        // changing the .scrollTop of this.linesContent
        const onBrowserDesperateReveal = (domNode, lookAtScrollTop, lookAtScrollLeft) => {
            const newScrollPosition = {};
            if (lookAtScrollTop) {
                const deltaTop = domNode.scrollTop;
                if (deltaTop) {
                    newScrollPosition.scrollTop = this._context.viewLayout.getCurrentScrollTop() + deltaTop;
                    domNode.scrollTop = 0;
                }
            }
            if (lookAtScrollLeft) {
                const deltaLeft = domNode.scrollLeft;
                if (deltaLeft) {
                    newScrollPosition.scrollLeft = this._context.viewLayout.getCurrentScrollLeft() + deltaLeft;
                    domNode.scrollLeft = 0;
                }
            }
            this._context.viewModel.viewLayout.setScrollPosition(newScrollPosition, 1 /* ScrollType.Immediate */);
        };
        // I've seen this happen both on the view dom node & on the lines content dom node.
        this._register(dom.addDisposableListener(viewDomNode.domNode, 'scroll', (e) => onBrowserDesperateReveal(viewDomNode.domNode, true, true)));
        this._register(dom.addDisposableListener(linesContent.domNode, 'scroll', (e) => onBrowserDesperateReveal(linesContent.domNode, true, false)));
        this._register(dom.addDisposableListener(overflowGuardDomNode.domNode, 'scroll', (e) => onBrowserDesperateReveal(overflowGuardDomNode.domNode, true, false)));
        this._register(dom.addDisposableListener(this.scrollbarDomNode.domNode, 'scroll', (e) => onBrowserDesperateReveal(this.scrollbarDomNode.domNode, true, false)));
    }
    dispose() {
        super.dispose();
    }
    _setLayout() {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this.scrollbarDomNode.setLeft(layoutInfo.contentLeft);
        const minimap = options.get(74 /* EditorOption.minimap */);
        const side = minimap.side;
        if (side === 'right') {
            this.scrollbarDomNode.setWidth(layoutInfo.contentWidth + layoutInfo.minimap.minimapWidth);
        }
        else {
            this.scrollbarDomNode.setWidth(layoutInfo.contentWidth);
        }
        this.scrollbarDomNode.setHeight(layoutInfo.height);
    }
    getOverviewRulerLayoutInfo() {
        return this.scrollbar.getOverviewRulerLayoutInfo();
    }
    getDomNode() {
        return this.scrollbarDomNode;
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this.scrollbar.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this.scrollbar.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        if (e.hasChanged(108 /* EditorOption.scrollbar */)
            || e.hasChanged(76 /* EditorOption.mouseWheelScrollSensitivity */)
            || e.hasChanged(42 /* EditorOption.fastScrollSensitivity */)) {
            const options = this._context.configuration.options;
            const scrollbar = options.get(108 /* EditorOption.scrollbar */);
            const mouseWheelScrollSensitivity = options.get(76 /* EditorOption.mouseWheelScrollSensitivity */);
            const fastScrollSensitivity = options.get(42 /* EditorOption.fastScrollSensitivity */);
            const scrollPredominantAxis = options.get(111 /* EditorOption.scrollPredominantAxis */);
            const newOpts = {
                vertical: scrollbar.vertical,
                horizontal: scrollbar.horizontal,
                verticalScrollbarSize: scrollbar.verticalScrollbarSize,
                horizontalScrollbarSize: scrollbar.horizontalScrollbarSize,
                scrollByPage: scrollbar.scrollByPage,
                handleMouseWheel: scrollbar.handleMouseWheel,
                mouseWheelScrollSensitivity: mouseWheelScrollSensitivity,
                fastScrollSensitivity: fastScrollSensitivity,
                scrollPredominantAxis: scrollPredominantAxis
            };
            this.scrollbar.updateOptions(newOpts);
        }
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            this._setLayout();
        }
        return true;
    }
    onScrollChanged(e) {
        return true;
    }
    onThemeChanged(e) {
        this.scrollbar.updateClassName('editor-scrollable' + ' ' + getThemeTypeSelector(this._context.theme.type));
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        // Nothing to do
    }
    render(ctx) {
        this.scrollbar.renderNow();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2Nyb2xsYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9lZGl0b3JTY3JvbGxiYXIvZWRpdG9yU2Nyb2xsYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekYsT0FBTyxFQUE0Qix1QkFBdUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRS9ILE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFLckYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFJekY7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGVBQWdCLFNBQVEsUUFBUTtJQUs1QyxZQUNDLE9BQW9CLEVBQ3BCLFlBQXNDLEVBQ3RDLFdBQXFDLEVBQ3JDLG9CQUE4QztRQUU5QyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFHZixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDcEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXdCLENBQUM7UUFDdEQsTUFBTSwyQkFBMkIsR0FBRyxPQUFPLENBQUMsR0FBRyxtREFBMEMsQ0FBQztRQUMxRixNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxHQUFHLDZDQUFvQyxDQUFDO1FBQzlFLE1BQU0scUJBQXFCLEdBQUcsT0FBTyxDQUFDLEdBQUcsOENBQW9DLENBQUM7UUFFOUUsTUFBTSxnQkFBZ0IsR0FBcUM7WUFDMUQsZUFBZSxFQUFFLFdBQVcsQ0FB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