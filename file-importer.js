
function stripBOM(s){ if(!s) return s; return s.replace(/^\uFEFF/, ''); }

async function decodeFileToText(file){
  const arr = await file.arrayBuffer();
  try {
    const t = new TextDecoder('utf-8', {fatal:false}).decode(arr);
    if ((t.match(/\uFFFD/g)||[]).length === 0) return t;
  } catch(e){}
  try {
    const t2 = new TextDecoder('gbk').decode(arr);
    if ((t2.match(/\uFFFD/g)||[]).length === 0) return t2;
  } catch(e){}
  try {
    const text = await new Promise((res,rej)=>{
      const fr = new FileReader();
      fr.onload = ()=>res(fr.result);
      fr.onerror = (err)=>rej(err);
      try { fr.readAsText(file, 'GBK'); } catch(e){ rej(e); }
    });
    if ((text.match(/\uFFFD/g)||[]).length === 0) return text;
  } catch(e){}
  try { return new TextDecoder('utf-8').decode(arr); } catch(e){ return null; }
}

async function importWordbookInteractive(){
  return new Promise((resolve)=>{
    const input = document.createElement('input');
    input.type='file'; input.accept='.json,.csv';
    input.onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) { resolve(null); return; }
      const text = await decodeFileToText(f);
      if (!text) { alert('无法识别文件编码，请将文件保存为 UTF-8 后重试。'); resolve(null); return; }
      let book = null;
      if (f.name.toLowerCase().endsWith('.json')){
        try { book = JSON.parse(text); }
        catch(e){ alert('JSON 解析失败'); resolve(null); return; }
      } else if (f.name.toLowerCase().endsWith('.csv')){
        const lines = text.trim().split(/\r?\n/);
        const headers = lines[0].split(',').map(s=>s.trim().toLowerCase());
        const rows = lines.slice(1).map((ln, idx) => {
          const cols = ln.split(',');
          return {
            id: idx+1,
            word: stripBOM((cols[0]||'').trim()),
            meaning: stripBOM((cols[1]||'').trim()),
            pronunciation: stripBOM((cols[2]||'').trim()),
            example: stripBOM((cols[3]||'').trim())
          };
        });
        book = { id: 'wb_' + Date.now(), name: f.name.replace(/\.csv$/i,''), words: rows };
      } else {
        alert('仅支持 .json 或 .csv');
        resolve(null); return;
      }
      if (book.words && Array.isArray(book.words)){
        book.words = book.words.map((w,i)=>({ id: w.id||i+1, word: stripBOM((w.word||'').toString()), meaning: stripBOM((w.meaning||'').toString()), pronunciation: stripBOM((w.pronunciation||'').toString()), example: stripBOM((w.example||'').toString()) }));
      } else { alert('单词书格式错误'); resolve(null); return; }
      await saveWordbook(book);
      resolve(book);
    };
    input.click();
  });
}

window._importWordbookInteractive = importWordbookInteractive;
