/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { HierarchicalKind } from '../../../../../base/common/hierarchicalKind.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import { getCodeActions } from '../../browser/codeAction.js';
import { CodeActionItem, CodeActionKind, CodeActionTriggerSource } from '../../common/types.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { Progress } from '../../../../../platform/progress/common/progress.js';
function staticCodeActionProvider(...actions) {
    return new class {
        provideCodeActions() {
            return {
                actions: actions,
                dispose: () => { }
            };
        }
    };
}
suite('CodeAction', () => {
    const langId = 'fooLang';
    const uri = URI.parse('untitled:path');
    let model;
    let registry;
    const disposables = new DisposableStore();
    const testData = {
        diagnostics: {
            abc: {
                title: 'bTitle',
                diagnostics: [{
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 2,
                        endColumn: 1,
                        severity: MarkerSeverity.Error,
                        message: 'abc'
                    }]
            },
            bcd: {
                title: 'aTitle',
                diagnostics: [{
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 2,
                        endColumn: 1,
                        severity: MarkerSeverity.Error,
                        message: 'bcd'
                    }]
            }
        },
        command: {
            abc: {
                command: new class {
                },
                title: 'Extract to inner function in function "test"'
            }
        },
        spelling: {
            bcd: {
                diagnostics: [],
                edit: new class {
                },
                title: 'abc'
            }
        },
        tsLint: {
            abc: {
                $ident: 'funny' + 57,
                arguments: [],
                id: '_internal_command_delegation',
                title: 'abc'
            },
            bcd: {
                $ident: 'funny' + 47,
                arguments: [],
                id: '_internal_command_delegation',
                title: 'bcd'
            }
        }
    };
    setup(() => {
        registry = new LanguageFeatureRegistry();
        disposables.clear();
        model = createTextModel('test1\ntest2\ntest3', langId, undefined, uri);
        disposables.add(model);
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('CodeActions are sorted by type, #38623', async () => {
        const provider = staticCodeActionProvider(testData.command.abc, testData.diagnostics.bcd, testData.spelling.bcd, testData.tsLint.bcd, testData.tsLint.abc, testData.diagnostics.abc);
        disposables.add(registry.register('fooLang', provider));
        const expected = [
            // CodeActions with a diagnostics array are shown first without further sorting
            new CodeActionItem(testData.diagnostics.bcd, provider),
            new CodeActionItem(testData.diagnostics.abc, provider),
            // CodeActions without diagnostics are shown in the given order without any further sorting
            new CodeActionItem(testData.command.abc, provider),
            new CodeActionItem(testData.spelling.bcd, provider),
            new CodeActionItem(testData.tsLint.bcd, provider),
            new CodeActionItem(testData.tsLint.abc, provider)
        ];
        const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), { type: 1 /* languages.CodeActionTriggerType.Invoke */, triggerAction: CodeActionTriggerSource.Default }, Progress.None, CancellationToken.None));
        assert.strictEqual(actions.length, 6);
        assert.deepStrictEqual(actions, expected);
    });
    test('getCodeActions should filter by scope', async () => {
        const provider = staticCodeActionProvider({ title: 'a', kind: 'a' }, { title: 'b', kind: 'b' }, { title: 'a.b', kind: 'a.b' });
        disposables.add(registry.register('fooLang', provider));
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), { type: 2 /* languages.CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default, filter: { include: new HierarchicalKind('a') } }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 2);
            assert.strictEqual(actions[0].action.title, 'a');
            assert.strictEqual(actions[1].action.title, 'a.b');
        }
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), { type: 2 /* languages.CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default, filter: { include: new HierarchicalKind('a.b') } }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'a.b');
        }
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), { type: 2 /* languages.CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default, filter: { include: new HierarchicalKind('a.b.c') } }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 0);
        }
    });
    test('getCodeActions should forward requested scope to providers', async () => {
        const provider = new class {
            provideCodeActions(_model, _range, context, _token) {
                return {
                    actions: [
                        { title: context.only || '', kind: context.only }
                    ],
                    dispose: () => { }
                };
            }
        };
        disposables.add(registry.register('fooLang', provider));
        const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), { type: 2 /* languages.CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default, filter: { include: new HierarchicalKind('a') } }, Progress.None, CancellationToken.None));
        assert.strictEqual(actions.length, 1);
        assert.strictEqual(actions[0].action.title, 'a');
    });
    test('getCodeActions should not return source code action by default', async () => {
        const provider = staticCodeActionProvider({ title: 'a', kind: CodeActionKind.Source.value }, { title: 'b', kind: 'b' });
        disposables.add(registry.register('fooLang', provider));
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), { type: 2 /* languages.CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.SourceAction }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'b');
        }
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), { type: 2 /* languages.CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default, filter: { include: CodeActionKind.Source, includeSourceActions: true } }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'a');
        }
    });
    test('getCodeActions should support filtering out some requested source code actions #84602', async () => {
        const provider = staticCodeActionProvider({ title: 'a', kind: CodeActionKind.Source.value }, { title: 'b', kind: CodeActionKind.Source.append('test').value }, { title: 'c', kind: 'c' });
        disposables.add(registry.register('fooLang', provider));
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
                type: 2 /* languages.CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.SourceAction, filter: {
                    include: CodeActionKind.Source.append('test'),
                    excludes: [CodeActionKind.Source],
                    includeSourceActions: true,
                }
            }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'b');
        }
    });
    test('getCodeActions no invoke a provider that has been excluded #84602', async () => {
        const baseType = CodeActionKind.Refactor;
        const subType = CodeActionKind.Refactor.append('sub');
        disposables.add(registry.register('fooLang', staticCodeActionProvider({ title: 'a', kind: baseType.value })));
        let didInvoke = false;
        disposables.add(registry.register('fooLang', new class {
            constructor() {
                this.providedCodeActionKinds = [subType.value];
            }
            provideCodeActions() {
                didInvoke = true;
                return {
                    actions: [
                        { title: 'x', kind: subType.value }
                    ],
                    dispose: () => { }
                };
            }
        }));
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
                type: 2 /* languages.CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Refactor, filter: {
                    include: baseType,
                    excludes: [subType],
                }
            }, Progress.None, CancellationToken.None));
            assert.strictEqual(didInvoke, false);
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'a');
        }
    });
    test('getCodeActions should not invoke code action providers filtered out by providedCodeActionKinds', async () => {
        let wasInvoked = false;
        const provider = new class {
            constructor() {
                this.providedCodeActionKinds = [CodeActionKind.Refactor.value];
            }
            provideCodeActions() {
                wasInvoked = true;
                return { actions: [], dispose: () => { } };
            }
        };
        disposables.add(registry.register('fooLang', provider));
        const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
            type: 2 /* languages.CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Refactor,
            filter: {
                include: CodeActionKind.QuickFix
            }
        }, Progress.None, CancellationToken.None));
        assert.strictEqual(actions.length, 0);
        assert.strictEqual(wasInvoked, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vdGVzdC9icm93c2VyL2NvZGVBY3Rpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFL0UsU0FBUyx3QkFBd0IsQ0FBQyxHQUFHLE9BQStCO0lBQ25FLE9BQU8sSUFBSTtRQUNWLGtCQUFrQjtZQUNqQixPQUFPO2dCQUNOLE9BQU8sRUFBRSxPQUFPO2dCQUNoQixPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQzthQUNsQixDQUFDO1FBQ0gsQ0FBQztLQUNELENBQUM7QUFDSCxDQUFDO0FBR0QsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7SUFFeEIsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDO0lBQ3pCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDdkMsSUFBSSxLQUFnQixDQUFDO0lBQ3JCLElBQUksUUFBK0QsQ0FBQztJQUNwRSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLE1BQU0sUUFBUSxHQUFHO1FBQ2hCLFdBQVcsRUFBRTtZQUNaLEdBQUcsRUFBRTtnQkFDSixLQUFLLEVBQUUsUUFBUTtnQkFDZixXQUFXLEVBQUUsQ0FBQzt3QkFDYixlQUFlLEVBQUUsQ0FBQzt3QkFDbEIsV0FBVyxFQUFFLENBQUM7d0JBQ2QsYUFBYSxFQUFFLENBQUM7d0JBQ2hCLFNBQVMsRUFBRSxDQUFDO3dCQUNaLFFBQVEsRUFBRSxjQUFjLENBQUMsS0FBSzt3QkFDOUIsT0FBTyxFQUFFLEtBQUs7cUJBQ2QsQ0FBQzthQUNGO1lBQ0QsR0FBRyxFQUFFO2dCQUNKLEtBQUssRUFBRSxRQUFRO2dCQUNmLFdBQVcsRUFBRSxDQUFDO3dCQUNiLGVBQWUsRUFBRSxDQUFDO3dCQUNsQixXQUFXLEVBQUUsQ0FBQzt3QkFDZCxhQUFhLEVBQUUsQ0FBQzt3QkFDaEIsU0FBUyxFQUFFLENBQUM7d0JBQ1osUUFBUSxFQUFFLGNBQWMsQ0FBQyxLQUFLO3dCQUM5QixPQUFPLEVBQUUsS0FBSztxQkFDZCxDQUFDO2FBQ0Y7U0FDRDtRQUNELE9BQU8sRUFBRTtZQUNSLEdBQUcsRUFBRTtnQkFDSixPQUFPLEVBQUUsSUFBSTtpQkFHWjtnQkFDRCxLQUFLLEVBQUUsOENBQThDO2FBQ3JEO1NBQ0Q7UUFDRCxRQUFRLEVBQUU7WUFDVCxHQUFHLEVBQUU7Z0JBQ0osV0FBVyxFQUFpQixFQUFFO2dCQUM5QixJQUFJLEVBQUUsSUFBSTtpQkFFVDtnQkFDRCxLQUFLLEVBQUUsS0FBSzthQUNaO1NBQ0Q7UUFDRCxNQUFNLEVBQUU7WUFDUCxHQUFHLEVBQUU7Z0JBQ0osTUFBTSxFQUFFLE9BQU8sR0FBRyxFQUFFO2dCQUNwQixTQUFTLEVBQWlCLEVBQUU7Z0JBQzVCLEVBQUUsRUFBRSw4QkFBOEI7Z0JBQ2xDLEtBQUssRUFBRSxLQUFLO2FBQ1o7WUFDRCxHQUFHLEVBQUU7Z0JBQ0osTUFBTSxFQUFFLE9BQU8sR0FBRyxFQUFFO2dCQUNwQixTQUFTLEVBQWlCLEVBQUU7Z0JBQzVCLEVBQUUsRUFBRSw4QkFBOEI7Z0JBQ2xDLEtBQUssRUFBRSxLQUFLO2FBQ1o7U0FDRDtLQUNELENBQUM7SUFFRixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsUUFBUSxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUN6QyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEIsS0FBSyxHQUFHLGVBQWUsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZFLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFFekQsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQ3hDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUNwQixRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFDeEIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQ3JCLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUNuQixRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFDbkIsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQ3hCLENBQUM7UUFFRixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFeEQsTUFBTSxRQUFRLEdBQUc7WUFDaEIsK0VBQStFO1lBQy9FLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQztZQUN0RCxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUM7WUFFdEQsMkZBQTJGO1lBQzNGLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQztZQUNsRCxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUM7WUFDbkQsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDO1lBQ2pELElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQztTQUNqRCxDQUFDO1FBRUYsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLGdEQUF3QyxFQUFFLGFBQWEsRUFBRSx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDelAsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hELE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUN4QyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUN6QixFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUN6QixFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUM3QixDQUFDO1FBRUYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXhELENBQUM7WUFDQSxNQUFNLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksOENBQXNDLEVBQUUsYUFBYSxFQUFFLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3ZTLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUVELENBQUM7WUFDQSxNQUFNLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksOENBQXNDLEVBQUUsYUFBYSxFQUFFLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pTLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRCxDQUFDO1lBQ0EsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLDhDQUFzQyxFQUFFLGFBQWEsRUFBRSx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMzUyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkMsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdFLE1BQU0sUUFBUSxHQUFHLElBQUk7WUFDcEIsa0JBQWtCLENBQUMsTUFBVyxFQUFFLE1BQWEsRUFBRSxPQUFvQyxFQUFFLE1BQVc7Z0JBQy9GLE9BQU87b0JBQ04sT0FBTyxFQUFFO3dCQUNSLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFO3FCQUNqRDtvQkFDRCxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztpQkFDbEIsQ0FBQztZQUNILENBQUM7U0FDRCxDQUFDO1FBRUYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXhELE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSw4Q0FBc0MsRUFBRSxhQUFhLEVBQUUsdUJBQXVCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdlMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0VBQWdFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakYsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQ3hDLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsRUFDakQsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FDekIsQ0FBQztRQUVGLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUV4RCxDQUFDO1lBQ0EsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLDhDQUFzQyxFQUFFLGFBQWEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDNVAsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELENBQUM7WUFDQSxNQUFNLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLElBQUksOENBQXNDLEVBQUUsYUFBYSxFQUFFLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMvVCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsRCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUZBQXVGLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEcsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQ3hDLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsRUFDakQsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFDaEUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FDekIsQ0FBQztRQUVGLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUV4RCxDQUFDO1lBQ0EsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQzlHLElBQUksOENBQXNDLEVBQUUsYUFBYSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUU7b0JBQ3hHLE9BQU8sRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7b0JBQzdDLFFBQVEsRUFBRSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7b0JBQ2pDLG9CQUFvQixFQUFFLElBQUk7aUJBQzFCO2FBQ0QsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEQsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1FQUFtRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BGLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUM7UUFDekMsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSx3QkFBd0IsQ0FDcEUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQ3BDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsSUFBSTtZQUFBO2dCQUVoRCw0QkFBdUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQVczQyxDQUFDO1lBVEEsa0JBQWtCO2dCQUNqQixTQUFTLEdBQUcsSUFBSSxDQUFDO2dCQUNqQixPQUFPO29CQUNOLE9BQU8sRUFBRTt3QkFDUixFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUU7cUJBQ25DO29CQUNELE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO2lCQUNsQixDQUFDO1lBQ0gsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO1FBRUosQ0FBQztZQUNBLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUM5RyxJQUFJLDhDQUFzQyxFQUFFLGFBQWEsRUFBRSx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFO29CQUNwRyxPQUFPLEVBQUUsUUFBUTtvQkFDakIsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDO2lCQUNuQjthQUNELEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnR0FBZ0csRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqSCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSTtZQUFBO2dCQU1wQiw0QkFBdUIsR0FBRyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDM0QsQ0FBQztZQU5BLGtCQUFrQjtnQkFDakIsVUFBVSxHQUFHLElBQUksQ0FBQztnQkFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVDLENBQUM7U0FHRCxDQUFDO1FBRUYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXhELE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQzlHLElBQUksOENBQXNDLEVBQUUsYUFBYSxFQUFFLHVCQUF1QixDQUFDLFFBQVE7WUFDM0YsTUFBTSxFQUFFO2dCQUNQLE9BQU8sRUFBRSxjQUFjLENBQUMsUUFBUTthQUNoQztTQUNELEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=