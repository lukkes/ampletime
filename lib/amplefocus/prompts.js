import {_formatAsTime, _getCurrentTime} from "../ampletime/date-time.js";
import {_calculateEndTime} from "./amplefocus.js";

export function _generateStartTimeOptions() {
    console.log("Generating start time options...");
    const options = [];
    const now = _getCurrentTime();
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);

    for (let offset = -20; offset <= 20; offset += 5) {
        const time = new Date(now.getTime() + offset * 60 * 1000);
        const label = _formatAsTime(time);
        const value = time;
        options.push({label, value});
    }

    console.log("Start time options generated.");
    console.log(JSON.stringify(options));
    return options;
}

export async function _promptStartTime(app) {
    const startTimeOptions = _generateStartTimeOptions();
    let result = await app.prompt("When would you like to start? Choose the time of the first work cycle.", {
        inputs: [
            {
                label: "Start Time",
                type: "select",
                options: startTimeOptions,
                value: startTimeOptions[5].value,
            }
        ]
    });
    if (result === -1 || result === null) return startTimeOptions[4].value;
    return new Date(result);
}

export function _generateCycleOptions(startTime, options) {
    console.log("Generating cycle options...");
    const cycleOptions = [];

    for (let cycles = 2; cycles <= 8; cycles++) {
        const endTime = _calculateEndTime(options, startTime, cycles);
        const label = `${cycles} cycles (until ${_formatAsTime(endTime)})`;
        cycleOptions.push({label, value: cycles});
    }

    console.log("Cycle options generated.");
    return cycleOptions;
}

export async function _promptCycleCount(app, options, startTimeValue) {
    const startTime = startTimeValue;
    console.log("Start time selected:", _formatAsTime(startTime));

    const cycleOptions = _generateCycleOptions(startTime, options);
    let result = await app.prompt(
        "How long should this session be? Choose the number of cycles you want to focus for.", {
            inputs: [
                {
                    label: "Number of Cycles",
                    type: "select",
                    options: cycleOptions,
                    value: 6,
                }
            ]
        });
    if (result === -1 || result === null) throw new Error("Number of cycles not selected. Cannot proceed.");
    return result;
}

export async function _promptCompletionEnergyMorale(app, message, promptCompletion) {
    let promptInput = [];
    if (promptCompletion) {
        promptInput.push({
            label: promptCompletion,
            type: "checkbox",
        })
    }
    promptInput.push({
        label: "Energy (how are you feeling physically?)",
        type: "select",
        options: [
            {label: "Low", value: -1},
            {label: "Medium", value: 0},
            {label: "High", value: 1}
        ],
        value: 0,
    });
    promptInput.push({
        label: "Morale (how are you feeling mentally, with respect to the work?)",
        type: "select",
        options: [
            {label: "Low", value: -1},
            {label: "Medium", value: 0},
            {label: "High", value: 1}
        ],
        value: 0,
    });

    let result = await app.prompt(
        message,
        {
            inputs: promptInput
        }
    );

    let completion, energy, morale;
    if (result === null) {
        completion = false;
        energy = 0;
        morale = 0;
    } else {
        [completion, energy, morale] = result;
    }

    if (!energy) energy = 0;
    if (!morale) morale = 0;
    if (!promptCompletion) completion = null;
    return [completion, energy, morale];
}

export async function _promptInput(app, options) {
    const startTime = await _promptStartTime(app);
    if (!startTime) {
        return;
    }
    const cycleCount = await _promptCycleCount(app, options, startTime);
    if (!cycleCount) {
        return;
    }
    return [startTime, cycleCount];
}