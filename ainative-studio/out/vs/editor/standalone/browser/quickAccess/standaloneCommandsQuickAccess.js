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
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { QuickCommandNLS } from '../../../common/standaloneStrings.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { AbstractEditorCommandsQuickAccessProvider } from '../../../contrib/quickAccess/browser/commandsQuickAccess.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
let StandaloneCommandsQuickAccessProvider = class StandaloneCommandsQuickAccessProvider extends AbstractEditorCommandsQuickAccessProvider {
    get activeTextEditorControl() { return this.codeEditorService.getFocusedCodeEditor() ?? undefined; }
    constructor(instantiationService, codeEditorService, keybindingService, commandService, telemetryService, dialogService) {
        super({ showAlias: false }, instantiationService, keybindingService, commandService, telemetryService, dialogService);
        this.codeEditorService = codeEditorService;
    }
    async getCommandPicks() {
        return this.getCodeEditorCommandPicks();
    }
    hasAdditionalCommandPicks() {
        return false;
    }
    async getAdditionalCommandPicks() {
        return [];
    }
};
StandaloneCommandsQuickAccessProvider = __decorate([
    __param(0, IInstantiationService),
    __param(1, ICodeEditorService),
    __param(2, IKeybindingService),
    __param(3, ICommandService),
    __param(4, ITelemetryService),
    __param(5, IDialogService)
], StandaloneCommandsQuickAccessProvider);
export { StandaloneCommandsQuickAccessProvider };
export class GotoLineAction extends EditorAction {
    static { this.ID = 'editor.action.quickCommand'; }
    constructor() {
        super({
            id: GotoLineAction.ID,
            label: QuickCommandNLS.quickCommandActionLabel,
            alias: 'Command Palette',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 59 /* KeyCode.F1 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            contextMenuOpts: {
                group: 'z_commands',
                order: 1
            }
        });
    }
    run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(StandaloneCommandsQuickAccessProvider.PREFIX);
    }
}
registerEditorAction(GotoLineAction);
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: StandaloneCommandsQuickAccessProvider,
    prefix: StandaloneCommandsQuickAccessProvider.PREFIX,
    helpEntries: [{ description: QuickCommandNLS.quickCommandHelp, commandId: GotoLineAction.ID }]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbW1hbmRzUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9xdWlja0FjY2Vzcy9zdGFuZGFsb25lQ29tbWFuZHNRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUF3QixVQUFVLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEYsT0FBTyxFQUFFLHlDQUF5QyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFeEgsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRW5GLElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQXNDLFNBQVEseUNBQXlDO0lBRW5HLElBQWMsdUJBQXVCLEtBQTBCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztJQUVuSSxZQUN3QixvQkFBMkMsRUFDN0IsaUJBQXFDLEVBQ3RELGlCQUFxQyxFQUN4QyxjQUErQixFQUM3QixnQkFBbUMsRUFDdEMsYUFBNkI7UUFFN0MsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLENBQUMsQ0FBQztRQU5qRixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO0lBTzNFLENBQUM7SUFFUyxLQUFLLENBQUMsZUFBZTtRQUM5QixPQUFPLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFUyx5QkFBeUI7UUFDbEMsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRVMsS0FBSyxDQUFDLHlCQUF5QjtRQUN4QyxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7Q0FDRCxDQUFBO0FBMUJZLHFDQUFxQztJQUsvQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxjQUFjLENBQUE7R0FWSixxQ0FBcUMsQ0EwQmpEOztBQUVELE1BQU0sT0FBTyxjQUFlLFNBQVEsWUFBWTthQUUvQixPQUFFLEdBQUcsNEJBQTRCLENBQUM7SUFFbEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsY0FBYyxDQUFDLEVBQUU7WUFDckIsS0FBSyxFQUFFLGVBQWUsQ0FBQyx1QkFBdUI7WUFDOUMsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixZQUFZLEVBQUUsU0FBUztZQUN2QixNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGlCQUFpQixDQUFDLEtBQUs7Z0JBQy9CLE9BQU8scUJBQVk7Z0JBQ25CLE1BQU0sMENBQWdDO2FBQ3RDO1lBQ0QsZUFBZSxFQUFFO2dCQUNoQixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakcsQ0FBQzs7QUFHRixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUVyQyxRQUFRLENBQUMsRUFBRSxDQUF1QixVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsMkJBQTJCLENBQUM7SUFDckYsSUFBSSxFQUFFLHFDQUFxQztJQUMzQyxNQUFNLEVBQUUscUNBQXFDLENBQUMsTUFBTTtJQUNwRCxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztDQUM5RixDQUFDLENBQUMifQ==