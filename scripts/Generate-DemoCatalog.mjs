import fs from 'node:fs';
const source = new URL('../BE/Exercises/ExerciseCatalog.cs', import.meta.url);
const destination = new URL('../FE/training-app-frontend/src/app/pages-demo/catalog.ts', import.meta.url);
const entries = [...fs.readFileSync(source, 'utf8').matchAll(/new\("([a-z-]+)", "([^"]+)", "([^"]+)", "([^"]+)"(, true)?\)/g)]
  .map(([, id, name, muscleGroup, equipment, timed]) => ({ id, name, muscleGroup, equipment, timed: !!timed }));
if (entries.length < 40) throw new Error('Exercise catalog could not be parsed. Review the generator.');
const output = '// Generated from BE/Exercises/ExerciseCatalog.cs. Run scripts/Generate-DemoCatalog.mjs.\n'
  + "import type { ExerciseDefinition } from '../models/exercise.model';\n"
  + 'export const DEMO_CATALOG: ExerciseDefinition[] = ' + JSON.stringify(entries, null, 2) + ';\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') !== output) throw new Error('Regenerate the browser demo catalog.');
} else fs.writeFileSync(destination, output);
