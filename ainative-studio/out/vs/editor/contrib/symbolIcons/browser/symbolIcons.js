/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './symbolIcons.css';
import { localize } from '../../../../nls.js';
import { foreground, registerColor } from '../../../../platform/theme/common/colorRegistry.js';
export const SYMBOL_ICON_ARRAY_FOREGROUND = registerColor('symbolIcon.arrayForeground', foreground, localize('symbolIcon.arrayForeground', 'The foreground color for array symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_BOOLEAN_FOREGROUND = registerColor('symbolIcon.booleanForeground', foreground, localize('symbolIcon.booleanForeground', 'The foreground color for boolean symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_CLASS_FOREGROUND = registerColor('symbolIcon.classForeground', {
    dark: '#EE9D28',
    light: '#D67E00',
    hcDark: '#EE9D28',
    hcLight: '#D67E00'
}, localize('symbolIcon.classForeground', 'The foreground color for class symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_COLOR_FOREGROUND = registerColor('symbolIcon.colorForeground', foreground, localize('symbolIcon.colorForeground', 'The foreground color for color symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_CONSTANT_FOREGROUND = registerColor('symbolIcon.constantForeground', foreground, localize('symbolIcon.constantForeground', 'The foreground color for constant symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_CONSTRUCTOR_FOREGROUND = registerColor('symbolIcon.constructorForeground', {
    dark: '#B180D7',
    light: '#652D90',
    hcDark: '#B180D7',
    hcLight: '#652D90'
}, localize('symbolIcon.constructorForeground', 'The foreground color for constructor symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_ENUMERATOR_FOREGROUND = registerColor('symbolIcon.enumeratorForeground', {
    dark: '#EE9D28',
    light: '#D67E00',
    hcDark: '#EE9D28',
    hcLight: '#D67E00'
}, localize('symbolIcon.enumeratorForeground', 'The foreground color for enumerator symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_ENUMERATOR_MEMBER_FOREGROUND = registerColor('symbolIcon.enumeratorMemberForeground', {
    dark: '#75BEFF',
    light: '#007ACC',
    hcDark: '#75BEFF',
    hcLight: '#007ACC'
}, localize('symbolIcon.enumeratorMemberForeground', 'The foreground color for enumerator member symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_EVENT_FOREGROUND = registerColor('symbolIcon.eventForeground', {
    dark: '#EE9D28',
    light: '#D67E00',
    hcDark: '#EE9D28',
    hcLight: '#D67E00'
}, localize('symbolIcon.eventForeground', 'The foreground color for event symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_FIELD_FOREGROUND = registerColor('symbolIcon.fieldForeground', {
    dark: '#75BEFF',
    light: '#007ACC',
    hcDark: '#75BEFF',
    hcLight: '#007ACC'
}, localize('symbolIcon.fieldForeground', 'The foreground color for field symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_FILE_FOREGROUND = registerColor('symbolIcon.fileForeground', foreground, localize('symbolIcon.fileForeground', 'The foreground color for file symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_FOLDER_FOREGROUND = registerColor('symbolIcon.folderForeground', foreground, localize('symbolIcon.folderForeground', 'The foreground color for folder symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_FUNCTION_FOREGROUND = registerColor('symbolIcon.functionForeground', {
    dark: '#B180D7',
    light: '#652D90',
    hcDark: '#B180D7',
    hcLight: '#652D90'
}, localize('symbolIcon.functionForeground', 'The foreground color for function symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_INTERFACE_FOREGROUND = registerColor('symbolIcon.interfaceForeground', {
    dark: '#75BEFF',
    light: '#007ACC',
    hcDark: '#75BEFF',
    hcLight: '#007ACC'
}, localize('symbolIcon.interfaceForeground', 'The foreground color for interface symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_KEY_FOREGROUND = registerColor('symbolIcon.keyForeground', foreground, localize('symbolIcon.keyForeground', 'The foreground color for key symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_KEYWORD_FOREGROUND = registerColor('symbolIcon.keywordForeground', foreground, localize('symbolIcon.keywordForeground', 'The foreground color for keyword symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_METHOD_FOREGROUND = registerColor('symbolIcon.methodForeground', {
    dark: '#B180D7',
    light: '#652D90',
    hcDark: '#B180D7',
    hcLight: '#652D90'
}, localize('symbolIcon.methodForeground', 'The foreground color for method symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_MODULE_FOREGROUND = registerColor('symbolIcon.moduleForeground', foreground, localize('symbolIcon.moduleForeground', 'The foreground color for module symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_NAMESPACE_FOREGROUND = registerColor('symbolIcon.namespaceForeground', foreground, localize('symbolIcon.namespaceForeground', 'The foreground color for namespace symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_NULL_FOREGROUND = registerColor('symbolIcon.nullForeground', foreground, localize('symbolIcon.nullForeground', 'The foreground color for null symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_NUMBER_FOREGROUND = registerColor('symbolIcon.numberForeground', foreground, localize('symbolIcon.numberForeground', 'The foreground color for number symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_OBJECT_FOREGROUND = registerColor('symbolIcon.objectForeground', foreground, localize('symbolIcon.objectForeground', 'The foreground color for object symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_OPERATOR_FOREGROUND = registerColor('symbolIcon.operatorForeground', foreground, localize('symbolIcon.operatorForeground', 'The foreground color for operator symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_PACKAGE_FOREGROUND = registerColor('symbolIcon.packageForeground', foreground, localize('symbolIcon.packageForeground', 'The foreground color for package symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_PROPERTY_FOREGROUND = registerColor('symbolIcon.propertyForeground', foreground, localize('symbolIcon.propertyForeground', 'The foreground color for property symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_REFERENCE_FOREGROUND = registerColor('symbolIcon.referenceForeground', foreground, localize('symbolIcon.referenceForeground', 'The foreground color for reference symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_SNIPPET_FOREGROUND = registerColor('symbolIcon.snippetForeground', foreground, localize('symbolIcon.snippetForeground', 'The foreground color for snippet symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_STRING_FOREGROUND = registerColor('symbolIcon.stringForeground', foreground, localize('symbolIcon.stringForeground', 'The foreground color for string symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_STRUCT_FOREGROUND = registerColor('symbolIcon.structForeground', foreground, localize('symbolIcon.structForeground', 'The foreground color for struct symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_TEXT_FOREGROUND = registerColor('symbolIcon.textForeground', foreground, localize('symbolIcon.textForeground', 'The foreground color for text symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_TYPEPARAMETER_FOREGROUND = registerColor('symbolIcon.typeParameterForeground', foreground, localize('symbolIcon.typeParameterForeground', 'The foreground color for type parameter symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_UNIT_FOREGROUND = registerColor('symbolIcon.unitForeground', foreground, localize('symbolIcon.unitForeground', 'The foreground color for unit symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
export const SYMBOL_ICON_VARIABLE_FOREGROUND = registerColor('symbolIcon.variableForeground', {
    dark: '#75BEFF',
    light: '#007ACC',
    hcDark: '#75BEFF',
    hcLight: '#007ACC',
}, localize('symbolIcon.variableForeground', 'The foreground color for variable symbols. These symbols appear in the outline, breadcrumb, and suggest widget.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9sSWNvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3ltYm9sSWNvbnMvYnJvd3Nlci9zeW1ib2xJY29ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLG1CQUFtQixDQUFDO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRS9GLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGFBQWEsQ0FBQyw0QkFBNEIsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDhHQUE4RyxDQUFDLENBQUMsQ0FBQztBQUU1UCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxhQUFhLENBQUMsOEJBQThCLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxnSEFBZ0gsQ0FBQyxDQUFDLENBQUM7QUFFcFEsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsYUFBYSxDQUFDLDRCQUE0QixFQUFFO0lBQ3ZGLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLFNBQVM7SUFDaEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsOEdBQThHLENBQUMsQ0FBQyxDQUFDO0FBRTNKLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGFBQWEsQ0FBQyw0QkFBNEIsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDhHQUE4RyxDQUFDLENBQUMsQ0FBQztBQUU1UCxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxhQUFhLENB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