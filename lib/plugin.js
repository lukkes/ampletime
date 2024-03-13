const plugin = {
  options: {
    noteTitleDashboard: "Time Tracker Dashboard",
    noteTagDashboard: "tracking",
    noteTagReports: "tracking/reports",
    sectionTitleDashboardTimeEntries: "Time entries",
    noteTitleReportDaily: "Ampletime Daily: Tracked",
    noteTitleReportWeekly: "Ampletime Weekly: Tracked",
    noteTitleReportMonthly: "Ampletime Monthly: Tracked",
    colors: [ // Colors to use on the chart
      "#1ABC9C", // Turquoise (Green)
      "#3498DB", // Peter River (Blue)
      "#F1C40F", // Sun Flower (Yellow)
      "#9B59B6", // Amethyst (Purple)
      "#E74C3C", // Alizarin (Red)
      "#95A5A6", // Concrete (Grey)
      "#2ECC71", // Emerald (Green)
      "#2980B9", // Belize Hole (Blue)
      "#F39C12", // Orange (Orange)
      "#8E44AD", // Wisteria (Purple)
      "#C0392B", // Pomegranate (Red)
      "#BDC3C7", // Silver (Grey)
      "#16A085", // Green Sea (Green)
      "#34495E", // Wet Asphalt (Blue)
      "#D35400", // Pumpkin (Orange)
      "#7F8C8D", // Asbestos (Grey)
      "#27AE60", // Nephritis (Green)
      "#2C3E50", // Midnight Blue (Blue)
      "#E67E22", // Carrot (Orange)
      "#ECF0F1"  // Clouds (Grey)
    ],
    legendSquareSize: 45, // Size in pixels for the colored square in the reports table
  },
  
  //===================================================================================
  // ===== APP OPTIONS ====
  //===================================================================================
  appOption: {
    "Start...": async function(app) {
      try { await this._start(app); } catch (err) { console.log(err); await app.alert(err); }
    },

    "Stop": async function(app) {
      try { await this._stop(app); } catch (err) { console.log(err); await app.alert(err); }
    },
    
    "Tracked Today": async function(app) {
      try { 
        await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await this._generateReport(app, "today"); 
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked Yesterday": async function(app) {
      try {
        await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await this._generateReport(app, "yesterday");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked This Week": async function(app) {
      try {
        await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await this._generateReport(app, "this week");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked Last Week": async function(app) {
      try {
        await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await this._generateReport(app, "last week");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked This Month": async function(app) {
      try {
        await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await this._generateReport(app, "this month");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked Last Month": async function(app) {
      try {
        await this._loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await this._generateReport(app, "last month");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },
  },

  //===================================================================================
  // ==== MAIN ENTRY POINTS ====
  //===================================================================================
  /*
   * Starts a new task. Adds a new row in the dashboard. Will prompt to stop existing tasks if any.
   */
  async _start(app) {
    console.log(`_start()`);
    let dash = await this._ensureDashboardNote(app);
    let isTaskRunning = await this._isTaskRunning(app, dash);
    console.log(`Task running: ${isTaskRunning}`);
    // Decide if we stop any currently running tasks
    if (isTaskRunning) {
      // Task names as found in the Dashboard are usually Markdown links to Amplenotes
      let runningTaskName = this._getLinkText(isTaskRunning);
      let result = await app.prompt(`${runningTaskName} is already running. Would you like to stop it first?`,
        {
          inputs: [
            {
              type: "radio",
              options: [
                { label: "Stop current task", value: true },
                { label: "Keep current task (and cancel)", value: false },
              ]
            }
          ]
        }
      )
      if (!result) {
        console.log("Cancelling...");
        return;
      }
      console.log(`Stopping current task...`);
      this._stopTask(app, dash);
    }
    
    // What task are we starting?
    let target = await this._promptTarget(app);
    console.log(`Starting Task ${target.name}...`);
    let currentTime = await this._getCurrentTime();
    await this._logStartTime(app, dash, target, currentTime);

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    let runningTaskDuration = await this._getTaskDurations(
      app, this._makeNoteLink(target), startDate, endDate
    );
    if (runningTaskDuration.length == 0) runningTaskDuration = [{'Duration': "00:00:00"}];
    let alertAction = await app.alert(
      `${target.name} started successfully. Logged today: ${runningTaskDuration[0]['Duration']}`,
      {
        actions: [{label: "Visit Dashboard", icon: "assignment"}]
      }
    )
    if (alertAction == 0) {
      app.navigate(`https://www.amplenote.com/notes/${dash.uuid}`);
    }
    console.log(`${target.name} started successfully. Logged today: ${runningTaskDuration[0]['Duration']}`);
    return true;
  },

  //===================================================================================
  /*
   * Stops the currently running task.
   */
  async _stop(app) {
    console.log(`_stop(app)`);
    let dash = await this._ensureDashboardNote(app);
    let isTaskRunning = await this._isTaskRunning(app, dash);
    // If no task is running, return
    if (!isTaskRunning) {
      console.log("No task is running at the moment.");
      await app.alert(`No task is running at the moment.`);
      return;
    }
    console.log(`Stopping current task...`);
    await this._stopTask(app, dash);

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    let runningTaskDuration = await this._getTaskDurations(app, isTaskRunning, startDate, endDate);
    let alertAction = await app.alert(
      `${this._getLinkText(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]['Duration']}`,
      {
        actions: [{label: "Visit Dashboard", icon: "assignment"}]
      }
    )
    if (alertAction == 0) {
      app.navigate(`https://www.amplenote.com/notes/${dash.uuid}`);
    }
    console.log(`${this._getLinkText(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]['Duration']}`)
    return true;
  },

  async _generateReport(app, reportType) {
    console.log(`_generateReport(), reportType: ${reportType}`);

    let startOfDay = new Date();
    let endOfDay = new Date();
    let reportTitle = this.options.noteTitleReportDaily;
    let reportParentTag = this.options.noteTagReports;
    let reportTag = `${reportParentTag}/daily`;

    // determine the start and end of day based on the report type
    if (reportType === 'yesterday') {
      startOfDay.setDate(startOfDay.getDate() - 1);
    } else if (reportType === 'this week') {
      let day = startOfDay.getDay();
      let difference = ((day < 1) ? -6 : 1) - day; // if today is Sunday, go to previous Monday
      startOfDay.setDate(startOfDay.getDate() + difference);
      reportTitle = this.options.noteTitleReportWeekly;
      reportTag = `${reportParentTag}/weekly`;
    } else if (reportType === 'last week') {
      let day = startOfDay.getDay();
      let difference = ((day < 1) ? -6 : 1) - day; // if today is Sunday, go to previous Monday
      startOfDay.setDate(startOfDay.getDate() + difference - 7);
      endOfDay = new Date(startOfDay.getTime());
      endOfDay.setDate(endOfDay.getDate() + 6);
      reportTitle = this.options.noteTitleReportWeekly;
      reportTag = `${reportParentTag}/weekly`;
    } else if (reportType === 'this month') {
      startOfDay.setDate(1);
      reportTitle = this.options.noteTitleReportMonthly;
      reportTag = `${reportParentTag}/monthly`;
    } else if (reportType === 'last month') {
      startOfDay.setMonth(startOfDay.getMonth() - 1);
      startOfDay.setDate(1);
      endOfDay.setDate(1);
      endOfDay.setDate(endOfDay.getDate() - 1);
      reportTitle = this.options.noteTitleReportMonthly;
      reportTag = `${reportParentTag}/monthly`;
    }

    startOfDay.setHours(0, 0, 0, 0);
    endOfDay.setHours(23, 59, 59, 999);

    // get task durations within the determined dates
    let taskDurations = await this._getTaskDurations(app, null, startOfDay, endOfDay);
    if (taskDurations.length == 0) {
      console.log(`Nothing logged ${reportType}.`);
      await app.alert(`Nothing logged ${reportType}.`);
      return;
    }

    // Create a new note with the results table
    reportTitle = `${reportTitle} ${this._getFormattedDate(startOfDay)}`;
    let resultsUUID = await app.createNote(`${reportTitle}`, [reportTag]);
    let resultsHandle = await app.findNote({uuid: resultsUUID});
    console.log(`Created results note with UUID ${resultsUUID}`);
    
    // Default legends in QuickChart are a bit ugly and cumbersome, so we create a legend inside the MD table
    // First we create a PNG square of the right color, then we add it as an attachment, then we insert it
    // in the actual table row
    console.log(`Creating legend squares...`);
    let legendSquares = [];
    for (let i = 0; i < taskDurations.length; i++) {
      let fileURL = await app.attachNoteMedia(
        resultsHandle, await this._createLegendSquare(this.options.colors[i])
      );
      legendSquares.push(`![](${ fileURL })`);
    }
    taskDurations = this._insertColumnInMemory(
      taskDurations, "Color", legendSquares
    );
    console.log(taskDurations);
  
    // Convert the taskDurations object to a markdown table
    let resultsTable = this._dictToMarkdownTable(taskDurations);
    console.log(resultsTable);
    
    console.log(`Inserting results in report note...`);
    await app.insertNoteContent(resultsHandle, resultsTable);

    console.log(`Generating QuickChart...`);
    let pieDataURL = await this._generatePie(taskDurations);
    const fileURL = await app.attachNoteMedia(resultsHandle, pieDataURL);
    await app.insertNoteContent(resultsHandle, `![](${ fileURL })`);
    let alertAction = await app.alert(
      `Daily report generated successfully!`,
      {
        actions: [{label: "Visit Report", icon: "donut_small"}]
      }
    )
    if (alertAction == 0) {
      app.navigate(`https://www.amplenote.com/notes/${resultsHandle.uuid}`);
    }
    console.log(`Success!`);
    return true;
  },

  //===================================================================================
  // ==== TASK MANIPULATION ====
  //===================================================================================
  /*
   * Returns a list of objects with properties "Task Name" and "Duration"
   * Computes the total duration of each task within given dates.
   * Optionally filters to only tasks that match "taskName", which must be a full MD link.
   */
  async _getTaskDurations(app, taskName, startDate, endDate) {
    console.log(`_getTaskDurations(app, ${taskName}, ${startDate}, ${endDate})`);
    let dash = await this._ensureDashboardNote(app);
    let content = await app.getNoteContent(dash);
    let tableDict = this._markdownTableToDict(content);
    console.log(tableDict);
    let entries = this._getEntriesWithinDates(tableDict, taskName, startDate, endDate);
    console.log(entries);
    if (!entries) return;
    let taskDurations = this._calculateTaskDurations(entries);
    console.log(taskDurations);
    return taskDurations;
  },
  //===================================================================================
  /*
   * Returns the name of the task that is running (usually a MD link to a note) or false otherwise
   */
  async _isTaskRunning(app, dash) {
    console.log(`_isTaskRunning(${dash})`);
    let content = await app.getNoteContent(dash);
    const table = this._markdownTableToDict(content);
    console.log(table);
    if (!table) return false;
    // Check if there is a task with a start time and no end time
    const runningTask = table.find(row => row['Task Name'] && row['Start Time'] && !row['End Time']);
    console.log(runningTask);
    if (Boolean(runningTask)) return runningTask["Task Name"];
    return false;
  },

  //=================================================================================== 
  /* 
   * Creates new row in the dashboard table, adds "Task Name" and "Start Time"
   */
  async _logStartTime(app, dash, target, currentTime) {
    console.log(`_logStartTime(${dash}, ${target}, ${currentTime})`);
    let content = await app.getNoteContent(dash);
    let tableDict = this._markdownTableToDict(content);
    console.log(tableDict);
    tableDict = this._insertRowToDict(tableDict, target, currentTime);
    console.log(tableDict);
    let updatedTableMarkdown = this._dictToMarkdownTable(tableDict);
    console.log(updatedTableMarkdown);
    const section = { heading: { text: this.options.sectionTitleDashboardTimeEntries } };
    await app.replaceNoteContent(dash, updatedTableMarkdown, {section});
    return true;
  },

  //===================================================================================
  /*
   * Stops a task by adding "Stop Time" column to the dashboard table
   */
  async _stopTask(app, dash) {
    let content = await app.getNoteContent(dash);
    let tableDict = this._markdownTableToDict(content);
    tableDict = this._addEndTimeToDict(tableDict, await this._getCurrentTime());
    let updatedTableMarkdown = this._dictToMarkdownTable(tableDict);
    const section = { heading: { text: this.options.sectionTitleDashboardTimeEntries } };
    await app.replaceNoteContent(dash, updatedTableMarkdown, {section});
    return true;
  },

  //===================================================================================
  /*
   * Gets all tasks that have entries stopping within given dates.
   * Returns a list of objects with properties "Task Name", "Start Time", "Stop Time"
   * Optionally filters to only task names matching "taskName", which must be a full MD link.
   */
  _getEntriesWithinDates(tableDict, taskName, startDate, endDate) {
    console.log(`_getEntriesWithinDates(${tableDict}, ${taskName}, ${startDate}, ${endDate}`);
    // Filter the entries that end within given dates
    console.log(startDate);
    console.log(endDate);
    let entries = tableDict.filter(row => {
      let endTime = new Date(row['End Time']);
      console.log(new Date(row['End Time']));
      return endTime >= startDate && endTime <= endDate;
    });
    if (taskName) entries = entries.filter(row => {
      return row['Task Name'] === taskName;
    })
    return entries;
  }, 
  //===================================================================================  
  /*
   * Given a list of objects with "Task Name", "Start Time" and "Stop Time", will return
   * the total duration for each task.
   */
  _calculateTaskDurations(entries) {
    console.log(`_calculateTaskDurations(${entries})`);
    let taskDurations = {};
    entries.forEach(entry => {
        let taskName = entry['Task Name'];
        let duration = this._calculateDuration(entry['Start Time'], entry['End Time']);
        // If the task has already been logged, add the new duration to the existing one
        if (taskName in taskDurations) {
            taskDurations[taskName] = this._addDurations(taskDurations[taskName], duration);
        } else {
            taskDurations[taskName] = duration;
        }
    });

    // Convert object to array and sort by duration
    let sortedTasks = Object.entries(taskDurations).sort((a, b) => {
        // Convert durations to seconds for sorting
        let aDurationInSeconds = this._durationToSeconds(a[1]);
        let bDurationInSeconds = this._durationToSeconds(b[1]);
        return bDurationInSeconds - aDurationInSeconds;
    });

    // Convert sorted array to list of objects with "Task Name" and "Duration" properties
    let sortedTaskDurations = sortedTasks.map(task => {
        return {
            "Task Name": task[0],
            "Duration": task[1]
        };
    });
    
    return sortedTaskDurations;
  },

  //===================================================================================
  /*
   * Adds the current time to every row with no End Time.
   * Returns the new dictionary.
   */
  _addEndTimeToDict(tableDict, currentTime) {
    console.log(`_addEndTimeToDict(${tableDict}, ${currentTime})`);
    // Find the row with no "End Time" and add the current time
    for (let row of tableDict) {
      if (!row["End Time"]) {
        row["End Time"] = currentTime;
        break;
      }
    }
    return tableDict;
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
    // Ensure note exists
    let dash = await app.findNote(
      { name: this.options.noteTitleDashboard, tags: [this.options.noteTagDashboard], }
    );
    console.log(dash);
    if (!dash) {
      dash = await this._createDashboardNote(
        app,
        this.options.noteTitleDashboard,
        this.options.noteTagDashboard
      );
    }
  
    // Ensure table exists
    const sections = await app.getNoteSections(dash);
    console.log(sections);
    const timeEntriesSection = sections.find(
      (section) => section.heading && 
        section.heading.text === this.options.sectionTitleDashboardTimeEntries
    );
    console.log(timeEntriesSection);
  
    if (!timeEntriesSection) {
      await app.insertNoteContent(
        dash,
        `\n## ${this.options.sectionTitleDashboardTimeEntries}\n`,
        { atEnd: true }
      );
      let tableHeader = await this._createTableHeader([
        "Task Name",
        "Start Time",
        "End Time",
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
    const note = await app.createNote(noteTitle, [noteTag]);
    const noteHandle = await app.findNote({
      name: noteTitle,
      tags: [noteTag],
    });
    return noteHandle;
  },

  //===================================================================================
  // ==== REPORT GENERATION ====
  //===================================================================================
  /*
   * Returns a data URL pointing to a square PNG of a given "color".
   * Used in the table included in the report.
   */
  async _createLegendSquare(color) {
    console.log(`_createLegendSquare(${color})`);
    // Create a canvas and get its context
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = this.options.legendSquareSize;  // size in pixels
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    console.log(canvas);
    
    function canvasToBlob(canvas) {
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      });
    };
    console.log(canvasToBlob);

    let blob = await canvasToBlob(canvas);
    console.log(blob);
    return await this._dataURLFromBlob(blob);
  },
  
  //===================================================================================
  /*
   * Generates a chart using QuickChart. Gets a list of objects with "Color", "Task Name" and "Duration"
   * Returns a data URL pointing to the chart image.
   */
  async _generatePie(taskDurations) {
    console.log(`generatePie(${taskDurations})`);
    // We don't want the whole MD link in the chart
    const labels = taskDurations.map(task => this._getLinkText(task['Task Name']));
    console.log(labels);
    const data = taskDurations.map(task => this._durationToSeconds(task['Duration']));  // Duration in hours
    console.log(data);
  
    const chart = new QuickChart();
    chart.setVersion('4');
    chart.setWidth(500)
    chart.setHeight(500);
    
    chart.setConfig({
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{ data: data, backgroundColor: this.options.colors }]
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
              dataArr.map(data => {
                sum += data;
              });
              let percentage = (value*100 / sum).toFixed(0);
              if (percentage < 7) return "";
              return percentage + "%";
            },
            color: '#fff',
          },
        },
      }
    });
    
    console.log(chart.getUrl());
    let response = await fetch(chart.getUrl());
    let blob = await response.blob();
    let dataURL = await this._dataURLFromBlob(blob);
    return dataURL;
  },

  //===================================================================================
  // ==== DATA STRUCTURES ====
  //===================================================================================
  /*
   * Inserts a new object inside the main data structure used for holding time entries
   */
  _insertRowToDict(tableDict, target, currentTime) {
    console.log(`_insertRowToDict(${tableDict}, ${target}, ${currentTime})`);
    const newRow = {
      "Task Name": `${this._makeNoteLink(target)}`,
      "Start Time": currentTime,
      "End Time": ""
    };
    // Insert new row at the beginning of the dictionary
    tableDict.unshift(newRow);
    return tableDict;
  },

  //=================================================================================== 
  /*
   * Get a data URL from a blob
   */
  _dataURLFromBlob(blob) {
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
  },

  //=================================================================================== 
  /*
   * Add a new column and fill as many values on that column in an existing table
   * "name" is a String
   * "data" is an array of values
   * "memory" is the dictionary to add to
   * Returns the new dictionary
   */
  _insertColumnInMemory(memory, name, data) {
    console.log(`_insertColumnInMemory(${memory}, ${name}, ${data})`)
    console.log(memory);
    return memory.map((obj, index) => ({
      [name]: data[index],
      ...obj
    }));
  },

  //=================================================================================== 
  // ==== AN UX ====
  //=================================================================================== 
  async _promptTarget(app) {
    let result = app.prompt(
      "What are you working on?", {
        inputs: [
          {type: "note", label: "Choose a note"},
        ],
      }
    );
    return result;
  },

  //=================================================================================== 
  // ==== TIME OPS ====
  //=================================================================================== 
  msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
  
    return hours + ":" + minutes + ":" + seconds;
  },

  //===================================================================================
  async _getCurrentTime() {
    var timezoneOffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(Date.now() - timezoneOffset)).toISOString().slice(0, -1);
    // e.g., "2023-06-25T09:11:12.037"
    
    return localISOTime;  // => '2015-01-26T06:40:36.181'
  },
    
  //=================================================================================== 
  _durationToSeconds(duration) {
    let [hours, minutes, seconds] = duration.split(':').map(Number);
    let totalSeconds = hours * 3600 + minutes * 60 + seconds;
    console.log(totalSeconds);
  
    return totalSeconds;
  },
  
  //=================================================================================== 
  _calculateDuration(startTime, endTime) {
    console.log(`_calculateDuration(${startTime}, ${endTime})`);
    // Parse start and end times
    let start = new Date(startTime);
    let end = new Date(endTime);
  
    // Calculate duration in milliseconds
    let durationMillis = end - start;
  
    // Convert milliseconds to "HH:MM:SS" format
    let hours = Math.floor(durationMillis / 3600000);
    let minutes = Math.floor((durationMillis - hours * 3600000) / 60000);
    let seconds = Math.floor((durationMillis - hours * 3600000 - minutes * 60000) / 1000);
  
    // Pad hours, minutes and seconds with leading zeros if necessary
    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');
  
    return `${hours}:${minutes}:${seconds}`;
  },

  //=================================================================================== 
  _addDurations(duration1, duration2) {
    console.log(`_addDurations(${duration1}, ${duration2})`);

    // Convert durations to seconds
    const seconds1 = this._durationToSeconds(duration1);
    const seconds2 = this._durationToSeconds(duration2);

    // Add durations
    const totalSeconds = seconds1 + seconds2;

    // Convert total seconds back to "HH:MM:SS" format
    const totalDuration = this._secondsToDuration(totalSeconds);

    return totalDuration;
  },

  //=================================================================================== 
  _secondsToDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return [hours, minutes, remainingSeconds].map(v => v < 10 ? '0' + v : v).join(':');
  },

  //=================================================================================== 
  _getFormattedDate(date) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[date.getMonth()];

    const day = date.getDate();
    let daySuffix;
    if (day > 3 && day < 21) daySuffix = "th";
    else {
        switch (day % 10) {
            case 1:  daySuffix = "st"; break;
            case 2:  daySuffix = "nd"; break;
            case 3:  daySuffix = "rd"; break;
            default: daySuffix = "th";
        }
    }

    const year = date.getFullYear();
    return `${month} ${day}${daySuffix}, ${year}`;
  },

  //=================================================================================== 
  // ==== MARKDOWN HELPERS ====
  //=================================================================================== 
  async _createTableHeader(columns) {
    console.log(`_createTableHeader(${columns}`);
      const header = columns.join (" | ");
    const separator = columns.map(() => "-").join(" | ");
    const tableHeader = `| ${header} |\n| ${separator} |`;
    return tableHeader;
  },
    
  //=================================================================================== 
  _markdownTableToDict(content) {
    console.log(`_markdownTableToDict(${content})`);
    // Extract markdown table from content
    const tableRegex = /\|(?:.*?)\n\|(?:.*?)\n\|(.*?)\n((?:\|(.*?)\n)*)/s;
    const tableMatch = content.match(tableRegex);
  
    // If no table found, return null
    if (!tableMatch) return null;
  
    // Parse headers from table
    const headers = tableMatch[1].split("|")
      .map(header => header.trim())
      .filter(header => header);  // Filter out empty headers
    
    // Parse rows from table
    const rows = tableMatch[2].split("\n").filter(row => row.trim() !== "");
  
    // Convert each row into a JavaScript object where each key is a header
    // and each value is the corresponding cell in the row
    const table = rows.map(row => {
      const cells = row.split("|")
        .map(cell => cell.trim())
        .filter(cell => cell);  // Filter out empty cells
  
      const rowObj = {};
      headers.forEach((header, i) => {
        rowObj[header] = cells[i] || null;
      });
      return rowObj;
    });
  
    return table;
  },

  //=================================================================================== 
  _dictToMarkdownTable(tableDict) {
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
  },
    
  //=================================================================================== 
  _getLinkText(text) {
    const regex = /\[(.*?)\]/;
    const match = regex.exec(text);
    return match ? match[1] : null;
  },
    
  //=================================================================================== 
  _makeNoteLink(target) {
    return `[${target.name}](https://www.amplenote.com/notes/${target.uuid})`;
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
  },
}
export default plugin;
