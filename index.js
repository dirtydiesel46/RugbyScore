// Save scoring actions so both the score and Undo survive a refresh.
const storageKey = "rugbyscore-game-v1";
const VALID_POINTS = [2, 3, 5, 7];
const VALID_TEAMS = ["home-score", "guest-score"];

// Stryker disable all
const scores = { "home-score": 0, "guest-score": 0 };
// Stryker restore all
let history = [];

// Stryker disable all
function getDocument() {
    return typeof document !== "undefined" ? document : null;
}

function getWindow() {
    return typeof window !== "undefined" ? window : null;
}
// Stryker restore all

function validAction(action) {
    return Boolean(
        action &&
        typeof action === "object" &&
        VALID_TEAMS.includes(action.elementId) &&
        VALID_POINTS.includes(action.amount)
    );
}

function calculateScores(actions) {
    const totals = { "home-score": 0, "guest-score": 0 };
    if (!actions) return totals;
    for (const action of actions) {
        if (validAction(action)) {
            totals[action.elementId] += action.amount;
        }
    }
    return totals;
}

function parseSavedGame(savedJson) {
    if (savedJson === null || savedJson === undefined) return [];
    const actions = JSON.parse(savedJson);
    if (!Array.isArray(actions) || !actions.every(validAction)) {
        throw new Error("Invalid saved game");
    }
    return actions;
}

function render() {
    const totals = calculateScores(history);
    scores["home-score"] = totals["home-score"];
    scores["guest-score"] = totals["guest-score"];

    const doc = getDocument();
    if (doc) {
        for (const elementId of Object.keys(scores)) {
            const el = doc.getElementById(elementId);
            if (el) el.textContent = scores[elementId];
        }
        const undoBtn = doc.getElementById("undo-button");
        if (undoBtn) undoBtn.disabled = history.length === 0;
    }
}

function save(message) {
    render();
    const doc = getDocument();
    const win = getWindow();
    const statusElement = doc ? doc.getElementById("game-status") : null;
    let savedOk = true;
    try {
        if (win && win.localStorage) {
            win.localStorage.setItem(storageKey, JSON.stringify(history));
        }
    } catch {
        savedOk = false;
    }
    if (statusElement) {
        statusElement.textContent = savedOk
            ? message
            : "Scores work, but this browser could not save them for refresh.";
    }
}

function add(amount, elementId) {
    const action = { amount, elementId };
    if (!validAction(action)) return;
    history.push(action);
    const team = elementId === "home-score" ? "Home" : "Guest";
    save(`${team} +${amount}.`);
}

function undoLastScore() {
    const action = history.pop();
    if (!action) return;
    const team = action.elementId === "home-score" ? "Home" : "Guest";
    save(`Undid ${team} +${action.amount}.`);
}

function newGame() {
    const win = getWindow();
    if (history.length && win && !win.confirm("Start a new game? Both scores and undo history will be cleared.")) return;
    history = [];
    save("New game. Both scores reset to zero.");
}

// Initialize application state and restore previous session if available.
function init() {
    const doc = getDocument();
    const win = getWindow();
    if (!doc) return;
    const statusElement = doc.getElementById("game-status");
    let loadFailed = false;
    let loadedHistory = null;
    try {
        if (win && win.localStorage) {
            const saved = win.localStorage.getItem(storageKey);
            if (saved !== null) {
                loadedHistory = parseSavedGame(saved);
            }
        }
    } catch {
        loadFailed = true;
    }

    if (loadedHistory !== null) {
        history = loadedHistory;
        if (history.length && statusElement) {
            statusElement.textContent = "Saved game restored.";
        }
    } else if (loadFailed && statusElement) {
        statusElement.textContent = "Saved game unavailable. Starting at zero.";
    }
    render();
}

// Stryker disable all
if (typeof window !== "undefined" && typeof document !== "undefined") {
    init();
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        storageKey,
        VALID_POINTS,
        VALID_TEAMS,
        scores,
        validAction,
        calculateScores,
        parseSavedGame,
        add,
        undoLastScore,
        newGame,
        render,
        save,
        init,
        getHistory: () => history,
        setHistory: (actions) => { history = actions; }
    };
}
// Stryker restore all
