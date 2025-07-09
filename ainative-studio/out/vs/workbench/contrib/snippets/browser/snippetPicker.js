/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ISnippetsService } from './snippets.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export async function pickSnippet(accessor, languageIdOrSnippets) {
    const snippetService = accessor.get(ISnippetsService);
    const quickInputService = accessor.get(IQuickInputService);
    let snippets;
    if (Array.isArray(languageIdOrSnippets)) {
        snippets = languageIdOrSnippets;
    }
    else {
        snippets = (await snippetService.getSnippets(languageIdOrSnippets, { includeDisabledSnippets: true, includeNoPrefixSnippets: true }));
    }
    snippets.sort((a, b) => a.snippetSource - b.snippetSource);
    const makeSnippetPicks = () => {
        const result = [];
        let prevSnippet;
        for (const snippet of snippets) {
            const pick = {
                label: snippet.prefix || snippet.name,
                detail: snippet.description || snippet.body,
                snippet
            };
            if (!prevSnippet || prevSnippet.snippetSource !== snippet.snippetSource || prevSnippet.source !== snippet.source) {
                let label = '';
                switch (snippet.snippetSource) {
                    case 1 /* SnippetSource.User */:
                        label = nls.localize('sep.userSnippet', "User Snippets");
                        break;
                    case 3 /* SnippetSource.Extension */:
                        label = snippet.source;
                        break;
                    case 2 /* SnippetSource.Workspace */:
                        label = nls.localize('sep.workspaceSnippet', "Workspace Snippets");
                        break;
                }
                result.push({ type: 'separator', label });
            }
            if (snippet.snippetSource === 3 /* SnippetSource.Extension */) {
                const isEnabled = snippetService.isEnabled(snippet);
                if (isEnabled) {
                    pick.buttons = [{
                            iconClass: ThemeIcon.asClassName(Codicon.eyeClosed),
                            tooltip: nls.localize('disableSnippet', 'Hide from IntelliSense')
                        }];
                }
                else {
                    pick.description = nls.localize('isDisabled', "(hidden from IntelliSense)");
                    pick.buttons = [{
                            iconClass: ThemeIcon.asClassName(Codicon.eye),
                            tooltip: nls.localize('enable.snippet', 'Show in IntelliSense')
                        }];
                }
            }
            result.push(pick);
            prevSnippet = snippet;
        }
        return result;
    };
    const disposables = new DisposableStore();
    const picker = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
    picker.placeholder = nls.localize('pick.placeholder', "Select a snippet");
    picker.matchOnDetail = true;
    picker.ignoreFocusOut = false;
    picker.keepScrollPosition = true;
    disposables.add(picker.onDidTriggerItemButton(ctx => {
        const isEnabled = snippetService.isEnabled(ctx.item.snippet);
        snippetService.updateEnablement(ctx.item.snippet, !isEnabled);
        picker.items = makeSnippetPicks();
    }));
    picker.items = makeSnippetPicks();
    if (!picker.items.length) {
        picker.validationMessage = nls.localize('pick.noSnippetAvailable', "No snippet available");
    }
    picker.show();
    // wait for an item to be picked or the picker to become hidden
    await Promise.race([Event.toPromise(picker.onDidAccept), Event.toPromise(picker.onDidHide)]);
    const result = picker.selectedItems[0]?.snippet;
    disposables.dispose();
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFBpY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL3NuaXBwZXRQaWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFakQsT0FBTyxFQUFrQixrQkFBa0IsRUFBa0IsTUFBTSxzREFBc0QsQ0FBQztBQUMxSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsTUFBTSxDQUFDLEtBQUssVUFBVSxXQUFXLENBQUMsUUFBMEIsRUFBRSxvQkFBd0M7SUFFckcsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3RELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBTTNELElBQUksUUFBbUIsQ0FBQztJQUN4QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO1FBQ3pDLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQztJQUNqQyxDQUFDO1NBQU0sQ0FBQztRQUNQLFFBQVEsR0FBRyxDQUFDLE1BQU0sY0FBYyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLHVCQUF1QixFQUFFLElBQUks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