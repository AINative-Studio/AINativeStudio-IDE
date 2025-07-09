/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binarySearch, isFalsyOrEmpty } from '../../../../base/common/arrays.js';
import { Range } from '../../../common/core/range.js';
import { BracketSelectionRangeProvider } from '../../smartSelect/browser/bracketSelections.js';
export class WordDistance {
    static { this.None = new class extends WordDistance {
        distance() { return 0; }
    }; }
    static async create(service, editor) {
        if (!editor.getOption(123 /* EditorOption.suggest */).localityBonus) {
            return WordDistance.None;
        }
        if (!editor.hasModel()) {
            return WordDistance.None;
        }
        const model = editor.getModel();
        const position = editor.getPosition();
        if (!service.canComputeWordRanges(model.uri)) {
            return WordDistance.None;
        }
        const [ranges] = await new BracketSelectionRangeProvider().provideSelectionRanges(model, [position]);
        if (ranges.length === 0) {
            return WordDistance.None;
        }
        const wordRanges = await service.computeWordRanges(model.uri, ranges[0].range);
        if (!wordRanges) {
            return WordDistance.None;
        }
        // remove current word
        const wordUntilPos = model.getWordUntilPosition(position);
        delete wordRanges[wordUntilPos.word];
        return new class extends WordDistance {
            distance(anchor, item) {
                if (!position.equals(editor.getPosition())) {
                    return 0;
                }
                if (item.kind === 17 /* CompletionItemKind.Keyword */) {
                    return 2 << 20;
                }
                const word = typeof item.label === 'string' ? item.label : item.label.label;
                const wordLines = wordRanges[word];
                if (isFalsyOrEmpty(wordLines)) {
                    return 2 << 20;
                }
                const idx = binarySearch(wordLines, Range.fromPositions(anchor), Range.compareRangesUsingStarts);
                const bestWordRange = idx >= 0 ? wordLines[idx] : wordLines[Math.max(0, ~idx - 1)];
                let blockDistance = ranges.length;
                for (const range of ranges) {
                    if (!Range.containsRange(range.range, bestWordRange)) {
                        break;
                    }
                    blockDistance -= 1;
                }
                return blockDistance;
            }
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZERpc3RhbmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci93b3JkRGlzdGFuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUlqRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHdEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0YsTUFBTSxPQUFnQixZQUFZO2FBRWpCLFNBQUksR0FBRyxJQUFJLEtBQU0sU0FBUSxZQUFZO1FBQ3BELFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDeEIsQ0FBQztJQUVGLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQTZCLEVBQUUsTUFBbUI7UUFFckUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLGdDQUFzQixDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzNELE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQztRQUMxQixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQztRQUMxQixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUV0QyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlDLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQztR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