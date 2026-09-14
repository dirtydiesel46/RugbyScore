// Save scoring actions so both the score and Undo survive a refresh.
const storageKey = "rugbyscore-game-v1";
const scores = { "home-score": 0, "guest-score": 0 };
let history = [];
const statusElement = document.getElementById("game-status");

function validAction(action) {
    return action && Object.hasOwn(scores, action.elementId) &&
        [2, 3, 5, 7].includes(action.amount);
}

function render() {
    scores["home-score"] = 0;
    scores["guest-score"] = 0;
    for (const action of history) {
        scores[action.elementId] += action.amount;
    }
    for (const elementId of Object.keys(scores)) {
        document.getElementById(elementId).textContent = scores[elementId];
    }
    document.getElementById("undo-button").disabled = history.length === 0;
}

function save(message) {
    render();
    try {
        localStorage.setItem(storageKey, JSON.stringify(history));
        statusElement.textContent = message;
    } catch {
        statusElement.textContent = "Scores work, but this browser could not save them for refresh.";
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
    if (history.length && !window.confirm("Start a new game? Both scores and undo history will be cleared.")) return;
    history = [];
    save("New game. Both scores reset to zero.");
}

// Ignore invalid saved data rather than displaying broken scores.
try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
        const actions = JSON.parse(saved);
        if (!Array.isArray(actions) || !actions.every(validAction)) throw new Error("Invalid saved game");
        history = actions;
        if (history.length) statusElement.textContent = "Saved game restored.";
    }
} catch {
    statusElement.textContent = "Saved game unavailable. Starting at zero.";
}
render();
