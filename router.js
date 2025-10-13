const page = document.getElementById('page-container');
document.getElementById('nav-wordbooks').addEventListener('click', showWordbooks);
document.getElementById('nav-settings').addEventListener('click', showSettings);

async function showWordbooks(){
  const books = await getAllWordbooks();
  page.innerHTML = `<div class='container'><h2 style="margin-top:0">我的单词书</h2><button id='importBtn'>导入单词书</button>${books.map(b=>`<button class='wordbook-btn' data-id='${b.id}'>${b.name}</button>`).join('')}</div>`;
  document.getElementById('importBtn').onclick=async()=>{const book=await window._importWordbookInteractive(); if (book) { alert('导入成功：' + book.words.length + ' 个单词'); showWordbooks(); }};
  document.querySelectorAll('.wordbook-btn').forEach(btn=>btn.onclick=async()=>{ const wb = await getWordbook(btn.dataset.id); startLearning(wb); });
}

function showSettings(){
  const cur = localStorage.getItem('fontSize') || '20';
  page.innerHTML = `<div class='container'><div class='settings-info'><h2>设置</h2><div class='settings-row'>字体大小: <input type='range' id='fontRange' min='14' max='36' value='${cur}'/> <span id='fontValue'>${cur}px</span></div></div><div class='developer-credit'>本应用由大象开发</div></div>`;
  const range = document.getElementById('fontRange');
  const val = document.getElementById('fontValue');
  function applySize(v){ document.documentElement.style.setProperty('--font-size', v + 'px'); val.textContent = v + 'px'; }
  applySize(cur);
  range.oninput = () => { applySize(range.value); localStorage.setItem('fontSize', range.value); window.dispatchEvent(new StorageEvent('storage',{key:'fontSize',newValue:range.value})); };
}