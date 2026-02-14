/* ===== Goalkeeper Game ===== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const area = document.querySelector('.game-area');
    const w = Math.min(area.clientWidth - 30, 550);
    const h = Math.min(window.innerHeight - 280, 500);
    canvas.width = w;
    canvas.height = h;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); drawScene(); });

// ===== Constants =====
const TOTAL_SHOTS = 10;
const DIRECTIONS = ['left', 'centre', 'right'];

// ===== Game State =====
let gameRunning = false;
let currentShot = 0;
let saves = 0;
let results = []; // 'saved', 'missed', or null for upcoming
let phase = 'waiting'; // 'waiting', 'aiming', 'shooting', 'result'
let animFrameId = null;

// Positions
let keeper = {};
let ball = {};
let striker = {};
let shotDir = '';
let diveDir = '';
let resultText = '';
let resultTimer = 0;

// Animation state
let aimProgress = 0;
let aimTarget = '';
let shotProgress = 0;
let keeperDiveProgress = 0;

// Goal dimensions
let goalSpec = {};

function calcLayout() {
    const cw = canvas.width;
    const ch = canvas.height;

    goalSpec = {
        x: cw * 0.1,
        y: ch * 0.05,
        width: cw * 0.8,
        height: ch * 0.45,
        postWidth: 10
    };

    keeper = {
        x: cw / 2,
        y: goalSpec.y + goalSpec.height - 30,
        baseX: cw / 2,
        size: 50,
        diveOffset: 0
    };

    striker = {
        x: cw / 2,
        y: ch - 50,
        size: 50
    };

    ball = {
        x: cw / 2,
        y: ch - 80,
        radius: 10,
        startX: cw / 2,
        startY: ch - 80,
        visible: true
    };
}

// ===== Drawing =====

function drawPitch() {
    // Sky gradient at top
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.3);
    skyGrad.addColorStop(0, '#87ceeb');
    skyGrad.addColorStop(1, '#5a9e4b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.3);

    // Grass
    ctx.fillStyle = '#4a8c3f';
    ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height * 0.7);

    // Grass stripes
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y = canvas.height * 0.3; y < canvas.height; y += 25) {
        if (Math.floor(y / 25) % 2 === 0) {
            ctx.fillRect(0, y, canvas.width, 25);
        }
    }

    // Penalty spot
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 85, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawGoal() {
    const g = goalSpec;

    // Net background
    ctx.fillStyle = 'rgba(200,200,200,0.15)';
    ctx.fillRect(g.x, g.y, g.width, g.height);

    // Net mesh
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    const spacing = 18;
    for (let x = g.x; x <= g.x + g.width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, g.y);
        ctx.lineTo(x, g.y + g.height);
        ctx.stroke();
    }
    for (let y = g.y; y <= g.y + g.height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(g.x, y);
        ctx.lineTo(g.x + g.width, y);
        ctx.stroke();
    }

    // Divide goal into 3 zones visually (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    const thirdW = g.width / 3;
    ctx.beginPath();
    ctx.moveTo(g.x + thirdW, g.y);
    ctx.lineTo(g.x + thirdW, g.y + g.height);
    ctx.moveTo(g.x + thirdW * 2, g.y);
    ctx.lineTo(g.x + thirdW * 2, g.y + g.height);
    ctx.stroke();

    // Crossbar
    ctx.fillStyle = '#fff';
    ctx.fillRect(g.x - g.postWidth / 2, g.y - g.postWidth, g.width + g.postWidth, g.postWidth);

    // Posts
    ctx.fillRect(g.x - g.postWidth / 2, g.y, g.postWidth, g.height + 5);
    ctx.fillRect(g.x + g.width - g.postWidth / 2, g.y, g.postWidth, g.height + 5);
}

function drawKeeper() {
    const x = keeper.baseX + keeper.diveOffset;
    const y = keeper.y;

    ctx.save();

    // If diving, tilt the meerkat
    if (keeper.diveOffset !== 0) {
        const tilt = keeper.diveOffset > 0 ? 0.4 : -0.4;
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.translate(-x, -y);
    }

    // Gloves (green)
    const gloveSpread = 18 + Math.abs(keeper.diveOffset) * 0.1;
    ctx.fillStyle = '#2ecc40';
    ctx.beginPath();
    ctx.arc(x - gloveSpread, y - 20, 7, 0, Math.PI * 2);
    ctx.arc(x + gloveSpread, y - 20, 7, 0, Math.PI * 2);
    ctx.fill();

    // Draw the meerkat body
    drawMeerkat(ctx, x, y, keeper.size);

    ctx.restore();
}

function drawStriker() {
    // Only draw striker during aiming/shooting
    if (phase === 'waiting' || phase === 'result') return;

    drawMeerkat(ctx, striker.x, striker.y, striker.size);
}

function drawBall() {
    if (!ball.visible) return;
    drawFootball(ctx, ball.x, ball.y, ball.radius);
}

function drawAimIndicator() {
    if (phase !== 'aiming') return;

    // Show a subtle "tell" — the striker looks in a direction
    // Small arrow above striker's head
    const g = goalSpec;
    let targetX;
    if (aimTarget === 'left') targetX = g.x + g.width * 0.17;
    else if (aimTarget === 'right') targetX = g.x + g.width * 0.83;
    else targetX = g.x + g.width * 0.5;

    // Eyes of striker glance (subtle cue for players to read)
    const glanceX = aimTarget === 'left' ? -5 : aimTarget === 'right' ? 5 : 0;

    ctx.fillStyle = 'rgba(245, 197, 66, 0.6)';
    ctx.beginPath();
    ctx.arc(striker.x + glanceX, striker.y - 40, 4, 0, Math.PI * 2);
    ctx.fill();

    // Also show a fading arrow briefly
    if (aimProgress < 0.5) {
        const alpha = (0.5 - aimProgress) * 1.5;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f5c542';
        ctx.font = 'bold 24px Fredoka';
        ctx.textAlign = 'center';

        if (aimTarget === 'left') ctx.fillText('👈', striker.x - 30, striker.y - 50);
        else if (aimTarget === 'right') ctx.fillText('👉', striker.x + 30, striker.y - 50);
        else ctx.fillText('👆', striker.x, striker.y - 55);

        ctx.globalAlpha = 1;
    }
}

function drawResultMessage() {
    if (phase !== 'result' || resultTimer <= 0) return;

    const alpha = Math.min(1, resultTimer / 30);
    ctx.globalAlpha = alpha;

    ctx.font = 'bold 36px Fredoka';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const saved = resultText === 'SAVE!';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.strokeText(resultText, canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = saved ? '#2ecc40' : '#e74c3c';
    ctx.fillText(resultText, canvas.width / 2, canvas.height / 2);

    ctx.globalAlpha = 1;
}

function drawScene() {
    drawPitch();
    drawGoal();
    drawKeeper();
    drawStriker();
    drawBall();
    drawAimIndicator();
    drawResultMessage();
}

// ===== Round Tracker =====

function updateRoundTracker() {
    const container = document.getElementById('round-tracker');
    let html = '';
    for (let i = 0; i < TOTAL_SHOTS; i++) {
        let cls = '';
        if (results[i] === 'saved') cls = 'saved';
        else if (results[i] === 'missed') cls = 'missed';
        if (i === currentShot && phase !== 'result') cls += ' current';

        const icon = results[i] === 'saved' ? '✓' : results[i] === 'missed' ? '✗' : '';
        html += `<div class="round-dot ${cls}">${icon}</div>`;
    }
    container.innerHTML = html;
}

function updateScoreDisplay() {
    document.getElementById('score-display').textContent = `Saves: ${saves} / ${currentShot}`;
}

// ===== Game Flow =====

function startRound() {
    if (currentShot >= TOTAL_SHOTS) {
        gameOver();
        return;
    }

    phase = 'aiming';
    aimProgress = 0;
    shotProgress = 0;
    keeperDiveProgress = 0;
    keeper.diveOffset = 0;
    diveDir = '';

    // Pick random shot direction
    shotDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    aimTarget = shotDir;

    // Reset ball
    ball.x = striker.x;
    ball.y = striker.y - 30;
    ball.visible = true;

    calcLayout();
    updateRoundTracker();

    // Show dive buttons
    document.getElementById('dive-buttons').style.display = 'flex';

    // Run aiming animation (gives player time to read the cue)
    animateAim();
}

function animateAim() {
    aimProgress += 0.008; // ~2 seconds of aiming

    drawScene();

    if (aimProgress < 1 && phase === 'aiming') {
        animFrameId = requestAnimationFrame(animateAim);
    } else if (phase === 'aiming') {
        // Time's up — auto shoot if player hasn't dived
        if (!diveDir) {
            diveDir = 'centre'; // default
        }
        shootBall();
    }
}

function playerDive(dir) {
    if (phase !== 'aiming') return;
    diveDir = dir;

    // Stop aiming, start shooting immediately
    phase = 'shooting';
    document.getElementById('dive-buttons').style.display = 'none';

    if (animFrameId) cancelAnimationFrame(animFrameId);
    shootBall();
}

function shootBall() {
    phase = 'shooting';
    shotProgress = 0;

    const g = goalSpec;
    // Target position based on shot direction
    let targetX;
    if (shotDir === 'left') targetX = g.x + g.width * 0.17;
    else if (shotDir === 'right') targetX = g.x + g.width * 0.83;
    else targetX = g.x + g.width * 0.5;
    const targetY = g.y + g.height * 0.5;

    ball.targetX = targetX;
    ball.targetY = targetY;
    ball.startX = ball.x;
    ball.startY = ball.y;

    // Keeper dive target
    let diveTarget = 0;
    const diveAmount = goalSpec.width * 0.35;
    if (diveDir === 'left') diveTarget = -diveAmount;
    else if (diveDir === 'right') diveTarget = diveAmount;

    keeper.diveTarget = diveTarget;

    animateShot();
}

function animateShot() {
    shotProgress += 0.04;

    // Move ball
    const t = Math.min(1, shotProgress);
    const eased = t * t; // ease-in for ball getting faster

    ball.x = ball.startX + (ball.targetX - ball.startX) * eased;
    ball.y = ball.startY + (ball.targetY - ball.startY) * eased;

    // Ball grows slightly as it approaches (perspective)
    ball.radius = 10 + t * 4;

    // Keeper dives
    keeperDiveProgress = Math.min(1, shotProgress * 1.2);
    const diveEased = 1 - Math.pow(1 - keeperDiveProgress, 3);
    keeper.diveOffset = keeper.diveTarget * diveEased;

    drawScene();

    if (shotProgress < 1) {
        animFrameId = requestAnimationFrame(animateShot);
    } else {
        resolveShot();
    }
}

function resolveShot() {
    const saved = (diveDir === shotDir);

    if (saved) {
        saves++;
        results[currentShot] = 'saved';
        resultText = 'SAVE!';
        ball.visible = false; // caught!
    } else {
        results[currentShot] = 'missed';
        resultText = 'GOAL!';
    }

    currentShot++;
    phase = 'result';
    resultTimer = 60;

    updateScoreDisplay();
    updateRoundTracker();

    animateResult();
}

function animateResult() {
    resultTimer--;
    drawScene();

    if (resultTimer > 0) {
        animFrameId = requestAnimationFrame(animateResult);
    } else {
        // Next round or game over
        if (currentShot >= TOTAL_SHOTS) {
            gameOver();
        } else {
            startRound();
        }
    }
}

// ===== Input =====

// Button clicks
document.querySelectorAll('.dive-btn').forEach(btn => {
    const handler = (e) => {
        e.preventDefault();
        playerDive(btn.dataset.dir);
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchstart', handler);
});

// Keyboard
document.addEventListener('keydown', (e) => {
    if (phase !== 'aiming') return;

    switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A':
            e.preventDefault();
            playerDive('left');
            break;
        case 'ArrowUp': case 'w': case 'W':
            e.preventDefault();
            playerDive('centre');
            break;
        case 'ArrowRight': case 'd': case 'D':
            e.preventDefault();
            playerDive('right');
            break;
    }
});

// ===== Game Over =====

function gameOver() {
    gameRunning = false;
    phase = 'waiting';
    document.getElementById('dive-buttons').style.display = 'none';

    if (animFrameId) cancelAnimationFrame(animFrameId);

    const isNewHigh = MeerkatScores.saveHighScore('goalkeeper', saves);

    document.getElementById('final-score').textContent = `${saves} / ${TOTAL_SHOTS}`;

    // Title based on performance
    const titles = document.getElementById('result-title');
    if (saves >= 9) titles.textContent = '🏆 LEGEND!';
    else if (saves >= 7) titles.textContent = '🌟 Amazing!';
    else if (saves >= 5) titles.textContent = '👏 Great Effort!';
    else if (saves >= 3) titles.textContent = '💪 Keep Trying!';
    else titles.textContent = '😅 Unlucky!';

    const highMsg = document.getElementById('high-score-msg');
    highMsg.style.display = (isNewHigh && saves > 0) ? 'block' : 'none';

    const best = MeerkatScores.getHighScore('goalkeeper');
    document.getElementById('best-score').textContent = `Best: ${best} / ${TOTAL_SHOTS} saves`;

    document.getElementById('gameover-overlay').style.display = 'flex';

    // Coach feedback
    if (saves >= 9) CoachDialogue.show("Incredible goalkeeping! You're like a brick wall — nothing gets past you!");
    else if (saves >= 7) CoachDialogue.show("Brilliant saves! You read those shots really well, Meerkats!");
    else if (saves >= 5) CoachDialogue.show("Good keeping! Try watching the striker's eyes for a clue which way they'll shoot!");
    else CoachDialogue.show("Unlucky! Remember — watch for the hint arrow, then dive that way! You'll get them next time!");
}

// ===== Start / Retry =====

function startGame() {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('gameover-overlay').style.display = 'none';
    CoachDialogue.hide();

    currentShot = 0;
    saves = 0;
    results = new Array(TOTAL_SHOTS).fill(null);
    gameRunning = true;

    calcLayout();
    updateScoreDisplay();
    startRound();

    // Coach instructions
    CoachDialogue.show("Right Meerkats, get between the sticks! Watch where the striker looks, then dive to save it!");
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

// Show existing high score
const existingHigh = MeerkatScores.getHighScore('goalkeeper');
if (existingHigh > 0) {
    document.getElementById('high-score-start').textContent = `Your best: ${existingHigh} / ${TOTAL_SHOTS} saves`;
}

// Initial draw
calcLayout();
results = new Array(TOTAL_SHOTS).fill(null);
updateRoundTracker();
drawScene();
