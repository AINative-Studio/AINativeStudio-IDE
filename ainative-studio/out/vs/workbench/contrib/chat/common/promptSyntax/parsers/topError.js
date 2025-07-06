/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { assert } from '../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { OpenFailed, RecursiveReference, FailedToResolveContentsStream } from '../../promptFileReferenceErrors.js';
/**
 * The top-most error of the reference tree.
 */
export class TopError {
    constructor(options) {
        this.options = options;
        this.originalError = options.originalError;
        this.errorSubject = options.errorSubject;
        this.errorsCount = options.errorsCount;
        this.parentUri = options.parentUri;
    }
    get localizedMessage() {
        const { originalError, parentUri, errorSubject: subject, errorsCount } = this;
        assert(errorsCount >= 1, `Error count must be at least 1, got '${errorsCount}'.`);
        // a note about how many more link issues are there
        const moreIssuesLabel = (errorsCount > 1)
            ? localize('workbench.reusable-prompts.top-error.more-issues-label', "\n(+{0} more issues)", errorsCount - 1)
            : '';
        if (subject === 'root') {
            if (originalError instanceof OpenFailed) {
                return localize('workbench.reusable-prompts.top-error.open-failed', "Cannot open '{0}'.{1}", originalError.uri.path, moreIssuesLabel);
            }
            if (originalError instanceof FailedToResolveContentsStream) {
                return localize('workbench.reusable-prompts.top-error.cannot-read', "Cannot read '{0}'.{1}", originalError.uri.path, moreIssuesLabel);
            }
            if (originalError instanceof RecursiveReference) {
                return localize('workbench.reusable-prompts.top-error.recursive-reference', "Recursion to itself.");
            }
            return originalError.message + moreIssuesLabel;
        }
        // a sanity check - because the error subject is not `root`, the parent must set
        assertDefined(parentUri, 'Parent URI must be defined for error of non-root link.');
        const errorMessageStart = (subject === 'child')
            ? localize('workbench.reusable-prompts.top-error.child.direct', "Contains")
            : localize('workbench.reusable-prompts.top-error.child.indirect', "Indirectly referenced prompt '{0}' contains", parentUri.path);
        const linkIssueName = (originalError instanceof RecursiveReference)
            ? localize('recursive', "recursive")
            : localize('broken', "broken");
        return localize('workbench.reusable-prompts.top-error.child.final-message', "{0} a {1} link to '{2}' that will be ignored.{3}", errorMessageStart, linkIssueName, originalError.uri.path, moreIssuesLabel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9wRXJyb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3RvcEVycm9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVuSDs7R0FFRztBQUNILE1BQU0sT0FBTyxRQUFRO0lBTXBCLFlBQ1UsT0FBNEM7UUFBNUMsWUFBTyxHQUFQLE9BQU8sQ0FBcUM7UUFFckQsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzNDLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQztRQUN6QyxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7UUFDdkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFXLGdCQUFnQjtRQUMxQixNQUFNLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQztRQUU5RSxNQUFNLENBQ0wsV0FBVyxJQUFJLENBQUMsRUFDaEIsd0NBQXdDLFdBQVcsSUFBSSxDQUN2RCxDQUFDO1FBRUYsbURBQW1EO1FBQ25ELE1BQU0sZUFBZSxHQUFHLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztZQUN4QyxDQUFDLENBQUMsUUFBUSxDQUFDLHdEQUF3RCxFQUFFLHNCQUFzQixFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUM7WUFDN0csQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVOLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLElBQUksYUFBYSxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUN6QyxPQUFPLFFBQVEsQ0FDZCxrREFBa0QsRUFDbEQsdUJBQXVCLEVBQ3ZCLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUN0QixlQUFlLENBQ2YsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLGFBQWEsWUFBWSw2QkFBNkIsRUFBRSxDQUFDO2dCQUM1RCxPQUFPLFFBQVEsQ0FDZCxrREFBa0QsRUFDbEQsdUJBQXVCLEVBQ3ZCLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUN0QixlQUFlLENBQ2YsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLGFBQWEsWUFBWSxrQkFBa0IsRUFBRSxDQUFDO2dCQUNqRCxPQUFPLFFBQVEsQ0FDZCwwREFBMEQsRUFDMUQsc0JBQXNCLENBQ3RCLENBQUM7WUFDSCxDQUFDO1lBRUQsT0FBTyxhQUFhLENBQUMsT0FBTyxHQUFHLGVBQWUsQ0FBQztRQUNoRCxDQUFDO1FBRUQsZ0ZBQWdGO1FBQ2hGLGFBQWEsQ0FDWixTQUFTLEVBQ1Qsd0RBQXdELENBQ3hELENBQUM7UUFFRixNQUFNLGlCQUFpQixHQUFHLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQztZQUM5QyxDQUFDLENBQUMsUUFBUSxDQUNULG1EQUFtRCxFQUNuRCxVQUFVLENBQ1Y7WUFDRCxDQUFDLENBQUMsUUFBUSxDQUNULHFEQUFxRCxFQUNyRCw2Q0FBNkMsRUFDN0MsU0FBUyxDQUFDLElBQUksQ0FDZCxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsQ0FBQyxhQUFhLFlBQVksa0JBQWtCLENBQUM7WUFDbEUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRWhDLE9BQU8sUUFBUSxDQUNkLDBEQUEwRCxFQUMxRCxrREFBa0QsRUFDbEQsaUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFDdEIsZUFBZSxDQUNmLENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==