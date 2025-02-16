/**
 * @jest-environment jsdom
 */

import {mockApp, mockPlugin, mockPrompter} from "../lib/test-helpers.js";
import {starting} from "../lib/amplefocus/amplefocus.js";
import {_getISOStringFromDate} from "../lib/ampletime/date-time.js";


function createExpectedDash(plugin) {
    return `## ${plugin.options.amplefocus.sectionTitleDashboardEntries}
|${" |".repeat(plugin.options.amplefocus.dashboardColumns.length)}
|${"-|".repeat(plugin.options.amplefocus.dashboardColumns.length)}
| ${plugin.options.amplefocus.dashboardColumns.join(" | ")} |
| [June 12th, 2024](https://www.amplenote.com/notes/1) |`;
}

function createMockPrompter() {
    return mockPrompter([
        {index: 0},
        {index: 3}, // This means 5 cycles
        [1, 3, 3], [2, 2, 2], [3, 3, 3], [3, 3, 3], [1, 3, 3], [3, 3, 3]
    ]);
}

function setUpPluginAndApp(workDuration = 0.1, breakDuration = 0.05) {
    let app = mockApp();
    let plugin = mockPlugin();
    plugin.options.amplefocus.workDuration = workDuration * 1000;
    plugin.options.amplefocus.breakDuration = breakDuration * 1000;
    plugin.options.amplefocus.mockPrompter = createMockPrompter();
    return {app, plugin};
}

function createRunningSessionDash(plugin, startTime, cycleProgress=2) {
    return `## ${plugin.options.amplefocus.sectionTitleDashboardEntries}
|${" |".repeat(plugin.options.amplefocus.dashboardColumns.length)}
|${"-|".repeat(plugin.options.amplefocus.dashboardColumns.length)}
| ${plugin.options.amplefocus.dashboardColumns.join(" | ")} |
| [June 12th, 2024](https://www.amplenote.com/notes/1) | ${startTime} | 5 | ${cycleProgress} |  |`;
}

function createInitialJotContents(plugin, trailingContent="", leadingContent="", cycleCount=5, firstCycle = 1, currentCycle=2, filler=true){
    let head = `${leadingContent} [Focus Dashboard](https://www.amplenote.com/notes/2) for ${cycleCount} cycles
## Session overview
- **What am I trying to accomplish?**
- **Why is this important and valuable?**
- **How will I know this is complete?**
- **Potential distractions? How am I going to deal with them?**
- **Anything else noteworthy?**
## Cycles
`;
    let cycles = [];
    for (let i = firstCycle - 1; i < currentCycle; i++) {
        let newEntry = `### Cycle ${i + 1}`;
        if (firstCycle <= 1 || i > firstCycle - 1) {
            if (filler) {
                newEntry += `\n- Cycle start:`;
                for (let q of plugin.options.amplefocus.cycleStartQuestions) {
                    newEntry += `\n  - ${q}`;
                    newEntry += `\n    - Do this thing\n`;
                }
            } else {
                newEntry += `\n- Cycle start:`;
                for (let q of plugin.options.amplefocus.cycleStartQuestions) {
                    newEntry += `\n  - ${q}`;
                }
            }
            newEntry += "\n";
        }
        if (currentCycle === cycleCount || i < currentCycle - 1) {
            newEntry += `\n- Cycle debrief:`;
            for (let q of plugin.options.amplefocus.cycleEndQuestions) {
                newEntry += `\n  - ${q}`;
            }
            newEntry += `\n`;
        }
        cycles.push(newEntry);
    }
    let debriefContent = [];
    for (let q of plugin.options.amplefocus.finalQuestions) {
        debriefContent.push(`- ${q}`);
    }
    debriefContent = debriefContent.join("\n");
    return head + cycles.join("\n") + (currentCycle < cycleCount ? "" : "\n## Session debrief\n" + debriefContent + "\n") + trailingContent;
}

function validateDashboardContents(app, expectedDash, expectedRowMatch) {
    expect(app._noteRegistry["2"].body).toContain(expectedDash);
    expect(app._noteRegistry["2"].body).toMatch(expectedRowMatch);
}

function validateJotContents(app, expectedJotContents) {
    expect(app._noteRegistry["1"].body).toContain(expectedJotContents);
}

