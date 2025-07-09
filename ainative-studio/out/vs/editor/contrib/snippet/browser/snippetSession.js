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
var SnippetSession_1;
import { groupBy } from '../../../../base/common/arrays.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { getLeadingWhitespace } from '../../../../base/common/strings.js';
import './snippetSession.css';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Choice, Placeholder, SnippetParser, Text, TextmateSnippet } from './snippetParser.js';
import { ClipboardBasedVariableResolver, CommentBasedVariableResolver, CompositeSnippetVariableResolver, ModelBasedVariableResolver, RandomBasedVariableResolver, SelectionBasedVariableResolver, TimeBasedVariableResolver, WorkspaceBasedVariableResolver } from './snippetVariables.js';
export class OneSnippet {
    static { this._decor = {
        active: ModelDecorationOptions.register({ description: 'snippet-placeholder-1', stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */, className: 'snippet-placeholder' }),
        inactive: ModelDecorationOptions.register({ description: 'snippet-placeholder-2', stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, className: 'snippet-placeholder' }),
        activeFinal: ModelDecorationOptions.register({ description: 'snippet-placeholder-3', stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, className: 'finish-snippet-placeholder' }),
        inactiveFinal: ModelDecorationOptions.register({ description: 'snippet-placeholder-4', stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */, className: 'finish-snippet-placeholder' }),
    }; }
    constructor(_editor, _snippet, _snippetLineLeadingWhitespace) {
        this._editor = _editor;
        this._snippet = _snippet;
        this._snippetLineLeadingWhitespace = _snippetLineLeadingWhitespace;
        this._offset = -1;
        this._nestingLevel = 1;
        this._placeholderGroups = groupBy(_snippet.placeholders, Placeholder.compareByIndex);
        this._placeholderGroupsIdx = -1;
    }
    initialize(textChange) {
        this._offset = textChange.newPosition;
    }
    dispose() {
        if (this._placeholderDecorations) {
            this._editor.removeDecorations([...this._placeholderDecorations.values()]);
        }
        this._placeholderGroups.length = 0;
    }
    _initDecorations() {
        if (this._offset === -1) {
            throw new Error(`Snippet not initialized!`);
        }
        if (this._placeholderDecorations) {
            // already initialized
            return;
        }
        this._placeholderDecorations = new Map();
        const model = this._editor.getModel();
        this._editor.changeDecorations(accessor => {
            // create a decoration for each placeholder
            for (const placeholder of this._snippet.placeholders) {
                const placeholderOffset = this._snippet.offset(placeholder);
                const placeholderLen = this._snippet.fullLen(placeholder);
                const range = Range.fromPositions(model.getPositionAt(this._offset + placeholderOffset), model.getPositionAt(this._offset + placeholderOffset + placeholderLen));
                const options = placeholder.isFinalTabstop ? OneSnippet._decor.inactiveFinal : OneSnippet._decor.inactive;
                const handle = accessor.addDecoration(range, options);
                this._placeholderDecorations.set(placeholder, handle);
            }
        });
    }
    move(fwd) {
        if (!this._editor.hasModel()) {
            return [];
        }
        this._initDecorations();
        // Transform placeholder text if necessary
        if (this._placeholderGroupsIdx >= 0) {
            const operations = [];
            for (const placeholder of this._placeholderGroups[this._placeholderGroupsIdx]) {
                // Check if the placeholder has a transformation
                if (placeholder.transform) {
                    const id = this._placeholderDecorations.get(placeholder);
                    const range = this._editor.getModel().getDecorationRange(id);
                    const currentValue = this._editor.getModel().getValueInRange(range);
                    const transformedValueLines = placeholder.transform.resolve(currentValue).split(/\r\n|\r|\n/);
                    // fix indentation for transformed lines
                    for (let i = 1; i < transformedValueLines.length; i++) {
                        transformedValueLines[i] = this._editor.getModel().normalizeIndentation(this._snippetLineLeadingWhitespace + transformedValueLines[i]);
                    }
                    operations.push(EditOperation.replace(range, transformedValueLines.join(this._editor.getModel().getEOL())));
                }
            }
            if (operations.length > 0) {
                this._editor.executeEdits('snippet.placeholderTransform', operations);
            }
        }
        let couldSkipThisPlaceholder = false;
        if (fwd === true && this._placeholderGroupsIdx < this._placeholderGroups.length - 1) {
            this._placeholderGroupsIdx += 1;
            couldSkipThisPlaceholder = true;
        }
        else if (fwd === false && this._placeholderGroupsIdx > 0) {
            this._placeholderGroupsIdx -= 1;
            couldSkipThisPlaceholder = true;
        }
        else {
            // the selection of the current placeholder might
            // not acurate any more -> simply restore it
        }
        const newSelections = this._editor.getModel().changeDecorations(accessor => {
            const activePlaceholders = new Set();
            // change stickiness to always grow when typing at its edges
            // because these decorations represent the currently active
            // tabstop.
            // Special case #1: reaching the final tabstop
            // Special case #2: placeholders enclosing active placeholders
            const selections = [];
            for (const placeholder of this._placeholderGroups[this._placeholderGroupsIdx]) {
                const id = this._placeholderDecorations.get(placeholder);
                const range = this._editor.getModel().getDecorationRange(id);
                selections.push(new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn));
                // consider to skip this placeholder index when the decoration
                // range is empty but when the placeholder wasn't. that's a strong
                // hint that the placeholder has been deleted. (all placeholder must match this)
                couldSkipThisPlaceholder = couldSkipThisPlaceholder && this._hasPlaceholderBeenCollapsed(placeholder);
                accessor.changeDecorationOptions(id, placeholder.isFinalTabstop ? OneSnippet._decor.activeFinal : OneSnippet._decor.active);
                activePlaceholders.add(placeholder);
                for (const enclosingPlaceholder of this._snippet.enclosingPlaceholders(placeholder)) {
                    const id = this._placeholderDecorations.get(enclosingPlaceholder);
                    accessor.changeDecorationOptions(id, enclosingPlaceholder.isFinalTabstop ? OneSnippet._decor.activeFinal : OneSnippet._decor.active);
                    activePlaceholders.add(enclosingPlaceholder);
                }
            }
            // change stickness to never grow when typing at its edges
            // so that in-active tabstops never grow
            for (const [placeholder, id] of this._placeholderDecorations) {
                if (!activePlaceholders.has(placeholder)) {
                    accessor.changeDecorationOptions(id, placeholder.isFinalTabstop ? OneSnippet._decor.inactiveFinal : OneSnippet._decor.inactive);
                }
            }
            return selections;
        });
        return !couldSkipThisPlaceholder ? newSelections ?? [] : this.move(fwd);
    }
    _hasPlaceholderBeenCollapsed(placeholder) {
        // A placeholder is empty when it wasn't empty when authored but
        // when its tracking decoration is empty. This also applies to all
        // potential parent placeholders
        let marker = placeholder;
        while (marker) {
            if (marker instanceof Placeholder) {
                const id = this._placeholderDecorations.get(marker);
                const range = this._editor.getModel().getDecorationRange(id);
                if (range.isEmpty() && marker.toString().length > 0) {
                    return true;
                }
            }
            marker = marker.parent;
        }
        return false;
    }
    get isAtFirstPlaceholder() {
        return this._placeholderGroupsIdx <= 0 || this._placeholderGroups.length === 0;
    }
    get isAtLastPlaceholder() {
        return this._placeholderGroupsIdx === this._placeholderGroups.length - 1;
    }
    get hasPlaceholder() {
        return this._snippet.placeholders.length > 0;
    }
    /**
     * A snippet is trivial when it has no placeholder or only a final placeholder at
     * its very end
     */
    get isTrivialSnippet() {
        if (this._snippet.placeholders.length === 0) {
            return true;
        }
        if (this._snippet.placeholders.length === 1) {
            const [placeholder] = this._snippet.placeholders;
            if (placeholder.isFinalTabstop) {
                if (this._snippet.rightMostDescendant === placeholder) {
                    return true;
                }
            }
        }
        return false;
    }
    computePossibleSelections() {
        const result = new Map();
        for (const placeholdersWithEqualIndex of this._placeholderGroups) {
            let ranges;
            for (const placeholder of placeholdersWithEqualIndex) {
                if (placeholder.isFinalTabstop) {
                    // ignore those
                    break;
                }
                if (!ranges) {
                    ranges = [];
                    result.set(placeholder.index, ranges);
                }
                const id = this._placeholderDecorations.get(placeholder);
                const range = this._editor.getModel().getDecorationRange(id);
                if (!range) {
                    // one of the placeholder lost its decoration and
                    // therefore we bail out and pretend the placeholder
                    // (with its mirrors) doesn't exist anymore.
                    result.delete(placeholder.index);
                    break;
                }
                ranges.push(range);
            }
        }
        return result;
    }
    get activeChoice() {
        if (!this._placeholderDecorations) {
            return undefined;
        }
        const placeholder = this._placeholderGroups[this._placeholderGroupsIdx][0];
        if (!placeholder?.choice) {
            return undefined;
        }
        const id = this._placeholderDecorations.get(placeholder);
        if (!id) {
            return undefined;
        }
        const range = this._editor.getModel().getDecorationRange(id);
        if (!range) {
            return undefined;
        }
        return { range, choice: placeholder.choice };
    }
    get hasChoice() {
        let result = false;
        this._snippet.walk(marker => {
            result = marker instanceof Choice;
            return !result;
        });
        return result;
    }
    merge(others) {
        const model = this._editor.getModel();
        this._nestingLevel *= 10;
        this._editor.changeDecorations(accessor => {
            // For each active placeholder take one snippet and merge it
            // in that the placeholder (can be many for `$1foo$1foo`). Because
            // everything is sorted by editor selection we can simply remove
            // elements from the beginning of the array
            for (const placeholder of this._placeholderGroups[this._placeholderGroupsIdx]) {
                const nested = others.shift();
                console.assert(nested._offset !== -1);
                console.assert(!nested._placeholderDecorations);
                // Massage placeholder-indicies of the nested snippet to be
                // sorted right after the insertion point. This ensures we move
                // through the placeholders in the correct order
                const indexLastPlaceholder = nested._snippet.placeholderInfo.last.index;
                for (const nestedPlaceholder of nested._snippet.placeholderInfo.all) {
                    if (nestedPlaceholder.isFinalTabstop) {
                        nestedPlaceholder.index = placeholder.index + ((indexLastPlaceholder + 1) / this._nestingLevel);
                    }
                    else {
                        nestedPlaceholder.index = placeholder.index + (nestedPlaceholder.index / this._nestingLevel);
                    }
                }
                this._snippet.replace(placeholder, nested._snippet.children);
                // Remove the placeholder at which position are inserting
                // the snippet and also remove its decoration.
                const id = this._placeholderDecorations.get(placeholder);
                accessor.removeDecoration(id);
                this._placeholderDecorations.delete(placeholder);
                // For each *new* placeholder we create decoration to monitor
                // how and if it grows/shrinks.
                for (const placeholder of nested._snippet.placeholders) {
                    const placeholderOffset = nested._snippet.offset(placeholder);
                    const placeholderLen = nested._snippet.fullLen(placeholder);
                    const range = Range.fromPositions(model.getPositionAt(nested._offset + placeholderOffset), model.getPositionAt(nested._offset + placeholderOffset + placeholderLen));
                    const handle = accessor.addDecoration(range, OneSnippet._decor.inactive);
                    this._placeholderDecorations.set(placeholder, handle);
                }
            }
            // Last, re-create the placeholder groups by sorting placeholders by their index.
            this._placeholderGroups = groupBy(this._snippet.placeholders, Placeholder.compareByIndex);
        });
    }
    getEnclosingRange() {
        let result;
        const model = this._editor.getModel();
        for (const decorationId of this._placeholderDecorations.values()) {
            const placeholderRange = model.getDecorationRange(decorationId) ?? undefined;
            if (!result) {
                result = placeholderRange;
            }
            else {
                result = result.plusRange(placeholderRange);
            }
        }
        return result;
    }
}
const _defaultOptions = {
    overwriteBefore: 0,
    overwriteAfter: 0,
    adjustWhitespace: true,
    clipboardText: undefined,
    overtypingCapturer: undefined
};
let SnippetSession = SnippetSession_1 = class SnippetSession {
    static adjustWhitespace(model, position, adjustIndentation, snippet, filter) {
        const line = model.getLineContent(position.lineNumber);
        const lineLeadingWhitespace = getLeadingWhitespace(line, 0, position.column - 1);
        // the snippet as inserted
        let snippetTextString;
        snippet.walk(marker => {
            // all text elements that are not inside choice
            if (!(marker instanceof Text) || marker.parent instanceof Choice) {
                return true;
            }
            // check with filter (iff provided)
            if (filter && !filter.has(marker)) {
                return true;
            }
            const lines = marker.value.split(/\r\n|\r|\n/);
            if (adjustIndentation) {
                // adjust indentation of snippet test
                // -the snippet-start doesn't get extra-indented (lineLeadingWhitespace), only normalized
                // -all N+1 lines get extra-indented and normalized
                // -the text start get extra-indented and normalized when following a linebreak
                const offset = snippet.offset(marker);
                if (offset === 0) {
                    // snippet start
                    lines[0] = model.normalizeIndentation(lines[0]);
                }
                else {
                    // check if text start is after a linebreak
                    snippetTextString = snippetTextString ?? snippet.toString();
                    const prevChar = snippetTextString.charCodeAt(offset - 1);
                    if (prevChar === 10 /* CharCode.LineFeed */ || prevChar === 13 /* CharCode.CarriageReturn */) {
                        lines[0] = model.normalizeIndentation(lineLeadingWhitespace + lines[0]);
                    }
                }
                for (let i = 1; i < lines.length; i++) {
                    lines[i] = model.normalizeIndentation(lineLeadingWhitespace + lines[i]);
                }
            }
            const newValue = lines.join(model.getEOL());
            if (newValue !== marker.value) {
                marker.parent.replace(marker, [new Text(newValue)]);
                snippetTextString = undefined;
            }
            return true;
        });
        return lineLeadingWhitespace;
    }
    static adjustSelection(model, selection, overwriteBefore, overwriteAfter) {
        if (overwriteBefore !== 0 || overwriteAfter !== 0) {
            // overwrite[Before|After] is compute using the position, not the whole
            // selection. therefore we adjust the selection around that position
            const { positionLineNumber, positionColumn } = selection;
            const positionColumnBefore = positionColumn - overwriteBefore;
            const positionColumnAfter = positionColumn + overwriteAfter;
            const range = model.validateRange({
                startLineNumber: positionLineNumber,
                startColumn: positionColumnBefore,
                endLineNumber: positionLineNumber,
                endColumn: positionColumnAfter
            });
            selection = Selection.createWithDirection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn, selection.getDirection());
        }
        return selection;
    }
    static createEditsAndSnippetsFromSelections(editor, template, overwriteBefore, overwriteAfter, enforceFinalTabstop, adjustWhitespace, clipboardText, overtypingCapturer, languageConfigurationService) {
        const edits = [];
        const snippets = [];
        if (!editor.hasModel()) {
            return { edits, snippets };
        }
        const model = editor.getModel();
        const workspaceService = editor.invokeWithinContext(accessor => accessor.get(IWorkspaceContextService));
        const modelBasedVariableResolver = editor.invokeWithinContext(accessor => new ModelBasedVariableResolver(accessor.get(ILabelService), model));
        const readClipboardText = () => clipboardText;
        // know what text the overwrite[Before|After] extensions
        // of the primary cursor have selected because only when
        // secondary selections extend to the same text we can grow them
        const firstBeforeText = model.getValueInRange(SnippetSession_1.adjustSelection(model, editor.getSelection(), overwriteBefore, 0));
        const firstAfterText = model.getValueInRange(SnippetSession_1.adjustSelection(model, editor.getSelection(), 0, overwriteAfter));
        // remember the first non-whitespace column to decide if
        // `keepWhitespace` should be overruled for secondary selections
        const firstLineFirstNonWhitespace = model.getLineFirstNonWhitespaceColumn(editor.getSelection().positionLineNumber);
        // sort selections by their start position but remeber
        // the original index. that allows you to create correct
        // offset-based selection logic without changing the
        // primary selection
        const indexedSelections = editor.getSelections()
            .map((selection, idx) => ({ selection, idx }))
            .sort((a, b) => Range.compareRangesUsingStarts(a.selection, b.selection));
        for (const { selection, idx } of indexedSelections) {
            // extend selection with the `overwriteBefore` and `overwriteAfter` and then
            // compare if this matches the extensions of the primary selection
            let extensionBefore = SnippetSession_1.adjustSelection(model, selection, overwriteBefore, 0);
            let extensionAfter = SnippetSession_1.adjustSelection(model, selection, 0, overwriteAfter);
            if (firstBeforeText !== model.getValueInRange(extensionBefore)) {
                extensionBefore = selection;
            }
            if (firstAfterText !== model.getValueInRange(extensionAfter)) {
                extensionAfter = selection;
            }
            // merge the before and after selection into one
            const snippetSelection = selection
                .setStartPosition(extensionBefore.startLineNumber, extensionBefore.startColumn)
                .setEndPosition(extensionAfter.endLineNumber, extensionAfter.endColumn);
            const snippet = new SnippetParser().parse(template, true, enforceFinalTabstop);
            // adjust the template string to match the indentation and
            // whitespace rules of this insert location (can be different for each cursor)
            // happens when being asked for (default) or when this is a secondary
            // cursor and the leading whitespace is different
            const start = snippetSelection.getStartPosition();
            const snippetLineLeadingWhitespace = SnippetSession_1.adjustWhitespace(model, start, adjustWhitespace || (idx > 0 && firstLineFirstNonWhitespace !== model.getLineFirstNonWhitespaceColumn(selection.positionLineNumber)), snippet);
            snippet.resolveVariables(new CompositeSnippetVariableResolver([
                modelBasedVariableResolver,
                new ClipboardBasedVariableResolver(readClipboardText, idx, indexedSelections.length, editor.getOption(80 /* EditorOption.multiCursorPaste */) === 'spread'),
                new SelectionBasedVariableResolver(model, selection, idx, overtypingCapturer),
                new CommentBasedVariableResolver(model, selection, languageConfigurationService),
                new TimeBasedVariableResolver,
                new WorkspaceBasedVariableResolver(workspaceService),
                new RandomBasedVariableResolver,
            ]));
            // store snippets with the index of their originating selection.
            // that ensures the primary cursor stays primary despite not being
            // the one with lowest start position
            edits[idx] = EditOperation.replace(snippetSelection, snippet.toString());
            edits[idx].identifier = { major: idx, minor: 0 }; // mark the edit so only our undo edits will be used to generate end cursors
            edits[idx]._isTracked = true;
            snippets[idx] = new OneSnippet(editor, snippet, snippetLineLeadingWhitespace);
        }
        return { edits, snippets };
    }
    static createEditsAndSnippetsFromEdits(editor, snippetEdits, enforceFinalTabstop, adjustWhitespace, clipboardText, overtypingCapturer, languageConfigurationService) {
        if (!editor.hasModel() || snippetEdits.length === 0) {
            return { edits: [], snippets: [] };
        }
        const edits = [];
        const model = editor.getModel();
        const parser = new SnippetParser();
        const snippet = new TextmateSnippet();
        // snippet variables resolver
        const resolver = new CompositeSnippetVariableResolver([
            editor.invokeWithinContext(accessor => new ModelBasedVariableResolver(accessor.get(ILabelService), model)),
            new ClipboardBasedVariableResolver(() => clipboardText, 0, editor.getSelections().length, editor.getOption(80 /* EditorOption.multiCursorPaste */) === 'spread'),
            new SelectionBasedVariableResolver(model, editor.getSelection(), 0, overtypingCapturer),
            new CommentBasedVariableResolver(model, editor.getSelection(), languageConfigurationService),
            new TimeBasedVariableResolver,
            new WorkspaceBasedVariableResolver(editor.invokeWithinContext(accessor => accessor.get(IWorkspaceContextService))),
            new RandomBasedVariableResolver,
        ]);
        //
        snippetEdits = snippetEdits.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
        let offset = 0;
        for (let i = 0; i < snippetEdits.length; i++) {
            const { range, template, keepWhitespace } = snippetEdits[i];
            // gaps between snippet edits are appended as text nodes. this
            // ensures placeholder-offsets are later correct
            if (i > 0) {
                const lastRange = snippetEdits[i - 1].range;
                const textRange = Range.fromPositions(lastRange.getEndPosition(), range.getStartPosition());
                const textNode = new Text(model.getValueInRange(textRange));
                snippet.appendChild(textNode);
                offset += textNode.value.length;
            }
            const newNodes = parser.parseFragment(template, snippet);
            SnippetSession_1.adjustWhitespace(model, range.getStartPosition(), keepWhitespace !== undefined ? !keepWhitespace : adjustWhitespace, snippet, new Set(newNodes));
            snippet.resolveVariables(resolver);
            const snippetText = snippet.toString();
            const snippetFragmentText = snippetText.slice(offset);
            offset = snippetText.length;
            // make edit
            const edit = EditOperation.replace(range, snippetFragmentText);
            edit.identifier = { major: i, minor: 0 }; // mark the edit so only our undo edits will be used to generate end cursors
            edit._isTracked = true;
            edits.push(edit);
        }
        //
        parser.ensureFinalTabstop(snippet, enforceFinalTabstop, true);
        return {
            edits,
            snippets: [new OneSnippet(editor, snippet, '')]
        };
    }
    constructor(_editor, _template, _options = _defaultOptions, _languageConfigurationService) {
        this._editor = _editor;
        this._template = _template;
        this._options = _options;
        this._languageConfigurationService = _languageConfigurationService;
        this._templateMerges = [];
        this._snippets = [];
    }
    dispose() {
        dispose(this._snippets);
    }
    _logInfo() {
        return `template="${this._template}", merged_templates="${this._templateMerges.join(' -> ')}"`;
    }
    insert() {
        if (!this._editor.hasModel()) {
            return;
        }
        // make insert edit and start with first selections
        const { edits, snippets } = typeof this._template === 'string'
            ? SnippetSession_1.createEditsAndSnippetsFromSelections(this._editor, this._template, this._options.overwriteBefore, this._options.overwriteAfter, false, this._options.adjustWhitespace, this._options.clipboardText, this._options.overtypingCapturer, this._languageConfigurationService)
            : SnippetSession_1.createEditsAndSnippetsFromEdits(this._editor, this._template, false, this._options.adjustWhitespace, this._options.clipboardText, this._options.overtypingCapturer, this._languageConfigurationService);
        this._snippets = snippets;
        this._editor.executeEdits('snippet', edits, _undoEdits => {
            // Sometimes, the text buffer will remove automatic whitespace when doing any edits,
            // so we need to look only at the undo edits relevant for us.
            // Our edits have an identifier set so that's how we can distinguish them
            const undoEdits = _undoEdits.filter(edit => !!edit.identifier);
            for (let idx = 0; idx < snippets.length; idx++) {
                snippets[idx].initialize(undoEdits[idx].textChange);
            }
            if (this._snippets[0].hasPlaceholder) {
                return this._move(true);
            }
            else {
                return undoEdits
                    .map(edit => Selection.fromPositions(edit.range.getEndPosition()));
            }
        });
        this._editor.revealRange(this._editor.getSelections()[0]);
    }
    merge(template, options = _defaultOptions) {
        if (!this._editor.hasModel()) {
            return;
        }
        this._templateMerges.push([this._snippets[0]._nestingLevel, this._snippets[0]._placeholderGroupsIdx, template]);
        const { edits, snippets } = SnippetSession_1.createEditsAndSnippetsFromSelections(this._editor, template, options.overwriteBefore, options.overwriteAfter, true, options.adjustWhitespace, options.clipboardText, options.overtypingCapturer, this._languageConfigurationService);
        this._editor.executeEdits('snippet', edits, _undoEdits => {
            // Sometimes, the text buffer will remove automatic whitespace when doing any edits,
            // so we need to look only at the undo edits relevant for us.
            // Our edits have an identifier set so that's how we can distinguish them
            const undoEdits = _undoEdits.filter(edit => !!edit.identifier);
            for (let idx = 0; idx < snippets.length; idx++) {
                snippets[idx].initialize(undoEdits[idx].textChange);
            }
            // Trivial snippets have no placeholder or are just the final placeholder. That means they
            // are just text insertions and we don't need to merge the nested snippet into the existing
            // snippet
            const isTrivialSnippet = snippets[0].isTrivialSnippet;
            if (!isTrivialSnippet) {
                for (const snippet of this._snippets) {
                    snippet.merge(snippets);
                }
                console.assert(snippets.length === 0);
            }
            if (this._snippets[0].hasPlaceholder && !isTrivialSnippet) {
                return this._move(undefined);
            }
            else {
                return undoEdits.map(edit => Selection.fromPositions(edit.range.getEndPosition()));
            }
        });
    }
    next() {
        const newSelections = this._move(true);
        this._editor.setSelections(newSelections);
        this._editor.revealPositionInCenterIfOutsideViewport(newSelections[0].getPosition());
    }
    prev() {
        const newSelections = this._move(false);
        this._editor.setSelections(newSelections);
        this._editor.revealPositionInCenterIfOutsideViewport(newSelections[0].getPosition());
    }
    _move(fwd) {
        const selections = [];
        for (const snippet of this._snippets) {
            const oneSelection = snippet.move(fwd);
            selections.push(...oneSelection);
        }
        return selections;
    }
    get isAtFirstPlaceholder() {
        return this._snippets[0].isAtFirstPlaceholder;
    }
    get isAtLastPlaceholder() {
        return this._snippets[0].isAtLastPlaceholder;
    }
    get hasPlaceholder() {
        return this._snippets[0].hasPlaceholder;
    }
    get hasChoice() {
        return this._snippets[0].hasChoice;
    }
    get activeChoice() {
        return this._snippets[0].activeChoice;
    }
    isSelectionWithinPlaceholders() {
        if (!this.hasPlaceholder) {
            return false;
        }
        const selections = this._editor.getSelections();
        if (selections.length < this._snippets.length) {
            // this means we started snippet mode with N
            // selections and have M (N > M) selections.
            // So one snippet is without selection -> cancel
            return false;
        }
        const allPossibleSelections = new Map();
        for (const snippet of this._snippets) {
            const possibleSelections = snippet.computePossibleSelections();
            // for the first snippet find the placeholder (and its ranges)
            // that contain at least one selection. for all remaining snippets
            // the same placeholder (and their ranges) must be used.
            if (allPossibleSelections.size === 0) {
                for (const [index, ranges] of possibleSelections) {
                    ranges.sort(Range.compareRangesUsingStarts);
                    for (const selection of selections) {
                        if (ranges[0].containsRange(selection)) {
                            allPossibleSelections.set(index, []);
                            break;
                        }
                    }
                }
            }
            if (allPossibleSelections.size === 0) {
                // return false if we couldn't associate a selection to
                // this (the first) snippet
                return false;
            }
            // add selections from 'this' snippet so that we know all
            // selections for this placeholder
            allPossibleSelections.forEach((array, index) => {
                array.push(...possibleSelections.get(index));
            });
        }
        // sort selections (and later placeholder-ranges). then walk both
        // arrays and make sure the placeholder-ranges contain the corresponding
        // selection
        selections.sort(Range.compareRangesUsingStarts);
        for (const [index, ranges] of allPossibleSelections) {
            if (ranges.length !== selections.length) {
                allPossibleSelections.delete(index);
                continue;
            }
            ranges.sort(Range.compareRangesUsingStarts);
            for (let i = 0; i < ranges.length; i++) {
                if (!ranges[i].containsRange(selections[i])) {
                    allPossibleSelections.delete(index);
                    continue;
                }
            }
        }
        // from all possible selections we have deleted those
        // that don't match with the current selection. if we don't
        // have any left, we don't have a selection anymore
        return allPossibleSelections.size > 0;
    }
    getEnclosingRange() {
        let result;
        for (const snippet of this._snippets) {
            const snippetRange = snippet.getEnclosingRange();
            if (!result) {
                result = snippetRange;
            }
            else {
                result = result.plusRange(snippetRange);
            }
        }
        return result;
    }
};
SnippetSession = SnippetSession_1 = __decorate([
    __param(3, ILanguageConfigurationService)
], SnippetSession);
export { SnippetSession };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFNlc3Npb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc25pcHBldC9icm93c2VyL3NuaXBwZXRTZXNzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFFLE9BQU8sc0JBQXNCLENBQUM7QUFHOUIsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSx1Q0FBdUMsQ0FBQztBQUU1RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTNHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsTUFBTSxFQUFVLFdBQVcsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3ZHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSw0QkFBNEIsRUFBRSxnQ0FBZ0MsRUFBRSwwQkFBMEIsRUFBRSwyQkFBMkIsRUFBRSw4QkFBOEIsRUFBRSx5QkFBeUIsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVCQUF1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