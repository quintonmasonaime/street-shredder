const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const comboText = document.getElementById("combo");
const instructions = document.getElementById("instructions");
const restart = document.getElementById("restart");

let W;
let H;
let ground;

let worldX = 0;
let speed = 5;

let score = 0;
let combo = 0;

let gameOver = false;

let lastTime = 0;

let particles = [];

const player = {
  x: 100,
  y: 0,

  width: 52,
  height: 76,

  vx: 0,
  vy: 0,

  rotation: 0,

  onGround: true,
  airTime: 0
};

const images = {};

images.skater = new Image();
images.skater.src = "sprites/skater.svg";

images.coin = new Image();
images.coin.src = "sprites/coin.svg";

images.ramp = new Image();
images.ramp.src = "sprites/ramp.svg";


let objects = [];


function resize() {

  W = window.innerWidth;
  H = window.innerHeight;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ground = H * 0.78;

  if (player.onGround) {
    player.y = ground - player.height;
  }
}


window.addEventListener("resize", resize);


function resetGame() {

  resize();

  worldX = 0;
  speed = 5;

  score = 0;
  combo = 0;

  gameOver = false;

  player.x = W * 0.22;
  player.y = ground - player.height;

  player.vx = 0;
  player.vy = 0;

  player.rotation = 0;

  player.onGround = true;
  player.airTime = 0;

  particles = [];

  objects = [

    {
      type: "coin",
      x: 450,
      y: ground - 150,
      width: 34,
      height: 34
    },

    {
      type: "ramp",
      x: 750,
      y: ground - 72,
      width: 120,
      height: 72
    },

    {
      type: "coin",
      x: 900,
      y: ground - 180,
      width: 34,
      height: 34
    },

    {
      type: "block",
      x: 1200,
      y: ground - 55,
      width: 50,
      height: 55
    },

    {
      type: "coin",
      x: 1350,
      y: ground - 130,
      width: 34,
      height: 34
    },

    {
      type: "ramp",
      x: 1600,
      y: ground - 72,
      width: 120,
      height: 72
    },

    {
      type: "coin",
      x: 1780,
      y: ground - 185,
      width: 34,
      height: 34
    }

  ];

  scoreText.textContent = "0";
  comboText.textContent = "0";

  instructions.style.display = "block";

  instructions.innerHTML =
    "SWIPE UP TO JUMP<br>" +
    "<small>Tap in the air to do a trick!</small>";
}


function jump() {

  if (gameOver) {

    resetGame();

    return;
  }

  if (player.onGround) {

    player.vy = -15;

    player.onGround = false;

    player.airTime = 0;

    createParticles(
      player.x + player.width / 2,
      player.y + player.height,
      8
    );
  }
}


function trick() {

  if (gameOver) return;

  if (!player.onGround) {

    player.rotation += Math.PI * 2;

    combo++;

    score += 100;

    comboText.textContent = combo;

    createParticles(
      player.x + player.width / 2,
      player.y + player.height / 2,
      15
    );
  }
}


function steer(direction) {

  if (gameOver) return;

  player.vx += direction * 1.5;
}


function touching(a, b) {

  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}


/* TOUCH CONTROLS */

let startX = 0;
let startY = 0;

canvas.addEventListener(
  "touchstart",
  function(event) {

    event.preventDefault();

    const touch = event.changedTouches[0];

    startX = touch.clientX;
    startY = touch.clientY;

  },
  { passive: false }
);


canvas.addEventListener(
  "touchend",
  function(event) {

    event.preventDefault();

    const touch = event.changedTouches[0];

    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (gameOver) {

      resetGame();

      return;
    }


    /* SWIPE UP */

    if (
      Math.abs(dy) > 45 &&
      Math.abs(dy) > Math.abs(dx)
    ) {

      if (dy < 0) {

        jump();

      }

      return;
    }


    /* STEER */

    if (Math.abs(dx) > 45) {

      if (dx > 0) {

        steer(1);

      } else {

        steer(-1);

      }

      return;
    }


    /* TAP */

    if (!player.onGround) {

      trick();

    } else {

      jump();

    }

  },
  { passive: false }
);


