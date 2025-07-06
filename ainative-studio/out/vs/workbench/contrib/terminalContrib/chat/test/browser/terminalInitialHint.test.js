/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ShellIntegrationAddon } from '../../../../../../platform/terminal/common/xterm/shellIntegrationAddon.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { InitialHintAddon } from '../../browser/terminal.initialHint.contribution.js';
import { getActiveDocument } from '../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { strictEqual } from 'assert';
import { ExtensionIdentifier } from '../../../../../../platform/extensions/common/extensions.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
suite('Terminal Initial Hint Addon', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let eventCount = 0;
    let xterm;
    let initialHintAddon;
    const onDidChangeAgentsEmitter = new Emitter();
    const onDidChangeAgents = onDidChangeAgentsEmitter.event;
    const agent = {
        id: 'termminal',
        name: 'terminal',
        extensionId: new ExtensionIdentifier('test'),
        extensionPublisherId: 'test',
        extensionDisplayName: 'test',
        metadata: {},
        slashCommands: [{ name: 'test', description: 'test' }],
        disambiguation: [],
        locations: [ChatAgentLocation.fromRaw('terminal')],
        invoke: async () => { return {}; }
    };
    const editorAgent = {
        id: 'editor',
        name: 'editor',
        extensionId: new ExtensionIdentifier('test-editor'),
        extensionPublisherId: 'test-editor',
        extensionDisplayName: 'test-editor',
        metadata: {},
        slashCommands: [{ name: 'test', description: 'test' }],
        locations: [ChatAgentLocation.fromRaw('editor')],
        disambiguation: [],
        invoke: async () => { return {}; }
    };
    setup(async () => {
        const instantiationService = workbenchInstantiationService({}, store);
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor());
        const shellIntegrationAddon = store.add(new ShellIntegrationAddon('', true, undefined, new NullLogService));
        initialHintAddon = store.add(instantiationService.createInstance(InitialHintAddon, shellIntegrationAddon.capabilities, onDidChangeAgents));
        store.add(initialHintAddon.onDidRequestCreateHint(() => eventCount++));
        const testContainer = document.createElement('div');
        getActiveDocument().body.append(testContainer);
        xterm.open(testContainer);
        xterm.loadAddon(shellIntegrationAddon);
        xterm.loadAddon(initialHintAddon);
    });
    suite('Chat providers', () => {
        test('hint is not shown when there are no chat providers', () => {
            eventCount = 0;
            xterm.focus();
            strictEqual(eventCount, 0);
        });
        test('hint is not shown when there is just an editor agent', () => {
            eventCount = 0;
            onDidChangeAgentsEmitter.fire(editorAgent);
            xterm.focus();
            strictEqual(eventCount, 0);
        });
        test('hint is shown when there is a terminal chat agent', () => {
            eventCount = 0;
            onDidChangeAgentsEmitter.fire(editorAgent);
            xterm.focus();
            strictEqual(eventCount, 0);
            onDidChangeAgentsEmitter.fire(agent);
            strictEqual(eventCount, 1);
        });
        test('hint is not shown again when another terminal chat agent is added if it has already shown', () => {
            eventCount = 0;
            onDidChangeAgentsEmitter.fire(agent);
            xterm.focus();
            strictEqual(eventCount, 1);
            onDidChangeAgentsEmitter.fire(agent);
            strictEqual(eventCount, 1);
        });
    });
    suite('Input', () => {
        test('hint is not shown when there has been input', () => {
            onDidChangeAgentsEmitter.fire(agent);
            xterm.writeln('data');
            setTimeout(() => {
                xterm.focus();
                strictEqual(eventCount, 0);
            }, 50);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbml0aWFsSGludC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvdGVzdC9icm93c2VyL3Rlcm1pbmFsSW5pdGlhbEhpbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUNsSCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDckMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFakcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFekUsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQ3hELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztJQUNuQixJQUFJLEtBQWUsQ0FBQztJQUNwQixJQUFJLGdCQUFrQyxDQUFD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