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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvcmVwbEFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBUSxNQUFNLFdBQVcsQ0FBQztBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE1BQU0sT0FBTyxxQkFBcUI7SUFBbEM7UUFDQyxhQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ2YsU0FBSSxHQUFHLFVBQVUsQ0FBQztRQUNsQixTQUFJLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUN6RSxTQUFJLHdDQUErQztJQVNwRCxDQUFDO0lBUkEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDakQsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPLElBQUksNkJBQTZCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNEO0FBRUQsTUFBTSw2QkFBOEIsU0FBUSxVQUFVO0lBS3JELFlBQTZCLFNBQWU7UUFDM0MsS0FBSyxFQUFFLENBQUM7UUFEb0IsY0FBUyxHQUFULFNBQVMsQ0FBTTtRQUo1QixPQUFFLHNEQUFxQztRQUN2Qyx3QkFBbUIsK0VBQXlDO1FBQzVELFlBQU8sR0FBRyxFQUFFLElBQUksc0NBQXlCLEVBQUUsQ0FBQztRQUNwRCxrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUc3QixJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUN0RCxDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRU0sY0FBYztRQUNwQixPQUFPO1lBQ04sUUFBUSxDQUFDLFdBQVcsRUFBRSxrSUFBa0ksRUFBRSw4Q0FBOEMsQ0FBQztZQUN6TSxRQUFRLENBQUMsYUFBYSxFQUFFLDhHQUE4RyxFQUFFLDZDQUE2QyxDQUFDO1lBQ3RMLFFBQVEsQ0FBQyxZQUFZLEVBQUUsb0dBQW9HLEVBQUUseUNBQXlDLENBQUM7WUFDdkssUUFBUSxDQUFDLGNBQWMsRUFBRSxvRkFBb0YsQ0FBQztZQUM5RyxRQUFRLENBQUMscUJBQXFCLEVBQUUseUdBQXlHLEVBQUUsMkNBQTJDLENBQUM7WUFDdkwsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHdIQUF3SCxFQUFFLG1DQUFtQyxDQUFDO1lBQy9MLFFBQVEsQ0FBQyxZQUFZLEVBQUUsb0VBQW9FLEVBQUUsMkRBQTJELENBQUM7WUFDekosUUFBUSxDQUFDLG9CQUFvQixFQUFFLHdKQUF3SixDQUFDO1NBQ3hMLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=