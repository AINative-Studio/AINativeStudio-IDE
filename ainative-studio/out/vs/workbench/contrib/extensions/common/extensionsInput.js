/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { join } from '../../../../base/common/path.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const ExtensionEditorIcon = registerIcon('extensions-editor-label-icon', Codicon.extensions, localize('extensionsEditorLabelIcon', 'Icon of the extensions editor label.'));
export class ExtensionsInput extends EditorInput {
    static { this.ID = 'workbench.extensions.input2'; }
    get typeId() {
        return ExtensionsInput.ID;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */;
    }
    get resource() {
        return URI.from({
            scheme: Schemas.extension,
            path: join(this._extension.identifier.id, 'extension')
        });
    }
    constructor(_extension) {
        super();
        this._extension = _extension;
    }
    get extension() { return this._extension; }
    getName() {
        return localize('extensionsInputName', "Extension: {0}", this._extension.displayName);
    }
    getIcon() {
        return ExtensionEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return other instanceof ExtensionsInput && areSameExtensions(this._extension.identifier, other._extension.identifier);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0lucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbnNJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDL0csT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFakYsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsOEJBQThCLEVBQUUsT0FBTyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsMkJBQTJCLEVBQUUsc0NBQXNDLENBQUMsQ0FBQyxDQUFDO0FBUzVLLE1BQU0sT0FBTyxlQUFnQixTQUFRLFdBQVc7YUFFL0IsT0FBRSxHQUFHLDZCQUE2QixDQUFDO0lBRW5ELElBQWEsTUFBTTtRQUNsQixPQUFPLGVBQWUsQ0FBQyxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVELElBQWEsWUFBWTtRQUN4QixPQUFPLG9GQUFvRSxDQUFDO0lBQzdFLENBQUM7SUFFRCxJQUFhLFFBQVE7UUFDcEIsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2YsTUFBTSxFQUFFLE9BQU8sQ0FBQyxTQUFTO1lBQ3pCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQztTQUN0RCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsWUFBb0IsVUFBc0I7UUFDekMsS0FBSyxFQUFFLENBQUM7UUFEVyxlQUFVLEdBQVYsVUFBVSxDQUFZO0lBRTFDLENBQUM7SUFFRCxJQUFJLFNBQVMsS0FBaUIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUU5QyxPQUFPO1FBQ2YsT0FBTyxRQUFRLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN2RixDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sbUJBQW1CLENBQUM7SUFDNUIsQ0FBQztJQUVRLE9BQU8sQ0FBQyxLQUF3QztRQUN4RCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssWUFBWSxlQUFlLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN2SCxDQUFDIn0=