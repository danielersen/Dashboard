const SHAPES = ["cube", "pyramid", "prism"];
const EDGE_COLOR = "#ffffff";
const VERTEX_COLOR = "#ffffff";

function pickRandomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

function getShapeGeometry(type) {
  if (type === "pyramid") {
    const s = 2;
    return {
      vertices: [
        [-s, -s, -s],
        [s, -s, -s],
        [s, -s, s],
        [-s, -s, s],
        [0, 2.2, 0],
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [0, 4],
        [1, 4],
        [2, 4],
        [3, 4],
      ],
    };
  }

  if (type === "prism") {
    const w = 1.5;
    const h = 1;
    const d = 2;
    return {
      vertices: [
        [-w, -h, -d / 2],
        [w, -h, -d / 2],
        [w, h, -d / 2],
        [-w, h, -d / 2],
        [-w, -h, d / 2],
        [w, -h, d / 2],
        [w, h, d / 2],
        [-w, h, d / 2],
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ],
    };
  }

  const s = 2;
  return {
    vertices: [
      [-s, -s, -s],
      [s, -s, -s],
      [s, s, -s],
      [-s, s, -s],
      [-s, -s, s],
      [s, -s, s],
      [s, s, s],
      [-s, s, s],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ],
  };
}

function rotatePoint([x, y, z], ax, ay, az) {
  let nx = x;
  let ny = y;
  let nz = z;

  const cosX = Math.cos(ax);
  const sinX = Math.sin(ax);
  const y1 = ny * cosX - nz * sinX;
  const z1 = ny * sinX + nz * cosX;
  ny = y1;
  nz = z1;

  const cosY = Math.cos(ay);
  const sinY = Math.sin(ay);
  const x2 = nx * cosY + nz * sinY;
  const z2 = -nx * sinY + nz * cosY;
  nx = x2;
  nz = z2;

  const cosZ = Math.cos(az);
  const sinZ = Math.sin(az);
  const x3 = nx * cosZ - ny * sinZ;
  const y3 = nx * sinZ + ny * cosZ;

  return [x3, y3, nz];
}

function projectPoint([x, y, z], width, height, scale) {
  const perspective = 2.8;
  const factor = scale / (perspective + z);
  return {
    x: width / 2 + x * factor,
    y: height / 2 - y * factor,
    z,
  };
}

export function createMesh3D(canvas) {
  const ctx = canvas.getContext("2d");
  let shapeType = pickRandomShape();
  let geometry = getShapeGeometry(shapeType);
  let angleX = 0.4;
  let angleY = 0.2;
  let angleZ = 0.1;
  let rafId = null;
  let decayStart = performance.now();
  let running = false;

  const INITIAL_SPEED = 0.095;
  const TARGET_SPEED = 0.006;
  const DECAY_MS = 2800;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function currentSpeed(now) {
    const t = Math.min((now - decayStart) / DECAY_MS, 1);
    return INITIAL_SPEED + (TARGET_SPEED - INITIAL_SPEED) * t;
  }

  function drawFrame(now) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const speed = currentSpeed(now);

    angleX += speed * 0.92;
    angleY += speed * 1.18;
    angleZ += speed * 0.74;

    ctx.clearRect(0, 0, width, height);

    const scale = Math.min(width, height) * 0.42;
    const rotated = geometry.vertices.map((vertex) =>
      rotatePoint(vertex, angleX, angleY, angleZ),
    );
    const projected = rotated.map((vertex) =>
      projectPoint(vertex, width, height, scale),
    );

    ctx.lineWidth = 1.6;
    ctx.strokeStyle = EDGE_COLOR;
    ctx.beginPath();
    for (const [a, b] of geometry.edges) {
      ctx.moveTo(projected[a].x, projected[a].y);
      ctx.lineTo(projected[b].x, projected[b].y);
    }
    ctx.stroke();

    for (const point of projected) {
      ctx.beginPath();
      ctx.fillStyle = VERTEX_COLOR;
      ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick(now) {
    if (!running) {
      return;
    }
    drawFrame(now);
    rafId = requestAnimationFrame(tick);
  }

  function resetShape() {
    shapeType = pickRandomShape();
    geometry = getShapeGeometry(shapeType);
    angleX = 0.35 + Math.random() * 0.5;
    angleY = 0.15 + Math.random() * 0.5;
    angleZ = 0.1 + Math.random() * 0.35;
    decayStart = performance.now();
  }

  function start() {
    if (running) {
      return;
    }
    running = true;
    resize();
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function refresh() {
    resetShape();
    if (running) {
      drawFrame(performance.now());
    }
  }

  const onResize = () => {
    resize();
    if (running) {
      drawFrame(performance.now());
    }
  };

  window.addEventListener("resize", onResize);

  return {
    start,
    stop,
    refresh,
    destroy() {
      stop();
      window.removeEventListener("resize", onResize);
    },
  };
}
