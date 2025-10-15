const page = document.getElementById('page-container');
let lastClickTime = 0;

document.getElementById('nav-wordbooks').addEventListener('click', async () => {
  const now = Date.now();
  const timeDiff = now - lastClickTime;
  lastClickTime = now;
  
  if (timeDiff < 1000){ localStorage.removeItem('isLearning'); showWordbooks(); return; }
  if (document.querySelector('.card-wrapper')){ localStorage.removeItem('isLearning'); showWordbooks(); return; }
  
  const isLearning = localStorage.getItem('isLearning') === 'true';
  if (isLearning){
    const savedState = window.getSavedState();
    if (savedState.wordbookId) {
      const wb = await getWordbook(savedState.wordbookId);
      if (wb) { window.startLearning(wb); return; }
    }
  }
  localStorage.removeItem('isLearning'); showWordbooks();
});

document.getElementById('nav-settings').addEventListener('click', showSettings);

async function showWordbooks(){
  localStorage.removeItem('isLearning');
  const favId = 'favorites_wordbook';
  let favBook = await getWordbook(favId);
  if (!favBook){ favBook = {id: favId, name: '收藏', words: [], createdAt: Date.now(), clickCount: 0}; await saveWordbook(favBook); }
  
  const books = await getAllWordbooks();
  const sortedBooks = books.sort((a, b) => { if (a.id === favId) return -1; if (b.id === favId) return 1; return 0; });
  
  page.innerHTML = `<div class='container'><div class='wordbooks-header'><h1>我的单词书</h1><p class='wordbooks-subtitle'>选择一个单词书开始学习</p></div><div class='wordbooks-grid'>${sortedBooks.map(b=>`<div class='wordbook-card ${b.id === favId ? 'wordbook-card-fav' : ''}' data-id='${b.id}'><div class='wordbook-card-title'>${b.name}</div><div class='wordbook-card-count'>${b.words ? b.words.length : 0} 个单词</div></div>`).join('')}<div class='wordbook-card wordbook-card-add' id='importBtn'><div class='add-icon'>+</div><div class='wordbook-card-title'>导入单词书</div></div></div></div>`;
  
  document.getElementById('importBtn').onclick=async()=>{
    const book=await window._importWordbookInteractive(); 
    if (book) { 
      book.createdAt = book.createdAt || Date.now();
      book.clickCount = book.clickCount || 0;
      await saveWordbook(book);
      alert('导入成功：' + book.words.length + ' 个单词'); 
      showWordbooks(); 
    }
  };
  
  document.querySelectorAll('.wordbook-card:not(.wordbook-card-add)').forEach(card => {
    card.onclick = async () => { const wb = await getWordbook(card.dataset.id); showWordbookDetail(wb); };
  });
}

async function showWordbookDetail(book){
  if (!book) return;
  if (!book.createdAt) book.createdAt = Date.now();
  if (!book.clickCount) book.clickCount = 0;
  
  const createdDate = new Date(book.createdAt).toLocaleDateString('zh-CN');
  const wordCount = book.words ? book.words.length : 0;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content wordbook-detail-modal"><h2 style="margin: 0 0 16px; font-size: 24px; text-align: center;">${book.name}</h2><div class="wordbook-info-box"><div class="info-item">添加日期：${createdDate}</div><div class="info-item">单词总数：${wordCount} 个</div><div class="info-item">点击次数：${book.clickCount} 次</div>${book.bookNote ? `<div class="info-item info-note"><strong>${book.bookNote}</strong></div>` : ''}</div><div class="wordbook-actions"><button class="wordbook-action-btn" id="enter-book">进入</button><button class="wordbook-action-btn" id="rename-book">重命名</button><button class="wordbook-action-btn" id="note-book">备注</button><button class="wordbook-action-btn wordbook-action-btn-danger" id="delete-book">删除</button></div></div>`;
  document.body.appendChild(modal);
  
  modal.querySelector('#enter-book').onclick = () => { closeAnimatedModal(modal); window.startLearning(book); };
  modal.querySelector('#rename-book').onclick = () => { closeAnimatedModal(modal); renameWordbook(book, async () => { await saveWordbook(book); showWordbooks(); }); };
  modal.querySelector('#note-book').onclick = () => { closeAnimatedModal(modal); editWordbookNote(book, async () => { await saveWordbook(book); showWordbookDetail(book); }); };
  modal.querySelector('#delete-book').onclick = () => { closeAnimatedModal(modal); deleteWordbook(book); };
  modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
}

function deleteWordbook(book){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content"><h3>确认删除</h3><p>确定要删除单词书"${book.name}"吗？此操作无法撤销。</p><div class="modal-buttons"><button class="modal-btn-cancel">取消</button><button class="modal-btn-confirm modal-btn-danger">删除</button></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('.modal-btn-cancel').onclick = () => closeAnimatedModal(modal);
  modal.querySelector('.modal-btn-confirm').onclick = async () => {
    const db = await openDB();
    const tx = db.transaction('wordbooks', 'readwrite');
    await tx.objectStore('wordbooks').delete(book.id);
    closeAnimatedModal(modal); showWordbooks();
  };
  modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
}

