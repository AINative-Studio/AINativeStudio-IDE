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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUs5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBTTdELE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLElBQUksYUFBYSxDQUFVLHNCQUFzQixFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUU5RyxNQUFNLENBQU4sSUFBa0IscUJBSWpCO0FBSkQsV0FBa0IscUJBQXFCO0lBQ3RDLHFGQUE0RCxDQUFBO0lBQzVELCtFQUFzRCxDQUFBO0lBQ3RELG1FQUEwQyxDQUFBO0FBQzNDLENBQUMsRUFKaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUl0QztBQUVELE1BQU0sQ0FBTixJQUFrQixpQkF1R2pCO0FBdkdELFdBQWtCLGlCQUFpQjtJQUNsQywwRkFBcUUsQ0FBQTtJQUNyRSwyRkFBc0UsQ0FBQTtJQUN0RSx5RkFBb0UsQ0FBQTtJQUNwRSwrRkFBMEUsQ0FBQTtJQUMxRSw2RUFBd0QsQ0FBQTtJQUN4RCx1RUFBa0QsQ0FBQTtJQUNsRCx5RUFBb0QsQ0FBQTtJQUNwRCxxRkFBZ0UsQ0FBQTtJQUNoRSxtRkFBOEQsQ0FBQTtJQUM5RCx5RkFBb0UsQ0FBQTtJQUNwRSwwRUFBcUQsQ0FBQTtJQUNyRCwrRUFBMEQsQ0FBQTtJQUMxRCw2RUFBd0QsQ0FBQTtJQUN4RCxxRUFBZ0QsQ0FBQTtJQUNoRCxxRkFBZ0UsQ0FBQTtJQUNoRSxpRkFBNEQsQ0FBQTtJ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