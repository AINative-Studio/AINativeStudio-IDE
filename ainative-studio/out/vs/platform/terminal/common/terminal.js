/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { RawContextKey } from '../../contextkey/common/contextkey.js';
import { Registry } from '../../registry/common/platform.js';
export const terminalTabFocusModeContextKey = new RawContextKey('terminalTabFocusMode', false, true);
export var TerminalSettingPrefix;
(function (TerminalSettingPrefix) {
    TerminalSettingPrefix["AutomationProfile"] = "terminal.integrated.automationProfile.";
    TerminalSettingPrefix["DefaultProfile"] = "terminal.integrated.defaultProfile.";
    TerminalSettingPrefix["Profiles"] = "terminal.integrated.profiles.";
})(TerminalSettingPrefix || (TerminalSettingPrefix = {}));
export var TerminalSettingId;
(function (TerminalSettingId) {
    TerminalSettingId["SendKeybindingsToShell"] = "terminal.integrated.sendKeybindingsToShell";
    TerminalSettingId["AutomationProfileLinux"] = "terminal.integrated.automationProfile.linux";
    TerminalSettingId["AutomationProfileMacOs"] = "terminal.integrated.automationProfile.osx";
    TerminalSettingId["AutomationProfileWindows"] = "terminal.integrated.automationProfile.windows";
    TerminalSettingId["ProfilesWindows"] = "terminal.integrated.profiles.windows";
    TerminalSettingId["ProfilesMacOs"] = "terminal.integrated.profiles.osx";
    TerminalSettingId["ProfilesLinux"] = "terminal.integrated.profiles.linux";
    TerminalSettingId["DefaultProfileLinux"] = "terminal.integrated.defaultProfile.linux";
    TerminalSettingId["DefaultProfileMacOs"] = "terminal.integrated.defaultProfile.osx";
    TerminalSettingId["DefaultProfileWindows"] = "terminal.integrated.defaultProfile.windows";
    TerminalSettingId["UseWslProfiles"] = "terminal.integrated.useWslProfiles";
    TerminalSettingId["TabsDefaultColor"] = "terminal.integrated.tabs.defaultColor";
    TerminalSettingId["TabsDefaultIcon"] = "terminal.integrated.tabs.defaultIcon";
    TerminalSettingId["TabsEnabled"] = "terminal.integrated.tabs.enabled";
    TerminalSettingId["TabsEnableAnimation"] = "terminal.integrated.tabs.enableAnimation";
    TerminalSettingId["TabsHideCondition"] = "terminal.integrated.tabs.hideCondition";
    TerminalSettingId["TabsShowActiveTerminal"] = "terminal.integrated.tabs.showActiveTerminal";
    TerminalSettingId["TabsShowActions"] = "terminal.integrated.tabs.showActions";
    TerminalSettingId["TabsLocation"] = "terminal.integrated.tabs.location";
    TerminalSettingId["TabsFocusMode"] = "terminal.integrated.tabs.focusMode";
    TerminalSettingId["MacOptionIsMeta"] = "terminal.integrated.macOptionIsMeta";
    TerminalSettingId["MacOptionClickForcesSelection"] = "terminal.integrated.macOptionClickForcesSelection";
    TerminalSettingId["AltClickMovesCursor"] = "terminal.integrated.altClickMovesCursor";
    TerminalSettingId["CopyOnSelection"] = "terminal.integrated.copyOnSelection";
    TerminalSettingId["EnableMultiLinePasteWarning"] = "terminal.integrated.enableMultiLinePasteWarning";
    TerminalSettingId["DrawBoldTextInBrightColors"] = "terminal.integrated.drawBoldTextInBrightColors";
    TerminalSettingId["FontFamily"] = "terminal.integrated.fontFamily";
    TerminalSettingId["FontSize"] = "terminal.integrated.fontSize";
    TerminalSettingId["LetterSpacing"] = "terminal.integrated.letterSpacing";
    TerminalSettingId["LineHeight"] = "terminal.integrated.lineHeight";
    TerminalSettingId["MinimumContrastRatio"] = "terminal.integrated.minimumContrastRatio";
    TerminalSettingId["TabStopWidth"] = "terminal.integrated.tabStopWidth";
    TerminalSettingId["FastScrollSensitivity"] = "terminal.integrated.fastScrollSensitivity";
    TerminalSettingId["MouseWheelScrollSensitivity"] = "terminal.integrated.mouseWheelScrollSensitivity";
    TerminalSettingId["BellDuration"] = "terminal.integrated.bellDuration";
    TerminalSettingId["FontWeight"] = "terminal.integrated.fontWeight";
    TerminalSettingId["FontWeightBold"] = "terminal.integrated.fontWeightBold";
    TerminalSettingId["CursorBlinking"] = "terminal.integrated.cursorBlinking";
    TerminalSettingId["CursorStyle"] = "terminal.integrated.cursorStyle";
    TerminalSettingId["CursorStyleInactive"] = "terminal.integrated.cursorStyleInactive";
    TerminalSettingId["CursorWidth"] = "terminal.integrated.cursorWidth";
    TerminalSettingId["Scrollback"] = "terminal.integrated.scrollback";
    TerminalSettingId["DetectLocale"] = "terminal.integrated.detectLocale";
    TerminalSettingId["DefaultLocation"] = "terminal.integrated.defaultLocation";
    TerminalSettingId["GpuAcceleration"] = "terminal.integrated.gpuAcceleration";
    TerminalSettingId["TerminalTitleSeparator"] = "terminal.integrated.tabs.separator";
    TerminalSettingId["TerminalTitle"] = "terminal.integrated.tabs.title";
    TerminalSettingId["TerminalDescription"] = "terminal.integrated.tabs.description";
    TerminalSettingId["RightClickBehavior"] = "terminal.integrated.rightClickBehavior";
    TerminalSettingId["MiddleClickBehavior"] = "terminal.integrated.middleClickBehavior";
    TerminalSettingId["Cwd"] = "terminal.integrated.cwd";
    TerminalSettingId["ConfirmOnExit"] = "terminal.integrated.confirmOnExit";
    TerminalSettingId["ConfirmOnKill"] = "terminal.integrated.confirmOnKill";
    TerminalSettingId["EnableBell"] = "terminal.integrated.enableBell";
    TerminalSettingId["EnableVisualBell"] = "terminal.integrated.enableVisualBell";
    TerminalSettingId["CommandsToSkipShell"] = "terminal.integrated.commandsToSkipShell";
    TerminalSettingId["AllowChords"] = "terminal.integrated.allowChords";
    TerminalSettingId["AllowMnemonics"] = "terminal.integrated.allowMnemonics";
    TerminalSettingId["TabFocusMode"] = "terminal.integrated.tabFocusMode";
    TerminalSettingId["EnvMacOs"] = "terminal.integrated.env.osx";
    TerminalSettingId["EnvLinux"] = "terminal.integrated.env.linux";
    TerminalSettingId["EnvWindows"] = "terminal.integrated.env.windows";
    TerminalSettingId["EnvironmentChangesIndicator"] = "terminal.integrated.environmentChangesIndicator";
    TerminalSettingId["EnvironmentChangesRelaunch"] = "terminal.integrated.environmentChangesRelaunch";
    TerminalSettingId["ShowExitAlert"] = "terminal.integrated.showExitAlert";
    TerminalSettingId["SplitCwd"] = "terminal.integrated.splitCwd";
    TerminalSettingId["WindowsEnableConpty"] = "terminal.integrated.windowsEnableConpty";
    TerminalSettingId["WindowsUseConptyDll"] = "terminal.integrated.windowsUseConptyDll";
    TerminalSettingId["WordSeparators"] = "terminal.integrated.wordSeparators";
    TerminalSettingId["EnableFileLinks"] = "terminal.integrated.enableFileLinks";
    TerminalSettingId["AllowedLinkSchemes"] = "terminal.integrated.allowedLinkSchemes";
    TerminalSettingId["UnicodeVersion"] = "terminal.integrated.unicodeVersion";
    TerminalSettingId["EnablePersistentSessions"] = "terminal.integrated.enablePersistentSessions";
    TerminalSettingId["PersistentSessionReviveProcess"] = "terminal.integrated.persistentSessionReviveProcess";
    TerminalSettingId["HideOnStartup"] = "terminal.integrated.hideOnStartup";
    TerminalSettingId["HideOnLastClosed"] = "terminal.integrated.hideOnLastClosed";
    TerminalSettingId["CustomGlyphs"] = "terminal.integrated.customGlyphs";
    TerminalSettingId["RescaleOverlappingGlyphs"] = "terminal.integrated.rescaleOverlappingGlyphs";
    TerminalSettingId["PersistentSessionScrollback"] = "terminal.integrated.persistentSessionScrollback";
    TerminalSettingId["InheritEnv"] = "terminal.integrated.inheritEnv";
    TerminalSettingId["ShowLinkHover"] = "terminal.integrated.showLinkHover";
    TerminalSettingId["IgnoreProcessNames"] = "terminal.integrated.ignoreProcessNames";
    TerminalSettingId["ShellIntegrationEnabled"] = "terminal.integrated.shellIntegration.enabled";
    TerminalSettingId["ShellIntegrationShowWelcome"] = "terminal.integrated.shellIntegration.showWelcome";
    TerminalSettingId["ShellIntegrationDecorationsEnabled"] = "terminal.integrated.shellIntegration.decorationsEnabled";
    TerminalSettingId["ShellIntegrationEnvironmentReporting"] = "terminal.integrated.shellIntegration.environmentReporting";
    TerminalSettingId["EnableImages"] = "terminal.integrated.enableImages";
    TerminalSettingId["SmoothScrolling"] = "terminal.integrated.smoothScrolling";
    TerminalSettingId["IgnoreBracketedPasteMode"] = "terminal.integrated.ignoreBracketedPasteMode";
    TerminalSettingId["FocusAfterRun"] = "terminal.integrated.focusAfterRun";
    TerminalSettingId["FontLigaturesEnabled"] = "terminal.integrated.fontLigatures.enabled";
    TerminalSettingId["FontLigaturesFeatureSettings"] = "terminal.integrated.fontLigatures.featureSettings";
    TerminalSettingId["FontLigaturesFallbackLigatures"] = "terminal.integrated.fontLigatures.fallbackLigatures";
    // Debug settings that are hidden from user
    /** Simulated latency applied to all calls made to the pty host */
    TerminalSettingId["DeveloperPtyHostLatency"] = "terminal.integrated.developer.ptyHost.latency";
    /** Simulated startup delay of the pty host process */
    TerminalSettingId["DeveloperPtyHostStartupDelay"] = "terminal.integrated.developer.ptyHost.startupDelay";
    /** Shows the textarea element */
    TerminalSettingId["DevMode"] = "terminal.integrated.developer.devMode";
})(TerminalSettingId || (TerminalSettingId = {}));
export var PosixShellType;
(function (PosixShellType) {
    PosixShellType["Bash"] = "bash";
    PosixShellType["Fish"] = "fish";
    PosixShellType["Sh"] = "sh";
    PosixShellType["Csh"] = "csh";
    PosixShellType["Ksh"] = "ksh";
    PosixShellType["Zsh"] = "zsh";
})(PosixShellType || (PosixShellType = {}));
export var WindowsShellType;
(function (WindowsShellType) {
    WindowsShellType["CommandPrompt"] = "cmd";
    WindowsShellType["Wsl"] = "wsl";
    WindowsShellType["GitBash"] = "gitbash";
})(WindowsShellType || (WindowsShellType = {}));
export var GeneralShellType;
(function (GeneralShellType) {
    GeneralShellType["PowerShell"] = "pwsh";
    GeneralShellType["Python"] = "python";
    GeneralShellType["Julia"] = "julia";
    GeneralShellType["NuShell"] = "nu";
    GeneralShellType["Node"] = "node";
})(GeneralShellType || (GeneralShellType = {}));
export var TitleEventSource;
(function (TitleEventSource) {
    /** From the API or the rename command that overrides any other type */
    TitleEventSource[TitleEventSource["Api"] = 0] = "Api";
    /** From the process name property*/
    TitleEventSource[TitleEventSource["Process"] = 1] = "Process";
    /** From the VT sequence */
    TitleEventSource[TitleEventSource["Sequence"] = 2] = "Sequence";
    /** Config changed */
    TitleEventSource[TitleEventSource["Config"] = 3] = "Config";
})(TitleEventSource || (TitleEventSource = {}));
export var TerminalIpcChannels;
(function (TerminalIpcChannels) {
    /**
     * Communicates between the renderer process and shared process.
     */
    TerminalIpcChannels["LocalPty"] = "localPty";
    /**
     * Communicates between the shared process and the pty host process.
     */
    TerminalIpcChannels["PtyHost"] = "ptyHost";
    /**
     * Communicates between the renderer process and the pty host process.
     */
    TerminalIpcChannels["PtyHostWindow"] = "ptyHostWindow";
    /**
     * Deals with logging from the pty host process.
     */
    TerminalIpcChannels["Logger"] = "logger";
    /**
     * Enables the detection of unresponsive pty hosts.
     */
    TerminalIpcChannels["Heartbeat"] = "heartbeat";
})(TerminalIpcChannels || (TerminalIpcChannels = {}));
export var ProcessPropertyType;
(function (ProcessPropertyType) {
    ProcessPropertyType["Cwd"] = "cwd";
    ProcessPropertyType["InitialCwd"] = "initialCwd";
    ProcessPropertyType["FixedDimensions"] = "fixedDimensions";
    ProcessPropertyType["Title"] = "title";
    ProcessPropertyType["ShellType"] = "shellType";
    ProcessPropertyType["HasChildProcesses"] = "hasChildProcesses";
    ProcessPropertyType["ResolvedShellLaunchConfig"] = "resolvedShellLaunchConfig";
    ProcessPropertyType["OverrideDimensions"] = "overrideDimensions";
    ProcessPropertyType["FailedShellIntegrationActivation"] = "failedShellIntegrationActivation";
    ProcessPropertyType["UsedShellIntegrationInjection"] = "usedShellIntegrationInjection";
})(ProcessPropertyType || (ProcessPropertyType = {}));
export const IPtyService = createDecorator('ptyService');
export var HeartbeatConstants;
(function (HeartbeatConstants) {
    /**
     * The duration between heartbeats
     */
    HeartbeatConstants[HeartbeatConstants["BeatInterval"] = 5000] = "BeatInterval";
    /**
     * The duration of the first heartbeat while the pty host is starting up. This is much larger
     * than the regular BeatInterval to accommodate slow machines, we still want to warn about the
     * pty host's unresponsiveness eventually though.
     */
    HeartbeatConstants[HeartbeatConstants["ConnectingBeatInterval"] = 20000] = "ConnectingBeatInterval";
    /**
     * Defines a multiplier for BeatInterval for how long to wait before starting the second wait
     * timer.
     */
    HeartbeatConstants[HeartbeatConstants["FirstWaitMultiplier"] = 1.2] = "FirstWaitMultiplier";
    /**
     * Defines a multiplier for BeatInterval for how long to wait before telling the user about
     * non-responsiveness. The second timer is to avoid informing the user incorrectly when waking
     * the computer up from sleep
     */
    HeartbeatConstants[HeartbeatConstants["SecondWaitMultiplier"] = 1] = "SecondWaitMultiplier";
    /**
     * How long to wait before telling the user about non-responsiveness when they try to create a
     * process. This short circuits the standard wait timeouts to tell the user sooner and only
     * create process is handled to avoid additional perf overhead.
     */
    HeartbeatConstants[HeartbeatConstants["CreateProcessTimeout"] = 5000] = "CreateProcessTimeout";
})(HeartbeatConstants || (HeartbeatConstants = {}));
export var TerminalLocation;
(function (TerminalLocation) {
    TerminalLocation[TerminalLocation["Panel"] = 1] = "Panel";
    TerminalLocation[TerminalLocation["Editor"] = 2] = "Editor";
})(TerminalLocation || (TerminalLocation = {}));
export var TerminalLocationString;
(function (TerminalLocationString) {
    TerminalLocationString["TerminalView"] = "view";
    TerminalLocationString["Editor"] = "editor";
})(TerminalLocationString || (TerminalLocationString = {}));
export var LocalReconnectConstants;
(function (LocalReconnectConstants) {
    /**
     * If there is no reconnection within this time-frame, consider the connection permanently closed...
    */
    LocalReconnectConstants[LocalReconnectConstants["GraceTime"] = 60000] = "GraceTime";
    /**
     * Maximal grace time between the first and the last reconnection...
    */
    LocalReconnectConstants[LocalReconnectConstants["ShortGraceTime"] = 6000] = "ShortGraceTime";
})(LocalReconnectConstants || (LocalReconnectConstants = {}));
export var FlowControlConstants;
(function (FlowControlConstants) {
    /**
     * The number of _unacknowledged_ chars to have been sent before the pty is paused in order for
     * the client to catch up.
     */
    FlowControlConstants[FlowControlConstants["HighWatermarkChars"] = 100000] = "HighWatermarkChars";
    /**
     * After flow control pauses the pty for the client the catch up, this is the number of
     * _unacknowledged_ chars to have been caught up to on the client before resuming the pty again.
     * This is used to attempt to prevent pauses in the flowing data; ideally while the pty is
     * paused the number of unacknowledged chars would always be greater than 0 or the client will
     * appear to stutter. In reality this balance is hard to accomplish though so heavy commands
     * will likely pause as latency grows, not flooding the connection is the important thing as
     * it's shared with other core functionality.
     */
    FlowControlConstants[FlowControlConstants["LowWatermarkChars"] = 5000] = "LowWatermarkChars";
    /**
     * The number characters that are accumulated on the client side before sending an ack event.
     * This must be less than or equal to LowWatermarkChars or the terminal max never unpause.
     */
    FlowControlConstants[FlowControlConstants["CharCountAckSize"] = 5000] = "CharCountAckSize";
})(FlowControlConstants || (FlowControlConstants = {}));
export var ProfileSource;
(function (ProfileSource) {
    ProfileSource["GitBash"] = "Git Bash";
    ProfileSource["Pwsh"] = "PowerShell";
})(ProfileSource || (ProfileSource = {}));
export var ShellIntegrationStatus;
(function (ShellIntegrationStatus) {
    /** No shell integration sequences have been encountered. */
    ShellIntegrationStatus[ShellIntegrationStatus["Off"] = 0] = "Off";
    /** Final term shell integration sequences have been encountered. */
    ShellIntegrationStatus[ShellIntegrationStatus["FinalTerm"] = 1] = "FinalTerm";
    /** VS Code shell integration sequences have been encountered. Supercedes FinalTerm. */
    ShellIntegrationStatus[ShellIntegrationStatus["VSCode"] = 2] = "VSCode";
})(ShellIntegrationStatus || (ShellIntegrationStatus = {}));
export var TerminalExitReason;
(function (TerminalExitReason) {
    TerminalExitReason[TerminalExitReason["Unknown"] = 0] = "Unknown";
    TerminalExitReason[TerminalExitReason["Shutdown"] = 1] = "Shutdown";
    TerminalExitReason[TerminalExitReason["Process"] = 2] = "Process";
    TerminalExitReason[TerminalExitReason["User"] = 3] = "User";
    TerminalExitReason[TerminalExitReason["Extension"] = 4] = "Extension";
})(TerminalExitReason || (TerminalExitReason = {}));
export const TerminalExtensions = {
    Backend: 'workbench.contributions.terminal.processBackend'
};
class TerminalBackendRegistry {
    constructor() {
        this._backends = new Map();
    }
    get backends() { return this._backends; }
    registerTerminalBackend(backend) {
        const key = this._sanitizeRemoteAuthority(backend.remoteAuthority);
        if (this._backends.has(key)) {
            throw new Error(`A terminal backend with remote authority '${key}' was already registered.`);
        }
        this._backends.set(key, backend);
    }
    getTerminalBackend(remoteAuthority) {
        return this._backends.get(this._sanitizeRemoteAuthority(remoteAuthority));
    }
    _sanitizeRemoteAuthority(remoteAuthority) {
        // Normalize the key to lowercase as the authority is case-insensitive
        return remoteAuthority?.toLowerCase() ?? '';
    }
}
Registry.add(TerminalExtensions.Backend, new TerminalBackendRegistry());
export const ILocalPtyService = createDecorator('localPtyService');
export const ITerminalLogService = createDecorator('terminalLogService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFLOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQU03RCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFFOUcsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0QyxxRkFBNEQsQ0FBQTtJQUM1RCwrRUFBc0QsQ0FBQTtJQUN0RCxtRUFBMEMsQ0FBQTtBQUMzQyxDQUFDLEVBSmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFJdEM7QUFFRCxNQUFNLENBQU4sSUFBa0IsaUJBdUdqQjtBQXZHRCxXQUFrQixpQkFBaUI7SUFDbEMsMEZBQXFFLENBQUE7SUFDckUsMkZBQXNFLENBQUE7SUFDdEUseUZBQW9FLENBQUE7SUFDcEUsK0ZBQTBFLENBQUE7SUFDMUUsNkVBQXdELENBQUE7SUFDeEQsdUVBQWtELENBQUE7SUFDbEQseUVBQW9ELENBQUE7SUFDcEQscUZBQWdFLENBQUE7SUFDaEUsbUZBQThELENBQUE7SUFDOUQseUZBQW9FLENBQUE7SUFDcEUsMEVBQXFELENBQUE7SUFDckQsK0VBQTBELENBQUE7SUFDMUQsNkVBQXdELENBQUE7SUFDeEQscUVBQWdELENBQUE7SUFDaEQscUZBQWdFLENBQUE7SUFDaEUsaUZBQTRELENBQUE7SUFDNUQsMkZBQXNFLENBQUE7SUFDdEUsNkVBQXdELENBQUE7SUFDeEQsdUVBQWtELENBQUE7SUFDbEQseUVBQW9ELENBQUE7SUFDcEQsNEVBQXVELENBQUE7SUFDdkQsd0dBQW1GLENBQUE7SUFDbkYsb0ZBQStELENBQUE7SUFDL0QsNEVBQXVELENBQUE7SUFDdkQsb0dBQStFLENBQUE7SUFDL0Usa0dBQTZFLENBQUE7SUFDN0Usa0VBQTZDLENBQUE7SUFDN0MsOERBQXlDLENBQUE7SUFDekMsd0VBQW1ELENBQUE7SUFDbkQsa0VBQTZDLENBQUE7SUFDN0Msc0ZBQWlFLENBQUE7SUFDakUsc0VBQWlELENBQUE7SUFDakQsd0ZBQW1FLENBQUE7SUFDbkUsb0dBQStFLENBQUE7SUFDL0Usc0VBQWlELENBQUE7SUFDakQsa0VBQTZDLENBQUE7SUFDN0MsMEVBQXFELENBQUE7SUFDckQsMEVBQXFELENBQUE7SUFDckQsb0VBQStDLENBQUE7SUFDL0Msb0ZBQStELENBQUE7SUFDL0Qsb0VBQStDLENBQUE7SUFDL0Msa0VBQTZDLENBQUE7SUFDN0Msc0VBQWlELENBQUE7SUFDakQsNEVBQXVELENBQUE7SUFDdkQsNEVBQXVELENBQUE7SUFDdkQsa0ZBQTZELENBQUE7SUFDN0QscUVBQWdELENBQUE7SUFDaEQsaUZBQTRELENBQUE7SUFDNUQsa0ZBQTZELENBQUE7SUFDN0Qsb0ZBQStELENBQUE7SUFDL0Qsb0RBQStCLENBQUE7SUFDL0Isd0VBQW1ELENBQUE7SUFDbkQsd0VBQW1ELENBQUE7SUFDbkQsa0VBQTZDLENBQUE7SUFDN0MsOEVBQXlELENBQUE7SUFDekQsb0ZBQStELENBQUE7SUFDL0Qsb0VBQStDLENBQUE7SUFDL0MsMEVBQXFELENBQUE7SUFDckQsc0VBQWlELENBQUE7SUFDakQsNkRBQXdDLENBQUE7SUFDeEMsK0RBQTBDLENBQUE7SUFDMUMsbUVBQThDLENBQUE7SUFDOUMsb0dBQStFLENBQUE7SUFDL0Usa0dBQTZFLENBQUE7SUFDN0Usd0VBQW1ELENBQUE7SUFDbkQsOERBQXlDLENB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