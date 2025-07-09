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
import '../../../../base/browser/ui/codicons/codiconStyles.js'; // The codicon symbol styles are defined here and must be loaded
import '../../../contrib/symbolIcons/browser/symbolIcons.js'; // The codicon symbol colors are defined here and must be loaded to get colors
import { AbstractGotoSymbolQuickAccessProvider } from '../../../contrib/quickAccess/browser/gotoSymbolQuickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { QuickOutlineNLS } from '../../../common/standaloneStrings.js';
import { Event } from '../../../../base/common/event.js';
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { IQuickInputService, ItemActivation } from '../../../../platform/quickinput/common/quickInput.js';
import { IOutlineModelService } from '../../../contrib/documentSymbols/browser/outlineModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
let StandaloneGotoSymbolQuickAccessProvider = class StandaloneGotoSymbolQuickAccessProvider extends AbstractGotoSymbolQuickAccessProvider {
    constructor(editorService, languageFeaturesService, outlineModelService) {
        super(languageFeaturesService, outlineModelService);
        this.editorService = editorService;
        this.onDidActiveTextEditorControlChange = Event.None;
    }
    get activeTextEditorControl() {
        return this.editorService.getFocusedCodeEditor() ?? undefined;
    }
};
StandaloneGotoSymbolQuickAccessProvider = __decorate([
    __param(0, ICodeEditorService),
    __param(1, ILanguageFeaturesService),
    __param(2, IOutlineModelService)
], StandaloneGotoSymbolQuickAccessProvider);
export { StandaloneGotoSymbolQuickAccessProvider };
export class GotoSymbolAction extends EditorAction {
    static { this.ID = 'editor.action.quickOutline'; }
    constructor() {
        super({
            id: GotoSymbolAction.ID,
            label: QuickOutlineNLS.quickOutlineActionLabel,
            alias: 'Go to Symbol...',
            precondition: EditorContextKeys.hasDocumentSymbolProvider,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            contextMenuOpts: {
                group: 'navigation',
                order: 3
            }
        });
    }
    run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(AbstractGotoSymbolQuickAccessProvider.PREFIX, { itemActivation: ItemActivation.NONE });
    }
}
registerEditorAction(GotoSymbolAction);
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: StandaloneGotoSymbolQuickAccessProvider,
    prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX,
    helpEntries: [
        { description: QuickOutlineNLS.quickOutlineActionLabel, prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX, commandId: GotoSymbolAction.ID },
        { description: QuickOutlineNLS.quickOutlineByCategoryActionLabel, prefix: AbstractGotoSymbolQuickAccessProvider.PREFIX_BY_CATEGORY }
    ]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUdvdG9TeW1ib2xRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3F1aWNrQWNjZXNzL3N0YW5kYWxvbmVHb3RvU3ltYm9sUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx1REFBdUQsQ0FBQyxDQUFDLGdFQUFnRTtBQUNoSSxPQUFPLHFEQUFxRCxDQUFDLENBQUMsOEVBQThFO0FBQzVJLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQXdCLFVBQVUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBSXpFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVqRixJQUFNLHVDQUF1QyxHQUE3QyxNQUFNLHVDQUF3QyxTQUFRLHFDQUFxQztJQUlqRyxZQUNxQixhQUFrRCxFQUM1Qyx1QkFBaUQsRUFDckQsbUJBQXlDO1FBRS9ELEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBSmYsa0JBQWEsR0FBYixhQUFhLENBQW9CO1FBSHBELHVDQUFrQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFRbkUsQ0FBQztJQUVELElBQWMsdUJBQXVCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLFNBQVMsQ0FBQztJQUMvRCxDQUFDO0NBQ0QsQ0FBQTtBQWZZLHVDQUF1QztJQUtqRCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxvQkFBb0IsQ0FBQTtHQVBWLHVDQUF1QyxDQWVuRDs7QUFFRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsWUFBWTthQUVqQyxPQUFFLEdBQUcsNEJBQTRCLENBQUM7SUFFbEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsRUFBRTtZQUN2QixLQUFLLEVBQUUsZUFBZSxDQUFDLHVCQUF1QjtZQUM5QyxLQUFLLEVBQUUsaUJBQWlCO1lBQ3hCLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyx5QkFBeUI7WUFDekQsTUFBTSxFQUFFO2dCQUNQLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxLQUFLO2dCQUMvQixPQUFPLEVBQUUsbURBQTZCLHdCQUFlO2dCQUNyRCxNQUFNLDBDQUFnQzthQUN0QztZQUNELGVBQWUsRUFBRTtnQkFDaEIsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLE1BQU0sRUFBRSxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUMxSSxDQUFDOztBQUdGLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFdkMsUUFBUSxDQUFDLEVBQUUsQ0FBdUIsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDO0lBQ3JGLElBQUksRUFBRSx1Q0FBdUM7SUFDN0MsTUFBTSxFQUFFLHFDQUFxQyxDQUFDLE1BQU07SUFDcEQsV0FBVyxFQUFFO1FBQ1osRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxxQ0FBcUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixDQUFDLEVBQUUsRUFBRTtRQUM5SSxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsaUNBQWlDLEVBQUUsTUFBTSxFQUFFLHFDQUFxQyxDQUFDLGtCQUFrQixFQUFFO0tBQ3BJO0NBQ0QsQ0FBQyxDQUFDIn0=