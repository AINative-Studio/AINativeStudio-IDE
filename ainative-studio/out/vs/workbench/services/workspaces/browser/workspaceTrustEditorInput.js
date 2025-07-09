/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
const WorkspaceTrustEditorIcon = registerIcon('workspace-trust-editor-label-icon', Codicon.shield, localize('workspaceTrustEditorLabelIcon', 'Icon of the workspace trust editor label.'));
export class WorkspaceTrustEditorInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = URI.from({
            scheme: Schemas.vscodeWorkspaceTrust,
            path: `workspaceTrustEditor`
        });
    }
    static { this.ID = 'workbench.input.workspaceTrust'; }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */;
    }
    get typeId() {
        return WorkspaceTrustEditorInput.ID;
    }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof WorkspaceTrustEditorInput;
    }
    getName() {
        return localize('workspaceTrustEditorInputName', "Workspace Trust");
    }
    getIcon() {
        return WorkspaceTrustEditorIcon;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3RFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9icm93c2VyL3dvcmtzcGFjZVRydXN0RWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFcEUsTUFBTSx3QkFBd0IsR0FBRyxZQUFZLENBQUMsbUNBQW1DLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsMkNBQTJDLENBQUMsQ0FBQyxDQUFDO0FBRTNMLE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxXQUFXO0lBQTFEOztRQVdVLGFBQVEsR0FBUSxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2pDLE1BQU0sRUFBRSxPQUFPLENBQUMsb0JBQW9CO1lBQ3BDLElBQUksRUFBRSxzQkFBc0I7U0FDNUIsQ0FBQyxDQUFDO0lBYUosQ0FBQzthQTFCZ0IsT0FBRSxHQUFXLGdDQUFnQyxBQUEzQyxDQUE0QztJQUU5RCxJQUFhLFlBQVk7UUFDeEIsT0FBTyxvRkFBb0UsQ0FBQztJQUM3RSxDQUFDO0lBRUQsSUFBYSxNQUFNO1FBQ2xCLE9BQU8seUJBQXlCLENBQUMsRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFPUSxPQUFPLENBQUMsVUFBNkM7UUFDN0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQVUsWUFBWSx5QkFBeUIsQ0FBQztJQUNyRixDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sUUFBUSxDQUFDLCtCQUErQixFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLHdCQUF3QixDQUFDO0lBQ2pDLENBQUMifQ==