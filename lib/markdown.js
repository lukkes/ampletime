//===================================================================================
// ==== MARKDOWN HELPERS ====
//===================================================================================
export async function _createTableHeader(columns) {
    console.log(`_createTableHeader(${columns}`);
    const header = columns.join (" | ");
    const separator = columns.map(() => "-").join(" | ");
    const tableHeader = `| ${header} |\n| ${separator} |`;
    return tableHeader;
}

//===================================================================================
export function _markdownTableToDict(content) {
    console.log(`_markdownTableToDict(${content})`);
    // Extract markdown table from content
    const tableRegex = /\|(?:.+?)\|$/gm;
    const tableMatch = content.match(tableRegex);

    // If no table found, return {}
    if (!tableMatch) return [];

    // Parse headers from table
    const headers = tableMatch[0].split("|")
        .map(header => header.trim())
        .filter(header => header);  // Filter out empty headers

    // Parse rows from table
    let rows;
    if (!tableMatch[2]) rows = [];
    else rows = tableMatch.slice(2).filter(row => row.trim() !== "");

    // Convert each row into a JavaScript object where each key is a header
    // and each value is the corresponding cell in the row
    const table = rows.map(row => {
        const cells = row.split("|")
            .slice(1, -1)  // Remove first and last faux cell
            .map(cell => cell.trim())

        const rowObj = {};
        headers.forEach((header, i) => {
            rowObj[header] = cells[i] || null;
        });
        return rowObj;
    });

    return table;
}

//===================================================================================
export function _dictToMarkdownTable(tableDict) {
    console.log(`_dictToMarkdownTable(${tableDict})`);
    console.log(tableDict);
    console.log(tableDict[0]);
    console.log(Object.keys(tableDict[0]));
    // Extract headers
    const headers = Object.keys(tableDict[0]);

    // Prepare the header row and the separator
    const headerRow = `| ${headers.join(" | ")} |`;
    const separator = `| ${headers.map(() => "-").join(" | ")} |`;

    // Prepare the data rows
    const dataRows = tableDict.map(row => {
        const cells = headers.map(header => row[header]);
        return `| ${cells.join(" | ")} |`;
    }).join("\n");

    // Return the final markdown table
    return `${headerRow}\n${separator}\n${dataRows}`;
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