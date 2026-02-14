/* ===== Shooting Practice Game ===== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const area = document.querySelector('.game-area');
    const w = Math.min(area.clientWidth - 30, 550);
    const h = Math.min(window.innerHeight - 180, 650);
    canvas.width = w;
    canvas.height = h;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); if (!ballFlying && gameRunning) drawScene(); });

// ===== Game State =====
let score = 0;
let shotsLeft = 10;
let gameRunning = false;
let ballFlying = false;
let animFrameId = null;

// Goal dimensions (relative to canvas)
let goal = {};
let targets = [];
let ball = {};
let particles = [];

function calcDimensions() {
    const cw = canvas.width;
    const ch = canvas.height;

    goal = {
        x: cw * 0.1,
        y: ch * 0.05,
        width: cw * 0.8,
        height: ch * 0.25,
        postWidth: 8,
        netColor: 'rgba(255,255,255,0.3)'
    };
}

function generateTargets() {
    targets = [];
    calcDimensions();

    const padding = 30;
    const gx = goal.x + padding;
    const gy = goal.y + padding;
    const gw = goal.width - padding * 2;
    const gh = goal.height - padding * 2;

    // Generate 3-5 targets at random positions within the goal
    const count = 3 + Math.floor(Math.random() * 3);
    const sizes = [
        { radius: 28, points: 10, color: '#f5c542', label: '10' },
        { radius: 22, points: 20, color: '#e88a2a', label: '20' },
        { radius: 16, points: 30, color: '#e74c3c', label: '30' }
    ];

    for (let i = 0; i < count; i++) {
        const type = sizes[Math.min(i, sizes.length - 1)];
        const r = type.radius;
        const tx = gx + r + Math.random() * (gw - r * 2);
        const ty = gy + r + Math.random() * (gh - r * 2);

        targets.push({
            x: tx,
            y: ty,
            radius: r,
            points: type.points,
            color: type.color,
            label: type.label,
            hit: false,
            wobble: 0
        });
    }
}

function initBall(targetX, targetY) {
    const startX = canvas.width / 2;
    const startY = canvas.height - 60;

    // Calculate trajectory
    const dx = targetX - startX;
    const dy = targetY - startY;
    const steps = 40; // animation frames for flight

    ball = {
        x: startX,
        y: startY,
        targetX: targetX,
        targetY: targetY,
        startX: startX,
        startY: startY,
        vx: dx / steps,
        vy: dy / steps,
        radius: 12,
        progress: 0,
        totalSteps: steps,
        rotation: 0
    };
}

// ===== Drawing =====

function drawPitch() {
    // Grass background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#5a9e4b');
    grad.addColorStop(1, '#3a7d2c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grass stripes
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y = 0; y < canvas.height; y += 30) {
        if (Math.floor(y / 30) % 2 === 0) {
            ctx.fillRect(0, y, canvas.width, 30);
        }
    }
}

function drawGoal() {
    const g = goal;

    // Net (grid pattern)
    ctx.strokeStyle = goal.netColor;
    ctx.lineWidth = 1;
    const spacing = 15;
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

    // Crossbar
    ctx.fillStyle = '#fff';
    ctx.fillRect(g.x - g.postWidth / 2, g.y - g.postWidth / 2, g.width + g.postWidth, g.postWidth);

    // Posts
    ctx.fillRect(g.x - g.postWidth / 2, g.y, g.postWidth, g.height);
    ctx.fillRect(g.x + g.width - g.postWidth / 2, g.y, g.postWidth, g.height);

    // Post shadows
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(g.x + g.postWidth / 2, g.y + g.postWidth, 4, g.height);
    ctx.fillRect(g.x + g.width + g.postWidth / 2, g.y + g.postWidth, 4, g.height);
}

function drawTargets() {
    targets.forEach(t => {
        if (t.hit) return;

        ctx.save();
        ctx.translate(t.x, t.y);

        // Wobble animation
        if (t.wobble > 0) {
            ctx.rotate(Math.sin(t.wobble * 10) * 0.1);
            t.wobble -= 0.05;
        }

        // Outer glow
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 15;

        // Target circle
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Inner ring
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, t.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${t.radius * 0.7}px Fredoka`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.label, 0, 1);

        ctx.restore();
    });
}

function drawMeerkatKicker() {
    if (!ballFlying) {
        // Draw the meerkat ready to kick at bottom center
        drawMeerkat(ctx, canvas.width / 2, canvas.height - 30, 50);
    }
}

function drawBallOnGround() {
    if (!ballFlying && gameRunning) {
        drawFootball(ctx, canvas.width / 2, canvas.height - 60, 12);
    }
}

function drawFlyingBall() {
    if (!ballFlying) return;

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    // Ball gets smaller as it goes up (perspective)
    const progress = ball.progress / ball.totalSteps;
    const scale = 1 - progress * 0.3;
    const r = ball.radius * scale;

    drawFootball(ctx, 0, 0, r);
    ctx.restore();
}

function drawAimLine(mouseX, mouseY) {
    if (ballFlying || !gameRunning || shotsLeft <= 0) return;
    if (mouseX === undefined) return;

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height - 60);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Particles for hit effects
function addHitParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 3 + Math.random() * 3,
            color: color,
            alpha: 1,
            life: 1
        });
    }
}

function addMissParticles(x, y) {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3,
            radius: 2 + Math.random() * 2,
            color: '#8B4513',
            alpha: 0.8,
            life: 0.8
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= 0.02;
        p.alpha = p.life;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// ===== Score Popup =====
let scorePopups = [];

function addScorePopup(x, y, points) {
    scorePopups.push({
        x, y, points,
        alpha: 1,
        offsetY: 0
    });
}

function updateScorePopups() {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i];
        p.offsetY -= 1.5;
        p.alpha -= 0.02;
        if (p.alpha <= 0) scorePopups.splice(i, 1);
    }
}

function drawScorePopups() {
    scorePopups.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#f5c542';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.font = 'bold 28px Fredoka';
        ctx.textAlign = 'center';
        ctx.strokeText(`+${p.points}`, p.x, p.y + p.offsetY);
        ctx.fillText(`+${p.points}`, p.x, p.y + p.offsetY);
    });
    ctx.globalAlpha = 1;
}

// ===== Scene =====

let mouseX, mouseY;

function drawScene() {
    drawPitch();
    drawGoal();
    drawTargets();
    drawParticles();
    drawScorePopups();
    drawMeerkatKicker();
    drawBallOnGround();
    drawFlyingBall();
    drawAimLine(mouseX, mouseY);
}

// ===== Ball Flight Animation =====

function animateBall() {
    ball.progress++;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.rotation += 0.15;

    drawScene();

    if (ball.progress >= ball.totalSteps) {
        // Check hits
        ballLanded();
        return;
    }

    animFrameId = requestAnimationFrame(animateBall);
}

function ballLanded() {
    ballFlying = false;
    let hitSomething = false;

    // Check target collisions
    for (const t of targets) {
        if (t.hit) continue;
        const dx = ball.x - t.x;
        const dy = ball.y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < t.radius + ball.radius) {
            t.hit = true;
            score += t.points;
            hitSomething = true;
            addHitParticles(t.x, t.y, t.color);
            addScorePopup(t.x, t.y, t.points);
            break; // Only hit one target per shot
        }
    }

    if (!hitSomething) {
        addMissParticles(ball.x, ball.y);
    }

    updateDisplays();

    // Check if game is over
    if (shotsLeft <= 0) {
        setTimeout(gameOver, 800);
        // Run particle cleanup animation
        animateParticles();
        return;
    }

    // Regenerate targets if all hit
    if (targets.every(t => t.hit)) {
        setTimeout(() => {
            generateTargets();
            drawScene();
        }, 500);
    }

    // Animate remaining particles
    animateParticles();
}

function animateParticles() {
    updateParticles();
    updateScorePopups();
    drawScene();

    if (particles.length > 0 || scorePopups.length > 0) {
        animFrameId = requestAnimationFrame(animateParticles);
    }
}

function updateDisplays() {
    document.getElementById('score-display').textContent = `Score: ${score}`;
    document.getElementById('shots-display').textContent = `Shots: ${shotsLeft}`;
}

// ===== Input =====

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

function handleShoot(e) {
    if (!gameRunning || ballFlying || shotsLeft <= 0) return;
    e.preventDefault();

    const pos = getCanvasPos(e);

    // Don't shoot backwards
    if (pos.y > canvas.height - 80) return;

    shotsLeft--;
    updateDisplays();

    initBall(pos.x, pos.y);
    ballFlying = true;

    if (animFrameId) cancelAnimationFrame(animFrameId);
    animateBall();
}

canvas.addEventListener('mousedown', handleShoot);
canvas.addEventListener('touchstart', handleShoot);

canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(e);
    mouseX = pos.x;
    mouseY = pos.y;
    if (!ballFlying && gameRunning) drawScene();
});

// ===== Game Over =====

function gameOver() {
    gameRunning = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    const isNewHigh = MeerkatScores.saveHighScore('shooting', score);

    document.getElementById('final-score').textContent = score;

    const highMsg = document.getElementById('high-score-msg');
    highMsg.style.display = (isNewHigh && score > 0) ? 'block' : 'none';

    const best = MeerkatScores.getHighScore('shooting');
    document.getElementById('best-score').textContent = `Best: ${best} points`;

    document.getElementById('gameover-overlay').style.display = 'flex';

    // Coach feedback
    if (score >= 80) CoachDialogue.show("What a performance! You could score from anywhere today!");
    else if (score >= 50) CoachDialogue.show("Brilliant shooting, Meerkats! Your aim is getting really sharp!");
    else if (score >= 30) CoachDialogue.show("Good effort! Try aiming for the red targets — they're worth more points!");
    else CoachDialogue.show("Keep practising your shooting! Remember — pick your spot, then shoot!");
}

// ===== Start / Retry =====

function startGame() {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('gameover-overlay').style.display = 'none';
    CoachDialogue.hide();

    score = 0;
    shotsLeft = 10;
    ballFlying = false;
    particles = [];
    scorePopups = [];
    mouseX = undefined;
    mouseY = undefined;

    calcDimensions();
    generateTargets();
    updateDisplays();

    gameRunning = true;
    drawScene();

    // Coach instructions
    CoachDialogue.show("Right Meerkats, pick your target and shoot! Aim carefully — you've got 10 shots!");
    setTimeout(() => {
        if (gameRunning && shotsLeft <= 5) CoachDialogue.show("Halfway through! Focus on the high-scoring targets!");
    }, 12000);
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

// Show existing high score
const existingHigh = MeerkatScores.getHighScore('shooting');
if (existingHigh > 0) {
    document.getElementById('high-score-start').textContent = `Your best: ${existingHigh} points`;
}

// Initial draw
calcDimensions();
generateTargets();
drawScene();
