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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9wRXJyb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvdG9wRXJyb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRW5IOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFFBQVE7SUFNcEIsWUFDVSxPQUE0QztRQUE1QyxZQUFPLEdBQVAsT0FBTyxDQUFxQztRQUVyRCxJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7UUFDM0MsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUN2QyxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQVcsZ0JBQWdCO1FBQzFCLE1BQU0sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRTlFLE1BQU0sQ0FDTCxXQUFXLElBQUksQ0FBQyxFQUNoQix3Q0FBd0MsV0FBVyxJQUFJLENBQ3ZELENBQUM7UUFFRixtREFBbUQ7UUFDbkQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQ3hDLENBQUMsQ0FBQyxRQUFRLENBQUMsd0RBQXdELEVBQUUsc0JBQXNCLEVBQUUsV0FBVyxHQUFHLENBQUMsQ0FBQztZQUM3RyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRU4sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDeEIsSUFBSSxhQUFhLFlBQVksVUFBVSxFQUFFLENBQUM7Z0JBQ3pDLE9BQU8sUUFBUSxDQUNkLGtEQUFrRCxFQUNsRCx1QkFBdUIsRUFDdkIsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQ3RCLGVBQWUsQ0FDZixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksYUFBYSxZQUFZLDZCQUE2QixFQUFFLENBQUM7Z0JBQzVELE9BQU8sUUFBUSxDQUNkLGtEQUFrRCxFQUNsRCx1QkFBdUIsRUFDdkIsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQ3RCLGVBQWUsQ0FDZixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksYUFBYSxZQUFZLGtCQUFrQixFQUFFLENBQUM7Z0JBQ2pELE9BQU8sUUFBUSxDQUNkLDBEQUEwRCxFQUMxRCxzQkFBc0IsQ0FDdEIsQ0FBQztZQUNILENBQUM7WUFFRCxPQUFPLGFBQWEsQ0FBQyxPQUFPLEdBQUcsZUFBZSxDQUFDO1FBQ2hELENBQUM7UUFFRCxnRkFBZ0Y7UUFDaEYsYUFBYSxDQUNaLFNBQVMsRUFDVCx3REFBd0QsQ0FDeEQsQ0FBQztRQUVGLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDO1lBQzlDLENBQUMsQ0FBQyxRQUFRLENBQ1QsbURBQW1ELEVBQ25ELFVBQVUsQ0FDVjtZQUNELENBQUMsQ0FBQyxRQUFRLENBQ1QscURBQXFELEVBQ3JELDZDQUE2QyxFQUM3QyxTQUFTLENBQUMsSUFBSSxDQUNkLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxDQUFDLGFBQWEsWUFBWSxrQkFBa0IsQ0FBQztZQUNsRSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUM7WUFDcEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFaEMsT0FBTyxRQUFRLENBQ2QsMERBQTBELEVBQzFELGtEQUFrRCxFQUNsRCxpQkFBaUIsRUFDakIsYUFBYSxFQUNiLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUN0QixlQUFlLENBQ2YsQ0FBQztJQUNILENBQUM7Q0FDRCJ9