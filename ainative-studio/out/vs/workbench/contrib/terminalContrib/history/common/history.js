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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { join } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { env } from '../../../../../base/common/process.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { FileOperationError, IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
var Constants;
(function (Constants) {
    Constants[Constants["DefaultHistoryLimit"] = 100] = "DefaultHistoryLimit";
})(Constants || (Constants = {}));
var StorageKeys;
(function (StorageKeys) {
    StorageKeys["Entries"] = "terminal.history.entries";
    StorageKeys["Timestamp"] = "terminal.history.timestamp";
})(StorageKeys || (StorageKeys = {}));
let directoryHistory = undefined;
export function getDirectoryHistory(accessor) {
    if (!directoryHistory) {
        directoryHistory = accessor.get(IInstantiationService).createInstance(TerminalPersistedHistory, 'dirs');
    }
    return directoryHistory;
}
let commandHistory = undefined;
export function getCommandHistory(accessor) {
    if (!commandHistory) {
        commandHistory = accessor.get(IInstantiationService).createInstance(TerminalPersistedHistory, 'commands');
    }
    return commandHistory;
}
let TerminalPersistedHistory = class TerminalPersistedHistory extends Disposable {
    get entries() {
        this._ensureUpToDate();
        return this._entries.entries();
    }
    constructor(_storageDataKey, _configurationService, _storageService) {
        super();
        this._storageDataKey = _storageDataKey;
        this._configurationService = _configurationService;
        this._storageService = _storageService;
        this._timestamp = 0;
        this._isReady = false;
        this._isStale = true;
        // Init cache
        this._entries = new LRUCache(this._getHistoryLimit());
        // Listen for config changes to set history limit
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.shellIntegration.history" /* TerminalHistorySettingId.ShellIntegrationCommandHistory */)) {
                this._entries.limit = this._getHistoryLimit();
            }
        }));
        // Listen to cache changes from other windows
        this._register(this._storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, this._getTimestampStorageKey(), this._store)(() => {
            if (!this._isStale) {
                this._isStale = this._storageService.getNumber(this._getTimestampStorageKey(), -1 /* StorageScope.APPLICATION */, 0) !== this._timestamp;
            }
        }));
    }
    add(key, value) {
        this._ensureUpToDate();
        this._entries.set(key, value);
        this._saveState();
    }
    remove(key) {
        this._ensureUpToDate();
        this._entries.delete(key);
        this._saveState();
    }
    clear() {
        this._ensureUpToDate();
        this._entries.clear();
        this._saveState();
    }
    _ensureUpToDate() {
        // Initial load
        if (!this._isReady) {
            this._loadState();
            this._isReady = true;
        }
        // React to stale cache caused by another window
        if (this._isStale) {
            // Since state is saved whenever the entries change, it's a safe assumption that no
            // merging of entries needs to happen, just loading the new state.
            this._entries.clear();
            this._loadState();
            this._isStale = false;
        }
    }
    _loadState() {
        this._timestamp = this._storageService.getNumber(this._getTimestampStorageKey(), -1 /* StorageScope.APPLICATION */, 0);
        // Load global entries plus
        const serialized = this._loadPersistedState();
        if (serialized) {
            for (const entry of serialized.entries) {
                this._entries.set(entry.key, entry.value);
            }
        }
    }
    _loadPersistedState() {
        const raw = this._storageService.get(this._getEntriesStorageKey(), -1 /* StorageScope.APPLICATION */);
        if (raw === undefined || raw.length === 0) {
            return undefined;
        }
        let serialized = undefined;
        try {
            serialized = JSON.parse(raw);
        }
        catch {
            // Invalid data
            return undefined;
        }
        return serialized;
    }
    _saveState() {
        const serialized = { entries: [] };
        this._entries.forEach((value, key) => serialized.entries.push({ key, value }));
        this._storageService.store(this._getEntriesStorageKey(), JSON.stringify(serialized), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this._timestamp = Date.now();
        this._storageService.store(this._getTimestampStorageKey(), this._timestamp, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    _getHistoryLimit() {
        const historyLimit = this._configurationService.getValue("terminal.integrated.shellIntegration.history" /* TerminalHistorySettingId.ShellIntegrationCommandHistory */);
        return typeof historyLimit === 'number' ? historyLimit : 100 /* Constants.DefaultHistoryLimit */;
    }
    _getTimestampStorageKey() {
        return `${"terminal.history.timestamp" /* StorageKeys.Timestamp */}.${this._storageDataKey}`;
    }
    _getEntriesStorageKey() {
        return `${"terminal.history.entries" /* StorageKeys.Entries */}.${this._storageDataKey}`;
    }
};
TerminalPersistedHistory = __decorate([
    __param(1, IConfigurationService),
    __param(2, IStorageService)
], TerminalPersistedHistory);
export { TerminalPersistedHistory };
const shellFileHistory = new Map();
export async function getShellFileHistory(accessor, shellType) {
    const cached = shellFileHistory.get(shellType);
    if (cached === null) {
        return undefined;
    }
    if (cached !== undefined) {
        return cached;
    }
    let result;
    switch (shellType) {
        case "bash" /* PosixShellType.Bash */:
            result = await fetchBashHistory(accessor);
            break;
        case "pwsh" /* GeneralShellType.PowerShell */:
            result = await fetchPwshHistory(accessor);
            break;
        case "zsh" /* PosixShellType.Zsh */:
            result = await fetchZshHistory(accessor);
            break;
        case "fish" /* PosixShellType.Fish */:
            result = await fetchFishHistory(accessor);
            break;
        case "python" /* GeneralShellType.Python */:
            result = await fetchPythonHistory(accessor);
            break;
        default: return undefined;
    }
    if (result === undefined) {
        shellFileHistory.set(shellType, null);
        return undefined;
    }
    shellFileHistory.set(shellType, result);
    return result;
}
export function clearShellFileHistory() {
    shellFileHistory.clear();
}
export async function fetchBashHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const remoteEnvironment = await remoteAgentService.getEnvironment();
    if (remoteEnvironment?.os === 1 /* OperatingSystem.Windows */ || !remoteEnvironment && isWindows) {
        return undefined;
    }
    const sourceLabel = '~/.bash_history';
    const resolvedFile = await fetchFileContents(env['HOME'], '.bash_history', false, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    // .bash_history does not differentiate wrapped commands from multiple commands. Parse
    // the output to get the
    const fileLines = resolvedFile.content.split('\n');
    const result = new Set();
    let currentLine;
    let currentCommand = undefined;
    let wrapChar = undefined;
    for (let i = 0; i < fileLines.length; i++) {
        currentLine = fileLines[i];
        if (currentCommand === undefined) {
            currentCommand = currentLine;
        }
        else {
            currentCommand += `\n${currentLine}`;
        }
        for (let c = 0; c < currentLine.length; c++) {
            if (wrapChar) {
                if (currentLine[c] === wrapChar) {
                    wrapChar = undefined;
                }
            }
            else {
                if (currentLine[c].match(/['"]/)) {
                    wrapChar = currentLine[c];
                }
            }
        }
        if (wrapChar === undefined) {
            if (currentCommand.length > 0) {
                result.add(currentCommand.trim());
            }
            currentCommand = undefined;
        }
    }
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values())
    };
}
export async function fetchZshHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const remoteEnvironment = await remoteAgentService.getEnvironment();
    if (remoteEnvironment?.os === 1 /* OperatingSystem.Windows */ || !remoteEnvironment && isWindows) {
        return undefined;
    }
    const sourceLabel = '~/.zsh_history';
    const resolvedFile = await fetchFileContents(env['HOME'], '.zsh_history', false, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    const fileLines = resolvedFile.content.split(/\:\s\d+\:\d+;/);
    const result = new Set();
    for (let i = 0; i < fileLines.length; i++) {
        const sanitized = fileLines[i].replace(/\\\n/g, '\n').trim();
        if (sanitized.length > 0) {
            result.add(sanitized);
        }
    }
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values())
    };
}
export async function fetchPythonHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const sourceLabel = '~/.python_history';
    const resolvedFile = await fetchFileContents(env['HOME'], '.python_history', false, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    // Python history file is a simple text file with one command per line
    const fileLines = resolvedFile.content.split('\n');
    const result = new Set();
    fileLines.forEach(line => {
        if (line.trim().length > 0) {
            result.add(line.trim());
        }
    });
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values())
    };
}
export async function fetchPwshHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    let folderPrefix;
    let filePath;
    const remoteEnvironment = await remoteAgentService.getEnvironment();
    const isFileWindows = remoteEnvironment?.os === 1 /* OperatingSystem.Windows */ || !remoteEnvironment && isWindows;
    let sourceLabel;
    if (isFileWindows) {
        folderPrefix = env['APPDATA'];
        filePath = 'Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt';
        sourceLabel = `$APPDATA\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt`;
    }
    else {
        folderPrefix = env['HOME'];
        filePath = '.local/share/powershell/PSReadline/ConsoleHost_history.txt';
        sourceLabel = `~/${filePath}`;
    }
    const resolvedFile = await fetchFileContents(folderPrefix, filePath, isFileWindows, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    const fileLines = resolvedFile.content.split('\n');
    const result = new Set();
    let currentLine;
    let currentCommand = undefined;
    let wrapChar = undefined;
    for (let i = 0; i < fileLines.length; i++) {
        currentLine = fileLines[i];
        if (currentCommand === undefined) {
            currentCommand = currentLine;
        }
        else {
            currentCommand += `\n${currentLine}`;
        }
        if (!currentLine.endsWith('`')) {
            const sanitized = currentCommand.trim();
            if (sanitized.length > 0) {
                result.add(sanitized);
            }
            currentCommand = undefined;
            continue;
        }
        // If the line ends with `, the line may be wrapped. Need to also test the case where ` is
        // the last character in the line
        for (let c = 0; c < currentLine.length; c++) {
            if (wrapChar) {
                if (currentLine[c] === wrapChar) {
                    wrapChar = undefined;
                }
            }
            else {
                if (currentLine[c].match(/`/)) {
                    wrapChar = currentLine[c];
                }
            }
        }
        // Having an even number of backticks means the line is terminated
        // TODO: This doesn't cover more complicated cases where ` is within quotes
        if (!wrapChar) {
            const sanitized = currentCommand.trim();
            if (sanitized.length > 0) {
                result.add(sanitized);
            }
            currentCommand = undefined;
        }
        else {
            // Remove trailing backtick
            currentCommand = currentCommand.replace(/`$/, '');
            wrapChar = undefined;
        }
    }
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values())
    };
}
export async function fetchFishHistory(accessor) {
    const fileService = accessor.get(IFileService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const remoteEnvironment = await remoteAgentService.getEnvironment();
    if (remoteEnvironment?.os === 1 /* OperatingSystem.Windows */ || !remoteEnvironment && isWindows) {
        return undefined;
    }
    /**
     * From `fish` docs:
     * > The command history is stored in the file ~/.local/share/fish/fish_history
     *   (or $XDG_DATA_HOME/fish/fish_history if that variable is set) by default.
     *
     * (https://fishshell.com/docs/current/interactive.html#history-search)
     */
    const overridenDataHome = env['XDG_DATA_HOME'];
    // TODO: Unchecked fish behavior:
    // What if XDG_DATA_HOME was defined but somehow $XDG_DATA_HOME/fish/fish_history
    // was not exist. Does fish fall back to ~/.local/share/fish/fish_history?
    let folderPrefix;
    let filePath;
    let sourceLabel;
    if (overridenDataHome) {
        sourceLabel = '$XDG_DATA_HOME/fish/fish_history';
        folderPrefix = env['XDG_DATA_HOME'];
        filePath = 'fish/fish_history';
    }
    else {
        sourceLabel = '~/.local/share/fish/fish_history';
        folderPrefix = env['HOME'];
        filePath = '.local/share/fish/fish_history';
    }
    const resolvedFile = await fetchFileContents(folderPrefix, filePath, false, fileService, remoteAgentService);
    if (resolvedFile === undefined) {
        return undefined;
    }
    /**
     * These apply to `fish` v3.5.1:
     * - It looks like YAML but it's not. It's, quoting, *"a broken psuedo-YAML"*.
     *   See these discussions for more details:
     *   - https://github.com/fish-shell/fish-shell/pull/6493
     *   - https://github.com/fish-shell/fish-shell/issues/3341
     * - Every record should exactly start with `- cmd:` (the whitespace between `-` and `cmd` cannot be replaced with tab)
     * - Both `- cmd: echo 1` and `- cmd:echo 1` are valid entries.
     * - Backslashes are esacped as `\\`.
     * - Multiline commands are joined with a `\n` sequence, hence they're read as single line commands.
     * - Property `when` is optional.
     * - History navigation respects the records order and ignore the actual `when` property values (chronological order).
     * - If `cmd` value is multiline , it just takes the first line. Also YAML operators like `>-` or `|-` are not supported.
     */
    const result = new Set();
    const cmds = resolvedFile.content.split('\n')
        .filter(x => x.startsWith('- cmd:'))
        .map(x => x.substring(6).trimStart());
    for (let i = 0; i < cmds.length; i++) {
        const sanitized = sanitizeFishHistoryCmd(cmds[i]).trim();
        if (sanitized.length > 0) {
            result.add(sanitized);
        }
    }
    return {
        sourceLabel,
        sourceResource: resolvedFile.resource,
        commands: Array.from(result.values())
    };
}
export function sanitizeFishHistoryCmd(cmd) {
    /**
     * NOTE
     * This repeatedReplace() call can be eliminated by using look-ahead
     * caluses in the original RegExp pattern:
     *
     * >>> ```ts
     * >>> cmds[i].replace(/(?<=^|[^\\])((?:\\\\)*)(\\n)/g, '$1\n')
     * >>> ```
     *
     * But since not all browsers support look aheads we opted to a simple
     * pattern and repeatedly calling replace method.
     */
    return repeatedReplace(/(^|[^\\])((?:\\\\)*)(\\n)/g, cmd, '$1$2\n');
}
function repeatedReplace(pattern, value, replaceValue) {
    let last;
    let current = value;
    while (true) {
        last = current;
        current = current.replace(pattern, replaceValue);
        if (current === last) {
            return current;
        }
    }
}
async function fetchFileContents(folderPrefix, filePath, isFileWindows, fileService, remoteAgentService) {
    if (!folderPrefix) {
        return undefined;
    }
    const connection = remoteAgentService.getConnection();
    const isRemote = !!connection?.remoteAuthority;
    const resource = URI.from({
        scheme: isRemote ? Schemas.vscodeRemote : Schemas.file,
        authority: isRemote ? connection.remoteAuthority : undefined,
        path: URI.file(join(folderPrefix, filePath)).path
    });
    let content;
    try {
        content = await fileService.readFile(resource);
    }
    catch (e) {
        // Handle file not found only
        if (e instanceof FileOperationError && e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
            return undefined;
        }
        throw e;
    }
    if (content === undefined) {
        return undefined;
    }
    return {
        resource,
        content: content.value.toString()
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvaGlzdG9yeS9jb21tb24vaGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxrQkFBa0IsRUFBcUMsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDcEksT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sbURBQW1ELENBQUM7QUFFakgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUE2Qi9GLElBQVcsU0FFVjtBQUZELFdBQVcsU0FBUztJQUNuQix5RUFBeUIsQ0FBQTtBQUMxQixDQUFDLEVBRlUsU0FBUyxLQUFULFNBQVMsUUFFbkI7QUFFRCxJQUFXLFdBR1Y7QUFIRCxXQUFXLFdBQVc7SUFDckIsbURB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