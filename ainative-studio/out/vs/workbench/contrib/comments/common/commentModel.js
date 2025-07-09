/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class CommentNode {
    constructor(uniqueOwner, owner, resource, comment, thread) {
        this.uniqueOwner = uniqueOwner;
        this.owner = owner;
        this.resource = resource;
        this.comment = comment;
        this.thread = thread;
        this.isRoot = false;
        this.replies = [];
        this.threadId = thread.threadId;
        this.range = thread.range;
        this.threadState = thread.state;
        this.threadRelevance = thread.applicability;
        this.contextValue = thread.contextValue;
        this.controllerHandle = thread.controllerHandle;
        this.threadHandle = thread.commentThreadHandle;
    }
    hasReply() {
        return this.replies && this.replies.length !== 0;
    }
    get lastUpdatedAt() {
        if (this._lastUpdatedAt === undefined) {
            let updatedAt = this.comment.timestamp || '';
            if (this.replies.length) {
                const reply = this.replies[this.replies.length - 1];
                const replyUpdatedAt = reply.lastUpdatedAt;
                if (replyUpdatedAt > updatedAt) {
                    updatedAt = replyUpdatedAt;
                }
            }
            this._lastUpdatedAt = updatedAt;
        }
        return this._lastUpdatedAt;
    }
}
export class ResourceWithCommentThreads {
    constructor(uniqueOwner, owner, resource, commentThreads) {
        this.uniqueOwner = uniqueOwner;
        this.owner = owner;
        this.id = resource.toString();
        this.resource = resource;
        this.commentThreads = commentThreads.filter(thread => thread.comments && thread.comments.length).map(thread => ResourceWithCommentThreads.createCommentNode(uniqueOwner, owner, resource, thread));
    }
    static createCommentNode(uniqueOwner, owner, resource, commentThread) {
        const { comments } = commentThread;
        const commentNodes = comments.map(comment => new CommentNode(uniqueOwner, owner, resource, comment, commentThread));
        if (commentNodes.length > 1) {
            commentNodes[0].replies = commentNodes.slice(1, commentNodes.length);
        }
        commentNodes[0].isRoot = true;
        return commentNodes[0];
    }
    get lastUpdatedAt() {
        if (this._lastUpdatedAt === undefined) {
            let updatedAt = '';
            // Return result without cahcing as we expect data to arrive later
            if (!this.commentThreads.length) {
                return updatedAt;
            }
            for (const thread of this.commentThreads) {
                const threadUpdatedAt = thread.lastUpdatedAt;
                if (threadUpdatedAt && threadUpdatedAt > updatedAt) {
                    updatedAt = threadUpdatedAt;
                }
            }
            this._lastUpdatedAt = updatedAt;
        }
        return this._lastUpdatedAt;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2NvbW1vbi9jb21tZW50TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFZaEcsTUFBTSxPQUFPLFdBQVc7SUFXdkIsWUFDaUIsV0FBbUIsRUFDbkIsS0FBYSxFQUNiLFFBQWEsRUFDYixPQUFnQixFQUNoQixNQUFxQjtRQUpyQixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNiLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDaEIsV0FBTSxHQUFOLE1BQU0sQ0FBZTtRQWZ0QyxXQUFNLEdBQVksS0FBSyxDQUFDO1FBQ3hCLFlBQU8sR0FBa0IsRUFBRSxDQUFDO1FBZTNCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNoQyxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQztRQUM1QyxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUM7UUFDeEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztRQUNoRCxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztJQUNoRCxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFD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