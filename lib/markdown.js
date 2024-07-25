//===================================================================================
// ==== MARKDOWN HELPERS ====
//===================================================================================
export async function _createTableHeader(columns) {
    const separatorFirst = columns.map(() => " ").join("|");
    const separatorSecond = columns.map(() => "-").join("|");
    const header = columns.join (" | ");
    return `|${separatorFirst}|\n|${separatorSecond}|\n| ${header} |`;
}

//===================================================================================
export function _markdownTableToDict(content) {
    // Extract Markdown table from content
    const tableRegex = /\|(?:.+?)\|$/gm;
    const tableMatch = content.match(tableRegex);

    // If no table found, return {}
    if (!tableMatch) return [];

    // Parse headers from table
    const headers = tableMatch.slice(2)[0].split("|")
        .map(header => header.trim())
        .filter(header => header);  // Filter out empty headers

    // Parse rows from table
    let rows;
    if (!tableMatch[2]) rows = [];
    else rows = tableMatch.slice(3).filter(row => row.trim() !== "");

    // Convert each row into a JavaScript object where each key is a header
    // and each value is the corresponding cell in the row
    return rows.map(row => {
        const cells = row.split("|")
            .slice(1, -1)  // Remove first and last faux cell
            .map(cell => cell.trim())

        const rowObj = {};
        headers.forEach((header, i) => {
            rowObj[header] = cells[i] || "";
        });
        return rowObj;
    });
}

//===================================================================================
export function _dictToMarkdownTable(tableDict) {
    // Extract headers
    const headers = Object.keys(tableDict[0]);

    // Prepare the header row and the separator
    const separatorFirst = `|${headers.map(() => " ").join("|")}|`;
    const separatorSecond = `|${headers.map(() => "-").join("|")}|`;
    const headerRow = `| ${headers.join(" | ")} |`;

    // Prepare the data rows
    const dataRows = tableDict.map(row => {
        const cells = headers.map(header => row[header]);
        return `| ${cells.join(" | ")} |`;
    }).join("\n");

    // Return the final Markdown table
    return `${separatorFirst}\n${separatorSecond}\n${headerRow}\n${dataRows}`;
}

//===================================================================================
export function _getLinkText(text) {
    const regex = /\[(.*?)\]/;
    const match = regex.exec(text);
    return match ? match[1] : null;
}

//===================================================================================
export function _makeNoteLink(target) {
    return `[${target.name}](https://www.amplenote.com/notes/${target.uuid})`;
}