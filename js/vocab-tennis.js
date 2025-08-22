const setupScreen = document.getElementById('setupScreen');
const gameArea = document.getElementById('gameArea');
const eliminatedArea = document.getElementById('eliminatedArea');
const controls = document.getElementById('controls');
const checkBtn = document.getElementById('checkBtn');
const xBtn = document.getElementById('xBtn');
const timerEl = document.getElementById('timer');
const timerSection = document.getElementById('timerSection');
const restartBtn = document.getElementById('restart');
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

function initTeams(num) {
  teams = [];
  activeTeams = [];
  gameArea.innerHTML = '';
  const colors = ['red','blue','green','white'];
  const elements = ['fire','water','earth','air'];
  const positions = {
    2: [{x:33, y:33},{x:66, y:66}],
    3: [{x:50, y:17},{x:17, y:50},{x:83, y:50}],
    4: [{x:17, y:50},{x:50, y:17},{x:83, y:50},{x:50, y:83}]
  };
  for(let i=0;i<num;i++){
    const el = document.createElement('div');
    el.className = 'team ' + colors[i];
    el.dataset.index = i;
    if(num === 2){
      el.style.clipPath = i === 0 ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 100% 100%, 0 100%)';
    } else if(num === 3){
      el.style.clipPath = ['polygon(0 0, 100% 0, 50% 50%)', 'polygon(0 0, 50% 50%, 0 100%)', 'polygon(100% 0, 100% 100%, 50% 50%)'][i];
    } else {
      el.style.clipPath = ['polygon(0 0, 50% 50%, 0 100%)', 'polygon(0 0, 100% 0, 50% 50%)', 'polygon(100% 0, 100% 100%, 50% 50%)', 'polygon(0 100%, 50% 50%, 100% 100%)'][i];
    }
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
}

function teamClicked(i, e){
  if(!awaitingTeamSelection) return;
  if(activeTeams.indexOf(i) === -1) return;
  const gameRect = gameArea.getBoundingClientRect();
  const x = e.clientX - gameRect.left;
  const y = e.clientY - gameRect.top;
  if(ball.classList.contains('black') || ball.classList.contains('meteor')){
    rumbleScreen();
  }
  currentTeam = i;
  awaitingTeamSelection = false;
  controls.classList.remove('hidden');
  moveBall(x, y);
  setTimeout(startTimer, BALL_SPEED);
}

checkBtn.addEventListener('click', () => {
  if(currentTeam === null) return;
  teams[currentTeam].score++;
  teams[currentTeam].el.querySelector('.score').textContent = teams[currentTeam].score;
  endRound();
});

xBtn.addEventListener('click', () => {
  if(currentTeam === null) return;
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
  if(activeTeams.length === 1){
    const last = activeTeams[0];
    eliminateTeam(last);
  }
  controls.classList.add('hidden');
  restartBtn.classList.remove('hidden');
  orbRain.classList.remove('hidden');
}

restartBtn.addEventListener('click', () => {
  location.reload();
});

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

function maybeMutateBall(){
  const r = Math.random();
  ball.classList.remove('black','meteor');
  if(r < 0.025){
    ball.classList.add('meteor');
    flashScreen('burgundy');
    showMultiplier('x3');
  } else if(r < 0.105){
    ball.classList.add('black');
    flashScreen('charcoal');
    showMultiplier('x2');
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

function rumbleScreen(){
  screenOverlay.style.opacity = '';
  screenOverlay.className = 'grey';
  document.body.classList.add('rumble');
  setTimeout(() => {
    screenOverlay.className = '';
    document.body.classList.remove('rumble');
  }, 1000);
}

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
}

quickInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){
    const val = quickInput.value.trim();
    if(val){
      addWord(val);
    }
    closeQuick();
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
