import {_markdownTableToDict, _dictToMarkdownTable, _getLinkText} from "./markdown.js";
import {_insertRowToDict} from "./data-structures.js";
import {_getCurrentTime, _calculateDuration, _addDurations, _durationToSeconds} from "./date-time.js";
import {_entryFromRow, _getEntryName} from "./entries.js";

//===================================================================================
// ==== TASK MANIPULATION ====
//===================================================================================

/*
 * Returns a list of objects with properties "Quadrant" and "Percentage"
 * Quadrant 1 is "important" and "urgent"
 * Quadrant 2 is "important" and "not urgent"
 * Quadrant 3 is "not important" and "urgent"
 * Quadrant 4 is "not important" and "not urgent"
 */
export async function _getTaskDistribution(app, dash, target, startDate, endDate) {
    console.log(`_getTaskDistribution()`);

    // Get the contents of the dashboard
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    console.log(tableDict);

    // Filter to only entries for the current task/project
    let entries = _getEntriesWithinDates(tableDict, target, startDate, endDate);
    console.log(entries);
    if (!entries) return;

    entries = entries.filter(item => item["Task Name"]);

    let taskDistribution = { "q1": [], "q2": [], "q3": [], "q4": [] };
    for (let entry of entries) {
        let matches = entry["Task Name"].match(/\(([a-zA-Z0-9-]+?)\)/gm);
        let taskUUID = matches[matches.length - 1];
        taskUUID = taskUUID.slice(1, taskUUID.length - 1);
        let task = await app.getTask(taskUUID);

        if (task.urgent && task.important) taskDistribution.q1.push(entry);
        else if (!task.urgent && task.important) taskDistribution.q2.push(entry);
        else if (task.urgent && !task.important) taskDistribution.q3.push(entry);
        else if (!task.urgent && !task.important) taskDistribution.q4.push(entry);
    }

    for (let key of Object.keys(taskDistribution)) {
        let durations = await _calculateTaskDurations(taskDistribution[key]);
        let sum = durations.reduce((pv, cv) => _addDurations(pv, cv["Duration"]), "00:00:00");
        taskDistribution[key] = {
            count: taskDistribution[key].length,
            duration: _durationToSeconds(sum)/60/60
        }
    }

    return taskDistribution;
}
/*
 * Returns a list of objects with properties "Task Name" and "Duration"
 * Computes the total duration of each task within given dates.
 * Optionally filters to only tasks that match "taskName", which must be a full MD link.
 */
export async function _getTaskDurations(app, dash, target, startDate, endDate) {
    console.log(`_getTaskDurations(app, ${_getEntryName(target)}, ${startDate}, ${endDate})`);

    // Get the contents of the dashboard
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    console.log(tableDict);

    // Filter to only entries for the current task/project
    let entries = _getEntriesWithinDates(tableDict, target, startDate, endDate);
    console.log(entries);
    if (!entries) return;

    // Aggregate time entries and sum together identical rows
    let taskDurations = _calculateTaskDurations(entries);
    console.log(taskDurations);
    return taskDurations;
}
//===================================================================================
/*
 * Returns the name of the task that is running (usually a MD link to a note) or false otherwise
 */
export async function _isTaskRunning(app, dash) {
    console.log(`_isTaskRunning(${dash})`);

    // Get dashboard content
    let content = await app.getNoteContent(dash);
    const table = _markdownTableToDict(content);
    console.log(table);
    if (!table) return false;

    // Check if there is a task with a start time and no end time
    const runningTask = table.find(row => row['Project Name'] && row['Start Time'] && !row['End Time']);
    console.log(runningTask);
    if (Boolean(runningTask)) return _entryFromRow(runningTask);
    return false;
}

//===================================================================================
/*
 * Creates new row in the dashboard table, adds "Task Name" and "Start Time"
 */
