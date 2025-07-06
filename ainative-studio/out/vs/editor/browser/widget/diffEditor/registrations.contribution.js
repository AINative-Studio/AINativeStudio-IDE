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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cmF0aW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL3JlZ2lzdHJhdGlvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFakYsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FDMUMsd0JBQXdCLEVBQ3hCLFdBQVcsRUFDWCxRQUFRLENBQUMsd0JBQXdCLEVBQUUsOERBQThELENBQUMsQ0FDbEcsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGFBQWEsQ0FDaEQsOEJBQThCLEVBQzlCLFNBQVMsRUFDVCxRQUFRLENBQUMsOEJBQThCLEVBQUUscUVBQXFFLENBQUMsQ0FDL0csQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGFBQWEsQ0FDM0Qsa0NBQWtDLEVBQ2xDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFdBQVcsR0FBRyxFQUNqRixRQUFRLENBQUMsa0NBQWtDLEVBQUUsMERBQTBELENBQUMsQ0FDeEcsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGlEQUFpRCxDQUFDLENBQUMsQ0FBQztBQUN0SixNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxrREFBa0QsQ0FBQyxDQUFDLENBQUM7QUFFMUosTUFBTSxDQUFDLE1BQU0sNENBQTRDLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO0lBQzNGLFNBQVMsRUFBRSxhQUFhO0lBQ3hCLFdBQVcsRUFBRSxhQUFhO0lBQzFCLFdBQVcsRUFBRSxJQUFJO0lBQ2pCLHlCQUF5QixFQUFFLGNBQWMsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQztJQUNqRixlQUFlLEVBQUUsZUFBZTtDQUNoQyxDQUFDLENBQUM7QUFFSCxNQUFNLENBQUMsTUFBTSwrQ0FBK0MsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7SUFDOUYsU0FBUyxFQUFFLGFBQWE7SUFDeEIsV0FBVyxFQUFFLGFBQWE7SUFDMUIsV0FBVyxFQUFFLElBQUk7SUFDakIseUJBQXlCLEVBQUUsY0FBYyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDO0lBQ2pGLGVBQWUsRUFBRSxlQUFlO0NBQ2hDLENBQUMsQ0FBQztBQUVILE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztJQUM5RSxTQUFTLEVBQUUsYUFBYTtJQUN4QixXQUFXLEVBQUUsYUFBYTtJQUMxQixXQUFXLEVBQUUsSUFBSTtJQUNqQixlQUFlLEVBQUUsZUFBZTtDQUNoQyxDQUFDLENBQUM7QUFFSCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7SUFDakYsU0FBUyxFQUFFLGFBQWE7SUFDeEIsV0FBVyxFQUFFLGFBQWE7SUFDMUIsV0FBVyxFQUFFLElBQUk7SUFDakIsZUFBZSxFQUFFLGVBQWU7Q0FDaEMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO0lBQ2hFLFNBQVMsRUFBRSxhQUFhO0lBQ3hCLFdBQVcsRUFBRSxhQUFhO0lBQzFCLHlCQUF5QixFQUFFLElBQUk7Q0FDL0IsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO0lBQ3pFLFNBQVMsRUFBRSxhQUFhO0lBQ3hCLFdBQVcsRUFBRSxhQUFhO0lBQzFCLFdBQVcsRUFBRSxJQUFJO0NBQ2pCLENBQUMsQ0FBQztBQUVILE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztJQUNyRSxTQUFTLEVBQUUsOEJBQThCO0lBQ3pDLFdBQVcsRUFBRSw4QkFBOEI7Q0FDM0MsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO0lBQ25FLFNBQVMsRUFBRSxhQUFhO0lBQ3hCLFdBQVcsRUFBRSxhQUFhO0lBQzFCLHlCQUF5QixFQUFFLElBQUk7Q0FDL0IsQ0FBQyxDQUFDO0FBRUgsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO0lBQzVFLFNBQVMsRUFBRSxhQUFhO0lBQ3hCLFdBQVcsRUFBRSxhQUFhO0lBQzFCLFdBQVcsRUFBRSxJQUFJO0NBQ2pCLENBQUMsQ0FBQztBQUVILE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztJQUN4RSxTQUFTLEVBQUUsOEJBQThCO0lBQ3pDLFdBQVcsRUFBRSw4QkFBOEI7Q0FDM0MsQ0FBQyxDQUFDIn0=