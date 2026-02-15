gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Initial Setup to Hide Elements for Animation ---
    // We set opacity:0 here to avoid FOUC for animated elements
    // The HTML has opacity-0 classes but we reinforce/animate here
    gsap.set('.project-card, .skill-card, .achievement-card, .section-header', {
        opacity: 0,
        y: 30
    });

    // --- 2. Hero Animations ---
    const tl = gsap.timeline();
    // HTML elements already have opacity-0 class, so we animate TO visible
    tl.to('.hero-badge', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      .to('.hero-title', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.4')
      .to('.hero-typing', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .to('.hero-desc', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .to('.hero-btns', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6');

    // --- 3. Typing Effect ---
    const text = ["AI Innovator", "Cybersecurity Expert", "Vibe Coder"];
    let count = 0;
    let index = 0;
    let currentText = "";
    let letter = "";

    (function type() {
        if (count === text.length) {
            count = 0;
        }
        currentText = text[count];
        letter = currentText.slice(0, ++index);

        const typedElement = document.getElementById('typed-text');
        if (typedElement) {
            typedElement.textContent = letter;
        }

        if (letter.length === currentText.length) {
            count++;
            index = 0;
            setTimeout(type, 2000);
        } else {
            setTimeout(type, 100);
        }
    })();

    // --- 4. Scroll Animations ---
    
    // Generic Section Headers
    gsap.utils.toArray('.section-header').forEach(header => {
        gsap.to(header, {
            scrollTrigger: {
                trigger: header,
                start: 'top 80%',
            },
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out'
        });
    });

    // Skills
    ScrollTrigger.batch('.skill-card', {
        start: 'top 85%',
        onEnter: batch => gsap.to(batch, {opacity: 1, y: 0, stagger: 0.15, overwrite: true})
    });

    // Projects
    ScrollTrigger.batch('.project-card', {
        start: 'top 85%',
        onEnter: batch => gsap.to(batch, {opacity: 1, y: 0, stagger: 0.15, overwrite: true})
    });
    
    // Achievements
    ScrollTrigger.batch('.achievement-card', {
        start: 'top 90%',
        onEnter: batch => gsap.to(batch, {opacity: 1, y: 0, stagger: 0.1, overwrite: true})
    });
    
    // About
    gsap.fromTo('.about-text', 
        { opacity: 0, x: -50 },
        {
            scrollTrigger: { trigger: '.about-text', start: 'top 80%' },
            opacity: 1, x: 0, duration: 1, ease: 'power3.out'
        }
    );
    gsap.fromTo('.about-visual', 
        { opacity: 0, x: 50 },
        {
            scrollTrigger: { trigger: '.about-visual', start: 'top 80%' },
            opacity: 1, x: 0, duration: 1, ease: 'power3.out'
        }
    );

    // Contact
    gsap.fromTo('.contact-info', 
        { opacity: 0, x: -30 },
        {
            scrollTrigger: { trigger: '.contact-info', start: 'top 80%' },
            opacity: 1, x: 0, duration: 1
        }
    );
    gsap.fromTo('.contact-form-container', 
        { opacity: 0, x: 30 },
        {
            scrollTrigger: { trigger: '.contact-form-container', start: 'top 80%' },
            opacity: 1, x: 0, duration: 1
        }
    );

    // --- 5. Scroll Progress Bar ---
    gsap.to('.scroll-progress', {
        width: '100%',
        scrollTrigger: {
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0
        }
    });

    // --- 6. Mobile Menu ---
    const hamburger = document.getElementById('hamburger');
    const closeMenu = document.getElementById('closeMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.remove('hidden');
            mobileMenu.classList.add('flex');
            gsap.fromTo(mobileMenu, {opacity: 0}, {opacity: 1, duration: 0.3});
        });
        
        const closeMobileMenu = () => {
            gsap.to(mobileMenu, {opacity: 0, duration: 0.3, onComplete: () => {
                mobileMenu.classList.add('hidden');
                mobileMenu.classList.remove('flex');
            }});
        };

        closeMenu.addEventListener('click', closeMobileMenu);
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
    }

    // --- 7. Canvas Particles ---
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        
        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.2;
                this.vy = (Math.random() - 0.5) * 0.2;
                this.size = Math.random() * 2;
                this.alpha = Math.random() * 0.5;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }
            draw() {
                ctx.fillStyle = `rgba(0, 255, 255, ${this.alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 60; i++) particles.push(new Particle());

        function animate() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate); 
        }
        animate();
    }
});
