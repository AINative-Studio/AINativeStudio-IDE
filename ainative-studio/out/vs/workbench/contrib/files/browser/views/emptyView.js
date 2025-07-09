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
var EmptyView_1;
import * as nls from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { isTemporaryWorkspace, IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { ResourcesDropHandler } from '../../../../browser/dnd.js';
import { listDropOverBackground } from '../../../../../platform/theme/common/colorRegistry.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { DragAndDropObserver, getWindow } from '../../../../../base/browser/dom.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
let EmptyView = class EmptyView extends ViewPane {
    static { EmptyView_1 = this; }
    static { this.ID = 'workbench.explorer.emptyView'; }
    static { this.NAME = nls.localize2('noWorkspace', "No Folder Opened"); }
    constructor(options, themeService, viewDescriptorService, instantiationService, keybindingService, contextMenuService, contextService, configurationService, labelService, contextKeyService, openerService, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.contextService = contextService;
        this.labelService = labelService;
        this._disposed = false;
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.refreshTitle()));
        this._register(this.labelService.onDidChangeFormatters(() => this.refreshTitle()));
    }
    shouldShowWelcome() {
        return true;
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(new DragAndDropObserver(container, {
            onDrop: e => {
                container.style.backgroundColor = '';
                const dropHandler = this.instantiationService.createInstance(ResourcesDropHandler, { allowWorkspaceOpen: !isWeb || isTemporaryWorkspace(this.contextService.getWorkspace()) });
                dropHandler.handleDrop(e, getWindow(container));
            },
            onDragEnter: () => {
                const color = this.themeService.getColorTheme().getColor(listDropOverBackground);
                container.style.backgroundColor = color ? color.toString() : '';
            },
            onDragEnd: () => {
                container.style.backgroundColor = '';
            },
            onDragLeave: () => {
                container.style.backgroundColor = '';
            },
            onDragOver: e => {
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'copy';
                }
            }
        }));
        this.refreshTitle();
    }
    refreshTitle() {
        if (this._disposed) {
            return;
        }
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            this.updateTitle(EmptyView_1.NAME.value);
        }
        else {
            this.updateTitle(this.title);
        }
    }
    dispose() {
        this._disposed = true;
        super.dispose();
    }
};
EmptyView = EmptyView_1 = __decorate([
    __param(1, IThemeService),
    __param(2, IViewDescriptorService),
    __param(3, IInstantiationService),
    __param(4, IKeybindingService),
    __param(5, IContextMenuService),
    __param(6, IWorkspaceContextService),
    __param(7, IConfigurationService),
    __param(8, ILabelService),
    __param(9, IContextKeyService),
    __param(10, IOpenerService),
    __param(11, IHoverService)
], EmptyView);
export { EmptyView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvdmlld3MvZW1wdHlWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBRTdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsd0JBQXdCLEVBQWtCLE1BQU0sdURBQXVELENBQUM7QUFDdkksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFeEUsSUFBTSxTQUFTLEdBQWYsTUFBTSxTQUFVLFNBQVEsUUFBUTs7YUFFdEIsT0FBRSxHQUFXLDhCQUE4QixBQUF6QyxDQUEwQzthQUM1QyxTQUFJLEdBQXFCLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLEFBQXJFLENBQXNFO0lBRzFGLFlBQ0MsT0FBNEIsRUFDYixZQUEyQixFQUNsQixxQkFBNkMsRUFDOUMsb0JBQTJDLEVBQzlDLGlCQUFxQyxFQUNwQyxrQkFBdUMsRUFDbEMsY0FBeUQsRUFDNUQsb0JBQTJDLEVBQ25ELFlBQW1DLEVBQzlCLGlCQUFxQyxFQUN6QyxhQUE2QixFQUM5QixZQUEyQjtRQUUxQyxLQUFLLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFQNUksbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBRTVELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBWDNDLGNBQVMsR0FBWSxLQUFLLENBQUM7UUFrQmxDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFUSxpQkFBaUI7UUFDekIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRWtCLFVBQVUsQ0FBQyxTQUFzQjtRQUNuRCxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTVCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUU7WUFDakQsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUNYLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQztnQkFDckMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLGtCQUFrQixFQUFFLENBQUMsS0FBSyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQy9LLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2pELENBQUM7WUFDRCxXQUFXLEVBQUUsR0FBRyxFQUFFO2dCQUNqQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNqRixTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2pFLENBQUM7WUFDRCxTQUFTLEVBQUUsR0FBRyxFQUFFO2dCQUNmLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQztZQUN0QyxDQUFDO1lBQ0QsV0FBVyxFQUFFLEdBQUcsRUFBRTtnQkFDakIsU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1lBQ3RDLENBQUM7WUFDRCxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3BCLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQztnQkFDcEMsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRU8sWUFBWTtRQUNuQixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxxQ0FBNkIsRUFBRSxDQUFDO1lBQzFFLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDOztBQTFFVyxTQUFTO0lBUW5CLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxhQUFhLENBQUE7R0FsQkgsU0FBUyxDQTJFckIifQ==