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

// 新增辅助函数：检查字符串是否主要由英文字母构成
function isMostlyEnglish(s) {
  // 检查是否包含至少一个英文字母，且汉字数量较少
  const totalLength = s.length;
  if (totalLength === 0) return false;
  const englishCount = (s.match(/[a-zA-Z]/g) || []).length;
  const chineseCount = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 宽松判断：英文数量 > 0 且 汉字数量 < 总长度的一半
  return englishCount > 0 && chineseCount < totalLength / 2;
}

// 新增辅助函数：检查字符串是否主要由汉字构成
function isMostlyChinese(s) {
  // 检查是否包含至少一个汉字
  const chineseCount = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
  return chineseCount > 0;
}

async function importWordbookInteractive(){
  return new Promise((resolve)=>{
    const input = document.createElement('input');
    // 更改：增加 .txt 支持
    input.type='file'; input.accept='.json,.csv,.txt';
    input.onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) { resolve(null); return; }
      const text = await decodeFileToText(f);
      if (!text) { alert('无法识别文件编码，请将文件保存为 UTF-8 后重试。'); resolve(null); return; }
      let book = null;
      const fileNameLower = f.name.toLowerCase();

      if (fileNameLower.endsWith('.json')){
        try { book = JSON.parse(text); }
        catch(e){ alert('JSON 解析失败'); resolve(null); return; }

      // 更改：支持 .csv 和 .txt (使用制表符分隔)
      } else if (fileNameLower.endsWith('.csv') || fileNameLower.endsWith('.txt')){
        // 判断分隔符：.csv 使用逗号，.txt 使用制表符
        const isCSV = fileNameLower.endsWith('.csv');
        const separator = isCSV ? ',' : /\t/;

        const lines = text.trim().split(/\r?\n/).filter(ln => ln.trim() !== '');
        
        if (lines.length === 0) {
           alert('文件内容为空'); resolve(null); return;
        }

        // 尝试从第一行获取列数据并确定 'word' 和 'meaning' 的索引
        const sampleCols = lines[0].split(separator).map(s => stripBOM(s).trim());
        let wordColIndex = -1;
        let meaningColIndex = -1;
        let pronunciationColIndex = -1; 

        for (let i = 0; i < sampleCols.length; i++) {
          const colText = sampleCols[i];
          if (wordColIndex === -1 && isMostlyEnglish(colText)) {
            wordColIndex = i;
          } else if (meaningColIndex === -1 && isMostlyChinese(colText)) {
            meaningColIndex = i;
          } else if (pronunciationColIndex === -1 && colText.includes('/') && isMostlyEnglish(colText)) {
            // 简单检查，如果包含斜杠且是英文，可能是音标
            pronunciationColIndex = i;
          }
        }
        
        // 如果是 CSV 文件，检查第一行是否像是标题行，并跳过
        let dataLines = lines;
        if (isCSV) {
            const headers = lines[0].split(',').map(s=>s.trim().toLowerCase());
            if (headers.includes('word') || headers.includes('meaning') || headers.includes('pronunciation')) {
                 dataLines = lines.slice(1);
            }
        }


        if (wordColIndex === -1 || meaningColIndex === -1) {
          alert('未能自动识别“单词”列（英文字母为主）或“释义”列（汉字为主）。请确保单词和释义在不同的列且至少有一行数据符合要求。');
          resolve(null); return;
        }

        const rows = dataLines.map((ln, idx) => {
          const cols = ln.split(separator);
          
          // 根据检测到的索引获取数据
          const word = (cols[wordColIndex] || '').trim();
          const meaning = (cols[meaningColIndex] || '').trim();
          
          // 可选的列
          const pronunciation = pronunciationColIndex !== -1 ? (cols[pronunciationColIndex] || '').trim() : '';
          
          // 示例句无法可靠自动识别，尝试取除 word/meaning/pronunciation 之外的第一列
          let example = '';
          const usedIndices = new Set([wordColIndex, meaningColIndex, pronunciationColIndex].filter(i => i !== -1));
          for(let i = 0; i < cols.length; i++){
             if (!usedIndices.has(i) && (cols[i]||'').trim().length > 0){
                 example = (cols[i]||'').trim();
                 break;
             }
          }
          
          return {
            id: idx + 1,
            word: stripBOM(word),
            meaning: stripBOM(meaning),
            pronunciation: stripBOM(pronunciation),
            example: stripBOM(example)
          };
        });

        if (rows.length === 0) {
          alert('文件未包含有效的单词数据。');
          resolve(null); return;
        }

        book = { id: 'wb_' + Date.now(), name: f.name.replace(/\.(csv|txt)$/i,''), words: rows };

      } else {
        // 更改提示信息
        alert('仅支持 .json、.csv 或 .txt');
        resolve(null); return;
      }
      
      // 最终检查和标准化逻辑不变
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
