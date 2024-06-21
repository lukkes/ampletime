/**
 * @jest-environment jsdom
 */


import {mockApp, mockNote, mockPlugin, mockPrompter, mockTask} from "../lib/test-helpers.js";
import {_getISOStringFromDate} from "../lib/ampletime/date-time.js"
import {_generateReport, _start, _stop} from "../lib/ampletime/ampletime.js";
import {starting} from "../lib/amplefocus/amplefocus.js";

describe("within a test environment", () => {
    let app, plugin, target, dash, expectedDash;
    describe("with a newly started project", () => {
        describe("with no dashboard", () => {
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                target = mockNote("", "Test target", "2", ["tag1"]);
            })

            //----------------------------------------------------------------------------------------------------------
            it("should create the dashboard and the first entry", async () => {
                let expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  |`;

                // await _start(app, plugin.options.ampletime, target)
                await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();
                expect(app._noteRegistry["1"].body).toContain(expectedDash);
                expect(app._noteRegistry["1"].body).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \| {2}\|/s);
            })

        })

        describe("with an empty dashboard", () => {
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                target = mockNote("", "Test target", "2", ["tag1"]);
            });

            //----------------------------------------------------------------------------------------------------------
            it("should create a new entry in the dashboard", async () => {
                await app.createNote(plugin.options.ampletime.noteTitleDashboard, [plugin.options.ampletime.noteTagDashboard], "", "1");
                let expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  |`;

                await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();
                expect(app._noteRegistry["1"].body).toContain(expectedDash);
                expect(app._noteRegistry["1"].body).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \| {2}\|/s);
            });
        });

        describe("with a running task", () => {
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                plugin.options.ampletime.alwaysStopRunningTask = true;
                target = mockNote("", "Test target", "2", ["tag1"]);
                dash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  | some date |  |`;
                expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  |`;
            });

            //----------------------------------------------------------------------------------------------------------
            it("should offer to stop previous task?", async () => {
                await app.createNote(plugin.options.ampletime.noteTitleDashboard, [plugin.options.ampletime.noteTagDashboard], dash, "1");
                await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();
                expect(app._noteRegistry["1"].body).toContain(expectedDash);
                expect(app._noteRegistry["1"].body.split("\n")[4]).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \| {2}\|/s);
                expect(app._noteRegistry["1"].body.split("\n")[5]).toContain("| [Test target](https://www.amplenote.com/notes/2) |  | some date |");
                expect(app._noteRegistry["1"].body.split("\n")[5]).toMatch(/.+ \| some date \| [0-9]+-[0-9]+.+ \|/s);
            });
        });
    })

    describe("with a newly started task", () => {
        describe("with an empty dashboard", () => {
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                target = mockTask("Test target task", "1", "2");
            });

            //----------------------------------------------------------------------------------------------------------
           it("should create a new entry in the dashboard", async () => {
               await app.createNote("Test target", ["tag1"], "", "2");
               await app.createNote(plugin.options.ampletime.noteTitleDashboard, [plugin.options.ampletime.noteTagDashboard], "", "1");
               let expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) | Test target task (1) |`;

               await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();
               expect(app._noteRegistry["1"].body).toContain(expectedDash);
               expect(app._noteRegistry["1"].body).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \| {2}\|/s);
           })
        })

    })

    describe("with a report Tracked Today", () => {
        describe("with one completed task", () => {
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                mockNote("", "Test target", "2", ["tag1"]);
                let dateStart, dateStop;
                dateStart = new Date(Date.now());
                dateStart.setHours(20);
                dateStart.setMinutes(0);
                dateStart.setSeconds(0);

                dateStop = new Date(dateStart);
                dateStop.setHours(21);

                dash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |`
            });

            //----------------------------------------------------------------------------------------------------------
            it("should report the task", async () => {
                await app.createNote(plugin.options.ampletime.noteTitleDashboard, plugin.options.ampletime.noteTagDashboard, dash, "1");
                // await plugin._generateReport(app, "today");
                await expect(_generateReport(app, plugin.options.ampletime, "today")).resolves.not.toThrow();
                let resultsNote = app._noteRegistry["2"];
                expect(resultsNote.body).toContain(`| | | |
|-|-|-|
| Color | Entry Name | Duration |
| ![](undefined) | [Test target](https://www.amplenote.com/notes/2) | 01:00:00 |
![](undefined)`);
            })

    })
        describe("with four complete tasks in different quadrants", () => {
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                // const sourceNote = mockNote("", "Test target", "2", ["tag1"]);
                let dateStart, dateStop;
                dateStart = new Date(Date.now());
                dateStart.setHours(20);
                dateStart.setMinutes(0);
                dateStart.setSeconds(0);

                dateStop = new Date(dateStart);
                dateStop.setHours(21);

                dash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) | Task (extra) () (1) | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |
| [Test target](https://www.amplenote.com/notes/2) | Task (2) | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |
| [Test target](https://www.amplenote.com/notes/2) | Task (3) | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |
| [Test target](https://www.amplenote.com/notes/2) | Task (4) | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |`
            });

            //----------------------------------------------------------------------------------------------------------
            it("should report the four quadrants", async () => {
                await app.createNote(plugin.options.ampletime.noteTitleDashboard, plugin.options.ampletime.noteTagDashboard, dash, "1");
                await app.createTask("Task (extra) ()", "1", "2", true, true);
                await app.createTask("Task", "2", "2", true, false);
                await app.createTask("Task", "3", "2", false, true);
                await app.createTask("Task", "4", "2", false, false);

                // await plugin._generateReport(app, "today");
                await expect(_generateReport(app, plugin.options.ampletime, "today")).resolves.not.toThrow();
                let resultsNote = app._noteRegistry["2"];
                expect(resultsNote.body).toContain(`| | |
|-|-|
| Quadrant | Percentage |
| q1 | 25% |
| q2 | 25% |
| q3 | 25% |
| q4 | 25% |`);
            })
        })
    })

    describe("with a stop command issues", () => {
        describe("with a running task", () => {
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                plugin.options.ampletime.alwaysStopRunningTask = true;
                target = mockNote("", "Test target", "2", ["tag1"]);
                dash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  | some date |  |`;
                expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  |`;
            });

            //----------------------------------------------------------------------------------------------------------
            it("should offer to stop previous task?", async () => {
                await app.createNote(plugin.options.ampletime.noteTitleDashboard, [plugin.options.ampletime.noteTagDashboard], dash, "1");
                // await _stop(app, plugin.options.ampletime);
                await expect(_stop(app, plugin.options.ampletime)).resolves.not.toThrow();
                expect(app._noteRegistry["1"].body).toContain(expectedDash);
                expect(app._noteRegistry["1"].body.split("\n")[4]).toContain("| [Test target](https://www.amplenote.com/notes/2) |  | some date |");
                expect(app._noteRegistry["1"].body.split("\n")[4]).toMatch(/.+ \| some date \| [0-9]+-[0-9]+.+ \|/s);
            });
        });
    })

    /*
    **************************************************************
    * Amplefocus tests
    **************************************************************
    */

    describe("with a newly started focus", () => {
        describe("with no dashboard", () => {
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                plugin.options.amplefocus.workDuration = 0.1 * 1000;
                plugin.options.amplefocus.breakDuration = 0.05 * 1000;
                // let startTime = _generateStartTimeOptions()[0].value;
                plugin.options.amplefocus.mockPrompter = mockPrompter([
                    {index: 0},
                    {index: 3}, // This means 5 cycles
                    ["1", "2", "3", "4", "5", "6"],
                    [1, 3], [2, 2], [3, 3], [3, 3], [1, 3],
                    // startTime,
                    // _generateCycleOptions(startTime, plugin.options.amplefocus)[3].value, // Should be "5"
                ]);
            });

            //----------------------------------------------------------------------------------------------------------
            it("should create the dashboard and the first  entry; it should log all session details", async () => {
                const jot = await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                app.context.noteUUID = "1";
                let cycleCount = 5;
                let expectedDash = `## ${plugin.options.amplefocus.sectionTitleDashboardEntries}
|${" |".repeat(plugin.options.amplefocus.dashboardColumns.length)}
|${"-|".repeat(plugin.options.amplefocus.dashboardColumns.length)}
| ${plugin.options.amplefocus.dashboardColumns.join(" | ")} |
| [June 12th, 2024](https://www.amplenote.com/notes/1) |`;
                let expectedRowMatch = /\|.*\|.*\| 5 \| 5 \| .* \|/;
                // await plugin.insertText["Start Focus"](app);
                await expect(plugin.insertText["Start Focus"](app)).resolves.not.toThrow();
                expect(app._noteRegistry["2"].body).toContain(expectedDash);
                expect(app._noteRegistry["2"].body).toMatch(expectedRowMatch);

                // Test daily jot contents for session details
                let expectedJot = `[Focus Dashboard](https://www.amplenote.com/notes/2) for ${cycleCount} cycles
## Session overview
- **What am I trying to accomplish?**
  - 1
- **Why is this important and valuable?**
  - 2
- **How will I know this is complete?**
  - 3
- **Potential distractions? How am I going to deal with them?**
  - 4
- **Is this concrete/measurable or subjective/ambiguous?**
  - 5
- **Anything else noteworthy?**
  - 6
## Cycles
### Cycle 1
- Plan:

- Debrief:

### Cycle 2
- Plan:

- Debrief:

### Cycle 3
- Plan:

- Debrief:

### Cycle 4
- Plan:

- Debrief:

### Cycle 5
- Plan:

- Debrief:

## Session debrief
`;
                expect(app._noteRegistry["1"].body).toContain(expectedJot);
            })
        })

        describe("with an empty dashboard", () => {
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                plugin.options.amplefocus.workDuration = 0.1 * 1000;
                plugin.options.amplefocus.breakDuration = 0.05 * 1000;
                // let startTime = _generateStartTimeOptions()[0].value;
                plugin.options.amplefocus.mockPrompter = mockPrompter([
                    {index: 0},
                    {index: 3}, // This means 5 cycles
                    ["1", "2", "3", "4", "5", "6"],
                    [1, 3], [2, 2], [3, 3], [3, 3], [1, 3],
                    // startTime,
                    // _generateCycleOptions(startTime, plugin.options.amplefocus)[3].value, // Should be "5"
                ]);
            });

            //----------------------------------------------------------------------------------------------------------
            it("should create a new entry in the dashboard", async () => {
                const jot = await app.createNote("June 12th, 2024", ["daily-jots"], "{AmpleFocus:Start}", "1");
                app.context.noteUUID = "1";
                let cycleCount = 5;
                await app.createNote(plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], "", "2");
                let expectedDash = `## ${plugin.options.amplefocus.sectionTitleDashboardEntries}
|${" |".repeat(plugin.options.amplefocus.dashboardColumns.length)}
|${"-|".repeat(plugin.options.amplefocus.dashboardColumns.length)}
| ${plugin.options.amplefocus.dashboardColumns.join(" | ")} |
| [June 12th, 2024](https://www.amplenote.com/notes/1) |`;
                const expectedJotContents = `[Focus Dashboard](https://www.amplenote.com/notes/2) for 5 cycles
## Session overview
- **What am I trying to accomplish?**
  - 1
- **Why is this important and valuable?**
  - 2
- **How will I know this is complete?**
  - 3
- **Potential distractions? How am I going to deal with them?**
  - 4
- **Is this concrete/measurable or subjective/ambiguous?**
  - 5
- **Anything else noteworthy?**
  - 6
## Cycles
### Cycle 1
- Plan:

- Debrief:

### Cycle 2
- Plan:

- Debrief:

### Cycle 3
- Plan:

- Debrief:

### Cycle 4
- Plan:

- Debrief:

### Cycle 5
- Plan:

- Debrief:

## Session debrief
`;
                let expectedRowMatch = /\|.*\|.*\| 5 \| 5 \| .* \|/;
                // await plugin.insertText["Start Focus"](app);
                await expect(plugin.insertText["Start Focus"](app)).resolves.not.toThrow();
                // await _focus(app, plugin.options.amplefocus, new Date(), cycleCount);
                // await expect(_focus(app, plugin.options.amplefocus, new Date(), cycleCount)).resolves.not.toThrow();
                expect(app._noteRegistry["2"].body.split("\n").length).toBe(6);
                expect(app._noteRegistry["2"].body).toContain(expectedDash);
                expect(app._noteRegistry["2"].body).toMatch(expectedRowMatch);
                expect(app._noteRegistry["2"].body.split("\n")[5]).toMatch(/^$/);
                expect(app._noteRegistry["1"].body).toContain(expectedJotContents);
            })

            describe("with longer durations", () => {
                // TODO: find  a way to test this, maybe with some fake jest timers? Unsure how to mock the _handle functions though
                beforeEach(() => {
                    plugin.options.amplefocus.workDuration = 10 * 1000;
                    plugin.options.amplefocus.breakDuration = 0.05 * 1000;
                    let startTime = new Date();
                    plugin.options.amplefocus.mockPrompter = mockPrompter([
                        startTime.getTime(),
                        {index: 3}, // This means 5 cycles
                        ["1", "2", "3", "4", "5", "6"],
                        [1, 3], [2, 2], [3, 3], [3, 3], [1, 3],
                        // startTime,
                        // _generateCycleOptions(startTime, plugin.options.amplefocus)[3].value, // Should be "5"
                    ]);
                })

                //----------------------------------------------------------------------------------------------------------
                it("should pause a session", async () => {
                    const jot = await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                    app.context.noteUUID = "1";
                    await app.createNote(plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], "", "2");
                    let expectedRowMatch = /\|.*\|.*\| 5 \| 0 \|  \|  \|  \|/;
                    // await Promise.race([plugin.insertText["Start Focus"](app), plugin.appOption["Pause Focus"](app)]);
                    let runPromise = plugin.insertText["Start Focus"](app);
                    runPromise.then(() => console.log("yes")).catch(() => console.log("no"));
                    console.log("11111");
                    await starting;
                    console.log("22222");
                    await plugin.appOption["Pause Focus"](app);
                    console.log("3333");

                    expect(app._noteRegistry["2"].body).toMatch(expectedRowMatch);
                })

                //----------------------------------------------------------------------------------------------------------
                it("should cancel a session", async () => {
                    const jot = await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                    app.context.noteUUID = "1";
                    await app.createNote(plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], "", "2");
                    let expectedRowMatch = /\|.*\|.*\| 5 \| 0 \|  \|  \| .+ \|/;
                    // await Promise.race([plugin.insertText["Start Focus"](app), plugin.appOption["Pause Focus"](app)]);
                    let runPromise = plugin.insertText["Start Focus"](app);
                    runPromise.then(() => console.log("yes")).catch(() => console.log("no"));
                    console.log("11111");
                    await starting;
                    console.log("22222");
                    await plugin.appOption["Cancel Focus"].bind(plugin)(app);
                    console.log("3333");

                    expect(app._noteRegistry["2"].body).toMatch(expectedRowMatch);
                })

                //----------------------------------------------------------------------------------------------------------
                it("should cancel a paused session", async () => {
                    const jot = await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                    app.context.noteUUID = "1";
                    await app.createNote(plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], "", "2");
                    let expectedRowMatch = /\|.*\|.*\| 5 \| 0 \|  \|  \| .+ \|/;
                    // await Promise.race([plugin.insertText["Start Focus"](app), plugin.appOption["Pause Focus"](app)]);
                    let runPromise = plugin.insertText["Start Focus"](app);
                    runPromise.then(() => console.log("yes")).catch(() => console.log("no"));
                    await starting;
                    await plugin.appOption["Pause Focus"](app);
                    await plugin.appOption["Cancel Focus"].bind(plugin)(app);

                    expect(app._noteRegistry["2"].body).toMatch(expectedRowMatch);
                })

            })
        })

        describe("with a running session", () => {
            let app, plugin, dashContents;
            beforeEach(() => {
                app = mockApp();
                plugin = mockPlugin();
                plugin.options.amplefocus.workDuration = 0.1 * 1000;
                plugin.options.amplefocus.breakDuration = 0.05 * 1000;
                dashContents = `## ${plugin.options.amplefocus.sectionTitleDashboardEntries}
|${" |".repeat(plugin.options.amplefocus.dashboardColumns.length)}
|${"-|".repeat(plugin.options.amplefocus.dashboardColumns.length)}
| ${plugin.options.amplefocus.dashboardColumns.join(" | ")} |
| [June 12th, 2024](https://www.amplenote.com/notes/1) | 2024-06-19T16:14:36.532 | 5 | 2 |  |`;
            })

            describe("if the user abandons open session", () => {
                beforeEach(() => {
                    // let startTime = _generateStartTimeOptions()[0].value;
                    plugin.options.amplefocus.mockPrompter = mockPrompter([
                        "abandon",
                        {index: 0},
                        {index: 3}, // This means 5 cycles
                        ["1", "2", "3", "4", "5", "6"],
                        [1, 3], [2, 2], [3, 3], [3, 3], [1, 3],
                        // startTime,
                        // _generateCycleOptions(startTime, plugin.options.amplefocus)[3].value, // Should be "5"
                    ]);
                    // plugin.options.amplefocus.alwaysStopRunningTask = true;
                })

                afterEach(() => {
                    // plugin.options.amplefocus.alwaysStopRunningTask = false;
                })

                //----------------------------------------------------------------------------------------------------------
                it("should stop the open session and start the new one", async () =>  {
                    const jot = await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                    app.context.noteUUID = "1";
                    let cycleCount = 5;
                    await app.createNote(plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], dashContents, "2");
                    let expectedDash = `## ${plugin.options.amplefocus.sectionTitleDashboardEntries}
|${" |".repeat(plugin.options.amplefocus.dashboardColumns.length)}
|${"-|".repeat(plugin.options.amplefocus.dashboardColumns.length)}
| ${plugin.options.amplefocus.dashboardColumns.join(" | ")} |
| [June 12th, 2024](https://www.amplenote.com/notes/1) |`;
                    let expectedRowMatch1 = /\|.*\|.*\| 5 \| 2 \| .* \|/;
                    let expectedRowMatch2 = /\|.*\|.*\| 5 \| 5 \| 1,2,3,3,1 \| 3,2,3,3,3 \| .* \|/;
                    await plugin.insertText["Start Focus"](app);
                    // await expect(plugin.insertText["Start Focus"](app)).resolves.not.toThrow();
                    // await _focus(app, plugin.options.amplefocus, new Date(), cycleCount);
                    // await expect(_focus(app, plugin.options.amplefocus, new Date(), cycleCount)).resolves.not.toThrow();
                    expect(app._noteRegistry["2"].body).toContain(expectedDash);
                    expect(app._noteRegistry["2"].body.split("\n").length).toBe(7);
                    expect(app._noteRegistry["2"].body.split("\n")[4]).toMatch(expectedRowMatch2);
                    expect(app._noteRegistry["2"].body.split("\n")[5]).toMatch(expectedRowMatch1);
                    expect(app._noteRegistry["2"].body.split("\n")[6]).toMatch(/^$/);
                    }
                )
            })

            describe("if the user resumes the open session", () => {
                beforeEach(() => {
                    // let startTime = _generateStartTimeOptions()[0].value;
                    plugin.options.amplefocus.mockPrompter = mockPrompter([
                        "resume",
                        {index: 0},
                        [3, 3], [3, 3], [1, 3],
                        // startTime,
                        // _generateCycleOptions(startTime, plugin.options.amplefocus)[3].value, // Should be "5"
                    ]);
                    // plugin.options.amplefocus.alwaysResumeOpenTask = true;
                })
                afterEach(() => {
                    // plugin.options.amplefocus.alwaysResumeOpenTask = false;
                })

                //----------------------------------------------------------------------------------------------------------
                it("should resume the open session and leave the table intact", async () =>  {
                    const jotContents = `Some unrelated text
# **\\[16:14:36\\]** [Focus Dashboard](https://www.amplenote.com/notes/2) for 5 cycles
                    
## Session overview
- **What am I trying to accomplish?**
  - 1
- **Why is this important and valuable?**
  - 2
- **How will I know this is complete?**
  - 3
- **Potential distractions? How am I going to deal with them?**
  - 4
- **Is this concrete/measurable or subjective/ambiguous?**
  - 5
- **Anything else noteworthy?**
  - 6
  
## Cycles

### Cycle 1
- Debrief:

### Cycle 2
- Plan:

# This is an unrelated section
And this is some content

---
This is some text without a heading per se

### Cycle 4
But please don't write here`;
                    const expectedJotContents = `# **\\[16:14:36\\]** [Focus Dashboard](https://www.amplenote.com/notes/2) for 5 cycles
## Session overview
- **What am I trying to accomplish?**
  - 1
- **Why is this important and valuable?**
  - 2
- **How will I know this is complete?**
  - 3
- **Potential distractions? How am I going to deal with them?**
  - 4
- **Is this concrete/measurable or subjective/ambiguous?**
  - 5
- **Anything else noteworthy?**
  - 6
  
## Cycles
### Cycle 1
- Debrief:

### Cycle 2
- Plan:


- Debrief:

### Cycle 3
- Plan:

- Debrief:

### Cycle 4
- Plan:

- Debrief:

### Cycle 5
- Plan:

- Debrief:

## Session debrief
# This is an unrelated section
And this is some content

---
This is some text without a heading per se

### Cycle 4
But please don't write here`;
                    const jot = await app.createNote("June 12th, 2024", ["daily-jots"], jotContents, "1");
                    app.context.noteUUID = "1";
                    let cycleCount = 5;
                    await app.createNote(plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], dashContents, "2");
                    let expectedDash = `## ${plugin.options.amplefocus.sectionTitleDashboardEntries}
|${" |".repeat(plugin.options.amplefocus.dashboardColumns.length)}
|${"-|".repeat(plugin.options.amplefocus.dashboardColumns.length)}
| ${plugin.options.amplefocus.dashboardColumns.join(" | ")} |
| [June 12th, 2024](https://www.amplenote.com/notes/1) |`;
                    let expectedRowMatch2 = /\|.*\|.*\| 5 \| 5 \| 3,3,1 \| 3,3,3 \| .* \|/;
                    await plugin.insertText["Start Focus"](app);
                    // await expect(plugin.insertText["Start Focus"](app)).resolves.not.toThrow();
                    // await _focus(app, plugin.options.amplefocus, new Date(), cycleCount);
                    // await expect(_focus(app, plugin.options.amplefocus, new Date(), cycleCount)).resolves.not.toThrow();
                    expect(app._noteRegistry["2"].body).toContain(expectedDash);
                    expect(app._noteRegistry["2"].body.split("\n")[4]).toMatch(expectedRowMatch2);
                    expect(app._noteRegistry["2"].body.split("\n").length).toBe(6);
                    // expect(app._noteRegistry["2"].body.split("\n")[5]).toMatch(/^$/);
                    expect(app._noteRegistry["1"].body).toContain(expectedJotContents);
                    }
                )
            })
        })
    })

})