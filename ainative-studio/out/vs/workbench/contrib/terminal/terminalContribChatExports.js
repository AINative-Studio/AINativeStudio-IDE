/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// HACK: Export chat parts as it's only partially encapsulated within the contrib. This file only
// exists because including it into terminalContribExports would cause a circular dependency on
// startup
export { TerminalChatContextKeys } from '../terminalContrib/chat/browser/terminalChat.js';
export { TerminalChatController } from '../terminalContrib/chat/browser/terminalChatController.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250cmliQ2hhdEV4cG9ydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXJtaW5hbENvbnRyaWJDaGF0RXhwb3J0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxpR0FBaUc7QUFDakcsK0ZBQStGO0FBQy9GLFVBQVU7QUFDVixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQyJ9