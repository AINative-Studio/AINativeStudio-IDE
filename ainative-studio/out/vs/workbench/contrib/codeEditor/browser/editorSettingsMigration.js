/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorSettingMigration } from '../../../../editor/browser/config/migrateOptions.js';
import { Extensions } from '../../../common/configuration.js';
Registry.as(Extensions.ConfigurationMigration)
    .registerConfigurationMigrations(EditorSettingMigration.items.map(item => ({
    key: `editor.${item.key}`,
    migrateFn: (value, accessor) => {
        const configurationKeyValuePairs = [];
        const writer = (key, value) => configurationKeyValuePairs.push([`editor.${key}`, { value }]);
        item.migrate(value, key => accessor(`editor.${key}`), writer);
        return configurationKeyValuePairs;
    }
})));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2V0dGluZ3NNaWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2VkaXRvclNldHRpbmdzTWlncmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsc0JBQXNCLEVBQW1CLE1BQU0scURBQXFELENBQUM7QUFDOUcsT0FBTyxFQUE4QixVQUFVLEVBQW1DLE1BQU0sa0NBQWtDLENBQUM7QUFFM0gsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsVUFBVSxDQUFDLHNCQUFzQixDQUFDO0tBQzdFLCtCQUErQixDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFFLEdBQUcsRUFBRSxVQUFVLElBQUksQ0FBQyxHQUFHLEVBQUU7SUFDekIsU0FBUyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO1FBQzlCLE1BQU0sMEJBQTBCLEdBQStCLEVBQUUsQ0FBQztRQUNsRSxNQUFNLE1BQU0sR0FBb0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RCxPQUFPLDBCQUEwQixDQUFDO0lBQ25DLENBQUM7Q0FDRCxDQUFDLENBQUMsQ0FBQyxDQUFDIn0=