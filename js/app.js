// ==================================================================
// --- 从 弹跳动画.html 移植过来的 Matter.js 代码 ---
// ==================================================================

const { Engine, Runner, World, Bodies, Common, Vertices } = Matter;

const PHYSICS_SCALE = 0.6; 
const RENDER_SCALE = 0.55; 
const PIXEL_STEP = 6;

let engine;
let world;
let runner;
let emojiShapes = {};
const activeBodies = []; 
const fullEmojiList = [
    '😀', '🤣', '😂', '😍', '🤩', '😘', '😗', '😋', '😜', '🤪', '🤭', '🤫', '😎', '🤓', '🥳', '😈', '💀', '👻', '🤖', '💩', '👋', '👍', '💪', '🧠', '🍎', '🍌', '🍉', '🍕', '🍔', '🎁', '🎈', '🎉', '🎊', '❤️', '🔥', '💧', '☀️', '⚽', '🏀', '💰', '💵', '🔔', '🎤', '🎧'
];
let emojiPool = [];

let emojiShapesReady = false;

const hiddenCanvas = document.createElement('canvas');
hiddenCanvas.width = 128;
hiddenCanvas.height = 128;

function resetEmojiPool() {
    emojiPool = Common.shuffle([...fullEmojiList]).slice(0, 30); 
}

function generateEmojiShapeData(emoji) {
    const hiddenCtx = hiddenCanvas.getContext('2d');
    const size = hiddenCanvas.width;
    
    hiddenCtx.clearRect(0, 0, size, size);
    hiddenCtx.font = '100px Arial, sans-serif'; 
    hiddenCtx.textAlign = 'center';
    hiddenCtx.textBaseline = 'middle';
    hiddenCtx.fillText(emoji, size / 2, size / 2 + 10);

    const imageData = hiddenCtx.getImageData(0, 0, size, size);
    const data = imageData.data;
    let minX = size, minY = size, maxX = 0, maxY = 0;
    let foundPixel = false;
    const boundaryPoints = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const index = (y * size + x) * 4;
            if (data[index + 3] > 0) {
                foundPixel = true;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                
                if (x % PIXEL_STEP === 0 && y % PIXEL_STEP === 0) {
                    boundaryPoints.push({ x: x, y: y });
                }
            }
        }
    }

    if (!foundPixel || boundaryPoints.length < 3) {
        return { texture: hiddenCanvas, vertices: null, width: 100 * PHYSICS_SCALE, height: 100 * PHYSICS_SCALE };
    }
    
    const trimLeft = minX;
    const trimTop = minY;
    const trimWidth = maxX - minX + 1;
    const trimHeight = maxY - minY + 1;
    
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = trimWidth;
    croppedCanvas.height = trimHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.drawImage(hiddenCanvas, trimLeft, trimTop, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight);
    
    const hull = Vertices.hull(boundaryPoints);
    
    const scaledVertices = hull.map(p => ({
        x: (p.x - trimLeft - trimWidth / 2) * PHYSICS_SCALE, 
        y: (p.y - trimTop - trimHeight / 2) * PHYSICS_SCALE
    }));

    return { texture: croppedCanvas, vertices: scaledVertices, width: trimWidth, height: trimHeight };
}

function precomputeEmojiShapes() {
    return new Promise(resolve => {
        setTimeout(() => { 
            console.log('正在计算 Emoji 物理形状...');
            fullEmojiList.forEach(emoji => {
                emojiShapes[emoji] = generateEmojiShapeData(emoji);
            });
            resetEmojiPool();
            emojiShapesReady = true;
            console.log('Emoji 物理形状计算完毕!');
            resolve();
        }, 10);
    });
}

function initPhysics(canvasElement) {
    const canvas = canvasElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 1; 

    const wallThickness = 50;
    const options = { isStatic: true, restitution: 0.8, friction: 0.05, label: 'Wall' };

    World.add(world, [
        Bodies.rectangle(canvas.width / 2, canvas.height + wallThickness / 2, canvas.width, wallThickness, options),
        Bodies.rectangle(-wallThickness / 2, canvas.height / 2, wallThickness, canvas.height + wallThickness, options),
        Bodies.rectangle(canvas.width + wallThickness / 2, canvas.height / 2, wallThickness, canvas.height + wallThickness, options)
    ]);

    runner = Runner.create({ timeScale: 1.5 });
    Runner.run(runner, engine);
    
    console.log('物理世界就绪!');
}

