const test = require("node:test");
const assert = require("node:assert/strict");

// Set up minimal browser environment mock for DOM and storage integration
const domElements = new Map();
function getMockElement(id) {
    if (!domElements.has(id)) {
        domElements.set(id, { textContent: "", disabled: false });
    }
    return domElements.get(id);
}

const mockStorage = new Map();
let confirmReturnValue = true;

global.document = {
    getElementById: (id) => getMockElement(id)
};

global.window = {
    localStorage: {
        getItem: (key) => (mockStorage.has(key) ? mockStorage.get(key) : null),
        setItem: (key, val) => mockStorage.set(key, String(val))
    },
    confirm: () => confirmReturnValue
};

const {
    storageKey,
    VALID_POINTS,
    VALID_TEAMS,
    validAction,
    calculateScores,
    parseSavedGame,
    add,
    undoLastScore,
    newGame,
    render,
    save,
    init,
    scores,
    getHistory,
    setHistory
} = require("../index.js");

function resetEnvironment() {
    setHistory([]);
    scores["home-score"] = 0;
    scores["guest-score"] = 0;
    mockStorage.clear();
    domElements.clear();
    confirmReturnValue = true;
    render();
}

test("scoring configuration", () => {
    assert.deepEqual(VALID_POINTS, [2, 3, 5, 7], "Points should follow rugby scoring values");
    assert.deepEqual(VALID_TEAMS, ["home-score", "guest-score"], "Teams should be home-score and guest-score");
    assert.equal(typeof storageKey, "string", "Storage key should be defined");
});

test("validAction validation", async (t) => {
    await t.test("accepts valid actions for both teams", () => {
        for (const elementId of ["home-score", "guest-score"]) {
            for (const amount of [2, 3, 5, 7]) {
                assert.equal(validAction({ amount, elementId }), true, `Should accept ${amount} for ${elementId}`);
            }
        }
    });

    await t.test("rejects invalid point values", () => {
        const invalidPoints = [0, 1, 4, 6, 8, 10, -2, -5, 3.5, "5", null, undefined];
        for (const amount of invalidPoints) {
            assert.equal(validAction({ amount, elementId: "home-score" }), false, `Should reject amount ${amount}`);
        }
    });

    await t.test("rejects invalid team element IDs", () => {
        const invalidTeams = ["away-score", "guest", "home", "", null, undefined, 123];
        for (const elementId of invalidTeams) {
            assert.equal(validAction({ amount: 5, elementId }), false, `Should reject team ${elementId}`);
        }
    });

    await t.test("rejects non-object or null action payloads", () => {
        assert.equal(validAction(null), false);
        assert.equal(validAction(undefined), false);
        assert.equal(validAction("score"), false);
        assert.equal(validAction(5), false);
        assert.equal(validAction({}), false);
    });
});

test("calculateScores pure logic", async (t) => {
    await t.test("returns 0-0 for empty history", () => {
        const totals = calculateScores([]);
        assert.deepEqual(totals, { "home-score": 0, "guest-score": 0 });
    });

    await t.test("calculates single scoring events", () => {
        const homeTry = calculateScores([{ amount: 5, elementId: "home-score" }]);
        assert.deepEqual(homeTry, { "home-score": 5, "guest-score": 0 });

        const guestDropGoal = calculateScores([{ amount: 3, elementId: "guest-score" }]);
        assert.deepEqual(guestDropGoal, { "home-score": 0, "guest-score": 3 });
    });

    await t.test("calculates converted try (5 + 2 = 7)", () => {
        const convertedTry = [
            { amount: 5, elementId: "home-score" },
            { amount: 2, elementId: "home-score" }
        ];
        const totals = calculateScores(convertedTry);
        assert.equal(totals["home-score"], 7);
        assert.equal(totals["guest-score"], 0);
    });

    await t.test("calculates mixed scoring between both teams independently", () => {
        const matchHistory = [
            { amount: 5, elementId: "home-score" },
            { amount: 2, elementId: "home-score" },
            { amount: 3, elementId: "guest-score" },
            { amount: 7, elementId: "guest-score" },
            { amount: 3, elementId: "home-score" }
        ];
        const totals = calculateScores(matchHistory);
        assert.deepEqual(totals, { "home-score": 10, "guest-score": 10 });
    });

    await t.test("safely ignores any invalid actions in history", () => {
        const dirtyHistory = [
            { amount: 5, elementId: "home-score" },
            { amount: 99, elementId: "home-score" },
            { amount: 3, elementId: "guest-score" },
            null,
            { amount: 5, elementId: "invalid-team" }
        ];
        const totals = calculateScores(dirtyHistory);
        assert.deepEqual(totals, { "home-score": 5, "guest-score": 3 });
    });
});

test("parseSavedGame deserialization and security", async (t) => {
    await t.test("returns empty array for null or undefined input", () => {
        assert.deepEqual(parseSavedGame(null), []);
        assert.deepEqual(parseSavedGame(undefined), []);
    });

    await t.test("successfully restores valid saved actions", () => {
        const saved = JSON.stringify([
            { amount: 5, elementId: "home-score" },
            { amount: 2, elementId: "home-score" }
        ]);
        const restored = parseSavedGame(saved);
        assert.equal(restored.length, 2);
        assert.deepEqual(restored[0], { amount: 5, elementId: "home-score" });
    });

    await t.test("throws on invalid JSON syntax", () => {
        assert.throws(() => parseSavedGame("{ broken-json"), SyntaxError);
    });

    await t.test("throws on non-array JSON payload", () => {
        assert.throws(() => parseSavedGame(JSON.stringify({ amount: 5, elementId: "home-score" })), /Invalid saved game/);
        assert.throws(() => parseSavedGame(JSON.stringify(42)), /Invalid saved game/);
        assert.throws(() => parseSavedGame(JSON.stringify("string")), /Invalid saved game/);
    });

    await t.test("throws on array with tampered or invalid actions", () => {
        const tampered = JSON.stringify([
            { amount: 5, elementId: "home-score" },
            { amount: 50, elementId: "home-score" }
        ]);
        assert.throws(() => parseSavedGame(tampered), /Invalid saved game/);
    });
});

test("state machine actions: add, undo, and newGame", async (t) => {
    t.beforeEach(resetEnvironment);

    await t.test("add appends valid actions and updates scores, DOM, and status", () => {
        add(5, "home-score");
        assert.equal(getHistory().length, 1);
        assert.equal(scores["home-score"], 5);
        assert.equal(scores["guest-score"], 0);
        assert.equal(document.getElementById("home-score").textContent, 5);
        assert.equal(document.getElementById("game-status").textContent, "Home +5.");
        assert.equal(document.getElementById("undo-button").disabled, false);

        add(3, "guest-score");
        assert.equal(getHistory().length, 2);
        assert.equal(scores["home-score"], 5);
        assert.equal(scores["guest-score"], 3);
        assert.equal(document.getElementById("guest-score").textContent, 3);
        assert.equal(document.getElementById("game-status").textContent, "Guest +3.");
    });

    await t.test("add rejects invalid actions without modifying state", () => {
        add(4, "home-score");
        add(5, "unknown-team");
        assert.equal(getHistory().length, 0);
        assert.equal(scores["home-score"], 0);
        assert.equal(scores["guest-score"], 0);
    });

    await t.test("undoLastScore removes latest action and updates team scores and status", () => {
        add(5, "home-score");
        add(2, "home-score");
        add(3, "guest-score");
        assert.equal(scores["home-score"], 7);
        assert.equal(scores["guest-score"], 3);

        undoLastScore();
        assert.equal(getHistory().length, 2);
        assert.equal(scores["home-score"], 7);
        assert.equal(scores["guest-score"], 0);
        assert.equal(document.getElementById("game-status").textContent, "Undid Guest +3.");
        assert.equal(document.getElementById("undo-button").disabled, false);

        undoLastScore();
        assert.equal(getHistory().length, 1);
        assert.equal(scores["home-score"], 5);
        assert.equal(scores["guest-score"], 0);
        assert.equal(document.getElementById("game-status").textContent, "Undid Home +2.");

        undoLastScore();
        assert.equal(getHistory().length, 0);
        assert.equal(scores["home-score"], 0);
        assert.equal(scores["guest-score"], 0);
        assert.equal(document.getElementById("undo-button").disabled, true);
    });

    await t.test("undoLastScore on empty history does not fail or produce negative scores", () => {
        undoLastScore();
        assert.equal(getHistory().length, 0);
        assert.equal(scores["home-score"], 0);
        assert.equal(scores["guest-score"], 0);
        assert.equal(document.getElementById("undo-button").disabled, true);
    });

    await t.test("newGame resets state when confirmed", () => {
        add(5, "home-score");
        add(3, "guest-score");
        assert.equal(getHistory().length, 2);

        newGame();
        assert.equal(getHistory().length, 0);
        assert.equal(scores["home-score"], 0);
        assert.equal(scores["guest-score"], 0);
        assert.equal(document.getElementById("home-score").textContent, 0);
        assert.equal(document.getElementById("guest-score").textContent, 0);
        assert.equal(document.getElementById("undo-button").disabled, true);
        assert.equal(document.getElementById("game-status").textContent, "New game. Both scores reset to zero.");
    });

    await t.test("newGame preserves state when confirmation is cancelled", () => {
        add(5, "home-score");
        confirmReturnValue = false;

        newGame();
        assert.equal(getHistory().length, 1);
        assert.equal(scores["home-score"], 5);
    });

    await t.test("newGame on empty history resets without confirmation", () => {
        confirmReturnValue = false;
        newGame();
        assert.equal(getHistory().length, 0);
        assert.equal(document.getElementById("game-status").textContent, "New game. Both scores reset to zero.");
    });
});

test("storage failure and init integration", async (t) => {
    t.beforeEach(resetEnvironment);

    await t.test("save gracefully catches localStorage errors", () => {
        const originalSetItem = window.localStorage.setItem;
        window.localStorage.setItem = () => {
            throw new Error("QuotaExceeded");
        };

        try {
            save("Custom message");
            assert.equal(
                document.getElementById("game-status").textContent,
                "Scores work, but this browser could not save them for refresh."
            );
        } finally {
            window.localStorage.setItem = originalSetItem;
        }
    });

    await t.test("init restores saved game from storage", () => {
        window.localStorage.setItem(
            storageKey,
            JSON.stringify([
                { amount: 5, elementId: "home-score" },
                { amount: 2, elementId: "home-score" }
            ])
        );

        init();
        assert.equal(getHistory().length, 2);
        assert.equal(scores["home-score"], 7);
        assert.equal(document.getElementById("home-score").textContent, 7);
        assert.equal(document.getElementById("game-status").textContent, "Saved game restored.");
        assert.equal(document.getElementById("undo-button").disabled, false);
    });

    await t.test("init handles empty saved array without restored message", () => {
        window.localStorage.setItem(storageKey, "[]");
        init();
        assert.equal(getHistory().length, 0);
        assert.equal(document.getElementById("game-status").textContent, "");
    });

    await t.test("init handles corrupted storage gracefully", () => {
        window.localStorage.setItem(storageKey, "{ not-valid-json");

        init();
        assert.equal(getHistory().length, 0);
        assert.equal(scores["home-score"], 0);
        assert.equal(
            document.getElementById("game-status").textContent,
            "Saved game unavailable. Starting at zero."
        );
    });

    await t.test("handles missing DOM elements safely", () => {
        const originalGetById = global.document.getElementById;
        global.document.getElementById = () => null;
        try {
            render();
            save("No crash");
            init();
        } finally {
            global.document.getElementById = originalGetById;
        }
    });

    await t.test("init and save handle missing localStorage safely", () => {
        const originalStorage = global.window.localStorage;
        delete global.window.localStorage;
        try {
            save("Storage missing");
            init();
            assert.equal(document.getElementById("game-status").textContent, "Storage missing");
        } finally {
            global.window.localStorage = originalStorage;
        }
    });
});
