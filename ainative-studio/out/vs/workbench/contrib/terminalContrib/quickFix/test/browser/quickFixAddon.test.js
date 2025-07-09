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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tGaXhBZGRvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9xdWlja0ZpeC90ZXN0L2Jyb3dzZXIvcXVpY2tGaXhBZGRvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDckMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDMUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGNB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