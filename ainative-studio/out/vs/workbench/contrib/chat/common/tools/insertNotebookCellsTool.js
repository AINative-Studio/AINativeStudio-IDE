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
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize } from '../../../../../nls.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { ICodeMapperService } from '../chatCodeMapperService.js';
import { IChatEditingService } from '../chatEditingService.js';
import { IChatService } from '../chatService.js';
import { ILanguageModelIgnoredFilesService } from '../ignoredFiles.js';
const codeInstructions = `
The user is very smart and can understand how to insert cells to their new Notebook files
`;
export const ExtensionEditToolId = 'vscode_insert_notebook_cells';
export const InternalEditToolId = 'vscode_insert_notebook_cells_internal';
export const EditToolData = {
    id: InternalEditToolId,
    displayName: localize('chat.tools.editFile', "Edit File"),
    modelDescription: `Insert cells into a new notebook n the workspace. Use this tool once per file that needs to be modified, even if there are multiple changes for a file. Generate the "explanation" property first. ${codeInstructions}`,
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
            cells: {
                type: 'array',
                description: 'The cells to insert to apply to the file. ' + codeInstructions
            }
        },
        required: ['explanation', 'filePath', 'code']
    }
};
let EditTool = class EditTool {
    constructor(chatService, chatEditingService, codeMapperService, workspaceContextService, ignoredFilesService, textFileService, notebookService) {
        this.chatService = chatService;
        this.chatEditingService = chatEditingService;
        this.codeMapperService = codeMapperService;
        this.workspaceContextService = workspaceContextService;
        this.ignoredFilesService = ignoredFilesService;
        this.textFileService = textFileService;
        this.notebookService = notebookService;
    }
    async invoke(invocation, countTokens, token) {
        if (!invocation.context) {
            throw new Error('toolInvocationToken is required for this tool');
        }
        const parameters = invocation.parameters;
        const uri = URI.revive(parameters.file); // TODO@roblourens do revive in MainThreadLanguageModelTools
        if (!this.workspaceContextService.isInsideWorkspace(uri)) {
            throw new Error(`File ${uri.fsPath} can't be edited because it's not inside the current workspace`);
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
            uri
        });
        model.acceptResponseProgress(request, {
            kind: 'markdownContent',
            content: new MarkdownString(parameters.code + '\n````\n')
        });
        const notebookUri = CellUri.parse(uri)?.notebook || uri;
        // Signal start.
        if (this.notebookService.hasSupportedNotebooks(notebookUri) && (this.notebookService.getNotebookTextModel(notebookUri))) {
            model.acceptResponseProgress(request, {
                kind: 'notebookEdit',
                edits: [],
                uri: notebookUri
            });
        }
        else {
            model.acceptResponseProgress(request, {
                kind: 'textEdit',
                edits: [],
                uri
            });
        }
        const editSession = this.chatEditingService.getEditingSession(model.sessionId);
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
        if (this.notebookService.hasSupportedNotebooks(notebookUri) && (this.notebookService.getNotebookTextModel(notebookUri))) {
            model.acceptResponseProgress(request, { kind: 'notebookEdit', uri: notebookUri, edits: [], done: true });
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
    __param(1, IChatEditingService),
    __param(2, ICodeMapperService),
    __param(3, IWorkspaceContextService),
    __param(4, ILanguageModelIgnoredFilesService),
    __param(5, ITextFileService),
    __param(6, INotebookService)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0Tm90ZWJvb2tDZWxsc1Rvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvaW5zZXJ0Tm90ZWJvb2tDZWxsc1Rvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFakcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUl2RSxNQUFNLGdCQUFnQixHQUFHOztDQUV4QixDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsOEJBQThC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