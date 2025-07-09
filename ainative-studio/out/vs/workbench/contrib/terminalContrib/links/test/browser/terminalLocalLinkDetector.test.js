/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../../base/common/platform.js';
import { format } from '../../../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { TerminalLocalLinkDetector } from '../../browser/terminalLocalLinkDetector.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { assertLinkHelper } from './linkTestUtils.js';
import { timeout } from '../../../../../../base/common/async.js';
import { strictEqual } from 'assert';
import { TerminalLinkResolver } from '../../browser/terminalLinkResolver.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { createFileStat } from '../../../../../test/common/workbenchTestServices.js';
import { URI } from '../../../../../../base/common/uri.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
const unixLinks = [
    // Absolute
    '/foo',
    '/foo/bar',
    '/foo/[bar]',
    '/foo/[bar].baz',
    '/foo/[bar]/baz',
    '/foo/bar+more',
    // URI file://
    { link: 'file:///foo', resource: URI.file('/foo') },
    { link: 'file:///foo/bar', resource: URI.file('/foo/bar') },
    { link: 'file:///foo/bar%20baz', resource: URI.file('/foo/bar baz') },
    // User home
    { link: '~/foo', resource: URI.file('/home/foo') },
    // Relative
    { link: './foo', resource: URI.file('/parent/cwd/foo') },
    { link: './$foo', resource: URI.file('/parent/cwd/$foo') },
    { link: '../foo', resource: URI.file('/parent/foo') },
    { link: 'foo/bar', resource: URI.file('/parent/cwd/foo/bar') },
    { link: 'foo/bar+more', resource: URI.file('/parent/cwd/foo/bar+more') },
];
const windowsLinks = [
    // Absolute
    'c:\\foo',
    { link: '\\\\?\\C:\\foo', resource: URI.file('C:\\foo') },
    'c:/foo',
    'c:/foo/bar',
    'c:\\foo\\bar',
    'c:\\foo\\bar+more',
    'c:\\foo/bar\\baz',
    // URI file://
    { link: 'file:///c:/foo', resource: URI.file('c:\\foo') },
    { link: 'file:///c:/foo/bar', resource: URI.file('c:\\foo\\bar') },
    { link: 'file:///c:/foo/bar%20baz', resource: URI.file('c:\\foo\\bar baz') },
    // User home
    { link: '~\\foo', resource: URI.file('C:\\Home\\foo') },
    { link: '~/foo', resource: URI.file('C:\\Home\\foo') },
    // Relative
    { link: '.\\foo', resource: URI.file('C:\\Parent\\Cwd\\foo') },
    { link: './foo', resource: URI.file('C:\\Parent\\Cwd\\foo') },
    { link: './$foo', resource: URI.file('C:\\Parent\\Cwd\\$foo') },
    { link: '..\\foo', resource: URI.file('C:\\Parent\\foo') },
    { link: 'foo/bar', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar') },
    { link: 'foo/bar', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar') },
    { link: 'foo/[bar]', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar]') },
    { link: 'foo/[bar].baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar].baz') },
    { link: 'foo/[bar]/baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar]/baz') },
    { link: 'foo\\bar', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar') },
    { link: 'foo\\[bar].baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar].baz') },
    { link: 'foo\\[bar]\\baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar]\\baz') },
    { link: 'foo\\bar+more', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar+more') },
];
const supportedLinkFormats = [
    { urlFormat: '{0}' },
    { urlFormat: '{0}" on line {1}', line: '5' },
    { urlFormat: '{0}" on line {1}, column {2}', line: '5', column: '3' },
    { urlFormat: '{0}":line {1}', line: '5' },
    { urlFormat: '{0}":line {1}, column {2}', line: '5', column: '3' },
    { urlFormat: '{0}": line {1}', line: '5' },
    { urlFormat: '{0}": line {1}, col {2}', line: '5', column: '3' },
    { urlFormat: '{0}({1})', line: '5' },
    { urlFormat: '{0} ({1})', line: '5' },
    { urlFormat: '{0}, {1}', line: '5' },
    { urlFormat: '{0}({1},{2})', line: '5', column: '3' },
    { urlFormat: '{0} ({1},{2})', line: '5', column: '3' },
    { urlFormat: '{0}: ({1},{2})', line: '5', column: '3' },
    { urlFormat: '{0}({1}, {2})', line: '5', column: '3' },
    { urlFormat: '{0} ({1}, {2})', line: '5', column: '3' },
    { urlFormat: '{0}: ({1}, {2})', line: '5', column: '3' },
    { urlFormat: '{0}({1}:{2})', line: '5', column: '3' },
    { urlFormat: '{0} ({1}:{2})', line: '5', column: '3' },
    { urlFormat: '{0}:{1}', line: '5' },
    { urlFormat: '{0}:{1}:{2}', line: '5', column: '3' },
    { urlFormat: '{0} {1}:{2}', line: '5', column: '3' },
    { urlFormat: '{0}[{1}]', line: '5' },
    { urlFormat: '{0} [{1}]', line: '5' },
    { urlFormat: '{0}[{1},{2}]', line: '5', column: '3' },
    { urlFormat: '{0} [{1},{2}]', line: '5', column: '3' },
    { urlFormat: '{0}: [{1},{2}]', line: '5', column: '3' },
    { urlFormat: '{0}[{1}, {2}]', line: '5', column: '3' },
    { urlFormat: '{0} [{1}, {2}]', line: '5', column: '3' },
    { urlFormat: '{0}: [{1}, {2}]', line: '5', column: '3' },
    { urlFormat: '{0}[{1}:{2}]', line: '5', column: '3' },
    { urlFormat: '{0} [{1}:{2}]', line: '5', column: '3' },
    { urlFormat: '{0}",{1}', line: '5' },
    { urlFormat: '{0}\',{1}', line: '5' },
    { urlFormat: '{0}#{1}', line: '5' },
    { urlFormat: '{0}#{1}:{2}', line: '5', column: '5' }
];
const windowsFallbackLinks = [
    'C:\\foo bar',
    'C:\\foo bar\\baz',
    'C:\\foo\\bar baz',
    'C:\\foo/bar baz'
];
const supportedFallbackLinkFormats = [
    // Python style error: File "<path>", line <line>
    { urlFormat: 'File "{0}"', linkCellStartOffset: 5 },
    { urlFormat: 'File "{0}", line {1}', line: '5', linkCellStartOffset: 5 },
    // Unknown tool #200166: FILE  <path>:<line>:<col>
    { urlFormat: ' FILE  {0}', linkCellStartOffset: 7 },
    { urlFormat: ' FILE  {0}:{1}', line: '5', linkCellStartOffset: 7 },
    { urlFormat: ' FILE  {0}:{1}:{2}', line: '5', column: '3', linkCellStartOffset: 7 },
    // Some C++ compile error formats
    { urlFormat: '{0}({1}) :', line: '5', linkCellEndOffset: -2 },
    { urlFormat: '{0}({1},{2}) :', line: '5', column: '3', linkCellEndOffset: -2 },
    { urlFormat: '{0}({1}, {2}) :', line: '5', column: '3', linkCellEndOffset: -2 },
    { urlFormat: '{0}({1}):', line: '5', linkCellEndOffset: -1 },
    { urlFormat: '{0}({1},{2}):', line: '5', column: '3', linkCellEndOffset: -1 },
    { urlFormat: '{0}({1}, {2}):', line: '5', column: '3', linkCellEndOffset: -1 },
    { urlFormat: '{0}:{1} :', line: '5', linkCellEndOffset: -2 },
    { urlFormat: '{0}:{1}:{2} :', line: '5', column: '3', linkCellEndOffset: -2 },
    { urlFormat: '{0}:{1}:', line: '5', linkCellEndOffset: -1 },
    { urlFormat: '{0}:{1}:{2}:', line: '5', column: '3', linkCellEndOffset: -1 },
    // Cmd prompt
    { urlFormat: '{0}>', linkCellEndOffset: -1 },
    // The whole line is the path
    { urlFormat: '{0}' },
];
suite('Workbench - TerminalLocalLinkDetector', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let detector;
    let resolver;
    let xterm;
    let validResources;
    async function assertLinks(type, text, expected) {
        let to;
        const race = await Promise.race([
            assertLinkHelper(text, expected, detector, type).then(() => 'success'),
            (to = timeout(2)).then(() => 'timeout')
        ]);
        strictEqual(race, 'success', `Awaiting link assertion for "${text}" timed out`);
        to.cancel();
    }
    async function assertLinksWithWrapped(link, resource) {
        const uri = resource ?? URI.file(link);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, link, [{ uri, range: [[1, 1], [link.length, 1]] }]);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, ` ${link} `, [{ uri, range: [[2, 1], [link.length + 1, 1]] }]);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `(${link})`, [{ uri, range: [[2, 1], [link.length + 1, 1]] }]);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `[${link}]`, [{ uri, range: [[2, 1], [link.length + 1, 1]] }]);
    }
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
        resolver = instantiationService.createInstance(TerminalLinkResolver);
        validResources = [];
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 });
    });
    suite('platform independent', () => {
        setup(() => {
            detector = instantiationService.createInstance(TerminalLocalLinkDetector, xterm, store.add(new TerminalCapabilityStore()), {
                initialCwd: '/parent/cwd',
                os: 3 /* OperatingSystem.Linux */,
                remoteAuthority: undefined,
                userHome: '/home',
                backend: undefined
            }, resolver);
        });
        test('should support multiple link results', async () => {
            validResources = [
                URI.file('/parent/cwd/foo'),
                URI.file('/parent/cwd/bar')
            ];
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, './foo ./bar', [
                { range: [[1, 1], [5, 1]], uri: URI.file('/parent/cwd/foo') },
                { range: [[7, 1], [11, 1]], uri: URI.file('/parent/cwd/bar') }
            ]);
        });
        test('should support trimming extra quotes', async () => {
            validResources = [URI.file('/parent/cwd/foo')];
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, '"foo"" on line 5', [
                { range: [[1, 1], [16, 1]], uri: URI.file('/parent/cwd/foo') }
            ]);
        });
        test('should support trimming extra square brackets', async () => {
            validResources = [URI.file('/parent/cwd/foo')];
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, '"foo]" on line 5', [
                { range: [[1, 1], [16, 1]], uri: URI.file('/parent/cwd/foo') }
            ]);
        });
    });
    suite('macOS/Linux', () => {
        setup(() => {
            detector = instantiationService.createInstance(TerminalLocalLinkDetector, xterm, store.add(new TerminalCapabilityStore()), {
                initialCwd: '/parent/cwd',
                os: 3 /* OperatingSystem.Linux */,
                remoteAuthority: undefined,
                userHome: '/home',
                backend: undefined
            }, resolver);
        });
        for (const l of unixLinks) {
            const baseLink = typeof l === 'string' ? l : l.link;
            const resource = typeof l === 'string' ? URI.file(l) : l.resource;
            suite(`Link: ${baseLink}`, () => {
                for (let i = 0; i < supportedLinkFormats.length; i++) {
                    const linkFormat = supportedLinkFormats[i];
                    const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                    test(`should detect in "${formattedLink}"`, async () => {
                        validResources = [resource];
                        await assertLinksWithWrapped(formattedLink, resource);
                    });
                }
            });
        }
        test('Git diff links', async () => {
            validResources = [URI.file('/parent/cwd/foo/bar')];
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `diff --git a/foo/bar b/foo/bar`, [
                { uri: validResources[0], range: [[14, 1], [20, 1]] },
                { uri: validResources[0], range: [[24, 1], [30, 1]] }
            ]);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `--- a/foo/bar`, [{ uri: validResources[0], range: [[7, 1], [13, 1]] }]);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `+++ b/foo/bar`, [{ uri: validResources[0], range: [[7, 1], [13, 1]] }]);
        });
    });
    // Only test these when on Windows because there is special behavior around replacing separators
    // in URI that cannot be changed
    if (isWindows) {
        suite('Windows', () => {
            const wslUnixToWindowsPathMap = new Map();
            setup(() => {
                detector = instantiationService.createInstance(TerminalLocalLinkDetector, xterm, store.add(new TerminalCapabilityStore()), {
                    initialCwd: 'C:\\Parent\\Cwd',
                    os: 1 /* OperatingSystem.Windows */,
                    remoteAuthority: undefined,
                    userHome: 'C:\\Home',
                    backend: {
                        async getWslPath(original, direction) {
                            if (direction === 'unix-to-win') {
                                return wslUnixToWindowsPathMap.get(original) ?? original;
                            }
                            return original;
                        },
                    }
                }, resolver);
                wslUnixToWindowsPathMap.clear();
            });
            for (const l of windowsLinks) {
                const baseLink = typeof l === 'string' ? l : l.link;
                const resource = typeof l === 'string' ? URI.file(l) : l.resource;
                suite(`Link "${baseLink}"`, () => {
                    for (let i = 0; i < supportedLinkFormats.length; i++) {
                        const linkFormat = supportedLinkFormats[i];
                        const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                        test(`should detect in "${formattedLink}"`, async () => {
                            validResources = [resource];
                            await assertLinksWithWrapped(formattedLink, resource);
                        });
                    }
                });
            }
            for (const l of windowsFallbackLinks) {
                const baseLink = typeof l === 'string' ? l : l.link;
                const resource = typeof l === 'string' ? URI.file(l) : l.resource;
                suite(`Fallback link "${baseLink}"`, () => {
                    for (let i = 0; i < supportedFallbackLinkFormats.length; i++) {
                        const linkFormat = supportedFallbackLinkFormats[i];
                        const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                        const linkCellStartOffset = linkFormat.linkCellStartOffset ?? 0;
                        const linkCellEndOffset = linkFormat.linkCellEndOffset ?? 0;
                        test(`should detect in "${formattedLink}"`, async () => {
                            validResources = [resource];
                            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, formattedLink, [{ uri: resource, range: [[1 + linkCellStartOffset, 1], [formattedLink.length + linkCellEndOffset, 1]] }]);
                        });
                    }
                });
            }
            test('Git diff links', async () => {
                const resource = URI.file('C:\\Parent\\Cwd\\foo\\bar');
                validResources = [resource];
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `diff --git a/foo/bar b/foo/bar`, [
                    { uri: resource, range: [[14, 1], [20, 1]] },
                    { uri: resource, range: [[24, 1], [30, 1]] }
                ]);
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `--- a/foo/bar`, [{ uri: resource, range: [[7, 1], [13, 1]] }]);
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `+++ b/foo/bar`, [{ uri: resource, range: [[7, 1], [13, 1]] }]);
            });
            suite('WSL', () => {
                test('Unix -> Windows /mnt/ style links', async () => {
                    wslUnixToWindowsPathMap.set('/mnt/c/foo/bar', 'C:\\foo\\bar');
                    validResources = [URI.file('C:\\foo\\bar')];
                    await assertLinksWithWrapped('/mnt/c/foo/bar', validResources[0]);
                });
                test('Windows -> Unix \\\\wsl$\\ style links', async () => {
                    validResources = [URI.file('\\\\wsl$\\Debian\\home\\foo\\bar')];
                    await assertLinksWithWrapped('\\\\wsl$\\Debian\\home\\foo\\bar');
                });
                test('Windows -> Unix \\\\wsl.localhost\\ style links', async () => {
                    validResources = [URI.file('\\\\wsl.localhost\\Debian\\home\\foo\\bar')];
                    await assertLinksWithWrapped('\\\\wsl.localhost\\Debian\\home\\foo\\bar');
                });
            });
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy90ZXN0L2Jyb3dzZXIvdGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sMkNBQTJDLENBQUM7QUFDdkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBRTVILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQzdILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXRELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9B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