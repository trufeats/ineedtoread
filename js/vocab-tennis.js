const setupScreen = document.getElementById('setupScreen');
const gameArea = document.getElementById('gameArea');
const eliminatedArea = document.getElementById('eliminatedArea');
const controls = document.getElementById('controls');
const checkBtn = document.getElementById('checkBtn');
const xBtn = document.getElementById('xBtn');
const timerEl = document.getElementById('timer');
const timerSection = document.getElementById('timerSection');
const restartBtn = document.getElementById('restart');
const endOverlay = document.getElementById('endOverlay');
const finalScores = document.getElementById('finalScores');
const finalWords = document.getElementById('finalWords');
const exportBtn = document.getElementById('exportWords');
const resizeHandle = document.getElementById('resizeTimer');
const timeDisplay = document.getElementById('timeDisplay');
const wordLog = document.getElementById('wordLog');
const quickOverlay = document.getElementById('quickOverlay');
const quickInput = document.getElementById('quickInput');
const searchOverlay = document.getElementById('searchOverlay');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchClose = document.getElementById('searchClose');
const screenOverlay = document.getElementById('screenOverlay');
const orbRain = document.getElementById('orbRain');
const infoOverlay = document.getElementById('infoOverlay');
const infoClose = document.getElementById('infoClose');
const multiplierOverlay = document.getElementById('multiplierOverlay');
const elements = ['fire','water','earth','air'];

let teams = [];
let activeTeams = [];
let currentTeam = null;
let awaitingTeamSelection = true;
let timerDuration = 30;
let remainingTime = timerDuration;
let timerInterval = null;
let paused = true;
const ball = document.createElement('div');
ball.id = 'ball';
const BALL_SPEED = 600; // ms

const undoStack = [];
const redoStack = [];

let draggingHud = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let shiftDown = false;
let cursorTrailActive = false;
let trailType = '';
let lastTeam = null;

function showMultiplier(text){
  multiplierOverlay.textContent = text;
  multiplierOverlay.classList.remove('hidden');
  setTimeout(() => multiplierOverlay.classList.add('hidden'), 800);
}

function isTyping(){
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

setupScreen.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const num = parseInt(btn.dataset.teams);
    initTeams(num);
    setupScreen.style.display = 'none';
    orbRain.classList.add('hidden');
  });
});

// Precomputed clip-path polygons so team regions always fill the screen
const CLIPS = {
  2: [
    'polygon(0 0, 100% 0, 0 100%)',               // top-left
    'polygon(100% 100%, 100% 0, 0 100%)'           // bottom-right
  ],
  3: [
    // Y-shaped split from an interior point
    'polygon(0 0, 0 100%, 66.666% 50%)',                 // left triangle
    'polygon(0 0, 100% 0, 100% 50%, 66.666% 50%)',       // upper region
    'polygon(0 100%, 100% 100%, 100% 50%, 66.666% 50%)'  // lower region
  ],
  4: [
    'polygon(50% 50%, 0 0, 100% 0)',              // top
    'polygon(50% 50%, 100% 0, 100% 100%)',         // right
    'polygon(50% 50%, 100% 100%, 0 100%)',         // bottom
    'polygon(50% 50%, 0 100%, 0 0)'                // left
  ]
};

function initTeams(num) {
  teams = [];
  activeTeams = [];
  lastTeam = null;
  gameArea.innerHTML = '';
  const colors = ['red','blue','green','white'];
  const positions = {
    2: [{x:25, y:25},{x:75, y:75}],
    3: [{x:22, y:50},{x:66.7, y:25},{x:66.7, y:75}],
    4: [{x:50, y:16.7},{x:83.3, y:50},{x:50, y:83.3},{x:16.7, y:50}]
  };
  for(let i=0;i<num;i++){
    const el = document.createElement('div');
    el.className = 'team ' + colors[i];
    el.dataset.index = i;
    el.style.clipPath = CLIPS[num][i];
    const score = document.createElement('div');
    score.className = 'score';
    score.textContent = '0';
    const mark = document.createElement('div');
    mark.className = 'watermark ' + elements[i];
    const pos = positions[num][i];
    score.style.left = pos.x + '%';
    score.style.top = pos.y + '%';
    mark.style.left = pos.x + '%';
    mark.style.top = pos.y + '%';
    el.appendChild(score);
    el.appendChild(mark);
    el.addEventListener('click', (e) => teamClicked(i, e));
    gameArea.appendChild(el);
    teams.push({index:i, score:0, el});
    activeTeams.push(i);
  }
  gameArea.appendChild(ball);
  ball.style.left = '50%';
  ball.style.top = '50%';
  timeDisplay.textContent = '\u221E';
}

