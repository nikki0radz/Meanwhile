const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),out=path.join(root,'public');
fs.mkdirSync(out,{recursive:true});
// Explicit allowlist: backend code, configuration and secrets never become public assets.
for(const file of ['index.html','styles.css','questions.js','app.js','ai.js','native-ui.js','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'])fs.copyFileSync(path.join(root,file),path.join(out,file));
require('esbuild').buildSync({entryPoints:[path.join(root,'native.js')],bundle:true,format:'iife',platform:'browser',target:'es2020',outfile:path.join(out,'native.bundle.js')});
console.log('Built Meanwhile app assets and native bridge.');
