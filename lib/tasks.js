//===================================================================================
// ==== TASK MANIPULATION ====
//===================================================================================
/*
 * Returns a list of objects with properties "Task Name" and "Duration"
 * Computes the total duration of each task within given dates.
 * Optionally filters to only tasks that match "taskName", which must be a full MD link.
 */
async function _getTaskDurations(app, taskName, startDate, endDate) {
    console.log(`_getTaskDurations(app, ${taskName}, ${startDate}, ${endDate})`);
    let dash = await _ensureDashboardNote(app);
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    console.log(tableDict);
    let entries = _getEntriesWithinDates(tableDict, taskName, startDate, endDate);
    console.log(entries);
    if (!entries) return;
    let taskDurations = _calculateTaskDurations(entries);
    console.log(taskDurations);
    return taskDurations;
}
//===================================================================================
/*
 * Returns the name of the task that is running (usually a MD link to a note) or false otherwise
 */
async function _isTaskRunning(app, dash) {
    console.log(`_isTaskRunning(${dash})`);
    let content = await app.getNoteContent(dash);
    const table = _markdownTableToDict(content);
    console.log(table);
    if (!table) return false;
    // Check if there is a task with a start time and no end time
    const runningTask = table.find(row => row['Task Name'] && row['Start Time'] && !row['End Time']);
    console.log(runningTask);
    if (Boolean(runningTask)) return runningTask["Task Name"];
    return false;
}

//===================================================================================
/*
 * Creates new row in the dashboard table, adds "Task Name" and "Start Time"
 */
async function _logStartTime(app, dash, target, currentTime) {
    console.log(`_logStartTime(${dash}, ${target}, ${currentTime})`);
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    console.log(tableDict);
    tableDict = _insertRowToDict(tableDict, target, currentTime);
    console.log(tableDict);
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
async function _stopTask(app, dash) {
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
function _getEntriesWithinDates(tableDict, taskName, startDate, endDate) {
    console.log(`_getEntriesWithinDates(${tableDict}, ${taskName}, ${startDate}, ${endDate}`);
    // Filter the entries that end within given dates
    console.log(startDate);
    console.log(endDate);
    let entries = tableDict.filter(row => {
        let endTime = new Date(row['End Time']);
        console.log(new Date(row['End Time']));
        return endTime >= startDate && endTime <= endDate;
    });
    if (taskName) entries = entries.filter(row => {
        return row['Task Name'] === taskName;
    })
    return entries;
}
//===================================================================================
/*
 * Given a list of objects with "Task Name", "Start Time" and "Stop Time", will return
 * the total duration for each task.
 */
function _calculateTaskDurations(entries) {
    console.log(`_calculateTaskDurations(${entries})`);
    let taskDurations = {};
    entries.forEach(entry => {
        let taskName = entry['Task Name'];
        let duration = _calculateDuration(entry['Start Time'], entry['End Time']);
        // If the task has already been logged, add the new duration to the existing one
        if (taskName in taskDurations) {
            taskDurations[taskName] = _addDurations(taskDurations[taskName], duration);
        } else {
            taskDurations[taskName] = duration;
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
            "Task Name": task[0],
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
function _addEndTimeToDict(tableDict, currentTime) {
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
