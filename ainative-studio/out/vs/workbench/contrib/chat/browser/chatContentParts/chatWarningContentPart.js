/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ChatErrorLevel } from '../../common/chatService.js';
const $ = dom.$;
export class ChatWarningContentPart extends Disposable {
    constructor(kind, content, renderer) {
        super();
        this.domNode = $('.chat-notification-widget');
        let icon;
        let iconClass;
        switch (kind) {
            case ChatErrorLevel.Warning:
                icon = Codicon.warning;
                iconClass = '.chat-warning-codicon';
                break;
            case ChatErrorLevel.Error:
                icon = Codicon.error;
                iconClass = '.chat-error-codicon';
                break;
            case ChatErrorLevel.Info:
                icon = Codicon.info;
                iconClass = '.chat-info-codicon';
                break;
        }
        this.domNode.appendChild($(iconClass, undefined, renderIcon(icon)));
        const markdownContent = this._register(renderer.render(content));
        this.domNode.appendChild(markdownContent.element);
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'warning';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdhcm5pbmdDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0V2FybmluZ0NvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTdELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFaEIsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFVBQVU7SUFHckQsWUFDQyxJQUFvQixFQUNwQixPQUF3QixFQUN4QixRQUEwQjtRQUUxQixLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDOUMsSUFBSSxJQUFJLENBQUM7UUFDVCxJQUFJLFNBQVMsQ0FBQztRQUNkLFFBQVEsSUFBSSxFQUFFLENBQUM7WUFDZCxLQUFLLGNBQWMsQ0FBQyxPQUFPO2dCQUMxQixJQUFJLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztnQkFDdkIsU0FBUyxHQUFHLHVCQUF1QixDQUFDO2dCQUNwQyxNQUFNO1lBQ1AsS0FBSyxjQUFjLENBQUMsS0FBSztnQkFDeEIsSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7Z0JBQ3JCLFNBQVMsR0FBRyxxQkFBcUIsQ0FBQztnQkFDbEMsTUFBTTtZQUNQLEtBQUssY0FBYyxDQUFDLElBQUk7Z0JBQ3ZCLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNwQixTQUFTLEdBQUcsb0JBQW9CLENBQUM7Z0JBQ2pDLE1BQU07UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUE2QztRQUMzRCxnREFBZ0Q7UUFDaEQsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQztJQUNqQyxDQUFDO0NBQ0QifQ==