/* KEYBOARD CONTROLS */

window.addEventListener("keydown", function(event) {

  if (
    event.code === "Space" ||
    event.code === "ArrowUp"
  ) {

    jump();

  }

  if (event.code === "ArrowLeft") {

    steer(-1);

  }

  if (event.code === "ArrowRight") {

    steer(1);

  }

  if (event.code === "KeyT") {

    trick();

  }

});


restart.addEventListener("click", resetGame);


/* PARTICLES */

function createParticles(x, y, amount) {

  for (let i = 0; i < amount; i++) {

    particles.push({

      x: x,
      y: y,

      vx: (Math.random() - 0.5) * 6,

      vy: -Math.random() * 5,

      life: 1
    });

  }

}


function updateParticles(delta) {

  for (const particle of particles) {

    particle.x += particle.vx;

    particle.y += particle.vy;

    particle.vy += 0.25;

    particle.life -= delta / 500;

  }

  particles =
    particles.filter(particle => particle.life > 0);
}


/* GAME UPDATE */

function update(delta) {

  if (gameOver) return;


  speed = Math.min(
    11,
    speed + delta * 0.00015
  );


  worldX += speed;


  /* PLAYER */

  player.vy += 0.7;

  player.vx *= 0.94;

  player.x += player.vx;

  player.y += player.vy;


  if (player.x < 20) {

    player.x = 20;

  }


  if (player.x > W * 0.58) {

    player.x = W * 0.58;

  }


  /* LANDING */

  if (
    player.y + player.height >= ground
  ) {

    if (
      !player.onGround &&
      player.airTime > 0.55
    ) {

      score += Math.floor(
        player.airTime * 100
      );

      combo = 0;

      comboText.textContent = "0";
    }


    player.y =
      ground - player.height;

    player.vy = 0;

    player.onGround = true;

    player.rotation *= 0.35;

  } else {

    player.onGround = false;

    player.airTime += delta / 1000;
  }


  /* OBJECTS */

  for (const object of objects) {

    object.screenX =
      object.x - worldX + W * 0.25;


    if (
      object.type === "coin" &&
      !object.collected
    ) {

      const coinBox = {

        x: object.screenX,

        y: object.y,

        width: object.width,

        height: object.height

      };


      if (touching(player, coinBox)) {

        object.collected = true;

        score += 25;

        createParticles(
          object.screenX,
          object.y,
          10
        );
      }
    }


    /* OBSTACLE */

    if (object.type === "block") {

      const blockBox = {

        x: object.screenX,

        y: object.y,

        width: object.width,

        height: object.height

      };


      if (touching(player, blockBox)) {

        gameOver = true;

        instructions.style.display = "block";

        instructions.innerHTML =
          "BAIL! 💥<br>" +
          "<small>Tap to restart</small>";

        createParticles(
          player.x + 25,
          player.y + 35,
          25
        );
      }
    }


    /* RAMP */

    if (
      object.type === "ramp" &&
      !object.used
    ) {

      const rampBox = {

        x: object.screenX,

        y: object.y,

        width: object.width,

        height: object.height

      };


      if (touching(player, rampBox)) {

        object.used = true;

        if (player.onGround) {

          jump();

        }
      }
    }
  }


  /* SPAWN MORE */

  if (
    objects.length &&
    objects[0].x - worldX < -300
  ) {

    const furthest =
      Math.max(...objects.map(o => o.x));

    objects.shift();


    if (Math.random() < 0.5) {

      objects.push({

        type: "coin",

        x: furthest + 350,

        y:
          ground -
          120 -
          Math.random() * 100,

        width: 34,

        height: 34
      });

    } else {

      objects.push({

        type:
          Math.random() < 0.5
            ? "block"
            : "ramp",

        x: furthest + 350,

        y:
          ground -
          (
            Math.random() < 0.5
              ? 55
              : 72
          ),

        width:
          Math.random() < 0.5
            ? 50
            : 120,

        height:
          Math.random() < 0.5
            ? 55
            : 72
      });
    }
  }


  updateParticles(delta);

  scoreText.textContent =
    Math.floor(score);


  if (worldX > 300) {

    instructions.style.display = "none";

  }
}


