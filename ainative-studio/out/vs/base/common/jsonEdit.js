/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findNodeAtLocation, parseTree } from './json.js';
import { format, isEOL } from './jsonFormatter.js';
export function removeProperty(text, path, formattingOptions) {
    return setProperty(text, path, undefined, formattingOptions);
}
export function setProperty(text, originalPath, value, formattingOptions, getInsertionIndex) {
    const path = originalPath.slice();
    const errors = [];
    const root = parseTree(text, errors);
    let parent = undefined;
    let lastSegment = undefined;
    while (path.length > 0) {
        lastSegment = path.pop();
        parent = findNodeAtLocation(root, path);
        if (parent === undefined && value !== undefined) {
            if (typeof lastSegment === 'string') {
                value = { [lastSegment]: value };
            }
            else {
                value = [value];
            }
        }
        else {
            break;
        }
    }
    if (!parent) {
        // empty document
        if (value === undefined) { // delete
            return []; // property does not exist, nothing to do
        }
        return withFormatting(text, { offset: root ? root.offset : 0, length: root ? root.length : 0, content: JSON.stringify(value) }, formattingOptions);
    }
    else if (parent.type === 'object' && typeof lastSegment === 'string' && Array.isArray(parent.children)) {
        const existing = findNodeAtLocation(parent, [lastSegment]);
        if (existing !== undefined) {
            if (value === undefined) { // delete
                if (!existing.parent) {
                    throw new Error('Malformed AST');
                }
                const propertyIndex = parent.children.indexOf(existing.parent);
                let removeBegin;
                let removeEnd = existing.parent.offset + existing.parent.length;
                if (propertyIndex > 0) {
                    // remove the comma of the previous node
                    const previous = parent.children[propertyIndex - 1];
                    removeBegin = previous.offset + previous.length;
                }
                else {
                    removeBegin = parent.offset + 1;
                    if (parent.children.length > 1) {
                        // remove the comma of the next node
                        const next = parent.children[1];
                        removeEnd = next.offset;
                    }
                }
                return withFormatting(text, { offset: removeBegin, length: removeEnd - removeBegin, content: '' }, formattingOptions);
            }
            else {
                // set value of existing property
                return withFormatting(text, { offset: existing.offset, length: existing.length, content: JSON.stringify(value) }, formattingOptions);
            }
        }
        else {
            if (value === undefined) { // delete
                return []; // property does not exist, nothing to do
            }
            const newProperty = `${JSON.stringify(lastSegment)}: ${JSON.stringify(value)}`;
            const index = getInsertionIndex ? getInsertionIndex(parent.children.map(p => p.children[0].value)) : parent.children.length;
            let edit;
            if (index > 0) {
                const previous = parent.children[index - 1];
                edit = { offset: previous.offset + previous.length, length: 0, content: ',' + newProperty };
            }
            else if (parent.children.length === 0) {
                edit = { offset: parent.offset + 1, length: 0, content: newProperty };
            }
            else {
                edit = { offset: parent.offset + 1, length: 0, content: newProperty + ',' };
            }
            return withFormatting(text, edit, formattingOptions);
        }
    }
    else if (parent.type === 'array' && typeof lastSegment === 'number' && Array.isArray(parent.children)) {
        if (value !== undefined) {
            // Insert
            const newProperty = `${JSON.stringify(value)}`;
            let edit;
            if (parent.children.length === 0 || lastSegment === 0) {
                edit = { offset: parent.offset + 1, length: 0, content: parent.children.length === 0 ? newProperty : newProperty + ',' };
            }
            else {
                const index = lastSegment === -1 || lastSegment > parent.children.length ? parent.children.length : lastSegment;
                const previous = parent.children[index - 1];
                edit = { offset: previous.offset + previous.length, length: 0, content: ',' + newProperty };
            }
            return withFormatting(text, edit, formattingOptions);
        }
        else {
            //Removal
            const removalIndex = lastSegment;
            const toRemove = parent.children[removalIndex];
            let edit;
            if (parent.children.length === 1) {
                // only item
                edit = { offset: parent.offset + 1, length: parent.length - 2, content: '' };
            }
            else if (parent.children.length - 1 === removalIndex) {
                // last item
                const previous = parent.children[removalIndex - 1];
                const offset = previous.offset + previous.length;
                const parentEndOffset = parent.offset + parent.length;
                edit = { offset, length: parentEndOffset - 2 - offset, content: '' };
            }
            else {
                edit = { offset: toRemove.offset, length: parent.children[removalIndex + 1].offset - toRemove.offset, content: '' };
            }
            return withFormatting(text, edit, formattingOptions);
        }
    }
    else {
        throw new Error(`Can not add ${typeof lastSegment !== 'number' ? 'index' : 'property'} to parent of type ${parent.type}`);
    }
}
export function withFormatting(text, edit, formattingOptions) {
    // apply the edit
    let newText = applyEdit(text, edit);
    // format the new text
    let begin = edit.offset;
    let end = edit.offset + edit.content.length;
    if (edit.length === 0 || edit.content.length === 0) { // insert or remove
        while (begin > 0 && !isEOL(newText, begin - 1)) {
            begin--;
        }
        while (end < newText.length && !isEOL(newText, end)) {
            end++;
        }
    }
    const edits = format(newText, { offset: begin, length: end - begin }, formattingOptions);
    // apply the formatting edits and track the begin and end offsets of the changes
    for (let i = edits.length - 1; i >= 0; i--) {
        const curr = edits[i];
        newText = applyEdit(newText, curr);
        begin = Math.min(begin, curr.offset);
        end = Math.max(end, curr.offset + curr.length);
        end += curr.content.length - curr.length;
    }
    // create a single edit with all changes
    const editLength = text.length - (newText.length - end) - begin;
    return [{ offset: begin, length: editLength, content: newText.substring(begin, end) }];
}
export function applyEdit(text, edit) {
    return text.substring(0, edit.offset) + edit.content + text.substring(edit.offset + edit.length);
}
export function applyEdits(text, edits) {
    const sortedEdits = edits.slice(0).sort((a, b) => {
        const diff = a.offset - b.offset;
        if (diff === 0) {
            return a.length - b.length;
        }
        return diff;
    });
    let lastModifiedOffset = text.length;
    for (let i = sortedEdits.length - 1; i >= 0; i--) {
        const e = sortedEdits[i];
        if (e.offset + e.length <= lastModifiedOffset) {
            text = applyEdit(text, e);
        }
        else {
            throw new Error('Overlapping edit');
        }
        lastModifiedOffset = e.offset;
    }
    return text;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vanNvbkVkaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUE4QixTQUFTLEVBQVcsTUFBTSxXQUFXLENBQUM7QUFDL0YsT0FBTyxFQUFRLE1BQU0sRUFBcUIsS0FBSyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFHNUUsTUFBTSxVQUFVLGNBQWMsQ0FBQyxJQUFZLEVBQUUsSUFBYyxFQUFFLGlCQUFvQztJQUNoRyxPQUFPLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBQzlELENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUFDLElBQVksRUFBRSxZQUFzQixFQUFFLEtBQVUsRUFBRSxpQkFBb0MsRUFBRSxpQkFBb0Q7SUFDdkssTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2xDLE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUM7SUFDaEMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNyQyxJQUFJLE1BQU0sR0FBcUIsU0FBUyxDQUFDO0lBRXpDLElBQUksV0FBVyxHQUF3QixTQUFTLENBQUM7SUFDakQsT0FBTyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3hCLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDekIsTUFBTSxHQUFHLGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4QyxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFD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