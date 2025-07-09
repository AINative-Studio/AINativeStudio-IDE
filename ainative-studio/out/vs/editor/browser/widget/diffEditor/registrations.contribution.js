/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { localize } from '../../../../nls.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const diffMoveBorder = registerColor('diffEditor.move.border', '#8b8b8b9c', localize('diffEditor.move.border', 'The border color for text that got moved in the diff editor.'));
export const diffMoveBorderActive = registerColor('diffEditor.moveActive.border', '#FFA500', localize('diffEditor.moveActive.border', 'The active border color for text that got moved in the diff editor.'));
export const diffEditorUnchangedRegionShadow = registerColor('diffEditor.unchangedRegionShadow', { dark: '#000000', light: '#737373BF', hcDark: '#000000', hcLight: '#737373BF', }, localize('diffEditor.unchangedRegionShadow', 'The color of the shadow around unchanged region widgets.'));
export const diffInsertIcon = registerIcon('diff-insert', Codicon.add, localize('diffInsertIcon', 'Line decoration for inserts in the diff editor.'));
export const diffRemoveIcon = registerIcon('diff-remove', Codicon.remove, localize('diffRemoveIcon', 'Line decoration for removals in the diff editor.'));
export const diffLineAddDecorationBackgroundWithIndicator = ModelDecorationOptions.register({
    className: 'line-insert',
    description: 'line-insert',
    isWholeLine: true,
    linesDecorationsClassName: 'insert-sign ' + ThemeIcon.asClassName(diffInsertIcon),
    marginClassName: 'gutter-insert',
});
export const diffLineDeleteDecorationBackgroundWithIndicator = ModelDecorationOptions.register({
    className: 'line-delete',
    description: 'line-delete',
    isWholeLine: true,
    linesDecorationsClassName: 'delete-sign ' + ThemeIcon.asClassName(diffRemoveIcon),
    marginClassName: 'gutter-delete',
});
export const diffLineAddDecorationBackground = ModelDecorationOptions.register({
    className: 'line-insert',
    description: 'line-insert',
    isWholeLine: true,
    marginClassName: 'gutter-insert',
});
export const diffLineDeleteDecorationBackground = ModelDecorationOptions.register({
    className: 'line-delete',
    description: 'line-delete',
    isWholeLine: true,
    marginClassName: 'gutter-delete',
});
export const diffAddDecoration = ModelDecorationOptions.register({
    className: 'char-insert',
    description: 'char-insert',
    shouldFillLineOnLineBreak: true,
});
export const diffWholeLineAddDecoration = ModelDecorationOptions.register({
    className: 'char-insert',
    description: 'char-insert',
    isWholeLine: true,
});
export const diffAddDecorationEmpty = ModelDecorationOptions.register({
    className: 'char-insert diff-range-empty',
    description: 'char-insert diff-range-empty',
});
export const diffDeleteDecoration = ModelDecorationOptions.register({
    className: 'char-delete',
    description: 'char-delete',
    shouldFillLineOnLineBreak: true,
});
export const diffWholeLineDeleteDecoration = ModelDecorationOptions.register({
    className: 'char-delete',
    description: 'char-delete',
    isWholeLine: true,
});
export const diffDeleteDecorationEmpty = ModelDecorationOptions.register({
    className: 'char-delete diff-range-empty',
    description: 'char-delete diff-range-empty',
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cmF0aW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvcmVnaXN0cmF0aW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVqRixNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUMxQyx3QkFBd0IsRUFDeEIsV0FBVyxFQUNYLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSw4REFBOEQsQ0FBQyxDQUNsRyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUNoRCw4QkFBOEIsRUFDOUIsU0FBUyxFQUNULFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxxRUFBcUUsQ0FBQyxDQUMvRyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsYUFBYSxDQUMzRCxrQ0FBa0MsRUFDbEMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsV0FBVyxHQUFHLEVBQ2pGLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSww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