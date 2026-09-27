const WORLD_WIDTH = 1;
const WORLD_HEIGHT = 0.75;
const RADIO_RANGE = 0.29;
const PACKET_SPEED = 0.28;
const SPAWN_INTERVAL = 0.32;
const MAX_PACKETS = 70;
const ROOT_INDEX = 0;

const HEALTHY_MESSAGE =
  "The network is healthy. Every packet finds its way to the router.";
const PAUSED_MOTION_MESSAGE =
  "Animation is paused because your device prefers reduced motion. Press Play to start it.";

function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createNodes() {
  const random = createRandom(5610);
  const nodes = [{ x: 0.06, y: WORLD_HEIGHT / 2 }];
  const columns = 5;
  const rows = 4;

  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      nodes.push({
        x: 0.2 + column * 0.185 + (random() - 0.5) * 0.08,
        y: 0.08 + row * 0.197 + (random() - 0.5) * 0.08,
      });
    }
  }
  return nodes;
}

function findNeighbors(nodes) {
  return nodes.map((node, index) =>
    nodes
      .map((other, otherIndex) => otherIndex)
      .filter(
        (otherIndex) =>
          otherIndex !== index &&
          distance(node, nodes[otherIndex]) <= RADIO_RANGE,
      ),
  );
}

function computeRoutes(nodes, neighbors, attackerIndex) {
  const rank = nodes.map(() => Infinity);
  const queue = [ROOT_INDEX];
  rank[ROOT_INDEX] = 0;

  if (attackerIndex !== null) {
    rank[attackerIndex] = 0;
    queue.push(attackerIndex);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of neighbors[current]) {
      if (rank[next] === Infinity) {
        rank[next] = rank[current] + 1;
        queue.push(next);
      }
    }
  }

  const parent = nodes.map((node, index) => {
    if (index === ROOT_INDEX || index === attackerIndex) {
      return null;
    }
    const candidates = neighbors[index].filter(
      (next) => rank[next] === rank[index] - 1,
    );
    candidates.sort(
      (a, b) => distance(node, nodes[a]) - distance(node, nodes[b]),
    );
    return candidates.length > 0 ? candidates[0] : null;
  });

  return { rank, parent };
}

function readColors(element) {
  const styles = getComputedStyle(element);
  const read = (name) => styles.getPropertyValue(name).trim();
  return {
    ink: read("--color-ink"),
    muted: read("--color-muted"),
    line: read("--color-line"),
    healthy: read("--color-healthy"),
    packet: read("--color-packet"),
    danger: read("--color-danger"),
    surface: read("--color-surface"),
  };
}

