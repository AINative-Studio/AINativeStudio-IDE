/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Button, ButtonWithDropdown } from '../../../../base/browser/ui/button/button.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
export class CommentFormActions {
    constructor(keybindingService, contextKeyService, contextMenuService, container, actionHandler, maxActions, supportDropdowns) {
        this.keybindingService = keybindingService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.container = container;
        this.actionHandler = actionHandler;
        this.maxActions = maxActions;
        this.supportDropdowns = supportDropdowns;
        this._buttonElements = [];
        this._toDispose = new DisposableStore();
        this._actions = [];
    }
    setActions(menu, hasOnlySecondaryActions = false) {
        this._toDispose.clear();
        this._buttonElements.forEach(b => b.remove());
        this._buttonElements = [];
        const groups = menu.getActions({ shouldForwardArgs: true });
        let isPrimary = !hasOnlySecondaryActions;
        for (const group of groups) {
            const [, actions] = group;
            this._actions = actions;
            for (const current of actions) {
                const dropDownActions = this.supportDropdowns && current instanceof SubmenuItemAction ? current.actions : [];
                const action = dropDownActions.length ? dropDownActions[0] : current;
                let keybinding = this.keybindingService.lookupKeybinding(action.id, this.contextKeyService)?.getLabel();
                if (!keybinding && isPrimary) {
                    keybinding = this.keybindingService.lookupKeybinding("editor.action.submitComment" /* CommentCommandId.Submit */, this.contextKeyService)?.getLabel();
                }
                const title = keybinding ? `${action.label} (${keybinding})` : action.label;
                const actionHandler = this.actionHandler;
                const button = dropDownActions.length ? new ButtonWithDropdown(this.container, {
                    contextMenuProvider: this.contextMenuService,
                    actions: dropDownActions,
                    actionRunner: this._toDispose.add(new class extends ActionRunner {
                        async runAction(action, context) {
                            return actionHandler(action);
                        }
                    }),
                    secondary: !isPrimary,
                    title,
                    addPrimaryActionToDropdown: false,
                    ...defaultButtonStyles
                }) : new Button(this.container, { secondary: !isPrimary, title, ...defaultButtonStyles });
                isPrimary = false;
                this._buttonElements.push(button.element);
                this._toDispose.add(button);
                this._toDispose.add(button.onDidClick(() => this.actionHandler(action)));
                button.enabled = action.enabled;
                button.label = action.label;
                if ((this.maxActions !== undefined) && (this._buttonElements.length >= this.maxActions)) {
                    console.warn(`An extension has contributed more than the allowable number of actions to a comments menu.`);
                    return;
                }
            }
        }
    }
    triggerDefaultAction() {
        if (this._actions.length) {
            const lastAction = this._actions[0];
            if (lastAction.enabled) {
                return this.actionHandler(lastAction);
            }
        }
    }
    dispose() {
        this._toDispose.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudEZvcm1BY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudEZvcm1BY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFXLE1BQU0sb0NBQW9DLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBUyxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBSTFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRzFGLE1BQU0sT0FBTyxrQkFBa0I7SUFLOUIsWUFDa0IsaUJBQXFDLEVBQ3JDLGlCQUFxQyxFQUNyQyxrQkFBdUMsRUFDaEQsU0FBc0IsRUFDdEIsYUFBd0MsRUFDL0IsVUFBbUIsRUFDbkIsZ0JBQTBCO1FBTjFCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNyQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ2hELGNBQVMsR0FBVCxTQUFTLENBQWE7UUFDdEIsa0JBQWEsR0FBYixhQUFhLENBQTJCO1FBQy9CLGVBQVUsR0FBVixVQUFVLENBQVM7UUFDbkIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFVO1FBWHBDLG9CQUFlLEdBQWtCLEVBQUUsQ0FBQztRQUMzQixlQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM1QyxhQUFRLEdBQWMsRUFBRSxDQUFDO0lBVTdCLENBQUM7SUFFTCxVQUFV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