/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../base/common/keyCodes.js';
import { KeybindingsRegistry } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { List } from '../../../base/browser/ui/list/listWidget.js';
import { WorkbenchListFocusContextKey, IListService, WorkbenchListSupportsMultiSelectContextKey, WorkbenchListHasSelectionOrFocus, getSelectionKeyboardEvent, WorkbenchListSelectionNavigation, WorkbenchTreeElementCanCollapse, WorkbenchTreeElementHasParent, WorkbenchTreeElementHasChild, WorkbenchTreeElementCanExpand, RawWorkbenchListFocusContextKey, WorkbenchTreeFindOpen, WorkbenchListSupportsFind, WorkbenchListScrollAtBottomContextKey, WorkbenchListScrollAtTopContextKey, WorkbenchTreeStickyScrollFocused } from '../../../platform/list/browser/listService.js';
import { PagedList } from '../../../base/browser/ui/list/listPaging.js';
import { equals, range } from '../../../base/common/arrays.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { ObjectTree } from '../../../base/browser/ui/tree/objectTree.js';
import { AsyncDataTree } from '../../../base/browser/ui/tree/asyncDataTree.js';
import { DataTree } from '../../../base/browser/ui/tree/dataTree.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { Table } from '../../../base/browser/ui/table/tableWidget.js';
import { AbstractTree, TreeFindMatchType, TreeFindMode } from '../../../base/browser/ui/tree/abstractTree.js';
import { isActiveElement } from '../../../base/browser/dom.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { localize, localize2 } from '../../../nls.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
function ensureDOMFocus(widget) {
    // it can happen that one of the commands is executed while
    // DOM focus is within another focusable control within the
    // list/tree item. therefor we should ensure that the
    // list/tree has DOM focus again after the command ran.
    const element = widget?.getHTMLElement();
    if (element && !isActiveElement(element)) {
        widget?.domFocus();
    }
}
async function updateFocus(widget, updateFocusFn) {
    if (!WorkbenchListSelectionNavigation.getValue(widget.contextKeyService)) {
        return updateFocusFn(widget);
    }
    const focus = widget.getFocus();
    const selection = widget.getSelection();
    await updateFocusFn(widget);
    const newFocus = widget.getFocus();
    if (selection.length > 1 || !equals(focus, selection) || equals(focus, newFocus)) {
        return;
    }
    const fakeKeyboardEvent = new KeyboardEvent('keydown');
    widget.setSelection(newFocus, fakeKeyboardEvent);
}
async function navigate(widget, updateFocusFn) {
    if (!widget) {
        return;
    }
    await updateFocus(widget, updateFocusFn);
    const listFocus = widget.getFocus();
    if (listFocus.length) {
        widget.reveal(listFocus[0]);
    }
    widget.setAnchor(listFocus[0]);
    ensureDOMFocus(widget);
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 18 /* KeyCode.DownArrow */,
    mac: {
        primary: 18 /* KeyCode.DownArrow */,
        secondary: [256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */]
    },
    handler: (accessor, arg2) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusNext(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 16 /* KeyCode.UpArrow */,
    mac: {
        primary: 16 /* KeyCode.UpArrow */,
        secondary: [256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */]
    },
    handler: (accessor, arg2) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusPrevious(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusAnyDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
        secondary: [256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 44 /* KeyCode.KeyN */]
    },
    handler: (accessor, arg2) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown', { altKey: true });
            await widget.focusNext(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusAnyUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
        secondary: [256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 46 /* KeyCode.KeyP */]
    },
    handler: (accessor, arg2) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown', { altKey: true });
            await widget.focusPrevious(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusPageDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 12 /* KeyCode.PageDown */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusNextPage(fakeKeyboardEvent);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusPageUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 11 /* KeyCode.PageUp */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusPreviousPage(fakeKeyboardEvent);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusFirst',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 14 /* KeyCode.Home */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusFirst(fakeKeyboardEvent);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusLast',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 13 /* KeyCode.End */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusLast(fakeKeyboardEvent);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusAnyFirst',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 512 /* KeyMod.Alt */ | 14 /* KeyCode.Home */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown', { altKey: true });
            await widget.focusFirst(fakeKeyboardEvent);
        });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusAnyLast',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 512 /* KeyMod.Alt */ | 13 /* KeyCode.End */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown', { altKey: true });
            await widget.focusLast(fakeKeyboardEvent);
        });
    }
});
function expandMultiSelection(focused, previousFocus) {
    // List
    if (focused instanceof List || focused instanceof PagedList || focused instanceof Table) {
        const list = focused;
        const focus = list.getFocus() ? list.getFocus()[0] : undefined;
        const selection = list.getSelection();
        if (selection && typeof focus === 'number' && selection.indexOf(focus) >= 0) {
            list.setSelection(selection.filter(s => s !== previousFocus));
        }
        else {
            if (typeof focus === 'number') {
                list.setSelection(selection.concat(focus));
            }
        }
    }
    // Tree
    else if (focused instanceof ObjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
        const list = focused;
        const focus = list.getFocus() ? list.getFocus()[0] : undefined;
        if (previousFocus === focus) {
            return;
        }
        const selection = list.getSelection();
        const fakeKeyboardEvent = new KeyboardEvent('keydown', { shiftKey: true });
        if (selection && selection.indexOf(focus) >= 0) {
            list.setSelection(selection.filter(s => s !== previousFocus), fakeKeyboardEvent);
        }
        else {
            list.setSelection(selection.concat(focus), fakeKeyboardEvent);
        }
    }
}
function revealFocusedStickyScroll(tree, postRevealAction) {
    const focus = tree.getStickyScrollFocus();
    if (focus.length === 0) {
        throw new Error(`StickyScroll has no focus`);
    }
    if (focus.length > 1) {
        throw new Error(`StickyScroll can only have a single focused item`);
    }
    tree.reveal(focus[0]);
    tree.getHTMLElement().focus(); // domfocus() would focus stiky scroll dom and not the tree todo@benibenj
    tree.setFocus(focus);
    postRevealAction?.(focus[0]);
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.expandSelectionDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListSupportsMultiSelectContextKey),
    primary: 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
    handler: (accessor, arg2) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        // Focus down first
        const previousFocus = widget.getFocus() ? widget.getFocus()[0] : undefined;
        const fakeKeyboardEvent = new KeyboardEvent('keydown');
        widget.focusNext(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        // Then adjust selection
        expandMultiSelection(widget, previousFocus);
        const focus = widget.getFocus();
        if (focus.length) {
            widget.reveal(focus[0]);
        }
        ensureDOMFocus(widget);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.expandSelectionUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListSupportsMultiSelectContextKey),
    primary: 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
    handler: (accessor, arg2) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        // Focus up first
        const previousFocus = widget.getFocus() ? widget.getFocus()[0] : undefined;
        const fakeKeyboardEvent = new KeyboardEvent('keydown');
        widget.focusPrevious(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        // Then adjust selection
        expandMultiSelection(widget, previousFocus);
        const focus = widget.getFocus();
        if (focus.length) {
            widget.reveal(focus[0]);
        }
        ensureDOMFocus(widget);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.collapse',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, ContextKeyExpr.or(WorkbenchTreeElementCanCollapse, WorkbenchTreeElementHasParent)),
    primary: 15 /* KeyCode.LeftArrow */,
    mac: {
        primary: 15 /* KeyCode.LeftArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */]
    },
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget || !(widget instanceof ObjectTree || widget instanceof DataTree || widget instanceof AsyncDataTree)) {
            return;
        }
        const tree = widget;
        const focusedElements = tree.getFocus();
        if (focusedElements.length === 0) {
            return;
        }
        const focus = focusedElements[0];
        if (!tree.collapse(focus)) {
            const parent = tree.getParentElement(focus);
            if (parent) {
                navigate(widget, widget => {
                    const fakeKeyboardEvent = new KeyboardEvent('keydown');
                    widget.setFocus([parent], fakeKeyboardEvent);
                });
            }
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.stickyScroll.collapse',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    when: WorkbenchTreeStickyScrollFocused,
    primary: 15 /* KeyCode.LeftArrow */,
    mac: {
        primary: 15 /* KeyCode.LeftArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */]
    },
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget || !(widget instanceof ObjectTree || widget instanceof DataTree || widget instanceof AsyncDataTree)) {
            return;
        }
        revealFocusedStickyScroll(widget, focus => widget.collapse(focus));
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.collapseAll',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */]
    },
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (focused && !(focused instanceof List || focused instanceof PagedList || focused instanceof Table)) {
            focused.collapseAll();
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.collapseAllToFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: accessor => {
        const focused = accessor.get(IListService).lastFocusedList;
        const fakeKeyboardEvent = getSelectionKeyboardEvent('keydown', true);
        // Trees
        if (focused instanceof ObjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
            const tree = focused;
            const focus = tree.getFocus();
            if (focus.length > 0) {
                tree.collapse(focus[0], true);
            }
            tree.setSelection(focus, fakeKeyboardEvent);
            tree.setAnchor(focus[0]);
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusParent',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget || !(widget instanceof ObjectTree || widget instanceof DataTree || widget instanceof AsyncDataTree)) {
            return;
        }
        const tree = widget;
        const focusedElements = tree.getFocus();
        if (focusedElements.length === 0) {
            return;
        }
        const focus = focusedElements[0];
        const parent = tree.getParentElement(focus);
        if (parent) {
            navigate(widget, widget => {
                const fakeKeyboardEvent = new KeyboardEvent('keydown');
                widget.setFocus([parent], fakeKeyboardEvent);
            });
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.expand',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, ContextKeyExpr.or(WorkbenchTreeElementCanExpand, WorkbenchTreeElementHasChild)),
    primary: 17 /* KeyCode.RightArrow */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        if (widget instanceof ObjectTree || widget instanceof DataTree) {
            // TODO@Joao: instead of doing this here, just delegate to a tree method
            const focusedElements = widget.getFocus();
            if (focusedElements.length === 0) {
                return;
            }
            const focus = focusedElements[0];
            if (!widget.expand(focus)) {
                const child = widget.getFirstElementChild(focus);
                if (child) {
                    const node = widget.getNode(child);
                    if (node.visible) {
                        navigate(widget, widget => {
                            const fakeKeyboardEvent = new KeyboardEvent('keydown');
                            widget.setFocus([child], fakeKeyboardEvent);
                        });
                    }
                }
            }
        }
        else if (widget instanceof AsyncDataTree) {
            // TODO@Joao: instead of doing this here, just delegate to a tree method
            const focusedElements = widget.getFocus();
            if (focusedElements.length === 0) {
                return;
            }
            const focus = focusedElements[0];
            widget.expand(focus).then(didExpand => {
                if (focus && !didExpand) {
                    const child = widget.getFirstElementChild(focus);
                    if (child) {
                        const node = widget.getNode(child);
                        if (node.visible) {
                            navigate(widget, widget => {
                                const fakeKeyboardEvent = new KeyboardEvent('keydown');
                                widget.setFocus([child], fakeKeyboardEvent);
                            });
                        }
                    }
                }
            });
        }
    }
});
function selectElement(accessor, retainCurrentFocus) {
    const focused = accessor.get(IListService).lastFocusedList;
    const fakeKeyboardEvent = getSelectionKeyboardEvent('keydown', retainCurrentFocus);
    // List
    if (focused instanceof List || focused instanceof PagedList || focused instanceof Table) {
        const list = focused;
        list.setAnchor(list.getFocus()[0]);
        list.setSelection(list.getFocus(), fakeKeyboardEvent);
    }
    // Trees
    else if (focused instanceof ObjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
        const tree = focused;
        const focus = tree.getFocus();
        if (focus.length > 0) {
            let toggleCollapsed = true;
            if (tree.expandOnlyOnTwistieClick === true) {
                toggleCollapsed = false;
            }
            else if (typeof tree.expandOnlyOnTwistieClick !== 'boolean' && tree.expandOnlyOnTwistieClick(focus[0])) {
                toggleCollapsed = false;
            }
            if (toggleCollapsed) {
                tree.toggleCollapsed(focus[0]);
            }
        }
        tree.setAnchor(focus[0]);
        tree.setSelection(focus, fakeKeyboardEvent);
    }
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.select',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */]
    },
    handler: (accessor) => {
        selectElement(accessor, false);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.stickyScrollselect',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50, // priorities over file explorer
    when: WorkbenchTreeStickyScrollFocused,
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */]
    },
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget || !(widget instanceof ObjectTree || widget instanceof DataTree || widget instanceof AsyncDataTree)) {
            return;
        }
        revealFocusedStickyScroll(widget, focus => widget.setSelection([focus]));
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.selectAndPreserveFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: accessor => {
        selectElement(accessor, true);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.selectAll',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListSupportsMultiSelectContextKey),
    primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */,
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        // List
        if (focused instanceof List || focused instanceof PagedList || focused instanceof Table) {
            const list = focused;
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            list.setSelection(range(list.length), fakeKeyboardEvent);
        }
        // Trees
        else if (focused instanceof ObjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
            const tree = focused;
            const focus = tree.getFocus();
            const selection = tree.getSelection();
            // Which element should be considered to start selecting all?
            let start = undefined;
            if (focus.length > 0 && (selection.length === 0 || !selection.includes(focus[0]))) {
                start = focus[0];
            }
            if (!start && selection.length > 0) {
                start = selection[0];
            }
            // What is the scope of select all?
            let scope = undefined;
            if (!start) {
                scope = undefined;
            }
            else {
                scope = tree.getParentElement(start);
            }
            const newSelection = [];
            const visit = (node) => {
                for (const child of node.children) {
                    if (child.visible) {
                        newSelection.push(child.element);
                        if (!child.collapsed) {
                            visit(child);
                        }
                    }
                }
            };
            // Add the whole scope subtree to the new selection
            visit(tree.getNode(scope));
            // If the scope isn't the tree root, it should be part of the new selection
            if (scope && selection.length === newSelection.length) {
                newSelection.unshift(scope);
            }
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            tree.setSelection(newSelection, fakeKeyboardEvent);
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.toggleSelection',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        const focus = widget.getFocus();
        if (focus.length === 0) {
            return;
        }
        const selection = widget.getSelection();
        const index = selection.indexOf(focus[0]);
        if (index > -1) {
            widget.setSelection([...selection.slice(0, index), ...selection.slice(index + 1)]);
        }
        else {
            widget.setSelection([...selection, focus[0]]);
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.showHover',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
    when: WorkbenchListFocusContextKey,
    handler: async (accessor, ...args) => {
        const listService = accessor.get(IListService);
        const lastFocusedList = listService.lastFocusedList;
        if (!lastFocusedList) {
            return;
        }
        // Check if a tree element is focused
        const focus = lastFocusedList.getFocus();
        if (!focus || (focus.length === 0)) {
            return;
        }
        // As the tree does not know anything about the rendered DOM elements
        // we have to traverse the dom to find the HTMLElements
        const treeDOM = lastFocusedList.getHTMLElement();
        const scrollableElement = treeDOM.querySelector('.monaco-scrollable-element');
        const listRows = scrollableElement?.querySelector('.monaco-list-rows');
        const focusedElement = listRows?.querySelector('.focused');
        if (!focusedElement) {
            return;
        }
        const elementWithHover = getCustomHoverForElement(focusedElement);
        if (elementWithHover) {
            accessor.get(IHoverService).showManagedHover(elementWithHover);
        }
    },
});
function getCustomHoverForElement(element) {
    // Check if the element itself has a hover
    if (element.matches('[custom-hover="true"]')) {
        return element;
    }
    // Only consider children that are not action items or have a tabindex
    // as these element are focusable and the user is able to trigger them already
    const noneFocusableElementWithHover = element.querySelector('[custom-hover="true"]:not([tabindex]):not(.action-item)');
    if (noneFocusableElementWithHover) {
        return noneFocusableElementWithHover;
    }
    return undefined;
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.toggleExpand',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 10 /* KeyCode.Space */,
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        // Tree only
        if (focused instanceof ObjectTree || focused instanceof DataTree || focused instanceof AsyncDataTree) {
            const tree = focused;
            const focus = tree.getFocus();
            if (focus.length > 0 && tree.isCollapsible(focus[0])) {
                tree.toggleCollapsed(focus[0]);
                return;
            }
        }
        selectElement(accessor, true);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.stickyScrolltoggleExpand',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50, // priorities over file explorer
    when: WorkbenchTreeStickyScrollFocused,
    primary: 10 /* KeyCode.Space */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget || !(widget instanceof ObjectTree || widget instanceof DataTree || widget instanceof AsyncDataTree)) {
            return;
        }
        revealFocusedStickyScroll(widget);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.clear',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListHasSelectionOrFocus),
    primary: 9 /* KeyCode.Escape */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        const selection = widget.getSelection();
        const fakeKeyboardEvent = new KeyboardEvent('keydown');
        if (selection.length > 1) {
            const useSelectionNavigation = WorkbenchListSelectionNavigation.getValue(widget.contextKeyService);
            if (useSelectionNavigation) {
                const focus = widget.getFocus();
                widget.setSelection([focus[0]], fakeKeyboardEvent);
            }
            else {
                widget.setSelection([], fakeKeyboardEvent);
            }
        }
        else {
            widget.setSelection([], fakeKeyboardEvent);
            widget.setFocus([], fakeKeyboardEvent);
        }
        widget.setAnchor(undefined);
    }
});
CommandsRegistry.registerCommand({
    id: 'list.triggerTypeNavigation',
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        widget?.triggerTypeNavigation();
    }
});
CommandsRegistry.registerCommand({
    id: 'list.toggleFindMode',
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (widget instanceof AbstractTree || widget instanceof AsyncDataTree) {
            const tree = widget;
            tree.findMode = tree.findMode === TreeFindMode.Filter ? TreeFindMode.Highlight : TreeFindMode.Filter;
        }
    }
});
CommandsRegistry.registerCommand({
    id: 'list.toggleFindMatchType',
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (widget instanceof AbstractTree || widget instanceof AsyncDataTree) {
            const tree = widget;
            tree.findMatchType = tree.findMatchType === TreeFindMatchType.Contiguous ? TreeFindMatchType.Fuzzy : TreeFindMatchType.Contiguous;
        }
    }
});
// Deprecated commands
CommandsRegistry.registerCommandAlias('list.toggleKeyboardNavigation', 'list.triggerTypeNavigation');
CommandsRegistry.registerCommandAlias('list.toggleFilterOnType', 'list.toggleFindMode');
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.find',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(RawWorkbenchListFocusContextKey, WorkbenchListSupportsFind),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
    secondary: [61 /* KeyCode.F3 */],
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        // List
        if (widget instanceof List || widget instanceof PagedList || widget instanceof Table) {
            // TODO@joao
        }
        // Tree
        else if (widget instanceof AbstractTree || widget instanceof AsyncDataTree) {
            const tree = widget;
            tree.openFind();
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.closeFind',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(RawWorkbenchListFocusContextKey, WorkbenchTreeFindOpen),
    primary: 9 /* KeyCode.Escape */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (widget instanceof AbstractTree || widget instanceof AsyncDataTree) {
            const tree = widget;
            tree.closeFind();
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.scrollUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    // Since the default keybindings for list.scrollUp and widgetNavigation.focusPrevious
    // are both Ctrl+UpArrow, we disable this command when the scrollbar is at
    // top-most position. This will give chance for widgetNavigation.focusPrevious to execute
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListScrollAtTopContextKey?.negate()),
    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
    handler: accessor => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (!focused) {
            return;
        }
        focused.scrollTop -= 10;
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.scrollDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    // same as above
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListScrollAtBottomContextKey?.negate()),
    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
    handler: accessor => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (!focused) {
            return;
        }
        focused.scrollTop += 10;
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.scrollLeft',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: accessor => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (!focused) {
            return;
        }
        focused.scrollLeft -= 10;
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.scrollRight',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: accessor => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (!focused) {
            return;
        }
        focused.scrollLeft += 10;
    }
});
registerAction2(class ToggleStickyScroll extends Action2 {
    constructor() {
        super({
            id: 'tree.toggleStickyScroll',
            title: {
                ...localize2('toggleTreeStickyScroll', "Toggle Tree Sticky Scroll"),
                mnemonicTitle: localize({ key: 'mitoggleTreeStickyScroll', comment: ['&& denotes a mnemonic'] }, "&&Toggle Tree Sticky Scroll"),
            },
            category: 'View',
            metadata: { description: localize('toggleTreeStickyScrollDescription', "Toggles Sticky Scroll widget at the top of tree structures such as the File Explorer and Debug variables View.") },
            f1: true
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('workbench.tree.enableStickyScroll');
        configurationService.updateValue('workbench.tree.enableStickyScroll', newValue);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvbGlzdENvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBbUIsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsWUFBWSxFQUFFLDBDQUEwQyxFQUFjLGdDQUFnQyxFQUFFLHlCQUF5QixFQUF1QixnQ0FBZ0MsRUFBRSwrQkFBK0IsRUFBRSw2QkFBNkIsRUFBRSw0QkFBNEIsRUFBRSw2QkFBNkIsRUFBRSwrQkFBK0IsRUFBRSxxQkFBcUIsRUFBRSx5QkFBeUIsRUFBRSxxQ0FBcUMsRUFBRSxrQ0FBa0MsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3BsQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFF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