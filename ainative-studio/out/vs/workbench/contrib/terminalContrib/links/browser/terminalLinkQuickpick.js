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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rUXVpY2twaWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsTGlua1F1aWNrcGljay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFpQixrQkFBa0IsRUFBa0Isb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUVsSixPQUFPLEVBQUUsMEJBQTBCLEVBQTBELE1BQU0sdUNBQXVDLENBQUM7QUFFM0ksT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXpELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUE0QixzQkFBc0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBRTVILElBQU0scUJBQXFCLEdB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