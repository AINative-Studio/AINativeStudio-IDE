/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var inputLatency;
(function (inputLatency) {
    const totalKeydownTime = { total: 0, min: Number.MAX_VALUE, max: 0 };
    const totalInputTime = { ...totalKeydownTime };
    const totalRenderTime = { ...totalKeydownTime };
    const totalInputLatencyTime = { ...totalKeydownTime };
    let measurementsCount = 0;
    // The state of each event, this helps ensure the integrity of the measurement and that
    // something unexpected didn't happen that could skew the measurement.
    let EventPhase;
    (function (EventPhase) {
        EventPhase[EventPhase["Before"] = 0] = "Before";
        EventPhase[EventPhase["InProgress"] = 1] = "InProgress";
        EventPhase[EventPhase["Finished"] = 2] = "Finished";
    })(EventPhase || (EventPhase = {}));
    const state = {
        keydown: 0 /* EventPhase.Before */,
        input: 0 /* EventPhase.Before */,
        render: 0 /* EventPhase.Before */,
    };
    /**
     * Record the start of the keydown event.
     */
    function onKeyDown() {
        /** Direct Check C. See explanation in {@link recordIfFinished} */
        recordIfFinished();
        performance.mark('inputlatency/start');
        performance.mark('keydown/start');
        state.keydown = 1 /* EventPhase.InProgress */;
        queueMicrotask(markKeyDownEnd);
    }
    inputLatency.onKeyDown = onKeyDown;
    /**
     * Mark the end of the keydown event.
     */
    function markKeyDownEnd() {
        if (state.keydown === 1 /* EventPhase.InProgress */) {
            performance.mark('keydown/end');
            state.keydown = 2 /* EventPhase.Finished */;
        }
    }
    /**
     * Record the start of the beforeinput event.
     */
    function onBeforeInput() {
        performance.mark('input/start');
        state.input = 1 /* EventPhase.InProgress */;
        /** Schedule Task A. See explanation in {@link recordIfFinished} */
        scheduleRecordIfFinishedTask();
    }
    inputLatency.onBeforeInput = onBeforeInput;
    /**
     * Record the start of the input event.
     */
    function onInput() {
        if (state.input === 0 /* EventPhase.Before */) {
            // it looks like we didn't receive a `beforeinput`
            onBeforeInput();
        }
        queueMicrotask(markInputEnd);
    }
    inputLatency.onInput = onInput;
    function markInputEnd() {
        if (state.input === 1 /* EventPhase.InProgress */) {
            performance.mark('input/end');
            state.input = 2 /* EventPhase.Finished */;
        }
    }
    /**
     * Record the start of the keyup event.
     */
    function onKeyUp() {
        /** Direct Check D. See explanation in {@link recordIfFinished} */
        recordIfFinished();
    }
    inputLatency.onKeyUp = onKeyUp;
    /**
     * Record the start of the selectionchange event.
     */
    function onSelectionChange() {
        /** Direct Check E. See explanation in {@link recordIfFinished} */
        recordIfFinished();
    }
    inputLatency.onSelectionChange = onSelectionChange;
    /**
     * Record the start of the animation frame performing the rendering.
     */
    function onRenderStart() {
        // Render may be triggered during input, but we only measure the following animation frame
        if (state.keydown === 2 /* EventPhase.Finished */ && state.input === 2 /* EventPhase.Finished */ && state.render === 0 /* EventPhase.Before */) {
            // Only measure the first render after keyboard input
            performance.mark('render/start');
            state.render = 1 /* EventPhase.InProgress */;
            queueMicrotask(markRenderEnd);
            /** Schedule Task B. See explanation in {@link recordIfFinished} */
            scheduleRecordIfFinishedTask();
        }
    }
    inputLatency.onRenderStart = onRenderStart;
    /**
     * Mark the end of the animation frame performing the rendering.
     */
    function markRenderEnd() {
        if (state.render === 1 /* EventPhase.InProgress */) {
            performance.mark('render/end');
            state.render = 2 /* EventPhase.Finished */;
        }
    }
    function scheduleRecordIfFinishedTask() {
        // Here we can safely assume that the `setTimeout` will not be
        // artificially delayed by 4ms because we schedule it from
        // event handlers
        setTimeout(recordIfFinished);
    }
    /**
     * Record the input latency sample if input handling and rendering are finished.
     *
     * The challenge here is that we want to record the latency in such a way that it includes
     * also the layout and painting work the browser does during the animation frame task.
     *
     * Simply scheduling a new task (via `setTimeout`) from the animation frame task would
     * schedule the new task at the end of the task queue (after other code that uses `setTimeout`),
     * so we need to use multiple strategies to make sure our task runs before others:
     *
     * We schedule tasks (A and B):
     *    - we schedule a task A (via a `setTimeout` call) when the input starts in `markInputStart`.
     *      If the animation frame task is scheduled quickly by the browser, then task A has a very good
     *      chance of being the very first task after the animation frame and thus will record the input latency.
     *    - however, if the animation frame task is scheduled a bit later, then task A might execute
     *      before the animation frame task. We therefore schedule another task B from `markRenderStart`.
     *
     * We do direct checks in browser event handlers (C, D, E):
     *    - if the browser has multiple keydown events queued up, they will be scheduled before the `setTimeout` tasks,
     *      so we do a direct check in the keydown event handler (C).
     *    - depending on timing, sometimes the animation frame is scheduled even before the `keyup` event, so we
     *      do a direct check there too (E).
     *    - the browser oftentimes emits a `selectionchange` event after an `input`, so we do a direct check there (D).
     */
    function recordIfFinished() {
        if (state.keydown === 2 /* EventPhase.Finished */ && state.input === 2 /* EventPhase.Finished */ && state.render === 2 /* EventPhase.Finished */) {
            performance.mark('inputlatency/end');
            performance.measure('keydown', 'keydown/start', 'keydown/end');
            performance.measure('input', 'input/start', 'input/end');
            performance.measure('render', 'render/start', 'render/end');
            performance.measure('inputlatency', 'inputlatency/start', 'inputlatency/end');
            addMeasure('keydown', totalKeydownTime);
            addMeasure('input', totalInputTime);
            addMeasure('render', totalRenderTime);
            addMeasure('inputlatency', totalInputLatencyTime);
            // console.info(
            // 	`input latency=${performance.getEntriesByName('inputlatency')[0].duration.toFixed(1)} [` +
            // 	`keydown=${performance.getEntriesByName('keydown')[0].duration.toFixed(1)}, ` +
            // 	`input=${performance.getEntriesByName('input')[0].duration.toFixed(1)}, ` +
            // 	`render=${performance.getEntriesByName('render')[0].duration.toFixed(1)}` +
            // 	`]`
            // );
            measurementsCount++;
            reset();
        }
    }
    function addMeasure(entryName, cumulativeMeasurement) {
        const duration = performance.getEntriesByName(entryName)[0].duration;
        cumulativeMeasurement.total += duration;
        cumulativeMeasurement.min = Math.min(cumulativeMeasurement.min, duration);
        cumulativeMeasurement.max = Math.max(cumulativeMeasurement.max, duration);
    }
    /**
     * Clear the current sample.
     */
    function reset() {
        performance.clearMarks('keydown/start');
        performance.clearMarks('keydown/end');
        performance.clearMarks('input/start');
        performance.clearMarks('input/end');
        performance.clearMarks('render/start');
        performance.clearMarks('render/end');
        performance.clearMarks('inputlatency/start');
        performance.clearMarks('inputlatency/end');
        performance.clearMeasures('keydown');
        performance.clearMeasures('input');
        performance.clearMeasures('render');
        performance.clearMeasures('inputlatency');
        state.keydown = 0 /* EventPhase.Before */;
        state.input = 0 /* EventPhase.Before */;
        state.render = 0 /* EventPhase.Before */;
    }
    /**
     * Gets all input latency samples and clears the internal buffers to start recording a new set
     * of samples.
     */
    function getAndClearMeasurements() {
        if (measurementsCount === 0) {
            return undefined;
        }
        // Assemble the result
        const result = {
            keydown: cumulativeToFinalMeasurement(totalKeydownTime),
            input: cumulativeToFinalMeasurement(totalInputTime),
            render: cumulativeToFinalMeasurement(totalRenderTime),
            total: cumulativeToFinalMeasurement(totalInputLatencyTime),
            sampleCount: measurementsCount
        };
        // Clear the cumulative measurements
        clearCumulativeMeasurement(totalKeydownTime);
        clearCumulativeMeasurement(totalInputTime);
        clearCumulativeMeasurement(totalRenderTime);
        clearCumulativeMeasurement(totalInputLatencyTime);
        measurementsCount = 0;
        return result;
    }
    inputLatency.getAndClearMeasurements = getAndClearMeasurements;
    function cumulativeToFinalMeasurement(cumulative) {
        return {
            average: cumulative.total / measurementsCount,
            max: cumulative.max,
            min: cumulative.min,
        };
    }
    function clearCumulativeMeasurement(cumulative) {
        cumulative.total = 0;
        cumulative.min = Number.MAX_VALUE;
        cumulative.max = 0;
    }
})(inputLatency || (inputLatency = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9wZXJmb3JtYW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLEtBQVcsWUFBWSxDQTBRNUI7QUExUUQsV0FBaUIsWUFBWTtJQVM1QixNQUFNLGdCQUFnQixHQUEyQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQzdGLE1BQU0sY0FBYyxHQUEyQixFQUFFLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztJQUN2RSxNQUFNLGVBQWUsR0FBMkIsRUFBRSxHQUFHLGdCQUFnQixFQUFFLENBQUM7SUFDeEUsTUFBTSxxQkFBcUIsR0FBMkIsRUFBRSxHQUFHLGdCQUFnQixFQUFFLENBQUM7SUFDOUUsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUM7SUFJMUIsdUZBQXVGO0lBQ3ZGLHNFQUFzRTtJQUN0RSxJQUFXLFVBSVY7SUFKRCxXQUFXLFVBQVU7UUFDcEIsK0NBQVUsQ0FBQTtRQUNWLHVEQUFjLENBQUE7UUFDZCxtREFBWSxDQUFBO0lBQ2IsQ0FBQyxFQUpVLFVBQVUsS0FBVixVQUFVLFFBSXBCO0lBQ0QsTUFBTSxLQUFLLEdBQUc7UUFDYixPQUFPLDJCQUFtQjtRQUMxQixLQUFLLDJCQUFtQjtRQUN4QixNQUFNLDJCQUFtQjtLQUN6QixDQUFDO0lBRUY7O09BRUc7SUFDSCxTQUFnQixTQUFTO1FBQ3hCLGtFQUFrRTtRQUNsRSxnQkFBZ0IsRUFBRSxDQUFDO1FBQ25CLFdBQVcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN2QyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FB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