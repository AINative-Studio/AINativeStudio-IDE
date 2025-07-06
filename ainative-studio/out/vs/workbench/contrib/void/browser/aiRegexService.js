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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWdleFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvYWlSZWdleFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7MEZBRzBGO0FBRTFGLGdCQUFnQjtBQUNoQiwwQ0FBMEM7QUFDMUMsd0RBQXdEO0FBQ3hELG9EQUFvRDtBQUNwRCxpQkFBaUI7QUFDakIsMEJBQTBCO0FBQzFCLHdCQUF3QjtBQUN4QixvQ0FBb0M7QUFDcEMsNEdBQTRHO0FBRzVHLDZFQUE2RTtBQUU3RSx1Q0FBdUM7QUFDdkMsZ0NBQWdDO0FBQ2hDLGVBQWU7QUFDZixRQUFRO0FBQ1IsZ0NBQWdDO0FBQ2hDLDZCQUE2QjtBQUM3QixRQUFRO0FBR1IsZ0RBQWdEO0FBQ2hELCtEQUErRDtBQUMvRCxvQ0FBb0M7QUFDcEMsa0JBQWtCO0FBQ2xCLDBCQUEwQjtBQUMxQix1QkFBdUI7QUFDdkIsMERBQTBEO0FBQzFELDJCQUEyQjtBQUMzQixxQkFBcUI7QUFDckIsd0NBQXdDO0FBQ3hDLGlEQUFpRDtBQUNqRCxtQkFBbUI7QUFDbkIsY0FBYztBQUNkLGlDQUFpQztBQUNqQyx1QkFBdUI7QUFDdkIsYUFBYTtBQUNiLGFBQWE7QUFDYixZQUFZO0FBRVosd0VBQXdFO0FBRXhFLDBCQUEwQjtBQUMxQiwyQ0FBMkM7QUFDM0MsbUNBQW1DO0FBQ25DLGlEQUFpRDtBQUNqRCxZQUFZO0FBQ1osWUFBWTtBQUVaLHlCQUF5QjtBQUN6QixVQUFVO0FBRVYsa0JBQWtCO0FBQ2xCLG1DQUFtQztBQUVuQyxvQ0FBb0M7QUFDcEMsbUNBQW1DO0FBQ25DLHlEQUF5RDtBQUN6RCxVQUFVO0FBT1YscUJBQXFCO0FBQ3JCLGtEQUFrRDtBQUNsRCx5QkFBeUI7QUFDekIsbUJBQW1CO0FBQ25CLHNDQUFzQztBQUN0Qyw0QkFBNEI7QUFDNUIsaUJBQWlCO0FBQ2pCLFdBQVc7QUFDWCxXQUFXO0FBQ1gsVUFBVTtBQUVWLDZCQUE2QjtBQUU3QixRQUFRO0FBR1IsSUFBSTtBQUdKLHVKQUF1SjtBQUV2SixxQ0FBcUM7QUFFckMsUUFBUTtBQUVSLEtBQUs7QUFJTCxpQ0FBaUM7QUFDakMsa0NBQWtDO0FBSWxDLDZCQUE2QjtBQUM3QixJQUFJIn0=