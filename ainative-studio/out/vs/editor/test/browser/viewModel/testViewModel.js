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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci92aWV3TW9kZWwvdGVzdFZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTlGLE1BQU0sVUFBVSxhQUFhLENBQUMsSUFBYyxFQUFFLE9BQXVCLEVBQUUsUUFBMEQ7SUFDaEksTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRXBCLE1BQU0sYUFBYSxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMvQyxNQUFNLGtDQUFrQyxHQUFHLGtDQUFrQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDNUcsTUFBTSxnQ0FBZ0MsR0FBRyxJQUFJLGdDQUFnQyxFQUFFLENBQUM7SUFDaEYsTUFBTSxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsa0NBQWtDLEVBQUUsa0NBQWtDLEVBQUUsSUFBSyxFQUFFLGdDQUFnQyxFQUFFLElBQUksZ0JBQWdCLEVBQUUsRUFBRTtRQUN6TSxlQUFlLENBQUMsWUFBWSxFQUFFLFVBQVU7UUFDeEMsQ0FBQztLQUNELEVBQUU7UUFDRixZQUFZLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRTtLQUMxQixDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRTNCLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNwQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDaEIsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3hCLGdDQUFnQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzVDLENBQUMifQ==