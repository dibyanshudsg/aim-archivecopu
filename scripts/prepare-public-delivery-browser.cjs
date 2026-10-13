// Creates a new isolated synthetic DB. Never reads production configuration or data.
const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const fixture=require('./fixtures/pdf-access.cjs');
const root=path.resolve(__dirname,'..');
const dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'aim-public-browser-'));
const dbPath=path.join(dir,'catalogue.db');
const db=new DatabaseSync(dbPath);
for(const name of fs.readdirSync(path.join(root,'packages/turso/migrations')).filter(n=>n.endsWith('.sql')).sort())db.exec(fs.readFileSync(path.join(root,'packages/turso/migrations',name),'utf8'));
db.prepare('INSERT INTO magazines(id,name,language,created_at,updated_at) VALUES(?,?,?,?,?)').run('fixture-magazine','Synthetic Archive','english',fixture.now,fixture.now);
for(const i of fixture.issues)db.prepare('INSERT INTO issues(id,magazine_id,title,year,month,is_published,pdf_url,cover_image_url,page_count,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(i.id,i.magazine_id,i.title,i.year,i.month,i.is_published,i.pdf_url,i.cover_image_url,1,fixture.now,fixture.now);
if(process.argv.includes('--admin'))db.prepare('INSERT INTO admins VALUES(?,?,?,?)').run('synthetic-admin','admin@example.test','Synthetic admin',fixture.now);
db.close();
const assets=path.join(root,'output/playwright/p2-04-fixtures');
fs.mkdirSync(assets,{recursive:true});
for(const [key,object] of fixture.createObjects())fs.writeFileSync(path.join(assets,path.basename(key)),object.body);
console.log(dir);
