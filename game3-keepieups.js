/* ===== Keepie-Uppies Game ===== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Sizing
function resizeCanvas() {
    const area = document.querySelector('.game-area');
    const w = Math.min(area.clientWidth - 30, 500);
    const h = Math.min(window.innerHeight - 180, 600);
    canvas.width = w;
    canvas.height = h;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let ball = {};
let score = 0;
let gameRunning = false;
let animFrameId = null;
let gravity = 0.25;
let kickStrength = -8;
let lastTime = 0;

// Grass colors
const GRASS_GREEN = '#3a7d2c';
const SKY_BLUE = '#87ceeb';

function initBall() {
    ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: 0,
        vy: 0,
        radius: Math.min(canvas.width, canvas.height) * 0.05,
        rotation: 0
    };
}

function resetGame() {
    score = 0;
    gravity = 0.25;
    kickStrength = -8;
    initBall();
    ball.vy = -3; // gentle upward start
    updateScoreDisplay();
}

function updateScoreDisplay() {
    document.getElementById('score-display').textContent = `Score: ${score}`;
}

// ===== Drawing =====

function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, SKY_BLUE);
    grad.addColorStop(0.7, '#b5e6b5');
    grad.addColorStop(1, GRASS_GREEN);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrass() {
    ctx.fillStyle = GRASS_GREEN;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Grass blades
    ctx.strokeStyle = '#2d6b20';
    ctx.lineWidth = 2;
    for (let x = 0; x < canvas.width; x += 8) {
        const h = 8 + Math.sin(x * 0.5) * 5;
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - 40);
        ctx.lineTo(x + 2, canvas.height - 40 - h);
        ctx.stroke();
    }
}

function drawBallShadow() {
    // Shadow on ground - gets bigger as ball is higher
    const groundY = canvas.height - 35;
    const distFromGround = groundY - ball.y;
    const shadowSize = Math.max(5, ball.radius * 1.2 - distFromGround * 0.01);
    const shadowAlpha = Math.max(0.05, 0.3 - distFromGround * 0.0005);

    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(ball.x, groundY, shadowSize, shadowSize * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawGameBall() {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    drawFootball(ctx, 0, 0, ball.radius);

    ctx.restore();
}

function drawScoreText() {
    if (score > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = `bold ${canvas.width * 0.3}px Fredoka`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(score, canvas.width / 2, canvas.height / 2);
    }
}

// ===== Kick Effects =====
let kickEffects = [];

function addKickEffect(x, y) {
    kickEffects.push({
        x, y,
        radius: 5,
        maxRadius: 30,
        alpha: 0.8
    });
}

function updateKickEffects() {
    for (let i = kickEffects.length - 1; i >= 0; i--) {
        const e = kickEffects[i];
        e.radius += 2;
        e.alpha -= 0.05;
        if (e.alpha <= 0) {
            kickEffects.splice(i, 1);
        }
    }
}

function drawKickEffects() {
    kickEffects.forEach(e => {
        ctx.strokeStyle = `rgba(46, 204, 64, ${e.alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.stroke();
    });
}

// ===== Game Loop =====

function update() {
    // Gravity
    ball.vy += gravity;

    // Move
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Spin
    ball.rotation += ball.vx * 0.05;

    // Horizontal friction
    ball.vx *= 0.99;

    // Wall bouncing
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx) * 0.7;
    }
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx = -Math.abs(ball.vx) * 0.7;
    }

    // Ceiling bounce
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy) * 0.5;
    }

    // Hit the ground = game over
    const groundY = canvas.height - 40;
    if (ball.y + ball.radius >= groundY) {
        ball.y = groundY - ball.radius;
        gameOver();
        return;
    }

    updateKickEffects();
}

function draw() {
    drawSky();
    drawGrass();
    drawScoreText();
    drawBallShadow();
    drawKickEffects();
    drawGameBall();
}

function gameLoop(timestamp) {
    if (!gameRunning) return;

    update();
    draw();

    animFrameId = requestAnimationFrame(gameLoop);
}

// ===== Input Handling =====

function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handleKick(e) {
    if (!gameRunning) return;
    e.preventDefault();

    const pos = getCanvasPos(e);
    const dx = pos.x - ball.x;
    const dy = pos.y - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if click is close enough to the ball (generous hitbox for kids)
    const hitRadius = ball.radius * 3;

    if (dist < hitRadius) {
        // Successful kick!
        score++;
        updateScoreDisplay();

        // Kick the ball up with some horizontal variation
        ball.vy = kickStrength;
        ball.vx += (ball.x - pos.x) * 0.1; // kick direction based on where you tap

        addKickEffect(ball.x, ball.y);

        // Make it slightly harder every 5 kicks
        if (score % 5 === 0) {
            gravity += 0.02;
            kickStrength = Math.max(kickStrength + 0.2, -6); // weaker kicks over time
        }
    }
}

canvas.addEventListener('mousedown', handleKick);
canvas.addEventListener('touchstart', handleKick);

// ===== Game Over =====

function gameOver() {
    gameRunning = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    const isNewHigh = MeerkatScores.saveHighScore('keepieups', score);

    document.getElementById('final-score').textContent = score;

    const highMsg = document.getElementById('high-score-msg');
    if (isNewHigh && score > 0) {
        highMsg.style.display = 'block';
    } else {
        highMsg.style.display = 'none';
    }

    const best = MeerkatScores.getHighScore('keepieups');
    document.getElementById('best-score').textContent = `Best: ${best} keepie-uppies`;

    document.getElementById('gameover-overlay').style.display = 'flex';

    // Coach feedback
    if (score >= 20) CoachDialogue.show("Unbelievable! That was world class keepie-uppies, Meerkats!");
    else if (score >= 10) CoachDialogue.show("Great effort! You're really getting the hang of this!");
    else if (score >= 5) CoachDialogue.show("Nice try! Remember — watch the ball all the way onto your foot!");
    else CoachDialogue.show("Don't worry, every pro started somewhere! Have another go!");
}

// ===== Start / Retry =====

function startGame() {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('gameover-overlay').style.display = 'none';
    CoachDialogue.hide();
    resetGame();
    gameRunning = true;
    animFrameId = requestAnimationFrame(gameLoop);

    // Coach tips during gameplay
    CoachDialogue.show("Keep your eyes on the ball, Meerkats! Tap it right in the middle for the best kick!");
    setTimeout(() => {
        if (gameRunning && score >= 3) CoachDialogue.show("Brilliant work! Keep it going — soft touches!");
    }, 8000);
    setTimeout(() => {
        if (gameRunning && score >= 8) CoachDialogue.show("You're on fire! Stay focused, don't take your eyes off it!");
    }, 18000);
    setTimeout(() => {
        if (gameRunning && score >= 15) CoachDialogue.show("Incredible control! The Meerkats are smashing it today!");
    }, 30000);
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

// Show existing high score on start screen
const existingHigh = MeerkatScores.getHighScore('keepieups');
if (existingHigh > 0) {
    document.getElementById('high-score-start').textContent = `Your best: ${existingHigh}`;
}

// Initial draw
resizeCanvas();
initBall();
draw();
