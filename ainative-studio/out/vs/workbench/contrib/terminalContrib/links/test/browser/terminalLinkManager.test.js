/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { equals } from '../../../../../../base/common/arrays.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextMenuService } from '../../../../../../platform/contextview/browser/contextMenuService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { IViewDescriptorService } from '../../../../../common/views.js';
import { TerminalLinkManager } from '../../browser/terminalLinkManager.js';
import { TestViewDescriptorService } from '../../../../terminal/test/browser/xterm/xtermTerminal.test.js';
import { TestStorageService } from '../../../../../test/common/workbenchTestServices.js';
import { TerminalLinkResolver } from '../../browser/terminalLinkResolver.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
const defaultTerminalConfig = {
    fontFamily: 'monospace',
    fontWeight: 'normal',
    fontWeightBold: 'normal',
    gpuAcceleration: 'off',
    scrollback: 1000,
    fastScrollSensitivity: 2,
    mouseWheelScrollSensitivity: 1,
    unicodeVersion: '11',
    wordSeparators: ' ()[]{}\',"`─‘’“”'
};
class TestLinkManager extends TerminalLinkManager {
    async _getLinksForType(y, type) {
        switch (type) {
            case 'word':
                return this._links?.wordLinks?.[y] ? [this._links?.wordLinks?.[y]] : undefined;
            case 'url':
                return this._links?.webLinks?.[y] ? [this._links?.webLinks?.[y]] : undefined;
            case 'localFile':
                return this._links?.fileLinks?.[y] ? [this._links?.fileLinks?.[y]] : undefined;
        }
    }
    setLinks(links) {
        this._links = links;
    }
}
suite('TerminalLinkManager', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let themeService;
    let viewDescriptorService;
    let xterm;
    let linkManager;
    setup(async () => {
        configurationService = new TestConfigurationService({
            editor: {
                fastScrollSensitivity: 2,
                mouseWheelScrollSensitivity: 1
            },
            terminal: {
                integrated: defaultTerminalConfig
            }
        });
        themeService = new TestThemeService();
        viewDescriptorService = new TestViewDescriptorService();
        instantiationService = store.add(new TestInstantiationService());
        instantiationService.stub(IContextMenuService, store.add(instantiationService.createInstance(ContextMenuService)));
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IStorageService, store.add(new TestStorageService()));
        instantiationService.stub(IThemeService, themeService);
        instantiationService.stub(IViewDescriptorService, viewDescriptorService);
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 }));
        linkManager = store.add(instantiationService.createInstance(TestLinkManager, xterm, upcastPartial({
            get initialCwd() {
                return '';
            }
        }), {
            get(capability) {
                return undefined;
            }
        }, instantiationService.createInstance(TerminalLinkResolver)));
    });
    suite('registerExternalLinkProvider', () => {
        test('should not leak disposables if the link manager is already disposed', () => {
            linkManager.externalProvideLinksCb = async () => undefined;
            linkManager.dispose();
            linkManager.externalProvideLinksCb = async () => undefined;
        });
    });
    suite('getLinks and open recent link', () => {
        test('should return no links', async () => {
            const links = await linkManager.getLinks();
            equals(links.viewport.webLinks, []);
            equals(links.viewport.wordLinks, []);
            equals(links.viewport.fileLinks, []);
            const webLink = await linkManager.openRecentLink('url');
            strictEqual(webLink, undefined);
            const fileLink = await linkManager.openRecentLink('localFile');
            strictEqual(fileLink, undefined);
        });
        test('should return word links in order', async () => {
            const link1 = {
                range: {
                    start: { x: 1, y: 1 }, end: { x: 14, y: 1 }
                },
                text: '1_我是学生.txt',
                activate: () => Promise.resolve('')
            };
            const link2 = {
                range: {
                    start: { x: 1, y: 1 }, end: { x: 14, y: 1 }
                },
                text: '2_我是学生.txt',
                activate: () => Promise.resolve('')
            };
            linkManager.setLinks({ wordLinks: [link1, link2] });
            const links = await linkManager.getLinks();
            deepStrictEqual(links.viewport.wordLinks?.[0].text, link2.text);
            deepStrictEqual(links.viewport.wordLinks?.[1].text, link1.text);
            const webLink = await linkManager.openRecentLink('url');
            strictEqual(webLink, undefined);
            const fileLink = await linkManager.openRecentLink('localFile');
            strictEqual(fileLink, undefined);
        });
        test('should return web links in order', async () => {
            const link1 = {
                range: { start: { x: 5, y: 1 }, end: { x: 40, y: 1 } },
                text: 'https://foo.bar/[this is foo site 1]',
                activate: () => Promise.resolve('')
            };
            const link2 = {
                range: { start: { x: 5, y: 2 }, end: { x: 40, y: 2 } },
                text: 'https://foo.bar/[this is foo site 2]',
                activate: () => Promise.resolve('')
            };
            linkManager.setLinks({ webLinks: [link1, link2] });
            const links = await linkManager.getLinks();
            deepStrictEqual(links.viewport.webLinks?.[0].text, link2.text);
            deepStrictEqual(links.viewport.webLinks?.[1].text, link1.text);
            const webLink = await linkManager.openRecentLink('url');
            strictEqual(webLink, link2);
            const fileLink = await linkManager.openRecentLink('localFile');
            strictEqual(fileLink, undefined);
        });
        test('should return file links in order', async () => {
            const link1 = {
                range: { start: { x: 1, y: 1 }, end: { x: 32, y: 1 } },
                text: 'file:///C:/users/test/file_1.txt',
                activate: () => Promise.resolve('')
            };
            const link2 = {
                range: { start: { x: 1, y: 2 }, end: { x: 32, y: 2 } },
                text: 'file:///C:/users/test/file_2.txt',
                activate: () => Promise.resolve('')
            };
            linkManager.setLinks({ fileLinks: [link1, link2] });
            const links = await linkManager.getLinks();
            deepStrictEqual(links.viewport.fileLinks?.[0].text, link2.text);
            deepStrictEqual(links.viewport.fileLinks?.[1].text, link1.text);
            const webLink = await linkManager.openRecentLink('url');
            strictEqual(webLink, undefined);
            linkManager.setLinks({ fileLinks: [link2] });
            const fileLink = await linkManager.openRecentLink('localFile');
            strictEqual(fileLink, link2);
        });
    });
});
function upcastPartial(v) {
    return v;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbExpbmtNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNwRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RSxPQUFPLEVBQWtCLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHM0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0RBQStELENB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