/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceTextEdit } from '../../../browser/services/bulkEditService.js';
import { SnippetParser } from '../../snippet/browser/snippetParser.js';
/**
 * Given a {@link DropOrPasteEdit} and set of ranges, creates a {@link WorkspaceEdit} that applies the insert text from
 * the {@link DropOrPasteEdit} at each range plus any additional edits.
 */
export function createCombinedWorkspaceEdit(uri, ranges, edit) {
    // If the edit insert text is empty, skip applying at each range
    if (typeof edit.insertText === 'string' ? edit.insertText === '' : edit.insertText.snippet === '') {
        return {
            edits: edit.additionalEdit?.edits ?? []
        };
    }
    return {
        edits: [
            ...ranges.map(range => new ResourceTextEdit(uri, { range, text: typeof edit.insertText === 'string' ? SnippetParser.escape(edit.insertText) + '$0' : edit.insertText.snippet, insertAsSnippet: true })),
            ...(edit.additionalEdit?.edits ?? [])
        ]
    };
}
export function sortEditsByYieldTo(edits) {
    function yieldsTo(yTo, other) {
        if ('mimeType' in yTo) {
            return yTo.mimeType === other.handledMimeType;
        }
        return !!other.kind && yTo.kind.contains(other.kind);
    }
    // Build list of nodes each node yields to
    const yieldsToMap = new Map();
    for (const edit of edits) {
        for (const yTo of edit.yieldTo ?? []) {
            for (const other of edits) {
                if (other === edit) {
                    continue;
                }
                if (yieldsTo(yTo, other)) {
                    let arr = yieldsToMap.get(edit);
                    if (!arr) {
                        arr = [];
                        yieldsToMap.set(edit, arr);
                    }
                    arr.push(other);
                }
            }
        }
    }
    if (!yieldsToMap.size) {
        return Array.from(edits);
    }
    // Topological sort
    const visited = new Set();
    const tempStack = [];
    function visit(nodes) {
        if (!nodes.length) {
            return [];
        }
        const node = nodes[0];
        if (tempStack.includes(node)) {
            console.warn('Yield to cycle detected', node);
            return nodes;
        }
        if (visited.has(node)) {
            return visit(nodes.slice(1));
        }
        let pre = [];
        const yTo = yieldsToMap.get(node);
        if (yTo) {
            tempStack.push(node);
            pre = visit(yTo);
            tempStack.pop();
        }
        visited.add(node);
        return [...pre, node, ...visit(nodes.slice(1))];
    }
    return visit(Array.from(edits));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9kcm9wT3JQYXN0ZUludG8vYnJvd3Nlci9lZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBR2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUd2RTs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsR0FBUSxFQUFFLE1BQXdCLEVBQUUsSUFBMEM7SUFDekgsZ0VBQWdFO0lBQ2hFLElBQUksT0FBTyxJQUFJLENBQUMsVUFBVSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQ25HLE9BQU87WUFDTixLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxLQUFLLElBQUksRUFBRTtTQUN2QyxDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU87UUFDTixLQUFLLEVBQUU7WUFDTixHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FDckIsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQ3ZCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLElBQUksQ0FBQyxVQUFVLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FDcEosQ0FBQztZQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUM7U0FDckM7S0FDRCxDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FJL0IsS0FBbUI7SUFDckIsU0FBUyxRQUFRLENBQUMsR0FBZ0IsRUFBRSxLQUFRO1FBQzNDLElBQUksVUFBVSxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sR0FBRyxDQUFDLFFBQVEsS0FBSyxLQUFLLENBQUMsZUFBZSxDQUFDO1FBQy9DLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsMENBQTBDO0lBQzFDLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDdEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUMxQixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksRUFBRSxFQUFFLENBQUM7WUFDdEMsS0FBSyxNQUFNLEtBQUssSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ3BCLFNBQVM7Z0JBQ1YsQ0FBQztnQkFFRCxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDMUIsSUFBSSxHQUFHLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDaEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNWLEdBQUcsR0FBRyxFQUFFLENBQUM7d0JBQ1QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQzVCLENBQUM7b0JBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDakIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdkIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFRCxtQkFBbUI7SUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQUssQ0FBQztJQUM3QixNQUFNLFNBQVMsR0FBUSxFQUFFLENBQUM7SUFFMUIsU0FBUyxLQUFLLENBQUMsS0FBVTtRQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25CLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBRUQsSUFBSSxHQUFHLEdBQVEsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sR0FBRyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqQixTQUFTLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDakIsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMifQ==