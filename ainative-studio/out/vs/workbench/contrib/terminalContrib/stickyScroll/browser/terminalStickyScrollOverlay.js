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
import { $, addDisposableListener, addStandardDisposableListener, getWindow } from '../../../../../base/browser/dom.js';
import { throttle } from '../../../../../base/common/decorators.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable, combinedDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../../base/common/strings.js';
import './media/stickyScroll.css';
import { localize } from '../../../../../nls.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ITerminalConfigurationService } from '../../../terminal/browser/terminal.js';
import { openContextMenu } from '../../../terminal/browser/terminalContextMenu.js';
import { TERMINAL_CONFIG_SECTION } from '../../../terminal/common/terminal.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { terminalStickyScrollBackground, terminalStickyScrollHoverBackground } from './terminalStickyScrollColorRegistry.js';
import { XtermAddonImporter } from '../../../terminal/browser/xterm/xtermAddonImporter.js';
var OverlayState;
(function (OverlayState) {
    /** Initial state/disabled by the alt buffer. */
    OverlayState[OverlayState["Off"] = 0] = "Off";
    OverlayState[OverlayState["On"] = 1] = "On";
})(OverlayState || (OverlayState = {}));
var CssClasses;
(function (CssClasses) {
    CssClasses["Visible"] = "visible";
})(CssClasses || (CssClasses = {}));
var Constants;
(function (Constants) {
    Constants[Constants["StickyScrollPercentageCap"] = 0.4] = "StickyScrollPercentageCap";
})(Constants || (Constants = {}));
let TerminalStickyScrollOverlay = class TerminalStickyScrollOverlay extends Disposable {
    constructor(_instance, _xterm, _xtermColorProvider, _commandDetection, xtermCtor, configurationService, contextKeyService, _contextMenuService, _keybindingService, menuService, _terminalConfigurationService, _themeService) {
        super();
        this._instance = _instance;
        this._xterm = _xterm;
        this._xtermColorProvider = _xtermColorProvider;
        this._commandDetection = _commandDetection;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._themeService = _themeService;
        this._xtermAddonLoader = new XtermAddonImporter();
        this._refreshListeners = this._register(new MutableDisposable());
        this._state = 0 /* OverlayState.Off */;
        this._isRefreshQueued = false;
        this._rawMaxLineCount = 5;
        this._contextMenu = this._register(menuService.createMenu(MenuId.TerminalStickyScrollContext, contextKeyService));
        // Only show sticky scroll in the normal buffer
        this._register(Event.runAndSubscribe(this._xterm.raw.buffer.onBufferChange, buffer => {
            this._setState((buffer ?? this._xterm.raw.buffer.active).type === 'normal' ? 1 /* OverlayState.On */ : 0 /* OverlayState.Off */);
        }));
        // React to configuration changes
        this._register(Event.runAndSubscribe(configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration("terminal.integrated.stickyScroll.maxLineCount" /* TerminalStickyScrollSettingId.MaxLineCount */)) {
                this._rawMaxLineCount = configurationService.getValue("terminal.integrated.stickyScroll.maxLineCount" /* TerminalStickyScrollSettingId.MaxLineCount */);
            }
        }));
        // React to terminal location changes
        this._register(this._instance.onDidChangeTarget(() => this._syncOptions()));
        // Eagerly create the overlay
        xtermCtor.then(ctor => {
            if (this._store.isDisposed) {
                return;
            }
            this._stickyScrollOverlay = this._register(new ctor({
                rows: 1,
                cols: this._xterm.raw.cols,
                allowProposedApi: true,
                ...this._getOptions()
            }));
            this._refreshGpuAcceleration();
            this._register(configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(TERMINAL_CONFIG_SECTION)) {
                    this._syncOptions();
                }
            }));
            this._register(this._themeService.onDidColorThemeChange(() => {
                this._syncOptions();
            }));
            this._register(this._xterm.raw.onResize(() => {
                this._syncOptions();
                this._refresh();
            }));
            this._register(this._instance.onDidChangeVisibility(isVisible => {
                if (isVisible) {
                    this._refresh();
                }
            }));
            this._xtermAddonLoader.importAddon('serialize').then(SerializeAddon => {
                if (this._store.isDisposed) {
                    return;
                }
                this._serializeAddon = this._register(new SerializeAddon());
                this._xterm.raw.loadAddon(this._serializeAddon);
                // Trigger a render as the serialize addon is required to render
                this._refresh();
            });
        });
    }
    lockHide() {
        this._element?.classList.add('lock-hide');
    }
    unlockHide() {
        this._element?.classList.remove('lock-hide');
    }
    _setState(state) {
        if (this._state === state) {
            return;
        }
        switch (state) {
            case 0 /* OverlayState.Off */: {
                this._setVisible(false);
                this._uninstallRefreshListeners();
                break;
            }
            case 1 /* OverlayState.On */: {
                this._refresh();
                this._installRefreshListeners();
                break;
            }
        }
    }
    _installRefreshListeners() {
        if (!this._refreshListeners.value) {
            this._refreshListeners.value = combinedDisposable(Event.any(this._xterm.raw.onScroll, this._xterm.raw.onLineFeed, 
            // Rarely an update may be required after just a cursor move, like when
            // scrolling horizontally in a pager
            this._xterm.raw.onCursorMove)(() => this._refresh()), addStandardDisposableListener(this._xterm.raw.element.querySelector('.xterm-viewport'), 'scroll', () => this._refresh()));
        }
    }
    _uninstallRefreshListeners() {
        this._refreshListeners.clear();
    }
    _setVisible(isVisible) {
        if (isVisible) {
            this._ensureElement();
        }
        this._element?.classList.toggle("visible" /* CssClasses.Visible */, isVisible);
    }
    _refresh() {
        if (this._isRefreshQueued) {
            return;
        }
        this._isRefreshQueued = true;
        queueMicrotask(() => {
            this._refreshNow();
            this._isRefreshQueued = false;
        });
    }
    _refreshNow() {
        const command = this._commandDetection.getCommandForLine(this._xterm.raw.buffer.active.viewportY);
        // The command from viewportY + 1 is used because this one will not be obscured by sticky
        // scroll.
        this._currentStickyCommand = undefined;
        // No command
        if (!command) {
            this._setVisible(false);
            return;
        }
        // Partial command
        if (!('marker' in command)) {
            const partialCommand = this._commandDetection.currentCommand;
            if (partialCommand?.commandStartMarker && partialCommand.commandExecutedMarker) {
                this._updateContent(partialCommand, partialCommand.commandStartMarker);
                return;
            }
            this._setVisible(false);
            return;
        }
        // If the marker doesn't exist or it was trimmed from scrollback
        const marker = command.marker;
        if (!marker || marker.line === -1) {
            // TODO: It would be nice if we kept the cached command around even if it was trimmed
            // from scrollback
            this._setVisible(false);
            return;
        }
        this._updateContent(command, marker);
    }
    _updateContent(command, startMarker) {
        const xterm = this._xterm.raw;
        if (!xterm.element?.parentElement || !this._stickyScrollOverlay || !this._serializeAddon) {
            return;
        }
        // Hide sticky scroll if the prompt has been trimmed from the buffer
        if (command.promptStartMarker?.line === -1) {
            this._setVisible(false);
            return;
        }
        // Determine sticky scroll line count
        const buffer = xterm.buffer.active;
        const promptRowCount = command.getPromptRowCount();
        const commandRowCount = command.getCommandRowCount();
        const stickyScrollLineStart = startMarker.line - (promptRowCount - 1);
        // Calculate the row offset, this is the number of rows that will be clipped from the top
        // of the sticky overlay because we do not want to show any content above the bounds of the
        // original terminal. This is done because it seems like scrolling flickers more when a
        // partial line can be drawn on the top.
        const isPartialCommand = !('getOutput' in command);
        const rowOffset = !isPartialCommand && command.endMarker ? Math.max(buffer.viewportY - command.endMarker.line + 1, 0) : 0;
        const maxLineCount = Math.min(this._rawMaxLineCount, Math.floor(xterm.rows * 0.4 /* Constants.StickyScrollPercentageCap */));
        const stickyScrollLineCount = Math.min(promptRowCount + commandRowCount - 1, maxLineCount) - rowOffset;
        const isTruncated = stickyScrollLineCount < promptRowCount + commandRowCount - 1;
        // Hide sticky scroll if it's currently on a line that contains it
        if (buffer.viewportY <= stickyScrollLineStart) {
            this._setVisible(false);
            return;
        }
        // Hide sticky scroll for the partial command if it looks like there is a pager like `less`
        // or `git log` active. This is done by checking if the bottom left cell contains the :
        // character and the cursor is immediately to its right. This improves the behavior of a
        // common case where the top of the text being viewport would otherwise be obscured.
        if (isPartialCommand && buffer.viewportY === buffer.baseY && buffer.cursorY === xterm.rows - 1) {
            const line = buffer.getLine(buffer.baseY + xterm.rows - 1);
            if ((buffer.cursorX === 1 && lineStartsWith(line, ':')) ||
                (buffer.cursorX === 5 && lineStartsWith(line, '(END)'))) {
                this._setVisible(false);
                return;
            }
        }
        // Get the line content of the command from the terminal
        const content = this._serializeAddon.serialize({
            range: {
                start: stickyScrollLineStart + rowOffset,
                end: stickyScrollLineStart + rowOffset + Math.max(stickyScrollLineCount - 1, 0)
            }
        }) + (isTruncated ? '\x1b[0m …' : '');
        // If a partial command's sticky scroll would show nothing, just hide it. This is another
        // edge case when using a pager or interactive editor.
        if (isPartialCommand && removeAnsiEscapeCodes(content).length === 0) {
            this._setVisible(false);
            return;
        }
        // Write content if it differs
        if (content && this._currentContent !== content ||
            this._stickyScrollOverlay.cols !== xterm.cols ||
            this._stickyScrollOverlay.rows !== stickyScrollLineCount) {
            this._stickyScrollOverlay.resize(this._stickyScrollOverlay.cols, stickyScrollLineCount);
            // Clear attrs, reset cursor position, clear right
            this._stickyScrollOverlay.write('\x1b[0m\x1b[H\x1b[2J');
            this._stickyScrollOverlay.write(content);
            this._currentContent = content;
            // DEBUG: Log to show the command line we know
            // this._stickyScrollOverlay.write(` [${command?.command}]`);
        }
        if (content) {
            this._currentStickyCommand = command;
            this._setVisible(true);
            // Position the sticky scroll such that it never overlaps the prompt/output of the
            // following command. This must happen after setVisible to ensure the element is
            // initialized.
            if (this._element) {
                const termBox = xterm.element.getBoundingClientRect();
                // Only try reposition if the element is visible, if not a refresh will occur when
                // it becomes visible
                if (termBox.height > 0) {
                    const rowHeight = termBox.height / xterm.rows;
                    const overlayHeight = stickyScrollLineCount * rowHeight;
                    // Adjust sticky scroll content if it would below the end of the command, obscuring the
                    // following command.
                    let endMarkerOffset = 0;
                    if (!isPartialCommand && command.endMarker && command.endMarker.line !== -1) {
                        if (buffer.viewportY + stickyScrollLineCount > command.endMarker.line) {
                            const diff = buffer.viewportY + stickyScrollLineCount - command.endMarker.line;
                            endMarkerOffset = diff * rowHeight;
                        }
                    }
                    this._element.style.bottom = `${termBox.height - overlayHeight + 1 + endMarkerOffset}px`;
                }
            }
        }
        else {
            this._setVisible(false);
        }
    }
    _ensureElement() {
        if (
        // The element is already created
        this._element ||
            // If the overlay is yet to be created, the terminal cannot be opened so defer to next call
            !this._stickyScrollOverlay ||
            // The xterm.js instance isn't opened yet
            !this._xterm?.raw.element?.parentElement) {
            return;
        }
        const overlay = this._stickyScrollOverlay;
        const hoverOverlay = $('.hover-overlay');
        this._element = $('.terminal-sticky-scroll', undefined, hoverOverlay);
        this._xterm.raw.element.parentElement.append(this._element);
        this._register(toDisposable(() => this._element?.remove()));
        // Fill tooltip
        let hoverTitle = localize('stickyScrollHoverTitle', 'Navigate to Command');
        const scrollToPreviousCommandKeybinding = this._keybindingService.lookupKeybinding("workbench.action.terminal.scrollToPreviousCommand" /* TerminalCommandId.ScrollToPreviousCommand */);
        if (scrollToPreviousCommandKeybinding) {
            const label = scrollToPreviousCommandKeybinding.getLabel();
            if (label) {
                hoverTitle += '\n' + localize('labelWithKeybinding', "{0} ({1})", terminalStrings.scrollToPreviousCommand.value, label);
            }
        }
        const scrollToNextCommandKeybinding = this._keybindingService.lookupKeybinding("workbench.action.terminal.scrollToNextCommand" /* TerminalCommandId.ScrollToNextCommand */);
        if (scrollToNextCommandKeybinding) {
            const label = scrollToNextCommandKeybinding.getLabel();
            if (label) {
                hoverTitle += '\n' + localize('labelWithKeybinding', "{0} ({1})", terminalStrings.scrollToNextCommand.value, label);
            }
        }
        hoverOverlay.title = hoverTitle;
        const scrollBarWidth = this._xterm.raw._core.viewport?.scrollBarWidth;
        if (scrollBarWidth !== undefined) {
            this._element.style.right = `${scrollBarWidth}px`;
        }
        this._stickyScrollOverlay.open(this._element);
        this._xtermAddonLoader.importAddon('ligatures').then(LigaturesAddon => {
            if (this._store.isDisposed || !this._stickyScrollOverlay) {
                return;
            }
            this._ligaturesAddon = new LigaturesAddon();
            this._stickyScrollOverlay.loadAddon(this._ligaturesAddon);
        });
        // Scroll to the command on click
        this._register(addStandardDisposableListener(hoverOverlay, 'click', () => {
            if (this._xterm && this._currentStickyCommand) {
                this._xterm.markTracker.revealCommand(this._currentStickyCommand);
                this._instance.focus();
            }
        }));
        // Forward mouse events to the terminal
        this._register(addStandardDisposableListener(hoverOverlay, 'wheel', e => this._xterm?.raw.element?.dispatchEvent(new WheelEvent(e.type, e))));
        // Context menu - stop propagation on mousedown because rightClickBehavior listens on
        // mousedown, not contextmenu
        this._register(addDisposableListener(hoverOverlay, 'mousedown', e => {
            e.stopImmediatePropagation();
            e.preventDefault();
        }));
        this._register(addDisposableListener(hoverOverlay, 'contextmenu', e => {
            e.stopImmediatePropagation();
            e.preventDefault();
            openContextMenu(getWindow(hoverOverlay), e, this._instance, this._contextMenu, this._contextMenuService);
        }));
        // Instead of juggling decorations for hover styles, swap out the theme to indicate the
        // hover state. This comes with the benefit over other methods of working well with special
        // decorative characters like powerline symbols.
        this._register(addStandardDisposableListener(hoverOverlay, 'mouseover', () => overlay.options.theme = this._getTheme(true)));
        this._register(addStandardDisposableListener(hoverOverlay, 'mouseleave', () => overlay.options.theme = this._getTheme(false)));
    }
    _syncOptions() {
        if (!this._stickyScrollOverlay) {
            return;
        }
        this._stickyScrollOverlay.resize(this._xterm.raw.cols, this._stickyScrollOverlay.rows);
        this._stickyScrollOverlay.options = this._getOptions();
        this._refreshGpuAcceleration();
    }
    _getOptions() {
        const o = this._xterm.raw.options;
        return {
            cursorInactiveStyle: 'none',
            scrollback: 0,
            logLevel: 'off',
            theme: this._getTheme(false),
            documentOverride: o.documentOverride,
            fontFamily: o.fontFamily,
            fontWeight: o.fontWeight,
            fontWeightBold: o.fontWeightBold,
            fontSize: o.fontSize,
            letterSpacing: o.letterSpacing,
            lineHeight: o.lineHeight,
            drawBoldTextInBrightColors: o.drawBoldTextInBrightColors,
            minimumContrastRatio: o.minimumContrastRatio,
            tabStopWidth: o.tabStopWidth,
            customGlyphs: o.customGlyphs,
        };
    }
    async _refreshGpuAcceleration() {
        if (this._shouldLoadWebgl() && !this._webglAddon) {
            const WebglAddon = await this._xtermAddonLoader.importAddon('webgl');
            if (this._store.isDisposed) {
                return;
            }
            this._webglAddon = this._register(new WebglAddon());
            this._stickyScrollOverlay?.loadAddon(this._webglAddon);
        }
        else if (!this._shouldLoadWebgl() && this._webglAddon) {
            this._webglAddon.dispose();
            this._webglAddon = undefined;
        }
    }
    _shouldLoadWebgl() {
        return this._terminalConfigurationService.config.gpuAcceleration === 'auto' || this._terminalConfigurationService.config.gpuAcceleration === 'on';
    }
    _getTheme(isHovering) {
        const theme = this._themeService.getColorTheme();
        return {
            ...this._xterm.getXtermTheme(),
            background: isHovering
                ? theme.getColor(terminalStickyScrollHoverBackground)?.toString() ?? this._xtermColorProvider.getBackgroundColor(theme)?.toString()
                : theme.getColor(terminalStickyScrollBackground)?.toString() ?? this._xtermColorProvider.getBackgroundColor(theme)?.toString(),
            selectionBackground: undefined,
            selectionInactiveBackground: undefined
        };
    }
};
__decorate([
    throttle(0)
], TerminalStickyScrollOverlay.prototype, "_syncOptions", null);
__decorate([
    throttle(0)
], TerminalStickyScrollOverlay.prototype, "_refreshGpuAcceleration", null);
TerminalStickyScrollOverlay = __decorate([
    __param(5, IConfigurationService),
    __param(6, IContextKeyService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, IMenuService),
    __param(10, ITerminalConfigurationService),
    __param(11, IThemeService)
], TerminalStickyScrollOverlay);
export { TerminalStickyScrollOverlay };
function lineStartsWith(line, text) {
    if (!line) {
        return false;
    }
    for (let i = 0; i < text.length; i++) {
        if (line.getCell(i)?.getChars() !== text[i]) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdGlja3lTY3JvbGxPdmVybGF5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdGlja3lTY3JvbGwvYnJvd3Nlci90ZXJtaW5hbFN0aWNreVNjcm9sbE92ZXJsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFNaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSw2QkFBNkIsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUUsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUc3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RB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