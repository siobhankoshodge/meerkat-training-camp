/* ===== Meerkat Training Camp - Shared Utilities ===== */

const MeerkatScores = {
    getHighScore(gameKey) {
        const score = localStorage.getItem(`meerkat_${gameKey}_high`);
        return score ? parseInt(score, 10) : 0;
    },

    saveHighScore(gameKey, score) {
        const current = this.getHighScore(gameKey);
        if (score > current) {
            localStorage.setItem(`meerkat_${gameKey}_high`, score.toString());
            return true; // New high score!
        }
        return false;
    },

    // For time-based games (lower is better)
    getBestTime(gameKey) {
        const time = localStorage.getItem(`meerkat_${gameKey}_best`);
        return time ? parseFloat(time) : null;
    },

    saveBestTime(gameKey, time) {
        const current = this.getBestTime(gameKey);
        if (current === null || time < current) {
            localStorage.setItem(`meerkat_${gameKey}_best`, time.toString());
            return true;
        }
        return false;
    }
};

/* Draw a simple meerkat on a canvas context */
function drawMeerkat(ctx, x, y, size) {
    const s = size / 40; // scale factor

    // Body (brown)
    ctx.fillStyle = '#c4883e';
    ctx.beginPath();
    ctx.ellipse(x, y + 10 * s, 12 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Kit (black & green stripes)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y + 6 * s, 11 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.clip();

    const stripeW = 5 * s;
    for (let sx = x - 15 * s; sx < x + 15 * s; sx += stripeW * 2) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(sx, y - 10 * s, stripeW, 30 * s);
        ctx.fillStyle = '#2ecc40';
        ctx.fillRect(sx + stripeW, y - 10 * s, stripeW, 30 * s);
    }
    ctx.restore();

    // Head
    ctx.fillStyle = '#c4883e';
    ctx.beginPath();
    ctx.arc(x, y - 16 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x - 4 * s, y - 18 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.arc(x + 4 * s, y - 18 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 3 * s, y - 19 * s, 1 * s, 0, Math.PI * 2);
    ctx.arc(x + 5 * s, y - 19 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(x, y - 13 * s, 2 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(x, y - 12 * s, 4 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Ears
    ctx.fillStyle = '#c4883e';
    ctx.beginPath();
    ctx.arc(x - 9 * s, y - 22 * s, 4 * s, 0, Math.PI * 2);
    ctx.arc(x + 9 * s, y - 22 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
}

/* ===== Coach Dialogue System ===== */
const COACHES = ['Siobhan', 'Jeff', 'Andy'];

const CoachDialogue = {
    _currentCoach: null,
    _element: null,
    _timeout: null,

    // Create the coach speech bubble element if it doesn't exist
    _ensureElement() {
        if (this._element) return;
        const el = document.createElement('div');
        el.id = 'coach-dialogue';
        el.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(26, 26, 26, 0.95);
            color: #fff;
            font-family: 'Fredoka', sans-serif;
            padding: 12px 18px;
            display: none;
            z-index: 90;
            border-top: 3px solid #2ecc40;
            animation: slideUp 0.3s ease;
            cursor: pointer;
        `;
        el.title = 'Click to dismiss';
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;max-width:600px;margin:0 auto;">
                <div id="coach-avatar" style="font-size:2rem;flex-shrink:0;"></div>
                <div>
                    <div id="coach-name" style="color:#2ecc40;font-weight:700;font-size:0.85rem;"></div>
                    <div id="coach-message" style="font-size:0.95rem;line-height:1.4;"></div>
                </div>
                <div style="color:#666;font-size:0.7rem;flex-shrink:0;">tap to close</div>
            </div>
        `;
        el.addEventListener('click', () => this.hide());
        document.body.appendChild(el);

        // Add slide-up animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);

        this._element = el;
    },

    // Pick a random coach
    _pickCoach() {
        const coach = COACHES[Math.floor(Math.random() * COACHES.length)];
        this._currentCoach = coach;
        return coach;
    },

    // Show a coach message
    show(message, duration) {
        this._ensureElement();
        if (this._timeout) clearTimeout(this._timeout);

        const coach = this._pickCoach();
        const avatars = { Siobhan: '👩‍🦰', Jeff: '👨', Andy: '🧔' };

        document.getElementById('coach-avatar').textContent = avatars[coach] || '🧑‍🏫';
        document.getElementById('coach-name').textContent = `Coach ${coach}:`;
        document.getElementById('coach-message').textContent = message;
        this._element.style.display = 'block';

        const displayTime = duration || Math.max(3000, message.length * 60);
        this._timeout = setTimeout(() => this.hide(), displayTime);
    },

    hide() {
        if (this._element) {
            this._element.style.display = 'none';
        }
        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }
    },

    // Show a sequence of messages with delays
    sequence(messages, delayBetween) {
        const gap = delayBetween || 4000;
        messages.forEach((msg, i) => {
            setTimeout(() => this.show(msg), i * gap);
        });
    }
};

/* Draw a football */
function drawFootball(ctx, x, y, radius) {
    // White ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Pentagon pattern
    ctx.fillStyle = '#333';
    const pentSize = radius * 0.35;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
        const px = x + Math.cos(angle) * pentSize;
        const py = y + Math.sin(angle) * pentSize;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
}
