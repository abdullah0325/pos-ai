const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('app/globals.css', 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*(#[a-f\d]{6})\s*;/gi)].map(m => [m[1],m[2]]));
function luminance(hex) {
  const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
function check(name, fg, bg, minimum=4.5) {
  const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  assert.ok(ratio>=minimum, `${name}: ${ratio.toFixed(2)}:1, expected ${minimum}:1`);
}
const lightSurfaces=['#ffffff', '#e5f0e9', '#e2ecf8', '#f3ead8', '#e9e3f4', '#e1efef', '#f3e4df'];
for(const bg of lightSurfaces) for(const key of ['--text-strong','--text-secondary','--success','--warning','--danger','--info','--purple']) check(`${key} on ${bg}`,tokens[key],bg);
for(const key of ['--primary','--primary-hover','--primary-active','--danger','--danger-hover','--rust','--rust-hover','--info','--purple','--warning','--teal','--indigo','--sky','--orange','--dark-surface']) check(`white on ${key}`,tokens['--on-solid'],tokens[key]);
for(const bg of lightSurfaces)check(`control border on ${bg}`,tokens['--control-border'],bg,3);
check('placeholder',tokens['--text-placeholder'],'#ffffff');
check('disabled',tokens['--disabled-text'],tokens['--disabled-surface']);
check('dark secondary',tokens['--dark-secondary'],tokens['--dark-surface']);
assert.ok(!css.includes('body :where(h1'), 'Do not force every descendant text color');
console.log('Color token contrast checks passed (text 4.5:1, controls 3:1).');
