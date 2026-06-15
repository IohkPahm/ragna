document.addEventListener("DOMContentLoaded", () => {
    console.log("Khởi chạy D&D Combat Sheet cho Ragna...");

    // ═══════════════════════════════════
    // 1. KHỞI TẠO LENIS SCROLL (CUỘN MƯỢT MÀ)
    // ═══════════════════════════════════
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
        smoothWheel: true,
        smoothTouch: false
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // ═══════════════════════════════════
    // 2. DỮ LIỆU NHÂN VẬT & ĐỒNG BỘ HOÁ QUA LOCALSTORAGE
    // ═══════════════════════════════════
    const DEFAULT_STATE = {
        name: "Ragna",
        hpMax: 54,
        hpCurrent: 54,
        hpTemp: 0,
        ac: 19,
        shieldActive: false,
        initiative: 2,
        pactSlotsMax: 2,
        pactSlotsCurrent: 2,
        wrathStack: 0,
        pactWeaponDamageType: "Slashing",
        resources: {
            curse: false,
            specter: false,
            cunning: false,
            maskDisguise1: false,
            maskDisguise2: false,
            maskThoughts: false,
            kimonoHunt: false,
            seedLife: false,
            graspless1: false,
            graspless2: false,
            graspless3: false
        },
        conditions: {
            blinded: false,
            frightened: false,
            poisoned: false,
            prone: false,
            stunned: false,
            unconscious: false
        }
    };

    function getCharacterState() {
        const saved = localStorage.getItem("dnd_character_ragna");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const merged = {
                    ...DEFAULT_STATE,
                    ...parsed,
                    resources: {
                        ...DEFAULT_STATE.resources,
                        ...(parsed.resources || {})
                    },
                    conditions: {
                        ...DEFAULT_STATE.conditions,
                        ...(parsed.conditions || {})
                    }
                };
                // Sanity check: HP không được vượt quá Max HP hoặc âm
                merged.hpMax = DEFAULT_STATE.hpMax; // luôn dùng giá trị cứng từ code
                merged.hpCurrent = Math.max(0, Math.min(merged.hpCurrent, merged.hpMax));
                merged.hpTemp = Math.max(0, merged.hpTemp || 0);
                return merged;
            } catch(e) {
                console.error("Lỗi khi parse character state:", e);
            }
        }
        return { ...DEFAULT_STATE };
    }

    function saveCharacterState() {
        localStorage.setItem("dnd_character_ragna", JSON.stringify(character));
    }

    const character = getCharacterState();
    // Khởi đầu stack nộ bằng 0 khi tải trang
    character.wrathStack = 0;

    // Cache các element DOM liên quan đến HP
    const combatCurrentHp = document.getElementById("combat-current-hp");
    const combatTempHp = document.getElementById("combat-temp-hp");
    const tempHpDisplay = document.getElementById("temp-hp-display");
    const combatHpBarFill = document.getElementById("combat-hp-bar-fill");
    const combatTempBarFill = document.getElementById("combat-temp-bar-fill");
    const hpInputValue = document.getElementById("hp-input-value");

    // Hàm cập nhật giao diện HP và lưu trạng thái
    function updateHpUI(damageTaken = false) {
        // Đồng bộ dữ liệu

        if (combatCurrentHp) combatCurrentHp.textContent = character.hpCurrent;
        if (combatTempHp) combatTempHp.textContent = character.hpTemp;

        if (tempHpDisplay) {
            if (character.hpTemp > 0) {
                tempHpDisplay.style.display = "inline";
            } else {
                tempHpDisplay.style.display = "none";
            }
        }

        const totalMax = character.hpMax;
        const currentHpPercent = (character.hpCurrent / totalMax) * 100;
        const tempPercent = (character.hpTemp / totalMax) * 100;

        if (combatHpBarFill) combatHpBarFill.style.width = `${currentHpPercent}%`;
        
        if (combatTempBarFill) {
            combatTempBarFill.style.left = `${currentHpPercent}%`;
            combatTempBarFill.style.width = `${Math.min(tempPercent, 100 - currentHpPercent)}%`;
        }

        // Cập nhật AC
        const acDisplay = document.querySelector("#combat-ac-box .badge-value");
        if (acDisplay) {
            acDisplay.textContent = character.ac;
            const acBox = document.getElementById("combat-ac-box");
            if (acBox) {
                if (character.shieldActive) {
                    acBox.style.borderColor = "var(--color-info)";
                    acBox.style.boxShadow = "0 0 12px rgba(0, 229, 255, 0.3)";
                } else {
                    acBox.style.borderColor = "";
                    acBox.style.boxShadow = "";
                }
            }
        }

        // Đồng bộ các checkbox tài nguyên
        syncResourcesUI();

        // Cập nhật các nút Bonus Action & Reaction
        if (typeof syncBonusActionsButtons === "function") {
            syncBonusActionsButtons();
        }

        // Đồng bộ Wrath Stack
        currentWrathStack = character.wrathStack;
        updateWrathStackUI();

        if (damageTaken) {
            triggerDamageFlash();
        }
    }

    // Hiệu ứng giật rung lắc màn hình và nháy đỏ viền khi dính đòn
    function triggerDamageFlash() {
        document.body.classList.add("screen-shake");
        
        const flashOverlay = document.createElement("div");
        flashOverlay.style.position = "fixed";
        flashOverlay.style.inset = "0";
        flashOverlay.style.zIndex = "999";
        flashOverlay.style.pointerEvents = "none";
        flashOverlay.classList.add("damage-flash");
        document.body.appendChild(flashOverlay);

        setTimeout(() => {
            document.body.classList.remove("screen-shake");
            flashOverlay.remove();
        }, 800);
    }

    // Xử lý Hồi Máu (Heal)
    document.getElementById("btn-heal-hp").addEventListener("click", () => {
        const val = parseInt(hpInputValue.value);
        if (isNaN(val) || val <= 0) return;
        character.hpCurrent = Math.min(character.hpMax, character.hpCurrent + val);
        saveCharacterState();
        updateHpUI();
        hpInputValue.value = "";
    });

    // Xử lý Nhận Sát Thương (Damage)
    document.getElementById("btn-damage-hp").addEventListener("click", () => {
        const val = parseInt(hpInputValue.value);
        if (isNaN(val) || val <= 0) return;
        
        let remainingDmg = val;
        
        if (character.hpTemp > 0) {
            if (character.hpTemp >= remainingDmg) {
                character.hpTemp -= remainingDmg;
                remainingDmg = 0;
            } else {
                remainingDmg -= character.hpTemp;
                character.hpTemp = 0;
            }
        }

        if (remainingDmg > 0) {
            character.hpCurrent = Math.max(0, character.hpCurrent - remainingDmg);
        }

        saveCharacterState();
        updateHpUI(true);
        hpInputValue.value = "";
    });

    // Xử lý Cộng Máu Tạm Thời (Temp HP)
    document.getElementById("btn-temp-hp").addEventListener("click", () => {
        const val = parseInt(hpInputValue.value);
        if (isNaN(val) || val <= 0) return;
        character.hpTemp = Math.max(character.hpTemp, val);
        saveCharacterState();
        updateHpUI();
        hpInputValue.value = "";
    });

    // Xử lý Nghỉ Ngơi (Short & Long Rest)
    document.getElementById("btn-short-rest").addEventListener("click", () => {
        let rollSum = 0;
        for (let i = 0; i < 2; i++) {
            rollSum += Math.floor(Math.random() * 8) + 1;
        }
        const healAmt = rollSum + 6;
        character.hpCurrent = Math.min(character.hpMax, character.hpCurrent + healAmt);
        
        // Hồi Pact Slots
        character.pactSlotsCurrent = 2;
        
        // Hồi Curse & Mask Thoughts
        character.resources.curse = false;
        character.resources.maskThoughts = false;
        
        // Reset Wrath Stack
        character.wrathStack = 0;
        currentWrathStack = 0;
        updateWrathStackUI();
        
        // Reset Shield
        character.shieldActive = false;
        character.ac = 19;

        saveCharacterState();
        updateHpUI();
        triggerStatusNotification(`Nghỉ ngắn thành công! Hồi ${healAmt} HP (Tung 2d8+6). Đã hồi lại toàn bộ Spell Slots, Hexblade's Curse, Mask Thoughts và Reset Wrath Stack.`);
    });

    document.getElementById("btn-long-rest").addEventListener("click", () => {
        character.hpCurrent = character.hpMax;
        character.hpTemp = 0;
        character.pactSlotsCurrent = 2;
        
        // Hồi toàn bộ tài nguyên
        for (const key in character.resources) {
            character.resources[key] = false;
        }

        // Reset Wrath Stack
        character.wrathStack = 0;
        currentWrathStack = 0;
        updateWrathStackUI();

        // Reset Shield
        character.shieldActive = false;
        character.ac = 19;

        saveCharacterState();
        updateHpUI();
        triggerStatusNotification("Nghỉ dài thành công! Hồi đầy HP, THP về 0, khôi phục toàn bộ tài nguyên, phép thuật và Reset Wrath Stack.");
    });

    // Helper tạo thông báo nổi nhỏ
    function triggerStatusNotification(message) {
        const notif = document.createElement("div");
        notif.style.position = "fixed";
        notif.style.bottom = "30px";
        notif.style.right = "30px";
        notif.style.background = "rgba(10, 10, 10, 0.9)";
        notif.style.border = "1px solid var(--color-accent-gold)";
        notif.style.color = "#ffffff";
        notif.style.padding = "12px 24px";
        notif.style.borderRadius = "4px";
        notif.style.fontFamily = "var(--font-body)";
        notif.style.fontSize = "0.8rem";
        notif.style.zIndex = "1000";
        notif.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)";
        notif.style.opacity = "0";
        notif.style.transform = "translateY(20px)";
        notif.style.transition = "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)";
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.style.opacity = "1";
            notif.style.transform = "translateY(0)";
        }, 50);

        setTimeout(() => {
            notif.style.opacity = "0";
            notif.style.transform = "translateY(-20px)";
            setTimeout(() => notif.remove(), 400);
        }, 4000);
    }

    // ═══════════════════════════════════
    // 3. THIẾT LẬP DỮ LIỆU CẤU HÌNH VŨ KHÍ & ĐÒN ĐÁNH
    // ═══════════════════════════════════
    const weaponsConfig = {
        greatsword: {
            name: "Mortal Wrath",
            dice: "2d6",
            mod: 6,
            type: "Slashing"
        },
        eldritchblast: {
            name: "Eldritch Blast",
            dice: "1d10",
            mod: 4,
            type: "Force"
        }
    };

    let activeWeaponKey = "greatsword";

    // Quản lý Mortal Wrath Stack
    let currentWrathStack = 0;
    const wrathStackValueEl = document.getElementById("wrath-stack-value");
    const decWrathBtn = document.getElementById("btn-dec-wrath");
    const incWrathBtn = document.getElementById("btn-inc-wrath");
    const wrathStackControlBlock = document.getElementById("wrath-stack-control-block");

    function updateWrathStackUI() {
        if (wrathStackValueEl) {
            wrathStackValueEl.textContent = currentWrathStack;
        }
    }

    if (decWrathBtn) {
        decWrathBtn.addEventListener("click", () => {
            currentWrathStack = Math.max(0, currentWrathStack - 1);
            character.wrathStack = currentWrathStack;
            saveCharacterState();
            updateWrathStackUI();
            updateTotalDicePool();
        });
    }

    if (incWrathBtn) {
        incWrathBtn.addEventListener("click", () => {
            currentWrathStack = currentWrathStack + 1;
            character.wrathStack = currentWrathStack;
            saveCharacterState();
            updateWrathStackUI();
            updateTotalDicePool();
        });
    }

    const strikeStates = {
        1: { state: "none", crit: false, addons: { kimonoHunt: false, smite: false, curse: false } },
        2: { state: "none", crit: false, addons: { kimonoHunt: false, smite: false, curse: false } },
        3: { state: "none", crit: false, addons: { kimonoHunt: false, smite: false, curse: false } }
    };

    const weaponRadioLabels = document.querySelectorAll(".weapon-options .weapon-opt-btn");
    const strikeFormulaDisplays = {
        1: document.getElementById("strike-formula-1"),
        2: document.getElementById("strike-formula-2"),
        3: document.getElementById("strike-formula-3")
    };

    // Initialize Pact Weapon Damage Type from saved state
    const savedPactType = character.pactWeaponDamageType || "Slashing";
    weaponsConfig.greatsword.type = savedPactType;
    
    // Select the radio button in UI matching savedPactType
    const pactDamageRadioLabels = document.querySelectorAll(".pact-damage-options .weapon-opt-btn");
    pactDamageRadioLabels.forEach(label => {
        const input = label.querySelector("input");
        if (input.value.toLowerCase() === savedPactType.toLowerCase()) {
            input.checked = true;
            label.classList.add("active");
        } else {
            input.checked = false;
            label.classList.remove("active");
        }
        
        input.addEventListener("change", () => {
            pactDamageRadioLabels.forEach(lbl => lbl.classList.remove("active"));
            label.classList.add("active");
            
            const chosenType = input.value;
            weaponsConfig.greatsword.type = chosenType;
            character.pactWeaponDamageType = chosenType;
            saveCharacterState();
            updateWeaponFormulas();
            updateTotalDicePool();
        });
    });

    const pactDamageControlBlock = document.getElementById("pact-damage-control-block");
    if (pactDamageControlBlock) {
        if (activeWeaponKey === "greatsword") {
            pactDamageControlBlock.style.display = "flex";
        } else {
            pactDamageControlBlock.style.display = "none";
        }
    }

    function syncStrike3Visibility() {
        const strike3Row = document.getElementById("strike-3");
        if (strike3Row) {
            if (activeWeaponKey === "greatsword") {
                strike3Row.style.display = "flex";
            } else {
                strike3Row.style.display = "none";
                // Reset strike 3 state if hidden
                strikeStates[3].state = "none";
                strikeStates[3].crit = false;
                strikeStates[3].addons.kimonoHunt = false;
                strikeStates[3].addons.smite = false;
                strikeStates[3].addons.curse = false;
                
                const btnHit = strike3Row.querySelector(".btn-strike-toggle.hit");
                const btnMiss = strike3Row.querySelector(".btn-strike-toggle.miss");
                const btnCrit = strike3Row.querySelector(".btn-strike-toggle.crit");
                if (btnHit) btnHit.classList.remove("active");
                if (btnMiss) btnMiss.classList.remove("active");
                if (btnCrit) {
                    btnCrit.classList.remove("active");
                    btnCrit.disabled = true;
                }
                strike3Row.querySelectorAll(".chk-strike-addon").forEach(chk => chk.checked = false);
            }
        }
    }

    weaponRadioLabels.forEach(label => {
        const input = label.querySelector("input");
        input.addEventListener("change", () => {
            weaponRadioLabels.forEach(lbl => lbl.classList.remove("active"));
            label.classList.add("active");

            activeWeaponKey = input.value;

            // Show/hide Wrath stack control block
            if (wrathStackControlBlock) {
                if (activeWeaponKey === "greatsword") {
                    wrathStackControlBlock.style.display = "flex";
                } else {
                    wrathStackControlBlock.style.display = "none";
                }
            }

            // Show/hide Pact damage type control block
            if (pactDamageControlBlock) {
                if (activeWeaponKey === "greatsword") {
                    pactDamageControlBlock.style.display = "flex";
                } else {
                    pactDamageControlBlock.style.display = "none";
                }
            }

            syncStrike3Visibility();
            updateWeaponFormulas();
            updateTotalDicePool();
        });
    });

    function updateWeaponFormulas() {
        const wp = weaponsConfig[activeWeaponKey];
        let formulaText = `${wp.name}: ${wp.dice} + ${wp.mod} ${wp.type}`;

        for (let i = 1; i <= 3; i++) {
            if (strikeFormulaDisplays[i]) {
                strikeFormulaDisplays[i].textContent = formulaText;
            }
        }
    }

    const strikeRows = [1, 2, 3];
    strikeRows.forEach(strikeNum => {
        const rowEl = document.getElementById(`strike-${strikeNum}`);
        if (!rowEl) return;
        const btnHit = rowEl.querySelector(".btn-strike-toggle.hit");
        const btnMiss = rowEl.querySelector(".btn-strike-toggle.miss");
        const btnCrit = rowEl.querySelector(".btn-strike-toggle.crit");

        btnHit.addEventListener("click", () => {
            if (strikeStates[strikeNum].state === "hit") {
                strikeStates[strikeNum].state = "none";
                btnHit.classList.remove("active");
                btnCrit.disabled = true;
                btnCrit.classList.remove("active");
                strikeStates[strikeNum].crit = false;
            } else {
                strikeStates[strikeNum].state = "hit";
                btnHit.classList.add("active");
                btnMiss.classList.remove("active");
                
                // Strike 3 (Additional Attack) auto-crits on hit
                if (strikeNum === 3) {
                    strikeStates[3].crit = true;
                    btnCrit.classList.add("active");
                    btnCrit.disabled = false;
                } else {
                    btnCrit.disabled = false;
                }
            }
            updateTotalDicePool();
        });

        btnMiss.addEventListener("click", () => {
            if (strikeStates[strikeNum].state === "miss") {
                strikeStates[strikeNum].state = "none";
                btnMiss.classList.remove("active");
            } else {
                strikeStates[strikeNum].state = "miss";
                btnMiss.classList.add("active");
                btnHit.classList.remove("active");
                btnCrit.disabled = true;
                btnCrit.classList.remove("active");
                strikeStates[strikeNum].crit = false;
            }
            updateTotalDicePool();
        });

        btnCrit.addEventListener("click", () => {
            // Let the user toggle Crit for Strike 1 and 2, but keep it on for Strike 3 if HIT
            if (strikeNum === 3 && strikeStates[3].state === "hit") {
                // Auto-crit stays on when S3 is HIT
                return;
            }
            if (strikeStates[strikeNum].crit) {
                strikeStates[strikeNum].crit = false;
                btnCrit.classList.remove("active");
            } else {
                strikeStates[strikeNum].crit = true;
                btnCrit.classList.add("active");
            }
            updateTotalDicePool();
        });

        rowEl.querySelectorAll(".chk-strike-addon").forEach(chk => {
            chk.addEventListener("change", () => {
                const addonName = chk.getAttribute("data-addon");
                strikeStates[strikeNum].addons[addonName] = chk.checked;
                updateTotalDicePool();
            });
        });
    });

    // Xử lý chuyển đổi Loại Action (D&D 5e Actions)
    const actionTypeBtns = document.querySelectorAll('.action-type-btn');
    const actionSubPanels = document.querySelectorAll('.action-sub-panel');

    actionTypeBtns.forEach(btn => {
        const input = btn.querySelector('input[name="combat-action-type"]');
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const wasActive = btn.classList.contains('active');
            
            actionTypeBtns.forEach(b => {
                b.classList.remove('active');
                b.querySelector('input').checked = false;
            });
            actionSubPanels.forEach(p => p.classList.remove('active'));
            
            if (!wasActive) {
                btn.classList.add('active');
                input.checked = true;
                const targetPanel = document.getElementById(`panel-action-${input.value}`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            } else {
                input.checked = false;
            }
            
            updateTotalDicePool();
        });
    });

    // ═══════════════════════════════════
    // 4. LOGIC TỔNG HỢP DICE POOL & TÍNH SÁT THƯƠNG
    // ═══════════════════════════════════
    const poolDiceExpression = document.getElementById("pool-dice-expression");
    const damageComponentsList = document.getElementById("damage-components-list");
    const totalDmgValue = document.getElementById("total-dmg-value");
    
    let baseRolledDamage = 0;
    let activeMultipliers = {};
    let activeDamageBreakdown = {};

    function getDicePoolData() {
        const activeActionType = document.querySelector('input[name="combat-action-type"]:checked')?.value || 'attack';
        if (activeActionType !== 'attack') {
            return {
                diceGroups: { d6: 0, d8: 0, d10: 0, d4: 0 },
                totalMod: 0,
                hitsCount: 0,
                type: ''
            };
        }

        const wp = weaponsConfig[activeWeaponKey];
        
        let diceGroups = { d6: 0, d8: 0, d10: 0, d4: 0 };
        let totalMod = 0;
        let hitsCount = 0;

        let tempStack = currentWrathStack;

        for (let i = 1; i <= 3; i++) {
            const st = strikeStates[i];
            if (st.state === "hit") {
                hitsCount++;
                
                // Weapon Base Dice
                let wpDiceCount = wp.dice.includes("2d6") ? 2 : 1;
                if (st.crit) wpDiceCount *= 2;

                if (wp.dice.includes("2d6")) {
                    diceGroups.d6 += wpDiceCount;
                } else if (wp.dice.includes("1d10")) {
                    diceGroups.d10 += wpDiceCount;
                }

                totalMod += wp.mod;

                // Mortal Wrath stack (Only if weapon is greatsword/Mortal Wrath)
                if (activeWeaponKey === "greatsword") {
                    tempStack++;
                    let wrathDiceCount = tempStack;
                    if (st.crit) wrathDiceCount *= 2;
                    diceGroups.d4 += wrathDiceCount;
                }

                // Kimono Hunt (+2d6 Radiant)
                if (st.addons.kimonoHunt) {
                    let kimonoDiceCount = 2;
                    if (st.crit) kimonoDiceCount *= 2;
                    diceGroups.d6 += kimonoDiceCount;
                }

                // Hexblade's Curse (+3 Flat Mod)
                if (st.addons.curse) {
                    totalMod += 3;
                }

                // Smite (+4d6 Radiant/Psychic)
                if (st.addons.smite) {
                    let smiteDiceCount = 4;
                    if (st.crit) smiteDiceCount *= 2;
                    diceGroups.d6 += smiteDiceCount;
                }
            } else if (st.state === "miss") {
                if (activeWeaponKey === "greatsword") {
                    tempStack = 0;
                }
            }
        }

        return {
            diceGroups,
            totalMod,
            hitsCount,
            type: wp.type
        };
    }

    function updateTotalDicePool() {
        const pool = getDicePoolData();
        
        let diceParts = [];
        if (pool.diceGroups.d6 > 0) diceParts.push(`${pool.diceGroups.d6}d6`);
        if (pool.diceGroups.d8 > 0) diceParts.push(`${pool.diceGroups.d8}d8`);
        if (pool.diceGroups.d10 > 0) diceParts.push(`${pool.diceGroups.d10}d10`);
        if (pool.diceGroups.d4 > 0) diceParts.push(`${pool.diceGroups.d4}d4`);

        let expression = "";
        const activeActionType = document.querySelector('input[name="combat-action-type"]:checked')?.value || 'attack';
        if (activeActionType !== 'attack') {
            expression = "Chỉ tích luỹ khi chọn Action Attack";
        } else if (diceParts.length > 0) {
            expression = diceParts.join(" + ");
            if (pool.totalMod > 0) expression += ` + ${pool.totalMod}`;
        } else {
            expression = "Không có đòn trúng";
        }

        if (poolDiceExpression) poolDiceExpression.textContent = expression;
    }

    // ═══════════════════════════════════
    // 5. POP-UP TRÌNH TUNG XÚC XẮC (DICE ROLLER OVERLAY)
    // ═══════════════════════════════════
    const diceModalOverlay = document.getElementById("dice-modal-overlay");
    const diceModal = document.getElementById("dice-modal");
    const diceVisual = document.getElementById("dice-visual");
    const diceNumberText = document.getElementById("dice-number-text");
    const diceRollTitle = document.getElementById("dice-roll-title");
    const diceRollSubtitle = document.getElementById("dice-roll-subtitle");
    const diceCalcFormula = document.getElementById("dice-calc-formula");
    const diceCalcDie = document.getElementById("dice-calc-die");
    const diceCalcMod = document.getElementById("dice-calc-mod");
    const diceTotalDisplay = document.getElementById("dice-total-display");
    const diceCritText = document.getElementById("dice-crit-text");
    const btnCloseDiceModal = document.getElementById("btn-close-dice-modal");
    const btnDismissRoll = document.getElementById("btn-dismiss-roll");

    function hideDiceModal() {
        gsap.to(diceModal, {
            scale: 0.9,
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
                if (diceModalOverlay) {
                    diceModalOverlay.style.display = "none";
                    diceModalOverlay.classList.remove("show-result");
                }
            }
        });
    }

    if (btnCloseDiceModal) btnCloseDiceModal.addEventListener("click", hideDiceModal);
    if (btnDismissRoll) btnDismissRoll.addEventListener("click", hideDiceModal);
    if (diceModalOverlay) {
        diceModalOverlay.addEventListener("click", (e) => {
            if (e.target === diceModalOverlay) hideDiceModal();
        });
    }

    function rollDice(sides) {
        return Math.floor(Math.random() * sides) + 1;
    }

    function triggerRollAnimation({ title, subtitle, rollAction }) {
        if (!diceModalOverlay) return;
        diceModalOverlay.style.display = "flex";
        diceModalOverlay.classList.remove("show-result");
        
        if (diceRollTitle) diceRollTitle.textContent = title.toUpperCase();
        if (diceRollSubtitle) diceRollSubtitle.textContent = subtitle.toUpperCase();
        if (diceCritText) diceCritText.textContent = "";
        if (diceNumberText) diceNumberText.textContent = "?";
        
        gsap.fromTo(diceModal, 
            { scale: 0.85, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }
        );

        if (diceVisual) diceVisual.classList.add("rolling");

        let count = 0;
        const spinInterval = setInterval(() => {
            if (diceNumberText) diceNumberText.textContent = rollDice(20);
            count++;
            if (count > 12) clearInterval(spinInterval);
        }, 60);

        setTimeout(() => {
            if (diceVisual) diceVisual.classList.remove("rolling");
            
            const result = rollAction();
            
            if (diceNumberText) diceNumberText.textContent = result.dieResult;

            if (diceCalcFormula) diceCalcFormula.textContent = result.formula;
            if (diceCalcDie) diceCalcDie.textContent = result.dieResult;
            
            if (diceCalcMod) {
                if (result.modValue >= 0) {
                    diceCalcMod.textContent = `+ ${result.modValue}`;
                } else {
                    diceCalcMod.textContent = `- ${Math.abs(result.modValue)}`;
                }
            }

            if (diceTotalDisplay) {
                diceTotalDisplay.textContent = result.total;
                diceTotalDisplay.className = "dice-total-display";
                if (result.isCritSuccess) {
                    diceTotalDisplay.classList.add("crit-success");
                    if (diceCritText) {
                        diceCritText.textContent = "CHÍ MẠNG (CRITICAL 20)!";
                        diceCritText.style.color = "var(--color-success)";
                    }
                } else if (result.isCritFail) {
                    diceTotalDisplay.classList.add("crit-fail");
                    if (diceCritText) {
                        diceCritText.textContent = "HỤT CỰC KỲ ĐÁNG TIẾC (CRIT 1)!";
                        diceCritText.style.color = "var(--color-danger)";
                    }
                } else {
                    if (diceCritText) {
                        diceCritText.textContent = result.customCritText || "HOÀN THÀNH TUNG XÚC XẮC!";
                        diceCritText.style.color = "var(--color-accent-orange)";
                    }
                }
            }

            diceModalOverlay.classList.add("show-result");
        }, 800);
    }

    function rollCombatDamage(isSingleStrike, strikeNum) {
        const wp = weaponsConfig[activeWeaponKey];
        const primaryType = (wp.type.includes("&") ? wp.type.split("&")[0].trim() : wp.type).toLowerCase();
        
        let breakdown = {
            slashing: 0,
            piercing: 0,
            cold: 0,
            necrotic: 0,
            radiant: 0,
            force: 0,
            psychic: 0
        };
        
        let diceRecord = [];
        let totalDmgDiceOnly = 0;
        let totalFlatMod = 0;
        
        const rollStrike = (num, currentStackValue) => {
            const st = strikeStates[num];
            const isCrit = st.crit;
            
            // 1. Weapon Base Dice
            const wpDiceMatch = wp.dice.match(/(\d+)d(\d+)/i);
            if (wpDiceMatch) {
                const count = parseInt(wpDiceMatch[1]) * (isCrit ? 2 : 1);
                const sides = parseInt(wpDiceMatch[2]);
                let sum = 0;
                let rolls = [];
                for (let i = 0; i < count; i++) {
                    const r = Math.floor(Math.random() * sides) + 1;
                    rolls.push(r);
                    sum += r;
                }
                breakdown[primaryType] += sum;
                totalDmgDiceOnly += sum;
                diceRecord.push(`${count}d${sides} (${rolls.join("+")}) [${wp.name}]`);
            }
            
            // Weapon Mod
            breakdown[primaryType] += wp.mod;
            totalFlatMod += wp.mod;
            
            // 2. Mortal Wrath accumulation (Only if weapon is greatsword/Mortal Wrath and we have stack > 0)
            if (activeWeaponKey === "greatsword" && currentStackValue > 0) {
                const count = currentStackValue * (isCrit ? 2 : 1);
                const sides = 4;
                let sum = 0;
                let rolls = [];
                for (let i = 0; i < count; i++) {
                    const r = Math.floor(Math.random() * sides) + 1;
                    rolls.push(r);
                    sum += r;
                }
                breakdown.necrotic += sum;
                totalDmgDiceOnly += sum;
                diceRecord.push(`${count}d${sides} (${rolls.join("+")}) [Wrath Accumulation x${currentStackValue}]`);
            }
            
            // 3. Kimono Hunt (+2d6 Radiant)
            if (st.addons.kimonoHunt) {
                const count = 2 * (isCrit ? 2 : 1);
                const sides = 6;
                let sum = 0;
                let rolls = [];
                for (let i = 0; i < count; i++) {
                    const r = Math.floor(Math.random() * sides) + 1;
                    rolls.push(r);
                    sum += r;
                }
                breakdown.radiant += sum;
                totalDmgDiceOnly += sum;
                diceRecord.push(`${count}d${sides} (${rolls.join("+")}) [Kimono Hunt]`);
                
                // Tiêu hao tài nguyên Kimono Hunt (chỉ 1 lần dùng mỗi Long Rest)
                if (!character.resources.kimonoHunt) {
                    character.resources.kimonoHunt = true;
                    saveCharacterState();
                    syncResourcesUI();
                }
            }
            
            // 4. Hexblade's Curse (+3 Flat Mod)
            if (st.addons.curse) {
                const curseBonus = 3;
                breakdown[primaryType] += curseBonus;
                totalFlatMod += curseBonus;
            }
            
            // 5. Smite (+4d6 Radiant/Psychic)
            if (st.addons.smite) {
                const count = 4 * (isCrit ? 2 : 1);
                const sides = 6;
                let sum = 0;
                let rolls = [];
                for (let i = 0; i < count; i++) {
                    const r = Math.floor(Math.random() * sides) + 1;
                    rolls.push(r);
                    sum += r;
                }
                const smiteType = (activeWeaponKey === "greatsword") ? "radiant" : "psychic";
                breakdown[smiteType] += sum;
                totalDmgDiceOnly += sum;
                diceRecord.push(`${count}d${sides} (${rolls.join("+")}) [Smite]`);
            }
        };
        
        if (isSingleStrike) {
            let stackForThisStrike = currentWrathStack;
            const st = strikeStates[strikeNum];
            if (st.state === "hit") {
                if (activeWeaponKey === "greatsword") {
                    currentWrathStack++; // Increment stack
                    stackForThisStrike = currentWrathStack;
                }
                rollStrike(strikeNum, stackForThisStrike);
            } else if (st.state === "miss") {
                if (activeWeaponKey === "greatsword") {
                    currentWrathStack = 0; // Reset stack on miss
                }
            }
            character.wrathStack = currentWrathStack;
            saveCharacterState();
            updateWrathStackUI();
        } else {
            // Evaluates strikes sequentially for total turn damage
            let tempStack = currentWrathStack;
            for (let i = 1; i <= 3; i++) {
                const st = strikeStates[i];
                if (st.state === "hit") {
                    if (activeWeaponKey === "greatsword") {
                        tempStack++;
                    }
                    rollStrike(i, tempStack);
                } else if (st.state === "miss") {
                    if (activeWeaponKey === "greatsword") {
                        tempStack = 0;
                    }
                }
            }
            if (activeWeaponKey === "greatsword") {
                currentWrathStack = tempStack; // Save final stack
                character.wrathStack = currentWrathStack;
                saveCharacterState();
                updateWrathStackUI();
            }
        }
        
        let totalDmg = 0;
        for (const type in breakdown) {
            totalDmg += breakdown[type];
        }
        
        return {
            totalDmg,
            totalDmgDiceOnly,
            diceRecord,
            breakdown
        };
    }

    function updateDamageDisplay() {
        let totalSum = 0;
        let hasDamage = false;
        let isFirst = true;
        
        if (damageComponentsList) damageComponentsList.innerHTML = "";
        
        for (const type in activeDamageBreakdown) {
            const val = activeDamageBreakdown[type];
            if (val > 0) {
                hasDamage = true;
                const activeMult = activeMultipliers[type] || "normal";
                let finalVal = val;
                if (activeMult === "vulnerable") {
                    finalVal = val * 2;
                } else if (activeMult === "resistance") {
                    finalVal = Math.floor(val / 2);
                } else if (activeMult === "immune") {
                    finalVal = 0;
                }
                totalSum += finalVal;
                
                if (!isFirst && damageComponentsList) {
                    const plusSign = document.createElement("div");
                    plusSign.className = "damage-component-plus";
                    plusSign.textContent = "+";
                    damageComponentsList.appendChild(plusSign);
                }
                isFirst = false;
                
                const card = document.createElement("div");
                card.className = "damage-component-card";
                card.setAttribute("data-type", type);
                
                card.innerHTML = `
                    <button class="btn-multiplier vulnerable ${activeMult === 'vulnerable' ? 'active' : ''}" data-mult="vulnerable">Vulnerable (x2)</button>
                    <div class="output-value-block">
                        <span class="output-dmg-value ${activeMult !== 'normal' ? activeMult : ''}">${finalVal}</span>
                        <span class="output-dmg-type">${type.toUpperCase()}</span>
                    </div>
                    <button class="btn-multiplier resistance ${activeMult === 'resistance' ? 'active' : ''}" data-mult="resistance">Resistance (/2)</button>
                    <button class="btn-multiplier immune ${activeMult === 'immune' ? 'active' : ''}" data-mult="immune">Immune (x0)</button>
                `;
                if (damageComponentsList) damageComponentsList.appendChild(card);
            }
        }
        
        if (!hasDamage && damageComponentsList) {
            damageComponentsList.innerHTML = `<div class="no-dmg-placeholder">Chưa có sát thương được tung</div>`;
        }
        
        if (totalDmgValue) totalDmgValue.textContent = totalSum;
    }

    if (damageComponentsList) {
        damageComponentsList.addEventListener("click", (e) => {
            const btn = e.target.closest(".btn-multiplier");
            if (!btn) return;
            const card = btn.closest(".damage-component-card");
            if (!card) return;
            const type = card.getAttribute("data-type");
            const mult = btn.getAttribute("data-mult");
            
            if (activeMultipliers[type] === mult) {
                activeMultipliers[type] = "normal";
            } else {
                activeMultipliers[type] = mult;
            }
            updateDamageDisplay();
        });
    }

    // ═══════════════════════════════════
    // 6. SỰ KIỆN ROLL SÁT THƯƠNG
    // ═══════════════════════════════════
    const btnRollTotalDice = document.getElementById("btn-roll-total-dice");

    if (btnRollTotalDice) {
        btnRollTotalDice.addEventListener("click", () => {
            const pool = getDicePoolData();
            
            if (pool.hitsCount === 0) {
                triggerStatusNotification("Vui lòng thiết lập ít nhất 1 đòn đánh TRÚNG (HIT) trước khi Roll.");
                return;
            }

            resetDamageModifiers();

            const rollResult = rollCombatDamage(false);
            baseRolledDamage = rollResult.totalDmg;
            activeDamageBreakdown = rollResult.breakdown;

            updateDamageDisplay();
            triggerStatusNotification(`Đã roll tổng sát thương: ${rollResult.totalDmg} DMG!`);
        });
    }

    document.querySelectorAll(".btn-roll-single-dmg").forEach(btn => {
        btn.addEventListener("click", () => {
            const strikeNum = parseInt(btn.getAttribute("data-strike"));
            const st = strikeStates[strikeNum];
            
            if (st.state !== "hit") {
                triggerStatusNotification(`Đòn đánh ${strikeNum} đang ở trạng thái HỤT hoặc CHƯA CHỌN. Bạn phải chọn TRÚNG (HIT) trước khi Roll Lẻ.`);
                return;
            }

            resetDamageModifiers();

            const wp = weaponsConfig[activeWeaponKey];

            triggerRollAnimation({
                title: `Roll Lẻ Sát Thương Đòn Đánh ${strikeNum}`,
                subtitle: `${wp.name} ${st.crit ? "(CHÍ MẠNG)" : ""}`,
                rollAction: () => {
                    const rollResult = rollCombatDamage(true, strikeNum);

                    baseRolledDamage = rollResult.totalDmg;
                    activeDamageBreakdown = rollResult.breakdown;

                    setTimeout(() => {
                        updateDamageDisplay();
                    }, 800);

                    return {
                        dieResult: rollResult.totalDmgDiceOnly,
                        modValue: rollResult.totalDmg - rollResult.totalDmgDiceOnly,
                        total: rollResult.totalDmg,
                        formula: `Công thức: ${rollResult.diceRecord.join(" + ")}`,
                        isCritSuccess: false,
                        isCritFail: false,
                        customCritText: `Đòn lẻ ${strikeNum}: Gây ${rollResult.totalDmg} DMG`
                    };
                }
            });
        });
    });

    function resetDamageModifiers() {
        activeMultipliers = {};
    }

    // ═══════════════════════════════════
    // 7. CÁC TÍNH NĂNG TÍNH TOÁN KHÁC (SAVING THROWS, ACTIONS...)
    // ═══════════════════════════════════
    const rollInitiativeBtn = document.getElementById("roll-initiative-btn");
    if (rollInitiativeBtn) {
        rollInitiativeBtn.addEventListener("click", () => {
            handleGeneralRoll("Initiative (Đổ lượt đi)", character.initiative, "Đổ Initiative");
        });
    }

    document.querySelectorAll(".btn-save-roll").forEach(btn => {
        btn.addEventListener("click", () => {
            const saveName = btn.getAttribute("data-save");
            const bonus = parseInt(btn.getAttribute("data-bonus")) || 0;
            handleGeneralRoll(`${saveName} Saving Throw`, bonus, "Cứu Nạn (Saving Throw)");
        });
    });

    // Toggle AC Khiên phép Shield trên Combat AC click
    const combatAcBox = document.getElementById("combat-ac-box");
    if (combatAcBox) {
        combatAcBox.style.cursor = "pointer";
        combatAcBox.addEventListener("click", () => {
            character.shieldActive = !character.shieldActive;
            character.ac = character.shieldActive ? 24 : 19;
            saveCharacterState();
            updateHpUI();
            triggerStatusNotification(character.shieldActive ? "Kích hoạt Khiên phép Shield! AC tăng thành 24 (+5)." : "Huỷ kích hoạt Khiên phép Shield. AC trở lại 19.");
        });
    }

    function handleGeneralRoll(rollName, bonus, rollType = "Kiểm tra thuộc tính") {
        triggerRollAnimation({
            title: `${rollType} (d20)`,
            subtitle: rollName,
            rollAction: () => {
                const die = rollDice(20);
                const total = die + bonus;
                const isCritSuccess = (die === 20);
                const isCritFail = (die === 1);

                return {
                    dieResult: die,
                    modValue: bonus,
                    total: total,
                    formula: `Công thức: 1d20 + ${bonus}`,
                    isCritSuccess,
                    isCritFail,
                    customCritText: `Tổng điểm kiểm tra: ${total}`
                };
            }
        });
    }

    // Reset lượt đi
    const chkAction = document.getElementById("chk-action");
    const chkBonus = document.getElementById("chk-bonus");
    const chkReaction = document.getElementById("chk-reaction");
    const chkMovement = document.getElementById("chk-movement");
    const btnResetTurn = document.getElementById("btn-reset-turn");

    if (btnResetTurn) {
        btnResetTurn.addEventListener("click", () => {
            if (chkAction) chkAction.checked = true;
            if (chkBonus) chkBonus.checked = false;
            if (chkReaction) chkReaction.checked = false;
            if (chkMovement) chkMovement.checked = false;

            for (let i = 1; i <= 3; i++) {
                strikeStates[i].state = "none";
                strikeStates[i].crit = false;
                strikeStates[i].addons.hex = false;
                strikeStates[i].addons.smite = false;
                strikeStates[i].addons.curse = false;

                const rowEl = document.getElementById(`strike-${i}`);
                if (rowEl) {
                    const hitBtn = rowEl.querySelector(".btn-strike-toggle.hit");
                    const missBtn = rowEl.querySelector(".btn-strike-toggle.miss");
                    const critBtn = rowEl.querySelector(".btn-strike-toggle.crit");
                    if (hitBtn) hitBtn.classList.remove("active");
                    if (missBtn) missBtn.classList.remove("active");
                    if (critBtn) {
                        critBtn.classList.remove("active");
                        critBtn.disabled = true;
                    }
                    rowEl.querySelectorAll(".chk-strike-addon").forEach(chk => chk.checked = false);
                }
            }

            document.querySelectorAll('.action-type-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.querySelector('input').checked = false;
            });
            document.querySelectorAll('.action-sub-panel').forEach(panel => panel.classList.remove('active'));

            updateTotalDicePool();
            activeDamageBreakdown = {};
            updateDamageDisplay();

            triggerStatusNotification("Đã đặt lại lượt đi mới và làm sạch bảng sát thương!");
        });
    }

    // Quản lý Trạng thái (Conditions)
    const conditionsContainer = document.getElementById("conditions-container");
    
    // Đọc trạng thái từ localStorage và tick các checkbox tương ứng khi tải trang
    function initializeConditions() {
        const conds = character.conditions || {};
        for (const cond in conds) {
            const input = conditionsContainer.querySelector(`input[value="${cond}"]`);
            if (input) {
                input.checked = conds[cond];
                // Kích hoạt class cho body ban đầu
                toggleBodyConditionClass(cond, conds[cond]);
            }
        }
    }

    function toggleBodyConditionClass(cond, isActive) {
        if (cond === "unconscious") {
            if (isActive) document.body.classList.add("unconscious-active");
            else document.body.classList.remove("unconscious-active");
        } else if (cond === "blinded") {
            if (isActive) document.body.classList.add("blinded-active");
            else document.body.classList.remove("blinded-active");
        } else if (cond === "poisoned") {
            if (isActive) document.body.classList.add("poisoned-active");
            else document.body.classList.remove("poisoned-active");
        }
    }

    if (conditionsContainer) {
        initializeConditions();

        conditionsContainer.querySelectorAll("input").forEach(input => {
            input.addEventListener("change", () => {
                const cond = input.value;
                const isActive = input.checked;
                
                if (!character.conditions) character.conditions = {};
                character.conditions[cond] = isActive;
                
                // Lưu vào localStorage
                saveCharacterState();

                toggleBodyConditionClass(cond, isActive);

                if (isActive) {
                    triggerStatusNotification(`Ragna chịu trạng thái ${cond.toUpperCase()}!`);
                } else {
                    triggerStatusNotification(`Đã loại bỏ trạng thái ${cond.toUpperCase()}.`);
                }
            });
        });
    }

    // Đăng ký các sự kiện Quick Action Roll và Quick Spell Roll
    document.getElementById("btn-quick-roll-stealth")?.addEventListener("click", () => {
        handleGeneralRoll("Stealth (Ẩn nấp)", 2, "Kiểm tra Stealth (Ẩn nấp)");
    });

    document.getElementById("btn-quick-roll-perception")?.addEventListener("click", () => {
        handleGeneralRoll("Perception (Nhận thức)", 6, "Kiểm tra Perception (Nhận thức)");
    });

    document.getElementById("btn-quick-roll-investigation")?.addEventListener("click", () => {
        handleGeneralRoll("Investigation (Điều tra)", 3, "Kiểm tra Investigation (Điều tra)");
    });

    // Uống Potion of Greater Healing (4d4 + 4)
    document.getElementById("btn-quick-use-potion")?.addEventListener("click", () => {
        triggerRollAnimation({
            title: "Sử dụng vật phẩm",
            subtitle: "Potion of Greater Healing",
            rollAction: () => {
                let rolledSum = 0;
                let rolls = [];
                for (let i = 0; i < 4; i++) {
                    const r = rollDice(4);
                    rolls.push(r);
                    rolledSum += r;
                }
                const healAmount = rolledSum + 4;
                const oldHp = character.hpCurrent;
                character.hpCurrent = Math.min(character.hpMax, character.hpCurrent + healAmount);
                const actualHealed = character.hpCurrent - oldHp;
                saveCharacterState();
                
                setTimeout(() => {
                    updateHpUI();
                    triggerStatusNotification(`Uống Potion of Greater Healing! Hồi +${actualHealed} HP (Tung d4: ${rolls.join("+")} + 4).`);
                }, 800);

                return {
                    dieResult: rolledSum,
                    modValue: 4,
                    total: healAmount,
                    formula: `Công thức: 4d4 (${rolls.join("+")}) + 4 HP`,
                    isCritSuccess: false,
                    isCritFail: false,
                    customCritText: `Hồi phục: +${healAmount} HP`
                };
            }
        });
    });

    // ═══════════════════════════════════
    // BONUS ACTIONS & REACTIONS LOGIC
    // ═══════════════════════════════════
    function syncBonusActionsButtons() {
        const btnCurse = document.getElementById("btn-use-curse");
        const btnSurface = document.getElementById("btn-use-surface-echo");
        const btnHunt = document.getElementById("btn-use-hunt");
        const itemShield = document.getElementById("reaction-item-shield");
        const btnShield = document.getElementById("btn-use-shield");

        if (btnCurse) {
            const isUsed = !!character.resources.curse;
            const parent = btnCurse.closest(".bonus-action-item");
            if (isUsed) {
                btnCurse.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnCurse.textContent = "KÍCH HOẠT";
                if (parent) parent.classList.remove("active");
            }
        }

        if (btnSurface) {
            const isUsed = !!character.resources.maskThoughts;
            const parent = btnSurface.closest(".bonus-action-item");
            if (isUsed) {
                btnSurface.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnSurface.textContent = "KÍCH HOẠT";
                if (parent) parent.classList.remove("active");
            }
        }

        if (btnHunt) {
            const isUsed = !!character.resources.kimonoHunt;
            const parent = btnHunt.closest(".bonus-action-item");
            if (isUsed) {
                btnHunt.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnHunt.textContent = "KÍCH HOẠT";
                if (parent) parent.classList.remove("active");
            }
        }

        if (itemShield && btnShield) {
            const isActive = !!character.shieldActive;
            if (isActive) {
                btnShield.textContent = "HUỶ SHIELD";
                itemShield.classList.add("active");
            } else {
                btnShield.textContent = "CAST SHIELD";
                itemShield.classList.remove("active");
            }
        }
    }

    // Đăng ký sự kiện click cho các nút Bonus Action mới
    const btnUseCurse = document.getElementById("btn-use-curse");
    if (btnUseCurse) {
        btnUseCurse.addEventListener("click", () => {
            const isUsed = !character.resources.curse;
            character.resources.curse = isUsed;
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Hexblade's Curse! Thêm +3 sát thương (Curse) và Crit trên 19-20.");
            } else {
                triggerStatusNotification("Hủy kích hoạt Hexblade's Curse.");
            }
        });
    }

    const btnUsePact = document.getElementById("btn-use-pact");
    if (btnUsePact) {
        btnUsePact.addEventListener("click", () => {
            triggerStatusNotification("Triệu hồi/Liên kết Pact Weapon thành công! Bạn sẵn sàng tấn công bằng Mortal Wrath.");
        });
    }

    const btnUseSurface = document.getElementById("btn-use-surface-echo");
    if (btnUseSurface) {
        btnUseSurface.addEventListener("click", () => {
            const isUsed = !character.resources.maskThoughts;
            character.resources.maskThoughts = isUsed;
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Surface Echo! Đọc ý nghĩ bề mặt của một sinh vật trong vòng 30 ft trong 1 round.");
            } else {
                triggerStatusNotification("Hủy kích hoạt Surface Echo.");
            }
        });
    }

    const btnUseRepel = document.getElementById("btn-use-repel");
    if (btnUseRepel) {
        btnUseRepel.addEventListener("click", () => {
            triggerStatusNotification("Kích hoạt Command Word: Repel! Sinh vật trong nón 30 ft phải thực hiện Wisdom Save DC 15.");
        });
    }

    const btnUseHunt = document.getElementById("btn-use-hunt");
    if (btnUseHunt) {
        btnUseHunt.addEventListener("click", () => {
            const isUsed = !character.resources.kimonoHunt;
            character.resources.kimonoHunt = isUsed;
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Command Word: Hunt! Dịch chuyển 30 ft cạnh mục tiêu Frightened. Đòn đầu trúng gây +2d6 Radiant.");
            } else {
                triggerStatusNotification("Hủy kích hoạt Command Word: Hunt.");
            }
        });
    }

    // Đăng ký sự kiện click cho các nút Reaction mới
    const btnUseShield = document.getElementById("btn-use-shield");
    if (btnUseShield) {
        btnUseShield.addEventListener("click", () => {
            character.shieldActive = !character.shieldActive;
            character.ac = character.shieldActive ? 24 : 19;
            saveCharacterState();
            updateHpUI();
            triggerStatusNotification(character.shieldActive ? "Kích hoạt Khiên phép Shield! AC tăng thành 24 (+5)." : "Huỷ kích hoạt Khiên phép Shield. AC trở lại 19.");
        });
    }

    const btnUseCounterspell = document.getElementById("btn-use-counterspell");
    if (btnUseCounterspell) {
        btnUseCounterspell.addEventListener("click", () => {
            if (consumePactSlot("Counterspell")) {
                triggerStatusNotification("Kích hoạt Counterspell! Kẻ địch trong 60ft phải thực hiện Constitution Save DC 15 hoặc mất spell.");
            }
        });
    }

    const btnUseOpportunityAttack = document.getElementById("btn-use-opportunity-attack");
    if (btnUseOpportunityAttack) {
        btnUseOpportunityAttack.addEventListener("click", () => {
            handleGeneralRoll("Tấn công Cơ hội (Mortal Wrath)", 9, "Opportunity Attack");
        });
    }

    // ═══════════════════════════════════
    // 8. TÀI NGUYÊN SYNC VÀ SPELL CONSUMPTION
    // ═══════════════════════════════════
    
    function syncSlotsUI() {
        const chks = document.querySelectorAll(".slot-chk");
        const count = character.pactSlotsCurrent;
        chks.forEach((chk, idx) => {
            chk.checked = (idx < (2 - count));
        });
    }

    function syncResourcesUI() {
        const resKeys = [
            'curse', 'specter', 'cunning', 
            'maskDisguise1', 'maskDisguise2', 'maskThoughts', 
            'kimonoHunt', 'seedLife', 
            'graspless1', 'graspless2', 'graspless3'
        ];
        resKeys.forEach(key => {
            const chk = document.getElementById(`chk-res-${key}`);
            if (chk) {
                chk.checked = !!character.resources[key];
            }
        });
        syncSlotsUI();
        syncBonusActionsButtons();
    }

    function registerResourceCheckboxListeners() {
        const resKeys = [
            'curse', 'specter', 'cunning', 
            'maskDisguise1', 'maskDisguise2', 'maskThoughts', 
            'kimonoHunt', 'seedLife', 
            'graspless1', 'graspless2', 'graspless3'
        ];
        resKeys.forEach(key => {
            const chk = document.getElementById(`chk-res-${key}`);
            if (chk) {
                chk.addEventListener("change", () => {
                    character.resources[key] = chk.checked;
                    saveCharacterState();
                    updateHpUI();
                    syncBonusActionsButtons();
                });
            }
        });

        document.querySelectorAll(".slot-chk").forEach((chk, idx) => {
            chk.addEventListener("change", () => {
                const checkedCount = document.querySelectorAll(".slot-chk:checked").length;
                character.pactSlotsCurrent = 2 - checkedCount;
                saveCharacterState();
                updateHpUI();
            });
        });
    }

    registerResourceCheckboxListeners();

    function consumePactSlot(spellName) {
        if (character.pactSlotsCurrent > 0) {
            character.pactSlotsCurrent--;
            saveCharacterState();
            updateHpUI();
            return true;
        } else {
            return confirm(`Bạn đã dùng hết Pact Slots hiện tại! Bạn có muốn tiếp tục cast phép "${spellName}" vượt mức (hoặc DM cấp phép) không?`);
        }
    }

    // Quick Spell Rolls
    document.querySelectorAll(".btn-quick-roll-spell").forEach(btn => {
        btn.addEventListener("click", () => {
            const spellName = btn.getAttribute("data-spell");
            const dmgExpr = btn.getAttribute("data-dmg");
            const dmgType = btn.getAttribute("data-type");

            const freeSpells = ["Booming Blade", "Eldritch Blast", "Chill Touch", "False Life"];
            const isFree = freeSpells.includes(spellName);

            if (!isFree) {
                if (!consumePactSlot(spellName)) return;
            }

            if (dmgExpr === "0") {
                let msg = `Kích hoạt phép ${spellName}!`;
                if (spellName === "Shield") {
                    character.shieldActive = true;
                    character.ac = 24;
                    saveCharacterState();
                    updateHpUI();
                    msg = "Kích hoạt Shield! +5 AC phản ứng cho đến đầu lượt sau (AC hiện tại: 24), miễn nhiễm Magic Missile.";
                } else if (spellName === "False Life") {
                    // Fiendish Vigor: cast miễn phí ở Bậc 4 (Pact Magic level) → max THP = 23
                    character.hpTemp = Math.max(character.hpTemp, 23);
                    saveCharacterState();
                    updateHpUI();
                    msg = "Kích hoạt False Life! Fiendish Vigor (Bậc 4, Miễn phí) → Nhận 23 Máu Tạm Thời (THP).";
                } else if (spellName === "Dimension Door") {
                    msg = "Kích hoạt Dimension Door! Teleport tối đa 500 ft đến vị trí mong muốn (Action). Có thể mang theo 1 willing creature.";
                } else if (spellName === "Counterspell") {
                    msg = "Kích hoạt Counterspell! Kẻ địch trong 60ft phải thực hiện Constitution Save DC 15 hoặc mất spell.";
                } else if (spellName === "Revivify") {
                    msg = "Kích hoạt Revivify! Tiêu tốn 1 diamond (300+ GP), hồi sinh mục tiêu vừa chết trong 1 phút với 1 HP.";
                } else if (spellName === "Darkness") {
                    msg = "Kích hoạt Darkness! Tạo bóng tối ma thuật bán kính 15 ft tập trung Concentration.";
                } else if (spellName === "Fly") {
                    msg = "Kích hoạt Fly! Nhận tốc độ bay 60 ft tập trung Concentration.";
                }
                syncBonusActionsButtons();
                triggerStatusNotification(msg);
                return;
            }

            resetDamageModifiers();

            triggerRollAnimation({
                title: `Cast Phép: ${spellName}`,
                subtitle: `Sát thương (${dmgType})`,
                rollAction: () => {
                    let rolledSum = 0;
                    let rolls = [];
                    let diceCount = 2;
                    let diceSides = 10;
                    let staticMod = 0;

                    if (spellName === "Eldritch Blast") {
                         diceCount = 2;
                         diceSides = 10;
                         staticMod = 8; // +4 CHA mod * 2 beams
                    } else if (spellName === "Chill Touch") {
                         diceCount = 2;
                         diceSides = 10;
                         staticMod = 0;
                    } else if (spellName === "Booming Blade") {
                         diceCount = 1;
                         diceSides = 8;
                         staticMod = 0;
                    } else if (spellName === "Shadow of Moil") {
                         diceCount = 2;
                         diceSides = 8;
                         staticMod = 0;
                    } else if (spellName === "Shining Smite") {
                         diceCount = 4;
                         diceSides = 6;
                         staticMod = 0;
                    }

                    for (let i = 0; i < diceCount; i++) {
                        const r = rollDice(diceSides);
                        rolls.push(r);
                        rolledSum += r;
                    }

                    const finalDamage = rolledSum + staticMod;
                    baseRolledDamage = finalDamage;
                    activeDamageBreakdown = { [dmgType.toLowerCase()]: finalDamage };

                    setTimeout(() => {
                        updateDamageDisplay();
                    }, 800);

                    return {
                        dieResult: rolledSum,
                        modValue: staticMod,
                        total: finalDamage,
                        formula: `Công thức: ${diceCount}d${diceSides} (${rolls.join("+")}) ${staticMod ? `+ ${staticMod}` : ''}`,
                        isCritSuccess: false,
                        isCritFail: false,
                        customCritText: `Cast phép ${spellName}: Gây ${finalDamage} DMG`
                    };
                }
            });
        });
    });

    // ═══════════════════════════════════
    // 9. KHỞI TẠO ĐẦU TRANG & ĐỒNG BỘ STORAGE EVENT
    // ═══════════════════════════════════
    updateHpUI();
    if (typeof syncStrike3Visibility === "function") {
        syncStrike3Visibility();
    }
    updateWeaponFormulas();
    updateTotalDicePool();

    window.addEventListener("storage", (e) => {
        if (e.key === "dnd_character_ragna") {
            const newState = getCharacterState();
            Object.assign(character, newState);
            
            // Sync Pact weapon damage type UI and config
            const newPactType = character.pactWeaponDamageType || "Slashing";
            weaponsConfig.greatsword.type = newPactType;
            
            pactDamageRadioLabels.forEach(label => {
                const input = label.querySelector("input");
                if (input.value.toLowerCase() === newPactType.toLowerCase()) {
                    input.checked = true;
                    label.classList.add("active");
                } else {
                    input.checked = false;
                    label.classList.remove("active");
                }
            });

            updateHpUI();
            if (typeof syncStrike3Visibility === "function") {
                syncStrike3Visibility();
            }
            updateWeaponFormulas();
            updateTotalDicePool();
        }
    });
});
