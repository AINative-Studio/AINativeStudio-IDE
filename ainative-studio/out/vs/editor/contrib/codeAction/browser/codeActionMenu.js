/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../../../base/browser/ui/codicons/codiconStyles.js'; // The codicon symbol styles are defined here and must be loaded
import { Codicon } from '../../../../base/common/codicons.js';
import { CodeActionKind } from '../common/types.js';
import '../../symbolIcons/browser/symbolIcons.js'; // The codicon symbol colors are defined here and must be loaded to get colors
import { localize } from '../../../../nls.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
const uncategorizedCodeActionGroup = Object.freeze({ kind: HierarchicalKind.Empty, title: localize('codeAction.widget.id.more', 'More Actions...') });
const codeActionGroups = Object.freeze([
    { kind: CodeActionKind.QuickFix, title: localize('codeAction.widget.id.quickfix', 'Quick Fix') },
    { kind: CodeActionKind.RefactorExtract, title: localize('codeAction.widget.id.extract', 'Extract'), icon: Codicon.wrench },
    { kind: CodeActionKind.RefactorInline, title: localize('codeAction.widget.id.inline', 'Inline'), icon: Codicon.wrench },
    { kind: CodeActionKind.RefactorRewrite, title: localize('codeAction.widget.id.convert', 'Rewrite'), icon: Codicon.wrench },
    { kind: CodeActionKind.RefactorMove, title: localize('codeAction.widget.id.move', 'Move'), icon: Codicon.wrench },
    { kind: CodeActionKind.SurroundWith, title: localize('codeAction.widget.id.surround', 'Surround With'), icon: Codicon.surroundWith },
    { kind: CodeActionKind.Source, title: localize('codeAction.widget.id.source', 'Source Action'), icon: Codicon.symbolFile },
    uncategorizedCodeActionGroup,
]);
export function toMenuItems(inputCodeActions, showHeaders, keybindingResolver) {
    if (!showHeaders) {
        return inputCodeActions.map((action) => {
            return {
                kind: "action" /* ActionListItemKind.Action */,
                item: action,
                group: uncategorizedCodeActionGroup,
                disabled: !!action.action.disabled,
                label: action.action.disabled || action.action.title,
                canPreview: !!action.action.edit?.edits.length,
            };
        });
    }
    // Group code actions
    const menuEntries = codeActionGroups.map(group => ({ group, actions: [] }));
    for (const action of inputCodeActions) {
        const kind = action.action.kind ? new HierarchicalKind(action.action.kind) : HierarchicalKind.None;
        for (const menuEntry of menuEntries) {
            if (menuEntry.group.kind.contains(kind)) {
                menuEntry.actions.push(action);
                break;
            }
        }
    }
    const allMenuItems = [];
    for (const menuEntry of menuEntries) {
        if (menuEntry.actions.length) {
            allMenuItems.push({ kind: "header" /* ActionListItemKind.Header */, group: menuEntry.group });
            for (const action of menuEntry.actions) {
                const group = menuEntry.group;
                allMenuItems.push({
                    kind: "action" /* ActionListItemKind.Action */,
                    item: action,
                    group: action.action.isAI ? { title: group.title, kind: group.kind, icon: Codicon.sparkle } : group,
                    label: action.action.title,
                    disabled: !!action.action.disabled,
                    keybinding: keybindingResolver(action.action),
                });
            }
        }
    }
    return allMenuItems;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9icm93c2VyL2NvZGVBY3Rpb25NZW51LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sdURBQXVELENBQUMsQ0FBQyxnRUFBZ0U7QUFDaEksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBSTlELE9BQU8sRUFBa0IsY0FBYyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDcEUsT0FBTywwQ0FBMEMsQ0FBQyxDQUFDLDhFQUE4RTtBQUNqSSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFRL0UsTUFBTSw0QkFBNEIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFjLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRW5LLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBZ0I7SUFDckQsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLFdBQVcsQ0FBQyxFQUFFO0lBQ2hHLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxTQUFTLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRTtJQUMxSCxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsY0FBYyxFQUFF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