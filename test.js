import { readFileSync } from 'fs';

const html = readFileSync('worktracker.html', 'utf-8');

if (!html.includes('<button')) {
  console.error('No buttons found');
  process.exit(1);
}

console.log('Basic HTML structure verified');
