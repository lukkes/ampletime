import {_focus, _promptInput} from "./amplefocus/amplefocus.js";
import {_generateReport, _loadScript, _promptTarget, _start, _stop} from "./ampletime/ampletime.js";

const plugin = {
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

    amplefocus: {
      noteTitleDashboard: "Focus Dashboard",
      noteTagDashboard: "amplework/focus",
      sectionTitleDashboardEntries: "Sessions",
      dashboardColumns: [
        "Source Note",
        "Start Time",
        "Cycle Count",
        "Cycle Progress", // How many cycles were completed fully
        "End Time"],
      workDuration: 30 * 60 * 1000, // ms
      breakDuration: 20 * 60 * 1000, // ms
      updateInterval: 10 * 1000, // ms
      alwaysStopRunningTask: false,
      alwaysResumeOpenTask: false,
      initialQuestions: [
        "What am I trying to accomplish?",
        "Why is this important and valuable?",
        "How will I know this is complete?",
        "Potential distractions? How am I going to deal with them?",
        "Is this concrete/measurable or subjective/ambiguous?",
        "Anything else noteworthy?",
      ],
      cycleStartQuestions: [
        "What am I trying to accomplish this cycle?",
        "How will I get started?",
        "Any hazards? How will I counter them?",
      ],
      cycleEndQuestions: [
        "Any distractions?",
        "Anything noteworthy?",
        "Things to improve next cycle?",
      ],
    }
  },
  
  //===================================================================================
  // ===== APP OPTIONS ====
  //===================================================================================
  appOption: {
    "Start...": async function(app) {
      let target = await _promptTarget(app);
      try { await _start(app, this.options.ampletime, target); } catch (err) { console.log(err); await app.alert(err); }
    },

    "Stop": async function(app) {
      try { await _stop(app); } catch (err) { console.log(err); await app.alert(err); }
    },
    
    "Tracked Today": async function(app) {
      try { 
        await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await _generateReport(app, this.options.ampletime, "today");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked Yesterday": async function(app) {
      try {
        await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await _generateReport(app, this.options.ampletime, "yesterday");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked This Week": async function(app) {
      try {
        await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await _generateReport(app, this.options.ampletime, "this week");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked Last Week": async function(app) {
      try {
        await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await _generateReport(app, this.options.ampletime, "last week");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked This Month": async function(app) {
      try {
        await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await _generateReport(app, this.options.ampletime, "this month");
      } catch (err) { console.log(err); /*await app.alert(err);*/ }
    },

    "Tracked Last Month": async function(app) {
      try {
        await _loadScript("https://cdn.jsdelivr.net/npm/quickchart-js@3.1.2/build/quickchart.min.js");
        await _generateReport(app, this.options.ampletime, "last month");
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
          await _start(app, this.options.ampletime, target);
        } catch (err) {
          console.log(err);
          await app.alert(err);
        }
      },

      async check(app) {
        if (app.context.taskUUID) return true;
      }
    },

    "Start Focus": async function(app) {
      try {
        const [startTime, cycleCount] = await _promptInput(app, options);
        await _focus(app, this.options.amplefocus, startTime, cycleCount);
      } catch (err) {
        console.log(err);
        app.alert(err);
      }
    },
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
