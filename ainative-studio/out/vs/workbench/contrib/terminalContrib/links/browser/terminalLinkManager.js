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
import { EventType } from '../../../../../base/browser/dom.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore, dispose, toDisposable } from '../../../../../base/common/lifecycle.js';
import { isMacintosh, OS } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import * as nls from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITunnelService } from '../../../../../platform/tunnel/common/tunnel.js';
import { TerminalExternalLinkDetector } from './terminalExternalLinkDetector.js';
import { TerminalLinkDetectorAdapter } from './terminalLinkDetectorAdapter.js';
import { TerminalLocalFileLinkOpener, TerminalLocalFolderInWorkspaceLinkOpener, TerminalLocalFolderOutsideWorkspaceLinkOpener, TerminalSearchLinkOpener, TerminalUrlLinkOpener } from './terminalLinkOpeners.js';
import { TerminalLocalLinkDetector } from './terminalLocalLinkDetector.js';
import { TerminalUriLinkDetector } from './terminalUriLinkDetector.js';
import { TerminalWordLinkDetector } from './terminalWordLinkDetector.js';
import { ITerminalConfigurationService, TerminalLinkQuickPickEvent } from '../../../terminal/browser/terminal.js';
import { TerminalHover } from '../../../terminal/browser/widgets/terminalHoverWidget.js';
import { TERMINAL_CONFIG_SECTION } from '../../../terminal/common/terminal.js';
import { convertBufferRangeToViewport } from './terminalLinkHelpers.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { TerminalMultiLineLinkDetector } from './terminalMultiLineLinkDetector.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
/**
 * An object responsible for managing registration of link matchers and link providers.
 */
