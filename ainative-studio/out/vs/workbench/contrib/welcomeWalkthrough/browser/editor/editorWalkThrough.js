/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import content from './vs_code_editor_walkthrough.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WalkThroughInput } from '../walkThroughInput.js';
import { FileAccess, Schemas } from '../../../../../base/common/network.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { walkThroughContentRegistry } from '../../common/walkThroughContentProvider.js';
walkThroughContentRegistry.registerProvider('vs/workbench/contrib/welcomeWalkthrough/browser/editor/vs_code_editor_walkthrough', content);
const typeId = 'workbench.editors.walkThroughInput';
const inputOptions = {
    typeId,
    name: localize('editorWalkThrough.title', "Editor Playground"),
    resource: FileAccess.asBrowserUri('vs/workbench/contrib/welcomeWalkthrough/browser/editor/vs_code_editor_walkthrough.md')
        .with({
        scheme: Schemas.walkThrough,
        query: JSON.stringify({ moduleId: 'vs/workbench/contrib/welcomeWalkthrough/browser/editor/vs_code_editor_walkthrough' })
    }),
    telemetryFrom: 'walkThrough'
};
export class EditorWalkThroughAction extends Action2 {
    static { this.ID = 'workbench.action.showInteractivePlayground'; }
    static { this.LABEL = localize2('editorWalkThrough', 'Interactive Editor Playground'); }
    constructor() {
        super({
            id: EditorWalkThroughAction.ID,
            title: EditorWalkThroughAction.LABEL,
            category: Categories.Help,
            f1: true,
            metadata: {
                description: localize2('editorWalkThroughMetadata', "Opens an interactive playground for learning about the editor.")
            }
        });
    }
    run(serviceAccessor) {
        const editorService = serviceAccessor.get(IEditorService);
        const instantiationService = serviceAccessor.get(IInstantiationService);
        const input = instantiationService.createInstance(WalkThroughInput, inputOptions);
        // TODO @lramos15 adopt the resolver here
        return editorService.openEditor(input, { pinned: true })
            .then(() => void (0));
    }
}
export class EditorWalkThroughInputSerializer {
    static { this.ID = typeId; }
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(WalkThroughInput, inputOptions);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2Fsa1Rocm91Z2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZVdhbGt0aHJvdWdoL2Jyb3dzZXIvZWRpdG9yL2VkaXRvcldhbGtUaHJvdWdoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQTJCLE1BQU0sd0JBQXdCLENBQUM7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUc1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXhGLDBCQUEwQixDQUFDLGdCQUFnQixDQUFDLG1GQUFtRixFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRTFJLE1BQU0sTUFBTSxHQUFHLG9DQUFvQyxDQUFDO0FBQ3BELE1BQU0sWUFBWSxHQUE0QjtJQUM3QyxNQUFNO0lBQ04sSUFBSSxFQUFFLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxtQkFBbUIsQ0FBQztJQUM5RCxRQUFRLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxzRkFBc0YsQ0FBQztTQUN2SCxJQUFJLENBQUM7UUFDTCxNQUFNLEVBQUUsT0FBTyxDQUFDLFdBQVc7UUFDM0IsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLEVBQUUsbUZBQW1GLEVBQUUsQ0FBQztLQUN4SCxDQUFDO0lBQ0gsYUFBYSxFQUFFLGFBQWE7Q0FDNUIsQ0FBQztBQUVGLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxPQUFPO2FBRTVCLE9BQUUsR0FBRyw0Q0FBNEMsQ0FBQzthQUNsRCxVQUFLLEdBQUcsU0FBUyxDQUFDLG1CQUFtQixFQUFFLCtCQUErQixDQUFDLENBQUM7SUFFL0Y7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsdUJBQXVCLENBQUMsRUFBRTtZQUM5QixLQUFLLEVBQUUsdUJBQXVCLENBQUMsS0FBSztZQUNwQyxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLFNBQVMsQ0FBQywyQkFBMkIsRUFBRSxnRUFBZ0UsQ0FBQzthQUNySDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFZSxHQUFHLENBQUMsZUFBaUM7UUFDcEQsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxRCxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN4RSxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEYseUNBQXlDO1FBQ3pDLE9BQU8sYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDdEQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7O0FBR0YsTUFBTSxPQUFPLGdDQUFnQzthQUU1QixPQUFFLEdBQUcsTUFBTSxDQUFDO0lBRXJCLFlBQVksQ0FBQyxXQUF3QjtRQUMzQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTSxTQUFTLENBQUMsV0FBd0I7UUFDeEMsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU0sV0FBVyxDQUFDLG9CQUEyQztRQUM3RCxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUM1RSxDQUFDIn0=