function renameWordbook(book, callback){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content"><h3>重命名单词书</h3><div class="modal-form"><label>新名称：</label><input type="text" id="book-rename" value="${book.name || ''}" placeholder="输入新名称"></div><div class="modal-buttons"><button class="modal-btn-cancel">取消</button><button class="modal-btn-confirm">确定</button></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('.modal-btn-cancel').onclick = () => closeAnimatedModal(modal);
  modal.querySelector('.modal-btn-confirm').onclick = () => {
    const newName = document.getElementById('book-rename').value.trim();
    if (!newName){ alert('名称不能为空'); return; }
    book.name = newName; closeAnimatedModal(modal); callback();
  };
  modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
}

function editWordbookNote(book, callback){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content"><h3>备注单词书</h3><div class="modal-form"><label>备注内容：</label><textarea id="book-note-text" rows="5" placeholder="输入备注...">${book.bookNote || ''}</textarea></div><div class="modal-buttons"><button class="modal-btn-cancel">取消</button><button class="modal-btn-confirm">确定</button></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('.modal-btn-cancel').onclick = () => closeAnimatedModal(modal);
  modal.querySelector('.modal-btn-confirm').onclick = () => {
    book.bookNote = document.getElementById('book-note-text').value;
    closeAnimatedModal(modal); callback();
  };
  modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
}

function showSettings(){
  const cur = localStorage.getItem('fontSize') || '20';
  const emojiEnabled = localStorage.getItem('emojiEnabled') !== 'false';
  
  page.innerHTML = `<div class='container'><div class='settings-container'><h2 style="text-align:center; margin-bottom:32px;">设置</h2><div class='settings-section'><button class='settings-action-btn' id='font-setting'>调整字体大小</button><button class='settings-action-btn' id='emoji-setting'>Emoji掉落效果<span class='toggle-indicator ${emojiEnabled ? 'toggle-on' : 'toggle-off'}'>${emojiEnabled ? '开' : '关'}</span></button></div></div><div class='developer-credit'>本应用由大象开发</div></div>`;
  
  document.getElementById('font-setting').onclick = () => { showFontSizeModal(); };
  document.getElementById('emoji-setting').onclick = () => { showEmojiToggleModal(); };
}

function showEmojiToggleModal(){
  const emojiEnabled = localStorage.getItem('emojiEnabled') !== 'false';
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content"><h3>Emoji掉落效果</h3><p>点击单词卡片时，是否在卡片上方掉落Emoji表情？</p><div class="emoji-toggle-options"><button class="emoji-toggle-btn ${emojiEnabled ? 'emoji-toggle-active' : ''}" data-value="true">开启</button><button class="emoji-toggle-btn ${!emojiEnabled ? 'emoji-toggle-active' : ''}" data-value="false">关闭</button></div><div class="modal-buttons"><button class="modal-btn-confirm">确定</button></div></div>`;
  document.body.appendChild(modal);
  
  let selectedValue = emojiEnabled;
  
  modal.querySelectorAll('.emoji-toggle-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.emoji-toggle-btn').forEach(b => b.classList.remove('emoji-toggle-active'));
      btn.classList.add('emoji-toggle-active');
      selectedValue = btn.dataset.value === 'true';
    };
  });
  
  modal.querySelector('.modal-btn-confirm').onclick = () => {
    localStorage.setItem('emojiEnabled', selectedValue.toString());
    closeAnimatedModal(modal);
    showSettings();
  };
  
  modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
}

function showFontSizeModal(){
  const cur = localStorage.getItem('fontSize') || '20';
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-content"><h3>字体大小预览</h3><div class="font-preview" id="font-preview"><div class="preview-word">单词 Word</div><div class="preview-meaning">释义和例句文本</div></div><div class="font-slider-container"><span class="font-size-label">小</span><input type="range" id="font-range" min="14" max="36" value="${cur}" /><span class="font-size-label">大</span></div><div class="font-size-display">当前：<span id="font-value">${cur}px</span></div><div class="modal-buttons"><button class="modal-btn-cancel">取消</button><button class="modal-btn-confirm">确定</button></div></div>`;
  document.body.appendChild(modal);
  
  const range = document.getElementById('font-range');
  const val = document.getElementById('font-value');
  const preview = document.getElementById('font-preview');
  const originalSize = localStorage.getItem('fontSize') || '20';
  
  function updatePreview(size){
    preview.style.setProperty('--preview-font-size', size + 'px');
    val.textContent = size + 'px';
  }
  
  updatePreview(cur);
  range.oninput = () => { updatePreview(range.value); };
  
  modal.querySelector('.modal-btn-cancel').onclick = () => {
    document.documentElement.style.setProperty('--font-size', originalSize + 'px');
    closeAnimatedModal(modal);
  };
  
  modal.querySelector('.modal-btn-confirm').onclick = () => {
    localStorage.setItem('fontSize', range.value);
    document.documentElement.style.setProperty('--font-size', range.value + 'px');
    window.dispatchEvent(new StorageEvent('storage',{key:'fontSize',newValue:range.value}));
    closeAnimatedModal(modal);
  };
  
  modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
}
