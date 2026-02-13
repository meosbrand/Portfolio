/* ===================================================
   Michael Ajekigbe — Portfolio Scripts
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ── Typing Animation ──────────────────────────────
    const roles = [
        'AI Innovator',
        'Cybersecurity Expert',
        'Documentation Pro for SMBs',
        'Web Designer & Vibe Coder',
    ];

    const typedEl = document.getElementById('typed-text');
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typeSpeed = 80;
    const deleteSpeed = 40;
    const pauseAfterType = 2000;
    const pauseAfterDelete = 400;

    function typeLoop() {
        const currentRole = roles[roleIndex];

        if (!isDeleting) {
            typedEl.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex === currentRole.length) {
                isDeleting = true;
                setTimeout(typeLoop, pauseAfterType);
                return;
            }
            setTimeout(typeLoop, typeSpeed);
        } else {
            typedEl.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;

            if (charIndex === 0) {
                isDeleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                setTimeout(typeLoop, pauseAfterDelete);
                return;
            }
            setTimeout(typeLoop, deleteSpeed);
        }
    }

    typeLoop();


    // ── Scroll Reveal (IntersectionObserver) ───────────
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => {
        revealObserver.observe(el);
    });


    // ── Navbar scroll effect ───────────────────────────
    const nav = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });


    // ── Active nav link highlight ──────────────────────
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a:not(.nav-cta)');

    function highlightNav() {
        const scrollY = window.scrollY + 120;

        sections.forEach((section) => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollY >= top && scrollY < top + height) {
                navLinks.forEach((link) => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNav);
    highlightNav();


    // ── Smooth scroll for anchor links ─────────────────
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });


    // ── Mobile menu ────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileLinks = mobileMenu.querySelectorAll('a');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active')
            ? 'hidden'
            : '';
    });

    mobileLinks.forEach((link) => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    document.addEventListener('click', (e) => {
        if (
            !hamburger.contains(e.target) &&
            !mobileMenu.contains(e.target)
        ) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    });


    // ── Contact form handler (FormSubmit.co + localStorage CSV) ──
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formStatus = document.getElementById('formStatus');

    // Save submission to localStorage
    function saveToLocalStorage(data) {
        const submissions = JSON.parse(localStorage.getItem('portfolio_submissions') || '[]');
        submissions.push({
            name: data.name,
            email: data.email,
            message: data.message,
            timestamp: new Date().toISOString(),
        });
        localStorage.setItem('portfolio_submissions', JSON.stringify(submissions));
    }

    // Download all submissions as CSV
    function downloadCSV() {
        const submissions = JSON.parse(localStorage.getItem('portfolio_submissions') || '[]');
        if (submissions.length === 0) {
            alert('No submissions to export yet.');
            return;
        }

        const headers = ['Name', 'Email', 'Message', 'Date'];
        const rows = submissions.map((s) => [
            `"${s.name.replace(/"/g, '""')}"`,
            `"${s.email.replace(/"/g, '""')}"`,
            `"${s.message.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            `"${s.timestamp}"`,
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `portfolio_submissions_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Ctrl+Shift+D to download CSV
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            downloadCSV();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const message = form.message.value.trim();

        if (!name || !email || !message) {
            formStatus.textContent = 'Please fill in all fields.';
            formStatus.style.color = '#ff6b6b';
            return;
        }

        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        formStatus.textContent = '';

        try {
            // Send via FormSubmit.co AJAX endpoint
            const response = await fetch('https://formsubmit.co/ajax/yungbayo01@gmail.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    message,
                    _subject: 'New Portfolio Contact — Michael Ajekigbe',
                    _captcha: 'false',
                    _template: 'table',
                }),
            });

            const result = await response.json();

            if (result.success === 'true' || response.ok) {
                // Save to localStorage for CSV export
                saveToLocalStorage({ name, email, message });

                formStatus.textContent = `Thanks, ${name}! Your message has been sent. I'll get back to you soon.`;
                formStatus.style.color = 'var(--accent-cyan)';
                form.reset();
            } else {
                throw new Error('Server returned an error.');
            }
        } catch (error) {
            formStatus.textContent = 'Oops — something went wrong. Please try again or email me directly.';
            formStatus.style.color = '#ff6b6b';
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });


    // ── Hero Canvas — Animated Grid / Particles ───────
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationId;
        let mouseX = 0;
        let mouseY = 0;

        function resizeCanvas() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            initParticles();
        }

        function initParticles() {
            particles = [];
            const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 100);
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    radius: Math.random() * 1.5 + 0.5,
                    opacity: Math.random() * 0.5 + 0.2,
                });
            }
        }

        function drawParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 140) {
                        const alpha = (1 - dist / 140) * 0.15;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            // Draw particles
            particles.forEach((p) => {
                // Mouse interaction — subtle push
                const dx = p.x - mouseX;
                const dy = p.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120 && dist > 0) {
                    const force = (120 - dist) / 120;
                    p.vx += (dx / dist) * force * 0.02;
                    p.vy += (dy / dist) * force * 0.02;
                }

                p.x += p.vx;
                p.y += p.vy;

                // Damping
                p.vx *= 0.999;
                p.vy *= 0.999;

                // Wrap around
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 240, 255, ${p.opacity})`;
                ctx.fill();
            });

            animationId = requestAnimationFrame(drawParticles);
        }

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        drawParticles();
    }


    // ── Scroll Progress Bar ───────────────────────────
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    function updateProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = `${progress}%`;
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();


    // ── Animated Stat Counters ─────────────────────────
    const statNumbers = document.querySelectorAll('.stat-number');

    function animateCounter(el) {
        const text = el.textContent.trim();
        const hasPlus = text.includes('+');
        const target = parseInt(text.replace(/\D/g, ''), 10);

        if (isNaN(target) || el.dataset.counted === 'true') return;
        el.dataset.counted = 'true';

        const duration = 1800;
        const startTime = performance.now();

        function easeOutExpo(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        }

        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);
            const current = Math.round(target * easedProgress);

            el.textContent = current + (hasPlus ? '+' : '');

            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        }

        el.textContent = '0' + (hasPlus ? '+' : '');
        requestAnimationFrame(tick);
    }

    const counterObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.5 }
    );

    statNumbers.forEach((el) => counterObserver.observe(el));


    // ── Hero Parallax on Scroll ───────────────────────
    const heroContent = document.querySelector('.hero-content');
    const heroOverlay = document.querySelector('.hero-overlay');

    function heroParallax() {
        const scrollY = window.scrollY;
        const heroHeight = document.querySelector('.hero')?.offsetHeight || 800;

        if (scrollY < heroHeight) {
            const ratio = scrollY / heroHeight;
            if (heroContent) {
                heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
                heroContent.style.opacity = 1 - ratio * 1.2;
            }
            if (heroOverlay) {
                heroOverlay.style.transform = `translateY(${scrollY * 0.15}px)`;
            }
        }
    }

    window.addEventListener('scroll', heroParallax, { passive: true });


    // ── Card Tilt Effect (3D hover) ───────────────────
    const tiltCards = document.querySelectorAll('.skill-card, .project-card, .achievement-card');

    tiltCards.forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;

            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)';
            card.style.transition = 'transform 0.5s ease';
            // Remove transition after it completes so mousemove feels instant
            setTimeout(() => { card.style.transition = ''; }, 500);
        });

        card.addEventListener('mouseenter', () => {
            card.style.transition = '';
        });
    });


    // ── Cursor Glow on Cards ──────────────────────────
    tiltCards.forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--glow-x', `${x}px`);
            card.style.setProperty('--glow-y', `${y}px`);
        });
    });


    // ── Section Scroll-Driven Parallax Depth ──────────
    const allSections = document.querySelectorAll('section');

    function sectionDepth() {
        const windowH = window.innerHeight;

        allSections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            const sectionMid = rect.top + rect.height / 2;
            const viewportMid = windowH / 2;
            const offset = (sectionMid - viewportMid) / windowH;

            // Subtle scale + opacity based on proximity to viewport center
            const scale = 1 - Math.abs(offset) * 0.02;
            const opacity = 1 - Math.abs(offset) * 0.15;

            const container = section.querySelector('.container');
            if (container) {
                container.style.transform = `scale(${Math.max(scale, 0.96)})`;
                container.style.opacity = Math.max(opacity, 0.7);
                container.style.transition = 'transform 0.1s linear, opacity 0.1s linear';
            }
        });
    }

    window.addEventListener('scroll', sectionDepth, { passive: true });
    sectionDepth();


    // ── Magnetic Buttons ──────────────────────────────
    const magneticBtns = document.querySelectorAll('.btn-primary, .btn-outline, .nav-cta');

    magneticBtns.forEach((btn) => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
            btn.style.transition = 'transform 0.4s ease';
            setTimeout(() => { btn.style.transition = ''; }, 400);
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transition = '';
        });
    });

});
