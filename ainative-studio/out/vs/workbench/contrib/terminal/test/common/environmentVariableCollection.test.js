/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { EnvironmentVariableMutatorType } from '../../../../../platform/terminal/common/environmentVariable.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { MergedEnvironmentVariableCollection } from '../../../../../platform/terminal/common/environmentVariableCollection.js';
import { deserializeEnvironmentDescriptionMap, deserializeEnvironmentVariableCollection } from '../../../../../platform/terminal/common/environmentVariableShared.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EnvironmentVariable - MergedEnvironmentVariableCollection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('ctor', () => {
        test('Should keep entries that come after a Prepend or Append type mutators', () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' }]
                        ])
                    }],
                ['ext2', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }],
                ['ext3', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a3', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' }]
                        ])
                    }],
                ['ext4', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a4', type: EnvironmentVariableMutatorType.Append, variable: 'A', options: { applyAtProcessCreation: true, applyAtShellIntegration: true } }]
                        ])
                    }]
            ]));
            deepStrictEqual([...merged.getVariableMap(undefined).entries()], [
                ['A', [
                        { extensionIdentifier: 'ext4', type: EnvironmentVariableMutatorType.Append, value: 'a4', variable: 'A', options: { applyAtProcessCreation: true, applyAtShellIntegration: true } },
                        { extensionIdentifier: 'ext3', type: EnvironmentVariableMutatorType.Prepend, value: 'a3', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext2', type: EnvironmentVariableMutatorType.Append, value: 'a2', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Prepend, value: 'a1', variable: 'A', options: undefined }
                    ]]
            ]);
        });
        test('Should remove entries that come after a Replace type mutator', () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' }]
                        ])
                    }],
                ['ext2', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }],
                ['ext3', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a3', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }]
                        ])
                    }],
                ['ext4', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a4', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }]
            ]));
            deepStrictEqual([...merged.getVariableMap(undefined).entries()], [
                ['A', [
                        { extensionIdentifier: 'ext3', type: EnvironmentVariableMutatorType.Replace, value: 'a3', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext2', type: EnvironmentVariableMutatorType.Append, value: 'a2', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext1', type: EnvironmentVariableMutatorType.Prepend, value: 'a1', variable: 'A', options: undefined }
                    ]]
            ], 'The ext4 entry should be removed as it comes after a Replace');
        });
        test('Appropriate workspace scoped entries are returned when querying for a particular workspace folder', () => {
            const scope1 = { workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 } };
            const scope2 = { workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 } };
            const merged = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, scope: scope1, variable: 'A' }]
                        ])
                    }],
                ['ext2', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }],
                ['ext3', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a3', type: EnvironmentVariableMutatorType.Prepend, scope: scope2, variable: 'A' }]
                        ])
                    }],
                ['ext4', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a4', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }]
            ]));
            deepStrictEqual([...merged.getVariableMap(scope2).entries()], [
                ['A', [
                        { extensionIdentifier: 'ext4', type: EnvironmentVariableMutatorType.Append, value: 'a4', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext3', type: EnvironmentVariableMutatorType.Prepend, value: 'a3', scope: scope2, variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext2', type: EnvironmentVariableMutatorType.Append, value: 'a2', variable: 'A', options: undefined },
                    ]]
            ]);
        });
        test('Workspace scoped entries are not included when looking for global entries', () => {
            const scope1 = { workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 } };
            const scope2 = { workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 } };
            const merged = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, scope: scope1, variable: 'A' }]
                        ])
                    }],
                ['ext2', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }],
                ['ext3', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a3', type: EnvironmentVariableMutatorType.Prepend, scope: scope2, variable: 'A' }]
                        ])
                    }],
                ['ext4', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a4', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }]
            ]));
            deepStrictEqual([...merged.getVariableMap(undefined).entries()], [
                ['A', [
                        { extensionIdentifier: 'ext4', type: EnvironmentVariableMutatorType.Append, value: 'a4', variable: 'A', options: undefined },
                        { extensionIdentifier: 'ext2', type: EnvironmentVariableMutatorType.Append, value: 'a2', variable: 'A', options: undefined },
                    ]]
            ]);
        });
        test('Workspace scoped description entries are properly filtered for each extension', () => {
            const scope1 = { workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 } };
            const scope2 = { workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 } };
            const merged = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, scope: scope1, variable: 'A' }]
                        ]),
                        descriptionMap: deserializeEnvironmentDescriptionMap([
                            ['A-key-scope1', { description: 'ext1 scope1 description', scope: scope1 }],
                            ['A-key-scope2', { description: 'ext1 scope2 description', scope: scope2 }],
                        ])
                    }],
                ['ext2', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ]),
                        descriptionMap: deserializeEnvironmentDescriptionMap([
                            ['A-key', { description: 'ext2 global description' }],
                        ])
                    }],
                ['ext3', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a3', type: EnvironmentVariableMutatorType.Prepend, scope: scope2, variable: 'A' }]
                        ]),
                        descriptionMap: deserializeEnvironmentDescriptionMap([
                            ['A-key', { description: 'ext3 scope2 description', scope: scope2 }],
                        ])
                    }],
                ['ext4', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a4', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }]
            ]));
            deepStrictEqual([...merged.getDescriptionMap(scope1).entries()], [
                ['ext1', 'ext1 scope1 description'],
            ]);
            deepStrictEqual([...merged.getDescriptionMap(undefined).entries()], [
                ['ext2', 'ext2 global description'],
            ]);
        });
    });
    suite('applyToProcessEnvironment', () => {
        test('should apply the collection to an environment', async () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                ['ext', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
                            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }]
                        ])
                    }]
            ]));
            const env = {
                A: 'foo',
                B: 'bar',
                C: 'baz'
            };
            await merged.applyToProcessEnvironment(env, undefined);
            deepStrictEqual(env, {
                A: 'a',
                B: 'barb',
                C: 'cbaz'
            });
        });
        test('should apply the appropriate workspace scoped entries to an environment', async () => {
            const scope1 = { workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 } };
            const scope2 = { workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 } };
            const merged = new MergedEnvironmentVariableCollection(new Map([
                ['ext', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, scope: scope1, variable: 'A' }],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, scope: scope2, variable: 'B' }],
                            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }]
                        ])
                    }]
            ]));
            const env = {
                A: 'foo',
                B: 'bar',
                C: 'baz'
            };
            await merged.applyToProcessEnvironment(env, scope1);
            deepStrictEqual(env, {
                A: 'a',
                B: 'bar', // This is not changed because the scope does not match
                C: 'cbaz'
            });
        });
        test('should apply the collection to environment entries with no values', async () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                ['ext', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }],
                            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'C' }]
                        ])
                    }]
            ]));
            const env = {};
            await merged.applyToProcessEnvironment(env, undefined);
            deepStrictEqual(env, {
                A: 'a',
                B: 'b',
                C: 'c'
            });
        });
        test('should apply to variable case insensitively on Windows only', async () => {
            const merged = new MergedEnvironmentVariableCollection(new Map([
                ['ext', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'a' }],
                            ['b', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'b' }],
                            ['c', { value: 'c', type: EnvironmentVariableMutatorType.Prepend, variable: 'c' }]
                        ])
                    }]
            ]));
            const env = {
                A: 'A',
                B: 'B',
                C: 'C'
            };
            await merged.applyToProcessEnvironment(env, undefined);
            if (isWindows) {
                deepStrictEqual(env, {
                    A: 'a',
                    B: 'Bb',
                    C: 'cC'
                });
            }
            else {
                deepStrictEqual(env, {
                    a: 'a',
                    A: 'A',
                    b: 'b',
                    B: 'B',
                    c: 'c',
                    C: 'C'
                });
            }
        });
    });
    suite('diff', () => {
        test('should return undefined when collectinos are the same', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }]
                        ])
                    }]
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }]
                        ])
                    }]
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff, undefined);
        });
        test('should generate added diffs from when the first entry is added', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }]
                        ])
                    }]
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.changed.size, 0);
            strictEqual(diff.removed.size, 0);
            const entries = [...diff.added.entries()];
            deepStrictEqual(entries, [
                ['A', [{ extensionIdentifier: 'ext1', value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A', options: undefined }]]
            ]);
        });
        test('should generate added diffs from the same extension', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }]
                        ])
                    }]
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }]
                        ])
                    }]
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.changed.size, 0);
            strictEqual(diff.removed.size, 0);
            const entries = [...diff.added.entries()];
            deepStrictEqual(entries, [
                ['B', [{ extensionIdentifier: 'ext1', value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B', options: undefined }]]
            ]);
        });
        test('should generate added diffs from a different extension', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' }]
                        ])
                    }]
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                ['ext2', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }],
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' }]
                        ])
                    }]
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.changed.size, 0);
            strictEqual(diff.removed.size, 0);
            deepStrictEqual([...diff.added.entries()], [
                ['A', [{ extensionIdentifier: 'ext2', value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A', options: undefined }]]
            ]);
            const merged3 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Prepend, variable: 'A' }]
                        ])
                    }],
                // This entry should get removed
                ['ext2', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }]
            ]));
            const diff2 = merged1.diff(merged3, undefined);
            strictEqual(diff2.changed.size, 0);
            strictEqual(diff2.removed.size, 0);
            deepStrictEqual([...diff.added.entries()], [...diff2.added.entries()], 'Swapping the order of the entries in the other collection should yield the same result');
        });
        test('should remove entries in the diff that come after a Replace', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }]
                        ])
                    }]
            ]));
            const merged4 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }]
                        ])
                    }],
                // This entry should get removed as it comes after a replace
                ['ext2', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Append, variable: 'A' }]
                        ])
                    }]
            ]));
            const diff = merged1.diff(merged4, undefined);
            strictEqual(diff, undefined, 'Replace should ignore any entries after it');
        });
        test('should generate removed diffs', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Replace, variable: 'B' }]
                        ])
                    }]
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }]
                        ])
                    }]
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.changed.size, 0);
            strictEqual(diff.added.size, 0);
            deepStrictEqual([...diff.removed.entries()], [
                ['B', [{ extensionIdentifier: 'ext1', value: 'b', type: EnvironmentVariableMutatorType.Replace, variable: 'B', options: undefined }]]
            ]);
        });
        test('should generate changed diffs', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Replace, variable: 'B' }]
                        ])
                    }]
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B' }]
                        ])
                    }]
            ]));
            const diff = merged1.diff(merged2, undefined);
            strictEqual(diff.added.size, 0);
            strictEqual(diff.removed.size, 0);
            deepStrictEqual([...diff.changed.entries()], [
                ['A', [{ extensionIdentifier: 'ext1', value: 'a2', type: EnvironmentVariableMutatorType.Replace, variable: 'A', options: undefined }]],
                ['B', [{ extensionIdentifier: 'ext1', value: 'b', type: EnvironmentVariableMutatorType.Append, variable: 'B', options: undefined }]]
            ]);
        });
        test('should generate diffs with added, changed and removed', () => {
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Prepend, variable: 'B' }]
                        ])
                    }]
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Replace, variable: 'A' }],
                            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Append, variable: 'C' }]
                        ])
                    }]
            ]));
            const diff = merged1.diff(merged2, undefined);
            deepStrictEqual([...diff.added.entries()], [
                ['C', [{ extensionIdentifier: 'ext1', value: 'c', type: EnvironmentVariableMutatorType.Append, variable: 'C', options: undefined }]],
            ]);
            deepStrictEqual([...diff.removed.entries()], [
                ['B', [{ extensionIdentifier: 'ext1', value: 'b', type: EnvironmentVariableMutatorType.Prepend, variable: 'B', options: undefined }]]
            ]);
            deepStrictEqual([...diff.changed.entries()], [
                ['A', [{ extensionIdentifier: 'ext1', value: 'a2', type: EnvironmentVariableMutatorType.Replace, variable: 'A', options: undefined }]]
            ]);
        });
        test('should only generate workspace specific diffs', () => {
            const scope1 = { workspaceFolder: { uri: URI.file('workspace1'), name: 'workspace1', index: 0 } };
            const scope2 = { workspaceFolder: { uri: URI.file('workspace2'), name: 'workspace2', index: 3 } };
            const merged1 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a1', type: EnvironmentVariableMutatorType.Replace, scope: scope1, variable: 'A' }],
                            ['B', { value: 'b', type: EnvironmentVariableMutatorType.Prepend, variable: 'B' }]
                        ])
                    }]
            ]));
            const merged2 = new MergedEnvironmentVariableCollection(new Map([
                ['ext1', {
                        map: deserializeEnvironmentVariableCollection([
                            ['A-key', { value: 'a2', type: EnvironmentVariableMutatorType.Replace, scope: scope1, variable: 'A' }],
                            ['C', { value: 'c', type: EnvironmentVariableMutatorType.Append, scope: scope2, variable: 'C' }]
                        ])
                    }]
            ]));
            const diff = merged1.diff(merged2, scope1);
            strictEqual(diff.added.size, 0);
            deepStrictEqual([...diff.removed.entries()], [
                ['B', [{ extensionIdentifier: 'ext1', value: 'b', type: EnvironmentVariableMutatorType.Prepend, variable: 'B', options: undefined }]]
            ]);
            deepStrictEqual([...diff.changed.entries()], [
                ['A', [{ extensionIdentifier: 'ext1', value: 'a2', type: EnvironmentVariableMutatorType.Replace, scope: scope1, variable: 'A', options: undefined }]]
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZUNvbGxlY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2NvbW1vbi9lbnZpcm9ubWVudFZhcmlhYmxlQ29sbGVjdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3RELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2hILE9BQU8sRUFBdUIsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDL0gsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLHdDQUF3QyxFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDdEssT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQywyREFBMkQsRUFBRSxHQUFHLEVBQUU7SUFDdkUsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUNsQixJQUFJLENBQUMsdUVBQXVFLEVBQUUsR0FBRyxFQUFFO1lBQ2xGLE1BQU0sTUFBTSxHQUFHLElBQUksbUNBQW1DLENBQUMsSUFBSSxHQUFHLENBQUM7Z0JBQzlELENBQUMsTUFBTSxFQUFFO3dCQUNSLEdBQUcsRUFBRSx3Q0FBd0MsQ0FBQzs0QkFDN0MsQ0FBQyxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSw4QkFB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