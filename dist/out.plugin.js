(() => {
  // lib/markdown.js
  async function _createTableHeader(columns) {
    const separatorFirst = columns.map(() => " ").join("|");
    const separatorSecond = columns.map(() => "-").join("|");
    const header = columns.join(" | ");
    return `|${separatorFirst}|
|${separatorSecond}|
| ${header} |`;
  }
  function _markdownTableToDict(content) {
    const tableRegex = /\|(?:.+?)\|$/gm;
    const tableMatch = content.match(tableRegex);
    if (!tableMatch)
      return [];
    const headers = tableMatch.slice(2)[0].split("|").map((header) => header.trim()).filter((header) => header);
    let rows;
    if (!tableMatch[2])
      rows = [];
    else
      rows = tableMatch.slice(3).filter((row) => row.trim() !== "");
    return rows.map((row) => {
      const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
      const rowObj = {};
      headers.forEach((header, i) => {
        rowObj[header] = cells[i] || "";
      });
      return rowObj;
    });
  }
  function _dictToMarkdownTable(tableDict) {
    const headers = Object.keys(tableDict[0]);
    const separatorFirst = `|${headers.map(() => " ").join("|")}|`;
    const separatorSecond = `|${headers.map(() => "-").join("|")}|`;
    const headerRow = `| ${headers.join(" | ")} |`;
    const dataRows = tableDict.map((row) => {
      const cells = headers.map((header) => row[header]);
      return `| ${cells.join(" | ")} |`;
    }).join("\n");
    return `${separatorFirst}
${separatorSecond}
${headerRow}
${dataRows}`;
  }
  function _getLinkText(text) {
    const regex = /\[(.*?)\]/;
    const match = regex.exec(text);
    return match ? match[1] : null;
  }
  function _makeNoteLink(target) {
    return `[${target.name}](https://www.amplenote.com/notes/${target.uuid})`;
  }
  function _formatNoteLink(name, uuid) {
    return `[${name}](https://www.amplenote.com/notes/${uuid})`;
  }

  // lib/ampletime/date-time.js
  function _getCurrentTimeFormatted() {
    return _getISOStringFromDate(_getCurrentTime());
  }
  function _getCurrentTime() {
    const now = /* @__PURE__ */ new Date();
    return now;
  }
  function _getISOStringFromDate(dateObject) {
    let timezoneOffset = dateObject.getTimezoneOffset() * 6e4;
    let newDate = new Date(dateObject - timezoneOffset);
    return newDate.toISOString().slice(0, -1);
  }
  function _durationToSeconds(duration) {
    let [hours, minutes, seconds] = duration.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }
  function _calculateDuration(startTime, endTime) {
    console.debug(`_calculateDuration(${startTime}, ${endTime})`);
    let start = new Date(startTime);
    let end = new Date(endTime);
    let durationMillis = end - start;
    let hours = Math.floor(durationMillis / 36e5);
    let minutes = Math.floor((durationMillis - hours * 36e5) / 6e4);
    let seconds = Math.floor((durationMillis - hours * 36e5 - minutes * 6e4) / 1e3);
    hours = hours.toString().padStart(2, "0");
    minutes = minutes.toString().padStart(2, "0");
    seconds = seconds.toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }
  function _addDurations(duration1, duration2) {
    console.debug(`_addDurations(${duration1}, ${duration2})`);
    const seconds1 = _durationToSeconds(duration1);
    const seconds2 = _durationToSeconds(duration2);
    const totalSeconds = seconds1 + seconds2;
    return _secondsToDuration(totalSeconds);
  }
  function _secondsToDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = seconds % 60;
    return [hours, minutes, remainingSeconds].map((v) => v < 10 ? "0" + v : v).join(":");
  }
  function _getFormattedDate(date) {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    let daySuffix;
    if (day > 3 && day < 21)
      daySuffix = "th";
    else {
      switch (day % 10) {
        case 1:
          daySuffix = "st";
          break;
        case 2:
          daySuffix = "nd";
          break;
        case 3:
          daySuffix = "rd";
          break;
        default:
          daySuffix = "th";
      }
    }
    const year = date.getFullYear();
    return `${month} ${day}${daySuffix}, ${year}`;
  }
  function _formatAsTime(date) {
    const options = { hour: "2-digit", minute: "2-digit", hour12: false };
    return date.toLocaleTimeString(void 0, options);
  }

  // lib/data-structures.js
  function _insertRowToDict(tableDict, newRow) {
    tableDict.unshift(newRow);
    return tableDict;
  }
  function _dataURLFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      reader.onerror = function(event) {
        reader.abort();
        reject(event.target.error);
      };
      reader.readAsDataURL(blob);
    });
  }
  function _insertColumnInMemory(memory, name, data) {
    return memory.map((obj, index) => ({
      [name]: data[index],
      ...obj
    }));
  }

  // lib/ampletime/dashboard.js
  async function _ensureDashboardNote(app, options) {
    console.debug(`_ensureDashboardNote`);
    let dash = await app.findNote(
      { name: options.noteTitleDashboard, tags: [options.noteTagDashboard] }
    );
    if (!dash) {
      dash = await _createDashboardNote(
        app,
        options.noteTitleDashboard,
        options.noteTagDashboard
      );
    }
    const sections = await app.getNoteSections(dash);
    const timeEntriesSection = sections.find(
      (section) => section.heading && section.heading.text === options.sectionTitleDashboardEntries
    );
    if (!timeEntriesSection) {
      await app.insertNoteContent(
        dash,
        `## ${options.sectionTitleDashboardEntries}
`,
        { atEnd: true }
      );
      let tableHeader = await _createTableHeader(options.dashboardColumns);
      await app.insertNoteContent(dash, tableHeader, { atEnd: true });
    }
    return dash;
  }
  async function _createDashboardNote(app, noteTitle, noteTag) {
    console.log(`_createDashboardNote(app, ${noteTitle}, ${noteTag}`);
    await app.createNote(noteTitle, [noteTag]);
    return await app.findNote({
      name: noteTitle,
      tags: [noteTag]
    });
  }
  async function _isTaskRunning(app, dash) {
    const table = await _readDasbhoard(app, dash);
    if (!table)
      return false;
    const runningTask = table.find((row) => row["Start Time"] && !row["End Time"]);
    if (Boolean(runningTask))
      return runningTask;
    return false;
  }
  async function _stopTask(app, dash, options) {
    let tableDict = await _readDasbhoard(app, dash);
    tableDict = _editTopTableCell(tableDict, "End Time", _getCurrentTimeFormatted());
    await writeDashboard(app, options, dash, tableDict);
    return true;
  }
  function _editTopTableCell(tableDict, key, value) {
    tableDict[0][key] = value;
    return tableDict;
  }
  function _appendToTopTableCell(tableDict, key, value) {
    let existing = _getTopTableCell(tableDict, key);
    if (!existing) {
      tableDict = _editTopTableCell(tableDict, key, `${value}`);
    } else {
      tableDict = _editTopTableCell(tableDict, key, existing + "," + value);
    }
    return tableDict;
  }
  function _getTopTableCell(tableDict, key) {
    return tableDict[0][key];
  }
  async function _readDasbhoard(app, dash) {
    let content = await app.getNoteContent(dash);
    return _markdownTableToDict(content);
  }
  async function writeDashboard(app, options, dash, tableDict) {
    let updatedTableMarkdown = _dictToMarkdownTable(tableDict);
    const section = { heading: { text: options.sectionTitleDashboardEntries } };
    await app.replaceNoteContent(dash, updatedTableMarkdown, { section });
  }
  async function _logStartTime(app, dash, newRow, options) {
    let tableDict = await _readDasbhoard(app, dash);
    tableDict = _insertRowToDict(tableDict, newRow);
    await writeDashboard(app, options, dash, tableDict);
    return true;
  }

  // lib/test-helpers-markdown.js
  function stripMarkdownFormatting(markdown) {
    let plainText = markdown.replace(/(\*\*|__)(.*?)\1/g, "$2");
    plainText = plainText.replace(/(\*|_)(.*?)\1/g, "$2");
    plainText = plainText.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
    plainText = plainText.replace(/`([^`]+)`/g, "$1");
    plainText = plainText.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1");
    plainText = plainText.replace(/^#{1,6}\s*/gm, "");
    plainText = plainText.replace(/^-{3,}$/gm, "");
    plainText = plainText.replace(/^\s*>+\s?/gm, "");
    plainText = plainText.replace(/^\s*([-+*]|\d+\.)\s+/gm, "");
    plainText = plainText.replace(/```[\s\S]*?```/g, "");
    plainText = plainText.replace(/<\/?[^>]+(>|$)/g, "");
    plainText = plainText.replace(/\\\[([^\]]+?)\\\]/g, "[$1]");
    return plainText.trim();
  }
  function _sectionRange(bodyContent, sectionHeadingText, headingIndex = 0) {
    console.debug(`_sectionRange`);
    const sectionRegex = /^#+\s*([^#\n\r]+)/gm;
    let indexes = Array.from(bodyContent.matchAll(sectionRegex));
    indexes = indexes.map((index) => {
      let newIndex = index;
      newIndex[1] = stripMarkdownFormatting(newIndex[1]);
      return newIndex;
    });
    let occurrenceCount = 0;
    const sectionMatch = indexes.find((m) => {
      if (m[1].trim() === sectionHeadingText.trim()) {
        if (occurrenceCount === headingIndex) {
          return true;
        }
        occurrenceCount++;
      }
      return false;
    });
    if (!sectionMatch) {
      console.error("Could not find section", sectionHeadingText, "that was looked up. This might be expected");
      return { startIndex: null, endIndex: null };
    } else {
      const level = sectionMatch[0].match(/^#+/)[0].length;
      const nextMatch = indexes.find((m) => m.index > sectionMatch.index && m[0].match(/^#+/)[0].length <= level);
      const endIndex = nextMatch ? nextMatch.index : bodyContent.length;
      return { startIndex: sectionMatch.index + sectionMatch[0].length + 1, endIndex };
    }
  }

  // lib/amplefocus/logWriter.js
  var sessionHeading;
  var sessionNoteUUID;
  function markAddress(heading, uuid) {
    sessionHeading = heading;
    sessionNoteUUID = uuid;
  }
  async function appendToSession(app, content) {
    let noteContent = await app.getNoteContent({ uuid: sessionNoteUUID });
    let heading = await _getSessionSubHeading(app, stripMarkdownFormatting(sessionHeading));
    if (!heading) {
      throw "Heading not found";
    }
    let headingContent = await _sectionContent(noteContent, heading);
    await app.replaceNoteContent({ uuid: sessionNoteUUID }, headingContent + content, { section: heading });
  }
  async function appendToHeading(app, headingName, content) {
    let noteContent = await app.getNoteContent({ uuid: sessionNoteUUID });
    let cycleHeading = await _getSessionSubHeading(app, headingName);
    if (!cycleHeading)
      throw new Error("Expected heading for this cycle but couldn't find one.");
    let cycleHeadingContent = await _sectionContent(noteContent, cycleHeading);
    await app.replaceNoteContent({ uuid: sessionNoteUUID }, cycleHeadingContent + content, { section: cycleHeading });
  }
  function _sectionContent(noteContent, headingTextOrSectionObject) {
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
        throw new Error(`${err.message} (line 1054)`);
      }
    }
    const { startIndex, endIndex } = _sectionRange(noteContent, sectionHeadingText, sectionIndex);
    return noteContent.slice(startIndex, endIndex);
  }
  async function _getSessionSubHeading(app, sectionName) {
    let note = await app.findNote({ uuid: sessionNoteUUID });
    let sections = await app.getNoteSections(note);
    let mainSectionIndex = sections.findIndex((section) => section?.heading?.text.includes(stripMarkdownFormatting(sessionHeading)));
    sections = sections.slice(mainSectionIndex, sections.length);
    let nextSectionIndex = sections.slice(1).findIndex((section) => section?.heading?.level <= 1);
    if (nextSectionIndex === -1)
      nextSectionIndex = sections.length;
    sections = sections.slice(0, nextSectionIndex + 1);
    for (let section of sections) {
      if (section?.heading?.text === sectionName)
        return section;
    }
  }
  async function _appendToNote(app, contents) {
    await app.context.replaceSelection(contents);
  }
  function getCycleTarget(options, cycleContents) {
    let start, end;
    let match = cycleContents.indexOf(`${options.cycleStartQuestions[0]}
`);
    if (match === -1)
      return false;
    start = match + options.cycleStartQuestions[0].length;
    end = cycleContents.indexOf(`- ${options.cycleStartQuestions[1]}`);
    return cycleContents.slice(start, end).trim();
  }
  async function appendCycle(app, cycle) {
    try {
      await appendToHeading(app, "Cycles", `
