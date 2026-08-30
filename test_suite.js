// Comprehensive test suite for LifeLine Neural Network Inference & AI Engine
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
const NNInference = require('./lifeline/js/nn-inference.js');
const { analyzeReport, buildSandboxSteps } = require('./lifeline/js/ai-engine.js');

console.log("============================================================");
console.log("LifeLine AI Ops - Full Test Suite Execution");
console.log("============================================================");

const scenarios = [
  // Electrical
  { cat: "electrical", text: "Ceiling tube light flickers intermittently in room 102", expected: "low" },
  { cat: "electrical", text: "Circuit breaker tripped twice when running laptop and iron, power out in our room", expected: "medium" },
  { cat: "electrical", text: "Sparks and black smoke shooting from main distribution board, emergency fire hazard", expected: "high" },
  
  // Plumbing
  { cat: "plumbing", text: "Tap slowly dripping in bathroom sink, bucket placed underneath", expected: "low" },
  { cat: "plumbing", text: "Drain pipe clogged and dirty water backing up into bathroom stall", expected: "medium" },
  { cat: "plumbing", text: "Burst main water pipe flooding 3rd floor corridor and seeping into student bedrooms", expected: "high" },

  // Network
  { cat: "network", text: "Wifi speed is slightly slower than usual in the room corner", expected: "low" },
  { cat: "network", text: "Wifi access point on 2nd floor completely dead, no SSID broadcasting", expected: "medium" },
  { cat: "network", text: "Campus-wide network and core firewall crash during online exams", expected: "high" },

  // Fire Safety
  { cat: "fire_safety", text: "Fire extinguisher inspection tag in hallway expired last month", expected: "low" },
  { cat: "fire_safety", text: "Fire extinguisher missing from its wall bracket on floor 3", expected: "medium" },
  { cat: "fire_safety", text: "Active fire in 2nd floor pantry, flames spreading to wooden cabinets, thick smoke", expected: "high" },

  // Structural
  { cat: "structural", text: "Small hairline crack on plaster near the window sill", expected: "low" },
  { cat: "structural", text: "Balcony safety railing is loose and wobbles when pushed", expected: "medium" },
  { cat: "structural", text: "Concrete ceiling collapsed into bedroom, heavy debris fallen on bed", expected: "high" },

  // Sanitation
  { cat: "sanitation", text: "Dustbin in common corridor is full and needs daily emptying", expected: "low" },
  { cat: "sanitation", text: "Cockroach and pest infestation noticed in pantry cabinets", expected: "medium" },
  { cat: "sanitation", text: "Main sewage line ruptured in corridor, toxic sewage flooding student rooms", expected: "high" },

  // Security
  { cat: "security", text: "Door key is slightly sticky in the lock cylinder", expected: "low" },
  { cat: "security", text: "Room door lock mechanism broken, cannot be locked from outside", expected: "medium" },
  { cat: "security", text: "Armed intruder reported inside hostel block, active break-in in progress", expected: "high" },

  // Other
  { cat: "other", text: "Lost student ID card found in library reception", expected: "low" },
  { cat: "other", text: "Elevator getting stuck between floors 2 and 3 intermittently", expected: "medium" },
  { cat: "other", text: "Student medical emergency: unconscious student having seizure in room 305, ambulance needed", expected: "high" }
];

let passed = 0;
for (let i = 0; i < scenarios.length; i++) {
  const s = scenarios[i];
  const analysis = analyzeReport({ category: s.cat, description: s.text, location: "Hostel Zone" });

  const isMatch = analysis.riskLevel === s.expected;
  const status = isMatch ? "✓ PASS" : "✗ FAIL";
  if (isMatch) passed++;

  console.log(`Test ${(i + 1).toString().padStart(2, '0')}: [${s.cat.padEnd(11, ' ')}] Risk: ${analysis.riskLevel.toUpperCase().padEnd(6, ' ')} (${(analysis.confidence * 100).toFixed(1)}% conf) ${status}`);
  
  // Validate contract integrity
  if (!analysis.probabilities || typeof analysis.probabilities.high !== "number" || !analysis.solution || !analysis.reasoning) {
    console.error("  Contract validation failed for test", i + 1);
    process.exit(1);
  }
}

console.log("============================================================");
console.log(`Summary: ${passed}/${scenarios.length} scenarios correctly classified (${((passed/scenarios.length)*100).toFixed(1)}%)`);
console.log("============================================================");

if (passed === scenarios.length) {
  console.log("All comprehensive tests passed with 100% accuracy!");
} else {
  process.exit(1);
}
