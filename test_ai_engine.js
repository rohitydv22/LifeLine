// Load mock browser environment globals
global.window = global;
global.CATEGORIES = [
  { id: "electrical", label: "Electrical & Power", emoji: "⚡" },
  { id: "plumbing", label: "Plumbing & Water", emoji: "💧" },
  { id: "network", label: "Internet & Wi-Fi", emoji: "📡" },
  { id: "fire_safety", label: "Fire & Safety", emoji: "🧯" },
  { id: "structural", label: "Civil & Structural", emoji: "🚪" },
  { id: "sanitation", label: "Sanitation & Pest", emoji: "🧹" },
  { id: "security", label: "Security & Access", emoji: "🔒" },
  { id: "other", label: "Other / General", emoji: "💬" }
];

require('./lifeline/js/model/risk-model.js');
require('./lifeline/js/nn-inference.js');
require('./lifeline/js/ai-engine.js');

console.log("Testing analyzeReport with Neural Network...");

const report = {
  category: "electrical",
  description: "sparks coming from wall socket in bedroom, smoke visible",
  location: "Hostel B Room 214"
};

const analysis = analyzeReport(report);
console.log("Full Analysis Output:\n", JSON.stringify(analysis, null, 2));

// Assertions on contract
console.assert(["low", "medium", "high"].includes(analysis.riskLevel), "riskLevel invalid");
console.assert(typeof analysis.confidence === "number", "confidence invalid");
console.assert(typeof analysis.probabilities === "object", "probabilities missing");
console.assert(typeof analysis.probabilities.low === "number", "probabilities.low invalid");
console.assert(typeof analysis.probabilities.medium === "number", "probabilities.medium invalid");
console.assert(typeof analysis.probabilities.high === "number", "probabilities.high invalid");
console.assert(typeof analysis.reasoning === "string" && analysis.reasoning.length > 0, "reasoning invalid");
console.assert(typeof analysis.solution === "string" && analysis.solution.length > 0, "solution invalid");
console.assert(typeof analysis.score === "number", "score invalid");
console.assert(Array.isArray(analysis.matchedSignals), "matchedSignals invalid");

// Test buildSandboxSteps
const steps = buildSandboxSteps(report, analysis);
console.log("\nSandbox steps count:", steps.length);
console.log("Sample Step:", steps[5]);

console.log("\n-> ALL AI ENGINE TESTS PASSED!");
