/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ViewModel } from '../../../common/viewModel/viewModelImpl.js';
import { TestConfiguration } from '../config/testConfiguration.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { createTextModel } from '../../common/testTextModel.js';
import { TestLanguageConfigurationService } from '../../common/modes/testLanguageConfigurationService.js';
import { TestThemeService } from '../../../../platform/theme/test/common/testThemeService.js';
export function testViewModel(text, options, callback) {
    const EDITOR_ID = 1;
    const configuration = new TestConfiguration(options);
    const model = createTextModel(text.join('\n'));
    const monospaceLineBreaksComputerFactory = MonospaceLineBreaksComputerFactory.create(configuration.options);
    const testLanguageConfigurationService = new TestLanguageConfigurationService();
    const viewModel = new ViewModel(EDITOR_ID, configuration, model, monospaceLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, null, testLanguageConfigurationService, new TestThemeService(), {
        setVisibleLines(visibleLines, stabilized) {
        },
    }, {
        batchChanges: (cb) => cb(),
    });
    callback(viewModel, model);
    viewModel.dispose();
    model.dispose();
    configuration.dispose();
    testLanguageConfigurationService.dispose();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3ZpZXdNb2RlbC90ZXN0Vmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDMUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFOUYsTUFBTSxVQUFVLGFBQWEsQ0FBQyxJQUFjLEVBQUUsT0FBdUIsRUFBRSxRQUEwRDtJQUNoSSxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFFcEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9DLE1BQU0sa0NBQWtDLEdBQUcsa0NBQWtDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM1RyxNQUFNLGdDQUFnQyxHQUFHLElBQUksZ0NBQWdDLEVBQUUsQ0FBQztJQUNoRixNQUFNLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxrQ0FBa0MsRUFBRSxrQ0FBa0MsRUFBRSxJQUFLLEVBQUUsZ0NBQWdDLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxFQUFFO1FBQ3pNLGVBQWUsQ0FBQyxZQUFZLEVBQUUsVUFBVTtRQUN4QyxDQUFDO0tBQ0QsRUFBRTtRQUNGLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO0tBQzFCLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFM0IsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNoQixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDeEIsZ0NBQWdDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDNUMsQ0FBQyJ9