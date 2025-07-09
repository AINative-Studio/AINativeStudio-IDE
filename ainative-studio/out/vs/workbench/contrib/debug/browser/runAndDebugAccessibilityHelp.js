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
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { AccessibilityHelpNLS } from '../../../../editor/common/standaloneStrings.js';
import { FocusedViewContext, SidebarFocusContext } from '../../../common/contextkeys.js';
import { BREAKPOINTS_VIEW_ID, CALLSTACK_VIEW_ID, LOADED_SCRIPTS_VIEW_ID, VARIABLES_VIEW_ID, WATCH_VIEW_ID } from '../common/debug.js';
export class RunAndDebugAccessibilityHelp {
    constructor() {
        this.priority = 120;
        this.name = 'runAndDebugHelp';
        this.when = ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals('activeViewlet', 'workbench.view.debug'), SidebarFocusContext), ContextKeyExpr.equals(FocusedViewContext.key, VARIABLES_VIEW_ID), ContextKeyExpr.equals(FocusedViewContext.key, WATCH_VIEW_ID), ContextKeyExpr.equals(FocusedViewContext.key, CALLSTACK_VIEW_ID), ContextKeyExpr.equals(FocusedViewContext.key, LOADED_SCRIPTS_VIEW_ID), ContextKeyExpr.equals(FocusedViewContext.key, BREAKPOINTS_VIEW_ID));
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        return new RunAndDebugAccessibilityHelpProvider(accessor.get(ICommandService), accessor.get(IViewsService));
    }
}
let RunAndDebugAccessibilityHelpProvider = class RunAndDebugAccessibilityHelpProvider extends Disposable {
    constructor(_commandService, _viewsService) {
        super();
        this._commandService = _commandService;
        this._viewsService = _viewsService;
        this.id = "runAndDebug" /* AccessibleViewProviderId.RunAndDebug */;
        this.verbositySettingKey = "accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
        this._focusedView = this._viewsService.getFocusedViewName();
    }
    onClose() {
        switch (this._focusedView) {
            case 'Watch':
                this._commandService.executeCommand('workbench.debug.action.focusWatchView');
                break;
            case 'Variables':
                this._commandService.executeCommand('workbench.debug.action.focusVariablesView');
                break;
            case 'Call Stack':
                this._commandService.executeCommand('workbench.debug.action.focusCallStackView');
                break;
            case 'Breakpoints':
                this._commandService.executeCommand('workbench.debug.action.focusBreakpointsView');
                break;
            default:
                this._commandService.executeCommand('workbench.view.debug');
        }
    }
    provideContent() {
        return [
            localize('debug.showRunAndDebug', "The Show Run and Debug view command{0} will open the current view.", '<keybinding:workbench.view.debug>'),
            localize('debug.startDebugging', "The Debug: Start Debugging command{0} will start a debug session.", '<keybinding:workbench.action.debug.start>'),
            localize('debug.help', "Access debug output and evaluate expressions in the debug console, which can be focused with{0}.", '<keybinding:workbench.panel.repl.view.focus>'),
            AccessibilityHelpNLS.setBreakpoint,
            AccessibilityHelpNLS.addToWatch,
            localize('onceDebugging', "Once debugging, the following commands will be available:"),
            localize('debug.restartDebugging', "- Debug: Restart Debugging command{0} will restart the current debug session.", '<keybinding:workbench.action.debug.restart>'),
            localize('debug.stopDebugging', "- Debug: Stop Debugging command{0} will stop the current debugging session.", '<keybinding:workbench.action.debug.stop>'),
            localize('debug.continue', "- Debug: Continue command{0} will continue execution until the next breakpoint.", '<keybinding:workbench.action.debug.continue>'),
            localize('debug.stepInto', "- Debug: Step Into command{0} will step into the next function call.", '<keybinding:workbench.action.debug.stepInto>'),
            localize('debug.stepOver', "- Debug: Step Over command{0} will step over the current function call.", '<keybinding:workbench.action.debug.stepOver>'),
            localize('debug.stepOut', "- Debug: Step Out command{0} will step out of the current function call.", '<keybinding:workbench.action.debug.stepOut>'),
            localize('debug.views', 'The debug viewlet is comprised of several views that can be focused with the following commands or navigated to via tab then arrow keys:'),
            localize('debug.focusBreakpoints', "- Debug: Focus Breakpoints View command{0} will focus the breakpoints view.", '<keybinding:workbench.debug.action.focusBreakpointsView>'),
            localize('debug.focusCallStack', "- Debug: Focus Call Stack View command{0} will focus the call stack view.", '<keybinding:workbench.debug.action.focusCallStackView>'),
            localize('debug.focusVariables', "- Debug: Focus Variables View command{0} will focus the variables view.", '<keybinding:workbench.debug.action.focusVariablesView>'),
            localize('debug.focusWatch', "- Debug: Focus Watch View command{0} will focus the watch view.", '<keybinding:workbench.debug.action.focusWatchView>'),
            localize('debug.watchSetting', "The setting {0} controls whether watch variable changes are announced.", 'accessibility.debugWatchVariableAnnouncements'),
        ].join('\n');
    }
};
RunAndDebugAccessibilityHelpProvider = __decorate([
    __param(0, ICommandService),
    __param(1, IViewsService)
], RunAndDebugAccessibilityHelpProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuQW5kRGVidWdBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3J1bkFuZERlYnVnQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFNaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsc0JBQXNCLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFdEksTUFBTSxPQUFPLDRCQUE0QjtJQUF6QztRQUNDLGFBQVEsR0FBRyxHQUFHLENBQUM7UUFDZixTQUFJLEdBQUcsaUJBQWlCLENBQUM7UUFDekIsU0FBSSxHQUFHLGNBQWMsQ0FBQyxFQUFFLENBQ3ZCLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxFQUN2RyxjQUFjLENBQUMsTUFBTSxDQUFDLGtCQUFrQixD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