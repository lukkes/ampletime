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
import {_makeNoteLink} from "../markdown.js";
import {_getCurrentTime} from "../ampletime/date-time.js";
import {_appendToNote, appendToHeading, appendToSession, markAddress} from "./logWriter.js";

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
export let currentCycle;
export let sessionCycleCount;
export let sessionStartTime;
export let sessionEndTime;
export let sleepUntil; // THIS IS A TIME, NOT A DATE
export let status;
export let energyValues = [], moraleValues = [];

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


export async function _preStart(app, options) {
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
                        ]
                    }
                ]
            }
        )

        if (result === "resume") {
            console.log("Continuing previous uncompleted session.")
            let startTime = await _promptStartTime(app);
            await _startSession(app, options, dash, startTime, isSessionRunning["Cycle Count"], Number(isSessionRunning["Cycle Progress"]) + 1, isSessionRunning["Start Time"]);
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

export async function _focus(app, options, dash, startTime, cycleCount) {
    sessionCycleCount = cycleCount;
    sessionStartTime = startTime;
    sessionEndTime = _calculateEndTime(options, startTime, cycleCount);
    const newRow = {
        // "Session ID": Math.max(dash.map(e => e["Session ID"])) + 1,
        "Source Note": _makeNoteLink(await app.findNote({uuid: app.context.noteUUID})),
        "Start Time": await _getCurrentTime(),
        "Cycle Count": cycleCount,
        "Cycle Progress": 0,
        "Energy Logs": "",
        "Morale Logs": "",
        "End Time": "",
    };
    await _logStartTime(app, dash, newRow, options);
    const initialQuestions = await _promptInitialQuestions(app, options);
    await _insertSessionOverview(app, options, startTime, cycleCount, initialQuestions);
    await _startSession(app, options, dash, startTime, cycleCount);
    markSafeToExit();
}

export async function _promptInput(app, options) {
    const startTime = await _promptStartTime(app);
    if (!startTime) { return; }
    const cycleCount = await _promptCycleCount(app, options, startTime);
    if (!cycleCount) { return; }
    return [startTime, cycleCount];
}

export async function _promptStartTime(app) {
    const startTimeOptions = _generateStartTimeOptions();
    let result = await app.prompt("When would you like to start? Choose the time of the first work cycle.", {
        inputs: [
            {
                label: "Start Time",
                type: "select",
                options: startTimeOptions
            }
        ]
    });
    if (result === -1 || result === null) return new Date(Number(startTimeOptions[4]));
    return new Date(Number(result));
}

export async function _promptCycleCount(app, options, startTimeValue) {
    const startTime = new Date(Number(startTimeValue));
    console.log("Start time selected:", _formatAsTime(startTime));

    const cycleOptions = _generateCycleOptions(startTime, options);
    let result = await app.prompt("How long should this session be? Choose the number of cycles you want to focus for.", {
        inputs: [
            {
                label: "Number of Cycles",
                type: "select",
                options: cycleOptions
            }
        ]
    });
    if (result === -1 || result === null)  throw new Error("Number of cycles not selected. Cannot proceed.");
    return result;
}

export async function _promptInitialQuestions(app, options) {
    const initialQuestions = await app.prompt("Take some time to outline your focus session.", {
        inputs: options.initialQuestions.map(function(question) {
            return {
                label: question,
                type: "text",
            };
        })
    });
    return initialQuestions || [];
}

async function _makeSessionHeading(app, timestamp, cycleCount) {
    const focusNote = await _getFocusNote(app);
    const focusNoteLink = _formatNoteLink(focusNote.name, focusNote.uuid);
    return  `# **\\[${timestamp}\\]** ${focusNoteLink} for ${cycleCount} cycles`;
}

export async function _insertSessionOverview(app, options, startTime, cycleCount, initialQuestions) {
    const timestamp = startTime.toLocaleTimeString(
        undefined,
        { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
    );
    let sessionHeadingText = await _makeSessionHeading(app, timestamp, cycleCount);
    let sessionMarkdown = [sessionHeadingText];

    sessionMarkdown.push("## Session overview");
    for (let i = 0; i < options.initialQuestions.length; i++) {
        sessionMarkdown.push(
            `- **${options.initialQuestions[i]}**`,
        );
        let answer = initialQuestions[i];
        sessionMarkdown.push(`  - ${answer}`);
    }

    await _appendToNote(app, "\n" + sessionMarkdown.join("\n"));
}

function _formatNoteLink(name, uuid) {
    return `[${name}](https://www.amplenote.com/notes/${uuid})`;
}

function _formatAsTime(date) {
    const options = { hour: '2-digit', minute: '2-digit', hour12: false };
    return date.toLocaleTimeString(undefined, options);
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

export function _generateStartTimeOptions() {
    console.log("Generating start time options...");
    const options = [];
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);

    for (let offset = -20; offset <= 20; offset += 5) {
        const time = new Date(now.getTime() + offset * 60 * 1000);
        const label = _formatAsTime(time);
        const value = time.getTime();
        options.push({ label, value });
    }

    console.log("Start time options generated.");
    return options;
}

export function _generateCycleOptions(startTime, options) {
    console.log("Generating cycle options...");
    const cycleOptions = [];

    for (let cycles = 2; cycles <= 8; cycles++) {
        const endTime = _calculateEndTime(options, startTime, cycles);
        const label = `${cycles} cycles (until ${_formatAsTime(endTime)})`;
        cycleOptions.push({ label, value: cycles });
    }

    console.log("Cycle options generated.");
    return cycleOptions;
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

export async function _promptEnergyMorale(app, message) {
    let result = await app.prompt(message,
        {
            inputs: [
                {
                    label: "Energy (how are you feeling physically?)",
                    type: "select",
                    options: [
                        {label: "Low", value: 1},
                        {label: "Medium", value: 2},
                        {label: "High", value: 3}
                    ]
                },
                {
                    label: "Morale (how are you feeling mentally, with respect to the work?)",
                    type: "select",
                    options: [
                        {label: "Low", value: 1},
                        {label: "Medium", value: 2},
                        {label: "High", value: 3}
                    ]
                }
            ]
        }
    );

    let energy,morale;
    if (result === null) {
        energy = 0;
        morale = 0;
    } else {
        [energy, morale] = result;
    }

    if (!energy) energy = 0;
    if (!morale) morale = 0;
    return [energy, morale];
}

export async function _startSession(app, options, dash, startTime, cycles, firstCycle, existingSessionStartTime=null) {
    console.log("Starting focus cycle...");
    const focusNote = await _getFocusNote(app);
    if (!firstCycle) firstCycle = 1
    let sessionHeadingName = "";
    if (existingSessionStartTime) {
        let hoursMinutes = existingSessionStartTime.slice(11, 16); // Trim to only HH:MM
        let note = await app.findNote({uuid: app.context.noteUUID});
        let sections = await app.getNoteSections(note);
        let sessionHeading = sections.filter(
            section => section?.heading?.text.includes(`[${hoursMinutes}`)
        );
        if (sessionHeading.length === 0) {
            throw ("Could not find a section in the current note that corresponds to the currently unfinished session.");
        }

        sessionHeadingName = sessionHeading[0].heading.text;
    } else {
        const timestamp = startTime.toLocaleTimeString(
            undefined,
            { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
        );
        sessionHeadingName = await _makeSessionHeading(app, timestamp, cycles);
        sessionHeadingName = sessionHeadingName.slice(2);
    }

    markAddress(sessionHeadingName, app.context.noteUUID);

    if (firstCycle === 1) await appendToSession(app, "\n## Cycles");

    // We first wait until it's 10 minutes before the first cycle would start
    let workEndTime = new Date(startTime.getTime() - options.breakDuration);
    // Then we trigger a virtual pause 10 minutes before the first cycle, such that the user can plan and log E/M
    let breakEndTime = startTime;
    // Note the for loop starting at -1 (meaning virtual cycle)
    for (let i = firstCycle - 1; i <= cycles; i++) {
        currentCycle = i;
        if (currentCycle === 0) {
            status = "Waiting for session to start...";
        } else {
            status = "Working...";
        }
        try {
            await _handleWorkPhase(app, options, dash, focusNote, workEndTime, i);
        } catch (error) {
            if (handleAbortSignal(error)) break;
        }
        status = "Break time...";
        try {
            await _handleBreakPhase(app, options, dash, focusNote, breakEndTime, i, cycles);
        } catch (error) {
            if (handleAbortSignal(error)) break;
        }

        workEndTime = new Date(breakEndTime.getTime() + options.workDuration);
        breakEndTime = new Date(workEndTime.getTime() + options.breakDuration);
        // startTime = breakEndTime;

        if (timerController.signal.aborted) {
            timerController = new AbortController();
        }
    }
    if (state !== "PAUSED") {
        // We only write an end time if the session was cancelled
        await _writeEndTime(app, options, dash);
        status = "Session paused...";
    } else {
        status = "Session finished.";
    }

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

export async function _writeEndTime(app, options, dash) {
    let dashTable = await _readDasbhoard(app, dash);
    dashTable = _editTopTableCell(dashTable, "End Time", await _getCurrentTime());
    await writeDashboard(app, options, dash, dashTable);
}

export async function _handleWorkPhase(app, options, dash, focusNote, workEndTime, cycleIndex) {
    console.log(`Cycle ${cycleIndex}: Starting work phase...`);

    const workInterval = setInterval(() => {
        _logRemainingTime(app, options, focusNote, workEndTime, "work", cycleIndex);
    }, options.updateInterval);

    try {
        await _sleepUntil(app, workEndTime);
    } catch (error) {
        clearInterval(workInterval);
        throw error;
    }
    clearInterval(workInterval);

}

async function appendToCycleHeading(app, heading, content) {
    try {
        await appendToHeading(app, heading, content);
    } catch(err) {
        await appendCycle(app, heading);
        await appendToHeading(app, heading, content);
    }
}

async function appendCycle(app, cycle) {
    try {
        await appendToHeading(app, "Cycles", `\n### ${cycle}`);
    } catch (err) {
        await appendToSession(app, "\n## Cycles")
        await appendToHeading(app, "Cycles", `\n### ${cycle}`);
    }
}

export async function _handleBreakPhase(app, options, dash, focusNote, breakEndTime, cycleIndex, cycles) {
    let currentCycle, nextCycle;
    currentCycle = cycleIndex;
    nextCycle = cycleIndex + 1;
    if (currentCycle >= 1) {
        await appendToCycleHeading(app, `Cycle ${currentCycle}`, "\n- Debrief:");
        let dashTable = await _readDasbhoard(app, dash);
        dashTable = _editTopTableCell(dashTable, "Cycle Progress", currentCycle);
        await writeDashboard(app, options, dash, dashTable);
    }

    if (currentCycle < cycles) {
        await appendCycle(app, `Cycle ${nextCycle}`);
        await appendToCycleHeading(app, `Cycle ${nextCycle}`, `\n- Plan:`);

        let [energy, morale] = await _promptEnergyMorale(
            app,
            "Work phase completed. Before you start your break, take a minute to debrief and plan.\nHow are your energy and morale levels right now?");
        let tableDict = await _readDasbhoard(app, dash);
        tableDict = await _appendToTopTableCell(tableDict, "Energy Logs", energy);
        tableDict = await _appendToTopTableCell(tableDict, "Morale Logs", morale);
        energyValues = _getTopTableCell(tableDict, "Energy Logs").split(",");
        moraleValues = _getTopTableCell(tableDict, "Morale Logs").split(",");

        await writeDashboard(app, options, dash, tableDict);
        console.log(`Cycle ${currentCycle}: Starting break phase...`);

        const breakInterval = setInterval(() => {
            _logRemainingTime(app, focusNote, breakEndTime, "break", currentCycle);
        }, options.updateInterval);

        try {
            await _sleepUntil(app, breakEndTime);
        } catch (error) {
            clearInterval(breakInterval);
            throw error;
        }
        clearInterval(breakInterval);
        app.alert(`Cycle ${currentCycle}: Break phase completed. Start working!`);
        console.log(`Cycle ${currentCycle}: Break phase completed.`);
    } else {
        await appendToSession(app, `\n## Session debrief`);
        status = "Session finished 🎉";
        // This simply resets the UI to an empty timer and updates the status
        await _sleepUntil(app, new Date());
        console.log(`Session complete.`);
        app.alert(`Session complete. Debrief and relax.`);
    }
}

function _logRemainingTime(app, options, focusNote, endTime, phase, cycleIndex) {
    const remainingTime = endTime.getTime() - Date.now();
    if (remainingTime > 0) {
        const remainingMinutes = Math.ceil(remainingTime / 1000 / 60);
        // const progressBar = _generateProgressBar(remainingTime, phase);
        const phaseDuration = phase === 'work' ? options.workDuration : options.breakDuration;
        const progressBar = _emojiProgressBar(phaseDuration, phaseDuration - remainingTime);
        const message = `- Cycle ${cycleIndex + 1} ${phase} phase remaining time: ${remainingMinutes} minutes\n${progressBar}\n`;
        app.replaceNoteContent(focusNote, message);
    }
}

function _emojiProgressBar(total, done, width=320, range=["🌑", "🌒", "🌓", "🌔", "🌕"]) {
    const n = Math.floor(width / 25);
    const step = total / n;

    const emoji = (portion) => {
        const domain = [0, 1];
        const quantizedPortion = (portion - domain[0]) / (domain[1] - domain[0]) * (range.length - 1);
        const index = Math.floor(quantizedPortion);
        return range[index];
    };

    const phases = Array.from(new Array(n), (d, i) => {
        const portion = (done % step) / step;
        return done / step >= (i + 1)
            ? range[range.length - 1]
            : done / step < i
                ? range[0]
                : emoji(portion);
    });

    return phases.join(" ");
}

export async function _sleepUntil(app, endTime) {
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
        }
    });
    const sleepTime = endTime.getTime() - Date.now();
    sleepUntil = endTime;
    await _cancellableSleep(sleepTime);
}

function _cancellableSleep(ms) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            resolve();
            markStopped();
            console.log("Timer finished naturally");
        }, ms);
        timerController.signal.addEventListener('abort', () => {
            console.error("Timer finished forcefully");
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
        });
        // Cancel signals only have effect from this point forward
        markStarted();
    });
}