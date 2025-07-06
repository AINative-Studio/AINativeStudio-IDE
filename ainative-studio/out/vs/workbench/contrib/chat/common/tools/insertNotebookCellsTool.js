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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0Tm90ZWJvb2tDZWxsc1Rvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi90b29scy9pbnNlcnROb3RlYm9va0NlbGxzVG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBSXZFLE1BQU0sZ0JBQWdCLEdBQUc7O0NBRXhCLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyw4QkFBOEIs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