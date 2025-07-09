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
import { getWindow, isHTMLElement, reset } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Schemas } from '../../../../base/common/network.js';
import * as osPath from '../../../../base/common/path.js';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITunnelService } from '../../../../platform/tunnel/common/tunnel.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { Iterable } from '../../../../base/common/iterator.js';
const CONTROL_CODES = '\\u0000-\\u0020\\u007f-\\u009f';
const WEB_LINK_REGEX = new RegExp('(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s' + CONTROL_CODES + '"]{2,}[^\\s' + CONTROL_CODES + '"\')}\\],:;.!?]', 'ug');
const WIN_ABSOLUTE_PATH = /(?:[a-zA-Z]:(?:(?:\\|\/)[\w\.-]*)+)/;
const WIN_RELATIVE_PATH = /(?:(?:\~|\.)(?:(?:\\|\/)[\w\.-]*)+)/;
const WIN_PATH = new RegExp(`(${WIN_ABSOLUTE_PATH.source}|${WIN_RELATIVE_PATH.source})`);
const POSIX_PATH = /((?:\~|\.)?(?:\/[\w\.-]*)+)/;
const LINE_COLUMN = /(?:\:([\d]+))?(?:\:([\d]+))?/;
const PATH_LINK_REGEX = new RegExp(`${platform.isWindows ? WIN_PATH.source : POSIX_PATH.source}${LINE_COLUMN.source}`, 'g');
const LINE_COLUMN_REGEX = /:([\d]+)(?::([\d]+))?$/;
const MAX_LENGTH = 2000;
export var DebugLinkHoverBehavior;
(function (DebugLinkHoverBehavior) {
    /** A nice workbench hover */
    DebugLinkHoverBehavior[DebugLinkHoverBehavior["Rich"] = 0] = "Rich";
    /**
     * Basic browser hover
     * @deprecated Consumers should adopt `rich` by propagating disposables appropriately
     */
    DebugLinkHoverBehavior[DebugLinkHoverBehavior["Basic"] = 1] = "Basic";
    /** No hover */
    DebugLinkHoverBehavior[DebugLinkHoverBehavior["None"] = 2] = "None";
})(DebugLinkHoverBehavior || (DebugLinkHoverBehavior = {}));
let LinkDetector = class LinkDetector {
    constructor(editorService, fileService, openerService, pathService, tunnelService, environmentService, configurationService, hoverService) {
        this.editorService = editorService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.pathService = pathService;
        this.tunnelService = tunnelService;
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        // noop
    }
    /**
     * Matches and handles web urls, absolute and relative file links in the string provided.
     * Returns <span/> element that wraps the processed string, where matched links are replaced by <a/>.
     * 'onclick' event is attached to all anchored links that opens them in the editor.
     * When splitLines is true, each line of the text, even if it contains no links, is wrapped in a <span>
     * and added as a child of the returned <span>.
     * If a `hoverBehavior` is passed, hovers may be added using the workbench hover service.
     * This should be preferred for new code where hovers are desirable.
     */
    linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights) {
        return this._linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights);
    }
    _linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights, defaultRef) {
        if (splitLines) {
            const lines = text.split('\n');
            for (let i = 0; i < lines.length - 1; i++) {
                lines[i] = lines[i] + '\n';
            }
            if (!lines[lines.length - 1]) {
                // Remove the last element ('') that split added.
                lines.pop();
            }
            const elements = lines.map(line => this._linkify(line, false, workspaceFolder, includeFulltext, hoverBehavior, highlights, defaultRef));
            if (elements.length === 1) {
                // Do not wrap single line with extra span.
                return elements[0];
            }
            const container = document.createElement('span');
            elements.forEach(e => container.appendChild(e));
            return container;
        }
        const container = document.createElement('span');
        for (const part of this.detectLinks(text)) {
            try {
                let node;
                switch (part.kind) {
                    case 'text':
                        node = defaultRef ? this.linkifyLocation(part.value, defaultRef.locationReference, defaultRef.session, hoverBehavior) : document.createTextNode(part.value);
                        break;
                    case 'web':
                        node = this.createWebLink(includeFulltext ? text : undefined, part.value, hoverBehavior);
                        break;
                    case 'path': {
                        const path = part.captures[0];
                        const lineNumber = part.captures[1] ? Number(part.captures[1]) : 0;
                        const columnNumber = part.captures[2] ? Number(part.captures[2]) : 0;
                        node = this.createPathLink(includeFulltext ? text : undefined, part.value, path, lineNumber, columnNumber, workspaceFolder, hoverBehavior);
                        break;
                    }
                    default:
                        node = document.createTextNode(part.value);
                }
                container.append(...this.applyHighlights(node, part.index, part.value.length, highlights));
            }
            catch (e) {
                container.appendChild(document.createTextNode(part.value));
            }
        }
        return container;
    }
    applyHighlights(node, startIndex, length, highlights) {
        const children = [];
        let currentIndex = startIndex;
        const endIndex = startIndex + length;
        for (const highlight of highlights || []) {
            if (highlight.end <= currentIndex || highlight.start >= endIndex) {
                continue;
            }
            if (highlight.start > currentIndex) {
                children.push(node.textContent.substring(currentIndex - startIndex, highlight.start - startIndex));
                currentIndex = highlight.start;
            }
            const highlightEnd = Math.min(highlight.end, endIndex);
            const highlightedText = node.textContent.substring(currentIndex - startIndex, highlightEnd - startIndex);
            const highlightSpan = document.createElement('span');
            highlightSpan.classList.add('highlight');
            if (highlight.extraClasses) {
                highlightSpan.classList.add(...highlight.extraClasses);
            }
            highlightSpan.textContent = highlightedText;
            children.push(highlightSpan);
            currentIndex = highlightEnd;
        }
        if (currentIndex === startIndex) {
            return Iterable.single(node); // no changes made
        }
        if (currentIndex < endIndex) {
            children.push(node.textContent.substring(currentIndex - startIndex));
        }
        // reuse the element if it's a link
        if (isHTMLElement(node)) {
            reset(node, ...children);
            return Iterable.single(node);
        }
        return children;
    }
    /**
     * Linkifies a location reference.
     */
    linkifyLocation(text, locationReference, session, hoverBehavior) {
        const link = this.createLink(text);
        this.decorateLink(link, undefined, text, hoverBehavior, async (preserveFocus) => {
            const location = await session.resolveLocationReference(locationReference);
            await location.source.openInEditor(this.editorService, {
                startLineNumber: location.line,
                startColumn: location.column,
                endLineNumber: location.endLine ?? location.line,
                endColumn: location.endColumn ?? location.column,
            }, preserveFocus);
        });
        return link;
    }
    /**
     * Makes an {@link ILinkDetector} that links everything in the output to the
     * reference if they don't have other explicit links.
     */
    makeReferencedLinkDetector(locationReference, session) {
        return {
            linkify: (text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights) => this._linkify(text, splitLines, workspaceFolder, includeFulltext, hoverBehavior, highlights, { locationReference, session }),
            linkifyLocation: this.linkifyLocation.bind(this),
        };
    }
    createWebLink(fulltext, url, hoverBehavior) {
        const link = this.createLink(url);
        let uri = URI.parse(url);
        // if the URI ends with something like `foo.js:12:3`, parse
        // that into a fragment to reveal that location (#150702)
        const lineCol = LINE_COLUMN_REGEX.exec(uri.path);
        if (lineCol) {
            uri = uri.with({
                path: uri.path.slice(0, lineCol.index),
                fragment: `L${lineCol[0].slice(1)}`
            });
        }
        this.decorateLink(link, uri, fulltext, hoverBehavior, async () => {
            if (uri.scheme === Schemas.file) {
                // Just using fsPath here is unsafe: https://github.com/microsoft/vscode/issues/109076
                const fsPath = uri.fsPath;
                const path = await this.pathService.path;
                const fileUrl = osPath.normalize(((path.sep === osPath.posix.sep) && platform.isWindows) ? fsPath.replace(/\\/g, osPath.posix.sep) : fsPath);
                const fileUri = URI.parse(fileUrl);
                const exists = await this.fileService.exists(fileUri);
                if (!exists) {
                    return;
                }
                await this.editorService.openEditor({
                    resource: fileUri,
                    options: {
                        pinned: true,
                        selection: lineCol ? { startLineNumber: +lineCol[1], startColumn: +lineCol[2] } : undefined,
                    },
                });
                return;
            }
            this.openerService.open(url, { allowTunneling: (!!this.environmentService.remoteAuthority && this.configurationService.getValue('remote.forwardOnOpen')) });
        });
        return link;
    }
    createPathLink(fulltext, text, path, lineNumber, columnNumber, workspaceFolder, hoverBehavior) {
        if (path[0] === '/' && path[1] === '/') {
            // Most likely a url part which did not match, for example ftp://path.
            return document.createTextNode(text);
        }
        const options = { selection: { startLineNumber: lineNumber, startColumn: columnNumber } };
        if (path[0] === '.') {
            if (!workspaceFolder) {
                return document.createTextNode(text);
            }
            const uri = workspaceFolder.toResource(path);
            const link = this.createLink(text);
            this.decorateLink(link, uri, fulltext, hoverBehavior, (preserveFocus) => this.editorService.openEditor({ resource: uri, options: { ...options, preserveFocus } }));
            return link;
        }
        if (path[0] === '~') {
            const userHome = this.pathService.resolvedUserHome;
            if (userHome) {
                path = osPath.join(userHome.fsPath, path.substring(1));
            }
        }
        const link = this.createLink(text);
        link.tabIndex = 0;
        const uri = URI.file(osPath.normalize(path));
        this.fileService.stat(uri).then(stat => {
            if (stat.isDirectory) {
                return;
            }
            this.decorateLink(link, uri, fulltext, hoverBehavior, (preserveFocus) => this.editorService.openEditor({ resource: uri, options: { ...options, preserveFocus } }));
        }).catch(() => {
            // If the uri can not be resolved we should not spam the console with error, remain quite #86587
        });
        return link;
    }
    createLink(text) {
        const link = document.createElement('a');
        link.textContent = text;
        return link;
    }
    decorateLink(link, uri, fulltext, hoverBehavior, onClick) {
        link.classList.add('link');
        const followLink = uri && this.tunnelService.canTunnel(uri) ? localize('followForwardedLink', "follow link using forwarded port") : localize('followLink', "follow link");
        const title = link.ariaLabel = fulltext
            ? (platform.isMacintosh ? localize('fileLinkWithPathMac', "Cmd + click to {0}\n{1}", followLink, fulltext) : localize('fileLinkWithPath', "Ctrl + click to {0}\n{1}", followLink, fulltext))
            : (platform.isMacintosh ? localize('fileLinkMac', "Cmd + click to {0}", followLink) : localize('fileLink', "Ctrl + click to {0}", followLink));
        if (hoverBehavior?.type === 0 /* DebugLinkHoverBehavior.Rich */) {
            hoverBehavior.store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), link, title));
        }
        else if (hoverBehavior?.type !== 2 /* DebugLinkHoverBehavior.None */) {
            link.title = title;
        }
        link.onmousemove = (event) => { link.classList.toggle('pointer', platform.isMacintosh ? event.metaKey : event.ctrlKey); };
        link.onmouseleave = () => link.classList.remove('pointer');
        link.onclick = (event) => {
            const selection = getWindow(link).getSelection();
            if (!selection || selection.type === 'Range') {
                return; // do not navigate when user is selecting
            }
            if (!(platform.isMacintosh ? event.metaKey : event.ctrlKey)) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            onClick(false);
        };
        link.onkeydown = e => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 3 /* KeyCode.Enter */ || event.keyCode === 10 /* KeyCode.Space */) {
                event.preventDefault();
                event.stopPropagation();
                onClick(event.keyCode === 10 /* KeyCode.Space */);
            }
        };
    }
    detectLinks(text) {
        if (text.length > MAX_LENGTH) {
            return [{ kind: 'text', value: text, captures: [], index: 0 }];
        }
        const regexes = [WEB_LINK_REGEX, PATH_LINK_REGEX];
        const kinds = ['web', 'path'];
        const result = [];
        const splitOne = (text, regexIndex, baseIndex) => {
            if (regexIndex >= regexes.length) {
                result.push({ value: text, kind: 'text', captures: [], index: baseIndex });
                return;
            }
            const regex = regexes[regexIndex];
            let currentIndex = 0;
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(text)) !== null) {
                const stringBeforeMatch = text.substring(currentIndex, match.index);
                if (stringBeforeMatch) {
                    splitOne(stringBeforeMatch, regexIndex + 1, baseIndex + currentIndex);
                }
                const value = match[0];
                result.push({
                    value: value,
                    kind: kinds[regexIndex],
                    captures: match.slice(1),
                    index: baseIndex + match.index
                });
                currentIndex = match.index + value.length;
            }
            const stringAfterMatches = text.substring(currentIndex);
            if (stringAfterMatches) {
                splitOne(stringAfterMatches, regexIndex + 1, baseIndex + currentIndex);
            }
        };
        splitOne(text, 0, 0);
        return result;
    }
};
LinkDetector = __decorate([
    __param(0, IEditorService),
    __param(1, IFileService),
    __param(2, IOpenerService),
    __param(3, IPathService),
    __param(4, ITunnelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IConfigurationService),
    __param(7, IHoverService)
], LinkDetector);
export { LinkDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0RldGVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvbGlua0RldGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBR3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEtBQUssTUFBTSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9B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