/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { localize } from '../../../../../../nls.js';
import { variablePageSize } from '../../../common/notebookKernelService.js';
export class NotebookVariableDataSource {
    constructor(notebookKernelService) {
        this.notebookKernelService = notebookKernelService;
        this.cancellationTokenSource = new CancellationTokenSource();
    }
    hasChildren(element) {
        return element.kind === 'root' || element.hasNamedChildren || element.indexedChildrenCount > 0;
    }
    cancel() {
        this.cancellationTokenSource.cancel();
        this.cancellationTokenSource.dispose();
        this.cancellationTokenSource = new CancellationTokenSource();
    }
    async getChildren(element) {
        if (element.kind === 'empty') {
            return [];
        }
        else if (element.kind === 'root') {
            return this.getRootVariables(element.notebook);
        }
        else {
            return this.getVariables(element);
        }
    }
    async getVariables(parent) {
        const selectedKernel = this.notebookKernelService.getMatchingKernel(parent.notebook).selected;
        if (selectedKernel && selectedKernel.hasVariableProvider) {
            let children = [];
            if (parent.hasNamedChildren) {
                const variables = selectedKernel.provideVariables(parent.notebook.uri, parent.extHostId, 'named', 0, this.cancellationTokenSource.token);
                const childNodes = await variables
                    .map(variable => { return this.createVariableElement(variable, parent.notebook); })
                    .toPromise();
                children = children.concat(childNodes);
            }
            if (parent.indexedChildrenCount > 0) {
                const childNodes = await this.getIndexedChildren(parent, selectedKernel);
                children = children.concat(childNodes);
            }
            return children;
        }
        return [];
    }
    async getIndexedChildren(parent, kernel) {
        const childNodes = [];
        if (parent.indexedChildrenCount > variablePageSize) {
            const nestedPageSize = Math.floor(Math.max(parent.indexedChildrenCount / variablePageSize, 100));
            const indexedChildCountLimit = 1_000_000;
            let start = parent.indexStart ?? 0;
            const last = start + Math.min(parent.indexedChildrenCount, indexedChildCountLimit);
            for (; start < last; start += nestedPageSize) {
                let end = start + nestedPageSize;
                if (end > last) {
                    end = last;
                }
                childNodes.push({
                    kind: 'variable',
                    notebook: parent.notebook,
                    id: parent.id + `${start}`,
                    extHostId: parent.extHostId,
                    name: `[${start}..${end - 1}]`,
                    value: '',
                    indexedChildrenCount: end - start,
                    indexStart: start,
                    hasNamedChildren: false
                });
            }
            if (parent.indexedChildrenCount > indexedChildCountLimit) {
                childNodes.push({
                    kind: 'variable',
                    notebook: parent.notebook,
                    id: parent.id + `${last + 1}`,
                    extHostId: parent.extHostId,
                    name: localize('notebook.indexedChildrenLimitReached', "Display limit reached"),
                    value: '',
                    indexedChildrenCount: 0,
                    hasNamedChildren: false
                });
            }
        }
        else if (parent.indexedChildrenCount > 0) {
            const variables = kernel.provideVariables(parent.notebook.uri, parent.extHostId, 'indexed', parent.indexStart ?? 0, this.cancellationTokenSource.token);
            for await (const variable of variables) {
                childNodes.push(this.createVariableElement(variable, parent.notebook));
                if (childNodes.length >= variablePageSize) {
                    break;
                }
            }
        }
        return childNodes;
    }
    async getRootVariables(notebook) {
        const selectedKernel = this.notebookKernelService.getMatchingKernel(notebook).selected;
        if (selectedKernel && selectedKernel.hasVariableProvider) {
            const variables = selectedKernel.provideVariables(notebook.uri, undefined, 'named', 0, this.cancellationTokenSource.token);
            return await variables
                .map(variable => { return this.createVariableElement(variable, notebook); })
                .toPromise();
        }
        return [];
    }
    createVariableElement(variable, notebook) {
        return {
            ...variable,
            kind: 'variable',
            notebook,
            extHostId: variable.id,
            id: `${variable.id}`
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNEYXRhU291cmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va1ZhcmlhYmxlcy9ub3RlYm9va1ZhcmlhYmxlc0RhdGFTb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXBELE9BQU8sRUFBNEQsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQTRCdEksTUFBTSxPQUFPLDBCQUEwQjtJQUl0QyxZQUE2QixxQkFBNkM7UUFBN0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUN6RSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO0lBQzlELENBQUM7SUFFRCxXQUFXLENBQUMsT0FBa0Q7UUFDN0QsT0FBTyxPQUFPLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxPQUFPLENBQUMsZ0JBQWdCLElBQUksT0FBTyxDQUFDLG9CQUFvQixHQUFHLENBQUMsQ0FBQztJQUNoRyxDQUFDO0lBRU0sTUFBTTtRQUNaLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztJQUM5RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFnRTtRQUNqRixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssT0FBTyxF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