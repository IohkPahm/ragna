// Trình theo dõi lỗi trực quan hiển thị trực tiếp trên màn hình
        window.onerror = function(msg, url, line, col, error) {
            var div = document.createElement('div');
            div.style.position = 'fixed';
            div.style.bottom = '10px';
            div.style.left = '10px';
            div.style.background = 'red';
            div.style.color = 'white';
            div.style.padding = '10px';
            div.style.zIndex = '99999';
            div.style.fontSize = '14px';
            div.innerText = 'Lỗi JS: ' + msg + ' tại dòng ' + line + ':' + col;
            document.body.appendChild(div);
        };
        window.addEventListener('unhandledrejection', function(event) {
            var div = document.createElement('div');
            div.style.position = 'fixed';
            div.style.bottom = '50px';
            div.style.left = '10px';
            div.style.background = 'orange';
            div.style.color = 'white';
            div.style.padding = '10px';
            div.style.zIndex = '99999';
            div.style.fontSize = '14px';
            div.innerText = 'Promise lỗi: ' + event.reason;
            document.body.appendChild(div);
        });

        function logDebug(message) {
            console.log("[DEBUG]", message);
        }

        function prepareTextRevealAndMagnetic(selector, isReveal) {
            const el = document.querySelector(selector);
            if (!el) return;
            const html = el.innerHTML;
            const lines = html.split(/<br\s*\/?>/i);
            let resultHTML = '';
            
            let globalCharIndex = 0;
            
            lines.forEach((line, lineIdx) => {
                const words = line.trim().split(/\s+/);
                words.forEach((word, wordIdx) => {
                    if (word.length > 0) {
                        let wordHTML = '';
                        for (let ch of word) {
                            wordHTML += `<span class="magnetic-char" data-index="${globalCharIndex}">${ch}</span>`;
                            globalCharIndex++;
                        }
                        
                        if (isReveal) {
                            resultHTML += `<span class="reveal-word">${wordHTML}</span>`;
                        } else {
                            resultHTML += wordHTML;
                        }
                        
                        if (wordIdx < words.length - 1) {
                            if (isReveal) {
                                resultHTML += ' ';
                            } else {
                                resultHTML += `<span class="magnetic-space">&nbsp;</span>`;
                            }
                        }
                    }
                });
                if (lineIdx < lines.length - 1) {
                    resultHTML += '<br>';
                }
            });
            el.innerHTML = resultHTML;
            return globalCharIndex;
        }

        class MagneticFieldManager {
            constructor() {
                this.container = document.querySelector('.scroll-container');
                if (!this.container) return;
                
                this.mouse = { x: -9999, y: -9999, active: false };
                this.chars = [];
                this.cacheInvalidated = true;
                this.time = 0;
                this.lastTs = null;
                
                // Theme colors: white text that wakes to cyan/blue (synergy with Ragna's blue eyes)
                this.textColor = 'rgba(255, 255, 255, 0.85)';
                this.wakeColorA = '#00e5ff'; // Electric cyan
                this.wakeColorB = '#0055ff'; // Deep blue
                
                this.init();
            }
            
            init() {
                // Prepare all texts
                prepareTextRevealAndMagnetic('.title-ragna', false);
                prepareTextRevealAndMagnetic('.subtitle-hope', false);
                prepareTextRevealAndMagnetic('.left-text-block', true);
                prepareTextRevealAndMagnetic('.right-text-block', true);
                
                // Setup mouse event listeners on scroll-container
                this.container.addEventListener('mousemove', (e) => {
                    const rect = this.container.getBoundingClientRect();
                    this.mouse.x = e.clientX - rect.left;
                    this.mouse.y = e.clientY - rect.top;
                    this.mouse.active = true;
                });
                
                this.container.addEventListener('mouseleave', () => {
                    this.mouse.active = false;
                });
                
                // Invalidate cache on resize or scroll
                const invalidate = () => { this.cacheInvalidated = true; };
                window.addEventListener('resize', invalidate);
                window.addEventListener('scroll', invalidate, true);
                
                // Collect elements
                const els = document.querySelectorAll('.magnetic-char');
                els.forEach((el, idx) => {
                    let radius = 110;
                    let strength = 15;
                    let rotation = 4;
                    let isIdleEnabled = true;
                    
                    if (el.closest('.title-ragna')) {
                        radius = 200;
                        strength = 45;
                        rotation = 8;
                    } else if (el.closest('.subtitle-hope')) {
                        radius = 150;
                        strength = 25;
                        rotation = 6;
                    } else if (el.closest('.left-text-block') || el.closest('.right-text-block')) {
                        isIdleEnabled = false; // Tắt thở để tránh repainting liên tục cho 350+ chữ nhỏ
                    }
                    
                    this.chars.push({
                        el: el,
                        cx: 0,
                        cy: 0,
                        dx: 0,
                        dy: 0,
                        rotate: 0,
                        scale: 1,
                        wake: 0,
                        radius: radius,
                        strength: strength,
                        rotation: rotation,
                        index: idx,
                        isIdleEnabled: isIdleEnabled,
                        lastTransform: '',
                        lastColor: '',
                        lastShadow: ''
                    });
                });
            }
            

            
            rebuildCache() {
                const containerRect = this.container.getBoundingClientRect();
                this.chars.forEach(char => {
                    const r = char.el.getBoundingClientRect();
                    char.cx = r.left - containerRect.left + r.width / 2;
                    char.cy = r.top - containerRect.top + r.height / 2;
                });
                this.cacheInvalidated = false;
            }
            
            parseColor(color) {
                const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
                if (hexMatch) {
                    let hex = hexMatch[1];
                    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                    return {
                        r: parseInt(hex.substring(0,2), 16),
                        g: parseInt(hex.substring(2,4), 16),
                        b: parseInt(hex.substring(4,6), 16)
                    };
                }
                const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                if (rgbMatch) {
                    return {
                        r: parseInt(rgbMatch[1]),
                        g: parseInt(rgbMatch[2]),
                        b: parseInt(rgbMatch[3])
                    };
                }
                return { r: 255, g: 255, b: 255 };
            }
            
            lerpColor(colorA, colorB, t) {
                const a = this.parseColor(colorA);
                const b = this.parseColor(colorB);
                const clamped = Math.max(0, Math.min(1, t));
                const r = Math.round(a.r + (b.r - a.r) * clamped);
                const g = Math.round(a.g + (b.g - a.g) * clamped);
                const bl = Math.round(a.b + (b.b - a.b) * clamped);
                return `rgb(${r}, ${g}, ${bl})`;
            }
            
            animate(ts) {
                
                if (this.lastTs === null) this.lastTs = ts;
                const dt = (ts - this.lastTs) / 1000;
                this.lastTs = ts;
                this.time += dt;
                
                if (this.cacheInvalidated) {
                    this.rebuildCache();
                }
                
                const totalChars = this.chars.length;
                
                this.chars.forEach(char => {
                    let target = { dx: 0, dy: 0, rotate: 0, scale: 1, proximity: 0 };
                    
                    if (this.mouse.active) {
                        const distX = char.cx - this.mouse.x;
                        const distY = char.cy - this.mouse.y;
                        const dist = Math.sqrt(distX * distX + distY * distY);
                        
                        if (dist < char.radius && dist > 0.01) {
                            const normalizedDist = dist / char.radius;
                            const falloff = 1 - normalizedDist * normalizedDist * normalizedDist;
                            target.proximity = falloff;
                            
                            const dirX = distX / dist;
                            const dirY = distY / dist;
                            
                            // Repel mode
                            const force = falloff * char.strength;
                            target.dx = dirX * force;
                            target.dy = dirY * force;
                            target.rotate = dirX * falloff * char.rotation * 0.5;
                            target.scale = 1 + falloff * 0.08;
                        }
                    }
                    
                    let idleY = 0;
                    let idleScale = 1;
                    const isIdle = target.proximity < 0.05;
                    
                    if (isIdle && char.isIdleEnabled) {
                        const normalizedIndex = totalChars > 1 ? char.index / (totalChars - 1) : 0.5;
                        const wave1 = Math.sin(this.time * 0.8 + normalizedIndex * Math.PI * 2.5) * 0.55;
                        const wave2 = Math.sin(this.time * 1.4 + normalizedIndex * Math.PI * 4 + 1.5) * 0.25;
                        const wave3 = Math.sin(this.time * 0.45 + char.index * 0.3 + 2.8) * 0.2;
                        const combined = wave1 + wave2 + wave3;
                        idleY = combined * 3;
                        idleScale = 1 + combined * 0.012;
                    }
                    
                    const elasticity = 0.12;
                    const lerpRate = isIdle ? Math.min(0.25, elasticity * 3) : elasticity;
                    
                    const targetDx = target.dx;
                    const targetDy = target.dy + idleY;
                    const targetRotate = target.rotate;
                    const targetScale = target.proximity > 0.05 ? target.scale : idleScale;
                    
                    char.dx += (targetDx - char.dx) * lerpRate;
                    char.dy += (targetDy - char.dy) * lerpRate;
                    char.rotate += (targetRotate - char.rotate) * lerpRate;
                    char.scale += (targetScale - char.scale) * lerpRate;
                    
                    const wakeDecay = 0.92;
                    const targetWake = target.proximity * 0.8;
                    char.wake = Math.max(char.wake * wakeDecay, targetWake);
                    
                    let color = this.textColor;
                    let textShadow = 'none';
                    
                    if (char.wake > 0.02) {
                        const wakeProgress = Math.min(1, char.wake);
                        const midColor = this.lerpColor(this.textColor, this.wakeColorA, wakeProgress * 0.9);
                        color = this.lerpColor(midColor, this.wakeColorB, wakeProgress * 0.4);
                    }
                    
                    if (char.wake > 0.05) {
                        const glowSize = char.wake * 10;
                        const glowOpacity = char.wake * 0.5;
                        textShadow = `0 0 ${glowSize}px ${this.wakeColorA}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}, 0 0 ${glowSize * 2}px ${this.wakeColorB}${Math.round(glowOpacity * 100).toString(16).padStart(2, '0')}`;
                    }
                    
                    // Tối ưu hóa: Chỉ cập nhật DOM nếu có thay đổi thực sự (Dirty checking)
                    const transformStr = `translate(${char.dx.toFixed(2)}px, ${char.dy.toFixed(2)}px) rotate(${char.rotate.toFixed(1)}deg) scale(${char.scale.toFixed(3)})`;
                    
                    if (char.lastTransform !== transformStr) {
                        char.el.style.transform = transformStr;
                        char.lastTransform = transformStr;
                    }
                    if (char.lastColor !== color) {
                        char.el.style.color = color;
                        char.lastColor = color;
                    }
                    if (char.lastShadow !== textShadow) {
                        char.el.style.textShadow = textShadow;
                        char.lastShadow = textShadow;
                    }
                });
                
                if (this.isActive) {
                    requestAnimationFrame((ts) => this.animate(ts));
                }
            }
        }

        // Khởi tạo Magnetic Field Manager ngay lập tức để tạo thẻ spans trước khi GSAP khởi chạy
        window.magneticManager = new MagneticFieldManager();

        // ═══════════════════════════════════════
        // LENIS SMOOTH SCROLLING INITIALIZATION
        // ═══════════════════════════════════════
        const lenis = new Lenis({
            duration: 1.4, // Thời gian trượt (giây) - tăng nhẹ để cuộn siêu êm
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
            smoothWheel: true,
            smoothTouch: false,
        });

        // Cập nhật ScrollTrigger của GSAP mỗi khi Lenis scroll
        lenis.on('scroll', ScrollTrigger.update);

        // Đưa hàm animation frame của Lenis vào gsap ticker để đồng bộ FPS
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });

        // Tắt lagSmoothing của GSAP để tránh giật khi chuyển tab/lag nhẹ
        gsap.ticker.lagSmoothing(0);

        // ═══════════════════════════════════════
        // SHADERS & WEBGL COMPONENT FOR BURN TRANSITION
        // ═══════════════════════════════════════
        const vertexShaderSource = `
          attribute vec2 aPosition;
          varying vec2 vUv;

          void main() {
            vUv = aPosition * 0.5 + 0.5;
            gl_Position = vec4(aPosition, 0.0, 1.0);
          }
        `;

        const fragmentShaderSource = `
          precision mediump float;

          varying vec2 vUv;
          uniform vec3 uColor;
          uniform vec3 uTransitionColor;
          uniform float uNoiseScale;
          uniform float uNoiseIntensity;
          uniform float uTime;
          uniform float uProgress;
          uniform float uEdgeSoftness;
          uniform float uBloom;
          uniform float uMovementX;
          uniform float uMovementY;
          uniform float uParallax;
          uniform float uAspect;

          uniform sampler2D uHeroTexture;

          float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
          }

          float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }

          float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 3; i++) {
              value += amplitude * noise(st);
              st *= 2.03;
              amplitude *= 0.5;
            }
            return value;
          }

          float detailedNoise(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            for (int i = 0; i < 3; i++) {
              value += amplitude * noise(st);
              st *= 2.25;
              amplitude *= 0.45;
            }
            return value;
          }

          void main() {
            if (uProgress <= -0.15) {
              gl_FragColor = texture2D(uHeroTexture, vUv);
              return;
            }
            if (uProgress >= 1.12) {
              discard;
            }

            float scale = mix(1.0, 20.0, clamp(uNoiseScale, 0.0, 1.0));
            float intensity = mix(0.0, 0.5, clamp(uNoiseIntensity, 0.0, 1.0));
            float softness = mix(0.01, 0.2, clamp(uEdgeSoftness, 0.0, 1.0));
            float grainScale = 82.0;
            float horizontalOffset = uTime * uMovementX;
            float verticalOffset = uTime * uMovementY;
            float baseLine = mix(-0.18, 1.18, clamp(uProgress, 0.0, 1.0)) + uParallax;

            vec2 edgeCoord = vec2(
              vUv.x * uAspect * scale + horizontalOffset,
              vUv.y * 3.0 + verticalOffset * 0.6
            );
            float edgeNoise = fbm(edgeCoord);
            float mainEdge = baseLine + (edgeNoise - 0.5) * intensity;

            vec2 thickCoord = vec2(
              vUv.x * uAspect * scale * 2.35 + horizontalOffset * 0.7,
              vUv.y * 2.0 + verticalOffset * 0.4 + 100.0
            );
            float thicknessNoise = fbm(thickCoord);
            float localThickness = mix(softness * 0.1, softness, thicknessNoise);
            float lowerBound = mainEdge - localThickness * 0.45;
            float upperBound = mainEdge + localThickness * 0.65;

            vec2 grainCoord = vec2(
              vUv.x * uAspect * grainScale * 3.0 + horizontalOffset * 0.5,
              vUv.y * grainScale * 3.0 + verticalOffset * 0.3
            );
            float grain = detailedNoise(grainCoord);
            vec2 fiberCoord = vec2(
              vUv.x * uAspect * grainScale * 8.0 + horizontalOffset * 0.3,
              vUv.y * grainScale * 2.0 + verticalOffset * 0.2
            );
            float fiber = noise(fiberCoord);
            float combinedGrain = grain * 0.62 + fiber * 0.38;

            float distToEdge = abs(vUv.y - mainEdge);
            float glow = smoothstep(localThickness * 2.8, 0.0, distToEdge) * uBloom;
            vec3 glowColor = uTransitionColor * glow * 1.25;

            vec4 heroCol = texture2D(uHeroTexture, vUv);

            if (vUv.y > upperBound) {
              gl_FragColor = vec4(min(heroCol.rgb + glowColor * 0.35, vec3(1.0)), heroCol.a);
            } else if (vUv.y > mainEdge) {
              float t = (upperBound - vUv.y) / max(upperBound - mainEdge, 0.001);
              float grainThreshold = 1.0 - pow(t, 1.45) - thicknessNoise * 0.2;
              vec3 color = combinedGrain > grainThreshold ? uTransitionColor : heroCol.rgb;
              gl_FragColor = vec4(min(color + glowColor, vec3(1.0)), heroCol.a);
            } else if (vUv.y > lowerBound) {
              float t = (mainEdge - vUv.y) / max(mainEdge - lowerBound, 0.001);
              float grainThreshold = pow(t, 1.15) + thicknessNoise * 0.15;
              if (combinedGrain > grainThreshold) {
                float alpha = mix(1.0, 0.45, t);
                vec3 edgeGlow = min(uTransitionColor + glowColor, vec3(1.0));
                gl_FragColor = vec4(edgeGlow, alpha * heroCol.a);
              } else if (glow > 0.02) {
                gl_FragColor = vec4(uTransitionColor, glow * 0.46 * heroCol.a);
              } else {
                discard;
              }
            } else if (glow > 0.03) {
              gl_FragColor = vec4(uTransitionColor, glow * 0.34 * heroCol.a);
            } else {
              discard;
            }
          }
        `;

        function clamp(value, min, max) {
          return Math.max(min, Math.min(max, value));
        }

        function parseHexColor(value, fallback = [0.85, 0.84, 0.79]) {
          if (!value || typeof value !== "string") return fallback;
          const hex = value.replace("#", "").trim();
          if (hex.length !== 3 && hex.length !== 6) return fallback;
          const full = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
          return [
            parseInt(full.slice(0, 2), 16) / 255,
            parseInt(full.slice(2, 4), 16) / 255,
            parseInt(full.slice(4, 6), 16) / 255
          ];
        }

        function createShader(gl, type, source) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(info || "Shader compile failed");
          }
          return shader;
        }

        function createProgram(gl, vertexSource, fragmentSource) {
          const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
          const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
          const program = gl.createProgram();
          gl.attachShader(program, vertex);
          gl.attachShader(program, fragment);
          gl.linkProgram(program);
          gl.deleteShader(vertex);
          gl.deleteShader(fragment);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(info || "Program link failed");
          }
          return program;
        }

        class BurnTransition extends HTMLElement {
          static observedAttributes = [
            "color",
            "transition-color",
            "noise-scale",
            "noise-intensity",
            "edge-softness",
            "bloom",
            "speed",
            "movement-x",
            "movement-y",
            "parallax",
            "progress"
          ];

          constructor() {
            super();
            this.attachShadow({ mode: "open" });
            this.canvas = document.createElement("canvas");
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: block;
                  position: relative;
                  overflow: hidden;
                  contain: content;
                }

                canvas {
                  display: block;
                  width: 100%;
                  height: 100%;
                }
              </style>
            `;
            this.shadowRoot.append(this.canvas);
            this.progress = 0.5;
            this.startProgress = 0.5;
            this.targetProgress = 0.5;
            this.resize = this.resize.bind(this);
            this.texturesReady = false;
            this.heroImageElement = null;
          }

          connectedCallback() {
            this.init();
            this.resizeObserver = new ResizeObserver(this.resize);
            this.resizeObserver.observe(this);
            
            // Khôi phục texture nếu đã có sẵn ảnh nguồn lưu trong class
            if (this.heroImageElement) {
              this.setupTextures(this.heroImageElement);
            }

            if (this.hasAttribute("progress")) {
              this.progress = clamp(Number(this.getAttribute("progress")), -0.2, 1.2);
            }
            this.render();
          }

          disconnectedCallback() {
            this.resizeObserver?.disconnect();
            if (this.gl) {
              this.gl.deleteBuffer(this.buffer);
              this.gl.deleteProgram(this.program);
              if (this.heroTexture) this.gl.deleteTexture(this.heroTexture);
            }
            this.texturesReady = false;
            this.heroTexture = null;
            this.gl = null;
            this.program = null;
          }

          attributeChangedCallback() {
            const externalProgress = this.externalProgress;
            if (externalProgress !== null) {
              this.progress = externalProgress;
            }
            this.render();
          }

          get speed() {
            return Number(this.getAttribute("speed") || 0.1);
          }

          get shouldParallax() {
            return this.getAttribute("parallax") === "true";
          }

          get externalProgress() {
            if (!this.hasAttribute("progress")) return null;
            const value = Number(this.getAttribute("progress"));
            return Number.isFinite(value) ? clamp(value, -0.2, 1.2) : this.progress;
          }

          init() {
            this.gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
            if (!this.gl) return;
            this.program = createProgram(this.gl, vertexShaderSource, fragmentShaderSource);
            this.gl.useProgram(this.program);
            this.locations = {
              position: this.gl.getAttribLocation(this.program, "aPosition"),
              color: this.gl.getUniformLocation(this.program, "uColor"),
              transitionColor: this.gl.getUniformLocation(this.program, "uTransitionColor"),
              noiseScale: this.gl.getUniformLocation(this.program, "uNoiseScale"),
              noiseIntensity: this.gl.getUniformLocation(this.program, "uNoiseIntensity"),
              time: this.gl.getUniformLocation(this.program, "uTime"),
              progress: this.gl.getUniformLocation(this.program, "uProgress"),
              edgeSoftness: this.gl.getUniformLocation(this.program, "uEdgeSoftness"),
              bloom: this.gl.getUniformLocation(this.program, "uBloom"),
              movementX: this.gl.getUniformLocation(this.program, "uMovementX"),
              movementY: this.gl.getUniformLocation(this.program, "uMovementY"),
              parallax: this.gl.getUniformLocation(this.program, "uParallax"),
              aspect: this.gl.getUniformLocation(this.program, "uAspect"),
              
              heroTexture: this.gl.getUniformLocation(this.program, "uHeroTexture")
            };
            const vertices = new Float32Array([
              -1, -1,
              1, -1,
              -1, 1,
              -1, 1,
              1, -1,
              1, 1
            ]);
            this.buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
            this.gl.enableVertexAttribArray(this.locations.position);
            this.gl.vertexAttribPointer(this.locations.position, 2, this.gl.FLOAT, false, 0, 0);
          }

          setupTextures(heroImage) {
            this.heroImageElement = heroImage;
            if (!this.gl) return;
            const gl = this.gl;
            
            try {
                // Hero Texture
                this.heroTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.heroTexture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, heroImage);
                
                this.texturesReady = true;
                this.render();
            } catch(e) {
                console.error("Lỗi trong setupTextures:", e);
            }
          }

          resize() {
            if (!this.gl) return;
            const rect = this.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.max(1, Math.floor(rect.width * dpr));
            const height = Math.max(1, Math.floor(rect.height * dpr));
            if (this.canvas.width !== width || this.canvas.height !== height) {
              this.canvas.width = width;
              this.canvas.height = height;
            }
            this.gl.viewport(0, 0, width, height);
            this.render();
          }

          parallaxOffset() {
            if (!this.shouldParallax) return 0;
            const rect = this.getBoundingClientRect();
            const viewport = window.innerHeight || 1;
            const center = rect.top + rect.height * 0.5;
            return clamp((center / viewport - 0.5) * -0.28, -0.18, 0.18);
          }

          render() {
            if (this.lastLoggedProgress !== this.progress) {
                logDebug("Progress thay đổi: " + this.progress.toFixed(4));
                this.lastLoggedProgress = this.progress;
            }

            if (!this.gl || !this.program || !this.texturesReady) return;
            const gl = this.gl;
            const rect = this.getBoundingClientRect();
            const baseColor = parseHexColor(this.getAttribute("color") || "#d9d6ca");
            const transitionColor = parseHexColor(this.getAttribute("transition-color") || "#ff6f2a", [1, 0.44, 0.16]);
            gl.useProgram(this.program);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            
            // Sử dụng window.scrollY làm uTime để tạo sinh động bập bùng khi cuộn
            const timeValue = (window.scrollY || window.pageYOffset || 0) * 0.002;
            
            gl.uniform3f(this.locations.color, baseColor[0], baseColor[1], baseColor[2]);
            gl.uniform3f(this.locations.transitionColor, transitionColor[0], transitionColor[1], transitionColor[2]);
            gl.uniform1f(this.locations.noiseScale, Number(this.getAttribute("noise-scale") || 0.37));
            gl.uniform1f(this.locations.noiseIntensity, Number(this.getAttribute("noise-intensity") || 0.3));
            gl.uniform1f(this.locations.time, timeValue);
            gl.uniform1f(this.locations.progress, this.progress);
            gl.uniform1f(this.locations.edgeSoftness, Number(this.getAttribute("edge-softness") || 0.4));
            gl.uniform1f(this.locations.bloom, Number(this.getAttribute("bloom") || 0.5));
            gl.uniform1f(this.locations.movementX, Number(this.getAttribute("movement-x") || 0));
            gl.uniform1f(this.locations.movementY, Number(this.getAttribute("movement-y") || 0.5));
            gl.uniform1f(this.locations.parallax, this.parallaxOffset());
            gl.uniform1f(this.locations.aspect, rect.height > 0 ? rect.width / rect.height : 1);
            
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.heroTexture);
            gl.uniform1i(this.locations.heroTexture, 0);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
        }

        customElements.define("burn-transition", BurnTransition);

        // ═══════════════════════════════════════
        // IMAGE LOADING & TEXTURE SETUP
        // ═══════════════════════════════════════
        function loadImages(srcs) {
            return Promise.all(srcs.map(src => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('Failed to load image: ' + src));
                    img.src = src;
                });
            }));
        }

        logDebug("Đang bắt đầu tải ảnh...");
        loadImages(['assets/images/background.webp', 'assets/images/character-ragna.webp'])
            .then(([bgImg, charImg]) => {
                logDebug("Đã tải xong toàn bộ ảnh!");
                logDebug(`bgImg: ${bgImg.width}x${bgImg.height}`);
                logDebug(`charImg: ${charImg.width}x${charImg.height}`);
                
                const heroCanvas = document.createElement('canvas');
                heroCanvas.width = 1672;
                heroCanvas.height = 941;
                const ctx = heroCanvas.getContext('2d');
                ctx.drawImage(bgImg, 0, 0, 1672, 941);
                ctx.drawImage(charImg, 192, 51, 1344, 890);
                logDebug("Đã vẽ xong ảnh Hero lên Canvas ẩn");
                
                const burnOverlay = document.getElementById('burn-overlay');
                if (burnOverlay) {
                    logDebug("Đã tìm thấy phần tử burn-overlay, chuẩn bị gọi setupTextures...");
                    burnOverlay.setupTextures(heroCanvas);
                } else {
                    logDebug("Lỗi: Không tìm thấy phần tử #burn-overlay trong DOM!");
                }
            })
            .catch(err => {
                logDebug("Lỗi tải ảnh chuyển cảnh: " + err.message);
                console.error("Lỗi khi tải ảnh hiệu ứng chuyển cảnh:", err);
            });

        // ═══════════════════════════════════════
        // GSAP MASTER TIMELINE
        // ═══════════════════════════════════════
        gsap.registerPlugin(ScrollTrigger);

        const scrollPctEl = document.querySelector('.scroll-percentage');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: '.animation-wrapper',
                start: 'top top',
                end: '+=1500%', // Tăng quãng đường cuộn lên 1500% để làm chậm hoạt ảnh
                pin: true,
                scrub: true, // Trỏ 1:1 theo thanh cuộn (đã được làm mượt bởi Lenis)
                anticipatePin: 1,
                onUpdate: self => {
                    const pct = Math.round(self.progress * 100);
                    if (scrollPctEl) {
                        scrollPctEl.textContent = String(pct).padStart(2, '0') + '%';
                    }
                }
            }
        });

        // HỒI 1: MÀN ĐEN → MẮT SÁNG (0 – 19)
        tl.addLabel('eyes', 0)
          .to('.pre-intro-layer', {
              opacity: 0.112, // 40% của đích 0.28
              duration: 11.4, // Lăn 60% chặng đường đầu (tương đương mốc 11.4)
              ease: 'none'
          }, 'eyes')
          .to('.pre-intro-layer', {
              opacity: 0.28, // Đạt opacity tối đa 0.28 tại mốc 19% scroll
              duration: 7.6, // Lăn 40% chặng đường còn lại (từ mốc 11.4 đến 19)
              ease: 'none'
          });

        // HỒI 2: MẮT → LỘ TOÀN BỘ INTRO (19 – 40)
        tl.addLabel('reveal', 19)
          .to('.bg-darken', {
              opacity: 0,
              duration: 20,
              ease: 'power2.inOut'
          }, 'reveal')
          .to('.intro-layer', {
              opacity: 1,
              duration: 20,
              ease: 'power1.inOut'
          }, 'reveal')
          .to('.pre-intro-layer', {
              opacity: 0,
              duration: 8,
              ease: 'power2.in'
          }, 'reveal+=8'); // Bắt đầu mờ từ mốc 27 (19 + 8) và mờ hoàn toàn ở mốc 35 (27 + 8)

        // HỒI 3: INTRO → HERO (40 – 60)
        tl.addLabel('hero', 40)
          .to('.shared-bg', {
              backgroundSize: '100% 100%',
              duration: 20, // Co về 100% trong 20 đơn vị (đến mốc 60)
              ease: 'power2.inOut'
          }, 'hero')
          .fromTo('.intro-layer', {
              scale: 1,
              xPercent: 0,
              yPercent: 0
          }, {
              scale: 0.2924, // Thu nhỏ đồng bộ (1 / 3.42)
              xPercent: -0.51,
              yPercent: -19.12,
              duration: 20,
              ease: 'power2.inOut',
              immediateRender: false
          }, 'hero')
          .fromTo('.intro-layer', { opacity: 1 }, {
              opacity: 1, // Giữ nguyên ở 1 từ 40% đến 50%
              duration: 10,
              ease: 'none',
              immediateRender: false
          }, 'hero')
          .to('.intro-layer', {
              opacity: 0, // Giảm về 0 từ 50% đến 60%
              duration: 10,
              ease: 'power2.in',
              immediateRender: false
          }, 'hero+=10')
          .fromTo('.character-ragna',
              { 
                  scale: 3.4200, // Phóng to để đầu khớp 100% với intro-char
                  xPercent: 7.20,
                  yPercent: 76.07
              },
              { 
                  scale: 1,
                  xPercent: 0, 
                  yPercent: 0,
                  duration: 20, 
                  ease: 'power2.inOut',
                  immediateRender: false
              },
              'hero')
          .fromTo('.character-ragna',
              { opacity: 0 },
              { 
                  opacity: 1, // 55%: character-ragna đạt opacity = 1
                  duration: 15,
                  ease: 'power2.inOut',
                  immediateRender: false
              },
              'hero')
          .fromTo('.title-ragna',
              { opacity: 0, x: -20 },
              { opacity: 0.9, x: 0, duration: 8, ease: 'power3.out' },
              'hero+=8')
          .fromTo('.header-line',
              { scaleX: 0 },
              { scaleX: 1, duration: 6, ease: 'power3.out' },
              'hero+=10')
          .fromTo('.subtitle-hope',
              { opacity: 0, y: 10 },
              { opacity: 0.85, y: 0, duration: 6, ease: 'power3.out' },
              'hero+=12')
          .fromTo('.right-text-block',
              { opacity: 0, x: 15 },
              { opacity: 0.85, x: 0, duration: 8, ease: 'power3.out' },
              'hero+=12')
          .fromTo('.left-text-block',
              { opacity: 0, x: -15 },
              { opacity: 0.85, x: 0, duration: 8, ease: 'power3.out' },
              'hero+=14');

        // HỒI 3.5: HIỆU ỨNG TEXT SCROLL REVEAL (62 – 75)
        tl.addLabel('text-reveal', 62)
          .to('.left-text-block .reveal-word', {
              opacity: 1,
              stagger: {
                  amount: 8
              },
              duration: 2,
              ease: 'none'
          }, 'text-reveal')
          .to('.right-text-block .reveal-word', {
              opacity: 1,
              stagger: {
                  amount: 8
              },
              duration: 2,
              ease: 'none'
          }, 'text-reveal');

        // HỒI 4: HIỆU ỨNG THIÊU RỤI CHUYỂN CẢNH (75 – 100)
        tl.addLabel('burn', 75)
          .set('.under-layer', {
              opacity: 1
          }, 'burn')
          .set('.shared-bg, .hero-char-layer', {
              opacity: 0
          }, 'burn')
          .set('#burn-overlay', {
              opacity: 1
          }, 'burn')
          .to('#burn-overlay', {
              attr: { progress: 1.12 },
              duration: 24,
              ease: 'none'
          }, 'burn')
          .to('.title-ragna, .header-line, .subtitle-hope, .left-text-block, .right-text-block', {
              opacity: 0,
              duration: 10,
              ease: 'power2.out'
          }, 'burn');
