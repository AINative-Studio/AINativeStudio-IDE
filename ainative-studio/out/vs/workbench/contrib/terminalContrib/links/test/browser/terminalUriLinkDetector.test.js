/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { TerminalLinkResolver } from '../../browser/terminalLinkResolver.js';
import { TerminalUriLinkDetector } from '../../browser/terminalUriLinkDetector.js';
import { assertLinkHelper } from './linkTestUtils.js';
import { createFileStat } from '../../../../../test/common/workbenchTestServices.js';
import { URI } from '../../../../../../base/common/uri.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
suite('Workbench - TerminalUriLinkDetector', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let configurationService;
    let detector;
    let xterm;
    let validResources = [];
    let instantiationService;
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        configurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IFileService, {
            async stat(resource) {
                if (!validResources.map(e => e.path).includes(resource.path)) {
                    throw new Error('Doesn\'t exist');
                }
                return createFileStat(resource);
            }
        });
        instantiationService.stub(ITerminalLogService, new NullLogService());
        validResources = [];
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 });
        detector = instantiationService.createInstance(TerminalUriLinkDetector, xterm, {
            initialCwd: '/parent/cwd',
            os: 3 /* OperatingSystem.Linux */,
            remoteAuthority: undefined,
            userHome: '/home',
            backend: undefined
        }, instantiationService.createInstance(TerminalLinkResolver));
    });
    teardown(() => {
        instantiationService.dispose();
    });
    async function assertLink(type, text, expected) {
        await assertLinkHelper(text, expected, detector, type);
    }
    const linkComputerCases = [
        ["Url" /* TerminalBuiltinLinkType.Url */, 'x = "http://foo.bar";', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'x = (http://foo.bar);', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'x = \'http://foo.bar\';', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'x =  http://foo.bar ;', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'x = <http://foo.bar>;', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'x = {http://foo.bar};', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '(see http://foo.bar)', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '[see http://foo.bar]', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '{see http://foo.bar}', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '<see http://foo.bar>', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '<url>http://foo.bar</url>', [{ range: [[6, 1], [19, 1]], uri: URI.parse('http://foo.bar') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '// Click here to learn more. https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409', [{ range: [[30, 1], [7, 2]], uri: URI.parse('https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '// Click here to learn more. https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx', [{ range: [[30, 1], [28, 2]], uri: URI.parse('https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '// https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js', [{ range: [[4, 1], [9, 2]], uri: URI.parse('https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '<!-- !!! Do not remove !!!   WebContentRef(link:https://go.microsoft.com/fwlink/?LinkId=166007, area:Admin, updated:2015, nextUpdate:2016, tags:SqlServer)   !!! Do not remove !!! -->', [{ range: [[49, 1], [14, 2]], uri: URI.parse('https://go.microsoft.com/fwlink/?LinkId=166007') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'For instructions, see https://go.microsoft.com/fwlink/?LinkId=166007.</value>', [{ range: [[23, 1], [68, 1]], uri: URI.parse('https://go.microsoft.com/fwlink/?LinkId=166007') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'For instructions, see https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx.</value>', [{ range: [[23, 1], [21, 2]], uri: URI.parse('https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'x = "https://en.wikipedia.org/wiki/Zürich";', [{ range: [[6, 1], [41, 1]], uri: URI.parse('https://en.wikipedia.org/wiki/Zürich') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '請參閱 http://go.microsoft.com/fwlink/?LinkId=761051。', [{ range: [[8, 1], [53, 1]], uri: URI.parse('http://go.microsoft.com/fwlink/?LinkId=761051') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '（請參閱 http://go.microsoft.com/fwlink/?LinkId=761051）', [{ range: [[10, 1], [55, 1]], uri: URI.parse('http://go.microsoft.com/fwlink/?LinkId=761051') }]],
        ["LocalFile" /* TerminalBuiltinLinkType.LocalFile */, 'x = "file:///foo.bar";', [{ range: [[6, 1], [20, 1]], uri: URI.parse('file:///foo.bar') }], URI.parse('file:///foo.bar')],
        ["LocalFile" /* TerminalBuiltinLinkType.LocalFile */, 'x = "file://c:/foo.bar";', [{ range: [[6, 1], [22, 1]], uri: URI.parse('file://c:/foo.bar') }], URI.parse('file://c:/foo.bar')],
        ["LocalFile" /* TerminalBuiltinLinkType.LocalFile */, 'x = "file://shares/foo.bar";', [{ range: [[6, 1], [26, 1]], uri: URI.parse('file://shares/foo.bar') }], URI.parse('file://shares/foo.bar')],
        ["LocalFile" /* TerminalBuiltinLinkType.LocalFile */, 'x = "file://shäres/foo.bar";', [{ range: [[6, 1], [26, 1]], uri: URI.parse('file://shäres/foo.bar') }], URI.parse('file://shäres/foo.bar')],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'Some text, then http://www.bing.com.', [{ range: [[17, 1], [35, 1]], uri: URI.parse('http://www.bing.com') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'let url = `http://***/_api/web/lists/GetByTitle(\'Teambuildingaanvragen\')/items`;', [{ range: [[12, 1], [78, 1]], uri: URI.parse('http://***/_api/web/lists/GetByTitle(\'Teambuildingaanvragen\')/items') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '7. At this point, ServiceMain has been called.  There is no functionality presently in ServiceMain, but you can consult the [MSDN documentation](https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx) to add functionality as desired!', [{ range: [[66, 2], [64, 3]], uri: URI.parse('https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'let x = "http://[::1]:5000/connect/token"', [{ range: [[10, 1], [40, 1]], uri: URI.parse('http://[::1]:5000/connect/token') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, '2. Navigate to **https://portal.azure.com**', [{ range: [[18, 1], [41, 1]], uri: URI.parse('https://portal.azure.com') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'POST|https://portal.azure.com|2019-12-05|', [{ range: [[6, 1], [29, 1]], uri: URI.parse('https://portal.azure.com') }]],
        ["Url" /* TerminalBuiltinLinkType.Url */, 'aa  https://foo.bar/[this is foo site]  aa', [{ range: [[5, 1], [38, 1]], uri: URI.parse('https://foo.bar/[this is foo site]') }]]
    ];
    for (const c of linkComputerCases) {
        test('link computer case: `' + c[1] + '`', async () => {
            validResources = c[3] ? [c[3]] : [];
            await assertLink(c[0], c[1], c[2]);
        });
    }
    test('should support multiple link results', async () => {
        await assertLink("Url" /* TerminalBuiltinLinkType.Url */, 'http://foo.bar http://bar.foo', [
            { range: [[1, 1], [14, 1]], uri: URI.parse('http://foo.bar') },
            { range: [[16, 1], [29, 1]], uri: URI.parse('http://bar.foo') }
        ]);
    });
    test('should detect file:// links with :line suffix', async () => {
        validResources = [URI.file('c:/folder/file')];
        await assertLink("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, 'file:///c:/folder/file:23', [
            { range: [[1, 1], [25, 1]], uri: URI.parse('file:///c:/folder/file') }
        ]);
    });
    test('should detect file:// links with :line:col suffix', async () => {
        validResources = [URI.file('c:/folder/file')];
        await assertLink("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, 'file:///c:/folder/file:23:10', [
            { range: [[1, 1], [28, 1]], uri: URI.parse('file:///c:/folder/file') }
        ]);
    });
    test('should filter out https:// link that exceed 4096 characters', async () => {
        // 8 + 200 * 10 = 2008 characters
        await assertLink("Url" /* TerminalBuiltinLinkType.Url */, `https://${'foobarbaz/'.repeat(200)}`, [{
                range: [[1, 1], [8, 26]],
                uri: URI.parse(`https://${'foobarbaz/'.repeat(200)}`)
            }]);
        // 8 + 450 * 10 = 4508 characters
        await assertLink("Url" /* TerminalBuiltinLinkType.Url */, `https://${'foobarbaz/'.repeat(450)}`, []);
    });
    test('should filter out file:// links that exceed 4096 characters', async () => {
        // 8 + 200 * 10 = 2008 characters
        validResources = [URI.file(`/${'foobarbaz/'.repeat(200)}`)];
        await assertLink("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `file:///${'foobarbaz/'.repeat(200)}`, [{
                uri: URI.parse(`file:///${'foobarbaz/'.repeat(200)}`),
                range: [[1, 1], [8, 26]]
            }]);
        // 8 + 450 * 10 = 4508 characters
        validResources = [URI.file(`/${'foobarbaz/'.repeat(450)}`)];
        await assertLink("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `file:///${'foobarbaz/'.repeat(450)}`, []);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmlMaW5rRGV0ZWN0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvdGVzdC9icm93c2VyL3Rlcm1pbmFsVXJpTGlua0RldGVjdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBRTVILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdGLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDakQsTUFBTSxL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