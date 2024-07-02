(() => {
  // lib/markdown.js
  async function _createTableHeader(columns) {
    console.debug(`_createTableHeader(${columns}`);
    const separatorFirst = columns.map(() => " ").join("|");
    const separatorSecond = columns.map(() => "-").join("|");
    const header = columns.join(" | ");
    return `|${separatorFirst}|
|${separatorSecond}|
| ${header} |`;
  }
  function _markdownTableToDict(content) {
    console.debug(`_markdownTableToDict(${content})`);
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
    console.debug(`_dictToMarkdownTable(${tableDict})`);
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

  // lib/ampletime/date-time.js
  async function _getCurrentTime() {
    let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset() * 6e4;
    return _getISOStringFromDate(new Date(Date.now() - timezoneOffset));
  }
  function _getISOStringFromDate(dateObject) {
    return dateObject.toISOString().slice(0, -1);
  }
  function _durationToSeconds(duration) {
    let [hours, minutes, seconds] = duration.split(":").map(Number);
    let totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds;
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

  // lib/data-structures.js
  function _insertRowToDict(tableDict, newRow) {
    console.log(`_insertRowToDict(${tableDict}, ${newRow})`);
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
    console.log(`_insertColumnInMemory(${memory}, ${name}, ${data})`);
    console.log(memory);
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
    console.log(`_isTaskRunning(${dash})`);
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
    tableDict = _editTopTableCell(tableDict, "End Time", await _getCurrentTime());
    await writeDashboard(app, options, dash, tableDict);
    return true;
  }
  function _editTopTableCell(tableDict, key, value) {
    console.debug(`_editTopTableCell(${tableDict}, ${key}, ${value})`);
    tableDict[0][key] = value;
    return tableDict;
  }
  function _appendToTopTableCell(tableDict, key, value) {
    console.debug(`_appendToTopLevelCell(${tableDict}, ${key}, ${value}`);
    let existing = _getTopTableCell(tableDict, key);
    if (!existing) {
      tableDict = _editTopTableCell(tableDict, key, value);
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
    let tableDict = _markdownTableToDict(content);
    return tableDict;
  }
  async function writeDashboard(app, options, dash, tableDict) {
    let updatedTableMarkdown = _dictToMarkdownTable(tableDict);
    const section = { heading: { text: options.sectionTitleDashboardEntries } };
    await app.replaceNoteContent(dash, updatedTableMarkdown, { section });
  }
  async function _logStartTime(app, dash, newRow, options) {
    console.debug(`_logStartTime(${dash}, ${newRow}`);
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
  function _sectionRange(bodyContent, sectionHeadingText) {
    console.debug(`_sectionRange`);
    const sectionRegex = /^#+\s*([^#\n\r]+)/gm;
    let indexes = Array.from(bodyContent.matchAll(sectionRegex));
    indexes = indexes.map((index) => {
      let newIndex = index;
      newIndex[1] = stripMarkdownFormatting(newIndex[1]);
      return newIndex;
    });
    const sectionMatch = indexes.find((m) => m[1].trim() === sectionHeadingText.trim());
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
        throw new Error(`${err.message} (line 1054)`);
      }
    }
    const { startIndex, endIndex } = _sectionRange(noteContent, sectionHeadingText);
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
  async function _appendToNote(app, contents, targetNoteUUID = null) {
    if (!targetNoteUUID) {
      targetNoteUUID = app.context.noteUUID;
    }
    await app.context.replaceSelection(contents);
  }

  // lib/amplefocus/amplefocus.js
  var state;
  function changeState(newState) {
    console.log(`STATE: ${state} => ${newState}`);
    state = newState;
  }
  var currentCycle;
  var sessionCycleCount;
  var sessionStartTime;
  var sessionEndTime;
  var sleepUntil;
  function pauseSession() {
    changeState("PAUSED");
  }
  function cancelSession() {
    changeState("NEW");
  }
  var timerController;
  async function stopTimers() {
    if (state !== "RUNNING") {
      console.log("Nothing to stop.");
      return;
    }
    timerController.abort();
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
  function initAmplefocus() {
    changeState("NEW");
    timerController = new AbortController();
    runningCriticalCode = new Promise((resolve) => {
      markSafeToExit = () => {
        changeState("SAFE");
        resolve();
      };
    });
    markStopped();
  }
  async function _preStart(app, options) {
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
              ]
            }
          ]
        }
      );
      if (result === "resume") {
        console.log("Continuing previous uncompleted session.");
        let startTime = await _promptStartTime(app);
        await _startSession(app, options, dash, startTime, isSessionRunning["Cycle Count"], Number(isSessionRunning["Cycle Progress"]) + 1, isSessionRunning["Start Time"]);
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
  async function _focus(app, options, dash, startTime, cycleCount) {
    sessionCycleCount = cycleCount;
    sessionStartTime = startTime;
    sessionEndTime = _calculateEndTime(options, startTime, cycleCount);
    const newRow = {
      // "Session ID": Math.max(dash.map(e => e["Session ID"])) + 1,
      "Source Note": _makeNoteLink(await app.findNote({ uuid: app.context.noteUUID })),
      "Start Time": await _getCurrentTime(),
      "Cycle Count": cycleCount,
      "Cycle Progress": 0,
      "Energy Logs": "",
      "Morale Logs": "",
      "End Time": ""
    };
    await _logStartTime(app, dash, newRow, options);
    const initialQuestions = await _promptInitialQuestions(app, options);
    await _insertSessionOverview(app, options, startTime, cycleCount, initialQuestions);
    await _startSession(app, options, dash, startTime, cycleCount);
    markSafeToExit();
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
  async function _promptStartTime(app) {
    const startTimeOptions = _generateStartTimeOptions();
    let result = await app.prompt("When would you like to start? Choose the time of the first work cycle.", {
      inputs: [
        {
          label: "Start Time",
          type: "select",
          options: startTimeOptions
        }
      ]
    });
    if (result === -1 || result === null)
      return new Date(Number(startTimeOptions[4]));
    return new Date(Number(result));
  }
  async function _promptCycleCount(app, options, startTimeValue) {
    const startTime = new Date(Number(startTimeValue));
    console.log("Start time selected:", _formatAsTime(startTime));
    const cycleOptions = _generateCycleOptions(startTime, options);
    let result = await app.prompt("How long should this session be? Choose the number of cycles you want to focus for.", {
      inputs: [
        {
          label: "Number of Cycles",
          type: "select",
          options: cycleOptions
        }
      ]
    });
    if (result === -1 || result === null)
      throw new Error("Number of cycles not selected. Cannot proceed.");
    return result;
  }
  async function _promptInitialQuestions(app, options) {
    const initialQuestions = await app.prompt("Take some time to outline your focus session.", {
      inputs: options.initialQuestions.map(function(question) {
        return {
          label: question,
          type: "text"
        };
      })
    });
    console.log(initialQuestions);
    return initialQuestions || [];
  }
  async function _makeSessionHeading(app, timestamp, cycleCount) {
    const focusNote = await _getFocusNote(app);
    const focusNoteLink = _formatNoteLink(focusNote.name, focusNote.uuid);
    return `# **\\[${timestamp}\\]** ${focusNoteLink} for ${cycleCount} cycles`;
  }
  async function _insertSessionOverview(app, options, startTime, cycleCount, initialQuestions) {
    const timestamp = startTime.toLocaleTimeString(
      void 0,
      { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
    );
    let sessionHeadingText = await _makeSessionHeading(app, timestamp, cycleCount);
    let sessionMarkdown = [sessionHeadingText];
    sessionMarkdown.push("## Session overview");
    console.log(initialQuestions);
    for (let i = 0; i < options.initialQuestions.length; i++) {
      sessionMarkdown.push(
        `- **${options.initialQuestions[i]}**`
      );
      let answer = initialQuestions[i];
      sessionMarkdown.push(`  - ${answer}`);
    }
    await _appendToNote(app, "\n" + sessionMarkdown.join("\n"));
  }
  function _formatNoteLink(name, uuid) {
    return `[${name}](https://www.amplenote.com/notes/${uuid})`;
  }
  function _formatAsTime(date) {
    const options = { hour: "2-digit", minute: "2-digit", hour12: false };
    return date.toLocaleTimeString(void 0, options);
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
  function _generateStartTimeOptions() {
    console.log("Generating start time options...");
    const options = [];
    const now = /* @__PURE__ */ new Date();
    const currentMinutes = now.getMinutes();
    const roundedMinutes = Math.floor(currentMinutes / 5) * 5;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    for (let offset = -20; offset <= 20; offset += 5) {
      const time = new Date(now.getTime() + offset * 60 * 1e3);
      const label = _formatAsTime(time);
      const value = time.getTime();
      options.push({ label, value });
    }
    console.log("Start time options generated.");
    return options;
  }
  function _generateCycleOptions(startTime, options) {
    console.log("Generating cycle options...");
    const cycleOptions = [];
    for (let cycles = 2; cycles <= 8; cycles++) {
      const endTime = _calculateEndTime(options, startTime, cycles);
      const label = `${cycles} cycles (until ${_formatAsTime(endTime)})`;
      cycleOptions.push({ label, value: cycles });
    }
    console.log("Cycle options generated.");
    return cycleOptions;
  }
  function _calculateEndTime(options, startTime, cycles) {
    console.log("Calculating end time for given start time and cycles...");
    const totalTime = (options.workDuration + options.breakDuration) * cycles;
    const endTime = new Date(startTime.getTime() + totalTime);
    console.log("Start time:", new Date(startTime));
    console.log("Cycles:", cycles);
    console.log("End time calculated:", _formatAsTime(endTime));
    return endTime;
  }
  async function _promptEnergyMorale(app, message) {
    let result = await app.prompt(
      message,
      {
        inputs: [
          {
            label: "Energy (how are you feeling physically?)",
            type: "select",
            options: [
              { label: "Low", value: 1 },
              { label: "Medium", value: 2 },
              { label: "High", value: 3 }
            ]
          },
          {
            label: "Morale (how are you feeling mentally, with respect to the work?)",
            type: "select",
            options: [
              { label: "Low", value: 1 },
              { label: "Medium", value: 2 },
              { label: "High", value: 3 }
            ]
          }
        ]
      }
    );
    let energy, morale;
    if (result === null) {
      energy = 0;
      morale = 0;
    } else {
      [energy, morale] = result;
    }
    if (!energy)
      energy = 0;
    if (!morale)
      morale = 0;
    return [energy, morale];
  }
  async function _startSession(app, options, dash, startTime, cycles, firstCycle, existingSessionStartTime = null) {
    console.log("Starting focus cycle...");
    const focusNote = await _getFocusNote(app);
    if (!firstCycle)
      firstCycle = 1;
    let sessionHeadingName = "";
    if (existingSessionStartTime) {
      let hoursMinutes = existingSessionStartTime.slice(11, 16);
      let note = await app.findNote({ uuid: app.context.noteUUID });
      let sections = await app.getNoteSections(note);
      let sessionHeading2 = sections.filter(
        (section) => section?.heading?.text.includes(`[${hoursMinutes}`)
      );
      sessionHeadingName = sessionHeading2[0].heading.text;
    } else {
      const timestamp = startTime.toLocaleTimeString(
        void 0,
        { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
      );
      sessionHeadingName = await _makeSessionHeading(app, timestamp, cycles);
      sessionHeadingName = sessionHeadingName.slice(2);
    }
    markAddress(sessionHeadingName, app.context.noteUUID);
    if (firstCycle === 1)
      await appendToSession(app, "\n## Cycles");
    let workEndTime = new Date(startTime.getTime() - options.breakDuration);
    let breakEndTime = startTime;
    for (let i = firstCycle - 1; i <= cycles; i++) {
      currentCycle = i;
      try {
        await _handleWorkPhase(app, options, dash, focusNote, workEndTime, i, cycles);
        await _handleBreakPhase(app, options, dash, focusNote, breakEndTime, i, cycles);
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Session canceled");
          break;
        } else {
          throw error;
        }
      }
      workEndTime = new Date(breakEndTime.getTime() + options.workDuration);
      breakEndTime = new Date(workEndTime.getTime() + options.breakDuration);
    }
    if (state !== "PAUSED") {
      await _writeEndTime(app, options, dash);
    }
    if (timerController.signal.aborted) {
      timerController = new AbortController();
    }
  }
  async function _writeEndTime(app, options, dash) {
    let dashTable = await _readDasbhoard(app, dash);
    dashTable = _editTopTableCell(dashTable, "End Time", await _getCurrentTime());
    await writeDashboard(app, options, dash, dashTable);
  }
  async function _handleWorkPhase(app, options, dash, focusNote, workEndTime, cycleIndex, cycles) {
    console.log(`Cycle ${cycleIndex}: Starting work phase...`);
    const workInterval = setInterval(() => {
      _logRemainingTime(app, options, focusNote, workEndTime, "work", cycleIndex);
    }, options.updateInterval);
    try {
      await _sleepUntil(app, workEndTime);
    } catch (error) {
      clearInterval(workInterval);
      throw error;
    }
    clearInterval(workInterval);
  }
  async function _handleBreakPhase(app, options, dash, focusNote, breakEndTime, cycleIndex, cycles) {
    let currentCycle2, nextCycle;
    currentCycle2 = cycleIndex;
    nextCycle = cycleIndex + 1;
    if (currentCycle2 >= 1) {
      await appendToHeading(app, `Cycle ${currentCycle2}`, "\n- Debrief:");
      let dashTable = await _readDasbhoard(app, dash);
      dashTable = _editTopTableCell(dashTable, "Cycle Progress", currentCycle2);
      await writeDashboard(app, options, dash, dashTable);
    }
    if (currentCycle2 < cycles) {
      await appendToHeading(app, `Cycles`, `
### Cycle ${nextCycle}`);
      await appendToHeading(app, `Cycle ${nextCycle}`, `
- Plan:`);
      let [energy, morale] = await _promptEnergyMorale(
        app,
        "Work phase completed. Before you start your break, take a minute to debrief and plan.\nHow are your energy and morale levels right now?"
      );
      let tableDict = await _readDasbhoard(app, dash);
      tableDict = await _appendToTopTableCell(tableDict, "Energy Logs", energy);
      tableDict = await _appendToTopTableCell(tableDict, "Morale Logs", morale);
      await writeDashboard(app, options, dash, tableDict);
      console.log(`Cycle ${currentCycle2}: Starting break phase...`);
      const breakInterval = setInterval(() => {
        _logRemainingTime(app, focusNote, breakEndTime, "break", currentCycle2);
      }, options.updateInterval);
      try {
        await _sleepUntil(app, breakEndTime);
      } catch (error) {
        clearInterval(breakInterval);
        throw error;
      }
      clearInterval(breakInterval);
      app.alert(`Cycle ${currentCycle2}: Break phase completed. Start working!`);
      console.log(`Cycle ${currentCycle2}: Break phase completed.`);
    } else {
      await appendToSession(app, `
## Session debrief`);
      console.log(`Session complete.`);
      app.alert(`Session complete. Debrief and relax.`);
    }
  }
  function _logRemainingTime(app, options, focusNote, endTime, phase, cycleIndex) {
    const remainingTime = endTime.getTime() - Date.now();
    if (remainingTime > 0) {
      const remainingMinutes = Math.ceil(remainingTime / 1e3 / 60);
      const phaseDuration = phase === "work" ? options.workDuration : options.breakDuration;
      const progressBar = _emojiProgressBar(phaseDuration, phaseDuration - remainingTime);
      const message = `- Cycle ${cycleIndex + 1} ${phase} phase remaining time: ${remainingMinutes} minutes
${progressBar}
`;
      app.replaceNoteContent(focusNote, message);
    }
  }
  function _emojiProgressBar(total, done, width = 320, range = ["\u{1F311}", "\u{1F312}", "\u{1F313}", "\u{1F314}", "\u{1F315}"]) {
    const n = Math.floor(width / 25);
    const step = total / n;
    const emoji = (portion) => {
      const domain = [0, 1];
      const quantizedPortion = (portion - domain[0]) / (domain[1] - domain[0]) * (range.length - 1);
      const index = Math.floor(quantizedPortion);
      return range[index];
    };
    const phases = Array.from(new Array(n), (d, i) => {
      const portion = done % step / step;
      return done / step >= i + 1 ? range[range.length - 1] : done / step < i ? range[0] : emoji(portion);
    });
    return phases.join(" ");
  }
  async function _sleepUntil(app, endTime) {
    console.log(`Sleeping until ${endTime}...`);
    app.openSidebarEmbed(0.66, {
      ampletime: { project: null },
      amplefocus: {
        sleepUntil: endTime,
        currentCycle,
        cycleCount: sessionCycleCount,
        sessionEnd: sessionEndTime,
        status: "Waiting..."
      }
    });
    const sleepTime = endTime.getTime() - Date.now();
    sleepUntil = endTime;
    await _cancellableSleep(sleepTime);
  }
  function _cancellableSleep(ms) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve();
        markStopped();
        console.log("Timer finished naturally");
      }, ms);
      timerController.signal.addEventListener("abort", () => {
        console.error("Timer finished forcefully");
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      });
      markStarted();
    });
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
    const canvas = document.createElement("canvas");
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
    let currentTime = await _getCurrentTime();
    const newRow = {
      "Project Name": toStart.data.projectName,
      "Task Name": toStart.data.taskName,
      "Start Time": currentTime,
      "End Time": ""
    };
    await _logStartTime(app, dash, newRow, options);
    app.openSidebarEmbed(1, _getEntryName(toStart), runningTaskDuration[0]["Duration"]);
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
        noteTitleDashboard: "Focus Dashboard",
        noteTagDashboard: "amplework/focus",
        sectionTitleDashboardEntries: "Sessions",
        dashboardColumns: [
          "Source Note",
          "Start Time",
          "Cycle Count",
          "Cycle Progress",
          // How many cycles were completed fully
          "Energy Logs",
          // Comma-separated values (1-3)
          "Morale Logs",
          // Comma-separated values (1-3)
          "End Time"
        ],
        workDuration: 30 * 1e3,
        // ms
        breakDuration: 10 * 1e3,
        // ms
        updateInterval: 10 * 1e3,
        // ms
        alwaysStopRunningTask: false,
        alwaysResumeOpenTask: false,
        initialQuestions: [
          "What am I trying to accomplish?",
          "Why is this important and valuable?",
          "How will I know this is complete?",
          "Potential distractions? How am I going to deal with them?",
          "Is this concrete/measurable or subjective/ambiguous?",
          "Anything else noteworthy?"
        ],
        cycleStartQuestions: [
          "What am I trying to accomplish this cycle?",
          "How will I get started?",
          "Any hazards? How will I counter them?"
        ],
        cycleEndQuestions: [
          "Any distractions?",
          "Anything noteworthy?",
          "Things to improve next cycle?"
        ]
      }
    },
    //===================================================================================
    // ===== APP OPTIONS ====
    //===================================================================================
    appOption: {
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
    //===================================================================================
    // ===== INSERT TEXT ====
    //===================================================================================
    insertText: {
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
      "Start Focus": async function(app) {
        try {
          console.log("Starting Amplefocus...");
          initAmplefocus();
          let dash = await _preStart(app, this.options.amplefocus);
          if (!dash)
            return;
          const [startTime, cycleCount] = await _promptInput(app, this.options.amplefocus);
          await _focus(app, this.options.amplefocus, dash, startTime, cycleCount);
        } catch (err) {
          console.log(err);
          app.alert(err);
          throw err;
        }
      }
    },
    async onEmbedCall(app, ...args) {
      console.log("ey?");
      return {
        ampletime: { project: null },
        amplefocus: {
          sleepUntil,
          currentCycle,
          cycleCount: sessionCycleCount,
          sessionEnd: sessionEndTime,
          status: state
        }
      };
    },
    renderEmbed: (app, ...args) => _renderEmbed(app, ...args),
    renderEmbed(app, ...args) {
      console.log("caca1");
      let _args = JSON.stringify(args[0]);
      console.log("caca2");
      console.log(_args);
      return `<!DOCTYPE html>
    <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pomodoro Focus App</title>

    <script>
      let _project;
      let _currentCycle, _cycleCount, _sessionEnd, _status, _sleepUntil;
      let _interval;

      function startCountdown(endTime, display) {
      function updateCountdown() {
        let now = Date.now();
        let timeLeft = endTime - now;
          console.log(endTime, now, timeLeft);

        if (timeLeft < 0) {
          display.textContent = "Time's up!";
          clearInterval(_interval);
          return;
        }

        let seconds = Math.floor(timeLeft / 1000 % 60);
        let minutes = Math.floor(timeLeft / (1000 * 60) % 60);
        let hours = Math.floor(timeLeft / (1000 * 60 * 60) % 24);
        // let days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        [seconds, minutes, hours] = [seconds, minutes, hours].map(
            (item) => ("0" + item).slice(-2)
        );
        console.log("HOURS", hours);
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
      console.log("testing", response);
      let {ampletime, amplefocus} = response;
      let {project} = ampletime;
      let {sleepUntil, currentCycle, cycleCount, sessionEnd, status} = amplefocus;

      _project = project;
      _sleepUntil = new Date(sleepUntil).getTime();
      _currentCycle = currentCycle;
      _cycleCount = cycleCount;
      _sessionEnd = sessionEnd;
      _status = status;

      console.log("EMBED");
      console.log(project, currentCycle, cycleCount, sessionEnd, status);
      console.log(document.getElementsByClassName("countdown")[0]);
      startCountdown(_sleepUntil, document.getElementById("countdown"));
    }

      try {
        console.log("cacatry");
      function run() {
        console.log("cacarun");
        let sleeper = new Date();
        sleeper = new Date(sleeper.getTime() + 5 * 60 * 1000);
        updateParameters(JSON.parse('${_args}'));
      }
      window.onload = run;
      if (document.readyState === "complete" || document.readyState === "interactive") {
          // If document is already loaded or interactive, call run directly
          run();
      } 
        console.log("cacaonload");
    } catch (err) {
      console.error(err);
      throw err;
    }

    </script>

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
      width: 100%;
      max-height: 500px;
      min-height: 300px;
      background-color: white;
      border: 1px solid #ddd;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 2%;
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
        font-size: 24px; /* Medium font size */
      text-align: center;
    }

      .countdown {
        font-size: 100px;
      font-weight: bold;
    }

      .button-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-top:1px;
      padding: 1px
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
      padding-top: 5%
    }

      .bottom-buttons button:hover {
        text-decoration: underline;
    }

      .bottom-buttons .pause-button {
      color: #f0ad4e; /* Less intimidating color */
    }
    </style>
  </head>
    <body>
    <div class="container">
      <div class="header">
        <div>Time Elapsed: 10:25</div>
        <div>Project: Sample Project</div>
      </div>
      <div class="timer-info">
        <div>Cycle 1 out of 5</div>
        <div>Session ends at 7pm</div>
      </div>
      <div class="status">status</div>
      <div class="countdown" id="countdown">30:00</div>
      <div class="button-row">
        <button>End cycle early</button>
        <button>Start tracking time on something</button>
      </div>
      <div class="bottom-buttons">
        <button class="pause-button">Pause focus session</button>
        <button>End session early</button>
      </div>
    </div>
    </body>
  </html>`;
    }
  };
  var plugin_default = plugin;
  return plugin;
})()
