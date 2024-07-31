import {
    _appendToTopTableCell,
    _editTopTableCell,
    _ensureDashboardNote,
    _getTopTableCell,
    _isTaskRunning,
    _logStartTime,
    _readDasbhoard,
    _stopTask,
    writeDashboard
} from "../ampletime/dashboard.js";
import {_formatNoteLink, _makeNoteLink} from "../markdown.js";
import {_formatAsTime, _getCurrentTime, _getFormattedDate, _getISOStringFromDate} from "../ampletime/date-time.js";
import {
    _appendToNote,
    _getSessionSubHeading,
    _insertSessionOverview,
    _sectionContent,
    _writeEndTime,
    appendCycle,
    appendToCycleHeading,
    appendToHeading,
    appendToSession,
    getCycleTarget,
    markAddress,
    sessionNoteUUID
} from "./logWriter.js";
import {_promptCompletionEnergyMorale} from "./prompts.js";
import {_cancellableSleep} from "../sleeps.js";

/*
 * State can be:
 * NEW -> RUNNING
 *
 * RUNNING -> NEW (cancelled or finished sessions)
 * RUNNING -> PAUSED (paused sessions)
 *
 * NEW -> SAFE (safe to exit process)
 * PAUSED -> SAFE (safe to exit proces)
 *
 * SAFE -> NEW (new focus was started)
 */
export let state;
export function changeState(newState) {
    console.log(`STATE: ${state} => ${newState}`);
    state = newState;
}

/*
 * Variables to use to maintain info about the current state, in a way that can be
 * queried from within the embed at any time
 */
export let currentSessionCycle;
export let sessionCycleCount;
export let sessionStartTime;
export let sessionEndTime;
export let sleepUntil; // THIS IS A TIME, NOT A DATE
export let status;
export let energyValues = [], moraleValues = [], completionValues = [];

export function pauseSession() {
    changeState("PAUSED");
}

export function cancelSession() {
    changeState("NEW");
}
/*
* stopTimers() will send a SIGNAL that will REJECT long-running timers in this module
* This will call clearTimeout on the break/pause timers and will reject the respective promises
* Use this when you want to cancel a work session in the middle of it
* In real-life scenarios, the chances are very small for stopTimers() to be called when the timers are NOT running
*   - but if that happens, the session will NOT be cancelled because there is no one to listen for the signal
* The user can choose one of 3 options in terms of stopping a timer, and all of them are reflected in the "signal" flag:
*   - Pause entire session: "pause"
*   - Cancel entire session: "cancel"
*   - End current cycle earlier than scheduled: "end-cycle"
*/
export let timerController;
export let signal;
export async function stopTimers() {
    if (state !== "RUNNING") {
        console.log("Nothing to stop.")
        return;
    }
    timerController.abort();
}
export function setSignal(newSignal) {
    signal = newSignal;
}

// This is a promise that resolves after it is safe to exit the main cycle loop
// For example, if you were to race the "start" and "cancel" functions, "cancel" should have to await runningCriticalCode
//   such that "start" can exit gracefully. Otherwise, in real-life usage this might not matter as much.
// markSafeToExit is its resolve function; use this to mark when code can be cancelled safely
export let runningCriticalCode;
export let markSafeToExit;

// This is a promise that resolves when a timer (work or break) starts and is reset when the timer stops
// Useful for internal testing, so that you can await starting and make sure that your abort signal is caught
// Otherwise not very useful in real-life scenarios.
// markStarted will resolve the promise.
export let starting;
export let markStarted;
function markStopped() {
    starting = new Promise((resolve) => {
        markStarted = () => {
            changeState("RUNNING");
            resolve();
        }
    })
}


export function initAmplefocus() {
    // TODO: make sure pause can be followed by cancel (test)
    // TODO: test pause and cancel when no session is running (TEST)
    // Always start with a state of NEW
    moraleValues = [];
    energyValues = [];
    completionValues = [];
    changeState("NEW");
    timerController = new AbortController();
    runningCriticalCode = new Promise((resolve) => {
        markSafeToExit = () => {
            changeState("SAFE");
            resolve();
        }
    });
    markStopped();
}