function teamClicked(i, e){
  if(!awaitingTeamSelection) return;
  if(activeTeams.indexOf(i) === -1) return;
  const gameRect = gameArea.getBoundingClientRect();
  const x = e.clientX - gameRect.left;
  const y = e.clientY - gameRect.top;
  const proceed = () => {
    if(ball.classList.contains('black') || ball.classList.contains('meteor')){
      rumbleScreen(ball.classList.contains('meteor'));
    }
    const startX = parseFloat(ball.style.left);
    const startY = parseFloat(ball.style.top);
    currentTeam = i;
    awaitingTeamSelection = false;
    controls.classList.remove('hidden');
    moveBall(x, y);
    const startTimeout = setTimeout(startTimer, BALL_SPEED);
    if(lastTeam !== null){
      setTimeout(() => {
        if(Math.random() < 0.01){
          clearTimeout(startTimeout);
          currentTeam = lastTeam;
          moveBall(startX, startY);
          setTimeout(startTimer, BALL_SPEED);
        }
      }, BALL_SPEED / 2);
    }
  };

  if(ball.classList.contains('blackhole')){
    awaitingTeamSelection = false;
    moveBall(x, y);
    setTimeout(() => {
      blackholeAt(e.clientX, e.clientY, () => {
        eliminateTeam(i);
        endRound();
        if(activeTeams.length === 1) endGame();
      });
    }, BALL_SPEED);
    return;
  }

  if(ball.classList.contains('black') || ball.classList.contains('meteor')){
    stopCursorTrail();
    engulfAt(e.clientX, e.clientY, proceed);
  } else {
    proceed();
  }
}

checkBtn.addEventListener('click', () => {
  if(currentTeam === null) return;
  teams[currentTeam].score++;
  teams[currentTeam].el.querySelector('.score').textContent = teams[currentTeam].score;
  lastTeam = currentTeam;
  endRound();
});

xBtn.addEventListener('click', () => {
  if(currentTeam === null) return;
  lastTeam = currentTeam;
  eliminateTeam(currentTeam);
  endRound();
  if(activeTeams.length === 1){
    endGame();
  }
});

function endRound(){
  stopTimer();
  controls.classList.add('hidden');
  awaitingTeamSelection = true;
  currentTeam = null;
  timeDisplay.textContent = '\u221E';
  maybeMutateBall();
}

function eliminateTeam(i){
  const team = teams[i];
  if(team.el.parentNode === gameArea){
    gameArea.removeChild(team.el);
    eliminatedArea.appendChild(team.el);
    eliminatedArea.classList.add('show');
  }
  activeTeams = activeTeams.filter(t => t !== i);
}

function endGame(){
  let winner = null;
  if(activeTeams.length === 1){
    winner = activeTeams[0];
    eliminateTeam(winner);
  }
  controls.classList.add('hidden');
  orbRain.classList.remove('hidden');
  resetHud();
  timeDisplay.textContent = '\u221E';
  renderEndOverlay(winner);
}

restartBtn.addEventListener('click', () => {
  location.reload();
});

exportBtn.addEventListener('click', exportWordList);

