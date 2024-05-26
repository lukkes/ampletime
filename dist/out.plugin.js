(() => {
  // lib/markdown.js
  async function _createTableHeader(columns) {
    console.log(`_createTableHeader(${columns}`);
    const separatorFirst = columns.map(() => " ").join("|");
    const separatorSecond = columns.map(() => "-").join("|");
    const header = columns.join(" | ");
    const tableHeader = `|${separatorFirst}|
|${separatorSecond}|
| ${header} |`;
    return tableHeader;
  }
  function _markdownTableToDict(content) {
    console.log(`_markdownTableToDict(${content})`);
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
    const table = rows.map((row) => {
      const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
      const rowObj = {};
      headers.forEach((header, i) => {
        rowObj[header] = cells[i] || "";
      });
      return rowObj;
    });
    return table;
  }
  function _dictToMarkdownTable(tableDict) {
    console.log(`_dictToMarkdownTable(${tableDict})`);
    console.log(tableDict);
    console.log(tableDict[0]);
    console.log(Object.keys(tableDict[0]));
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

  // lib/data-structures.js
  function _insertRowToDict(tableDict, target, currentTime) {
    console.log(`_insertRowToDict(${tableDict}, ${target}, ${currentTime})`);
    const newRow = {
      "Project Name": target.data.projectName,
      "Task Name": target.data.taskName,
      "Start Time": currentTime,
      "End Time": ""
    };
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

  // lib/date-time.js
  async function _getCurrentTime() {
    var timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset() * 6e4;
    return _getISOStringFromDate(new Date(Date.now() - timezoneOffset));
  }
  function _getISOStringFromDate(dateObject) {
    return dateObject.toISOString().slice(0, -1);
  }
  function _durationToSeconds(duration) {
    let [hours, minutes, seconds] = duration.split(":").map(Number);
    let totalSeconds = hours * 3600 + minutes * 60 + seconds;
    console.log(totalSeconds);
    return totalSeconds;
  }
  function _calculateDuration(startTime, endTime) {
    console.log(`_calculateDuration(${startTime}, ${endTime})`);
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
    console.log(`_addDurations(${duration1}, ${duration2})`);
    const seconds1 = _durationToSeconds(duration1);
    const seconds2 = _durationToSeconds(duration2);
    const totalSeconds = seconds1 + seconds2;
    const totalDuration = _secondsToDuration(totalSeconds);
    return totalDuration;
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

  // lib/entries.js
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

  // lib/tasks.js
  async function _getTaskDistribution(app, dash, target, startDate, endDate) {
    console.log(`_getTaskDistribution()`);
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
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
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    console.log(tableDict);
    let entries = _getEntriesWithinDates(tableDict, target, startDate, endDate);
    console.log(entries);
    if (!entries)
      return;
    let taskDurations = await _calculateTaskDurations(entries);
    console.log(taskDurations);
    return taskDurations;
  }
  async function _isTaskRunning(app, dash) {
    console.log(`_isTaskRunning(${dash})`);
    let content = await app.getNoteContent(dash);
    const table = _markdownTableToDict(content);
    console.log(table);
    if (!table)
      return false;
    const runningTask = table.find((row) => row["Project Name"] && row["Start Time"] && !row["End Time"]);
    console.log(runningTask);
    if (Boolean(runningTask))
      return _entryFromRow(runningTask);
    return false;
  }
  async function _logStartTime(app, dash, target, currentTime, options) {
    console.log(`_logStartTime(${dash}, ${target}, ${currentTime})`);
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    console.log(tableDict);
    tableDict = _insertRowToDict(tableDict, target, currentTime);
    console.log(tableDict);
    let updatedTableMarkdown = _dictToMarkdownTable(tableDict);
    console.log(updatedTableMarkdown);
    const section = { heading: { text: options.sectionTitleDashboardTimeEntries } };
    await app.replaceNoteContent(dash, updatedTableMarkdown, { section });
    return true;
  }
  async function _stopTask(app, dash, options) {
    let content = await app.getNoteContent(dash);
    let tableDict = _markdownTableToDict(content);
    tableDict = _addEndTimeToDict(tableDict, await _getCurrentTime());
    let updatedTableMarkdown = _dictToMarkdownTable(tableDict);
    const section = { heading: { text: options.sectionTitleDashboardTimeEntries } };
    await app.replaceNoteContent(dash, updatedTableMarkdown, { section });
    return true;
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
    let sortedTaskDurations = sortedTasks.map((task) => {
      return {
        "Entry Name": task[0],
        "Duration": task[1]
      };
    });
    return sortedTaskDurations;
  }
  function _addEndTimeToDict(tableDict, currentTime) {
    console.log(`_addEndTimeToDict(${tableDict}, ${currentTime})`);
    for (let row of tableDict) {
      if (!row["End Time"]) {
        row["End Time"] = currentTime;
        break;
      }
    }
    return tableDict;
  }

  // lib/reports.js
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
    ;
    console.log(canvasToBlob);
    let blob = await canvasToBlob(canvas);
    console.log(blob);
    return await _dataURLFromBlob(blob);
  }
  async function _generateRadar(taskDistribution, options) {
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
    let dataURL = await _dataURLFromBlob(blob);
    return dataURL;
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
    let dataURL = await _dataURLFromBlob(blob);
    return dataURL;
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
    ;
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

  // lib/plugin.js
  var plugin = {
    options: {
      noteTitleDashboard: "Time Tracker Dashboard",
      noteTagDashboard: "tracking",
      noteTagReports: "tracking/reports",
      sectionTitleDashboardTimeEntries: "Time entries",
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
    //===================================================================================
    // ===== APP OPTIONS ====
    //===================================================================================
    appOption: {
      "Start...": async function(app) {
        let target = await this._promptTarget(app);
        try {
          await this._start(app, target);
        } catch (err) {
          console.log(err);
          await app.alert(err);
        }
      },
      "Stop": async function(app) {
        try {
          await this._stop(app);
        } catch (err) {
          console.log(err);
          await app.alert(err);
        }
      },
      "Tracked Today": async function(app) {
        try {
          await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await this._generateReport(app, "today");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked Yesterday": async function(app) {
        try {
          await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await this._generateReport(app, "yesterday");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked This Week": async function(app) {
        try {
          await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await this._generateReport(app, "this week");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked Last Week": async function(app) {
        try {
          await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await this._generateReport(app, "last week");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked This Month": async function(app) {
        try {
          await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await this._generateReport(app, "this month");
        } catch (err) {
          console.log(err);
        }
      },
      "Tracked Last Month": async function(app) {
        try {
          await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
          await this._generateReport(app, "last month");
        } catch (err) {
          console.log(err);
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
            console.log(target.content);
            await this._start(app, target);
          } catch (err) {
            console.log(err);
            await app.alert(err);
          }
        },
        async check(app) {
          if (app.context.taskUUID)
            return true;
        }
      }
    },
    //===================================================================================
    // ==== MAIN ENTRY POINTS ====
    //===================================================================================
    async _preStart(app) {
      console.log("_preStart()");
      let dash = await this._ensureDashboardNote(app);
      let isTaskRunning = await _isTaskRunning(app, dash);
      console.log(`Task running: ${isTaskRunning}`);
      if (isTaskRunning) {
        let runningTaskName = _getEntryName(isTaskRunning);
        if (this.options.alwaysStopRunningTask) {
          await _stopTask(app, dash, this.options);
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
          await _stopTask(app, dash, this.options);
        }
      }
      return dash;
    },
    /*
     * Starts a new task. Adds a new row in the dashboard. Will prompt to stop existing tasks if any.
     */
    async _start(app, target) {
      let dash = await this._preStart(app);
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
      let currentTime = await _getCurrentTime();
      await _logStartTime(app, dash, toStart, currentTime, this.options);
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
      console.log(`${target.name} started successfully. Logged today: ${runningTaskDuration[0]["Duration"]}`);
      return true;
    },
    //===================================================================================
    /*
     * Stops the currently running task.
     */
    async _stop(app) {
      console.log(`_stop(app)`);
      let dash = await this._ensureDashboardNote(app);
      let isTaskRunning = await _isTaskRunning(app, dash);
      if (!isTaskRunning) {
        console.log("No task is running at the moment.");
        await app.alert(`No task is running at the moment.`);
        return;
      }
      console.log(`Stopping current task...`);
      await _stopTask(app, dash, this.options);
      let startDate = /* @__PURE__ */ new Date();
      startDate.setHours(0, 0, 0, 0);
      let endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
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
    },
    async _generateReport(app, reportType) {
      console.log(`_generateReport(), reportType: ${reportType}`);
      let startOfDay = /* @__PURE__ */ new Date();
      let endOfDay = /* @__PURE__ */ new Date();
      let reportTitle = this.options.noteTitleReportDaily;
      let reportParentTag = this.options.noteTagReports;
      let reportTag = `${reportParentTag}/daily`;
      let dash = await this._ensureDashboardNote(app);
      if (reportType === "yesterday") {
        startOfDay.setDate(startOfDay.getDate() - 1);
      } else if (reportType === "this week") {
        let day = startOfDay.getDay();
        let difference = (day < 1 ? -6 : 1) - day;
        startOfDay.setDate(startOfDay.getDate() + difference);
        reportTitle = this.options.noteTitleReportWeekly;
        reportTag = `${reportParentTag}/weekly`;
      } else if (reportType === "last week") {
        let day = startOfDay.getDay();
        let difference = (day < 1 ? -6 : 1) - day;
        startOfDay.setDate(startOfDay.getDate() + difference - 7);
        endOfDay = new Date(startOfDay.getTime());
        endOfDay.setDate(endOfDay.getDate() + 6);
        reportTitle = this.options.noteTitleReportWeekly;
        reportTag = `${reportParentTag}/weekly`;
      } else if (reportType === "this month") {
        startOfDay.setDate(1);
        reportTitle = this.options.noteTitleReportMonthly;
        reportTag = `${reportParentTag}/monthly`;
      } else if (reportType === "last month") {
        startOfDay.setMonth(startOfDay.getMonth() - 1);
        startOfDay.setDate(1);
        endOfDay.setDate(1);
        endOfDay.setDate(endOfDay.getDate() - 1);
        reportTitle = this.options.noteTitleReportMonthly;
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
      await _generateDurationsReport(app, this.options, resultsHandle, taskDurations);
      let taskDistribution = await _getTaskDistribution(app, dash, null, startOfDay, endOfDay);
      await _generateQuadrantReport(app, resultsHandle, taskDistribution, this.options);
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
    },
    //===================================================================================
    // ==== DASHBOARD MANIPULATION ====
    //===================================================================================
    /*
     * Creates a dashboard note if it doesn't exist, inserts the table header.
     * Returns a handle to the note.
     */
    async _ensureDashboardNote(app) {
      console.log(`_ensureDashboardNote`);
      let dash = await app.findNote(
        { name: this.options.noteTitleDashboard, tags: [this.options.noteTagDashboard] }
      );
      console.log(dash);
      if (!dash) {
        dash = await this._createDashboardNote(
          app,
          this.options.noteTitleDashboard,
          this.options.noteTagDashboard
        );
      }
      const sections = await app.getNoteSections(dash);
      console.log(sections);
      const timeEntriesSection = sections.find(
        (section) => section.heading && section.heading.text === this.options.sectionTitleDashboardTimeEntries
      );
      console.log(timeEntriesSection);
      if (!timeEntriesSection) {
        await app.insertNoteContent(
          dash,
          `
## ${this.options.sectionTitleDashboardTimeEntries}
`,
          { atEnd: true }
        );
        let tableHeader = await _createTableHeader([
          "Project Name",
          "Task Name",
          "Start Time",
          "End Time"
        ]);
        await app.insertNoteContent(dash, tableHeader, { atEnd: true });
      }
      return dash;
    },
    //===================================================================================
    /*
     * Creates the empty dashboard note.
     * Returns a handle.
     */
    async _createDashboardNote(app, noteTitle, noteTag) {
      console.log(`_createDashboardNote(app, ${noteTitle}, ${noteTag}`);
      await app.createNote(noteTitle, [noteTag]);
      return await app.findNote({
        name: noteTitle,
        tags: [noteTag]
      });
    },
    //===================================================================================
    // ==== AN UX ====
    //=================================================================================== 
    async _promptTarget(app) {
      return await app.prompt(
        "What are you working on?",
        {
          inputs: [
            { type: "note", label: "Choose a note" }
          ]
        }
      );
    },
    //===================================================================================
    // ==== MISC ====
    //=================================================================================== 
    async _loadScript(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  };
  var plugin_default = plugin;
  return plugin;
})()
