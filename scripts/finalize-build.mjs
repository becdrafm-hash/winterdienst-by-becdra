import { readFile, readdir, writeFile } from 'node:fs/promises';
const assets = (await readdir('dist/assets')).filter(name => /\.(js|css)$/.test(name)).map(name => '/assets/' + name);
const shell = ['/', '/index.html', '/manifest.webmanifest', '/becdra-fm-winterdienst-192.png', '/becdra-fm-winterdienst-512.png', ...assets];
const source = await readFile('dist/sw.js', 'utf8');
await writeFile('dist/sw.js', source.replace(/const APP_SHELL = .*?;/, 'const APP_SHELL = ' + JSON.stringify(shell) + ';'));
console.log('Offline app shell prepared with ' + assets.length + ' bundled assets.');
