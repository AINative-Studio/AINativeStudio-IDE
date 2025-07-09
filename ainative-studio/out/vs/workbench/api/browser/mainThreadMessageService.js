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
import * as nls from '../../../nls.js';
import { toAction } from '../../../base/common/actions.js';
import { MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { Event } from '../../../base/common/event.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
let MainThreadMessageService = class MainThreadMessageService {
    constructor(extHostContext, _notificationService, _commandService, _dialogService, extensionService) {
        this._notificationService = _notificationService;
        this._commandService = _commandService;
        this._dialogService = _dialogService;
        this.extensionsListener = extensionService.onDidChangeExtensions(e => {
            for (const extension of e.removed) {
                this._notificationService.removeFilter(extension.identifier.value);
            }
        });
    }
    dispose() {
        this.extensionsListener.dispose();
    }
    $showMessage(severity, message, options, commands) {
        if (options.modal) {
            return this._showModalMessage(severity, message, options.detail, commands, options.useCustom);
        }
        else {
            return this._showMessage(severity, message, commands, options);
        }
    }
    _showMessage(severity, message, commands, options) {
        return new Promise(resolve => {
            const primaryActions = commands.map(command => toAction({
                id: `_extension_message_handle_${command.handle}`,
                label: command.title,
                enabled: true,
                run: () => {
                    resolve(command.handle);
                    return Promise.resolve();
                }
            }));
            let source;
            if (options.source) {
                source = {
                    label: options.source.label,
                    id: options.source.identifier.value
                };
            }
            if (!source) {
                source = nls.localize('defaultSource', "Extension");
            }
            const secondaryActions = [];
            if (options.source) {
                secondaryActions.push(toAction({
                    id: options.source.identifier.value,
                    label: nls.localize('manageExtension', "Manage Extension"),
                    run: () => {
                        return this._commandService.executeCommand('_extensions.manage', options.source.identifier.value);
                    }
                }));
            }
            const messageHandle = this._notificationService.notify({
                severity,
                message,
                actions: { primary: primaryActions, secondary: secondaryActions },
                source
            });
            // if promise has not been resolved yet, now is the time to ensure a return value
            // otherwise if already resolved it means the user clicked one of the buttons
            Event.once(messageHandle.onDidClose)(() => {
                resolve(undefined);
            });
        });
    }
    async _showModalMessage(severity, message, detail, commands, useCustom) {
        const buttons = [];
        let cancelButton = undefined;
        for (const command of commands) {
            const button = {
                label: command.title,
                run: () => command.handle
            };
            if (command.isCloseAffordance) {
                cancelButton = button;
            }
            else {
                buttons.push(button);
            }
        }
        if (!cancelButton) {
            if (buttons.length > 0) {
                cancelButton = {
                    label: nls.localize('cancel', "Cancel"),
                    run: () => undefined
                };
            }
            else {
                cancelButton = {
                    label: nls.localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                    run: () => undefined
                };
            }
        }
        const { result } = await this._dialogService.prompt({
            type: severity,
            message,
            detail,
            buttons,
            cancelButton,
            custom: useCustom
        });
        return result;
    }
};
MainThreadMessageService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadMessageService),
    __param(1, INotificationService),
    __param(2, ICommandService),
    __param(3, IDialogService),
    __param(4, IExtensionService)
], MainThreadMessageService);
export { MainThreadMessageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTWVzc2FnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUV2QyxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxFQUFpQyxXQUFXLEVBQTRCLE1BQU0sK0JBQStCLENBQUM7QUFDckgsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxjQUFjLEVBQWlCLE1BQU0sNkNBQTZDLENBQUM7QUFDNUYsT0FBTyxFQUFFLG9CQUFvQixFQUF1QixNQUFNLHVEQUF1RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFJNUUsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7SUFJcEMsWUFDQyxjQUErQixFQUNRLG9CQUEwQyxFQUMvQyxlQUFnQyxFQUNqQyxjQUE4QixFQUM1QyxnQkFBbUM7UUFIZix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQy9DLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNqQyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFHL0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BFLEtBQUssTUFBTSxTQUFTLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFrQixFQUFFLE9BQWUsRUFBRSxPQUFpQyxFQUFFLFFBQXlFO1FBQzdKLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQy9GLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hFLENBQUM7SUFDRixDQUFDO0lBRU8sWUFBWSxDQUFDLFFBQWtCLEVBQUUsT0FBZSxFQUFFLFFBQXlFLEVBQUUsT0FBaUM7UUFFckssT0FBTyxJQUFJLE9BQU8sQ0FBcUIsT0FBTyxDQUFDLEVBQUU7WUFFaEQsTUFBTSxjQUFjLEdBQWMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFDbEUsRUFBRSxFQUFFLDZCQUE2QixPQUFPLENBQUMsTUFBTSxFQUFFO2dCQUNqRCxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLEdBQUcsRUFBRSxHQUFHLEVBQUU7b0JBQ1QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDeEIsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzFCLENBQUM7YUFDRCxDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksTUFBZ0QsQ0FBQztZQUNyRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxHQUFHO29CQUNSLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUs7b0JBQzNCLEVBQUUsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLO2lCQUNuQyxDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDYixNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDckQsQ0FBQztZQUVELE1BQU0sZ0JBQWdCLEdBQWMsRUFBRSxDQUFDO1lBQ3ZDLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNwQixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO29CQUM5QixFQUFFLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSztvQkFDbkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUM7b0JBQzFELEdBQUcsRUFBRSxHQUFHLEVBQUU7d0JBQ1QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLENBQUMsTUFBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDcEcsQ0FBQztpQkFDRCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDO2dCQUN0RCxRQUFRO2dCQUNSLE9BQU87Z0JBQ1AsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ2pFLE1BQU07YUFDTixDQUFDLENBQUM7WUFFSCxpRkFBaUY7WUFDakYsNkVBQTZFO1lBQzdFLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRTtnQkFDekMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQWtCLEVBQUUsT0FBZSxFQUFFLE1BQTBCLEVBQUUsUUFBeUUsRUFBRSxTQUFtQjtRQUM5TCxNQUFNLE9BQU8sR0FBNEIsRUFBRSxDQUFDO1FBQzVDLElBQUksWUFBWSxHQUFrRCxTQUFTLENBQUM7UUFFNUUsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNoQyxNQUFNLE1BQU0sR0FBMEI7Z0JBQ3JDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztnQkFDcEIsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNO2FBQ3pCLENBQUM7WUFFRixJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUMvQixZQUFZLEdBQUcsTUFBTSxDQUFDO1lBQ3ZCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsWUFBWSxHQUFHO29CQUNkLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7b0JBQ3ZDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO2lCQUNwQixDQUFDO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFlBQVksR0FBRztvQkFDZCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQztvQkFDOUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLFNBQVM7aUJBQ3BCLENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1lBQ25ELElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTztZQUNQLE1BQU07WUFDTixPQUFPO1lBQ1AsWUFBWTtZQUNaLE1BQU0sRUFBRSxTQUFTO1NBQ2pCLENBQUMsQ0FBQztRQUVILE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNELENBQUE7QUE1SFksd0JBQXdCO0lBRHBDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQztJQU94RCxXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGlCQUFpQixDQUFBO0dBVFAsd0JBQXdCLENBNEhwQyJ9