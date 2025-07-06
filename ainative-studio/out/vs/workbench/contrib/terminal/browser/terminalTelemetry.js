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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/path.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ITerminalService } from './terminal.js';
let TerminalTelemetryContribution = class TerminalTelemetryContribution extends Disposable {
    static { this.ID = 'terminalTelemetry'; }
    constructor(terminalService, _telemetryService) {
        super();
        this._telemetryService = _telemetryService;
        this._register(terminalService.onDidCreateInstance(async (instance) => {
            // Wait for process ready so the shell launch config is fully resolved
            await instance.processReady;
            this._logCreateInstance(instance.shellLaunchConfig);
        }));
    }
    _logCreateInstance(shellLaunchConfig) {
        this._telemetryService.publicLog2('terminal/createInstance', {
            shellType: getSanitizedShellType(shellLaunchConfig),
            isReconnect: !!shellLaunchConfig.attachPersistentProcess,
            isCustomPtyImplementation: !!shellLaunchConfig.customPtyImplementation,
            isLoginShell: (typeof shellLaunchConfig.args === 'string' ? shellLaunchConfig.args.split(' ') : shellLaunchConfig.args)?.some(arg => arg === '-l' || arg === '--login') ?? false,
        });
    }
};
TerminalTelemetryContribution = __decorate([
    __param(0, ITerminalService),
    __param(1, ITelemetryService)
], TerminalTelemetryContribution);
export { TerminalTelemetryContribution };
var AllowedShellType;
(function (AllowedShellType) {
    AllowedShellType["Unknown"] = "unknown";
    // Windows only
    AllowedShellType["CommandPrompt"] = "cmd";
    AllowedShellType["GitBash"] = "git-bash";
    AllowedShellType["WindowsPowerShell"] = "windows-powershell";
    AllowedShellType["Wsl"] = "wsl";
    // All platforms
    AllowedShellType["Bash"] = "bash";
    AllowedShellType["Csh"] = "csh";
    AllowedShellType["Dash"] = "dash";
    AllowedShellType["Fish"] = "fish";
    AllowedShellType["Ksh"] = "ksh";
    AllowedShellType["Nushell"] = "nu";
    AllowedShellType["Pwsh"] = "pwsh";
    AllowedShellType["Sh"] = "sh";
    AllowedShellType["Ssh"] = "ssh";
    AllowedShellType["Tcsh"] = "tcsh";
    AllowedShellType["Tmux"] = "tmux";
    AllowedShellType["Zsh"] = "zsh";
    // Lanugage REPLs
    AllowedShellType["Julia"] = "julia";
    AllowedShellType["Node"] = "node";
    AllowedShellType["Python"] = "python";
    AllowedShellType["RubyIrb"] = "irb";
})(AllowedShellType || (AllowedShellType = {}));
// Types that match the executable name directly
const shellTypeExecutableAllowList = new Set([
    "cmd" /* AllowedShellType.CommandPrompt */,
    "wsl" /* AllowedShellType.Wsl */,
    "bash" /* AllowedShellType.Bash */,
    "csh" /* AllowedShellType.Csh */,
    "dash" /* AllowedShellType.Dash */,
    "fish" /* AllowedShellType.Fish */,
    "ksh" /* AllowedShellType.Ksh */,
    "nu" /* AllowedShellType.Nushell */,
    "pwsh" /* AllowedShellType.Pwsh */,
    "sh" /* AllowedShellType.Sh */,
    "ssh" /* AllowedShellType.Ssh */,
    "tcsh" /* AllowedShellType.Tcsh */,
    "tmux" /* AllowedShellType.Tmux */,
    "zsh" /* AllowedShellType.Zsh */,
    "julia" /* AllowedShellType.Julia */,
    "node" /* AllowedShellType.Node */,
    "irb" /* AllowedShellType.RubyIrb */,
]);
// Dynamic executables that map to a single type
const shellTypeExecutableRegexAllowList = [
    { regex: /^python(?:\d+(?:\.\d+)?)?$/i, type: "python" /* AllowedShellType.Python */ },
];
// Path-based look ups
const shellTypePathRegexAllowList = [
    // Git bash uses bash.exe, so look up based on the path
    { regex: /Git\\bin\\bash\.exe$/i, type: "git-bash" /* AllowedShellType.GitBash */ },
    // WindowsPowerShell should always be installed on this path, we cannot just look at the
    // executable name since powershell is the CLI on other platforms sometimes (eg. snap package)
    { regex: /WindowsPowerShell\\v1.0\\powershell.exe$/i, type: "windows-powershell" /* AllowedShellType.WindowsPowerShell */ },
    // WSL executables will represent some other shell in the end, but it's difficult to determine
    // when we log
    { regex: /Windows\\System32\\(?:bash|wsl)\.exe$/i, type: "wsl" /* AllowedShellType.Wsl */ },
];
function getSanitizedShellType(shellLaunchConfig) {
    if (!shellLaunchConfig.executable) {
        return "unknown" /* AllowedShellType.Unknown */;
    }
    const executableFile = basename(shellLaunchConfig.executable);
    const executableFileWithoutExt = executableFile.replace(/\.[^\.]+$/, '');
    for (const entry of shellTypePathRegexAllowList) {
        if (entry.regex.test(shellLaunchConfig.executable)) {
            return entry.type;
        }
    }
    for (const entry of shellTypeExecutableRegexAllowList) {
        if (entry.regex.test(executableFileWithoutExt)) {
            return entry.type;
        }
    }
    if ((shellTypeExecutableAllowList).has(executableFileWithoutExt)) {
        return executableFileWithoutExt;
    }
    return "unknown" /* AllowedShellType.Unknown */;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsVGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFHdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTFDLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsVUFBVTthQUNyRCxPQUFFLEdBQUcsbUJBQW1CLEFBQXRCLENBQXVCO0lBRWhDLFlBQ21CLGVBQWlDLEVBQ2YsaUJBQW9DO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBRjRCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFJeEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFDLFFBQVEsRUFBQyxFQUFFO1lBQ25FLHNFQUFzRTtZQUN0RSxNQUFNLFFBQVEsQ0FBQyxZQUFZLENBQUM7WUFDNUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sa0JBQWtCLENBQUMsaUJBQXFDO1FBZS9ELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQXlFLHlCQUF5QixFQUFFO1lBQ3BJLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FB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