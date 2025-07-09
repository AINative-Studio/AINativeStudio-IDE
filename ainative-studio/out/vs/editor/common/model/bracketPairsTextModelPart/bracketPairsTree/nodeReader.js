/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { lengthAdd, lengthZero, lengthLessThan } from './length.js';
/**
 * Allows to efficiently find a longest child at a given offset in a fixed node.
 * The requested offsets must increase monotonously.
*/
export class NodeReader {
    constructor(node) {
        this.lastOffset = lengthZero;
        this.nextNodes = [node];
        this.offsets = [lengthZero];
        this.idxs = [];
    }
    /**
     * Returns the longest node at `offset` that satisfies the predicate.
     * @param offset must be greater than or equal to the last offset this method has been called with!
    */
    readLongestNodeAt(offset, predicate) {
        if (lengthLessThan(offset, this.lastOffset)) {
            throw new Error('Invalid offset');
        }
        this.lastOffset = offset;
        // Find the longest node of all those that are closest to the current offset.
        while (true) {
            const curNode = lastOrUndefined(this.nextNodes);
            if (!curNode) {
                return undefined;
            }
            const curNodeOffset = lastOrUndefined(this.offsets);
            if (lengthLessThan(offset, curNodeOffset)) {
                // The next best node is not here yet.
                // The reader must advance before a cached node is hit.
                return undefined;
            }
            if (lengthLessThan(curNodeOffset, offset)) {
                // The reader is ahead of the current node.
                if (lengthAdd(curNodeOffset, curNode.length) <= offset) {
                    // The reader is after the end of the current node.
                    this.nextNodeAfterCurrent();
                }
                else {
                    // The reader is somewhere in the current node.
                    const nextChildIdx = getNextChildIdx(curNode);
                    if (nextChildIdx !== -1) {
                        // Go to the first child and repeat.
                        this.nextNodes.push(curNode.getChild(nextChildIdx));
                        this.offsets.push(curNodeOffset);
                        this.idxs.push(nextChildIdx);
                    }
                    else {
                        // We don't have children
                        this.nextNodeAfterCurrent();
                    }
                }
            }
            else {
                // readerOffsetBeforeChange === curNodeOffset
                if (predicate(curNode)) {
                    this.nextNodeAfterCurrent();
                    return curNode;
                }
                else {
                    const nextChildIdx = getNextChildIdx(curNode);
                    // look for shorter node
                    if (nextChildIdx === -1) {
                        // There is no shorter node.
                        this.nextNodeAfterCurrent();
                        return undefined;
                    }
                    else {
                        // Descend into first child & repeat.
                        this.nextNodes.push(curNode.getChild(nextChildIdx));
                        this.offsets.push(curNodeOffset);
                        this.idxs.push(nextChildIdx);
                    }
                }
            }
        }
    }
    // Navigates to the longest node that continues after the current node.
    nextNodeAfterCurrent() {
        while (true) {
            const currentOffset = lastOrUndefined(this.offsets);
            const currentNode = lastOrUndefined(this.nextNodes);
            this.nextNodes.pop();
            this.offsets.pop();
            if (this.idxs.length === 0) {
                // We just popped the root node, there is no next node.
                break;
            }
            // Parent is not undefined, because idxs is not empty
            const parent = lastOrUndefined(this.nextNodes);
            const nextChildIdx = getNextChildIdx(parent, this.idxs[this.idxs.length - 1]);
            if (nextChildIdx !== -1) {
                this.nextNodes.push(parent.getChild(nextChildIdx));
                this.offsets.push(lengthAdd(currentOffset, currentNode.length));
                this.idxs[this.idxs.length - 1] = nextChildIdx;
                break;
            }
            else {
                this.idxs.pop();
            }
            // We fully consumed the parent.
            // Current node is now parent, so call nextNodeAfterCurrent again
        }
    }
}
function getNextChildIdx(node, curIdx = -1) {
    while (true) {
        curIdx++;
        if (curIdx >= node.childrenLength) {
            return -1;
        }
        if (node.getChild(curIdx)) {
            return curIdx;
        }
    }
}
function lastOrUndefined(arr) {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZVJlYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvYnJhY2tldFBhaXJzVHJlZS9ub2RlUmVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFVLGNBQWMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUU1RTs7O0VBR0U7QUFDRixNQUFNLE9BQU8sVUFBVTtJQU10QixZQUFZLElBQWE7UUFGakIsZUFBVSxHQUFXLFVBQVUsQ0FBQztRQUd2QyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7O01BR0U7SUFDRixpQkFBaUIsQ0FBQyxNQUFjLEVBQUUsU0FBcUM7UUFDdEUsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUM7UUFFekIsNkVBQTZFO1FBQzdFLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDYixNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRWhELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBQ0QsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUUsQ0FBQztZQUVyRCxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDM0Msc0NBQXNDO2dCQUN0Qyx1REFBdUQ7Z0JBQ3ZELE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDM0MsMkNBQTJDO2dCQUMzQyxJQUFJLFNBQVMsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUN4RCxtREFBbUQ7b0JBQ25ELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUM3QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsK0NBQStDO29CQUMvQyxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzlDLElBQUksWUFBWSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQ3pCLG9DQUFvQzt3QkFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUUsQ0FBQyxDQUFDO3dCQUNyRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQzt3QkFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQzlCLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCx5QkFBeUI7d0JBQ3pCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO29CQUM3QixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsNkNBQTZDO2dCQUM3QyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztvQkFDNUIsT0FBTyxPQUFPLENBQUM7Z0JBQ2hCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzlDLHdCQUF3QjtvQkFDeEIsSUFBSSxZQUFZLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDekIsNEJBQTRCO3dCQUM1QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQzt3QkFDNUIsT0FBTyxTQUFTLENBQUM7b0JBQ2xCLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxxQ0FBcUM7d0JBQ3JDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFFLENBQUMsQ0FBQzt3QkFDckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7d0JBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUM5QixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCx1RUFBdUU7SUFDL0Qsb0JBQW9CO1FBQzNCLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDYixNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BELE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRW5CLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLHVEQUF1RDtnQkFDdkQsTUFBTTtZQUNQLENBQUM7WUFFRCxxREFBcUQ7WUFDckQsTUFBTSxNQUFNLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUUsQ0FBQztZQUNoRCxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU5RSxJQUFJLFlBQVksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBRSxDQUFDLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFjLEVBQUUsV0FBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ2xFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDO2dCQUMvQyxNQUFNO1lBQ1AsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDakIsQ0FBQztZQUNELGdDQUFnQztZQUNoQyxpRUFBaUU7UUFDbEUsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELFNBQVMsZUFBZSxDQUFDLElBQWEsRUFBRSxTQUFpQixDQUFDLENBQUM7SUFDMUQsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUNiLE1BQU0sRUFBRSxDQUFDO1FBQ1QsSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBSSxHQUFpQjtJQUM1QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ3pELENBQUMifQ==