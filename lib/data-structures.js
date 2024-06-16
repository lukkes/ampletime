import {_makeNoteLink} from "./markdown.js";
//===================================================================================
// ==== DATA STRUCTURES ====
//===================================================================================
/*
 * Inserts a new object inside the main data structure used for holding time entries
 */
export function _insertRowToDict(tableDict, newRow) {
    console.log(`_insertRowToDict(${tableDict}, ${newRow})`);
    // Insert new row at the beginning of the dictionary
    tableDict.unshift(newRow);
    return tableDict;
}

//===================================================================================
/*
 * Get a data URL from a blob
 */
export function _dataURLFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = event => {
            resolve(event.target.result);
        };

        reader.onerror = function(event) {
            reader.abort();
            reject(event.target.error);
        };

        reader.readAsDataURL(blob);
    });
}

//===================================================================================
/*
 * Add a new column and fill as many values on that column in an existing table
 * "name" is a String
 * "data" is an array of values
 * "memory" is the dictionary to add to
 * Returns the new dictionary
 */
export function _insertColumnInMemory(memory, name, data) {
    console.log(`_insertColumnInMemory(${memory}, ${name}, ${data})`)
    console.log(memory);
    return memory.map((obj, index) => ({
        [name]: data[index],
        ...obj
    }));
}