function renderEndOverlay(winner){
  finalScores.innerHTML = '';
  teams.forEach((t,i) => {
    const ft = document.createElement('div');
    ft.className = 'final-team';
    const mark = document.createElement('div');
    mark.className = 'watermark ' + elements[i];
    const score = document.createElement('div');
    score.className = 'final-score';
    score.textContent = t.score;
    ft.appendChild(mark);
    ft.appendChild(score);
    if(i === winner){
      const crown = document.createElement('div');
      crown.className = 'crown';
      crown.textContent = '👑';
      ft.appendChild(crown);
    }
    finalScores.appendChild(ft);
  });
  const words = Array.from(wordLog.children).map((el,idx) => ({word:el.textContent, idx}));
  words.sort((a,b) => b.word.length - a.word.length || a.idx - b.idx);
  finalWords.innerHTML = words.map(w => `<span>${w.word}</span>`).join(' ');
  endOverlay.classList.remove('hidden');
}

function exportWordList(){
  let order = prompt('Export words in which order?\n1 = old to new\n2 = alphabetical\n3 = by length');
  if(!order) return;
  order = order.trim();
  let words = Array.from(wordLog.children).map((el,idx) => ({w:el.textContent, idx}));
  if(order === '2' || order.toLowerCase().startsWith('a')){
    words.sort((a,b) => a.w.localeCompare(b.w));
  } else if(order === '3' || order.toLowerCase().startsWith('l')){
    words.sort((a,b) => b.w.length - a.w.length || a.idx - b.idx);
  }
  const blob = new Blob([words.map(o=>o.w).join(';')], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wordlist.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function moveBall(x, y){
  if(ball.style.left && ball.style.top){
    const trail = document.createElement('div');
    trail.className = 'trail';
    trail.style.width = ball.offsetWidth + 'px';
    trail.style.height = ball.offsetHeight + 'px';
    trail.style.left = ball.style.left;
    trail.style.top = ball.style.top;
    gameArea.appendChild(trail);
    setTimeout(() => trail.remove(), 1200);
  }
  ball.style.left = x + 'px';
  ball.style.top = y + 'px';
}

function applyMutation(type){
  ball.classList.remove('black','meteor','blackhole');
  stopCursorTrail();
  if(type === 'blackhole'){
    flashScreen('purple');
    setTimeout(() => { ball.classList.add('blackhole'); }, 1000);
  } else if(type === 'meteor'){
    flashScreen('burgundy');
    showMultiplier('x3');
    setTimeout(() => { ball.classList.add('meteor'); startCursorTrail('meteor'); }, 1000);
  } else if(type === 'black'){
    flashScreen('charcoal');
    showMultiplier('x2');
    setTimeout(() => { ball.classList.add('black'); startCursorTrail('black'); }, 1000);
  }
}

function maybeMutateBall(){
  const r = Math.random();
  if(r < 0.0025){
    applyMutation('blackhole');
  } else if(r < 0.0275){
    applyMutation('meteor');
  } else if(r < 0.1075){
    applyMutation('black');
  } else {
    applyMutation('');
  }
}

function flashScreen(type){
  screenOverlay.className = type;
  screenOverlay.style.opacity = '1';
  setTimeout(() => {
    screenOverlay.style.opacity = '';
    screenOverlay.className = '';
  }, 800);
}

function rumbleScreen(strong=false){
  screenOverlay.style.opacity = '';
  screenOverlay.className = 'grey';
  document.body.classList.add(strong ? 'rumble-strong' : 'rumble');
  const duration = strong ? 2000 : 1000;
  setTimeout(() => {
    screenOverlay.className = '';
    document.body.classList.remove(strong ? 'rumble-strong' : 'rumble');
  }, duration);
}

function startCursorTrail(type){
  trailType = type;
  cursorTrailActive = true;
}

function stopCursorTrail(){
  cursorTrailActive = false;
}

function engulfAt(cx, cy, cb){
  const div = document.createElement('div');
  div.className = 'engulf';
  div.style.left = cx + 'px';
  div.style.top = cy + 'px';
  document.body.appendChild(div);
  setTimeout(() => {
    div.classList.add('fade');
    setTimeout(() => { div.remove(); cb(); }, 300);
  }, 600);
}

function blackholeAt(cx, cy, cb){
  const div = document.createElement('div');
  div.className = 'blackhole-anim';
  div.style.left = cx + 'px';
  div.style.top = cy + 'px';
  document.body.appendChild(div);
  div.addEventListener('animationend', () => {
    div.remove();
    cb();
  });
}

document.addEventListener('mousemove', (e) => {
  if(cursorTrailActive){
    const t = document.createElement('div');
    t.className = 'dark-trail' + (trailType === 'meteor' ? ' meteor' : '');
    t.style.left = e.clientX + 'px';
    t.style.top = e.clientY + 'px';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 600);
  }
});

function startTimer(){
  stopTimer();
  remainingTime = timerDuration;
  tick();
  timerInterval = setInterval(tick, 1000);
  paused = false;
}

function tick(){
  remainingTime--;
  if(remainingTime <= 0){
    remainingTime = 0;
    updateTimer();
    stopTimer();
  } else {
    updateTimer();
  }
}

function updateTimer(){
  timeDisplay.textContent = remainingTime;
}

function stopTimer(){
  clearInterval(timerInterval);
  timerInterval = null;
  paused = true;
}

function pauseTimer(){
  if(timerInterval){
    clearInterval(timerInterval);
    timerInterval = null;
    paused = true;
  }
}

function resumeTimer(){
  if(!timerInterval){
    timerInterval = setInterval(tick, 1000);
    paused = false;
  }
}



function addWord(word){
  const span = document.createElement('span');
  span.textContent = word;
  span.className = 'word';
  span.addEventListener('click', () => removeWord(span));
  const index = wordLog.children.length;
  wordLog.appendChild(span);
  undoStack.push({action:'add', element:span, index});
  redoStack.length = 0;
}

function removeWord(span){
  const index = Array.from(wordLog.children).indexOf(span);
  wordLog.removeChild(span);
  undoStack.push({action:'remove', element:span, index});
  redoStack.length = 0;
}

document.addEventListener('keydown', (e) => {
  if(e.key === 'Shift' && !isTyping()){
    shiftDown = true;
    timerSection.style.pointerEvents = 'auto';
  }
  if(isTyping()) return;
  const key = e.key.toLowerCase();
  if(e.shiftKey && awaitingTeamSelection && timeDisplay.textContent === '\u221E'){
    if(e.code === 'Digit1'){ applyMutation('black'); return; }
    if(e.code === 'Digit2'){ applyMutation('meteor'); return; }
    if(e.code === 'Digit3'){ applyMutation('blackhole'); return; }
  }
  if(key === 'z'){
    resetHud();
  } else if(key === ','){
    undo();
  } else if(key === '.'){
    redo();
  } else if(key === ' '){
    e.preventDefault();
    if(quickOverlay.classList.contains('hidden')) openQuick();
  } else if(key === 's'){
    e.preventDefault();
    if(searchOverlay.classList.contains('hidden')) openSearch();
  } else if(key === 'a'){
    e.preventDefault();
    checkBtn.click();
  } else if(key === 'd'){
    e.preventDefault();
    xBtn.click();
  } else if(key === 'i'){
    e.preventDefault();
    if(infoOverlay.classList.contains('hidden')) openInfo();
    else closeInfo();
  } else if(['1','2','3','5'].includes(key)){
    const mapping = { '1':10, '2':20, '3':30, '5':5 };
    timerDuration = mapping[key];
    remainingTime = timerDuration;
    updateTimer();
    if(!paused){
      pauseTimer();
      resumeTimer();
    }
  } else if(key === 'escape'){
    if(quickOverlay.classList.contains('hidden') &&
       searchOverlay.classList.contains('hidden') &&
       infoOverlay.classList.contains('hidden') &&
       endOverlay.classList.contains('hidden') &&
       setupScreen.style.display === 'none'){
      e.preventDefault();
      endGame();
    }
  }
});

document.addEventListener('keyup', (e) => {
  if(e.key === 'Shift'){
    shiftDown = false;
    timerSection.style.pointerEvents = 'none';
    draggingHud = false;
    resizing = false;
  }
  if(isTyping()) return;
  if(e.key === 'Escape' && !infoOverlay.classList.contains('hidden')){
    closeInfo();
  }
});

timerEl.addEventListener('mousedown', (e) => {
  if(!shiftDown || e.target === resizeHandle) return;
  draggingHud = true;
  const rect = timerSection.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if(draggingHud){
    timerSection.style.left = (e.clientX - dragOffsetX) + 'px';
    timerSection.style.top = (e.clientY - dragOffsetY) + 'px';
    timerSection.style.right = 'auto';
  }
});

document.addEventListener('mouseup', () => {
  draggingHud = false;
});

function resetHud(){
  timerSection.style.left = '';
  timerSection.style.top = '10px';
  timerSection.style.right = '10px';
  timerEl.style.width = '100px';
  timerEl.style.height = '100px';
  timerEl.style.fontSize = '60px';
}

function undo(){
  const op = undoStack.pop();
  if(!op) return;
  if(op.action === 'add'){
    wordLog.removeChild(op.element);
  } else if(op.action === 'remove'){
    const children = wordLog.children;
    if(op.index >= children.length){
      wordLog.appendChild(op.element);
    } else {
      wordLog.insertBefore(op.element, children[op.index]);
    }
  }
  redoStack.push(op);
}

function redo(){
  const op = redoStack.pop();
  if(!op) return;
  if(op.action === 'add'){
    const children = wordLog.children;
    if(op.index >= children.length){
      wordLog.appendChild(op.element);
    } else {
      wordLog.insertBefore(op.element, children[op.index]);
    }
  } else if(op.action === 'remove'){
    wordLog.removeChild(op.element);
  }
  undoStack.push(op);
}

function openQuick(){
  quickOverlay.classList.remove('hidden');
  quickInput.value = '';
  quickInput.focus();
}

function closeQuick(){
  quickOverlay.classList.add('hidden');
  quickInput.classList.remove('error');
}

quickInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){
    const val = quickInput.value.trim();
    if(val){
      const exists = Array.from(wordLog.children)
        .some(el => el.textContent.toLowerCase() === val.toLowerCase());
      if(exists){
        quickInput.classList.add('error');
        quickInput.addEventListener('animationend', () => quickInput.classList.remove('error'), {once:true});
      } else {
        addWord(val);
        closeQuick();
      }
    } else {
      closeQuick();
    }
  } else if(e.key === 'Escape'){
    closeQuick();
  }
});

