/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DebugNameData } from './debugName.js';
import { CancellationError, CancellationTokenSource } from './commonFacade/cancellation.js';
import { Derived } from './derived.js';
import { strictEquals } from './commonFacade/deps.js';
import { autorun } from './autorun.js';
export function waitForState(observable, predicate, isError, cancellationToken) {
    if (!predicate) {
        predicate = state => state !== null && state !== undefined;
    }
    return new Promise((resolve, reject) => {
        let isImmediateRun = true;
        let shouldDispose = false;
        const stateObs = observable.map(state => {
            /** @description waitForState.state */
            return {
                isFinished: predicate(state),
                error: isError ? isError(state) : false,
                state
            };
        });
        const d = autorun(reader => {
            /** @description waitForState */
            const { isFinished, error, state } = stateObs.read(reader);
            if (isFinished || error) {
                if (isImmediateRun) {
                    // The variable `d` is not initialized yet
                    shouldDispose = true;
                }
                else {
                    d.dispose();
                }
                if (error) {
                    reject(error === true ? state : error);
                }
                else {
                    resolve(state);
                }
            }
        });
        if (cancellationToken) {
            const dc = cancellationToken.onCancellationRequested(() => {
                d.dispose();
                dc.dispose();
                reject(new CancellationError());
            });
            if (cancellationToken.isCancellationRequested) {
                d.dispose();
                dc.dispose();
                reject(new CancellationError());
                return;
            }
        }
        isImmediateRun = false;
        if (shouldDispose) {
            d.dispose();
        }
    });
}
export function derivedWithCancellationToken(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    let cancellationTokenSource = undefined;
    return new Derived(new DebugNameData(owner, undefined, computeFn), r => {
        if (cancellationTokenSource) {
            cancellationTokenSource.dispose(true);
        }
        cancellationTokenSource = new CancellationTokenSource();
        return computeFn(r, cancellationTokenSource.token);
    }, undefined, undefined, () => cancellationTokenSource?.dispose(), strictEquals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHNDYW5jZWxsYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL3V0aWxzQ2FuY2VsbGF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0csT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQVF2QyxNQUFNLFVBQVUsWUFBWSxDQUFJLFVBQTBCLEVBQUUsU0FBaUMsRUFBRSxPQUFxRCxFQUFFLGlCQUFxQztJQUMxTCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsU0FBUyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEtBQUssU0FBUyxDQUFDO0lBQzVELENBQUM7SUFDRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3RDLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN2QyxzQ0FBc0M7WUFDdEMsT0FBTztnQkFDTixVQUFVLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQztnQkFDNUIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO2dCQUN2QyxLQUFLO2FBQ0wsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzFCLGdDQUFnQztZQUNoQyxNQUFNLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNELElBQUksVUFBVSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN6QixJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUNwQiwwQ0FBMEM7b0JBQzFDLGFBQWEsR0FBRyxJQUFJLENBQUM7Z0JBQ3RCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2IsQ0FBQztnQkFDRCxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLE1BQU0sQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN4QyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sRUFBRSxHQUFHLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtnQkFDekQsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNaLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDYixNQUFNLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7WUFDakMsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQy9DLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDWixFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO2dCQUNoQyxPQUFPO1lBQ1IsQ0FBQztRQUNGLENBQUM7UUFDRCxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUlELE1BQU0sVUFBVSw0QkFBNEIsQ0FBSSxnQkFBeUYsRUFBRSxvQkFBcUY7SUFDL04sSUFBSSxTQUEyRCxDQUFDO0lBQ2hFLElBQUksS0FBaUIsQ0FBQztJQUN0QixJQUFJLG9CQUFvQixLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3hDLFNBQVMsR0FBRyxnQkFBdUIsQ0FBQztRQUNwQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0lBQ25CLENBQUM7U0FBTSxDQUFDO1FBQ1AsS0FBSyxHQUFHLGdCQUFnQixDQUFDO1FBQ3pCLFNBQVMsR0FBRyxvQkFBMkIsQ0FBQztJQUN6QyxDQUFDO0lBRUQsSUFBSSx1QkFBdUIsR0FBd0MsU0FBUyxDQUFDO0lBQzdFLE9BQU8sSUFBSSxPQUFPLENBQ2pCLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQzlDLENBQUMsQ0FBQyxFQUFFO1FBQ0gsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1lBQzdCLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsdUJBQXVCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQ3hELE9BQU8sU0FBUyxDQUFDLENBQUMsRUFBRSx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNwRCxDQUFDLEVBQUUsU0FBUyxFQUNaLFNBQVMsRUFDVCxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsRUFDeEMsWUFBWSxDQUNaLENBQUM7QUFDSCxDQUFDIn0=