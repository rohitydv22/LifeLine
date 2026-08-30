const fs = require('fs');
const NNInference = require('./lifeline/js/nn-inference.js');
const model = require('./lifeline/js/model/risk-model.js');

console.log("Testing JavaScript Neural Network Inference...");

const testCases = [
  {
    category: "electrical",
    description: "Sparks and smoke coming out of the main corridor power board",
    expectedRisk: "high"
  },
  {
    category: "electrical",
    description: "Desk tube light switch clicks slightly when turning on",
    expectedRisk: "low"
  },
  {
    category: "plumbing",
    description: "Burst main pipe flooding entire 3rd floor corridor, water reaching electrical sockets",
    expectedRisk: "high"
  },
  {
    category: "plumbing",
    description: "Tap slowly dripping in 2nd floor common washroom",
    expectedRisk: "low"
  },
  {
    category: "network",
    description: "Campus-wide network core switch failure, all exams and internet down",
    expectedRisk: "high"
  },
  {
    category: "structural",
    description: "Balcony railing loose and wobbling when students lean on it",
    expectedRisk: "medium"
  },
  {
    category: "security",
    description: "Armed intruder spotted in hostel staircase, urgent lockdown needed",
    expectedRisk: "high"
  }
];

let passed = 0;
for (const tc of testCases) {
  const res = NNInference.predictRisk({ category: tc.category, description: tc.description }, model);
  console.log(`\nCategory: "${tc.category}" | Input: "${tc.description.slice(0, 55)}..."`);
  console.log(`Predicted: ${res.riskLevel.toUpperCase()} (Confidence: ${(res.confidence * 100).toFixed(1)}%)`);
  console.log(`Probabilities: Low=${(res.probabilities.low * 100).toFixed(1)}%, Med=${(res.probabilities.medium * 100).toFixed(1)}%, High=${(res.probabilities.high * 100).toFixed(1)}%`);

  if (res.riskLevel === tc.expectedRisk) {
    console.log(" -> PASS");
    passed++;
  } else {
    console.error(` -> FAIL (Expected ${tc.expectedRisk}, got ${res.riskLevel})`);
  }
}

console.log(`\n========================================`);
console.log(`Results: ${passed}/${testCases.length} tests passed.`);
console.log(`========================================`);
if (passed !== testCases.length) {
  process.exit(1);
}
