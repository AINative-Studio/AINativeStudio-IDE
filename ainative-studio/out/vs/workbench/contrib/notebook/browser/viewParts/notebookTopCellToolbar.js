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
import * as DOM from '../../../../../base/browser/dom.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { CodiconActionViewItem } from '../view/cellParts/cellActionView.js';
let ListTopCellToolbar = class ListTopCellToolbar extends Disposable {
    constructor(notebookEditor, notebookOptions, instantiationService, contextMenuService, menuService) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookOptions = notebookOptions;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.menuService = menuService;
        this.viewZone = this._register(new MutableDisposable());
        this._modelDisposables = this._register(new DisposableStore());
        this.topCellToolbarContainer = DOM.$('div');
        this.topCellToolbar = DOM.$('.cell-list-top-cell-toolbar-container');
        this.topCellToolbarContainer.appendChild(this.topCellToolbar);
        this._register(this.notebookEditor.onDidAttachViewModel(() => {
            this.updateTopToolbar();
        }));
        this._register(this.notebookOptions.onDidChangeOptions(e => {
            if (e.insertToolbarAlignment || e.insertToolbarPosition || e.cellToolbarLocation) {
                this.updateTopToolbar();
            }
        }));
    }
    updateTopToolbar() {
        const layoutInfo = this.notebookOptions.getLayoutConfiguration();
        this.viewZone.value = new DisposableStore();
        if (layoutInfo.insertToolbarPosition === 'hidden' || layoutInfo.insertToolbarPosition === 'notebookToolbar') {
            const height = this.notebookOptions.computeTopInsertToolbarHeight(this.notebookEditor.textModel?.viewType);
            if (height !== 0) {
                // reserve whitespace to avoid overlap with cell toolbar
                this.notebookEditor.changeViewZones(accessor => {
                    const id = accessor.addZone({
                        afterModelPosition: 0,
                        heightInPx: height,
                        domNode: DOM.$('div')
                    });
                    accessor.layoutZone(id);
                    this.viewZone.value?.add({
                        dispose: () => {
                            if (!this.notebookEditor.isDisposed) {
                                this.notebookEditor.changeViewZones(accessor => {
                                    accessor.removeZone(id);
                                });
                            }
                        }
                    });
                });
            }
            return;
        }
        this.notebookEditor.changeViewZones(accessor => {
            const height = this.notebookOptions.computeTopInsertToolbarHeight(this.notebookEditor.textModel?.viewType);
            const id = accessor.addZone({
                afterModelPosition: 0,
                heightInPx: height,
                domNode: this.topCellToolbarContainer
            });
            accessor.layoutZone(id);
            this.viewZone.value?.add({
                dispose: () => {
                    if (!this.notebookEditor.isDisposed) {
                        this.notebookEditor.changeViewZones(accessor => {
                            accessor.removeZone(id);
                        });
                    }
                }
            });
            DOM.clearNode(this.topCellToolbar);
            const toolbar = this.instantiationService.createInstance(MenuWorkbenchToolBar, this.topCellToolbar, this.notebookEditor.creationOptions.menuIds.cellTopInsertToolbar, {
                actionViewItemProvider: (action, options) => {
                    if (action instanceof MenuItemAction) {
                        const item = this.instantiationService.createInstance(CodiconActionViewItem, action, { hoverDelegate: options.hoverDelegate });
                        return item;
                    }
                    return undefined;
                },
                menuOptions: {
                    shouldForwardArgs: true
                },
                toolbarOptions: {
                    primaryGroup: (g) => /^inline/.test(g),
                },
                hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            });
            if (this.notebookEditor.hasModel()) {
                toolbar.context = {
                    notebookEditor: this.notebookEditor
                };
            }
            this.viewZone.value?.add(toolbar);
            // update toolbar container css based on cell list length
            this.viewZone.value?.add(this.notebookEditor.onDidChangeModel(() => {
                this._modelDisposables.clear();
                if (this.notebookEditor.hasModel()) {
                    this._modelDisposables.add(this.notebookEditor.onDidChangeViewCells(() => {
                        this.updateClass();
                    }));
                    this.updateClass();
                }
            }));
            this.updateClass();
        });
    }
    updateClass() {
        if (this.notebookEditor.hasModel() && this.notebookEditor.getLength() === 0) {
            this.topCellToolbar.classList.add('emptyNotebook');
        }
        else {
            this.topCellToolbar.classList.remove('emptyNotebook');
        }
    }
};
ListTopCellToolbar = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IMenuService)
], ListTopCellToolbar);
export { ListTopCellToolbar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tUb3BDZWxsVG9vbGJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va1RvcENlbGxUb29sYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RyxPQUFPLEVBQXNCLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUcsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUl0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVyRSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFLakQsWUFDb0IsY0FBdUMsRUFDekMsZUFBZ0MsRUFDMUIsb0JBQThELEVBQ2hFLGtCQUEwRCxFQUNqRSxXQUE0QztRQUUxRCxLQUFLLEVBQUUsQ0FBQztRQU5XLG1CQUFjLEdBQWQsY0FBYyxDQUF5QjtRQUN6QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDUCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzdDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDOUMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFQMUMsYUFBUSxHQUF1QyxJQUFJ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