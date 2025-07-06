/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { Event } from '../../../../../../base/common/event.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestCommandService } from '../../../../../../editor/test/browser/editorTestServices.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextMenuService } from '../../../../../../platform/contextview/browser/contextMenuService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { CommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/commandDetectionCapability.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITerminalQuickFixService } from '../../browser/quickFix.js';
import { getQuickFixesForCommand, TerminalQuickFixAddon } from '../../browser/quickFixAddon.js';
import { freePort, FreePortOutputRegex, gitCreatePr, GitCreatePrOutputRegex, gitFastForwardPull, GitFastForwardPullOutputRegex, GitPushOutputRegex, gitPushSetUpstream, gitSimilar, GitSimilarOutputRegex, gitTwoDashes, GitTwoDashesRegex, pwshGeneralError, PwshGeneralErrorOutputRegex, pwshUnixCommandNotFoundError, PwshUnixCommandNotFoundErrorOutputRegex } from '../../browser/terminalQuickFixBuiltinActions.js';
import { TestStorageService } from '../../../../../test/common/workbenchTestServices.js';
suite('QuickFixAddon', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let quickFixAddon;
    let commandDetection;
    let commandService;
    let openerService;
    let labelService;
    let terminal;
    let instantiationService;
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        terminal = store.add(new TerminalCtor({
            allowProposedApi: true,
            cols: 80,
            rows: 30
        }));
        instantiationService.stub(IStorageService, store.add(new TestStorageService()));
        instantiationService.stub(ITerminalQuickFixService, {
            onDidRegisterProvider: Event.None,
            onDidUnregisterProvider: Event.None,
            onDidRegisterCommandSelector: Event.None,
            extensionQuickFixes: Promise.resolve([])
        });
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        labelService = instantiationService.stub(ILabelService, {});
        const capabilities = store.add(new TerminalCapabilityStore());
        instantiationService.stub(ILogService, new NullLogService());
        commandDetection = store.add(instantiationService.createInstance(CommandDetectionCapability, terminal));
        capabilities.add(2 /* TerminalCapability.CommandDetection */, commandDetection);
        instantiationService.stub(IContextMenuService, store.add(instantiationService.createInstance(ContextMenuService)));
        openerService = instantiationService.stub(IOpenerService, {});
        commandService = new TestCommandService(instantiationService);
        quickFixAddon = instantiationService.createInstance(TerminalQuickFixAddon, [], capabilities);
        terminal.loadAddon(quickFixAddon);
    });
    suite('registerCommandFinishedListener & getMatchActions', () => {
        suite('gitSimilarCommand', () => {
            const expectedMap = new Map();
            const command = `git sttatus`;
            let output = `git: 'sttatus' is not a git command. See 'git --help'.

			The most similar command is
			status`;
            const exitCode = 1;
            const actions = [{
                    id: 'Git Similar',
                    enabled: true,
                    label: 'Run: git status',
                    tooltip: 'Run: git status',
                    command: 'git status'
                }];
            const outputLines = output.split('\n');
            setup(() => {
                const command = gitSimilar();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual(await (getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitSimilarOutputRegex, exitCode, [`invalid output`]), expectedMap, commandService, openerService, labelService)), undefined);
                });
                test('command does not match', async () => {
                    strictEqual(await (getQuickFixesForCommand([], terminal, createCommand(`gt sttatus`, output, GitSimilarOutputRegex, exitCode, outputLines), expectedMap, commandService, openerService, labelService)), undefined);
                });
            });
            suite('returns actions when', () => {
                test('expected unix exit code', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitSimilarOutputRegex, exitCode, outputLines), expectedMap, commandService, openerService, labelService)), actions);
                });
                test('matching exit status', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitSimilarOutputRegex, 2, outputLines), expectedMap, commandService, openerService, labelService)), actions);
                });
            });
            suite('returns match', () => {
                test('returns match', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitSimilarOutputRegex, exitCode, outputLines), expectedMap, commandService, openerService, labelService)), actions);
                });
                test('returns multiple match', async () => {
                    output = `git: 'pu' is not a git command. See 'git --help'.
				The most similar commands are
						pull
						push`;
                    const actions = [{
                            id: 'Git Similar',
                            enabled: true,
                            label: 'Run: git pull',
                            tooltip: 'Run: git pull',
                            command: 'git pull'
                        }, {
                            id: 'Git Similar',
                            enabled: true,
                            label: 'Run: git push',
                            tooltip: 'Run: git push',
                            command: 'git push'
                        }];
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand('git pu', output, GitSimilarOutputRegex, exitCode, output.split('\n')), expectedMap, commandService, openerService, labelService)), actions);
                });
                test('passes any arguments through', async () => {
                    output = `git: 'checkoutt' is not a git command. See 'git --help'.
				The most similar commands are
						checkout`;
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand('git checkoutt .', output, GitSimilarOutputRegex, exitCode, output.split('\n')), expectedMap, commandService, openerService, labelService)), [{
                            id: 'Git Similar',
                            enabled: true,
                            label: 'Run: git checkout .',
                            tooltip: 'Run: git checkout .',
                            command: 'git checkout .'
                        }]);
                });
            });
        });
        suite('gitTwoDashes', () => {
            const expectedMap = new Map();
            const command = `git add . -all`;
            const output = 'error: did you mean `--all` (with two dashes)?';
            const exitCode = 1;
            const actions = [{
                    id: 'Git Two Dashes',
                    enabled: true,
                    label: 'Run: git add . --all',
                    tooltip: 'Run: git add . --all',
                    command: 'git add . --all'
                }];
            setup(() => {
                const command = gitTwoDashes();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitTwoDashesRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
                });
                test('command does not match', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(`gt sttatus`, output, GitTwoDashesRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
                });
            });
            suite('returns actions when', () => {
                test('expected unix exit code', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitTwoDashesRegex, exitCode), expectedMap, commandService, openerService, labelService)), actions);
                });
                test('matching exit status', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitTwoDashesRegex, 2), expectedMap, commandService, openerService, labelService)), actions);
                });
            });
        });
        suite('gitFastForwardPull', () => {
            const expectedMap = new Map();
            const command = `git checkout vnext`;
            const output = 'Already on \'vnext\' \n Your branch is behind \'origin/vnext\' by 1 commit, and can be fast-forwarded.';
            const exitCode = 0;
            const actions = [{
                    id: 'Git Fast Forward Pull',
                    enabled: true,
                    label: 'Run: git pull',
                    tooltip: 'Run: git pull',
                    command: 'git pull'
                }];
            setup(() => {
                const command = gitFastForwardPull();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitFastForwardPullOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
                });
                test('command does not match', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(`gt add`, output, GitFastForwardPullOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
                });
                test('exit code does not match', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitFastForwardPullOutputRegex, 2), expectedMap, commandService, openerService, labelService)), undefined);
                });
            });
            suite('returns actions when', () => {
                test('matching exit status, command, ouput', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitFastForwardPullOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), actions);
                });
            });
        });
        if (!isWindows) {
            suite('freePort', () => {
                const expectedMap = new Map();
                const portCommand = `yarn start dev`;
                const output = `yarn run v1.22.17
			warning ../../package.json: No license field
			Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
				at Server.setupListenHandle [as _listen2] (node:net:1315:16)
				at listenInCluster (node:net:1363:12)
				at doListen (node:net:1501:7)
				at processTicksAndRejections (node:internal/process/task_queues:84:21)
			Emitted 'error' event on WebSocketServer instance at:
				at Server.emit (node:events:394:28)
				at emitErrorNT (node:net:1342:8)
				at processTicksAndRejections (node:internal/process/task_queues:83:21) {
			}
			error Command failed with exit code 1.
			info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.`;
                const actionOptions = [{
                        id: 'Free Port',
                        label: 'Free port 3000',
                        run: true,
                        tooltip: 'Free port 3000',
                        enabled: true
                    }];
                setup(() => {
                    const command = freePort(() => Promise.resolve());
                    expectedMap.set(command.commandLineMatcher.toString(), [command]);
                    quickFixAddon.registerCommandFinishedListener(command);
                });
                suite('returns undefined when', () => {
                    test('output does not match', async () => {
                        strictEqual((await getQuickFixesForCommand([], terminal, createCommand(portCommand, `invalid output`, FreePortOutputRegex), expectedMap, commandService, openerService, labelService)), undefined);
                    });
                });
                test('returns actions', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(portCommand, output, FreePortOutputRegex), expectedMap, commandService, openerService, labelService)), actionOptions);
                });
            });
        }
        suite('gitPushSetUpstream', () => {
            const expectedMap = new Map();
            const command = `git push`;
            const output = `fatal: The current branch test22 has no upstream branch.
			To push the current branch and set the remote as upstream, use

				git push --set-upstream origin test22`;
            const exitCode = 128;
            const actions = [{
                    id: 'Git Push Set Upstream',
                    enabled: true,
                    label: 'Run: git push --set-upstream origin test22',
                    tooltip: 'Run: git push --set-upstream origin test22',
                    command: 'git push --set-upstream origin test22'
                }];
            setup(() => {
                const command = gitPushSetUpstream();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
                });
                test('command does not match', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(`git status`, output, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
                });
            });
            suite('returns actions when', () => {
                test('expected unix exit code', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), actions);
                });
                test('matching exit status', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitPushOutputRegex, 2), expectedMap, commandService, openerService, labelService)), actions);
                });
            });
        });
        suite('gitCreatePr', () => {
            const expectedMap = new Map();
            const command = `git push`;
            const output = `Total 0 (delta 0), reused 0 (delta 0), pack-reused 0
			remote:
			remote: Create a pull request for 'test22' on GitHub by visiting:
			remote:      https://github.com/meganrogge/xterm.js/pull/new/test22
			remote:
			To https://github.com/meganrogge/xterm.js
			 * [new branch]        test22 -> test22
			Branch 'test22' set up to track remote branch 'test22' from 'origin'. `;
            const exitCode = 0;
            const actions = [{
                    id: 'Git Create Pr',
                    enabled: true,
                    label: 'Open: https://github.com/meganrogge/xterm.js/pull/new/test22',
                    tooltip: 'Open: https://github.com/meganrogge/xterm.js/pull/new/test22',
                    uri: URI.parse('https://github.com/meganrogge/xterm.js/pull/new/test22')
                }];
            setup(() => {
                const command = gitCreatePr();
                expectedMap.set(command.commandLineMatcher.toString(), [command]);
                quickFixAddon.registerCommandFinishedListener(command);
            });
            suite('returns undefined when', () => {
                test('output does not match', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitCreatePrOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
                });
                test('command does not match', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(`git status`, output, GitCreatePrOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
                });
                test('failure exit status', async () => {
                    strictEqual((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitCreatePrOutputRegex, 2), expectedMap, commandService, openerService, labelService)), undefined);
                });
            });
            suite('returns actions when', () => {
                test('expected unix exit code', async () => {
                    assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitCreatePrOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), actions);
                });
            });
        });
    });
    suite('gitPush - multiple providers', () => {
        const expectedMap = new Map();
        const command = `git push`;
        const output = `fatal: The current branch test22 has no upstream branch.
		To push the current branch and set the remote as upstream, use

			git push --set-upstream origin test22`;
        const exitCode = 128;
        const actions = [{
                id: 'Git Push Set Upstream',
                enabled: true,
                label: 'Run: git push --set-upstream origin test22',
                tooltip: 'Run: git push --set-upstream origin test22',
                command: 'git push --set-upstream origin test22'
            }];
        setup(() => {
            const pushCommand = gitPushSetUpstream();
            const prCommand = gitCreatePr();
            quickFixAddon.registerCommandFinishedListener(prCommand);
            expectedMap.set(pushCommand.commandLineMatcher.toString(), [pushCommand, prCommand]);
        });
        suite('returns undefined when', () => {
            test('output does not match', async () => {
                strictEqual((await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
            });
            test('command does not match', async () => {
                strictEqual((await getQuickFixesForCommand([], terminal, createCommand(`git status`, output, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
            });
        });
        suite('returns actions when', () => {
            test('expected unix exit code', async () => {
                assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitPushOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), actions);
            });
            test('matching exit status', async () => {
                assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, GitPushOutputRegex, 2), expectedMap, commandService, openerService, labelService)), actions);
            });
        });
    });
    suite('pwsh feedback providers', () => {
        suite('General', () => {
            const expectedMap = new Map();
            const command = `not important`;
            const output = [
                `...`,
                ``,
                `Suggestion [General]:`,
                `  The most similar commands are: python3, python3m, pamon, python3.6, rtmon, echo, pushd, etsn, pwsh, pwconv.`,
                ``,
                `Suggestion [cmd-not-found]:`,
                `  Command 'python' not found, but can be installed with:`,
                `  sudo apt install python3`,
                `  sudo apt install python`,
                `  sudo apt install python-minimal`,
                `  You also have python3 installed, you can run 'python3' instead.'`,
                ``,
            ].join('\n');
            const exitCode = 128;
            const actions = [
                'python3',
                'python3m',
                'pamon',
                'python3.6',
                'rtmon',
                'echo',
                'pushd',
                'etsn',
                'pwsh',
                'pwconv',
            ].map(command => {
                return {
                    id: 'Pwsh General Error',
                    enabled: true,
                    label: `Run: ${command}`,
                    tooltip: `Run: ${command}`,
                    command: command
                };
            });
            setup(() => {
                const pushCommand = pwshGeneralError();
                quickFixAddon.registerCommandFinishedListener(pushCommand);
                expectedMap.set(pushCommand.commandLineMatcher.toString(), [pushCommand]);
            });
            test('returns undefined when output does not match', async () => {
                strictEqual((await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, PwshGeneralErrorOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
            });
            test('returns actions when output matches', async () => {
                assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, PwshGeneralErrorOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), actions);
            });
        });
        suite('Unix cmd-not-found', () => {
            const expectedMap = new Map();
            const command = `not important`;
            const output = [
                `...`,
                ``,
                `Suggestion [General]`,
                `  The most similar commands are: python3, python3m, pamon, python3.6, rtmon, echo, pushd, etsn, pwsh, pwconv.`,
                ``,
                `Suggestion [cmd-not-found]:`,
                `  Command 'python' not found, but can be installed with:`,
                `  sudo apt install python3`,
                `  sudo apt install python`,
                `  sudo apt install python-minimal`,
                `  You also have python3 installed, you can run 'python3' instead.'`,
                ``,
            ].join('\n');
            const exitCode = 128;
            const actions = [
                'sudo apt install python3',
                'sudo apt install python',
                'sudo apt install python-minimal',
                'python3',
            ].map(command => {
                return {
                    id: 'Pwsh Unix Command Not Found Error',
                    enabled: true,
                    label: `Run: ${command}`,
                    tooltip: `Run: ${command}`,
                    command: command
                };
            });
            setup(() => {
                const pushCommand = pwshUnixCommandNotFoundError();
                quickFixAddon.registerCommandFinishedListener(pushCommand);
                expectedMap.set(pushCommand.commandLineMatcher.toString(), [pushCommand]);
            });
            test('returns undefined when output does not match', async () => {
                strictEqual((await getQuickFixesForCommand([], terminal, createCommand(command, `invalid output`, PwshUnixCommandNotFoundErrorOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), undefined);
            });
            test('returns actions when output matches', async () => {
                assertMatchOptions((await getQuickFixesForCommand([], terminal, createCommand(command, output, PwshUnixCommandNotFoundErrorOutputRegex, exitCode), expectedMap, commandService, openerService, labelService)), actions);
            });
        });
    });
});
function createCommand(command, output, outputMatcher, exitCode, outputLines) {
    return {
        cwd: '',
        commandStartLineContent: '',
        markProperties: {},
        executedX: undefined,
        startX: undefined,
        command,
        isTrusted: true,
        exitCode,
        getOutput: () => { return output; },
        getOutputMatch: (_matcher) => {
            if (outputMatcher) {
                const regexMatch = output.match(outputMatcher) ?? undefined;
                if (regexMatch) {
                    return outputLines ? { regexMatch, outputLines } : { regexMatch, outputLines: [] };
                }
            }
            return undefined;
        },
        timestamp: Date.now(),
        hasOutput: () => !!output
    };
}
function assertMatchOptions(actual, expected) {
    strictEqual(actual?.length, expected.length);
    for (let i = 0; i < expected.length; i++) {
        const expectedItem = expected[i];
        const actualItem = actual[i];
        strictEqual(actualItem.id, expectedItem.id, `ID`);
        strictEqual(actualItem.enabled, expectedItem.enabled, `enabled`);
        strictEqual(actualItem.label, expectedItem.label, `label`);
        strictEqual(actualItem.tooltip, expectedItem.tooltip, `tooltip`);
        if (expectedItem.command) {
            strictEqual(actualItem.command, expectedItem.command);
        }
        if (expectedItem.uri) {
            strictEqual(actualItem.uri.toString(), expectedItem.uri.toString());
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tGaXhBZGRvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3F1aWNrRml4L3Rlc3QvYnJvd3Nlci9xdWlja0ZpeEFkZG9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNyQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRixPQUFPLEVBQUUsY0FB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