import {
  _focus,
  _preStart,
  pauseSession,
  stopTimers,
  runningCriticalCode,
  cancelSession,
  setSignal,
  currentSessionCycle,
  sessionCycleCount,
  sessionEndTime,
  status,
  moraleValues,
  energyValues,
  completionValues, sleepUntil,
} from "./amplefocus/amplefocus.js";
import {_generateReport, _loadScript, _promptTarget, _start, _stop} from "./ampletime/ampletime.js";
import {initAmplefocus} from "./amplefocus/amplefocus.js";
import {_ensureDashboardNote, _isTaskRunning} from "./ampletime/dashboard.js";
import {_writeEndTime, appendToHeading} from "./amplefocus/logWriter.js";
import {_dataURLFromBlob} from "./data-structures.js";
import {_promptInput} from "./amplefocus/prompts.js";

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
      settings: {
        "Work phase duration (in minutes)": "workDuration",
        "Break phase duration (in minutes)": "breakDuration",
      },
      noteTitleDashboard: "Focus Dashboard",
      noteTagDashboard: "amplework/focus",
      sectionTitleDashboardEntries: "Sessions",
      dashboardColumns: [
        "Source Note",
        "Start Time",
        "Cycle Count",
        "Cycle Progress", // How many cycles were completed fully
        "Completion Logs",  //Comma-separate values
        "Energy Logs", // Comma-separated values
        "Morale Logs", // Comma-separated values
        "End Time"],
      workDuration: 30 * 60 * 1000, // ms
      breakDuration: 10 * 60 * 1000, // ms
      alwaysStopRunningTask: false,
      alwaysResumeOpenTask: false,
      initialQuestions: [
        "What am I trying to accomplish?",
        "Why is this important and valuable?",
        "How will I know this is complete?",
        "Potential distractions? How am I going to deal with them?",
        "Anything else noteworthy?",
      ],
      cycleStartQuestions: [
        "What am I trying to accomplish this cycle? Can I complete it in 30 minutes?",
        "How will I get started?",
        "Any hazards? How will I counter them?",
      ],
      cycleEndQuestions: [
        "Did you complete the cycle's targets? If not, what went wrong?",
        "Any distractions?",
        "What should I improve for the next cycle?",
      ],
      finalQuestions: [
          "What did I get done in this session?",
          "What should I work on during the next session?",
          "Did I get bogged down? Where?",
          "Want went well in this session? How can I make sure to replicate this in the future?",
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
          sleepUntil: sleepUntil,
          currentCycle: currentSessionCycle,
          cycleCount: sessionCycleCount,
          sessionEnd: sessionEndTime,
          status: status,
          moraleValues: moraleValues,
          energyValues: energyValues,
          completionValues: completionValues,
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
        setSignal("pause");
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
        throw(err);
      }
    },

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
      throw(err);
    }
  },

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

  //===================================================================================
  // ===== INSERT TEXT ====
  //===================================================================================
  insertText: {
    "Start Focus": async function(app, handlePastCycles=false) {
      try {
        console.log("Starting Amplefocus...");
        this.noteUUID = app.context.noteUUID;
        initAmplefocus(app, this.options.amplefocus);
        let dash = await _preStart(app, this.options.amplefocus, handlePastCycles);
        if (!dash) return;

        const [startTime, cycleCount] = await _promptInput(app, this.options.amplefocus);
        await _focus(app, this.options.amplefocus, dash, startTime, Number(cycleCount), handlePastCycles);
      } catch (err) {
        console.log(err);
        app.alert(err);
        throw(err);
      }
    },
  },

  async onEmbedCall(app, ...args) {
    if (args.length === 1 && args[0] === "end-cycle") {
      return await this["End Cycle Early"]();
    } else if(args.length === 2) {
      if (args[0] === "clipboard") {
        let note = this.noteUUID;
        let noteHandle = await app.findNote({uuid: note});
        let base64Image = args[1];
        let res = await fetch(base64Image);
        let blob = await res.blob();
        await app.alert("🎉 Your graph was copied to the clipboard (and inserted into your session debrief)");
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
}
export default plugin;
