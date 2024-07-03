import {mockApp, mockNote, mockPlugin, mockTask} from "../lib/test-helpers.js";
import {_generateReport, _start, _stop} from "../lib/ampletime/ampletime.js";
import {_getISOStringFromDate} from "../lib/ampletime/date-time.js";

describe("within a test environment", () => {
    let app, plugin, target, dash, expectedDash;

    // Helper functions
    const setupMocks = (targetType,
                        targetContent = "",
                        targetTitle = "Test target",
                        targetId = "2",
                        targetTags = ["tag1"]) => {
        app = mockApp();
        plugin = mockPlugin();
        target = targetType === "note" ? mockNote(targetContent, targetTitle, targetId, targetTags) : mockTask(
            targetTitle, targetId, targetId);
    };

    const createHeader = () => {
        return `## Time entries\n| | | | |\n|-|-|-|-|\n| Project Name | Task Name | Start Time | End Time |`;
    }

    const createDashboard = async (entries = [], noteId = "1") => {
        const header = createHeader();
        const content = entries.join("\n");
        await app.createNote(
            plugin.options.ampletime.noteTitleDashboard, [plugin.options.ampletime.noteTagDashboard],
            `${header}\n${content}`, noteId
        );
    };

    const createDashboardEntryPattern = (projectName, taskName = "", startTime = "", endTime = "") => {
        return new RegExp(`\\| \\[${projectName}\\]\\(https://www.amplenote.com/notes/2\\) \\| ${taskName} \\| ${startTime} \\| ${endTime} \\|`);
    };

    const assertDashboard = expectedDashEntries => {
        expect(app._noteRegistry["1"].body).toContain(createHeader());
        for (let entry of expectedDashEntries) {
            expect(app._noteRegistry["1"].body).toMatch(entry);
        }
    };

    const setupDates = (startHours, stopHours) => {
        let dateStart = new Date(Date.now());
        dateStart.setHours(startHours);
        dateStart.setMinutes(0);
        dateStart.setSeconds(0);

        let dateStop = new Date(dateStart);
        dateStop.setHours(stopHours);

        return {dateStart, dateStop};
    };

    const createDashboardEntry = (projectName, taskName, dateStart, dateStop) => {
        return `| [${projectName}](https://www.amplenote.com/notes/2) | ${taskName} | ${_getISOStringFromDate(
            dateStart)} | ${dateStop ? _getISOStringFromDate(dateStop) : ""} |`;
    };

    const createResultEntry = (entryName, duration) => {
        return `| ![](undefined) | [${entryName}](https://www.amplenote.com/notes/2) | ${duration} |`;
    };

    const createQuadrantResult = (quadrants) => {
        return quadrants.map(q => `| ${q.quadrant} | ${q.percentage} |`).join("\n");
    };

    describe("with a newly started project", () => {
        describe("with no dashboard", () => {
            beforeEach(() => {
                setupMocks("note");
            });

            //----------------------------------------------------------------------------------------------------------
            it("should create the dashboard and the first entry", async () => {
                const expectedDashEntry = createDashboardEntryPattern("Test target", "", "[0-9]+-[0-9]+.+", "");
                await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();
                assertDashboard([expectedDashEntry]);
            });
        });

        describe("with an empty dashboard", () => {
            beforeEach(() => {
                setupMocks("note");
            });

            //----------------------------------------------------------------------------------------------------------
            it("should create a new entry in the dashboard", async () => {
                await createDashboard();
                const expectedDashEntry = createDashboardEntryPattern("Test target", "", "[0-9]+-[0-9]+.+", "");
                await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();
                assertDashboard([expectedDashEntry]);
            });
        });

        describe("with a running task", () => {
            beforeEach(() => {
                setupMocks("note");
                plugin.options.ampletime.alwaysStopRunningTask = true;
            });

            //----------------------------------------------------------------------------------------------------------
            it("should offer to stop previous task", async () => {
                const {dateStart} = setupDates(20, 21);
                const dashboardEntries = [
                    createDashboardEntry("Test target", "", dateStart)
                ];
                await createDashboard(dashboardEntries);
                await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();

                let expectedDash1 = createDashboardEntryPattern("Test target", "", "[0-9]+-[0-9]+.+", "");
                let expectedDash2 = createDashboardEntryPattern(
                    "Test target", "", `${_getISOStringFromDate(dateStart)}`, ".+");
                assertDashboard([expectedDash1, expectedDash2]);
            });
        });
    });

    describe("with a newly started task", () => {
        describe("with an empty dashboard", () => {
            beforeEach(() => {
                setupMocks("task", "", "Test target task");
            });

            //----------------------------------------------------------------------------------------------------------
            it("should create a new entry in the dashboard", async () => {
                await app.createNote("Test target", ["tag1"], "", "2");
                await createDashboard();
                const expectedDashEntry = createDashboardEntryPattern("Test target", "Test target task \\(2\\)", ".+");
                await expect(_start(app, plugin.options.ampletime, target)).resolves.not.toThrow();
                assertDashboard([expectedDashEntry]);
            });
        });
    });

    describe("with a report Tracked Today", () => {
        describe("with one completed task", () => {
            beforeEach(() => {
                setupMocks("note");
                let {dateStart, dateStop} = setupDates(20, 21);
                const dashboardEntry = createDashboardEntry("Test target", "", dateStart, dateStop);
                dash = [
                    dashboardEntry
                ];
            });

            //----------------------------------------------------------------------------------------------------------
            it("should report the task", async () => {
                await createDashboard(dash);
                // await expect(_generateReport(app, plugin.options.ampletime, "today")).resolves.not.toThrow();
                await _generateReport(app, plugin.options.ampletime, "today");
                let resultsNote = app._noteRegistry["2"];
                const resultEntry = createResultEntry("Test target", "01:00:00");
                expect(resultsNote.body).toContain(`| | | |
|-|-|-|
| Color | Entry Name | Duration |
${resultEntry}
![](undefined)`);
            });
        });

        describe("with four complete tasks in different quadrants", () => {
            beforeEach(() => {
                setupMocks("note");
                let {dateStart, dateStop} = setupDates(20, 21);
                dash = [
                    createDashboardEntry("Test target", "Task (extra) () (1)", dateStart, dateStop),
                    createDashboardEntry("Test target", "Task (2)", dateStart, dateStop),
                    createDashboardEntry("Test target", "Task (3)", dateStart, dateStop),
                    createDashboardEntry("Test target", "Task (4)", dateStart, dateStop),
                ];
            });

            //----------------------------------------------------------------------------------------------------------
            it("should report the four quadrants", async () => {
                await createDashboard(dash);
                await app.createTask("Task (extra) ()", "1", "2", true, true);
                await app.createTask("Task", "2", "2", true, false);
                await app.createTask("Task", "3", "2", false, true);
                await app.createTask("Task", "4", "2", false, false);

                await expect(_generateReport(app, plugin.options.ampletime, "today")).resolves.not.toThrow();
                let resultsNote = app._noteRegistry["2"];
                const quadrantResult = createQuadrantResult([
                    {quadrant: "q1", percentage: "25%"},
                    {quadrant: "q2", percentage: "25%"},
                    {quadrant: "q3", percentage: "25%"},
                    {quadrant: "q4", percentage: "25%"}
                ]);
                expect(resultsNote.body).toContain(`| | |
|-|-|
| Quadrant | Percentage |
${quadrantResult}`);
            });
        });
    });

    describe("with a stop command issued", () => {
        describe("with a running task", () => {
            beforeEach(() => {
                setupMocks("note");
                plugin.options.ampletime.alwaysStopRunningTask = true;
                expectedDash = createDashboardEntryPattern("Test target", "", ".+", ".+");
            });

            //----------------------------------------------------------------------------------------------------------
            it("should offer to stop previous task", async () => {
                const {dateStart, dateStop} = setupDates(20, 21);
                const dashboardEntries = [
                    createDashboardEntry("Test target", "", dateStart, dateStop)
                ];
                await createDashboard(dashboardEntries);
                await expect(_stop(app, plugin.options.ampletime)).resolves.not.toThrow();
                assertDashboard([expectedDash]);
            });
        });
    });
});
