import { _createTableHeader, _makeNoteLink, _getLinkText, _dictToMarkdownTable} from "./markdown.js"
import {_isTaskRunning, _logStartTime, _getTaskDurations, _stopTask, _getTaskDistribution} from "./tasks.js"
import { _getCurrentTime, _getFormattedDate } from "./date-time.js";
import {_createLegendSquare, _generateDurationsReport, _generatePie, _generateQuadrantReport} from "./reports.js";
import {_insertColumnInMemory} from "./data-structures.js"
import {_getEntryName} from "./entries.js";

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
    alwaysStopRunningTask: false,
  },
  
  //===================================================================================
  // ===== APP OPTIONS ====
  //===================================================================================
  appOption: {
    "Start...": async function(app) {
      let target = await this._promptTarget(app);
      try { await this._start(app, target); } catch (err) { console.log(err); await app.alert(err); }
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
  // ===== INSERT TEXT ====
  //===================================================================================
  insertText: {
    "Start This Task": {
      async run(app) {
        try {
          // Step 1
          // Need to remove the plugin invocation command from the task decription
          await app.context.replaceSelection("");
          let currentNote = await app.getNoteContent({uuid: app.context.noteUUID});
          let target = await app.getTask(app.context.taskUUID);
          // Sometimes fetching the task returns the version before Step 1, so wait for it to update
          while (true) {
            if (currentNote.includes(target.content)) break;
            target = await app.getTask(app.context.taskUUID);
            await new Promise(r => setTimeout(r, 500));
          }
          console.log(target.content);
          await this._start(app, target);
        } catch (err) {
          console.log(err);
          await app.alert(err);
        }
      },

      async check(app) {
        if (app.context.taskUUID) return true;
      }
    },
  },

  //===================================================================================
  // ==== MAIN ENTRY POINTS ====
  //===================================================================================
  async _preStart(app) {
    console.log('_preStart()');
    let dash = await this._ensureDashboardNote(app);
    let isTaskRunning = await _isTaskRunning(app, dash);
    console.log(`Task running: ${isTaskRunning}`);
    // Decide if we stop any currently running tasks
    if (isTaskRunning) {
      // Task names as found in the Dashboard are usually Markdown links to Amplenotes
      let runningTaskName = _getEntryName(isTaskRunning);
      if (this.options.alwaysStopRunningTask) {
        await _stopTask(app, dash, this.options);
      } else {
        let result = await app.prompt(`${runningTaskName} is already running. Would you like to stop it first?`,
            {
              inputs: [
                {
                  type: "radio",
                  options: [
                    {label: "Stop current task", value: true},
                    {label: "Keep current task (and cancel)", value: false},
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
        await _stopTask(app, dash, this.options);
      }
    }
    return dash;
  },

  /*
   * Starts a new task. Adds a new row in the dashboard. Will prompt to stop existing tasks if any.
   */
  async _start(app, target) {
    // Ensure dashboard exists
    let dash = await this._preStart(app);
    if (!dash) return;

    // Determine whether we are starting a task or a project
    let toStart;
    if (target.score !== undefined) {
      let source = await app.findNote({uuid: target.noteUUID});
      toStart = {
        type: "task",
        data: {
          projectName: _makeNoteLink(source),
          taskName: `${target.content.slice(0, 20)} (${target.uuid})`
        }
      }
    } else {
      toStart = {
        type: "project",
        data: {
          projectName: _makeNoteLink(target),
          taskName: ""
        }
      }
    }
    console.log(`Starting ${toStart.type} ${_getEntryName(toStart)}...`);

    // Display how much the current task has been running for today
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    let runningTaskDuration = await _getTaskDurations(
      app, dash, toStart, startDate, endDate
    );
    if (runningTaskDuration.length === 0) runningTaskDuration = [{'Duration': "00:00:00"}];
    let alertAction = await app.alert(
      `${toStart.data.taskName ? toStart.data.taskName : target.name} started successfully. Logged today: ${runningTaskDuration[0]['Duration']}`,
      {
        actions: [{label: "Visit Dashboard", icon: "assignment"}]
      }
    )
    if (alertAction === 0) {
      app.navigate(`https://www.amplenote.com/notes/${dash.uuid}`);
    }

    // Log the start time of the current task/project
    let currentTime = await _getCurrentTime();
    await _logStartTime(app, dash, toStart, currentTime, this.options);
    app.openSidebarEmbed(1, _getEntryName(toStart), runningTaskDuration[0]["Duration"]);

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
    await _stopTask(app, dash, this.options);

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    let runningTaskDuration = await _getTaskDurations(app, dash, isTaskRunning, startDate, endDate);
    let alertAction = await app.alert(
      `${_getEntryName(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]['Duration']}`,
      {
        actions: [{label: "Visit Dashboard", icon: "assignment"}]
      }
    )
    if (alertAction === 0) {
      app.navigate(`https://www.amplenote.com/notes/${dash.uuid}`);
    }
    console.log(`${_getEntryName(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]['Duration']}`)
    return true;
  },

  async _generateReport(app, reportType) {
    console.log(`_generateReport(), reportType: ${reportType}`);

    let startOfDay = new Date();
    let endOfDay = new Date();
    let reportTitle = this.options.noteTitleReportDaily;
    let reportParentTag = this.options.noteTagReports;
    let reportTag = `${reportParentTag}/daily`;
    let dash = await this._ensureDashboardNote(app);

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

    // Create a new note with the results table
    reportTitle = `${reportTitle} ${_getFormattedDate(startOfDay)}`;
    let resultsUUID = await app.createNote(`${reportTitle}`, [reportTag]);
    let resultsHandle = await app.findNote({uuid: resultsUUID});
    console.log(`Created results note with UUID ${resultsUUID}`);

    // get task durations within the determined dates
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
          actions: [{label: "Visit Report", icon: "donut_small"}]
        }
    )
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
      let tableHeader = await _createTableHeader([
        "Project Name",
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
    await app.createNote(noteTitle, [noteTag]);
    return await app.findNote({
      name: noteTitle,
      tags: [noteTag],
    });
  },

  //===================================================================================
  // ==== AN UX ====
  //=================================================================================== 
  async _promptTarget(app) {
    return await app.prompt(
      "What are you working on?", {
        inputs: [
          {type: "note", label: "Choose a note"},
        ],
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
  },

  renderEmbed(app, ...args) {
    let currentRunningTaskName = args[0];
    let currentRunningTaskTime = args[1];
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Stopwatch</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 50px;
        }
        .stopwatch {
            font-size: 20px;
        }
    </style>
</head>
<body>
    <div class="stopwatch">
        <div id="currentTask">${currentRunningTaskName}</div>
        <div id="currentTimer">00:00:00</div>
        <div id="startTime">Start Time: </div>
        <div id="totalRunningTime">Total Running Time Today: </div>
    </div>

    <script>
        let startTime;
        let timerInterval;

        // Function to format time in HH:MM:SS
        function formatTime(seconds) {
            const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
            const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
            const secs = String(seconds % 60).padStart(2, '0');
            return \`\${hrs}:\${mins}:\${secs}\`;
        }

        // Function to get total running time for today (mock implementation)
        function getTotalRunningTimeForToday() {
            // Assuming this function returns the total running time for today in seconds
            return ${currentRunningTaskTime};
        }

        // Function to start the stopwatch
        function startStopwatch() {
            startTime = new Date();
            document.getElementById('startTime').innerText = \`Start Time: \${startTime.toLocaleTimeString()} \`;
            document.getElementById('totalRunningTime').innerText = \`Total Running Time Today: \${formatTime(getTotalRunningTimeForToday())} \`;
            timerInterval = setInterval(updateTimer, 1000);
        }

        // Function to update the current timer
        function updateTimer() {
            const now = new Date();
            const elapsedTime = Math.floor((now - startTime) / 1000);
            document.getElementById('currentTimer').innerText = formatTime(elapsedTime);
        }

        // Start the stopwatch when the page loads
        // window.onload = startStopwatch;
        startStopwatch();
    </script>
</body>
</html>
`;

  }
}
export default plugin;
