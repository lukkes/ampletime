const options = {
    workDuration: 30 * 60 * 1000, // ms
    breakDuration: 20 * 60 * 1000, // ms
    updateInterval: 10 * 1000, // ms
    initialQuestions: [
        "What am I trying to accomplish?",
        "Why is this important and valuable?",
        "How will I know this is complete?",
        "Potential distractions? How am I going to deal with them?",
        "Is this concrete/measurable or subjective/ambiguous?",
        "Anything else noteworthy?",
    ],
    cycleStartQuestions: [
        "What am I trying to accomplish this cycle?",
        "How will I get started?",
        "Any hazards? How will I counter them?",
    ],
    cycleEndQuestions: [
        "Any distractions?",
        "Anything noteworthy?",
        "Things to improve next cycle?",
    ],
};

export async function _focusTest(app) {
    const now = new Date();
    await _insertLog(app, now, 2);
    await _startFocusTimer(app, now, 2);
}

export async function _focus(app) {
    console.log("Starting Amplefocus...");
    const [startTime, cycleCount] = await _promptInput(app);
    const initialQuestions = await _promptInitialQuestions(app);
    await _insertLog(app, startTime, cycleCount, options.initialQuestions);
    await _startFocusTimer(app, startTime, cycleCount);
    const focusNote = await _getFocusNote(app);
    await app.navigate(
        `https://www.amplenote.com/notes/${ focusNote.uuid }`
    );
}

export async function _promptInput(app) {
    const startTime = await _promptStartTime(app);
    if (!startTime) { return; }
    const cycleCount = await _promptCycleCount(app, startTime);
    if (!cycleCount) { return; }
    return [new Date(Number(startTime)), cycleCount];
}

export async function _promptStartTime(app) {
    const startTimeOptions = _generateStartTimeOptions();
    const result = await app.prompt("Focus Cycle Configuration", {
        inputs: [
            {
                label: "Start Time",
                type: "select",
                options: startTimeOptions
            }
        ]
    });
    return result;
}

export async function _promptCycleCount(app, startTimeValue) {
    const startTime = new Date(Number(startTimeValue));
    console.log("Start time selected:", _formatAsTime(startTime));

    const cycleOptions = _generateCycleOptions(startTime);
    const cycleResult = await app.prompt("Focus Cycle Configuration", {
        inputs: [
            {
                label: "Number of Cycles",
                type: "select",
                options: cycleOptions
            }
        ]
    });
    return cycleResult;
}

export async function _promptInitialQuestions(app) {
    const initialQuestions = await app.prompt("Initial Questions", {
        inputs: options.initialQuestions.map(function(question) {
            return {
                label: question,
                type: "text",
            };
        })
    });
    console.log(options.initialQuestions);
    return options.initialQuestions;
}

