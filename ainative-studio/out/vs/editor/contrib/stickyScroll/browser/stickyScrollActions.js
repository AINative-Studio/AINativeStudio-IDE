/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction2 } from '../../../browser/editorExtensions.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { StickyScrollController } from './stickyScrollController.js';
export class ToggleStickyScroll extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.toggleStickyScroll',
            title: {
                ...localize2('toggleEditorStickyScroll', "Toggle Editor Sticky Scroll"),
                mnemonicTitle: localize({ key: 'mitoggleStickyScroll', comment: ['&& denotes a mnemonic'] }, "&&Toggle Editor Sticky Scroll"),
            },
            metadata: {
                description: localize2('toggleEditorStickyScroll.description', "Toggle/enable the editor sticky scroll which shows the nested scopes at the top of the viewport"),
            },
            category: Categories.View,
            toggled: {
                condition: ContextKeyExpr.equals('config.editor.stickyScroll.enabled', true),
                title: localize('stickyScroll', "Sticky Scroll"),
                mnemonicTitle: localize({ key: 'miStickyScroll', comment: ['&& denotes a mnemonic'] }, "&&Sticky Scroll"),
            },
            menu: [
                { id: MenuId.CommandPalette },
                { id: MenuId.MenubarAppearanceMenu, group: '4_editor', order: 3 },
                { id: MenuId.StickyScrollContext }
            ]
        });
    }
    async runEditorCommand(accessor, editor) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('editor.stickyScroll.enabled');
        const isFocused = StickyScrollController.get(editor)?.isFocused();
        configurationService.updateValue('editor.stickyScroll.enabled', newValue);
        if (isFocused) {
            editor.focus();
        }
    }
}
const weight = 100 /* KeybindingWeight.EditorContrib */;
export class FocusStickyScroll extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.focusStickyScroll',
            title: {
                ...localize2('focusStickyScroll', "Focus Editor Sticky Scroll"),
                mnemonicTitle: localize({ key: 'mifocusEditorStickyScroll', comment: ['&& denotes a mnemonic'] }, "&&Focus Editor Sticky Scroll"),
            },
            precondition: ContextKeyExpr.and(ContextKeyExpr.has('config.editor.stickyScroll.enabled'), EditorContextKeys.stickyScrollVisible),
            menu: [
                { id: MenuId.CommandPalette },
            ]
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.focus();
    }
}
export class SelectNextStickyScrollLine extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.selectNextStickyScrollLine',
            title: localize2('selectNextStickyScrollLine.title', "Select the next editor sticky scroll line"),
            precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
            keybinding: {
                weight,
                primary: 18 /* KeyCode.DownArrow */
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.focusNext();
    }
}
export class SelectPreviousStickyScrollLine extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.selectPreviousStickyScrollLine',
            title: localize2('selectPreviousStickyScrollLine.title', "Select the previous sticky scroll line"),
            precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
            keybinding: {
                weight,
                primary: 16 /* KeyCode.UpArrow */
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.focusPrevious();
    }
}
export class GoToStickyScrollLine extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.goToFocusedStickyScrollLine',
            title: localize2('goToFocusedStickyScrollLine.title', "Go to the focused sticky scroll line"),
            precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
            keybinding: {
                weight,
                primary: 3 /* KeyCode.Enter */
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.goToFocused();
    }
}
export class SelectEditor extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.selectEditor',
            title: localize2('selectEditor.title', "Select Editor"),
            precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
            keybinding: {
                weight,
                primary: 9 /* KeyCode.Escape */
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.selectEditor();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdGlja3lTY3JvbGwvYnJvd3Nlci9zdGlja3lTY3JvbGxBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUVyRSxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsYUFBYTtJQUVwRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxrQ0FBa0M7WUFDdEMsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLDBCQUEwQixFQUFFLDZCQUE2QixDQUFDO2dCQUN2RSxhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLHNCQUFzQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSwrQkFBK0IsQ0FBQzthQUM3SDtZQUNELFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsU0FBUyxDQUFDLHNDQUFzQyxFQUFFLGlH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