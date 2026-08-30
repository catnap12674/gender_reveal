(() => {
  const stage = document.getElementById("stage");
  const stageBg = document.getElementById("stageBg");
  const babyIllustration = document.getElementById("babyIllustration");
  const resultText = document.getElementById("resultText");
  const canvas = document.getElementById("scratchCanvas");
  const ctx = canvas.getContext("2d");
  const sparkleLayer = document.getElementById("sparkleLayer");
  const progressPill = document.getElementById("progressPill");

  // 完了判定に使う小さいオフスクリーンキャンバス（getImageDataを軽量化するため）
  const sampleCanvas = document.createElement("canvas");
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

  const COMPLETE_THRESHOLD = 0.55; // 55%以上こすったら自動で全部見せる
  const BRUSH_RADIUS = 42;

  let gender = null; // "boy" | "girl" | null
  let isScratching = false;
  let completed = false;
  let lastPoint = null;
  let rafPending = false;
  let lastPercentCheck = 0;

  init();

  async function init() {
    await loadGender();
    setupCanvasSize();
    drawCover();
    bindEvents();
    window.addEventListener("resize", () => {
      if (completed) return;
      setupCanvasSize();
      drawCover();
    });
  }

  async function loadGender() {
    try {
      const res = await fetch("/api/gender");
      const data = await res.json();
      gender = data.gender;
    } catch (err) {
      gender = null;
    }

    if (gender === "boy" || gender === "girl") {
      stageBg.className = "stage-bg " + gender;
      babyIllustration.innerHTML =
        '<div class="baby-illustration">' + window.babySvgMarkup(gender) + "</div>";
    } else {
      stageBg.className = "stage-bg pending";
      babyIllustration.innerHTML =
        '<p style="font-weight:700;color:#857c99;text-align:center;">まだ性別が<br />登録されていません 🙏</p>';
      progressPill.textContent = "登録をお待ちください";
    }
  }

  function setupCanvasSize() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawCover() {
    const w = canvas.width / (window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio || 1);
    const rect = stage.getBoundingClientRect();
    ctx.globalCompositeOperation = "source-over";

    const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grad.addColorStop(0, "#d9d9e3");
    grad.addColorStop(0.5, "#c3c3d1");
    grad.addColorStop(1, "#dcdce6");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // うっすら模様
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    for (let i = -rect.height; i < rect.width; i += 26) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + rect.height, rect.height);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 22px 'M PLUS Rounded 1c', sans-serif";
    ctx.fillText("👆 ここを指でこすってね", rect.width / 2, rect.height / 2 - 14);
    ctx.font = "700 15px 'M PLUS Rounded 1c', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("It's a...?", rect.width / 2, rect.height / 2 + 18);
  }

  function getPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const touch = evt.touches && evt.touches[0];
    const clientX = touch ? touch.clientX : evt.clientX;
    const clientY = touch ? touch.clientY : evt.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function scratchAt(x, y) {
    ctx.globalCompositeOperation = "destination-out";
    const grad = ctx.createRadialGradient(x, y, 0, x, y, BRUSH_RADIUS);
    grad.addColorStop(0, "rgba(0,0,0,0.38)");
    grad.addColorStop(0.7, "rgba(0,0,0,0.22)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  function scratchLine(from, to) {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.floor(dist / (BRUSH_RADIUS / 2)));
    for (let i = 0; i <= steps; i++) {
      const x = from.x + ((to.x - from.x) * i) / steps;
      const y = from.y + ((to.y - from.y) * i) / steps;
      scratchAt(x, y);
    }
  }

  function bindEvents() {
    const start = (evt) => {
      if (completed || !gender) return;
      isScratching = true;
      lastPoint = getPoint(evt);
      scratchAt(lastPoint.x, lastPoint.y);
      scheduleProgressCheck();
      evt.preventDefault();
    };
    const move = (evt) => {
      if (!isScratching || completed) return;
      const point = getPoint(evt);
      scratchLine(lastPoint, point);
      lastPoint = point;
      scheduleProgressCheck();
      evt.preventDefault();
    };
    const end = () => {
      isScratching = false;
      lastPoint = null;
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);

    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);
    canvas.addEventListener("touchcancel", end);
  }

  function scheduleProgressCheck() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      const now = performance.now();
      if (now - lastPercentCheck < 90) return; // 軽い間引き
      lastPercentCheck = now;
      checkProgress();
    });
  }

  function checkProgress() {
    const rect = stage.getBoundingClientRect();
    const w = 46;
    const h = Math.max(1, Math.round((w * rect.height) / rect.width));
    sampleCanvas.width = w;
    sampleCanvas.height = h;
    sampleCtx.clearRect(0, 0, w, h);
    sampleCtx.drawImage(canvas, 0, 0, w, h);

    let data;
    try {
      data = sampleCtx.getImageData(0, 0, w, h).data;
    } catch (err) {
      return; // クロスオリジン等で読めない環境向けフォールバック
    }

    let clearCount = 0;
    const total = w * h;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 40) clearCount++;
    }
    const percent = clearCount / total;
    const shown = Math.min(100, Math.round(percent * 100));
    progressPill.textContent = "こすって削ってね " + shown + "%";

    if (percent >= COMPLETE_THRESHOLD) {
      completeReveal();
    }
  }

  function completeReveal() {
    if (completed) return;
    completed = true;

    canvas.style.transition = "opacity 0.9s ease";
    canvas.style.opacity = "0";
    progressPill.textContent = "It's a " + (gender === "boy" ? "boy" : "girl") + "! 🎉";

    setTimeout(() => {
      canvas.style.display = "none";
      resultText.textContent = gender === "boy" ? "男の子です！👦💙" : "女の子です！👧💗";
      resultText.classList.remove("hidden");
      launchSparkles();
    }, 500);
  }

  // ===== 完了後のキラキラアニメーション =====
  function launchSparkles() {
    const rect = stage.getBoundingClientRect();
    const sparkleCanvas = document.createElement("canvas");
    sparkleCanvas.width = rect.width;
    sparkleCanvas.height = rect.height;
    sparkleCanvas.style.width = "100%";
    sparkleCanvas.style.height = "100%";
    sparkleLayer.appendChild(sparkleCanvas);
    const sctx = sparkleCanvas.getContext("2d");

    const colors =
      gender === "boy"
        ? ["#ffffff", "#cfe8ff", "#9fd0ff", "#ffe28a"]
        : ["#ffffff", "#ffd6e8", "#ff9fc7", "#ffe28a"];

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * sparkleCanvas.width,
      y: sparkleCanvas.height + Math.random() * 40,
      size: 3 + Math.random() * 5,
      speed: 1.2 + Math.random() * 2.4,
      drift: (Math.random() - 0.5) * 1.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.2,
      life: 0,
      maxLife: 140 + Math.random() * 80,
    }));

    let frame = 0;
    const maxFrames = 260;

    function drawStar(x, y, size, rotation, color) {
      sctx.save();
      sctx.translate(x, y);
      sctx.rotate(rotation);
      sctx.beginPath();
      for (let i = 0; i < 5; i++) {
        sctx.lineTo(Math.cos((i * 4 * Math.PI) / 5) * size, Math.sin((i * 4 * Math.PI) / 5) * size);
      }
      sctx.closePath();
      sctx.fillStyle = color;
      sctx.fill();
      sctx.restore();
    }

    function tick() {
      frame++;
      sctx.clearRect(0, 0, sparkleCanvas.width, sparkleCanvas.height);

      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += p.drift;
        p.spin += p.spinSpeed;
        p.life++;
        const fade = p.life > p.maxLife - 30 ? Math.max(0, (p.maxLife - p.life) / 30) : 1;
        sctx.globalAlpha = fade;
        drawStar(p.x, p.y, p.size, p.spin, p.color);
      });
      sctx.globalAlpha = 1;

      if (frame < maxFrames) {
        requestAnimationFrame(tick);
      } else {
        sparkleCanvas.style.transition = "opacity 0.6s ease";
        sparkleCanvas.style.opacity = "0";
        setTimeout(() => sparkleCanvas.remove(), 700);
      }
    }
    requestAnimationFrame(tick);
  }
})();
