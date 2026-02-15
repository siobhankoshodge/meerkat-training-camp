/* ===== Formation Frenzy Game ===== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight || w * (4 / 3);
    canvas.width = w;
    canvas.height = h;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); draw(); });

// ===== Constants =====
const TOTAL_ROUNDS = 8;
const SHOW_TIME = 3500;   // ms to memorise
const POSITIONS_PER_ROUND = [3, 3, 4, 4, 5, 5, 6, 7]; // players to place per round

// Named pitch zones for positions
const ZONE_NAMES = [
    'Left Wing', 'Centre Forward', 'Right Wing',
    'Left Midfield', 'Centre Mid', 'Right Midfield',
    'Left Back', 'Centre Back', 'Right Back',
    'Goalkeeper'
];

// Grid positions (normalised 0-1)
const GRID_SLOTS = [
    { x: 0.2, y: 0.15, name: 'Left Wing' },
    { x: 0.5, y: 0.12, name: 'Centre Forward' },
    { x: 0.8, y: 0.15, name: 'Right Wing' },
    { x: 0.2, y: 0.38, name: 'Left Midfield' },
    { x: 0.5, y: 0.35, name: 'Centre Mid' },
    { x: 0.8, y: 0.38, name: 'Right Midfield' },
    { x: 0.2, y: 0.6, name: 'Left Back' },
    { x: 0.5, y: 0.58, name: 'Centre Back' },
    { x: 0.8, y: 0.6, name: 'Right Back' },
    { x: 0.5, y: 0.82, name: 'Goalkeeper' }
];

// Meerkat player names (the real Meerkats!)
const PLAYER_NAMES = [
    'Saoirse', 'Alessia', 'Clara', 'Orla', 'Elspeth',
    'Olivia', 'Chloe', 'Becky', 'Vivienne', 'Helena'
];

// ===== Andy's Rambling Dialogues + Interrupts =====

const ANDY_RAMBLINGS = {
    start: [
        {
            andy: "Right then Meerkats, this formation is VERY important because back in 1987 when I played for the county under-12s we used a 4-3-3 and the reason I remember is because it was raining and my mum had forgotten my shinpads so I had to use rolled up newspapers and—",
            interrupt: "ANDY! Just tell us where to stand!",
            interrupter: "Meerkats"
        },
        {
            andy: "OK team, so formations are all about shape on the pitch, and when I say shape I mean like a diamond or a triangle, not like a rectangle because rectangles are for doors and windows, which reminds me I need to fix my kitchen window this weekend, anyway the point is—",
            interrupt: "Coach Andy we get it! Show us!",
            interrupter: "Meerkats"
        },
        {
            andy: "Now Meerkats, the most important thing in football is positioning, and I should know because I once stood in completely the wrong position for an entire half and nobody noticed until the ref asked why there were two goalkeepers, which was embarrassing but also quite funny when you think about—",
            interrupt: "ANDY!! Just show us where to go!",
            interrupter: "Meerkats"
        },
        {
            andy: "Formation time! So when I was coaching the under-10s back in 2019, or was it 2018, no it was definitely 2019 because that was the year my car broke down on the way to the cup final and I had to get a lift with Dave who drives far too slowly and we nearly missed—",
            interrupt: "COACH! The formation! PLEASE!",
            interrupter: "Meerkats"
        }
    ],
    showFormation: [
        {
            andy: "See those positions? Memorise them! It's like when I used to memorise my shopping list except I always forgot the milk, every single time, my wife says I'd forget my own head if it wasn't—",
            interrupt: "We're LOOKING Andy! Shh!",
            interrupter: "Meerkats"
        },
        {
            andy: "Watch carefully where everyone goes, this is crucial, absolutely crucial, almost as crucial as the time I had to remember where I parked at Tesco and I walked around the car park for 45 minutes—",
            interrupt: "ANDY! We're trying to concentrate!",
            interrupter: "Meerkats"
        },
        {
            andy: "Right, remember these spots! Brain power! Speaking of brain power, did you know that goldfish actually have quite good memories despite what people say, my uncle had a goldfish called Kevin who—",
            interrupt: "Nobody cares about Kevin the fish! We're memorising!",
            interrupter: "Meerkats"
        }
    ],
    correct: [
        {
            andy: "Brilliant! Perfect positioning! You know, that reminds me of the time I perfectly positioned a barbecue in my garden but it was too close to the fence and the neighbours called the fire brigade, which was completely unnecessary because—",
            interrupt: "Thanks Andy! Next round!",
            interrupter: "Meerkats"
        },
        {
            andy: "YES! Nailed it! Absolutely nailed it! That's even better than the time I nailed a shelf to the wall except I used the wrong nails and it fell down at 3am and scared the cat so badly she didn't come home for—",
            interrupt: "ANDY! Can we just play?!",
            interrupter: "Meerkats"
        },
        {
            andy: "Spot on! Every player exactly right! That level of accuracy reminds me of when I tried to measure my living room for new carpet and I was only 2 centimetres off, which sounds good but actually meant—",
            interrupt: "NEXT ROUND PLEASE ANDY!",
            interrupter: "Meerkats"
        }
    ],
    partial: [
        {
            andy: "Not bad! You got some right which is better than none right, it's like when I took my driving test the third time and the examiner said well you're improving which wasn't exactly encouraging but—",
            interrupt: "Just show us the next one, Andy!",
            interrupter: "Meerkats"
        },
        {
            andy: "Almost there! A few in the wrong spot but that's OK, mistakes help you learn, like the time I accidentally put salt in my tea instead of sugar, and then I did it again the next day, and actually the day after that too—",
            interrupt: "HOW do you mix up salt and sugar THREE times?! Next round!",
            interrupter: "Meerkats"
        }
    ],
    wrong: [
        {
            andy: "Hmm, not quite right, but don't worry! Getting things wrong is how we learn! I once put my shirt on inside out and went to work like that for the ENTIRE day and nobody told me until the meeting at 4 o'clock when my boss said Andy why is your—",
            interrupt: "ANDY PLEASE! Let us try again!",
            interrupter: "Meerkats"
        },
        {
            andy: "Oh dear, a bit muddled there! But that's fine because even the best players get confused sometimes, like the time I was playing Sunday league and I ran the entire length of the pitch celebrating a goal that was actually offside and everyone was—",
            interrupt: "We don't need the life story! Again!",
            interrupter: "Meerkats"
        }
    ],
    gameOver: [
        {
            andy: "Well done Meerkats! What a session! This reminds me of the time I completed a 1000-piece jigsaw puzzle in one weekend, well I say I completed it but actually there were 3 pieces missing and one of them turned up in the dog's bed six months later and the other two I think are probably still—",
            interrupt: "GREAT GAME EVERYONE! Ignore Andy!",
            interrupter: "Meerkats"
        },
        {
            andy: "Fantastic effort today! You know what, I'm so proud I could cry, actually I did cry once at a football match but that was because I got hit in the face with the ball during the warm-up which wasn't even my fault because Jeff kicked it too hard and—",
            interrupt: "Oh here we go again... WELL DONE MEERKATS!",
            interrupter: "Meerkats"
        }
    ]
};

function getAndyDialogue(category) {
    const options = ANDY_RAMBLINGS[category];
    return options[Math.floor(Math.random() * options.length)];
}

// ===== Custom Coach Andy Dialogue with OK Button =====

// Add shake animation + OK button styles
const extraStyles = document.createElement('style');
extraStyles.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(5px); }
    }
    #coach-ok-btn {
        background: #2ecc40;
        color: #1a1a1a;
        border: 2px solid #1a9c2d;
        border-radius: 8px;
        padding: 6px 20px;
        font-family: 'Fredoka', sans-serif;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        margin-left: 10px;
        flex-shrink: 0;
        transition: all 0.15s ease;
    }
    #coach-ok-btn:hover {
        background: #1a9c2d;
        color: #fff;
    }
    #coach-ok-btn:active {
        transform: scale(0.93);
    }
`;
document.head.appendChild(extraStyles);

// We need to block the default click-to-close on the coach dialogue
// during our OK button sequences
let _blockCoachClose = false;

function patchCoachDialogue() {
    CoachDialogue._ensureElement();
    // Only patch once
    if (CoachDialogue._patched) return;
    CoachDialogue._patched = true;

    // Replace the click listener with one that respects our block flag
    const el = CoachDialogue._element;
    // Remove old listener by cloning the node (removes all listeners)
    const newEl = el.cloneNode(true);
    el.parentNode.replaceChild(newEl, el);
    CoachDialogue._element = newEl;

    newEl.addEventListener('click', (e) => {
        if (_blockCoachClose) {
            e.stopPropagation();
            return; // blocked — must use OK button
        }
        CoachDialogue.hide();
    });
}

function getOkButtonParent() {
    // Find the "tap to close" div inside the coach dialogue
    const el = CoachDialogue._element;
    // It's the last div inside the flex container
    const flexContainer = el.querySelector('div[style*="display:flex"]');
    if (flexContainer) {
        const children = flexContainer.children;
        return children[children.length - 1]; // the "tap to close" div
    }
    return null;
}

function showAndyRamble(category, callback) {
    const dialogue = getAndyDialogue(category);

    patchCoachDialogue();
    _blockCoachClose = true;

    if (CoachDialogue._timeout) clearTimeout(CoachDialogue._timeout);

    // Show Andy rambling
    document.getElementById('coach-avatar').textContent = '🧔';
    document.getElementById('coach-name').textContent = 'Coach Andy:';
    document.getElementById('coach-name').style.color = '#2ecc40';
    document.getElementById('coach-message').textContent = dialogue.andy;
    CoachDialogue._element.style.display = 'block';
    CoachDialogue._element.style.cursor = 'default';

    // Replace "tap to close" with an OK button
    const btnParent = getOkButtonParent();
    if (btnParent) {
        btnParent.innerHTML = '<button id="coach-ok-btn">OK 👍</button>';
    }

    // When OK is clicked on Andy's ramble → Meerkats interrupt!
    const okBtn = document.getElementById('coach-ok-btn');
    if (okBtn) {
        okBtn.onclick = function (e) {
            e.stopPropagation();

            // Shake the dialogue box
            CoachDialogue._element.style.animation = 'none';
            void CoachDialogue._element.offsetHeight;
            CoachDialogue._element.style.animation = 'shake 0.4s ease';

            document.getElementById('coach-avatar').textContent = '🦡';
            document.getElementById('coach-name').textContent = dialogue.interrupter + ':';
            document.getElementById('coach-name').style.color = '#f5c542';
            document.getElementById('coach-message').textContent = dialogue.interrupt;

            // New OK button for the interrupt
            const btnParent2 = getOkButtonParent();
            if (btnParent2) {
                btnParent2.innerHTML = '<button id="coach-ok-btn">OK 😂</button>';
            }

            const okBtn2 = document.getElementById('coach-ok-btn');
            if (okBtn2) {
                okBtn2.onclick = function (e2) {
                    e2.stopPropagation();
                    document.getElementById('coach-name').style.color = '#2ecc40';
                    CoachDialogue._element.style.cursor = 'pointer';
                    _blockCoachClose = false;
                    CoachDialogue.hide();
                    if (callback) callback();
                };
            }
        };
    }
}

// ===== Game State =====
let gameRunning = false;
let currentRound = 0;
let score = 0;
let phase = 'idle'; // 'idle', 'showing', 'placing', 'checking', 'result'

// Round data
let targetSlots = [];    // indices into GRID_SLOTS — the correct answer
let playerNames = [];    // names assigned to each target slot
let placedMeerkats = []; // { slotIndex, placed: true/false }
let dragging = null;     // { playerIndex, x, y }

// Bench — meerkats waiting to be placed
let bench = [];

// Timer
let timerStart = 0;
let timerDuration = 0;
let timerInterval = null;

// ===== Drawing =====

function drawPitch() {
    const w = canvas.width;
    const h = canvas.height;

    // Grass
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#5a9e4b');
    grad.addColorStop(1, '#3a7d2c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Grass stripes
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < w; x += 35) {
        if (Math.floor(x / 35) % 2 === 0) {
            ctx.fillRect(x, 0, 35, h);
        }
    }

    // Centre circle
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.35, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Centre line
    ctx.beginPath();
    ctx.moveTo(0, h * 0.35);
    ctx.lineTo(w, h * 0.35);
    ctx.stroke();

    // Penalty area
    ctx.beginPath();
    ctx.rect(w * 0.2, h * 0.7, w * 0.6, h * 0.25);
    ctx.stroke();

    // Goal
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(w * 0.35, h * 0.92, w * 0.3, h * 0.06);
    ctx.stroke();
}

function drawTargetGhosts() {
    // During 'showing' phase, show where meerkats should go
    if (phase !== 'showing') return;

    targetSlots.forEach((slotIdx, i) => {
        const slot = GRID_SLOTS[slotIdx];
        const x = slot.x * canvas.width;
        const y = slot.y * canvas.height;

        // Glowing circle
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(Date.now() * 0.004 + i);
        ctx.fillStyle = 'rgba(46, 204, 64, 0.25)';
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#2ecc40';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.stroke();

        // Draw ghost meerkat
        ctx.globalAlpha = 0.7;
        drawMeerkat(ctx, x, y - 5, 35);

        // Name label
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Fredoka';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(playerNames[i], x, y + 18);

        // Position name
        ctx.fillStyle = '#f5c542';
        ctx.font = '9px Fredoka';
        ctx.fillText(slot.name, x, y + 31);

        ctx.restore();
    });
}

function drawEmptySlots() {
    // During 'placing' phase, show empty target circles
    if (phase !== 'placing') return;

    targetSlots.forEach((slotIdx, i) => {
        const slot = GRID_SLOTS[slotIdx];
        const x = slot.x * canvas.width;
        const y = slot.y * canvas.height;

        const isPlaced = placedMeerkats[i] !== null;

        if (isPlaced) {
            // Show placed meerkat
            ctx.save();
            ctx.globalAlpha = 1;
            drawMeerkat(ctx, x, y - 5, 35);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Fredoka';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(playerNames[placedMeerkats[i]], x, y + 18);
            ctx.restore();
        } else {
            // Empty slot — dashed circle with position name
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Position label
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '10px Fredoka';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(slot.name, x, y);
            ctx.restore();
        }
    });
}

function drawResultSlots() {
    // During 'checking'/'result' phase, show correct/incorrect
    if (phase !== 'checking' && phase !== 'result') return;

    targetSlots.forEach((slotIdx, i) => {
        const slot = GRID_SLOTS[slotIdx];
        const x = slot.x * canvas.width;
        const y = slot.y * canvas.height;

        const placedPlayerIdx = placedMeerkats[i];
        const isCorrect = placedPlayerIdx === i;

        ctx.save();

        // Background circle — green if correct, red if wrong
        ctx.fillStyle = isCorrect ? 'rgba(46, 204, 64, 0.3)' : 'rgba(231, 76, 60, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isCorrect ? '#2ecc40' : '#e74c3c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.stroke();

        // Draw the placed meerkat (or the correct one if empty)
        drawMeerkat(ctx, x, y - 5, 35);

        // Show the correct name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Fredoka';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(playerNames[i], x, y + 18);

        // Tick or cross
        ctx.font = 'bold 18px Fredoka';
        ctx.fillStyle = isCorrect ? '#2ecc40' : '#e74c3c';
        ctx.fillText(isCorrect ? '✓' : '✗', x + 22, y - 25);

        ctx.restore();
    });
}

function drawBench() {
    if (phase !== 'placing') return;

    // Draw bench area at the bottom
    const benchY = canvas.height - 55;
    const count = bench.length;
    if (count === 0) return;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, benchY - 10, canvas.width, 65);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Fredoka';
    ctx.textAlign = 'center';
    ctx.fillText('Drag players to their positions!', canvas.width / 2, benchY - 2);

    const spacing = Math.min(65, canvas.width / (count + 1));
    const startX = (canvas.width - (count - 1) * spacing) / 2;

    bench.forEach((playerIdx, i) => {
        if (playerIdx === null) return; // already placed
        if (dragging && dragging.benchIndex === i) return; // being dragged

        const bx = startX + i * spacing;
        const by = benchY + 20;

        drawMeerkat(ctx, bx, by - 5, 30);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Fredoka';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(playerNames[playerIdx], bx, by + 13);
    });
}

function drawDragging() {
    if (!dragging) return;

    ctx.save();
    ctx.globalAlpha = 0.8;
    drawMeerkat(ctx, dragging.x, dragging.y - 5, 38);

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 11px Fredoka';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(playerNames[dragging.playerIndex], dragging.x, dragging.y + 18);
    ctx.restore();
}

function draw() {
    drawPitch();
    drawTargetGhosts();
    drawEmptySlots();
    drawResultSlots();
    drawBench();
    drawDragging();
}

// ===== Timer =====

function startTimer(duration) {
    timerDuration = duration;
    timerStart = Date.now();
    const fill = document.getElementById('timer-fill');
    fill.style.width = '100%';
    fill.className = 'timer-bar-fill';

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - timerStart;
        const pct = Math.max(0, 1 - elapsed / timerDuration);
        fill.style.width = (pct * 100) + '%';

        if (pct < 0.25) fill.className = 'timer-bar-fill danger';
        else if (pct < 0.5) fill.className = 'timer-bar-fill warning';

        if (pct <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            onTimerExpired();
        }
    }, 50);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function onTimerExpired() {
    if (phase === 'placing') {
        // Auto-fill remaining slots randomly
        autoFillRemaining();
        checkRound();
    }
}

function autoFillRemaining() {
    // Place any unplaced meerkats randomly
    const unplacedBench = bench.map((p, i) => ({ playerIdx: p, benchIdx: i })).filter(b => b.playerIdx !== null);
    const emptySlots = placedMeerkats.map((p, i) => i).filter(i => placedMeerkats[i] === null);

    // Shuffle unplaced
    for (let i = unplacedBench.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unplacedBench[i], unplacedBench[j]] = [unplacedBench[j], unplacedBench[i]];
    }

    emptySlots.forEach((slotIdx, i) => {
        if (i < unplacedBench.length) {
            placedMeerkats[slotIdx] = unplacedBench[i].playerIdx;
            bench[unplacedBench[i].benchIdx] = null;
        }
    });
}

// ===== Round Logic =====

function setupRound() {
    const numPlayers = POSITIONS_PER_ROUND[currentRound] || 5;

    // Pick random slots for this round
    const available = [...Array(GRID_SLOTS.length).keys()];
    shuffle(available);
    targetSlots = available.slice(0, numPlayers);

    // Sort by Y then X for logical order
    targetSlots.sort((a, b) => {
        const sa = GRID_SLOTS[a];
        const sb = GRID_SLOTS[b];
        if (Math.abs(sa.y - sb.y) > 0.1) return sa.y - sb.y;
        return sa.x - sb.x;
    });

    // Assign player names
    const namePool = [...PLAYER_NAMES];
    shuffle(namePool);
    playerNames = namePool.slice(0, numPlayers);

    // Reset placement
    placedMeerkats = new Array(numPlayers).fill(null);

    // Update UI
    document.getElementById('round-num').textContent = currentRound + 1;
    document.getElementById('score-display').textContent = `Score: ${score}`;
}

function startShowPhase() {
    phase = 'showing';
    draw();

    // Show Andy rambling then show formation with a "Ready!" button
    if (currentRound === 0) {
        showAndyRamble('start', () => {
            showFormationWithReadyButton();
        });
    } else {
        showAndyRamble('showFormation', () => {
            showFormationWithReadyButton();
        });
    }
}

function showFormationWithReadyButton() {
    // Formation is visible on the pitch — let the player study it
    phase = 'showing';
    draw();

    patchCoachDialogue();
    _blockCoachClose = true;

    if (CoachDialogue._timeout) clearTimeout(CoachDialogue._timeout);

    document.getElementById('coach-avatar').textContent = '👀';
    document.getElementById('coach-name').textContent = 'Memorise!';
    document.getElementById('coach-name').style.color = '#f5c542';
    document.getElementById('coach-message').textContent = 'Study the formation... press Ready when you\'ve got it!';
    CoachDialogue._element.style.display = 'block';
    CoachDialogue._element.style.cursor = 'default';

    const btnParent = getOkButtonParent();
    if (btnParent) {
        btnParent.innerHTML = '<button id="coach-ok-btn">Ready! 🧠</button>';
    }

    // Animate the formation ghosts while waiting
    let showAnim;
    function animateWhileStudying() {
        if (phase !== 'showing') return;
        draw();
        showAnim = requestAnimationFrame(animateWhileStudying);
    }
    animateWhileStudying();

    const readyBtn = document.getElementById('coach-ok-btn');
    if (readyBtn) {
        readyBtn.onclick = function (e) {
            e.stopPropagation();
            if (showAnim) cancelAnimationFrame(showAnim);
            document.getElementById('coach-name').style.color = '#2ecc40';
            CoachDialogue._element.style.cursor = 'pointer';
            _blockCoachClose = false;
            CoachDialogue.hide();
            startPlacePhase();
        };
    }
}

function startPlacePhase() {
    phase = 'placing';
    stopTimer();

    // Create bench with shuffled player indices
    const indices = playerNames.map((_, i) => i);
    shuffle(indices);
    bench = indices;

    // Give time based on difficulty
    const placeTime = 12000 + (POSITIONS_PER_ROUND[currentRound] || 5) * 1500 - currentRound * 500;
    startTimer(Math.max(8000, placeTime));

    draw();
}

function checkRound() {
    phase = 'checking';
    stopTimer();
    dragging = null;

    // Count correct placements
    let correct = 0;
    const numPlayers = targetSlots.length;

    for (let i = 0; i < numPlayers; i++) {
        if (placedMeerkats[i] === i) correct++;
    }

    // Score: points per correct player, bonus for all correct
    const roundPoints = correct * 10;
    const bonus = (correct === numPlayers) ? numPlayers * 5 : 0;
    score += roundPoints + bonus;

    document.getElementById('score-display').textContent = `Score: ${score}`;

    draw();

    // Show Andy's reaction with interrupt — after a short pause to see results
    const pct = correct / numPlayers;
    let category;
    if (pct === 1) category = 'correct';
    else if (pct >= 0.5) category = 'partial';
    else category = 'wrong';

    setTimeout(() => {
        showAndyRamble(category, () => {
            currentRound++;
            if (currentRound >= TOTAL_ROUNDS) {
                gameOver();
            } else {
                setupRound();
                startShowPhase();
            }
        });
    }, 1500);
}

// ===== Drag & Drop =====

function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function findBenchMeerkat(px, py) {
    if (bench.length === 0) return null;

    const benchY = canvas.height - 55 + 20;
    const count = bench.length;
    const spacing = Math.min(65, canvas.width / (count + 1));
    const startX = (canvas.width - (count - 1) * spacing) / 2;

    for (let i = 0; i < bench.length; i++) {
        if (bench[i] === null) continue;
        const bx = startX + i * spacing;
        const dist = Math.sqrt((px - bx) ** 2 + (py - benchY) ** 2);
        if (dist < 30) {
            return { benchIndex: i, playerIndex: bench[i] };
        }
    }
    return null;
}

function findPlacedMeerkat(px, py) {
    for (let i = 0; i < targetSlots.length; i++) {
        if (placedMeerkats[i] === null) continue;
        const slot = GRID_SLOTS[targetSlots[i]];
        const sx = slot.x * canvas.width;
        const sy = slot.y * canvas.height;
        const dist = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
        if (dist < 30) {
            return { slotIndex: i, playerIndex: placedMeerkats[i] };
        }
    }
    return null;
}

function findNearestSlot(px, py) {
    let closest = null;
    let closestDist = 45; // snap distance

    for (let i = 0; i < targetSlots.length; i++) {
        const slot = GRID_SLOTS[targetSlots[i]];
        const sx = slot.x * canvas.width;
        const sy = slot.y * canvas.height;
        const dist = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
        if (dist < closestDist) {
            closestDist = dist;
            closest = i;
        }
    }
    return closest;
}

function onPointerDown(e) {
    if (phase !== 'placing') return;
    e.preventDefault();
    const pos = getPointerPos(e);

    // Try picking from bench
    const benchHit = findBenchMeerkat(pos.x, pos.y);
    if (benchHit) {
        dragging = {
            benchIndex: benchHit.benchIndex,
            playerIndex: benchHit.playerIndex,
            fromSlot: null,
            x: pos.x,
            y: pos.y
        };
        bench[benchHit.benchIndex] = null;
        draw();
        return;
    }

    // Try picking from a placed slot
    const placedHit = findPlacedMeerkat(pos.x, pos.y);
    if (placedHit) {
        dragging = {
            benchIndex: null,
            playerIndex: placedHit.playerIndex,
            fromSlot: placedHit.slotIndex,
            x: pos.x,
            y: pos.y
        };
        placedMeerkats[placedHit.slotIndex] = null;
        draw();
        return;
    }
}

function onPointerMove(e) {
    if (!dragging || phase !== 'placing') return;
    e.preventDefault();
    const pos = getPointerPos(e);
    dragging.x = pos.x;
    dragging.y = pos.y;
    draw();
}

function onPointerUp(e) {
    if (!dragging || phase !== 'placing') return;
    e.preventDefault();

    const pos = getPointerPos(e.changedTouches ? e.changedTouches[0] : e);
    const slotIdx = findNearestSlot(pos.x, pos.y);

    if (slotIdx !== null && placedMeerkats[slotIdx] === null) {
        // Place in slot
        placedMeerkats[slotIdx] = dragging.playerIndex;
    } else if (slotIdx !== null && placedMeerkats[slotIdx] !== null) {
        // Swap with existing
        const existingPlayer = placedMeerkats[slotIdx];
        placedMeerkats[slotIdx] = dragging.playerIndex;

        // Put existing back on bench or back in original slot
        if (dragging.fromSlot !== null) {
            placedMeerkats[dragging.fromSlot] = existingPlayer;
        } else {
            // Find empty bench spot
            const emptyBench = bench.indexOf(null);
            if (emptyBench !== -1) {
                bench[emptyBench] = existingPlayer;
            } else {
                bench.push(existingPlayer);
            }
        }
    } else {
        // Return to bench or original slot
        if (dragging.fromSlot !== null) {
            placedMeerkats[dragging.fromSlot] = dragging.playerIndex;
        } else {
            // Back to bench
            if (dragging.benchIndex !== null) {
                bench[dragging.benchIndex] = dragging.playerIndex;
            } else {
                const emptyBench = bench.indexOf(null);
                if (emptyBench !== -1) bench[emptyBench] = dragging.playerIndex;
                else bench.push(dragging.playerIndex);
            }
        }
    }

    dragging = null;
    draw();

    // Check if all placed
    if (placedMeerkats.every(p => p !== null)) {
        checkRound();
    }
}

// Mouse events
canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);

// Touch events
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
canvas.addEventListener('touchend', onPointerUp, { passive: false });

// ===== Game Over =====

function gameOver() {
    gameRunning = false;
    phase = 'idle';
    stopTimer();

    const isNewHigh = MeerkatScores.saveHighScore('formation', score);

    document.getElementById('final-score').textContent = score;

    const title = document.getElementById('result-title');
    if (score >= 200) title.textContent = '🏆 Tactical Genius!';
    else if (score >= 150) title.textContent = '🌟 Formation Expert!';
    else if (score >= 100) title.textContent = '👏 Good Memory!';
    else if (score >= 50) title.textContent = '💪 Keep Learning!';
    else title.textContent = '🧠 Keep Practising!';

    const highMsg = document.getElementById('high-score-msg');
    highMsg.style.display = (isNewHigh && score > 0) ? 'block' : 'none';

    const best = MeerkatScores.getHighScore('formation');
    document.getElementById('best-score').textContent = `Best: ${best} points`;

    document.getElementById('gameover-overlay').style.display = 'flex';

    setTimeout(() => {
        showAndyRamble('gameOver');
    }, 500);
}

// ===== Start / Retry =====

function startGame() {
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('gameover-overlay').style.display = 'none';
    CoachDialogue.hide();

    currentRound = 0;
    score = 0;
    gameRunning = true;

    document.getElementById('score-display').textContent = 'Score: 0';

    setupRound();
    startShowPhase();
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

// ===== Utility =====

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Show existing high score
const existingHigh = MeerkatScores.getHighScore('formation');
if (existingHigh > 0) {
    document.getElementById('high-score-start').textContent = `Your best: ${existingHigh} points`;
}

// Initial draw
draw();
