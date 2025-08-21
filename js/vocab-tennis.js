const setupScreen = document.getElementById('setupScreen');
const gameArea = document.getElementById('gameArea');
const eliminatedArea = document.getElementById('eliminatedArea');
const controls = document.getElementById('controls');
const checkBtn = document.getElementById('checkBtn');
const xBtn = document.getElementById('xBtn');
const timerEl = document.getElementById('timer');
const restartBtn = document.getElementById('restart');
const wordInput = document.getElementById('wordInput');
const wordLog = document.getElementById('wordLog');
const toggleLog = document.getElementById('toggleLog');

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

setupScreen.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const num = parseInt(btn.dataset.teams);
    initTeams(num);
    setupScreen.style.display = 'none';
  });
});

function initTeams(num) {
  teams = [];
  activeTeams = [];
  gameArea.innerHTML = '';
  const colors = ['red','blue','green','white'];
  if(num === 2){
    gameArea.style.gridTemplateColumns = '1fr 1fr';
    gameArea.style.gridTemplateRows = '1fr';
  } else if(num === 3){
    gameArea.style.gridTemplateColumns = '1fr 1fr 1fr';
    gameArea.style.gridTemplateRows = '1fr';
  } else {
    gameArea.style.gridTemplateColumns = '1fr 1fr';
    gameArea.style.gridTemplateRows = '1fr 1fr';
  }
  for(let i=0;i<num;i++){
    const el = document.createElement('div');
    el.className = 'team ' + colors[i];
    el.dataset.index = i;
    const score = document.createElement('div');
    score.className = 'score';
    if(num === 2){
      score.classList.add(i === 0 ? 'left' : 'right');
    } else if(num === 3){
      score.classList.add(['left','center','right'][i]);
    } else {
      score.classList.add(['top-left','top-right','bottom-left','bottom-right'][i]);
    }
    score.textContent = '0';
    el.appendChild(score);
    el.addEventListener('click', () => teamClicked(i));
    gameArea.appendChild(el);
    teams.push({index:i, score:0, el});
    activeTeams.push(i);
  }
  gameArea.appendChild(ball);
  ball.style.left = '50%';
  ball.style.top = '50%';
}

function teamClicked(i){
  if(!awaitingTeamSelection) return;
  if(activeTeams.indexOf(i) === -1) return;
  currentTeam = i;
  awaitingTeamSelection = false;
  controls.classList.remove('hidden');
  moveBallToTeam(i);
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
}

restartBtn.addEventListener('click', () => {
  location.reload();
});

function moveBallToTeam(i){
  const teamEl = teams[i].el;
  const gameRect = gameArea.getBoundingClientRect();
  const rect = teamEl.getBoundingClientRect();
  const x = rect.left + rect.width/2 - gameRect.left;
  const y = rect.top + rect.height/2 - gameRect.top;
  if(ball.style.left && ball.style.top){
    const trail = document.createElement('div');
    trail.className = 'trail';
    trail.style.left = ball.style.left;
    trail.style.top = ball.style.top;
    gameArea.appendChild(trail);
    setTimeout(() => trail.remove(), BALL_SPEED);
  }
  ball.style.left = x + 'px';
  ball.style.top = y + 'px';
}

function startTimer(){
  remainingTime = timerDuration;
  updateTimer();
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
  timerEl.textContent = remainingTime;
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

timerEl.addEventListener('click', (e) => {
  if(e.shiftKey){
    remainingTime++;
    updateTimer();
    return;
  }
  if(paused){
    resumeTimer();
  } else {
    pauseTimer();
  }
});

document.querySelectorAll('.time-set').forEach(btn => {
  btn.addEventListener('click', () => {
    timerDuration = parseInt(btn.dataset.time);
    remainingTime = timerDuration;
    updateTimer();
    if(!paused){
      pauseTimer();
      resumeTimer();
    }
  });
});

wordInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){
    const val = wordInput.value.trim();
    if(val){
      addWord(val);
      wordInput.value = '';
    }
  }
});

toggleLog.addEventListener('click', () => {
  wordLog.classList.toggle('minimized');
  toggleLog.textContent = wordLog.classList.contains('minimized') ? '+' : '–';
});

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
  if(e.key === ','){
    undo();
  } else if(e.key === '.'){
    redo();
  }
});

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