export async function _logStartTime(app, dash, target, currentTime, options) {
    console.log(`_logStartTime(${dash}, ${target}, ${currentTime})`);

    // Get the current dashboard contents
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    console.log(tableDict);

    // Insert the new entry at the top
    tableDict = _insertRowToDict(tableDict, target, currentTime);
    console.log(tableDict);

    // Convert back to markdown text and edit dashboard
    let updatedTableMarkdown = _dictToMarkdownTable(tableDict);
    console.log(updatedTableMarkdown);
    const section = { heading: { text: options.sectionTitleDashboardTimeEntries } };
    await app.replaceNoteContent(dash, updatedTableMarkdown, {section});

    return true;
}

//===================================================================================
/*
 * Stops a task by adding "Stop Time" column to the dashboard table
 */
export async function _stopTask(app, dash, options) {
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    tableDict = _addEndTimeToDict(tableDict, await _getCurrentTime());
    let updatedTableMarkdown = _dictToMarkdownTable(tableDict);
    const section = { heading: { text: options.sectionTitleDashboardTimeEntries } };
    await app.replaceNoteContent(dash, updatedTableMarkdown, {section});
    return true;
}

//===================================================================================
/*
 * Gets all tasks that have entries stopping within given dates.
 * Returns a list of objects with properties "Task Name", "Start Time", "Stop Time"
 * Optionally filters to only task names matching "taskName", which must be a full MD link.
 */
export function _getEntriesWithinDates(tableDict, target, startDate, endDate) {
    console.log(`_getEntriesWithinDates(${tableDict}, ${_getEntryName(target)}, ${startDate}, ${endDate}`);
    // Filter the entries that end within given dates
    let entries = tableDict.filter(row => {
        let endTime = new Date(row['End Time']);
        console.log(new Date(row['End Time']));
        return endTime >= startDate && endTime <= endDate;
    });
    if (target) entries = entries.filter(row => {
        return row['Project Name'] === target.data.projectName && row["Task Name"] === target.data.taskName;
    })
    return entries;
}

//===================================================================================
/*
 * Given a list of objects with "Task Name", "Start Time" and "Stop Time", will return
 * the total duration for each task.
 */
export async function _calculateTaskDurations(entries, type="Project") {
    console.log(`_calculateTaskDurations(${entries})`);

    let taskDurations = {};
    entries.forEach(entry => {
        // Determine if we are creating stats per project or per task
        let targetName;
        if (type === "Project") targetName = entry["Project Name"];
        else if (type === "Task") targetName = _getEntryName(_entryFromRow(entry));
        else return [];

        // Compute the duration of this entry
        let duration = _calculateDuration(entry['Start Time'], entry['End Time']);

        // If the task has already been logged, add the new duration to the existing one
        if (targetName in taskDurations) {
            taskDurations[targetName] = _addDurations(taskDurations[targetName], duration);
        } else {
            taskDurations[targetName] = duration;
        }
    });

    // Convert object to array and sort by duration
    let sortedTasks = Object.entries(taskDurations).sort((a, b) => {
        // Convert durations to seconds for sorting
        let aDurationInSeconds = _durationToSeconds(a[1]);
        let bDurationInSeconds = _durationToSeconds(b[1]);
        return bDurationInSeconds - aDurationInSeconds;
    });

    // Convert sorted array to list of objects with "Task Name" and "Duration" properties
    let sortedTaskDurations = sortedTasks.map(task => {
        return {
            "Entry Name": task[0],
            "Duration": task[1]
        };
    });

    return sortedTaskDurations;
}

//===================================================================================
/*
 * Adds the current time to every row with no End Time.
 * Returns the new dictionary.
 */
export function _addEndTimeToDict(tableDict, currentTime) {
    console.log(`_addEndTimeToDict(${tableDict}, ${currentTime})`);
    // Find the row with no "End Time" and add the current time
    for (let row of tableDict) {
        if (!row["End Time"]) {
            row["End Time"] = currentTime;
            break;
        }
    }
    return tableDict;
}