export async function _insertLog(app, startTime, cycleCount, initialQuestions) {
    const focusNote = await _getFocusNote(app);
    const focusNoteLink = _formatNoteLink(focusNote.name, focusNote.uuid);
    const timestamp = new Date().toLocaleTimeString(
        undefined,
        { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
    );
    const sessionMarkdown = [
        `- **[${timestamp}]** ${focusNoteLink} for ${cycleCount} cycles`,
    ];

    console.log(options.initialQuestions);
    for (let i = 0; i < options.initialQuestions.length; i++) {
        sessionMarkdown.push(
            `  - **${options.initialQuestions[i]}**`,
        );
        let answer = options.initialQuestions[i];
        sessionMarkdown.push(`    - ${answer}`);
    }

    await _appendToNote(app, sessionMarkdown.join("\n"));
}

export async function _appendToNote(app, contents, targetNoteUUID=null) {
    if (!targetNoteUUID) { targetNoteUUID = app.context.noteUUID; }
    await app.insertNoteContent({uuid: targetNoteUUID}, contents, {atEnd: true});
}

function _formatNoteLink(name, uuid) {
    return `[${name}](https://www.amplenote.com/notes/${uuid})`;
}

function _formatAsTime(date) {
    const options = { hour: '2-digit', minute: '2-digit', hour12: false };
    const timeString = date.toLocaleTimeString(undefined, options);
    return timeString;
}

export async function _getFocusNote(app) {
    const focusNotes = await app.filterNotes({ tag: "focus" });
    console.log(focusNotes);
    let focusNote;

    if (focusNotes.length > 0) {
        focusNote = focusNotes[0];
    } else {
        let focusNoteUUID = await app.createNote("Focus", ["focus"]);
        focusNote = await app.findNote({uuid: focusNoteUUID});
        console.log(focusNote);
    }

    return focusNote;
}

function _generateStartTimeOptions() {
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

function _generateCycleOptions(startTime) {
    console.log("Generating cycle options...");
    const options = [];

    for (let cycles = 2; cycles <= 8; cycles++) {
        const endTime = _calculateEndTime(startTime, cycles);
        const label = `${cycles} cycles (until ${_formatAsTime(endTime)})`;
        options.push({ label, value: cycles });
    }

    console.log("Cycle options generated.");
    return options;
}

function _calculateEndTime(startTime, cycles) {
    console.log("Calculating end time for given start time and cycles...");
    const totalTime = (options.workDuration + options.breakDuration) * cycles;
    const endTime = new Date(startTime.getTime() + totalTime);

    console.log("Start time:", (new Date(startTime)));
    console.log("Cycles:", cycles);
    console.log("End time calculated:", _formatAsTime(endTime));
    return endTime;
}

export async function _startFocusTimer(app, startTime, cycles) {
    console.log("Starting focus cycle...");
    const focusNote = await _getFocusNote(app);

    for (let i = 0; i < cycles; i++) {
        const workEndTime = new Date(startTime.getTime() + options.workDuration);
        const breakEndTime = new Date(workEndTime.getTime() + options.breakDuration);

        await _handleWorkPhase(app, focusNote, workEndTime, i);
        await _handleBreakPhase(app, focusNote, workEndTime, breakEndTime, i, cycles);

        startTime = breakEndTime;
    }
}

export async function _handleWorkPhase(app, focusNote, workEndTime, cycleIndex) {
    console.log(`Cycle ${cycleIndex + 1}: Starting work phase...`);

    const workInterval = setInterval(() => {
        _logRemainingTime(app, focusNote, workEndTime, "work", cycleIndex);
    }, options.updateInterval);

    await _sleepUntil(workEndTime);
    clearInterval(workInterval);
    app.alert(`Cycle ${cycleIndex + 1}: Work phase completed. Take a break!`);
}

export async function _handleBreakPhase(app, focusNote, workEndTime, breakEndTime, cycleIndex, cycles) {
    await _appendToNote(app, `- Cycle ${cycleIndex + 1} debrief:`);

    if (cycleIndex < cycles - 1) {
        await _appendToNote(app, `- Cycle ${cycleIndex + 2} plan:`);
        console.log(`Cycle ${cycleIndex + 1}: Starting break phase...`);

        const breakInterval = setInterval(() => {
            _logRemainingTime(app, focusNote, breakEndTime, "break", cycleIndex);
        }, options.updateInterval);

        await _sleepUntil(breakEndTime);
        clearInterval(breakInterval);
        app.alert(`Cycle ${cycleIndex + 1}: Break phase completed. Start working!`);
        console.log(`Cycle ${cycleIndex + 1}: Break phase completed.`);
    } else {
        await _appendToNote(app, `- Session debrief:`);
        console.log(`Session complete.`);
        app.alert(`Session complete. Debrief and relax.`);
    }
}

function _logRemainingTime(app, focusNote, endTime, phase, cycleIndex) {
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
    const l = total;
    const step = l / n;

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

export async function _sleepUntil(endTime) {
    const sleepTime = endTime.getTime() - Date.now();
    await _sleep(sleepTime);
}

function _sleep(ms) {
    return new Promise((resolve) => {
        if (ms > 0) {
            setTimeout(resolve, ms);
        } else {
            resolve();
        }
    });
}
