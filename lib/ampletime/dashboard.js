//===================================================================================
// ==== DASHBOARD MANIPULATION ====
//===================================================================================
/*
 * Creates a dashboard note if it doesn't exist, inserts the table header.
 * Returns a handle to the note.
 */
import {_createTableHeader, _dictToMarkdownTable, _markdownTableToDict} from "../markdown.js";
import {_getCurrentTime} from "./date-time.js";

export async function _ensureDashboardNote(app, options) {
    console.log(`_ensureDashboardNote`);
    // Ensure note exists
    let dash = await app.findNote(
        {name: options.noteTitleDashboard, tags: [options.noteTagDashboard],}
    );
    console.log(dash);
    if (!dash) {
        dash = await _createDashboardNote(
            app,
            options.noteTitleDashboard,
            options.noteTagDashboard
        );
    }

    // Ensure table exists
    const sections = await app.getNoteSections(dash);
    console.log(sections);
    const timeEntriesSection = sections.find(
        (section) => section.heading &&
            section.heading.text === options.sectionTitleDashboardEntries
    );
    console.log(timeEntriesSection);

    if (!timeEntriesSection) {
        await app.insertNoteContent(
            dash,
            `## ${options.sectionTitleDashboardEntries}\n`,
            {atEnd: true}
        );
        let tableHeader = await _createTableHeader(options.dashboardColumns);
        await app.insertNoteContent(dash, tableHeader, {atEnd: true});
    }

    return dash;
}

//===================================================================================
/*
 * Creates the empty dashboard note.
 * Returns a handle.
 */
export async function _createDashboardNote(app, noteTitle, noteTag) {
    console.log(`_createDashboardNote(app, ${noteTitle}, ${noteTag}`);
    await app.createNote(noteTitle, [noteTag]);
    return await app.findNote({
        name: noteTitle,
        tags: [noteTag],
    });
}

//===================================================================================
/*
 * Returns the name of the task that is running (usually an MD link to a note) or false otherwise
 */
export async function _isTaskRunning(app, dash) {
    console.log(`_isTaskRunning(${dash})`);

    // Get dashboard content
    let content = await app.getNoteContent(dash);
    const table = _markdownTableToDict(content);
    console.log(table);
    if (!table) return false;

    // Check if there is a task with a start time and no end time
    const runningTask = table.find(row => row['Start Time'] && !row['End Time']);
    console.log(runningTask);
    if (Boolean(runningTask)) return runningTask;
    return false;
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
    const section = {heading: {text: options.sectionTitleDashboardEntries}};
    await app.replaceNoteContent(dash, updatedTableMarkdown, {section});
    return true;
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