let TerminalLinkManager = class TerminalLinkManager extends DisposableStore {
    constructor(_xterm, _processInfo, capabilities, _linkResolver, _configurationService, _instantiationService, notificationService, terminalConfigurationService, _logService, _tunnelService) {
        super();
        this._xterm = _xterm;
        this._processInfo = _processInfo;
        this._linkResolver = _linkResolver;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._tunnelService = _tunnelService;
        this._standardLinkProviders = new Map();
        this._linkProvidersDisposables = [];
        this._externalLinkProviders = [];
        this._openers = new Map();
        let enableFileLinks = true;
        const enableFileLinksConfig = this._configurationService.getValue(TERMINAL_CONFIG_SECTION).enableFileLinks;
        switch (enableFileLinksConfig) {
            case 'off':
            case false: // legacy from v1.75
                enableFileLinks = false;
                break;
            case 'notRemote':
                enableFileLinks = !this._processInfo.remoteAuthority;
                break;
        }
        // Setup link detectors in their order of priority
        if (enableFileLinks) {
            this._setupLinkDetector(TerminalMultiLineLinkDetector.id, this._instantiationService.createInstance(TerminalMultiLineLinkDetector, this._xterm, this._processInfo, this._linkResolver));
            this._setupLinkDetector(TerminalLocalLinkDetector.id, this._instantiationService.createInstance(TerminalLocalLinkDetector, this._xterm, capabilities, this._processInfo, this._linkResolver));
        }
        this._setupLinkDetector(TerminalUriLinkDetector.id, this._instantiationService.createInstance(TerminalUriLinkDetector, this._xterm, this._processInfo, this._linkResolver));
        this._setupLinkDetector(TerminalWordLinkDetector.id, this.add(this._instantiationService.createInstance(TerminalWordLinkDetector, this._xterm)));
        // Setup link openers
        const localFileOpener = this._instantiationService.createInstance(TerminalLocalFileLinkOpener);
        const localFolderInWorkspaceOpener = this._instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
        this._openers.set("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, localFileOpener);
        this._openers.set("LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */, localFolderInWorkspaceOpener);
        this._openers.set("LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */, this._instantiationService.createInstance(TerminalLocalFolderOutsideWorkspaceLinkOpener));
        this._openers.set("Search" /* TerminalBuiltinLinkType.Search */, this._instantiationService.createInstance(TerminalSearchLinkOpener, capabilities, this._processInfo.initialCwd, localFileOpener, localFolderInWorkspaceOpener, () => this._processInfo.os || OS));
        this._openers.set("Url" /* TerminalBuiltinLinkType.Url */, this._instantiationService.createInstance(TerminalUrlLinkOpener, !!this._processInfo.remoteAuthority));
        this._registerStandardLinkProviders();
        let activeHoverDisposable;
        let activeTooltipScheduler;
        this.add(toDisposable(() => {
            this._clearLinkProviders();
            dispose(this._externalLinkProviders);
            activeHoverDisposable?.dispose();
            activeTooltipScheduler?.dispose();
        }));
        this._xterm.options.linkHandler = {
            allowNonHttpProtocols: true,
            activate: (event, text) => {
                if (!this._isLinkActivationModifierDown(event)) {
                    return;
                }
                const colonIndex = text.indexOf(':');
                if (colonIndex === -1) {
                    throw new Error(`Could not find scheme in link "${text}"`);
                }
                const scheme = text.substring(0, colonIndex);
                if (terminalConfigurationService.config.allowedLinkSchemes.indexOf(scheme) === -1) {
                    notificationService.prompt(Severity.Warning, nls.localize('scheme', 'Opening URIs can be insecure, do you want to allow opening links with the scheme {0}?', scheme), [
                        {
                            label: nls.localize('allow', 'Allow {0}', scheme),
                            run: () => {
                                const allowedLinkSchemes = [
                                    ...terminalConfigurationService.config.allowedLinkSchemes,
                                    scheme
                                ];
                                this._configurationService.updateValue(`terminal.integrated.allowedLinkSchemes`, allowedLinkSchemes);
                            }
                        }
                    ]);
                }
                this._openers.get("Url" /* TerminalBuiltinLinkType.Url */)?.open({
                    type: "Url" /* TerminalBuiltinLinkType.Url */,
                    text,
                    bufferRange: null,
                    uri: URI.parse(text)
                });
            },
            hover: (e, text, range) => {
                activeHoverDisposable?.dispose();
                activeHoverDisposable = undefined;
                activeTooltipScheduler?.dispose();
                activeTooltipScheduler = new RunOnceScheduler(() => {
                    const core = this._xterm._core;
                    const cellDimensions = {
                        width: core._renderService.dimensions.css.cell.width,
                        height: core._renderService.dimensions.css.cell.height
                    };
                    const terminalDimensions = {
                        width: this._xterm.cols,
                        height: this._xterm.rows
                    };
                    activeHoverDisposable = this._showHover({
                        viewportRange: convertBufferRangeToViewport(range, this._xterm.buffer.active.viewportY),
                        cellDimensions,
                        terminalDimensions
                    }, this._getLinkHoverString(text, text), undefined, (text) => this._xterm.options.linkHandler?.activate(e, text, range));
                    // Clear out scheduler until next hover event
                    activeTooltipScheduler?.dispose();
                    activeTooltipScheduler = undefined;
                }, this._configurationService.getValue('workbench.hover.delay'));
                activeTooltipScheduler.schedule();
            }
        };
    }
    _setupLinkDetector(id, detector, isExternal = false) {
        const detectorAdapter = this.add(this._instantiationService.createInstance(TerminalLinkDetectorAdapter, detector));
        this.add(detectorAdapter.onDidActivateLink(e => {
            // Prevent default electron link handling so Alt+Click mode works normally
            e.event?.preventDefault();
            // Require correct modifier on click unless event is coming from linkQuickPick selection
            if (e.event && !(e.event instanceof TerminalLinkQuickPickEvent) && !this._isLinkActivationModifierDown(e.event)) {
                return;
            }
            // Just call the handler if there is no before listener
            if (e.link.activate) {
                // Custom activate call (external links only)
                e.link.activate(e.link.text);
            }
            else {
                this._openLink(e.link);
            }
        }));
        this.add(detectorAdapter.onDidShowHover(e => this._tooltipCallback(e.link, e.viewportRange, e.modifierDownCallback, e.modifierUpCallback)));
        if (!isExternal) {
            this._standardLinkProviders.set(id, detectorAdapter);
        }
        return detectorAdapter;
    }
    async _openLink(link) {
        this._logService.debug('Opening link', link);
        const opener = this._openers.get(link.type);
        if (!opener) {
            throw new Error(`No matching opener for link type "${link.type}"`);
        }
        await opener.open(link);
    }
    async openRecentLink(type) {
        let links;
        let i = this._xterm.buffer.active.length;
        while ((!links || links.length === 0) && i >= this._xterm.buffer.active.viewportY) {
            links = await this._getLinksForType(i, type);
            i--;
        }
        if (!links || links.length < 1) {
            return undefined;
        }
        const event = new TerminalLinkQuickPickEvent(EventType.CLICK);
        links[0].activate(event, links[0].text);
        return links[0];
    }
    async getLinks() {
        // Fetch and await the viewport results
        const viewportLinksByLinePromises = [];
        for (let i = this._xterm.buffer.active.viewportY + this._xterm.rows - 1; i >= this._xterm.buffer.active.viewportY; i--) {
            viewportLinksByLinePromises.push(this._getLinksForLine(i));
        }
        const viewportLinksByLine = await Promise.all(viewportLinksByLinePromises);
        // Assemble viewport links
        const viewportLinks = {
            wordLinks: [],
            webLinks: [],
            fileLinks: [],
            folderLinks: [],
        };
        for (const links of viewportLinksByLine) {
            if (links) {
                const { wordLinks, webLinks, fileLinks, folderLinks } = links;
                if (wordLinks?.length) {
                    viewportLinks.wordLinks.push(...wordLinks.reverse());
                }
                if (webLinks?.length) {
                    viewportLinks.webLinks.push(...webLinks.reverse());
                }
                if (fileLinks?.length) {
                    viewportLinks.fileLinks.push(...fileLinks.reverse());
                }
                if (folderLinks?.length) {
                    viewportLinks.folderLinks.push(...folderLinks.reverse());
                }
            }
        }
        // Fetch the remaining results async
        const aboveViewportLinksPromises = [];
        for (let i = this._xterm.buffer.active.viewportY - 1; i >= 0; i--) {
            aboveViewportLinksPromises.push(this._getLinksForLine(i));
        }
        const belowViewportLinksPromises = [];
        for (let i = this._xterm.buffer.active.length - 1; i >= this._xterm.buffer.active.viewportY + this._xterm.rows; i--) {
            belowViewportLinksPromises.push(this._getLinksForLine(i));
        }
        // Assemble all links in results
        const allLinks = Promise.all(aboveViewportLinksPromises).then(async (aboveViewportLinks) => {
            const belowViewportLinks = await Promise.all(belowViewportLinksPromises);
            const allResults = {
                wordLinks: [...viewportLinks.wordLinks],
                webLinks: [...viewportLinks.webLinks],
                fileLinks: [...viewportLinks.fileLinks],
                folderLinks: [...viewportLinks.folderLinks]
            };
            for (const links of [...belowViewportLinks, ...aboveViewportLinks]) {
                if (links) {
                    const { wordLinks, webLinks, fileLinks, folderLinks } = links;
                    if (wordLinks?.length) {
                        allResults.wordLinks.push(...wordLinks.reverse());
                    }
                    if (webLinks?.length) {
                        allResults.webLinks.push(...webLinks.reverse());
                    }
                    if (fileLinks?.length) {
                        allResults.fileLinks.push(...fileLinks.reverse());
                    }
                    if (folderLinks?.length) {
                        allResults.folderLinks.push(...folderLinks.reverse());
                    }
                }
            }
            return allResults;
        });
        return {
            viewport: viewportLinks,
            all: allLinks
        };
    }
    async _getLinksForLine(y) {
        const unfilteredWordLinks = await this._getLinksForType(y, 'word');
        const webLinks = await this._getLinksForType(y, 'url');
        const fileLinks = await this._getLinksForType(y, 'localFile');
        const folderLinks = await this._getLinksForType(y, 'localFolder');
        const words = new Set();
        let wordLinks;
        if (unfilteredWordLinks) {
            wordLinks = [];
            for (const link of unfilteredWordLinks) {
                if (!words.has(link.text) && link.text.length > 1) {
                    wordLinks.push(link);
                    words.add(link.text);
                }
            }
        }
        return { wordLinks, webLinks, fileLinks, folderLinks };
    }
    async _getLinksForType(y, type) {
        switch (type) {
            case 'word':
                return (await new Promise(r => this._standardLinkProviders.get(TerminalWordLinkDetector.id)?.provideLinks(y, r)));
            case 'url':
                return (await new Promise(r => this._standardLinkProviders.get(TerminalUriLinkDetector.id)?.provideLinks(y, r)));
            case 'localFile': {
                const links = (await new Promise(r => this._standardLinkProviders.get(TerminalLocalLinkDetector.id)?.provideLinks(y, r)));
                return links?.filter(link => link.type === "LocalFile" /* TerminalBuiltinLinkType.LocalFile */);
            }
            case 'localFolder': {
                const links = (await new Promise(r => this._standardLinkProviders.get(TerminalLocalLinkDetector.id)?.provideLinks(y, r)));
                return links?.filter(link => link.type === "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */);
            }
        }
    }
    _tooltipCallback(link, viewportRange, modifierDownCallback, modifierUpCallback) {
        if (!this._widgetManager) {
            return;
        }
        const core = this._xterm._core;
        const cellDimensions = {
            width: core._renderService.dimensions.css.cell.width,
            height: core._renderService.dimensions.css.cell.height
        };
        const terminalDimensions = {
            width: this._xterm.cols,
            height: this._xterm.rows
        };
        // Don't pass the mouse event as this avoids the modifier check
        this._showHover({
            viewportRange,
            cellDimensions,
            terminalDimensions,
            modifierDownCallback,
            modifierUpCallback
        }, this._getLinkHoverString(link.text, link.label), link.actions, (text) => link.activate(undefined, text), link);
    }
    _showHover(targetOptions, text, actions, linkHandler, link) {
        if (this._widgetManager) {
            const widget = this._instantiationService.createInstance(TerminalHover, targetOptions, text, actions, linkHandler);
            const attached = this._widgetManager.attachWidget(widget);
            if (attached) {
                link?.onInvalidated(() => attached.dispose());
            }
            return attached;
        }
        return undefined;
    }
    setWidgetManager(widgetManager) {
        this._widgetManager = widgetManager;
    }
    _clearLinkProviders() {
        dispose(this._linkProvidersDisposables);
        this._linkProvidersDisposables.length = 0;
    }
    _registerStandardLinkProviders() {
        // Forward any external link provider requests to the registered provider if it exists. This
        // helps maintain the relative priority of the link providers as it's defined by the order
        // in which they're registered in xterm.js.
        //
        /**
         * There's a bit going on here but here's another view:
         * - {@link externalProvideLinksCb} The external callback that gives the links (eg. from
         *   exthost)
         * - {@link proxyLinkProvider} A proxy that forwards the call over to
         *   {@link externalProvideLinksCb}
         * - {@link wrappedLinkProvider} Wraps the above in an `TerminalLinkDetectorAdapter`
         */
        const proxyLinkProvider = async (bufferLineNumber) => {
            return this.externalProvideLinksCb?.(bufferLineNumber);
        };
        const detectorId = `extension-${this._externalLinkProviders.length}`;
        const wrappedLinkProvider = this._setupLinkDetector(detectorId, new TerminalExternalLinkDetector(detectorId, this._xterm, proxyLinkProvider), true);
        this._linkProvidersDisposables.push(this._xterm.registerLinkProvider(wrappedLinkProvider));
        for (const p of this._standardLinkProviders.values()) {
            this._linkProvidersDisposables.push(this._xterm.registerLinkProvider(p));
        }
    }
    _isLinkActivationModifierDown(event) {
        const editorConf = this._configurationService.getValue('editor');
        if (editorConf.multiCursorModifier === 'ctrlCmd') {
            return !!event.altKey;
        }
        return isMacintosh ? event.metaKey : event.ctrlKey;
    }
    _getLinkHoverString(uri, label) {
        const editorConf = this._configurationService.getValue('editor');
        let clickLabel = '';
        if (editorConf.multiCursorModifier === 'ctrlCmd') {
            if (isMacintosh) {
                clickLabel = nls.localize('terminalLinkHandler.followLinkAlt.mac', "option + click");
            }
            else {
                clickLabel = nls.localize('terminalLinkHandler.followLinkAlt', "alt + click");
            }
        }
        else {
            if (isMacintosh) {
                clickLabel = nls.localize('terminalLinkHandler.followLinkCmd', "cmd + click");
            }
            else {
                clickLabel = nls.localize('terminalLinkHandler.followLinkCtrl', "ctrl + click");
            }
        }
        let fallbackLabel = nls.localize('followLink', "Follow link");
        try {
            if (this._tunnelService.canTunnel(URI.parse(uri))) {
                fallbackLabel = nls.localize('followForwardedLink', "Follow link using forwarded port");
            }
        }
        catch {
            // No-op, already set to fallback
        }
        const markdown = new MarkdownString('', true);
        // Escapes markdown in label & uri
        if (label) {
            label = markdown.appendText(label).value;
            markdown.value = '';
        }
        if (uri) {
            uri = markdown.appendText(uri).value;
            markdown.value = '';
        }
        label = label || fallbackLabel;
        // Use the label when uri is '' so the link displays correctly
        uri = uri || label;
        // Although if there is a space in the uri, just replace it completely
        if (/(\s|&nbsp;)/.test(uri)) {
            uri = nls.localize('followLinkUrl', 'Link');
        }
        return markdown.appendLink(uri, label).appendMarkdown(` (${clickLabel})`);
    }
};
TerminalLinkManager = __decorate([
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, INotificationService),
    __param(7, ITerminalConfigurationService),
    __param(8, ITerminalLogService),
    __param(9, ITunnelService)
], TerminalLinkManager);
export { TerminalLinkManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbExpbmtNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWpGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSx3Q0FBd0MsRUFBRSw2Q0FBNkMsRUFBRSx3QkFBd0IsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2pOLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxD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