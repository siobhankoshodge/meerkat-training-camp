/* ===== Dribble Maze Game ===== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const area = document.querySelector('.game-area');
    const w = Math.min(area.clientWidth - 30, 500);
    const h = Math.min(window.innerHeight - 220, 550);
    canvas.width = w;
    canvas.height = h;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); if (gameRunning) generateLevel(currentLevel); });

// ===== Game State =====
let gameRunning = false;
let currentLevel = 1;
let startTime = 0;
let elapsedTime = 0;
let penalties = 0;
let animFrameId = null;

let player = {};
let goalZone = {};
let cones = [];
let keys = { up: false, down: false, left: false, right: false };

const PLAYER_SPEED = 3;
const PLAYER_SIZE = 18;
const CONE_RADIUS = 12;
const PENALTY_TIME = 2; // seconds per cone hit

// ===== Level Generation =====

function generateLevel(level) {
    const cw = canvas.width;
    const ch = canvas.height;
    const margin = 40;

    // Player start (bottom left)
    player = {
        x: margin + 20,
        y: ch - margin - 20,
        size: PLAYER_SIZE,
        vx: 0,
        vy: 0,
        ballAngle: 0
    };

    // Goal zone (top right)
    goalZone = {
        x: cw - margin - 50,
        y: margin,
        width: 50,
        height: 50
    };

    // Generate cones based on level
    cones = [];
    const coneCount = level === 1 ? 8 : level === 2 ? 14 : 22;

    // Create a path from start to goal, then place cones around it
    const pathPoints = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pathPoints.push({
            x: player.x + (goalZone.x - player.x) * t + (Math.random() - 0.5) * cw * 0.3,
            y: player.y + (goalZone.y - player.y) * t + (Math.random() - 0.5) * ch * 0.2
        });
    }

    for (let i = 0; i < coneCount; i++) {
        let cx, cy;
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 100) {
            cx = margin + Math.random() * (cw - margin * 2);
            cy = margin + Math.random() * (ch - margin * 2);

            // Don't place on player start
            const distToStart = Math.sqrt((cx - player.x) ** 2 + (cy - player.y) ** 2);
            // Don't place on goal
            const distToGoal = Math.sqrt((cx - goalZone.x - 25) ** 2 + (cy - goalZone.y - 25) ** 2);
            // Don't overlap other cones
            const tooClose = cones.some(c =>
                Math.sqrt((cx - c.x) ** 2 + (cy - c.y) ** 2) < CONE_RADIUS * 3
            );

            if (distToStart > 60 && distToGoal > 60 && !tooClose) {
                valid = true;
            }
            attempts++;
        }

        if (valid) {
            cones.push({
                x: cx,
                y: cy,
                radius: CONE_RADIUS,
                hit: false,
                wobble: 0
            });
        }
    }
}

// ===== Drawing =====

function drawPitch() {
    // Grass
    ctx.fillStyle = '#4a8c3f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grass pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
    ctx.setLineDash([]);
}

function drawGoalZone() {
    const g = goalZone;

    // Glowing goal area
    ctx.fillStyle = 'rgba(46, 204, 64, 0.3)';
    ctx.strokeStyle = '#2ecc40';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(g.x, g.y, g.width, g.height, 10);
    ctx.fill();
    ctx.stroke();

    // Goal text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Fredoka';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GOAL', g.x + g.width / 2, g.y + g.height / 2 - 8);
    ctx.fillText('⚽', g.x + g.width / 2, g.y + g.height / 2 + 10);
}

function drawCones() {
    cones.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);

        if (c.wobble > 0) {
            ctx.rotate(Math.sin(c.wobble * 15) * 0.2);
            c.wobble -= 0.03;
        }

        if (c.hit) {
            ctx.globalAlpha = 0.4;
        }

        // Cone base
        ctx.fillStyle = '#e88a2a';
        ctx.beginPath();
        ctx.moveTo(0, -c.radius);
        ctx.lineTo(-c.radius * 0.7, c.radius * 0.5);
        ctx.lineTo(c.radius * 0.7, c.radius * 0.5);
        ctx.closePath();
        ctx.fill();

        // Cone stripe
        ctx.fillStyle = '#f5c542';
        ctx.beginPath();
        ctx.moveTo(0, -c.radius * 0.4);
        ctx.lineTo(-c.radius * 0.4, c.radius * 0.15);
        ctx.lineTo(c.radius * 0.4, c.radius * 0.15);
        ctx.closePath();
        ctx.fill();

        // Cone outline
        ctx.strokeStyle = '#c4681e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -c.radius);
        ctx.lineTo(-c.radius * 0.7, c.radius * 0.5);
        ctx.lineTo(c.radius * 0.7, c.radius * 0.5);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    });
}

function drawPlayer() {
    // Draw meerkat
    drawMeerkat(ctx, player.x, player.y, 40);

    // Draw ball at player's feet (orbiting slightly)
    player.ballAngle += 0.05;
    const ballOffX = Math.cos(player.ballAngle) * 8;
    const ballOffY = player.y + 18 + Math.sin(player.ballAngle) * 2;
    drawFootball(ctx, player.x + ballOffX, ballOffY, 6);
}

function drawStartMarker() {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(40 + 20, canvas.height - 40 - 20, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Fredoka';
    ctx.textAlign = 'center';
    ctx.fillText('START', 40 + 20, canvas.height - 40 - 32);
}

function drawTimer() {
    if (!gameRunning) return;
    const totalTime = elapsedTime + penalties * PENALTY_TIME;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(canvas.width / 2 - 50, 20, 100, 30);
    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 16px Fredoka';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${totalTime.toFixed(1)}s`, canvas.width / 2, 35);
}

// ===== Game Loop =====

function update() {
    if (!gameRunning) return;

    // Update timer
    elapsedTime = (Date.now() - startTime) / 1000;
    updateTimerDisplay();

    // Movement
    let dx = 0, dy = 0;
    if (keys.up) dy -= PLAYER_SPEED;
    if (keys.down) dy += PLAYER_SPEED;
    if (keys.left) dx -= PLAYER_SPEED;
    if (keys.right) dx += PLAYER_SPEED;

    // Diagonal normalization
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    player.x += dx;
    player.y += dy;

    // Boundaries
    const margin = 25;
    player.x = Math.max(margin, Math.min(canvas.width - margin, player.x));
    player.y = Math.max(margin, Math.min(canvas.height - margin, player.y));

    // Cone collisions
    cones.forEach(c => {
        if (c.hit) return;
        const dist = Math.sqrt((player.x - c.x) ** 2 + (player.y - c.y) ** 2);
        if (dist < PLAYER_SIZE + c.radius * 0.5) {
            c.hit = true;
            c.wobble = 1;
            penalties++;
            updateTimerDisplay();
        }
    });

    // Check goal
    if (
        player.x > goalZone.x &&
        player.x < goalZone.x + goalZone.width &&
        player.y > goalZone.y &&
        player.y < goalZone.y + goalZone.height
    ) {
        levelComplete();
    }
}

function draw() {
    drawPitch();
    drawStartMarker();
    drawGoalZone();
    drawCones();
    drawPlayer();
    drawTimer();
}

function gameLoop() {
    if (!gameRunning) return;
    update();
    draw();
    animFrameId = requestAnimationFrame(gameLoop);
}

function updateTimerDisplay() {
    const total = elapsedTime + penalties * PENALTY_TIME;
    document.getElementById('timer-display').textContent = `Time: ${total.toFixed(1)}s`;
    document.getElementById('penalty-display').textContent =
        penalties > 0 ? `(+${(penalties * PENALTY_TIME).toFixed(0)}s penalty)` : '';
}

// ===== Input =====

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': keys.up = true; e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S': keys.down = true; e.preventDefault(); break;
        case 'ArrowLeft': case 'a': case 'A': keys.left = true; e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D': keys.right = true; e.preventDefault(); break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': keys.up = false; break;
        case 'ArrowDown': case 's': case 'S': keys.down = false; break;
        case 'ArrowLeft': case 'a': case 'A': keys.left = false; break;
        case 'ArrowRight': case 'd': case 'D': keys.right = false; break;
    }
});

// Mobile D-pad
const dpadBtns = document.querySelectorAll('.dpad-btn');
dpadBtns.forEach(btn => {
    const dir = btn.dataset.dir;

    const activate = (e) => { e.preventDefault(); keys[dir] = true; };
    const deactivate = (e) => { e.preventDefault(); keys[dir] = false; };

    btn.addEventListener('mousedown', activate);
    btn.addEventListener('touchstart', activate);
    btn.addEventListener('mouseup', deactivate);
    btn.addEventListener('mouseleave', deactivate);
    btn.addEventListener('touchend', deactivate);
    btn.addEventListener('touchcancel', deactivate);
});

// ===== Level Complete =====

function levelComplete() {
    gameRunning = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    const totalTime = elapsedTime + penalties * PENALTY_TIME;
    const timeRounded = Math.round(totalTime * 10) / 10;

    const key = `dribble_l${currentLevel}`;
    const isNewBest = MeerkatScores.saveBestTime(key, timeRounded);

    // Also save a general score (inverse of time for star display)
    const starScore = Math.max(1, Math.round(100 / timeRounded));
    MeerkatScores.saveHighScore('dribble', starScore);

    document.getElementById('final-time').textContent = `${timeRounded}s`;
    document.getElementById('penalty-summary').textContent =
        penalties > 0
            ? `(${elapsedTime.toFixed(1)}s + ${penalties * PENALTY_TIME}s penalties)`
            : 'No penalties! Perfect run!';

    const highMsg = document.getElementById('high-score-msg');
    highMsg.style.display = isNewBest ? 'block' : 'none';

    const best = MeerkatScores.getBestTime(key);
    document.getElementById('best-time').textContent =
        best !== null ? `Best time: ${best}s` : '';

    // Show next level button if not on level 3
    const nextBtn = document.getElementById('next-btn');
    if (currentLevel < 3) {
        nextBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'none';
    }

    document.getElementById('complete-overlay').style.display = 'flex';

    // Coach feedback
    if (penalties === 0) CoachDialogue.show("A clean run! No cones knocked over — that's proper close control, Meerkats!");
    else if (penalties <= 2) CoachDialogue.show("Nearly perfect! Just a couple of cones clipped. Keep the ball close to your feet!");
    else CoachDialogue.show("Good effort! Try to slow down around the cones — control is more important than speed!");
}

// ===== Start / Retry =====

function startGame() {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('complete-overlay').style.display = 'none';
    CoachDialogue.hide();

    currentLevel = parseInt(document.getElementById('level-select').value) || currentLevel;
    penalties = 0;
    elapsedTime = 0;
    keys = { up: false, down: false, left: false, right: false };

    generateLevel(currentLevel);
    updateTimerDisplay();

    startTime = Date.now();
    gameRunning = true;
    gameLoop();

    // Coach instructions
    const levelTips = {
        1: "OK Meerkats, nice and easy! Dribble around the cones to the goal. Keep the ball close!",
        2: "Level 2 — more cones this time! Take your time and find a path through!",
        3: "This is the big one! Lots of cones — you'll need sharp dribbling skills for this!"
    };
    CoachDialogue.show(levelTips[currentLevel] || levelTips[1]);
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('complete-overlay').style.display = 'none';
    startGame();
});
document.getElementById('next-btn').addEventListener('click', () => {
    currentLevel = Math.min(3, currentLevel + 1);
    document.getElementById('level-select').value = currentLevel;
    document.getElementById('complete-overlay').style.display = 'none';
    startGame();
});

// Show best times on start
for (let l = 1; l <= 3; l++) {
    const best = MeerkatScores.getBestTime(`dribble_l${l}`);
    if (best !== null) {
        const el = document.getElementById('best-time-start');
        el.innerHTML += `Level ${l} best: ${best}s<br>`;
    }
}

// Initial draw
generateLevel(1);
draw();
