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
import { h } from '../../../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, derived, observableFromEvent } from '../../../../../../base/common/observable.js';
import { EditorExtensionsRegistry } from '../../../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { Selection } from '../../../../../../editor/common/core/selection.js';
import { CodeLensContribution } from '../../../../../../editor/contrib/codelens/browser/codelensController.js';
import { FoldingController } from '../../../../../../editor/contrib/folding/browser/folding.js';
import { MenuWorkbenchToolBar } from '../../../../../../platform/actions/browser/toolbar.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { DEFAULT_EDITOR_MAX_DIMENSIONS, DEFAULT_EDITOR_MIN_DIMENSIONS } from '../../../../../browser/parts/editor/editor.js';
import { setStyle } from '../../utils.js';
import { observableConfigValue } from '../../../../../../platform/observable/common/platformObservableUtils.js';
export class CodeEditorView extends Disposable {
    updateOptions(newOptions) {
        this.editor.updateOptions(newOptions);
    }
    constructor(instantiationService, viewModel, configurationService) {
        super();
        this.instantiationService = instantiationService;
        this.viewModel = viewModel;
        this.configurationService = configurationService;
        this.model = this.viewModel.map(m => /** @description model */ m?.model);
        this.htmlElements = h('div.code-view', [
            h('div.header@header', [
                h('span.title@title'),
                h('span.description@description'),
                h('span.detail@detail'),
                h('span.toolbar@toolbar'),
            ]),
            h('div.container', [
                h('div.gutter@gutterDiv'),
                h('div@editor'),
            ]),
        ]);
        this._onDidViewChange = new Emitter();
        this.view = {
            element: this.htmlElements.root,
            minimumWidth: DEFAULT_EDITOR_MIN_DIMENSIONS.width,
            maximumWidth: DEFAULT_EDITOR_MAX_DIMENSIONS.width,
            minimumHeight: DEFAULT_EDITOR_MIN_DIMENSIONS.height,
            maximumHeight: DEFAULT_EDITOR_MAX_DIMENSIONS.height,
            onDidChange: this._onDidViewChange.event,
            layout: (width, height, top, left) => {
                setStyle(this.htmlElements.root, { width, height, top, left });
                this.editor.layout({
                    width: width - this.htmlElements.gutterDiv.clientWidth,
                    height: height - this.htmlElements.header.clientHeight,
                });
            }
            // preferredWidth?: number | undefined;
            // preferredHeight?: number | undefined;
            // priority?: LayoutPriority | undefined;
            // snap?: boolean | undefined;
        };
        this.checkboxesVisible = observableConfigValue('mergeEditor.showCheckboxes', false, this.configurationService);
        this.showDeletionMarkers = observableConfigValue('mergeEditor.showDeletionMarkers', true, this.configurationService);
        this.useSimplifiedDecorations = observableConfigValue('mergeEditor.useSimplifiedDecorations', false, this.configurationService);
        this.editor = this.instantiationService.createInstance(CodeEditorWidget, this.htmlElements.editor, {}, {
            contributions: this.getEditorContributions(),
        });
        this.isFocused = observableFromEvent(this, Event.any(this.editor.onDidBlurEditorWidget, this.editor.onDidFocusEditorWidget), () => /** @description editor.hasWidgetFocus */ this.editor.hasWidgetFocus());
        this.cursorPosition = observableFromEvent(this, this.editor.onDidChangeCursorPosition, () => /** @description editor.getPosition */ this.editor.getPosition());
        this.selection = observableFromEvent(this, this.editor.onDidChangeCursorSelection, () => /** @description editor.getSelections */ this.editor.getSelections());
        this.cursorLineNumber = this.cursorPosition.map(p => /** @description cursorPosition.lineNumber */ p?.lineNumber);
    }
    getEditorContributions() {
        return EditorExtensionsRegistry.getEditorContributions().filter(c => c.id !== FoldingController.ID && c.id !== CodeLensContribution.ID);
    }
}
export function createSelectionsAutorun(codeEditorView, translateRange) {
    const selections = derived(reader => {
        /** @description selections */
        const viewModel = codeEditorView.viewModel.read(reader);
        if (!viewModel) {
            return [];
        }
        const baseRange = viewModel.selectionInBase.read(reader);
        if (!baseRange || baseRange.sourceEditor === codeEditorView) {
            return [];
        }
        return baseRange.rangesInBase.map(r => translateRange(r, viewModel));
    });
    return autorun(reader => {
        /** @description set selections */
        const ranges = selections.read(reader);
        if (ranges.length === 0) {
            return;
        }
        codeEditorView.editor.setSelections(ranges.map(r => new Selection(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn)));
    });
}
let TitleMenu = class TitleMenu extends Disposable {
    constructor(menuId, targetHtmlElement, instantiationService) {
        super();
        const toolbar = instantiationService.createInstance(MenuWorkbenchToolBar, targetHtmlElement, menuId, {
            menuOptions: { renderShortTitle: true },
            toolbarOptions: { primaryGroup: (g) => g === 'primary' }
        });
        this._store.add(toolbar);
    }
};
TitleMenu = __decorate([
    __param(2, IInstantiationService)
], TitleMenu);
export { TitleMenu };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvclZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L2VkaXRvcnMvY29kZUVkaXRvclZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTFELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBZSxPQUFPLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDakgsT0FBTyxFQUFFLHdCQUF3QixFQUFrQyxNQUFNLHNEQUFzRCxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBRzFHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUMvRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUc3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1B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