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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFRlbGVtZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBR3ZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUUxQyxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLFVBQVU7YUFDckQsT0FBRSxHQUFHLG1CQUFtQixBQUF0QixDQUF1QjtJQUVoQyxZQUNtQixlQUFpQyxFQUNmLGlCQUFvQztRQUV4RSxLQUFLLEVBQUUsQ0FBQztRQUY0QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBSXhFLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBQyxRQUFRLEVBQUMsRUFBRTtZQUNuRSxzRUFBc0U7WUFDdEUsTUFBTSxRQUFRLENBQUMsWUFBWSxDQUFDO1lBQzVCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGtCQUFrQixDQUFDLGlCQUFxQztRQWUvRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUF5RSx5QkFBeUIsRUFBRTtZQUNwSSxTQUFTLEVBQUUscUJBQXFCLENBQUMsaUJBQWlCLENB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