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
import { AbstractGotoLineQuickAccessProvider } from '../../../contrib/quickAccess/browser/gotoLineQuickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { GoToLineNLS } from '../../../common/standaloneStrings.js';
import { Event } from '../../../../base/common/event.js';
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
let StandaloneGotoLineQuickAccessProvider = class StandaloneGotoLineQuickAccessProvider extends AbstractGotoLineQuickAccessProvider {
    constructor(editorService) {
        super();
        this.editorService = editorService;
        this.onDidActiveTextEditorControlChange = Event.None;
    }
    get activeTextEditorControl() {
        return this.editorService.getFocusedCodeEditor() ?? undefined;
    }
};
StandaloneGotoLineQuickAccessProvider = __decorate([
    __param(0, ICodeEditorService)
], StandaloneGotoLineQuickAccessProvider);
export { StandaloneGotoLineQuickAccessProvider };
export class GotoLineAction extends EditorAction {
    static { this.ID = 'editor.action.gotoLine'; }
    constructor() {
        super({
            id: GotoLineAction.ID,
            label: GoToLineNLS.gotoLineActionLabel,
            alias: 'Go to Line/Column...',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 37 /* KeyCode.KeyG */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(StandaloneGotoLineQuickAccessProvider.PREFIX);
    }
}
registerEditorAction(GotoLineAction);
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: StandaloneGotoLineQuickAccessProvider,
    prefix: StandaloneGotoLineQuickAccessProvider.PREFIX,
    helpEntries: [{ description: GoToLineNLS.gotoLineActionLabel, commandId: GotoLineAction.ID }]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUdvdG9MaW5lUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9xdWlja0FjY2Vzcy9zdGFuZGFsb25lR290b0xpbmVRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUF3QixVQUFVLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFDNUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFbkYsSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBc0MsU0FBUSxtQ0FBbUM7SUFJN0YsWUFBZ0MsYUFBa0Q7UUFDakYsS0FBSyxFQUFFLENBQUM7UUFEd0Msa0JBQWEsR0FBYixhQUFhLENBQW9CO1FBRi9ELHVDQUFrQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFJbkUsQ0FBQztJQUVELElBQWMsdUJBQXVCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLFNBQVMsQ0FBQztJQUMvRCxDQUFDO0NBQ0QsQ0FBQTtBQVhZLHFDQUFxQztJQUlwQyxXQUFBLGtCQUFrQixDQUFBO0dBSm5CLHFDQUFxQyxDQVdqRDs7QUFFRCxNQUFNLE9BQU8sY0FBZSxTQUFRLFlBQVk7YUFFL0IsT0FBRSxHQUFHLHdCQUF3QixDQUFDO0lBRTlDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGNBQWMsQ0FBQyxFQUFFO1lBQ3JCLEtBQUssRUFBRSxXQUFXLENBQUMsbUJBQW1CO1lBQ3RDLEtBQUssRUFBRSxzQkFBc0I7WUFDN0IsWUFBWSxFQUFFLFNBQVM7WUFDdkIsTUFBTSxFQUFFO2dCQUNQLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxLQUFLO2dCQUMvQixPQUFPLEVBQUUsaURBQTZCO2dCQUN0QyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsZ0RBQTZCLEVBQUU7Z0JBQy9DLE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqRyxDQUFDOztBQUdGLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRXJDLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztJQUNyRixJQUFJLEVBQUUscUNBQXFDO0lBQzNDLE1BQU0sRUFBRSxxQ0FBcUMsQ0FBQyxNQUFNO0lBQ3BELFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLEVBQUUsRUFBRSxDQUFDO0NBQzdGLENBQUMsQ0FBQyJ9