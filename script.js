      // ══════════════════════════════════════════════════════════════
      // CORE DATA STRUCTURES
      // ══════════════════════════════════════════════════════════════

      class RingBuffer {
        constructor(cap) {
          this.buf = new Array(cap).fill(null);
          this.head = 0;
          this.tail = 0;
          this.size = 0;
          this.cap = cap;
        }
        enqueue(val) {
          let evicted = null;
          if (this.size === this.cap) {
            evicted = this.buf[this.head];
            this.head = (this.head + 1) % this.cap;
            this.size--;
          }
          this.buf[this.tail] = val;
          this.tail = (this.tail + 1) % this.cap;
          this.size++;
          return evicted;
        }
        toArray() {
          const arr = [];
          for (let i = 0; i < this.size; i++)
            arr.push(this.buf[(this.head + i) % this.cap]);
          return arr;
        }
        reset() {
          this.buf = new Array(this.cap).fill(null);
          this.head = this.tail = this.size = 0;
        }
        resize(cap) {
          this.cap = cap;
          this.reset();
        }
      }

      class HashTable {
        constructor(size) {
          this.size = size;
          this.table = new Array(size).fill(null).map(() => []);
          this.count = 0;
          this.collisions = 0;
        }
        _hash(key) {
          let h = 5381;
          for (let i = 0; i < key.length; i++)
            h = (h * 31 + key.charCodeAt(i)) >>> 0;
          return h % this.size;
        }
        get(key) {
          const idx = this._hash(key);
          const chain = this.table[idx];
          for (const node of chain) if (node.key === key) return node.val;
          return 0;
        }
        set(key, val) {
          const idx = this._hash(key);
          const chain = this.table[idx];
          for (const node of chain) {
            if (node.key === key) {
              node.val = val;
              return idx;
            }
          }
          if (chain.length > 0) this.collisions++;
          chain.push({ key, val });
          this.count++;
          return idx;
        }
        increment(key) {
          const idx = this._hash(key);
          const chain = this.table[idx];
          for (const node of chain) {
            if (node.key === key) {
              node.val++;
              return { idx, isNew: false };
            }
          }
          if (chain.length > 0) this.collisions++;
          chain.push({ key, val: 1 });
          this.count++;
          return { idx, isNew: true };
        }
        decrement(key) {
          const idx = this._hash(key);
          const chain = this.table[idx];
          for (let i = 0; i < chain.length; i++) {
            if (chain[i].key === key) {
              chain[i].val--;
              if (chain[i].val <= 0) {
                chain.splice(i, 1);
                this.count--;
              }
              return idx;
            }
          }
          return idx;
        }
        entries() {
          const out = [];
          for (const chain of this.table)
            for (const node of chain) out.push([node.key, node.val]);
          return out;
        }
        reset(size) {
          this.size = size;
          this.table = new Array(size).fill(null).map(() => []);
          this.count = 0;
          this.collisions = 0;
        }
        loadFactor() {
          return this.count / this.size;
        }
        bucketCount() {
          return this.table.filter((c) => c.length > 0).length;
        }
      }

      class MinHeap {
        constructor(k) {
          this.k = k;
          this.heap = [];
        }
        _cmp(a, b) {
          return a[0] < b[0] || (a[0] === b[0] && a[1] > b[1]);
        }
        _siftUp(i) {
          while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this._cmp(this.heap[i], this.heap[p])) {
              [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
              i = p;
            } else break;
          }
        }
        _siftDown(i) {
          while (true) {
            let min = i,
              l = 2 * i + 1,
              r = 2 * i + 2;
            if (l < this.heap.length && this._cmp(this.heap[l], this.heap[min]))
              min = l;
            if (r < this.heap.length && this._cmp(this.heap[r], this.heap[min]))
              min = r;
            if (min === i) break;
            [this.heap[i], this.heap[min]] = [this.heap[min], this.heap[i]];
            i = min;
          }
        }
        insert(cnt, ip) {
          if (this.heap.length < this.k) {
            this.heap.push([cnt, ip]);
            this._siftUp(this.heap.length - 1);
            return "push";
          }
          if (cnt > this.heap[0][0]) {
            this.heap[0] = [cnt, ip];
            this._siftDown(0);
            return "replace";
          }
          return "skip";
        }
        peek() {
          return this.heap[0] || null;
        }
        sorted() {
          return [...this.heap].sort((a, b) => b[0] - a[0]);
        }
      }

      // ══════════════════════════════════════════════════════════════
      // SIMULATION STATE
      // ══════════════════════════════════════════════════════════════
      const HT_SIZE = 20;
      let ring = new RingBuffer(16);
      let ht = new HashTable(HT_SIZE);
      let totalPackets = 0;
      let autoInterval = null;
      let simSpeed = 350;
      let ipPool = [];
      let lastHtIdx = -1;
      let lastEvictIdx = -1;
      let complexChartObj = null;
      let tradeoffChartObj = null;
      let spaceChartObj = null;

      function getBufCap() {
        return parseInt(document.getElementById("sBuf").value);
      }
      function getK() {
        return parseInt(document.getElementById("sK").value);
      }
      function getPool() {
        return parseInt(document.getElementById("sPool").value);
      }
      function getSkew() {
        return parseFloat(document.getElementById("sSkew").value) / 10;
      }

      function genIPPool(n) {
        const bases = [
          "192.168.1",
          "10.0.0",
          "172.16.0",
          "10.10.1",
          "192.168.2",
          "10.20.0",
          "172.16.1",
          "10.30.0",
          "192.168.3",
          "10.40.0",
          "172.16.2",
          "10.50.0",
          "192.168.4",
          "10.60.0",
          "172.16.3",
          "10.70.0",
        ];
        return bases.slice(0, n).map((b, i) => b + "." + (i * 13 + 1));
      }

      function zipfPick(pool, s) {
        const w = pool.map((_, i) => 1 / Math.pow(i + 1, s));
        const tot = w.reduce((a, b) => a + b, 0);
        let r = Math.random() * tot;
        for (let i = 0; i < pool.length; i++) {
          r -= w[i];
          if (r <= 0) return pool[i];
        }
        return pool[0];
      }

      function resetSim() {
        const cap = getBufCap();
        ipPool = genIPPool(getPool());
        ring = new RingBuffer(cap);
        ht = new HashTable(HT_SIZE);
        totalPackets = 0;
        lastHtIdx = lastEvictIdx = -1;
        if (autoInterval) {
          clearInterval(autoInterval);
          autoInterval = null;
          document.getElementById("autoBtn").textContent = "⏵ Auto Play";
        }
        clearLog();
        renderAll();
        addLog(
          "RESET",
          `Buffer B=${cap}, K=${getK()}, Pool=${ipPool.length}`,
          "info",
        );
        resetAlgoSteps();
      }

      function resetAlgoSteps() {
        for (let i = 0; i < 5; i++) {
          const el = document.getElementById("step" + i);
          el.classList.remove("active", "done");
        }
      }

      async function processOne() {
        const ip = zipfPick(ipPool, getSkew());
        const cap = getBufCap();
        if (ring.cap !== cap) {
          ring.resize(cap);
          ht.reset(HT_SIZE);
        }

        // Show packet animation
        showPacketAnim(ip);

        // Step highlight
        await highlightStep(0, `Received: ${ip}`);
        await sleep(80);

        const evicted = ring.enqueue(ip);
        await highlightStep(
          1,
          `Enqueued to ring buf (size=${ring.size}/${cap})`,
        );
        await sleep(80);

        const { idx, isNew } = ht.increment(ip);
        lastHtIdx = idx;
        await highlightStep(2, `hash("${ip}") = ${idx}, count=${ht.get(ip)}`);
        await sleep(80);

        let evictMsg = "—";
        if (evicted) {
          const evIdx = ht.decrement(evicted);
          lastEvictIdx = evIdx;
          evictMsg = `${evicted} evicted, count → ${ht.get(evicted) || 0}`;
          await highlightStep(3, evictMsg);
          addLog("EVICT", `${evicted} removed from window`, "warn");
        } else {
          await highlightStep(3, "No eviction (buffer not full)");
        }
        await sleep(80);

        totalPackets++;
        await highlightStep(4, `Top-${getK()} updated`);

        addLog(
          "PKT",
          `${ip} → idx=${idx}${evicted ? " | evict=" + evicted : ""}`,
          evicted ? "warn" : "success",
        );
        renderAll();

        // Reset steps after delay
        setTimeout(() => {
          for (let i = 0; i < 5; i++) {
            const el = document.getElementById("step" + i);
            el.classList.remove("active");
            el.classList.add("done");
          }
          setTimeout(resetAlgoSteps, 400);
        }, 200);
      }

      async function highlightStep(i, msg) {
        resetAlgoSteps();
        const labels = [
          "Receive IP",
          "Ring enqueue",
          "Hash insert",
          "Evict oldest",
          "Update Top-K",
        ];
        const el = document.getElementById("step" + i);
        el.classList.add("active");
        el.innerHTML = `<span class="step-num">${i + 1}.</span>${labels[i]}: <span style="color:var(--text2)">${msg.substring(0, 28)}${msg.length > 28 ? "…" : ""}</span>`;
      }

      function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
      }

      async function processBatch(n) {
        for (let i = 0; i < n; i++) {
          const ip = zipfPick(ipPool, getSkew());
          const cap = getBufCap();
          if (ring.cap !== cap) {
            ring.resize(cap);
            ht.reset(HT_SIZE);
          }
          const evicted = ring.enqueue(ip);
          ht.increment(ip);
          if (evicted) ht.decrement(evicted);
          totalPackets++;
        }
        addLog(
          "BATCH",
          `+${n} packets processed (total: ${totalPackets})`,
          "info",
        );
        renderAll();
      }

      function toggleAuto() {
        if (autoInterval) {
          clearInterval(autoInterval);
          autoInterval = null;
          document.getElementById("autoBtn").textContent = "⏵ Auto Play";
        } else {
          autoInterval = setInterval(
            () => processBatch(1).then(renderAll),
            simSpeed,
          );
          document.getElementById("autoBtn").textContent = "⏸ Pause";
        }
      }

      function setSpeed(ms, el) {
        simSpeed = ms;
        document
          .querySelectorAll(".speed-btn")
          .forEach((b) => b.classList.remove("active"));
        el.classList.add("active");
        if (autoInterval) {
          clearInterval(autoInterval);
          autoInterval = setInterval(() => processBatch(1).then(renderAll), ms);
        }
      }

      // ══════════════════════════════════════════════════════════════
      // RENDER FUNCTIONS
      // ══════════════════════════════════════════════════════════════

      function renderAll() {
        renderMetrics();
        renderRingCanvas();
        renderHashTable();
        renderTopK();
        renderMemory();
      }

      function renderMetrics() {
        const cap = ring.cap;
        document.getElementById("mTotal").textContent = totalPackets;
        document.getElementById("mBuf").textContent = ring.size + " / " + cap;
        document.getElementById("mUniq").textContent = ht.count;
        document.getElementById("mColl").textContent = ht.collisions;
        const lf = ht.loadFactor();
        document.getElementById("mLoad").textContent =
          (lf * 100).toFixed(0) + "%";
      }

      function renderRingCanvas() {
        const canvas = document.getElementById("ringCanvas");
        const ctx = canvas.getContext("2d");
        const W = canvas.width,
          H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const cap = ring.cap;
        const cx = W / 2,
          cy = H / 2;
        const R = Math.min(W, H) * 0.38;
        const cellR = Math.min(20, (2 * Math.PI * R) / (cap * 2.5));

        for (let i = 0; i < cap; i++) {
          const angle = (i / cap) * 2 * Math.PI - Math.PI / 2;
          const x = cx + R * Math.cos(angle);
          const y = cy + R * Math.sin(angle);
          const val = ring.buf[i];
          const isHead = i === ring.head % cap && ring.size > 0;
          const isTail = i === ring.tail % cap;
          const isFilled = ring.buf[i] !== null;

          ctx.beginPath();
          ctx.arc(x, y, cellR, 0, 2 * Math.PI);

          if (isHead && isTail && isFilled) {
            ctx.fillStyle = "#8e44ad";
            ctx.strokeStyle = "#aa66ff";
          } else if (isHead) {
            ctx.fillStyle = "#c0392b";
            ctx.strokeStyle = "#ff4466";
          } else if (isTail && !isFilled) {
            ctx.fillStyle = "#0e5c44";
            ctx.strokeStyle = "#00ff88";
          } else if (isFilled) {
            ctx.fillStyle = "#0a3060";
            ctx.strokeStyle = "#00d4ff";
          } else {
            ctx.fillStyle = "#111a24";
            ctx.strokeStyle = "#1e3048";
          }

          ctx.lineWidth = isHead || isTail ? 2 : 1;
          ctx.fill();
          ctx.stroke();

          if (val) {
            ctx.fillStyle = isHead ? "#ff8899" : "#00d4ff";
            ctx.font = `bold ${cellR * 0.6}px JetBrains Mono, monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const lastOctet = val.split(".").pop();
            ctx.fillText("." + lastOctet, x, y);
          }

          // Index labels
          const lx = cx + (R + cellR + 14) * Math.cos(angle);
          const ly = cy + (R + cellR + 14) * Math.sin(angle);
          ctx.fillStyle = "#4a6a7a";
          ctx.font = `9px JetBrains Mono, monospace`;
          ctx.fillText(i, lx, ly);
        }

        // Center info
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#4a6a7a";
        ctx.font = "10px JetBrains Mono, monospace";
        ctx.fillText(`size: ${ring.size}/${cap}`, cx, cy - 8);
        ctx.fillStyle = "#00d4ff";
        ctx.font = "bold 11px JetBrains Mono, monospace";
        ctx.fillText(`head=${ring.head % cap}`, cx, cy + 8);
        ctx.fillStyle = "#00ff88";
        ctx.font = "10px JetBrains Mono, monospace";
        ctx.fillText(`tail=${ring.tail % cap}`, cx, cy + 22);

        document.getElementById("ringInfo").textContent =
          `Ring Buffer: ${ring.size}/${cap} slots used | head=${ring.head % cap} (oldest) | tail=${ring.tail % cap} (next write)`;
      }

      function renderHashTable() {
        const grid = document.getElementById("htGrid");
        grid.innerHTML = "";
        const totalBuckets = ht.size;
        for (let i = 0; i < totalBuckets; i++) {
          const chain = ht.table[i];
          const cell = document.createElement("div");
          cell.className = "ht-cell";
          cell.id = "htcell-" + i;

          if (chain.length === 0) {
            cell.classList.add("empty");
            cell.innerHTML = `<div class="cell-idx">${i}</div><div class="cell-cnt" style="color:var(--border2)">·</div>`;
          } else if (chain.length > 1) {
            cell.classList.add("collision");
            const total = chain.reduce((s, n) => s + n.val, 0);
            cell.innerHTML = `<div class="cell-idx">${i}</div><div class="cell-cnt">${total}</div>`;
            cell.title = chain.map((n) => `${n.key}: ${n.val}`).join("\n");
          } else {
            cell.classList.add("used");
            const lastOctet = chain[0].key.split(".").pop();
            cell.innerHTML = `<div class="cell-idx">${i}</div><div class="cell-cnt">${chain[0].val}</div>`;
            cell.title = `${chain[0].key}: ${chain[0].val}`;
          }

          if (i === lastHtIdx) cell.classList.add("flash-new");
          if (i === lastEvictIdx) cell.classList.add("flash-evict");
          grid.appendChild(cell);
        }
        const used = ht.bucketCount();
        const lf = ht.loadFactor();
        document.getElementById("htLoadTag").textContent =
          `α = ${lf.toFixed(2)}`;
        document.getElementById("htInfo").textContent =
          `${used}/${totalBuckets} buckets occupied | ${ht.collisions} total collisions`;
        lastHtIdx = lastEvictIdx = -1;
      }

      function renderTopK() {
        const k = getK();
        const entries = ht.entries();
        if (!entries.length) {
          document.getElementById("topkList").innerHTML =
            '<div style="font-family:var(--mono);font-size:11px;color:var(--text3);padding:10px 0">Waiting for traffic data...</div>';
          return;
        }
        // O(U log K) heap approach
        const heap = [];
        for (const [ip, cnt] of entries) {
          if (heap.length < k) {
            heap.push([cnt, ip]);
            heap.sort((a, b) => a[0] - b[0]);
          } else if (cnt > heap[0][0]) {
            heap[0] = [cnt, ip];
            heap.sort((a, b) => a[0] - b[0]);
          }
        }
        const sorted = heap.sort((a, b) => b[0] - a[0]);
        const maxCnt = sorted[0]?.[0] || 1;
        const colors = [
          "#ffd700",
          "#c0c0c0",
          "#cd7f32",
          "#00d4ff",
          "#00ff88",
          "#aa66ff",
          "#ff4466",
          "#ffaa00",
          "#ff88aa",
          "#88ffcc",
        ];
        const list = document.getElementById("topkList");
        list.innerHTML = sorted
          .map(
            ([cnt, ip], i) => `
    <div class="topk-item">
      <div class="topk-rank">#${i + 1}</div>
      <div class="topk-ip">${ip}</div>
      <div class="topk-bar-wrap"><div class="topk-bar" style="width:${Math.round((cnt / maxCnt) * 100)}%;background:${colors[i % colors.length]}"></div></div>
      <div class="topk-count">${cnt}</div>
    </div>`,
          )
          .join("");
      }

      function renderMemory() {
        const cap = ring.cap;
        const ringMem = cap * 4;
        const htMem = ht.count * 28 + ht.size * 8;
        const heapMem = getK() * 32;
        const total = ringMem + htMem + heapMem;
        const fmt = (b) =>
          b < 1024
            ? b + " B"
            : b < 1048576
              ? (b / 1024).toFixed(1) + " KB"
              : (b / 1048576).toFixed(2) + " MB";
        document.getElementById("memRing").textContent = fmt(ringMem);
        document.getElementById("memHT").textContent = fmt(htMem);
        document.getElementById("memHeap").textContent = fmt(heapMem);
        document.getElementById("memTotal").textContent = fmt(total);
      }

      function showPacketAnim(ip) {
        const stream = document.getElementById("packetStream");
        const pkt = document.createElement("div");
        pkt.className = "packet";
        const hue = parseInt(ip.split(".").pop()) * 30;
        pkt.style.background = `hsla(${hue}, 70%, 20%, 0.9)`;
        pkt.style.border = `1px solid hsla(${hue}, 70%, 50%, 0.6)`;
        pkt.style.color = `hsla(${hue}, 70%, 70%, 1)`;
        pkt.textContent = ip;
        stream.appendChild(pkt);
        setTimeout(() => pkt.remove(), 1600);
      }

      // ══════════════════════════════════════════════════════════════
      // LOG
      // ══════════════════════════════════════════════════════════════
      function addLog(tag, msg, type = "muted") {
        const el = document.getElementById("eventLog");
        const now = new Date();
        const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        const line = document.createElement("div");
        line.className = `log-line ${type}`;
        line.innerHTML = `<span class="log-time">${t}</span><span class="log-msg">[${tag}] ${msg}</span>`;
        el.insertBefore(line, el.firstChild);
        while (el.children.length > 50) el.removeChild(el.lastChild);
      }
      function clearLog() {
        document.getElementById("eventLog").innerHTML = "";
      }

      // ══════════════════════════════════════════════════════════════
      // MANUAL INPUT
      // ══════════════════════════════════════════════════════════════
      function loadExample(type) {
        const examples = {
          normal:
            "192.168.1.1, 10.0.0.5, 192.168.1.1, 172.16.0.1, 192.168.1.1, 10.0.0.5, 10.10.1.1, 192.168.1.1, 172.16.0.1, 10.0.0.5, 192.168.2.1, 10.0.0.5, 192.168.1.1, 10.20.0.1, 172.16.0.1, 192.168.1.1, 10.0.0.5, 172.16.0.1",
          ddos: "45.33.32.156, 45.33.32.156, 45.33.32.156, 45.33.32.156, 45.33.32.156, 45.33.32.156, 45.33.32.156, 45.33.32.156, 192.168.1.1, 10.0.0.1, 45.33.32.156, 45.33.32.156, 198.51.100.1, 45.33.32.156, 45.33.32.156, 10.20.0.5, 45.33.32.156, 45.33.32.156",
          uniform:
            "10.0.0.1, 10.0.0.2, 10.0.0.3, 10.0.0.4, 10.0.0.5, 10.0.0.1, 10.0.0.2, 10.0.0.3, 10.0.0.4, 10.0.0.5, 10.0.0.1, 10.0.0.2, 10.0.0.3, 10.0.0.4, 10.0.0.5",
        };
        document.getElementById("manualIPs").value = examples[type];
      }

      function runManual() {
        const ipsRaw = document.getElementById("manualIPs").value;
        const ips = ipsRaw
          .split(/[\s,\n]+/)
          .map((s) => s.trim())
          .filter((s) => s && s.includes("."));
        if (!ips.length) {
          document.getElementById("manualResultPanel").innerHTML =
            '<div style="color:var(--red);font-family:var(--mono);font-size:11px">No valid IPs found.</div>';
          return;
        }

        const bufCap = parseInt(document.getElementById("mBufCap").value) || 10;
        const k = parseInt(document.getElementById("mTopK").value) || 3;
        const htSize = parseInt(document.getElementById("mHTSize").value) || 16;

        let mRing = new RingBuffer(bufCap);
        let mHT = new HashTable(htSize);

        const trace = [];
        for (const ip of ips) {
          const evicted = mRing.enqueue(ip);
          const { idx, isNew } = mHT.increment(ip);
          let evictMsg = "";
          if (evicted) {
            mHT.decrement(evicted);
            evictMsg = ` | evicted: ${evicted}`;
          }
          trace.push(`${ip} → bucket[${idx}] cnt=${mHT.get(ip)}${evictMsg}`);
        }

        const sorted = mHT.entries().sort((a, b) => b[1] - a[1]);
        const topK = sorted.slice(0, k);
        const maxCnt = topK[0]?.[1] || 1;
        const memTotal = bufCap * 4 + mHT.count * 28 + k * 32;

        const colors = [
          "#ffd700",
          "#c0c0c0",
          "#cd7f32",
          "#00d4ff",
          "#00ff88",
          "#aa66ff",
          "#ff4466",
          "#ffaa00",
        ];
        let html = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      <div class="metric blue" style="padding:.75rem"><div class="metric-label">Packets</div><div class="metric-val blue" style="font-size:20px">${ips.length}</div></div>
      <div class="metric green" style="padding:.75rem"><div class="metric-label">In Window</div><div class="metric-val green" style="font-size:20px">${mRing.size}</div></div>
      <div class="metric amber" style="padding:.75rem"><div class="metric-label">Unique IPs</div><div class="metric-val amber" style="font-size:20px">${mHT.count}</div></div>
    </div>
    <div style="font-family:var(--mono);font-size:10px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.1em">Top-${k} IPs (Min-Heap Result)</div>
    ${topK
      .map(
        ([ip, cnt], i) => `
    <div class="topk-item" style="margin-bottom:4px">
      <div class="topk-rank">#${i + 1}</div>
      <div class="topk-ip">${ip}</div>
      <div class="topk-bar-wrap" style="width:80px"><div class="topk-bar" style="width:${Math.round((cnt / maxCnt) * 100)}%;background:${colors[i]}"></div></div>
      <div class="topk-count">${cnt}</div>
    </div>`,
      )
      .join("")}
    <hr class="sep" style="margin:12px 0">
    <div style="font-family:var(--mono);font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.1em">Memory Analysis</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-family:var(--mono);font-size:11px;margin-bottom:12px">
      <span class="text-muted">Ring Buffer (B×4):</span><span class="text-accent">${(bufCap * 4).toLocaleString()} bytes</span>
      <span class="text-muted">Hash Table:</span><span class="text-amber">~${(mHT.count * 28).toLocaleString()} bytes</span>
      <span class="text-muted">Min-Heap (K×32):</span><span class="text-green">${(k * 32).toLocaleString()} bytes</span>
      <span class="text-muted" style="font-weight:600">Total:</span><span class="text-accent" style="font-weight:600">${memTotal < 1024 ? memTotal + " B" : (memTotal / 1024).toFixed(1) + " KB"}</span>
    </div>
    <div style="font-family:var(--mono);font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.1em">Execution Trace (last 10)</div>
    <div class="result-box">${trace
      .slice(-10)
      .reverse()
      .map((t) => `<div>${t}</div>`)
      .join("")}</div>`;

        document.getElementById("manualResultPanel").innerHTML = html;
      }

      // ══════════════════════════════════════════════════════════════
      // MIN-HEAP VISUALIZER
      // ══════════════════════════════════════════════════════════════
      let heapViz = new MinHeap(4);
      let heapLogEl = null;

      function heapLog(msg, type = "info") {
        if (!heapLogEl) heapLogEl = document.getElementById("heapLog");
        const line = document.createElement("div");
        line.className = `log-line ${type}`;
        const now = new Date();
        const t = `${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
        line.innerHTML = `<span class="log-time">${t}</span><span class="log-msg">${msg}</span>`;
        heapLogEl.insertBefore(line, heapLogEl.firstChild);
        while (heapLogEl.children.length > 30)
          heapLogEl.removeChild(heapLogEl.lastChild);
      }

      function heapInsert() {
        const ip =
          document.getElementById("heapIP").value.trim() ||
          `10.0.0.${Math.floor(Math.random() * 255)}`;
        const cnt =
          parseInt(document.getElementById("heapCount").value) ||
          Math.floor(Math.random() * 100) + 1;
        document.getElementById("heapIP").value = "";
        document.getElementById("heapCount").value = "";

        const k = parseInt(document.getElementById("heapK").value);
        heapViz.k = k;
        const action = heapViz.insert(cnt, ip);
        if (action === "push")
          heapLog(
            `PUSH (${cnt}, ${ip}) — heap size: ${heapViz.heap.length}/${k}`,
            "success",
          );
        else if (action === "replace")
          heapLog(`REPLACE root with (${cnt}, ${ip}) — sift-down`, "warn");
        else
          heapLog(
            `SKIP (${cnt}, ${ip}) — less than root min=${heapViz.peek()?.[0]}`,
            "error",
          );

        drawHeapTree();
        updateHeapState();
      }

      function resetHeap() {
        heapViz = new MinHeap(parseInt(document.getElementById("heapK").value));
        drawHeapTree();
        updateHeapState();
      }

      function heapAutoFill() {
        resetHeap();
        const ips = [
          "192.168.1.1",
          "10.0.0.5",
          "172.16.0.1",
          "10.10.1.18",
          "192.168.2.14",
          "10.20.0.27",
          "172.16.1.40",
        ];
        const cnts = [47, 89, 23, 61, 35, 78, 12];
        for (let i = 0; i < ips.length; i++) {
          heapViz.insert(cnts[i], ips[i]);
        }
        drawHeapTree();
        updateHeapState();
        heapLog("Auto-filled with 7 entries", "info");
      }

      function updateHeapState() {
        const el = document.getElementById("heapState");
        if (!heapViz.heap.length) {
          el.innerHTML = "Empty heap";
          return;
        }
        const sorted = heapViz.sorted();
        el.innerHTML = sorted
          .map(
            (e, i) =>
              `<span style="color:${i === 0 ? "var(--amber)" : "var(--text2)"}">#${i + 1}: ${e[1]} = <span style="color:${i === 0 ? "var(--red)" : "var(--accent)"}">cnt=${e[0]}</span></span>`,
          )
          .join("<br>");
        document.getElementById("heapInfo").textContent =
          `Heap size: ${heapViz.heap.length}/${heapViz.k} | Root (min): ${heapViz.peek()?.[0] || "—"} | Sorted by count desc: ${heapViz
            .sorted()
            .map((e) => e[0])
            .join(" > ")}`;
      }

      function drawHeapTree() {
        const canvas = document.getElementById("heapCanvas");
        const ctx = canvas.getContext("2d");
        const W = canvas.width,
          H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        if (!heapViz.heap.length) {
          ctx.fillStyle = "#4a6a7a";
          ctx.font = "13px JetBrains Mono, monospace";
          ctx.textAlign = "center";
          ctx.fillText("Heap empty — insert nodes to visualize", W / 2, H / 2);
          return;
        }

        const n = heapViz.heap.length;
        const positions = [];
        const levels = Math.floor(Math.log2(n)) + 1;

        function getPos(i) {
          const lvl = Math.floor(Math.log2(i + 1));
          const posInLvl = i - (Math.pow(2, lvl) - 1);
          const nodesInLvl = Math.pow(2, lvl);
          const x = (W * (posInLvl + 0.5)) / nodesInLvl;
          const y = 40 + lvl * ((H - 60) / levels);
          return { x, y };
        }

        // Draw edges
        ctx.strokeStyle = "#1e3048";
        ctx.lineWidth = 1.5;
        for (let i = 1; i < n; i++) {
          const p = Math.floor((i - 1) / 2);
          const pos = getPos(i),
            ppos = getPos(p);
          ctx.beginPath();
          ctx.moveTo(ppos.x, ppos.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        }

        // Draw nodes
        for (let i = 0; i < n; i++) {
          const [cnt, ip] = heapViz.heap[i];
          const { x, y } = getPos(i);
          const isRoot = i === 0;
          const r = 28;

          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          if (isRoot) {
            ctx.fillStyle = "#3d1010";
            ctx.strokeStyle = "#ff4466";
          } else {
            ctx.fillStyle = "#0a2040";
            ctx.strokeStyle = "#00d4ff";
          }
          ctx.lineWidth = isRoot ? 2 : 1;
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = "center";
          ctx.fillStyle = isRoot ? "#ff8899" : "#00d4ff";
          ctx.font = `bold 13px JetBrains Mono, monospace`;
          ctx.fillText(cnt, x, y + 4);

          const short = ip.split(".").slice(-2).join(".");
          ctx.fillStyle = "#4a6a7a";
          ctx.font = "8px JetBrains Mono, monospace";
          ctx.fillText(short, x, y + 18);

          if (isRoot) {
            ctx.fillStyle = "#ff4466";
            ctx.font = "8px JetBrains Mono, monospace";
            ctx.fillText("MIN", x, y - 20);
          }
        }
      }

      // ══════════════════════════════════════════════════════════════
      // COMPLEXITY CHART
      // ══════════════════════════════════════════════════════════════
      function drawComplexityChart() {
        const maxU = parseInt(document.getElementById("cURange").value);
        const K = parseInt(document.getElementById("cKRange").value);
        const pts = [];
        for (let u = 1; u <= maxU; u += Math.max(1, Math.floor(maxU / 40)))
          pts.push(u);

        const canvas = document.getElementById("complexChart");
        canvas.width = canvas.offsetWidth;
        canvas.height = 280;

        if (complexChartObj) {
          complexChartObj.destroy();
          complexChartObj = null;
        }

        const ctx = canvas.getContext("2d");
        complexChartObj = new Chart(ctx, {
          type: "line",
          data: {
            labels: pts,
            datasets: [
              {
                label: "O(U log K) Heap",
                data: pts.map((u) => Math.round(u * Math.log2(Math.max(K, 2)))),
                borderColor: "#00d4ff",
                backgroundColor: "rgba(0,212,255,0.05)",
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: true,
              },
              {
                label: "O(U log U) Sort",
                data: pts.map((u) => Math.round(u * Math.log2(Math.max(u, 2)))),
                borderColor: "#ff4466",
                backgroundColor: "rgba(255,68,102,0.04)",
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: true,
              },
              {
                label: "O(U) Linear",
                data: pts.map((u) => u),
                borderColor: "#ffaa00",
                backgroundColor: "rgba(255,170,0,0.03)",
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 0,
                fill: true,
                borderDash: [4, 3],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { color: "#1e3048" },
                ticks: {
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                },
                title: {
                  display: true,
                  text: "U (unique IPs)",
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                },
              },
              y: {
                grid: { color: "#1e3048" },
                ticks: {
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                },
                title: {
                  display: true,
                  text: "Operations",
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                },
              },
            },
          },
        });

        // Complexity table
        const rows = [
          ["Process 1 packet", "O(1) avg", "O(n)* collision", "—"],
          ["Enqueue ring buffer", "O(1)", "O(1)", "—"],
          ["Evict ring buffer", "O(1)", "O(1)", "—"],
          ["Hash table insert", "O(1) avg", "O(n)*", "O(U)"],
          ["Hash table lookup", "O(1) avg", "O(n)*", "—"],
          ["Top-K (heap method)", "O(U log K)", "O(U log K)", "O(K)"],
          ["Top-K (sort method)", "O(U log U)", "O(U log U)", "O(U)"],
          ["Full system (amortized)", "O(1)", "O(U log K)", "O(B+K)"],
        ];
        const tbody = document.getElementById("complexTable");
        tbody.innerHTML = rows
          .map(
            (r, i) => `
    <tr style="${i % 2 === 0 ? "background:var(--bg3)" : ""}">
      <td style="border:1px solid var(--border);padding:6px 10px;color:var(--text2);font-family:var(--mono);font-size:11px">${r[0]}</td>
      <td style="border:1px solid var(--border);padding:6px 10px;color:var(--green);font-family:var(--mono);font-size:11px;text-align:center">${r[1]}</td>
      <td style="border:1px solid var(--border);padding:6px 10px;color:var(--red);font-family:var(--mono);font-size:11px;text-align:center">${r[2]}</td>
      <td style="border:1px solid var(--border);padding:6px 10px;color:var(--accent);font-family:var(--mono);font-size:11px;text-align:center">${r[3]}</td>
    </tr>`,
          )
          .join("");

        drawSpaceChart();
      }

      function drawSpaceChart() {
        const canvas = document.getElementById("spaceChart");
        canvas.width = canvas.offsetWidth;
        canvas.height = 200;
        if (spaceChartObj) {
          spaceChartObj.destroy();
          spaceChartObj = null;
        }
        const Bvals = [100, 500, 1000, 5000, 10000, 50000, 100000];
        const ctx = canvas.getContext("2d");
        spaceChartObj = new Chart(ctx, {
          type: "bar",
          data: {
            labels: Bvals.map((b) => (b >= 1000 ? b / 1000 + "K" : b)),
            datasets: [
              {
                label: "Ring Buffer",
                data: Bvals.map((b) => (b * 4) / 1024),
                backgroundColor: "rgba(0,212,255,0.4)",
                borderColor: "#00d4ff",
                borderWidth: 1,
              },
              {
                label: "Hash Table",
                data: Bvals.map((b) => (b * 28) / 1024),
                backgroundColor: "rgba(255,170,0,0.4)",
                borderColor: "#ffaa00",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (c) => `${c.dataset.label}: ${c.raw.toFixed(1)} KB`,
                },
              },
            },
            scales: {
              x: {
                stacked: true,
                grid: { color: "#1e3048" },
                ticks: {
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                },
                title: {
                  display: true,
                  text: "Buffer Size B",
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                },
              },
              y: {
                stacked: true,
                grid: { color: "#1e3048" },
                ticks: {
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                  callback: (v) => v + " KB",
                },
              },
            },
          },
        });
      }

      // ══════════════════════════════════════════════════════════════
      // ACCURACY TRADEOFF
      // ══════════════════════════════════════════════════════════════
      function estAccuracy(B, U, K, z) {
        if (B >= U) return 99.5;
        const coverage = B / U;
        const base = 45 + 54 * Math.pow(coverage, 0.35);
        const skewBonus = Math.min(10, z * 3);
        return Math.min(99.5, Math.round((base + skewBonus) * 10) / 10);
      }

      function updateTradeoff() {
        const U = parseInt(document.getElementById("tURange").value);
        const K = parseInt(document.getElementById("tKRange").value);
        const z = parseFloat(document.getElementById("tZRange").value) / 10;

        const bufSizes = [
          Math.max(2, Math.floor(U * 0.05)),
          Math.max(2, Math.floor(U * 0.1)),
          Math.max(2, Math.floor(U * 0.2)),
          Math.max(2, Math.floor(U * 0.4)),
          Math.floor(U * 0.6),
          Math.floor(U * 0.8),
          U,
          Math.floor(U * 1.5),
          U * 2,
        ];

        const accs = bufSizes.map((b) => estAccuracy(b, U, K, z));
        const memKBs = bufSizes.map((b) => (b * 4) / 1024);

        // Chart
        const canvas = document.getElementById("tradeoffChart");
        canvas.width = canvas.offsetWidth;
        canvas.height = 260;
        if (tradeoffChartObj) {
          tradeoffChartObj.destroy();
          tradeoffChartObj = null;
        }
        const ctx = canvas.getContext("2d");
        tradeoffChartObj = new Chart(ctx, {
          type: "line",
          data: {
            labels: bufSizes.map((b) =>
              b >= 1000 ? (b / 1000).toFixed(1) + "K" : b,
            ),
            datasets: [
              {
                label: "Accuracy %",
                data: accs,
                borderColor: "#00ff88",
                backgroundColor: "rgba(0,255,136,0.06)",
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: "#00ff88",
                fill: true,
                yAxisID: "y",
              },
              {
                label: "Memory KB",
                data: memKBs,
                borderColor: "rgba(0,212,255,0.5)",
                backgroundColor: "rgba(0,212,255,0.03)",
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: "#00d4ff",
                fill: true,
                yAxisID: "y2",
                borderDash: [4, 3],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                grid: { color: "#1e3048" },
                ticks: {
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                },
                title: {
                  display: true,
                  text: "Buffer Size B",
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                },
              },
              y: {
                min: 0,
                max: 100,
                grid: { color: "#1e3048" },
                ticks: {
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                  callback: (v) => v + "%",
                },
                title: {
                  display: true,
                  text: "Accuracy",
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                },
              },
              y2: {
                position: "right",
                grid: { display: false },
                ticks: {
                  color: "#4a6a7a",
                  font: { family: "JetBrains Mono", size: 10 },
                  callback: (v) => v.toFixed(1) + "KB",
                },
              },
            },
          },
        });

        // Table
        const recs = [
          ["IoT / Embedded", "#ff4466"],
          ["Embedded systems", "#ffaa00"],
          ["Edge routers", "#ffaa00"],
          ["Branch offices", "#00ff88"],
          ["Mid-range routers", "#00ff88"],
          ["Core routers", "#00ff88"],
          ["Data centers ✓✓", "#00d4ff"],
          ["Core internet ✓✓", "#00d4ff"],
          ["Full accuracy ✓✓✓", "#aa66ff"],
        ];
        document.getElementById("tradeBody").innerHTML = bufSizes
          .map((b, i) => {
            const acc = accs[i];
            const mem = memKBs[i];
            const cov = Math.min(100, Math.round((b / U) * 100));
            const barColor =
              acc < 70 ? "#ff4466" : acc < 85 ? "#ffaa00" : "#00ff88";
            const isHighlight = acc >= 90 && acc < 99;
            return `<tr ${isHighlight ? 'class="highlight"' : ""}>
      <td style="font-family:var(--mono);font-weight:600">${b >= 1000 ? (b / 1000).toFixed(1) + "K" : b}</td>
      <td style="font-family:var(--mono)">${mem < 1 ? (mem * 1024).toFixed(0) + " B" : mem.toFixed(1) + " KB"}</td>
      <td style="font-family:var(--mono)">${cov}%</td>
      <td style="font-family:var(--mono);color:${barColor};font-weight:600">${acc.toFixed(1)}%</td>
      <td><div class="bar-mini" style="width:120px"><div class="bar-fill" style="width:${acc}%;background:${barColor}"></div></div></td>
      <td style="font-family:var(--mono);font-size:10px;color:${recs[i][1]}">${recs[i][0]}</td>
    </tr>`;
          })
          .join("");
      }

      // ══════════════════════════════════════════════════════════════
      // TAB SWITCHING
      // ══════════════════════════════════════════════════════════════
      function switchTab(name, btn) {
        document
          .querySelectorAll(".section")
          .forEach((s) => s.classList.remove("active"));
        document
          .querySelectorAll(".tab-btn")
          .forEach((b) => b.classList.remove("active"));
        document.getElementById("tab-" + name).classList.add("active");
        btn.classList.add("active");
        if (name === "complexity") setTimeout(drawComplexityChart, 50);
        if (name === "tradeoff") setTimeout(updateTradeoff, 50);
        if (name === "heap") setTimeout(drawHeapTree, 50);
      }

      // ══════════════════════════════════════════════════════════════
      // CLOCK
      // ══════════════════════════════════════════════════════════════
      function updateClock() {
        const now = new Date();
        document.getElementById("clockDisplay").textContent =
          `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      }
      setInterval(updateClock, 1000);
      updateClock();

      // ══════════════════════════════════════════════════════════════
      // INIT
      // ══════════════════════════════════════════════════════════════
      window.addEventListener("load", () => {
        // Load Chart.js then init
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
        script.onload = () => {
          resetSim();
          addLog(
            "INIT",
            "Network Traffic Monitor loaded. DSAA simulation ready.",
            "success",
          );
          addLog(
            "DS",
            "Ring Buffer: O(1) | Hash Table: O(1) avg | Min-Heap: O(log K)",
            "info",
          );
        };
        document.head.appendChild(script);
      });