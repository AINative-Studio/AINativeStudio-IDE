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
import { coalesce } from '../../../../base/common/arrays.js';
import { UriList } from '../../../../base/common/dataTransfer.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../base/common/mime.js';
import { Schemas } from '../../../../base/common/network.js';
import { relativePath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { DocumentPasteTriggerKind } from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
class SimplePasteAndDropProvider {
    constructor(kind) {
        this.copyMimeTypes = [];
        this.kind = kind;
        this.providedDropEditKinds = [this.kind];
        this.providedPasteEditKinds = [this.kind];
    }
    async provideDocumentPasteEdits(_model, _ranges, dataTransfer, context, token) {
        const edit = await this.getEdit(dataTransfer, token);
        if (!edit) {
            return undefined;
        }
        return {
            edits: [{ insertText: edit.insertText, title: edit.title, kind: edit.kind, handledMimeType: edit.handledMimeType, yieldTo: edit.yieldTo }],
            dispose() { },
        };
    }
    async provideDocumentDropEdits(_model, _position, dataTransfer, token) {
        const edit = await this.getEdit(dataTransfer, token);
        if (!edit) {
            return;
        }
        return {
            edits: [{ insertText: edit.insertText, title: edit.title, kind: edit.kind, handledMimeType: edit.handledMimeType, yieldTo: edit.yieldTo }],
            dispose() { },
        };
    }
}
export class DefaultTextPasteOrDropEditProvider extends SimplePasteAndDropProvider {
    static { this.id = 'text'; }
    constructor() {
        super(HierarchicalKind.Empty.append('text', 'plain'));
        this.id = DefaultTextPasteOrDropEditProvider.id;
        this.dropMimeTypes = [Mimes.text];
        this.pasteMimeTypes = [Mimes.text];
    }
    async getEdit(dataTransfer, _token) {
        const textEntry = dataTransfer.get(Mimes.text);
        if (!textEntry) {
            return;
        }
        // Suppress if there's also a uriList entry.
        // Typically the uri-list contains the same text as the text entry so showing both is confusing.
        if (dataTransfer.has(Mimes.uriList)) {
            return;
        }
        const insertText = await textEntry.asString();
        return {
            handledMimeType: Mimes.text,
            title: localize('text.label', "Insert Plain Text"),
            insertText,
            kind: this.kind,
        };
    }
}
class PathProvider extends SimplePasteAndDropProvider {
    constructor() {
        super(HierarchicalKind.Empty.append('uri', 'path', 'absolute'));
        this.dropMimeTypes = [Mimes.uriList];
        this.pasteMimeTypes = [Mimes.uriList];
    }
    async getEdit(dataTransfer, token) {
        const entries = await extractUriList(dataTransfer);
        if (!entries.length || token.isCancellationRequested) {
            return;
        }
        let uriCount = 0;
        const insertText = entries
            .map(({ uri, originalText }) => {
            if (uri.scheme === Schemas.file) {
                return uri.fsPath;
            }
            else {
                uriCount++;
                return originalText;
            }
        })
            .join(' ');
        let label;
        if (uriCount > 0) {
            // Dropping at least one generic uri (such as https) so use most generic label
            label = entries.length > 1
                ? localize('defaultDropProvider.uriList.uris', "Insert Uris")
                : localize('defaultDropProvider.uriList.uri', "Insert Uri");
        }
        else {
            // All the paths are file paths
            label = entries.length > 1
                ? localize('defaultDropProvider.uriList.paths', "Insert Paths")
                : localize('defaultDropProvider.uriList.path', "Insert Path");
        }
        return {
            handledMimeType: Mimes.uriList,
            insertText,
            title: label,
            kind: this.kind,
        };
    }
}
let RelativePathProvider = class RelativePathProvider extends SimplePasteAndDropProvider {
    constructor(_workspaceContextService) {
        super(HierarchicalKind.Empty.append('uri', 'path', 'relative'));
        this._workspaceContextService = _workspaceContextService;
        this.dropMimeTypes = [Mimes.uriList];
        this.pasteMimeTypes = [Mimes.uriList];
    }
    async getEdit(dataTransfer, token) {
        const entries = await extractUriList(dataTransfer);
        if (!entries.length || token.isCancellationRequested) {
            return;
        }
        const relativeUris = coalesce(entries.map(({ uri }) => {
            const root = this._workspaceContextService.getWorkspaceFolder(uri);
            return root ? relativePath(root.uri, uri) : undefined;
        }));
        if (!relativeUris.length) {
            return;
        }
        return {
            handledMimeType: Mimes.uriList,
            insertText: relativeUris.join(' '),
            title: entries.length > 1
                ? localize('defaultDropProvider.uriList.relativePaths', "Insert Relative Paths")
                : localize('defaultDropProvider.uriList.relativePath', "Insert Relative Path"),
            kind: this.kind,
        };
    }
};
RelativePathProvider = __decorate([
    __param(0, IWorkspaceContextService)
], RelativePathProvider);
class PasteHtmlProvider {
    constructor() {
        this.kind = new HierarchicalKind('html');
        this.providedPasteEditKinds = [this.kind];
        this.copyMimeTypes = [];
        this.pasteMimeTypes = ['text/html'];
        this._yieldTo = [{ mimeType: Mimes.text }];
    }
    async provideDocumentPasteEdits(_model, _ranges, dataTransfer, context, token) {
        if (context.triggerKind !== DocumentPasteTriggerKind.PasteAs && !context.only?.contains(this.kind)) {
            return;
        }
        const entry = dataTransfer.get('text/html');
        const htmlText = await entry?.asString();
        if (!htmlText || token.isCancellationRequested) {
            return;
        }
        return {
            dispose() { },
            edits: [{
                    insertText: htmlText,
                    yieldTo: this._yieldTo,
                    title: localize('pasteHtmlLabel', 'Insert HTML'),
                    kind: this.kind,
                }],
        };
    }
}
async function extractUriList(dataTransfer) {
    const urlListEntry = dataTransfer.get(Mimes.uriList);
    if (!urlListEntry) {
        return [];
    }
    const strUriList = await urlListEntry.asString();
    const entries = [];
    for (const entry of UriList.parse(strUriList)) {
        try {
            entries.push({ uri: URI.parse(entry), originalText: entry });
        }
        catch {
            // noop
        }
    }
    return entries;
}
const genericLanguageSelector = { scheme: '*', hasAccessToAllModels: true };
let DefaultDropProvidersFeature = class DefaultDropProvidersFeature extends Disposable {
    constructor(languageFeaturesService, workspaceContextService) {
        super();
        this._register(languageFeaturesService.documentDropEditProvider.register(genericLanguageSelector, new DefaultTextPasteOrDropEditProvider()));
        this._register(languageFeaturesService.documentDropEditProvider.register(genericLanguageSelector, new PathProvider()));
        this._register(languageFeaturesService.documentDropEditProvider.register(genericLanguageSelector, new RelativePathProvider(workspaceContextService)));
    }
};
DefaultDropProvidersFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IWorkspaceContextService)
], DefaultDropProvidersFeature);
export { DefaultDropProvidersFeature };
let DefaultPasteProvidersFeature = class DefaultPasteProvidersFeature extends Disposable {
    constructor(languageFeaturesService, workspaceContextService) {
        super();
        this._register(languageFeaturesService.documentPasteEditProvider.register(genericLanguageSelector, new DefaultTextPasteOrDropEditProvider()));
        this._register(languageFeaturesService.documentPasteEditProvider.register(genericLanguageSelector, new PathProvider()));
        this._register(languageFeaturesService.documentPasteEditProvider.register(genericLanguageSelector, new RelativePathProvider(workspaceContextService)));
        this._register(languageFeaturesService.documentPasteEditProvider.register(genericLanguageSelector, new PasteHtmlProvider()));
    }
};
DefaultPasteProvidersFeature = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IWorkspaceContextService)
], DefaultPasteProvidersFeature);
export { DefaultPasteProvidersFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdFByb3ZpZGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9kcm9wT3JQYXN0ZUludG8vYnJvd3Nlci9kZWZhdWx0UHJvdmlkZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxPQUFPLEVBQTJCLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRzlGLE9BQU8sRUFBcUosd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUczTixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUd4RixNQUFlLDBCQUEwQjtJQVV4QyxZQUFZLElBQXNCO1FBSHpCLGtCQUFhLEdBQUcsRUFBRSxDQUFDO1FBSTNCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxDQUFD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