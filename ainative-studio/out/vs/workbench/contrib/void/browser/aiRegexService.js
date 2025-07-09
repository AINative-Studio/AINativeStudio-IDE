"use strict";
/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWdleFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2FpUmVnZXhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OzBGQUcwRjtBQUUxRixnQkFBZ0I7QUFDaEIsMENBQTBDO0FBQzFDLHdEQUF3RDtBQUN4RCxvREFBb0Q7QUFDcEQsaUJBQWlCO0FBQ2pCLDBCQUEwQjtBQUMxQix3QkFBd0I7QUFDeEIsb0NBQW9DO0FBQ3BDLDRHQUE0RztBQUc1Ryw2RUFBNkU7QUFFN0UsdUNBQXVDO0FBQ3ZDLGdDQUFnQztBQUNoQyxlQUFlO0FBQ2YsUUFBUTtBQUNSLGdDQUFnQztBQUNoQyw2QkFBNkI7QUFDN0IsUUFBUTtBQUdSLGdEQUFnRDtBQUNoRCwrREFBK0Q7QUFDL0Qsb0NBQW9DO0FBQ3BDLGtCQUFrQjtBQUNsQiwwQkFBMEI7QUFDMUIsdUJBQXVCO0FBQ3ZCLDBEQUEwRDtBQUMxRCwyQkFBMkI7QUFDM0IscUJBQXFCO0FBQ3JCLHdDQUF3QztBQUN4QyxpREFBaUQ7QUFDakQsbUJBQW1CO0FBQ25CLGNBQWM7QUFDZCxpQ0FBaUM7QUFDakMsdUJBQXVCO0FBQ3ZCLGFBQWE7QUFDYixhQUFhO0FBQ2IsWUFBWTtBQUVaLHdFQUF3RTtBQUV4RSwwQkFBMEI7QUFDMUIsMkNBQTJDO0FBQzNDLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQsWUFBWTtBQUNaLFlBQVk7QUFFWix5QkFBeUI7QUFDekIsVUFBVTtBQUVWLGtCQUFrQjtBQUNsQixtQ0FBbUM7QUFFbkMsb0NBQW9DO0FBQ3BDLG1DQUFtQztBQUNuQyx5REFBeUQ7QUFDekQsVUFBVTtBQU9WLHFCQUFxQjtBQUNyQixrREFBa0Q7QUFDbEQseUJBQXlCO0FBQ3pCLG1CQUFtQjtBQUNuQixzQ0FBc0M7QUFDdEMsNEJBQTRCO0FBQzVCLGlCQUFpQjtBQUNqQixXQUFXO0FBQ1gsV0FBVztBQUNYLFVBQVU7QUFFViw2QkFBNkI7QUFFN0IsUUFBUTtBQUdSLElBQUk7QUFHSix1SkFBdUo7QUFFdkoscUNBQXFDO0FBRXJDLFFBQVE7QUFFUixLQUFLO0FBSUwsaUNBQWlDO0FBQ2pDLGtDQUFrQztBQUlsQyw2QkFBNkI7QUFDN0IsSUFBSSJ9