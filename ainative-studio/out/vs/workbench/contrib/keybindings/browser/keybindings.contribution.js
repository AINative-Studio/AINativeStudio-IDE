/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { showWindowLogActionId } from '../../../services/log/common/logConstants.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { $, append, getDomNodePagePosition, getWindows, onDidRegisterWindow } from '../../../../base/browser/dom.js';
import { createCSSRule, createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { Emitter } from '../../../../base/common/event.js';
import { DomEmitter } from '../../../../base/browser/event.js';
class ToggleKeybindingsLogAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleKeybindingsLog',
            title: nls.localize2('toggleKeybindingsLog', "Toggle Keyboard Shortcuts Troubleshooting"),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        const logging = accessor.get(IKeybindingService).toggleLogging();
        if (logging) {
            const commandService = accessor.get(ICommandService);
            commandService.executeCommand(showWindowLogActionId);
        }
        if (ToggleKeybindingsLogAction.disposable) {
            ToggleKeybindingsLogAction.disposable.dispose();
            ToggleKeybindingsLogAction.disposable = undefined;
            return;
        }
        const layoutService = accessor.get(ILayoutService);
        const disposables = new DisposableStore();
        const container = layoutService.activeContainer;
        const focusMarker = append(container, $('.focus-troubleshooting-marker'));
        disposables.add(toDisposable(() => focusMarker.remove()));
        // Add CSS rule for focus marker
        const stylesheet = createStyleSheet(undefined, undefined, disposables);
        createCSSRule('.focus-troubleshooting-marker', `
			position: fixed;
			pointer-events: none;
			z-index: 100000;
			background-color: rgba(255, 0, 0, 0.2);
			border: 2px solid rgba(255, 0, 0, 0.8);
			border-radius: 2px;
			display: none;
		`, stylesheet);
        const onKeyDown = disposables.add(new Emitter());
        function registerWindowListeners(window, disposables) {
            disposables.add(disposables.add(new DomEmitter(window, 'keydown', true)).event(e => onKeyDown.fire(e)));
        }
        for (const { window, disposables } of getWindows()) {
            registerWindowListeners(window, disposables);
        }
        disposables.add(onDidRegisterWindow(({ window, disposables }) => registerWindowListeners(window, disposables)));
        disposables.add(layoutService.onDidChangeActiveContainer(() => {
            layoutService.activeContainer.appendChild(focusMarker);
        }));
        disposables.add(onKeyDown.event(e => {
            const target = e.target;
            if (target) {
                const position = getDomNodePagePosition(target);
                focusMarker.style.top = `${position.top}px`;
                focusMarker.style.left = `${position.left}px`;
                focusMarker.style.width = `${position.width}px`;
                focusMarker.style.height = `${position.height}px`;
                focusMarker.style.display = 'block';
                // Hide after timeout
                setTimeout(() => {
                    focusMarker.style.display = 'none';
                }, 800);
            }
        }));
        ToggleKeybindingsLogAction.disposable = disposables;
    }
}
registerAction2(ToggleKeybindingsLogAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3MuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2tleWJpbmRpbmdzL2Jyb3dzZXIva2V5YmluZGluZ3MuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLHNCQUFzQixFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE1BQU0sMEJBQTJCLFNBQVEsT0FBTztJQUcvQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUs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