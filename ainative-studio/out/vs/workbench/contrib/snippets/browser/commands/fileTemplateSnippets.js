/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { groupBy, isFalsyOrEmpty } from '../../../../../base/common/arrays.js';
import { compare } from '../../../../../base/common/strings.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { SnippetsAction } from './abstractSnippetsActions.js';
import { ISnippetsService } from '../snippets.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
export class ApplyFileSnippetAction extends SnippetsAction {
    static { this.Id = 'workbench.action.populateFileFromSnippet'; }
    constructor() {
        super({
            id: ApplyFileSnippetAction.Id,
            title: localize2('label', "Fill File with Snippet"),
            f1: true,
        });
    }
    async run(accessor) {
        const snippetService = accessor.get(ISnippetsService);
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const langService = accessor.get(ILanguageService);
        const editor = getCodeEditor(editorService.activeTextEditorControl);
        if (!editor || !editor.hasModel()) {
            return;
        }
        const snippets = await snippetService.getSnippets(undefined, { fileTemplateSnippets: true, noRecencySort: true, includeNoPrefixSnippets: true });
        if (snippets.length === 0) {
            return;
        }
        const selection = await this._pick(quickInputService, langService, snippets);
        if (!selection) {
            return;
        }
        if (editor.hasModel()) {
            // apply snippet edit -> replaces everything
            SnippetController2.get(editor)?.apply([{
                    range: editor.getModel().getFullModelRange(),
                    template: selection.snippet.body
                }]);
            // set language if possible
            editor.getModel().setLanguage(langService.createById(selection.langId), ApplyFileSnippetAction.Id);
            editor.focus();
        }
    }
    async _pick(quickInputService, langService, snippets) {
        const all = [];
        for (const snippet of snippets) {
            if (isFalsyOrEmpty(snippet.scopes)) {
                all.push({ langId: '', snippet });
            }
            else {
                for (const langId of snippet.scopes) {
                    all.push({ langId, snippet });
                }
            }
        }
        const picks = [];
        const groups = groupBy(all, (a, b) => compare(a.langId, b.langId));
        for (const group of groups) {
            let first = true;
            for (const item of group) {
                if (first) {
                    picks.push({
                        type: 'separator',
                        label: langService.getLanguageName(item.langId) ?? item.langId
                    });
                    first = false;
                }
                picks.push({
                    snippet: item,
                    label: item.snippet.prefix || item.snippet.name,
                    detail: item.snippet.description
                });
            }
        }
        const pick = await quickInputService.pick(picks, {
            placeHolder: localize('placeholder', 'Select a snippet'),
            matchOnDetail: true,
        });
        return pick?.snippet;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVRlbXBsYXRlU25pcHBldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9jb21tYW5kcy9maWxlVGVtcGxhdGVTbmlwcGV0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUU1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQXVDLE1BQU0seURBQXlELENBQUM7QUFDbEksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRWxELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVyRixNQUFNLE9BQU8sc0JBQXVCLFNBQVEsY0FBYzthQUV6QyxPQUFFLEdBQUcsMENBQTBDLENBQUM7SUFFaEU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsc0JBQXNCLENBQUMsRUFBRTtZQUM3QixLQUFLLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSx3QkFBd0IsQ0FBQztZQUNuRCxFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMs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