/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { ContextMenuService } from '../../../../../../platform/contextview/browser/contextMenuService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILayoutService } from '../../../../../../platform/layout/browser/layoutService.js';
import { ILoggerService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { writeP } from '../../../../terminal/browser/terminalTestHelpers.js';
import { XtermTerminal } from '../../../../terminal/browser/xterm/xtermTerminal.js';
import { BufferContentTracker } from '../../browser/bufferContentTracker.js';
import { ILifecycleService } from '../../../../../services/lifecycle/common/lifecycle.js';
import { TestLayoutService, TestLifecycleService } from '../../../../../test/browser/workbenchTestServices.js';
import { TestLoggerService } from '../../../../../test/common/workbenchTestServices.js';
import { IAccessibilitySignalService } from '../../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ITerminalConfigurationService } from '../../../../terminal/browser/terminal.js';
import { TerminalConfigurationService } from '../../../../terminal/browser/terminalConfigurationService.js';
const defaultTerminalConfig = {
    fontFamily: 'monospace',
    fontWeight: 'normal',
    fontWeightBold: 'normal',
    gpuAcceleration: 'off',
    scrollback: 1000,
    fastScrollSensitivity: 2,
    mouseWheelScrollSensitivity: 1,
    unicodeVersion: '6'
};
suite('Buffer Content Tracker', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let themeService;
    let xterm;
    let capabilities;
    let bufferTracker;
    const prompt = 'vscode-git:(prompt/more-tests)';
    const promptPlusData = 'vscode-git:(prompt/more-tests) ' + 'some data';
    setup(async () => {
        configurationService = new TestConfigurationService({ terminal: { integrated: defaultTerminalConfig } });
        instantiationService = store.add(new TestInstantiationService());
        themeService = new TestThemeService();
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(ITerminalConfigurationService, store.add(instantiationService.createInstance(TerminalConfigurationService)));
        instantiationService.stub(IThemeService, themeService);
        instantiationService.stub(ITerminalLogService, new NullLogService());
        instantiationService.stub(ILoggerService, store.add(new TestLoggerService()));
        instantiationService.stub(IContextMenuService, store.add(instantiationService.createInstance(ContextMenuService)));
        instantiationService.stub(ILifecycleService, store.add(new TestLifecycleService()));
        instantiationService.stub(IContextKeyService, store.add(new MockContextKeyService()));
        instantiationService.stub(IAccessibilitySignalService, {
            playSignal: async () => { },
            isSoundEnabled(signal) { return false; },
        });
        instantiationService.stub(ILayoutService, new TestLayoutService());
        capabilities = store.add(new TerminalCapabilityStore());
        if (!isWindows) {
            capabilities.add(1 /* TerminalCapability.NaiveCwdDetection */, null);
        }
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(instantiationService.createInstance(XtermTerminal, TerminalCtor, {
            cols: 80,
            rows: 30,
            xtermColorProvider: { getBackgroundColor: () => undefined },
            capabilities,
            disableShellIntegrationReporting: true
        }));
        const container = document.createElement('div');
        xterm.raw.open(container);
        configurationService = new TestConfigurationService({ terminal: { integrated: { tabs: { separator: ' - ', title: '${cwd}', description: '${cwd}' } } } });
        bufferTracker = store.add(instantiationService.createInstance(BufferContentTracker, xterm));
    });
    test('should not clear the prompt line', async () => {
        assert.strictEqual(bufferTracker.lines.length, 0);
        await writeP(xterm.raw, prompt);
        xterm.clearBuffer();
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
    });
    test('repeated updates should not change the content', async () => {
        assert.strictEqual(bufferTracker.lines.length, 0);
        await writeP(xterm.raw, prompt);
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
    });
    test('should add lines in the viewport and scrollback', async () => {
        await writeAndAssertBufferState(promptPlusData, 38, xterm.raw, bufferTracker);
    });
    test('should add lines in the viewport and full scrollback', async () => {
        await writeAndAssertBufferState(promptPlusData, 1030, xterm.raw, bufferTracker);
    });
    test('should refresh viewport', async () => {
        await writeAndAssertBufferState(promptPlusData, 6, xterm.raw, bufferTracker);
        await writeP(xterm.raw, '\x1b[3Ainserteddata');
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [promptPlusData, promptPlusData, `${promptPlusData}inserteddata`, promptPlusData, promptPlusData, promptPlusData]);
    });
    test('should refresh viewport with full scrollback', async () => {
        const content = `${prompt}\r\n`.repeat(1030).trimEnd();
        await writeP(xterm.raw, content);
        bufferTracker.update();
        await writeP(xterm.raw, '\x1b[4Ainsertion');
        bufferTracker.update();
        const expected = content.split('\r\n');
        expected[1025] = `${prompt}insertion`;
        assert.deepStrictEqual(bufferTracker.lines[1025], `${prompt}insertion`);
    });
    test('should cap the size of the cached lines, removing old lines in favor of new lines', async () => {
        const content = `${prompt}\r\n`.repeat(1036).trimEnd();
        await writeP(xterm.raw, content);
        bufferTracker.update();
        const expected = content.split('\r\n');
        // delete the 6 lines that should be trimmed
        for (let i = 0; i < 6; i++) {
            expected.pop();
        }
        // insert a new character
        await writeP(xterm.raw, '\x1b[2Ainsertion');
        bufferTracker.update();
        expected[1027] = `${prompt}insertion`;
        assert.strictEqual(bufferTracker.lines.length, expected.length);
        assert.deepStrictEqual(bufferTracker.lines, expected);
    });
});
async function writeAndAssertBufferState(data, rows, terminal, bufferTracker) {
    const content = `${data}\r\n`.repeat(rows).trimEnd();
    await writeP(terminal, content);
    bufferTracker.update();
    assert.strictEqual(bufferTracker.lines.length, rows);
    assert.deepStrictEqual(bufferTracker.lines, content.split('\r\n'));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyQ29udGVudFRyYWNrZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYWNjZXNzaWJpbGl0eS90ZXN0L2Jyb3dzZXIvYnVmZmVyQ29udGVudFRyYWNrZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM1RixPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRTlGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQzdI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