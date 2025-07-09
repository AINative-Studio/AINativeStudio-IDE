/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../../../../platform/dialogs/test/common/testDialogService.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { shouldPasteTerminalText } from '../../browser/terminalClipboard.js';
suite('TerminalClipboard', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('shouldPasteTerminalText', () => {
        let instantiationService;
        let configurationService;
        setup(async () => {
            instantiationService = store.add(new TestInstantiationService());
            configurationService = new TestConfigurationService({
                ["terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */]: 'auto'
            });
            instantiationService.stub(IConfigurationService, configurationService);
            instantiationService.stub(IDialogService, new TestDialogService(undefined, { result: { confirmed: false } }));
        });
        function setConfigValue(value) {
            configurationService = new TestConfigurationService({
                ["terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */]: value
            });
            instantiationService.stub(IConfigurationService, configurationService);
        }
        test('Single line string', async () => {
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo', undefined), true);
            setConfigValue('always');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo', undefined), true);
            setConfigValue('never');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo', undefined), true);
        });
        test('Single line string with trailing new line', async () => {
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\n', undefined), true);
            setConfigValue('always');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\n', undefined), false);
            setConfigValue('never');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\n', undefined), true);
        });
        test('Multi-line string', async () => {
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), false);
            setConfigValue('always');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), false);
            setConfigValue('never');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), true);
        });
        test('Bracketed paste mode', async () => {
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
            setConfigValue('always');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), false);
            setConfigValue('never');
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
        });
        test('Legacy config', async () => {
            setConfigValue(true); // 'auto'
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), false);
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
            setConfigValue(false); // 'never'
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
        });
        test('Invalid config', async () => {
            setConfigValue(123);
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', undefined), false);
            strictEqual(await instantiationService.invokeFunction(shouldPasteTerminalText, 'foo\nbar', true), true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDbGlwYm9hcmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2xpcGJvYXJkL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbENsaXBib2FyZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDckMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBRTVILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdFLEtBQUssQ0FBQyxtQkFBbUIsRUFBRTtJQUMxQixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDckMsSUFBSSxvQkFBOEMsQ0FBQztRQUNuRCxJQUFJLG9CQUE4QyxDQUFDO1FBRW5ELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNoQixvQkFBb0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLENBQUM7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