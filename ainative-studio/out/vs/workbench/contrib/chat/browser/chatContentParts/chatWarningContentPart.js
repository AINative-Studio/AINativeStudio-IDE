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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdhcm5pbmdDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRXYXJuaW5nQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUlyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFN0QsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVoQixNQUFNLE9BQU8sc0JBQXVCLFNBQVEsVUFBVTtJQUdyRCxZQUNDLElBQW9CLEVBQ3BCLE9BQXdCLEVBQ3hCLFFBQTBCO1FBRTFCLEtBQUssRUFBRSxDQUFDO1FBRVIsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM5QyxJQUFJLElBQUksQ0FBQztRQUNULElBQUksU0FBUyxDQUFDO1FBQ2QsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLEtBQUssY0FBYyxDQUFDLE9BQU87Z0JBQzFCLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO2dCQUN2QixTQUFTLEdBQUcsdUJBQXVCLENBQUM7Z0JBQ3BDLE1BQU07WUFDUCxLQUFLLGNBQWMsQ0FBQyxLQUFLO2dCQUN4QixJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztnQkFDckIsU0FBUyxHQUFHLHFCQUFxQixDQUFDO2dCQUNsQyxNQUFNO1lBQ1AsS0FBSyxjQUFjLENBQUMsSUFBSTtnQkFDdkIsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ3BCLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQztnQkFDakMsTUFBTTtRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsY0FBYyxDQUFDLEtBQTZDO1FBQzNELGdEQUFnRDtRQUNoRCxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDO0lBQ2pDLENBQUM7Q0FDRCJ9