import {
  _focus,
  _preStart,
  _promptInput,
  timerController,
  pauseSession,
  stopTimers,
  runningCriticalCode,
  cancelSession,
  _writeEndTime,
  _calculateEndTime, _renderEmbed, currentCycle, sessionCycleCount, sessionEndTime, sleepUntil, state,
} from "./amplefocus/amplefocus.js";
import {_generateReport, _loadScript, _promptTarget, _start, _stop} from "./ampletime/ampletime.js";
import {initAmplefocus} from "./amplefocus/amplefocus.js";
import {_ensureDashboardNote, _isTaskRunning} from "./ampletime/dashboard.js";

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
        "Energy Logs", // Comma-separated values (1-3)
        "Morale Logs", // Comma-separated values (1-3)
        "End Time"],
      workDuration: 30 * 1000, // ms
      breakDuration: 10 * 1000, // ms
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

    "Pause Focus": async function(app) {
      try {
        // TODO:
        //  - add alerts for pause and cancel
        //  - only pause and cancel when there is something to pause and cancel
        console.log("Attempting to pause Amplefocus session...");
        await stopTimers();
        pauseSession();
        await runningCriticalCode;
      } catch (err) {
        console.log(err);
        app.alert(err);
        throw(err);
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
        throw(err);
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
        console.log("Starting Amplefocus...");
        initAmplefocus();
        let dash = await _preStart(app, this.options.amplefocus);
        if (!dash) return;

        const [startTime, cycleCount] = await _promptInput(app, this.options.amplefocus);
        await _focus(app, this.options.amplefocus, dash, startTime, cycleCount);
      } catch (err) {
        console.log(err);
        app.alert(err);
        throw(err);
      }
    },
  },

  async onEmbedCall(app, ...args) {
    console.log("ey?");
    return {
      ampletime: { project: null },
      amplefocus: {
        sleepUntil: sleepUntil,
        currentCycle: currentCycle,
        cycleCount: sessionCycleCount,
        sessionEnd: sessionEndTime,
        status: state,
      },
    }
  },

  renderEmbed: (app, ...args) => _renderEmbed(app, ...args),
}
export default plugin;
