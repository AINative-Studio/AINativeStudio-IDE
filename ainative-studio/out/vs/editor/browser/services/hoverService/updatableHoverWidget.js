/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isHTMLElement } from '../../../../base/browser/dom.js';
import { isManagedHoverTooltipMarkdownString } from '../../../../base/browser/ui/hover/hover.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { isFunction, isString } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
export class ManagedHoverWidget {
    constructor(hoverDelegate, target, fadeInAnimation) {
        this.hoverDelegate = hoverDelegate;
        this.target = target;
        this.fadeInAnimation = fadeInAnimation;
    }
    async update(content, focus, options) {
        if (this._cancellationTokenSource) {
            // there's an computation ongoing, cancel it
            this._cancellationTokenSource.dispose(true);
            this._cancellationTokenSource = undefined;
        }
        if (this.isDisposed) {
            return;
        }
        let resolvedContent;
        if (isString(content) || isHTMLElement(content) || content === undefined) {
            resolvedContent = content;
        }
        else {
            // compute the content, potentially long-running
            this._cancellationTokenSource = new CancellationTokenSource();
            const token = this._cancellationTokenSource.token;
            let managedContent;
            if (isManagedHoverTooltipMarkdownString(content)) {
                if (isFunction(content.markdown)) {
                    managedContent = content.markdown(token).then(resolvedContent => resolvedContent ?? content.markdownNotSupportedFallback);
                }
                else {
                    managedContent = content.markdown ?? content.markdownNotSupportedFallback;
                }
            }
            else {
                managedContent = content.element(token);
            }
            // compute the content
            if (managedContent instanceof Promise) {
                // show 'Loading' if no hover is up yet
                if (!this._hoverWidget) {
                    this.show(localize('iconLabel.loading', "Loading..."), focus, options);
                }
                resolvedContent = await managedContent;
            }
            else {
                resolvedContent = managedContent;
            }
            if (this.isDisposed || token.isCancellationRequested) {
                // either the widget has been closed in the meantime
                // or there has been a new call to `update`
                return;
            }
        }
        this.show(resolvedContent, focus, options);
    }
    show(content, focus, options) {
        const oldHoverWidget = this._hoverWidget;
        if (this.hasContent(content)) {
            const hoverOptions = {
                content,
                target: this.target,
                actions: options?.actions,
                linkHandler: options?.linkHandler,
                trapFocus: options?.trapFocus,
                appearance: {
                    showPointer: this.hoverDelegate.placement === 'element',
                    skipFadeInAnimation: !this.fadeInAnimation || !!oldHoverWidget, // do not fade in if the hover is already showing
                    showHoverHint: options?.appearance?.showHoverHint,
                },
                position: {
                    hoverPosition: 2 /* HoverPosition.BELOW */,
                },
            };
            this._hoverWidget = this.hoverDelegate.showHover(hoverOptions, focus);
        }
        oldHoverWidget?.dispose();
    }
    hasContent(content) {
        if (!content) {
            return false;
        }
        if (isMarkdownString(content)) {
            return !!content.value;
        }
        return true;
    }
    get isDisposed() {
        return this._hoverWidget?.isDisposed;
    }
    dispose() {
        this._hoverWidget?.dispose();
        this._cancellationTokenSource?.dispose(true);
        this._cancellationTokenSource = undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRhYmxlSG92ZXJXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvc2VydmljZXMvaG92ZXJTZXJ2aWNlL3VwZGF0YWJsZUhvdmVyV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsbUNBQW1DLEVBQTJFLE1BQU0sNENBQTRDLENBQUM7QUFHMUssT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLHdDQUF3QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBSTlDLE1BQU0sT0FBTyxrQkFBa0I7SUFLOUIsWUFBb0IsYUFBNkIsRUFBVSxNQUEwQyxFQUFVLGVBQXdCO1FBQW5ILGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUFVLFdBQU0sR0FBTixNQUFNLENBQW9DO1FBQVUsb0JBQWUsR0FBZixlQUFlLENBQVM7SUFBSSxDQUFDO0lBRTVJLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBNkIsRUFBRSxLQUFlLEVBQUUsT0FBOEI7UUFDMUYsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNuQyw0Q0FBNEM7WUFDNUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsU0FBUyxDQUFDO1FBQzNDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxVQUFV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