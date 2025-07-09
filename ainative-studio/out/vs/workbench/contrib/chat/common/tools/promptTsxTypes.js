/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function stringifyPromptElementJSON(element) {
    const strs = [];
    stringifyPromptNodeJSON(element.node, strs);
    return strs.join('');
}
function stringifyPromptNodeJSON(node, strs) {
    if (node.type === 2 /* PromptNodeType.Text */) {
        if (node.lineBreakBefore) {
            strs.push('\n');
        }
        if (typeof node.text === 'string') {
            strs.push(node.text);
        }
    }
    else if (node.ctor === 3 /* PieceCtorKind.ImageChatMessage */) {
        // This case currently can't be hit by prompt-tsx
        strs.push('<image>');
    }
    else if (node.ctor === 1 /* PieceCtorKind.BaseChatMessage */ || node.ctor === 2 /* PieceCtorKind.Other */) {
        for (const child of node.children) {
            stringifyPromptNodeJSON(child, strs);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VHN4VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvcHJvbXB0VHN4VHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUErQ2hHLE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxPQUEwQjtJQUNwRSxNQUFNLElBQUksR0FBYSxFQUFFLENBQUM7SUFDMUIsdUJBQXVCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEIsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsSUFBb0IsRUFBRSxJQUFjO0lBQ3BFLElBQUksSUFBSSxDQUFDLElBQUksZ0NBQXdCLEVBQUUsQ0FBQztRQUN2QyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pCLENBQUM7UUFFRCxJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixDQUFDO0lBQ0YsQ0FBQztTQUFNLElBQUksSUFBSSxDQUFDLElBQUksMkNBQW1DLEVBQUUsQ0FBQztRQUN6RCxpREFBaUQ7UUFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN0QixDQUFDO1NBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSwwQ0FBa0MsSUFBSSxJQUFJLENBQUMsSUFBSSxnQ0FBd0IsRUFBRSxDQUFDO1FBQzdGLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25DLHVCQUF1QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0QyxDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUMifQ==