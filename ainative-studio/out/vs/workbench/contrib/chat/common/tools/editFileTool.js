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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { autorun } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize } from '../../../../../nls.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { ICodeMapperService } from '../../common/chatCodeMapperService.js';
import { IChatService } from '../../common/chatService.js';
import { ILanguageModelIgnoredFilesService } from '../../common/ignoredFiles.js';
const codeInstructions = `
The user is very smart and can understand how to apply your edits to their files, you just need to provide minimal hints.
Avoid repeating existing code, instead use comments to represent regions of unchanged code. The user prefers that you are as concise as possible. For example:
// ...existing code...
{ changed code }
// ...existing code...
{ changed code }
// ...existing code...

Here is an example of how you should use format an edit to an existing Person class:
class Person {
	// ...existing code...
	age: number;
	// ...existing code...
	getAge() {
		return this.age;
	}
}
`;
export const ExtensionEditToolId = 'vscode_editFile';
export const InternalEditToolId = 'vscode_editFile_internal';
export const EditToolData = {
    id: InternalEditToolId,
    displayName: localize('chat.tools.editFile', "Edit File"),
    modelDescription: `Edit a file in the workspace. Use this tool once per file that needs to be modified, even if there are multiple changes for a file. Generate the "explanation" property first. ${codeInstructions}`,
    source: { type: 'internal' },
    inputSchema: {
        type: 'object',
        properties: {
            explanation: {
                type: 'string',
                description: 'A short explanation of the edit being made. Can be the same as the explanation you showed to the user.',
            },
            filePath: {
                type: 'string',
                description: 'An absolute path to the file to edit, or the URI of a untitled, not yet named, file, such as `untitled:Untitled-1.',
            },
            code: {
                type: 'string',
                description: 'The code change to apply to the file. ' + codeInstructions
            }
        },
        required: ['explanation', 'filePath', 'code']
    }
};
let EditTool = class EditTool {
    constructor(chatService, codeMapperService, workspaceContextService, ignoredFilesService, textFileService, notebookService, editorGroupsService) {
        this.chatService = chatService;
        this.codeMapperService = codeMapperService;
        this.workspaceContextService = workspaceContextService;
        this.ignoredFilesService = ignoredFilesService;
        this.textFileService = textFileService;
        this.notebookService = notebookService;
        this.editorGroupsService = editorGroupsService;
    }
    async invoke(invocation, countTokens, token) {
        if (!invocation.context) {
            throw new Error('toolInvocationToken is required for this tool');
        }
        const parameters = invocation.parameters;
        const fileUri = URI.revive(parameters.file); // TODO@roblourens do revive in MainThreadLanguageModelTools
        const uri = CellUri.parse(fileUri)?.notebook || fileUri;
        if (!this.workspaceContextService.isInsideWorkspace(uri) && !this.notebookService.getNotebookTextModel(uri)) {
            const groupsByLastActive = this.editorGroupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            const uriIsOpenInSomeEditor = groupsByLastActive.some((group) => {
                return group.editors.some((editor) => {
                    return isEqual(editor.resource, uri);
                });
            });
            if (!uriIsOpenInSomeEditor) {
                throw new Error(`File ${uri.fsPath} can't be edited because it's not inside the current workspace`);
            }
        }
        if (await this.ignoredFilesService.fileIsIgnored(uri, token)) {
            throw new Error(`File ${uri.fsPath} can't be edited because it is configured to be ignored by Copilot`);
        }
        const model = this.chatService.getSession(invocation.context?.sessionId);
        const request = model.getRequests().at(-1);
        // Undo stops mark groups of response data in the output. Operations, such
        // as text edits, that happen between undo stops are all done or undone together.
        if (request.response?.response.getMarkdown().length) {
            // slightly hacky way to avoid an extra 'no-op' undo stop at the start of responses that are just edits
            model.acceptResponseProgress(request, {
                kind: 'undoStop',
                id: generateUuid(),
            });
        }
        model.acceptResponseProgress(request, {
            kind: 'markdownContent',
            content: new MarkdownString('\n````\n')
        });
        model.acceptResponseProgress(request, {
            kind: 'codeblockUri',
            uri,
            isEdit: true
        });
        model.acceptResponseProgress(request, {
            kind: 'markdownContent',
            content: new MarkdownString(parameters.code + '\n````\n')
        });
        // Signal start.
        if (this.notebookService.hasSupportedNotebooks(uri) && (this.notebookService.getNotebookTextModel(uri))) {
            model.acceptResponseProgress(request, {
                kind: 'notebookEdit',
                edits: [],
                uri
            });
        }
        else {
            model.acceptResponseProgress(request, {
                kind: 'textEdit',
                edits: [],
                uri
            });
        }
        const editSession = model.editingSession;
        if (!editSession) {
            throw new Error('This tool must be called from within an editing session');
        }
        const result = await this.codeMapperService.mapCode({
            codeBlocks: [{ code: parameters.code, resource: uri, markdownBeforeBlock: parameters.explanation }],
            location: 'tool',
            chatRequestId: invocation.chatRequestId
        }, {
            textEdit: (target, edits) => {
                model.acceptResponseProgress(request, { kind: 'textEdit', uri: target, edits });
            },
            notebookEdit(target, edits) {
                model.acceptResponseProgress(request, { kind: 'notebookEdit', uri: target, edits });
            },
        }, token);
        // Signal end.
        if (this.notebookService.hasSupportedNotebooks(uri) && (this.notebookService.getNotebookTextModel(uri))) {
            model.acceptResponseProgress(request, { kind: 'notebookEdit', uri, edits: [], done: true });
        }
        else {
            model.acceptResponseProgress(request, { kind: 'textEdit', uri, edits: [], done: true });
        }
        if (result?.errorMessage) {
            throw new Error(result.errorMessage);
        }
        let dispose;
        await new Promise((resolve) => {
            // The file will not be modified until the first edits start streaming in,
            // so wait until we see that it _was_ modified before waiting for it to be done.
            let wasFileBeingModified = false;
            dispose = autorun((r) => {
                const entries = editSession.entries.read(r);
                const currentFile = entries?.find((e) => e.modifiedURI.toString() === uri.toString());
                if (currentFile) {
                    if (currentFile.isCurrentlyBeingModifiedBy.read(r)) {
                        wasFileBeingModified = true;
                    }
                    else if (wasFileBeingModified) {
                        resolve(true);
                    }
                }
            });
        }).finally(() => {
            dispose.dispose();
        });
        await this.textFileService.save(uri, {
            reason: 2 /* SaveReason.AUTO */,
            skipSaveParticipants: true,
        });
        return {
            content: [{ kind: 'text', value: 'The file was edited successfully' }]
        };
    }
    async prepareToolInvocation(parameters, token) {
        return {
            presentation: 'hidden'
        };
    }
};
EditTool = __decorate([
    __param(0, IChatService),
    __param(1, ICodeMapperService),
    __param(2, IWorkspaceContextService),
    __param(3, ILanguageModelIgnoredFilesService),
    __param(4, ITextFileService),
    __param(5, INotebookService),
    __param(6, IEditorGroupsService)
], EditTool);
export { EditTool };
export class EditToolInputProcessor {
    processInput(input) {
        if (!input.filePath) {
            // Tool name collision, or input wasn't properly validated upstream
            return input;
        }
        const filePath = input.filePath;
        // Runs in EH, will be mapped
        return {
            file: filePath.startsWith('untitled:') ? URI.parse(filePath) : URI.file(filePath),
            explanation: input.explanation,
            code: input.code,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdEZpbGVUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Rvb2xzL2VkaXRGaWxlVG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakcsT0FBTyxFQUFlLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUlqRixNQUFNLGdCQUFnQixHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FrQnhCLENBQUM7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