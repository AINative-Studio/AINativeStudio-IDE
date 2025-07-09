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
import './media/exceptionWidget.css';
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import { EDITOR_CONTRIBUTION_ID } from '../common/debug.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { LinkDetector } from './linkDetector.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../base/common/actions.js';
import { widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
const $ = dom.$;
// theming
const debugExceptionWidgetBorder = registerColor('debugExceptionWidget.border', '#a31515', nls.localize('debugExceptionWidgetBorder', 'Exception widget border color.'));
const debugExceptionWidgetBackground = registerColor('debugExceptionWidget.background', { dark: '#420b0d', light: '#f1dfde', hcDark: '#420b0d', hcLight: '#f1dfde' }, nls.localize('debugExceptionWidgetBackground', 'Exception widget background color.'));
let ExceptionWidget = class ExceptionWidget extends ZoneWidget {
    constructor(editor, exceptionInfo, debugSession, themeService, instantiationService) {
        super(editor, { showFrame: true, showArrow: true, isAccessible: true, frameWidth: 1, className: 'exception-widget-container' });
        this.exceptionInfo = exceptionInfo;
        this.debugSession = debugSession;
        this.instantiationService = instantiationService;
        this.applyTheme(themeService.getColorTheme());
        this._disposables.add(themeService.onDidColorThemeChange(this.applyTheme.bind(this)));
        this.create();
        const onDidLayoutChangeScheduler = new RunOnceScheduler(() => this._doLayout(undefined, undefined), 50);
        this._disposables.add(this.editor.onDidLayoutChange(() => onDidLayoutChangeScheduler.schedule()));
        this._disposables.add(onDidLayoutChangeScheduler);
    }
    applyTheme(theme) {
        this.backgroundColor = theme.getColor(debugExceptionWidgetBackground);
        const frameColor = theme.getColor(debugExceptionWidgetBorder);
        this.style({
            arrowColor: frameColor,
            frameColor: frameColor
        }); // style() will trigger _applyStyles
    }
    _applyStyles() {
        if (this.container) {
            this.container.style.backgroundColor = this.backgroundColor ? this.backgroundColor.toString() : '';
        }
        super._applyStyles();
    }
    _fillContainer(container) {
        this.setCssClass('exception-widget');
        // Set the font size and line height to the one from the editor configuration.
        const fontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
        container.style.fontSize = `${fontInfo.fontSize}px`;
        container.style.lineHeight = `${fontInfo.lineHeight}px`;
        container.tabIndex = 0;
        const title = $('.title');
        const label = $('.label');
        dom.append(title, label);
        const actions = $('.actions');
        dom.append(title, actions);
        label.textContent = this.exceptionInfo.id ? nls.localize('exceptionThrownWithId', 'Exception has occurred: {0}', this.exceptionInfo.id) : nls.localize('exceptionThrown', 'Exception has occurred.');
        let ariaLabel = label.textContent;
        const actionBar = new ActionBar(actions);
        actionBar.push(new Action('editor.closeExceptionWidget', nls.localize('close', "Close"), ThemeIcon.asClassName(widgetClose), true, async () => {
            const contribution = this.editor.getContribution(EDITOR_CONTRIBUTION_ID);
            contribution?.closeExceptionWidget();
        }), { label: false, icon: true });
        dom.append(container, title);
        if (this.exceptionInfo.description) {
            const description = $('.description');
            description.textContent = this.exceptionInfo.description;
            ariaLabel += ', ' + this.exceptionInfo.description;
            dom.append(container, description);
        }
        if (this.exceptionInfo.details && this.exceptionInfo.details.stackTrace) {
            const stackTrace = $('.stack-trace');
            const linkDetector = this.instantiationService.createInstance(LinkDetector);
            const linkedStackTrace = linkDetector.linkify(this.exceptionInfo.details.stackTrace, true, this.debugSession ? this.debugSession.root : undefined, undefined, { type: 0 /* DebugLinkHoverBehavior.Rich */, store: this._disposables });
            stackTrace.appendChild(linkedStackTrace);
            dom.append(container, stackTrace);
            ariaLabel += ', ' + this.exceptionInfo.details.stackTrace;
        }
        container.setAttribute('aria-label', ariaLabel);
    }
    _doLayout(_heightInPixel, _widthInPixel) {
        // Reload the height with respect to the exception text content and relayout it to match the line count.
        this.container.style.height = 'initial';
        const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
        const arrowHeight = Math.round(lineHeight / 3);
        const computedLinesNumber = Math.ceil((this.container.offsetHeight + arrowHeight) / lineHeight);
        this._relayout(computedLinesNumber);
    }
    focus() {
        // Focus into the container for accessibility purposes so the exception and stack trace gets read
        this.container?.focus();
    }
    hasFocus() {
        if (!this.container) {
            return false;
        }
        return dom.isAncestorOfActiveElement(this.container);
    }
};
ExceptionWidget = __decorate([
    __param(3, IThemeService),
    __param(4, IInstantiationService)
], ExceptionWidget);
export { ExceptionWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhjZXB0aW9uV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZXhjZXB0aW9uV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sNkJBQTZCLENBQUM7QUFDckMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUV6RixPQUFPLEVBQTJELHNCQUFzQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDckgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUEwQixZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUV6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNoRixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRWhCLFVBQVU7QUFFVixNQUFNLDBCQUEwQixHQUFHLGFBQWEsQ0FBQyw2QkFBNkIsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUM7QUFDekssTUFBTSw4QkFBOEIsR0FBRyxhQUFhLENBQUMsaUNBQWlDLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7QUFFclAsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxVQUFVO0lBSTlDLFlBQ0MsTUFBbUIsRUFDWCxhQUE2QixFQUM3QixZQUF1QyxFQUNoQyxZQUEyQixFQUNGLG9CQUEyQztRQUVuRixLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDO1FBTHhILGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM3QixpQkFBWSxHQUFaLFlBQVksQ0FBMkI7UUFFUCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBSW5GLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDZCxNQUFNLDBCQUEwQixHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRU8sVUFBVSxDQUFDLEtBQWtCO1FBQ3BDLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ1YsVUFBVSxFQUFFLFVBQVU7WUFDdEIsVUFBVSxFQUFFLFVBQVU7U0FDdEIsQ0FBQyxDQUFDLENBQUMsb0NBQW9DO0lBQ3pDLENBQUM7SUFFa0IsWUFBWTtRQUM5QixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3BHLENBQUM7UUFDRCxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVTLGNBQWMsQ0FBQyxTQUFzQjtRQUM5QyxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDckMsOEVBQThFO1FBQzlFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxnQ0FBdUIsQ0FBQztRQUM5RCxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQztRQUNwRCxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLFFBQVEsQ0FBQyxVQUFVLElBQUksQ0FBQztRQUN4RCxTQUFTLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUN2QixNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMzQixLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLDZCQUE2QixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUNyTSxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDO1FBRWxDLE1BQU0sU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0ksTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQTJCLHNCQUFzQixDQUFDLENBQUM7WUFDbkcsWUFBWSxFQUFFLG9CQUFvQixFQUFFLENBQUM7UUFDdEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRWxDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTdCLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwQyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDdEMsV0FBVyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQztZQUN6RCxTQUFTLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDO1lBQ25ELEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3pFLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNyQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzVFLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsSUFBSSxxQ0FBNkIsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDL04sVUFBVSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3pDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2xDLFNBQVMsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1FBQzNELENBQUM7UUFDRCxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRWtCLFNBQVMsQ0FBQyxjQUFrQyxFQUFFLGFBQWlDO1FBQ2pHLHdHQUF3RztRQUN4RyxJQUFJLENBQUMsU0FBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1FBRXpDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxrQ0FBeUIsQ0FBQztRQUNsRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBVSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUVqRyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELEtBQUs7UUFDSixpR0FBaUc7UUFDakcsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRVEsUUFBUTtRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0QsQ0FBQTtBQXRHWSxlQUFlO0lBUXpCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtHQVRYLGVBQWUsQ0FzRzNCIn0=