function openSearch(){
  searchOverlay.classList.remove('hidden');
  searchInput.value = '';
  searchResults.innerHTML = '';
  searchInput.focus();
}

function closeSearch(){
  searchOverlay.classList.add('hidden');
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  const words = Array.from(wordLog.children)
    .map(el => el.textContent)
    .filter(w => w.toLowerCase().startsWith(q))
    .sort();
  searchResults.innerHTML = words.map(w => `<div>${w}</div>`).join('');
});

searchOverlay.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') closeSearch();
});

searchClose.addEventListener('click', closeSearch);

function openInfo(){
  infoOverlay.classList.remove('hidden');
}

function closeInfo(){
  infoOverlay.classList.add('hidden');
}

infoClose.addEventListener('click', closeInfo);

let resizing = false;
let startX = 0;
let startSize = 0;

resizeHandle.addEventListener('mousedown', (e) => {
  if(!shiftDown) return;
  resizing = true;
  startX = e.clientX;
  startSize = timerEl.offsetWidth;
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener('mousemove', (e) => {
  if(resizing){
    const newSize = Math.max(60, startSize + e.clientX - startX);
    timerEl.style.width = newSize + 'px';
    timerEl.style.height = newSize + 'px';
    timerEl.style.fontSize = (newSize * 0.6) + 'px';
  }
});

document.addEventListener('mouseup', () => {
  resizing = false;
});

function spawnRain(container){
  for(let i=0;i<30;i++){
    const orb = document.createElement('div');
    orb.className = 'rain-orb';
    orb.style.left = Math.random()*100 + '%';
    const duration = 3 + Math.random()*3;
    orb.style.animationDuration = duration + 's';
    orb.style.animationDelay = (-Math.random()*duration) + 's';
    container.appendChild(orb);
  }
}

spawnRain(orbRain);
