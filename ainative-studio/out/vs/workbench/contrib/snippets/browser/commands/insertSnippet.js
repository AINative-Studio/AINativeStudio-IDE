/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import * as nls from '../../../../../nls.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { SnippetEditorAction } from './abstractSnippetsActions.js';
import { pickSnippet } from '../snippetPicker.js';
import { ISnippetsService } from '../snippets.js';
import { Snippet } from '../snippetsFile.js';
class Args {
    static fromUser(arg) {
        if (!arg || typeof arg !== 'object') {
            return Args._empty;
        }
        let { snippet, name, langId } = arg;
        if (typeof snippet !== 'string') {
            snippet = undefined;
        }
        if (typeof name !== 'string') {
            name = undefined;
        }
        if (typeof langId !== 'string') {
            langId = undefined;
        }
        return new Args(snippet, name, langId);
    }
    static { this._empty = new Args(undefined, undefined, undefined); }
    constructor(snippet, name, langId) {
        this.snippet = snippet;
        this.name = name;
        this.langId = langId;
    }
}
export class InsertSnippetAction extends SnippetEditorAction {
    constructor() {
        super({
            id: 'editor.action.insertSnippet',
            title: nls.localize2('snippet.suggestions.label', "Insert Snippet"),
            f1: true,
            precondition: EditorContextKeys.writable,
            metadata: {
                description: `Insert Snippet`,
                args: [{
                        name: 'args',
                        schema: {
                            'type': 'object',
                            'properties': {
                                'snippet': {
                                    'type': 'string'
                                },
                                'langId': {
                                    'type': 'string',
                                },
                                'name': {
                                    'type': 'string'
                                }
                            },
                        }
                    }]
            }
        });
    }
    async runEditorCommand(accessor, editor, arg) {
        const languageService = accessor.get(ILanguageService);
        const snippetService = accessor.get(ISnippetsService);
        if (!editor.hasModel()) {
            return;
        }
        const clipboardService = accessor.get(IClipboardService);
        const instaService = accessor.get(IInstantiationService);
        const snippet = await new Promise((resolve, reject) => {
            const { lineNumber, column } = editor.getPosition();
            const { snippet, name, langId } = Args.fromUser(arg);
            if (snippet) {
                return resolve(new Snippet(false, [], '', '', '', snippet, '', 1 /* SnippetSource.User */, `random/${Math.random()}`));
            }
            let languageId;
            if (langId) {
                if (!languageService.isRegisteredLanguageId(langId)) {
                    return resolve(undefined);
                }
                languageId = langId;
            }
            else {
                editor.getModel().tokenization.tokenizeIfCheap(lineNumber);
                languageId = editor.getModel().getLanguageIdAtPosition(lineNumber, column);
                // validate the `languageId` to ensure this is a user
                // facing language with a name and the chance to have
                // snippets, else fall back to the outer language
                if (!languageService.getLanguageName(languageId)) {
                    languageId = editor.getModel().getLanguageId();
                }
            }
            if (name) {
                // take selected snippet
                snippetService.getSnippets(languageId, { includeNoPrefixSnippets: true })
                    .then(snippets => snippets.find(snippet => snippet.name === name))
                    .then(resolve, reject);
            }
            else {
                // let user pick a snippet
                resolve(instaService.invokeFunction(pickSnippet, languageId));
            }
        });
        if (!snippet) {
            return;
        }
        let clipboardText;
        if (snippet.needsClipboard) {
            clipboardText = await clipboardService.readText();
        }
        editor.focus();
        SnippetController2.get(editor)?.insert(snippet.codeSnippet, { clipboardText });
        snippetService.updateUsageTimestamp(snippet);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0U25pcHBldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL2NvbW1hbmRzL2luc2VydFNuaXBwZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDekcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBaUIsTUFBTSxvQkFBb0IsQ0FBQztBQUU1RCxNQUFNLElBQUk7SUFFVCxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQVE7UUFDdkIsSUFBSSxDQUFDLEdBQUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQztRQUNELElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQztRQUNwQyxJQUFJLE9BQU8sT0FBTyxL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