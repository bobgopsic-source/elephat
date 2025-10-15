function stripBOM(s){ if(!s) return s; return s.replace(/^\uFEFF/, ''); }
function applySavedFontSize(){ const size = localStorage.getItem('fontSize') || '20'; document.documentElement.style.setProperty('--font-size', size + 'px'); }

// 模态框关闭动画函数 (原有)
function closeAnimatedModal(modal) {
    modal.classList.add('hide');
    setTimeout(() => {
        modal.remove();
    }, 200); // 200ms 匹配 CSS 中的 0.2s 动画时长
}

// 主视图（学习页面）关闭动画函数 (已应用到返回按钮)
function closeLearningViewAnimated(viewElement, callback) {
    viewElement.classList.add('slide-out');
    setTimeout(() => {
        callback(); // 触发页面切换（showWordbooks）
    }, 200);
}

function saveCurrentState(wordbookId, index){
  localStorage.setItem('currentWordbook', wordbookId);
  localStorage.setItem('currentIndex', index.toString());
}

function getSavedState(){
  return {
    wordbookId: localStorage.getItem('currentWordbook'),
    index: parseInt(localStorage.getItem('currentIndex') || '0')
  };
}

window.getSavedState = getSavedState;
window.startLearning = startLearning;

function startLearning(wordbook){ 
  if(!wordbook){ alert('单词书不存在'); return; } 
  applySavedFontSize(); 
  localStorage.setItem('isLearning', 'true');
  
  const savedState = getSavedState();
  let index = (savedState.wordbookId === wordbook.id) ? savedState.index : 0;
  let showingFront = true;
  const container = document.getElementById('page-container');
  
  const emojis = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐','🖖','👋','💪','🦾','🙏','✍️','💅','🤳','💃','🕺','🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','⭐','🌟','✨','💫','💥','🔥','💯','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'];
  const emojiObjects = [];
  
  async function checkIfFavorited(word){
    const favId = 'favorites_wordbook';
    let favBook = await getWordbook(favId);
    if (!favBook) return false;
    return favBook.words.some(w => w.word === word.word && w.meaning === word.meaning);
  }
  
  async function toggleFavorite(word){
    const favId = 'favorites_wordbook';
    let favBook = await getWordbook(favId);
    if (!favBook){
      favBook = {id: favId, name: '收藏', words: [], createdAt: Date.now(), clickCount: 0};
    }
    const existIndex = favBook.words.findIndex(w => w.word === word.word && w.meaning === word.meaning);
    if (existIndex >= 0){
      favBook.words.splice(existIndex, 1);
    } else {
      favBook.words.push({id: favBook.words.length + 1, word: word.word, meaning: word.meaning, pronunciation: word.pronunciation, example: word.example, note: word.note || ''});
    }
    await saveWordbook(favBook);
  }
  
  function editWord(word, callback){
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content"><h3>编辑单词</h3><div class="modal-form"><label>单词：</label><input type="text" id="edit-word" value="${stripBOM(word.word || '')}"><label>发音：</label><input type="text" id="edit-pronunciation" value="${stripBOM(word.pronunciation || '')}"><label>释义：</label><textarea id="edit-meaning" rows="3">${stripBOM(word.meaning || '')}</textarea><label>例句：</label><textarea id="edit-example" rows="3">${stripBOM(word.example || '')}</textarea></div><div class="modal-buttons"><button class="modal-btn-cancel">取消</button><button class="modal-btn-confirm">确定</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-btn-cancel').onclick = () => closeAnimatedModal(modal);
    modal.querySelector('.modal-btn-confirm').onclick = () => {
      word.word = document.getElementById('edit-word').value;
      word.pronunciation = document.getElementById('edit-pronunciation').value;
      word.meaning = document.getElementById('edit-meaning').value;
      word.example = document.getElementById('edit-example').value;
      closeAnimatedModal(modal);
      callback();
    };
    modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
  }
  
  function addNote(word, callback){
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content"><h3>添加备注</h3><div class="modal-form"><label>备注内容：</label><textarea id="note-text" rows="5" placeholder="输入备注...">${stripBOM(word.note || '')}</textarea></div><div class="modal-buttons"><button class="modal-btn-cancel">取消</button><button class="modal-btn-confirm">确定</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-btn-cancel').onclick = () => closeAnimatedModal(modal);
    modal.querySelector('.modal-btn-confirm').onclick = () => {
      word.note = document.getElementById('note-text').value;
      closeAnimatedModal(modal);
      callback();
    };
    modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
  }
  
  function deleteWord(callback){
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content"><h3>确认删除</h3><p>确定要删除这个单词吗？</p><div class="modal-buttons"><button class="modal-btn-cancel">取消</button><button class="modal-btn-confirm modal-btn-danger">删除</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-btn-cancel').onclick = () => closeAnimatedModal(modal);
    modal.querySelector('.modal-btn-confirm').onclick = () => {closeAnimatedModal(modal); callback();};
    modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
  }
  
  function showMenu(word, callbacks){
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content modal-menu"><button class="menu-item" data-action="edit">编辑单词</button><button class="menu-item" data-action="note">添加备注</button><button class="menu-item menu-item-danger" data-action="delete">删除单词</button></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('.menu-item').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        closeAnimatedModal(modal);
        if (callbacks[action]) callbacks[action]();
      };
    });
    modal.onclick = (e) => { if (e.target === modal) closeAnimatedModal(modal); };
  }
  
  function createFallingEmoji(){
    const emojiEnabled = localStorage.getItem('emojiEnabled');
    if (emojiEnabled === 'false') return;
    
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const emojiEl = document.createElement('div');
    emojiEl.className = 'falling-emoji';
    emojiEl.textContent = emoji;
    emojiEl.style.position = 'fixed';
    emojiEl.style.fontSize = '32px';
    emojiEl.style.zIndex = '1000';
    emojiEl.style.pointerEvents = 'none';
    emojiEl.style.userSelect = 'none';
    
    const cardArea = document.querySelector('.card-wrapper');
    if (!cardArea) return;
    
    const rect = cardArea.getBoundingClientRect();
    const startX = rect.left + 20 + Math.random() * (rect.width - 60);
    const startY = rect.top - 50;
    emojiEl.style.left = startX + 'px';
    emojiEl.style.top = startY + 'px';
    document.body.appendChild(emojiEl);
    
    const emojiSize = 32;
    const emojiObj = {element: emojiEl, x: startX, y: startY, vx: (Math.random() - 0.5) * 2, vy: 0, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 8, radius: emojiSize / 2, settled: false};
    emojiObjects.push(emojiObj);
    
    const gravity = 0.6, damping = 0.5, friction = 0.98;
    const bottomBoundary = rect.bottom - emojiSize / 2;
    const leftBoundary = rect.left + emojiSize / 2;
    const rightBoundary = rect.right - emojiSize / 2;
    
    function checkCollision(obj1, obj2){
      const dx = obj1.x - obj2.x, dy = obj1.y - obj2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDist = obj1.radius + obj2.radius;
      if (distance < minDist && !obj2.settled){
        const angle = Math.atan2(dy, dx);
        const overlap = minDist - distance;
        obj1.x += Math.cos(angle) * overlap * 0.5;
        obj1.y += Math.sin(angle) * overlap * 0.5;
        obj1.vy *= -0.3;
        return true;
      }
      return false;
    }
    
    function animate(){
      if (!document.body.contains(emojiEl)) return;
      emojiObj.vy += gravity;
      emojiObj.x += emojiObj.vx;
      emojiObj.y += emojiObj.vy;
      emojiObj.rotation += emojiObj.rotationSpeed;
      emojiObj.vx *= friction;
      
      if (emojiObj.x < leftBoundary){ emojiObj.x = leftBoundary; emojiObj.vx *= -0.5; }
      if (emojiObj.x > rightBoundary){ emojiObj.x = rightBoundary; emojiObj.vx *= -0.5; }
      if (emojiObj.y >= bottomBoundary){
        emojiObj.y = bottomBoundary;
        emojiObj.vy *= -damping;
        if (Math.abs(emojiObj.vy) < 0.5 && Math.abs(emojiObj.vx) < 0.3){
          emojiObj.vy = 0; emojiObj.vx = 0; emojiObj.rotationSpeed *= 0.5; emojiObj.settled = true;
        }
      }
      
      for (let other of emojiObjects){
        if (other !== emojiObj && other.settled){ checkCollision(emojiObj, other); }
      }
      
      emojiEl.style.left = emojiObj.x + 'px';
      emojiEl.style.top = emojiObj.y + 'px';
      emojiEl.style.transform = `translate(-50%, -50%) rotate(${emojiObj.rotation}deg)`;
      
      if (!emojiObj.settled || Math.abs(emojiObj.rotationSpeed) > 0.1){
        emojiObj.rotationSpeed *= 0.95;
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  }
  
  function clearAllEmojis(){
    document.querySelectorAll('.falling-emoji').forEach(el => el.remove());
    emojiObjects.length = 0;
  }
  
  async function render(){
    const w = wordbook.words[index] || {word:'', meaning:'', example:'', pronunciation:'', note:''};
    const isFavorited = await checkIfFavorited(w);
    
    container.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className='container';
    const cardWrapper = document.createElement('div'); cardWrapper.className='card-wrapper';
    const flip = document.createElement('div'); flip.className='flip-card'; flip.id='flip-card';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'card-top-btn card-top-btn-left';
    backBtn.innerHTML = '←';
    backBtn.title = '返回';
    backBtn.onclick = (e) => {
        e.stopPropagation(); 
        clearAllEmojis(); 
        localStorage.removeItem('isLearning'); 
        // 使用带动画的关闭函数
        closeLearningViewAnimated(wrap, showWordbooks);
    };
    
    const topRightButtons = document.createElement('div'); 
    topRightButtons.className = 'card-top-buttons-right';
    
    const favBtn = document.createElement('button');
    favBtn.className = 'card-top-btn';
    favBtn.innerHTML = isFavorited ? '★' : '☆';
    favBtn.style.color = isFavorited ? '#ffa726' : '#666';
    favBtn.title = isFavorited ? '取消收藏' : '收藏';
    favBtn.onclick = async (e) => {e.stopPropagation(); await toggleFavorite(w); render();};
    
    const menuBtn = document.createElement('button');
    menuBtn.className = 'card-top-btn';
    menuBtn.innerHTML = '⋯';
    menuBtn.title = '更多';
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      showMenu(w, {
        edit: () => editWord(w, async () => {await saveWordbook(wordbook); render();}),
        note: () => addNote(w, async () => {await saveWordbook(wordbook); render();}),
        delete: () => deleteWord(async () => {
          wordbook.words.splice(index, 1);
          if (wordbook.words.length === 0){alert('单词书已空'); clearAllEmojis(); localStorage.removeItem('isLearning'); showWordbooks(); return;}
          if (index >= wordbook.words.length) index = 0;
          await saveWordbook(wordbook); saveCurrentState(wordbook.id, index); render();
        })
      });
    };
    
    topRightButtons.appendChild(favBtn); topRightButtons.appendChild(menuBtn);
    
    const front = document.createElement('div'); front.className='card-face front visible';
    const back = document.createElement('div'); back.className='card-face back hidden';
    const wordDiv = document.createElement('div'); wordDiv.className='word-text'; wordDiv.textContent = stripBOM(w.word || '');
    const pron = document.createElement('div'); pron.style.marginTop = '6px'; pron.style.color = '#666'; pron.textContent = stripBOM(w.pronunciation || '');
    const meaningDiv = document.createElement('div'); meaningDiv.className = 'meaning-text'; meaningDiv.textContent = stripBOM(w.meaning || '');
    const exampleDiv = document.createElement('div'); exampleDiv.className = 'example-text'; exampleDiv.textContent = stripBOM(w.example || '');
    
    front.appendChild(wordDiv); if ((w.pronunciation||'').trim()) front.appendChild(pron);
    back.appendChild(meaningDiv); if ((w.example||'').trim()) back.appendChild(exampleDiv);
    
    if ((w.note || '').trim()){
      const noteDiv = document.createElement('div');
      noteDiv.className = 'note-text';
      noteDiv.textContent = stripBOM(w.note);
      back.appendChild(noteDiv);
    }
    
    flip.appendChild(backBtn); flip.appendChild(topRightButtons);
    flip.appendChild(front); flip.appendChild(back); cardWrapper.appendChild(flip); wrap.appendChild(cardWrapper);
    
    const controls = document.createElement('div'); controls.className='controls';
    const prevBtn = document.createElement('button'); prevBtn.textContent = '上一个';
    const prog = document.createElement('div'); prog.className = 'progress'; prog.textContent = (index+1) + ' / ' + wordbook.words.length;
    prog.addEventListener('click', ()=>{
      const v = prompt('跳转到第几项（1 - ' + wordbook.words.length + '）?');
      if (v !== null){
        const num = parseInt(v);
        if (!isNaN(num) && num>=1 && num<=wordbook.words.length){ index = num-1; showingFront = true; saveCurrentState(wordbook.id, index); render(); }
        else { alert('输入无效'); }
      }
    });
    const nextBtn = document.createElement('button'); nextBtn.textContent = '下一个';
    controls.appendChild(prevBtn); controls.appendChild(prog); controls.appendChild(nextBtn); wrap.appendChild(controls);
    container.appendChild(wrap);
    
    flip.onclick = ()=>{
      if (!wordbook.clickCount) wordbook.clickCount = 0;
      wordbook.clickCount++;
      saveWordbook(wordbook);
      createFallingEmoji();
      if (showingFront){ front.classList.remove('visible'); front.classList.add('hidden'); back.classList.remove('hidden'); back.classList.add('visible'); }
      else { back.classList.remove('visible'); back.classList.add('hidden'); front.classList.remove('hidden'); front.classList.add('visible'); }
      showingFront = !showingFront;
    };
    
    prevBtn.onclick = ()=>{ clearAllEmojis(); index = (index - 1 + wordbook.words.length) % wordbook.words.length; showingFront = true; saveCurrentState(wordbook.id, index); render(); };
    nextBtn.onclick = ()=>{ clearAllEmojis(); index = (index + 1) % wordbook.words.length; showingFront = true; saveCurrentState(wordbook.id, index); render(); };
    
    let startX = 0;
    flip.addEventListener('touchstart', e=>{ startX = e.touches[0].clientX; });
    flip.addEventListener('touchend', e=>{ const dx = e.changedTouches[0].clientX - startX; if (Math.abs(dx) > 40){ if (dx > 0) prevBtn.click(); else nextBtn.click(); } });
  }
  
  render();
  window.addEventListener('storage', (e) => { if (e.key === 'fontSize') applySavedFontSize(); });
}

window.onload = ()=>{ applySavedFontSize(); showWordbooks(); };
function showFontSizeModal(){
    const cur = localStorage.getItem('fontSize') || '20';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>字体大小预览</h3>
            <div class="font-preview" id="font-preview">
                <div class="preview-word">单词 Word</div>
                <div class="preview-meaning">释义和例句文本</div>
            </div>
            <div class="font-slider-container">
                <span class="font-size-label">小</span>
                <input type="range" id="font-range" min="14" max="36" value="${cur}" />
                <span class="font-size-label">大</span>
            </div>
            <div class="font-size-display">当前：<span id="font-value">${cur}px</span></div>
            <div class="modal-buttons">
                <button class="modal-btn-cancel">取消</button>
                <button class="modal-btn-confirm">确定</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const range = document.getElementById('font-range');
    const fontValue = document.getElementById('font-value');
    const preview = document.getElementById('font-preview');
    const originalSize = localStorage.getItem('fontSize') || '20';

    function updatePreview(size){
        preview.style.setProperty('--preview-font-size', size + 'px');
        fontValue.textContent = size + 'px';
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
