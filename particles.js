document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) {
        console.error("Particle Canvas element not found!");
        return;
    }
    const ctx = canvas.getContext('2d');

    let particles = [];
    let animationFrameId;
    let currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';

    // --- Configuration ---
    const config = {
        particleCount: 120,       // Number of particles
        maxDistance: 250,        // Max distance to draw a line
        particleSpeed: 0.3,      // Max speed of particles
        particleRadius: 4,       // Size of particles
        lineWidth: 0.8,          // Thickness of connecting lines
        mouseRadius: 200,        // Radius around mouse to interact/draw lines
        themeColors: {
            light: {
                particleColor: 'rgba(44, 62, 80, 0.7)',   // --header-color slightly transparent
                lineColor: 'rgba(44, 62, 80, 0.2)',      // --header-color more transparent
            },
            dark: {
                particleColor: 'rgba(224, 224, 224, 0.6)', // --dark-text-color slightly transparent
                lineColor: 'rgba(224, 224, 224, 0.15)',   // --dark-text-color more transparent
            }
        }
    };

    let mouse = {
        x: null,
        y: null
    };

    // --- Helper Functions ---
    function getThemeColors() {
        return config.themeColors[currentTheme];
    }

    function getRandom(min, max) {
        return Math.random() * (max - min) + min;
    }

    // --- Particle Class ---
    class Particle {
        constructor() {
            this.radius = getRandom(config.particleRadius * 0.5, config.particleRadius * 1.5);
            this.x = getRandom(this.radius, canvas.width - this.radius);
            this.y = getRandom(this.radius, canvas.height - this.radius);
            this.vx = getRandom(-config.particleSpeed, config.particleSpeed);
            this.vy = getRandom(-config.particleSpeed, config.particleSpeed);
            // Ensure particles are not completely static
            if (this.vx === 0) this.vx = 0.1;
            if (this.vy === 0) this.vy = 0.1;
        }

        draw() {
            const colors = getThemeColors();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = colors.particleColor;
            ctx.fill();
        }

        update() {
            // Movement
            this.x += this.vx;
            this.y += this.vy;

            // Boundary check (bounce off edges)
            if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
                this.vx = -this.vx;
                // Adjust position slightly to prevent sticking
                this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
            }
            if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
                this.vy = -this.vy;
                // Adjust position slightly
                this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
            }
        }
    }

    // --- Core Logic ---
    function init() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = []; // Clear existing particles
        for (let i = 0; i < config.particleCount; i++) {
            particles.push(new Particle());
        }
        startAnimation(); // Start animation after init
    }

    function connectParticles() {
        const colors = getThemeColors();
        ctx.lineWidth = config.lineWidth;

        for (let i = 0; i < particles.length; i++) {
            // Connect particles to each other
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.maxDistance) {
                    const opacity = 1 - distance / config.maxDistance;
                    // Extract RGB from theme color and apply dynamic opacity
                    const baseColor = colors.lineColor.match(/\d+/g).slice(0, 3).join(', '); // "r, g, b"
                    ctx.strokeStyle = `rgba(${baseColor}, ${Math.max(0, opacity * parseFloat(colors.lineColor.match(/[\d\.]+/g)[3] || 1))})`; // Use base opacity from theme

                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }

            // Connect particles to mouse (optional)
            if (mouse.x !== null && mouse.y !== null) {
                const dxMouse = particles[i].x - mouse.x;
                const dyMouse = particles[i].y - mouse.y;
                const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

                if (distanceMouse < config.mouseRadius) {
                    const opacity = 1 - distanceMouse / config.mouseRadius;
                     const baseColor = colors.lineColor.match(/\d+/g).slice(0, 3).join(', ');
                    // Make mouse lines slightly more prominent if desired
                    ctx.strokeStyle = `rgba(${baseColor}, ${Math.max(0, opacity * 0.5)})`; // Example: higher base opacity for mouse lines
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Draw connections
        connectParticles();

        // Loop
        animationFrameId = requestAnimationFrame(animate);
    }

     function startAnimation() {
        if (!animationFrameId) {
            animate();
        }
    }

    function stopAnimation() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    // --- Event Listeners ---
    function handleResize() {
        stopAnimation(); // Stop while resizing
        init(); // Reinitialize canvas and particles
    }

    // Debounce resize handler for performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 250); // Adjust delay as needed
    });

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

     // --- Theme Change Handling ---
    // We need a way to detect theme changes. Since your theme toggle is in another
    // script block, we can use a MutationObserver on the body's class attribute.

    const themeObserver = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const newTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
                if (newTheme !== currentTheme) {
                    // console.log(`Theme changed to: ${newTheme}`); // Debug
                    currentTheme = newTheme;
                    // No need to re-init, colors are fetched dynamically in draw/connect
                    // If you had static colors set during init, you'd call init() here.
                }
                break; // Only need to check one mutation
            }
        }
    });

    themeObserver.observe(document.body, { attributes: true });


    // --- Initial Setup ---
    init();

}); // End DOMContentLoaded
