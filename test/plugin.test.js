/**
 * @jest-environment jsdom
 */


import {mockApp, mockNote, mockPlugin, mockTask} from "../lib/test-helpers.js";
import {_getISOStringFromDate} from "../lib/date-time.js"

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

                await plugin._start(app, target)
                // await expect(plugin._start(app, target)).resolves.not.toThrow();
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
                await app.createNote(plugin.options.noteTitleDashboard, [plugin.options.noteTagDashboard], "", "1");
                let expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) |  |`;

                await expect(plugin._start(app, target)).resolves.not.toThrow();
                expect(app._noteRegistry["1"].body).toContain(expectedDash);
                expect(app._noteRegistry["1"].body).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \|  \|/s);
            });
        });

        describe("with a running task", () => {
            const app = mockApp();
            const plugin = mockPlugin();
            plugin.options.alwaysStopRunningTask = true;
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
                await app.createNote(plugin.options.noteTitleDashboard, [plugin.options.noteTagDashboard], dash, "1");
                await expect(plugin._start(app, target)).resolves.not.toThrow();
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
               await app.createNote(plugin.options.noteTitleDashboard, [plugin.options.noteTagDashboard], "", "1");
               let expectedDash = `## Time entries
| | | | |
|-|-|-|-|
| Project Name | Task Name | Start Time | End Time |
| [Test target](https://www.amplenote.com/notes/2) | Test target task (1) |`;

               await expect(plugin._start(app, target)).resolves.not.toThrow();
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
                await app.createNote(plugin.options.noteTitleDashboard, plugin.options.noteTagDashboard, dash, "1");
                // await plugin._generateReport(app, "today");
                await expect(plugin._generateReport(app, "today")).resolves.not.toThrow();
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
                await app.createNote(plugin.options.noteTitleDashboard, plugin.options.noteTagDashboard, dash, "1");
                await app.createTask("Task (extra) ()", "1", "2", true, true);
                await app.createTask("Task", "2", "2", true, false);
                await app.createTask("Task", "3", "2", false, true);
                await app.createTask("Task", "4", "2", false, false);

                // await plugin._generateReport(app, "today");
                await expect(plugin._generateReport(app, "today")).resolves.not.toThrow();
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
            plugin.options.alwaysStopRunningTask = true;
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
                await app.createNote(plugin.options.noteTitleDashboard, [plugin.options.noteTagDashboard], dash, "1");
                await plugin._stop(app);
                // await expect(plugin._stop(app)).resolves.not.toThrow();
                expect(app._noteRegistry["1"].body).toContain(expectedDash);
                expect(app._noteRegistry["1"].body.split("\n")[4]).toContain("| [Test target](https://www.amplenote.com/notes/2) |  | some date |");
                expect(app._noteRegistry["1"].body.split("\n")[4]).toMatch(/.+ \| some date \| [0-9]+-[0-9]+.+ \|/s);
            });
        });
    })
})