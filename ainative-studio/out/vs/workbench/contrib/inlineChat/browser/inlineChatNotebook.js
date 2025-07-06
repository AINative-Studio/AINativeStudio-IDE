/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { illegalState } from '../../../../base/common/errors.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { InlineChatController } from './inlineChatController.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { NotebookTextDiffEditor } from '../../notebook/browser/diff/notebookDiffEditor.js';
import { NotebookMultiTextDiffEditor } from '../../notebook/browser/diff/notebookMultiDiffEditor.js';
let InlineChatNotebookContribution = class InlineChatNotebookContribution {
    constructor(sessionService, editorService, notebookEditorService) {
        this._store = new DisposableStore();
        this._store.add(sessionService.registerSessionKeyComputer(Schemas.vscodeNotebookCell, {
            getComparisonKey: (editor, uri) => {
                const data = CellUri.parse(uri);
                if (!data) {
                    throw illegalState('Expected notebook cell uri');
                }
                let fallback;
                for (const notebookEditor of notebookEditorService.listNotebookEditors()) {
                    if (notebookEditor.hasModel() && isEqual(notebookEditor.textModel.uri, data.notebook)) {
                        const candidate = `<notebook>${notebookEditor.getId()}#${uri}`;
                        if (!fallback) {
                            fallback = candidate;
                        }
                        // find the code editor in the list of cell-code editors
                        if (notebookEditor.codeEditors.find((tuple) => tuple[1] === editor)) {
                            return candidate;
                        }
                        // 	// reveal cell and try to find code editor again
                        // 	const cell = notebookEditor.getCellByHandle(data.handle);
                        // 	if (cell) {
                        // 		notebookEditor.revealInViewAtTop(cell);
                        // 		if (notebookEditor.codeEditors.find((tuple) => tuple[1] === editor)) {
                        // 			return candidate;
                        // 		}
                        // 	}
                    }
                }
                if (fallback) {
                    return fallback;
                }
                const activeEditor = editorService.activeEditorPane;
                if (activeEditor && (activeEditor.getId() === NotebookTextDiffEditor.ID || activeEditor.getId() === NotebookMultiTextDiffEditor.ID)) {
                    return `<notebook>${editor.getId()}#${uri}`;
                }
                throw illegalState('Expected notebook editor');
            }
        }));
        this._store.add(sessionService.onWillStartSession(newSessionEditor => {
            const candidate = CellUri.parse(newSessionEditor.getModel().uri);
            if (!candidate) {
                return;
            }
            for (const notebookEditor of notebookEditorService.listNotebookEditors()) {
                if (isEqual(notebookEditor.textModel?.uri, candidate.notebook)) {
                    let found = false;
                    const editors = [];
                    for (const [, codeEditor] of notebookEditor.codeEditors) {
                        editors.push(codeEditor);
                        found = codeEditor === newSessionEditor || found;
                    }
                    if (found) {
                        // found the this editor in the outer notebook editor -> make sure to
                        // cancel all sibling sessions
                        for (const editor of editors) {
                            if (editor !== newSessionEditor) {
                                InlineChatController.get(editor)?.acceptSession();
                            }
                        }
                        break;
                    }
                }
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
InlineChatNotebookContribution = __decorate([
    __param(0, IInlineChatSessionService),
    __param(1, IEditorService),
    __param(2, INotebookEditorService)
], InlineChatNotebookContribution);
export { InlineChatNotebookContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdE5vdGVib29rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXROb3RlYm9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDakUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU5RixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUE4QjtJQUkxQyxZQUM0QixjQUF5QyxFQUNwRCxhQUE2QixFQUNyQixxQkFBNkM7UUFMckQsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFRL0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLDBCQUEwQixDQUFD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