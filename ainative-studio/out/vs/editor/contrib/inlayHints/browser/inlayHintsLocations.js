/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Range } from '../../../common/core/range.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { DefinitionAction, SymbolNavigationAction, SymbolNavigationAnchor } from '../../gotoSymbol/browser/goToCommands.js';
import { PeekContext } from '../../peekView/browser/peekView.js';
import { isIMenuItem, MenuId, MenuItemAction, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
export async function showGoToContextMenu(accessor, editor, anchor, part) {
    const resolverService = accessor.get(ITextModelService);
    const contextMenuService = accessor.get(IContextMenuService);
    const commandService = accessor.get(ICommandService);
    const instaService = accessor.get(IInstantiationService);
    const notificationService = accessor.get(INotificationService);
    await part.item.resolve(CancellationToken.None);
    if (!part.part.location) {
        return;
    }
    const location = part.part.location;
    const menuActions = [];
    // from all registered (not active) context menu actions select those
    // that are a symbol navigation actions
    const filter = new Set(MenuRegistry.getMenuItems(MenuId.EditorContext)
        .map(item => isIMenuItem(item) ? item.command.id : generateUuid()));
    for (const delegate of SymbolNavigationAction.all()) {
        if (filter.has(delegate.desc.id)) {
            menuActions.push(new Action(delegate.desc.id, MenuItemAction.label(delegate.desc, { renderShortTitle: true }), undefined, true, async () => {
                const ref = await resolverService.createModelReference(location.uri);
                try {
                    const symbolAnchor = new SymbolNavigationAnchor(ref.object.textEditorModel, Range.getStartPosition(location.range));
                    const range = part.item.anchor.range;
                    await instaService.invokeFunction(delegate.runEditorCommand.bind(delegate), editor, symbolAnchor, range);
                }
                finally {
                    ref.dispose();
                }
            }));
        }
    }
    if (part.part.command) {
        const { command } = part.part;
        menuActions.push(new Separator());
        menuActions.push(new Action(command.id, command.title, undefined, true, async () => {
            try {
                await commandService.executeCommand(command.id, ...(command.arguments ?? []));
            }
            catch (err) {
                notificationService.notify({
                    severity: Severity.Error,
                    source: part.item.provider.displayName,
                    message: err
                });
            }
        }));
    }
    // show context menu
    const useShadowDOM = editor.getOption(132 /* EditorOption.useShadowDOM */);
    contextMenuService.showContextMenu({
        domForShadowRoot: useShadowDOM ? editor.getDomNode() ?? undefined : undefined,
        getAnchor: () => {
            const box = dom.getDomNodePagePosition(anchor);
            return { x: box.left, y: box.top + box.height + 8 };
        },
        getActions: () => menuActions,
        onHide: () => {
            editor.focus();
        },
        autoSelectFirstItem: true,
    });
}
export async function goToDefinitionWithLocation(accessor, event, editor, location) {
    const resolverService = accessor.get(ITextModelService);
    const ref = await resolverService.createModelReference(location.uri);
    await editor.invokeWithinContext(async (accessor) => {
        const openToSide = event.hasSideBySideModifier;
        const contextKeyService = accessor.get(IContextKeyService);
        const isInPeek = PeekContext.inPeekEditor.getValue(contextKeyService);
        const canPeek = !openToSide && editor.getOption(93 /* EditorOption.definitionLinkOpensInPeek */) && !isInPeek;
        const action = new DefinitionAction({ openToSide, openInPeek: canPeek, muteMessage: true }, { title: { value: '', original: '' }, id: '', precondition: undefined });
        return action.run(accessor, new SymbolNavigationAnchor(ref.object.textEditorModel, Range.getStartPosition(location.range)), Range.lift(location.range));
    });
    ref.dispose();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0xvY2F0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxheUhpbnRzL2Jyb3dzZXIvaW5sYXlIaW50c0xvY2F0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUc1SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEs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