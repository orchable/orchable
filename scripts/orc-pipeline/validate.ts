import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Colors for terminal output
const COLORS = {
  RESET: "\x1b[0m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  CYAN: "\x1b[36m",
  BOLD: "\x1b[1m"
};

// --- SCHEMA SETUP ---
const stepSchemaPath = path.resolve(__dirname, 'schema/orchestration.schema.json');
const bundleSchemaPath = path.resolve(__dirname, 'schema/bundle.schema.json');

const stepSchema = JSON.parse(fs.readFileSync(stepSchemaPath, 'utf8'));
const bundleSchema = JSON.parse(fs.readFileSync(bundleSchemaPath, 'utf8'));

ajv.addSchema(stepSchema, 'orchestration.schema.json');
const validateBundle = ajv.compile(bundleSchema);

// --- TYPES ---
interface Step {
  id: string;
  name: string;
  label: string;
  stage_key: string;
  task_type: string;
  cardinality: string;
  dependsOn: string[];
  ai_settings: {
    model_id: string;
    generationConfig: {
      temperature: number;
      maxOutputTokens: number;
    };
  };
  [key: string]: unknown;
}

interface Bundle {
  orchestratorName: string;
  orchestratorDescription?: string;
  steps: Step[];
}

// --- VALIDATION LOGIC ---

function validate(dirPath: string, options: { sql?: boolean }) {
  const configPath = path.join(dirPath, 'orchestration.json');
  if (!fs.existsSync(configPath)) {
    console.error(`${COLORS.RED}Error: orchestration.json not found in ${dirPath}${COLORS.RESET}`);
    return false;
  }

  const bundle: Bundle = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(`${COLORS.CYAN}${COLORS.BOLD}Validating: ${bundle.orchestratorName}${COLORS.RESET} (${dirPath})`);

  // 1. Schema Validation
  const valid = validateBundle(bundle);
  if (!valid) {
    console.error(`${COLORS.RED}❌ Schema errors:${COLORS.RESET}`);
    validateBundle.errors?.forEach(err => {
      console.error(`  - ${err.instancePath} ${err.message}`);
    });
    return false;
  }
  console.log(`${COLORS.GREEN}✅ Schema compliant${COLORS.RESET}`);

  // 2. DAG Integrity & Consistency
  const steps = bundle.steps;
  const stepIds = new Set(steps.map(s => s.id));
  const stageKeys = new Set(steps.map(s => s.stage_key));

  // 2.1 Unique IDs/Keys
  if (stepIds.size !== steps.length) {
    console.error(`${COLORS.RED}❌ Duplicate Step IDs detected${COLORS.RESET}`);
    return false;
  }
  if (stageKeys.size !== steps.length) {
    console.error(`${COLORS.RED}❌ Duplicate stage_keys detected${COLORS.RESET}`);
    return false;
  }

  // 2.2 Dependency Check (Existential)
  const missingDeps: string[] = [];
  steps.forEach(s => {
    s.dependsOn.forEach(depId => {
      if (!stepIds.has(depId)) missingDeps.push(`${s.id} -> ${depId}`);
    });
  });
  if (missingDeps.length > 0) {
    console.error(`${COLORS.RED}❌ Missing dependencies:${COLORS.RESET} ${missingDeps.join(', ')}`);
    return false;
  }

  // 2.3 Cycle Detection (DFS)
  const visited = new Set<string>();
  const recStack = new Set<string>();
  function hasCycle(id: string): boolean {
    if (recStack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    recStack.add(id);
    const step = steps.find(s => s.id === id);
    for (const dep of step?.dependsOn || []) {
      if (hasCycle(dep)) return true;
    }
    recStack.delete(id);
    return false;
  }
  for (const step of steps) {
    if (hasCycle(step.id)) {
      console.error(`${COLORS.RED}❌ Cycle detected in dependency graph!${COLORS.RESET}`);
      return false;
    }
  }
  console.log(`${COLORS.GREEN}✅ DAG integrity verified (no cycles)${COLORS.RESET}`);

  // 3. Prompt file checks (Warning level)
  const promptDir = path.join(dirPath, 'prompts');
  const missingPrompts: string[] = [];
  steps.forEach(s => {
    const pPath = path.join(promptDir, `${s.stage_key}.md`);
    if (!fs.existsSync(pPath)) {
      missingPrompts.push(s.stage_key);
    } else {
      const content = fs.readFileSync(pPath, 'utf8');
      if (!content.includes('%%input_data%%') && s.dependsOn.length > 0) {
        console.warn(`${COLORS.YELLOW}⚠️  Warning: Stage '${s.stage_key}' might be missing %%input_data%% placeholder${COLORS.RESET}`);
      }
    }
  });
  if (missingPrompts.length > 0) {
    console.warn(`${COLORS.YELLOW}⚠️  Warning: Missing prompt files: ${missingPrompts.join(', ')}${COLORS.RESET}`);
  }

  // 4. SQL Generation
  if (options.sql) {
    generateSql(bundle, dirPath);
  }

  console.log(`${COLORS.GREEN}${COLORS.BOLD}PASS: ${bundle.orchestratorName} is ready!${COLORS.RESET}\n`);
  return true;
}

function generateSql(bundle: Bundle, dirPath: string) {
  const configId = bundle.steps[0].id.split('_')[1] + '0000-0000-0000-0000-000000000000'; // Dummy UID for example
  // In a real scenario, we'd use consistent hardcoded IDs for samples.
  
  console.log(`${COLORS.CYAN}--- SQL OUTPUT START ---${COLORS.RESET}`);
  // Template for one Config
  const stepsJson = JSON.stringify(bundle.steps).replace(/'/g, "''");
  
  console.log(`-- Config: ${bundle.orchestratorName}`);
  console.log(`INSERT INTO public.lab_orchestrator_configs (id, name, description, steps, is_public, created_at, updated_at)`);
  console.log(`VALUES ('${crypto.randomUUID()}', '${bundle.orchestratorName}', '${bundle.orchestratorDescription || ""}', '${stepsJson}'::jsonb, TRUE, NOW(), NOW());`);
  
  // Prompt Templates
  bundle.steps.forEach(s => {
    const pPath = path.join(dirPath, 'prompts', `${s.stage_key}.md`);
    let content = "";
    if (fs.existsSync(pPath)) {
      content = fs.readFileSync(pPath, 'utf8').replace(/'/g, "''");
    }
    console.log(`\n-- Prompt for ${s.stage_key}`);
    console.log(`INSERT INTO public.prompt_templates (id, name, template, default_ai_settings, is_active, stage_key)`);
    console.log(`VALUES ('${crypto.randomUUID()}', '${s.label}', '${content}', '${JSON.stringify(s.ai_settings)}'::jsonb, TRUE, '${s.stage_key}');`);
  });
  
  console.log(`${COLORS.CYAN}--- SQL OUTPUT END ---${COLORS.RESET}`);
}

const args = process.argv.slice(2);
const sqlFlag = args.includes('--sql');
const allFlag = args.includes('--all');
const pathArg = args.find(a => !a.startsWith('--'));

if (!pathArg) {
  console.error("Usage: tsx validate.ts <dir_path> [--sql] [--all]");
  process.exit(1);
}

const targetPath = path.resolve(pathArg);
if (!fs.existsSync(targetPath)) {
  console.error(`Error: Path ${targetPath} does not exist`);
  process.exit(1);
}

if (allFlag) {
  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  let successCount = 0;
  let totalCount = 0;

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(targetPath, entry.name);
      if (fs.existsSync(path.join(fullPath, 'orchestration.json'))) {
        totalCount++;
        if (validate(fullPath, { sql: sqlFlag })) {
          successCount++;
        }
      }
    }
  }

  console.log(`${COLORS.BOLD}Batch Validation Summary:${COLORS.RESET}`);
  console.log(`${successCount === totalCount ? COLORS.GREEN : COLORS.RED}${successCount}/${totalCount} configurations passed.${COLORS.RESET}`);
  process.exit(successCount === totalCount ? 0 : 1);
} else {
  const stats = fs.statSync(targetPath);
  if (stats.isDirectory()) {
    const success = validate(targetPath, { sql: sqlFlag });
    process.exit(success ? 0 : 1);
  } else {
    console.error(`Error: ${targetPath} is not a directory. Use --all to scan a parent directory.`);
    process.exit(1);
  }
}
