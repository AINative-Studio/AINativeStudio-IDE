/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TerminalCompletionService } from '../../browser/terminalCompletionService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import assert, { fail } from 'assert';
import { isWindows } from '../../../../../../base/common/platform.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { createFileStat } from '../../../../../test/common/workbenchTestServices.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ShellEnvDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/shellEnvDetectionCapability.js';
import { TerminalCompletionItemKind } from '../../browser/terminalCompletionItem.js';
import { count } from '../../../../../../base/common/strings.js';
const pathSeparator = isWindows ? '\\' : '/';
/**
 * Assert the set of completions exist exactly, including their order.
 */
function assertCompletions(actual, expected, expectedConfig) {
    assert.deepStrictEqual(actual?.map(e => ({
        label: e.label,
        detail: e.detail ?? '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementIndex: e.replacementIndex,
        replacementLength: e.replacementLength,
    })), expected.map(e => ({
        label: e.label.replaceAll('/', pathSeparator),
        detail: e.detail ? e.detail.replaceAll('/', pathSeparator) : '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementIndex: expectedConfig.replacementIndex,
        replacementLength: expectedConfig.replacementLength,
    })));
}
/**
 * Assert a set of completions exist within the actual set.
 */
function assertPartialCompletionsExist(actual, expectedPartial, expectedConfig) {
    if (!actual) {
        fail();
    }
    const expectedMapped = expectedPartial.map(e => ({
        label: e.label.replaceAll('/', pathSeparator),
        detail: e.detail ? e.detail.replaceAll('/', pathSeparator) : '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementIndex: expectedConfig.replacementIndex,
        replacementLength: expectedConfig.replacementLength,
    }));
    for (const expectedItem of expectedMapped) {
        assert.deepStrictEqual(actual.map(e => ({
            label: e.label,
            detail: e.detail ?? '',
            kind: e.kind ?? TerminalCompletionItemKind.Folder,
            replacementIndex: e.replacementIndex,
            replacementLength: e.replacementLength,
        })).find(e => e.detail === expectedItem.detail), expectedItem);
    }
}
const testEnv = {
    HOME: '/home/user',
    USERPROFILE: '/home/user'
};
let homeDir = isWindows ? testEnv['USERPROFILE'] : testEnv['HOME'];
if (!homeDir.endsWith('/')) {
    homeDir += '/';
}
const standardTidleItem = Object.freeze({ label: '~', detail: homeDir });
suite('TerminalCompletionService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let capabilities;
    let validResources;
    let childResources;
    let terminalCompletionService;
    const provider = 'testProvider';
    setup(() => {
        instantiationService = store.add(new TestInstantiationService());
        configurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IFileService, {
            async stat(resource) {
                if (!validResources.map(e => e.path).includes(resource.path)) {
                    throw new Error('Doesn\'t exist');
                }
                return createFileStat(resource);
            },
            async resolve(resource, options) {
                const children = childResources.filter(child => {
                    const childFsPath = child.resource.path.replace(/\/$/, '');
                    const parentFsPath = resource.path.replace(/\/$/, '');
                    return (childFsPath.startsWith(parentFsPath) &&
                        count(childFsPath, '/') === count(parentFsPath, '/') + 1);
                });
                return createFileStat(resource, undefined, undefined, undefined, children);
            },
        });
        terminalCompletionService = store.add(instantiationService.createInstance(TerminalCompletionService));
        terminalCompletionService.processEnv = testEnv;
        validResources = [];
        childResources = [];
        capabilities = store.add(new TerminalCapabilityStore());
    });
    suite('resolveResources should return undefined', () => {
        test('if cwd is not provided', async () => {
            const resourceRequestConfig = { pathSeparator };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assert(!result);
        });
        test('if neither filesRequested nor foldersRequested are true', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assert(!result);
        });
    });
    suite('resolveResources should return folder completions', () => {
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true, isFile: false },
                { resource: URI.parse('file:///test/file1.txt'), isDirectory: false, isFile: true },
            ];
        });
        test('| should return root-level completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '', 1, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: '../', detail: '/' },
                standardTidleItem,
            ], { replacementIndex: 1, replacementLength: 0 });
        });
        test('./| should return folder completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 3, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 1, replacementLength: 2 });
        });
        test('cd ./| should return folder completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ./', 5, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 3, replacementLength: 2 });
        });
        test('cd ./f| should return folder completions', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ./f', 6, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementIndex: 3, replacementLength: 3 });
        });
    });
    suite('resolveResources should handle file and folder completion requests correctly', () => {
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/.hiddenFile'), isFile: true },
                { resource: URI.parse('file:///test/.hiddenFolder/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/file1.txt'), isFile: true },
            ];
        });
        test('./| should handle hidden files and folders', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 2, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './.hiddenFile', detail: '/test/.hiddenFile', kind: TerminalCompletionItemKind.File },
                { label: './.hiddenFolder/', detail: '/test/.hiddenFolder/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './file1.txt', detail: '/test/file1.txt', kind: TerminalCompletionItemKind.File },
                { label: './../', detail: '/' },
            ], { replacementIndex: 0, replacementLength: 2 });
        });
        test('./h| should handle hidden files and folders', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './h', 3, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './.hiddenFile', detail: '/test/.hiddenFile', kind: TerminalCompletionItemKind.File },
                { label: './.hiddenFolder/', detail: '/test/.hiddenFolder/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './file1.txt', detail: '/test/file1.txt', kind: TerminalCompletionItemKind.File },
                { label: './../', detail: '/' },
            ], { replacementIndex: 0, replacementLength: 3 });
        });
    });
    suite('~ -> $HOME', () => {
        let resourceRequestConfig;
        let shellEnvDetection;
        setup(() => {
            shellEnvDetection = store.add(new ShellEnvDetectionCapability());
            shellEnvDetection.setEnvironment({
                HOME: '/home',
                USERPROFILE: '/home'
            }, true);
            capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
            resourceRequestConfig = {
                cwd: URI.parse('file:///test/folder1'), // Updated to reflect home directory
                filesRequested: true,
                foldersRequested: true,
                pathSeparator
            };
            validResources = [
                URI.parse('file:///test'),
                URI.parse('file:///test/folder1'),
                URI.parse('file:///home'),
                URI.parse('file:///home/vscode'),
                URI.parse('file:///home/vscode/foo'),
                URI.parse('file:///home/vscode/bar.txt'),
            ];
            childResources = [
                { resource: URI.parse('file:///home/vscode'), isDirectory: true },
                { resource: URI.parse('file:///home/vscode/foo'), isDirectory: true },
                { resource: URI.parse('file:///home/vscode/bar.txt'), isFile: true },
            ];
        });
        test('~| should return completion for ~', async () => {
            assertPartialCompletionsExist(await terminalCompletionService.resolveResources(resourceRequestConfig, '~', 1, provider, capabilities), [
                { label: '~', detail: '/home/' },
            ], { replacementIndex: 0, replacementLength: 1 });
        });
        test('~/| should return folder completions relative to $HOME', async () => {
            assertCompletions(await terminalCompletionService.resolveResources(resourceRequestConfig, '~/', 2, provider, capabilities), [
                { label: '~/', detail: '/home/' },
                { label: '~/vscode/', detail: '/home/vscode/' },
            ], { replacementIndex: 0, replacementLength: 2 });
        });
        test('~/vscode/| should return folder completions relative to $HOME/vscode', async () => {
            assertCompletions(await terminalCompletionService.resolveResources(resourceRequestConfig, '~/vscode/', 9, provider, capabilities), [
                { label: '~/vscode/', detail: '/home/vscode/' },
                { label: '~/vscode/foo/', detail: '/home/vscode/foo/' },
                { label: '~/vscode/bar.txt', detail: '/home/vscode/bar.txt', kind: TerminalCompletionItemKind.File },
            ], { replacementIndex: 0, replacementLength: 9 });
        });
    });
    suite('resolveResources edge cases and advanced scenarios', () => {
        setup(() => {
            validResources = [];
            childResources = [];
        });
        if (isWindows) {
            test('C:/Foo/| absolute paths on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///C:'),
                    foldersRequested: true,
                    pathSeparator
                };
                validResources = [URI.parse('file:///C:/Foo')];
                childResources = [
                    { resource: URI.parse('file:///C:/Foo/Bar'), isDirectory: true, isFile: false },
                    { resource: URI.parse('file:///C:/Foo/Baz.txt'), isDirectory: false, isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'C:/Foo/', 7, provider, capabilities);
                assertCompletions(result, [
                    { label: 'C:/Foo/', detail: 'C:/Foo/' },
                    { label: 'C:/Foo/Bar/', detail: 'C:/Foo/Bar/' },
                ], { replacementIndex: 0, replacementLength: 7 });
            });
            test('c:/foo/| case insensitivity on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///c:'),
                    foldersRequested: true,
                    pathSeparator
                };
                validResources = [URI.parse('file:///c:/foo')];
                childResources = [
                    { resource: URI.parse('file:///c:/foo/Bar'), isDirectory: true, isFile: false }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'c:/foo/', 7, provider, capabilities);
                assertCompletions(result, [
                    // Note that the detail is normalizes drive letters to capital case intentionally
                    { label: 'c:/foo/', detail: 'C:/foo/' },
                    { label: 'c:/foo/Bar/', detail: 'C:/foo/Bar/' },
                ], { replacementIndex: 0, replacementLength: 7 });
            });
        }
        else {
            test('/foo/| absolute paths NOT on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///'),
                    foldersRequested: true,
                    pathSeparator
                };
                validResources = [URI.parse('file:///foo')];
                childResources = [
                    { resource: URI.parse('file:///foo/Bar'), isDirectory: true, isFile: false },
                    { resource: URI.parse('file:///foo/Baz.txt'), isDirectory: false, isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '/foo/', 5, provider, capabilities);
                assertCompletions(result, [
                    { label: '/foo/', detail: '/foo/' },
                    { label: '/foo/Bar/', detail: '/foo/Bar/' },
                ], { replacementIndex: 0, replacementLength: 5 });
            });
        }
        if (isWindows) {
            test('.\\folder | Case insensitivity should resolve correctly on Windows', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///C:/test'),
                    foldersRequested: true,
                    pathSeparator: '\\'
                };
                validResources = [URI.parse('file:///C:/test')];
                childResources = [
                    { resource: URI.parse('file:///C:/test/FolderA/'), isDirectory: true },
                    { resource: URI.parse('file:///C:/test/anotherFolder/'), isDirectory: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '.\\folder', 8, provider, capabilities);
                assertCompletions(result, [
                    { label: '.\\', detail: 'C:\\test\\' },
                    { label: '.\\FolderA\\', detail: 'C:\\test\\FolderA\\' },
                    { label: '.\\anotherFolder\\', detail: 'C:\\test\\anotherFolder\\' },
                    { label: '.\\..\\', detail: 'C:\\' },
                ], { replacementIndex: 0, replacementLength: 8 });
            });
        }
        else {
            test('./folder | Case sensitivity should resolve correctly on Mac/Unix', async () => {
                const resourceRequestConfig = {
                    cwd: URI.parse('file:///test'),
                    foldersRequested: true,
                    pathSeparator: '/'
                };
                validResources = [URI.parse('file:///test')];
                childResources = [
                    { resource: URI.parse('file:///test/FolderA/'), isDirectory: true },
                    { resource: URI.parse('file:///test/foldera/'), isDirectory: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './folder', 8, provider, capabilities);
                assertCompletions(result, [
                    { label: './', detail: '/test/' },
                    { label: './FolderA/', detail: '/test/FolderA/' },
                    { label: './foldera/', detail: '/test/foldera/' },
                    { label: './../', detail: '/' }
                ], { replacementIndex: 0, replacementLength: 8 });
            });
        }
        test('| Empty input should resolve to current directory', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, '', 0, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './folder2/', detail: '/test/folder2/' },
                { label: '../', detail: '/' },
                standardTidleItem,
            ], { replacementIndex: 0, replacementLength: 0 });
        });
        test('./| should handle large directories with many results gracefully', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = Array.from({ length: 1000 }, (_, i) => ({
                resource: URI.parse(`file:///test/folder${i}/`),
                isDirectory: true
            }));
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './', 2, provider, capabilities);
            assert(result);
            // includes the 1000 folders + ./ and ./../
            assert.strictEqual(result?.length, 1002);
            assert.strictEqual(result[0].label, `.${pathSeparator}`);
            assert.strictEqual(result.at(-1)?.label, `.${pathSeparator}..${pathSeparator}`);
        });
        test('./folder| should include current folder with trailing / is missing', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, './folder1', 10, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './folder2/', detail: '/test/folder2/' },
                { label: './../', detail: '/' }
            ], { replacementIndex: 1, replacementLength: 9 });
        });
        test('folder/| should normalize current and parent folders', async () => {
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                pathSeparator
            };
            validResources = [
                URI.parse('file:///'),
                URI.parse('file:///test'),
                URI.parse('file:///test/folder1'),
                URI.parse('file:///test/folder2'),
            ];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'test/', 5, provider, capabilities);
            assertCompletions(result, [
                { label: './test/', detail: '/test/' },
                { label: './test/folder1/', detail: '/test/folder1/' },
                { label: './test/folder2/', detail: '/test/folder2/' },
                { label: './test/../', detail: '/' }
            ], { replacementIndex: 0, replacementLength: 5 });
        });
    });
    suite('cdpath', () => {
        let shellEnvDetection;
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///cdpath_value/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///cdpath_value/file1.txt'), isFile: true },
            ];
            shellEnvDetection = store.add(new ShellEnvDetectionCapability());
            shellEnvDetection.setEnvironment({ CDPATH: '/cdpath_value' }, true);
            capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
        });
        test('cd | should show paths from $CDPATH (relative)', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'relative');
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assertPartialCompletionsExist(result, [
                { label: 'folder1', detail: 'CDPATH /cdpath_value/folder1/' },
            ], { replacementIndex: 3, replacementLength: 0 });
        });
        test('cd | should show paths from $CDPATH (absolute)', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'absolute');
            const resourceRequestConfig = {
                cwd: URI.parse('file:///test'),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            assertPartialCompletionsExist(result, [
                { label: '/cdpath_value/folder1/', detail: 'CDPATH' },
            ], { replacementIndex: 3, replacementLength: 0 });
        });
        test('cd | should support pulling from multiple paths in $CDPATH', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'relative');
            const pathPrefix = isWindows ? 'c:\\' : '/';
            const delimeter = isWindows ? ';' : ':';
            const separator = isWindows ? '\\' : '/';
            shellEnvDetection.setEnvironment({ CDPATH: `${pathPrefix}cdpath1_value${delimeter}${pathPrefix}cdpath2_value${separator}inner_dir` }, true);
            const uriPathPrefix = isWindows ? 'file:///c:/' : 'file:///';
            validResources = [
                URI.parse(`${uriPathPrefix}test`),
                URI.parse(`${uriPathPrefix}cdpath1_value`),
                URI.parse(`${uriPathPrefix}cdpath2_value`),
                URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir`)
            ];
            childResources = [
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/folder1/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/folder2/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/file1.txt`), isFile: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/folder1/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/folder2/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/file1.txt`), isFile: true },
            ];
            const resourceRequestConfig = {
                cwd: URI.parse(`${uriPathPrefix}test`),
                foldersRequested: true,
                filesRequested: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceRequestConfig, 'cd ', 3, provider, capabilities);
            const finalPrefix = isWindows ? 'C:\\' : '/';
            assertPartialCompletionsExist(result, [
                { label: 'folder1', detail: `CDPATH ${finalPrefix}cdpath1_value/folder1/` },
                { label: 'folder2', detail: `CDPATH ${finalPrefix}cdpath1_value/folder2/` },
                { label: 'folder1', detail: `CDPATH ${finalPrefix}cdpath2_value/inner_dir/folder1/` },
                { label: 'folder2', detail: `CDPATH ${finalPrefix}cdpath2_value/inner_dir/folder2/` },
            ], { replacementIndex: 3, replacementLength: 0 });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci90ZXJtaW5hbENvbXBsZXRpb25TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQXNELE1BQU0sa0RBQWtELENBQUM7QUFDcEksT0FBTyxFQUFFLHlCQUF5QixFQUFpQyxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxTQUFTLEVBQTRCLE1BQU0sMkNBQTJDLENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQzdILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdGQUF3RixDQUFDO0FBRXJJLE9BQU8sRUFBdUIsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENB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