function dropEmoji(x) {
    if (emojiPool.length === 0) resetEmojiPool();

    const emoji = emojiPool.splice(Math.floor(Math.random() * emojiPool.length), 1)[0];
    const shapeData = emojiShapes[emoji];
    
    let body;
    const commonOptions = {
        restitution: 0.05, friction: 0.5, density: 0.1, frictionAir: 0.015, 
        label: emoji, angle: Math.random() * Math.PI * 2,
    };
    
    const physicsHeight = shapeData.height * PHYSICS_SCALE;

    if (shapeData.vertices && shapeData.vertices.length > 2) {
        body = Bodies.fromVertices(x, -physicsHeight / 2, shapeData.vertices, commonOptions, true);
    } else {
        const circleRadius = shapeData.width * PHYSICS_SCALE / 2;
        body = Bodies.circle(x, -circleRadius, circleRadius, commonOptions);
    }
    
    if (!body) {
        body = Bodies.circle(x, -50, 25 * PHYSICS_SCALE, commonOptions);
    }

    World.add(world, body);
    activeBodies.push(body);
}

function drawLoop(ctx) {
    if (!world) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let i = activeBodies.length - 1; i >= 0; i--) {
        const body = activeBodies[i];
        if (body.position.y > ctx.canvas.height * 2) {
            World.remove(world, body);
            activeBodies.splice(i, 1);
            continue;
        }
        
        const shapeData = emojiShapes[body.label];
        if (!shapeData) continue;

        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        const textureWidth = shapeData.width * RENDER_SCALE;
        const textureHeight = shapeData.height * RENDER_SCALE;
        ctx.drawImage(shapeData.texture, -textureWidth / 2, -textureHeight / 2, textureWidth, textureHeight);
        ctx.restore();
    }
    
    requestAnimationFrame(() => drawLoop(ctx));
}

// ==================================================================
// --- 移植代码结束 ---
// ==================================================================


function stripBOM(s){ if(!s) return s; return s.replace(/^\uFEFF/, ''); }
function applySavedFontSize(){ const size = localStorage.getItem('fontSize') || '20'; document.documentElement.style.setProperty('--font-size', size + 'px'); }

function closeAnimatedModal(modal) {
    modal.classList.add('hide');
    setTimeout(() => { modal.remove(); }, 200);
}

