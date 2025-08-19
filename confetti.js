// Confetti animation library
// Based on https://www.kirilv.com/canvas-confetti/
(function() {
  var confetti = {
    maxCount: 150,
    speed: 2,
    frameInterval: 15,
    alpha: 1.0,
    gradient: false,
    start: null,
    stop: null,
    toggle: null,
    pause: null,
    resume: null,
    togglePause: null,
    remove: null,
    isPaused: null,
    isRunning: null
  };

  var supportsAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
  var colors = ["#a5374e", "#ff6b8b", "#ffda44", "#66bb6a", "#2e7d32", "#f06292", "#ba68c8", "#64b5f6", "#4db6ac"];
  var streamingConfetti = false;
  var pause = false;
  var lastFrameTime = Date.now();
  var particles = [];
  var waveAngle = 0;
  var context = null;
  var canvas = null;

  function resetParticle(particle, width, height) {
    particle.color = colors[(Math.random() * colors.length) | 0] + (confetti.alpha + ")");
    particle.color2 = colors[(Math.random() * colors.length) | 0] + (confetti.alpha + ")");
    particle.x = Math.random() * width;
    particle.y = Math.random() * height - height;
    particle.diameter = Math.random() * 10 + 5;
    particle.tilt = Math.random() * 10 - 10;
    particle.tiltAngleIncrement = Math.random() * 0.07 + 0.05;
    particle.tiltAngle = Math.random() * Math.PI;
    return particle;
  }

  function runAnimation() {
    if (pause)
      return;
    
    if (!context || !canvas)
      return;
      
    if (!streamingConfetti && particles.length === 0) {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvas.style.display = 'none';
      return;
    }
    
    var now = Date.now();
    var delta = now - lastFrameTime;
    if (!supportsAnimationFrame || delta > confetti.frameInterval) {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      updateParticles();
      drawParticles(context);
      lastFrameTime = now - (delta % confetti.frameInterval);
    }
    requestAnimationFrame(runAnimation);
  }

  function startConfetti() {
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("id", "confetti-canvas");
      canvas.setAttribute("style", "display:block;z-index:999999;pointer-events:none;position:fixed;top:0");
      document.body.prepend(canvas);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      window.addEventListener("resize", function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }, true);
      context = canvas.getContext("2d");
    }
    
    var width = window.innerWidth;
    var height = window.innerHeight;
    
    window.requestAnimationFrame = (function() {
      return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
          return window.setTimeout(callback, confetti.frameInterval);
        };
    })();
    
    if (streamingConfetti) {
      return;
    }
    
    streamingConfetti = true;
    particles = [];
    for (var i = 0; i < confetti.maxCount; i++) {
      particles.push(resetParticle({}, width, height));
    }
    canvas.style.display = 'block';
    runAnimation();
  }

  function stopConfetti() {
    streamingConfetti = false;
  }

  function removeConfetti() {
    stop();
    pause = false;
    if (canvas) {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvas.style.display = 'none';
    }
    particles = [];
  }

  function toggleConfetti() {
    if (streamingConfetti)
      stopConfetti();
    else
      startConfetti();
  }

  function pauseConfetti() {
    pause = true;
  }

  function resumeConfetti() {
    pause = false;
    runAnimation();
  }

  function toggleConfettiPause() {
    if (pause)
      resumeConfetti();
    else
      pauseConfetti();
  }

  function drawParticles(context) {
    var particle;
    var x, y, x2, y2;
    for (var i = 0; i < particles.length; i++) {
      particle = particles[i];
      context.beginPath();
      context.lineWidth = particle.diameter;
      x2 = particle.x + particle.tilt;
      y2 = particle.y + particle.tilt + particle.diameter / 2;
      
      if (confetti.gradient) {
        var gradient = context.createLinearGradient(particle.x, particle.y, x2, y2);
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1.0, particle.color2);
        context.strokeStyle = gradient;
      } else {
        context.strokeStyle = particle.color;
      }
      
      context.moveTo(particle.x, particle.y);
      context.lineTo(x2, y2);
      context.stroke();
    }
  }

  function updateParticles() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var particle;
    waveAngle += 0.01;
    for (var i = 0; i < particles.length; i++) {
      particle = particles[i];
      if (!streamingConfetti && particle.y < -15)
        particle.y = height + 100;
      else {
        particle.tiltAngle += particle.tiltAngleIncrement;
        particle.x += Math.sin(waveAngle) - 0.5;
        particle.y += (Math.cos(waveAngle) + particle.diameter + confetti.speed) * 0.5;
        particle.tilt = Math.sin(particle.tiltAngle) * 15;
      }
      
      if (particle.x > width + 20 || particle.x < -20 || particle.y > height) {
        if (streamingConfetti && particles.length <= confetti.maxCount)
          resetParticle(particle, width, height);
        else {
          particles.splice(i, 1);
          i--;
        }
      }
    }
  }

  confetti.start = startConfetti;
  confetti.stop = stopConfetti;
  confetti.toggle = toggleConfetti;
  confetti.pause = pauseConfetti;
  confetti.resume = resumeConfetti;
  confetti.togglePause = toggleConfettiPause;
  confetti.remove = removeConfetti;
  confetti.isPaused = function() { return pause; };
  confetti.isRunning = function() { return streamingConfetti; };

  window.confetti = confetti;
})();
