import {_sectionRange, stripMarkdownFormatting} from "../test-helpers-markdown.js";

export let sessionHeading, sessionNoteUUID;

export function markAddress(heading, uuid) {
    sessionHeading = heading;
    sessionNoteUUID = uuid;
}

export async function appendToSession(app, content) {
    let noteContent = await app.getNoteContent({uuid: sessionNoteUUID});
    let heading = await _getSessionSubHeading(app, stripMarkdownFormatting(sessionHeading));
    if (!heading) {
        console.log(sessionHeading);
        console.log(noteContent);
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
    console.debug(`_sectionContent()`);
    let sectionHeadingText;
    if (typeof headingTextOrSectionObject === "string") {
        sectionHeadingText = headingTextOrSectionObject;
    } else {
        sectionHeadingText = headingTextOrSectionObject.heading.text;
    }
    try {
        sectionHeadingText = sectionHeadingText.replace(/^#+\s*/, "");
    } catch (err) {
        if (err.name === "TypeError") {
            throw(new Error(`${ err.message } (line 1054)`));
        }
    }
    const { startIndex, endIndex } = _sectionRange(noteContent, sectionHeadingText);
    return noteContent.slice(startIndex, endIndex);
}

export function _sectionRange(bodyContent, sectionHeadingText) {
    console.debug(`_sectionRange`);
    const sectionRegex = /^#+\s*([^#\n\r]+)/gm;
    const indexes = Array.from(bodyContent.matchAll(sectionRegex));
    const sectionMatch = indexes.find(m => m[1].trim() === sectionHeadingText.trim());
    if (!sectionMatch) {
        console.error("Could not find section", sectionHeadingText, "that was looked up. This might be expected");
        return { startIndex: null, endIndex: null };
    } else {
        const level = sectionMatch[0].match(/^#+/)[0].length;
        const nextMatch = indexes.find(m => m.index > sectionMatch.index && m[0].match(/^#+/)[0].length <= level);
        const endIndex = nextMatch ? nextMatch.index : bodyContent.length;
        return { startIndex: sectionMatch.index + sectionMatch[0].length + 1, endIndex };
    }
}

async function _getSessionSubHeading(app, sectionName) {
    let note = await app.findNote({uuid: sessionNoteUUID});
    let sections = await app.getNoteSections(note);
    console.log(sections);

    // Filter to only sections after the main session heading
    let mainSectionIndex = sections.findIndex(section => section.heading.text === sessionHeading);
    sections = sections.slice(mainSectionIndex, sections.length);

    // Filter to only sections before another level 1 heading
    let nextSectionIndex = sections.slice(1).findIndex(section => section.heading.level <= 1);
    if (nextSectionIndex === -1) nextSectionIndex = sections.length;
    sections = sections.slice(0, nextSectionIndex + 1);

    for (let section of sections) {
        if (section.heading.text === sectionName) return section;
    }
}

export async function _appendToNote(app, contents, targetNoteUUID = null) {
    if (!targetNoteUUID) {
        targetNoteUUID = app.context.noteUUID;
    }
    await app.insertNoteContent({uuid: targetNoteUUID}, contents, {atEnd: true});
}