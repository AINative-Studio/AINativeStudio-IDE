var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { QueryBuilder } from '../../../services/search/common/queryBuilder.js';
import { ISearchService } from '../../../services/search/common/search.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { ITerminalToolService } from './terminalToolService.js';
import { IVoidModelService } from '../common/voidModelService.js';
import { IVoidCommandBarService } from './voidCommandBarService.js';
import { computeDirectoryTree1Deep, IDirectoryStrService, stringifyDirectoryTree1Deep } from '../common/directoryStrService.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { timeout } from '../../../../base/common/async.js';
import { MAX_CHILDREN_URIs_PAGE, MAX_FILE_CHARS_PAGE, MAX_TERMINAL_BG_COMMAND_TIME, MAX_TERMINAL_INACTIVE_TIME } from '../common/prompt/prompts.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { generateUuid } from '../../../../base/common/uuid.js';
const isFalsy = (u) => {
    return !u || u === 'null' || u === 'undefined';
};
const validateStr = (argName, value) => {
    if (value === null)
        throw new Error(`Invalid LLM output: ${argName} was null.`);
    if (typeof value !== 'string')
        throw new Error(`Invalid LLM output format: ${argName} must be a string, but its type is "${typeof value}". Full value: ${JSON.stringify(value)}.`);
    return value;
};
// We are NOT checking to make sure in workspace
const validateURI = (uriStr) => {
    if (uriStr === null)
        throw new Error(`Invalid LLM output: uri was null.`);
    if (typeof uriStr !== 'string')
        throw new Error(`Invalid LLM output format: Provided uri must be a string, but it's a(n) ${typeof uriStr}. Full value: ${JSON.stringify(uriStr)}.`);
    // Check if it's already a full URI with scheme (e.g., vscode-remote://, file://, etc.)
    // Look for :// pattern which indicates a scheme is present
    // Examples of supported URIs:
    // - vscode-remote://wsl+Ubuntu/home/user/file.txt (WSL)
    // - vscode-remote://ssh-remote+myserver/home/user/file.txt (SSH)
    // - file:///home/user/file.txt (local file with scheme)
    // - /home/user/file.txt (local file path, will be converted to file://)
    // - C:\Users\file.txt (Windows local path, will be converted to file://)
    if (uriStr.includes('://')) {
        try {
            const uri = URI.parse(uriStr);
            return uri;
        }
        catch (e) {
            // If parsing fails, it's a malformed URI
            throw new Error(`Invalid URI format: ${uriStr}. Error: ${e}`);
        }
    }
    else {
        // No scheme present, treat as file path
        // This handles regular file paths like /home/user/file.txt or C:\Users\file.txt
        const uri = URI.file(uriStr);
        return uri;
    }
};
const validateOptionalURI = (uriStr) => {
    if (isFalsy(uriStr))
        return null;
    return validateURI(uriStr);
};
const validateOptionalStr = (argName, str) => {
    if (isFalsy(str))
        return null;
    return validateStr(argName, str);
};
const validatePageNum = (pageNumberUnknown) => {
    if (!pageNumberUnknown)
        return 1;
    const parsedInt = Number.parseInt(pageNumberUnknown + '');
    if (!Number.isInteger(parsedInt))
        throw new Error(`Page number was not an integer: "${pageNumberUnknown}".`);
    if (parsedInt < 1)
        throw new Error(`Invalid LLM output format: Specified page number must be 1 or greater: "${pageNumberUnknown}".`);
    return parsedInt;
};
const validateNumber = (numStr, opts) => {
    if (typeof numStr === 'number')
        return numStr;
    if (isFalsy(numStr))
        return opts.default;
    if (typeof numStr === 'string') {
        const parsedInt = Number.parseInt(numStr + '');
        if (!Number.isInteger(parsedInt))
            return opts.default;
        return parsedInt;
    }
    return opts.default;
};
const validateProposedTerminalId = (terminalIdUnknown) => {
    if (!terminalIdUnknown)
        throw new Error(`A value for terminalID must be specified, but the value was "${terminalIdUnknown}"`);
    const terminalId = terminalIdUnknown + '';
    return terminalId;
};
const validateBoolean = (b, opts) => {
    if (typeof b === 'string') {
        if (b === 'true')
            return true;
        if (b === 'false')
            return false;
    }
    if (typeof b === 'boolean') {
        return b;
    }
    return opts.default;
};
const checkIfIsFolder = (uriStr) => {
    uriStr = uriStr.trim();
    if (uriStr.endsWith('/') || uriStr.endsWith('\\'))
        return true;
    return false;
};
export const IToolsService = createDecorator('ToolsService');
let ToolsService = class ToolsService {
    constructor(fileService, workspaceContextService, searchService, instantiationService, voidModelService, editCodeService, terminalToolService, commandBarService, directoryStrService, markerService, voidSettingsService) {
        this.terminalToolService = terminalToolService;
        this.commandBarService = commandBarService;
        this.directoryStrService = directoryStrService;
        this.markerService = markerService;
        this.voidSettingsService = voidSettingsService;
        const queryBuilder = instantiationService.createInstance(QueryBuilder);
        this.validateParams = {
            read_file: (params) => {
                const { uri: uriStr, start_line: startLineUnknown, end_line: endLineUnknown, page_number: pageNumberUnknown } = params;
                const uri = validateURI(uriStr);
                const pageNumber = validatePageNum(pageNumberUnknown);
                let startLine = validateNumber(startLineUnknown, { default: null });
                let endLine = validateNumber(endLineUnknown, { default: null });
                if (startLine !== null && startLine < 1)
                    startLine = null;
                if (endLine !== null && endLine < 1)
                    endLine = null;
                return { uri, startLine, endLine, pageNumber };
            },
            ls_dir: (params) => {
                const { uri: uriStr, page_number: pageNumberUnknown } = params;
                const uri = validateURI(uriStr);
                const pageNumber = validatePageNum(pageNumberUnknown);
                return { uri, pageNumber };
            },
            get_dir_tree: (params) => {
                const { uri: uriStr, } = params;
                const uri = validateURI(uriStr);
                return { uri };
            },
            search_pathnames_only: (params) => {
                const { query: queryUnknown, search_in_folder: includeUnknown, page_number: pageNumberUnknown } = params;
                const queryStr = validateStr('query', queryUnknown);
                const pageNumber = validatePageNum(pageNumberUnknown);
                const includePattern = validateOptionalStr('include_pattern', includeUnknown);
                return { query: queryStr, includePattern, pageNumber };
            },
            search_for_files: (params) => {
                const { query: queryUnknown, search_in_folder: searchInFolderUnknown, is_regex: isRegexUnknown, page_number: pageNumberUnknown } = params;
                const queryStr = validateStr('query', queryUnknown);
                const pageNumber = validatePageNum(pageNumberUnknown);
                const searchInFolder = validateOptionalURI(searchInFolderUnknown);
                const isRegex = validateBoolean(isRegexUnknown, { default: false });
                return {
                    query: queryStr,
                    isRegex,
                    searchInFolder,
                    pageNumber
                };
            },
            search_in_file: (params) => {
                const { uri: uriStr, query: queryUnknown, is_regex: isRegexUnknown } = params;
                const uri = validateURI(uriStr);
                const query = validateStr('query', queryUnknown);
                const isRegex = validateBoolean(isRegexUnknown, { default: false });
                return { uri, query, isRegex };
            },
            read_lint_errors: (params) => {
                const { uri: uriUnknown, } = params;
                const uri = validateURI(uriUnknown);
                return { uri };
            },
            // ---
            create_file_or_folder: (params) => {
                const { uri: uriUnknown } = params;
                const uri = validateURI(uriUnknown);
                const uriStr = validateStr('uri', uriUnknown);
                const isFolder = checkIfIsFolder(uriStr);
                return { uri, isFolder };
            },
            delete_file_or_folder: (params) => {
                const { uri: uriUnknown, is_recursive: isRecursiveUnknown } = params;
                const uri = validateURI(uriUnknown);
                const isRecursive = validateBoolean(isRecursiveUnknown, { default: false });
                const uriStr = validateStr('uri', uriUnknown);
                const isFolder = checkIfIsFolder(uriStr);
                return { uri, isRecursive, isFolder };
            },
            rewrite_file: (params) => {
                const { uri: uriStr, new_content: newContentUnknown } = params;
                const uri = validateURI(uriStr);
                const newContent = validateStr('newContent', newContentUnknown);
                return { uri, newContent };
            },
            edit_file: (params) => {
                const { uri: uriStr, search_replace_blocks: searchReplaceBlocksUnknown } = params;
                const uri = validateURI(uriStr);
                const searchReplaceBlocks = validateStr('searchReplaceBlocks', searchReplaceBlocksUnknown);
                return { uri, searchReplaceBlocks };
            },
            // ---
            run_command: (params) => {
                const { command: commandUnknown, cwd: cwdUnknown } = params;
                const command = validateStr('command', commandUnknown);
                const cwd = validateOptionalStr('cwd', cwdUnknown);
                const terminalId = generateUuid();
                return { command, cwd, terminalId };
            },
            run_persistent_command: (params) => {
                const { command: commandUnknown, persistent_terminal_id: persistentTerminalIdUnknown } = params;
                const command = validateStr('command', commandUnknown);
                const persistentTerminalId = validateProposedTerminalId(persistentTerminalIdUnknown);
                return { command, persistentTerminalId };
            },
            open_persistent_terminal: (params) => {
                const { cwd: cwdUnknown } = params;
                const cwd = validateOptionalStr('cwd', cwdUnknown);
                // No parameters needed; will open a new background terminal
                return { cwd };
            },
            kill_persistent_terminal: (params) => {
                const { persistent_terminal_id: terminalIdUnknown } = params;
                const persistentTerminalId = validateProposedTerminalId(terminalIdUnknown);
                return { persistentTerminalId };
            },
        };
        this.callTool = {
            read_file: async ({ uri, startLine, endLine, pageNumber }) => {
                await voidModelService.initializeModel(uri);
                const { model } = await voidModelService.getModelSafe(uri);
                if (model === null) {
                    throw new Error(`No contents; File does not exist.`);
                }
                let contents;
                if (startLine === null && endLine === null) {
                    contents = model.getValue(1 /* EndOfLinePreference.LF */);
                }
                else {
                    const startLineNumber = startLine === null ? 1 : startLine;
                    const endLineNumber = endLine === null ? model.getLineCount() : endLine;
                    contents = model.getValueInRange({ startLineNumber, startColumn: 1, endLineNumber, endColumn: Number.MAX_SAFE_INTEGER }, 1 /* EndOfLinePreference.LF */);
                }
                const totalNumLines = model.getLineCount();
                const fromIdx = MAX_FILE_CHARS_PAGE * (pageNumber - 1);
                const toIdx = MAX_FILE_CHARS_PAGE * pageNumber - 1;
                const fileContents = contents.slice(fromIdx, toIdx + 1); // paginate
                const hasNextPage = (contents.length - 1) - toIdx >= 1;
                const totalFileLen = contents.length;
                return { result: { fileContents, totalFileLen, hasNextPage, totalNumLines } };
            },
            ls_dir: async ({ uri, pageNumber }) => {
                const dirResult = await computeDirectoryTree1Deep(fileService, uri, pageNumber);
                return { result: dirResult };
            },
            get_dir_tree: async ({ uri }) => {
                const str = await this.directoryStrService.getDirectoryStrTool(uri);
                return { result: { str } };
            },
            search_pathnames_only: async ({ query: queryStr, includePattern, pageNumber }) => {
                const query = queryBuilder.file(workspaceContextService.getWorkspace().folders.map(f => f.uri), {
                    filePattern: queryStr,
                    includePattern: includePattern ?? undefined,
                    sortByScore: true, // makes results 10x better
                });
                const data = await searchService.fileSearch(query, CancellationToken.None);
                const fromIdx = MAX_CHILDREN_URIs_PAGE * (pageNumber - 1);
                const toIdx = MAX_CHILDREN_URIs_PAGE * pageNumber - 1;
                const uris = data.results
                    .slice(fromIdx, toIdx + 1) // paginate
                    .map(({ resource, results }) => resource);
                const hasNextPage = (data.results.length - 1) - toIdx >= 1;
                return { result: { uris, hasNextPage } };
            },
            search_for_files: async ({ query: queryStr, isRegex, searchInFolder, pageNumber }) => {
                const searchFolders = searchInFolder === null ?
                    workspaceContextService.getWorkspace().folders.map(f => f.uri)
                    : [searchInFolder];
                const query = queryBuilder.text({
                    pattern: queryStr,
                    isRegExp: isRegex,
                }, searchFolders);
                const data = await searchService.textSearch(query, CancellationToken.None);
                const fromIdx = MAX_CHILDREN_URIs_PAGE * (pageNumber - 1);
                const toIdx = MAX_CHILDREN_URIs_PAGE * pageNumber - 1;
                const uris = data.results
                    .slice(fromIdx, toIdx + 1) // paginate
                    .map(({ resource, results }) => resource);
                const hasNextPage = (data.results.length - 1) - toIdx >= 1;
                return { result: { queryStr, uris, hasNextPage } };
            },
            search_in_file: async ({ uri, query, isRegex }) => {
                await voidModelService.initializeModel(uri);
                const { model } = await voidModelService.getModelSafe(uri);
                if (model === null) {
                    throw new Error(`No contents; File does not exist.`);
                }
                const contents = model.getValue(1 /* EndOfLinePreference.LF */);
                const contentOfLine = contents.split('\n');
                const totalLines = contentOfLine.length;
                const regex = isRegex ? new RegExp(query) : null;
                const lines = [];
                for (let i = 0; i < totalLines; i++) {
                    const line = contentOfLine[i];
                    if ((isRegex && regex.test(line)) || (!isRegex && line.includes(query))) {
                        const matchLine = i + 1;
                        lines.push(matchLine);
                    }
                }
                return { result: { lines } };
            },
            read_lint_errors: async ({ uri }) => {
                await timeout(1000);
                const { lintErrors } = this._getLintErrors(uri);
                return { result: { lintErrors } };
            },
            // ---
            create_file_or_folder: async ({ uri, isFolder }) => {
                if (isFolder)
                    await fileService.createFolder(uri);
                else {
                    await fileService.createFile(uri);
                }
                return { result: {} };
            },
            delete_file_or_folder: async ({ uri, isRecursive }) => {
                await fileService.del(uri, { recursive: isRecursive });
                return { result: {} };
            },
            rewrite_file: async ({ uri, newContent }) => {
                await voidModelService.initializeModel(uri);
                if (this.commandBarService.getStreamState(uri) === 'streaming') {
                    throw new Error(`Another LLM is currently making changes to this file. Please stop streaming for now and ask the user to resume later.`);
                }
                await editCodeService.callBeforeApplyOrEdit(uri);
                editCodeService.instantlyRewriteFile({ uri, newContent });
                // at end, get lint errors
                const lintErrorsPromise = Promise.resolve().then(async () => {
                    await timeout(2000);
                    const { lintErrors } = this._getLintErrors(uri);
                    return { lintErrors };
                });
                return { result: lintErrorsPromise };
            },
            edit_file: async ({ uri, searchReplaceBlocks }) => {
                await voidModelService.initializeModel(uri);
                if (this.commandBarService.getStreamState(uri) === 'streaming') {
                    throw new Error(`Another LLM is currently making changes to this file. Please stop streaming for now and ask the user to resume later.`);
                }
                await editCodeService.callBeforeApplyOrEdit(uri);
                editCodeService.instantlyApplySearchReplaceBlocks({ uri, searchReplaceBlocks });
                // at end, get lint errors
                const lintErrorsPromise = Promise.resolve().then(async () => {
                    await timeout(2000);
                    const { lintErrors } = this._getLintErrors(uri);
                    return { lintErrors };
                });
                return { result: lintErrorsPromise };
            },
            // ---
            run_command: async ({ command, cwd, terminalId }) => {
                const { resPromise, interrupt } = await this.terminalToolService.runCommand(command, { type: 'temporary', cwd, terminalId });
                return { result: resPromise, interruptTool: interrupt };
            },
            run_persistent_command: async ({ command, persistentTerminalId }) => {
                const { resPromise, interrupt } = await this.terminalToolService.runCommand(command, { type: 'persistent', persistentTerminalId });
                return { result: resPromise, interruptTool: interrupt };
            },
            open_persistent_terminal: async ({ cwd }) => {
                const persistentTerminalId = await this.terminalToolService.createPersistentTerminal({ cwd });
                return { result: { persistentTerminalId } };
            },
            kill_persistent_terminal: async ({ persistentTerminalId }) => {
                // Close the background terminal by sending exit
                await this.terminalToolService.killPersistentTerminal(persistentTerminalId);
                return { result: {} };
            },
        };
        const nextPageStr = (hasNextPage) => hasNextPage ? '\n\n(more on next page...)' : '';
        const stringifyLintErrors = (lintErrors) => {
            return lintErrors
                .map((e, i) => `Error ${i + 1}:\nLines Affected: ${e.startLineNumber}-${e.endLineNumber}\nError message:${e.message}`)
                .join('\n\n')
                .substring(0, MAX_FILE_CHARS_PAGE);
        };
        // given to the LLM after the call for successful tool calls
        this.stringOfResult = {
            read_file: (params, result) => {
                return `${params.uri.fsPath}\n\`\`\`\n${result.fileContents}\n\`\`\`${nextPageStr(result.hasNextPage)}${result.hasNextPage ? `\nMore info because truncated: this file has ${result.totalNumLines} lines, or ${result.totalFileLen} characters.` : ''}`;
            },
            ls_dir: (params, result) => {
                const dirTreeStr = stringifyDirectoryTree1Deep(params, result);
                return dirTreeStr; // + nextPageStr(result.hasNextPage) // already handles num results remaining
            },
            get_dir_tree: (params, result) => {
                return result.str;
            },
            search_pathnames_only: (params, result) => {
                return result.uris.map(uri => uri.fsPath).join('\n') + nextPageStr(result.hasNextPage);
            },
            search_for_files: (params, result) => {
                return result.uris.map(uri => uri.fsPath).join('\n') + nextPageStr(result.hasNextPage);
            },
            search_in_file: (params, result) => {
                const { model } = voidModelService.getModel(params.uri);
                if (!model)
                    return '<Error getting string of result>';
                const lines = result.lines.map(n => {
                    const lineContent = model.getValueInRange({ startLineNumber: n, startColumn: 1, endLineNumber: n, endColumn: Number.MAX_SAFE_INTEGER }, 1 /* EndOfLinePreference.LF */);
                    return `Line ${n}:\n\`\`\`\n${lineContent}\n\`\`\``;
                }).join('\n\n');
                return lines;
            },
            read_lint_errors: (params, result) => {
                return result.lintErrors ?
                    stringifyLintErrors(result.lintErrors)
                    : 'No lint errors found.';
            },
            // ---
            create_file_or_folder: (params, result) => {
                return `URI ${params.uri.fsPath} successfully created.`;
            },
            delete_file_or_folder: (params, result) => {
                return `URI ${params.uri.fsPath} successfully deleted.`;
            },
            edit_file: (params, result) => {
                const lintErrsString = (this.voidSettingsService.state.globalSettings.includeToolLintErrors ?
                    (result.lintErrors ? ` Lint errors found after change:\n${stringifyLintErrors(result.lintErrors)}.\nIf this is related to a change made while calling this tool, you might want to fix the error.`
                        : ` No lint errors found.`)
                    : '');
                return `Change successfully made to ${params.uri.fsPath}.${lintErrsString}`;
            },
            rewrite_file: (params, result) => {
                const lintErrsString = (this.voidSettingsService.state.globalSettings.includeToolLintErrors ?
                    (result.lintErrors ? ` Lint errors found after change:\n${stringifyLintErrors(result.lintErrors)}.\nIf this is related to a change made while calling this tool, you might want to fix the error.`
                        : ` No lint errors found.`)
                    : '');
                return `Change successfully made to ${params.uri.fsPath}.${lintErrsString}`;
            },
            run_command: (params, result) => {
                const { resolveReason, result: result_, } = result;
                // success
                if (resolveReason.type === 'done') {
                    return `${result_}\n(exit code ${resolveReason.exitCode})`;
                }
                // normal command
                if (resolveReason.type === 'timeout') {
                    return `${result_}\nTerminal command ran, but was automatically killed by Void after ${MAX_TERMINAL_INACTIVE_TIME}s of inactivity and did not finish successfully. To try with more time, open a persistent terminal and run the command there.`;
                }
                throw new Error(`Unexpected internal error: Terminal command did not resolve with a valid reason.`);
            },
            run_persistent_command: (params, result) => {
                const { resolveReason, result: result_, } = result;
                const { persistentTerminalId } = params;
                // success
                if (resolveReason.type === 'done') {
                    return `${result_}\n(exit code ${resolveReason.exitCode})`;
                }
                // bg command
                if (resolveReason.type === 'timeout') {
                    return `${result_}\nTerminal command is running in terminal ${persistentTerminalId}. The given outputs are the results after ${MAX_TERMINAL_BG_COMMAND_TIME} seconds.`;
                }
                throw new Error(`Unexpected internal error: Terminal command did not resolve with a valid reason.`);
            },
            open_persistent_terminal: (_params, result) => {
                const { persistentTerminalId } = result;
                return `Successfully created persistent terminal. persistentTerminalId="${persistentTerminalId}"`;
            },
            kill_persistent_terminal: (params, _result) => {
                return `Successfully closed terminal "${params.persistentTerminalId}".`;
            },
        };
    }
    _getLintErrors(uri) {
        const lintErrors = this.markerService
            .read({ resource: uri })
            .filter(l => l.severity === MarkerSeverity.Error || l.severity === MarkerSeverity.Warning)
            .slice(0, 100)
            .map(l => ({
            code: typeof l.code === 'string' ? l.code : l.code?.value || '',
            message: (l.severity === MarkerSeverity.Error ? '(error) ' : '(warning) ') + l.message,
            startLineNumber: l.startLineNumber,
            endLineNumber: l.endLineNumber,
        }));
        if (!lintErrors.length)
            return { lintErrors: null };
        return { lintErrors, };
    }
};
ToolsService = __decorate([
    __param(0, IFileService),
    __param(1, IWorkspaceContextService),
    __param(2, ISearchService),
    __param(3, IInstantiationService),
    __param(4, IVoidModelService),
    __param(5, IEditCodeService),
    __param(6, ITerminalToolService),
    __param(7, IVoidCommandBarService),
    __param(8, IDirectoryStrService),
    __param(9, IMarkerService),
    __param(10, IVoidSettingsService)
], ToolsService);
export { ToolsService };
registerSingleton(IToolsService, ToolsService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3Rvb2xzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbkgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsb0JBQW9CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvSCxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVB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