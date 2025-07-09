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
var LinkDetector_1;
import { createCancelablePromise, RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as platform from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import './links.css';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ClickLinkGesture } from '../../gotoSymbol/browser/link/clickLinkGesture.js';
import { getLinks } from './getLinks.js';
import * as nls from '../../../../nls.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
let LinkDetector = class LinkDetector extends Disposable {
    static { LinkDetector_1 = this; }
    static { this.ID = 'editor.linkDetector'; }
    static get(editor) {
        return editor.getContribution(LinkDetector_1.ID);
    }
    constructor(editor, openerService, notificationService, languageFeaturesService, languageFeatureDebounceService) {
        super();
        this.editor = editor;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this.languageFeaturesService = languageFeaturesService;
        this.providers = this.languageFeaturesService.linkProvider;
        this.debounceInformation = languageFeatureDebounceService.for(this.providers, 'Links', { min: 1000, max: 4000 });
        this.computeLinks = this._register(new RunOnceScheduler(() => this.computeLinksNow(), 1000));
        this.computePromise = null;
        this.activeLinksList = null;
        this.currentOccurrences = {};
        this.activeLinkDecorationId = null;
        const clickLinkGesture = this._register(new ClickLinkGesture(editor));
        this._register(clickLinkGesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, keyboardEvent]) => {
            this._onEditorMouseMove(mouseEvent, keyboardEvent);
        }));
        this._register(clickLinkGesture.onExecute((e) => {
            this.onEditorMouseUp(e);
        }));
        this._register(clickLinkGesture.onCancel((e) => {
            this.cleanUpActiveLinkDecoration();
        }));
        this._register(editor.onDidChangeConfiguration((e) => {
            if (!e.hasChanged(72 /* EditorOption.links */)) {
                return;
            }
            // Remove any links (for the getting disabled case)
            this.updateDecorations([]);
            // Stop any computation (for the getting disabled case)
            this.stop();
            // Start computing (for the getting enabled case)
            this.computeLinks.schedule(0);
        }));
        this._register(editor.onDidChangeModelContent((e) => {
            if (!this.editor.hasModel()) {
                return;
            }
            this.computeLinks.schedule(this.debounceInformation.get(this.editor.getModel()));
        }));
        this._register(editor.onDidChangeModel((e) => {
            this.currentOccurrences = {};
            this.activeLinkDecorationId = null;
            this.stop();
            this.computeLinks.schedule(0);
        }));
        this._register(editor.onDidChangeModelLanguage((e) => {
            this.stop();
            this.computeLinks.schedule(0);
        }));
        this._register(this.providers.onDidChange((e) => {
            this.stop();
            this.computeLinks.schedule(0);
        }));
        this.computeLinks.schedule(0);
    }
    async computeLinksNow() {
        if (!this.editor.hasModel() || !this.editor.getOption(72 /* EditorOption.links */)) {
            return;
        }
        const model = this.editor.getModel();
        if (model.isTooLargeForSyncing()) {
            return;
        }
        if (!this.providers.has(model)) {
            return;
        }
        if (this.activeLinksList) {
            this.activeLinksList.dispose();
            this.activeLinksList = null;
        }
        this.computePromise = createCancelablePromise(token => getLinks(this.providers, model, token));
        try {
            const sw = new StopWatch(false);
            this.activeLinksList = await this.computePromise;
            this.debounceInformation.update(model, sw.elapsed());
            if (model.isDisposed()) {
                return;
            }
            this.updateDecorations(this.activeLinksList.links);
        }
        catch (err) {
            onUnexpectedError(err);
        }
        finally {
            this.computePromise = null;
        }
    }
    updateDecorations(links) {
        const useMetaKey = (this.editor.getOption(79 /* EditorOption.multiCursorModifier */) === 'altKey');
        const oldDecorations = [];
        const keys = Object.keys(this.currentOccurrences);
        for (const decorationId of keys) {
            const occurence = this.currentOccurrences[decorationId];
            oldDecorations.push(occurence.decorationId);
        }
        const newDecorations = [];
        if (links) {
            // Not sure why this is sometimes null
            for (const link of links) {
                newDecorations.push(LinkOccurrence.decoration(link, useMetaKey));
            }
        }
        this.editor.changeDecorations((changeAccessor) => {
            const decorations = changeAccessor.deltaDecorations(oldDecorations, newDecorations);
            this.currentOccurrences = {};
            this.activeLinkDecorationId = null;
            for (let i = 0, len = decorations.length; i < len; i++) {
                const occurence = new LinkOccurrence(links[i], decorations[i]);
                this.currentOccurrences[occurence.decorationId] = occurence;
            }
        });
    }
    _onEditorMouseMove(mouseEvent, withKey) {
        const useMetaKey = (this.editor.getOption(79 /* EditorOption.multiCursorModifier */) === 'altKey');
        if (this.isEnabled(mouseEvent, withKey)) {
            this.cleanUpActiveLinkDecoration(); // always remove previous link decoration as their can only be one
            const occurrence = this.getLinkOccurrence(mouseEvent.target.position);
            if (occurrence) {
                this.editor.changeDecorations((changeAccessor) => {
                    occurrence.activate(changeAccessor, useMetaKey);
                    this.activeLinkDecorationId = occurrence.decorationId;
                });
            }
        }
        else {
            this.cleanUpActiveLinkDecoration();
        }
    }
    cleanUpActiveLinkDecoration() {
        const useMetaKey = (this.editor.getOption(79 /* EditorOption.multiCursorModifier */) === 'altKey');
        if (this.activeLinkDecorationId) {
            const occurrence = this.currentOccurrences[this.activeLinkDecorationId];
            if (occurrence) {
                this.editor.changeDecorations((changeAccessor) => {
                    occurrence.deactivate(changeAccessor, useMetaKey);
                });
            }
            this.activeLinkDecorationId = null;
        }
    }
    onEditorMouseUp(mouseEvent) {
        if (!this.isEnabled(mouseEvent)) {
            return;
        }
        const occurrence = this.getLinkOccurrence(mouseEvent.target.position);
        if (!occurrence) {
            return;
        }
        this.openLinkOccurrence(occurrence, mouseEvent.hasSideBySideModifier, true /* from user gesture */);
    }
    openLinkOccurrence(occurrence, openToSide, fromUserGesture = false) {
        if (!this.openerService) {
            return;
        }
        const { link } = occurrence;
        link.resolve(CancellationToken.None).then(uri => {
            // Support for relative file URIs of the shape file://./relativeFile.txt or file:///./relativeFile.txt
            if (typeof uri === 'string' && this.editor.hasModel()) {
                const modelUri = this.editor.getModel().uri;
                if (modelUri.scheme === Schemas.file && uri.startsWith(`${Schemas.file}:`)) {
                    const parsedUri = URI.parse(uri);
                    if (parsedUri.scheme === Schemas.file) {
                        const fsPath = resources.originalFSPath(parsedUri);
                        let relativePath = null;
                        if (fsPath.startsWith('/./') || fsPath.startsWith('\\.\\')) {
                            relativePath = `.${fsPath.substr(1)}`;
                        }
                        else if (fsPath.startsWith('//./') || fsPath.startsWith('\\\\.\\')) {
                            relativePath = `.${fsPath.substr(2)}`;
                        }
                        if (relativePath) {
                            uri = resources.joinPath(modelUri, relativePath);
                        }
                    }
                }
            }
            return this.openerService.open(uri, { openToSide, fromUserGesture, allowContributedOpeners: true, allowCommands: true, fromWorkspace: true });
        }, err => {
            const messageOrError = err instanceof Error ? err.message : err;
            // different error cases
            if (messageOrError === 'invalid') {
                this.notificationService.warn(nls.localize('invalid.url', 'Failed to open this link because it is not well-formed: {0}', link.url.toString()));
            }
            else if (messageOrError === 'missing') {
                this.notificationService.warn(nls.localize('missing.url', 'Failed to open this link because its target is missing.'));
            }
            else {
                onUnexpectedError(err);
            }
        });
    }
    getLinkOccurrence(position) {
        if (!this.editor.hasModel() || !position) {
            return null;
        }
        const decorations = this.editor.getModel().getDecorationsInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        }, 0, true);
        for (const decoration of decorations) {
            const currentOccurrence = this.currentOccurrences[decoration.id];
            if (currentOccurrence) {
                return currentOccurrence;
            }
        }
        return null;
    }
    isEnabled(mouseEvent, withKey) {
        return Boolean((mouseEvent.target.type === 6 /* MouseTargetType.CONTENT_TEXT */)
            && (mouseEvent.hasTriggerModifier || (withKey && withKey.keyCodeIsTriggerKey)));
    }
    stop() {
        this.computeLinks.cancel();
        if (this.activeLinksList) {
            this.activeLinksList?.dispose();
            this.activeLinksList = null;
        }
        if (this.computePromise) {
            this.computePromise.cancel();
            this.computePromise = null;
        }
    }
    dispose() {
        super.dispose();
        this.stop();
    }
};
LinkDetector = LinkDetector_1 = __decorate([
    __param(1, IOpenerService),
    __param(2, INotificationService),
    __param(3, ILanguageFeaturesService),
    __param(4, ILanguageFeatureDebounceService)
], LinkDetector);
export { LinkDetector };
const decoration = {
    general: ModelDecorationOptions.register({
        description: 'detected-link',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        collapseOnReplaceEdit: true,
        inlineClassName: 'detected-link'
    }),
    active: ModelDecorationOptions.register({
        description: 'detected-link-active',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        collapseOnReplaceEdit: true,
        inlineClassName: 'detected-link-active'
    })
};
class LinkOccurrence {
    static decoration(link, useMetaKey) {
        return {
            range: link.range,
            options: LinkOccurrence._getOptions(link, useMetaKey, false)
        };
    }
    static _getOptions(link, useMetaKey, isActive) {
        const options = { ...(isActive ? decoration.active : decoration.general) };
        options.hoverMessage = getHoverMessage(link, useMetaKey);
        return options;
    }
    constructor(link, decorationId) {
        this.link = link;
        this.decorationId = decorationId;
    }
    activate(changeAccessor, useMetaKey) {
        changeAccessor.changeDecorationOptions(this.decorationId, LinkOccurrence._getOptions(this.link, useMetaKey, true));
    }
    deactivate(changeAccessor, useMetaKey) {
        changeAccessor.changeDecorationOptions(this.decorationId, LinkOccurrence._getOptions(this.link, useMetaKey, false));
    }
}
function getHoverMessage(link, useMetaKey) {
    const executeCmd = link.url && /^command:/i.test(link.url.toString());
    const label = link.tooltip
        ? link.tooltip
        : executeCmd
            ? nls.localize('links.navigate.executeCmd', 'Execute command')
            : nls.localize('links.navigate.follow', 'Follow link');
    const kb = useMetaKey
        ? platform.isMacintosh
            ? nls.localize('links.navigate.kb.meta.mac', "cmd + click")
            : nls.localize('links.navigate.kb.meta', "ctrl + click")
        : platform.isMacintosh
            ? nls.localize('links.navigate.kb.alt.mac', "option + click")
            : nls.localize('links.navigate.kb.alt', "alt + click");
    if (link.url) {
        let nativeLabel = '';
        if (/^command:/i.test(link.url.toString())) {
            // Don't show complete command arguments in the native tooltip
            const match = link.url.toString().match(/^command:([^?#]+)/);
            if (match) {
                const commandId = match[1];
                nativeLabel = nls.localize('tooltip.explanation', "Execute command {0}", commandId);
            }
        }
        const hoverMessage = new MarkdownString('', true)
            .appendLink(link.url.toString(true).replace(/ /g, '%20'), label, nativeLabel)
            .appendMarkdown(` (${kb})`);
        return hoverMessage;
    }
    else {
        return new MarkdownString().appendText(`${label} (${kb})`);
    }
}
class OpenLinkAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.openLink',
            label: nls.localize2('label', "Open Link"),
            precondition: undefined
        });
    }
    run(accessor, editor) {
        const linkDetector = LinkDetector.get(editor);
        if (!linkDetector) {
            return;
        }
        if (!editor.hasModel()) {
            return;
        }
        const selections = editor.getSelections();
        for (const sel of selections) {
            const link = linkDetector.getLinkOccurrence(sel.getEndPosition());
            if (link) {
                linkDetector.openLinkOccurrence(link, false);
            }
        }
    }
}
registerEditorContribution(LinkDetector.ID, LinkDetector, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorAction(OpenLinkAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbGlua3MvYnJvd3Nlci9saW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFxQixnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sYUFBYSxDQUFDO0FBRXJCLE9BQU8sRUFBRSxZQUFZLEVBQW1DLG9CQUFvQixFQUFFLDBCQUEwQixFQUFvQixNQUFNLHNDQUFzQyxDQUFDO0FBT3pLLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBK0IsK0JBQStCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuSSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsZ0JBQWdC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