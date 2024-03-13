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
    let currentTime = await _getCurrentTime();
    await _logStartTime(app, dash, target, currentTime);

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    let runningTaskDuration = await _getTaskDurations(
      app, _makeNoteLink(target), startDate, endDate
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
    let isTaskRunning = await _isTaskRunning(app, dash);
    // If no task is running, return
    if (!isTaskRunning) {
      console.log("No task is running at the moment.");
      await app.alert(`No task is running at the moment.`);
      return;
    }
    console.log(`Stopping current task...`);
    await _stopTask(app, dash);

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    let runningTaskDuration = await _getTaskDurations(app, isTaskRunning, startDate, endDate);
    let alertAction = await app.alert(
      `${_getLinkText(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]['Duration']}`,
      {
        actions: [{label: "Visit Dashboard", icon: "assignment"}]
      }
    )
    if (alertAction == 0) {
      app.navigate(`https://www.amplenote.com/notes/${dash.uuid}`);
    }
    console.log(`${_getLinkText(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]['Duration']}`)
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
    let taskDurations = await _getTaskDurations(app, null, startOfDay, endOfDay);
    if (taskDurations.length == 0) {
      console.log(`Nothing logged ${reportType}.`);
      await app.alert(`Nothing logged ${reportType}.`);
      return;
    }

    // Create a new note with the results table
    reportTitle = `${reportTitle} ${_getFormattedDate(startOfDay)}`;
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
        resultsHandle, await _createLegendSquare(this.options.colors[i])
      );
      legendSquares.push(`![](${ fileURL })`);
    }
    taskDurations = _insertColumnInMemory(
      taskDurations, "Color", legendSquares
    );
    console.log(taskDurations);
  
    // Convert the taskDurations object to a markdown table
    let resultsTable = _dictToMarkdownTable(taskDurations);
    console.log(resultsTable);
    
    console.log(`Inserting results in report note...`);
    await app.insertNoteContent(resultsHandle, resultsTable);

    console.log(`Generating QuickChart...`);
    let pieDataURL = await _generatePie(taskDurations);
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

  async _startTask(app) {
    console.log("_startTask");
    await this._preStart(app);

    let task = await app.getTask(app.context.taskUUID);

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
