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
import * as dom from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { ResourceMap } from '../../../base/common/map.js';
import { parse } from '../../../base/common/marshalling.js';
import { matchesScheme, matchesSomeScheme, Schemas } from '../../../base/common/network.js';
import { normalizePath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { ICodeEditorService } from './codeEditorService.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { EditorOpenSource } from '../../../platform/editor/common/editor.js';
import { extractSelection } from '../../../platform/opener/common/opener.js';
let CommandOpener = class CommandOpener {
    constructor(_commandService) {
        this._commandService = _commandService;
    }
    async open(target, options) {
        if (!matchesScheme(target, Schemas.command)) {
            return false;
        }
        if (!options?.allowCommands) {
            // silently ignore commands when command-links are disabled, also
            // suppress other openers by returning TRUE
            return true;
        }
        if (typeof target === 'string') {
            target = URI.parse(target);
        }
        if (Array.isArray(options.allowCommands)) {
            // Only allow specific commands
            if (!options.allowCommands.includes(target.path)) {
                // Suppress other openers by returning TRUE
                return true;
            }
        }
        // execute as command
        let args = [];
        try {
            args = parse(decodeURIComponent(target.query));
        }
        catch {
            // ignore and retry
            try {
                args = parse(target.query);
            }
            catch {
                // ignore error
            }
        }
        if (!Array.isArray(args)) {
            args = [args];
        }
        await this._commandService.executeCommand(target.path, ...args);
        return true;
    }
};
CommandOpener = __decorate([
    __param(0, ICommandService)
], CommandOpener);
let EditorOpener = class EditorOpener {
    constructor(_editorService) {
        this._editorService = _editorService;
    }
    async open(target, options) {
        if (typeof target === 'string') {
            target = URI.parse(target);
        }
        const { selection, uri } = extractSelection(target);
        target = uri;
        if (target.scheme === Schemas.file) {
            target = normalizePath(target); // workaround for non-normalized paths (https://github.com/microsoft/vscode/issues/12954)
        }
        await this._editorService.openCodeEditor({
            resource: target,
            options: {
                selection,
                source: options?.fromUserGesture ? EditorOpenSource.USER : EditorOpenSource.API,
                ...options?.editorOptions
            }
        }, this._editorService.getFocusedCodeEditor(), options?.openToSide);
        return true;
    }
};
EditorOpener = __decorate([
    __param(0, ICodeEditorService)
], EditorOpener);
let OpenerService = class OpenerService {
    constructor(editorService, commandService) {
        this._openers = new LinkedList();
        this._validators = new LinkedList();
        this._resolvers = new LinkedList();
        this._resolvedUriTargets = new ResourceMap(uri => uri.with({ path: null, fragment: null, query: null }).toString());
        this._externalOpeners = new LinkedList();
        // Default external opener is going through window.open()
        this._defaultExternalOpener = {
            openExternal: async (href) => {
                // ensure to open HTTP/HTTPS links into new windows
                // to not trigger a navigation. Any other link is
                // safe to be set as HREF to prevent a blank window
                // from opening.
                if (matchesSomeScheme(href, Schemas.http, Schemas.https)) {
                    dom.windowOpenNoOpener(href);
                }
                else {
                    mainWindow.location.href = href;
                }
                return true;
            }
        };
        // Default opener: any external, maito, http(s), command, and catch-all-editors
        this._openers.push({
            open: async (target, options) => {
                if (options?.openExternal || matchesSomeScheme(target, Schemas.mailto, Schemas.http, Schemas.https, Schemas.vsls)) {
                    // open externally
                    await this._doOpenExternal(target, options);
                    return true;
                }
                return false;
            }
        });
        this._openers.push(new CommandOpener(commandService));
        this._openers.push(new EditorOpener(editorService));
    }
    registerOpener(opener) {
        const remove = this._openers.unshift(opener);
        return { dispose: remove };
    }
    registerValidator(validator) {
        const remove = this._validators.push(validator);
        return { dispose: remove };
    }
    registerExternalUriResolver(resolver) {
        const remove = this._resolvers.push(resolver);
        return { dispose: remove };
    }
    setDefaultExternalOpener(externalOpener) {
        this._defaultExternalOpener = externalOpener;
    }
    registerExternalOpener(opener) {
        const remove = this._externalOpeners.push(opener);
        return { dispose: remove };
    }
    async open(target, options) {
        // check with contributed validators
        if (!options?.skipValidation) {
            const targetURI = typeof target === 'string' ? URI.parse(target) : target;
            const validationTarget = this._resolvedUriTargets.get(targetURI) ?? target; // validate against the original URI that this URI resolves to, if one exists
            for (const validator of this._validators) {
                if (!(await validator.shouldOpen(validationTarget, options))) {
                    return false;
                }
            }
        }
        // check with contributed openers
        for (const opener of this._openers) {
            const handled = await opener.open(target, options);
            if (handled) {
                return true;
            }
        }
        return false;
    }
    async resolveExternalUri(resource, options) {
        for (const resolver of this._resolvers) {
            try {
                const result = await resolver.resolveExternalUri(resource, options);
                if (result) {
                    if (!this._resolvedUriTargets.has(result.resolved)) {
                        this._resolvedUriTargets.set(result.resolved, resource);
                    }
                    return result;
                }
            }
            catch {
                // noop
            }
        }
        throw new Error('Could not resolve external URI: ' + resource.toString());
    }
    async _doOpenExternal(resource, options) {
        //todo@jrieken IExternalUriResolver should support `uri: URI | string`
        const uri = typeof resource === 'string' ? URI.parse(resource) : resource;
        let externalUri;
        try {
            externalUri = (await this.resolveExternalUri(uri, options)).resolved;
        }
        catch {
            externalUri = uri;
        }
        let href;
        if (typeof resource === 'string' && uri.toString() === externalUri.toString()) {
            // open the url-string AS IS
            href = resource;
        }
        else {
            // open URI using the toString(noEncode)+encodeURI-trick
            href = encodeURI(externalUri.toString(true));
        }
        if (options?.allowContributedOpeners) {
            const preferredOpenerId = typeof options?.allowContributedOpeners === 'string' ? options?.allowContributedOpeners : undefined;
            for (const opener of this._externalOpeners) {
                const didOpen = await opener.openExternal(href, {
                    sourceUri: uri,
                    preferredOpenerId,
                }, CancellationToken.None);
                if (didOpen) {
                    return true;
                }
            }
        }
        return this._defaultExternalOpener.openExternal(href, { sourceUri: uri }, CancellationToken.None);
    }
    dispose() {
        this._validators.clear();
    }
};
OpenerService = __decorate([
    __param(0, ICodeEditorService),
    __param(1, ICommandService)
], OpenerService);
export { OpenerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9vcGVuZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGdCQUFnQixFQUE0SSxNQUFNLDJDQUEyQyxDQUFDO0FBRXZOLElBQU0sYUFBYSxHQUFuQixNQUFNLGFBQWE7SUFFbEIsWUFBOEMsZUFBZ0M7UUFBaEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO0lBQUksQ0FBQztJQUVu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