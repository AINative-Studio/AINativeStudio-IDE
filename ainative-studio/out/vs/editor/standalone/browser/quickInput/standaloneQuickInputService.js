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
import './standaloneQuickInput.css';
import { Event } from '../../../../base/common/event.js';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorScopedLayoutService } from '../standaloneLayoutService.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { QuickInputService } from '../../../../platform/quickinput/browser/quickInputService.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let EditorScopedQuickInputService = class EditorScopedQuickInputService extends QuickInputService {
    constructor(editor, instantiationService, contextKeyService, themeService, codeEditorService, configurationService) {
        super(instantiationService, contextKeyService, themeService, new EditorScopedLayoutService(editor.getContainerDomNode(), codeEditorService), configurationService);
        this.host = undefined;
        // Use the passed in code editor as host for the quick input widget
        const contribution = QuickInputEditorContribution.get(editor);
        if (contribution) {
            const widget = contribution.widget;
            this.host = {
                _serviceBrand: undefined,
                get mainContainer() { return widget.getDomNode(); },
                getContainer() { return widget.getDomNode(); },
                whenContainerStylesLoaded() { return undefined; },
                get containers() { return [widget.getDomNode()]; },
                get activeContainer() { return widget.getDomNode(); },
                get mainContainerDimension() { return editor.getLayoutInfo(); },
                get activeContainerDimension() { return editor.getLayoutInfo(); },
                get onDidLayoutMainContainer() { return editor.onDidLayoutChange; },
                get onDidLayoutActiveContainer() { return editor.onDidLayoutChange; },
                get onDidLayoutContainer() { return Event.map(editor.onDidLayoutChange, dimension => ({ container: widget.getDomNode(), dimension })); },
                get onDidChangeActiveContainer() { return Event.None; },
                get onDidAddContainer() { return Event.None; },
                get mainContainerOffset() { return { top: 0, quickPickTop: 0 }; },
                get activeContainerOffset() { return { top: 0, quickPickTop: 0 }; },
                focus: () => editor.focus()
            };
        }
        else {
            this.host = undefined;
        }
    }
    createController() {
        return super.createController(this.host);
    }
};
EditorScopedQuickInputService = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, IThemeService),
    __param(4, ICodeEditorService),
    __param(5, IConfigurationService)
], EditorScopedQuickInputService);
let StandaloneQuickInputService = class StandaloneQuickInputService {
    get activeService() {
        const editor = this.codeEditorService.getFocusedCodeEditor();
        if (!editor) {
            throw new Error('Quick input service needs a focused editor to work.');
        }
        // Find the quick input implementation for the focused
        // editor or create it lazily if not yet created
        let quickInputService = this.mapEditorToService.get(editor);
        if (!quickInputService) {
            const newQuickInputService = quickInputService = this.instantiationService.createInstance(EditorScopedQuickInputService, editor);
            this.mapEditorToService.set(editor, quickInputService);
            createSingleCallFunction(editor.onDidDispose)(() => {
                newQuickInputService.dispose();
                this.mapEditorToService.delete(editor);
            });
        }
        return quickInputService;
    }
    get currentQuickInput() { return this.activeService.currentQuickInput; }
    get quickAccess() { return this.activeService.quickAccess; }
    get backButton() { return this.activeService.backButton; }
    get onShow() { return this.activeService.onShow; }
    get onHide() { return this.activeService.onHide; }
    constructor(instantiationService, codeEditorService) {
        this.instantiationService = instantiationService;
        this.codeEditorService = codeEditorService;
        this.mapEditorToService = new Map();
    }
    pick(picks, options, token = CancellationToken.None) {
        return this.activeService /* TS fail */.pick(picks, options, token);
    }
    input(options, token) {
        return this.activeService.input(options, token);
    }
    createQuickPick(options = { useSeparators: false }) {
        return this.activeService.createQuickPick(options);
    }
    createInputBox() {
        return this.activeService.createInputBox();
    }
    createQuickWidget() {
        return this.activeService.createQuickWidget();
    }
    focus() {
        return this.activeService.focus();
    }
    toggle() {
        return this.activeService.toggle();
    }
    navigate(next, quickNavigate) {
        return this.activeService.navigate(next, quickNavigate);
    }
    accept() {
        return this.activeService.accept();
    }
    back() {
        return this.activeService.back();
    }
    cancel() {
        return this.activeService.cancel();
    }
    setAlignment(alignment) {
        return this.activeService.setAlignment(alignment);
    }
    toggleHover() {
        return this.activeService.toggleHover();
    }
};
StandaloneQuickInputService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ICodeEditorService)
], StandaloneQuickInputService);
export { StandaloneQuickInputService };
export class QuickInputEditorContribution {
    static { this.ID = 'editor.controller.quickInput'; }
    static get(editor) {
        return editor.getContribution(QuickInputEditorContribution.ID);
    }
    constructor(editor) {
        this.editor = editor;
        this.widget = new QuickInputEditorWidget(this.editor);
    }
    dispose() {
        this.widget.dispose();
    }
}
export class QuickInputEditorWidget {
    static { this.ID = 'editor.contrib.quickInputWidget'; }
    constructor(codeEditor) {
        this.codeEditor = codeEditor;
        this.domNode = document.createElement('div');
        this.codeEditor.addOverlayWidget(this);
    }
    getId() {
        return QuickInputEditorWidget.ID;
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        return { preference: 2 /* OverlayWidgetPositionPreference.TOP_CENTER */ };
    }
    dispose() {
        this.codeEditor.removeOverlayWidget(this);
    }
}
registerEditorContribution(QuickInputEditorContribution.ID, QuickInputEditorContribution, 4 /* EditorContributionInstantiation.Lazy */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVF1aWNrSW5wdXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvcXVpY2tJbnB1dC9zdGFuZGFsb25lUXVpY2tJbnB1dFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRW5ILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLGlCQUFpQjtJQUk1RCxZQUNDLE1BQW1CLEVBQ0ksb0JBQTJDLEVBQzlDLGlCQUFxQyxFQUMxQyxZQUEyQixFQUN0QixpQkFBcUMsRUFDbEMs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