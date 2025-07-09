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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Color } from '../../../../base/common/color.js';
import { Emitter } from '../../../../base/common/event.js';
import * as objects from '../../../../base/common/objects.js';
import './media/peekViewWidget.css';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { EmbeddedCodeEditorWidget } from '../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { ZoneWidget } from '../../zoneWidget/browser/zoneWidget.js';
import * as nls from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { activeContrastBorder, contrastBorder, editorForeground, editorInfoForeground, registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { observableCodeEditor } from '../../../browser/observableCodeEditor.js';
export const IPeekViewService = createDecorator('IPeekViewService');
registerSingleton(IPeekViewService, class {
    constructor() {
        this._widgets = new Map();
    }
    addExclusiveWidget(editor, widget) {
        const existing = this._widgets.get(editor);
        if (existing) {
            existing.listener.dispose();
            existing.widget.dispose();
        }
        const remove = () => {
            const data = this._widgets.get(editor);
            if (data && data.widget === widget) {
                data.listener.dispose();
                this._widgets.delete(editor);
            }
        };
        this._widgets.set(editor, { widget, listener: widget.onDidClose(remove) });
    }
}, 1 /* InstantiationType.Delayed */);
export var PeekContext;
(function (PeekContext) {
    PeekContext.inPeekEditor = new RawContextKey('inReferenceSearchEditor', true, nls.localize('inReferenceSearchEditor', "Whether the current code editor is embedded inside peek"));
    PeekContext.notInPeekEditor = PeekContext.inPeekEditor.toNegated();
})(PeekContext || (PeekContext = {}));
let PeekContextController = class PeekContextController {
    static { this.ID = 'editor.contrib.referenceController'; }
    constructor(editor, contextKeyService) {
        if (editor instanceof EmbeddedCodeEditorWidget) {
            PeekContext.inPeekEditor.bindTo(contextKeyService);
        }
    }
    dispose() { }
};
PeekContextController = __decorate([
    __param(1, IContextKeyService)
], PeekContextController);
registerEditorContribution(PeekContextController.ID, PeekContextController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to define a context key
const defaultOptions = {
    headerBackgroundColor: Color.white,
    primaryHeadingColor: Color.fromHex('#333333'),
    secondaryHeadingColor: Color.fromHex('#6c6c6cb3')
};
let PeekViewWidget = class PeekViewWidget extends ZoneWidget {
    constructor(editor, options, instantiationService) {
        super(editor, options);
        this.instantiationService = instantiationService;
        this._onDidClose = new Emitter();
        this.onDidClose = this._onDidClose.event;
        objects.mixin(this.options, defaultOptions, false);
        const e = observableCodeEditor(this.editor);
        e.openedPeekWidgets.set(e.openedPeekWidgets.get() + 1, undefined);
    }
    dispose() {
        if (!this.disposed) {
            this.disposed = true; // prevent consumers who dispose on onDidClose from looping
            super.dispose();
            this._onDidClose.fire(this);
            const e = observableCodeEditor(this.editor);
            e.openedPeekWidgets.set(e.openedPeekWidgets.get() - 1, undefined);
        }
    }
    style(styles) {
        const options = this.options;
        if (styles.headerBackgroundColor) {
            options.headerBackgroundColor = styles.headerBackgroundColor;
        }
        if (styles.primaryHeadingColor) {
            options.primaryHeadingColor = styles.primaryHeadingColor;
        }
        if (styles.secondaryHeadingColor) {
            options.secondaryHeadingColor = styles.secondaryHeadingColor;
        }
        super.style(styles);
    }
    _applyStyles() {
        super._applyStyles();
        const options = this.options;
        if (this._headElement && options.headerBackgroundColor) {
            this._headElement.style.backgroundColor = options.headerBackgroundColor.toString();
        }
        if (this._primaryHeading && options.primaryHeadingColor) {
            this._primaryHeading.style.color = options.primaryHeadingColor.toString();
        }
        if (this._secondaryHeading && options.secondaryHeadingColor) {
            this._secondaryHeading.style.color = options.secondaryHeadingColor.toString();
        }
        if (this._bodyElement && options.frameColor) {
            this._bodyElement.style.borderColor = options.frameColor.toString();
        }
    }
    _fillContainer(container) {
        this.setCssClass('peekview-widget');
        this._headElement = dom.$('.head');
        this._bodyElement = dom.$('.body');
        this._fillHead(this._headElement);
        this._fillBody(this._bodyElement);
        container.appendChild(this._headElement);
        container.appendChild(this._bodyElement);
    }
    _fillHead(container, noCloseAction) {
        this._titleElement = dom.$('.peekview-title');
        if (this.options.supportOnTitleClick) {
            this._titleElement.classList.add('clickable');
            dom.addStandardDisposableListener(this._titleElement, 'click', event => this._onTitleClick(event));
        }
        dom.append(this._headElement, this._titleElement);
        this._fillTitleIcon(this._titleElement);
        this._primaryHeading = dom.$('span.filename');
        this._secondaryHeading = dom.$('span.dirname');
        this._metaHeading = dom.$('span.meta');
        dom.append(this._titleElement, this._primaryHeading, this._secondaryHeading, this._metaHeading);
        const actionsContainer = dom.$('.peekview-actions');
        dom.append(this._headElement, actionsContainer);
        const actionBarOptions = this._getActionBarOptions();
        this._actionbarWidget = new ActionBar(actionsContainer, actionBarOptions);
        this._disposables.add(this._actionbarWidget);
        if (!noCloseAction) {
            this._actionbarWidget.push(this._disposables.add(new Action('peekview.close', nls.localize('label.close', "Close"), ThemeIcon.asClassName(Codicon.close), true, () => {
                this.dispose();
                return Promise.resolve();
            })), { label: false, icon: true });
        }
    }
    _fillTitleIcon(container) {
    }
    _getActionBarOptions() {
        return {
            actionViewItemProvider: createActionViewItem.bind(undefined, this.instantiationService),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */
        };
    }
    _onTitleClick(event) {
        // implement me if supportOnTitleClick option is set
    }
    setTitle(primaryHeading, secondaryHeading) {
        if (this._primaryHeading && this._secondaryHeading) {
            this._primaryHeading.innerText = primaryHeading;
            this._primaryHeading.setAttribute('title', primaryHeading);
            if (secondaryHeading) {
                this._secondaryHeading.innerText = secondaryHeading;
            }
            else {
                dom.clearNode(this._secondaryHeading);
            }
        }
    }
    setMetaTitle(value) {
        if (this._metaHeading) {
            if (value) {
                this._metaHeading.innerText = value;
                dom.show(this._metaHeading);
            }
            else {
                dom.hide(this._metaHeading);
            }
        }
    }
    _doLayout(heightInPixel, widthInPixel) {
        if (!this._isShowing && heightInPixel < 0) {
            // Looks like the view zone got folded away!
            this.dispose();
            return;
        }
        const headHeight = Math.ceil(this.editor.getOption(68 /* EditorOption.lineHeight */) * 1.2);
        const bodyHeight = Math.round(heightInPixel - (headHeight + 2 /* the border-top/bottom width*/));
        this._doLayoutHead(headHeight, widthInPixel);
        this._doLayoutBody(bodyHeight, widthInPixel);
    }
    _doLayoutHead(heightInPixel, widthInPixel) {
        if (this._headElement) {
            this._headElement.style.height = `${heightInPixel}px`;
            this._headElement.style.lineHeight = this._headElement.style.height;
        }
    }
    _doLayoutBody(heightInPixel, widthInPixel) {
        if (this._bodyElement) {
            this._bodyElement.style.height = `${heightInPixel}px`;
        }
    }
};
PeekViewWidget = __decorate([
    __param(2, IInstantiationService)
], PeekViewWidget);
export { PeekViewWidget };
export const peekViewTitleBackground = registerColor('peekViewTitle.background', { dark: '#252526', light: '#F3F3F3', hcDark: Color.black, hcLight: Color.white }, nls.localize('peekViewTitleBackground', 'Background color of the peek view title area.'));
export const peekViewTitleForeground = registerColor('peekViewTitleLabel.foreground', { dark: Color.white, light: Color.black, hcDark: Color.white, hcLight: editorForeground }, nls.localize('peekViewTitleForeground', 'Color of the peek view title.'));
export const peekViewTitleInfoForeground = registerColor('peekViewTitleDescription.foreground', { dark: '#ccccccb3', light: '#616161', hcDark: '#FFFFFF99', hcLight: '#292929' }, nls.localize('peekViewTitleInfoForeground', 'Color of the peek view title info.'));
export const peekViewBorder = registerColor('peekView.border', { dark: editorInfoForeground, light: editorInfoForeground, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize('peekViewBorder', 'Color of the peek view borders and arrow.'));
export const peekViewResultsBackground = registerColor('peekViewResult.background', { dark: '#252526', light: '#F3F3F3', hcDark: Color.black, hcLight: Color.white }, nls.localize('peekViewResultsBackground', 'Background color of the peek view result list.'));
export const peekViewResultsMatchForeground = registerColor('peekViewResult.lineForeground', { dark: '#bbbbbb', light: '#646465', hcDark: Color.white, hcLight: editorForeground }, nls.localize('peekViewResultsMatchForeground', 'Foreground color for line nodes in the peek view result list.'));
export const peekViewResultsFileForeground = registerColor('peekViewResult.fileForeground', { dark: Color.white, light: '#1E1E1E', hcDark: Color.white, hcLight: editorForeground }, nls.localize('peekViewResultsFileForeground', 'Foreground color for file nodes in the peek view result list.'));
export const peekViewResultsSelectionBackground = registerColor('peekViewResult.selectionBackground', { dark: '#3399ff33', light: '#3399ff33', hcDark: null, hcLight: null }, nls.localize('peekViewResultsSelectionBackground', 'Background color of the selected entry in the peek view result list.'));
export const peekViewResultsSelectionForeground = registerColor('peekViewResult.selectionForeground', { dark: Color.white, light: '#6C6C6C', hcDark: Color.white, hcLight: editorForeground }, nls.localize('peekViewResultsSelectionForeground', 'Foreground color of the selected entry in the peek view result list.'));
export const peekViewEditorBackground = registerColor('peekViewEditor.background', { dark: '#001F33', light: '#F2F8FC', hcDark: Color.black, hcLight: Color.white }, nls.localize('peekViewEditorBackground', 'Background color of the peek view editor.'));
export const peekViewEditorGutterBackground = registerColor('peekViewEditorGutter.background', peekViewEditorBackground, nls.localize('peekViewEditorGutterBackground', 'Background color of the gutter in the peek view editor.'));
export const peekViewEditorStickyScrollBackground = registerColor('peekViewEditorStickyScroll.background', peekViewEditorBackground, nls.localize('peekViewEditorStickScrollBackground', 'Background color of sticky scroll in the peek view editor.'));
export const peekViewResultsMatchHighlight = registerColor('peekViewResult.matchHighlightBackground', { dark: '#ea5c004d', light: '#ea5c004d', hcDark: null, hcLight: null }, nls.localize('peekViewResultsMatchHighlight', 'Match highlight color in the peek view result list.'));
export const peekViewEditorMatchHighlight = registerColor('peekViewEditor.matchHighlightBackground', { dark: '#ff8f0099', light: '#f5d802de', hcDark: null, hcLight: null }, nls.localize('peekViewEditorMatchHighlight', 'Match highlight color in the peek view editor.'));
export const peekViewEditorMatchHighlightBorder = registerColor('peekViewEditor.matchHighlightBorder', { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize('peekViewEditorMatchHighlightBorder', 'Match highlight border in the peek view editor.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVla1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcGVla1ZpZXcvYnJvd3Nlci9wZWVrVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELE9BQU8sRUFBRSxTQUFTLEVBQXlDLE1BQU0sb0RBQW9ELENBQUM7QUFDdEgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sNEJBQTRCLENBQUM7QUFFcEMsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRzFHLE9BQU8sRUFBcUIsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdkYsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUN2RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FB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