export function initMeshNetwork(root) {
  const canvas = root.querySelector(".mesh__canvas");
  const stage = root.querySelector(".mesh__stage");
  const attackButton = root.querySelector(".mesh__attack");
  const resetButton = root.querySelector(".mesh__reset");
  const pauseButton = root.querySelector(".mesh__pause");
  const status = root.querySelector(".mesh__status");
  const deliveredOutput = root.querySelector(".mesh__delivered");
  const droppedOutput = root.querySelector(".mesh__dropped");
  const rateOutput = root.querySelector(".mesh__rate");

  const context = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");

  const nodes = createNodes();
  const neighbors = findNeighbors(nodes);

  const state = {
    attacker: null,
    routes: computeRoutes(nodes, neighbors, null),
    packets: [],
    delivered: 0,
    dropped: 0,
    spawnTimer: 0,
    running: !reduceMotion.matches,
    lastTime: 0,
    pulse: 0,
    scale: 1,
    colors: readColors(root),
  };

  function setStatus(message, isAttack) {
    status.textContent = message;
    status.classList.toggle("mesh__status--attack", isAttack);
  }

  function updateStats() {
    const total = state.delivered + state.dropped;
    deliveredOutput.textContent = String(state.delivered);
    droppedOutput.textContent = String(state.dropped);
    rateOutput.textContent =
      total === 0 ? "100%" : `${Math.round((state.delivered / total) * 100)}%`;
  }

  function countCapturedNodes() {
    let captured = 0;
    nodes.forEach((node, index) => {
      if (index !== ROOT_INDEX && index !== state.attacker) {
        if (routeEndsAtAttacker(index)) {
          captured += 1;
        }
      }
    });
    return captured;
  }

  function routeEndsAtAttacker(startIndex) {
    let current = startIndex;
    let guard = 0;
    while (current !== null && guard < nodes.length) {
      if (current === state.attacker) {
        return true;
      }
      current = state.routes.parent[current];
      guard += 1;
    }
    return false;
  }

  function setAttacker(index) {
    state.attacker = index;
    state.routes = computeRoutes(nodes, neighbors, index);
    const captured = countCapturedNodes();
    const sensorCount = nodes.length - 2;
    setStatus(
      `Sensor ${index} is now a sinkhole. ${captured} of ${sensorCount} other sensors route through it, and their data never reaches the router.`,
      true,
    );
    attackButton.textContent = "Move the attacker";
    draw();
  }

  function resetNetwork() {
    state.attacker = null;
    state.routes = computeRoutes(nodes, neighbors, null);
    state.packets = [];
    state.delivered = 0;
    state.dropped = 0;
    attackButton.textContent = "Launch sinkhole attack";
    setStatus(HEALTHY_MESSAGE, false);
    updateStats();
    draw();
  }

  function pickAttackTarget() {
    const center = { x: 0.52, y: WORLD_HEIGHT / 2 };
    const options = nodes
      .map((node, index) => index)
      .filter((index) => index !== ROOT_INDEX && index !== state.attacker);
    options.sort(
      (a, b) => distance(nodes[a], center) - distance(nodes[b], center),
    );
    const pool = options.slice(0, 4);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function spawnPacket() {
    if (state.packets.length >= MAX_PACKETS) {
      return;
    }
    const sources = nodes
      .map((node, index) => index)
      .filter((index) => index !== ROOT_INDEX && index !== state.attacker);
    const from = sources[Math.floor(Math.random() * sources.length)];
    const to = state.routes.parent[from];
    if (to !== null) {
      state.packets.push({ from, to, progress: 0 });
    }
  }

  function advancePackets(seconds) {
    const survivors = [];
    for (const packet of state.packets) {
      const length = distance(nodes[packet.from], nodes[packet.to]);
      packet.progress += (PACKET_SPEED * seconds) / length;

      if (packet.progress < 1) {
        survivors.push(packet);
      } else if (packet.to === ROOT_INDEX) {
        state.delivered += 1;
      } else if (packet.to === state.attacker) {
        state.dropped += 1;
      } else {
        const next = state.routes.parent[packet.to];
        if (next !== null) {
          survivors.push({ from: packet.to, to: next, progress: 0 });
        }
      }
    }
    state.packets = survivors;
  }

  function toPixels(point) {
    return { x: point.x * state.scale, y: point.y * state.scale };
  }

  function drawLinks() {
    const { colors } = state;
    context.lineWidth = 1;
    context.strokeStyle = colors.line;
    context.setLineDash([3, 5]);
    neighbors.forEach((list, index) => {
      list.forEach((other) => {
        if (other > index) {
          const a = toPixels(nodes[index]);
          const b = toPixels(nodes[other]);
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      });
    });
    context.setLineDash([]);

    context.lineWidth = 2;
    state.routes.parent.forEach((parentIndex, index) => {
      if (parentIndex === null) {
        return;
      }
      const a = toPixels(nodes[index]);
      const b = toPixels(nodes[parentIndex]);
      context.strokeStyle = routeEndsAtAttacker(index)
        ? colors.danger
        : colors.healthy;
      context.globalAlpha = 0.55;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    });
    context.globalAlpha = 1;
  }

  function drawNodes() {
    const { colors } = state;
    const labelFont = `600 12px ${getComputedStyle(root).getPropertyValue("--font-display")}`;

    nodes.forEach((node, index) => {
      const point = toPixels(node);
      if (index === ROOT_INDEX) {
        context.fillStyle = colors.ink;
        context.fillRect(point.x - 10, point.y - 10, 20, 20);
        context.font = labelFont;
        context.fillText("Router", point.x - 18, point.y + 26);
        return;
      }

      if (index === state.attacker) {
        const ring = 12 + Math.sin(state.pulse * 4) * 3;
        context.strokeStyle = colors.danger;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(point.x, point.y, ring, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = colors.danger;
        context.beginPath();
        context.arc(point.x, point.y, 8, 0, Math.PI * 2);
        context.fill();
        context.font = labelFont;
        context.fillText("Sinkhole", point.x - 24, point.y - 18);
        return;
      }

      const captured = state.attacker !== null && routeEndsAtAttacker(index);
      context.fillStyle = colors.surface;
      context.strokeStyle = captured ? colors.danger : colors.ink;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(point.x, point.y, 6, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });
  }

  function drawPackets() {
    context.fillStyle = state.colors.packet;
    for (const packet of state.packets) {
      const a = toPixels(nodes[packet.from]);
      const b = toPixels(nodes[packet.to]);
      const x = a.x + (b.x - a.x) * packet.progress;
      const y = a.y + (b.y - a.y) * packet.progress;
      context.beginPath();
      context.arc(x, y, 3.5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function draw() {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    context.clearRect(0, 0, width, height);
    drawLinks();
    drawNodes();
    drawPackets();
  }

  function tick(time) {
    const seconds = Math.min((time - state.lastTime) / 1000, 0.05);
    state.lastTime = time;

    if (state.running) {
      state.pulse += seconds;
      state.spawnTimer += seconds;
      if (state.spawnTimer >= SPAWN_INTERVAL) {
        state.spawnTimer = 0;
        spawnPacket();
      }
      advancePackets(seconds);
      updateStats();
      draw();
    }
    window.requestAnimationFrame(tick);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    draw();
  }

  function nodeAtPointer(event) {
    const bounds = canvas.getBoundingClientRect();
    const pointer = {
      x: (event.clientX - bounds.left) / state.scale,
      y: (event.clientY - bounds.top) / state.scale,
    };
    let closest = null;
    let closestDistance = 0.05;
    nodes.forEach((node, index) => {
      const gap = distance(node, pointer);
      if (gap < closestDistance) {
        closest = index;
        closestDistance = gap;
      }
    });
    return closest;
  }

  function updatePauseButton() {
    pauseButton.textContent = state.running ? "Pause" : "Play";
    pauseButton.setAttribute("aria-pressed", String(!state.running));
  }

  canvas.addEventListener("click", (event) => {
    const index = nodeAtPointer(event);
    if (index === ROOT_INDEX) {
      setStatus(
        "That square is the border router. Choose one of the round sensors to attack.",
        state.attacker !== null,
      );
    } else if (index !== null) {
      setAttacker(index);
    }
  });

  attackButton.addEventListener("click", () => setAttacker(pickAttackTarget()));
  resetButton.addEventListener("click", resetNetwork);
  pauseButton.addEventListener("click", () => {
    state.running = !state.running;
    updatePauseButton();
  });

  darkScheme.addEventListener("change", () => {
    state.colors = readColors(root);
    draw();
  });

  new ResizeObserver(resize).observe(stage);

  if (!state.running) {
    setStatus(PAUSED_MOTION_MESSAGE, false);
  }
  updatePauseButton();
  resize();
  window.requestAnimationFrame((time) => {
    state.lastTime = time;
    tick(time);
  });
}
