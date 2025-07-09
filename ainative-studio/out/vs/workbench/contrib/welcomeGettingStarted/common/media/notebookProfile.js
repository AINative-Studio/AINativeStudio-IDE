/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { escape } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
const profileArg = (profile) => encodeURIComponent(JSON.stringify({ profile }));
const imageSize = 400;
export default () => `
<vertically-centered>
<checklist>
	<checkbox on-checked="command:notebook.setProfile?${profileArg('default')}" checked-on="config.notebook.cellFocusIndicator == 'border' && config.notebook.insertToolbarLocation == 'both' && config.notebook.globalToolbar == false && config.notebook.compactView == true && config.notebook.showCellStatusBar == 'visible'">
		<img width="${imageSize}" src="./notebookThemes/default.png"/>
		${escape(localize('default', "Default"))}
	</checkbox>
	<checkbox on-checked="command:notebook.setProfile?${profileArg('jupyter')}" checked-on="config.notebook.cellFocusIndicator == 'gutter' && config.notebook.insertToolbarLocation == 'notebookToolbar' && config.notebook.globalToolbar == true && config.notebook.compactView == true  && config.notebook.showCellStatusBar == 'visible'">
		<img width="${imageSize}" src="./notebookThemes/jupyter.png"/>
		${escape(localize('jupyter', "Jupyter"))}
	</checkbox>
	<checkbox on-checked="command:notebook.setProfile?${profileArg('colab')}" checked-on="config.notebook.cellFocusIndicator == 'border' && config.notebook.insertToolbarLocation == 'betweenCells' && config.notebook.globalToolbar == false && config.notebook.compactView == false && config.notebook.showCellStatusBar == 'hidden'">
		<img width="${imageSize}" src="./notebookThemes/colab.png"/>
		${escape(localize('colab', "Colab"))}
	</checkbox>
</checklist>
</vertically-centered>
`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9jb21tb24vbWVkaWEvbm90ZWJvb2tQcm9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxPQUFlLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDeEYsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDO0FBRXRCLGVBQWUsR0FBRyxFQUFFLENBQUM7OztxREFHZ0MsVUFBVSxDQUFDLFNBQVMsQ0FBQztnQkFDMUQsU0FBUztJQUNyQixNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQzs7cURBRVcsVUFBVSxDQUFDLFNBQVMsQ0FBQztnQkFDMUQsU0FBUztJQUNyQixNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQzs7cURBRVcsVUFBVSxDQUFDLE9BQU8sQ0FBQztnQkFDeEQsU0FBUztJQUNyQixNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQzs7OztDQUlyQyxDQUFDIn0=