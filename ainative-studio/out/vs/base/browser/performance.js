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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3BlcmZvcm1hbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sS0FBVyxZQUFZLENBMFE1QjtBQTFRRCxXQUFpQixZQUFZO0lBUzVCLE1BQU0sZ0JBQWdCLEdBQTJCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7SUFDN0YsTUFBTSxjQUFjLEdBQTJCLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3ZFLE1BQU0sZUFBZSxHQUEyQixFQUFFLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztJQUN4RSxNQUFNLHFCQUFxQixHQUEyQixFQUFFLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztJQUM5RSxJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQztJQUkxQix1RkFBdUY7SUFDdkYsc0VBQXNFO0lBQ3RFLElBQVcsVUFJVjtJQUpELFdBQVcsVUFBVTtRQUNwQiwrQ0FBVSxDQUFBO1FBQ1YsdURBQWMsQ0FBQTtRQUNkLG1EQUFZLENBQUE7SUFDYixDQUFDLEVBSlUsVUFBVSxLQUFWLFVBQVUsUUFJcEI7SUFDRCxNQUFNLEtBQUssR0FBRztRQUNiLE9BQU8sMkJBQW1CO1FBQzFCLEtBQUssMkJBQW1CO1FBQ3hCLE1BQU0sMkJBQW1CO0tBQ3pCLENBQUM7SUFFRjs7T0FFRztJQUNILFNBQWdCLFNBQVM7UUFDeEIsa0VBQWtFO1FBQ2xFLGdCQUFnQixFQUFFLENBQUM7UUFDbkIsV0FBVyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3ZDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENB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