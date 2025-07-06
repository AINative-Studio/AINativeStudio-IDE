"use strict";
/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
// 1. search(ai)
// - tool use to find all possible changes
// - if search only: is this file related to the search?
// - if search + replace: should I modify this file?
// 2. replace(ai)
// - what changes to make?
// 3. postprocess errors
// -fastapply changes simultaneously
// -iterate on syntax errors (all files can be changed from a syntax error, not just the one with the error)
// private async _searchUsingAI({ searchClause }: { searchClause: string }) {
// 	// 		const relevantURIs: URI[] = []
// 	// 		const gatherPrompt = `\
// 	// asdasdas
// 	// `
// 	// 		const filterPrompt = `\
// 	// Is this file relevant?
// 	// `
// 	// 		// optimizations (DO THESE LATER!!!!!!)
// 	// 		// if tool includes a uri in uriSet, skip it obviously
// 	// 		let uriSet = new Set<URI>()
// 	// 		// gather
// 	// 		let messages = []
// 	// 		while (true) {
// 	// 			const result = await new Promise((res, rej) => {
// 	// 				sendLLMMessage({
// 	// 					messages,
// 	// 					tools: ['search_for_files'],
// 	// 					onFinalMessage: ({ result: r, }) => {
// 	// 						res(r)
// 	// 					},
// 	// 					onError: (error) => {
// 	// 						rej(error)
// 	// 					}
// 	// 				})
// 	// 			})
// 	// 			messages.push({ role: 'tool', content: turnToString(result) })
// 	// 			sendLLMMessage({
// 	// 				messages: { 'Output ': result },
// 	// 				onFinalMessage: (r) => {
// 	// 					// output is file1\nfile2\nfile3\n...
// 	// 				}
// 	// 			})
// 	// 			uriSet.add(...)
// 	// 		}
// 	// 		// writes
// 	// 		if (!replaceClause) return
// 	// 		for (const uri of uriSet) {
// 	// 			// in future, batch these
// 	// 			applyWorkflow({ uri, applyStr: replaceClause })
// 	// 		}
// 	// while (true) {
// 	// 	const result = new Promise((res, rej) => {
// 	// 		sendLLMMessage({
// 	// 			messages,
// 	// 			tools: ['search_for_files'],
// 	// 			onResult: (r) => {
// 	// 				res(r)
// 	// 			}
// 	// 		})
// 	// 	})
// 	// 	messages.push(result)
// 	// }
// }
// private async _replaceUsingAI({ searchClause, replaceClause, relevantURIs }: { searchClause: string, replaceClause: string, relevantURIs: URI[] }) {
// 	for (const uri of relevantURIs) {
// 		uri
// 	}
// 	// should I change this file?
// 	// if so what changes to make?
// 	// fast apply the changes
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWdleFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9haVJlZ2V4U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OzswRkFHMEY7QUFFMUYsZ0JBQWdCO0FBQ2hCLDBDQUEwQztBQUMxQyx3REFBd0Q7QUFDeEQsb0RBQW9EO0FBQ3BELGlCQUFpQjtBQUNqQiwwQkFBMEI7QUFDMUIsd0JBQXdCO0FBQ3hCLG9DQUFvQztBQUNwQyw0R0FBNEc7QUFHNUcsNkVBQTZFO0FBRTdFLHVDQUF1QztBQUN2QyxnQ0FBZ0M7QUFDaEMsZUFBZTtBQUNmLFFBQVE7QUFDUixnQ0FBZ0M7QUFDaEMsNkJBQTZCO0FBQzdCLFFBQVE7QUFHUixnREFBZ0Q7QUFDaEQsK0RBQStEO0FBQy9ELG9DQUFvQztBQUNwQyxrQkFBa0I7QUFDbEIsMEJBQTBCO0FBQzFCLHVCQUF1QjtBQUN2QiwwREFBMEQ7QUFDMUQsMkJBQTJCO0FBQzNCLHFCQUFxQjtBQUNyQix3Q0FBd0M7QUFDeEMsaURBQWlEO0FBQ2pELG1CQUFtQjtBQUNuQixjQUFjO0FBQ2QsaUNBQWlDO0FBQ2pDLHVCQUF1QjtBQUN2QixhQUFhO0FBQ2IsYUFBYTtBQUNiLFlBQVk7QUFFWix3RUFBd0U7QUFFeEUsMEJBQTBCO0FBQzFCLDJDQUEyQztBQUMzQyxtQ0FBbUM7QUFDbkMsaURBQWlEO0FBQ2pELFlBQVk7QUFDWixZQUFZO0FBRVoseUJBQXlCO0FBQ3pCLFVBQVU7QUFFVixrQkFBa0I7QUFDbEIsbUNBQW1DO0FBRW5DLG9DQUFvQztBQUNwQyxtQ0FBbUM7QUFDbkMseURBQXlEO0FBQ3pELFVBQVU7QUFPVixxQkFBcUI7QUFDckIsa0RBQWtEO0FBQ2xELHlCQUF5QjtBQUN6QixtQkFBbUI7QUFDbkIsc0NBQXNDO0FBQ3RDLDRCQUE0QjtBQUM1QixpQkFBaUI7QUFDakIsV0FBVztBQUNYLFdBQVc7QUFDWCxVQUFVO0FBRVYsNkJBQTZCO0FBRTdCLFFBQVE7QUFHUixJQUFJO0FBR0osdUpBQXVKO0FBRXZKLHFDQUFxQztBQUVyQyxRQUFRO0FBRVIsS0FBSztBQUlMLGlDQUFpQztBQUNqQyxrQ0FBa0M7QUFJbEMsNkJBQTZCO0FBQzdCLElBQUkifQ==