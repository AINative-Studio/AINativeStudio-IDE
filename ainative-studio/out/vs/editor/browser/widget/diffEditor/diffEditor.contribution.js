/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { AccessibleDiffViewerNext, AccessibleDiffViewerPrev, CollapseAllUnchangedRegions, ExitCompareMove, RevertHunkOrSelection, ShowAllUnchangedRegions, SwitchSide, ToggleCollapseUnchangedRegions, ToggleShowMovedCodeBlocks, ToggleUseInlineViewWhenSpaceIsLimited } from './commands.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { localize } from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyEqualsExpr, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import './registrations.contribution.js';
registerAction2(ToggleCollapseUnchangedRegions);
registerAction2(ToggleShowMovedCodeBlocks);
registerAction2(ToggleUseInlineViewWhenSpaceIsLimited);
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: new ToggleUseInlineViewWhenSpaceIsLimited().desc.id,
        title: localize('useInlineViewWhenSpaceIsLimited', "Use Inline View When Space Is Limited"),
        toggled: ContextKeyExpr.has('config.diffEditor.useInlineViewWhenSpaceIsLimited'),
        precondition: ContextKeyExpr.has('isInDiffEditor'),
    },
    order: 11,
    group: '1_diff',
    when: ContextKeyExpr.and(EditorContextKeys.diffEditorRenderSideBySideInlineBreakpointReached, ContextKeyExpr.has('isInDiffEditor')),
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: new ToggleShowMovedCodeBlocks().desc.id,
        title: localize('showMoves', "Show Moved Code Blocks"),
        icon: Codicon.move,
        toggled: ContextKeyEqualsExpr.create('config.diffEditor.experimental.showMoves', true),
        precondition: ContextKeyExpr.has('isInDiffEditor'),
    },
    order: 10,
    group: '1_diff',
    when: ContextKeyExpr.has('isInDiffEditor'),
});
registerAction2(RevertHunkOrSelection);
for (const ctx of [
    { icon: Codicon.arrowRight, key: EditorContextKeys.diffEditorInlineMode.toNegated() },
    { icon: Codicon.discard, key: EditorContextKeys.diffEditorInlineMode }
]) {
    MenuRegistry.appendMenuItem(MenuId.DiffEditorHunkToolbar, {
        command: {
            id: new RevertHunkOrSelection().desc.id,
            title: localize('revertHunk', "Revert Block"),
            icon: ctx.icon,
        },
        when: ContextKeyExpr.and(EditorContextKeys.diffEditorModifiedWritable, ctx.key),
        order: 5,
        group: 'primary',
    });
    MenuRegistry.appendMenuItem(MenuId.DiffEditorSelectionToolbar, {
        command: {
            id: new RevertHunkOrSelection().desc.id,
            title: localize('revertSelection', "Revert Selection"),
            icon: ctx.icon,
        },
        when: ContextKeyExpr.and(EditorContextKeys.diffEditorModifiedWritable, ctx.key),
        order: 5,
        group: 'primary',
    });
}
registerAction2(SwitchSide);
registerAction2(ExitCompareMove);
registerAction2(CollapseAllUnchangedRegions);
registerAction2(ShowAllUnchangedRegions);
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: AccessibleDiffViewerNext.id,
        title: localize('Open Accessible Diff Viewer', "Open Accessible Diff Viewer"),
        precondition: ContextKeyExpr.has('isInDiffEditor'),
    },
    order: 10,
    group: '2_diff',
    when: ContextKeyExpr.and(EditorContextKeys.accessibleDiffViewerVisible.negate(), ContextKeyExpr.has('isInDiffEditor')),
});
CommandsRegistry.registerCommandAlias('editor.action.diffReview.next', AccessibleDiffViewerNext.id);
registerAction2(AccessibleDiffViewerNext);
CommandsRegistry.registerCommandAlias('editor.action.diffReview.prev', AccessibleDiffViewerPrev.id);
registerAction2(AccessibleDiffViewerPrev);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvci5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZGlmZkVkaXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSx3QkFBd0IsRUFBRSwyQkFBMkIsRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsVUFBVSxFQUFFLDhCQUE4QixFQUFFLHlCQUF5QixFQUFFLHFDQUFxQyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQy9SLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDNUcsT0FBTyxpQ0FBaUMsQ0FBQztBQUV6QyxlQUFlLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUNoRCxlQUFlLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUMzQyxlQUFlLENBQUMscUNBQXFDLENBQUMsQ0FBQztBQUV2RCxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUU7SUFDL0MsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLElBQUkscUNBQXFDLEVBQUUs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