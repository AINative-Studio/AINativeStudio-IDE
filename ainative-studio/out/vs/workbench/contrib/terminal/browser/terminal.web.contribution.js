/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { BrowserTerminalProfileResolverService } from './terminalProfileResolverService.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
registerSingleton(ITerminalProfileResolverService, BrowserTerminalProfileResolverService, 1 /* InstantiationType.Delayed */);
// Register standard external terminal keybinding as integrated terminal when in web as the
// external terminal is not available
KeybindingsRegistry.registerKeybindingRule({
    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: TerminalContextKeys.notFocus,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwud2ViLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsLndlYi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFvQixtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSwrQkFBK0IsRUFBcUIsTUFBTSx1QkFBdUIsQ0FBQztBQUMzRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFdEUsaUJBQWlCLENBQUMsK0JBQStCLEVBQUUscUNBQXFDLG9DQUE0QixDQUFDO0FBRXJILDJGQUEyRjtBQUMzRixxQ0FBcUM7QUFDckMsbUJBQW1CLENBQUMsc0JBQXNCLENBQUM7SUFDMUMsRUFBRSw2REFBdUI7SUFDekIsTUFBTSw2Q0FBbUM7SUFDekMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLFFBQVE7SUFDbEMsT0FBTyxFQUFFLG1EQUE2Qix3QkFBZTtDQUNyRCxDQUFDLENBQUMifQ==