//===================================================================================
// ==== DASHBOARD MANIPULATION ====
//===================================================================================
/*
 * Creates a dashboard note if it doesn't exist, inserts the table header.
 * Returns a handle to the note.
 */
import {_createTableHeader, _dictToMarkdownTable, _markdownTableToDict} from "../markdown.js";
import {_getCurrentTime} from "./date-time.js";
import {_insertRowToDict} from "../data-structures.js";

export async function _ensureDashboardNote(app, options) {
    console.debug(`_ensureDashboardNote`);
    // Ensure note exists
    let dash = await app.findNote(
        {name: options.noteTitleDashboard, tags: [options.noteTagDashboard],}
    );
    if (!dash) {
        dash = await _createDashboardNote(
            app,
            options.noteTitleDashboard,
            options.noteTagDashboard
        );
    }

    // Ensure table exists
    const sections = await app.getNoteSections(dash);
    const timeEntriesSection = sections.find(
        (section) => section.heading &&
            section.heading.text === options.sectionTitleDashboardEntries
    );

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
    const table = await _readDasbhoard(app, dash);
    if (!table) return false;

    // Check if there is a task with a start time and no end time
    const runningTask = table.find(row => row['Start Time'] && !row['End Time']);
    if (Boolean(runningTask)) return runningTask;
    return false;
}

//===================================================================================
/*
 * Stops a task by adding "Stop Time" column to the dashboard table
 */
export async function _stopTask(app, dash, options) {
    let tableDict = await _readDasbhoard(app, dash);
    tableDict = _editTopTableCell(tableDict, "End Time", await _getCurrentTime());
    await writeDashboard(app, options, dash, tableDict);
    return true;
}

//===================================================================================
/*
 * Adds the current time to every row with no End Time.
 * Returns the new dictionary.
 */
export function _editTopTableCell(tableDict, key, value) {
    console.debug(`_editTopTableCell(${tableDict}, ${key}, ${value})`);
    // Find the row with no "End Time" and add the current time
    tableDict[0][key] = value;
    return tableDict;
}

export function _appendToTopTableCell(tableDict, key, value) {
    console.debug(`_appendToTopLevelCell(${tableDict}, ${key}, ${value}`);
    let existing = _getTopTableCell(tableDict, key);
    if (!existing) {
        tableDict = _editTopTableCell(tableDict, key, value);
    } else {
        tableDict = _editTopTableCell(tableDict, key, existing + "," + value);
    }
    return tableDict;
}

export function _getTopTableCell(tableDict, key) {
    return tableDict[0][key];
}

//===================================================================================
export async function _readDasbhoard(app, dash) {
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    return tableDict;
}

export async function writeDashboard(app, options, dash, tableDict) {
    // Convert back to Markdown text and edit dashboard
    let updatedTableMarkdown = _dictToMarkdownTable(tableDict);
    const section = {heading: {text: options.sectionTitleDashboardEntries}};
    await app.replaceNoteContent(dash, updatedTableMarkdown, {section});
}

/*
 * Creates new row in the dashboard table, adds "Task Name" and "Start Time"
 */
export async function _logStartTime(app, dash, newRow, options) {
    console.debug(`_logStartTime(${dash}, ${newRow}`);

    // Get the current dashboard contents
    let tableDict = await _readDasbhoard(app, dash);
    // Insert the new entry at the top
    tableDict = _insertRowToDict(tableDict, newRow);
    await writeDashboard(app, options, dash, tableDict);

    return true;
}