### ${cycle}`);
    } catch (err) {
      await appendToSession(app, "\n## Cycles");
      await appendToHeading(app, "Cycles", `
### ${cycle}`);
    }
  }
  async function appendToCycleHeading(app, heading, content) {
    try {
      await appendToHeading(app, heading, content);
    } catch (err) {
      await appendCycle(app, heading);
      await appendToHeading(app, heading, content);
    }
  }
  async function _writeEndTime(app, options, dash) {
    let dashTable = await _readDasbhoard(app, dash);
    dashTable = _editTopTableCell(dashTable, "End Time", _getCurrentTimeFormatted());
    await writeDashboard(app, options, dash, dashTable);
  }
  async function _insertSessionOverview(app, options, sessionHeadingText) {
    let sessionMarkdown = [sessionHeadingText];
    sessionMarkdown.push("## Session overview");
    for (let i = 0; i < options.initialQuestions.length; i++) {
      sessionMarkdown.push(
        `- **${options.initialQuestions[i]}**`
      );
    }
    await _appendToNote(app, "\n" + sessionMarkdown.join("\n"));
    await appendToSession(app, "\n## Cycles");
  }

  // lib/amplefocus/prompts.js
  function _generateStartTimeOptions() {
    console.log("Generating start time options...");
    const options = [];
    const now = _getCurrentTime();
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    for (let offset = -20; offset <= 20; offset += 5) {
      const time = new Date(now.getTime() + offset * 60 * 1e3);
      const label = _formatAsTime(time);
      const value = time;
      options.push({ label, value });
    }
    console.log("Start time options generated.");
    console.log(JSON.stringify(options));
    return options;
  }
  async function _promptStartTime(app) {
    const startTimeOptions = _generateStartTimeOptions();
    let result = await app.prompt("When would you like to start? Choose the time of the first work cycle.", {
      inputs: [
        {
          label: "Start Time",
          type: "select",
          options: startTimeOptions,
          value: startTimeOptions[5].value
        }
      ]
    });
    if (result === -1 || result === null)
      return startTimeOptions[4].value;
    return new Date(result);
  }
  function _generateCycleOptions(startTime, options) {
    console.log("Generating cycle options...");
    const cycleOptions = [];
    for (let cycles = 2; cycles <= 8; cycles++) {
      const { endTime, totalHours, totalMinutes } = _calculateEndTime(options, startTime, cycles);
      const label = `${cycles} cycles (${totalHours} hours ${totalMinutes} minutes, until ${_formatAsTime(endTime)})`;
      cycleOptions.push({ label, value: cycles });
    }
    console.log("Cycle options generated.");
    return cycleOptions;
  }
  async function _promptCycleCount(app, options, startTimeValue) {
    const startTime = startTimeValue;
    console.log("Start time selected:", _formatAsTime(startTime));
    const cycleOptions = _generateCycleOptions(startTime, options);
    let result = await app.prompt(
      "How long should this session be? Choose the number of cycles you want to focus for.",
      {
        inputs: [
          {
            label: "Number of Cycles",
            type: "select",
            options: cycleOptions,
            value: 6
          }
        ]
      }
    );
    if (result === -1 || result === null)
      throw new Error("Number of cycles not selected. Cannot proceed.");
    return result;
  }
  async function _promptCompletionEnergyMorale(app, message, promptCompletion) {
    let promptInput = [];
    if (promptCompletion) {
      promptInput.push({
        label: promptCompletion,
        type: "checkbox"
      });
    }
    promptInput.push({
      label: "Energy (how are you feeling physically?)",
      type: "select",
      options: [
        { label: "Low", value: -1 },
        { label: "Medium", value: 0 },
        { label: "High", value: 1 }
      ],
      value: null
    });
    promptInput.push({
      label: "Morale (how are you feeling mentally, with respect to the work?)",
      type: "select",
      options: [
        { label: "Low", value: -1 },
        { label: "Medium", value: 0 },
        { label: "High", value: 1 }
      ],
      value: null
    });
    let result = await app.prompt(
      message,
      {
        inputs: promptInput
      }
    );
    let completion, energy, morale;
    if (result === null) {
      completion = null;
      energy = null;
      morale = null;
    } else if (result.length === 3) {
      completion = null;
      [energy, morale] = result;
    } else if (result.length === 4) {
      [completion, energy, morale] = result;
    }
    return [completion, energy, morale];
  }
  async function _promptInput(app, options) {
    const startTime = await _promptStartTime(app);
    if (!startTime) {
      return;
    }
    const cycleCount = await _promptCycleCount(app, options, startTime);
    if (!cycleCount) {
      return;
    }
    return [startTime, cycleCount];
  }

  // lib/util.js
  function bellSound() {
    var sound = new Audio(
      "data:audio/mp3;base64,//tQxAAAB+w7IBTBgAm3n6wDBPAAA4TKksSxLEszMzAwPFixYsWLAMDAwN3d3EIAAAABh4eHh4AAAAABh4eHh4AAAAABh4eHjwAAAABGHv+cAAP/bWIGPsQKLyQon+JlhZf/e79dPaf/7V8KInoBbjD//8BWaQhvJUfJWlSS3//9nT7PRbTg7jRJEXsSZH///9wQyLHmY45Bck5UhBYx1f///9ntTcCjJnbErm9ijqFSuML5d/lh4VEgG//vrKslSIVVAGJlv9QQCdhimdihLv/7UsQGgAq5f1m8loABfCZqfJm1eCikINa9nyesamKCT0nIonwwLGToJJJfrRb+s3CQikk96STGSSXOmuv//WNTHRNRbJaKX//pf//SCaDyS/8v8f2/r////qJMlkgIEAnplXEUBJAH9SSpZGgtUUONbD+XkFJpoakEx+NE5pQUyenu6H6ZcJkE8ByBhxPB3mR1IzJQ+cGEW86gpluroW0FahzkZx2hrbU7VU37bqZft/+g4XY8//s+Tf//rQAwInXAAACAO5D2XUmaTZbw3IrJ//tSxAoAjEl7SafSLcFwpmj0+cl4q6K0VIuklSMD6iIOxeSc63X6DdjZygITAY1KFrJNMfQfUma9zErIrUuZGymd10VqWoLal9INQCqZ+j31Ukn9f//zIVk8//mXO//////MQCAHHYBABd3KNuXGLwj0F7MYqdad1HlLRRdRNki+yCDerUzJ7JqIeTAHjYaWyb+xm3lAt06GpN3odSzEMaDfMAaYGaZ++v7f8uKT1rqV1HTwnUYaLr6/O86///1KDAAllUAAACBAJ+tV6v/flyb/+1LECICL9TNBrFKLwXamZ/GI0XjSI/UkkVqMVsV0zhxFlC0lqlUkbq6PWg2rcqiMQF5wIgRdOIpOzSzvUJYk7sapLqRQXVscTAiGIgUgksEfLV+v2X7///1i0Fb/1Fx8sv9ISABzoAxIujq2cMt77LyN0nPKagZOxYWis4mw/ropzMi390X9alkYOcC+BgQrHkmUjQRPvUgH+HhBVqLMhrZWcLwDwIn0pA1WAiAJqX+336vb/+pMV4qf/KzZRfVk6jANcwQBEBDv53K2t2IqVf/7UsQHgAv9NTssUovBbKZnKZnReElosy4o0rqcu0s6w1S3OIOw3mQ/QNUtNnOFcfgSii/JpZk6TvOE863lYQIYKMjVFdmsi7ZmaALAxplwBdQC0w3Qe3t6vb0v/6khzx5f/y7zrgAHBAAAAAtmT91vHViHRgENIgU2ZmMkETcl0eth8j3M6ZSHPUr+lv1D7HNA5UBYcVUm1ZSdlOsNTExOMYN2VmT9EogQDCjFULfgptJdv1N6vf0f/9AWk1/+c50IgARoQAECRkSv9pd3KOfG//tSxAgAC60TN4yqi4F5ImZtltFwAA2WQE9mPY4hC8SkqwxDsVM8L53683tOGZACLgYlcIMoJJJqyw3WEQ5donD71tsk1SZgmFnhoGIC58FvJWZ2fq+vrfzn/9aAyo9jPL1gEABwABAaPTXvsX+SNkwzEBSY0YuapIrUkLqPXQFeS/I3/PvrnDxsK8Bg3YWkl5aS6lzh5S5mCQcQ8pmhQLdlqtO6mSKQNR42SNAfjAl5KyL/v53z3p//2WM4SSPRXQkADGBgAQJkU9nVzu68uXP/+1LECABKkRM3jJ6LgVEiZrGT0XAN5woYcsccdHwLHdYoBsWOyCO/pze+aEeeAGIhvZ59XW3cc0PGWVqLev2e1M1Eoj0RoQ1QLATJaref+/X7f/6xnkE+WrAIAMQEEBA+N/meGcheUhPAZUvGhUxVzA5uriAGxc1RK/53QqYuD5CFgJuJlSPrKZ5tIL8B2jtyt9pzbOhwieI8EF0CRcuJqX639Xn///1KL5aR660FABOgMAACAMQuYY75lYgUcKB0RUkNc6aKACzuriAZUdJ1Dv/7UsQRgAmVEzmsHouBG6JntYVNcf+36JYLwNmxJTZn+v1BEAXput/7+pIiRUL4EEoKOzRNvr/9vX//dIf2SHQA5oowgBQKC9dxw3rLNpA3WiG5LMdpOHh/VwmBbQVBsqD/6c79k1AOCONv6/UJEPCFf+v6h/RcQqDLnn/X/7er/+tE1NlFFgA21NYgAwAv0ycTQTnysEMHwqFfWpAA1rKbCxKPkqkvpzfrzEMcD3jV9b638vDYOJL//7OkCQA+mf+3/f1//6BQPsggEpAAIAPn//tSxCWACHUTP6geS4k6mmXhpVFw3LK5VjbBgaSOuBdYauaTG0cLb23BFhU459ed2nUSgTwDAYQIfbXvfmIIQ4UAlg0MW9eZb2cUMsdQENQDWonUl/ntMTf9LPqVBALDDAAgeHMNbrV4rBwyTAbZ5x4fe5xCBU+4MFlC7NmEf1695ZplAEBMVqXkdJBkDBJVR0JlRwugieb8z3qSK5Oj8EPYMTHVL+o96vPf9aAgF0jAEM565nZvwhXoxSBphAS8XUkUlzg6fU4/FqQQ2XIlTrr/+1LEOgBJ+OcvLSqLgS+YJemZUTAPpdCddZOhgAYSP9XmYJDQ2spl233o78jTpDAH5AJNC+Cep25R//iqAZBAAJwOvZs/uglDigwDExBboyRLmvngHP0cFA6CZZTxj6dfnSuYGYDwwzCavWkpumHwhQ2OtlI+t5x76y4VyKAC0ALrCJmiaHnH9fm3/rLAuSsIAICRWMMbkdwo4UQKA9ZYS3X3G0YN/jUMsmidYuBDtnNJrTLP3UkK+JKbUmVtbqDUBMjp1X//OOeE7AxIfb9T///7UsRKAAnw6SrNnouBJyImqYXRctv//51SagCSAgAANdlufP+q/afQXZHLIuMRJGouUB36OUBkAYx4lbGmiknr+WzNIQFHtv6+ssBI8LiY2S/ed2qnThFQDXII1JJIv+f2RD/1AgNpIGHkn7fbdybltRCWHgTHyxerbGmKT+ePI2GL9plBz7Q6qPnC2tEOoLiMXXW63WyalmAISQXIJg3f97PbYomQ6QI5wGsJeR/Wf9Xn6gPVAAAAK3TWqTupe1BCEkomdTPWTDqS1LdQlNPz//tSxFsASUTTKu0ei4E4nOVptdFwMbVCoYGZgWqTrSMlPX3lgtzQUsPL/19zQNXA4UDOFC/qzLa7IGQ3QgToNtSwtS/Ovoi3/WKA/Ho4ZD9/WG60scUQNAHKDRNmSRdaDjf9U6WpD0TqZPIPW5mzMl8saAvSAmSK0TNp1NBtEEwIbyUN/7t9SimBSGCI2aJ8ltoqAAaTMIAAAstnrLH5RAzZwsePsJbQSyB7OZUAg3dInGIAgeQPDJM3le/yw1EcwbTdHVdVRZCKEc1yoz/ad/T/+1LEbIBKLNMm7TargSOYZemKUTDQJsAiCCMWSCbP6z3iP/lhQGlbECc893uG8ZG2wzQDmSDEyki66z4/q6mOlpRWE+KUmpqkDhumgn841yOGQTuouGBcOzpppg0Aijma/+r+x8TqDEZ5+jy3/XUQBmLDgAAC/l+M571QzMNJ9kepmxGPVdR0Oq+uMrMoDEE2lHN4c9Lf/aWC1NhnxGpeW8yZkzimsmLJBwsjy7/ar9JEmgHJAU5FV/1N6vPAAExWKAYQox3HLCneVZpU7A4o4v/7UsR9AEmw0ylNHouBJ5hmKYlRMh5cWpNSmODxvyyejNHi65okuy02X/OFpbEVG2zqmZ1jJ0mzIEAoHBimbv+1bX6SyOApSAlKLqXZ4r/1KgABorGAAAAi+I6pd/TOojiDGp2ijXTY66bmIAniqjzGpBBuVmtdvtG7pn0y0s1HwNJM1ZIoGzsedOs4EUA5zGbt9qO9nnR+CHYGWjqv1P6/P/9Y2aDAymalLf19SXV0MAG6IwD7O1U6RydqM7jqJY3uk61oIJum31nrHyEVmRe0//tSxI8AScznK00ui4E7GGUpmlEw1snWYAmKDmFAvf9X9ZQArABEUN0OnykAzIoAAAWHJYVsre7DHxYMS2jLLXoJqkWWpIwDmsttit1hjNDIyNUNmVdX5HlpKP5ikks4U6SS5vc0DLQLKBnHX9el16nIoALKBGcJM0dvn/11Gv16iwohAFCWAbFbWERd9NYwEuOrD0+h4ksapdQ6uz1sdTUGwXy6tlqdSK2VX3kqenzQdz7LUgztqMQIlQcdHwUG+vO+paJ8qhZUFWpLnn+t/V7/+1LEngJKVOcnTS6LgREYZWmKUTB//rUA0IgAABrkJR2K25x92arhBPp2Y4n3LM/7zfaric7/75Q38WJxXO5Zt7u5i9erjXWs+UkFupRyqpEyWoshNmJRcnWf17PapkTIgIBMEC7UiSJrb4tyVWkOIhQZAcxTL8L08zQSAhaqbRMykdx2OOTgUv2zOqvYMFx1s3dvXh3vr5Kn1qMyROpOmbrMEEDqFApgUPgoHIeVG/era60ThGgVvgSol5H+3/Pf6FdaANAKAAAZN8Nyy1hTwf/7UsSwgkrE5yLtNouBRZzkXbbRcJHmcmECJ0CUL9WcsL+OFd1ruud/ed/TNpNUmNVPUt1UmfVkqW1njE3NluYGKaCJ5bOxuGAQcrGfLKv3vtdmOD+EHkMUnBZu7qP/72//6hNGAy0Z58vxn4YXGNBhTIB9mYggUzBGjxvMpKhWbrEFTdA6gkipbOeWtBBltI0bZw1LBstlpmTMlUjRMgHGgcqGutL6kp3brUOsBbuA1PJxM5kNhATdPoR//b/rAJEYAAAZI7UtWLtylaeX6AMo//tSxLqCSuDDIOzuiYFSnORppdFwDRYhDliCk8ik1ahm9LefibjQpqMT5rUiYoKoKvmJCmF1GZytaDqZBGssBJUI+RIm6P9Wv0C+AhuCn8qJryHodoq6hYaEAT+0OG5jeETbM9hgunojCo5ZPctWNcuvRYxt8z79qZT3vWud1imclwvJttZzhCqPnXP1GZ4vMcN70ygBFQCIYQwvP9WrX0jxWDBIVVEsfdQz1/Vy9YTAAACApHJJOW5yfWYJDSxxMgsbGSSKBirYcrMmpqj6gXD/+1LEwoJLYMEg7O6JgXAYY92qUTA4kJRNChZMyZd7UZGD1PsV1poIIFZ3dBJnNAs8DmAzhPL766fspIxJoBDAEY4qu31Pq/P+3rRo/f6xNGBDevK70xdj0MJWmN2eYEJmwNZtflre4VvL8ecyzuMHl+G939vSN2dV01uoahLrqUdQd00Zs60bmIESYOQj4JxH/XvukYkOApWAlOLqTaCfi3/V/0IAASITAAAAiJGpqvejcMNSVqBEI54dWpG7FvHDD834/Ozrn671rl/DG1TUFP/7UsTFAkqIwyDtVomBXJhj6Z3RMFEzSZNlKtG4VkTzrfPmaTrUZ1qLIQqxBpkXD366t/RJQJ4A1UdVtbslf9a//9ZuMAxFkURl9LlSr3DiQB5HjbrDIarnt778h3wq6184totXVdarW96Vtv4buNxVkbV3W6S3QqJsCi0Cwch5BWe9dD3fpkMAjeAkwL6Dt6/68/877f9/2f/+9NUB0RgAAADFyKM083NSWIu0PBgdkg0oeUjU2Rc6dGaTv1OsTqO+cWXDqFRxk6Fdo3DRVRku//tSxM0CS3DnHm02i4FYmGPdndEwgpJB0EVIUDcLJQWTjrRV/r6+ZlwBdUClgroIT2KSAv3OWqM0AgBLqadwnI2p5C0lrnNVNbgXxLiuMoHN8fGcbwPp5H3aBvetzy4zCZHUPxUSdRxNlIEys3NjVNWZAQEA40Psppft/1Hg1UDGxbZ2+2pVfPf6k///1gEImAAAGcEEwHGW25bDTTA4CYKWBqgRBgkZoumxVd2UO/9VYf1nUa0buvo1UXI4hHSmhcroMgamTHaykDRUHvGJs6//+1LE0gJLPMMfTW6JgWgdI5mn0XDXq/RMi6A9CCm0rNGUW2r+q+v/1DBCoD01UEPVJqvEHWe8EcA1YCw5hJmpuamzHDUfB76rihC8tE+dXW+pSVBB0iwN4xda1vZmU04ipZQBM4HGEwW/qtt9cogm3BEtNkej0/bTANAIAAAaEilm/D/U1edVGHEhD2Mn9pURmt63rLT+61l3W9d4rfDtSvGIrTbHK6FnopkItlKUdSllFNJSJNqmgC4QFFgzhSX3rSr26aiVCVkNtOLZ6ck/bf/7UsTWA0rIwx7tVomBWpzjzafRcGrUyz9//6p/p+tgwHDTQdA0apZVAb/p1GHRH0hJEDPLR8rXt8+Fd5v/x1zrLJ+d5XrVtF2RVWktnOjedHmR06al01Y2OtSNQHjQcpGocW++vs3nCPApLAsbLgeiws+khd+rb8aqz/+j1/UqAESYAAAawC7MSwp+Q2xxJkRxQPWwEEyYZAxZaceE2pNVYQiHZUmhQUs72atayPIRTaaLVE4ugp6joNUYe6ZE4z7b1V1dRmBBCCz80eq4dXTb//tSxN2CStzDHO1WiYFAGGPpitEwt8cj/////pMgYAh668jxneUDEA4SDNJyhMrl2p21/cfyj+u4d1zDulKYF7qlxzZRsiletJBlj7JZB0ETA3opFVNmYwqKYIFIbGQ81bvXrrtU6J8Migxieeeoem1LLr7P6tepf/1+WRUAASIVAAAFB4tFZyknY4/VCLEDYFVkis3+X8/qxLdXHD/1+mHVK3b1Px0zdB6boopoOL8tO6U1SY0NHZCfQoG4EAILFx1l3+9b/dZeAoMBaEavb/P/+1LE6AJMQMMa7WaJgYCYI02t0TC36W9vb/06Bc4BlbTYahmTTcUW+LCiTQemrwQ3PXcpvDWor+f/3XebZjf1zCmsGxiaGyCBo9C8bultQVSPvPmljYCAIKIh9l9L1VrV7PlIElwKKke9bc99ot2d0WWv/7lIp0aPlQAAYiNAAAAI0D09nK1KYHRyAORzoin1Fa1XXO4aeftJlzvf/TPKGxN2MbS1InTjoLWt6A/m7NOE8fVoGZwvqas4DQ0HHHU3bfV691LLARXCcl0eynppdP/7UsTkgksQwxztUomBf5gjXa3RMGf7ft0/q9BIDANmuy+dSrWibVmrA3U7EaWfFM8OVM8dv5+ua13/2yuM0+7UVv1UTPWtCuP5bQQnkTQ6tE2Lijdb1mAJog9wuFZOrZBde/UswBNcFrCblV9Vy/Z/sOHv9ujv+t3rAALRlQAAAwgV/ndn5V8+0ASAhaickzgzV3K7Yt6uPDds61/f1k4mV2zjVjC0FpJrWs0edOD+S6KKzSpmRP3pG6qAFRAsghiSf6t+roAhgDuOZrq2W/7f//tSxOYCS2jBHUxuiYF3GCNZrNEw/7/6QIhMBwvR2eaFdlMelDOTCDD4hNiLUvau+c3FsN8u8/+e2eKfVoZfkbqNkmVWswQolkk6lLMS8cTPlQvpon6nPBfMKYHwc/Q/q3YPSBmj52jb/etv6f50Vd+v/9AAUKoAABgg9umt65GGbJBDEw8SliEr7j3euYSD+Y6v8w1trsvxpq1LmpbIoLdTGrHDIlRipLYmDxcNjJEiLFA1Ny486CeQuScNWWtv0nV9EEIwe02chalXErtn3f7/+1LE54JLvMEdTO6JgXiYI12d0TCa7/766PqSYkwBYVS53a+8oy56FQB6OJIVrQzIp38f5fd/PWPd4/dqKzRTuXdZpJszUHNPUPSLonJqVnMFLVqsUwadFLmZo39rbdIxBrkFopO1P6f2OZ7We33fpTUAxCgAAAi+RIiNWSUkTfl1DBrOhDEo5BR4583unkl/8O6/9bUzk2/5nhVQdFFToudSUNpFJGYscNDhPGx5EwNHUmBQOCwsjy6pf6/0VqOhJCLCq0Z73m6vV858l+i1ef/7UsTngktIwR1NZmmBbpgjaZ3NMCXRcy1YolABZ7IXYmb9ufbwWAiDGAQgGNKTKc5Usu06kHTnROhifLJdJ5JzA+pNknTTTWkPobSZpN0EzjHTZKzNpCAgUmPtkr7r1f50GmxG6DdbKlUI9un9uimKdCP+K9IB1KoAAB0AUKm86aXzUMMFAFQOKLdnrFvDuOWcK3vLW/5h7ly25PS+itso2TWtKguiaEoS6mmSy+buaF42M0S8jWcBpQc46X0ultW/1smCTg40PvdV+zzFMZXg//tSxOqCTHzBGu1qaYFWGCNdnc0wIAGoSkJbaz7UkTnDGgOUJFwFMtF9kVLlyq6fURAly0PBsTxdUmmu7JH00jaJYSRoeMy+oorIuX0C+RAuHiznAnCcQf//9xyQvNwyA0t06+oAmEAAdGqoK28qovpWhhwoC4j1s2DP7c7zmHcpXl++4f3PjQpZFKeXSqnUZqRunTsyA+D61rtd2ZaCKCeXAKuBaA6DZF2Za0V7q63WkDegPUZKKIHLSupKcu5FbrqcfoSlXuuYoy0/xl7dyh7/+1LE64JMdMEa7O6JgXEYI12qTTAjWAIAEfFEXspvlkfmZUpMXFlP2afWVjOxXd6prXe8/+uzajGX3+oHEUFIP2Tcfkj70ymkikXC6VTh9ZjWwzYXELCvqv/1pBBA3pxguow1d6+2V+7bz6/rAYwqAAAYwgiQ7WUYpbbFEaSxRPOpncct5d+3WxfLDuHcamfMGZapY7f7WdJtSFR+ZpjcRZ1plw1J02TMT5DC4TRYedBN4XaWEP61re71KWcCNBYhZgvKJX6bGCmlvdsL8xijff/7UsTpggr0wRzsbkmBTZfkKYpFMC3uCXq8XBip4AgA2I2mxivXo60UYKFHT2Bl6z1W/j3De4Hx3a13n9xbvVprdSllcyNjd0mTW62UL4tHnQJ40L6J4qoIlwiRqWs6ErKazW9V/b+oIWHZ6j5h/r0+z7tFAADBE0AAA6RigO3K70ilDftSClBwg2ryNyzCzn8xdaRn3Hn/rml0Qfh/38nQdk0VN3cfipWkYHjZM8UiGFVZoX06jMEEhd5TRbTq9WtXUDVAzBscsuryqLSFbRWS//tSxPICDWC/Fs1qaYFkF+OpjcUwrVU+m3f/10W9HXS6FUEiBOB751+/qtul0I4B6qu9Lc+Z53e4y3DH93N/3jJtWbX3LaVTOi1jqnWUiQdUvHFmxXRW5nNzSzjwFMpoq/9PZS8Y4LiP0fZ9cp7N+r+tAVCaAAAcY+ixBdm0/Eluv8WSF0tOK9TY37Pdbpu17+P5599ptJcw1KtsiaKMEkUmQrc4SLtOk6dRLqZMn0SmsvVmQJQGlFk3dlI9df2W0T2FFd/NpUlF96t059vWypD/+1LE7gINOL8Y7WZpgWOYI6mdSTDe9ki17Lenx6GVuhE5tonLpfZvwhZozqcEo5d7PCeub3Uk1TDn97rvuVYfa/GLddaZcMGMXc3NTRBMvDwyRogimhLJjRNzY2rOBPCaY3SZ/26/WGjh2Vant91dFm7pS//s3P/1+hUAAeM3gEACe+s6LX4xjTRRaoWRnOFNNpr2VTLdm/Dd+tjc7lnlt0Yb38c1BLsk5uqzskmmmLWnKKz5uXycPQ0RJ5JGeoAzBSGCX/f96wFcgupVxmxwm//7UsTqgk0EvxlM7kmBRpfjXazBMHzv//t///HlpUcAQAfBUMS6pbjccl0XChAD6tQo5Tr+Xrld/qu8sMe//G6RynlFaQylJI3TYyO3QdN3Kq1ublVE2MS0cOmxfOPdhxBphQS/1f6KwkkTl5oDqCqEsRQla/0931/Vp4qqAIALkHV4DQAbQ1a5ZvT3JO6xCkBHJoxOLOIus8NFSRmy25AyIl8rl86R7M7KWjp3My6PFziKCRkdNzhubqMii3DuLylf//xCjr7ZuLkbnun/VrFw//tSxOuCTPjBGO1uSYFyGCNdnUkwGIugEAGtliQJrMniNSbp2vAUAHja3orTWK39yuQru993zLfGzSLVD2963oo05iYIn0BujRQLh1zdJjMmB3pF1zinnQjpBXZtlqXff9YxoZUyZWw8NJKgJt1JZ2s8yn+n82lffaYn3ttDlQAGszfAYAFhK+lvbvNyB5SGoAUIg5gyB02XUaqWz+ogxVYzIkfKjJmk3YyTTTbH8oprpFR4mGh0+s8fJAs1goRO02///kwSOL5sAOQcWpWKnwf/+1LE5wILrMEdTWmpgX8X42mdQTAlIr2n7lOVocZKIkJuAzkryvn33KdrnOP8DtE4iFa535c6ptRspkBrLDZayCXSUHsQjUeJIkoSxk+44QhzNFv//aHwRTaLJpKQcwcuREyUhprq//X//qen/0oAUAoBABxwqWpfSETF2UQ9TgwCBZityF1ssO/hye1Uzwy5+9MKy+lpKDGo/Ug6Cbbj6ik1ZUbk4k0SySI8CkRlIpAFwCsT12Vet066/dQBwNykFRqT1oWELAdW4JoaXYiyRf/7UsTmAApwwSOswamBp5fjHa3JMD1dXh907mzjLKFqfJAgU5EqCgACqv9S3MbeFHFiUgHVRmmb1oNKGZHEPJ7rMySLhk9NqboUlucJ/YmCZD3PnIXUpFRwtKuI42v/t/1BiQ6itdmuAACDE4AgA/qxXrg15bbjsPteBowF61/Qdfr53c7F9+7u+du9/mmsS6EwRAEWqoJoLMkzqSZpNVkapBJj5oiUSKmhaJ8xMThA3nAawsBgf7I3pdr9QiQwLCLWXVkmmGDLHXfsX2N+m5uv//tSxOUCScjBIUxRqYF1muOppbVw6HYoxgUHs6gFbaQ501d7XNGYzojG3pKtyxy/n3LOrn+e+b4+djmNJR5qQPbJrrQoFbvmjpIrJQnKRPl92WgFuBEJiS1aX16n8YwoOZacDQSfNP3V27HuVdX+zxbvr6/9FYjQCAA0MaTiNd9aLKHFmiC89DnFk+Ot9w323+WX5493txbu5fFYrUROGrG84i6tMnp3UPQ8swH40PqMElp1wb4RjimrtWnqeqz5PFZ2ogweSIRl5lozd/Vap/X/+1LE7QAN1L8W7e2pgRiX5OmGtTL3um+r6yUqOARANOCO4x2/ZuU11khGhcye/O7le1vLXKmHOa/32s0szIaeUsg8yPoNUtNR03VlZBJp4kh7qPmpRMkNYEePG1Xq//FmNtQpGvtEg3Tcp0IMsu3elSJVPAEAGtKiTbiN6W2IWv4q2AcqlA1MS6mySCRc06DNWL0c8miLsiWGRd00E1pTqZmQ8iU+mTyjUvGBfIKQYwRWpaSwgRpmaPur7fxKyRSOnQqxJa5F7/Q59GvT6fsoqf/7UsTwgk18vxlNagmBdhgjHZ01MP+Xb7NIACeNPAMAEYBf7f5T0/Xo3GEYgHg2+FbGnWgoQC9if61gBiqIYwcbUlO6HbMidRJEpPWSBoVHj5OMSSNEzhP1iSimZo9mr//Ee6taCndFnPmGAm2jr///12f6v/qVAMwuAgAYUMMtyyX1qecg4ZacMA/dJR1cMN5brd3b5jv+7fud+M3bnpeyK3RPHki6Uz6ckR7lIwMx0JpJj8XhwGm4kgazq26ev/3EeQ8UeAqXpVXVQv6d2ivo//tSxOmCDADBGGzlqYFaF+OpnTUw/99uj0k5E8EyAd+sPwRLLVrcmaaMKmkFOml5TT3xQ1S2P3Px0J0jqs1PP5ytRk6nOkJFNRfMTg8zCtQ9yooE/UDANy00m1aWt7rpKcTUV7PR3TRTMU9ITW2pIt7rv/+39aoEB6c3wmgATZB+FaW/U+lg4KXSWPoJLSQUxlUgit+RYtIk6ak2U0E1sk5vc8zGaJ9GmWHi8YIEkUiUUdSHZw/Gl//V6l3QF9aj4aaxI17Hi7NjKIUAEgcAgAH/+1LE7AAMlMEY7M4JgXKa46mkNXBsW0cCNWqWxB7NiSIDw0sF1M+6aaajRAyTnalMMaW7rL70XUeqWaJVJOfSdi0pk4wNzArJUkSMXDPhMgyGDvX/ar1pDQN1QNKJGRCVa8MC3Q303fL8WoXSzZsZ2G5Hb10EBqYlCkQAX4/1e7VvfbiyZQnOXXsL9XLHCxT5Zar58/uoIhU9laoqVBykmy0VIOrYt1jtKJDKTEoUjU1QHqacd4rHK16ndnVoVsYNCIG5aSw0gOLsY6jYjpWAJv/7UsTpAgvUvxrsaamBchrjqZS1cE0AgA5olrjmxeUZU8thAqLAZaH7E/lzesc6DX1Mv5/M33s4V8Ju6ztUbnVoKaggfZLKJmo3MDMaiifTVUsDeLUyZnZS+tlvoWQUIZ2pPloAQFB7QqJur3dSMV8c5v73f29yqQAHEZXBZAAe3DlUzU3lOOqMRMQKqwWCRks6vuZH/gIosQ95mZ/WwyCKNSS1rYpnycTFEgQiUH5EmaYRJnb/+v4sihVZamWyToqoKd01mqjHfvTx7///r1/+//tSxOkACojBIUzRqYGVmCMdmbUwiFGlg2gC4EbdXLG3W1SuKV9SYRxo1K4lke8ZUXhEYVYoOS2HIlJDIiuTO7cqXoFqJxB5UP8z7wVGb6/6rpltfzExEC4LdTzL+KuGJ6FtEJxgecABdoxI6AaOn//2/0oABbWlCkgDEh7Z/VfHl+TlQQOLYXZrbiYKTyMWW9quAVHchY4pkKjjlqNV7GBLrSSQTNC4SpfNCiOQ3RKlLTJQUzNe/Uu76KDu8vCsdspJBBWggt1KdBF2Wy1MnOr/+1LE6gALRMEjTOGpkZOX4x2tNTArY6mXbQhdF2QQG9rVLaAKiZnPVjuOc8voaXaVa62QMJq6qiXr/0NA8AVQeTJVsP5Ke1MVJukbrsPQzJRApksVqSL5Lk3UIQhLX/Y1c1WZma2c2SE3FFOpc0dQEkJ6ItIZ/U+UEt5Sz24ABvNXw4wDcMZhjS1gxakzAmYtmjqTTSRUXloI78pkVI4ny4gTBrln0U0x6y5V3HhAeRjEbiLIB+c76Awn/Wrv0mMHo5aARGRApKPqU2s8Ibb0Y//7UsToggsw6x1MGauBeJwjqZQtcNiGTgWQDnqRgkz/1N6kzakCIEAf0oRGltnWWg4vnoGgPOMD0tpxjXS6D6jB11OUEyWHukShwehgS6V0A7DYpLqXa1traxdRWu6luYLZUzOJeMB45gMLu0ccrmvRf+76v+sIDmW1U2gCAbi0eec/h+MZJwTpIjgFcfdxRzvPeB4Y5ZASXchtjbL3u+viNv6iF32ytaRfOcB+32/yzDUaqZ1v73mWNuNnNYWIdZhkrdI+q3nv4G4zk4MCwxPN//tSxOqADLkDIUwlq5mAGaTphLVzS/76/9UUnEArlJQhMG3AzSNiecO4ILo4wcZmAEYZOSz58wAxhxkr5T5/WotizFR91niOayoSSYTTj1DfjF40xH/9PhOLbwfiXhiEoh76NE4iqhdyrJZZ0Dij1qKPWhUpTQAH9inFjAQilEPSyV85bnkyg7+SMSXV7cuWD/Ia2BmSCUEX77G5GJ3VNcerdazEGEofGrJLo/iuev/9jDlxb4hu0pCTX03t1c3bdV4+046KoosegGWf//0FQif/+1LE5YIKaMEjR81JgYMbI2mUNXAG0AYIMUlN2YsW+YJ7h7U8OPcwPRoxBOeh1tXyGZjHDYVztV3UjuktaTkkSJkxcHeSxUZjuJcl7Q+jevfVrWkYuyRhTaTBbTBbXmM0dlXUeCAVB94XnmiQkqgekQ+tG3/6f3UKAAWlpQpIALQ3RldHm8RoB2iSeC89Jkt4GBxaV24OF2HyKLITbUp56zZe4wPw+yMZHShUm2Q5NYw9+SQmrd/z1Tv9rHZ/EIhon6142lT5Q9tByR1W1DXGhv/7UMTpgEw40yVMGeuZZ5zkqPMtcltEgQG+ifLaAHvF0O/MVN5apXZIyIrZqaClQgP1xcVe5I9tWi5HMR362TDW0xPrH1FG2GkDSQJoWky9woB2fp3/nl63Nz3Mio8+2zX2xjn/c3WsnWVKBezDQFe/0/22//o/TQAFqqXLbACtc/LKbCfwv0aLgDKXDM8yCV00rp00kVJk6T6ZOqNk6kUFMgg2plJLQkgUytjMuF5AjFiY9Ww+Gy1v2ZSeg1lLaiMwg80pk8Mktx2PXMbpG57/+1LE6QILDN0hTBlrgZgcI2mUNXBM/D+RSGlgiADTycKGKeit/fiyZQk3TI+2t/U9JXnt+DB0SRJvrLbYNrGfTcls17M0wpWWe7BAeMqvxjAymjG//nOa2/zA/xu2NJJY/3bGs6vEk8N7jf3AOY4WucajMt7VMygABaElE0gCEbizWN/LPmL7j1qOB+3usycHEHb/8tHUpQ9XrLptU+o45/L5Bm5oiMtA4PIzNHWeE+CkLineik01NFrdNKtAyWThamR43UurTTqUp6CnbT2RSf/7UsTngAtIzSFHoWuZgZzjqZMtcIy33hni7yEQkcGAABGoRRSvLb2qKKodVbLouKgxFlKPbn4QcZPAWJoo5A6Tvek6O4caFqzklA+GZ1+yQ/hZky6XMq2MzVj4q2tUNxoZFXeyHVcOu6h8uv4q6mppJ7udi9NhcbUABSolzGgDe+ciYpbVj8KJ2SLiBSixqn2nfYwbA5eQuVCWa9zUQ03j6zqFjOfqCtzTKNtYIkeM45+Srdet/jH/xG28tjN7axtdqnw8fefi87wSmR4sLQFN//tSxOgCC3i9H0zBqYl8nKPpkz11oYog9Yh/1ggOwm+W2AYs65ZX2pS6o5cn4GAzgrIxMiJTGSFUxL8Si3xGFUfhC+2O2tJCBrRWTD6JcXFpNnkKS/6ueOp7bTkWW5rB7NWxxHT202Ir7rqPpv7pp9dZ1yWzge///1IABlUlk2gCZg1ukpKbPdPDSZQZ+GjQaR6aNXiP2I7bwbSM/TMdF08iH8Op8H9x4rRVKF3GqBAFJR9BiE1WxPthtxN7Xuq+SBfUxu32vAbQ82wraIDoBCj/+1LE6IIL9P0jTBmrmXMh4+mBrXRNr6hX9P1fQAgVCV6cYBro1yH7G8uVeOmPetgLkr3xaIRfvgxPMi4KPlQqecfocthdR1ja0tlyRYUW3HgOtfMQy/iHz3E7roxP3TEGstp9kxBtc22m59zY1JE4oPfMwo23///76gAOZjfMjIFUpg0lme7fsSFP1gGzyj3I9s16CYzcfiK2Fovt5/m+aPXTop7JccRKUCpMfbeYcwLC6b+q/e/dMW++YRM4iLmpZK0PmZdCJ9J2aIjBYMOQq//7UsToAAvc0x1MoeuBdyEj6ZGtcAOIv7VM1U3//6wAQDEzI8Rs1Gt+s5beqVqsOkYJyXXrfaueP6wyp89/rHdu9utL8riEsfU12rEthzIvXhiLDVVDVKfweY6Z/5fV2jXz2o9hDR28DwiNn+Ua59WHk/yV1rD26gAJfjecbADZNap8LU5hbo1ZAPryr3e73pjeb6tLiubuNK7tR6+lt9tZMw08pETnCZWuw+kdkd52tQFgYQ9/um7/pZ1Pd2ULzYBPgOFQtOEhOeaGxrTbWLYK//tSxOeAC9TTHUwZa4F1nuPpga1wgN//oBAaqNduMgQFb3V+tZ3dlyyhZfSKzCjP4MZzfT+oBjFVk+m7ylUdRd1MS1EfEUoIhSilRuIjYzcIKf81v6iWTHTOyg9uqVpqHJY1IhDBsGzgIEIRmSCUHTDfVQQBNqOTbAAeH7n53O/nO4NzBHxEzhqy3PU3RMD6aTcjzMuE8amhbN0DdPTQSdSmU6WOAzMC+YjsKSzheMh63h3G1+pa3WzL6VTvKqBqwqGJsAi0CWgESDyDxAKGkmz/+1LE54BMGOMfTBlrgWIX4/WcLTHwjN/V////VqDAr5x9SxAJ3A+WVS19iywlwK/Gt8spNGWiCsn8zZe0+zp+/zeeYUc3zJh1hBIFe15u/jFc9fzH/L28THTFK4uYiEJiUE2CE00IizFrFRh9MwQI2jLHfrUBCVon1JCC0LXq8xYt3Mdy0ipRHPJ0vrTbRlKbuDp8s7Eue7fHyZdEL7L3Ik03RSMLUHe9OeRRIef/ZW05CVXSd3sSq3c2k6Gw+KP7Jf7Yv4mfYqeoQB44PSJCJ//7UsTogAuYvx9MPWmBZ5qj6YMtcLqX6wAADHI2smkAKuby/2rlvO02RguFVlGXVw7p41+mGFMRVZWnzCObdMqZ5i3nVlYJWavVOlsOZmQSfNO3XO47Vu2RxL4LdmvF8RXq1vZuavZrMwqJacl1xwPMCASRpdJsg0Ta7RS+tZq9nl9Cz+hAImKg10wxGfkGsA0BvIMYVkOGzUPuLlVRJ0GZBqGBsS1GeLBy+fWn772U99zc8rT8T0cl9dHcExcoXKCwNGniQkx42XCvKf8b/rUs//tSxOsADNDFHUxJqYFcG2Rpgy1wAyRxTRAhmj9Dk/Zv57nHTEvRdQVaTZRd66TPX7m/CsZBin+/Px7HxEyZFpSZmaR4gieRC8k3wDzr/uY6p8tdzL/hE7/VX8QyLdV0l2yOOea9PIzFIsURrZYPTleyz92n6QBALIy08mUAZ3PbRTdy7VvWWwuxZNg3Fwsrc2fP/5VOiGytq3bL8RVHnN9x488mIZKL9mhcwCxCRurfu0PiriKeyTGrn+ebv4tlMfba6993NtRb6zAcijgmdJr/+1LE6gAL4QMfTBlrgWOdZHWDLXW2FpPuSACBJGUnkyQAwruxzPPtbvKUBgNFrLTM6ktMzeZ1oNvUZn3e+5jh9uf6UqW86YHjdhIslGtSazNGwwh0ddbDlpPZw2GbjFy0EVBxgRFlBUvQVCjCgw8E04qObavDXG66EQrVt+NxACnUlSUtujsWrTGlc6AyXSixQQyTckyEu9N2YOIgeEkMg9VvdFXRmqZFpQ2DRE5K0AuETqT4fthtQyKl2dmrleX9zbmxz1dRfMTO6mxLLclUUP/7UsTsAAv43R1MDWuBhSAjXYMtcF31sch67r9znKACAibKTxRIAAGs6nhwLv5zuCLyeFCOQvEwNI17hkWdFnHy8ba9h0+6n5+D7lThm42lM/7QVOs5n3TxVNud3L9t81251yl4AhDq5LlzSa7BfXax/qO/L/aY56D/jDIBEBqNFvFogDYjyy65TYd3jH04ugCoLyNQBovEjYPPpUgwNzM+jXwV3LZv5iiyyqf9ci/OGm/9/d9N2Ycylsrfe73+z7zSHHPZjFWEWhTylJPdpjNf//tSxOmAC/UHI6wZa6F7mGR1hq002ma15vv9r/7vkBSBlbbbrRIACa7YR7O6o7MBBjiGEObQ/TywAyeMJQExhXmtBGp00nRPmplKRcPGbI0TjIhyRSHGmZIJrNzAzUlW9m1qUkp/XdXTUaLWbF0g2CZsa64RMeSK/1KqAAAiLaazbaBwoOpKu0mdz8bxWFwdzoJUI8IHOG+Y4hgUyMhZjGhU1dzP48WQPaNOKGQzP4OAysTzMaDmkZd1/3B+vdW/dcV12PmUUYHsCmuIVpabh3b/+1LE6AAMMP8fTA1rgXUaZDTxrXVF8k67f//Rdbb6kiB6O0nO3S39X7TVGG4iCRq9PZT0zve+tI3X3Ki9xmOkYso01dWaPGh8KCo6yYNSugKOnvbmsbN1MIttKNws71dN8Qm9xTTDTFDhqaiXWnXmqm/1z6e9Kl0BAJyXE2yAtZ+oz2io69Xrch5c+JKOV1gXZgaViBGLJaYuovaT9jn1D36bX1aSp6E2+xwVHIi3Oz0bW2k0/dTcQk25iWt9vOu9nazpv+HMb8KrlBrVGnAQTP/7UsTmgAvY0yOsjYupbhwmdLG1doqxVahMtKJ9YAADdjadbcQAZYrLpfK/zvbeNILM5GMYvJTUqmYvnwDwyGZWZHeteHovR7uhc4W6MmDh50RWDwIGJ9pHrcvTXS9cVL8O99QlvFXrMN/TSpCuhGpwjKmhMqnEG6Q0KgAwJHJI82kQZVxqkpsecqcg1+MtIicyzHi8ZM2NnxbOs6aKyKTPhUjV9aiSSzsWHEjy5qJoOwQZrkyKuZdkhVt/iOFWH0i6pprueb3relryClA+cIjX//tSxOcCC5zlH6yNC4FvJCPpgyFwrko1bfuto5W2wVOtG1ADnx/r9bd613lIDVmi1mj3iRK0mkiU3EzbeW9xSJ5zm52GW7VhttiqfJok5bskHGRoisyDg2yWxEvRkd30leBZd/YdCir8N+Ph//v/fijHVWnb9kKjraoBJJqaaALCx25FZZev0/VOmU56EQyeNDNU19Le5138shvx+5jGOfwk/y4h5Pko5LXqIFDrwfuarbVVcdoXtb79511RHz6r4juamGzHVVxFm0lBoigsdQL/+1LE6IAMLQEbTA1rgXMgY/WDIXCRj2oQNcNGGfr//1AMEAIIaqgFlmLVHzK9ftQEDrfahyz4rmeLm2fbe8+1tVdb0s1J73tog2zHZpjzHXRQqG7o6bojt3dZzlXFgMoibLkB65Bg1yhaE7U4cjyC42QdOVjaASAicjk0iaAty1Uzp8/scoXm8QHAkXOKQICWPcq5pRVg/QYE6i4kiYS5Zo+xtoPVEHSNVAZEO3ne3UemRpd/ofdolTfzVQl9Jz8Xr6x006xTzw7WiTjrIqBGVP/7UsTnAAvo/yWsGQupbRIj5YetLSgaZjxHgqNpoHvLp9U8Vp7f5UTRUrOkhWoO8RuXszuxhn7GZlNEPEtFw5GarnPGx7ZKTHqTKcBQQ1MiTkLPm7mZ3wy75ipe2/S4ZCK7hQgw8Bw0KmouHDwuEgahd5gR1NvGpfv+ro/66gHWFXY7c42wBcq2RYFYWLRA5ufCTft10ixtuZVt0s8yfV/q6PHvwTAw7Imx0WO5wKtb19c4p3yY/+szLGyfizOu8A10Hwryf1hb/d87pt29fTUE//tSxOeADHj/GuwZa4FPF+Olh50wAQFuNpzONkDdDyTF6/Z/eUEQD0Ou4lQy+Qc7uXTKSa4ulR6/g7Uvm8oOrJ2gqhNt2JtFRlUP+IttH+/t59tcry+6UhrZffbNamrbt+6ZbqwkrBgQoY4t/1/Yd+XIQxe2NQIgGU2nNGkgbZqfs1OVsd6rNTtAZk5zc6HpvVTkBCQvGfNT5ZxkUyptqjlDazT82ROQfqw4k62uSZNdzu+IinOipmqb8R97m1uq5mWaPtYor0nb3l0m3AysvzD/+1LE6YAL2SMnrA0L4ZIbo12jLXA6xtB+gAMlJMaTQOeySyiFJLseYXmygeVZvND0uvdOktBa5mtIcfetXFMi8XelaigjFREntrQ9rwPBA4mJRIJ2mZUCBxqhp88CoUBU8qCYu8MiAMCglCqRouErXQW2tKJcKf/Z2fWqAQqpJYIgABAB0pZsex910iSSQXoZxDi4+7tCmpCRQRCNiSEchdXuKykKSceDQSFocQsCT5A2X5jWO3SEscs1oWM/2mutLkhitTEEqzt0C1gzXWG/0//7UsTlgApYjyunrQlpgp9ktZGtddIm192E/x730Fc1JJHJm0kBDOolTRG+0AxYS6abu7fxLK4q2vZcQ3W/l1puVddNh8QaH7pAkoGBxE+bXLRWZ/LridzJc+638tq5OLZSu9UZhXuGLDIVxAz136178r9+VzTZeAAGOnoIsFpRputIkAwzrU9qdsWatqConaACAFHVm8LaDuceJqRMr0DVx3I77oZFPXINIHdsp1bByDJuutjye5tEiPeeqrl6kdpsMaWMlSBh6XBFaiTTxHJJ//tSxOmAC+j/JawNa6mHkiNppqEod/sLNAG9S6dDAwNpExIkgFfYrclNSdp5dlWVfmhJSC8NwZhMXZSlEqnkbL0nJpbkkFDF15kVteaQJA3CT5FGRF1NTc1FVUTGNi5leBnPS1a29vazV1j0rniC5uImKj3ru+uW3YYcwSv2WiW0pLbJK2kgEv7emnCwpmQlHdxbM06ahUO9WSOg2lrKh4fczfl4OUbktTMOmUTAo4P9wYBXluYAbN9Pz3TLbe6v7/5Oyv+xVf/K64d9bW0y5PT/+1LE5oALtN0fR40LqXeYZzSVrTcAGnqcqBzHNSjWqa/zClfVXlUGAjYYeLVQW3CWoOas8OErlZVf357lirpOoaESda3B47Usp8utdsxMvjZdVzdw2n+xzmOPQ+aZuc1zOLtradUcoTUsft2q3wDFJN/hO33bqwYO5LVSJAOqYCs2M6O5W7UX7iQC2XSqJ6a6BxSndqlrjPph8wzRDfT1czdIIxhe5WSe74hAwx1UbryWlkW+ORZWeN4lWmau2+Jr/q4RdWsriwQGg6cG44ZuWP/7UsTmgAvA4SOsDQupgifj6YGhfUiCALD4KF+kKEgAHyPAz+SDWGFWjbs7dkGsZni59gCqTerZEZjy4oNY0goYdRqHolw1Cw4m0osKxVSUMHj263MqK9FeXXqG0jupHdPXzb96QNfuY4hbTSY957555jaqqmWv3bgbVQCO3IVJAAN2GVwzGJnDli3TK13hpN0Nc0tPYQ7Iz9fI/tDXp2bKJGSg5IjlBdqHiMULIeNGLoBoiM3FfLTVw1ylTLLet9oyVTfy08XVLX3NshMlPJ+E//tSxOUACjyRO6MZCXmIo+Olka112cl9YAxaew5oi82gAEAxFouFEkA8E5q9cvV7GMlASTZJDXbXmMzyXL6Y07ohSveQhjp0xhCMYVrHPaoX/iNBtDz3Kuf/eAfSIy6jio3o5F1zJu0Pv+/W7YSNaEkOUF0AoCs1K6iBszF6G/n2m1yUtQpA9LEEJ3u5QYk0enULHFInmQ6V9Tr7JTlu9ecKqWt0hKT3mMy39sza2vr+L+f55zvj/7227dnny7Krsz/O9V8ztV3ErCEmphlxBZL/+1LE6QAL1QEfTBkLoYQqY6mRoX2pQABUkqJNMHulEJbjcv4508kZrZMQ6oTh0LpOOU+Th5H7DedMm5lHFFUPEHGRj1eQNVrnMVkYhqKY2xLs6izaM6UZ7nFnIzyuyq1U3RbbeWymOlJCWGVBV4uUFP61Awltt1ttgOO/dBZvW6srzgx3+sccZjftFTRqynWTG3kItLbGqiqaK7KdYEIVskfnn1bw80Eh1+vB7xfqk7fda1fbaTdVxdRxd1cdVUJdqw4VAaCRcSIUFWEViWVUKv/7UsTnAAw5Ax1MGQupTBIkdYMVLejy39f/rAgQ0fpoOcehD3Vq0uxqW66WWgoCxDoRD1gSg8m1L8l4fgo0NAMQa1xFPCPcLTSeq4FcXjSIi4q51l34WPiKhpvjj7u91up+yIm98p6vZPjqEieiHhUy0VDrTQ9C7Oy/+z1qCbTccjTiRRAEsRgm6UMGQ0WmOIEuq7swyETkPqyUR7HxipPMh89URgp01+vB8VlASBjXVsjma/rf/uN//MNrOzN/mfPnnfHuCtfKBDE8mU0cIhsc//tSxOqAC80jH4wgy+Fwp6OpkZV4NgyORf3UX2auKglkNyNNRogAm962prGawQ3qyGOUU5lYft5n+MxZmRS5727ftZmeo/pXOCFEnNL6mq66Dn9Qxz219X1Px7NYdtOOB0Epq/Za/4673n2jhuvdQL/3vMgW8Im//t9b1v/yzvk2RiIKpqqpCeazs7W87t3OgBS5Cmh1KZqV0lTExkJYlPWEd76efSL7lcG5VSKvQKir1sSQQh5ne9YELrlxEthFWttCwJEQstT6eqxoEJg2ZA//+1LE6wAMeQMfTBkLgYakoyWhoXgSJHOWDIcrm2tltkaSOY1iBqTtWE7wgIMHUc0MyhRc+75sjpDNn4rRv5lJaJ3q6uJvDKTFRsszaxOlqvSD6m4/4R3Z+Hn4Yta0rnrmjHNHqsFh4ogc4QiuVdq61lSwJNijz5QUDlztust0iSQLauVs3YXDbvT3EW5UlFpw3d7dX/4LPf/Yb13053TIluEJaSXFRL8SPNnM7JAoOFDdUPiEQSZ8C9hRdIhGLGrOqWSMKB5z3tLFlAO44b1Hy//7UsTmAAu9DzOkjMu5i5SmNPMlN8xmi5dG8cUAbDcdkr1iQAsWIt5cVg+URZm6/2X7lpvm55Zoh7x5XX7Rr/d/zPOTDNVdvvajQucy/eY2415DZWZ4rHMQLHjRQ6IF0HksEQoEho99hIUzDSyyvcShm5yBWX1KsF1LgB2iCVidljksaRI7KTvEjGNDZMw5HNSIzp+VPh/ArHovv9VdcDb5tbSkSe8JAva5qraVfjOO43itemT6nibuv6/+5q9pGqt1UsrfcXm9YGW6YPHBtffm//tSxOOACoSPISwoaUF7nWh0kaF2Fznp5sREGyvVSuMgAsVc4QrTbtuRx8/vhn4MZJ0QLXNXIib/hnkhMaIadJnIgkKQ3cwV7JerHZRdyMqOiv1RE3k1VSXmRLO5C9NbHqf1Prsndb2qlFIVysnVr9EpqyP7vkzMMY3k6g3nNttdvbGkLpmJAnivY9oQJ40kQkOhRlSMqetVKd+W+w7dNsx38Xb1/vRjzS+1U+WBGHyiWI2HUiyHJBRANzC4UHuQOIIuFG3oWyse0GkKN0Ag5df/+1LE6AAL6J9BpCDJcYIYpXTzGTRLXsegAMQq1igtD+jlljRAu3cqUv3+oa118jdkyYWSp+ozDU4ROdhWkSpKmXmRsu2XlghP/cjIE9MnL5mSexrG61Jf2/Lelb5U6MVyBK6FVLhIBvYLx5dpSFxvWxOMssdNBBCKAbBVbsktsaIM9RPbZjYtSCCSQjy79Pfvxnq6bzmOhlnXNVNMuEmH0pqSG7o9WiCUz2ZGZuRN2gmf8OxipGhcZkvnS/XljnXfrB0ms9v3t9t2e/9+r/0mZf/7UsTmAAsJHz2jDQuxiDPlNPGVvM34GfM/7UN2dqgNXl63K3WxlBir1vDmeGFavRYqcUjdKUCP7y5/nmHTQkP4zxDPbJ+zzP1QGNpZ1PL7bpCSy62ZEZQWYQJ5zEl8rKBu0jqcOyOf9d6+35/Tu/47/Y7yaHbJq2pNo2SlDnu//2u1sbZj7e40vI4CMLHYhNThdFXGd287Z8M3fMeGao9WOo8TLj/aSUjBtyLDc/K+RMWWRdL6S2WFfQU5DiBoIOsck1CqBKPKGDTsUuAoeGiF//tSxOaAC7iPMaegyWFrIKSo8Y1wvZyARbFEiuxASrdksjcbSJJrbO69/D8Jb0GCG+++aOR2+kxLy+RZXnkRwruiGcK2Zspgxcq1uGYI5Z8P4WxBSPKLSLaE+tTnYDVP82EUC4qHSA9bkx865Io8ay5lZbVZDbkmCajCCUjklsjjaJIns4vstVhuET2NdGdFV7LaG3lzgMVmzrkVPPz1TzVtTOoymhni/hUxJ/DNXFO5itACkUEXdsLPvb39UUp4v/U6s1ia4+Fgx5/HDP7f//j/+1LE6AAMQLklp5hpiXaa5fWBjXXR2w7zv/p+wVU5JJG4kQAL6u84rli8o4sjbelssShGm7udV8qBRxQg8U5GiEShOSzEm9iB62ztaCF3DS69595CDXQUb228dOFVgnFcOc74arXylXBWXWPOSfKpHtY3/vb//X7+6u/qpgQ2goiYffe6toAIp+d6yaJqsDPnHnVTmYqG2v6i//l32aOeRkCuLXoNpCYu3BH/2TKE3lnDieZ0jM+m/0Gq0hlybIy25KFlGzLYsHwwfHPEakNqFv/7UsTmAAuU6UmkmGuxdCDndPGNdueInUgYVEQ9DCAdym3+13urKImafFY+74gNdgCL14DeXMq/d3GTqfsRlQnUazhOpNSZjz8wSFknaRQn4T5N9N8qz8MvNjUNIwxuvYKOa9lrQA814uQyxFUKB+9Zsq9RiHkG3uEdF37v3u3+8aQU09dFn1egB3MZne7nzNbZGI7I/jOU6KLLJCLkY/TNZrwkXpPGD1BMgKG+n5CFBHyHGU+9vit2P6dXk+v1S1z5G9/9r+h1Zb/t/tu16K/h//tSxOcAC6ifOaWgaXmCEiZ09I0vAh7DksIJyS7666/WskS5HcvWLFf+0MDW6A0KMEOA3QlCX2NSX8oRsmQt2TdnuRSyJ8zcNQ4m6XLMqZZVbp1I7r5Fmc7GzNo9lpfE3WYvXxiPgqGrh6FpFIw3At1NlaI69plC3KeoigZZJprJK2SSRfYtMPg4PgQMTlRUWbWkHmb99GcRW2SQY/YmZqbQczGZXeYddTB+T9n/mYzp4MCSd/kgg5tf97d+jKOCiL9O4IPnYR6YPnXeyT+j/v//+1LE5gALvN8x5BhroWsdZfTxjXSP6G8qoc63NaAlZil1d7do4iRKxZNZmzEmeOsuIYAaWMp3Ej5qcscy6Pl6shbFRDM/SiIVN413s+lU1OruiaESUkYw9AUxDkqgkMAgN6hZAoABV3Uh6jJMQm2ONKsQh7WMp7V1gidYLwW3JJY3GkSABMt6KfS1JHVIKRimkcsMKNLDl/99Jcl5HTE2RZ0npcFqzF5Zllmaq3oXXPcGQcIFBOBUtiNGe1nQl6Rw4pziwJg2dIEZg5Sbdg8Pav/7UsTngAuAwzGmFGmphqJk9YGNcJCrNiK0XvS+hLpsO2y3bS2xpJBsqKPoqBpEVDVs1GQzrdsqRcT1pKZdMqV/1p/WUOxY8ICoOBY+3hmRc4mIxQNNJGUrHT1PJIWh1rCwBSAz9q4Z6HUILWRCnc1KAUIakccbbRANpWy4tbcTUGNUdR11IoRGdLOEoSsPbNCSFYgtudvClpwjrMEaIkNf2zzT4fMus7Co/YZmFowDRLSwhUmGTgy8sN48ot4DLBavuURJttc8yFoROrQBwTNA//tSxOaAC7CROaSgaXl9nGW88ZV0+AaTFLXYm2yAfDC5lV3jc1Vk2QOjuXiltEGYCim/IfaCskRF3ha7oRfPLRDpICT+f7nwy61mSSI5+FHY2/mCO+Dj++EWcTNliymCfuv9rAC2Hks3K7+rj8J8rzk2y/DqY4RRmo3VBFhVp3eLv9WkQd102ENqaoELYgsxugyj4XapWTjhyTMDkNLJsUpHCzUnbY9VHMAWoiHW7617k7hiTI4knua/5N0WZu7duflrVfW32whgDSczU///+/P/+1LE5gAL2SEzpIxrsUORKHRSjS5RzTGrbvby0cAkJy2SySNEDTUU1q6zjwmeMLI2ZA5ExQGT9UnS1OAzN1YzS+Ua7+VpTj1HQlI6tNHycJ/3zK7Wg6l/zi4Udy/L3SHj1L2xkVvtx6Ff+/vi61O5fv7a37t3xf3Y75S6LjYKOuyySSNkgib5h8zDwaPE0SthjNZJlmud213Pld5Fu7O21WepSlh8QNWwUOpgwGwKdA5HOV0MUyx5JYEaNvfv3I005tS2sIIChUYam3MUaIAFEv/7UsTsAAwU2x+njGuBkh2j9YGNcdtyRuVEAM4/soq17XbuN2Vd5b7QIQZoY9Wn8YwhGMkUaoyR8nNFySZKZLl9DA8HOElaZvpK6G4dDyunbCv/LbkV/5Z+f8zlB656En/8pfmzFOxdTOv2fLIe6mfdc48EwXaU0CALgtpGxQ9mW9dLtrIiDdZoUfEK8WtQRkcjVrVRNVeiz99ZPOt+dTyeZNMmyK9aqOXpmMLpFVmnLOofYRdcoUIGMKMQZeKhFwSLMXhqjg6bTGCrXyaYatFa//tSxOcAC8iNLeSgaWmCmOP08Y1xmSAcdegCRTZmWG23tZAACLEXEuJvQEprCrHIVxFHD7kbmbi9zXMNkYSaqehEpRSKh11aD0lcyGF5QrmdI43R9VgAZLjPwvvY2CuNY7hJizY8z4c6wh3/am7e/J7+bX3qX3pBa/9/shH4XA7bb7bbbIkS+CYESrAQ7YeGNO3+KbZ7d2NKnwh6ZLlUGpoZHfNPKTGNiAHzbBEoqREo0cJjhAJlBZVA1ypVijQeGi62l3iBj6qKn1gtIC3/voH/+1LE5YAKFI83pZRJcawzY3WBjbmZhgQCtilsmt10ZAYD8ctZXnbaq5h2BlyAO5w0/gwM6T2ZMpGSQzeQtznGkLRCV5rnOffHcjyG55nqk9+eJixeVSdBdaB8XFBMbtAi2CqJykrSpro02kascZ2JWfITx8cQNg1UpI5LbZEQH4lHklKQpc8hhiQ5cjXk8IRdY5IDEu88GLzVCWoQUgeRjnG7WCeLpTq6YXjxLfZuA5pAvB1zIz91EpEc2nKTUvS5a34Wv7EknkPe7/57H8wZXf/7UsTlgAsAnyWnlGlBlBZk/LWNNdEVsqqoIAAao1rtf9dYiMmXHV8eDqLBaIqiVaixR2iDJcUE3vd6ComswZ55QGMVCN+ULG0QibIz0+eRorZYRPcRZFL9aCsFzKJKHGRh+hwnA+YnXJ/404uxO7xDtuv9UPv8XX/WZJoAdCOe7Xz1ArdkttttjSAwEtqLW8PzgCcv+MdPBQgwMhl5JwxLyA5RImflUvYNDpcu973o0CoBah3C0iKkxm5htSGj3DzzRZWfAKXOITb0qrTxqaBQ//tSxOUACqiHPaGYaXF6myQ0wY1wqEY+cDqWoAsZtkl2trZAH91PYjw4eD8g6DLlrSeqRI5ojIYshiJjOIDp073B32pG30KTjg9/+3qadwCS5bav+Pi7SeAatQrvLzJzOnd/+dtsY+Ddb+c73lUE/xfijfNx7cSzNtUKeX/a/bbVoBZqXCxe5io1vFYfj1jMLptWzGB2bchOr36pZoRw9TKwil1V8GXSmUj1NjyB02COevlZCBSnlWSCizXvUp+SJDC5+LyjguMNi6RMX1nbKH3/+1LE6QAMGI8fp4hpSZqa5HTxjXGZGtVY8OmwuE23XF/ZbIgAi0usjxrZpmNi+Ru6s65dUBKOjgAtW4Wg/T+npVyeme1Kt2kcQPD01c61P3O+jSVaC8xFKIeTSpiOc95/cr/MihjfPl/zyrnPejllpTvElTJr3Yk1IjQ0plZ/cfeKoKIVDdrkt0utsaQb1hNmCUYyGQtmhd1qxTzz9zRuspwmg+HHS5epR/0LAfmOxIPtlFBMFtKTfeRRfXKKkNV7d21x/Jtf//Y/+72z99+72//7UsTjAAqYLyGnmGTBdhIj9LGNKft9/mNliUWwBlKdktttrRAjMC27RsathSoQjfpXuZK9Q81fQ4vbc1IzzYpdNEVZlSLmWWdpM+7GZmHdQKFJ9fDc6NhJo1iIluKbz7sCAO72491+yESzUDrBT++3oIfUtpcTby3ZcYHBKhLrbdtddGiSlImMeYehNfqAcXRtUKXe7s9p9d22NOVmxEYwoeTCaFVNeyDv1/zv/w/iPvK71VYZtH/e2W9Gfu7pJv0XSchxT/7wQW+2/f2r/Le9//tSxOeAC9TrI6WMa4GetiO0kY24/efxXYCjqjQ7NvtrGSDrso2j0QaBEOqhFGD9SePCer+zA3InuIck58I3SP2FzMsRod9QUQWZ49QM7HFMTe70Ui2I0hr/5V7OUHhsRt93yY/+LrM+rmzBeczMdqYeFIdFNLkfOunqAjNIZFdbLZWyB4xqV1WuKVQDYwISTXODVNvdWIxfa57fYjqrIYYyMQsNZZSIy32/99gk82ZBPs8PMqXDmWcM9HzPzqZ/lmUxfdUgvK5ZX85SLQSwJHz/+1DE4gAKgG0xpAxnGYGWo7TxjTG2huOnHClyrguMSxaQAFIJJI5JJGiAFqGVCNXgqu0xHzPfWyyKQowRO9s7kcqGZlOxWfOenuqlkrCvXg0pa1wZ7GVKWoQHQ6/GDxKYrPqP1tQNUZKiI4tglFku3XIYVLEZlF5lrWQjFmiGeKl9t5GgAMlJsSp9J6y7bmgs45sb3Zvqe27c+ddioC0LhGUa45GxmzraZ0qmdzUlyOnqWRqT90csjNvKhyE1QaVNAyVNHjxMBnWJ1NOHh409//tSxOUACuRzOaEMyXmEk2Q8gY0pKFk92tQYWWFVOWpINDQzxEPt/bWkIOwUPCjCvaoZcM6ZpC9z8tnDU71XJ0MY6wygGSwPGKUTyhUVXAVQXHVhdBFB4RwuSVcnY1wuqxQ48J2iyChDvLrSL20iAgZS3aouOes1ZYRoh2tt1bIG/Ds3ubWzEMTQZhToanns/TekyGTZPfpl+5G1yZoSkEVEsOCuP5TNSZQ2VGuU/zpLyZW38VWNWzL/f7arkemyet8uFD/h+hRRu+ZTLWZmXkT/+1LE5oAMdUMf54xrwWUYI/SCiTBZd8r5nk7U8SH4uQUl222222B1GXqtRJ29XotjFfKkKpZIwlbj5uDbO2Mv9MI5rerZHVWm2VGc9b/8he+e3jf/Hyv/07mrO/k0vWFfwdRBMd3z7M2t3+v/HPfMGHGsqgpHHJJHJGiQN7MgMiO5qe72rxFxmXUdVo7scyVGk8WqhhedkfbphkEnXWx1JbHUBrEfcxmZ2R4Mszzh1o5GeZqcpsc/17PP0ndL3W8eRdqhs6U+WTcX7p//Wb1yKf/7UsTmAAv05ynhmGuhWYzk/DGM4Ee0HXiLoODqAmwIJJbZW0QIQhCEIXqq/8bjdX2Y1XwqqupNqX1dS//USTM3V6rNV9nCszMfG1VVUtS9S9YbNw1UBAWqqX/+u3AxMKAoi6w11u1B0N/3eJRKs7g09QNVTEFNRTMuOTcgKGJldGEpVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tSxOkATLGnH+MMbclKiiQ0UQzhVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy45NyAoYmV0YSlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+1LE6oAMqVkfowxt2ViiovQRjXJVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7UsTqg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"
    );
    try {
      sound.play();
      console.log("Bell sound triggered");
    } catch (err) {
      console.warn("Couldn't trigger bell sound");
    }
  }

  // lib/sleeps.js
  function _cancellableSleep(ms, markStopped2, markStarted2, timerController2, bell = false) {
    return new Promise((resolve, reject) => {
      const bellTime = ms * 0.94;
      if (ms < 0)
        ms = 0;
      const timeout = setTimeout(() => {
        resolve();
        markStopped2();
        console.log("Timer finished naturally");
      }, ms);
      let bellTimeout;
      if (bell) {
        bellTimeout = setTimeout(() => {
          bellSound();
        }, bellTime);
      }
      timerController2.signal.addEventListener("abort", () => {
        console.error("Timer finished forcefully");
        clearTimeout(timeout);
        if (bell)
          clearTimeout(bellTimeout);
        reject(new DOMException("Aborted", "AbortError"));
      });
      try {
        markStarted2();
      } catch (err) {
        console.log(err);
      }
    });
  }

  // lib/amplefocus/amplefocus.js
  var state;
  function changeState(newState) {
    console.log(`STATE: ${state} => ${newState}`);
    state = newState;
  }
  var currentSessionCycle;
  var sessionCycleCount;
  var sessionStartTime;
  var sessionEndTime;
  var sleepUntil;
  var status;
  var energyValues = [];
  var moraleValues = [];
  var completionValues = [];
  function pauseSession() {
    changeState("PAUSED");
  }
  function cancelSession() {
    changeState("NEW");
  }
  var timerController;
  var signal;
  async function stopTimers() {
    if (state !== "RUNNING") {
      console.log("Nothing to stop.");
      return;
    }
    timerController.abort();
  }
  function setSignal(newSignal) {
    signal = newSignal;
  }
  var runningCriticalCode;
  var markSafeToExit;
  var starting;
  var markStarted;
  function markStopped() {
    starting = new Promise((resolve) => {
      markStarted = () => {
        changeState("RUNNING");
        resolve();
      };
    });
  }
  function initAmplefocus(app, options) {
    moraleValues = [];
    energyValues = [];
    completionValues = [];
    changeState("NEW");
    timerController = new AbortController();
    runningCriticalCode = new Promise((resolve) => {
      markSafeToExit = () => {
        changeState("SAFE");
        resolve();
      };
    });
    for (let pair of Object.entries(options.settings)) {
      let setting = pair[0];
      let option = pair[1];
      if (app.settings[setting]) {
        options[option] = app.settings[setting] * 60 * 1e3;
      }
    }
    markStopped();
  }
  async function _preStart(app, options, handlePastCycles) {
    let dash = await _ensureDashboardNote(app, options);
    let isSessionRunning = await _isTaskRunning(app, dash);
    if (isSessionRunning) {
      console.log(`Task running: ${isSessionRunning}`);
      if (options.alwaysStopRunningTask) {
        console.log(`Stopping current task...`);
        await _stopTask(app, dash, options);
        return dash;
      }
      let result = await app.prompt(
        `The previous session was not completed. Abandon it or continue where you left off?`,
        {
          inputs: [
            {
              type: "radio",
              options: [
                { label: "Abandon previous session", value: "abandon" },
                { label: "Pick up where you left off", value: "resume" },
                { label: "Abort", value: "abort" }
              ],
              value: "resume"
            }
          ]
        }
      );
      if (result === "resume") {
        await _appendToNote(app, "");
        sessionCycleCount = isSessionRunning["Cycle Count"];
        sessionStartTime = new Date(isSessionRunning["Start Time"]);
        sessionEndTime = _calculateEndTime(options, sessionStartTime, sessionCycleCount).endTime;
        let oldStartTime = new Date(isSessionRunning["Start Time"]);
        if (_calculateEndTime(options, oldStartTime, isSessionRunning["Cycle Count"]).endTime > _getCurrentTime()) {
          console.log("Continuing previous uncompleted session.");
          await _startSession(
            app,
            options,
            dash,
            oldStartTime,
            Number(isSessionRunning["Cycle Count"]),
            Number(isSessionRunning["Cycle Progress"]) + 1,
            true,
            handlePastCycles
          );
        } else {
          console.warn("Session end time is in the past, cancelling...");
          await _startSession(
            app,
            options,
            dash,
            oldStartTime,
            Number(isSessionRunning["Cycle Count"]),
            Number(isSessionRunning["Cycle Count"]) + 1,
            true,
            handlePastCycles
          );
        }
        return false;
      } else if (result === "abandon") {
        console.log(`Stopping current task...`);
        await _stopTask(app, dash, options);
        return dash;
      } else {
        console.log(`Aborting...`);
        return false;
      }
    } else {
      return dash;
    }
  }
  async function _focus(app, options, dash, startTime, cycleCount, handlePastCycles = false) {
    sessionCycleCount = cycleCount;
    sessionStartTime = startTime;
    sessionEndTime = _calculateEndTime(options, startTime, cycleCount).endTime;
    const newRow = {
      // "Session ID": Math.max(dash.map(e => e["Session ID"])) + 1,
      "Source Note": _makeNoteLink(await app.findNote({ uuid: app.context.noteUUID })),
      "Start Time": _getISOStringFromDate(startTime),
      "Cycle Count": cycleCount,
      "Cycle Progress": 0,
      "Completion Logs": "",
      "Energy Logs": "",
      "Morale Logs": "",
      "End Time": ""
    };
    console.log("NEWROW", newRow);
    await _logStartTime(app, dash, newRow, options);
    let sessionHeadingText = await _makeSessionHeading(app, startTime, cycleCount);
    markAddress(sessionHeadingText, app.context.noteUUID);
    await _insertSessionOverview(app, options, sessionHeadingText);
    await _startSession(app, options, dash, startTime, Number(cycleCount), 1, false, handlePastCycles);
    markSafeToExit();
  }
  async function findSessionHeadingName(startTime, app) {
    let hoursMinutes = _getISOStringFromDate(startTime).slice(11, 16);
    let note = await app.findNote({ uuid: app.context.noteUUID });
    let sections = await app.getNoteSections(note);
    let sessionHeading2 = sections.filter(
      (section) => section?.heading?.text.includes(`[${hoursMinutes}`)
    );
    if (sessionHeading2.length === 0) {
      throw "Could not find a section in the current note that corresponds to the currently unfinished session.";
    }
    return sessionHeading2[0].heading.text;
  }
  async function _startSession(app, options, dash, startTime, cycles, firstCycle, resume = false, handlePastCycles = false) {
    console.log("Starting focus cycle...");
    if (!firstCycle)
      firstCycle = 1;
    let sessionHeadingName, workEndTime, breakEndTime, prompt, firstCycleStartTime;
    firstCycleStartTime = _calculateEndTime(options, startTime, firstCycle - 1).endTime;
    if (resume) {
      sessionHeadingName = await findSessionHeadingName(startTime, app);
      markAddress(sessionHeadingName, app.context.noteUUID);
      console.log("Found existing heading", sessionHeadingName);
      prompt = false;
    } else {
      sessionHeadingName = await _makeSessionHeading(app, startTime, cycles);
      sessionHeadingName = sessionHeadingName.slice(2);
      console.log("Created new session heading", sessionHeadingName);
      prompt = true;
      status = "Waiting for session to start...";
    }
    workEndTime = /* @__PURE__ */ new Date();
    breakEndTime = firstCycleStartTime;
    console.log("Work end time", workEndTime);
    console.log(`firstCycle: ${firstCycle}, cycles: ${cycles}`, firstCycle, cycles);
    for (let currentCycle = firstCycle - 1; currentCycle <= cycles; currentCycle++) {
      currentSessionCycle = currentCycle;
      console.log("Cycle loop", currentCycle);
      try {
        await _handleWorkPhase(app, workEndTime, currentCycle);
      } catch (error) {
        if (handleAbortSignal(error))
          break;
      }
      if (currentCycle >= 1)
        status = "Take a break...";
      try {
        if (currentCycle >= firstCycle) {
          prompt = true;
        }
        await _handleBreakPhase(app, options, dash, breakEndTime, currentCycle, cycles, handlePastCycles, prompt);
      } catch (error) {
        if (handleAbortSignal(error))
          break;
      }
      status = "Working...";
      workEndTime = new Date(breakEndTime.getTime() + options.workDuration);
      breakEndTime = new Date(workEndTime.getTime() + options.breakDuration);
      if (timerController.signal.aborted) {
        timerController = new AbortController();
      }
    }
    status = "Session finished. \u{1F389}";
    if (state !== "PAUSED") {
      await _writeEndTime(app, options, dash);
    } else {
      status = "Session paused...";
    }
  }
  async function _makeSessionHeading(app, startTime, cycleCount) {
    const timestamp = startTime.toLocaleTimeString(
      void 0,
      { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
    );
    const focusNote = await _getFocusNote(app);
    const focusNoteLink = _formatNoteLink(focusNote.name, focusNote.uuid);
    return `# **\\[${timestamp}\\]** ${focusNoteLink} for ${cycleCount} cycles`;
  }
  async function _getFocusNote(app) {
    const focusNotes = await app.filterNotes({ tag: "focus" });
    let focusNote;
    if (focusNotes.length > 0) {
      focusNote = focusNotes[0];
    } else {
      let focusNoteUUID = await app.createNote("Focus", ["focus"]);
      focusNote = await app.findNote({ uuid: focusNoteUUID });
    }
    return focusNote;
  }
  function _calculateEndTime(options, startTime, cycles) {
    console.log("Calculating end time for given start time and cycles...");
    const totalTime = (options.workDuration + options.breakDuration) * cycles;
    const endTime = new Date(startTime.getTime() + totalTime);
    const totalMinutes = Math.floor(totalTime / 6e4) % 60;
    const totalHours = Math.floor(totalTime / 36e5);
    console.log("Start time:", new Date(startTime));
    console.log("Cycles:", cycles);
    console.log("End time calculated:", _formatAsTime(endTime));
    console.log("Total hours:", totalHours);
    console.log("Total minutes:", totalMinutes);
    return { endTime, totalHours, totalMinutes };
  }
  function handleAbortSignal(error) {
    if (error.name === "AbortError") {
      if (signal === "cancel") {
        console.log("Session canceled");
        status = "Session cancelled";
        return true;
      } else if (signal === "pause") {
        console.log("Session paused");
        status = "Session paused";
        return true;
      } else if (signal === "end-cycle") {
        console.log("Cycle ended early");
        return false;
      }
    } else {
      throw error;
    }
  }
  async function _handleWorkPhase(app, workEndTime, cycleIndex) {
    console.log(`Cycle ${cycleIndex}: Starting work phase...`);
    try {
      await _sleepUntil(app, workEndTime, true);
    } catch (error) {
      throw error;
    }
  }
  async function _getPastCycleTarget(app, currentCycle, options) {
    let noteContent = await app.getNoteContent({ uuid: sessionNoteUUID });
    let cycleTarget = await _getSessionSubHeading(app, `Cycle ${currentCycle}`);
    let headingContent = await _sectionContent(noteContent, cycleTarget);
    return getCycleTarget(options, headingContent);
  }
  async function _promptCycleEndMetrics(options, app, currentCycle) {
    let completion, energy, morale, cycleTarget;
    if (currentCycle >= 1) {
      cycleTarget = await _getPastCycleTarget(app, currentCycle, options);
      [completion, energy, morale] = await _promptCompletionEnergyMorale(
        app,
        "Work phase completed. Did you complete the target for this cycle?",
        cycleTarget
        // We display the user's goal for the cycle in the prompt so that they don't need to check manually
      );
    } else {
      [completion, energy, morale] = await _promptCompletionEnergyMorale(
        app,
        "Before you start, take a minute to plan yout session.\nHow are your energy and morale levels right now?"
      );
      completion = null;
    }
    if (completion === true) {
      completion = 1;
    } else if (completion === false) {
      completion = -1;
    }
    return [completion, energy, morale];
  }
  async function _logDashboardCycleEndMetrics(app, dash, energy, morale, completion, options) {
    let tableDict = await _readDasbhoard(app, dash);
    tableDict = await _appendToTopTableCell(tableDict, "Energy Logs", energy);
    tableDict = await _appendToTopTableCell(tableDict, "Morale Logs", morale);
    tableDict = await _appendToTopTableCell(tableDict, "Completion Logs", completion);
    energyValues = _getTopTableCell(tableDict, "Energy Logs").split(",");
    moraleValues = _getTopTableCell(tableDict, "Morale Logs").split(",");
    completionValues = _getTopTableCell(tableDict, "Completion Logs").split(",");
    await writeDashboard(app, options, dash, tableDict);
  }
  async function _handleNextCycleStart(app, nextCycle, options) {
    await appendCycle(app, `Cycle ${nextCycle}`);
    let content = [`- Cycle start:`];
    for (let question of options.cycleStartQuestions) {
      content.push(`  - ${question}`);
    }
    content.push(`- Your notes:`);
    content = content.join("\n");
    await appendToCycleHeading(app, `Cycle ${nextCycle}`, `
${content}`);
  }
  async function _handleSessionDebrief(app, options) {
    await appendToSession(app, `
## Session debrief`);
    let content = [];
    for (let question of options.finalQuestions) {
      content.push(`- ${question}`);
    }
    content = content.join("\n");
    await appendToHeading(app, "Session debrief", content);
  }
  async function _logDashboardCycleProgress(app, dash, currentCycle, options) {
    let dashTable = await _readDasbhoard(app, dash);
    dashTable = _editTopTableCell(dashTable, "Cycle Progress", currentCycle);
    await writeDashboard(app, options, dash, dashTable);
  }
  async function _handleCycleEndJotEntry(options, app, currentCycle) {
    let content = [`- Cycle debrief:`];
    for (let question of options.cycleEndQuestions) {
      content.push(`  - ${question}`);
    }
    content = content.join("\n");
    await appendToCycleHeading(app, `Cycle ${currentCycle}`, `
${content}`);
  }
  async function _logJotPreviousAndNextCycleQuestions(previousCycle, app, dash, options, cycles, currentCycle) {
    if (previousCycle >= 1) {
      await _handleCycleEndJotEntry(options, app, previousCycle);
    }
    if (previousCycle < cycles) {
      await _handleNextCycleStart(app, currentCycle, options);
    }
  }
  async function _handleBreakPhase(app, options, dash, breakEndTime, cycleIndex, cycles, handlePastCylces = false, prompt = true) {
    let previousCycle, currentCycle, energy, morale, completion;
    let currentTime = _getCurrentTime();
    previousCycle = cycleIndex;
    currentCycle = cycleIndex + 1;
    await _logDashboardCycleProgress(app, dash, previousCycle, options);
    let currentCycleEndTime = new Date(breakEndTime.getTime() + options.workDuration);
    if (currentCycleEndTime > currentTime || handlePastCylces) {
      if (prompt) {
        await _logJotPreviousAndNextCycleQuestions(previousCycle, app, dash, options, cycles, currentCycle);
        [completion, energy, morale] = await _promptCycleEndMetrics(options, app, previousCycle);
        await _logDashboardCycleEndMetrics(app, dash, energy, morale, completion, options);
      }
    } else {
      await _logDashboardCycleEndMetrics(app, dash, null, null, null, options);
    }
    if (previousCycle === cycles) {
      await _handleSessionDebrief(app, options);
      await _sleepUntil(app, /* @__PURE__ */ new Date());
      console.log(`Session complete.`);
      app.alert(`Session complete. Debrief and relax.`);
    }
    if (breakEndTime <= currentTime) {
      return;
    }
    if (previousCycle < cycles) {
      console.log(`Cycle ${previousCycle}: Starting break phase...`);
      try {
        await _sleepUntil(app, breakEndTime);
      } catch (error) {
        throw error;
      }
      app.alert(`Cycle ${previousCycle}: Break phase completed. Start working!`);
      console.log(`Cycle ${previousCycle}: Break phase completed.`);
    }
  }
  async function _sleepUntil(app, endTime, bell = false) {
    console.log(`Sleeping until ${endTime}...`);
    app.openSidebarEmbed(0.66, {
      ampletime: { project: null },
      amplefocus: {
        sleepUntil: endTime,
        currentCycle: currentSessionCycle,
        cycleCount: sessionCycleCount,
        sessionEnd: sessionEndTime,
        status,
        moraleValues,
        energyValues,
        completionValues
      }
    });
    const sleepTime = endTime.getTime() - _getCurrentTime().getTime();
    sleepUntil = endTime;
    await _cancellableSleep(sleepTime, markStopped, markStarted, timerController, bell);
  }

  // lib/ampletime/entries.js
  function _getEntryName(entry) {
    if (!entry)
      return "All";
    if (entry.data.taskName) {
      return `${_getLinkText(entry.data.projectName)}: ${entry.data.taskName}`;
    } else {
      return _getLinkText(entry.data.projectName);
    }
  }
  function _entryFromRow(row) {
    let entry = {};
    entry.data = {};
    entry.data.taskName = row["Task Name"];
    entry.data.projectName = row["Project Name"];
    if (entry.data.taskName)
      entry.type = "task";
    else
      entry.type = "project";
    return entry;
  }

  // lib/ampletime/tasks.js
  async function _getTaskDistribution(app, dash, target, startDate, endDate) {
    console.log(`_getTaskDistribution()`);
    let tableDict = await _readDasbhoard(app, dash);
    console.log(tableDict);
    let entries = _getEntriesWithinDates(tableDict, target, startDate, endDate);
    console.log(entries);
    if (!entries)
      return;
    entries = entries.filter((item) => item["Task Name"]);
    let taskDistribution = { "q1": [], "q2": [], "q3": [], "q4": [] };
    for (let entry of entries) {
      let matches = entry["Task Name"].match(/\(([a-zA-Z0-9-]+?)\)/gm);
      let taskUUID = matches[matches.length - 1];
      taskUUID = taskUUID.slice(1, taskUUID.length - 1);
      let task = await app.getTask(taskUUID);
      if (task.urgent && task.important)
        taskDistribution.q1.push(entry);
      else if (!task.urgent && task.important)
        taskDistribution.q2.push(entry);
      else if (task.urgent && !task.important)
        taskDistribution.q3.push(entry);
      else if (!task.urgent && !task.important)
        taskDistribution.q4.push(entry);
    }
    for (let key of Object.keys(taskDistribution)) {
      let durations = await _calculateTaskDurations(taskDistribution[key]);
      let sum = durations.reduce((pv, cv) => _addDurations(pv, cv["Duration"]), "00:00:00");
      taskDistribution[key] = {
        count: taskDistribution[key].length,
        duration: _durationToSeconds(sum) / 60 / 60
      };
    }
    return taskDistribution;
  }
  async function _getTaskDurations(app, dash, target, startDate, endDate) {
    console.log(`_getTaskDurations(app, ${_getEntryName(target)}, ${startDate}, ${endDate})`);
    let tableDict = await _readDasbhoard(app, dash);
    console.log(tableDict);
    let entries = _getEntriesWithinDates(tableDict, target, startDate, endDate);
    console.log(entries);
    if (!entries)
      return;
    let taskDurations = await _calculateTaskDurations(entries);
    console.log(taskDurations);
    return taskDurations;
  }
  function _getEntriesWithinDates(tableDict, target, startDate, endDate) {
    console.log(`_getEntriesWithinDates(${tableDict}, ${_getEntryName(target)}, ${startDate}, ${endDate}`);
    let entries = tableDict.filter((row) => {
      let endTime = new Date(row["End Time"]);
      console.log(new Date(row["End Time"]));
      return endTime >= startDate && endTime <= endDate;
    });
    if (target)
      entries = entries.filter((row) => {
        return row["Project Name"] === target.data.projectName && row["Task Name"] === target.data.taskName;
      });
    return entries;
  }
  async function _calculateTaskDurations(entries, type = "Project") {
    console.log(`_calculateTaskDurations(${entries})`);
    let taskDurations = {};
    entries.forEach((entry) => {
      let targetName;
      if (type === "Project")
        targetName = entry["Project Name"];
      else if (type === "Task")
        targetName = _getEntryName(_entryFromRow(entry));
      else
        return [];
      let duration = _calculateDuration(entry["Start Time"], entry["End Time"]);
      if (targetName in taskDurations) {
        taskDurations[targetName] = _addDurations(taskDurations[targetName], duration);
      } else {
        taskDurations[targetName] = duration;
      }
    });
    let sortedTasks = Object.entries(taskDurations).sort((a, b) => {
      let aDurationInSeconds = _durationToSeconds(a[1]);
      let bDurationInSeconds = _durationToSeconds(b[1]);
      return bDurationInSeconds - aDurationInSeconds;
    });
    return sortedTasks.map((task) => {
      return {
        "Entry Name": task[0],
        "Duration": task[1]
      };
    });
  }

  // lib/ampletime/reports.js
  async function _createLegendSquare(color, options) {
    console.log(`_createLegendSquare(${color})`);
    let canvas;
    try {
      canvas = document.createElement("canvas");
    } catch (err) {
      console.error("document object not found");
      return;
    }
    const ctx = canvas.getContext("2d");
    const size = options.legendSquareSize;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    console.log(canvas);
    function canvasToBlob(canvas2) {
      return new Promise((resolve) => {
        canvas2.toBlob((blob2) => {
          resolve(blob2);
        }, "image/png");
      });
    }
    console.log(canvasToBlob);
    let blob = await canvasToBlob(canvas);
    console.log(blob);
    return await _dataURLFromBlob(blob);
  }
  async function _generateRadar(taskDistribution) {
    console.log(`_generateRadar(${taskDistribution})`);
    let radarLabels = {
      q1: "Q1: Important & Urgent",
      q2: "Q2: Important",
      q3: "Q3: Urgent",
      q4: "Q4: Neither"
    };
    let data = {
      labels: Object.keys(taskDistribution),
      datasets: [
        {
          label: "Number of tasks",
          // Convert from number of tasks to percentage of total number of tasks
          data: Object.values(taskDistribution).map(
            (e) => e.count / Object.values(taskDistribution).reduce((pv, cv) => pv + cv.count, 0) * 100
          ),
          fill: true,
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgb(255, 99, 132)",
          pointBackgroundColor: "rgb(255, 99, 132)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgb(255, 99, 132)"
        },
        {
          label: "Time spent",
          // Convert from duration to percentage of total duration
          data: Object.values(taskDistribution).map(
            (e) => e.duration / Object.values(taskDistribution).reduce((pv, cv) => pv + cv.duration, 0) * 100
          ),
          fill: true,
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgb(54, 162, 235)",
          pointBackgroundColor: "rgb(54, 162, 235)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgb(54, 162, 235)"
        }
      ]
    };
    const chart = new QuickChart();
    chart.setVersion("4");
    chart.setWidth(500);
    chart.setWidth(500);
    chart.setConfig({
      type: "radar",
      data
    });
    console.log(chart.getUrl());
    let response = await fetch(chart.getUrl());
    let blob = await response.blob();
    return await _dataURLFromBlob(blob);
  }
  async function _generatePie(taskDurations, options) {
    console.log(`generatePie(${taskDurations})`);
    const labels = taskDurations.map((task) => task["Entry Name"]);
    console.log(labels);
    const data = taskDurations.map((task) => _durationToSeconds(task["Duration"]));
    console.log(data);
    const chart = new QuickChart();
    chart.setVersion("4");
    chart.setWidth(500);
    chart.setHeight(500);
    chart.setConfig({
      type: "pie",
      data: {
        labels,
        datasets: [{ data, backgroundColor: options.colors }]
      },
      options: {
        plugins: {
          legend: {
            // Hide the legend because it's too large & ugly
            display: false
          },
          // On the chart itself, show percentages instead of durations
          // Only show percentages if larger than a certain value, to avoid jankiness
          datalabels: {
            display: true,
            formatter: (value, ctx) => {
              let sum = 0;
              let dataArr = ctx.chart.data.datasets[0].data;
              dataArr.map((data2) => {
                sum += data2;
              });
              let percentage = (value * 100 / sum).toFixed(0);
              if (percentage < 7)
                return "";
              return percentage + "%";
            },
            color: "#fff"
          }
        }
      }
    });
    console.log(chart.getUrl());
    let response = await fetch(chart.getUrl());
    let blob = await response.blob();
    return await _dataURLFromBlob(blob);
  }
  async function _generateDurationsReport(app, options, resultsHandle, taskDurations) {
    console.log(`Creating legend squares...`);
    let legendSquares = [];
    for (let i = 0; i < taskDurations.length; i++) {
      let fileURL2 = await app.attachNoteMedia(
        resultsHandle,
        await _createLegendSquare(options.colors[i], options)
      );
      legendSquares.push(`![](${fileURL2})`);
    }
    taskDurations = _insertColumnInMemory(
      taskDurations,
      "Color",
      legendSquares
    );
    console.log(taskDurations);
    let resultsTable = _dictToMarkdownTable(taskDurations);
    console.log(resultsTable);
    console.log(`Inserting results in report note...`);
    await app.insertNoteContent(resultsHandle, resultsTable);
    console.log(`Generating QuickChart...`);
    let pieDataURL;
    try {
      pieDataURL = await _generatePie(taskDurations, options);
    } catch (err) {
      pieDataURL = "";
    }
    const fileURL = await app.attachNoteMedia(resultsHandle, pieDataURL);
    await app.insertNoteContent(resultsHandle, `![](${fileURL})`);
  }
  async function _generateQuadrantReport(app, resultsHandle, taskDistribution, options) {
    let totalLength = Object.values(taskDistribution).reduce((pv, cv) => pv + cv.count, 0);
    let percentages = {
      q1: taskDistribution.q1.count / totalLength,
      q2: taskDistribution.q2.count / totalLength,
      q3: taskDistribution.q3.count / totalLength,
      q4: taskDistribution.q4.count / totalLength
    };
    let percentagesDict = Object.keys(percentages).map((key) => {
      return { "Quadrant": key, "Percentage": `${percentages[key] * 100}%` };
    });
    let resultsTable = _dictToMarkdownTable(percentagesDict);
    console.log(resultsTable);
    console.log(`Inserting results in report note...`);
    await app.insertNoteContent(resultsHandle, resultsTable);
    console.log(`Generating QuickChart (radar)...`);
    let pieDataURL;
    try {
      pieDataURL = await _generateRadar(taskDistribution, options);
    } catch (err) {
      console.log(err);
      pieDataURL = "";
    }
    const fileURL = await app.attachNoteMedia(resultsHandle, pieDataURL);
    await app.insertNoteContent(resultsHandle, `![](${fileURL})`);
  }

  // lib/ampletime/ampletime.js
  async function _preStart2(app, options) {
    console.log("_preStart()");
    let dash = await _ensureDashboardNote(app, options);
    let isTaskRunning = await _isTaskRunning(app, dash);
    console.log(`Task running: ${isTaskRunning}`);
    if (isTaskRunning) {
      let runningTaskName = _getEntryName(_entryFromRow(isTaskRunning));
      if (options.alwaysStopRunningTask) {
        await _stopTask(app, dash, options);
      } else {
        let result = await app.prompt(
          `${runningTaskName} is already running. Would you like to stop it first?`,
          {
            inputs: [
              {
                type: "radio",
                options: [
                  { label: "Stop current task", value: true },
                  { label: "Keep current task (and cancel)", value: false }
                ]
              }
            ]
          }
        );
        if (!result) {
          console.log("Cancelling...");
          return;
        }
        console.log(`Stopping current task...`);
        await _stopTask(app, dash, options);
      }
    }
    return dash;
  }
  async function _start(app, options, target) {
    let dash = await _preStart2(app, options);
    if (!dash)
      return;
    let toStart;
    if (target.score !== void 0) {
      let source = await app.findNote({ uuid: target.noteUUID });
      toStart = {
        type: "task",
        data: {
          projectName: _makeNoteLink(source),
          taskName: `${target.content.slice(0, 20)} (${target.uuid})`
        }
      };
    } else {
      toStart = {
        type: "project",
        data: {
          projectName: _makeNoteLink(target),
          taskName: ""
        }
      };
    }
    console.log(`Starting ${toStart.type} ${_getEntryName(toStart)}...`);
    let startDate = /* @__PURE__ */ new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    let runningTaskDuration = await _getTaskDurations(
      app,
      dash,
      toStart,
      startDate,
      endDate
    );
    if (runningTaskDuration.length === 0)
      runningTaskDuration = [{ "Duration": "00:00:00" }];
    let alertAction = await app.alert(
      `${toStart.data.taskName ? toStart.data.taskName : target.name} started successfully. Logged today: ${runningTaskDuration[0]["Duration"]}`,
      {
        actions: [{ label: "Visit Dashboard", icon: "assignment" }]
      }
    );
    if (alertAction === 0) {
      app.navigate(`https://www.amplenote.com/notes/${dash.uuid}`);
    }
    let currentTime = _getCurrentTimeFormatted();
    const newRow = {
      "Project Name": toStart.data.projectName,
      "Task Name": toStart.data.taskName,
      "Start Time": currentTime,
      "End Time": ""
    };
    await _logStartTime(app, dash, newRow, options);
    console.log(`${target.name} started successfully. Logged today: ${runningTaskDuration[0]["Duration"]}`);
    return true;
  }
  async function _stop(app, options) {
    console.log(`_stop(app)`);
    let dash = await _ensureDashboardNote(app, options);
    let isTaskRunning = await _isTaskRunning(app, dash);
    if (!isTaskRunning) {
      console.log("No task is running at the moment.");
      await app.alert(`No task is running at the moment.`);
      return;
    }
    console.log(`Stopping current task...`);
    await _stopTask(app, dash, options);
    let startDate = /* @__PURE__ */ new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    isTaskRunning = _entryFromRow(isTaskRunning);
    let runningTaskDuration = await _getTaskDurations(app, dash, isTaskRunning, startDate, endDate);
    let alertAction = await app.alert(
      `${_getEntryName(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]["Duration"]}`,
      {
        actions: [{ label: "Visit Dashboard", icon: "assignment" }]
      }
    );
    if (alertAction === 0) {
      app.navigate(`https://www.amplenote.com/notes/${dash.uuid}`);
    }
    console.log(`${_getEntryName(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]["Duration"]}`);
    return true;
  }
  async function _generateReport(app, options, reportType) {
    console.log(`_generateReport(), reportType: ${reportType}`);
    let startOfDay = /* @__PURE__ */ new Date();
    let endOfDay = /* @__PURE__ */ new Date();
    let reportTitle = options.noteTitleReportDaily;
    let reportParentTag = options.noteTagReports;
    let reportTag = `${reportParentTag}/daily`;
    let dash = await _ensureDashboardNote(app, options);
    if (reportType === "yesterday") {
      startOfDay.setDate(startOfDay.getDate() - 1);
    } else if (reportType === "this week") {
      let day = startOfDay.getDay();
      let difference = (day < 1 ? -6 : 1) - day;
      startOfDay.setDate(startOfDay.getDate() + difference);
      reportTitle = options.noteTitleReportWeekly;
      reportTag = `${reportParentTag}/weekly`;
    } else if (reportType === "last week") {
      let day = startOfDay.getDay();
      let difference = (day < 1 ? -6 : 1) - day;
      startOfDay.setDate(startOfDay.getDate() + difference - 7);
      endOfDay = new Date(startOfDay.getTime());
      endOfDay.setDate(endOfDay.getDate() + 6);
      reportTitle = options.noteTitleReportWeekly;
      reportTag = `${reportParentTag}/weekly`;
    } else if (reportType === "this month") {
      startOfDay.setDate(1);
      reportTitle = options.noteTitleReportMonthly;
      reportTag = `${reportParentTag}/monthly`;
    } else if (reportType === "last month") {
      startOfDay.setMonth(startOfDay.getMonth() - 1);
      startOfDay.setDate(1);
      endOfDay.setDate(1);
      endOfDay.setDate(endOfDay.getDate() - 1);
      reportTitle = options.noteTitleReportMonthly;
      reportTag = `${reportParentTag}/monthly`;
    }
    startOfDay.setHours(0, 0, 0, 0);
    endOfDay.setHours(23, 59, 59, 999);
    reportTitle = `${reportTitle} ${_getFormattedDate(startOfDay)}`;
    let resultsUUID = await app.createNote(`${reportTitle}`, [reportTag]);
    let resultsHandle = await app.findNote({ uuid: resultsUUID });
    console.log(`Created results note with UUID ${resultsUUID}`);
    let taskDurations = await _getTaskDurations(app, dash, null, startOfDay, endOfDay);
    if (taskDurations.length === 0) {
      console.log(`Nothing logged ${reportType}.`);
      await app.alert(`Nothing logged ${reportType}.`);
      return;
    }
    await _generateDurationsReport(app, options, resultsHandle, taskDurations);
    let taskDistribution = await _getTaskDistribution(app, dash, null, startOfDay, endOfDay);
    await _generateQuadrantReport(app, resultsHandle, taskDistribution, options);
    let alertAction = await app.alert(
      `Daily report generated successfully!`,
      {
        actions: [{ label: "Visit Report", icon: "donut_small" }]
      }
    );
    if (alertAction === 0) {
      app.navigate(`https://www.amplenote.com/notes/${resultsHandle.uuid}`);
    }
    console.log(`Success!`);
    return true;
  }
  async function _promptTarget(app) {
    return await app.prompt(
      "What are you working on?",
      {
        inputs: [
          { type: "note", label: "Choose a note" }
        ]
      }
    );
  }
  async function _loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // lib/plugin.js
  var plugin = {
    options: {
      ampletime: {
        noteTitleDashboard: "Time Tracker Dashboard",
        noteTagDashboard: "amplework/tracking",
        noteTagReports: "amplework/tracking/reports",
        sectionTitleDashboardEntries: "Time entries",
        dashboardColumns: ["Project Name", "Task Name", "Start Time", "End Time"],
        noteTitleReportDaily: "Ampletime Daily: Tracked",
        noteTitleReportWeekly: "Ampletime Weekly: Tracked",
        noteTitleReportMonthly: "Ampletime Monthly: Tracked",
        colors: [
          // Colors to use on the chart
          "#1ABC9C",
          // Turquoise (Green)
          "#3498DB",
          // Peter River (Blue)
          "#F1C40F",
          // Sun Flower (Yellow)
          "#9B59B6",
          // Amethyst (Purple)
          "#E74C3C",
          // Alizarin (Red)
          "#95A5A6",
          // Concrete (Grey)
          "#2ECC71",
          // Emerald (Green)
          "#2980B9",
          // Belize Hole (Blue)
          "#F39C12",
          // Orange (Orange)
          "#8E44AD",
          // Wisteria (Purple)
          "#C0392B",
          // Pomegranate (Red)
          "#BDC3C7",
          // Silver (Grey)
          "#16A085",
          // Green Sea (Green)
          "#34495E",
          // Wet Asphalt (Blue)
          "#D35400",
          // Pumpkin (Orange)
          "#7F8C8D",
          // Asbestos (Grey)
          "#27AE60",
          // Nephritis (Green)
          "#2C3E50",
          // Midnight Blue (Blue)
          "#E67E22",
          // Carrot (Orange)
          "#ECF0F1"
          // Clouds (Grey)
        ],
        legendSquareSize: 45,
        // Size in pixels for the colored square in the reports table
        alwaysStopRunningTask: false
      },
      amplefocus: {
        settings: {
          "Work phase duration (in minutes)": "workDuration",
          "Break phase duration (in minutes)": "breakDuration"
        },
        noteTitleDashboard: "Focus Dashboard",
        noteTagDashboard: "amplework/focus",
        sectionTitleDashboardEntries: "Sessions",
        dashboardColumns: [
          "Source Note",
          "Start Time",
          "Cycle Count",
          "Cycle Progress",
          // How many cycles were completed fully
          "Completion Logs",
          //Comma-separate values
          "Energy Logs",
          // Comma-separated values
          "Morale Logs",
          // Comma-separated values
          "End Time"
        ],
        workDuration: 30 * 60 * 1e3,
        // ms
        breakDuration: 10 * 60 * 1e3,
        // ms
        alwaysStopRunningTask: false,
        alwaysResumeOpenTask: false,
        initialQuestions: [
          "What am I trying to accomplish?",
          "Why is this important and valuable?",
          "How will I know this is complete?",
          "Potential distractions? How am I going to deal with them?",
          "Anything else noteworthy?"
        ],
        cycleStartQuestions: [
          "What am I trying to accomplish this cycle? Can I complete it in 30 minutes?",
          "How will I get started?",
          "Any hazards? How will I counter them?"
        ],
        cycleEndQuestions: [
          "Did you complete the cycle's targets? If not, what went wrong?",
          "Any distractions?",
          "What should I improve for the next cycle?"
        ],
        finalQuestions: [
          "What did I get done in this session?",
          "What should I work on during the next session?",
          "Did I get bogged down? Where?",
          "Want went well in this session? How can I make sure to replicate this in the future?"
        ]
      }
    },
    noteUUID: null,
    appOption: {
      "Reopen timer in sidebar": async function(app) {
        console.log("Reopening timer in sidebar...");
        app.openSidebarEmbed(0.66, {
          ampletime: { project: null },
          amplefocus: {
            sleepUntil,
            currentCycle: currentSessionCycle,
            cycleCount: sessionCycleCount,
            sessionEnd: sessionEndTime,
            status,
            moraleValues,
            energyValues,
            completionValues
          }
        });
      }
    },
    //===================================================================================
    // ===== APP OPTIONS ====
    //===================================================================================
    _appOption: {
      "Start...": async function(app) {
        let target = await _promptTarget(app);
        try {
          await _start(app, this.options.ampletime, target);
        } catch (err) {
          console.log(err);
          await app.alert(err);
        }
      },
      "Stop": async function(app) {
        try {
          await _stop(app);
        } catch (err) {
          console.log(err);
          await app.alert(err);
        }
      },
      "Tracked Today": async function(app) {
        try {
          await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await _generateReport(app, this.options.ampletime, "today");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked Yesterday": async function(app) {
        try {
          await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await _generateReport(app, this.options.ampletime, "yesterday");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked This Week": async function(app) {
        try {
          await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await _generateReport(app, this.options.ampletime, "this week");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked Last Week": async function(app) {
        try {
          await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await _generateReport(app, this.options.ampletime, "last week");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked This Month": async function(app) {
        try {
          await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await _generateReport(app, this.options.ampletime, "this month");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked Last Month": async function(app) {
        try {
          await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await _generateReport(app, this.options.ampletime, "last month");
        } catch (err) {
          console.log(err);
        }
      },
      "Pause Focus": async function(app) {
        try {
          console.log("Attempting to pause Amplefocus session...");
          setSignal("pause");
          await stopTimers();
          pauseSession();
          await runningCriticalCode;
        } catch (err) {
          console.log(err);
          app.alert(err);
          throw err;
        }
      },
      "Cancel Focus": async function(app) {
        try {
          console.log("Attempting to pause Amplefocus session...");
          setSignal("cancel");
          let dash = await _ensureDashboardNote(app, this.options.amplefocus);
          let task = await _isTaskRunning(app, dash);
          if (!task) {
            console.log("Nothing to cancel");
            return;
          }
          await stopTimers();
          cancelSession();
          await runningCriticalCode;
          await _writeEndTime(app, this.options.amplefocus, dash);
        } catch (err) {
          console.log(err);
          app.alert(err);
          throw err;
        }
      }
    },
    // Note: not actually accessible via the plugin triggers
    "End Cycle Early": async function(app) {
      try {
        console.log("Attempting to end current cycle early...");
        setSignal("end-cycle");
        await stopTimers();
      } catch (err) {
        console.log(err);
        app.alert(err);
        throw err;
      }
    },
    "Start This Task": {
      async run(app) {
        try {
          await app.context.replaceSelection("");
          let currentNote = await app.getNoteContent({ uuid: app.context.noteUUID });
          let target = await app.getTask(app.context.taskUUID);
          while (true) {
            if (currentNote.includes(target.content))
              break;
            target = await app.getTask(app.context.taskUUID);
            await new Promise((r) => setTimeout(r, 500));
          }
          await _start(app, this.options.ampletime, target);
        } catch (err) {
          console.log(err);
          await app.alert(err);
        }
      },
      async check(app) {
        if (app.context.taskUUID)
          return true;
      }
    },
    //===================================================================================
    // ===== INSERT TEXT ====
    //===================================================================================
    insertText: {
      "Start Focus": async function(app, handlePastCycles = false) {
        try {
          console.log("Starting Amplefocus...");
          this.noteUUID = app.context.noteUUID;
          initAmplefocus(app, this.options.amplefocus);
          let dash = await _preStart(app, this.options.amplefocus, handlePastCycles);
          if (!dash)
            return;
          const [startTime, cycleCount] = await _promptInput(app, this.options.amplefocus);
          await _focus(app, this.options.amplefocus, dash, startTime, Number(cycleCount), handlePastCycles);
        } catch (err) {
          console.log(err);
          app.alert(err);
          throw err;
        }
      }
    },
    async onEmbedCall(app, ...args) {
      if (args.length === 1 && args[0] === "end-cycle") {
        return await this["End Cycle Early"]();
      } else if (args.length === 2) {
        if (args[0] === "clipboard") {
          let note = this.noteUUID;
          let noteHandle = await app.findNote({ uuid: note });
          let base64Image = args[1];
          let res = await fetch(base64Image);
          let blob = await res.blob();
          await app.alert("\u{1F389} Your graph was copied to the clipboard (and inserted into your session debrief)");
          let _dataURL = await _dataURLFromBlob(blob);
          let fileURL = await app.attachNoteMedia(noteHandle, _dataURL);
          await appendToHeading(app, "Session debrief", `![](${fileURL})`);
        }
      }
    },
    renderEmbed(app, ...args) {
      let _args = JSON.stringify(args[0]);
      console.log(_args);
      return `<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pomodoro Focus App</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f0f0f0;
            font-family: Arial, sans-serif;
        }

        .container {
            width: 400px;
            max-height: 500px;
            min-height: 300px;
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            padding: 3% 5%;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            position: relative;
        }

        .header {
            text-align: center;
            font-size: 14px;
            padding: 2%;
        }

        .timer-info {
            width: 100%;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 2%;
        }

        .status {
            padding-top: 6%;
            font-size: 24px; /* Medium font size */
            text-align: center;
        }

        .share-text {
            cursor: pointer;
            font-size: 14px;
            text-align: center;
            margin-top: 5px;
            color: #FF4F02;
            display: none; /* Hidden by default */
            padding-bottom: 5%;
        }

        .countdown {
            font-size: 90px;
            font-weight: bold;
            position: relative;
        }

        .graph-container {
            top: 50%;
            left: 50%;
            width: 90%;
        }

        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }

        .tooltip {
            background-color: rgba(0, 0, 0, 0.7) !important;
            color: #fff !important;
            border-radius: 5px !important;
            text-align: center !important;
            padding: 8px !important;
        }

        .tooltip:before {
            border-top-color: rgba(0, 0, 0, 0.7) !important;
        }

        .button-row {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-top: 1px;
            padding: 1px;
        }

        .button-row button {
            flex: 1;
            margin: 5px;
            padding: 10px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            background-color: #007BFF;
            color: white;
        }

        .button-row button:hover {
            background-color: #0056b3;
        }

        .bottom-buttons {
            width: 100%;
            display: flex;
            justify-content: space-between;
            position: relative;
            bottom: 10px;
        }

        .bottom-buttons button {
            background: none;
            border: none;
            color: #d9534f; /* Intimidating red color */
            cursor: pointer;
            font-size: 14px;
            padding-top: 5%;
        }

        .bottom-buttons button:hover {
            text-decoration: underline;
        }

        .bottom-buttons #end-cycle-button {
            color: #f0ad4e; /* Less intimidating color */
        }

        /* CYCLE PROGRESS */
        .progress-container {
            width: 90%;
            max-width: 1000px;
            padding: 17px;
            background: #fff;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-radius: 10px;
            margin-top: 5%;
            margin-bottom: 5%;
        }

        .progress-bar {
            display: flex;
            align-items: center;
            position: relative;
        }

        .node {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background-color: #ccc;
            z-index: 2;
            position: relative;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: background-color 0.3s ease, transform 0.3s ease;
        }

        .node.filled {
            background-color: #5A6C4E;
            transform: scale(1.1);
        }

        .node.current {
            background-color: #5A6C4E;
            transform: scale(1.2);
        }

        .line-container {
            position: absolute;
            top: 50%;
            left: 12.5px;
            right: 12.5px;
            height: 5px;
            background-color: #ccc;
            transform: translateY(-50%);
            z-index: 1;
            border-radius: 2.5px;
            transition: background-color 0.3s ease, width 0.3s ease;
        }

        .line-container.filled {
            background-color: #5A6C4E;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <!-- <div id="time-tracking-elapsed">Time Elapsed: 10:25</div> -->
        <!-- <div id="time-tracking-project">Project: Sample Project</div> -->
    </div>
    <div class="timer-info">
        <div id="cycle-progress">Cycle 1 out of 5</div>
        <div id="session-end">Session ends at 7pm</div>
    </div>
    <div class="status" id="status">status</div>
    <div class="countdown" id="countdown">30:00</div>
    <div class="share-text" id="share-text">Share this session's graph?</div>
    <div class="graph-container">
        <canvas id="myChart"></canvas>
    </div>
    <div class="progress-container">
        <div class="progress-bar" id="progressBar">
            <div class="line-container" id="lineContainer"></div>
            <!-- Nodes will be dynamically generated -->
        </div>
    </div>
    <div class="button-row">
    </div>
    <div class="bottom-buttons">
        <button id="end-cycle-button">End cycle early</button>
        <!-- <button>End session early</button> -->
    </div>
</div>

<script>
    let chartInstance; // Global variable to hold the chart instance
    
    document.getElementById('share-text').addEventListener('click', async function() {
        const myChart = chartInstance; // Assuming chartInstance is your Chart.js instance
        const base64Image = myChart.toBase64Image();
        let res = await fetch(base64Image);
        let blob = await res.blob();
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(function() {
          console.log('Graph copied to clipboard!');
        }).catch(function(error) {
          console.error('Error copying graph to clipboard: ', error);
        });

        window.callAmplenotePlugin("clipboard", base64Image);
    });


    function createGraph(moraleValues, energyValues, completionValues, cycleCount) {
        const ctx = document.getElementById('myChart').getContext('2d');

        // Ensure the datasets are padded to the cycleCount length with null values
        const paddedMoraleValues = Array.from({ length: cycleCount + 1}, (_, i) => moraleValues[i] !== undefined ? moraleValues[i] : null);
        const paddedEnergyValues = Array.from({ length: cycleCount + 1}, (_, i) => energyValues[i] !== undefined ? energyValues[i] : null);
        const paddedCompletionValues = Array.from({ length: cycleCount + 1 }, (_, i) => completionValues[i] !== undefined ? completionValues[i] : null);

        const data = {
            labels: Array.from({ length: Number(cycleCount) + 1}, (_, i) => \`Cycle \${i}\`),
            datasets: [
                {
                    type: "line",
                    label: 'Morale',
                    data: paddedMoraleValues,
                    borderColor: 'rgba(170, 100, 86, 0.7)',
                    backgroundColor: 'rgba(170, 100, 86, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(170, 100, 86, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(170, 100, 86, 1)',
                },
                {
                    type: "line",
                    label: 'Energy',
                    data: paddedEnergyValues, 
                    borderColor: 'rgba(57, 81, 57, 0.7)',
                    backgroundColor: 'rgba(57, 81, 57, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(57, 81, 57, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(57, 81, 57, 0.1)',
                },
                {
                    type: "bar",
                    label: "Completion",
                    data: paddedCompletionValues,
                    backgroundColor: "rgba(201, 203, 207, 0.2)",
                    fill: true,
                },
                
            ]
        };

        const config = {
            // type: 'line',
            data: data,
            options: {
                responsive: true,
                aspectRatio: 3.25, // Adjust the aspect ratio to make the graph flatter or narrower
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        footerColor: '#fff',
                        titleFont: { weight: 'bold' },
                        bodyFont: { weight: 'normal' },
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.raw;
                                return label;
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: false,
                        position: 'left',
                        max: 1.2,
                        min: -1.2,
                    },
                    x: {
                        display: false,
                        ticks: {
                            maxTicksLimit: cycleCount
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        };

        _loadLibrary("https://cdn.jsdelivr.net/npm/chart.js").then(() => {
            // If a chart instance exists, destroy it before creating a new one
            if (chartInstance) {
                chartInstance.destroy();
            }

            chartInstance = new Chart(ctx, config);
        });
    }

    let _project;
    let _currentCycle, _cycleCount, _sessionEnd, _status, _sleepUntil;
    let _interval;
    let _moraleValues, _energyValues, _completionValues;

    function startCountdown(endTime, display) {
        function updateCountdown() {
            let now = Date.now();
            let timeLeft = endTime - now;

            if (timeLeft < 0) {
                display.textContent = "00:00";
                clearInterval(_interval);

                console.log(_currentCycle, _cycleCount);
                if (Number(_currentCycle) === Number(_cycleCount)) {
                    document.getElementById('share-text').style.display = 'block'; // Show the share text
                }

                return;
            }

            let seconds = Math.floor(timeLeft / 1000 % 60);
            let minutes = Math.floor(timeLeft / (1000 * 60) % 60);
            let hours = Math.floor(timeLeft / (1000 * 60 * 60) % 24);
            [seconds, minutes, hours] = [seconds, minutes, hours].map(
                (item) => ("0" + item).slice(-2)
            );
            let textContent = \`\${hours}:\${minutes}:\${seconds}\`;
            if (hours === "00") textContent = textContent.slice(3);
            display.textContent = textContent;
        }

        updateCountdown();
        _interval = setInterval(updateCountdown, 1000);

        return _interval; // Return the interval ID so it can be cleared if needed
    }

    // Function to update parameters, called every second
    function updateParameters(response) {
        let {ampletime, amplefocus} = response;
        let {project} = ampletime;
        let {sleepUntil, currentCycle, cycleCount, sessionEnd, status, moraleValues, energyValues, completionValues} = amplefocus;

        _project = project;
        _sleepUntil = new Date(sleepUntil).getTime();
        _currentCycle = currentCycle;
        _cycleCount = cycleCount;
        _sessionEnd = new Date(sessionEnd);
        _status = status;
        _moraleValues = moraleValues;
        _energyValues = energyValues;
        _completionValues = completionValues;

        createProgressBar(_cycleCount);
        setProgress(_currentCycle);

        createGraph(_moraleValues, _energyValues, _completionValues, _cycleCount);

        let elementCycleProgress = document.getElementById("cycle-progress");
        let elementSessionEnd = document.getElementById("session-end");
        let elementStatus = document.getElementById("status");
        let endCycleButton = document.getElementById("end-cycle-button");
        
        endCycleButton.addEventListener("click", () => window.callAmplenotePlugin("end-cycle"));

        elementCycleProgress.textContent = \`Cycle \${_currentCycle} out of \${_cycleCount}\`;
        elementSessionEnd.textContent = \`Session ends at \${_sessionEnd.toLocaleTimeString("en-us")}\`;
        elementStatus.textContent = _status;
        startCountdown(_sleepUntil, document.getElementById("countdown"));
    }

    try {
        function run() {
            // createProgressBar(8);
            // setProgress(3);
            // createGraph([1, 2, 3], [3, 2, 1], 8);
            updateParameters(JSON.parse('${_args}'));
        }

        window.onload = run;
        if (document.readyState === "complete" || document.readyState === "interactive") {
            // If document is already loaded or interactive, call run directly
            run();
        }
    } catch (err) {
        console.error(err);
        throw err;
    }

    function createProgressBar(nodeCount) {
        const progressBar = document.getElementById('progressBar');
        const lineContainer = document.getElementById('lineContainer');
        progressBar.innerHTML = '';
        lineContainer.style.width = \`calc(100% - \${25 / nodeCount}%)\`;

        for (let i = 0; i < nodeCount; i++) {
            const node = document.createElement('div');
            node.classList.add('node');
            progressBar.appendChild(node);

            if (i < nodeCount - 1) {
                const spacing = document.createElement('div');
                spacing.style.flexGrow = '1';
                progressBar.appendChild(spacing);
            }
        }

        progressBar.appendChild(lineContainer);
    }

    function setProgress(progress) {
        const nodes = document.querySelectorAll('.node');
        const lineContainer = document.querySelector('.line-container');

        nodes.forEach((node, index) => {
            if (index < progress) {
                node.classList.add('filled');
                node.classList.remove('current'); // Ensure previous nodes are not marked as current
            } else {
                node.classList.remove('filled');
                node.classList.remove('current'); // Ensure future nodes are not marked as current
            }
        });

        if (progress > 0) {
            nodes[progress - 1].classList.add('current'); // Mark the current node
            lineContainer.classList.add('filled');
            lineContainer.style.width = \`calc(\${(progress - 1) / (nodes.length - 1) * 100}% - \${25 / nodes.length}%)\`;
        } else {
            lineContainer.classList.remove('filled');
            lineContainer.style.width = \`calc(100% - \${25 / nodes.length}%)\`;
        }
    }

    function _loadLibrary(url) {
        return new Promise(function(resolve) {
            const script = document.createElement("script");
            script.setAttribute("type", "text/javascript");
            script.setAttribute("src", url);
            script.addEventListener("load", function() {
                resolve(true);
            });
            document.body.appendChild(script);
        });
    }
</script>
</body>
</html>`;
    }
  };
  var plugin_default = plugin;
  return plugin;
})()
