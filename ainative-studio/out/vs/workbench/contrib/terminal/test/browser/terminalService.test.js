/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fail } from 'assert';
import { Emitter } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { ITerminalInstanceService, ITerminalService } from '../../browser/terminal.js';
import { TerminalService } from '../../browser/terminalService.js';
import { TERMINAL_CONFIG_SECTION } from '../../common/terminal.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Workbench - TerminalService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let terminalService;
    let configurationService;
    let dialogService;
    setup(async () => {
        dialogService = new TestDialogService();
        configurationService = new TestConfigurationService({
            files: {},
            terminal: {
                integrated: {
                    confirmOnKill: 'never'
                }
            }
        });
        const instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService,
        }, store);
        instantiationService.stub(IDialogService, dialogService);
        instantiationService.stub(ITerminalInstanceService, 'getBackend', undefined);
        instantiationService.stub(ITerminalInstanceService, 'getRegisteredBackends', []);
        instantiationService.stub(IRemoteAgentService, 'getConnection', null);
        terminalService = store.add(instantiationService.createInstance(TerminalService));
        instantiationService.stub(ITerminalService, terminalService);
    });
    suite('safeDisposeTerminal', () => {
        let onExitEmitter;
        setup(() => {
            onExitEmitter = store.add(new Emitter());
        });
        test('should not show prompt when confirmOnKill is never', async () => {
            await setConfirmOnKill(configurationService, 'never');
            await terminalService.safeDisposeTerminal({
                target: TerminalLocation.Editor,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
            await terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
        });
        test('should not show prompt when any terminal editor is closed (handled by editor itself)', async () => {
            await setConfirmOnKill(configurationService, 'editor');
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Editor,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
            await setConfirmOnKill(configurationService, 'always');
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Editor,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
        });
        test('should not show prompt when confirmOnKill is editor and panel terminal is closed', async () => {
            await setConfirmOnKill(configurationService, 'editor');
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
        });
        test('should show prompt when confirmOnKill is panel and panel terminal is closed', async () => {
            await setConfirmOnKill(configurationService, 'panel');
            // No child process cases
            dialogService.setConfirmResult({ confirmed: false });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: false,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
            dialogService.setConfirmResult({ confirmed: true });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: false,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
            // Child process cases
            dialogService.setConfirmResult({ confirmed: false });
            await terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                dispose: () => fail()
            });
            dialogService.setConfirmResult({ confirmed: true });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
        });
        test('should show prompt when confirmOnKill is always and panel terminal is closed', async () => {
            await setConfirmOnKill(configurationService, 'always');
            // No child process cases
            dialogService.setConfirmResult({ confirmed: false });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: false,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
            dialogService.setConfirmResult({ confirmed: true });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: false,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
            // Child process cases
            dialogService.setConfirmResult({ confirmed: false });
            await terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                dispose: () => fail()
            });
            dialogService.setConfirmResult({ confirmed: true });
            terminalService.safeDisposeTerminal({
                target: TerminalLocation.Panel,
                hasChildProcesses: true,
                onExit: onExitEmitter.event,
                dispose: () => onExitEmitter.fire(undefined)
            });
        });
    });
});
async function setConfirmOnKill(configurationService, value) {
    await configurationService.setUserConfiguration(TERMINAL_CONFIG_SECTION, { confirmOnKill: value });
    configurationService.onDidChangeConfigurationEmitter.fire({
        affectsConfiguration: () => true,
        affectedKeys: ['terminal.integrated.confirmOnKill']
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3Rlcm1pbmFsU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDOUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNyRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQXFCLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWxHLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxJQUFJLGVBQWdDLENBQUM7SUFDckMsSUFBSSxvQkFB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