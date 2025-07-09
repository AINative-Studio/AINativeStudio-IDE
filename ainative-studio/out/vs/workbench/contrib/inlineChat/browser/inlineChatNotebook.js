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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdE5vdGVib29rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0Tm90ZWJvb2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDM0YsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFOUYsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBOEI7SUFJMUMsWUFDNEIsY0FBeUMsRUFDcEQsYUFBNkIsRUFDckIscUJBQTZDO1FBTHJELFdBQU0sR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBUS9DLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsQ0FB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