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

        function prepareTextReveal(selector) {
            const el = document.querySelector(selector);
            if (!el) return;
            const html = el.innerHTML;
            const lines = html.split(/<br\s*\/?>/i);
            let resultHTML = '';
            
            lines.forEach((line, lineIdx) => {
                const words = line.trim().split(/\s+/);
                words.forEach((word, wordIdx) => {
                    if (word.length > 0) {
                        let wordHTML = '';
                        for (let ch of word) {
                            wordHTML += `<span>${ch}</span>`;
                        }
                        resultHTML += `<span class="reveal-word">${wordHTML}</span>`;
                        
                        if (wordIdx < words.length - 1) {
                            resultHTML += ' ';
                        }
                    }
                });
                if (lineIdx < lines.length - 1) {
                    resultHTML += '<br>';
                }
            });
            el.innerHTML = resultHTML;
        }

        class GhostText {
            constructor(elementOrSelector, options = {}) {
                this.el = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) : elementOrSelector;
                if (!this.el) return;

                this.originalText = options.text || this.el.innerText.trim();
                this.glitchSpeed = options.glitchSpeed !== undefined ? options.glitchSpeed : 50;
                this.blockCharSet = options.blockCharSet || 'default';
                this.enableGlow = options.enableGlow !== undefined ? options.enableGlow : true;
                this.glowIntensity = options.glowIntensity !== undefined ? options.glowIntensity : 1;
                this.glowColor = options.glowColor || '#ffffff';
                this.textColor = options.textColor || '';
                this.hoverTextColor = options.hoverTextColor || '#ffffff';

                this.charSets = {
                    default: ["■","▇","▆","▅","▄","▃","▂","▁","▉","▊","▋","▌","▍","▎","▏"],
                    binary: ["0","1","0","1","0","1"],
                    matrix: ["0","1","2","3","4","5","6","7","8","9"],
                    symbols: ["#","$","%","&","*","@","!","?","\xa7"],
                    blocks: ["█","▓","▒","░","█","▓","▒","░"],
                    numbers: ["1","2","3","4","5","6","7","8","9","0"],
                    custom: ["●","○","◆","◇","▲","△","■","□"]
                };

                this.activeBlockChars = this.charSets[this.blockCharSet] || this.charSets.default;
                this.animationTimeout = null;
                this.isAnimating = false;

                this.init();
            }

            init() {
                const chars = this.originalText.split("");
                const spanHTML = chars.map((char, index) => {
                    const isRagnaDeco = this.el.classList.contains('title-ragna') && (index === 0 || index === chars.length - 1);
                    const cls = isRagnaDeco ? 'class="deco-letter"' : '';
                    return `<span ${cls} style="display: inline-block;">${char}</span>`;
                }).join("");

                this.el.innerHTML = `<span class="ghost-text-inner" style="display: inline-block; white-space: pre; overflow: visible; transition: color 0.3s ease, text-shadow 0.3s ease;">${spanHTML}</span>`;
                this.innerSpan = this.el.querySelector('.ghost-text-inner');
                this.charSpans = Array.from(this.innerSpan.children);

                if (this.textColor) {
                    this.innerSpan.style.color = this.textColor;
                }

                this.el.addEventListener('mouseenter', () => this.startDigitalHover());
                this.el.addEventListener('mouseleave', () => this.resetDigitalHover());
            }

            randomBlockChar() {
                return this.activeBlockChars[Math.floor(Math.random() * this.activeBlockChars.length)];
            }

            isSkippableChar(char) {
                return char === " " || /[.,!?;:'"()[\]{}\-_/]/.test(char);
            }

            buildGlitchText(textToGlitch, revealCount) {
                return textToGlitch.split("").map((char, index) => {
                    if (this.isSkippableChar(char)) return char;
                    if (index < revealCount) return char;
                    return this.randomBlockChar();
                }).join("");
            }

            lockSize() {
                if (this.innerSpan) {
                    const rect = this.innerSpan.getBoundingClientRect();
                    this.innerSpan.style.width = `${Math.ceil(rect.width)}px`;
                    this.innerSpan.style.height = `${Math.ceil(rect.height)}px`;
                }
            }

            unlockSize() {
                if (this.innerSpan) {
                    this.innerSpan.style.width = "";
                    this.innerSpan.style.height = "";
                }
            }

            getGlowEffect() {
                if (!this.enableGlow) return "none";
                const intensityMap = {
                    0: "none",
                    1: `0 0 8px ${this.glowColor}, 0 0 18px ${this.glowColor}, 0 0 36px ${this.glowColor}`,
                    2: `0 0 10px ${this.glowColor}, 0 0 22px ${this.glowColor}, 0 0 45px ${this.glowColor}`,
                    3: `0 0 12px ${this.glowColor}, 0 0 28px ${this.glowColor}, 0 0 55px ${this.glowColor}`,
                    4: `0 0 15px ${this.glowColor}, 0 0 35px ${this.glowColor}, 0 0 70px ${this.glowColor}`,
                    5: `0 0 20px ${this.glowColor}, 0 0 45px ${this.glowColor}, 0 0 90px ${this.glowColor}`
                };
                return intensityMap[this.glowIntensity] || intensityMap[1];
            }

            startDigitalHover() {
                if (this.isAnimating) return;
                this.isAnimating = true;

                if (this.innerSpan) {
                    this.innerSpan.style.color = this.hoverTextColor;
                    this.innerSpan.style.textShadow = this.getGlowEffect();
                }

                this.lockSize();

                const textChars = this.originalText.split("");
                const revealableCharsCount = textChars.filter(char => !this.isSkippableChar(char)).length;
                const holdSteps = 2;
                const endHoldSteps = 1;
                const totalSteps = holdSteps + revealableCharsCount + endHoldSteps;
                
                let step = 0;

                const animate = () => {
                    const revealCount = Math.max(0, step - holdSteps);
                    if (this.charSpans && this.charSpans.length > 0) {
                        this.charSpans.forEach((span, index) => {
                            const char = textChars[index];
                            if (this.isSkippableChar(char)) {
                                span.textContent = char;
                            } else if (index < revealCount) {
                                span.textContent = char;
                            } else {
                                span.textContent = this.randomBlockChar();
                            }
                        });
                    }
                    step++;
                    if (step <= totalSteps) {
                        this.animationTimeout = setTimeout(animate, this.glitchSpeed);
                    } else {
                        if (this.charSpans && this.charSpans.length > 0) {
                            this.charSpans.forEach((span, index) => {
                                span.textContent = textChars[index];
                            });
                        }
                        this.isAnimating = false;
                        this.unlockSize();
                    }
                };

                if (this.animationTimeout) clearTimeout(this.animationTimeout);
                animate();
            }

            resetDigitalHover() {
                if (this.animationTimeout) {
                    clearTimeout(this.animationTimeout);
                    this.animationTimeout = null;
                }
                if (this.innerSpan) {
                    const textChars = this.originalText.split("");
                    if (this.charSpans && this.charSpans.length > 0) {
                        this.charSpans.forEach((span, index) => {
                            span.textContent = textChars[index];
                        });
                    }
                    this.innerSpan.style.color = this.textColor || '';
                    this.innerSpan.style.textShadow = 'none';
                }
                this.isAnimating = false;
                this.unlockSize();
            }
        }

        // Khởi tạo các hiệu ứng text
        prepareTextReveal('.left-text-block');
        prepareTextReveal('.right-text-block');

        window.ghostTextRagna = new GhostText('.title-ragna', {
            hoverTextColor: '#ffffff',
            glowColor: '#00e5ff',
            glowIntensity: 2
        });

        window.ghostTextHope = new GhostText('.subtitle-hope', {
            hoverTextColor: '#ffffff',
            glowColor: '#00e5ff',
            glowIntensity: 1
        });

        // ═══════════════════════════════════════
        // LENIS SMOOTH SCROLLING INITIALIZATION
        // ═══════════════════════════════════════
        const lenis = window.lenis = new Lenis({
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

        // Shaders & WebGL Component for Framer Burn Effect
        const framerFragmentShaderSource = `
          precision highp float;

          varying vec2 vUv;
          uniform vec4 uEdgeColor;
          uniform vec4 uMaskColor;
          uniform float uNoiseScale;
          uniform float uNoiseIntensity;
          uniform float uTime;
          uniform float uProgress; // uBurn
          uniform float uDensity;
          uniform float uSoftness;
          uniform float uDistortion;
          uniform float uAspect;

          // Pseudo-random function
          float random(vec2 st) {
              return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
          }

          // 2D noise function
          vec2 hash(vec2 p) {
              p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
              return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
          }

          float noise(vec2 p) {
              const float K1 = 0.366025404;
              const float K2 = 0.211324865;
              
              vec2 i = floor(p + (p.x + p.y) * K1);
              vec2 a = p - i + (i.x + i.y) * K2;
              vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
              vec2 b = a - o + K2;
              vec2 c = a - 1.0 + 2.0 * K2;
              
              vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
              vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
              
              return dot(n, vec3(70.0));
          }

          vec3 sRGBToLinear(vec3 color) {
              return pow(color, vec3(2.2));
          }

          vec3 linearTosRGB(vec3 color) {
              return pow(color, vec3(1.0 / 2.2));
          }

          void main() {
              // 1. Calculate distorted coordinates
              vec2 centeredCoord = vUv * 2.0 - 1.0;
              float distanceToCenter = length(centeredCoord);
              
              // Radial distortion
              float radialDistortion = uDistortion * 0.3 * distanceToCenter;
              
              // Wave distortion
              float waveFrequency = 3.0 + uDistortion * 2.0;
              float waveAmplitude = 0.08 * abs(uDistortion);
              float sineDistortion = sin(centeredCoord.y * waveFrequency + centeredCoord.x * 1.5) *
                                    waveAmplitude *
                                    (1.0 - distanceToCenter * 0.7);
                                    
              vec2 distortionVector = normalize(centeredCoord) * radialDistortion;
              distortionVector.x += sineDistortion;
              distortionVector.y += sineDistortion * 0.5;
              
              vec2 finalCoord = (centeredCoord + distortionVector) * 0.5 + 0.5;
              finalCoord = clamp(finalCoord, 0.0, 1.0);

              // 2. Calculate burning edge (burnEdge)
              float dist = distance(finalCoord, vec2(0.5, 0.5));
              // uDensity determines noise frequency
              float noiseFactor = noise(vUv * 10.0 * uDensity) * 0.2;
              // uProgress determines burn threshold
              float burnThreshold = max(0.0, min(1.0, uProgress + uProgress * 0.1 + noiseFactor));
              
              // uSoftness controls edge width
              float edgeWidth = max(0.005, uSoftness * 0.06);
              float innerEdge = burnThreshold;
              float outerEdge = burnThreshold + edgeWidth;
              float burnEdge = smoothstep(innerEdge, outerEdge, dist);
              
              // Standard mask: burnEdge = 1.0 - burnEdge so center is solid (burned/black), edges are transparent
              burnEdge = 1.0 - burnEdge;

              // 3. Color blending (solid black mask color)
              vec4 edgeColorWithAlpha = uEdgeColor;
              edgeColorWithAlpha.rgb = sRGBToLinear(edgeColorWithAlpha.rgb);
              
              vec4 texColor = uMaskColor; // black color
              texColor.rgb = sRGBToLinear(texColor.rgb);
              
              // Calculate glow at the edge
              float distToEdge = abs(dist - innerEdge);
              float glow = smoothstep(edgeWidth * 1.8, 0.0, distToEdge) * 2.5;
              vec3 glowColor = edgeColorWithAlpha.rgb * glow;
              
              vec3 finalColor = mix(edgeColorWithAlpha.rgb, texColor.rgb, burnEdge) + glowColor;
              float maskAlpha = max(burnEdge, glow * 0.8);
              
              if (maskAlpha < 0.01) {
                  discard;
              }
              finalColor = linearTosRGB(finalColor);
              gl_FragColor = vec4(finalColor, maskAlpha);
          }
        `;

        class FramerBurnTransition extends HTMLElement {
          static observedAttributes = [
            "burn",
            "density",
            "distortion",
            "edge-color",
            "mask-color",
            "softness"
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
            this.burn = 0.0;
            this.density = 0.5;
            this.distortion = 0.0;
            this.softness = 0.5;
            this.edgeColor = "#ff6f2a";
            this.maskColor = "#000000";
            this.resize = this.resize.bind(this);
          }

          connectedCallback() {
            this.init();
            this.resizeObserver = new ResizeObserver(this.resize);
            this.resizeObserver.observe(this);
            this.readAttributes();
            this.render();
          }

          disconnectedCallback() {
            this.resizeObserver?.disconnect();
            if (this.gl) {
              this.gl.deleteBuffer(this.buffer);
              this.gl.deleteProgram(this.program);
            }
            this.gl = null;
            this.program = null;
          }

          attributeChangedCallback() {
            this.readAttributes();
            this.render();
          }

          readAttributes() {
            if (this.hasAttribute("burn")) {
              this.burn = clamp(Number(this.getAttribute("burn")), 0.0, 1.0);
            }
            if (this.hasAttribute("density")) {
              this.density = clamp(Number(this.getAttribute("density")), 0.0, 1.0);
            }
            if (this.hasAttribute("distortion")) {
              this.distortion = clamp(Number(this.getAttribute("distortion")), -1.0, 1.0);
            }
            if (this.hasAttribute("softness")) {
              this.softness = clamp(Number(this.getAttribute("softness")), 0.0, 1.0);
            }
            if (this.hasAttribute("edge-color")) {
              this.edgeColor = this.getAttribute("edge-color");
            }
            if (this.hasAttribute("mask-color")) {
              this.maskColor = this.getAttribute("mask-color");
            }
          }

          init() {
            this.gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
            if (!this.gl) return;
            this.program = createProgram(this.gl, vertexShaderSource, framerFragmentShaderSource);
            this.gl.useProgram(this.program);
            this.locations = {
              position: this.gl.getAttribLocation(this.program, "aPosition"),
              edgeColor: this.gl.getUniformLocation(this.program, "uEdgeColor"),
              maskColor: this.gl.getUniformLocation(this.program, "uMaskColor"),
              noiseScale: this.gl.getUniformLocation(this.program, "uNoiseScale"),
              noiseIntensity: this.gl.getUniformLocation(this.program, "uNoiseIntensity"),
              time: this.gl.getUniformLocation(this.program, "uTime"),
              progress: this.gl.getUniformLocation(this.program, "uProgress"),
              density: this.gl.getUniformLocation(this.program, "uDensity"),
              softness: this.gl.getUniformLocation(this.program, "uSoftness"),
              distortion: this.gl.getUniformLocation(this.program, "uDistortion"),
              aspect: this.gl.getUniformLocation(this.program, "uAspect")
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

          render() {
            if (!this.gl || !this.program) return;
            const gl = this.gl;
            const rect = this.getBoundingClientRect();
            
            const parsedEdge = parseHexColor(this.edgeColor, [1, 0.44, 0.16]);
            const edgeAlpha = 1.0;
            const parsedMask = parseHexColor(this.maskColor, [0, 0, 0]);
            const maskAlpha = 1.0;

            gl.useProgram(this.program);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            
            const timeValue = (window.scrollY || window.pageYOffset || 0) * 0.002;
            
            gl.uniform4f(this.locations.edgeColor, parsedEdge[0], parsedEdge[1], parsedEdge[2], edgeAlpha);
            gl.uniform4f(this.locations.maskColor, parsedMask[0], parsedMask[1], parsedMask[2], maskAlpha);
            gl.uniform1f(this.locations.noiseScale, 0.37);
            gl.uniform1f(this.locations.noiseIntensity, 0.3);
            gl.uniform1f(this.locations.time, timeValue);
            gl.uniform1f(this.locations.progress, this.burn);
            gl.uniform1f(this.locations.density, this.density);
            gl.uniform1f(this.locations.softness, this.softness);
            gl.uniform1f(this.locations.distortion, this.distortion);
            gl.uniform1f(this.locations.aspect, rect.height > 0 ? rect.width / rect.height : 1);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
        }

        customElements.define("framer-burn-transition", FramerBurnTransition);

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
        loadImages(['assets/images/background.webp', 'assets/images/character-ragna.svg'])
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

        // ── Liquid Glass fill — backdrop-filter bên trong từng chữ cái ──
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const XHTML_NS = 'http://www.w3.org/1999/xhtml';

        function createLetterGlassFill(path, clipId, panelClass) {
            const svg = document.getElementById('under-text-svg');
            const defs = svg.querySelector('defs');
            const letterG = path.parentElement;
            const pad = 6;

            const clip = document.createElementNS(SVG_NS, 'clipPath');
            clip.id = clipId;
            clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
            const clipPath = path.cloneNode(true);
            clipPath.removeAttribute('class');
            clipPath.removeAttribute('stroke');
            clipPath.removeAttribute('stroke-width');
            clipPath.setAttribute('fill', 'white');
            clip.appendChild(clipPath);
            defs.appendChild(clip);

            const bbox = path.getBBox();
            const fo = document.createElementNS(SVG_NS, 'foreignObject');
            fo.setAttribute('class', 'glass-letter-fill');
            fo.setAttribute('x', String(bbox.x - pad));
            fo.setAttribute('y', String(bbox.y - pad));
            fo.setAttribute('width', String(bbox.width + pad * 2));
            fo.setAttribute('height', String(bbox.height + pad * 2));
            fo.setAttribute('clip-path', `url(#${clipId})`);

            const div = document.createElementNS(XHTML_NS, 'div');
            div.setAttribute('xmlns', XHTML_NS);
            div.className = `glass-fill-panel ${panelClass}`;
            fo.appendChild(div);

            letterG.insertBefore(fo, path);
            return fo;
        }

        const beyondGlassFills = [];
        document.querySelectorAll('.beyond-stroke').forEach((path, i) => {
            beyondGlassFills.push(createLetterGlassFill(path, `clip-beyond-${i}`, 'glass-fill-beyond'));
        });

        const ultraGlassFills = [];
        document.querySelectorAll('.ultra-stroke').forEach((path, i) => {
            ultraGlassFills.push(createLetterGlassFill(path, `clip-ultra-${i}`, 'glass-fill-ultra'));
        });

        // Khởi tạo các mốc stroke-dashoffset cho hiệu ứng Path Reveal vẽ từng chữ cái
        const beyondStrokes = document.querySelectorAll('.beyond-stroke');
        const ultraStrokes = document.querySelectorAll('.ultra-stroke');

        beyondStrokes.forEach(path => {
            const len = path.getTotalLength();
            gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
        });

        ultraStrokes.forEach(path => {
            const len = path.getTotalLength();
            gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
        });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: '.animation-wrapper',
                start: 'top top',
                end: '+=2850%', // Tăng thêm cho phần đường line AnimatedLine (tổng cộng 190% scroll)
                pin: true,
                scrub: true, // Trỏ 1:1 theo thanh cuộn (đã được làm mượt bởi Lenis)
                anticipatePin: 1,
                onUpdate: self => {
                    const pct = Math.round(self.progress * 190);
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
          }, 'burn')
          .to('.under-text-layer', {
              opacity: 1,
              duration: 1,
              ease: 'none'
          }, 105);

        // Hiển thị GO BEYOND vẽ viền từng chữ cái tuần tự, chữ sau bắt đầu khi chữ trước vẽ được 80%
        const D_beyond = 2.8;
        const overlap_beyond = 0.8 * D_beyond; // 2.24
        beyondStrokes.forEach((stroke, i) => {
            const start = 105 + i * overlap_beyond;
            const glass = beyondGlassFills[i];
            tl.set(stroke, { opacity: 1 }, start)
              .fromTo(glass, { opacity: 0 }, { opacity: 1, duration: D_beyond * 0.55, ease: 'power2.out' }, start)
              .to(stroke, {
                  strokeDashoffset: 0,
                  duration: D_beyond,
                  ease: 'power1.inOut'
              }, start);
        });

        // Hiển thị PLUS ULTRA vẽ viền từng chữ cái tuần tự sau khi GO BEYOND đã hiện hoàn chỉnh (tại mốc 126.38)
        const D_ultra = 2.8;
        const overlap_ultra = 0.8 * D_ultra; // 2.24
        const ultraStartBase = 126.38; // 123.48 + 2.9
        ultraStrokes.forEach((stroke, i) => {
            const start = ultraStartBase + i * overlap_ultra;
            const glass = ultraGlassFills[i];
            tl.set(stroke, { opacity: 1 }, start)
              .fromTo(glass, { opacity: 0 }, { opacity: 1, duration: D_ultra * 0.55, ease: 'power2.out' }, start)
              .to(stroke, {
                  strokeDashoffset: 0,
                  duration: D_ultra,
                  ease: 'power1.inOut'
              }, start);
        });

        // Giữ ảnh nhân vật under-char luôn hiện với opacity 1 từ mốc 101% đến 180%
        tl.set('.under-char-layer', {
            opacity: 1
        }, 101);

        // HỒI 5: HIỆU ỨNG THIÊU RỤI TRÒN TỪ TÂM (FRAMER BURN EFFECT) (150 – 180)
        tl.addLabel('framer-burn', 150)
          .set('#page-burn-overlay', {
              opacity: 1
          }, 'framer-burn')
          .to('#page-burn-overlay', {
              attr: { burn: 1.0 },
              duration: 30, // cháy dần từ 150% đến 180%
              ease: 'power1.in'
          }, 'framer-burn')
          .to('#page-burn-overlay', {
              attr: { distortion: 0.35 },
              duration: 25, // tăng độ méo hình sóng từ 150% đến 175%
              ease: 'power1.out'
          }, 'framer-burn')
          .to('#animated-line', {
              scaleX: 1,
              duration: 10, // Chạy từ mốc 180 đến 190
              ease: 'power2.inOut' // Mượt mà tương tự ease của Framer: [0.25, 0.1, 0.25, 1]
          }, 180)
          .to({}, { duration: 0.1 }, 190); // Giữ trạng thái hiển thị hoàn chỉnh đến mốc 190
