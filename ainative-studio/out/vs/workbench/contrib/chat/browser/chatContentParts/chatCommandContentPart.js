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
import * as dom from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { isResponseVM } from '../../common/chatViewModel.js';
const $ = dom.$;
let ChatCommandButtonContentPart = class ChatCommandButtonContentPart extends Disposable {
    constructor(commandButton, context, commandService) {
        super();
        this.commandService = commandService;
        this.domNode = $('.chat-command-button');
        const enabled = !isResponseVM(context.element) || !context.element.isStale;
        const tooltip = enabled ?
            commandButton.command.tooltip :
            localize('commandButtonDisabled', "Button not available in restored chat");
        const button = this._register(new Button(this.domNode, { ...defaultButtonStyles, supportIcons: true, title: tooltip }));
        button.label = commandButton.command.title;
        button.enabled = enabled;
        // TODO still need telemetry for command buttons
        this._register(button.onDidClick(() => this.commandService.executeCommand(commandButton.command.id, ...(commandButton.command.arguments ?? []))));
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'command';
    }
};
ChatCommandButtonContentPart = __decorate([
    __param(2, ICommandService)
], ChatCommandButtonContentPart);
export { ChatCommandButtonContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbW1hbmRDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0Q29tbWFuZENvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBSTdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUU3RCxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRVQsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO0lBRzNELFlBQ0MsYUFBaUMsRUFDakMsT0FBc0MsRUFDSixjQUErQjtRQUVqRSxLQUFLLEVBQUUsQ0FBQztRQUYwQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFJakUsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUN6QyxNQUFNLE9BQU8sR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUMzRSxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQztZQUN4QixhQUFhLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9CLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLEdBQUcsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hILE1BQU0sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDM0MsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFFekIsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkosQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUE2QztRQUMzRCxnREFBZ0Q7UUFDaEQsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQztJQUNqQyxDQUFDO0NBQ0QsQ0FBQTtBQTNCWSw0QkFBNEI7SUFNdEMsV0FBQSxlQUFlLENBQUE7R0FOTCw0QkFBNEIsQ0EyQnhDIn0=