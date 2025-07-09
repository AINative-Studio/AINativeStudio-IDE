/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './placeholderText.css';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { ghostTextForeground } from '../../../common/core/editorColorRegistry.js';
import { localize } from '../../../../nls.js';
import { registerColor } from '../../../../platform/theme/common/colorUtils.js';
import { PlaceholderTextContribution } from './placeholderTextContribution.js';
import { wrapInReloadableClass1 } from '../../../../platform/observable/common/wrapInReloadableClass.js';
registerEditorContribution(PlaceholderTextContribution.ID, wrapInReloadableClass1(() => PlaceholderTextContribution), 0 /* EditorContributionInstantiation.Eager */);
registerColor('editor.placeholder.foreground', ghostTextForeground, localize('placeholderForeground', 'Foreground color of the placeholder text in the editor.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhY2Vob2xkZXJUZXh0LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9wbGFjZWhvbGRlclRleHQvYnJvd3Nlci9wbGFjZWhvbGRlclRleHQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sdUJBQXVCLENBQUM7QUFDL0IsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFFekcsMEJBQTBCLENBQUMsMkJBQTJCLENBQUMsRUFBRSxFQUFFLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLDJCQUEyQixDQUFDLGdEQUF3QyxDQUFDO0FBRTdKLGFBQWEsQ0FBQywrQkFBK0IsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUseURBQXlELENBQUMsQ0FBQyxDQUFDIn0=