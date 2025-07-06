/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/welcomeWidget.css';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { $, append, hide } from '../../../../base/browser/dom.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ButtonBar } from '../../../../base/browser/ui/button/button.js';
import { mnemonicButtonLabel } from '../../../../base/common/labels.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Action } from '../../../../base/common/actions.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { localize } from '../../../../nls.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { contrastBorder, editorWidgetBackground, editorWidgetForeground, widgetBorder, widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
export class WelcomeWidget extends Disposable {
    constructor(_editor, instantiationService, commandService, telemetryService, openerService) {
        super();
        this._editor = _editor;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.openerService = openerService;
        this.markdownRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        this._isVisible = false;
        this._rootDomNode = document.createElement('div');
        this._rootDomNode.className = 'welcome-widget';
        this.element = this._rootDomNode.appendChild($('.monaco-dialog-box'));
        this.element.setAttribute('role', 'dialog');
        hide(this._rootDomNode);
        this.messageContainer = this.element.appendChild($('.dialog-message-container'));
    }
    async executeCommand(commandId, ...args) {
        try {
            await this.commandService.executeCommand(commandId, ...args);
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: commandId,
                from: 'welcomeWidget'
            });
        }
        catch (ex) {
        }
    }
    async render(title, message, buttonText, buttonAction) {
        if (!this._editor._getViewModel()) {
            return;
        }
        await this.buildWidgetContent(title, message, buttonText, buttonAction);
        this._editor.addOverlayWidget(this);
        this._show();
        this.telemetryService.publicLog2('workbenchActionExecuted', {
            id: 'welcomeWidgetRendered',
            from: 'welcomeWidget'
        });
    }
    async buildWidgetContent(title, message, buttonText, buttonAction) {
        const actionBar = this._register(new ActionBar(this.element, {}));
        const action = this._register(new Action('dialog.close', localize('dialogClose', "Close Dialog"), ThemeIcon.asClassName(Codicon.dialogClose), true, async () => {
            this._hide();
        }));
        actionBar.push(action, { icon: true, label: false });
        const renderBody = (message, icon) => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true, supportHtml: true });
            mds.appendMarkdown(`<a class="copilot">$(${icon})</a>`);
            mds.appendMarkdown(message);
            return mds;
        };
        const titleElement = this.messageContainer.appendChild($('#monaco-dialog-message-detail.dialog-message-detail-title'));
        const titleElementMdt = this.markdownRenderer.render(renderBody(title, 'zap'));
        titleElement.appendChild(titleElementMdt.element);
        this.buildStepMarkdownDescription(this.messageContainer, message.split('\n').filter(x => x).map(text => parseLinkedText(text)));
        const buttonsRowElement = this.messageContainer.appendChild($('.dialog-buttons-row'));
        const buttonContainer = buttonsRowElement.appendChild($('.dialog-buttons'));
        const buttonBar = this._register(new ButtonBar(buttonContainer));
        const primaryButton = this._register(buttonBar.addButtonWithDescription({ title: true, secondary: false, ...defaultButtonStyles }));
        primaryButton.label = mnemonicButtonLabel(buttonText, true);
        this._register(primaryButton.onDidClick(async () => {
            await this.executeCommand(buttonAction);
        }));
        buttonBar.buttons[0].focus();
    }
    buildStepMarkdownDescription(container, text) {
        for (const linkedText of text) {
            const p = append(container, $('p'));
            for (const node of linkedText.nodes) {
                if (typeof node === 'string') {
                    const labelWithIcon = renderLabelWithIcons(node);
                    for (const element of labelWithIcon) {
                        if (typeof element === 'string') {
                            p.appendChild(renderFormattedText(element, { inline: true, renderCodeSegments: true }));
                        }
                        else {
                            p.appendChild(element);
                        }
                    }
                }
                else {
                    const link = this.instantiationService.createInstance(Link, p, node, {
                        opener: (href) => {
                            this.telemetryService.publicLog2('workbenchActionExecuted', {
                                id: 'welcomeWidetLinkAction',
                                from: 'welcomeWidget'
                            });
                            this.openerService.open(href, { allowCommands: true });
                        }
                    });
                    this._register(link);
                }
            }
        }
        return container;
    }
    getId() {
        return 'editor.contrib.welcomeWidget';
    }
    getDomNode() {
        return this._rootDomNode;
    }
    getPosition() {
        return {
            preference: 0 /* OverlayWidgetPositionPreference.TOP_RIGHT_CORNER */
        };
    }
    _show() {
        if (this._isVisible) {
            return;
        }
        this._isVisible = true;
        this._rootDomNode.style.display = 'block';
    }
    _hide() {
        if (!this._isVisible) {
            return;
        }
        this._isVisible = true;
        this._rootDomNode.style.display = 'none';
        this._editor.removeOverlayWidget(this);
        this.telemetryService.publicLog2('workbenchActionExecuted', {
            id: 'welcomeWidgetDismissed',
            from: 'welcomeWidget'
        });
    }
}
registerThemingParticipant((theme, collector) => {
    const addBackgroundColorRule = (selector, color) => {
        if (color) {
            collector.addRule(`.monaco-editor ${selector} { background-color: ${color}; }`);
        }
    };
    const widgetBackground = theme.getColor(editorWidgetBackground);
    addBackgroundColorRule('.welcome-widget', widgetBackground);
    const widgetShadowColor = theme.getColor(widgetShadow);
    if (widgetShadowColor) {
        collector.addRule(`.welcome-widget { box-shadow: 0 0 8px 2px ${widgetShadowColor}; }`);
    }
    const widgetBorderColor = theme.getColor(widgetBorder);
    if (widgetBorderColor) {
        collector.addRule(`.welcome-widget { border-left: 1px solid ${widgetBorderColor}; border-right: 1px solid ${widgetBorderColor}; border-bottom: 1px solid ${widgetBorderColor}; }`);
    }
    const hcBorder = theme.getColor(contrastBorder);
    if (hcBorder) {
        collector.addRule(`.welcome-widget { border: 1px solid ${hcBorder}; }`);
    }
    const foreground = theme.getColor(editorWidgetForeground);
    if (foreground) {
        collector.addRule(`.welcome-widget { color: ${foreground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZVdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVEaWFsb2cvYnJvd3Nlci93ZWxjb21lV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUVsSCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFMUYsT0FBTyxFQUFFLE1BQU0sRUFBdUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqSSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFjLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUV4RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUUvRixPQUFPLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFFLHNCQUFzQixFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVoSyxNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7SUFPNUMsWUFDa0IsT0FBb0IsRUFDcEIsb0JBQTJDLEVBQzNDLGNBQStCLEVBQy9CLGdCQUFtQyxFQUNuQyxhQUE2QjtRQUU5QyxLQUFLLEVBQUUsQ0FBQztRQU5TLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDL0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNuQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFQOUIscUJBQWdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztRQStIM0YsZUFBVSxHQUFZLEtBQUssQ0FBQztRQXJIbkMsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLGdCQUFnQixDQUFDO1FBRS9DLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFpQixFQUFFLEdBQUcsSUFBYztRQUN4RCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQXNFLHlCQUF5QixFQUFFO2dCQUNoSSxFQUFFLEVBQUUsU0FBUztnQkFDYixJQUFJLEVBQUUsZUFBZTthQUNyQixDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsT0FBTyxFQUFFLEVBQUUsQ0FBQztRQUNaLENBQUM7SUFDRixDQUFDO0lBRU0sS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFhLEVBQUUsT0FBZSxFQUFFLFVBQWtCLEVBQUUsWUFBb0I7UUFDM0YsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQztZQUNuQyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBc0UseUJBQXlCLEVBQUU7WUFDaEksRUFBRSxFQUFFLHVCQUF1QjtZQUMzQixJQUFJLEVBQUUsZUFBZTtTQUNyQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQWEsRUFBRSxPQUFlLEVBQUUsVUFBa0IsRUFBRSxZQUFvQjtRQUV4RyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVsRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksTUFBTSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5SixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRXJELE1BQU0sVUFBVSxHQUFHLENBQUMsT0FBZSxFQUFFLElBQVksRUFBa0IsRUFBRTtZQUNwRSxNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDMUYsR0FBRyxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsSUFBSSxPQUFPLENBQUMsQ0FBQztZQUN4RCxHQUFHLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVCLE9BQU8sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsMkRBQTJELENBQUMsQ0FBQyxDQUFDO1FBQ3ZILE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQy9FLFlBQVksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWxELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhJLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBRTVFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUNqRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BJLGFBQWEsQ0FBQyxLQUFLLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTVELElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNsRCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVPLDRCQUE0QixDQUFDLFNBQXNCLEVBQUUsSUFBa0I7UUFDOUUsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUMvQixNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNyQyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUM5QixNQUFNLGFBQWEsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDakQsS0FBSyxNQUFNLE9BQU8sSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDckMsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQzs0QkFDakMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDekYsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3hCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRTt3QkFDcEUsTUFBTSxFQUFFLENBQUMsSUFBWSxFQUFFLEVBQUU7NEJBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQXNFLHlCQUF5QixFQUFFO2dDQUNoSSxFQUFFLEVBQUUsd0JBQXdCO2dDQUM1QixJQUFJLEVBQUUsZUFBZTs2QkFDckIsQ0FBQyxDQUFDOzRCQUNILElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO3dCQUN4RCxDQUFDO3FCQUNELENBQUMsQ0FBQztvQkFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sOEJBQThCLENBQUM7SUFDdkMsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPO1lBQ04sVUFBVSwwREFBa0Q7U0FDNUQsQ0FBQztJQUNILENBQUM7SUFJTyxLQUFLO1FBQ1osSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzNDLENBQUM7SUFFTyxLQUFLO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFzRSx5QkFBeUIsRUFBRTtZQUNoSSxFQUFFLEVBQUUsd0JBQXdCO1lBQzVCLElBQUksRUFBRSxlQUFlO1NBQ3JCLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQUVELDBCQUEwQixDQUFDLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO0lBQy9DLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEtBQXdCLEVBQVEsRUFBRTtRQUNuRixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsU0FBUyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsUUFBUSx3QkFBd0IsS0FBSyxLQUFLLENBQUMsQ0FBQztRQUNqRixDQUFDO0lBQ0YsQ0FBQyxDQUFDO0lBRUYsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDaEUsc0JBQXNCLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUU1RCxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdkQsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZCLFNBQVMsQ0FBQyxPQUFPLENBQUMsNkNBQTZDLGlCQUFpQixLQUFLLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBRUQsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3ZELElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUN2QixTQUFTLENBQUMsT0FBTyxDQUFDLDRDQUE0QyxpQkFBaUIsNkJBQTZCLGlCQUFpQiw4QkFBOEIsaUJBQWlCLEtBQUssQ0FBQyxDQUFDO0lBQ3BMLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2hELElBQUksUUFBUSxFQUFFLENBQUM7UUFDZCxTQUFTLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxRQUFRLEtBQUssQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDMUQsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixTQUFTLENBQUMsT0FBTyxDQUFDLDRCQUE0QixVQUFVLEtBQUssQ0FBQyxDQUFDO0lBQ2hFLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyJ9