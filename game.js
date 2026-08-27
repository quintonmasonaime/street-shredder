const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const hud = document.getElementById("hud");
const scoreText = document.getElementById("score");
const comboText = document.getElementById("combo");
const instructions = document.getElementById("instructions");
const trickStatus = document.getElementById("trick-status");
const restart = document.getElementById("restart");
const soundToggle = document.getElementById("sound-toggle");
const menu = document.getElementById("menu");
const gameOverPanel = document.getElementById("game-over");
const gameOverTitle = document.getElementById("game-over-title");
const finalScore = document.getElementById("final-score");
const newBest = document.getElementById("new-best");
const bestScoreText = document.getElementById("best-score");
const startButton = document.getElementById("start-button");
const playAgain = document.getElementById("play-again");
const characterOptions = document.querySelectorAll(".character-option");

let W = 0;
let H = 0;
let ground = 0;
let dpr = 1;

let worldX = 0;
let speed = 5;
let score = 0;
let combo = 0;
let gameStarted = false;
let gameOver = false;
let lastTime = 0;

let selectedCharacter = "street";
let particles = [];
let floatingTexts = [];
let objects = [];

let audioContext = null;
let soundEnabled = true;

const characters = {
  street: {
    filter: "none",
    board: "#191b21",
    accent: "#ffd166",
    trail: "#ffffff"
  },
  neon: {
    filter: "hue-rotate(150deg) saturate(1.65)",
    board: "#182c48",
    accent: "#62f7e6",
    trail: "#62f7e6"
  },
  sunset: {
    filter: "hue-rotate(-35deg) saturate(1.35)",
    board: "#3b2330",
    accent: "#ff9d5c",
    trail: "#ffe29a"
  }
};

const player = {
  x: 100,
  y: 0,
  width: 52,
  height: 76,
  vx: 0,
  vy: 0,
  rotation: 0,
  onGround: true,
  airTime: 0,
  trickName: "",
  trickValue: 0,
  lastTrick: "HEELFLIP",
  grinding: false,
  grindRail: null,
  grindTime: 0,
  grindTick: 0
};

const images = {};
images.skater = new Image();
images.skater.src = "sprites/skater.svg";
images.coin = new Image();
images.coin.src = "sprites/coin.svg";
images.ramp = new Image();
images.ramp.src = "sprites/ramp.svg";


function getBestScore() {
  try {
    return Number(localStorage.getItem("street-shredder-best")) || 0;
  } catch (error) {
    return 0;
  }
}


function setBestScore(value) {
  try {
    localStorage.setItem("street-shredder-best", String(value));
  } catch (error) {
    // Private browsing can block localStorage; the run still works.
  }
}


function updateHud() {
  scoreText.textContent = Math.floor(score);
  comboText.textContent = combo;
  bestScoreText.textContent = getBestScore();
}


function updateSoundToggle() {
  soundToggle.textContent = soundEnabled ? "🔊" : "🔇";
  soundToggle.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Unmute sound");
}


function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ground = H * 0.78;

  for (const object of objects) {
    if (object.groundOffset !== undefined) {
      object.y = ground - object.groundOffset;
    }
  }

  if (player.grinding && player.grindRail) {
    player.y = player.grindRail.y - player.height;
  } else if (player.onGround) {
    player.y = ground - player.height;
  }
}


window.addEventListener("resize", resize);


function makeCoin(x, groundOffset) {
  return {
    type: "coin",
    x,
    y: ground - groundOffset,
    groundOffset,
    width: 34,
    height: 34,
    collected: false
  };
}


function makeRamp(x) {
  return {
    type: "ramp",
    x,
    y: ground - 72,
    groundOffset: 72,
    width: 120,
    height: 72,
    used: false
  };
}


function makeBlock(x) {
  return {
    type: "block",
    x,
    y: ground - 58,
    groundOffset: 58,
    width: 54,
    height: 58
  };
}


function makeRail(x) {
  return {
    type: "rail",
    x,
    y: ground - 94,
    groundOffset: 94,
    width: 180,
    height: 94,
    used: false
  };
}


function resetGame() {
  resize();

  worldX = 0;
  speed = 5;
  score = 0;
  combo = 0;
  gameOver = false;
  lastTime = 0;

  player.x = W * 0.22;
  player.y = ground - player.height;
  player.vx = 0;
  player.vy = 0;
  player.rotation = 0;
  player.onGround = true;
  player.airTime = 0;
  player.trickName = "";
  player.trickValue = 0;
  player.lastTrick = "HEELFLIP";
  player.grinding = false;
  player.grindRail = null;
  player.grindTime = 0;
  player.grindTick = 0;

  particles = [];
  floatingTexts = [];

  objects = [
    makeCoin(450, 150),
    makeRamp(740),
    makeCoin(900, 180),
    makeRail(1080),
    makeCoin(1240, 150),
    makeBlock(1390),
    makeRamp(1580),
    makeCoin(1770, 190),
    makeRail(1940),
    makeCoin(2180, 145)
  ];

  updateHud();
  trickStatus.classList.remove("show");

  if (gameStarted) {
    instructions.classList.remove("is-hidden");
    instructions.innerHTML =
      "SWIPE UP TO JUMP<br>" +
      "<small>TAP IN THE AIR FOR A FLIP • LAND CLEAN</small>";
  } else {
    instructions.classList.add("is-hidden");
  }
}


function showMenu() {
  gameStarted = false;
  gameOver = false;
  menu.classList.remove("is-hidden");
  gameOverPanel.classList.add("is-hidden");
  gameOverPanel.setAttribute("aria-hidden", "true");
  hud.classList.add("is-hidden");
  restart.classList.add("is-hidden");
  instructions.classList.add("is-hidden");
  updateHud();
}


function startRun() {
  ensureAudio();
  gameStarted = true;
  menu.classList.add("is-hidden");
  gameOverPanel.classList.add("is-hidden");
  gameOverPanel.setAttribute("aria-hidden", "true");
  hud.classList.remove("is-hidden");
  restart.classList.remove("is-hidden");
  resetGame();
}


function jump(fromRamp = false) {
  if (!gameStarted) return;

  if (gameOver) {
    startRun();
    return;
  }

  if (player.grinding) {
    player.grinding = false;
    player.grindRail = null;
    player.vy = -8;
  }

  if (player.onGround || fromRamp) {
    player.vy = fromRamp ? -(17.2 + speed * 0.25) : -15.2;
    player.vx += fromRamp ? 1.1 : 0;
    player.onGround = false;
    player.airTime = 0;
    player.trickName = "";
    player.trickValue = 0;
    createParticles(player.x + player.width / 2, player.y + player.height, 9, "#ffffff");
    sfxJump(fromRamp);
  }
}


function trick() {
  if (!gameStarted || gameOver || player.onGround || player.grinding) return;

  const nextTrick = player.lastTrick === "KICKFLIP" ? "HEELFLIP" : "KICKFLIP";
  player.lastTrick = nextTrick;
  player.trickName = nextTrick;
  player.trickValue += 100;
  player.rotation += nextTrick === "KICKFLIP" ? Math.PI * 2 : -Math.PI * 2;
  combo += 1;
  score += 100;

  showTrick(`${nextTrick} +100`, characters[selectedCharacter].accent);
  createParticles(
    player.x + player.width / 2,
    player.y + player.height / 2,
    16,
    characters[selectedCharacter].trail
  );
  sfxTrick(nextTrick);
  updateHud();
}


function steer(direction) {
  if (!gameStarted || gameOver) return;
  player.vx = Math.max(-6, Math.min(6, player.vx + direction * 1.5));
}


function touching(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}


function showTrick(text, color) {
  trickStatus.textContent = text;
  trickStatus.style.color = color;
  trickStatus.classList.remove("show");
  void trickStatus.offsetWidth;
  trickStatus.classList.add("show");
}


function addFloatingText(text, x, y, color = "#ffffff") {
  floatingTexts.push({ text, x, y, color, life: 1 });
}


function createParticles(x, y, amount, color = "#ffffff") {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: -Math.random() * 5,
      size: 3 + Math.random() * 3,
      color,
      life: 1
    });
  }
}


function updateParticles(delta, frame) {
  for (const particle of particles) {
    particle.x += particle.vx * frame;
    particle.y += particle.vy * frame;
    particle.vy += 0.25 * frame;
    particle.life -= delta / 650;
  }
  particles = particles.filter(particle => particle.life > 0);

  for (const item of floatingTexts) {
    item.y -= 0.55 * frame;
    item.life -= delta / 800;
  }
  floatingTexts = floatingTexts.filter(item => item.life > 0);
}


function startGrind(rail) {
  player.grinding = true;
  player.grindRail = rail;
  player.grindTime = 0;
  player.grindTick = 0;
  player.vy = 0;
  player.y = rail.y - player.height;
  rail.used = true;
  score += 25;
  addFloatingText("GRIND +25", player.x, player.y - 10, "#b9f6ff");
  createParticles(player.x + player.width / 2, rail.y, 8, "#fff3a0");
  sfxGrind();
}


function landPlayer() {
  if (!player.onGround) {
    if (player.trickValue > 0) {
      const bonus = 50 + Math.floor(player.airTime * 80);
      score += bonus;
      showTrick(`CLEAN LAND +${bonus}`, characters[selectedCharacter].accent);
      addFloatingText(`+${bonus}`, player.x + 20, player.y, characters[selectedCharacter].accent);
      createParticles(player.x + player.width / 2, ground, 10, characters[selectedCharacter].trail);
      sfxLand(true);
    } else if (player.airTime > 0.55) {
      const bonus = Math.floor(player.airTime * 100);
      score += bonus;
      addFloatingText(`AIR +${bonus}`, player.x + 20, player.y, "#ffffff");
      sfxLand(false);
      combo = 0;
    }
  }

  player.y = ground - player.height;
  player.vy = 0;
  player.onGround = true;
  player.airTime = 0;
  player.rotation *= 0.25;
  player.trickName = "";
  player.trickValue = 0;
  player.grinding = false;
  player.grindRail = null;
  player.grindTime = 0;
}


function bail() {
  if (gameOver) return;

  gameOver = true;
  player.grinding = false;
  player.grindRail = null;
  instructions.classList.add("is-hidden");
  createParticles(player.x + 25, player.y + 35, 28, "#ffd166");
  sfxCrash();

  const value = Math.floor(score);
  const oldBest = getBestScore();
  const record = value > oldBest;

  if (record) setBestScore(value);
  finalScore.textContent = value;
  newBest.classList.toggle("is-hidden", !record);
  gameOverTitle.textContent = record ? "NEW HIGH SCORE! ✨" : "BAIL! 💥";
  gameOverPanel.classList.remove("is-hidden");
  gameOverPanel.setAttribute("aria-hidden", "false");
  restart.classList.add("is-hidden");
  updateHud();
}


function spawnAhead() {
  if (!objects.length) return;

  const furthest = Math.max(...objects.map(object => object.x));
  if (furthest > worldX + W + 850) return;

  const nextX = furthest + 300 + Math.random() * 140;
  const roll = Math.random();

  if (roll < 0.28) {
    objects.push(makeCoin(nextX, 125 + Math.random() * 120));
    objects.push(makeCoin(nextX + 58, 155 + Math.random() * 95));
    objects.push(makeCoin(nextX + 116, 125 + Math.random() * 120));
  } else if (roll < 0.5) {
    objects.push(makeRamp(nextX));
    objects.push(makeCoin(nextX + 155, 165 + Math.random() * 70));
  } else if (roll < 0.72) {
    objects.push(makeRail(nextX));
    objects.push(makeCoin(nextX + 70, 205));
  } else {
    objects.push(makeBlock(nextX));
    if (Math.random() < 0.55) {
      objects.push(makeCoin(nextX + 115, 145 + Math.random() * 80));
    }
  }
}


function update(delta) {
  const frame = Math.min(2.5, delta / 16.67 || 1);

  if (!gameStarted || gameOver) {
    updateParticles(delta, frame);
    return;
  }

  speed = Math.min(11, speed + delta * 0.00015);
  worldX += speed * frame;

  for (const object of objects) {
    object.screenX = object.x - worldX + W * 0.25;
  }

  player.vx *= Math.pow(0.94, frame);
  player.x += player.vx * frame;
  player.x = Math.max(20, Math.min(W * 0.58, player.x));

  if (player.grinding && player.grindRail) {
    const rail = player.grindRail;
    const overlapsRail =
      player.x + player.width - 8 > rail.screenX &&
      player.x + 8 < rail.screenX + rail.width;

    if (!overlapsRail || rail.screenX + rail.width < -20) {
      player.grinding = false;
      player.grindRail = null;
      player.vy = -7;
      player.airTime = 0;
      sfxJump(false);
    } else {
      player.y = rail.y - player.height;
      player.vy = 0;
      player.onGround = false;
      player.grindTime += delta / 1000;
      player.grindTick += delta;

      if (player.grindTick > 110) {
        score += 10;
        player.grindTick = 0;
        addFloatingText("+10", player.x + 20, player.y - 8, "#b9f6ff");
        createParticles(player.x + 18, rail.y, 3, "#fff3a0");
        sfxGrindTick();
      }
    }
  }

  if (!player.grinding) {
    player.vy += 0.72 * frame;
    player.y += player.vy * frame;

    if (player.y + player.height >= ground) {
      landPlayer();
    } else {
      player.onGround = false;
      player.airTime += delta / 1000;
    }
  }

  for (const object of objects) {
    const objectBox = {
      x: object.screenX,
      y: object.y,
      width: object.width,
      height: object.height
    };

    if (object.type === "coin" && !object.collected && touching(player, objectBox)) {
      object.collected = true;
      score += 25;
      addFloatingText("+25", object.screenX, object.y, "#fff3a0");
      createParticles(object.screenX + object.width / 2, object.y + object.height / 2, 11, "#fff3a0");
      sfxCoin();
    }

    if (object.type === "block" && touching(player, objectBox)) {
      bail();
    }

    if (
      object.type === "ramp" &&
      !object.used &&
      player.onGround &&
      player.x + player.width > object.screenX + 8 &&
      player.x < object.screenX + object.width
    ) {
      object.used = true;
      jump(true);
    }

    if (
      object.type === "rail" &&
      !object.used &&
      !player.grinding &&
      !player.onGround &&
      player.vy >= 0 &&
      player.y + player.height >= object.y - 14 &&
      player.y + player.height <= object.y + 22 &&
      player.x + player.width - 8 > object.screenX &&
      player.x + 8 < object.screenX + object.width
    ) {
      startGrind(object);
    }
  }

  while (objects.length && objects[0].x - worldX < -500) {
    objects.shift();
  }
  spawnAhead();

  updateParticles(delta, frame);
  updateHud();

  if (worldX > 380) {
    instructions.classList.add("is-hidden");
  }
}


function drawCloud(x, y, scale = 1) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 17 * scale, Math.PI, 0);
  ctx.arc(x + 22 * scale, y - 8 * scale, 22 * scale, Math.PI, 0);
  ctx.arc(x + 50 * scale, y, 17 * scale, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 17 * scale, y, 84 * scale, 15 * scale);
  ctx.restore();
}


function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#68c7f2");
  sky.addColorStop(1, "#d9f5ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffe27a";
  ctx.beginPath();
  ctx.arc(W * 0.82, H * 0.18, 45, 0, Math.PI * 2);
  ctx.fill();

  drawCloud(W * 0.12 - (worldX * 0.04 % (W + 150)), H * 0.2, 0.9);
  drawCloud(W * 0.58 - (worldX * 0.025 % (W + 170)), H * 0.31, 0.65);

  ctx.fillStyle = "#7d9aa8";
  for (let i = -2; i < 22; i += 1) {
    const x = i * 100 - (worldX * 0.18 % 100);
    const height = 60 + Math.abs((i * 37) % 120);
    ctx.fillRect(x, ground - height, 75, height);

    ctx.fillStyle = "#a9c0c7";
    for (let row = 0; row < Math.floor(height / 28); row += 1) {
      ctx.fillRect(x + 12, ground - height + 14 + row * 28, 8, 10);
      ctx.fillRect(x + 32, ground - height + 14 + row * 28, 8, 10);
      ctx.fillRect(x + 52, ground - height + 14 + row * 28, 8, 10);
    }
    ctx.fillStyle = "#7d9aa8";
  }

  ctx.fillStyle = "#343943";
  ctx.fillRect(0, ground, W, H - ground);

  ctx.fillStyle = "#777d87";
  ctx.fillRect(0, ground, W, 8);

  for (let x = -(worldX % 90); x < W; x += 90) {
    ctx.fillStyle = "#ddd";
    ctx.fillRect(x, ground + 45, 48, 6);
  }
}


function drawRail(object) {
  const x = object.screenX;
  const y = object.y;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#202a3b";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 2);
  ctx.lineTo(x + object.width - 3, y + 2);
  ctx.stroke();

  ctx.strokeStyle = "#e8f4ff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 3, y);
  ctx.lineTo(x + object.width - 3, y);
  ctx.moveTo(x + 24, y + 3);
  ctx.lineTo(x + 24, ground);
  ctx.moveTo(x + object.width - 24, y + 3);
  ctx.lineTo(x + object.width - 24, ground);
  ctx.stroke();
  ctx.restore();
}


function drawFallbackSkater() {
  ctx.fillStyle = "#f2c29b";
  ctx.beginPath();
  ctx.arc(4, -27, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e94f64";
  ctx.fillRect(-7, -16, 22, 24);
  ctx.strokeStyle = "#202534";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, 8);
  ctx.lineTo(-11, 28);
  ctx.moveTo(8, 8);
  ctx.lineTo(18, 27);
  ctx.stroke();
}


function drawObjects() {
  for (const object of objects) {
    const x = object.screenX;
    if (x < -200 || x > W + 200) continue;

    if (object.type === "coin" && !object.collected) {
      if (images.coin.complete) {
        ctx.drawImage(images.coin, x, object.y, object.width, object.height);
      }
    }

    if (object.type === "ramp" && images.ramp.complete) {
      ctx.drawImage(images.ramp, x, object.y, object.width, object.height);
    }

    if (object.type === "rail") {
      drawRail(object);
    }

    if (object.type === "block") {
      ctx.fillStyle = "#e86b4a";
      ctx.fillRect(x, object.y, object.width, object.height);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x + 8, object.y + 10, object.width - 16, 7);
      ctx.fillStyle = "#b84d3a";
      ctx.fillRect(x + 8, object.y + 27, object.width - 16, 5);
    }
  }
}


function drawPlayer() {
  const profile = characters[selectedCharacter];

  ctx.save();
  ctx.translate(player.x + 26, player.y + 67);
  ctx.rotate(player.grinding ? 0 : player.rotation * 0.2);
  ctx.fillStyle = profile.board;
  ctx.fillRect(-30, -4, 60, 7);
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(-20, 6, 5, 0, Math.PI * 2);
  ctx.arc(20, 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(player.x + 26, player.y + 38);
  ctx.rotate(player.grinding ? 0 : player.rotation);
  ctx.filter = profile.filter;
  if (images.skater.complete) {
    ctx.drawImage(images.skater, -26, -38, 52, 76);
  } else {
    drawFallbackSkater();
  }
  ctx.filter = "none";
  ctx.restore();
}


function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = "center";
  ctx.font = "900 15px Arial, sans-serif";
  for (const item of floatingTexts) {
    ctx.globalAlpha = Math.max(0, item.life);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x, item.y);
    ctx.globalAlpha = 1;
  }
}


function draw() {
  ctx.filter = "none";
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawObjects();
  drawPlayer();
  drawParticles();
}


function gameLoop(time) {
  if (!lastTime) lastTime = time;
  const delta = Math.min(40, time - lastTime);
  lastTime = time;

  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}


/* AUDIO */

function ensureAudio() {
  if (!soundEnabled) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;

  if (!audioContext) {
    try {
      audioContext = new AudioCtor();
    } catch (error) {
      audioContext = null;
      return;
    }
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}


function playTone(startFrequency, duration, type = "sine", volume = 0.04, endFrequency = startFrequency) {
  if (!soundEnabled) return;
  ensureAudio();
  if (!audioContext) return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(40, startFrequency), now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}


function sfxJump(fromRamp) {
  playTone(fromRamp ? 260 : 220, 0.16, "square", 0.035, fromRamp ? 560 : 420);
}


function sfxCoin() {
  playTone(660, 0.08, "triangle", 0.05, 900);
  setTimeout(() => playTone(900, 0.1, "triangle", 0.04, 1180), 45);
}


function sfxTrick(name) {
  playTone(name === "KICKFLIP" ? 390 : 520, 0.14, "sawtooth", 0.035, name === "KICKFLIP" ? 760 : 920);
}


function sfxLand(clean) {
  playTone(clean ? 130 : 100, 0.12, "sine", clean ? 0.04 : 0.025, clean ? 90 : 65);
}


function sfxGrind() {
  playTone(240, 0.14, "square", 0.025, 160);
}


function sfxGrindTick() {
  playTone(1200, 0.035, "square", 0.012, 860);
}


function sfxCrash() {
  playTone(90, 0.38, "sawtooth", 0.06, 42);
}


/* INPUT */

let startX = 0;
let startY = 0;
let pointerDownAt = 0;

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  startX = event.clientX;
  startY = event.clientY;
  pointerDownAt = performance.now();
  if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
}, { passive: false });


canvas.addEventListener("pointerup", event => {
  event.preventDefault();

  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  const duration = performance.now() - pointerDownAt;

  if (!gameStarted) return;
  if (gameOver) {
    startRun();
    return;
  }

  if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx)) {
    if (dy < 0) jump();
    return;
  }

  if (Math.abs(dx) > 45) {
    steer(dx > 0 ? 1 : -1);
    return;
  }

  if (duration < 650) {
    if (player.onGround) jump();
    else trick();
  }
}, { passive: false });


canvas.addEventListener("pointercancel", event => {
  if (canvas.releasePointerCapture) {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture may already have been released.
    }
  }
}, { passive: false });


window.addEventListener("keydown", event => {
  if (event.code === "Enter" && !gameStarted) {
    startRun();
    return;
  }

  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    if (!gameStarted) startRun();
    else jump();
  }

  if (event.code === "ArrowLeft") steer(-1);
  if (event.code === "ArrowRight") steer(1);
  if (event.code === "KeyT") trick();
  if (event.code === "KeyM") {
    soundEnabled = !soundEnabled;
    updateSoundToggle();
    if (soundEnabled) ensureAudio();
  }
});


characterOptions.forEach(option => {
  option.addEventListener("click", () => {
    selectedCharacter = option.dataset.character;
    characterOptions.forEach(item => item.classList.toggle("is-selected", item === option));
    if (soundEnabled) playTone(280, 0.08, "triangle", 0.025, 440);
  });
});


startButton.addEventListener("click", startRun);
playAgain.addEventListener("click", startRun);
restart.addEventListener("click", startRun);

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  updateSoundToggle();
  if (soundEnabled) {
    ensureAudio();
    playTone(440, 0.08, "triangle", 0.025, 660);
  }
});


resize();
resetGame();
showMenu();
updateSoundToggle();
requestAnimationFrame(gameLoop);
