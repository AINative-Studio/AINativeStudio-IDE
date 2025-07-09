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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalLink } from './terminalLink.js';
/**
 * Wrap a link detector object so it can be used in xterm.js
 */
let TerminalLinkDetectorAdapter = class TerminalLinkDetectorAdapter extends Disposable {
    constructor(_detector, _instantiationService) {
        super();
        this._detector = _detector;
        this._instantiationService = _instantiationService;
        this._onDidActivateLink = this._register(new Emitter());
        this.onDidActivateLink = this._onDidActivateLink.event;
        this._onDidShowHover = this._register(new Emitter());
        this.onDidShowHover = this._onDidShowHover.event;
        this._activeProvideLinkRequests = new Map();
    }
    async provideLinks(bufferLineNumber, callback) {
        let activeRequest = this._activeProvideLinkRequests.get(bufferLineNumber);
        if (activeRequest) {
            await activeRequest;
            callback(this._activeLinks);
            return;
        }
        if (this._activeLinks) {
            for (const link of this._activeLinks) {
                link.dispose();
            }
        }
        activeRequest = this._provideLinks(bufferLineNumber);
        this._activeProvideLinkRequests.set(bufferLineNumber, activeRequest);
        this._activeLinks = await activeRequest;
        this._activeProvideLinkRequests.delete(bufferLineNumber);
        callback(this._activeLinks);
    }
    async _provideLinks(bufferLineNumber) {
        // Dispose of all old links if new links are provided, links are only cached for the current line
        const links = [];
        let startLine = bufferLineNumber - 1;
        let endLine = startLine;
        const lines = [
            this._detector.xterm.buffer.active.getLine(startLine)
        ];
        // Cap the maximum context on either side of the line being provided, by taking the context
        // around the line being provided for this ensures the line the pointer is on will have
        // links provided.
        const maxCharacterContext = Math.max(this._detector.maxLinkLength, this._detector.xterm.cols);
        const maxLineContext = Math.ceil(maxCharacterContext / this._detector.xterm.cols);
        const minStartLine = Math.max(startLine - maxLineContext, 0);
        const maxEndLine = Math.min(endLine + maxLineContext, this._detector.xterm.buffer.active.length);
        while (startLine >= minStartLine && this._detector.xterm.buffer.active.getLine(startLine)?.isWrapped) {
            lines.unshift(this._detector.xterm.buffer.active.getLine(startLine - 1));
            startLine--;
        }
        while (endLine < maxEndLine && this._detector.xterm.buffer.active.getLine(endLine + 1)?.isWrapped) {
            lines.push(this._detector.xterm.buffer.active.getLine(endLine + 1));
            endLine++;
        }
        const detectedLinks = await this._detector.detect(lines, startLine, endLine);
        for (const link of detectedLinks) {
            links.push(this._createTerminalLink(link, async (event) => this._onDidActivateLink.fire({ link, event })));
        }
        return links;
    }
    _createTerminalLink(l, activateCallback) {
        // Remove trailing colon if there is one so the link is more useful
        if (!l.disableTrimColon && l.text.length > 0 && l.text.charAt(l.text.length - 1) === ':') {
            l.text = l.text.slice(0, -1);
            l.bufferRange.end.x--;
        }
        return this._instantiationService.createInstance(TerminalLink, this._detector.xterm, l.bufferRange, l.text, l.uri, l.parsedLink, l.actions, this._detector.xterm.buffer.active.viewportY, activateCallback, (link, viewportRange, modifierDownCallback, modifierUpCallback) => this._onDidShowHover.fire({
            link,
            viewportRange,
            modifierDownCallback,
            modifierUpCallback
        }), l.type !== "Search" /* TerminalBuiltinLinkType.Search */, // Only search is low confidence
        l.label || this._getLabel(l.type), l.type);
    }
    _getLabel(type) {
        switch (type) {
            case "Search" /* TerminalBuiltinLinkType.Search */: return localize('searchWorkspace', 'Search workspace');
            case "LocalFile" /* TerminalBuiltinLinkType.LocalFile */: return localize('openFile', 'Open file in editor');
            case "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */: return localize('focusFolder', 'Focus folder in explorer');
            case "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */: return localize('openFolder', 'Open folder in new window');
            case "Url" /* TerminalBuiltinLinkType.Url */:
            default:
                return localize('followLink', 'Follow link');
        }
    }
};
TerminalLinkDetectorAdapter = __decorate([
    __param(1, IInstantiationService)
], TerminalLinkDetectorAdapter);
export { TerminalLinkDetectorAdapter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rRGV0ZWN0b3JBZGFwdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsTGlua0RldGVjdG9yQWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFnQmpEOztHQUVHO0FBQ0ksSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBUTFELFlBQ2tCLFNBQWdDLEVBQzFCLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUhTLGNBQVMsR0FBVCxTQUFTLENBQXVCO1FBQ1QsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQVBwRSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUM7UUFDL0Usc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUMxQyxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW1CLENBQUMsQ0FBQztRQUN6RSxtQkFBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1FBUzdDLCtCQUEwQixHQUF5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