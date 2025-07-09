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
import { coalesce } from '../../../base/common/arrays.js';
import { Event } from '../../../base/common/event.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { ILayoutService } from '../../../platform/layout/browser/layoutService.js';
let StandaloneLayoutService = class StandaloneLayoutService {
    get mainContainer() {
        return this._codeEditorService.listCodeEditors().at(0)?.getContainerDomNode() ?? mainWindow.document.body;
    }
    get activeContainer() {
        const activeCodeEditor = this._codeEditorService.getFocusedCodeEditor() ?? this._codeEditorService.getActiveCodeEditor();
        return activeCodeEditor?.getContainerDomNode() ?? this.mainContainer;
    }
    get mainContainerDimension() {
        return dom.getClientArea(this.mainContainer);
    }
    get activeContainerDimension() {
        return dom.getClientArea(this.activeContainer);
    }
    get containers() {
        return coalesce(this._codeEditorService.listCodeEditors().map(codeEditor => codeEditor.getContainerDomNode()));
    }
    getContainer() {
        return this.activeContainer;
    }
    whenContainerStylesLoaded() { return undefined; }
    focus() {
        this._codeEditorService.getFocusedCodeEditor()?.focus();
    }
    constructor(_codeEditorService) {
        this._codeEditorService = _codeEditorService;
        this.onDidLayoutMainContainer = Event.None;
        this.onDidLayoutActiveContainer = Event.None;
        this.onDidLayoutContainer = Event.None;
        this.onDidChangeActiveContainer = Event.None;
        this.onDidAddContainer = Event.None;
        this.mainContainerOffset = { top: 0, quickPickTop: 0 };
        this.activeContainerOffset = { top: 0, quickPickTop: 0 };
    }
};
StandaloneLayoutService = __decorate([
    __param(0, ICodeEditorService)
], StandaloneLayoutService);
let EditorScopedLayoutService = class EditorScopedLayoutService extends StandaloneLayoutService {
    get mainContainer() {
        return this._container;
    }
    constructor(_container, codeEditorService) {
        super(codeEditorService);
        this._container = _container;
    }
};
EditorScopedLayoutService = __decorate([
    __param(1, ICodeEditorService)
], EditorScopedLayoutService);
export { EditorScopedLayoutService };
registerSingleton(ILayoutService, StandaloneLayoutService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxheW91dFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9zdGFuZGFsb25lTGF5b3V0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2pGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RyxPQUFPLEVBQXFCLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXRHLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBUzVCLElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztJQUMzRyxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixFQUFFLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFFekgsT0FBTyxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDdEUsQ0FBQztJQUVELElBQUksc0JBQXNCO1FBQ3pCLE9BQU8sR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELElBQUksd0JBQXdCO1FBQzNCLE9BQU8sR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUtELElBQUksVUFBVTtRQUNiLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEgsQ0FBQztJQUVELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDN0IsQ0FBQztJQUVELHlCQUF5QixLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUVqRCxLQUFLO1FBQ0osSUFBSSxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDekQsQ0FBQztJQUVELFlBQ3FCLGtCQUE4QztRQUF0Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBMUMxRCw2QkFBd0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3RDLCtCQUEwQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDeEMseUJBQW9CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUNsQywrQkFBMEIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3hDLHNCQUFpQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFvQi9CLHdCQUFtQixHQUFzQixFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQ3JFLDBCQUFxQixHQUFzQixFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBa0I1RSxDQUFDO0NBRUwsQ0FBQTtBQWhESyx1QkFBdUI7SUE2QzFCLFdBQUEsa0JBQWtCLENBQUE7R0E3Q2YsdUJBQXVCLENBZ0Q1QjtBQUVNLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsdUJBQXVCO0lBQ3JFLElBQWEsYUFBYTtRQUN6QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUNELFlBQ1MsVUFBdUIsRUFDWCxpQkFBcUM7UUFFekQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFIakIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUloQyxDQUFDO0NBQ0QsQ0FBQTtBQVZZLHlCQUF5QjtJQU1uQyxXQUFBLGtCQUFrQixDQUFBO0dBTlIseUJBQXlCLENBVXJDOztBQUVELGlCQUFpQixDQUFDLGNBQWMsRUFBRSx1QkFBdUIsb0NBQTRCLENBQUMifQ==