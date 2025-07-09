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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvdXRpbHMvcHJvbXB0RmlsZXNMb2NhdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RSxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM5RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUN0SCxPQUFP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