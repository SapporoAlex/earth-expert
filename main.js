const homeScreen = document.getElementById('home-screen');
const regionGrid = document.getElementById('region-grid');
const gameScreen = document.getElementById('game-screen');
const homeButton = document.getElementById('home-button');
const mapContainer = document.getElementById('map-container');

const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const scoreText = document.getElementById('score');
const bestScoreText = document.getElementById('best-score');
const totalCountText = document.getElementById('total-count');
const retry = document.getElementById('retry');

const correctSound = new Audio('correct.mp3');
const incorrectSound = new Audio('incorrect.mp3');

let currentRegion = null;
let panZoomInstance = null;

function bestScoreKey(region) {
  return `earthExpert:bestScore:${region.id}`;
}

function getBestScore(region) {
  return Number(localStorage.getItem(bestScoreKey(region))) || 0;
}

function setBestScore(region, value) {
  localStorage.setItem(bestScoreKey(region), value);
}

function labelFor(el) {
  return el.dataset.name || el.id;
}

function renderHome() {
  regionGrid.innerHTML = '';
  REGIONS.forEach(region => {
    const card = document.createElement('button');
    card.className = 'region-card' + (region.comingSoon ? ' is-disabled' : '');
    card.disabled = !!region.comingSoon;

    const status = region.comingSoon
      ? 'Coming soon'
      : `Best: ${getBestScore(region)}/${region.total}`;

    card.innerHTML = `
      <span class="region-emoji">${region.emoji}</span>
      <span class="region-name">${region.name}</span>
      <span class="region-subtitle">${region.subtitle}</span>
      <span class="region-status">${status}</span>
    `;

    if (!region.comingSoon) {
      card.addEventListener('pointerdown', () => startRegion(region));
    }

    regionGrid.appendChild(card);
  });
}

function showHome() {
  if (panZoomInstance) {
    panZoomInstance.destroy();
    panZoomInstance = null;
  }
  gameScreen.classList.add('is-hidden');
  homeScreen.classList.remove('is-hidden');
  renderHome();
}

function startRegion(region) {
  homeScreen.classList.add('is-hidden');
  gameScreen.classList.remove('is-hidden');
  initGame(region);
}

homeButton.addEventListener('pointerdown', showHome);

retry.addEventListener('pointerdown', () => {
  retry.classList.add('is-hidden');
  initGame(currentRegion);
});

async function initGame(region) {
  currentRegion = region;
  mapContainer.innerHTML = '';

  const res = await fetch(region.svgFile);
  mapContainer.innerHTML = await res.text();
  await new Promise(resolve => requestAnimationFrame(resolve));

  if (panZoomInstance) {
    panZoomInstance.destroy();
    panZoomInstance = null;
  }

  const svgEl = mapContainer.querySelector('svg');
  svgEl.id = 'active-map';

  panZoomInstance = svgPanZoom('#active-map', {
    zoomEnabled: true,
    controlIconsEnabled: true,
    fit: true,
    center: true,
    customEventsHandler: svgPanZoom.mobileEventsHandler,
    dblClickZoomEnabled: false,
  });

  const all = Array.from(mapContainer.querySelectorAll(region.shapeSelector));
  let remaining = [...all];
  let target, score = 0;
  let questionNumber = 0;
  let lastClick = 0;
  retry.classList.add('is-hidden');

  totalCountText.textContent = all.length;
  bestScoreText.textContent = getBestScore(region);

  // 🎉 Animate fall-in effect
  all.forEach((el, i) => {
    el.classList.remove('animate-in'); // reset if replayed
    setTimeout(() => {
      el.classList.add('animate-in');
    }, i * 20); // staggered delay
  });

  function updateScore() {
    scoreText.textContent = score + "/" + questionNumber;
  }

  function checkBestScore() {
    if (score > getBestScore(region)) {
      setBestScore(region, score);
      bestScoreText.textContent = score;
    }
  }

  function pick() {
    if (remaining.length === 0) {
      questionText.textContent = '🎉 Game over!';
      answerText.textContent = `Final Score: ${score}/${all.length}`;
      checkBestScore();
      retry.classList.remove('is-hidden');
      return;
    }

    const index = Math.floor(Math.random() * remaining.length);
    target = remaining.splice(index, 1)[0];
    questionText.textContent = labelFor(target);
  }

  let selectedShape = null;

  all.forEach(el => {
    const handleInteraction = () => {
      const now = Date.now();
      if (now - lastClick < 200) return; // debounce
      lastClick = now;
      if (!target) return;

      if (selectedShape !== el) {
        if (selectedShape) {
          selectedShape.classList.remove('is-highlighted');
        }
        selectedShape = el;
        el.classList.add('is-highlighted');
        answerText.innerText = `Tap again to confirm`;
        return;
      }

      questionNumber++;
      if (el === target) {
        score++;
        answerText.innerText = "✅ Correct!";
        correctSound.play();
        selectedShape.classList.remove('is-highlighted');
        target.classList.add('is-correct');
      } else {
        answerText.innerText = `❌ Incorrect! That was ${labelFor(el)}`;
        incorrectSound.play();
        selectedShape.classList.remove('is-highlighted');
        target.classList.add('is-incorrect');
      }

      selectedShape = null;
      updateScore();
      pick();
    };

    el.addEventListener('pointerdown', handleInteraction);
  });

  updateScore();
  pick();
}

showHome();
