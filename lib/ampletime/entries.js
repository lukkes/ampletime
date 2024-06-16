import {_getLinkText} from "../markdown.js";

export function _getEntryName(entry) {
    if (!entry) return "All";
    if (entry.data.taskName) {
        return `${_getLinkText(entry.data.projectName)}: ${entry.data.taskName}`
    } else {
        return _getLinkText(entry.data.projectName);
    }
}

export function _entryFromRow(row) {
    let entry = {};
    entry.data = {};
    entry.data.taskName = row["Task Name"];
    entry.data.projectName = row["Project Name"];

    if (entry.data.taskName) entry.type = "task";
    else entry.type = "project";
    return entry;
}