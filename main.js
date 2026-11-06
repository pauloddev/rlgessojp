/* RL Gesso e Iluminação — interações */
(() => {
  "use strict";
  document.documentElement.classList.add("js");

  /* ---------- Configuração ---------- */
  const WHATSAPP = "5583986894249"; // (83) 98689-4249 — trocar aqui se mudar
  const INSTAGRAM = "https://www.instagram.com/rl_gesso_jp/";
  const TZ = "America/Fortaleza";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Links de WhatsApp ---------- */
  document.querySelectorAll("[data-wa]").forEach((a) => {
    const msg = a.getAttribute("data-wa") || "Olá! Vim pelo site da RL Gesso e Iluminação.";
    a.href = WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}` : INSTAGRAM;
    a.target = "_blank";
    a.rel = "noopener";
  });

  /* ---------- Header + botão flutuante ---------- */
  const header = document.querySelector(".header");
  const waFloat = document.querySelector(".wa-float");
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-solid", y > 40);
    waFloat.classList.toggle("is-visible", y > window.innerHeight * 0.6);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  const burger = document.querySelector(".burger");
  const nav = document.getElementById("menu");
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    nav.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); burger.focus(); } });
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------- Transições de entrada ---------- */
  document.querySelectorAll("[data-d]").forEach((el) => el.style.setProperty("--d", el.dataset.d));
  // escalonamento automático em listas de cards
  document.querySelectorAll(".carousel__track, .featured, .diff__grid").forEach((list) => {
    [...list.children].forEach((child, i) => {
      const t = child.matches(".reveal, .reveal-img") ? child : child.querySelector(".reveal, .reveal-img");
      if (t && !t.dataset.d) t.style.setProperty("--d", Math.min(i, 4));
    });
  });
  const revealables = document.querySelectorAll(".reveal, .reveal-img, .lightline, .cta");
  if (reduced || !("IntersectionObserver" in window)) {
    revealables.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
    // itens já no topo da página (hero) entram de imediato
    requestAnimationFrame(() => document.querySelectorAll(".hero .reveal").forEach((el) => el.classList.add("is-in")));
  }

  /* ---------- Carrosséis (fotos, soluções, depoimentos) ---------- */
  document.querySelectorAll("[data-carousel]").forEach((root) => {
    const track = root.querySelector(".carousel__track");
    const prev = root.querySelector("[data-prev]");
    const next = root.querySelector("[data-next]");
    const bar = root.querySelector(".carousel__progress span");
    const step = () => {
      const item = track.children[0];
      const gap = parseFloat(getComputedStyle(track).columnGap) || 14;
      return item ? item.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const p = max > 0 ? track.scrollLeft / max : 1;
      const visible = Math.min(1, track.clientWidth / track.scrollWidth);
      if (bar) bar.style.transform = `scaleX(${Math.max(visible, visible + (1 - visible) * p)})`;
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max - 4;
    };
    prev && prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduced ? "auto" : "smooth" }));
    next && next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduced ? "auto" : "smooth" }));
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    enableDrag(track);
  });

  // arrastar com o mouse (no toque, o scroll nativo já resolve)
  function enableDrag(track) {
    let down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add("is-dragging"); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove("is-dragging");
        // reencaixa no card mais próximo
        const item = track.children[0];
        if (item) {
          const w = item.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 14);
          track.scrollTo({ left: Math.round(track.scrollLeft / w) * w, behavior: "smooth" });
        }
        // evita abrir o lightbox ao soltar o arraste
        track.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
      }
    });
  }

  /* ---------- Carrossel de vídeos (centro em destaque) ---------- */
  document.querySelectorAll("[data-vcarousel]").forEach((root) => {
    const track = root.querySelector(".vcarousel__track");
    const cards = [...track.children];
    const dotsWrap = root.querySelector(".vcarousel__dots");
    let active = -1, inView = false;

    const dots = cards.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", `Vídeo ${i + 1}`);
      b.addEventListener("click", () => go(i));
      dotsWrap.appendChild(b);
      return b;
    });

    const go = (i) => {
      const c = cards[Math.max(0, Math.min(cards.length - 1, i))];
      track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
    };
    root.querySelector("[data-prev]").addEventListener("click", () => go(active - 1));
    root.querySelector("[data-next]").addEventListener("click", () => go(active + 1));

    const playActive = () => {
      cards.forEach((c, i) => {
        const v = c.querySelector("video");
        if (i === active && inView && !reduced) {
          if (v.preload === "none") v.preload = "auto";
          const p = v.play(); if (p && p.catch) p.catch(() => {});
        } else if (!v.paused) v.pause();
      });
    };

    const detect = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, dist = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
      if (best !== active) {
        active = best;
        cards.forEach((c, i) => c.classList.toggle("is-active", i === active));
        dots.forEach((d, i) => d.setAttribute("aria-selected", String(i === active)));
        playActive();
      }
    };
    let raf;
    track.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(detect); }, { passive: true });
    window.addEventListener("resize", detect);
    cards.forEach((c, i) => c.addEventListener("click", () => { if (i !== active) go(i); }));

    if (reduced) cards.forEach((c) => c.querySelector("video").setAttribute("controls", ""));

    new IntersectionObserver(([en]) => { inView = en.isIntersecting; playActive(); }, { threshold: 0.35 }).observe(track);
    // começa no segundo vídeo para mostrar que há conteúdo dos dois lados
    requestAnimationFrame(() => { track.scrollLeft = 0; go(1); detect(); });
    enableDrag(track);
  });

  /* ---------- Lightbox ---------- */
  const lb = document.querySelector(".lightbox");
  if (lb && typeof lb.showModal === "function") {
    const items = [...document.querySelectorAll("[data-lightbox]")];
    const img = lb.querySelector("img");
    const cap = lb.querySelector("figcaption");
    let idx = 0, opener = null;
    const show = (i) => {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      img.src = it.dataset.lightbox;
      img.alt = it.querySelector("img")?.alt || "";
      cap.textContent = it.dataset.caption || "";
      img.style.animation = "none"; void img.offsetWidth; img.style.animation = "";
    };
    items.forEach((it, i) => it.addEventListener("click", () => { opener = it; show(i); lb.showModal(); }));
    lb.querySelector(".lightbox__close").addEventListener("click", () => lb.close());
    lb.querySelector(".lightbox__nav--prev").addEventListener("click", () => show(idx - 1));
    lb.querySelector(".lightbox__nav--next").addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") show(idx - 1); if (e.key === "ArrowRight") show(idx + 1); });
    lb.addEventListener("close", () => opener && opener.focus());
    let sx = null;
    lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
  }

  /* ---------- Aberto agora ---------- */
  const status = document.querySelector("[data-open-status]");
  if (status) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" })
      .formatToParts(new Date()).map((p) => [p.type, p.value]));
    const day = parts.weekday; const mins = Number(parts.hour) * 60 + Number(parts.minute);
    const open = (["Mon", "Tue", "Wed", "Thu", "Fri"].includes(day) && mins >= 480 && mins < 1080) || (day === "Sat" && mins >= 480 && mins < 720);
    status.textContent = open ? "Aberto agora" : "Fechado agora";
    const dayIdx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[day];
    document.querySelectorAll("[data-hours] li").forEach((li) => li.classList.toggle("is-today", li.dataset.days.split(",").map(Number).includes(dayIdx)));
    status.classList.add(open ? "is-open" : "is-closed");
  }

  /* ---------- Ano ---------- */
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
