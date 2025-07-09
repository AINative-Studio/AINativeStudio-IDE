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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
let SectionHeaderDetector = class SectionHeaderDetector extends Disposable {
    static { this.ID = 'editor.sectionHeaderDetector'; }
    constructor(editor, languageConfigurationService, editorWorkerService) {
        super();
        this.editor = editor;
        this.languageConfigurationService = languageConfigurationService;
        this.editorWorkerService = editorWorkerService;
        this.decorations = this.editor.createDecorationsCollection();
        this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
        this.computePromise = null;
        this.currentOccurrences = {};
        this._register(editor.onDidChangeModel((e) => {
            this.currentOccurrences = {};
            this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
            this.stop();
            this.computeSectionHeaders.schedule(0);
        }));
        this._register(editor.onDidChangeModelLanguage((e) => {
            this.currentOccurrences = {};
            this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
            this.stop();
            this.computeSectionHeaders.schedule(0);
        }));
        this._register(languageConfigurationService.onDidChange((e) => {
            const editorLanguageId = this.editor.getModel()?.getLanguageId();
            if (editorLanguageId && e.affects(editorLanguageId)) {
                this.currentOccurrences = {};
                this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
                this.stop();
                this.computeSectionHeaders.schedule(0);
            }
        }));
        this._register(editor.onDidChangeConfiguration(e => {
            if (this.options && !e.hasChanged(74 /* EditorOption.minimap */)) {
                return;
            }
            this.options = this.createOptions(editor.getOption(74 /* EditorOption.minimap */));
            // Remove any links (for the getting disabled case)
            this.updateDecorations([]);
            // Stop any computation (for the getting disabled case)
            this.stop();
            // Start computing (for the getting enabled case)
            this.computeSectionHeaders.schedule(0);
        }));
        this._register(this.editor.onDidChangeModelContent(e => {
            this.computeSectionHeaders.schedule();
        }));
        this._register(editor.onDidChangeModelTokens((e) => {
            if (!this.computeSectionHeaders.isScheduled()) {
                this.computeSectionHeaders.schedule(1000);
            }
        }));
        this.computeSectionHeaders = this._register(new RunOnceScheduler(() => {
            this.findSectionHeaders();
        }, 250));
        this.computeSectionHeaders.schedule(0);
    }
    createOptions(minimap) {
        if (!minimap || !this.editor.hasModel()) {
            return undefined;
        }
        const languageId = this.editor.getModel().getLanguageId();
        if (!languageId) {
            return undefined;
        }
        const commentsConfiguration = this.languageConfigurationService.getLanguageConfiguration(languageId).comments;
        const foldingRules = this.languageConfigurationService.getLanguageConfiguration(languageId).foldingRules;
        if (!commentsConfiguration && !foldingRules?.markers) {
            return undefined;
        }
        return {
            foldingRules,
            markSectionHeaderRegex: minimap.markSectionHeaderRegex,
            findMarkSectionHeaders: minimap.showMarkSectionHeaders,
            findRegionSectionHeaders: minimap.showRegionSectionHeaders,
        };
    }
    findSectionHeaders() {
        if (!this.editor.hasModel()
            || (!this.options?.findMarkSectionHeaders && !this.options?.findRegionSectionHeaders)) {
            return;
        }
        const model = this.editor.getModel();
        if (model.isDisposed() || model.isTooLargeForSyncing()) {
            return;
        }
        const modelVersionId = model.getVersionId();
        this.editorWorkerService.findSectionHeaders(model.uri, this.options)
            .then((sectionHeaders) => {
            if (model.isDisposed() || model.getVersionId() !== modelVersionId) {
                // model changed in the meantime
                return;
            }
            this.updateDecorations(sectionHeaders);
        });
    }
    updateDecorations(sectionHeaders) {
        const model = this.editor.getModel();
        if (model) {
            // Remove all section headers that should be in comments and are not in comments
            sectionHeaders = sectionHeaders.filter((sectionHeader) => {
                if (!sectionHeader.shouldBeInComments) {
                    return true;
                }
                const validRange = model.validateRange(sectionHeader.range);
                const tokens = model.tokenization.getLineTokens(validRange.startLineNumber);
                const idx = tokens.findTokenIndexAtOffset(validRange.startColumn - 1);
                const tokenType = tokens.getStandardTokenType(idx);
                const languageId = tokens.getLanguageId(idx);
                return (languageId === model.getLanguageId() && tokenType === 1 /* StandardTokenType.Comment */);
            });
        }
        const oldDecorations = Object.values(this.currentOccurrences).map(occurrence => occurrence.decorationId);
        const newDecorations = sectionHeaders.map(sectionHeader => decoration(sectionHeader));
        this.editor.changeDecorations((changeAccessor) => {
            const decorations = changeAccessor.deltaDecorations(oldDecorations, newDecorations);
            this.currentOccurrences = {};
            for (let i = 0, len = decorations.length; i < len; i++) {
                const occurrence = { sectionHeader: sectionHeaders[i], decorationId: decorations[i] };
                this.currentOccurrences[occurrence.decorationId] = occurrence;
            }
        });
    }
    stop() {
        this.computeSectionHeaders.cancel();
        if (this.computePromise) {
            this.computePromise.cancel();
            this.computePromise = null;
        }
    }
    dispose() {
        super.dispose();
        this.stop();
        this.decorations.clear();
    }
};
SectionHeaderDetector = __decorate([
    __param(1, ILanguageConfigurationService),
    __param(2, IEditorWorkerService)
], SectionHeaderDetector);
export { SectionHeaderDetector };
function decoration(sectionHeader) {
    return {
        range: sectionHeader.range,
        options: ModelDecorationOptions.createDynamic({
            description: 'section-header',
            stickiness: 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */,
            collapseOnReplaceEdit: true,
            minimap: {
                color: undefined,
                position: 1 /* MinimapPosition.Inline */,
                sectionHeaderStyle: sectionHeader.hasSeparatorLine ? 2 /* MinimapSectionHeaderStyle.Underlined */ : 1 /* MinimapSectionHeaderStyle.Normal */,
                sectionHeaderText: sectionHeader.text,
            },
        })
    };
}
registerEditorContribution(SectionHeaderDetector.ID, SectionHeaderDetector, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdGlvbkhlYWRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc2VjdGlvbkhlYWRlcnMvYnJvd3Nlci9zZWN0aW9uSGVhZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUluSCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUUzRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUd6RSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7YUFFN0IsT0FBRSxHQUFXLDhCQUE4QixBQUF6QyxDQUEwQztJQVFuRSxZQUNrQixNQUFtQixFQUNZLDRCQUEyRCxFQUNwRSxtQkFBeUM7UUFFaEYsS0FBSyxFQUFFLENBQUM7UUFKUyxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ1ksaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUNwRSx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBR2hGLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBRTdELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsU0FBUywrQkFBc0IsQ0FBQyxDQUFDO1FBQzFFLElBQUksQ0FBQyxj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