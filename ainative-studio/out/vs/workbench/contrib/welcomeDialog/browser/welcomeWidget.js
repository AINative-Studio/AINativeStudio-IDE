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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZVdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lRGlhbG9nL2Jyb3dzZXIvd2VsY29tZVdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFFbEgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxNQUFNLEVBQXVFLE1BQU0sb0NBQW9DLENBQUM7QUFDakksT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBYyxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDbkUsT0FBTyxFQUFFLG9C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