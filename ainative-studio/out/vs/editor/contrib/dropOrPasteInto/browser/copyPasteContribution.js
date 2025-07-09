/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import * as nls from '../../../../nls.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { CopyPasteController, changePasteTypeCommandId, pasteWidgetVisibleCtx } from './copyPasteController.js';
import { DefaultPasteProvidersFeature, DefaultTextPasteOrDropEditProvider } from './defaultProviders.js';
export const pasteAsCommandId = 'editor.action.pasteAs';
registerEditorContribution(CopyPasteController.ID, CopyPasteController, 0 /* EditorContributionInstantiation.Eager */); // eager because it listens to events on the container dom node of the editor
registerEditorFeature(DefaultPasteProvidersFeature);
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: changePasteTypeCommandId,
            precondition: pasteWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        return CopyPasteController.get(editor)?.changePasteType();
    }
});
registerEditorCommand(new class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.hidePasteWidget',
            precondition: pasteWidgetVisibleCtx,
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        CopyPasteController.get(editor)?.clearWidgets();
    }
});
registerEditorAction(class PasteAsAction extends EditorAction {
    static { this.argsSchema = {
        oneOf: [
            {
                type: 'object',
                required: ['kind'],
                properties: {
                    kind: {
                        type: 'string',
                        description: nls.localize('pasteAs.kind', "The kind of the paste edit to try pasting with.\nIf there are multiple edits for this kind, the editor will show a picker. If there are no edits of this kind, the editor will show an error message."),
                    }
                },
            },
            {
                type: 'object',
                required: ['preferences'],
                properties: {
                    preferences: {
                        type: 'array',
                        description: nls.localize('pasteAs.preferences', "List of preferred paste edit kind to try applying.\nThe first edit matching the preferences will be applied."),
                        items: { type: 'string' }
                    }
                },
            }
        ]
    }; }
    constructor() {
        super({
            id: pasteAsCommandId,
            label: nls.localize2('pasteAs', "Paste As..."),
            precondition: EditorContextKeys.writable,
            metadata: {
                description: 'Paste as',
                args: [{
                        name: 'args',
                        schema: PasteAsAction.argsSchema
                    }]
            }
        });
    }
    run(_accessor, editor, args) {
        let preference;
        if (args) {
            if ('kind' in args) {
                preference = { only: new HierarchicalKind(args.kind) };
            }
            else if ('preferences' in args) {
                preference = { preferences: args.preferences.map(kind => new HierarchicalKind(kind)) };
            }
        }
        return CopyPasteController.get(editor)?.pasteAs(preference);
    }
});
registerEditorAction(class extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.pasteAsText',
            label: nls.localize2('pasteAsText', "Paste as Text"),
            precondition: EditorContextKeys.writable,
        });
    }
    run(_accessor, editor) {
        return CopyPasteController.get(editor)?.pasteAs({ providerId: DefaultTextPasteOrDropEditProvider.id });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29weVBhc3RlQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL2NvcHlQYXN0ZUNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUcvRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRzFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFxRCxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9NLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBbUIsd0JBQXdCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqSSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUV6RyxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQztBQUV4RCwwQkFBMEIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLGdEQUF3QyxDQUFDLENBQUMsNkVBQTZFO0FBQzdMLHFCQUFxQixDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFFcEQscUJBQXFCLENBQUMsSUFBSSxLQUFNLFNBQVEsYUFBYTtJQUNwRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx3QkFBd0I7WUFDNUIsWUFBWSxFQUFFLHFCQUFxQjtZQUNuQyxNQUFN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