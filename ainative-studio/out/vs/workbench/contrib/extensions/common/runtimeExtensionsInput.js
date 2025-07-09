/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const RuntimeExtensionsEditorIcon = registerIcon('runtime-extensions-editor-label-icon', Codicon.extensions, nls.localize('runtimeExtensionEditorLabelIcon', 'Icon of the runtime extensions editor label.'));
export class RuntimeExtensionsInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = URI.from({
            scheme: 'runtime-extensions',
            path: 'default'
        });
    }
    static { this.ID = 'workbench.runtimeExtensions.input'; }
    get typeId() {
        return RuntimeExtensionsInput.ID;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */;
    }
    static get instance() {
        if (!RuntimeExtensionsInput._instance || RuntimeExtensionsInput._instance.isDisposed()) {
            RuntimeExtensionsInput._instance = new RuntimeExtensionsInput();
        }
        return RuntimeExtensionsInput._instance;
    }
    getName() {
        return nls.localize('extensionsInputName', "Running Extensions");
    }
    getIcon() {
        return RuntimeExtensionsEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return other instanceof RuntimeExtensionsInput;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZUV4dGVuc2lvbnNJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9ydW50aW1lRXh0ZW5zaW9uc0lucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRWpGLE1BQU0sMkJBQTJCLEdBQUcsWUFBWSxDQUFDLHNDQUFzQyxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDLENBQUM7QUFFOU0sTUFBTSxPQUFPLHNCQUF1QixTQUFRLFdBQVc7SUFBdkQ7O1FBcUJVLGFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQzVCLE1BQU0sRUFBRSxvQkFBb0I7WUFDNUIsSUFBSSxFQUFFLFNBQVM7U0FDZixDQUFDLENBQUM7SUFnQkosQ0FBQzthQXRDZ0IsT0FBRSxHQUFHLG1DQUFtQyxBQUF0QyxDQUF1QztJQUV6RCxJQUFhLE1BQU07UUFDbEIsT0FBTyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQWEsWUFBWTtRQUN4QixPQUFPLG9GQUFvRSxDQUFDO0lBQzdFLENBQUM7SUFHRCxNQUFNLEtBQUssUUFBUTtRQUNsQixJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxJQUFJLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ3hGLHNCQUFzQixDQUFDLFNBQVMsR0FBRyxJQUFJLHNCQUFzQixFQUFFLENBQUM7UUFDakUsQ0FBQztRQUVELE9BQU8sc0JBQXNCLENBQUMsU0FBUyxDQUFDO0lBQ3pDLENBQUM7SUFPUSxPQUFPO1FBQ2YsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLDJCQUEyQixDQUFDO0lBQ3BDLENBQUM7SUFFUSxPQUFPLENBQUMsS0FBd0M7UUFDeEQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxLQUFLLFlBQVksc0JBQXNCLENBQUM7SUFDaEQsQ0FBQyJ9