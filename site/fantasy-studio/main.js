import {createEditor} from './app/editor.js';
import {runReviewCommands} from './app/review-commands.js';

const params = new URLSearchParams(location.search);
const studio = createEditor({params});
window.studio = studio;
export const selectClass = studio.selectClass;
await studio.start();
await runReviewCommands(studio, params);

if (params.has('publication-check') && ['127.0.0.1', 'localhost'].includes(location.hostname)) await import('/__checks.js');
