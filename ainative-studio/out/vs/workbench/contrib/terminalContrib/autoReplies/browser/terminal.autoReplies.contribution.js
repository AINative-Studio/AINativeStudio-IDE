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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { ITerminalInstanceService } from '../../../terminal/browser/terminal.js';
import { TERMINAL_CONFIG_SECTION } from '../../../terminal/common/terminal.js';
// #region Workbench contributions
let TerminalAutoRepliesContribution = class TerminalAutoRepliesContribution extends Disposable {
    static { this.ID = 'terminalAutoReplies'; }
    constructor(_configurationService, terminalInstanceService) {
        super();
        this._configurationService = _configurationService;
        for (const backend of terminalInstanceService.getRegisteredBackends()) {
            this._installListenersOnBackend(backend);
        }
        this._register(terminalInstanceService.onDidRegisterBackend(async (e) => this._installListenersOnBackend(e)));
    }
    _installListenersOnBackend(backend) {
        // Listen for config changes
        const initialConfig = this._configurationService.getValue(TERMINAL_CONFIG_SECTION);
        for (const match of Object.keys(initialConfig.autoReplies)) {
            // Ensure the reply is valid
            const reply = initialConfig.autoReplies[match];
            if (reply) {
                backend.installAutoReply(match, reply);
            }
        }
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("terminal.integrated.autoReplies" /* TerminalAutoRepliesSettingId.AutoReplies */)) {
                backend.uninstallAllAutoReplies();
                const config = this._configurationService.getValue(TERMINAL_CONFIG_SECTION);
                for (const match of Object.keys(config.autoReplies)) {
                    // Ensure the reply is valid
                    const reply = config.autoReplies[match];
                    if (reply) {
                        backend.installAutoReply(match, reply);
                    }
                }
            }
        }));
    }
};
TerminalAutoRepliesContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITerminalInstanceService)
], TerminalAutoRepliesContribution);
export { TerminalAutoRepliesContribution };
registerWorkbenchContribution2(TerminalAutoRepliesContribution.ID, TerminalAutoRepliesContribution, 3 /* WorkbenchPhase.AfterRestored */);
// #endregion Contributions
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYXV0b1JlcGxpZXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9hdXRvUmVwbGllcy9icm93c2VyL3Rlcm1pbmFsLmF1dG9SZXBsaWVzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLDhCQUE4QixFQUErQyxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xJLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRy9FLGtDQUFrQztBQUUzQixJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLFVBQVU7YUFDdkQsT0FBRSxHQUFHLHFCQUFxQixBQUF4QixDQUF5QjtJQUVsQyxZQUN5QyxxQkFBNEMsRUFDMUQsdUJBQWlEO1FBRTNFLEtBQUssRUFBRSxDQUFDO1FBSGdDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFLcEYsS0FBSyxNQUFNLE9BQU8sSUFBSSx1QkFBdUIsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUM7WUFDdkUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0csQ0FBQztJQUVPLDBCQUEwQixDQUFDLE9BQXlCO1FBQzNELDRCQUE0QjtRQUM1QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFvQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3RILEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUM1RCw0QkFBNEI7WUFDNUIsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQWtCLENBQUM7WUFDaEUsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3hDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxFQUFFO1lBQzVFLElBQUksQ0FBQyxDQUFDLG9CQUFvQixrRkFBMEMsRUFBRSxDQUFDO2dCQUN0RSxPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBb0MsdUJBQXVCLENBQUMsQ0FBQztnQkFDL0csS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUNyRCw0QkFBNEI7b0JBQzVCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFrQixDQUFDO29CQUN6RCxJQUFJLEtBQUssRUFBRSxDQUFDO3dCQUNYLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ3hDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUF2Q1csK0JBQStCO0lBSXpDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtHQUxkLCtCQUErQixDQXdDM0M7O0FBRUQsOEJBQThCLENBQUMsK0JBQStCLENBQUMsRUFBRSxFQUFFLCtCQUErQix1Q0FBK0IsQ0FBQztBQUVsSSwyQkFBMkIifQ==