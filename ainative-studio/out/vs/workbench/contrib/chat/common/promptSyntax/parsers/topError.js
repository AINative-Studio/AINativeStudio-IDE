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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9wRXJyb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy90b3BFcnJvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbkg7O0dBRUc7QUFDSCxNQUFNLE9BQU8sUUFBUTtJQU1wQixZQUNVLE9BQTRDO1FBQTVDLFlBQU8sR0FBUCxPQUFPLENBQXFDO1FBRXJELElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUMzQyxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBVyxnQkFBZ0I7UUFDMUIsTUFBTSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFOUUsTUFBTSxDQUNMLFdBQVcsSUFBSSxDQUFDLEVBQ2hCLHdDQUF3QyxXQUFXLElBQUksQ0FDdkQsQ0FBQztRQUVGLG1EQUFtRDtRQUNuRCxNQUFNLGVBQWUsR0FBRyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx3REFBd0QsRUFBRSxzQkFBc0IsRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQzdHLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFTixJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUN4QixJQUFJLGFBQWEsWUFBWSxVQUFVLEVBQUUsQ0FBQztnQkFDekMsT0FBTyxRQUFRLENBQ2Qsa0RBQWtELEVBQ2xELHVCQUF1QixFQUN2QixhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFDdEIsZUFBZSxDQUNmLENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxhQUFhLFlBQVksNkJBQTZCLEVBQUUsQ0FBQztnQkFDNUQsT0FBTyxRQUFRLENBQ2Qsa0RBQWtELEVBQ2xELHVCQUF1QixFQUN2QixhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksRUFDdEIsZUFBZSxDQUNmLENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxhQUFhLFlBQVksa0JBQWtCLEVBQUUsQ0FBQztnQkFDakQsT0FBTyxRQUFRLENBQ2QsMERBQTBELEVBQzFELHNCQUFzQixDQUN0QixDQUFDO1lBQ0gsQ0FBQztZQUVELE9BQU8sYUFBYSxDQUFDLE9BQU8sR0FBRyxlQUFlLENBQUM7UUFDaEQsQ0FBQztRQUVELGdGQUFnRjtRQUNoRixhQUFhLENBQ1osU0FBUyxFQUNULHdEQUF3RCxDQUN4RCxDQUFDO1FBRUYsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUM7WUFDOUMsQ0FBQyxDQUFDLFFBQVEsQ0FDVCxtREFBbUQsRUFDbkQsVUFBVSxDQUNWO1lBQ0QsQ0FBQyxDQUFDLFFBQVEsQ0FDVCxxREFBcUQsRUFDckQsNkNBQTZDLEVBQzdDLFNBQVMsQ0FBQyxJQUFJLENBQ2QsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLENBQUMsYUFBYSxZQUFZLGtCQUFrQixDQUFDO1lBQ2xFLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQztZQUNwQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVoQyxPQUFPLFFBQVEsQ0FDZCwwREFBMEQsRUFDMUQsa0RBQWtELEVBQ2xELGlCQUFpQixFQUNqQixhQUFhLEVBQ2IsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQ3RCLGVBQWUsQ0FDZixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=