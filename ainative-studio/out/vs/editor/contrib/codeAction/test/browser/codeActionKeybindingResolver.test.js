/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { KeyCodeChord } from '../../../../../base/common/keybindings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { organizeImportsCommandId, refactorCommandId } from '../../browser/codeAction.js';
import { CodeActionKeybindingResolver } from '../../browser/codeActionKeybindingResolver.js';
import { CodeActionKind } from '../../common/types.js';
import { ResolvedKeybindingItem } from '../../../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
suite('CodeActionKeybindingResolver', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const refactorKeybinding = createCodeActionKeybinding(31 /* KeyCode.KeyA */, refactorCommandId, { kind: CodeActionKind.Refactor.value });
    const refactorExtractKeybinding = createCodeActionKeybinding(32 /* KeyCode.KeyB */, refactorCommandId, { kind: CodeActionKind.Refactor.append('extract').value });
    const organizeImportsKeybinding = createCodeActionKeybinding(33 /* KeyCode.KeyC */, organizeImportsCommandId, undefined);
    test('Should match refactor keybindings', async function () {
        const resolver = new CodeActionKeybindingResolver(createMockKeyBindingService([refactorKeybinding])).getResolver();
        assert.strictEqual(resolver({ title: '' }), undefined);
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.Refactor.value }), refactorKeybinding.resolvedKeybinding);
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.Refactor.append('extract').value }), refactorKeybinding.resolvedKeybinding);
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.QuickFix.value }), undefined);
    });
    test('Should prefer most specific keybinding', async function () {
        const resolver = new CodeActionKeybindingResolver(createMockKeyBindingService([refactorKeybinding, refactorExtractKeybinding, organizeImportsKeybinding])).getResolver();
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.Refactor.value }), refactorKeybinding.resolvedKeybinding);
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.Refactor.append('extract').value }), refactorExtractKeybinding.resolvedKeybinding);
    });
    test('Organize imports should still return a keybinding even though it does not have args', async function () {
        const resolver = new CodeActionKeybindingResolver(createMockKeyBindingService([refactorKeybinding, refactorExtractKeybinding, organizeImportsKeybinding])).getResolver();
        assert.strictEqual(resolver({ title: '', kind: CodeActionKind.SourceOrganizeImports.value }), organizeImportsKeybinding.resolvedKeybinding);
    });
});
function createMockKeyBindingService(items) {
    return {
        getKeybindings: () => {
            return items;
        },
    };
}
function createCodeActionKeybinding(keycode, command, commandArgs) {
    return new ResolvedKeybindingItem(new USLayoutResolvedKeybinding([new KeyCodeChord(false, true, false, false, keycode)], 3 /* OperatingSystem.Linux */), command, commandArgs, undefined, false, null, false);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbktleWJpbmRpbmdSZXNvbHZlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vdGVzdC9icm93c2VyL2NvZGVBY3Rpb25LZXliaW5kaW5nUmVzb2x2ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBR3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUV2RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM3RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUVySCxLQUFLLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO0lBRTFDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxrQkFBa0IsR0FBRywwQkFBMEIsd0JBRXBELGlCQUFpQixFQUNqQixFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFFMUMsTUFBTSx5QkFBeUIsR0FBRywwQkFBMEIsd0JBRTNELGlCQUFpQixFQUNqQixFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxL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