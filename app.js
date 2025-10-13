
function stripBOM(s){ if(!s) return s; return s.replace(/^\uFEFF/, ''); }
function applySavedFontSize(){ const size = localStorage.getItem('fontSize') || '20'; document.documentElement.style.setProperty('--font-size', size + 'px'); }
function startLearning(wordbook){ if(!wordbook){ alert('单词书不存在'); return; } applySavedFontSize(); let index = 0, showingFront = true; const container = document.getElementById('page-container');
  function render(){
    const w = wordbook.words[index] || {word:'', meaning:'', example:'', pronunciation:''};
    container.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className='container';
    const cardWrapper = document.createElement('div'); cardWrapper.className='card-wrapper';
    const flip = document.createElement('div'); flip.className='flip-card'; flip.id='flip-card';
    const front = document.createElement('div'); front.className='card-face front visible';
    const back = document.createElement('div'); back.className='card-face back hidden';
    const wordDiv = document.createElement('div'); wordDiv.className='word-text'; wordDiv.textContent = stripBOM(w.word || '');
    const pron = document.createElement('div'); pron.style.marginTop = '6px'; pron.style.color = '#666'; pron.textContent = stripBOM(w.pronunciation || '');
    const meaningDiv = document.createElement('div'); meaningDiv.className = 'meaning-text'; meaningDiv.textContent = stripBOM(w.meaning || '');
    const exampleDiv = document.createElement('div'); exampleDiv.className = 'example-text'; exampleDiv.textContent = stripBOM(w.example || '');
    front.appendChild(wordDiv); if ((w.pronunciation||'').trim()) front.appendChild(pron);
    back.appendChild(meaningDiv); if ((w.example||'').trim()) back.appendChild(exampleDiv);
    flip.appendChild(front); flip.appendChild(back); cardWrapper.appendChild(flip); wrap.appendChild(cardWrapper);
    const controls = document.createElement('div'); controls.className='controls';
    const prevBtn = document.createElement('button'); prevBtn.textContent = '上一个';
    const prog = document.createElement('div'); prog.className = 'progress'; prog.textContent = (index+1) + ' / ' + wordbook.words.length;
    // clickable progress for jump
    prog.addEventListener('click', ()=>{
      const v = prompt('跳转到第几项（1 - ' + wordbook.words.length + '）?');
      if (v !== null){
        const num = parseInt(v);
        if (!isNaN(num) && num>=1 && num<=wordbook.words.length){ index = num-1; showingFront = true; render(); }
        else { alert('输入无效'); }
      }
    });
    const nextBtn = document.createElement('button'); nextBtn.textContent = '下一个';
    controls.appendChild(prevBtn); controls.appendChild(prog); controls.appendChild(nextBtn); wrap.appendChild(controls);
    container.appendChild(wrap);
    // flip behavior
    flip.onclick = ()=>{
      if (showingFront){ front.classList.remove('visible'); front.classList.add('hidden'); back.classList.remove('hidden'); back.classList.add('visible'); }
      else { back.classList.remove('visible'); back.classList.add('hidden'); front.classList.remove('hidden'); front.classList.add('visible'); }
      showingFront = !showingFront;
    };
    prevBtn.onclick = ()=>{ index = (index - 1 + wordbook.words.length) % wordbook.words.length; showingFront = true; render(); };
    nextBtn.onclick = ()=>{ index = (index + 1) % wordbook.words.length; showingFront = true; render(); };
    // swipe support
    let startX = 0;
    flip.addEventListener('touchstart', e=>{ startX = e.touches[0].clientX; });
    flip.addEventListener('touchend', e=>{ const dx = e.changedTouches[0].clientX - startX; if (Math.abs(dx) > 40){ if (dx > 0) prevBtn.click(); else nextBtn.click(); } });
  }
  render();
  window.addEventListener('storage', (e) => { if (e.key === 'fontSize') applySavedFontSize(); });
}
window.onload = ()=>{ applySavedFontSize(); showWordbooks(); };