export async function _preStart(app, options, handlePastCycles) {
    let dash = await _ensureDashboardNote(app, options);

    // Decide if we stop any currently running tasks
    let isSessionRunning = await _isTaskRunning(app, dash);
    if (isSessionRunning) {
        console.log(`Task running: ${isSessionRunning}`);
        if (options.alwaysStopRunningTask) {
            console.log(`Stopping current task...`);
            await _stopTask(app, dash, options);
            return dash;
        }

        let result = await app.prompt(`The previous session was not completed. Abandon it or continue where you left off?`,
            {
                inputs: [
                    {
                        type: "radio",
                        options: [
                            {label: "Abandon previous session", value: "abandon"},
                            {label: "Pick up where you left off", value: "resume"},
                            {label: "Abort", value: "abort"}
                        ],
                        value: "resume",
                    }
                ]
            }
        )

        if (result === "resume") {
            await _appendToNote(app, "");
            sessionCycleCount = isSessionRunning["Cycle Count"];
            sessionStartTime = new Date(isSessionRunning["Start Time"]);
            sessionEndTime = _calculateEndTime(options,sessionStartTime, sessionCycleCount);
            let oldStartTime = new Date(isSessionRunning["Start Time"]);
            if (_calculateEndTime(options, oldStartTime, isSessionRunning["Cycle Count"]) > _getCurrentTime()) {
                console.log("Continuing previous uncompleted session.")
                await _startSession(
                    app, options, dash, oldStartTime, Number(isSessionRunning["Cycle Count"]),
                    Number(isSessionRunning["Cycle Progress"]) + 1, true, handlePastCycles
                )
            } else {
                console.warn("Session end time is in the past, cancelling...");
                await _startSession(
                    app, options, dash, oldStartTime,
                    Number(isSessionRunning["Cycle Count"]), Number(isSessionRunning["Cycle Count"]) + 1, true, handlePastCycles
                );
                // let startTime = await _promptStartTime(app);
                // await _startSession(app, options, dash, startTime, Number(isSessionRunning["Cycle Count"]), Number(isSessionRunning["Cycle Progress"]) + 1, isSessionRunning["Start Time"]);
            }
            return false;
        } else if (result === "abandon") {
            console.log(`Stopping current task...`);
            await _stopTask(app, dash, options);
            return dash;
        } else {
            console.log(`Aborting...`);
            return false;
        }
    } else {
        return dash;
    }
}

export async function _focus(app, options, dash, startTime, cycleCount, handlePastCycles=false) {
    sessionCycleCount = cycleCount;
    sessionStartTime = startTime;
    sessionEndTime = _calculateEndTime(options, startTime, cycleCount);
    const newRow = {
        // "Session ID": Math.max(dash.map(e => e["Session ID"])) + 1,
        "Source Note": _makeNoteLink(await app.findNote({uuid: app.context.noteUUID})),
        "Start Time": _getISOStringFromDate(startTime),
        "Cycle Count": cycleCount,
        "Cycle Progress": 0,
        "Completion Logs": "",
        "Energy Logs": "",
        "Morale Logs": "",
        "End Time": "",
    };
    console.log("NEWROW", newRow);
    await _logStartTime(app, dash, newRow, options);
    // const initialQuestions = await _promptInitialQuestions(app, options);
    let sessionHeadingText = await _makeSessionHeading(app, startTime, cycleCount);
    markAddress(sessionHeadingText, app.context.noteUUID);
    await _insertSessionOverview(app, options, sessionHeadingText);
    await _startSession(app, options, dash, startTime, Number(cycleCount), 1, false, handlePastCycles);
    markSafeToExit();
}

async function findSessionHeadingName(startTime, app) {
    let hoursMinutes = _getISOStringFromDate(startTime).slice(11, 16); // Trim to only HH:MM
    let note = await app.findNote({uuid: app.context.noteUUID});
    let sections = await app.getNoteSections(note);

    // Filter to only the sections starting with something like [10:30]
    let sessionHeading = sections.filter(
        section => section?.heading?.text.includes(`[${hoursMinutes}`)
    );
    if (sessionHeading.length === 0) {
        throw ("Could not find a section in the current note that corresponds to the currently unfinished session.");
    }
    return sessionHeading[0].heading.text;
}

