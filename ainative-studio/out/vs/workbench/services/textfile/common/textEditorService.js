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
import { Event } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorExtensions, isResourceDiffEditorInput, isResourceSideBySideEditorInput, DEFAULT_EDITOR_ASSOCIATION, isResourceMergeEditorInput } from '../../../common/editor.js';
import { IUntitledTextEditorService } from '../../untitled/common/untitledTextEditorService.js';
import { Schemas } from '../../../../base/common/network.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { TextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { UntitledTextEditorInput } from '../../untitled/common/untitledTextEditorInput.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../editor/common/editorResolverService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export const ITextEditorService = createDecorator('textEditorService');
let TextEditorService = class TextEditorService extends Disposable {
    constructor(untitledTextEditorService, instantiationService, uriIdentityService, fileService, editorResolverService) {
        super();
        this.untitledTextEditorService = untitledTextEditorService;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.editorResolverService = editorResolverService;
        this.editorInputCache = new ResourceMap();
        this.fileEditorFactory = Registry.as(EditorExtensions.EditorFactory).getFileEditorFactory();
        // Register the default editor to the editor resolver
        // service so that it shows up in the editors picker
        this.registerDefaultEditor();
    }
    registerDefaultEditor() {
        this._register(this.editorResolverService.registerEditor('*', {
            id: DEFAULT_EDITOR_ASSOCIATION.id,
            label: DEFAULT_EDITOR_ASSOCIATION.displayName,
            detail: DEFAULT_EDITOR_ASSOCIATION.providerDisplayName,
            priority: RegisteredEditorPriority.builtin
        }, {}, {
            createEditorInput: editor => ({ editor: this.createTextEditor(editor) }),
            createUntitledEditorInput: untitledEditor => ({ editor: this.createTextEditor(untitledEditor) }),
            createDiffEditorInput: diffEditor => ({ editor: this.createTextEditor(diffEditor) })
        }));
    }
    async resolveTextEditor(input) {
        return this.createTextEditor(input);
    }
    createTextEditor(input) {
        // Merge Editor Not Supported (we fallback to showing the result only)
        if (isResourceMergeEditorInput(input)) {
            return this.createTextEditor(input.result);
        }
        // Diff Editor Support
        if (isResourceDiffEditorInput(input)) {
            const original = this.createTextEditor(input.original);
            const modified = this.createTextEditor(input.modified);
            return this.instantiationService.createInstance(DiffEditorInput, input.label, input.description, original, modified, undefined);
        }
        // Side by Side Editor Support
        if (isResourceSideBySideEditorInput(input)) {
            const primary = this.createTextEditor(input.primary);
            const secondary = this.createTextEditor(input.secondary);
            return this.instantiationService.createInstance(SideBySideEditorInput, input.label, input.description, secondary, primary);
        }
        // Untitled text file support
        const untitledInput = input;
        if (untitledInput.forceUntitled || !untitledInput.resource || (untitledInput.resource.scheme === Schemas.untitled)) {
            const untitledOptions = {
                languageId: untitledInput.languageId,
                initialValue: untitledInput.contents,
                encoding: untitledInput.encoding
            };
            // Untitled resource: use as hint for an existing untitled editor
            let untitledModel;
            if (untitledInput.resource?.scheme === Schemas.untitled) {
                untitledModel = this.untitledTextEditorService.create({ untitledResource: untitledInput.resource, ...untitledOptions });
            }
            // Other resource: use as hint for associated filepath
            else {
                untitledModel = this.untitledTextEditorService.create({ associatedResource: untitledInput.resource, ...untitledOptions });
            }
            return this.createOrGetCached(untitledModel.resource, () => this.instantiationService.createInstance(UntitledTextEditorInput, untitledModel));
        }
        // Text File/Resource Editor Support
        const textResourceEditorInput = input;
        if (textResourceEditorInput.resource instanceof URI) {
            // Derive the label from the path if not provided explicitly
            const label = textResourceEditorInput.label || basename(textResourceEditorInput.resource);
            // We keep track of the preferred resource this input is to be created
            // with but it may be different from the canonical resource (see below)
            const preferredResource = textResourceEditorInput.resource;
            // From this moment on, only operate on the canonical resource
            // to ensure we reduce the chance of opening the same resource
            // with different resource forms (e.g. path casing on Windows)
            const canonicalResource = this.uriIdentityService.asCanonicalUri(preferredResource);
            return this.createOrGetCached(canonicalResource, () => {
                // File
                if (textResourceEditorInput.forceFile || this.fileService.hasProvider(canonicalResource)) {
                    return this.fileEditorFactory.createFileEditor(canonicalResource, preferredResource, textResourceEditorInput.label, textResourceEditorInput.description, textResourceEditorInput.encoding, textResourceEditorInput.languageId, textResourceEditorInput.contents, this.instantiationService);
                }
                // Resource
                return this.instantiationService.createInstance(TextResourceEditorInput, canonicalResource, textResourceEditorInput.label, textResourceEditorInput.description, textResourceEditorInput.languageId, textResourceEditorInput.contents);
            }, cachedInput => {
                // Untitled
                if (cachedInput instanceof UntitledTextEditorInput) {
                    return;
                }
                // Files
                else if (!(cachedInput instanceof TextResourceEditorInput)) {
                    cachedInput.setPreferredResource(preferredResource);
                    if (textResourceEditorInput.label) {
                        cachedInput.setPreferredName(textResourceEditorInput.label);
                    }
                    if (textResourceEditorInput.description) {
                        cachedInput.setPreferredDescription(textResourceEditorInput.description);
                    }
                    if (textResourceEditorInput.encoding) {
                        cachedInput.setPreferredEncoding(textResourceEditorInput.encoding);
                    }
                    if (textResourceEditorInput.languageId) {
                        cachedInput.setPreferredLanguageId(textResourceEditorInput.languageId);
                    }
                    if (typeof textResourceEditorInput.contents === 'string') {
                        cachedInput.setPreferredContents(textResourceEditorInput.contents);
                    }
                }
                // Resources
                else {
                    if (label) {
                        cachedInput.setName(label);
                    }
                    if (textResourceEditorInput.description) {
                        cachedInput.setDescription(textResourceEditorInput.description);
                    }
                    if (textResourceEditorInput.languageId) {
                        cachedInput.setPreferredLanguageId(textResourceEditorInput.languageId);
                    }
                    if (typeof textResourceEditorInput.contents === 'string') {
                        cachedInput.setPreferredContents(textResourceEditorInput.contents);
                    }
                }
            });
        }
        throw new Error(`ITextEditorService: Unable to create texteditor from ${JSON.stringify(input)}`);
    }
    createOrGetCached(resource, factoryFn, cachedFn) {
        // Return early if already cached
        let input = this.editorInputCache.get(resource);
        if (input) {
            cachedFn?.(input);
            return input;
        }
        // Otherwise create and add to cache
        input = factoryFn();
        this.editorInputCache.set(resource, input);
        Event.once(input.onWillDispose)(() => this.editorInputCache.delete(resource));
        return input;
    }
};
TextEditorService = __decorate([
    __param(0, IUntitledTextEditorService),
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService),
    __param(3, IFileService),
    __param(4, IEditorResolverService)
], TextEditorService);
export { TextEditorService };
registerSingleton(ITextEditorService, TextEditorService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL2NvbW1vbi90ZXh0RWRpdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEgsT0FBTyxFQUEwRixnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSwrQkFBK0IsRUFBb0MsMEJBQTBCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUUzUyxPQUFPLEVBQWlDLDBCQUEwQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDL0gsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUUzRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFB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