function closeLearningViewAnimated(viewElement, callback) {
    viewElement.classList.add('slide-out');
    setTimeout(() => { callback(); }, 200);
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
  if (!emojiShapesReady) {
      alert('Emoji 物理形状尚未准备好，请稍候重试。');
      return;
  }
  
  applySavedFontSize(); 
  localStorage.setItem('isLearning', 'true');
  
  const savedState = getSavedState();
  let index = (savedState.wordbookId === wordbook.id) ? savedState.index : 0;
  let showingFront = true;
  const container = document.getElementById('page-container');
  
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
  
  async function render(){
    const w = wordbook.words[index] || {word:'', meaning:'', example:'', pronunciation:'', note:''};
    const isFavorited = await checkIfFavorited(w);
    
    container.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className='container';
    const cardWrapper = document.createElement('div'); cardWrapper.className='card-wrapper';
    const flip = document.createElement('div'); flip.className='flip-card'; flip.id='flip-card';
    
    const canvas = document.createElement('canvas');
    canvas.id = 'physics-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none'; 
    // ✅ 移除内联 z-index，让 CSS 控制
    canvas.style.background = 'transparent';
    canvas.style.border = 'none';
    canvas.style.outline = 'none';

    flip.appendChild(canvas); 
    
    const backBtn = document.createElement('button');
    backBtn.className = 'card-top-btn card-top-btn-left';
    backBtn.innerHTML = '←';
    backBtn.title = '返回';
    backBtn.onclick = (e) => {
        e.stopPropagation(); 
        if (runner) Runner.stop(runner);
        if (world) World.clear(world, false);
        if (engine) Engine.clear(engine);
        world = null;
        activeBodies.length = 0;
        localStorage.removeItem('isLearning'); 
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
          if (wordbook.words.length === 0){alert('单词书已空'); backBtn.click(); return;}
          if (index >= wordbook.words.length) index = 0;
          await saveWordbook(wordbook); saveCurrentState(wordbook.id, index); render();
        })
      });
    };
    
    topRightButtons.appendChild(favBtn); topRightButtons.appendChild(menuBtn);
    
    const front = document.createElement('div'); front.className='card-face front visible';
    const back = document.createElement('div'); back.className='card-face back hidden';
    const wordDiv = document.createElement('div'); wordDiv.className='word-text'; wordDiv.textContent = stripBOM(w.word || '');
    
    const pron = document.createElement('div'); 
    pron.className = 'pronunciation-text';
    pron.textContent = stripBOM(w.pronunciation || '');
    
    const meaningDiv = document.createElement('div'); meaningDiv.className = 'meaning-text'; meaningDiv.textContent = stripBOM(w.meaning || '');
    const exampleDiv = document.createElement('div'); exampleDiv.className = 'example-text'; exampleDiv.textContent = stripBOM(w.example || '');
    
    // ✅ 创建顶层文字副本容器
    const textOverlay = document.createElement('div');
    textOverlay.className = 'text-overlay';
    textOverlay.id = 'text-overlay';
    
    // 复制正面文字
    const wordDivCopy = document.createElement('div'); 
    wordDivCopy.className='word-text'; 
    wordDivCopy.textContent = stripBOM(w.word || '');
    const pronCopy = document.createElement('div'); 
    pronCopy.className = 'pronunciation-text';
    pronCopy.textContent = stripBOM(w.pronunciation || '');
    
    // 复制背面文字
    const meaningDivCopy = document.createElement('div'); 
    meaningDivCopy.className = 'meaning-text'; 
    meaningDivCopy.textContent = stripBOM(w.meaning || '');
    const exampleDivCopy = document.createElement('div'); 
    exampleDivCopy.className = 'example-text'; 
    exampleDivCopy.textContent = stripBOM(w.example || '');
    
    flip.appendChild(backBtn); flip.appendChild(topRightButtons);
    flip.appendChild(front); flip.appendChild(back); 
    flip.appendChild(textOverlay); // ✅ 添加顶层文字层
    cardWrapper.appendChild(flip); wrap.appendChild(cardWrapper);
    
    front.appendChild(wordDiv); if ((w.pronunciation||'').trim()) front.appendChild(pron);
    back.appendChild(meaningDiv); if ((w.example||'').trim()) back.appendChild(exampleDiv);
    
    // ✅ 添加文字到顶层（默认显示正面）
    textOverlay.appendChild(wordDivCopy); 
    if ((w.pronunciation||'').trim()) textOverlay.appendChild(pronCopy);
    
    if ((w.note || '').trim()){
      const noteDiv = document.createElement('div');
      noteDiv.className = 'note-text';
      noteDiv.textContent = stripBOM(w.note);
      back.appendChild(noteDiv);
      
      // ✅ 复制备注到顶层
      const noteDivCopy = document.createElement('div');
      noteDivCopy.className = 'note-text';
      noteDivCopy.textContent = stripBOM(w.note);
      noteDivCopy.style.display = 'none'; // 默认隐藏
      textOverlay.appendChild(noteDivCopy);
    }
    
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
    
    initPhysics(canvas);
    drawLoop(canvas.getContext('2d'));

    flip.onclick = (event)=>{
      if (!wordbook.clickCount) wordbook.clickCount = 0;
      wordbook.clickCount++;
      saveWordbook(wordbook);

      const rect = flip.getBoundingClientRect();
      const x = event.clientX - rect.left;
      dropEmoji(x); 

      if (showingFront){ front.classList.remove('visible'); front.classList.add('hidden'); back.classList.remove('hidden'); back.classList.add('visible'); }
      else { back.classList.remove('visible'); back.classList.add('hidden'); front.classList.remove('hidden'); front.classList.add('visible'); }
      showingFront = !showingFront;
    };
    
    prevBtn.onclick = ()=>{ 
        if (world) World.clear(world, false); 
        activeBodies.length = 0;
        index = (index - 1 + wordbook.words.length) % wordbook.words.length; 
        showingFront = true; 
        saveCurrentState(wordbook.id, index); 
        render(); 
    };
    nextBtn.onclick = ()=>{ 
        if (world) World.clear(world, false); 
        activeBodies.length = 0;
        index = (index + 1) % wordbook.words.length; 
        showingFront = true; 
        saveCurrentState(wordbook.id, index); 
        render(); 
    };
    
    let startX = 0;
    flip.addEventListener('touchstart', e=>{ startX = e.touches[0].clientX; });
    flip.addEventListener('touchend', e=>{ const dx = e.changedTouches[0].clientX - startX; if (Math.abs(dx) > 40){ if (dx > 0) prevBtn.click(); else nextBtn.click(); } });
  }
  
  render();
  window.addEventListener('storage', (e) => { if (e.key === 'fontSize') applySavedFontSize(); });
}

window.onload = async ()=>{ 
    applySavedFontSize(); 
    await precomputeEmojiShapes(); 
    showWordbooks(); 
};

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
