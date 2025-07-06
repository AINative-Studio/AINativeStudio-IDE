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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZUNvbGxlY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9jb21tb24vZW52aXJvbm1lbnRWYXJpYWJsZUNvbGxlY3Rpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN0RCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNoSCxPQUFPLEVBQXVCLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQy9ILE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSx3Q0FBd0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ3RLLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxLQUFLLENBQUMsMkRBQTJELEVBQUUsR0FBRyxFQUFFO0lBQ3ZFLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7UUFDbEIsSUFBSSxDQUFDLHVFQUF1RSxFQUFFLEdBQUcsRUFBRTtZQUNsRixNQUFNLE1BQU0sR0FBRyxJQUFJLG1DQUFtQyxDQUFDLElBQUksR0FBRyxDQUFDO2dCQUM5RCxDQUFDLE1BQU0sRUFBRTt3QkFDUixHQUFHLEVBQUUsd0NBQXdDLENBQUM7NEJBQzdDLENBQUMsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUs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