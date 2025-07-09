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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci90b29sc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUE7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ25ILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbkUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLG9CQUFvQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0gsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsT0FBTyxF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