/* DRAW */

function draw() {

  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  /* SKY */

  const sky =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );

  sky.addColorStop(
    0,
    "#68c7f2"
  );

  sky.addColorStop(
    1,
    "#d9f5ff"
  );

  ctx.fillStyle = sky;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  /* SUN */

  ctx.fillStyle = "#ffe27a";

  ctx.beginPath();

  ctx.arc(
    W * 0.82,
    H * 0.18,
    45,
    0,
    Math.PI * 2
  );

  ctx.fill();


  /* CITY */

  ctx.fillStyle = "#7d9aa8";

  for (
    let i = -2;
    i < 20;
    i++
  ) {

    const x =
      i * 100 -
      (worldX * 0.18 % 100);

    const height =
      60 +
      ((i * 37) % 120);

    ctx.fillRect(
      x,
      ground - height,
      75,
      height
    );
  }


  /* ROAD */

  ctx.fillStyle = "#343943";

  ctx.fillRect(
    0,
    ground,
    W,
    H - ground
  );


  /* KERB */

  ctx.fillStyle = "#777d87";

  ctx.fillRect(
    0,
    ground,
    W,
    8
  );


  /* ROAD MARKINGS */

  for (
    let x = -(worldX % 90);
    x < W;
    x += 90
  ) {

    ctx.fillStyle = "#ddd";

    ctx.fillRect(
      x,
      ground + 45,
      48,
      6
    );
  }


  /* OBJECTS */

  for (const object of objects) {

    const x = object.screenX;

    if (
      x < -150 ||
      x > W + 150
    ) continue;


    if (
      object.type === "coin" &&
      !object.collected
    ) {

      ctx.drawImage(
        images.coin,
        x,
        object.y,
        object.width,
        object.height
      );

    }


    if (object.type === "ramp") {

      ctx.drawImage(
        images.ramp,
        x,
        object.y,
        object.width,
        object.height
      );

    }


    if (object.type === "block") {

      ctx.fillStyle = "#e86b4a";

      ctx.fillRect(
        x,
        object.y,
        object.width,
        object.height
      );

      ctx.fillStyle = "#ffd166";

      ctx.fillRect(
        x + 8,
        object.y + 10,
        object.width - 16,
        7
      );
    }
  }


  /* SKATEBOARD */

  ctx.save();

  ctx.translate(
    player.x + 26,
    player.y + 67
  );

  ctx.fillStyle = "#191b21";

  ctx.fillRect(
    -30,
    -4,
    60,
    7
  );

  ctx.fillStyle = "#111";

  ctx.beginPath();

  ctx.arc(
    -20,
    6,
    5,
    0,
    Math.PI * 2
  );

  ctx.arc(
    20,
    6,
    5,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();


  /* SKATER */

  ctx.save();

  ctx.translate(
    player.x + 26,
    player.y + 38
  );

  ctx.rotate(
    player.rotation
  );

  ctx.drawImage(
    images.skater,
    -26,
    -38,
    52,
    76
  );

  ctx.restore();


  /* PARTICLES */

  for (const particle of particles) {

    ctx.globalAlpha =
      Math.max(0, particle.life);

    ctx.fillStyle = "white";

    ctx.fillRect(
      particle.x,
      particle.y,
      5,
      5
    );

    ctx.globalAlpha = 1;
  }
}


/* GAME LOOP */

function gameLoop(time) {

  const delta =
    Math.min(
      40,
      time - lastTime
    );

  lastTime = time;

  update(delta);

  draw();

  requestAnimationFrame(gameLoop);
}


resetGame();

requestAnimationFrame(gameLoop);
