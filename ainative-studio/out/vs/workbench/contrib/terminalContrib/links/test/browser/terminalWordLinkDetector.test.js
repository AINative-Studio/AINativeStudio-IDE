/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { TerminalWordLinkDetector } from '../../browser/terminalWordLinkDetector.js';
import { assertLinkHelper } from './linkTestUtils.js';
import { TestProductService } from '../../../../../test/common/workbenchTestServices.js';
suite('Workbench - TerminalWordLinkDetector', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let configurationService;
    let detector;
    let xterm;
    let instantiationService;
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: '' } });
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.set(IProductService, TestProductService);
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 }));
        detector = store.add(instantiationService.createInstance(TerminalWordLinkDetector, xterm));
    });
    async function assertLink(text, expected) {
        await assertLinkHelper(text, expected, detector, "Search" /* TerminalBuiltinLinkType.Search */);
    }
    suite('should link words as defined by wordSeparators', () => {
        test('" ()[]"', async () => {
            await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ()[]' } });
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
            await assertLink('foo', [{ range: [[1, 1], [3, 1]], text: 'foo' }]);
            await assertLink(' foo ', [{ range: [[2, 1], [4, 1]], text: 'foo' }]);
            await assertLink('(foo)', [{ range: [[2, 1], [4, 1]], text: 'foo' }]);
            await assertLink('[foo]', [{ range: [[2, 1], [4, 1]], text: 'foo' }]);
            await assertLink('{foo}', [{ range: [[1, 1], [5, 1]], text: '{foo}' }]);
        });
        test('" "', async () => {
            await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ' } });
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
            await assertLink('foo', [{ range: [[1, 1], [3, 1]], text: 'foo' }]);
            await assertLink(' foo ', [{ range: [[2, 1], [4, 1]], text: 'foo' }]);
            await assertLink('(foo)', [{ range: [[1, 1], [5, 1]], text: '(foo)' }]);
            await assertLink('[foo]', [{ range: [[1, 1], [5, 1]], text: '[foo]' }]);
            await assertLink('{foo}', [{ range: [[1, 1], [5, 1]], text: '{foo}' }]);
        });
        test('" []"', async () => {
            await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' []' } });
            configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
            await assertLink('aabbccdd.txt ', [{ range: [[1, 1], [12, 1]], text: 'aabbccdd.txt' }]);
            await assertLink(' aabbccdd.txt ', [{ range: [[2, 1], [13, 1]], text: 'aabbccdd.txt' }]);
            await assertLink(' [aabbccdd.txt] ', [{ range: [[3, 1], [14, 1]], text: 'aabbccdd.txt' }]);
        });
    });
    suite('should ignore powerline symbols', () => {
        for (let i = 0xe0b0; i <= 0xe0bf; i++) {
            test(`\\u${i.toString(16)}`, async () => {
                await assertLink(`${String.fromCharCode(i)}foo${String.fromCharCode(i)}`, [{ range: [[2, 1], [4, 1]], text: 'foo' }]);
            });
        }
    });
    // These are failing - the link's start x is 1 px too far to the right bc it starts
    // with a wide character, which the terminalLinkHelper currently doesn't account for
    test.skip('should support wide characters', async () => {
        await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' []' } });
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
        await assertLink('我是学生.txt ', [{ range: [[1, 1], [12, 1]], text: '我是学生.txt' }]);
        await assertLink(' 我是学生.txt ', [{ range: [[2, 1], [13, 1]], text: '我是学生.txt' }]);
        await assertLink(' [我是学生.txt] ', [{ range: [[3, 1], [14, 1]], text: '我是学生.txt' }]);
    });
    test('should support multiple link results', async () => {
        await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ' } });
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
        await assertLink('foo bar', [
            { range: [[1, 1], [3, 1]], text: 'foo' },
            { range: [[5, 1], [7, 1]], text: 'bar' }
        ]);
    });
    test('should remove trailing colon in the link results', async () => {
        await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ' } });
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
        await assertLink('foo:5:6: bar:0:32:', [
            { range: [[1, 1], [7, 1]], text: 'foo:5:6' },
            { range: [[10, 1], [17, 1]], text: 'bar:0:32' }
        ]);
    });
    test('should support wrapping', async () => {
        await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ' } });
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
        await assertLink('fsdjfsdkfjslkdfjskdfjsldkfjsdlkfjslkdjfskldjflskdfjskldjflskdfjsdklfjsdklfjsldkfjsdlkfjsdlkfjsdlkfjsldkfjslkdfjsdlkfjsldkfjsdlkfjskdfjsldkfjsdlkfjslkdfjsdlkfjsldkfjsldkfjsldkfjslkdfjsdlkfjslkdfjsdklfsd', [
            { range: [[1, 1], [41, 3]], text: 'fsdjfsdkfjslkdfjskdfjsldkfjsdlkfjslkdjfskldjflskdfjskldjflskdfjsdklfjsdklfjsldkfjsdlkfjsdlkfjsdlkfjsldkfjslkdfjsdlkfjsldkfjsdlkfjskdfjsldkfjsdlkfjslkdfjsdlkfjsldkfjsldkfjsldkfjslkdfjsdlkfjslkdfjsdklfsd' },
        ]);
    });
    test('should support wrapping with multiple links', async () => {
        await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ' } });
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
        await assertLink('fsdjfsdkfjslkdfjskdfjsldkfj sdlkfjslkdjfskldjflskdfjskldjflskdfj sdklfjsdklfjsldkfjsdlkfjsdlkfjsdlkfjsldkfjslkdfjsdlkfjsldkfjsdlkfjskdfjsldkfjsdlkfjslkdfjsdlkfjsldkfjsldkfjsldkfjslkdfjsdlkfjslkdfjsdklfsd', [
            { range: [[1, 1], [27, 1]], text: 'fsdjfsdkfjslkdfjskdfjsldkfj' },
            { range: [[29, 1], [64, 1]], text: 'sdlkfjslkdjfskldjflskdfjskldjflskdfj' },
            { range: [[66, 1], [43, 3]], text: 'sdklfjsdklfjsldkfjsdlkfjsdlkfjsdlkfjsldkfjslkdfjsdlkfjsldkfjsdlkfjskdfjsldkfjsdlkfjslkdfjsdlkfjsldkfjsldkfjsldkfjslkdfjsdlkfjslkdfjsdklfsd' }
        ]);
    });
    test('does not return any links for empty text', async () => {
        await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ' } });
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
        await assertLink('', []);
    });
    test('should support file scheme links', async () => {
        await configurationService.setUserConfiguration('terminal', { integrated: { wordSeparators: ' ' } });
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
        await assertLink('file:///C:/users/test/file.txt ', [{ range: [[1, 1], [30, 1]], text: 'file:///C:/users/test/file.txt' }]);
        await assertLink('file:///C:/users/test/file.txt:1:10 ', [{ range: [[1, 1], [35, 1]], text: 'file:///C:/users/test/file.txt:1:10' }]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxXb3JkTGlua0RldGVjdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbFdvcmRMaW5rRGV0ZWN0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFOUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFHekYsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtJQUNsRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxRQUFrQyxDQUFDO0lBQ3ZDLElBQUksS0FBZSxDQUFDO0lBQ3BCLElBQUksb0JBQThDLENBQUM7SUFFbkQsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7UUFDakUsb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQ3RELE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFLEVBQUUsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVwRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN2RSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFFOUQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFNLG1CQUFtQixDQUFnQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDekgsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLFFBQVEsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzVGLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxVQUFVLFVBQVUsQ0FDeEIsSUFBWSxFQUNaLFFBQStFO1FBRS9FLE1BQU0sZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLGdEQUFpQyxDQUFDO0lBQ2xGLENBQUM7SUFFRCxLQUFLLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1FBQzVELElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUIsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pHLG9CQUFvQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxFQUFFLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBUyxDQUFDLENBQUM7WUFDdkcsTUFBTSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEUsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEUsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEUsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEUsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekUsQ0FBQyxDQUFDLENB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