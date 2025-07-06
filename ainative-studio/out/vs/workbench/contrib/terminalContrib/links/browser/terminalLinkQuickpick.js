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
import { EventType } from '../../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { localize } from '../../../../../nls.js';
import { IQuickInputService, QuickInputHideReason } from '../../../../../platform/quickinput/common/quickInput.js';
import { TerminalLinkQuickPickEvent } from '../../../terminal/browser/terminal.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Sequencer, timeout } from '../../../../../base/common/async.js';
import { PickerEditorState } from '../../../../browser/quickaccess.js';
import { getLinkSuffix } from './terminalLinkParsing.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { basenameOrAuthority, dirname } from '../../../../../base/common/resources.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IAccessibleViewService } from '../../../../../platform/accessibility/browser/accessibleView.js';
let TerminalLinkQuickpick = class TerminalLinkQuickpick extends DisposableStore {
    constructor(_accessibleViewService, instantiationService, _labelService, _quickInputService) {
        super();
        this._accessibleViewService = _accessibleViewService;
        this._labelService = _labelService;
        this._quickInputService = _quickInputService;
        this._editorSequencer = new Sequencer();
        this._onDidRequestMoreLinks = this.add(new Emitter());
        this.onDidRequestMoreLinks = this._onDidRequestMoreLinks.event;
        this._terminalScrollStateSaved = false;
        this._editorViewState = this.add(instantiationService.createInstance(PickerEditorState));
    }
    async show(instance, links) {
        this._instance = instance;
        // Allow all links a small amount of time to elapse to finish, if this is not done in this
        // time they will be loaded upon the first filter.
        const result = await Promise.race([links.all, timeout(500)]);
        const usingAllLinks = typeof result === 'object';
        const resolvedLinks = usingAllLinks ? result : links.viewport;
        // Get raw link picks
        const wordPicks = resolvedLinks.wordLinks ? await this._generatePicks(resolvedLinks.wordLinks) : undefined;
        const filePicks = resolvedLinks.fileLinks ? await this._generatePicks(resolvedLinks.fileLinks) : undefined;
        const folderPicks = resolvedLinks.folderLinks ? await this._generatePicks(resolvedLinks.folderLinks) : undefined;
        const webPicks = resolvedLinks.webLinks ? await this._generatePicks(resolvedLinks.webLinks) : undefined;
        const picks = [];
        if (webPicks) {
            picks.push({ type: 'separator', label: localize('terminal.integrated.urlLinks', "Url") });
            picks.push(...webPicks);
        }
        if (filePicks) {
            picks.push({ type: 'separator', label: localize('terminal.integrated.localFileLinks', "File") });
            picks.push(...filePicks);
        }
        if (folderPicks) {
            picks.push({ type: 'separator', label: localize('terminal.integrated.localFolderLinks', "Folder") });
            picks.push(...folderPicks);
        }
        if (wordPicks) {
            picks.push({ type: 'separator', label: localize('terminal.integrated.searchLinks', "Workspace Search") });
            picks.push(...wordPicks);
        }
        // Create and show quick pick
        const pick = this._quickInputService.createQuickPick({ useSeparators: true });
        const disposables = new DisposableStore();
        disposables.add(pick);
        pick.items = picks;
        pick.placeholder = localize('terminal.integrated.openDetectedLink', "Select the link to open, type to filter all links");
        pick.sortByLabel = false;
        pick.show();
        if (pick.activeItems.length > 0) {
            this._previewItem(pick.activeItems[0]);
        }
        // Show all results only when filtering begins, this is done so the quick pick will show up
        // ASAP with only the viewport entries.
        let accepted = false;
        if (!usingAllLinks) {
            disposables.add(Event.once(pick.onDidChangeValue)(async () => {
                const allLinks = await links.all;
                if (accepted) {
                    return;
                }
                const wordIgnoreLinks = [...(allLinks.fileLinks ?? []), ...(allLinks.folderLinks ?? []), ...(allLinks.webLinks ?? [])];
                const wordPicks = allLinks.wordLinks ? await this._generatePicks(allLinks.wordLinks, wordIgnoreLinks) : undefined;
                const filePicks = allLinks.fileLinks ? await this._generatePicks(allLinks.fileLinks) : undefined;
                const folderPicks = allLinks.folderLinks ? await this._generatePicks(allLinks.folderLinks) : undefined;
                const webPicks = allLinks.webLinks ? await this._generatePicks(allLinks.webLinks) : undefined;
                const picks = [];
                if (webPicks) {
                    picks.push({ type: 'separator', label: localize('terminal.integrated.urlLinks', "Url") });
                    picks.push(...webPicks);
                }
                if (filePicks) {
                    picks.push({ type: 'separator', label: localize('terminal.integrated.localFileLinks', "File") });
                    picks.push(...filePicks);
                }
                if (folderPicks) {
                    picks.push({ type: 'separator', label: localize('terminal.integrated.localFolderLinks', "Folder") });
                    picks.push(...folderPicks);
                }
                if (wordPicks) {
                    picks.push({ type: 'separator', label: localize('terminal.integrated.searchLinks', "Workspace Search") });
                    picks.push(...wordPicks);
                }
                pick.items = picks;
            }));
        }
        disposables.add(pick.onDidChangeActive(async () => {
            const [item] = pick.activeItems;
            this._previewItem(item);
        }));
        return new Promise(r => {
            disposables.add(pick.onDidHide(({ reason }) => {
                // Restore terminal scroll state
                if (this._terminalScrollStateSaved) {
                    const markTracker = this._instance?.xterm?.markTracker;
                    if (markTracker) {
                        markTracker.restoreScrollState();
                        markTracker.clear();
                        this._terminalScrollStateSaved = false;
                    }
                }
                // Restore view state upon cancellation if we changed it
                // but only when the picker was closed via explicit user
                // gesture and not e.g. when focus was lost because that
                // could mean the user clicked into the editor directly.
                if (reason === QuickInputHideReason.Gesture) {
                    this._editorViewState.restore();
                }
                disposables.dispose();
                if (pick.selectedItems.length === 0) {
                    this._accessibleViewService.showLastProvider("terminal" /* AccessibleViewProviderId.Terminal */);
                }
                r();
            }));
            disposables.add(Event.once(pick.onDidAccept)(() => {
                // Restore terminal scroll state
                if (this._terminalScrollStateSaved) {
                    const markTracker = this._instance?.xterm?.markTracker;
                    if (markTracker) {
                        markTracker.restoreScrollState();
                        markTracker.clear();
                        this._terminalScrollStateSaved = false;
                    }
                }
                accepted = true;
                const event = new TerminalLinkQuickPickEvent(EventType.CLICK);
                const activeItem = pick.activeItems?.[0];
                if (activeItem && 'link' in activeItem) {
                    activeItem.link.activate(event, activeItem.label);
                }
                disposables.dispose();
                r();
            }));
        });
    }
    /**
     * @param ignoreLinks Links with labels to not include in the picks.
     */
    async _generatePicks(links, ignoreLinks) {
        if (!links) {
            return;
        }
        const linkTextKeys = new Set();
        const linkUriKeys = new Set();
        const picks = [];
        for (const link of links) {
            let label = link.text;
            if (!linkTextKeys.has(label) && (!ignoreLinks || !ignoreLinks.some(e => e.text === label))) {
                linkTextKeys.add(label);
                // Add a consistently formatted resolved URI label to the description if applicable
                let description;
                if ('uri' in link && link.uri) {
                    // For local files and folders, mimic the presentation of go to file
                    if (link.type === "LocalFile" /* TerminalBuiltinLinkType.LocalFile */ ||
                        link.type === "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */ ||
                        link.type === "LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */) {
                        label = basenameOrAuthority(link.uri);
                        description = this._labelService.getUriLabel(dirname(link.uri), { relative: true });
                    }
                    // Add line and column numbers to the label if applicable
                    if (link.type === "LocalFile" /* TerminalBuiltinLinkType.LocalFile */) {
                        if (link.parsedLink?.suffix?.row !== undefined) {
                            label += `:${link.parsedLink.suffix.row}`;
                            if (link.parsedLink?.suffix?.rowEnd !== undefined) {
                                label += `-${link.parsedLink.suffix.rowEnd}`;
                            }
                            if (link.parsedLink?.suffix?.col !== undefined) {
                                label += `:${link.parsedLink.suffix.col}`;
                                if (link.parsedLink?.suffix?.colEnd !== undefined) {
                                    label += `-${link.parsedLink.suffix.colEnd}`;
                                }
                            }
                        }
                    }
                    // Skip the link if it's a duplicate URI + line/col
                    if (linkUriKeys.has(label + '|' + (description ?? ''))) {
                        continue;
                    }
                    linkUriKeys.add(label + '|' + (description ?? ''));
                }
                picks.push({ label, link, description });
            }
        }
        return picks.length > 0 ? picks : undefined;
    }
    _previewItem(item) {
        if (!item || !('link' in item) || !item.link) {
            return;
        }
        // Any link can be previewed in the termninal
        const link = item.link;
        this._previewItemInTerminal(link);
        if (!('uri' in link) || !link.uri) {
            return;
        }
        if (link.type !== "LocalFile" /* TerminalBuiltinLinkType.LocalFile */) {
            return;
        }
        this._previewItemInEditor(link);
    }
    _previewItemInEditor(link) {
        const linkSuffix = link.parsedLink ? link.parsedLink.suffix : getLinkSuffix(link.text);
        const selection = linkSuffix?.row === undefined ? undefined : {
            startLineNumber: linkSuffix.row ?? 1,
            startColumn: linkSuffix.col ?? 1,
            endLineNumber: linkSuffix.rowEnd,
            endColumn: linkSuffix.colEnd
        };
        this._editorViewState.set();
        this._editorSequencer.queue(async () => {
            await this._editorViewState.openTransientEditor({
                resource: link.uri,
                options: { preserveFocus: true, revealIfOpened: true, ignoreError: true, selection }
            });
        });
    }
    _previewItemInTerminal(link) {
        const xterm = this._instance?.xterm;
        if (!xterm) {
            return;
        }
        if (!this._terminalScrollStateSaved) {
            xterm.markTracker.saveScrollState();
            this._terminalScrollStateSaved = true;
        }
        xterm.markTracker.revealRange(link.range);
    }
};
TerminalLinkQuickpick = __decorate([
    __param(0, IAccessibleViewService),
    __param(1, IInstantiationService),
    __param(2, ILabelService),
    __param(3, IQuickInputService)
], TerminalLinkQuickpick);
export { TerminalLinkQuickpick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUXVpY2twaWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMaW5rUXVpY2twaWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQWlCLGtCQUFrQixFQUFrQixvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRWxKLE9BQU8sRUFBRSwwQkFBMEIsRUFBMEQsTUFBTSx1Q0FBdUMsQ0FBQztBQUUzSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQTRCLHNCQUFzQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFFNUgsSUFBTSxxQkFBcUIsR0FB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