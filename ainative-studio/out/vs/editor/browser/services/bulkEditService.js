/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../base/common/uri.js';
import { isObject } from '../../../base/common/types.js';
export const IBulkEditService = createDecorator('IWorkspaceEditService');
export class ResourceEdit {
    constructor(metadata) {
        this.metadata = metadata;
    }
    static convert(edit) {
        return edit.edits.map(edit => {
            if (ResourceTextEdit.is(edit)) {
                return ResourceTextEdit.lift(edit);
            }
            if (ResourceFileEdit.is(edit)) {
                return ResourceFileEdit.lift(edit);
            }
            throw new Error('Unsupported edit');
        });
    }
}
export class ResourceTextEdit extends ResourceEdit {
    static is(candidate) {
        if (candidate instanceof ResourceTextEdit) {
            return true;
        }
        return isObject(candidate)
            && URI.isUri(candidate.resource)
            && isObject(candidate.textEdit);
    }
    static lift(edit) {
        if (edit instanceof ResourceTextEdit) {
            return edit;
        }
        else {
            return new ResourceTextEdit(edit.resource, edit.textEdit, edit.versionId, edit.metadata);
        }
    }
    constructor(resource, textEdit, versionId = undefined, metadata) {
        super(metadata);
        this.resource = resource;
        this.textEdit = textEdit;
        this.versionId = versionId;
    }
}
export class ResourceFileEdit extends ResourceEdit {
    static is(candidate) {
        if (candidate instanceof ResourceFileEdit) {
            return true;
        }
        else {
            return isObject(candidate)
                && (Boolean(candidate.newResource) || Boolean(candidate.oldResource));
        }
    }
    static lift(edit) {
        if (edit instanceof ResourceFileEdit) {
            return edit;
        }
        else {
            return new ResourceFileEdit(edit.oldResource, edit.newResource, edit.options, edit.metadata);
        }
    }
    constructor(oldResource, newResource, options = {}, metadata) {
        super(metadata);
        this.oldResource = oldResource;
        this.newResource = newResource;
        this.options = options;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3NlcnZpY2VzL2J1bGtFZGl0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFHMUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUl6RCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQW1CLHVCQUF1QixDQUFDLENBQUM7QUFFM0YsTUFBTSxPQUFPLFlBQVk7SUFFeEIsWUFBK0IsUUFBZ0M7UUFBaEMsYUFBUSxHQUFSLFFBQVEsQ0FBd0I7SUFBSSxDQUFDO0lBRXBFLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBbUI7UUFFakMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM1QixJQUFJLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMvQixPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxDQUFDO1lBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsQ0FBQztZQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxZQUFZO0lBRWpELE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBYztRQUN2QixJQUFJLFNBQVMsWUFBWSxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFDLFNBQVMsQ0FBQztlQUN0QixHQUFHLENBQUMsS0FBSyxDQUFzQixTQUFVLENBQUMsUUFBUSxDQUFDO2VBQ25ELFFBQVEsQ0FBc0IsU0FBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQXdCO1FBQ25DLElBQUksSUFBSSxZQUFZLGdCQUFnQixFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUYsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUNVLFFBQWEsRUFDYixRQUE0RSxFQUM1RSxZQUFnQyxTQUFTLEVBQ2xELFFBQWdDO1FBRWhDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUxQLGFBQVEsR0FBUixRQUFRLENBQUs7UUFDYixhQUFRLEdBQVIsUUFBUSxDQUFvRTtRQUM1RSxjQUFTLEdBQVQsU0FBUyxDQUFnQztJQUluRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsWUFBWTtJQUVqRCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQWM7UUFDdkIsSUFBSSxTQUFTLFlBQVksZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxRQUFRLENBQUMsU0FBUyxDQUFDO21CQUN0QixDQUFDLE9BQU8sQ0FBc0IsU0FBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLE9BQU8sQ0FBc0IsU0FBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDcEgsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQXdCO1FBQ25DLElBQUksSUFBSSxZQUFZLGdCQUFnQixFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUYsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUNVLFdBQTRCLEVBQzVCLFdBQTRCLEVBQzVCLFVBQW9DLEVBQUUsRUFDL0MsUUFBZ0M7UUFFaEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBTFAsZ0JBQVcsR0FBWCxXQUFXLENBQWlCO1FBQzVCLGdCQUFXLEdBQVgsV0FBVyxDQUFpQjtRQUM1QixZQUFPLEdBQVAsT0FBTyxDQUErQjtJQUloRCxDQUFDO0NBQ0QifQ==