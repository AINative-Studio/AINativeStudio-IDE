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
import * as DOM from '../../../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../../../base/browser/keyboardEvent.js';
import { SimpleIconLabel } from '../../../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { toErrorMessage } from '../../../../../../base/common/errorMessage.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { stripIcons } from '../../../../../../base/common/iconLabels.js';
import { Disposable, DisposableStore, dispose } from '../../../../../../base/common/lifecycle.js';
import { isThemeColor } from '../../../../../../editor/common/editorCommon.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { CellFocusMode } from '../../notebookBrowser.js';
import { CellContentPart } from '../cellPart.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
const $ = DOM.$;
let CellEditorStatusBar = class CellEditorStatusBar extends CellContentPart {
    constructor(_notebookEditor, _cellContainer, editorPart, _editor, _instantiationService, hoverService, configurationService, _themeService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._cellContainer = _cellContainer;
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._themeService = _themeService;
        this.leftItems = [];
        this.rightItems = [];
        this.width = 0;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this.statusBarContainer = DOM.append(editorPart, $('.cell-statusbar-container'));
        this.statusBarContainer.tabIndex = -1;
        const leftItemsContainer = DOM.append(this.statusBarContainer, $('.cell-status-left'));
        const rightItemsContainer = DOM.append(this.statusBarContainer, $('.cell-status-right'));
        this.leftItemsContainer = DOM.append(leftItemsContainer, $('.cell-contributed-items.cell-contributed-items-left'));
        this.rightItemsContainer = DOM.append(rightItemsContainer, $('.cell-contributed-items.cell-contributed-items-right'));
        this.itemsDisposable = this._register(new DisposableStore());
        this.hoverDelegate = new class {
            constructor() {
                this._lastHoverHideTime = 0;
                this.showHover = (options) => {
                    options.position = options.position ?? {};
                    options.position.hoverPosition = 3 /* HoverPosition.ABOVE */;
                    return hoverService.showInstantHover(options);
                };
                this.placement = 'element';
            }
            get delay() {
                return Date.now() - this._lastHoverHideTime < 200
                    ? 0 // show instantly when a hover was recently shown
                    : configurationService.getValue('workbench.hover.delay');
            }
            onDidHideHover() {
                this._lastHoverHideTime = Date.now();
            }
        };
        this._register(this._themeService.onDidColorThemeChange(() => this.currentContext && this.updateContext(this.currentContext)));
        this._register(DOM.addDisposableListener(this.statusBarContainer, DOM.EventType.CLICK, e => {
            if (e.target === leftItemsContainer || e.target === rightItemsContainer || e.target === this.statusBarContainer) {
                // hit on empty space
                this._onDidClick.fire({
                    type: 0 /* ClickTargetType.Container */,
                    event: e
                });
            }
            else {
                const target = e.target;
                let itemHasCommand = false;
                if (target && DOM.isHTMLElement(target)) {
                    const targetElement = target;
                    if (targetElement.classList.contains('cell-status-item-has-command')) {
                        itemHasCommand = true;
                    }
                    else if (targetElement.parentElement && targetElement.parentElement.classList.contains('cell-status-item-has-command')) {
                        itemHasCommand = true;
                    }
                }
                if (itemHasCommand) {
                    this._onDidClick.fire({
                        type: 2 /* ClickTargetType.ContributedCommandItem */,
                        event: e
                    });
                }
                else {
                    // text
                    this._onDidClick.fire({
                        type: 1 /* ClickTargetType.ContributedTextItem */,
                        event: e
                    });
                }
            }
        }));
    }
    didRenderCell(element) {
        if (this._notebookEditor.hasModel()) {
            const context = {
                ui: true,
                cell: element,
                notebookEditor: this._notebookEditor,
                $mid: 13 /* MarshalledId.NotebookCellActionContext */
            };
            this.updateContext(context);
        }
        if (this._editor) {
            // Focus Mode
            const updateFocusModeForEditorEvent = () => {
                if (this._editor && (this._editor.hasWidgetFocus() || (this.statusBarContainer.ownerDocument.activeElement && this.statusBarContainer.contains(this.statusBarContainer.ownerDocument.activeElement)))) {
                    element.focusMode = CellFocusMode.Editor;
                }
                else {
                    const currentMode = element.focusMode;
                    if (currentMode === CellFocusMode.ChatInput) {
                        element.focusMode = CellFocusMode.ChatInput;
                    }
                    else if (currentMode === CellFocusMode.Output && this._notebookEditor.hasWebviewFocus()) {
                        element.focusMode = CellFocusMode.Output;
                    }
                    else {
                        element.focusMode = CellFocusMode.Container;
                    }
                }
            };
            this.cellDisposables.add(this._editor.onDidFocusEditorWidget(() => {
                updateFocusModeForEditorEvent();
            }));
            this.cellDisposables.add(this._editor.onDidBlurEditorWidget(() => {
                // this is for a special case:
                // users click the status bar empty space, which we will then focus the editor
                // so we don't want to update the focus state too eagerly, it will be updated with onDidFocusEditorWidget
                if (this._notebookEditor.hasEditorFocus() &&
                    !(this.statusBarContainer.ownerDocument.activeElement && this.statusBarContainer.contains(this.statusBarContainer.ownerDocument.activeElement))) {
                    updateFocusModeForEditorEvent();
                }
            }));
            // Mouse click handlers
            this.cellDisposables.add(this.onDidClick(e => {
                if (this.currentCell instanceof CodeCellViewModel && e.type !== 2 /* ClickTargetType.ContributedCommandItem */ && this._editor) {
                    const target = this._editor.getTargetAtClientPoint(e.event.clientX, e.event.clientY - this._notebookEditor.notebookOptions.computeEditorStatusbarHeight(this.currentCell.internalMetadata, this.currentCell.uri));
                    if (target?.position) {
                        this._editor.setPosition(target.position);
                        this._editor.focus();
                    }
                }
            }));
        }
    }
    updateInternalLayoutNow(element) {
        // todo@rebornix layer breaker
        this._cellContainer.classList.toggle('cell-statusbar-hidden', this._notebookEditor.notebookOptions.computeEditorStatusbarHeight(element.internalMetadata, element.uri) === 0);
        const layoutInfo = element.layoutInfo;
        const width = layoutInfo.editorWidth;
        if (!width) {
            return;
        }
        this.width = width;
        this.statusBarContainer.style.width = `${width}px`;
        const maxItemWidth = this.getMaxItemWidth();
        this.leftItems.forEach(item => item.maxWidth = maxItemWidth);
        this.rightItems.forEach(item => item.maxWidth = maxItemWidth);
    }
    getMaxItemWidth() {
        return this.width / 2;
    }
    updateContext(context) {
        this.currentContext = context;
        this.itemsDisposable.clear();
        if (!this.currentContext) {
            return;
        }
        this.itemsDisposable.add(this.currentContext.cell.onDidChangeLayout(() => {
            if (this.currentContext) {
                this.updateInternalLayoutNow(this.currentContext.cell);
            }
        }));
        this.itemsDisposable.add(this.currentContext.cell.onDidChangeCellStatusBarItems(() => this.updateRenderedItems()));
        this.itemsDisposable.add(this.currentContext.notebookEditor.onDidChangeActiveCell(() => this.updateActiveCell()));
        this.updateInternalLayoutNow(this.currentContext.cell);
        this.updateActiveCell();
        this.updateRenderedItems();
    }
    updateActiveCell() {
        const isActiveCell = this.currentContext.notebookEditor.getActiveCell() === this.currentContext?.cell;
        this.statusBarContainer.classList.toggle('is-active-cell', isActiveCell);
    }
    updateRenderedItems() {
        const items = this.currentContext.cell.getCellStatusBarItems();
        items.sort((itemA, itemB) => {
            return (itemB.priority ?? 0) - (itemA.priority ?? 0);
        });
        const maxItemWidth = this.getMaxItemWidth();
        const newLeftItems = items.filter(item => item.alignment === 1 /* CellStatusbarAlignment.Left */);
        const newRightItems = items.filter(item => item.alignment === 2 /* CellStatusbarAlignment.Right */).reverse();
        const updateItems = (renderedItems, newItems, container) => {
            if (renderedItems.length > newItems.length) {
                const deleted = renderedItems.splice(newItems.length, renderedItems.length - newItems.length);
                for (const deletedItem of deleted) {
                    deletedItem.container.remove();
                    deletedItem.dispose();
                }
            }
            newItems.forEach((newLeftItem, i) => {
                const existingItem = renderedItems[i];
                if (existingItem) {
                    existingItem.updateItem(newLeftItem, maxItemWidth);
                }
                else {
                    const item = this._instantiationService.createInstance(CellStatusBarItem, this.currentContext, this.hoverDelegate, this._editor, newLeftItem, maxItemWidth);
                    renderedItems.push(item);
                    container.appendChild(item.container);
                }
            });
        };
        updateItems(this.leftItems, newLeftItems, this.leftItemsContainer);
        updateItems(this.rightItems, newRightItems, this.rightItemsContainer);
    }
    dispose() {
        super.dispose();
        dispose(this.leftItems);
        dispose(this.rightItems);
    }
};
CellEditorStatusBar = __decorate([
    __param(4, IInstantiationService),
    __param(5, IHoverService),
    __param(6, IConfigurationService),
    __param(7, IThemeService)
], CellEditorStatusBar);
export { CellEditorStatusBar };
let CellStatusBarItem = class CellStatusBarItem extends Disposable {
    set maxWidth(v) {
        this.container.style.maxWidth = v + 'px';
    }
    constructor(_context, _hoverDelegate, _editor, itemModel, maxWidth, _telemetryService, _commandService, _notificationService, _themeService, _hoverService) {
        super();
        this._context = _context;
        this._hoverDelegate = _hoverDelegate;
        this._editor = _editor;
        this._telemetryService = _telemetryService;
        this._commandService = _commandService;
        this._notificationService = _notificationService;
        this._themeService = _themeService;
        this._hoverService = _hoverService;
        this.container = $('.cell-status-item');
        this._itemDisposables = this._register(new DisposableStore());
        this.updateItem(itemModel, maxWidth);
    }
    updateItem(item, maxWidth) {
        this._itemDisposables.clear();
        if (!this._currentItem || this._currentItem.text !== item.text) {
            this._itemDisposables.add(new SimpleIconLabel(this.container)).text = item.text.replace(/\n/g, ' ');
        }
        const resolveColor = (color) => {
            return isThemeColor(color) ?
                (this._themeService.getColorTheme().getColor(color.id)?.toString() || '') :
                color;
        };
        this.container.style.color = item.color ? resolveColor(item.color) : '';
        this.container.style.backgroundColor = item.backgroundColor ? resolveColor(item.backgroundColor) : '';
        this.container.style.opacity = item.opacity ? item.opacity : '';
        this.container.classList.toggle('cell-status-item-show-when-active', !!item.onlyShowWhenActive);
        if (typeof maxWidth === 'number') {
            this.maxWidth = maxWidth;
        }
        let ariaLabel;
        let role;
        if (item.accessibilityInformation) {
            ariaLabel = item.accessibilityInformation.label;
            role = item.accessibilityInformation.role;
        }
        else {
            ariaLabel = item.text ? stripIcons(item.text).trim() : '';
        }
        this.container.setAttribute('aria-label', ariaLabel);
        this.container.setAttribute('role', role || '');
        if (item.tooltip) {
            const hoverContent = typeof item.tooltip === 'string' ? item.tooltip : { markdown: item.tooltip, markdownNotSupportedFallback: undefined };
            this._itemDisposables.add(this._hoverService.setupManagedHover(this._hoverDelegate, this.container, hoverContent));
        }
        this.container.classList.toggle('cell-status-item-has-command', !!item.command);
        if (item.command) {
            this.container.tabIndex = 0;
            this._itemDisposables.add(DOM.addDisposableListener(this.container, DOM.EventType.CLICK, _e => {
                this.executeCommand();
            }));
            this._itemDisposables.add(DOM.addDisposableListener(this.container, DOM.EventType.KEY_DOWN, e => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */)) {
                    this.executeCommand();
                }
            }));
        }
        else {
            this.container.removeAttribute('tabIndex');
        }
        this._currentItem = item;
    }
    async executeCommand() {
        const command = this._currentItem.command;
        if (!command) {
            return;
        }
        const id = typeof command === 'string' ? command : command.id;
        const args = typeof command === 'string' ? [] : command.arguments ?? [];
        if (typeof command === 'string' || !command.arguments || !Array.isArray(command.arguments) || command.arguments.length === 0) {
            args.unshift(this._context);
        }
        this._telemetryService.publicLog2('workbenchActionExecuted', { id, from: 'cell status bar' });
        try {
            this._editor?.focus();
            await this._commandService.executeCommand(id, ...args);
        }
        catch (error) {
            this._notificationService.error(toErrorMessage(error));
        }
    }
};
CellStatusBarItem = __decorate([
    __param(5, ITelemetryService),
    __param(6, ICommandService),
    __param(7, INotificationService),
    __param(8, IThemeService),
    __param(9, IHoverService)
], CellStatusBarItem);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFN0YXR1c1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsU3RhdHVzUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFDO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUVqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUdsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUd4RixPQUFPLEVBQUUsYUFBYSxFQUEyQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVB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