export async function _startSession(app, options, dash, startTime, cycles, firstCycle, resume=false, handlePastCycles=false) {
    console.log("Starting focus cycle...");
    if (!firstCycle) firstCycle = 1;
    let sessionHeadingName, workEndTime, breakEndTime, prompt, firstCycleStartTime;

    // When would the first cycle start?
    firstCycleStartTime = _calculateEndTime(options, startTime, firstCycle - 1);
    firstCycleStartTime = new Date(firstCycleStartTime.getTime() + options.breakDuration);

    // We only do the below if we are resuming a salvageable session
    if (resume) {
        // Find the heading that we should write under
        sessionHeadingName = await findSessionHeadingName(startTime, app);
        markAddress(sessionHeadingName, app.context.noteUUID);
        console.log("Found existing heading", sessionHeadingName)

        // When resuming a session, we don't want to prompt energy and morale again in the first break
        prompt = false;
    // We do the below if we are starting a new session
    } else {
        // If we are starting a new session, create the heading from scratch
        sessionHeadingName = await _makeSessionHeading(app, startTime, cycles);
        sessionHeadingName = sessionHeadingName.slice(2);
        console.log("Created new session heading", sessionHeadingName);

        // When starting a new session we want to prompt energy morale in the first break
        prompt = true;

        // During the virtual cycle, set the status to "waiting"
        // If we resume a session, this cycle will be skipped and the status will update itself in the loop
        status = "Waiting for session to start...";
    }

    // First work cycle is a virtual one that simply waits until 10 minutes before the first cycle
    // This first work cycle will be skipped when resume === true
    workEndTime = new Date(firstCycleStartTime.getTime() - options.breakDuration);
    // Make sure our first break ends right when the first cycle statrs
    breakEndTime = firstCycleStartTime;
    console.log("Work end time", workEndTime);
    console.log(`firstCycle: ${firstCycle}, cycles: ${cycles}`, firstCycle, cycles);

    // Notice our loop starts with a virtual cycle 0
    for (let currentCycle = firstCycle - 1; currentCycle <= cycles; currentCycle++) {
        currentSessionCycle = currentCycle;
        console.log("Cycle loop", currentCycle);
        try {
            // First work phase will be virtual and status will be "waiting"
            // If we are resuming a session, the sleep will be zero and this will be skipped
            await _handleWorkPhase(app, workEndTime, currentCycle);
        } catch (error) {
            if (handleAbortSignal(error)) break;
        }

        if (currentCycle >= 1) status = "Take a break...";
        try {
            if (currentCycle >= firstCycle) {
                // We always want to prompt for metrics when into a live session
                // But if currentCycle is firstCycle - 1, that might mean we are resuming a session, so we leave the value
                //    to what it was set above.
                prompt = true;
            }
            await _handleBreakPhase(app, options, dash, breakEndTime, currentCycle, cycles, handlePastCycles, prompt);
        } catch (error) {
            if (handleAbortSignal(error)) break;
        }
        status = "Working...";

        workEndTime = new Date(breakEndTime.getTime() + options.workDuration);
        breakEndTime = new Date(workEndTime.getTime() + options.breakDuration);

        if (timerController.signal.aborted) {
            timerController = new AbortController();
        }
    }
    if (state !== "PAUSED") {
        // We only write an end time if the session was cancelled
        await _writeEndTime(app, options, dash);
        status = "Session paused...";
    } else {
        status = "Session finished. 🎉";
    }
}

