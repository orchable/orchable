const fs = require('fs');
const path = require('path');

const samplePath = path.resolve('/Users/tonypham/MEGA/WebApp/WIP/orchable/doc/sample-workflows/PUBLISH_SAMPLES.sql');
let content = fs.readFileSync(samplePath, 'utf8');

const templateIds = {
  p1_final_product: '2af809e5-6815-4d56-b8b8-173a94bd006c',
  p2_lesson_products: '2af809e5-6815-4d56-b8b8-173a94bd006d',
  p3_module_summary: '2af809e5-6815-4d56-b8b8-173a94bd006e',
  p4_detailed_lesson: '2af809e5-6815-4d56-b8b8-173a94bd006f'
};

const orc10Match = content.match(/VALUES \('bd5ac273-94a8-485e-9a6e-a3947ce80458'.*?, '(.*?)'::jsonb/);

if (orc10Match) {
  let stepsText = orc10Match[1];
  let steps = JSON.parse(stepsText);
  steps.forEach(step => {
    if (templateIds[step.stage_key]) {
      step.prompt_template_id = templateIds[step.stage_key];
    }
  });
  
  const modifiedStepsText = JSON.stringify(steps);
  content = content.replace(stepsText, modifiedStepsText);
  fs.writeFileSync(samplePath, content, 'utf8');
  console.log("Successfully patched PUBLISH_SAMPLES.sql");
} else {
  console.log("ORC-10 config not found in SQL file");
}
