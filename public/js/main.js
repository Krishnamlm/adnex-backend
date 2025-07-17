// Header Scroll




// Owl Carousel
$(document).ready(function() {
    $(".client-slider-section").owlCarousel({
        items: 4,
        loop: true,
        nav: false,
        autoplay: true,
        autoplayTimeout: 2000,
        autoplayHoverPause: true,
        responsiveClass: true,
        responsive: {
            0: {
                items: 2
            },
            600: {
                items: 3
            },
            1000: {
                items: 6
            }
        }
    });
});

$(document).ready(function() {
$('.user-upload-img').magnificPopup({
  delegate: 'a', // child items selector, by clicking on it popup will open
  type: 'image',
	gallery: {
	enabled: true
	}
  // other options
});
});
document.addEventListener('DOMContentLoaded', () => {
    const counters = document.querySelectorAll('.number');
    const speed = 200; // The lower the number, the faster the count

    // Function to start the counting animation for a single counter
    const animateCounter = (counter) => {
        const target = +counter.getAttribute('data-target'); // Get target number
        const count = +counter.innerText; // Get current displayed number

        // Calculate increment step
        const increment = target / speed;

        if (count < target) {
            counter.innerText = Math.ceil(count + increment);
            setTimeout(() => animateCounter(counter), 1); // Call itself rapidly
        } else {
            counter.innerText = target.toLocaleString(); // Format with commas at the end
        }
    };

    // --- Optional: Add Intersection Observer for animation on scroll ---
    // This makes the animation start only when the section is visible

    const options = {
        root: null, // relative to the viewport
        rootMargin: '0px',
        threshold: 0.5 // Trigger when 50% of the target is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // If the section is visible, start animating counters within it
                const sectionCounters = entry.target.querySelectorAll('.number');
                sectionCounters.forEach(counter => {
                    animateCounter(counter);
                });
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    }, options);

    // Observe the facts-figures-section
    const factsSection = document.querySelector('.facts-figures-section');
    if (factsSection) {
        observer.observe(factsSection);
    } else {
        // Fallback: If no Intersection Observer, just animate all counters on page load
        counters.forEach(counter => {
            animateCounter(counter);
        });
    }
});
/* selected services */

document.addEventListener('DOMContentLoaded', function() {
    const serviceButtons = document.querySelectorAll('.service-btn');
    const selectedServicesInput = document.getElementById('selectedServices');
    let selectedServices = new Set();

    serviceButtons.forEach(button => {
        button.addEventListener('click', function() {
            const service = this.dataset.service;
            if (this.classList.contains('selected')) {
                this.classList.remove('selected');
                selectedServices.delete(service);
            } else {
                this.classList.add('selected');
                selectedServices.add(service);
            }
            // THIS LINE IS CRUCIAL: It updates the hidden input's value
            selectedServicesInput.value = Array.from(selectedServices).join(', ');

            // Optional: Add a console log to verify in real-time
            console.log("Selected Services:", selectedServicesInput.value);
        });
    });
});


  window.onload = function () {
    setTimeout(function () {
      document.getElementById('popup-banner').style.display = 'block';
    }, 1000); // 1 second delay after page load
  };

  function closePopup() {
    document.getElementById('popup-banner').style.display = 'none';
  }


  document.addEventListener('DOMContentLoaded', () => {
    // Check if the element exists to prevent errors on other pages
    const bannerSection = document.getElementById('home');
    if (!bannerSection) return;

    // Split words/lines for staggered animation
    const textRevealElements = document.querySelectorAll('.anim-text-reveal');
    textRevealElements.forEach(element => {
        const textContent = element.innerHTML;
        element.innerHTML = ''; // Clear original content

        // Split by lines (assuming <br> for lines, or split by words if no <br>)
        const lines = textContent.split('<br>');
        lines.forEach((line, lineIndex) => {
            const lineSpan = document.createElement('span');
            lineSpan.style.display = 'inline-block'; // Allow wrapping
            lineSpan.style.overflow = 'hidden';

            const wordSpans = line.split(' ').map(word => {
                const wordSpan = document.createElement('span');
                wordSpan.textContent = word + ' '; // Add space back
                wordSpan.style.display = 'inline-block'; // Needed for individual word animation
                wordSpan.style.transform = 'translateY(100%)'; // Start off-screen
                wordSpan.style.opacity = '0'; // Hidden initially
                return wordSpan;
            });
            wordSpans.forEach(span => lineSpan.appendChild(span));
            element.appendChild(lineSpan);
            if (lineIndex < lines.length - 1) {
                element.appendChild(document.createElement('br')); // Re-add line breaks
            }
        });
    });

    const observerOptions = {
        root: null, // relative to the viewport
        rootMargin: '0px',
        threshold: 0.2 // Trigger when 20% of the element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;

                if (target.classList.contains('anim-text-reveal')) {
                    // Stagger word/line animation
                    const wordSpans = target.querySelectorAll('.anim-text-reveal > span > span');
                    wordSpans.forEach((span, index) => {
                        setTimeout(() => {
                            span.style.transform = 'translateY(0)';
                            span.style.opacity = '1';
                        }, index * 80); // Stagger by 80ms per word
                    });
                } else if (target.classList.contains('anim-text-fade-in') || target.classList.contains('anim-fade-up')) {
                    target.classList.add('is-visible');
                }

                // Optional: Stop observing after animation
                observer.unobserve(target);
            }
        });
    }, observerOptions);

    // Observe banner elements
    document.querySelectorAll('.Hub, .banner-title, .banner-title-text, .learn-more-btn-section').forEach(element => {
        observer.observe(element);
    });

    // Handle hero image wrapper 3D tilt on mouse movement
    const heroImageWrapper = document.querySelector('.hero-image-wrapper');
    if (heroImageWrapper) {
        heroImageWrapper.addEventListener('mousemove', (e) => {
            const rect = heroImageWrapper.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const rotateX = (e.clientY - centerY) / 25; // Adjust divisor for sensitivity
            const rotateY = (centerX - e.clientX) / 25; // Adjust divisor for sensitivity

            heroImageWrapper.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        heroImageWrapper.addEventListener('mouseleave', () => {
            heroImageWrapper.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // Get a reference to the WhatsApp image icon
    const whatsappIcon = document.querySelector('.whatsapp-float img');

    if (whatsappIcon) {
        // Add a click event listener to the icon
        whatsappIcon.addEventListener('click', () => {
            // Add the 'zoom-clicked' class to trigger the CSS animation
            whatsappIcon.classList.add('zoom-clicked');

            // Listen for the 'animationend' event on the icon
            // This ensures we remove the class only after the animation finishes
            const handleAnimationEnd = () => {
                whatsappIcon.classList.remove('zoom-clicked');
                // Remove the event listener itself to prevent it from being called multiple times
                whatsappIcon.removeEventListener('animationend', handleAnimationEnd);
            };

            whatsappIcon.addEventListener('animationend', handleAnimationEnd);
        });
    }
});
