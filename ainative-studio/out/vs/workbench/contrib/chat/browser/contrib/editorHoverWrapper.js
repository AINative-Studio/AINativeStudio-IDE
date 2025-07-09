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
import './media/editorHoverWrapper.css';
import * as dom from '../../../../../base/browser/dom.js';
import { HoverAction } from '../../../../../base/browser/ui/hover/hoverWidget.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
const $ = dom.$;
const h = dom.h;
/**
 * This borrows some of HoverWidget so that a chat editor hover can be rendered in the same way as a workbench hover.
 * Maybe it can be reusable in a generic way.
 */
let ChatEditorHoverWrapper = class ChatEditorHoverWrapper {
    constructor(hoverContentElement, actions, keybindingService) {
        this.keybindingService = keybindingService;
        const hoverElement = h('.chat-editor-hover-wrapper@root', [h('.chat-editor-hover-wrapper-content@content')]);
        this.domNode = hoverElement.root;
        hoverElement.content.appendChild(hoverContentElement);
        if (actions && actions.length > 0) {
            const statusBarElement = $('.hover-row.status-bar');
            const actionsElement = $('.actions');
            actions.forEach(action => {
                const keybinding = this.keybindingService.lookupKeybinding(action.commandId);
                const keybindingLabel = keybinding ? keybinding.getLabel() : null;
                HoverAction.render(actionsElement, {
                    label: action.label,
                    commandId: action.commandId,
                    run: e => {
                        action.run(e);
                    },
                    iconClass: action.iconClass
                }, keybindingLabel);
            });
            statusBarElement.appendChild(actionsElement);
            this.domNode.appendChild(statusBarElement);
        }
    }
};
ChatEditorHoverWrapper = __decorate([
    __param(2, IKeybindingService)
], ChatEditorHoverWrapper);
export { ChatEditorHoverWrapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySG92ZXJXcmFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL2VkaXRvckhvdmVyV3JhcHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFFMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTdGLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDaEIsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVoQjs7O0dBR0c7QUFDSSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzQjtJQUdsQyxZQUNDLG1CQUFnQyxFQUNoQyxPQUFtQyxFQUNFLGlCQUFxQztRQUFyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBRTFFLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FDckIsaUNBQWlDLEVBQ2pDLENBQUMsQ0FBQyxDQUFDLDRDQUE0QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztRQUNqQyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRXRELElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUNwRCxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDckMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDeEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDN0UsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDbEUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7b0JBQ2xDLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztvQkFDbkIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO29CQUMzQixHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUU7d0JBQ1IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDZixDQUFDO29CQUNELFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztpQkFDM0IsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUNyQixDQUFDLENBQUMsQ0FBQztZQUNILGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWpDWSxzQkFBc0I7SUFNaEMsV0FBQSxrQkFBa0IsQ0FBQTtHQU5SLHNCQUFzQixDQWlDbEMifQ==