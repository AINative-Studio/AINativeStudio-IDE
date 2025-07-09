/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument } from '../../../../base/common/errors.js';
import { URI } from '../../../../base/common/uri.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { HoverParticipantRegistry } from '../../hover/browser/hoverTypes.js';
import { _findColorData, _setupColorCommand, ColorPresentationsCollector, ExtColorDataCollector } from './color.js';
import { ColorDetector } from './colorDetector.js';
import { DefaultDocumentColorProviderFeature } from './defaultDocumentColorProvider.js';
import { HoverColorPickerContribution } from './hoverColorPicker/hoverColorPickerContribution.js';
import { HoverColorPickerParticipant } from './hoverColorPicker/hoverColorPickerParticipant.js';
import { HideStandaloneColorPicker, InsertColorWithStandaloneColorPicker, ShowOrFocusStandaloneColorPicker } from './standaloneColorPicker/standaloneColorPickerActions.js';
import { StandaloneColorPickerController } from './standaloneColorPicker/standaloneColorPickerController.js';
import { Range } from '../../../common/core/range.js';
registerEditorAction(HideStandaloneColorPicker);
registerEditorAction(InsertColorWithStandaloneColorPicker);
registerAction2(ShowOrFocusStandaloneColorPicker);
registerEditorContribution(HoverColorPickerContribution.ID, HoverColorPickerContribution, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorContribution(StandaloneColorPickerController.ID, StandaloneColorPickerController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorContribution(ColorDetector.ID, ColorDetector, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorFeature(DefaultDocumentColorProviderFeature);
HoverParticipantRegistry.register(HoverColorPickerParticipant);
CommandsRegistry.registerCommand('_executeDocumentColorProvider', function (accessor, ...args) {
    const [resource] = args;
    if (!(resource instanceof URI)) {
        throw illegalArgument();
    }
    const { model, colorProviderRegistry, defaultColorDecoratorsEnablement } = _setupColorCommand(accessor, resource);
    return _findColorData(new ExtColorDataCollector(), colorProviderRegistry, model, CancellationToken.None, defaultColorDecoratorsEnablement);
});
CommandsRegistry.registerCommand('_executeColorPresentationProvider', function (accessor, ...args) {
    const [color, context] = args;
    const { uri, range } = context;
    if (!(uri instanceof URI) || !Array.isArray(color) || color.length !== 4 || !Range.isIRange(range)) {
        throw illegalArgument();
    }
    const { model, colorProviderRegistry, defaultColorDecoratorsEnablement } = _setupColorCommand(accessor, uri);
    const [red, green, blue, alpha] = color;
    return _findColorData(new ColorPresentationsCollector({ range: range, color: { red, green, blue, alpha } }), colorProviderRegistry, model, CancellationToken.None, defaultColorDecoratorsEnablement);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9jb2xvclBpY2tlckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQW1DLG9CQUFvQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFMUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSwyQkFBMkIsRUFBRSxxQkFBcUIsRUFBaUIsTUFBTSxZQUFZLENBQUM7QUFDbkksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxvQ0FBb0MsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzVLLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV0RCxvQkFBb0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQ2hELG9CQUFvQixDQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFDM0QsZUFBZSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFFbEQsMEJBQTBCLENBQUMsNEJBQTRCLENBQUMsRUFBRSxFQUFFLDRCQUE0QixpRUFBeUQsQ0FBQztBQUNsSiwwQkFBMEIsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLEVBQUUsK0JBQStCLDJEQUFtRCxDQUFDO0FBQ2xKLDBCQUEwQixDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsYUFBYSwyREFBbUQsQ0FBQztBQUM5RyxxQkFBcUIsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBRTNELHdCQUF3QixDQUFDLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBRS9ELGdCQUFnQixDQUFDLGVBQWUsQ0FBQywrQkFBK0IsRUFBRSxVQUFVLFFBQVEsRUFBRSxHQUFHLElBQUk7SUFDNUYsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUN4QixJQUFJLENBQUMsQ0FBQyxRQUFRLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNoQyxNQUFNLGVBQWUsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFDRCxNQUFNLEVBQUUsS0FBSyxFQUFFLHFCQUFxQixFQUFFLGdDQUFnQyxFQUFFLEdBQUcsa0JBQWtCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2xILE9BQU8sY0FBYyxDQUFnQixJQUFJLHFCQUFxQixFQUFFLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixDQUFDLElBQUksRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQzNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLG1DQUFtQyxFQUFFLFVBQVUsUUFBUSxFQUFFLEdBQUcsSUFBSTtJQUNoRyxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQztJQUM5QixNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUMvQixJQUFJLENBQUMsQ0FBQyxHQUFHLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3BHLE1BQU0sZUFBZSxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUNELE1BQU0sRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUUsZ0NBQWdDLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0csTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUN4QyxPQUFPLGNBQWMsQ0FBcUIsSUFBSSwyQkFBMkIsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztBQUMxTixDQUFDLENBQUMsQ0FBQyJ9