describe("within a test environment", () => {
    let app, plugin;

    describe("with a newly started focus", () => {
        describe("with no dashboard", () => {
            beforeEach(() => {
                ({app, plugin} = setUpPluginAndApp());
            });

            //----------------------------------------------------------------------------------------------------------
            it("should create the dashboard and the first entry; it should log all session details", async () => {
                await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                app.context.noteUUID = "1";
                let cycleCount = 5;
                let expectedDash = createExpectedDash(plugin);
                let expectedRowMatch = /\|.*\|.*\| 5 \| 5 \| null,null,null,null,null,null \| 1,2,3,3,1,3 \| 3,2,3,3,3,3 \|/;
                await plugin.insertText["Start Focus"](app, true);
                validateDashboardContents(app, expectedDash, expectedRowMatch);

                let expectedJot = createInitialJotContents(plugin, "", "", 5, 1, 5, false);
                validateJotContents(app, expectedJot);
            });
        });

        describe("with an empty dashboard", () => {
            beforeEach(() => {
                ({app, plugin} = setUpPluginAndApp());
            });

            //----------------------------------------------------------------------------------------------------------
            it("should create a new entry in the dashboard", async () => {
                await app.createNote("June 12th, 2024", ["daily-jots"], "{AmpleFocus:Start}", "1");
                app.context.noteUUID = "1";
                let cycleCount = 5;
                await app.createNote(
                    plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], "",
                    "2"
                );
                let expectedDash = createExpectedDash(plugin);
                const expectedJotContents = createInitialJotContents(plugin, "", "", 5, 1, 5, false);
                let expectedRowMatch = /\|.*\|.*\| 5 \| 5 \| null,null,null,null,null,null \| 1,2,3,3,1,3 \| 3,2,3,3,3,3 \|/;
                await plugin.insertText["Start Focus"](app, true);
                validateDashboardContents(app, expectedDash, expectedRowMatch);
                validateJotContents(app, expectedJotContents);
            });

            describe("with longer durations", () => {
                beforeEach(() => {
                    ({app, plugin} = setUpPluginAndApp(10, 0.05));
                    let startTime = new Date();
                    plugin.options.amplefocus.mockPrompter = mockPrompter([
                        startTime,
                        {index: 3}, // This means 5 cycles
                        [1, 1, 3], [1, 2, 2], [1, 3, 3], [1, 3, 3], [1, 1, 3], [1, 3, 3]
                    ]);
                });

                //----------------------------------------------------------------------------------------------------------
                it("should pause a session", async () => {
                    await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                    app.context.noteUUID = "1";
                    await app.createNote(
                        plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], "",
                        "2"
                    );
                    let expectedRowMatch = /\|.*\|.*\| 5 \| 0 \|  \|  \|  \|/;
                    let runPromise = plugin.insertText["Start Focus"](app);
                    runPromise.then(() => console.log("yes")).catch(() => console.log("no"));
                    await starting;
                    await plugin._appOption["Pause Focus"](app);

                    validateDashboardContents(app, "", expectedRowMatch);
                });

                //----------------------------------------------------------------------------------------------------------
                it("should cancel a session", async () => {
                    await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                    app.context.noteUUID = "1";
                    await app.createNote(
                        plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], "",
                        "2"
                    );
                    let expectedRowMatch = /\|.*\|.*\| 5 \| 0 \|  \|  \| .+ \|/;
                    let runPromise = plugin.insertText["Start Focus"](app);
                    runPromise.then(() => console.log("yes")).catch(() => console.log("no"));
                    await starting;
                    await plugin._appOption["Cancel Focus"].bind(plugin)(app);

                    validateDashboardContents(app, "", expectedRowMatch);
                });

                //----------------------------------------------------------------------------------------------------------
                it("should cancel a paused session", async () => {
                    await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                    app.context.noteUUID = "1";
                    await app.createNote(
                        plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard], "",
                        "2"
                    );
                    let expectedRowMatch = /\|.*\|.*\| 5 \| 0 \|  \|  \| .+ \|/;
                    let runPromise = plugin.insertText["Start Focus"](app);
                    runPromise.then(() => console.log("yes")).catch(() => console.log("no"));
                    await starting;
                    await plugin._appOption["Pause Focus"](app);
                    await plugin._appOption["Cancel Focus"].bind(plugin)(app);

                    validateDashboardContents(app, "", expectedRowMatch);
                });
            });
        });

        describe("with a running session", () => {
            let now;
            let dashContents, startTime;

            beforeEach(() => {
                ({app, plugin} = setUpPluginAndApp());
                now = new Date();
                startTime = _getISOStringFromDate(now);
                dashContents = createRunningSessionDash(plugin, startTime);
            });

            describe("if the user abandons open session", () => {
                beforeEach(() => {
                    plugin.options.amplefocus.mockPrompter = mockPrompter([
                        "abandon",
                        {index: 0},
                        {index: 3}, // This means 5 cycles
                        [1, 3, 3], [2, 2, 2], [3, 3, 3], [3, 3, 3], [1, 3, 3], [3, 3, 3]
                    ]);
                });

                //----------------------------------------------------------------------------------------------------------
                it("should stop the open session and start the new one", async () => {
                    await app.createNote("June 12th, 2024", ["daily-jots"], "", "1");
                    app.context.noteUUID = "1";
                    let cycleCount = 5;
                    await app.createNote(
                        plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard],
                        dashContents, "2"
                    );
                    let expectedDash = createExpectedDash(plugin);
                    let expectedRowMatch1 = /\|.*\|.*\| 5 \| 2 \| .* \|/;
                    let expectedRowMatch2 = /\|.*\|.*\| 5 \| 5 \| null,null,null,null,null,null \| 1,2,3,3,1,3 \| 3,2,3,3,3,3 \| .* \|/;
                    await plugin.insertText["Start Focus"](app, true);
                    validateDashboardContents(app, expectedDash, expectedRowMatch2);
                    validateDashboardContents(app, expectedDash, expectedRowMatch1);
                });
            });

            describe("if the user resumes the open session", () => {
                beforeEach(() => {
                    now = new Date();
                    startTime = _getISOStringFromDate(now);
                    plugin.options.amplefocus.mockPrompter = mockPrompter([
                        "resume",
                        [3, 3, 3], [3, 3, 3], [1, 3, 3], [3, 3, 3], [3, 3, 3]
                    ]);
                });

                //----------------------------------------------------------------------------------------------------------
                it("should resume the open session and leave the table intact", async () => {
                    const trailingContent = `# This is an unrelated section
And this is some content

---
This is some text without a heading per se

### Cycle 4
But please don't write here`;
                    const leadingContent = `Some unrelated text
# \\[${startTime.slice(11, 16)}\\]`;
                    const initialJotContents = createInitialJotContents(plugin, trailingContent, leadingContent, 5, 1, 3, false);
                    await app.createNote("June 12th, 2024", ["daily-jots"], initialJotContents, "1");
                    app.context.noteUUID = "1";
                    let cycleCount = 5;
                    await app.createNote(
                        plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard],
                        dashContents, "2"
                    );
                    let expectedDash = createExpectedDash(plugin);
                    let expectedRowMatch2 = /\|.*\|.*\| 5 \| 5 \| null,null,null \| 3,3,1 \| 3,3,3 \| .* \|/;
                    let expectedJotContents = createInitialJotContents(plugin, trailingContent, leadingContent, 5, 1, 5, false);
                    await plugin.insertText["Start Focus"](app, true);
                    validateDashboardContents(app, expectedDash, expectedRowMatch2);
                    validateJotContents(app, expectedJotContents);
                });

                it("should create a heading again if missing", async () => {
                    const leadingContent = `Some unrelated text
# \\[${startTime.slice(11, 16)}\\]`;
                    let initialJotContents = createInitialJotContents(plugin, "", leadingContent, 5, 1, 2, false);
                    initialJotContents = initialJotContents.split("\n").slice(0, 8).join("\n");
                    await app.createNote("June 12th, 2024", ["daily-jots"], initialJotContents, "1");
                    app.context.noteUUID = "1";
                    let cycleCount = 5;
                    dashContents = createRunningSessionDash(plugin, startTime, 1);
                    await app.createNote(
                        plugin.options.amplefocus.noteTitleDashboard, [plugin.options.amplefocus.noteTagDashboard],
                        dashContents, "2"
                    );
                    let expectedDash = createExpectedDash(plugin);
                    let expectedRowMatch2 = /\|.*\|.*\| 5 \| 5 \| null,null,null,null \| 3,3,1,3 \| 3,3,3,3 \| .* \|/;
                    let expectedJotContents = createInitialJotContents(plugin, undefined, undefined, 5, 2, 5, false);
                    let expectedLines = expectedJotContents.split("\n");
                    // Some ugly magic to account for new line I don't know the source of
                    expectedLines = [
                        ...expectedLines.slice(0, 7),
                        "",
                        ...expectedLines.slice(7, expectedLines.length)
                        ];
                    expectedJotContents = expectedLines.join("\n");
                    await plugin.insertText["Start Focus"](app, true);
                    validateDashboardContents(app, expectedDash, expectedRowMatch2);
                    validateJotContents(app, expectedJotContents);
                })
            });
        });

        describe("with a previously completed session in the same jot", () => {
            beforeEach(() => {
                ({app, plugin} = setUpPluginAndApp());
            });

            //----------------------------------------------------------------------------------------------------------
            it("should write new logs and not edit the previous ones", async () => {
                const initialJotContents = createInitialJotContents(plugin, undefined, undefined, 5, 1, 5);
                await app.createNote("June 12th, 2024", ["daily-jots"], initialJotContents, "1");
                app.context.noteUUID = "1";
                let cycleCount = 5;
                let expectedJotContents = createInitialJotContents(plugin, "", "", 5, 1, 5, true);
                await plugin.insertText["Start Focus"](app);
                validateJotContents(app, expectedJotContents);
                validateJotContents(app, initialJotContents)
            })

        })
    });
});
