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
var MarkerNavigationWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { ScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Color } from '../../../../base/common/color.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/resources.js';
import { splitLines } from '../../../../base/common/strings.js';
import './media/gotoErrorWidget.css';
import { Range } from '../../../common/core/range.js';
import { peekViewTitleForeground, peekViewTitleInfoForeground, PeekViewWidget } from '../../peekView/browser/peekView.js';
import * as nls from '../../../../nls.js';
import { getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { contrastBorder, editorBackground, editorErrorBorder, editorErrorForeground, editorInfoBorder, editorInfoForeground, editorWarningBorder, editorWarningForeground, oneOf, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
class MessageWidget {
    constructor(parent, editor, onRelatedInformation, _openerService, _labelService) {
        this._openerService = _openerService;
        this._labelService = _labelService;
        this._lines = 0;
        this._longestLineLength = 0;
        this._relatedDiagnostics = new WeakMap();
        this._disposables = new DisposableStore();
        this._editor = editor;
        const domNode = document.createElement('div');
        domNode.className = 'descriptioncontainer';
        this._messageBlock = document.createElement('div');
        this._messageBlock.classList.add('message');
        this._messageBlock.setAttribute('aria-live', 'assertive');
        this._messageBlock.setAttribute('role', 'alert');
        domNode.appendChild(this._messageBlock);
        this._relatedBlock = document.createElement('div');
        domNode.appendChild(this._relatedBlock);
        this._disposables.add(dom.addStandardDisposableListener(this._relatedBlock, 'click', event => {
            event.preventDefault();
            const related = this._relatedDiagnostics.get(event.target);
            if (related) {
                onRelatedInformation(related);
            }
        }));
        this._scrollable = new ScrollableElement(domNode, {
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            vertical: 1 /* ScrollbarVisibility.Auto */,
            useShadows: false,
            horizontalScrollbarSize: 6,
            verticalScrollbarSize: 6
        });
        parent.appendChild(this._scrollable.getDomNode());
        this._disposables.add(this._scrollable.onScroll(e => {
            domNode.style.left = `-${e.scrollLeft}px`;
            domNode.style.top = `-${e.scrollTop}px`;
        }));
        this._disposables.add(this._scrollable);
    }
    dispose() {
        dispose(this._disposables);
    }
    update(marker) {
        const { source, message, relatedInformation, code } = marker;
        let sourceAndCodeLength = (source?.length || 0) + '()'.length;
        if (code) {
            if (typeof code === 'string') {
                sourceAndCodeLength += code.length;
            }
            else {
                sourceAndCodeLength += code.value.length;
            }
        }
        const lines = splitLines(message);
        this._lines = lines.length;
        this._longestLineLength = 0;
        for (const line of lines) {
            this._longestLineLength = Math.max(line.length + sourceAndCodeLength, this._longestLineLength);
        }
        dom.clearNode(this._messageBlock);
        this._messageBlock.setAttribute('aria-label', this.getAriaLabel(marker));
        this._editor.applyFontInfo(this._messageBlock);
        let lastLineElement = this._messageBlock;
        for (const line of lines) {
            lastLineElement = document.createElement('div');
            lastLineElement.innerText = line;
            if (line === '') {
                lastLineElement.style.height = this._messageBlock.style.lineHeight;
            }
            this._messageBlock.appendChild(lastLineElement);
        }
        if (source || code) {
            const detailsElement = document.createElement('span');
            detailsElement.classList.add('details');
            lastLineElement.appendChild(detailsElement);
            if (source) {
                const sourceElement = document.createElement('span');
                sourceElement.innerText = source;
                sourceElement.classList.add('source');
                detailsElement.appendChild(sourceElement);
            }
            if (code) {
                if (typeof code === 'string') {
                    const codeElement = document.createElement('span');
                    codeElement.innerText = `(${code})`;
                    codeElement.classList.add('code');
                    detailsElement.appendChild(codeElement);
                }
                else {
                    this._codeLink = dom.$('a.code-link');
                    this._codeLink.setAttribute('href', `${code.target.toString()}`);
                    this._codeLink.onclick = (e) => {
                        this._openerService.open(code.target, { allowCommands: true });
                        e.preventDefault();
                        e.stopPropagation();
                    };
                    const codeElement = dom.append(this._codeLink, dom.$('span'));
                    codeElement.innerText = code.value;
                    detailsElement.appendChild(this._codeLink);
                }
            }
        }
        dom.clearNode(this._relatedBlock);
        this._editor.applyFontInfo(this._relatedBlock);
        if (isNonEmptyArray(relatedInformation)) {
            const relatedInformationNode = this._relatedBlock.appendChild(document.createElement('div'));
            relatedInformationNode.style.paddingTop = `${Math.floor(this._editor.getOption(68 /* EditorOption.lineHeight */) * 0.66)}px`;
            this._lines += 1;
            for (const related of relatedInformation) {
                const container = document.createElement('div');
                const relatedResource = document.createElement('a');
                relatedResource.classList.add('filename');
                relatedResource.innerText = `${this._labelService.getUriBasenameLabel(related.resource)}(${related.startLineNumber}, ${related.startColumn}): `;
                relatedResource.title = this._labelService.getUriLabel(related.resource);
                this._relatedDiagnostics.set(relatedResource, related);
                const relatedMessage = document.createElement('span');
                relatedMessage.innerText = related.message;
                container.appendChild(relatedResource);
                container.appendChild(relatedMessage);
                this._lines += 1;
                relatedInformationNode.appendChild(container);
            }
        }
        const fontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        const scrollWidth = Math.ceil(fontInfo.typicalFullwidthCharacterWidth * this._longestLineLength * 0.75);
        const scrollHeight = fontInfo.lineHeight * this._lines;
        this._scrollable.setScrollDimensions({ scrollWidth, scrollHeight });
    }
    layout(height, width) {
        this._scrollable.getDomNode().style.height = `${height}px`;
        this._scrollable.getDomNode().style.width = `${width}px`;
        this._scrollable.setScrollDimensions({ width, height });
    }
    getHeightInLines() {
        return Math.min(17, this._lines);
    }
    getAriaLabel(marker) {
        let severityLabel = '';
        switch (marker.severity) {
            case MarkerSeverity.Error:
                severityLabel = nls.localize('Error', "Error");
                break;
            case MarkerSeverity.Warning:
                severityLabel = nls.localize('Warning', "Warning");
                break;
            case MarkerSeverity.Info:
                severityLabel = nls.localize('Info', "Info");
                break;
            case MarkerSeverity.Hint:
                severityLabel = nls.localize('Hint', "Hint");
                break;
        }
        let ariaLabel = nls.localize('marker aria', "{0} at {1}. ", severityLabel, marker.startLineNumber + ':' + marker.startColumn);
        const model = this._editor.getModel();
        if (model && (marker.startLineNumber <= model.getLineCount()) && (marker.startLineNumber >= 1)) {
            const lineContent = model.getLineContent(marker.startLineNumber);
            ariaLabel = `${lineContent}, ${ariaLabel}`;
        }
        return ariaLabel;
    }
}
let MarkerNavigationWidget = class MarkerNavigationWidget extends PeekViewWidget {
    static { MarkerNavigationWidget_1 = this; }
    static { this.TitleMenu = new MenuId('gotoErrorTitleMenu'); }
    constructor(editor, _themeService, _openerService, _menuService, instantiationService, _contextKeyService, _labelService) {
        super(editor, { showArrow: true, showFrame: true, isAccessible: true, frameWidth: 1 }, instantiationService);
        this._themeService = _themeService;
        this._openerService = _openerService;
        this._menuService = _menuService;
        this._contextKeyService = _contextKeyService;
        this._labelService = _labelService;
        this._callOnDispose = new DisposableStore();
        this._onDidSelectRelatedInformation = new Emitter();
        this.onDidSelectRelatedInformation = this._onDidSelectRelatedInformation.event;
        this._severity = MarkerSeverity.Warning;
        this._backgroundColor = Color.white;
        this._applyTheme(_themeService.getColorTheme());
        this._callOnDispose.add(_themeService.onDidColorThemeChange(this._applyTheme.bind(this)));
        this.create();
    }
    _applyTheme(theme) {
        this._backgroundColor = theme.getColor(editorMarkerNavigationBackground);
        let colorId = editorMarkerNavigationError;
        let headerBackground = editorMarkerNavigationErrorHeader;
        if (this._severity === MarkerSeverity.Warning) {
            colorId = editorMarkerNavigationWarning;
            headerBackground = editorMarkerNavigationWarningHeader;
        }
        else if (this._severity === MarkerSeverity.Info) {
            colorId = editorMarkerNavigationInfo;
            headerBackground = editorMarkerNavigationInfoHeader;
        }
        const frameColor = theme.getColor(colorId);
        const headerBg = theme.getColor(headerBackground);
        this.style({
            arrowColor: frameColor,
            frameColor: frameColor,
            headerBackgroundColor: headerBg,
            primaryHeadingColor: theme.getColor(peekViewTitleForeground),
            secondaryHeadingColor: theme.getColor(peekViewTitleInfoForeground)
        }); // style() will trigger _applyStyles
    }
    _applyStyles() {
        if (this._parentContainer) {
            this._parentContainer.style.backgroundColor = this._backgroundColor ? this._backgroundColor.toString() : '';
        }
        super._applyStyles();
    }
    dispose() {
        this._callOnDispose.dispose();
        super.dispose();
    }
    focus() {
        this._parentContainer.focus();
    }
    _fillHead(container) {
        super._fillHead(container);
        this._disposables.add(this._actionbarWidget.actionRunner.onWillRun(e => this.editor.focus()));
        const menu = this._menuService.getMenuActions(MarkerNavigationWidget_1.TitleMenu, this._contextKeyService);
        const actions = getFlatActionBarActions(menu);
        this._actionbarWidget.push(actions, { label: false, icon: true, index: 0 });
    }
    _fillTitleIcon(container) {
        this._icon = dom.append(container, dom.$(''));
    }
    _fillBody(container) {
        this._parentContainer = container;
        container.classList.add('marker-widget');
        this._parentContainer.tabIndex = 0;
        this._parentContainer.setAttribute('role', 'tooltip');
        this._container = document.createElement('div');
        container.appendChild(this._container);
        this._message = new MessageWidget(this._container, this.editor, related => this._onDidSelectRelatedInformation.fire(related), this._openerService, this._labelService);
        this._disposables.add(this._message);
    }
    show() {
        throw new Error('call showAtMarker');
    }
    showAtMarker(marker, markerIdx, markerCount) {
        // update:
        // * title
        // * message
        this._container.classList.remove('stale');
        this._message.update(marker);
        // update frame color (only applied on 'show')
        this._severity = marker.severity;
        this._applyTheme(this._themeService.getColorTheme());
        // show
        const range = Range.lift(marker);
        const editorPosition = this.editor.getPosition();
        const position = editorPosition && range.containsPosition(editorPosition) ? editorPosition : range.getStartPosition();
        super.show(position, this.computeRequiredHeight());
        const model = this.editor.getModel();
        if (model) {
            const detail = markerCount > 1
                ? nls.localize('problems', "{0} of {1} problems", markerIdx, markerCount)
                : nls.localize('change', "{0} of {1} problem", markerIdx, markerCount);
            this.setTitle(basename(model.uri), detail);
        }
        this._icon.className = `codicon ${SeverityIcon.className(MarkerSeverity.toSeverity(this._severity))}`;
        this.editor.revealPositionNearTop(position, 0 /* ScrollType.Smooth */);
        this.editor.focus();
    }
    updateMarker(marker) {
        this._container.classList.remove('stale');
        this._message.update(marker);
    }
    showStale() {
        this._container.classList.add('stale');
        this._relayout();
    }
    _doLayoutBody(heightInPixel, widthInPixel) {
        super._doLayoutBody(heightInPixel, widthInPixel);
        this._heightInPixel = heightInPixel;
        this._message.layout(heightInPixel, widthInPixel);
        this._container.style.height = `${heightInPixel}px`;
    }
    _onWidth(widthInPixel) {
        this._message.layout(this._heightInPixel, widthInPixel);
    }
    _relayout() {
        super._relayout(this.computeRequiredHeight());
    }
    computeRequiredHeight() {
        return 3 + this._message.getHeightInLines();
    }
};
MarkerNavigationWidget = MarkerNavigationWidget_1 = __decorate([
    __param(1, IThemeService),
    __param(2, IOpenerService),
    __param(3, IMenuService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService),
    __param(6, ILabelService)
], MarkerNavigationWidget);
export { MarkerNavigationWidget };
// theming
const errorDefault = oneOf(editorErrorForeground, editorErrorBorder);
const warningDefault = oneOf(editorWarningForeground, editorWarningBorder);
const infoDefault = oneOf(editorInfoForeground, editorInfoBorder);
const editorMarkerNavigationError = registerColor('editorMarkerNavigationError.background', { dark: errorDefault, light: errorDefault, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('editorMarkerNavigationError', 'Editor marker navigation widget error color.'));
const editorMarkerNavigationErrorHeader = registerColor('editorMarkerNavigationError.headerBackground', { dark: transparent(editorMarkerNavigationError, .1), light: transparent(editorMarkerNavigationError, .1), hcDark: null, hcLight: null }, nls.localize('editorMarkerNavigationErrorHeaderBackground', 'Editor marker navigation widget error heading background.'));
const editorMarkerNavigationWarning = registerColor('editorMarkerNavigationWarning.background', { dark: warningDefault, light: warningDefault, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('editorMarkerNavigationWarning', 'Editor marker navigation widget warning color.'));
const editorMarkerNavigationWarningHeader = registerColor('editorMarkerNavigationWarning.headerBackground', { dark: transparent(editorMarkerNavigationWarning, .1), light: transparent(editorMarkerNavigationWarning, .1), hcDark: '#0C141F', hcLight: transparent(editorMarkerNavigationWarning, .2) }, nls.localize('editorMarkerNavigationWarningBackground', 'Editor marker navigation widget warning heading background.'));
const editorMarkerNavigationInfo = registerColor('editorMarkerNavigationInfo.background', { dark: infoDefault, light: infoDefault, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('editorMarkerNavigationInfo', 'Editor marker navigation widget info color.'));
const editorMarkerNavigationInfoHeader = registerColor('editorMarkerNavigationInfo.headerBackground', { dark: transparent(editorMarkerNavigationInfo, .1), light: transparent(editorMarkerNavigationInfo, .1), hcDark: null, hcLight: null }, nls.localize('editorMarkerNavigationInfoHeaderBackground', 'Editor marker navigation widget info heading background.'));
const editorMarkerNavigationBackground = registerColor('editorMarkerNavigation.background', editorBackground, nls.localize('editorMarkerNavigationBackground', 'Editor marker navigation widget background.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0Vycm9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9FcnJvci9icm93c2VyL2dvdG9FcnJvcldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyw2QkFBNkIsQ0FBQztBQUdyQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLDJCQUEyQixFQUFFLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDMUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FB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