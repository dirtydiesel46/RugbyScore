// Keep each team's score in JavaScript
const scores = {
    "home-score": 0,
    "guest-score": 0
};

// Display the starting scores
document.getElementById("home-score").textContent = scores["home-score"];
document.getElementById("guest-score").textContent = scores["guest-score"];

// Add points, then update that team's display
function add(amount, elementId) {
    scores[elementId] += amount;
    document.getElementById(elementId).textContent = scores[elementId];
}