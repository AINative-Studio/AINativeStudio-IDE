/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getReplView } from './repl.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { localize } from '../../../../nls.js';
export class ReplAccessibilityHelp {
    constructor() {
        this.priority = 120;
        this.name = 'replHelp';
        this.when = ContextKeyExpr.equals('focusedView', 'workbench.panel.repl.view');
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const viewsService = accessor.get(IViewsService);
        const replView = getReplView(viewsService);
        if (!replView) {
            return undefined;
        }
        return new ReplAccessibilityHelpProvider(replView);
    }
}
class ReplAccessibilityHelpProvider extends Disposable {
    constructor(_replView) {
        super();
        this._replView = _replView;
        this.id = "replHelp" /* AccessibleViewProviderId.ReplHelp */;
        this.verbositySettingKey = "accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
        this._treeHadFocus = false;
        this._treeHadFocus = !!_replView.getFocusedElement();
    }
    onClose() {
        if (this._treeHadFocus) {
            return this._replView.focusTree();
        }
        this._replView.getReplInput().focus();
    }
    provideContent() {
        return [
            localize('repl.help', "The debug console is a Read-Eval-Print-Loop that allows you to evaluate expressions and run commands and can be focused with{0}.", '<keybinding:workbench.panel.repl.view.focus>'),
            localize('repl.output', "The debug console output can be navigated to from the input field with the Focus Previous Widget command{0}.", '<keybinding:widgetNavigation.focusPrevious>'),
            localize('repl.input', "The debug console input can be navigated to from the output with the Focus Next Widget command{0}.", '<keybinding:widgetNavigation.focusNext>'),
            localize('repl.history', "The debug console output history can be navigated with the up and down arrow keys."),
            localize('repl.accessibleView', "The Open Accessible View command{0} will allow character by character navigation of the console output.", '<keybinding:editor.action.accessibleView>'),
            localize('repl.showRunAndDebug', "The Show Run and Debug view command{0} will open the Run and Debug view and provides more information about debugging.", '<keybinding:workbench.view.debug>'),
            localize('repl.clear', "The Debug: Clear Console command{0} will clear the console output.", '<keybinding:workbench.debug.panel.action.clearReplAction>'),
            localize('repl.lazyVariables', "The setting `debug.expandLazyVariables` controls whether variables are evaluated automatically. This is enabled by default when using a screen reader."),
        ].join('\n');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9yZXBsQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFRLE1BQU0sV0FBVyxDQUFDO0FBQzlDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsTUFBTSxPQUFPLHFCQUFxQjtJQUFsQztRQUNDLGFBQVEsR0FBRyxHQUFHLENBQUM7UUFDZixTQUFJLEdBQUcsVUFBVSxDQUFDO1FBQ2xCLFNBQUksR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBQ3pFLFNBQUksd0NBQStDO0lBU3BELENBQUM7SUFSQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sSUFBSSw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLDZCQUE4QixTQUFRLFVBQVU7SUFLckQsWUFBNkIsU0FBZTtRQUMzQyxLQUFLLEVBQUUsQ0FBQztRQURvQixjQUFTLEdBQVQsU0FBUyxDQUFNO1FBSjVCLE9BQUUsc0RBQXFDO1FBQ3ZDLHdCQUFtQiwrRUFBeUM7UUFDNUQsWUFBTyxHQUFHLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxDQUFDO1FBQ3BELGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBRzdCLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ3RELENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25DLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFTSxjQUFjO1FBQ3BCLE9BQU87WUFDTixRQUFRLENBQUMsV0FBVyxFQUFFLGtJQUFrSSxFQUFFLDhDQUE4QyxDQUFDO1lBQ3pNLFFBQVEsQ0FBQyxhQUFhLEVBQUUsOEdBQThHLEVBQUUsNkNBQTZDLENBQUM7WUFDdEwsUUFBUSxDQUFDLFlBQVksRUFBRSxvR0FBb0csRUFBRSx5Q0FBeUMsQ0FBQztZQUN2SyxRQUFRLENBQUMsY0FBYyxFQUFFLG9GQUFvRixDQUFDO1lBQzlHLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx5R0FBeUcsRUFBRSwyQ0FBMkMsQ0FBQztZQUN2TCxRQUFRLENBQUMsc0JBQXNCLEVBQUUsd0hBQXdILEVBQUUsbUNBQW1DLENBQUM7WUFDL0wsUUFBUSxDQUFDLFlBQVksRUFBRSxvRUFBb0UsRUFBRSwyREFBMkQsQ0FBQztZQUN6SixRQUFRLENBQUMsb0JBQW9CLEVBQUUsd0pBQXdKLENBQUM7U0FDeEwsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDZCxDQUFDO0NBQ0QifQ==