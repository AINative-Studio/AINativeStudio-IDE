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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vdGVybWluYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBSzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFNN0QsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsSUFBSSxhQUFhLENBQVUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBRTlHLE1BQU0sQ0FBTixJQUFrQixxQkFJakI7QUFKRCxXQUFrQixxQkFBcUI7SUFDdEMscUZBQTRELENBQUE7SUFDNUQsK0VBQXNELENBQUE7SUFDdEQsbUVBQTBDLENBQUE7QUFDM0MsQ0FBQyxFQUppQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXRDO0FBRUQsTUFBTSxDQUFOLElBQWtCLGlCQXVHakI7QUF2R0QsV0FBa0IsaUJBQWlCO0lBQ2xDLDBGQUFxRSxDQUFBO0lBQ3JFLDJGQUFzRSxDQUFBO0lBQ3RFLHlGQUFvRSxDQUFBO0lBQ3BFLCtGQUEwRSxDQUFBO0lBQzFFLDZFQUF3RCxDQUFBO0lBQ3hELHVFQUFrRCxDQUFBO0lBQ2xELHlFQUFvRCxDQUFBO0lBQ3BELHFGQUFnRSxDQUFBO0lBQ2hFLG1GQUE4RCxDQUFBO0lBQzlELHlGQUFvRSxDQUFBO0lBQ3BFLDBFQUFxRCxDQUFBO0lBQ3JELCtFQUEwRCxDQUFBO0lBQzFELDZFQUF3RCxDQUFBO0lBQ3hELHFFQUFnRCxDQUFBO0lBQ2hELHFGQUFnRSxDQUFBO0lBQ2hFLGlGQUE0RCxDQUFBO0lBQzVELDJGQUFzRSxDQUFBO0lBQ3RFLDZFQUF3RCxDQUFBO0lBQ3hELHVFQUFrRCxDQUFBO0lBQ2xELHlFQUFvRCxDQUFBO0lBQ3BELDRFQUF1RCxDQUFBO0lBQ3ZELHdHQUFtRixDQUFBO0lBQ25GLG9GQUErRCxDQUFBO0lBQy9ELDRFQUF1RCxDQUFBO0lBQ3ZELG9HQUErRSxDQUFBO0lBQy9FLGtHQUE2RSxDQUFBO0lBQzdFLGtFQUE2QyxDQUFBO0lBQzdDLDhEQUF5QyxDQUFBO0lBQ3pDLHdFQUFtRCxDQUFBO0lBQ25ELGtFQUE2QyxDQUFBO0lBQzdDLHNGQUFpRSxDQUFBO0lBQ2pFLHNFQUFpRCxDQUFBO0lBQ2pELHdGQUFtRSxDQUFBO0lBQ25FLG9HQUErRSxDQUFBO0lBQy9FLHNFQUFpRCxDQUFBO0lBQ2pELGtFQUE2QyxDQUFBO0lBQzdDLDBFQUFxRCxDQUFBO0lBQ3JELDBFQUFxRCxDQUFBO0lBQ3JELG9FQUErQyxDQUFBO0lBQy9DLG9GQUErRCxDQUFBO0lBQy9ELG9FQUErQyxDQUFBO0lBQy9DLGtFQUE2QyxDQUFBO0lBQzdDLHNFQUFpRCxDQUFBO0lBQ2pELDRFQUF1RCxDQUFBO0lBQ3ZELDRFQUF1RCxDQUFBO0lBQ3ZELGtGQUE2RCxDQUFBO0lBQzdELHFFQUFnRCxDQUFBO0lBQ2hELGlGQUE0RCxDQUFBO0lBQzVELGtGQUE2RCxDQUFBO0lBQzdELG9GQUErRCxDQUFBO0lBQy9ELG9EQUErQixDQUFBO0lBQy9CLHdFQUFtRCxDQUFBO0lBQ25ELHdFQUFtRCxDQUFBO0lBQ25ELGtFQUE2QyxDQUFBO0lBQzdDLDhFQUF5RCxDQUFBO0lBQ3pELG9GQUErRCxDQUFBO0lBQy9ELG9FQUErQyxDQUFBO0lBQy9DLDBFQUFxRCxDQUFBO0lBQ3JELHNFQUFpRCxDQUFBO0lBQ2pELDZEQUF3QyxDQUFBO0lBQ3hDLCtEQUEwQyxDQUFBO0lBQzFDLG1FQUE4QyxDQUFBO0lBQzlDLG9HQUErRSxDQUFBO0lBQy9FLGtHQUE2RSxDQUFBO0lBQzdFLHdFQUFtRCxDQUFBO0lBQ25ELDhEQUF5QyxDQUFBO0lB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