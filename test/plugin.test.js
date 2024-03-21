/**
 * @jest-environment jsdom
 */


import {mockApp, mockNote, mockPlugin} from "../lib/test-helpers.js";
import {_getISOStringFromDate} from "../lib/date-time.js"

describe("within a test environment", () => {
    describe("with a newly started test", () => {
        describe("with no dashboard", () => {
            const app = mockApp();
            const plugin = mockPlugin();
            const target = mockNote("", "Test target", "2", ["tag1"]);
            //----------------------------------------------------------------------------------------------------------
            it("should create the dashboard and the first entry", async () => {
                let expectedDash = `## Time entries
| Task Name | Start Time | End Time |
| - | - | - |
| [Test target](https://www.amplenote.com/notes/2) |`;

                await expect(plugin._start(app, target)).resolves.not.toThrow();
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
| Task Name | Start Time | End Time |
| - | - | - |
| [Test target](https://www.amplenote.com/notes/2) |`;

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
| Task Name | Start Time | End Time |
| - | - | - |
| [Test target](https://www.amplenote.com/notes/2) | some date |  |`;
            const expectedDash = `## Time entries
| Task Name | Start Time | End Time |
| - | - | - |
| [Test target](https://www.amplenote.com/notes/2) | `;

            //----------------------------------------------------------------------------------------------------------
            it("should offer to stop previous task?", async () => {
                await app.createNote(plugin.options.noteTitleDashboard, [plugin.options.noteTagDashboard], dash, "1");
                await expect(plugin._start(app, target)).resolves.not.toThrow();
                expect(app._noteRegistry["1"].body).toContain(expectedDash);
                expect(app._noteRegistry["1"].body.split("\n")[3]).toMatch(/\| .+ \| [0-9]+-[0-9]+.+ \|  \|/s);
                expect(app._noteRegistry["1"].body.split("\n")[4]).toContain("| [Test target](https://www.amplenote.com/notes/2) | some date |");
                expect(app._noteRegistry["1"].body.split("\n")[4]).toMatch(/\| .+ \| some date \| [0-9]+-[0-9]+.+ \|/s);
            });
        });
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
| Task Name | Start Time | End Time |
| - | - | - |
| [Test target](https://www.amplenote.com/notes/2) | ${_getISOStringFromDate(dateStart)} | ${_getISOStringFromDate(dateStop)} |`

            //----------------------------------------------------------------------------------------------------------
            it("should report the task", async () => {
                await app.createNote(plugin.options.noteTitleDashboard, plugin.options.noteTagDashboard, dash, "1");
                // await plugin._generateReport(app, "today");
                await expect(plugin._generateReport(app, "today")).resolves.not.toThrow();
                let resultsNote = app._noteRegistry["2"];
                expect(resultsNote.body).toContain(`| Color | Task Name | Duration |
| - | - | - |
| ![](undefined) | [Test target](https://www.amplenote.com/notes/2) | 01:00:00 |
![](undefined)`);
            })

    })
    })
})