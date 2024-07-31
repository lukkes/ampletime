import {_sectionRange, stripMarkdownFormatting} from "../test-helpers-markdown.js";
import {_editTopTableCell, _readDasbhoard, writeDashboard} from "../ampletime/dashboard.js";
import {_getCurrentTimeFormatted} from "../ampletime/date-time.js";

export let sessionHeading, sessionNoteUUID;

export function markAddress(heading, uuid) {
    sessionHeading = heading;
    sessionNoteUUID = uuid;
}

export async function appendToSession(app, content) {
    let noteContent = await app.getNoteContent({uuid: sessionNoteUUID});
    let heading = await _getSessionSubHeading(app, stripMarkdownFormatting(sessionHeading));
    if (!heading) {
        throw("Heading not found");
    }
    let headingContent = await _sectionContent(noteContent, heading);
    await app.replaceNoteContent({uuid: sessionNoteUUID}, headingContent + content, {section: heading});
}

export async function appendToHeading(app, headingName, content) {
    // TODO: maybe create if back if missing
    let noteContent = await app.getNoteContent({uuid: sessionNoteUUID});
    let cycleHeading = await _getSessionSubHeading(app, headingName);
    if (!cycleHeading) throw new Error("Expected heading for this cycle but couldn't find one.");
    let cycleHeadingContent = await _sectionContent(noteContent, cycleHeading);
    await app.replaceNoteContent({uuid: sessionNoteUUID}, cycleHeadingContent + content, {section: cycleHeading});
}

/*******************************************************************************************
 * Return all of the markdown within a section that begins with `sectionHeadingText`
 * `sectionHeadingText` Text of the section heading to grab, with or without preceding `#`s
 * `depth` Capture all content at this depth, e.g., if grabbing depth 2 of a second-level heading, this will return all potential h3s that occur up until the next h1 or h2
 */
export function _sectionContent(noteContent, headingTextOrSectionObject) {
    let sectionHeadingText, sectionIndex;
    if (typeof headingTextOrSectionObject === "string") {
        sectionHeadingText = headingTextOrSectionObject;
    } else {
        sectionHeadingText = headingTextOrSectionObject.heading.text;
        sectionIndex = headingTextOrSectionObject.index;
    }
    try {
        sectionHeadingText = sectionHeadingText.replace(/^#+\s*/, "");
    } catch (err) {
        if (err.name === "TypeError") {
            throw(new Error(`${ err.message } (line 1054)`));
        }
    }
    const { startIndex, endIndex } = _sectionRange(noteContent, sectionHeadingText, sectionIndex);
    return noteContent.slice(startIndex, endIndex);
}

export async function _getSessionSubHeading(app, sectionName) {
    let note = await app.findNote({uuid: sessionNoteUUID});
    let sections = await app.getNoteSections(note);

    // Filter to only sections after the main session heading
    let mainSectionIndex = sections.findIndex(section => section?.heading?.text.includes(stripMarkdownFormatting(sessionHeading)));
    sections = sections.slice(mainSectionIndex, sections.length);

    // Filter to only sections before another level 1 heading
    let nextSectionIndex = sections.slice(1).findIndex(section => section?.heading?.level <= 1);
    if (nextSectionIndex === -1) nextSectionIndex = sections.length;
    sections = sections.slice(0, nextSectionIndex + 1);

    for (let section of sections) {
        if (section?.heading?.text === sectionName) return section;
    }
}

export async function _appendToNote(app, contents) {
    await app.context.replaceSelection(contents);
}

export function getCycleTarget(options, cycleContents) {
    let start, end;
    let match = cycleContents.indexOf(`${options.cycleStartQuestions[0]}\n`);
    if (match === -1) return false;
    start = match + options.cycleStartQuestions[0].length;
    end = cycleContents.indexOf(`- ${options.cycleStartQuestions[1]}`);
    return cycleContents.slice(start, end).trim();
}

export async function appendCycle(app, cycle) {
    try {
        await appendToHeading(app, "Cycles", `\n### ${cycle}`);
    } catch (err) {
        await appendToSession(app, "\n## Cycles")
        await appendToHeading(app, "Cycles", `\n### ${cycle}`);
    }
}

export async function appendToCycleHeading(app, heading, content) {
    try {
        await appendToHeading(app, heading, content);
    } catch (err) {
        await appendCycle(app, heading);
        await appendToHeading(app, heading, content);
    }
}

export async function _writeEndTime(app, options, dash) {
    let dashTable = await _readDasbhoard(app, dash);
    dashTable = _editTopTableCell(dashTable, "End Time", _getCurrentTimeFormatted());
    await writeDashboard(app, options, dash, dashTable);
}

export async function _insertSessionOverview(app, options, sessionHeadingText) {
    let sessionMarkdown = [sessionHeadingText];

    sessionMarkdown.push("## Session overview");
    for (let i = 0; i < options.initialQuestions.length; i++) {
        sessionMarkdown.push(
            `- **${options.initialQuestions[i]}**`,
        );
        // let answer = initialQuestions[i];
        // sessionMarkdown.push(`  - ${answer}`);
    }

    await _appendToNote(app, "\n" + sessionMarkdown.join("\n"));
    await appendToSession(app, "\n## Cycles");
}