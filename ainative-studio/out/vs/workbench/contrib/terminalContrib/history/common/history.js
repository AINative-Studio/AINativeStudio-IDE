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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9oaXN0b3J5L2NvbW1vbi9oaXN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFtQixNQUFNLHdDQUF3QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFxQyxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNwSSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sK0RBQStELENBQUM7QUFDeEgsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUVqSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQTZCL0YsSUFBVyxTQUVWO0FBRkQsV0FBVyxTQUFTO0lBQ25CLHlFQUF5QixDQUFBO0FBQzFCLENBQUMsRUFGVSxTQUFTLEtBQVQsU0FBUyxRQUVuQjtBQUVELElBQVcsV0FHVjtBQUhELFdBQVcsV0FBVztJQUNyQixtREFB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