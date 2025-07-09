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
import { coalesce } from '../../../../../../base/common/arrays.js';
import { DisposableMap, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { EDITOR_FONT_DEFAULTS } from '../../../../../../editor/common/config/editorOptions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { ICommentService } from '../../../../comments/browser/commentService.js';
import { CommentThreadWidget } from '../../../../comments/browser/commentThreadWidget.js';
import { CellContentPart } from '../cellPart.js';
let CellComments = class CellComments extends CellContentPart {
    constructor(notebookEditor, container, contextKeyService, themeService, commentService, configurationService, instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.container = container;
        this.contextKeyService = contextKeyService;
        this.themeService = themeService;
        this.commentService = commentService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.container.classList.add('review-widget');
        this._register(this._commentThreadWidgets = new DisposableMap());
        this._register(this.themeService.onDidColorThemeChange(this._applyTheme, this));
        // TODO @rebornix onDidChangeLayout (font change)
        // this._register(this.notebookEditor.onDidchangeLa)
        this._applyTheme();
    }
    async initialize(element) {
        if (this.currentElement === element) {
            return;
        }
        this.currentElement = element;
        await this._updateThread();
    }
    async _createCommentTheadWidget(owner, commentThread) {
        const widgetDisposables = new DisposableStore();
        const widget = this.instantiationService.createInstance(CommentThreadWidget, this.container, this.notebookEditor, owner, this.notebookEditor.textModel.uri, this.contextKeyService, this.instantiationService, commentThread, undefined, undefined, {
            codeBlockFontFamily: this.configurationService.getValue('editor').fontFamily || EDITOR_FONT_DEFAULTS.fontFamily
        }, undefined, {
            actionRunner: () => {
            },
            collapse: async () => { return true; }
        });
        widgetDisposables.add(widget);
        this._commentThreadWidgets.set(commentThread.threadId, { widget, dispose: () => widgetDisposables.dispose() });
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        await widget.display(layoutInfo.fontInfo.lineHeight, true);
        this._applyTheme();
        widgetDisposables.add(widget.onDidResize(() => {
            if (this.currentElement) {
                this.currentElement.commentHeight = this._calculateCommentThreadHeight(widget.getDimensions().height);
            }
        }));
    }
    _bindListeners() {
        this.cellDisposables.add(this.commentService.onDidUpdateCommentThreads(async () => this._updateThread()));
    }
    async _updateThread() {
        if (!this.currentElement) {
            return;
        }
        const infos = await this._getCommentThreadsForCell(this.currentElement);
        const widgetsToDelete = new Set(this._commentThreadWidgets.keys());
        const layoutInfo = this.currentElement.layoutInfo;
        this.container.style.top = `${layoutInfo.commentOffset}px`;
        for (const info of infos) {
            if (!info) {
                continue;
            }
            for (const thread of info.threads) {
                widgetsToDelete.delete(thread.threadId);
                const widget = this._commentThreadWidgets.get(thread.threadId)?.widget;
                if (widget) {
                    await widget.updateCommentThread(thread);
                }
                else {
                    await this._createCommentTheadWidget(info.uniqueOwner, thread);
                }
            }
        }
        for (const threadId of widgetsToDelete) {
            this._commentThreadWidgets.deleteAndDispose(threadId);
        }
        this._updateHeight();
    }
    _calculateCommentThreadHeight(bodyHeight) {
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        const headHeight = Math.ceil(layoutInfo.fontInfo.lineHeight * 1.2);
        const lineHeight = layoutInfo.fontInfo.lineHeight;
        const arrowHeight = Math.round(lineHeight / 3);
        const frameThickness = Math.round(lineHeight / 9) * 2;
        const computedHeight = headHeight + bodyHeight + arrowHeight + frameThickness + 8 /** margin bottom to avoid margin collapse */;
        return computedHeight;
    }
    _updateHeight() {
        if (!this.currentElement) {
            return;
        }
        let height = 0;
        for (const { widget } of this._commentThreadWidgets.values()) {
            height += this._calculateCommentThreadHeight(widget.getDimensions().height);
        }
        this.currentElement.commentHeight = height;
    }
    async _getCommentThreadsForCell(element) {
        if (this.notebookEditor.hasModel()) {
            return coalesce(await this.commentService.getNotebookComments(element.uri));
        }
        return [];
    }
    _applyTheme() {
        const theme = this.themeService.getColorTheme();
        const fontInfo = this.notebookEditor.getLayoutInfo().fontInfo;
        for (const { widget } of this._commentThreadWidgets.values()) {
            widget.applyTheme(theme, fontInfo);
        }
    }
    didRenderCell(element) {
        this.initialize(element);
        this._bindListeners();
    }
    prepareLayout() {
        this._updateHeight();
    }
    updateInternalLayoutNow(element) {
        if (this.currentElement) {
            this.container.style.top = `${element.layoutInfo.commentOffset}px`;
        }
    }
};
CellComments = __decorate([
    __param(2, IContextKeyService),
    __param(3, IThemeService),
    __param(4, ICommentService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService)
], CellComments);
export { CellComments };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENvbW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbENvbW1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBa0IsTUFBTSx5REFBeUQsQ0FBQztBQUUvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBd0IsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFHMUMsSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBYSxTQUFRLGVBQWU7SUFLaEQsWUFDa0IsY0FBdUMsRUFDdkMsU0FBc0IsRUFDRixpQkFBcUMsRUFDMUMsWUFBMkIsRUFDekIsY0FBK0IsRUFDekIsb0JBQTJDLEVBQzNDLG9CQUEyQztRQUVuRixLQUFLLEVBQUUsQ0FBQztRQVJTLG1CQUFjLEdBQWQsY0FBYyxDQUF5QjtRQUN2QyxjQUFTLEdBQVQsU0FB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