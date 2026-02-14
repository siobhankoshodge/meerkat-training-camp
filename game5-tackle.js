/* ===== Tackle Time Game ===== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const area = document.querySelector('.game-area');
    const w = Math.min(area.clientWidth - 30, 550);
    const h = Math.min(window.innerHeight - 320, 420);
    canvas.width = w;
    canvas.height = h;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); if (gameRunning) drawScene(); });

// ===== Constants =====
const TOTAL_WAVES = 10;

// ===== Game State =====
let gameRunning = false;
let currentWave = 0;
let tacklesWon = 0;
let results = []; // 'won', 'lost', null
let phase = 'idle'; // 'idle', 'approaching', 'timing', 'result'
let animFrameId = null;

// Opponent state
let opponent = {};
let defender = {};
let opponentBall = {};
let resultText = '';
let resultTimer = 0;

// Timing bar
let markerPos = 0; // 0 to 1
let markerSpeed = 0.015;
let markerDir = 1;
let greenZoneStart = 0;
let greenZoneWidth = 0;
let tackled = false;

// Difficulty ramps up
function getDifficulty(wave) {
    // Green zone shrinks, marker gets faster
    const baseZone = 0.3;
    const minZone = 0.12;
    const zone = Math.max(minZone, baseZone - wave * 0.02);
    const speed = 0.015 + wave * 0.002;
    return { zone, speed };
}

function calcLayout() {
    const cw = canvas.width;
    const ch = canvas.height;

    // Defender (your meerkat) on the right side
    defender = {
        x: cw * 0.75,
        y: ch * 0.55,
        baseX: cw * 0.75,
        size: 50,
        lunging: false,
        lungeProgress: 0
    };

    // Opponent starts on left, dribbles towards defender
    opponent = {
        x: -30,
        y: ch * 0.55,
        targetX: cw * 0.42,
        size: 50,
        speed: 2 + currentWave * 0.15
    };

    opponentBall = {
        x: opponent.x + 12,
        y: opponent.y + 20,
        radius: 7,
        bobble: 0
    };
}

// ===== Drawing =====

function drawPitch() {
    // Grass
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#5a9e4b');
    grad.addColorStop(1, '#3a7d2c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grass stripes
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < canvas.width; x += 40) {
        if (Math.floor(x / 40) % 2 === 0) {
            ctx.fillRect(x, 0, 40, canvas.height);
        }
    }

    // Pitch line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.9, 0);
    ctx.lineTo(canvas.width * 0.9, canvas.height);
    ctx.stroke();

    // Your goal on the right
    const goalX = canvas.width - 20;
    const goalY = canvas.height * 0.25;
    const goalH = canvas.height * 0.5;

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(goalX, goalY);
    ctx.lineTo(goalX, goalY + goalH);
    ctx.stroke();

    // Net
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let y = goalY; y <= goalY + goalH; y += 12) {
        ctx.beginPath();
        ctx.moveTo(goalX, y);
        ctx.lineTo(goalX + 15, y);
        ctx.stroke();
    }

    // Direction arrow on ground
    if (phase === 'approaching') {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
        const arrowY = canvas.height * 0.55;
        ctx.beginPath();
        ctx.moveTo(opponent.x + 30, arrowY - 15);
        ctx.lineTo(defender.x - 40, arrowY);
        ctx.lineTo(opponent.x + 30, arrowY + 15);
        ctx.closePath();
        ctx.fill();
    }
}

function drawOpponent() {
    if (phase === 'idle') return;

    ctx.save();

    // Opponent is a different coloured meerkat (red kit)
    const x = opponent.x;
    const y = opponent.y;
    const s = opponent.size / 40;

    // Body
    ctx.fillStyle = '#c4883e';
    ctx.beginPath();
    ctx.ellipse(x, y + 10 * s, 12 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red kit (opponent team)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y + 6 * s, 11 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x - 15 * s, y - 10 * s, 30 * s, 30 * s);
    // White stripe
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 2 * s, y - 10 * s, 4 * s, 30 * s);
    ctx.restore();

    // Head
    ctx.fillStyle = '#c4883e';
    ctx.beginPath();
    ctx.arc(x, y - 16 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (looking right - towards your goal)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x - 2 * s, y - 18 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.arc(x + 6 * s, y - 18 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(x + 2 * s, y - 13 * s, 2 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#c4883e';
    ctx.beginPath();
    ctx.arc(x - 9 * s, y - 22 * s, 4 * s, 0, Math.PI * 2);
    ctx.arc(x + 9 * s, y - 22 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Opponent's ball
    opponentBall.bobble += 0.1;
    const ballOffX = 12 + Math.sin(opponentBall.bobble) * 3;
    drawFootball(ctx, x + ballOffX, y + 22 * s, opponentBall.radius);
}

function drawDefender() {
    let x = defender.baseX;
    const y = defender.y;

    // Lunge animation
    if (defender.lunging) {
        const lungeOffset = Math.sin(defender.lungeProgress * Math.PI) * 60;
        x -= lungeOffset;
    }

    drawMeerkat(ctx, x, y, defender.size);

    // "Ready" stance indicator
    if (phase === 'timing' && !tackled) {
        ctx.fillStyle = 'rgba(46, 204, 64, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawResultMessage() {
    if (phase !== 'result' || resultTimer <= 0) return;

    const alpha = Math.min(1, resultTimer / 30);
    ctx.globalAlpha = alpha;

    ctx.font = 'bold 32px Fredoka';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const won = resultText === 'TACKLE WON!';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.strokeText(resultText, canvas.width / 2, canvas.height * 0.25);

    ctx.fillStyle = won ? '#2ecc40' : '#e74c3c';
    ctx.fillText(resultText, canvas.width / 2, canvas.height * 0.25);

    // Sub-text for feedback
    if (resultTimer > 30) {
        const subText = won ? 'Great timing! 💪' : 'Too early or too late!';
        ctx.font = '16px Fredoka';
        ctx.fillStyle = '#fff';
        ctx.fillText(subText, canvas.width / 2, canvas.height * 0.25 + 35);
    }

    ctx.globalAlpha = 1;
}

function drawWaveLabel() {
    if (phase === 'approaching' || phase === 'timing') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.font = 'bold 14px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText(`Attacker ${currentWave + 1} of ${TOTAL_WAVES}`, canvas.width / 2, 25);
    }
}

function drawScene() {
    drawPitch();
    drawWaveLabel();
    drawOpponent();
    drawDefender();
    drawResultMessage();
}

// ===== Wave Tracker =====

function updateWaveTracker() {
    const container = document.getElementById('wave-tracker');
    let html = '';
    for (let i = 0; i < TOTAL_WAVES; i++) {
        let cls = '';
        if (results[i] === 'won') cls = 'won';
        else if (results[i] === 'lost') cls = 'lost';
        if (i === currentWave && phase !== 'result') cls += ' current';

        const icon = results[i] === 'won' ? '✓' : results[i] === 'lost' ? '✗' : '';
        html += `<div class="wave-dot ${cls}">${icon}</div>`;
    }
    container.innerHTML = html;
}

function updateScoreDisplay() {
    document.getElementById('score-display').textContent = `Tackles: ${tacklesWon} / ${currentWave}`;
}

// ===== Timing Bar =====

function setupTimingBar() {
    const diff = getDifficulty(currentWave);
    markerPos = 0;
    markerSpeed = diff.speed;
    markerDir = 1;
    tackled = false;

    // Random green zone position
    greenZoneWidth = diff.zone;
    greenZoneStart = 0.15 + Math.random() * (0.7 - greenZoneWidth);

    const zone = document.getElementById('tackle-zone');
    zone.style.left = (greenZoneStart * 100) + '%';
    zone.style.width = (greenZoneWidth * 100) + '%';

    document.getElementById('tackle-bar-container').style.display = 'block';
    document.getElementById('tackle-btn-wrap').style.display = 'block';
    document.getElementById('tackle-btn').disabled = false;
}

function updateTimingBar() {
    markerPos += markerSpeed * markerDir;
    if (markerPos >= 1) { markerPos = 1; markerDir = -1; }
    if (markerPos <= 0) { markerPos = 0; markerDir = 1; }

    const marker = document.getElementById('tackle-marker');
    marker.style.left = (markerPos * 100 - 1) + '%';
}

function hideTimingBar() {
    document.getElementById('tackle-bar-container').style.display = 'none';
    document.getElementById('tackle-btn-wrap').style.display = 'none';
}

// ===== Game Flow =====

function startWave() {
    if (currentWave >= TOTAL_WAVES) {
        gameOver();
        return;
    }

    phase = 'approaching';
    calcLayout();
    updateWaveTracker();

    animateApproach();
}

function animateApproach() {
    // Opponent runs from left towards the tackle zone
    opponent.x += opponent.speed;
    opponentBall.x = opponent.x + 12;

    drawScene();

    if (opponent.x >= opponent.targetX) {
        // Opponent is in range — start timing phase
        phase = 'timing';
        setupTimingBar();
        animateTiming();
        return;
    }

    animFrameId = requestAnimationFrame(animateApproach);
}

function animateTiming() {
    if (phase !== 'timing') return;

    updateTimingBar();

    // Opponent keeps jinking/moving slightly
    opponent.x += Math.sin(Date.now() * 0.005) * 0.5;
    opponentBall.x = opponent.x + 12;

    drawScene();

    animFrameId = requestAnimationFrame(animateTiming);
}

function performTackle() {
    if (phase !== 'timing' || tackled) return;
    tackled = true;

    document.getElementById('tackle-btn').disabled = true;

    // Check if marker is in the green zone
    const inZone = markerPos >= greenZoneStart && markerPos <= (greenZoneStart + greenZoneWidth);

    hideTimingBar();
    phase = 'result';

    // Lunge animation
    defender.lunging = true;
    defender.lungeProgress = 0;

    if (inZone) {
        tacklesWon++;
        results[currentWave] = 'won';
        resultText = 'TACKLE WON!';
    } else {
        results[currentWave] = 'lost';
        resultText = 'MISSED!';
    }

    currentWave++;
    updateScoreDisplay();
    updateWaveTracker();

    resultTimer = 70;
    animateResult();
}

function animateResult() {
    resultTimer--;

    // Lunge animation
    if (defender.lunging) {
        defender.lungeProgress += 0.04;
        if (defender.lungeProgress >= 1) {
            defender.lunging = false;
            defender.lungeProgress = 0;
        }
    }

    // If missed, opponent continues running past
    if (results[currentWave - 1] === 'lost' && resultTimer > 20) {
        opponent.x += 2;
        opponentBall.x = opponent.x + 12;
    }

    drawScene();

    if (resultTimer > 0) {
        animFrameId = requestAnimationFrame(animateResult);
    } else {
        if (currentWave >= TOTAL_WAVES) {
            gameOver();
        } else {
            startWave();
        }
    }
}

// ===== Input =====

document.getElementById('tackle-btn').addEventListener('click', (e) => {
    e.preventDefault();
    performTackle();
});

document.getElementById('tackle-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    performTackle();
});

document.addEventListener('keydown', (e) => {
    if (phase !== 'timing' || tackled) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') {
        e.preventDefault();
        performTackle();
    }
});

// Also allow clicking the canvas to tackle
canvas.addEventListener('mousedown', (e) => {
    if (phase === 'timing' && !tackled) {
        e.preventDefault();
        performTackle();
    }
});
canvas.addEventListener('touchstart', (e) => {
    if (phase === 'timing' && !tackled) {
        e.preventDefault();
        performTackle();
    }
});

// ===== Game Over =====

function gameOver() {
    gameRunning = false;
    phase = 'idle';
    hideTimingBar();

    if (animFrameId) cancelAnimationFrame(animFrameId);

    const isNewHigh = MeerkatScores.saveHighScore('tackle', tacklesWon);

    document.getElementById('final-score').textContent = `${tacklesWon} / ${TOTAL_WAVES}`;

    const title = document.getElementById('result-title');
    if (tacklesWon >= 9) title.textContent = '🏆 Tackling Machine!';
    else if (tacklesWon >= 7) title.textContent = '🌟 Solid Defender!';
    else if (tacklesWon >= 5) title.textContent = '👏 Good Work!';
    else if (tacklesWon >= 3) title.textContent = '💪 Keep Practising!';
    else title.textContent = '😅 They Got Past!';

    const highMsg = document.getElementById('high-score-msg');
    highMsg.style.display = (isNewHigh && tacklesWon > 0) ? 'block' : 'none';

    const best = MeerkatScores.getHighScore('tackle');
    document.getElementById('best-score').textContent = `Best: ${best} / ${TOTAL_WAVES} tackles`;

    document.getElementById('gameover-overlay').style.display = 'flex';

    // Coach feedback
    if (tacklesWon >= 9) CoachDialogue.show("What a defender! Nobody is getting past you today — rock solid tackling!");
    else if (tacklesWon >= 7) CoachDialogue.show("Great defending, Meerkats! Your timing is spot on!");
    else if (tacklesWon >= 5) CoachDialogue.show("Good effort! Try to press the button right in the middle of the green zone!");
    else CoachDialogue.show("Keep at it! Watch the bar carefully and time your tackle when the marker hits the green zone!");
}

// ===== Start / Retry =====

function startGame() {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('gameover-overlay').style.display = 'none';
    CoachDialogue.hide();

    currentWave = 0;
    tacklesWon = 0;
    results = new Array(TOTAL_WAVES).fill(null);
    gameRunning = true;

    calcLayout();
    updateScoreDisplay();
    startWave();

    // Coach instructions
    CoachDialogue.show("OK Meerkats, time to defend! Watch the timing bar and tackle when the marker is in the green zone!");
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

// Show existing high score
const existingHigh = MeerkatScores.getHighScore('tackle');
if (existingHigh > 0) {
    document.getElementById('high-score-start').textContent = `Your best: ${existingHigh} / ${TOTAL_WAVES} tackles`;
}

// Initial draw
calcLayout();
results = new Array(TOTAL_WAVES).fill(null);
updateWaveTracker();
drawScene();
