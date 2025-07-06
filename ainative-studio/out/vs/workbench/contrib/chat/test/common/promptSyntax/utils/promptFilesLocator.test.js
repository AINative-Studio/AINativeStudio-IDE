/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createURI } from '../testUtils/createUri.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { basename } from '../../../../../../../base/common/resources.js';
import { isWindows } from '../../../../../../../base/common/platform.js';
import { MockFilesystem } from '../testUtils/mockFilesystem.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { PromptsConfig } from '../../../../../../../platform/prompts/common/config.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { mockObject, mockService } from '../../../../../../../platform/prompts/test/common/utils/mock.js';
import { isValidGlob, PromptFilesLocator } from '../../../../common/promptSyntax/utils/promptFilesLocator.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js';
/**
 * Mocked instance of {@link IConfigurationService}.
 */
const mockConfigService = (value) => {
    return mockService({
        getValue(key) {
            assert(typeof key === 'string', `Expected string configuration key, got '${typeof key}'.`);
            assert([PromptsConfig.KEY, PromptsConfig.LOCATIONS_KEY].includes(key), `Unsupported configuration key '${key}'.`);
            return value;
        },
    });
};
/**
 * Mocked instance of {@link IWorkspaceContextService}.
 */
const mockWorkspaceService = (folders) => {
    return mockService({
        getWorkspace() {
            return mockObject({
                folders,
            });
        },
    });
};
suite('PromptFilesLocator', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    if (isWindows) {
        return;
    }
    let initService;
    setup(async () => {
        initService = disposables.add(new TestInstantiationService());
        initService.stub(ILogService, new NullLogService());
        const fileService = disposables.add(initService.createInstance(FileService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        initService.stub(IFileService, fileService);
    });
    /**
     * Create a new instance of {@link PromptFilesLocator} with provided mocked
     * values for configuration and workspace services.
     */
    const createPromptsLocator = async (configValue, workspaceFolderPaths, filesystem) => {
        await (initService.createInstance(MockFilesystem, filesystem)).mock();
        initService.stub(IConfigurationService, mockConfigService(configValue));
        const workspaceFolders = workspaceFolderPaths.map((path, index) => {
            const uri = createURI(path);
            return mockObject({
                uri,
                name: basename(uri),
                index,
            });
        });
        initService.stub(IWorkspaceContextService, mockWorkspaceService(workspaceFolders));
        return initService.createInstance(PromptFilesLocator);
    };
    suite('• empty workspace', () => {
        const EMPTY_WORKSPACE = [];
        suite('• empty filesystem', () => {
            test('• no config value', async () => {
                const locator = await createPromptsLocator(undefined, EMPTY_WORKSPACE, []);
                assert.deepStrictEqual((await locator.listFiles())
                    .map((file) => file.fsPath), [], 'No prompts must be found.');
            });
            test('• object config value', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts/': true,
                    '/tmp/prompts/': false,
                }, EMPTY_WORKSPACE, []);
                assert.deepStrictEqual(await locator.listFiles(), [], 'No prompts must be found.');
            });
            test('• array config value', async () => {
                const locator = await createPromptsLocator([
                    'relative/path/to/prompts/',
                    '/abs/path',
                ], EMPTY_WORKSPACE, []);
                assert.deepStrictEqual(await locator.listFiles(), [], 'No prompts must be found.');
            });
            test('• null config value', async () => {
                const locator = await createPromptsLocator(null, EMPTY_WORKSPACE, []);
                assert.deepStrictEqual((await locator.listFiles())
                    .map((file) => file.fsPath), [], 'No prompts must be found.');
            });
            test('• string config value', async () => {
                const locator = await createPromptsLocator('/etc/hosts/prompts', EMPTY_WORKSPACE, []);
                assert.deepStrictEqual((await locator.listFiles())
                    .map((file) => file.fsPath), [], 'No prompts must be found.');
            });
        });
        suite('• non-empty filesystem', () => {
            test('• core logic', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': true,
                }, EMPTY_WORKSPACE, [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles())
                    .map((file) => file.fsPath), [
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').path,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').path,
                    createURI('/tmp/prompts/translate.to-rust.prompt.md').path,
                ], 'Must find correct prompts.');
            });
            suite('• absolute', () => {
                suite('• wild card', () => {
                    const settings = [
                        '/Users/legomushroom/repos/vscode/**',
                        '/Users/legomushroom/repos/vscode/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**',
                        '/Users/legomushroom/repos/vscode/deps/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**',
                        '/Users/legomushroom/repos/vscode/**/text/**/*',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.prompt.md',
                    ];
                    for (const setting of settings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, EMPTY_WORKSPACE, [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific*',
                            '/Users/legomushroom/repos/vscode/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/nested/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/deps/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/text/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, EMPTY_WORKSPACE, [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'default.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rawbot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
        });
    });
    suite('• single-root workspace', () => {
        suite('• glob pattern', () => {
            suite('• relative', () => {
                suite('• wild card', () => {
                    const testSettings = [
                        '**',
                        '**/*.prompt.md',
                        '**/*.md',
                        '**/*',
                        'deps/**',
                        'deps/**/*.prompt.md',
                        'deps/**/*',
                        'deps/**/*.md',
                        '**/text/**',
                        '**/text/**/*',
                        '**/text/**/*.md',
                        '**/text/**/*.prompt.md',
                        'deps/text/**',
                        'deps/text/**/*',
                        'deps/text/**/*.md',
                        'deps/text/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        [
                            '**/*specific*',
                        ],
                        [
                            '**/*specific*.prompt.md',
                        ],
                        [
                            '**/*specific*.md',
                        ],
                        [
                            '**/specific*',
                            '**/unspecific1.prompt.md',
                            '**/unspecific2.prompt.md',
                        ],
                        [
                            '**/specific.prompt.md',
                            '**/unspecific*.prompt.md',
                        ],
                        [
                            '**/nested/specific.prompt.md',
                            '**/nested/unspecific*.prompt.md',
                        ],
                        [
                            '**/nested/*specific*',
                        ],
                        [
                            '**/*spec*.prompt.md',
                        ],
                        [
                            '**/*spec*',
                        ],
                        [
                            '**/*spec*.md',
                        ],
                        [
                            '**/deps/**/*spec*.md',
                        ],
                        [
                            '**/text/**/*spec*.md',
                        ],
                        [
                            'deps/text/nested/*spec*',
                        ],
                        [
                            'deps/text/nested/*specific*',
                        ],
                        [
                            'deps/**/*specific*',
                        ],
                        [
                            'deps/**/specific*',
                            'deps/**/unspecific*.prompt.md',
                        ],
                        [
                            'deps/**/specific*.md',
                            'deps/**/unspecific*.md',
                        ],
                        [
                            'deps/**/specific.prompt.md',
                            'deps/**/unspecific1.prompt.md',
                            'deps/**/unspecific2.prompt.md',
                        ],
                        [
                            'deps/**/specific.prompt.md',
                            'deps/**/unspecific1*.md',
                            'deps/**/unspecific2*.md',
                        ],
                        [
                            'deps/text/**/*specific*',
                        ],
                        [
                            'deps/text/**/specific*',
                            'deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            'deps/text/**/specific*.md',
                            'deps/text/**/unspecific*.md',
                        ],
                        [
                            'deps/text/**/specific.prompt.md',
                            'deps/text/**/unspecific1.prompt.md',
                            'deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            'deps/text/**/specific.prompt.md',
                            'deps/text/**/unspecific1*.md',
                            'deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'default.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rawbot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
            suite('• absolute', () => {
                suite('• wild card', () => {
                    const settings = [
                        '/Users/legomushroom/repos/vscode/**',
                        '/Users/legomushroom/repos/vscode/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**',
                        '/Users/legomushroom/repos/vscode/deps/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**',
                        '/Users/legomushroom/repos/vscode/**/text/**/*',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.prompt.md',
                    ];
                    for (const setting of settings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific*',
                            '/Users/legomushroom/repos/vscode/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/nested/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/deps/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/text/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode'], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'deps/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'default.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rawbot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
        });
    });
    test('• core logic', async () => {
        const locator = await createPromptsLocator({
            '/Users/legomushroom/repos/prompts': true,
            '/tmp/prompts/': true,
            '/absolute/path/prompts': false,
            '.copilot/prompts': true,
        }, [
            '/Users/legomushroom/repos/vscode',
        ], [
            {
                name: '/Users/legomushroom/repos/prompts',
                children: [
                    {
                        name: 'test.prompt.md',
                        contents: 'Hello, World!',
                    },
                    {
                        name: 'refactor-tests.prompt.md',
                        contents: 'some file content goes here',
                    },
                ],
            },
            {
                name: '/tmp/prompts',
                children: [
                    {
                        name: 'translate.to-rust.prompt.md',
                        contents: 'some more random file contents',
                    },
                ],
            },
            {
                name: '/absolute/path/prompts',
                children: [
                    {
                        name: 'some-prompt-file.prompt.md',
                        contents: 'hey hey hey',
                    },
                ],
            },
            {
                name: '/Users/legomushroom/repos/vscode',
                children: [
                    {
                        name: '.copilot/prompts',
                        children: [
                            {
                                name: 'default.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                        ],
                    },
                    {
                        name: '.github/prompts',
                        children: [
                            {
                                name: 'my.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                        ],
                    },
                ],
            },
        ]);
        assert.deepStrictEqual((await locator.listFiles())
            .map((file) => file.fsPath), [
            createURI('/Users/legomushroom/repos/vscode/.github/prompts/my.prompt.md').fsPath,
            createURI('/Users/legomushroom/repos/prompts/test.prompt.md').fsPath,
            createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').fsPath,
            createURI('/tmp/prompts/translate.to-rust.prompt.md').fsPath,
            createURI('/Users/legomushroom/repos/vscode/.copilot/prompts/default.prompt.md').fsPath,
        ], 'Must find correct prompts.');
    });
    test('• with disabled `.github/prompts` location', async () => {
        const locator = await createPromptsLocator({
            '/Users/legomushroom/repos/prompts': true,
            '/tmp/prompts/': true,
            '/absolute/path/prompts': false,
            '.copilot/prompts': true,
            '.github/prompts': false,
        }, [
            '/Users/legomushroom/repos/vscode',
        ], [
            {
                name: '/Users/legomushroom/repos/prompts',
                children: [
                    {
                        name: 'test.prompt.md',
                        contents: 'Hello, World!',
                    },
                    {
                        name: 'refactor-tests.prompt.md',
                        contents: 'some file content goes here',
                    },
                ],
            },
            {
                name: '/tmp/prompts',
                children: [
                    {
                        name: 'translate.to-rust.prompt.md',
                        contents: 'some more random file contents',
                    },
                ],
            },
            {
                name: '/absolute/path/prompts',
                children: [
                    {
                        name: 'some-prompt-file.prompt.md',
                        contents: 'hey hey hey',
                    },
                ],
            },
            {
                name: '/Users/legomushroom/repos/vscode',
                children: [
                    {
                        name: '.copilot/prompts',
                        children: [
                            {
                                name: 'default.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                        ],
                    },
                    {
                        name: '.github/prompts',
                        children: [
                            {
                                name: 'my.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                            {
                                name: 'your.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                        ],
                    },
                ],
            },
        ]);
        assert.deepStrictEqual((await locator.listFiles())
            .map((file) => file.fsPath), [
            createURI('/Users/legomushroom/repos/prompts/test.prompt.md').path,
            createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').path,
            createURI('/tmp/prompts/translate.to-rust.prompt.md').path,
            createURI('/Users/legomushroom/repos/vscode/.copilot/prompts/default.prompt.md').path,
        ], 'Must find correct prompts.');
    });
    suite('• multi-root workspace', () => {
        suite('• core logic', () => {
            test('• without top-level `.github` folder', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is not part of the workspace, so prompt files are `ignored`
                    {
                        name: '/Users/legomushroom/repos/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles())
                    .map((file) => file.fsPath), [
                    createURI('/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md').path,
                    createURI('/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md').path,
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').path,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').path,
                    createURI('/tmp/prompts/translate.to-rust.prompt.md').path,
                ], 'Must find correct prompts.');
            });
            test('• with top-level `.github` folder', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts/.github',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles())
                    .map((file) => file.fsPath), [
                    createURI('/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md').fsPath,
                    createURI('/var/shared/prompts/.github/prompts/prompt-name.prompt.md').fsPath,
                    createURI('/var/shared/prompts/.github/prompts/name-of-the-prompt.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').fsPath,
                    createURI('/tmp/prompts/translate.to-rust.prompt.md').fsPath,
                ], 'Must find correct prompts.');
            });
            test('• with disabled `.github/prompts` location', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                    '.github/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts/.github',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles())
                    .map((file) => file.fsPath), [
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').path,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').path,
                    createURI('/tmp/prompts/translate.to-rust.prompt.md').path,
                ], 'Must find correct prompts.');
            });
            test('• mixed', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/**/*test*': true,
                    '.copilot/prompts': false,
                    '.github/prompts': true,
                    '/absolute/path/prompts/some-prompt-file.prompt.md': true,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts/.github',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                            {
                                name: 'elf.prompt.md',
                                contents: 'haalo!',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assert.deepStrictEqual((await locator.listFiles())
                    .map((file) => file.fsPath), [
                    // all of these are due to the `.github/prompts` setting
                    createURI('/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md').fsPath,
                    createURI('/var/shared/prompts/.github/prompts/prompt-name.prompt.md').fsPath,
                    createURI('/var/shared/prompts/.github/prompts/name-of-the-prompt.prompt.md').fsPath,
                    // all of these are due to the `/Users/legomushroom/repos/**/*test*` setting
                    createURI('/Users/legomushroom/repos/prompts/test.prompt.md').fsPath,
                    createURI('/Users/legomushroom/repos/prompts/refactor-tests.prompt.md').fsPath,
                    // this one is due to the specific `/absolute/path/prompts/some-prompt-file.prompt.md` setting
                    createURI('/absolute/path/prompts/some-prompt-file.prompt.md').fsPath,
                ], 'Must find correct prompts.');
            });
        });
        suite('• glob pattern', () => {
            suite('• relative', () => {
                suite('• wild card', () => {
                    const testSettings = [
                        '**',
                        '**/*.prompt.md',
                        '**/*.md',
                        '**/*',
                        'gen*/**',
                        'gen*/**/*.prompt.md',
                        'gen*/**/*',
                        'gen*/**/*.md',
                        '**/gen*/**',
                        '**/gen*/**/*',
                        '**/gen*/**/*.md',
                        '**/gen*/**/*.prompt.md',
                        '{generic,general,gen}/**',
                        '{generic,general,gen}/**/*.prompt.md',
                        '{generic,general,gen}/**/*',
                        '{generic,general,gen}/**/*.md',
                        '**/{generic,general,gen}/**',
                        '**/{generic,general,gen}/**/*',
                        '**/{generic,general,gen}/**/*.md',
                        '**/{generic,general,gen}/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, [
                                '/Users/legomushroom/repos/vscode',
                                '/Users/legomushroom/repos/prompts',
                            ], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        }
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/gen/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md').fsPath,
                                // -
                                createURI('/Users/legomushroom/repos/prompts/general/common.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        [
                            '**/my.prompt.md',
                            '**/*specific*',
                            '**/*common*',
                        ],
                        [
                            '**/my.prompt.md',
                            '**/*specific*.prompt.md',
                            '**/*common*.prompt.md',
                        ],
                        [
                            '**/my*.md',
                            '**/*specific*.md',
                            '**/*common*.md',
                        ],
                        [
                            '**/my*.md',
                            '**/specific*',
                            '**/unspecific*',
                            '**/common*',
                            '**/uncommon*',
                        ],
                        [
                            '**/my.prompt.md',
                            '**/specific.prompt.md',
                            '**/unspecific1.prompt.md',
                            '**/unspecific2.prompt.md',
                            '**/common.prompt.md',
                            '**/uncommon-10.prompt.md',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/*specific*',
                            'gen*/**/*common*',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/*specific*.prompt.md',
                            'gen*/**/*common*.prompt.md',
                        ],
                        [
                            'gen*/**/my*.md',
                            'gen*/**/*specific*.md',
                            'gen*/**/*common*.md',
                        ],
                        [
                            'gen*/**/my*.md',
                            'gen*/**/specific*',
                            'gen*/**/unspecific*',
                            'gen*/**/common*',
                            'gen*/**/uncommon*',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/specific.prompt.md',
                            'gen*/**/unspecific1.prompt.md',
                            'gen*/**/unspecific2.prompt.md',
                            'gen*/**/common.prompt.md',
                            'gen*/**/uncommon-10.prompt.md',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/nested/specific.prompt.md',
                            'gen/text/nested/unspecific1.prompt.md',
                            'gen/text/nested/unspecific2.prompt.md',
                            'general/common.prompt.md',
                            'general/uncommon-10.prompt.md',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/nested/*specific*',
                            'general/*common*',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/**/specific.prompt.md',
                            'gen/text/**/unspecific1.prompt.md',
                            'gen/text/**/unspecific2.prompt.md',
                            'general/*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/*specific*',
                            '{gen,general}/**/*common*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/*specific*.prompt.md',
                            '{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '{gen,general}/**/my*.md',
                            '{gen,general}/**/*specific*.md',
                            '{gen,general}/**/*common*.md',
                        ],
                        [
                            '{gen,general}/**/my*.md',
                            '{gen,general}/**/specific*',
                            '{gen,general}/**/unspecific*',
                            '{gen,general}/**/common*',
                            '{gen,general}/**/uncommon*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/specific.prompt.md',
                            '{gen,general}/**/unspecific1.prompt.md',
                            '{gen,general}/**/unspecific2.prompt.md',
                            '{gen,general}/**/common.prompt.md',
                            '{gen,general}/**/uncommon-10.prompt.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, [
                                '/Users/legomushroom/repos/vscode',
                                '/Users/legomushroom/repos/prompts',
                            ], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        }
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/gen/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md').fsPath,
                                // -
                                createURI('/Users/legomushroom/repos/prompts/general/common.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
            suite('• absolute', () => {
                suite('• wild card', () => {
                    const testSettings = [
                        '/Users/legomushroom/repos/**',
                        '/Users/legomushroom/repos/**/*.prompt.md',
                        '/Users/legomushroom/repos/**/*.md',
                        '/Users/legomushroom/repos/**/*',
                        '/Users/legomushroom/repos/**/gen*/**',
                        '/Users/legomushroom/repos/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/**/gen*/**/*',
                        '/Users/legomushroom/repos/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/**/gen*/**',
                        '/Users/legomushroom/repos/**/gen*/**/*',
                        '/Users/legomushroom/repos/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        test(`• '${setting}'`, async () => {
                            const locator = await createPromptsLocator({ [setting]: true }, [
                                '/Users/legomushroom/repos/vscode',
                                '/Users/legomushroom/repos/prompts',
                            ], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        }
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/gen/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md').fsPath,
                                // -
                                createURI('/Users/legomushroom/repos/prompts/general/common.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
                suite(`• specific`, () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/*specific*',
                            '/Users/legomushroom/repos/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my*.md',
                            '/Users/legomushroom/repos/**/*specific*.md',
                            '/Users/legomushroom/repos/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my*.md',
                            '/Users/legomushroom/repos/**/specific*',
                            '/Users/legomushroom/repos/**/unspecific*',
                            '/Users/legomushroom/repos/**/common*',
                            '/Users/legomushroom/repos/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*',
                            '/Users/legomushroom/repos/**/gen*/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my*.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*.md',
                            '/Users/legomushroom/repos/**/gen*/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my*.md',
                            '/Users/legomushroom/repos/**/gen*/**/specific*',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific*',
                            '/Users/legomushroom/repos/**/gen*/**/common*',
                            '/Users/legomushroom/repos/**/gen*/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/*specific*',
                            '/Users/legomushroom/repos/prompts/general/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/specific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/common*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/specific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/common*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/specific.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/common.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/uncommon-10.prompt.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        test(`• '${JSON.stringify(settings)}'`, async () => {
                            const vscodeSettings = {};
                            for (const setting of settings) {
                                vscodeSettings[setting] = true;
                            }
                            const locator = await createPromptsLocator(vscodeSettings, [
                                '/Users/legomushroom/repos/vscode',
                                '/Users/legomushroom/repos/prompts',
                            ], [
                                {
                                    name: '/Users/legomushroom/repos/vscode',
                                    children: [
                                        {
                                            name: 'gen/text',
                                            children: [
                                                {
                                                    name: 'my.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'nested',
                                                    children: [
                                                        {
                                                            name: 'specific.prompt.md',
                                                            contents: 'oh hi, bot!',
                                                        },
                                                        {
                                                            name: 'unspecific1.prompt.md',
                                                            contents: 'oh hi, robot!',
                                                        },
                                                        {
                                                            name: 'unspecific2.prompt.md',
                                                            contents: 'oh hi, rabot!',
                                                        },
                                                        {
                                                            name: 'readme.md',
                                                            contents: 'non prompt file',
                                                        },
                                                    ],
                                                }
                                            ],
                                        },
                                    ],
                                },
                                {
                                    name: '/Users/legomushroom/repos/prompts',
                                    children: [
                                        {
                                            name: 'general',
                                            children: [
                                                {
                                                    name: 'common.prompt.md',
                                                    contents: 'oh hi, bot!',
                                                },
                                                {
                                                    name: 'uncommon-10.prompt.md',
                                                    contents: 'oh hi, robot!',
                                                },
                                                {
                                                    name: 'license.md',
                                                    contents: 'non prompt file',
                                                },
                                            ],
                                        }
                                    ],
                                },
                            ]);
                            assert.deepStrictEqual((await locator.listFiles())
                                .map((file) => file.fsPath), [
                                createURI('/Users/legomushroom/repos/vscode/gen/text/my.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md').fsPath,
                                // -
                                createURI('/Users/legomushroom/repos/prompts/general/common.prompt.md').fsPath,
                                createURI('/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md').fsPath,
                            ], 'Must find correct prompts.');
                        });
                    }
                });
            });
        });
    });
    suite('• isValidGlob', () => {
        test('• valid patterns', () => {
            const globs = [
                '**',
                '\*',
                '\**',
                '**/*',
                '**/*.prompt.md',
                '/Users/legomushroom/**/*.prompt.md',
                '/Users/legomushroom/*.prompt.md',
                '/Users/legomushroom/*',
                '/Users/legomushroom/repos/{repo1,test}',
                '/Users/legomushroom/repos/{repo1,test}/**',
                '/Users/legomushroom/repos/{repo1,test}/*',
                '/Users/legomushroom/**/{repo1,test}/**',
                '/Users/legomushroom/**/{repo1,test}',
                '/Users/legomushroom/**/{repo1,test}/*',
                '/Users/legomushroom/**/repo[1,2,3]',
                '/Users/legomushroom/**/repo[1,2,3]/**',
                '/Users/legomushroom/**/repo[1,2,3]/*',
                '/Users/legomushroom/**/repo[1,2,3]/**/*.prompt.md',
                'repo[1,2,3]/**/*.prompt.md',
                'repo[[1,2,3]/**/*.prompt.md',
                '{repo1,test}/*.prompt.md',
                '{repo1,test}/*',
                '/{repo1,test}/*',
                '/{repo1,test}}/*',
            ];
            for (const glob of globs) {
                assert((isValidGlob(glob) === true), `'${glob}' must be a 'valid' glob pattern.`);
            }
        });
        test('• invalid patterns', () => {
            const globs = [
                '.',
                '\\*',
                '\\?',
                '\\*\\?\\*',
                'repo[1,2,3',
                'repo1,2,3]',
                'repo\\[1,2,3]',
                'repo[1,2,3\\]',
                'repo\\[1,2,3\\]',
                '{repo1,repo2',
                'repo1,repo2}',
                '\\{repo1,repo2}',
                '{repo1,repo2\\}',
                '\\{repo1,repo2\\}',
                '/Users/legomushroom/repos',
                '/Users/legomushroom/repo[1,2,3',
                '/Users/legomushroom/repo1,2,3]',
                '/Users/legomushroom/repo\\[1,2,3]',
                '/Users/legomushroom/repo[1,2,3\\]',
                '/Users/legomushroom/repo\\[1,2,3\\]',
                '/Users/legomushroom/{repo1,repo2',
                '/Users/legomushroom/repo1,repo2}',
                '/Users/legomushroom/\\{repo1,repo2}',
                '/Users/legomushroom/{repo1,repo2\\}',
                '/Users/legomushroom/\\{repo1,repo2\\}',
            ];
            for (const glob of globs) {
                assert((isValidGlob(glob) === false), `'${glob}' must be an 'invalid' glob pattern.`);
            }
        });
    });
    suite('• getConfigBasedSourceFolders', () => {
        test('• gets unambiguous list of folders', async () => {
            const locator = await createPromptsLocator({
                '.github/prompts': true,
                '/Users/**/repos/**': true,
                'gen/text/**': true,
                'gen/text/nested/*.prompt.md': true,
                'general/*': true,
                '/Users/legomushroom/repos/vscode/my-prompts': true,
                '/Users/legomushroom/repos/vscode/your-prompts/*.md': true,
                '/Users/legomushroom/repos/prompts/shared-prompts/*': true,
            }, [
                '/Users/legomushroom/repos/vscode',
                '/Users/legomushroom/repos/prompts',
            ], []);
            assert.deepStrictEqual(locator.getConfigBasedSourceFolders()
                .map((file) => file.fsPath), [
                createURI('/Users/legomushroom/repos/vscode/.github/prompts').fsPath,
                createURI('/Users/legomushroom/repos/prompts/.github/prompts').fsPath,
                createURI('/Users/legomushroom/repos/vscode/gen/text/nested').fsPath,
                createURI('/Users/legomushroom/repos/prompts/gen/text/nested').fsPath,
                createURI('/Users/legomushroom/repos/vscode/general').fsPath,
                createURI('/Users/legomushroom/repos/prompts/general').fsPath,
                createURI('/Users/legomushroom/repos/vscode/my-prompts').fsPath,
                createURI('/Users/legomushroom/repos/vscode/your-prompts').fsPath,
                createURI('/Users/legomushroom/repos/prompts/shared-prompts').fsPath,
            ], 'Must find correct prompts.');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC91dGlscy9wcm9tcHRGaWxlc0xvY2F0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3pFLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDMUcsT0FBTyxFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQzlHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ3RILE9BQU8s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