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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdER5bmFtaWNWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvbnRyaWIvY2hhdER5bmFtaWNWYXJpYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRSxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTNFLE9BQU8sRUFBVyxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQs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