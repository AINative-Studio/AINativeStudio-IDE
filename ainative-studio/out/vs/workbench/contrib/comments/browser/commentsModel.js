/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { groupBy } from '../../../../base/common/arrays.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ResourceWithCommentThreads } from '../common/commentModel.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
export function threadHasMeaningfulComments(thread) {
    return !!thread.comments && !!thread.comments.length && thread.comments.some(comment => isMarkdownString(comment.body) ? comment.body.value.length > 0 : comment.body.length > 0);
}
export class CommentsModel extends Disposable {
    get resourceCommentThreads() { return this._resourceCommentThreads; }
    constructor() {
        super();
        this._resourceCommentThreads = [];
        this.commentThreadsMap = new Map();
    }
    updateResourceCommentThreads() {
        const includeLabel = this.commentThreadsMap.size > 1;
        this._resourceCommentThreads = [...this.commentThreadsMap.values()].map(value => {
            return value.resourceWithCommentThreads.map(resource => {
                resource.ownerLabel = includeLabel ? value.ownerLabel : undefined;
                return resource;
            }).flat();
        }).flat();
    }
    setCommentThreads(uniqueOwner, owner, ownerLabel, commentThreads) {
        this.commentThreadsMap.set(uniqueOwner, { ownerLabel, resourceWithCommentThreads: this.groupByResource(uniqueOwner, owner, commentThreads) });
        this.updateResourceCommentThreads();
    }
    deleteCommentsByOwner(uniqueOwner) {
        if (uniqueOwner) {
            const existingOwner = this.commentThreadsMap.get(uniqueOwner);
            this.commentThreadsMap.set(uniqueOwner, { ownerLabel: existingOwner?.ownerLabel, resourceWithCommentThreads: [] });
        }
        else {
            this.commentThreadsMap.clear();
        }
        this.updateResourceCommentThreads();
    }
    updateCommentThreads(event) {
        const { uniqueOwner, owner, ownerLabel, removed, changed, added } = event;
        const threadsForOwner = this.commentThreadsMap.get(uniqueOwner)?.resourceWithCommentThreads || [];
        removed.forEach(thread => {
            // Find resource that has the comment thread
            const matchingResourceIndex = threadsForOwner.findIndex((resourceData) => resourceData.id === thread.resource);
            const matchingResourceData = matchingResourceIndex >= 0 ? threadsForOwner[matchingResourceIndex] : undefined;
            // Find comment node on resource that is that thread and remove it
            const index = matchingResourceData?.commentThreads.findIndex((commentThread) => commentThread.threadId === thread.threadId) ?? 0;
            if (index >= 0) {
                matchingResourceData?.commentThreads.splice(index, 1);
            }
            // If the comment thread was the last thread for a resource, remove that resource from the list
            if (matchingResourceData?.commentThreads.length === 0) {
                threadsForOwner.splice(matchingResourceIndex, 1);
            }
        });
        changed.forEach(thread => {
            // Find resource that has the comment thread
            const matchingResourceIndex = threadsForOwner.findIndex((resourceData) => resourceData.id === thread.resource);
            const matchingResourceData = matchingResourceIndex >= 0 ? threadsForOwner[matchingResourceIndex] : undefined;
            if (!matchingResourceData) {
                return;
            }
            // Find comment node on resource that is that thread and replace it
            const index = matchingResourceData.commentThreads.findIndex((commentThread) => commentThread.threadId === thread.threadId);
            if (index >= 0) {
                matchingResourceData.commentThreads[index] = ResourceWithCommentThreads.createCommentNode(uniqueOwner, owner, URI.parse(matchingResourceData.id), thread);
            }
            else if (thread.comments && thread.comments.length) {
                matchingResourceData.commentThreads.push(ResourceWithCommentThreads.createCommentNode(uniqueOwner, owner, URI.parse(matchingResourceData.id), thread));
            }
        });
        added.forEach(thread => {
            const existingResource = threadsForOwner.filter(resourceWithThreads => resourceWithThreads.resource.toString() === thread.resource);
            if (existingResource.length) {
                const resource = existingResource[0];
                if (thread.comments && thread.comments.length) {
                    resource.commentThreads.push(ResourceWithCommentThreads.createCommentNode(uniqueOwner, owner, resource.resource, thread));
                }
            }
            else {
                threadsForOwner.push(new ResourceWithCommentThreads(uniqueOwner, owner, URI.parse(thread.resource), [thread]));
            }
        });
        this.commentThreadsMap.set(uniqueOwner, { ownerLabel, resourceWithCommentThreads: threadsForOwner });
        this.updateResourceCommentThreads();
        return removed.length > 0 || changed.length > 0 || added.length > 0;
    }
    hasCommentThreads() {
        // There's a resource with at least one thread
        return !!this._resourceCommentThreads.length && this._resourceCommentThreads.some(resource => {
            // At least one of the threads in the resource has comments
            return (resource.commentThreads.length > 0) && resource.commentThreads.some(thread => {
                // At least one of the comments in the thread is not empty
                return threadHasMeaningfulComments(thread.thread);
            });
        });
    }
    getMessage() {
        if (!this._resourceCommentThreads.length) {
            return localize('noComments', "There are no comments in this workspace yet.");
        }
        else {
            return '';
        }
    }
    groupByResource(uniqueOwner, owner, commentThreads) {
        const resourceCommentThreads = [];
        const commentThreadsByResource = new Map();
        for (const group of groupBy(commentThreads, CommentsModel._compareURIs)) {
            commentThreadsByResource.set(group[0].resource, new ResourceWithCommentThreads(uniqueOwner, owner, URI.parse(group[0].resource), group));
        }
        commentThreadsByResource.forEach((v, i, m) => {
            resourceCommentThreads.push(v);
        });
        return resourceCommentThreads;
    }
    static _compareURIs(a, b) {
        const resourceA = a.resource.toString();
        const resourceB = b.resource.toString();
        if (resourceA < resourceB) {
            return -1;
        }
        else if (resourceA > resourceB) {
            return 1;
        }
        else {
            return 0;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRzTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLDBCQUEwQixFQUE4QixNQUFNLDJCQUEyQixDQUFDO0FBQ25HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUxRSxNQUFNLFVBQVUsMkJBQTJCLENBQUMsTUFBcUI7SUFDaEUsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRW5MLENBQUM7QUFTRCxNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7SUFHNUMsSUFBSSxzQkFBc0IsS0FBbUMsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO0lBR25HO1FBRUMsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsdUJBQXVCLEdBQUcsRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBNEYsQ0FBQztJQUM5SCxDQUFDO0lBRU8sNEJBQTRCO1FBQ25DLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQy9FLE9BQU8sS0FBSyxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDdEQsUUFBUSxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDbEUsT0FBTyxRQUFRLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxXQUFtQixFQUFFLEtBQWEsRUFBRSxVQUFrQixFQUFFLGNBQStCO1FBQy9HLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEVBQUUsVUFBVSxFQUFFLDBCQUEwQixFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUksSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVNLHFCQUFxQixDQUFDLFdBQW9CO1FBQ2hELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM5RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLDBCQUEwQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDcEgsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDaEMsQ0FBQztRQUNELElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxLQUFpQztRQUM1RCxNQUFNLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFMUUsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSwwQkFBMEIsSUFBSSxFQUFFLENBQUM7UUFFbEcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN4Qiw0Q0FBNEM7WUFDNUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxLQUFLLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvRyxNQUFNLG9CQUFvQixHQUFHLHFCQUFxQixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUU3RyxrRUFBa0U7WUFDbEUsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsS0FBSyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pJLElBQUksS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNoQixvQkFBb0IsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN2RCxDQUFDO1lBRUQsK0ZBQStGO1lBQy9GLElBQUksb0JBQW9CLEVBQUUsY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdkQsZUFBZSxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3hCLDRDQUE0QztZQUM1QyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQy9HLE1BQU0sb0JBQW9CLEdBQUcscUJBQXFCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQzdHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUMzQixPQUFPO1lBQ1IsQ0FBQztZQUVELG1FQUFtRTtZQUNuRSxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxLQUFLLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzSCxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDaEIsb0JBQW9CLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxHQUFHLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMzSixDQUFDO2lCQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN0RCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3hKLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDdEIsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BJLElBQUksZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sUUFBUSxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDL0MsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQzNILENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLDBCQUEwQixDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakgsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsRUFBRSxVQUFVLEVBQUUsMEJBQTBCLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUNyRyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztRQUVwQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsOENBQThDO1FBQzlDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUM1RiwyREFBMkQ7WUFDM0QsT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNwRiwwREFBMEQ7Z0JBQzFELE9BQU8sMkJBQTJCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sVUFBVTtRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFDLE9BQU8sUUFBUSxDQUFDLFlBQVksRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO1FBQy9FLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWUsQ0FBQyxXQUFtQixFQUFFLEtBQWEsRUFBRSxjQUErQjtRQUMxRixNQUFNLHNCQUFzQixHQUFpQyxFQUFFLENBQUM7UUFDaEUsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQztRQUMvRSxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDekUsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFTLEVBQUUsSUFBSSwwQkFBMEIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUksQ0FBQztRQUVELHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDNUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxzQkFBc0IsQ0FBQztJQUMvQixDQUFDO0lBRU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFnQixFQUFFLENBQWdCO1FBQzdELE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDekMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN6QyxJQUFJLFNBQVMsR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1gsQ0FBQzthQUFNLElBQUksU0FBUyxHQUFHLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==