async function _makeSessionHeading(app, startTime, cycleCount) {
    const timestamp = startTime.toLocaleTimeString(
        undefined,
        { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
    );
    const focusNote = await _getFocusNote(app);
    const focusNoteLink = _formatNoteLink(focusNote.name, focusNote.uuid);
    return  `# **\\[${timestamp}\\]** ${focusNoteLink} for ${cycleCount} cycles`;
}

export async function _getFocusNote(app) {
    const focusNotes = await app.filterNotes({ tag: "focus" });
    let focusNote;

    if (focusNotes.length > 0) {
        focusNote = focusNotes[0];
    } else {
        let focusNoteUUID = await app.createNote("Focus", ["focus"]);
        focusNote = await app.findNote({uuid: focusNoteUUID});
    }

    return focusNote;
}

export function _calculateEndTime(options, startTime, cycles) {
    console.log("Calculating end time for given start time and cycles...");
    const totalTime = (options.workDuration + options.breakDuration) * cycles;
    const endTime = new Date(startTime.getTime() + totalTime);

    console.log("Start time:", (new Date(startTime)));
    console.log("Cycles:", cycles);
    console.log("End time calculated:", _formatAsTime(endTime));
    return endTime;
}

function handleAbortSignal(error) {
    if (error.name === 'AbortError') {
        if (signal === "cancel") {
            console.log('Session canceled');
            status = "Session cancelled";
            return true;
        } else if (signal === "pause") {
            console.log("Session paused");
            status = "Session paused";
            return true;
        } else if (signal === "end-cycle") {
            console.log("Cycle ended early");
            // Do nothing, keep going
            return false
        }
    } else {
        throw error;
    }
}

export async function _handleWorkPhase(app, workEndTime, cycleIndex) {
    console.log(`Cycle ${cycleIndex}: Starting work phase...`);
    try {
        await _sleepUntil(app, workEndTime, true);
    } catch (error) {
        throw error;
    }
}

async function _getPastCycleTarget(app, currentCycle, options) {
    // First, determine if the user set a target
    let noteContent = await app.getNoteContent({uuid: sessionNoteUUID});
    let cycleTarget = await _getSessionSubHeading(app, `Cycle ${currentCycle}`);
    let headingContent = await _sectionContent(noteContent, cycleTarget);
    // cycleTarget will be the string representing the user's answer to the first question from the cycle start questionnaire
    return getCycleTarget(options, headingContent);
}

async function _handleCycleEnd(options, app, currentCycle) {
    let completion, energy, morale, cycleTarget;

    if (currentCycle >= 1) {
        // Get completion, energy and morale
        cycleTarget = await _getPastCycleTarget(app, currentCycle, options);
        // Prompt the actual values
        [completion, energy, morale] = await _promptCompletionEnergyMorale(
            app,
            "Work phase completed. Did you complete the target for this cycle?",
            cycleTarget  // We display the user's goal for the cycle in the prompt so that they don't need to check manually
        );
    } else {
        // For the very first cycle, the virtual one, we actually only want the energy and morale at the start of the session
        [completion, energy, morale] = await _promptCompletionEnergyMorale(
            app,
            "Before you start, take a minute to plan yout session.\nHow are your energy and morale levels right now?",
        );
        completion = null;
    }

    // Whatever cycle we just finished, we need to update the completion, morale and energy values
    if (completion === true) {
        completion = 1;
    } else if (completion === false) {
        completion = -1;
    }

    return [completion, energy, morale];
}

async function _logCycleEndValues(app, dash, energy, morale, completion, options) {
    let tableDict = await _readDasbhoard(app, dash);
    tableDict = await _appendToTopTableCell(tableDict, "Energy Logs", energy);
    tableDict = await _appendToTopTableCell(tableDict, "Morale Logs", morale);
    tableDict = await _appendToTopTableCell(tableDict, "Completion Logs", completion);
    energyValues = _getTopTableCell(tableDict, "Energy Logs").split(",");
    moraleValues = _getTopTableCell(tableDict, "Morale Logs").split(",");
    completionValues = _getTopTableCell(tableDict, "Completion Logs").split(",");
    await writeDashboard(app, options, dash, tableDict);
}

async function _handleNextCycleStart(app, nextCycle, options) {
    // Write next cycle start questionnaire
    await appendCycle(app, `Cycle ${nextCycle}`);
    let content = [`- Cycle start:`]
    for (let question of options.cycleStartQuestions) {
        content.push(`  - ${question}`);
    }
    content = content.join("\n");
    await appendToCycleHeading(app, `Cycle ${nextCycle}`, `\n${content}`);
}

async function _handleSessionDebrief(app, options) {
    // Insert the questionnaire itself
    await appendToSession(app, `\n## Session debrief`);
    let content = [];
    for (let question of options.finalQuestions) {
        content.push(`- ${question}`);
    }
    content = content.join("\n");
    await appendToHeading(app, "Session debrief", content);
}

async function _handleCycleEndDashboardEntry(app, dash, currentCycle, options) {
    // Update the dashboard to mark that the cycle was completed
    let dashTable = await _readDasbhoard(app, dash);
    dashTable = _editTopTableCell(dashTable, "Cycle Progress", currentCycle);
    await writeDashboard(app, options, dash, dashTable);
}

async function _handleCycleEndJotEntry(options, app, currentCycle) {
    // Write cycle debrief questions
    let content = [`- Cycle debrief:`]
    for (let question of options.cycleEndQuestions) {
        content.push(`  - ${question}`);
    }
    content = content.join("\n");
    await appendToCycleHeading(app, `Cycle ${currentCycle}`, `\n${content}`);
}

async function _handleCycleLogs(currentCycle, app, dash, options, cycles, nextCycle) {
    if (currentCycle >= 1) {
        await _handleCycleEndJotEntry(options, app, currentCycle);
    }
    if (currentCycle < cycles) {
        await _handleNextCycleStart(app, nextCycle, options);
    }
}

export async function _handleBreakPhase(app, options, dash, breakEndTime, cycleIndex, cycles, handlePastCylces=false) {
    let currentCycle, nextCycle, energy, morale, completion;
    let currentTime= _getCurrentTime();
    currentCycle = cycleIndex;
    nextCycle = cycleIndex + 1;

    // Always log the Cycle Progress in the dashboard
    await _handleCycleEndDashboardEntry(app, dash, currentCycle, options);

    // When the user resumes a session, we need to check if the current cycle ended in the past
    // And in order to do that we need to get the end time of the current cycle
    let currentCycleEndTime = new Date(breakEndTime.getTime() + options.workDuration);
    if (currentCycleEndTime > currentTime || handlePastCylces) {
        // If we are handling LIVE cycles happening now OR
        //     if we are handling PAST cycles but the flag is true
        // Log everything in the Daily Jot and prompt for metrics
        if (prompt) {
            await _logJotPreviousAndNextCycleQuestions(previousCycle, app, dash, options, cycles, currentCycle);
            [completion, energy, morale] = await _promptCycleEndMetrics(options, app, previousCycle);
            // Write the actual values themselves
            await _logDashboardCycleEndMetrics(app, dash, energy, morale, completion, options);
        }
    } else {
        await _logDashboardCycleEndMetrics(app, dash, null, null, null, options);
    }

    if (currentCycle === cycles) {
        // No matter past or live cycles, log the debrief
        // For the very last cycle, write the session debrief questionnaire instead
        await _handleSessionDebrief(app, options);

        // Change the status such that it gets picked up by the embed next time openSidebarEmbed is called
        // Call the sleepUntil function again artificially, just to (1) set the timer to 00:00 and (2) update the status
        // set above in the UI and (3) update the completion, energy, morale
        await _sleepUntil(app, new Date());

        console.log(`Session complete.`);
        app.alert(`Session complete. Debrief and relax.`);
    }

    if (breakEndTime <= currentTime) {
        // If what we are trying to sleep until is in the past, it means that:
        //     (A) The user chose a start date in the past and this is a cycle that would have ended in the past
        //          - In this case we choose not to log anything in the jot because it's not useful
        //          - And we choose not to ask for morale and energy because it can be annoying and is also not useful
        //     (B) We are at a virtual cycle that shouldn't happen, maybe because the user resumed a session
        //          - In this case, no need to get E/M because the user already completed this before exiting the session
        return;
    }

    if (currentCycle < cycles) {
        // Start the actual break timer
        console.log(`Cycle ${currentCycle}: Starting break phase...`);
        try {
            await _sleepUntil(app, breakEndTime);
        } catch (error) {
            throw error;
        }

        // After the break is done, we can return
        app.alert(`Cycle ${currentCycle}: Break phase completed. Start working!`);
        console.log(`Cycle ${currentCycle}: Break phase completed.`);
    }
}

export async function _sleepUntil(app, endTime, bell=false) {
    console.log(`Sleeping until ${endTime}...`);
    app.openSidebarEmbed(0.66, {
        ampletime: { project: null },
        amplefocus: {
            sleepUntil: endTime,
            currentCycle: currentCycle,
            cycleCount: sessionCycleCount,
            sessionEnd: sessionEndTime,
            status: status,
            moraleValues: moraleValues,
            energyValues: energyValues,
            completionValues: completionValues,
        }
    });
    const sleepTime = endTime.getTime() - _getCurrentTime().getTime();
    sleepUntil = endTime;
    await _cancellableSleep(sleepTime, markStopped, markStarted, timerController, bell);
}

