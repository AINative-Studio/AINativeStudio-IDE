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
import { AsyncIterableObject } from '../../../../base/common/async.js';
import { isEmptyMarkdownString, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Position } from '../../../common/core/position.js';
import { ModelDecorationInjectedTextOptions } from '../../../common/model/textModel.js';
import { HoverForeignElementAnchor } from '../../hover/browser/hoverTypes.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { getHoverProviderResultsAsAsyncIterable } from '../../hover/browser/getHover.js';
import { MarkdownHover, MarkdownHoverParticipant } from '../../hover/browser/markdownHoverParticipant.js';
import { RenderedInlayHintLabelPart, InlayHintsController } from './inlayHintsController.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { localize } from '../../../../nls.js';
import * as platform from '../../../../base/common/platform.js';
import { asCommandLink } from './inlayHints.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
class InlayHintsHoverAnchor extends HoverForeignElementAnchor {
    constructor(part, owner, initialMousePosX, initialMousePosY) {
        super(10, owner, part.item.anchor.range, initialMousePosX, initialMousePosY, true);
        this.part = part;
    }
}
let InlayHintsHover = class InlayHintsHover extends MarkdownHoverParticipant {
    constructor(editor, languageService, openerService, keybindingService, hoverService, configurationService, _resolverService, languageFeaturesService, commandService) {
        super(editor, languageService, openerService, configurationService, languageFeaturesService, keybindingService, hoverService, commandService);
        this._resolverService = _resolverService;
        this.hoverOrdinal = 6;
    }
    suggestHoverAnchor(mouseEvent) {
        const controller = InlayHintsController.get(this._editor);
        if (!controller) {
            return null;
        }
        if (mouseEvent.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
            return null;
        }
        const options = mouseEvent.target.detail.injectedText?.options;
        if (!(options instanceof ModelDecorationInjectedTextOptions && options.attachedData instanceof RenderedInlayHintLabelPart)) {
            return null;
        }
        return new InlayHintsHoverAnchor(options.attachedData, this, mouseEvent.event.posx, mouseEvent.event.posy);
    }
    computeSync() {
        return [];
    }
    computeAsync(anchor, _lineDecorations, source, token) {
        if (!(anchor instanceof InlayHintsHoverAnchor)) {
            return AsyncIterableObject.EMPTY;
        }
        return new AsyncIterableObject(async (executor) => {
            const { part } = anchor;
            await part.item.resolve(token);
            if (token.isCancellationRequested) {
                return;
            }
            // (1) Inlay Tooltip
            let itemTooltip;
            if (typeof part.item.hint.tooltip === 'string') {
                itemTooltip = new MarkdownString().appendText(part.item.hint.tooltip);
            }
            else if (part.item.hint.tooltip) {
                itemTooltip = part.item.hint.tooltip;
            }
            if (itemTooltip) {
                executor.emitOne(new MarkdownHover(this, anchor.range, [itemTooltip], false, 0));
            }
            // (1.2) Inlay dbl-click gesture
            if (isNonEmptyArray(part.item.hint.textEdits)) {
                executor.emitOne(new MarkdownHover(this, anchor.range, [new MarkdownString().appendText(localize('hint.dbl', "Double-click to insert"))], false, 10001));
            }
            // (2) Inlay Label Part Tooltip
            let partTooltip;
            if (typeof part.part.tooltip === 'string') {
                partTooltip = new MarkdownString().appendText(part.part.tooltip);
            }
            else if (part.part.tooltip) {
                partTooltip = part.part.tooltip;
            }
            if (partTooltip) {
                executor.emitOne(new MarkdownHover(this, anchor.range, [partTooltip], false, 1));
            }
            // (2.2) Inlay Label Part Help Hover
            if (part.part.location || part.part.command) {
                let linkHint;
                const useMetaKey = this._editor.getOption(79 /* EditorOption.multiCursorModifier */) === 'altKey';
                const kb = useMetaKey
                    ? platform.isMacintosh
                        ? localize('links.navigate.kb.meta.mac', "cmd + click")
                        : localize('links.navigate.kb.meta', "ctrl + click")
                    : platform.isMacintosh
                        ? localize('links.navigate.kb.alt.mac', "option + click")
                        : localize('links.navigate.kb.alt', "alt + click");
                if (part.part.location && part.part.command) {
                    linkHint = new MarkdownString().appendText(localize('hint.defAndCommand', 'Go to Definition ({0}), right click for more', kb));
                }
                else if (part.part.location) {
                    linkHint = new MarkdownString().appendText(localize('hint.def', 'Go to Definition ({0})', kb));
                }
                else if (part.part.command) {
                    linkHint = new MarkdownString(`[${localize('hint.cmd', "Execute Command")}](${asCommandLink(part.part.command)} "${part.part.command.title}") (${kb})`, { isTrusted: true });
                }
                if (linkHint) {
                    executor.emitOne(new MarkdownHover(this, anchor.range, [linkHint], false, 10000));
                }
            }
            // (3) Inlay Label Part Location tooltip
            const iterable = await this._resolveInlayHintLabelPartHover(part, token);
            for await (const item of iterable) {
                executor.emitOne(item);
            }
        });
    }
    async _resolveInlayHintLabelPartHover(part, token) {
        if (!part.part.location) {
            return AsyncIterableObject.EMPTY;
        }
        const { uri, range } = part.part.location;
        const ref = await this._resolverService.createModelReference(uri);
        try {
            const model = ref.object.textEditorModel;
            if (!this._languageFeaturesService.hoverProvider.has(model)) {
                return AsyncIterableObject.EMPTY;
            }
            return getHoverProviderResultsAsAsyncIterable(this._languageFeaturesService.hoverProvider, model, new Position(range.startLineNumber, range.startColumn), token)
                .filter(item => !isEmptyMarkdownString(item.hover.contents))
                .map(item => new MarkdownHover(this, part.item.anchor.range, item.hover.contents, false, 2 + item.ordinal));
        }
        finally {
            ref.dispose();
        }
    }
};
InlayHintsHover = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, IKeybindingService),
    __param(4, IHoverService),
    __param(5, IConfigurationService),
    __param(6, ITextModelService),
    __param(7, ILanguageFeaturesService),
    __param(8, ICommandService)
], InlayHintsHover);
export { InlayHintsHover };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0hvdmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGF5SGludHMvYnJvd3Nlci9pbmxheUhpbnRzSG92ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdkUsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVoSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFNUQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEYsT0FBTyxFQUFlLHlCQUF5QixFQUEyQixNQUFNLG1DQUFtQyxDQUFDO0FBQ3BILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlD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