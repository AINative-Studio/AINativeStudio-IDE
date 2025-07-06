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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3RFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2Jyb3dzZXIvd29ya3NwYWNlVHJ1c3RFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVwRSxNQUFNLHdCQUF3QixHQUFHLFlBQVksQ0FBQyxtQ0FBbUMsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDLENBQUM7QUFFM0wsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFdBQVc7SUFBMUQ7O1FBV1UsYUFBUSxHQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDakMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxvQkFBb0I7WUFDcEMsSUFBSSxFQUFFLHNCQUFzQjtTQUM1QixDQUFDLENBQUM7SUFhSixDQUFDO2FBMUJnQixPQUFFLEdBQVcsZ0NBQWdDLEFBQTNDLENBQTRDO0lBRTlELElBQWEsWUFBWTtRQUN4QixPQUFPLG9GQUFvRSxDQUFDO0lBQzdFLENBQUM7SUFFRCxJQUFhLE1BQU07UUFDbEIsT0FBTyx5QkFBeUIsQ0FBQyxFQUFFLENBQUM7SUFDckMsQ0FBQztJQU9RLE9BQU8sQ0FBQyxVQUE2QztRQUM3RCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksVUFBVSxZQUFZLHlCQUF5QixDQUFDO0lBQ3JGLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxRQUFRLENBQUMsK0JBQStCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sd0JBQXdCLENBQUM7SUFDakMsQ0FBQyJ9