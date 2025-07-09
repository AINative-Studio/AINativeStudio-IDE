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
import { IPromptsService } from '../service/types.js';
import { assert } from '../../../../../../base/common/assert.js';
import { NotPromptFile } from '../../promptFileReferenceErrors.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ObjectCache } from '../../../../../../base/common/objectCache.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { PromptsConfig } from '../../../../../../platform/prompts/common/config.js';
import { isPromptFile } from '../../../../../../platform/prompts/common/constants.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { ObservableDisposable } from '../../../../../../base/common/observableDisposable.js';
import { Extensions } from '../../../../../common/contributions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
/**
 * Unique ID of the markers provider class.
 */
const MARKERS_OWNER_ID = 'reusable-prompts-syntax';
/**
 * Prompt links diagnostics provider for a single text model.
 */
let PromptLinkDiagnosticsProvider = class PromptLinkDiagnosticsProvider extends ObservableDisposable {
    constructor(editor, markerService, promptsService) {
        super();
        this.editor = editor;
        this.markerService = markerService;
        this.promptsService = promptsService;
        this.parser = this.promptsService
            .getSyntaxParserFor(this.editor)
            .onUpdate(this.updateMarkers.bind(this))
            .onDispose(this.dispose.bind(this))
            .start();
        // initialize markers
        this.updateMarkers();
    }
    /**
     * Update diagnostic markers for the current editor.
     */
    async updateMarkers() {
        // ensure that parsing process is settled
        await this.parser.allSettled();
        // clean up all previously added markers
        this.markerService.remove(MARKERS_OWNER_ID, [this.editor.uri]);
        const markers = [];
        for (const link of this.parser.references) {
            const { topError, linkRange } = link;
            if (!topError || !linkRange) {
                continue;
            }
            const { originalError } = topError;
            // the `NotPromptFile` error is allowed because we allow users
            // to include non-prompt file links in the prompt files
            // note! this check also handles the `FolderReference` error
            if (originalError instanceof NotPromptFile) {
                continue;
            }
            markers.push(toMarker(link));
        }
        this.markerService.changeOne(MARKERS_OWNER_ID, this.editor.uri, markers);
    }
};
PromptLinkDiagnosticsProvider = __decorate([
    __param(1, IMarkerService),
    __param(2, IPromptsService)
], PromptLinkDiagnosticsProvider);
/**
 * Convert a prompt link with an issue to a marker data.
 *
 * @throws
 *  - if there is no link issue (e.g., `topError` undefined)
 *  - if there is no link range to highlight (e.g., `linkRange` undefined)
 *  - if the original error is of `NotPromptFile` type - we don't want to
 *    show diagnostic markers for non-prompt file links in the prompts
 */
const toMarker = (link) => {
    const { topError, linkRange } = link;
    // a sanity check because this function must be
    // used only if these link attributes are present
    assertDefined(topError, 'Top error must to be defined.');
    assertDefined(linkRange, 'Link range must to be defined.');
    const { originalError } = topError;
    assert(!(originalError instanceof NotPromptFile), 'Error must not be of "not prompt file" type.');
    // `error` severity for the link itself, `warning` for any of its children
    const severity = (topError.errorSubject === 'root')
        ? MarkerSeverity.Error
        : MarkerSeverity.Warning;
    return {
        message: topError.localizedMessage,
        severity,
        ...linkRange,
    };
};
/**
 * The class that manages creation and disposal of {@link PromptLinkDiagnosticsProvider}
 * classes for each specific editor text model.
 */
let PromptLinkDiagnosticsInstanceManager = class PromptLinkDiagnosticsInstanceManager extends Disposable {
    constructor(editorService, initService, configService) {
        super();
        // cache of prompt marker providers
        this.providers = this._register(new ObjectCache((editor) => {
            const parser = initService.createInstance(PromptLinkDiagnosticsProvider, editor);
            // this is a sanity check and the contract of the object cache,
            // we must return a non-disposed object from this factory function
            parser.assertNotDisposed('Created prompt parser must not be disposed.');
            return parser;
        }));
        // if the feature is disabled, do not create any providers
        if (!PromptsConfig.enabled(configService)) {
            return;
        }
        // subscribe to changes of the active editor
        this._register(editorService.onDidActiveEditorChange(() => {
            const { activeTextEditorControl } = editorService;
            if (!activeTextEditorControl) {
                return;
            }
            this.handleNewEditor(activeTextEditorControl);
        }));
        // handle existing visible text editors
        editorService
            .visibleTextEditorControls
            .forEach(this.handleNewEditor.bind(this));
    }
    /**
     * Initialize a new {@link PromptLinkDiagnosticsProvider} for the given editor.
     */
    handleNewEditor(editor) {
        const model = editor.getModel();
        if (!model) {
            return this;
        }
        // we support only `text editors` for now so filter out `diff` ones
        if ('modified' in model || 'model' in model) {
            return this;
        }
        // enable this only for prompt file editors
        if (!isPromptFile(model.uri)) {
            return this;
        }
        // note! calling `get` also creates a provider if it does not exist;
        // 		and the provider is auto-removed when the model is disposed
        this.providers.get(model);
        return this;
    }
};
PromptLinkDiagnosticsInstanceManager = __decorate([
    __param(0, IEditorService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], PromptLinkDiagnosticsInstanceManager);
export { PromptLinkDiagnosticsInstanceManager };
// register the provider as a workbench contribution
Registry.as(Extensions.Workbench)
    .registerWorkbenchContribution(PromptLinkDiagnosticsInstanceManager, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0TGlua0RpYWdub3N0aWNzUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlRmVhdHVyZXMvcHJvbXB0TGlua0RpYWdub3N0aWNzUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXRELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBbUMsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7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