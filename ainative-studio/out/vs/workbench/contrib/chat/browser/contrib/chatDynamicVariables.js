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
var ChatDynamicVariableModel_1;
import { coalesce, groupBy } from '../../../../../base/common/arrays.js';
import { assertNever } from '../../../../../base/common/assert.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import * as glob from '../../../../../base/common/glob.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { basename, dirname, joinPath, relativePath } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { isLocation } from '../../../../../editor/common/languages.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { FileType, IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IMarkerService, MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { PromptsConfig } from '../../../../../platform/prompts/common/config.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { getExcludes, ISearchService } from '../../../../services/search/common/search.js';
import { IDiagnosticVariableEntryFilterData } from '../../common/chatModel.js';
import { ChatWidget } from '../chatWidget.js';
import { ChatFileReference } from './chatDynamicVariables/chatFileReference.js';
export const dynamicVariableDecorationType = 'chat-dynamic-variable';
let ChatDynamicVariableModel = class ChatDynamicVariableModel extends Disposable {
    static { ChatDynamicVariableModel_1 = this; }
    static { this.ID = 'chatDynamicVariableModel'; }
    get variables() {
        return [...this._variables];
    }
    get id() {
        return ChatDynamicVariableModel_1.ID;
    }
    constructor(widget, labelService, configService, instantiationService) {
        super();
        this.widget = widget;
        this.labelService = labelService;
        this.configService = configService;
        this.instantiationService = instantiationService;
        this._variables = [];
        this._register(widget.inputEditor.onDidChangeModelContent(e => {
            e.changes.forEach(c => {
                // Don't mutate entries in _variables, since they will be returned from the getter
                this._variables = coalesce(this._variables.map(ref => {
                    const intersection = Range.intersectRanges(ref.range, c.range);
                    if (intersection && !intersection.isEmpty()) {
                        // The reference text was changed, it's broken.
                        // But if the whole reference range was deleted (eg history navigation) then don't try to change the editor.
                        if (!Range.containsRange(c.range, ref.range)) {
                            const rangeToDelete = new Range(ref.range.startLineNumber, ref.range.startColumn, ref.range.endLineNumber, ref.range.endColumn - 1);
                            this.widget.inputEditor.executeEdits(this.id, [{
                                    range: rangeToDelete,
                                    text: '',
                                }]);
                            this.widget.refreshParsedInput();
                        }
                        // dispose the reference if possible before dropping it off
                        if ('dispose' in ref && typeof ref.dispose === 'function') {
                            ref.dispose();
                        }
                        return null;
                    }
                    else if (Range.compareRangesUsingStarts(ref.range, c.range) > 0) {
                        const delta = c.text.length - c.rangeLength;
                        ref.range = {
                            startLineNumber: ref.range.startLineNumber,
                            startColumn: ref.range.startColumn + delta,
                            endLineNumber: ref.range.endLineNumber,
                            endColumn: ref.range.endColumn + delta,
                        };
                        return ref;
                    }
                    return ref;
                }));
            });
            this.updateDecorations();
        }));
    }
    getInputState() {
        return this.variables
            .map((variable) => {
            // return underlying `IDynamicVariable` object for file references
            if (variable instanceof ChatFileReference) {
                return variable.reference;
            }
            return variable;
        });
    }
    setInputState(s) {
        if (!Array.isArray(s)) {
            s = [];
        }
        this.disposeVariables();
        this._variables = [];
        for (const variable of s) {
            if (!isDynamicVariable(variable)) {
                continue;
            }
            this.addReference(variable);
        }
    }
    addReference(ref) {
        // use `ChatFileReference` for file references and `IDynamicVariable` for other variables
        const promptSnippetsEnabled = PromptsConfig.enabled(this.configService);
        const variable = (ref.id === 'vscode.file' && promptSnippetsEnabled)
            ? this.instantiationService.createInstance(ChatFileReference, ref)
            : ref;
        this._variables.push(variable);
        this.updateDecorations();
        this.widget.refreshParsedInput();
        // if the `prompt snippets` feature is enabled, and file is a `prompt snippet`,
        // start resolving nested file references immediately and subscribe to updates
        if (variable instanceof ChatFileReference && variable.isPromptFile) {
            // subscribe to variable changes
            variable.onUpdate(() => {
                this.updateDecorations();
            });
            // start resolving the file references
            variable.start();
        }
    }
    updateDecorations() {
        this.widget.inputEditor.setDecorationsByType('chat', dynamicVariableDecorationType, this._variables.map((r) => ({
            range: r.range,
            hoverMessage: this.getHoverForReference(r)
        })));
    }
    getHoverForReference(ref) {
        const value = ref.data;
        if (URI.isUri(value)) {
            return new MarkdownString(this.labelService.getUriLabel(value, { relative: true }));
        }
        else if (isLocation(value)) {
            const prefix = ref.fullName ? ` ${ref.fullName}` : '';
            const rangeString = `#${value.range.startLineNumber}-${value.range.endLineNumber}`;
            return new MarkdownString(prefix + this.labelService.getUriLabel(value.uri, { relative: true }) + rangeString);
        }
        else {
            return undefined;
        }
    }
    /**
     * Dispose all existing variables.
     */
    disposeVariables() {
        for (const variable of this._variables) {
            if ('dispose' in variable && typeof variable.dispose === 'function') {
                variable.dispose();
            }
        }
    }
    dispose() {
        this.disposeVariables();
        super.dispose();
    }
};
ChatDynamicVariableModel = ChatDynamicVariableModel_1 = __decorate([
    __param(1, ILabelService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService)
], ChatDynamicVariableModel);
export { ChatDynamicVariableModel };
/**
 * Loose check to filter objects that are obviously missing data
 */
