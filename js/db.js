const DB_NAME='vocabDBv10', STORE='wordbooks';
function openDB(){return new Promise((res,rej)=>{const rq=indexedDB.open(DB_NAME,1); rq.onupgradeneeded=e=>{const db=e.target.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'});}; rq.onsuccess=()=>res(rq.result); rq.onerror=()=>rej(rq.error);});}
async function saveWordbook(book){const db=await openDB(); const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(book); return tx.complete;}
async function getAllWordbooks(){const db=await openDB(); return new Promise(res=>{const r=db.transaction(STORE).objectStore(STORE).getAll(); r.onsuccess=()=>res(r.result||[]);});}
async function getWordbook(id){const db=await openDB(); return new Promise(res=>{const r=db.transaction(STORE).objectStore(STORE).get(id); r.onsuccess=()=>res(r.result);});}
// 新增：删除单词书
async function deleteWordbook(id){const db=await openDB(); const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).delete(id); return tx.complete;}

// 暴露给全局，以便router.js调用
window.deleteWordbook = deleteWordbook;
