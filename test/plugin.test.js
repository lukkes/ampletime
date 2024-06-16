/**
 * @jest-environment jsdom
 */


import {mockApp, mockNote, mockPlugin, mockTask} from "../lib/test-helpers.js";
import {_getISOStringFromDate} from "../lib/ampletime/date-time.js"
import {_generateReport, _start, _stop} from "../lib/ampletime/ampletime.js";
import {_focus, _startSession} from "../lib/amplefocus/amplefocus.js";

describe("within a test environment", () => {
    describe("with a newly started project", () => {
        describe("with no dashboard", () => {
            const app = mockApp();
            const plugin = mockPlugin();
            const target = mockNote("", "Test target", "2", ["tag1"]);
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
                expect(app._noteRegistry["1"].body).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \|  \|/s);
            })

        })

        describe("with an empty dashboard", () => {
            const app = mockApp();
            const plugin = mockPlugin();
            const target = mockNote("", "Test target", "2", ["tag1"]);

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
                expect(app._noteRegistry["1"].body).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \|  \|/s);
            });
        });

        describe("with a running task", () => {
            const app = mockApp();
            const plugin = mockPlugin();
            plugin.options.ampletime.alwaysStopRunningTask = true;
            const target = mockNote("", "Test target", "2", ["tag1"]);
            const dash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  | some date |  |`;
            const expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  |`;

            //----------------------------------------------------------------------------------------------------------
            it("should offer to stop previous task?", async () => {
                await app.createNote(plugin.options.ampletime.noteTitleDashboard, [plugin.options.ampletime.noteTagDashboard], dash, "1");
                await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();
                expect(app._noteRegistry["1"].body).toContain(expectedDash);
                expect(app._noteRegistry["1"].body.split("\n")[4]).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \|  \|/s);
                expect(app._noteRegistry["1"].body.split("\n")[5]).toContain("| [Test target](https://www.amplenote.com/notes/2) |  | some date |");
                expect(app._noteRegistry["1"].body.split("\n")[5]).toMatch(/.+ \| some date \| [0-9]+-[0-9]+.+ \|/s);
            });
        });
    })

    describe("with a newly started task", () => {
        describe("with an empty dashboard", () => {
            const app = mockApp();
            const plugin = mockPlugin();
            const target = mockTask("Test target task", "1", "2");

            //----------------------------------------------------------------------------------------------------------
           it("should create a new entry in the dashboard", async () => {
               const sourceNoteUUID = await app.createNote("Test target", ["tag1"], "", "2");
               await app.createNote(plugin.options.ampletime.noteTitleDashboard, [plugin.options.ampletime.noteTagDashboard], "", "1");
               let expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) | Test target task (1) |`;

               await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();
               expect(app._noteRegistry["1"].body).toContain(expectedDash);
               expect(app._noteRegistry["1"].body).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \|  \|/s);
           })
        })

    })

    describe("with a report Tracked Today", () => {
        describe("with one completed task", () => {
            const app = mockApp();
            const plugin = mockPlugin();
            const target = mockNote("", "Test target", "2", ["tag1"]);
            let dateStart, dateStop;
            dateStart = new Date(Date.now());
            dateStart.setHours(20);
            dateStart.setMinutes(0);
            dateStart.setSeconds(0);

            dateStop = new Date(dateStart);
            dateStop.setHours(21);

            const dash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |`

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
            const app = mockApp();
            const plugin = mockPlugin();
            // const sourceNote = mockNote("", "Test target", "2", ["tag1"]);
            let dateStart, dateStop;
            dateStart = new Date(Date.now());
            dateStart.setHours(20);
            dateStart.setMinutes(0);
            dateStart.setSeconds(0);

            dateStop = new Date(dateStart);
            dateStop.setHours(21);

            const dash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) | Task (extra) () (1) | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |
| [Test target](https://www.amplenote.com/notes/2) | Task (2) | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |
| [Test target](https://www.amplenote.com/notes/2) | Task (3) | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |
| [Test target](https://www.amplenote.com/notes/2) | Task (4) | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |`

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

                return
                expect(resultsNote.body).toContain(`| | | |
|-|-|-|
| Color | Entry Name | Duration |
| ![](undefined) | [Test target](https://www.amplenote.com/notes/2) | 01:00:00 |
![](undefined)`);
            })
        })
    })

    describe("with a stop command issues", () => {
        describe("with a running task", () => {
            const app = mockApp();
            const plugin = mockPlugin();
            plugin.options.ampletime.alwaysStopRunningTask = true;
            const target = mockNote("", "Test target", "2", ["tag1"]);
            const dash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  | some date |  |`;
            const expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  |`;

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
            const app = mockApp();
            const plugin = mockPlugin();
            plugin.options.amplefocus.workDuration = 0.1 * 1000;
            plugin.options.amplefocus.breakDuration = 0.05 * 1000;

            //----------------------------------------------------------------------------------------------------------
            it("should create the dashboard and the first  entry", async () => {
                const jot = await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                app.context.noteUUID = "1";
                let cycleCount = 5;
                let expectedDash = `## ${plugin.options.amplefocus.sectionTitleDashboardEntries}
| | | | | |
|-|-|-|-|-|
| ${plugin.options.amplefocus.dashboardColumns.join(" | ")} |
| [June 12th, 2024](https://www.amplenote.com/notes/1) |`;
                let expectedRowMatch = /\|.*\|.*\| 5 \| 0 \|  \|/;
                await _focus(app, plugin.options.amplefocus, new Date(), cycleCount);
                // await expect(_focus(app, plugin.options.amplefocus, new Date(), cycleCount)).resolves.not.toThrow();
                expect(app._noteRegistry["2"].body).toContain(expectedDash);
                expect(app._noteRegistry["2"].body).toMatch(expectedRowMatch);
            })
            
        })
    })
})