function isDynamicVariable(obj) {
    return obj &&
        typeof obj.id === 'string' &&
        Range.isIRange(obj.range) &&
        'data' in obj;
}
ChatWidget.CONTRIBS.push(ChatDynamicVariableModel);
function isSelectAndInsertActionContext(context) {
    return 'widget' in context && 'range' in context;
}
export class SelectAndInsertFileAction extends Action2 {
    static { this.Name = 'files'; }
    static { this.Item = {
        label: localize('allFiles', 'All Files'),
        description: localize('allFilesDescription', 'Search for relevant files in the workspace and provide context from them'),
    }; }
    static { this.ID = 'workbench.action.chat.selectAndInsertFile'; }
    constructor() {
        super({
            id: SelectAndInsertFileAction.ID,
            title: '' // not displayed
        });
    }
    async run(accessor, ...args) {
        const textModelService = accessor.get(ITextModelService);
        const logService = accessor.get(ILogService);
        const quickInputService = accessor.get(IQuickInputService);
        const context = args[0];
        if (!isSelectAndInsertActionContext(context)) {
            return;
        }
        const doCleanup = () => {
            // Failed, remove the dangling `file`
            context.widget.inputEditor.executeEdits('chatInsertFile', [{ range: context.range, text: `` }]);
        };
        let options;
        // TODO: have dedicated UX for this instead of using the quick access picker
        const picks = await quickInputService.quickAccess.pick('', options);
        if (!picks?.length) {
            logService.trace('SelectAndInsertFileAction: no file selected');
            doCleanup();
            return;
        }
        const editor = context.widget.inputEditor;
        const range = context.range;
        // Handle the special case of selecting all files
        if (picks[0] === SelectAndInsertFileAction.Item) {
            const text = `#${SelectAndInsertFileAction.Name}`;
            const success = editor.executeEdits('chatInsertFile', [{ range, text: text + ' ' }]);
            if (!success) {
                logService.trace(`SelectAndInsertFileAction: failed to insert "${text}"`);
                doCleanup();
            }
            return;
        }
        // Handle the case of selecting a specific file
        const resource = picks[0].resource;
        if (!textModelService.canHandleResource(resource)) {
            logService.trace('SelectAndInsertFileAction: non-text resource selected');
            doCleanup();
            return;
        }
        const fileName = basename(resource);
        const text = `#file:${fileName}`;
        const success = editor.executeEdits('chatInsertFile', [{ range, text: text + ' ' }]);
        if (!success) {
            logService.trace(`SelectAndInsertFileAction: failed to insert "${text}"`);
            doCleanup();
            return;
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: 'vscode.file',
            isFile: true,
            prefix: 'file',
            range: { startLineNumber: range.startLineNumber, startColumn: range.startColumn, endLineNumber: range.endLineNumber, endColumn: range.startColumn + text.length },
            data: resource
        });
    }
}
registerAction2(SelectAndInsertFileAction);
export class SelectAndInsertFolderAction extends Action2 {
    static { this.Name = 'folder'; }
    static { this.ID = 'workbench.action.chat.selectAndInsertFolder'; }
    constructor() {
        super({
            id: SelectAndInsertFolderAction.ID,
            title: '' // not displayed
        });
    }
    async run(accessor, ...args) {
        const logService = accessor.get(ILogService);
        const context = args[0];
        if (!isSelectAndInsertActionContext(context)) {
            return;
        }
        const doCleanup = () => {
            // Failed, remove the dangling `folder`
            context.widget.inputEditor.executeEdits('chatInsertFolder', [{ range: context.range, text: `` }]);
        };
        const folder = await createFolderQuickPick(accessor);
        if (!folder) {
            logService.trace('SelectAndInsertFolderAction: no folder selected');
            doCleanup();
            return;
        }
        const editor = context.widget.inputEditor;
        const range = context.range;
        const folderName = basename(folder);
        const text = `#folder:${folderName}`;
        const success = editor.executeEdits('chatInsertFolder', [{ range, text: text + ' ' }]);
        if (!success) {
            logService.trace(`SelectAndInsertFolderAction: failed to insert "${text}"`);
            doCleanup();
            return;
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: 'vscode.folder',
            isFile: false,
            isDirectory: true,
            prefix: 'folder',
            range: { startLineNumber: range.startLineNumber, startColumn: range.startColumn, endLineNumber: range.endLineNumber, endColumn: range.startColumn + text.length },
            data: folder
        });
    }
}
registerAction2(SelectAndInsertFolderAction);
export async function createFolderQuickPick(accessor) {
    const quickInputService = accessor.get(IQuickInputService);
    const searchService = accessor.get(ISearchService);
    const configurationService = accessor.get(IConfigurationService);
    const workspaceService = accessor.get(IWorkspaceContextService);
    const fileService = accessor.get(IFileService);
    const labelService = accessor.get(ILabelService);
    const workspaces = workspaceService.getWorkspace().folders.map(folder => folder.uri);
    const topLevelFolderItems = (await getTopLevelFolders(workspaces, fileService)).map(createQuickPickItem);
    const quickPick = quickInputService.createQuickPick();
    quickPick.placeholder = 'Search folder by name';
    quickPick.items = topLevelFolderItems;
    return await new Promise(_resolve => {
        const disposables = new DisposableStore();
        const resolve = (res) => {
            _resolve(res);
            disposables.dispose();
            quickPick.dispose();
        };
        disposables.add(quickPick.onDidChangeValue(async (value) => {
            if (value === '') {
                quickPick.items = topLevelFolderItems;
                return;
            }
            const workspaceFolders = await Promise.all(workspaces.map(workspace => searchFolders(workspace, value, true, undefined, undefined, configurationService, searchService)));
            quickPick.items = workspaceFolders.flat().map(createQuickPickItem);
        }));
        disposables.add(quickPick.onDidAccept((e) => {
            const value = quickPick.selectedItems[0]?.resource;
            resolve(value);
        }));
        disposables.add(quickPick.onDidHide(() => {
            resolve(undefined);
        }));
        quickPick.show();
    });
    function createQuickPickItem(folder) {
        return {
            type: 'item',
            id: folder.toString(),
            resource: folder,
            alwaysShow: true,
            label: basename(folder),
            description: labelService.getUriLabel(dirname(folder), { relative: true }),
            iconClass: ThemeIcon.asClassName(Codicon.folder),
        };
    }
}
export async function getTopLevelFolders(workspaces, fileService) {
    const folders = [];
    for (const workspace of workspaces) {
        const fileSystemProvider = fileService.getProvider(workspace.scheme);
        if (!fileSystemProvider) {
            continue;
        }
        const entries = await fileSystemProvider.readdir(workspace);
        for (const [name, type] of entries) {
            const entryResource = joinPath(workspace, name);
            if (type === FileType.Directory) {
                folders.push(entryResource);
            }
        }
    }
    return folders;
}
export async function searchFolders(workspace, pattern, fuzzyMatch, token, cacheKey, configurationService, searchService) {
    const segmentMatchPattern = caseInsensitiveGlobPattern(fuzzyMatch ? fuzzyMatchingGlobPattern(pattern) : continousMatchingGlobPattern(pattern));
    const searchExcludePattern = getExcludes(configurationService.getValue({ resource: workspace })) || {};
    const searchOptions = {
        folderQueries: [{
                folder: workspace,
                disregardIgnoreFiles: configurationService.getValue('explorer.excludeGitIgnore'),
            }],
        type: 1 /* QueryType.File */,
        shouldGlobMatchFilePattern: true,
        cacheKey,
        excludePattern: searchExcludePattern,
    };
    let folderResults;
    try {
        folderResults = await searchService.fileSearch({ ...searchOptions, filePattern: `**/${segmentMatchPattern}/**` }, token);
    }
    catch (e) {
        if (!isCancellationError(e)) {
            throw e;
        }
    }
    if (!folderResults || token?.isCancellationRequested) {
        return [];
    }
    const folderResources = getMatchingFoldersFromFiles(folderResults.results.map(result => result.resource), workspace, segmentMatchPattern);
    return folderResources;
}
function fuzzyMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern.split('').join('*') + '*';
}
function continousMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern + '*';
}
function caseInsensitiveGlobPattern(pattern) {
    let caseInsensitiveFilePattern = '';
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (/[a-zA-Z]/.test(char)) {
            caseInsensitiveFilePattern += `[${char.toLowerCase()}${char.toUpperCase()}]`;
        }
        else {
            caseInsensitiveFilePattern += char;
        }
    }
    return caseInsensitiveFilePattern;
}
// TODO: remove this and have support from the search service
function getMatchingFoldersFromFiles(resources, workspace, segmentMatchPattern) {
    const uniqueFolders = new ResourceSet();
    for (const resource of resources) {
        const relativePathToRoot = relativePath(workspace, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the workspace');
        }
        let dirResource = workspace;
        const stats = relativePathToRoot.split('/').slice(0, -1);
        for (const stat of stats) {
            dirResource = dirResource.with({ path: `${dirResource.path}/${stat}` });
            uniqueFolders.add(dirResource);
        }
    }
    const matchingFolders = [];
    for (const folderResource of uniqueFolders) {
        const stats = folderResource.path.split('/');
        const dirStat = stats[stats.length - 1];
        if (!dirStat || !glob.match(segmentMatchPattern, dirStat)) {
            continue;
        }
        matchingFolders.push(folderResource);
    }
    return matchingFolders;
}
export class SelectAndInsertSymAction extends Action2 {
    static { this.Name = 'symbols'; }
    static { this.ID = 'workbench.action.chat.selectAndInsertSym'; }
    constructor() {
        super({
            id: SelectAndInsertSymAction.ID,
            title: '' // not displayed
        });
    }
    async run(accessor, ...args) {
        const textModelService = accessor.get(ITextModelService);
        const logService = accessor.get(ILogService);
        const quickInputService = accessor.get(IQuickInputService);
        const context = args[0];
        if (!isSelectAndInsertActionContext(context)) {
            return;
        }
        const doCleanup = () => {
            // Failed, remove the dangling `sym`
            context.widget.inputEditor.executeEdits('chatInsertSym', [{ range: context.range, text: `` }]);
        };
        // TODO: have dedicated UX for this instead of using the quick access picker
        const picks = await quickInputService.quickAccess.pick('#', { enabledProviderPrefixes: ['#'] });
        if (!picks?.length) {
            logService.trace('SelectAndInsertSymAction: no symbol selected');
            doCleanup();
            return;
        }
        const editor = context.widget.inputEditor;
        const range = context.range;
        // Handle the case of selecting a specific file
        const symbol = picks[0].symbol;
        if (!symbol || !textModelService.canHandleResource(symbol.location.uri)) {
            logService.trace('SelectAndInsertSymAction: non-text resource selected');
            doCleanup();
            return;
        }
        const text = `#sym:${symbol.name}`;
        const success = editor.executeEdits('chatInsertSym', [{ range, text: text + ' ' }]);
        if (!success) {
            logService.trace(`SelectAndInsertSymAction: failed to insert "${text}"`);
            doCleanup();
            return;
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: 'vscode.symbol',
            prefix: 'symbol',
            range: { startLineNumber: range.startLineNumber, startColumn: range.startColumn, endLineNumber: range.endLineNumber, endColumn: range.startColumn + text.length },
            data: symbol.location
        });
    }
}
registerAction2(SelectAndInsertSymAction);
function isAddDynamicVariableContext(context) {
    return 'widget' in context &&
        'range' in context &&
        'variableData' in context;
}
export class AddDynamicVariableAction extends Action2 {
    static { this.ID = 'workbench.action.chat.addDynamicVariable'; }
    constructor() {
        super({
            id: AddDynamicVariableAction.ID,
            title: '' // not displayed
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        if (!isAddDynamicVariableContext(context)) {
            return;
        }
        let range = context.range;
        const variableData = context.variableData;
        const doCleanup = () => {
            // Failed, remove the dangling variable prefix
            context.widget.inputEditor.executeEdits('chatInsertDynamicVariableWithArguments', [{ range: context.range, text: `` }]);
        };
        // If this completion item has no command, return it directly
        if (context.command) {
            // Invoke the command on this completion item along with its args and return the result
            const commandService = accessor.get(ICommandService);
            const selection = await commandService.executeCommand(context.command.id, ...(context.command.arguments ?? []));
            if (!selection) {
                doCleanup();
                return;
            }
            // Compute new range and variableData
            const insertText = ':' + selection;
            const insertRange = new Range(range.startLineNumber, range.endColumn, range.endLineNumber, range.endColumn + insertText.length);
            range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + insertText.length);
            const editor = context.widget.inputEditor;
            const success = editor.executeEdits('chatInsertDynamicVariableWithArguments', [{ range: insertRange, text: insertText + ' ' }]);
            if (!success) {
                doCleanup();
                return;
            }
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: context.id,
            range: range,
            isFile: true,
            prefix: 'file',
            data: variableData
        });
    }
}
registerAction2(AddDynamicVariableAction);
export async function createMarkersQuickPick(accessor, level, onBackgroundAccept) {
    const markers = accessor.get(IMarkerService).read({ severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info });
    if (!markers.length) {
        return;
    }
    const uriIdentityService = accessor.get(IUriIdentityService);
    const labelService = accessor.get(ILabelService);
    const grouped = groupBy(markers, (a, b) => uriIdentityService.extUri.compare(a.resource, b.resource));
    const severities = new Set();
    const items = [];
    let pickCount = 0;
    for (const group of grouped) {
        const resource = group[0].resource;
        if (level === 'problem') {
            items.push({ type: 'separator', label: labelService.getUriLabel(resource, { relative: true }) });
            for (const marker of group) {
                pickCount++;
                severities.add(marker.severity);
                items.push({
                    type: 'item',
                    resource: marker.resource,
                    label: marker.message,
                    description: localize('markers.panel.at.ln.col.number', "[Ln {0}, Col {1}]", '' + marker.startLineNumber, '' + marker.startColumn),
                    entry: IDiagnosticVariableEntryFilterData.fromMarker(marker),
                });
            }
        }
        else if (level === 'file') {
            const entry = { filterUri: resource };
            pickCount++;
            items.push({
                type: 'item',
                resource,
                label: IDiagnosticVariableEntryFilterData.label(entry),
                description: group[0].message + (group.length > 1 ? localize('problemsMore', '+ {0} more', group.length - 1) : ''),
                entry,
            });
            for (const marker of group) {
                severities.add(marker.severity);
            }
        }
        else {
            assertNever(level);
        }
    }
    if (pickCount < 2) { // single error in a URI
        return items.find((i) => i.type === 'item')?.entry;
    }
    if (level === 'file') {
        items.unshift({ type: 'separator', label: localize('markers.panel.files', 'Files') });
    }
    items.unshift({ type: 'item', label: localize('markers.panel.allErrors', 'All Problems'), entry: { filterSeverity: MarkerSeverity.Info } });
    const quickInputService = accessor.get(IQuickInputService);
    const store = new DisposableStore();
    const quickPick = store.add(quickInputService.createQuickPick({ useSeparators: true }));
    quickPick.canAcceptInBackground = !onBackgroundAccept;
    quickPick.placeholder = localize('pickAProblem', 'Pick a problem to attach...');
    quickPick.items = items;
    return new Promise(resolve => {
        store.add(quickPick.onDidHide(() => resolve(undefined)));
        store.add(quickPick.onDidAccept(ev => {
            if (ev.inBackground) {
                onBackgroundAccept?.(quickPick.selectedItems.map(i => i.entry));
            }
            else {
                resolve(quickPick.selectedItems[0]?.entry);
                quickPick.dispose();
            }
        }));
        quickPick.show();
    }).finally(() => store.dispose());
}
export class SelectAndInsertProblemAction extends Action2 {
    static { this.Name = 'problems'; }
    static { this.ID = 'workbench.action.chat.selectAndInsertProblems'; }
    constructor() {
        super({
            id: SelectAndInsertProblemAction.ID,
            title: '' // not displayed
        });
    }
    async run(accessor, ...args) {
        const logService = accessor.get(ILogService);
        const context = args[0];
        if (!isSelectAndInsertActionContext(context)) {
            return;
        }
        const doCleanup = () => {
            // Failed, remove the dangling `problem`
            context.widget.inputEditor.executeEdits('chatInsertProblems', [{ range: context.range, text: `` }]);
        };
        const pick = await createMarkersQuickPick(accessor, 'file');
        if (!pick) {
            doCleanup();
            return;
        }
        const editor = context.widget.inputEditor;
        const originalRange = context.range;
        const insertText = `#${SelectAndInsertProblemAction.Name}:${pick.filterUri ? basename(pick.filterUri) : MarkerSeverity.toString(pick.filterSeverity)}`;
        const varRange = new Range(originalRange.startLineNumber, originalRange.startColumn, originalRange.endLineNumber, originalRange.startColumn + insertText.length);
        const success = editor.executeEdits('chatInsertProblems', [{ range: varRange, text: insertText + ' ' }]);
        if (!success) {
            logService.trace(`SelectAndInsertProblemsAction: failed to insert "${insertText}"`);
            doCleanup();
            return;
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: 'vscode.problems',
            prefix: SelectAndInsertProblemAction.Name,
            range: varRange,
            data: { id: 'vscode.problems', filter: pick },
        });
    }
}
registerAction2(SelectAndInsertProblemAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdER5bmFtaWNWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0RHluYW1pY1ZhcmlhYmxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFM0UsT0FBTyxFQUFXLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxD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