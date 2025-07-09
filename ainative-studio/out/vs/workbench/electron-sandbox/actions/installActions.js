/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { Action2 } from '../../../platform/actions/common/actions.js';
import product from '../../../platform/product/common/product.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { isCancellationError } from '../../../base/common/errors.js';
const shellCommandCategory = localize2('shellCommand', 'Shell Command');
export class InstallShellScriptAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.installCommandLine',
            title: localize2('install', "Install '{0}' command in PATH", product.applicationName),
            category: shellCommandCategory,
            f1: true
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const productService = accessor.get(IProductService);
        try {
            await nativeHostService.installShellCommand();
            dialogService.info(localize('successIn', "Shell command '{0}' successfully installed in PATH.", productService.applicationName));
        }
        catch (error) {
            if (isCancellationError(error)) {
                return;
            }
            dialogService.error(toErrorMessage(error));
        }
    }
}
export class UninstallShellScriptAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.uninstallCommandLine',
            title: localize2('uninstall', "Uninstall '{0}' command from PATH", product.applicationName),
            category: shellCommandCategory,
            f1: true
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const productService = accessor.get(IProductService);
        try {
            await nativeHostService.uninstallShellCommand();
            dialogService.info(localize('successFrom', "Shell command '{0}' successfully uninstalled from PATH.", productService.applicationName));
        }
        catch (error) {
            if (isCancellationError(error)) {
                return;
            }
            dialogService.error(toErrorMessage(error));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2VsZWN0cm9uLXNhbmRib3gvYWN0aW9ucy9pbnN0YWxsQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV0RSxPQUFPLE9BQU8sTUFBTSw2Q0FBNkMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRSxNQUFNLG9CQUFvQixHQUFxQixTQUFTLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0FBRTFGLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxPQUFPO0lBRXBEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHFDQUFxQztZQUN6QyxLQUFLLEVBQUUsU0FBUyxDQUFDLFNBQVMsRUFBRSwrQkFBK0IsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDO1lBQ3JGLFFBQVEsRUFBRSxvQkFBb0I7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFckQsSUFBSSxDQUFDO1lBQ0osTUFBTSxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBRTlDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxxREFBcUQsRUFBRSxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUNsSSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLE9BQU87WUFDUixDQUFDO1lBRUQsYUFBYSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM1QyxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDBCQUEyQixTQUFRLE9BQU87SUFFdEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsdUNBQXVDO1lBQzNDLEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxFQUFFLG1DQUFtQyxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUM7WUFDM0YsUUFBUSxFQUFFLG9CQUFvQjtZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVyRCxJQUFJLENBQUM7WUFDSixNQUFNLGlCQUFpQixDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFFaEQsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLHlEQUF5RCxFQUFFLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ3hJLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsT0FBTztZQUNSLENBQUM7WUFFRCxhQUFhLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==