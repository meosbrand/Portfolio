/* =========================================================
   Michael Ajekigbe — Portfolio
   Vanilla JS. No dependencies.
   ========================================================= */
(function () {
    "use strict";

    /* ---------- Theme (light / dark) ---------- */
    var root = document.documentElement;
    var toggle = document.getElementById("themeToggle");

    function storedTheme() {
        try { return localStorage.getItem("theme"); } catch (e) { return null; }
    }
    function saveTheme(t) {
        try { localStorage.setItem("theme", t); } catch (e) {}
    }

    var saved = storedTheme();
    if (saved === "light" || saved === "dark") {
        root.setAttribute("data-theme", saved);
    }

    if (toggle) {
        toggle.addEventListener("click", function () {
            var prefersDark = window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches;
            var current = root.getAttribute("data-theme") ||
                (prefersDark ? "dark" : "light");
            var next = current === "dark" ? "light" : "dark";
            root.setAttribute("data-theme", next);
            saveTheme(next);
        });
    }

    /* ---------- Loaded flag (hero underline etc.) ---------- */
    window.addEventListener("load", function () {
        document.body.classList.add("loaded");
    });
    // fallback in case load already fired
    if (document.readyState === "complete") document.body.classList.add("loaded");

    /* ---------- Nav: shrink on scroll + progress bar ---------- */
    var nav = document.getElementById("nav");
    var progress = document.getElementById("progress");

    function onScroll() {
        var y = window.scrollY || window.pageYOffset;
        if (nav) nav.classList.toggle("scrolled", y > 24);

        if (progress) {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            var pct = h > 0 ? (y / h) * 100 : 0;
            progress.style.width = pct + "%";
        }
    }
    var ticking = false;
    window.addEventListener("scroll", function () {
        if (!ticking) {
            window.requestAnimationFrame(function () { onScroll(); ticking = false; });
            ticking = true;
        }
    }, { passive: true });
    onScroll();

    /* ---------- Mobile menu ---------- */
    var burger = document.getElementById("burger");
    var closeMenu = document.getElementById("closeMenu");
    var mobileMenu = document.getElementById("mobileMenu");

    function setMenu(open) {
        if (!mobileMenu) return;
        mobileMenu.classList.toggle("open", open);
        document.body.style.overflow = open ? "hidden" : "";
    }
    if (burger) burger.addEventListener("click", function () { setMenu(true); });
    if (closeMenu) closeMenu.addEventListener("click", function () { setMenu(false); });
    if (mobileMenu) {
        mobileMenu.querySelectorAll("a").forEach(function (a) {
            a.addEventListener("click", function () { setMenu(false); });
        });
    }

    /* ---------- Scroll reveal ---------- */
    var reveals = document.querySelectorAll(".reveal:not(.in)");
    if ("IntersectionObserver" in window && reveals.length) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
        reveals.forEach(function (el) { io.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add("in"); });
    }

    /* ---------- Contact form (FormSubmit AJAX) ---------- */
    var form = document.getElementById("contactForm");
    var status = document.getElementById("formStatus");

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var btn = form.querySelector('button[type="submit"]');
            var honey = form.querySelector('input[name="_honey"]');
            if (honey && honey.value) return; // bot trap

            if (status) { status.style.color = "var(--muted)"; status.textContent = "Sending…"; }
            if (btn) btn.disabled = true;

            fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" }
            }).then(function (res) {
                if (res.ok) {
                    form.reset();
                    if (status) { status.style.color = "var(--green)"; status.textContent = "Thanks — I'll get back to you soon."; }
                } else {
                    throw new Error("Bad response");
                }
            }).catch(function () {
                if (status) { status.style.color = "var(--clay)"; status.textContent = "Something went wrong. Email me directly: yungbayo01@gmail.com"; }
            }).finally(function () {
                if (btn) btn.disabled = false;
            });
        });
    }
})();
