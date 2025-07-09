/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorCommand, registerEditorCommand } from '../../../browser/editorExtensions.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { localize } from '../../../../nls.js';
const IEditorCancellationTokens = createDecorator('IEditorCancelService');
const ctxCancellableOperation = new RawContextKey('cancellableOperation', false, localize('cancellableOperation', 'Whether the editor runs a cancellable operation, e.g. like \'Peek References\''));
registerSingleton(IEditorCancellationTokens, class {
    constructor() {
        this._tokens = new WeakMap();
    }
    add(editor, cts) {
        let data = this._tokens.get(editor);
        if (!data) {
            data = editor.invokeWithinContext(accessor => {
                const key = ctxCancellableOperation.bindTo(accessor.get(IContextKeyService));
                const tokens = new LinkedList();
                return { key, tokens };
            });
            this._tokens.set(editor, data);
        }
        let removeFn;
        data.key.set(true);
        removeFn = data.tokens.push(cts);
        return () => {
            // remove w/o cancellation
            if (removeFn) {
                removeFn();
                data.key.set(!data.tokens.isEmpty());
                removeFn = undefined;
            }
        };
    }
    cancel(editor) {
        const data = this._tokens.get(editor);
        if (!data) {
            return;
        }
        // remove with cancellation
        const cts = data.tokens.pop();
        if (cts) {
            cts.cancel();
            data.key.set(!data.tokens.isEmpty());
        }
    }
}, 1 /* InstantiationType.Delayed */);
export class EditorKeybindingCancellationTokenSource extends CancellationTokenSource {
    constructor(editor, parent) {
        super(parent);
        this.editor = editor;
        this._unregister = editor.invokeWithinContext(accessor => accessor.get(IEditorCancellationTokens).add(editor, this));
    }
    dispose() {
        this._unregister();
        super.dispose();
    }
}
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.cancelOperation',
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */
            },
            precondition: ctxCancellableOperation
        });
    }
    runEditorCommand(accessor, editor) {
        accessor.get(IEditorCancellationTokens).cancel(editor);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0NhbmNlbGxhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9lZGl0b3JTdGF0ZS9icm93c2VyL2tleWJpbmRpbmdDYW5jZWxsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTVGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQWUsTUFBTSxzREFBc0QsQ0FBQztBQUV0SCxPQUFPLEVBQUUsdUJBQXVCLEVBQXFCLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDL0csT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUc5QyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBNEIsc0JBQXNCLENBQUMsQ0FBQztBQVFyRyxNQUFNLHVCQUF1QixHQUFHLElBQUksYUFBYSxDQUFDLHNCQUFzQixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsZ0ZBQWdGLENBQUMsQ0FBQyxDQUFDO0FBRXJNLGlCQUFpQixDQUFDLHlCQUF5QixFQUFFO0lBQUE7UUFJM0IsWUFBTyxHQUFHLElBQUksT0FBTyxFQUEyRixDQUFDO0lBeUNuSSxDQUFDO0lBdkNBLEdBQUcsQ0FBQyxNQUFtQixFQUFFLEdBQTRCO1FBQ3BELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1B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