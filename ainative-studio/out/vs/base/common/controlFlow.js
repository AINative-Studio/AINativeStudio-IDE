/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from './errors.js';
/*
 * This file contains helper classes to manage control flow.
*/
/**
 * Prevents code from being re-entrant.
*/
export class ReentrancyBarrier {
    constructor() {
        this._isOccupied = false;
    }
    /**
     * Calls `runner` if the barrier is not occupied.
     * During the call, the barrier becomes occupied.
     */
    runExclusivelyOrSkip(runner) {
        if (this._isOccupied) {
            return;
        }
        this._isOccupied = true;
        try {
            runner();
        }
        finally {
            this._isOccupied = false;
        }
    }
    /**
     * Calls `runner`. If the barrier is occupied, throws an error.
     * During the call, the barrier becomes active.
     */
    runExclusivelyOrThrow(runner) {
        if (this._isOccupied) {
            throw new BugIndicatingError(`ReentrancyBarrier: reentrant call detected!`);
        }
        this._isOccupied = true;
        try {
            runner();
        }
        finally {
            this._isOccupied = false;
        }
    }
    /**
     * Indicates if some runner occupies this barrier.
    */
    get isOccupied() {
        return this._isOccupied;
    }
    makeExclusiveOrSkip(fn) {
        return ((...args) => {
            if (this._isOccupied) {
                return;
            }
            this._isOccupied = true;
            try {
                return fn(...args);
            }
            finally {
                this._isOccupied = false;
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbEZsb3cuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY29udHJvbEZsb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRWpEOztFQUVFO0FBRUY7O0VBRUU7QUFDRixNQUFNLE9BQU8saUJBQWlCO0lBQTlCO1FBQ1MsZ0JBQVcsR0FBRyxLQUFLLENBQUM7SUFzRDdCLENBQUM7SUFwREE7OztPQUdHO0lBQ0ksb0JBQW9CLENBQUMsTUFBa0I7UUFDN0MsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUM7WUFDSixNQUFNLEVBQUUsQ0FBQztRQUNWLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRUQ7OztPQUdHO0lBQ0kscUJBQXFCLENBQUMsTUFBa0I7UUFDOUMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsTUFBTSxJQUFJLGtCQUFrQixDQUFDLDZDQUE2QyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLElBQUksQ0FBQztZQUNKLE1BQU0sRUFBRSxDQUFDO1FBQ1YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFRDs7TUFFRTtJQUNGLElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVNLG1CQUFtQixDQUE2QixFQUFhO1FBQ25FLE9BQU8sQ0FBQyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7WUFDMUIsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7WUFDeEIsSUFBSSxDQUFDO2dCQUNKLE9BQU8sRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDcEIsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQzFCLENBQUM7UUFDRixDQUFDLENBQVEsQ0FBQztJQUNYLENBQUM7Q0FDRCJ9