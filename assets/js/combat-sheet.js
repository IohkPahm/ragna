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
        hpMax: 61,
        hpCurrent: 61,
        hpTemp: 0,
        ac: 19,
        shieldActive: false,
        equippedArmor: "bulwark",
        initiative: 2,
        pactSlotsMax: 2,
        pactSlotsCurrent: 2,
        wrathStack: 0,
        pactWeaponDamageType: "Slashing",
        currentTurn: 1,
        roundHistory: [],
        turnActions: {
            pact: false,
            repel: false,
            counterspell: false,
            opportunity: false,
            curse: false,
            maskThoughts: false,
            kimonoHunt: false,
            shield: false,
            kasaLeap: false,
            bulwarkReduction: false,
            bulwarkResist: false,
            actionChecked: true,
            bonusChecked: false,
            reactionChecked: false,
            movementChecked: false
        },
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
            graspless3: false,
            bulwarkRecovery1: false,
            bulwarkRecovery2: false,
            bulwarkRecovery3: false,
            kasaCharges1: false,
            kasaCharges2: false,
            kasaCharges3: false
        },
        conditions: {
            blinded: false,
            frightened: false,
            poisoned: false,
            prone: false,
            stunned: false,
            unconscious: false
        },
        turnDamageRecords: {
            action: 0,
            reaction: 0,
            bonusAction: 0,
            other: 0
        },
        concentrationActive: false,
        concentratingSpell: null,
        shiningSmiteDamageApplied: false
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
                    },
                    turnActions: {
                        ...DEFAULT_STATE.turnActions,
                        ...(parsed.turnActions || {})
                    },
                    turnDamageRecords: {
                        ...DEFAULT_STATE.turnDamageRecords,
                        ...(parsed.turnDamageRecords || {})
                    },
                    roundHistory: parsed.roundHistory || []
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

    // Hàm tính AC động dựa vào trạng thái giáp và khiên phép
    function updateAC() {
        let dexMod = 2; // Ragna DEX 14 (+2)
        let baseAC = 15 + dexMod; // Cả hai bộ giáp đều có base AC 15 + DEX modifier (+2)
        let totalAC = baseAC + 1 /* Cloak of Protection */ + 1 /* Cường hóa +1 Armor chung */;
        if (character.shieldActive) {
            totalAC += 5;
        }
        character.ac = totalAC;
    }



    // Kiểm tra URL parameters để xác định có bắt đầu trận đấu mới không
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("combat") === "start") {
        character.currentTurn = 1;
        character.roundHistory = [];
        character.wrathStack = 0;
        character.shieldActive = false;
        updateAC();
        character.turnDamageRecords = {
            action: 0,
            reaction: 0,
            bonusAction: 0,
            other: 0
        };
        saveCharacterState();
        
        // Làm sạch URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // Cache các element DOM liên quan đến HP
    const combatCurrentHp = document.getElementById("combat-current-hp");
    const combatMaxHp = document.getElementById("combat-max-hp");
    const combatTempHp = document.getElementById("combat-temp-hp");
    const tempHpDisplay = document.getElementById("temp-hp-display");
    const combatHpBarFill = document.getElementById("combat-hp-bar-fill");
    const combatTempBarFill = document.getElementById("combat-temp-bar-fill");
    const hpInputValue = document.getElementById("hp-input-value");

    // Lưu trữ trạng thái tài nguyên lúc bắt đầu lượt để đối chiếu
    let turnStartState = {
        hpCurrent: character.hpCurrent,
        hpTemp: character.hpTemp,
        pactSlotsCurrent: character.pactSlotsCurrent,
        resources: JSON.parse(JSON.stringify(character.resources))
    };

    function captureTurnStartState() {
        turnStartState = {
            hpCurrent: character.hpCurrent,
            hpTemp: character.hpTemp,
            pactSlotsCurrent: character.pactSlotsCurrent,
            resources: JSON.parse(JSON.stringify(character.resources))
        };
    }

    // Hàm hiển thị Lịch sử lượt đấu
    function renderRoundHistoryUI() {
        const roundHistoryList = document.getElementById("round-history-list");
        const currentTurnDisplay = document.getElementById("current-turn-display");

        if (currentTurnDisplay) {
            currentTurnDisplay.textContent = character.currentTurn || 1;
        }

        if (!roundHistoryList) return;

        const history = character.roundHistory || [];
        if (history.length === 0) {
            roundHistoryList.innerHTML = `
                <div class="no-history-placeholder" style="color: var(--color-text-muted); font-size: 0.8rem; font-style: italic; text-align: center; padding: 15px 0;">
                    Chưa có lịch sử lượt đấu. Nhấn 'Next Turn' để ghi nhận.
                </div>
            `;
            return;
        }

        let html = "";
        for (let index = history.length - 1; index >= 0; index--) {
            const round = history[index];
            // Tách biệt các hành động từ bản ghi cũ hoặc mới để hiển thị đúng dòng riêng lẻ
            let actionsHtml = "";
            let actionText = round.action || null;
            let bonusActionText = round.bonusAction || null;
            let reactionText = round.reaction || null;
            let movementText = round.movement || null;

            if (round.actions && round.actions.length > 0) {
                round.actions.forEach(act => {
                    if (act.toLowerCase().includes("bonus action")) {
                        const match = act.match(/\(([^)]+)\)/);
                        bonusActionText = match ? match[1] : "Sử dụng";
                    } else if (act.toLowerCase().includes("reaction")) {
                        const match = act.match(/\(([^)]+)\)/);
                        reactionText = match ? match[1] : "Sử dụng";
                    } else if (act.toLowerCase().includes("movement") || act.toLowerCase().includes("di chuyển")) {
                        movementText = "Di chuyển (Tối đa 30 ft)";
                    } else {
                        actionText = act;
                    }
                });
            }

            // Hiển thị từng dòng hành động riêng lẻ nếu có
            if (actionText) {
                actionsHtml += `
                    <div class="round-detail-row">
                        <span class="round-detail-icon">⚔️</span>
                        <span class="round-detail-text"><strong>Action:</strong> ${actionText}</span>
                    </div>
                `;
            }
            if (bonusActionText) {
                actionsHtml += `
                    <div class="round-detail-row">
                        <span class="round-detail-icon">✨</span>
                        <span class="round-detail-text"><strong>Bonus Action:</strong> ${bonusActionText}</span>
                    </div>
                `;
            }
            if (reactionText) {
                actionsHtml += `
                    <div class="round-detail-row">
                        <span class="round-detail-icon">🛡️</span>
                        <span class="round-detail-text"><strong>Reaction:</strong> ${reactionText}</span>
                    </div>
                `;
            }
            if (movementText) {
                actionsHtml += `
                    <div class="round-detail-row">
                        <span class="round-detail-icon">🏃</span>
                        <span class="round-detail-text"><strong>Move:</strong> ${movementText}</span>
                    </div>
                `;
            }

            let resourcesHtml = "";
            if (round.resourcesSpent && round.resourcesSpent.length > 0) {
                resourcesHtml = `
                    <div class="round-detail-row">
                        <span class="round-detail-icon">💎</span>
                        <span class="round-detail-text"><strong>Tài nguyên:</strong> ${round.resourcesSpent.join(", ")}</span>
                    </div>
                `;
            }

            let hpChangesHtml = "";
            if (round.hpChanges) {
                hpChangesHtml = `
                    <div class="round-detail-row">
                        <span class="round-detail-icon">❤️</span>
                        <span class="round-detail-text"><strong>Sinh lực:</strong> ${round.hpChanges}</span>
                    </div>
                `;
            }

            html += `
                <div class="round-card-item">
                    <div class="round-card-header">
                        <div class="round-card-title-row">
                            <span class="round-card-title">LƯỢT ${round.round}</span>
                            <button class="round-card-delete-btn" data-index="${index}" title="Xóa lượt này">&times;</button>
                        </div>
                        <span class="round-card-dmg">${round.damage} DMG</span>
                    </div>
                    <div class="round-card-details">
                        ${actionsHtml}
                        ${resourcesHtml}
                        ${hpChangesHtml}
                    </div>
                </div>
            `;
        }

        roundHistoryList.innerHTML = html;

        // Đăng ký sự kiện nút xóa lượt
        roundHistoryList.querySelectorAll(".round-card-delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute("data-index"));
                if (!isNaN(idx)) {
                    character.roundHistory.splice(idx, 1);
                    saveCharacterState();
                    updateHpUI();
                    triggerStatusNotification("Đã xóa bản ghi lượt đấu!");
                }
            });
        });
    }

    // Hàm cập nhật giao diện HP và lưu trạng thái
    function updateHpUI(damageTaken = false) {
        // Đồng bộ dữ liệu

        if (combatCurrentHp) combatCurrentHp.textContent = character.hpCurrent;
        if (combatMaxHp) combatMaxHp.textContent = character.hpMax;
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
        updateAC();
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



        // Ẩn/hiện các Reaction đặc trưng của giáp Bulwark
        const bulwarkReductionRow = document.getElementById("reaction-item-bulwark-reduction");
        const bulwarkResistRow = document.getElementById("reaction-item-bulwark-resist");
        const isBulwark = character.equippedArmor === "bulwark";
        if (bulwarkReductionRow) {
            bulwarkReductionRow.style.display = isBulwark ? "flex" : "none";
        }
        if (bulwarkResistRow) {
            bulwarkResistRow.style.display = isBulwark ? "flex" : "none";
        }

        // Đồng bộ các checkbox tài nguyên
        syncResourcesUI();
        
        // Đồng bộ Concentration UI
        if (typeof syncConcentrationUI === "function") {
            syncConcentrationUI();
        }
        
        // Đồng bộ các checkbox lượt đi (Action, Bonus, Reaction, Move)
        if (typeof syncTurnCheckboxesUI === "function") {
            syncTurnCheckboxesUI();
        }

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

        // Cập nhật Lịch sử lượt đấu
        renderRoundHistoryUI();
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
        
        const wasConcentrating = character.concentrationActive && character.concentratingSpell;
        
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

        if (wasConcentrating) {
            if (character.hpCurrent === 0) {
                cancelConcentration();
                triggerStatusNotification("Ragna bị bất tỉnh (0 HP). Tự động mất tập trung phép thuật!");
            } else {
                startConcentrationCheck('auto', val);
            }
        }
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
        
        for (let i = 1; i <= 3; i++) {
            if (strikeStates[i]) {
                strikeStates[i].addons.curse = false;
            }
        }
        document.querySelectorAll('.chk-strike-addon[data-addon="curse"]').forEach(chk => chk.checked = false);
        
        // Reset Wrath Stack
        character.wrathStack = 0;
        currentWrathStack = 0;
        updateWrathStackUI();
        
        // Reset Shield
        character.shieldActive = false;
        updateAC();

        saveCharacterState();
        updateHpUI();
        updateTotalDicePool();
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

        for (let i = 1; i <= 3; i++) {
            if (strikeStates[i]) {
                strikeStates[i].addons.curse = false;
            }
        }
        document.querySelectorAll('.chk-strike-addon[data-addon="curse"]').forEach(chk => chk.checked = false);

        // Reset Wrath Stack
        character.wrathStack = 0;
        currentWrathStack = 0;
        updateWrathStackUI();

        // Reset Shield
        character.shieldActive = false;
        updateAC();

        saveCharacterState();
        updateHpUI();
        updateTotalDicePool();
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

                // Auto-apply Shining Smite damage if concentrating but not applied yet
                if (character.concentrationActive && character.concentratingSpell === "Shining Smite" && !character.shiningSmiteDamageApplied) {
                    strikeStates[strikeNum].addons.smite = true;
                    const chk = rowEl.querySelector('.chk-strike-addon[data-addon="smite"]');
                    if (chk) chk.checked = true;
                    character.shiningSmiteDamageApplied = true;
                    saveCharacterState();
                    triggerStatusNotification(`Tự động áp dụng +4d6 sát thương của Shining Smite lên Đòn Đánh ${strikeNum} (đòn đánh trúng đầu tiên).`);
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
    
    // Opportunity Attack DOM Elements & State
    const diceModalOaButtons = document.getElementById("dice-modal-oa-buttons");
    const btnOaHit = document.getElementById("btn-oa-hit");
    const btnOaMiss = document.getElementById("btn-oa-miss");
    const diceModalOaDamageSetup = document.getElementById("dice-modal-oa-damage-setup");
    const oaDamageDiceExpression = document.getElementById("oa-damage-dice-expression");
    const btnOaCritToggle = document.getElementById("btn-oa-crit-toggle");
    const btnOaRollDamage = document.getElementById("btn-oa-roll-damage");

    let lastOARoll = { isCrit: false, die: 0, total: 0 };
    let oaIsCrit = false;

    let conCheckActive = false;
    let conCheckType = null; // 'manual' or 'auto'
    let conDc = 10;

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
                if (diceModal) {
                    diceModal.classList.remove("double-dice-active");
                }
                // Reset Concentration UI blocks in modal
                const conSetup = document.getElementById("dice-modal-con-setup");
                if (conSetup) conSetup.style.display = "none";
                const conManualButtons = document.getElementById("dice-modal-con-manual-buttons");
                if (conManualButtons) conManualButtons.style.display = "none";
                conCheckActive = false;
                conCheckType = null;
            }
        });
    }

    if (btnCloseDiceModal) btnCloseDiceModal.addEventListener("click", hideDiceModal);
    if (btnDismissRoll) btnDismissRoll.addEventListener("click", hideDiceModal);
    if (diceModalOverlay) {
        diceModalOverlay.addEventListener("click", (e) => {
            if (e.target === diceModalOverlay) {
                // If OA buttons or OA Damage Setup are active, don't allow closing via click-outside
                const isOaActive = (diceModalOaButtons && diceModalOaButtons.style.display === "flex") || 
                                   (diceModalOaDamageSetup && diceModalOaDamageSetup.style.display === "flex");
                if (isOaActive || conCheckActive) return;
                hideDiceModal();
            }
        });
    }

    // Đăng ký sự kiện kiểm tra Concentration
    const btnConStatus = document.getElementById("btn-concentration-status");
    if (btnConStatus) {
        btnConStatus.addEventListener("click", () => {
            if (character.concentrationActive && character.concentratingSpell) {
                startConcentrationCheck('manual');
            } else {
                triggerStatusNotification("Không có phép nào đang duy trì tập trung.");
            }
        });
    }

    const btnConDisadv = document.getElementById("btn-con-disadv");
    if (btnConDisadv) {
        btnConDisadv.addEventListener("click", () => {
            performConcentrationRoll('disadv');
        });
    }

    const btnConNormal = document.getElementById("btn-con-normal");
    if (btnConNormal) {
        btnConNormal.addEventListener("click", () => {
            performConcentrationRoll('normal');
        });
    }

    const btnConAdv = document.getElementById("btn-con-adv");
    if (btnConAdv) {
        btnConAdv.addEventListener("click", () => {
            performConcentrationRoll('adv');
        });
    }

    const btnConSuccess = document.getElementById("btn-con-success");
    if (btnConSuccess) {
        btnConSuccess.addEventListener("click", () => {
            hideDiceModal();
            triggerStatusNotification("Giữ Concentration thành công.");
        });
    }

    const btnConFail = document.getElementById("btn-con-fail");
    if (btnConFail) {
        btnConFail.addEventListener("click", () => {
            cancelConcentration();
            hideDiceModal();
        });
    }

    function rollDice(sides) {
        return Math.floor(Math.random() * sides) + 1;
    }

    function triggerRollAnimation({ title, subtitle, rollAction, isOA = false, hideVisual = false }) {
        if (!diceModalOverlay) return;
        diceModalOverlay.style.display = "flex";
        diceModalOverlay.classList.remove("show-result");
        
        // Reset double dice layout
        if (diceModal) diceModal.classList.remove("double-dice-active");
        const container = document.getElementById("dice-graphic-container");
        if (container) container.classList.remove("double-dice");
        const diceVisual2 = document.getElementById("dice-visual-2");
        if (diceVisual2) diceVisual2.style.display = "none";
        
        if (diceVisual) {
            diceVisual.className = "dice-d20-visual";
            diceVisual.style.transform = "";
        }
        if (diceVisual2) {
            diceVisual2.className = "dice-d20-visual";
            diceVisual2.style.transform = "";
        }
        
        if (diceRollTitle) diceRollTitle.textContent = title.toUpperCase();
        if (diceRollSubtitle) diceRollSubtitle.textContent = subtitle.toUpperCase();
        if (diceCritText) diceCritText.textContent = "";
        if (diceNumberText) diceNumberText.textContent = "?";
        const diceNumberText2 = document.getElementById("dice-number-text-2");
        if (diceNumberText2) diceNumberText2.textContent = "?";
        
        // Hide elements during roll
        if (diceModalOaButtons) diceModalOaButtons.style.display = "none";
        if (btnDismissRoll) btnDismissRoll.style.display = "none";
        if (btnCloseDiceModal) btnCloseDiceModal.style.display = "none";
        if (diceModalOaDamageSetup) diceModalOaDamageSetup.style.display = "none";
        
        // Hide or show the dice graphic container (d20 SVG visual)
        const graphicContainer = document.querySelector(".dice-graphic-container");
        if (graphicContainer) {
            graphicContainer.style.display = hideVisual ? "none" : "flex";
        }
        
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
            
            // Show appropriate buttons after the roll is done
            if (isOA) {
                if (diceModalOaButtons) diceModalOaButtons.style.display = "flex";
                if (btnDismissRoll) btnDismissRoll.style.display = "none";
                if (btnCloseDiceModal) btnCloseDiceModal.style.display = "none";
            } else {
                if (diceModalOaButtons) diceModalOaButtons.style.display = "none";
                if (btnDismissRoll) btnDismissRoll.style.display = "inline-block"; // Center by being inline-block under text-align: center
                if (btnCloseDiceModal) btnCloseDiceModal.style.display = "block";
            }
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
            
            // Record action damage
            character.turnDamageRecords.action = rollResult.totalDmg;
            saveCharacterState();

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

                    // Accumulate single strike damage to action damage
                    character.turnDamageRecords.action = (character.turnDamageRecords.action || 0) + rollResult.totalDmg;
                    saveCharacterState();

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
            updateAC();
            if (character.turnActions) {
                character.turnActions.shield = character.shieldActive;
                if (character.shieldActive) character.turnActions.reactionChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            triggerStatusNotification(character.shieldActive ? `Kích hoạt Khiên phép Shield! AC tăng thành ${character.ac} (+5).` : `Huỷ kích hoạt Khiên phép Shield. AC trở lại ${character.ac}.`);
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

    function syncTurnCheckboxesUI() {
        if (chkAction) chkAction.checked = !!(character.turnActions && character.turnActions.actionChecked);
        if (chkBonus) chkBonus.checked = !!(character.turnActions && character.turnActions.bonusChecked);
        if (chkReaction) chkReaction.checked = !!(character.turnActions && character.turnActions.reactionChecked);
        if (chkMovement) chkMovement.checked = !!(character.turnActions && character.turnActions.movementChecked);
    }

    if (chkAction) {
        chkAction.addEventListener("change", () => {
            character.turnActions.actionChecked = chkAction.checked;
            saveCharacterState();
        });
    }
    if (chkBonus) {
        chkBonus.addEventListener("change", () => {
            character.turnActions.bonusChecked = chkBonus.checked;
            saveCharacterState();
        });
    }
    if (chkReaction) {
        chkReaction.addEventListener("change", () => {
            character.turnActions.reactionChecked = chkReaction.checked;
            saveCharacterState();
        });
    }
    if (chkMovement) {
        chkMovement.addEventListener("change", () => {
            character.turnActions.movementChecked = chkMovement.checked;
            saveCharacterState();
        });
    }

    function executeTurnReset() {
        // 1. Gather resource usage of current round
        const totalDmg = (character.turnDamageRecords.action || 0) + 
                         (character.turnDamageRecords.reaction || 0) + 
                         (character.turnDamageRecords.bonusAction || 0) + 
                         (character.turnDamageRecords.other || 0);
        
        let actionLog = null;
        if (chkAction && chkAction.checked) {
            const actionType = document.querySelector('input[name="combat-action-type"]:checked')?.value || 'attack';
            if (actionType === 'attack') {
                const wp = weaponsConfig[activeWeaponKey]?.name || "vũ khí";
                let strikesText = [];
                for (let i = 1; i <= 3; i++) {
                    const st = strikeStates[i];
                    if (st && st.state !== 'none') {
                        strikesText.push(`Đòn ${i}: ${st.state === 'hit' ? (st.crit ? 'Crit' : 'Trúng') : 'Hụt'}`);
                    }
                }
                actionLog = `Tấn công (${wp}${strikesText.length > 0 ? ': ' + strikesText.join(', ') : ''})`;
            } else {
                const typeLabels = {
                    spell: "Cast Spell",
                    dash: "Dash",
                    disengage: "Disengage",
                    dodge: "Dodge",
                    hide: "Hide (Ẩn nấp)",
                    search: "Search (Tìm kiếm)",
                    useobj: "Use Object"
                };
                actionLog = `${typeLabels[actionType] || actionType}`;
            }
            
            // Append damage details to action log
            if (character.turnDamageRecords.action > 0) {
                actionLog += ` - ${character.turnDamageRecords.action} DMG`;
            }
        }

        let bonusActionLog = null;
        if (chkBonus && chkBonus.checked) {
            let bonusLabels = [];
            if (character.turnActions && character.turnActions.curse) {
                bonusLabels.push("Hexblade's Curse");
            }
            if (character.turnActions && character.turnActions.maskThoughts) {
                bonusLabels.push("Surface Echo");
            }
            if (character.turnActions && character.turnActions.kimonoHunt) {
                bonusLabels.push("Command Word: Hunt");
            }
            if (character.turnActions && character.turnActions.repel) {
                bonusLabels.push("Command Word: Repel");
            }
            if (character.turnActions && character.turnActions.pact) {
                bonusLabels.push("Triệu hồi Pact Weapon");
            }
            bonusActionLog = bonusLabels.length > 0 ? `${bonusLabels.join(', ')}` : "Bonus Action (Sử dụng)";
            if (character.turnDamageRecords.bonusAction > 0) {
                bonusActionLog += ` - ${character.turnDamageRecords.bonusAction} DMG`;
            }
        }

        let reactionLog = null;
        if (chkReaction && chkReaction.checked) {
            let rxLabels = [];
            if (character.turnActions && character.turnActions.shield) {
                rxLabels.push("Shield");
            }
            if (character.turnActions && character.turnActions.counterspell) {
                rxLabels.push("Counterspell");
            }
            if (character.turnActions && character.turnActions.opportunity) {
                let label = "Opportunity Attack";
                if (character.turnDamageRecords.reaction > 0) {
                    label += ` - ${character.turnDamageRecords.reaction} DMG`;
                }
                rxLabels.push(label);
            }
            
            if (character.turnDamageRecords.reaction > 0 && !character.turnActions.opportunity) {
                reactionLog = rxLabels.length > 0 ? `${rxLabels.join(', ')} - ${character.turnDamageRecords.reaction} DMG` : `Reaction (Sử dụng) - ${character.turnDamageRecords.reaction} DMG`;
            } else {
                reactionLog = rxLabels.length > 0 ? `${rxLabels.join(', ')}` : "Reaction (Sử dụng)";
            }
        }

        let movementLog = null;
        if (chkMovement && chkMovement.checked) {
            movementLog = "Di chuyển (Tối đa 30 ft)";
        }

        // 2. Resources Spent
        const resourcesSpent = [];
        const spentSlots = turnStartState.pactSlotsCurrent - character.pactSlotsCurrent;
        if (spentSlots > 0) {
            resourcesSpent.push(`${spentSlots}x Pact Slot Bậc 4`);
        }
        
        const resourceNames = {
            curse: "Hexblade's Curse",
            specter: "Specter Companion",
            cunning: "Magical Cunning",
            maskDisguise1: "Mask Disguise (Veil 1)",
            maskDisguise2: "Mask Disguise (Veil 2)",
            maskThoughts: "Surface Echo",
            kimonoHunt: "Command Word: Hunt",
            seedLife: "Seed Life Pulse",
            graspless1: "Graspless FF (Lượt 1)",
            graspless2: "Graspless FF (Lượt 2)",
            graspless3: "Graspless FF (Lượt 3)"
        };

        for (const key in character.resources) {
            if (character.resources[key] && !turnStartState.resources[key]) {
                resourcesSpent.push(resourceNames[key] || key);
            }
        }

        // 3. HP changes
        let hpChanges = "";
        const hpDiff = character.hpCurrent - turnStartState.hpCurrent;
        const thpDiff = character.hpTemp - turnStartState.hpTemp;
        
        let hpParts = [];
        if (hpDiff < 0) {
            hpParts.push(`${hpDiff} HP`);
        } else if (hpDiff > 0) {
            hpParts.push(`+${hpDiff} HP`);
        }

        if (thpDiff > 0) {
            hpParts.push(`+${thpDiff} Temp HP`);
        } else if (thpDiff < 0) {
            hpParts.push(`${thpDiff} Temp HP`);
        }

        if (hpParts.length > 0) {
            hpChanges = `${hpParts.join(", ")} (Hiện tại: ${character.hpCurrent}/${character.hpMax}${character.hpTemp > 0 ? ` + ${character.hpTemp} THP` : ''})`;
        } else {
            hpChanges = `Không đổi (Hiện tại: ${character.hpCurrent}/${character.hpMax}${character.hpTemp > 0 ? ` + ${character.hpTemp} THP` : ''})`;
        }

        // 4. Construct round history entry and push
        const roundEntry = {
            round: character.currentTurn || 1,
            damage: totalDmg,
            action: actionLog,
            bonusAction: bonusActionLog,
            reaction: reactionLog,
            movement: movementLog,
            resourcesSpent: resourcesSpent,
            hpChanges: hpChanges
        };

        if (!character.roundHistory) character.roundHistory = [];
        character.roundHistory.push(roundEntry);

        // 5. Reset turn manager actions
        if (chkAction) chkAction.checked = true;
        if (chkBonus) chkBonus.checked = false;
        if (chkReaction) chkReaction.checked = false;
        if (chkMovement) chkMovement.checked = false;

        const hasCurse = !!character.resources.curse;
        for (let i = 1; i <= 3; i++) {
            strikeStates[i].state = "none";
            strikeStates[i].crit = false;
            strikeStates[i].addons.kimonoHunt = false;
            strikeStates[i].addons.smite = false;
            strikeStates[i].addons.curse = hasCurse;

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
                rowEl.querySelectorAll(".chk-strike-addon").forEach(chk => {
                    const addonName = chk.getAttribute("data-addon");
                    if (addonName === "curse") {
                        chk.checked = hasCurse;
                    } else {
                        chk.checked = false;
                    }
                });
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

        // 6. Increment current turn
        character.currentTurn = (character.currentTurn || 1) + 1;
        
        // Reset temporary turn actions for next turn
        if (character.turnActions) {
            character.turnActions.pact = false;
            character.turnActions.repel = false;
            character.turnActions.counterspell = false;
            character.turnActions.opportunity = false;
            character.turnActions.curse = false;
            character.turnActions.maskThoughts = false;
            character.turnActions.kimonoHunt = false;
            character.turnActions.shield = false;
            character.turnActions.kasaLeap = false;
            character.turnActions.bulwarkReduction = false;
            character.turnActions.bulwarkResist = false;
            character.turnActions.actionChecked = true;
            character.turnActions.bonusChecked = false;
            character.turnActions.reactionChecked = false;
            character.turnActions.movementChecked = false;
        }

        // Reset turn damage records for the next turn
        character.turnDamageRecords = {
            action: 0,
            reaction: 0,
            bonusAction: 0,
            other: 0
        };

        // 7. Save state and update UI
        saveCharacterState();
        updateHpUI();
        
        // 8. Capture new turnStartState
        captureTurnStartState();

        triggerStatusNotification(`Đã kết thúc Lượt ${roundEntry.round}. Bắt đầu Lượt ${character.currentTurn}!`);
    }

    const btnResetTurn = document.getElementById("btn-reset-turn");
    if (btnResetTurn) {
        btnResetTurn.addEventListener("click", executeTurnReset);
    }

    const btnResetTurnLarge = document.getElementById("btn-reset-turn-large");
    if (btnResetTurnLarge) {
        btnResetTurnLarge.addEventListener("click", executeTurnReset);
    }

    // Reset Combat logic
    const btnResetCombat = document.getElementById("btn-reset-combat");
    if (btnResetCombat) {
        btnResetCombat.addEventListener("click", () => {
            if (confirm("Bạn có chắc chắn muốn kết thúc trận đấu và đặt lại toàn bộ lịch sử lượt về Lượt 1?")) {
                character.currentTurn = 1;
                character.roundHistory = [];
                character.wrathStack = 0;
                character.shieldActive = false;
                character.ac = 19;
                character.concentrationActive = false;
                character.concentratingSpell = null;
                character.shiningSmiteDamageApplied = false;
                
                if (character.turnActions) {
                    character.turnActions.pact = false;
                    character.turnActions.repel = false;
                    character.turnActions.counterspell = false;
                    character.turnActions.opportunity = false;
                    character.turnActions.curse = false;
                    character.turnActions.maskThoughts = false;
                    character.turnActions.kimonoHunt = false;
                    character.turnActions.shield = false;
                    character.turnActions.actionChecked = true;
                    character.turnActions.bonusChecked = false;
                    character.turnActions.reactionChecked = false;
                    character.turnActions.movementChecked = false;
                }
                
                if (chkAction) chkAction.checked = true;
                if (chkBonus) chkBonus.checked = false;
                if (chkReaction) chkReaction.checked = false;
                if (chkMovement) chkMovement.checked = false;

                for (let i = 1; i <= 3; i++) {
                    strikeStates[i].state = "none";
                    strikeStates[i].crit = false;
                    strikeStates[i].addons.kimonoHunt = false;
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

                character.turnDamageRecords = {
                    action: 0,
                    reaction: 0,
                    bonusAction: 0,
                    other: 0
                };

                saveCharacterState();
                updateHpUI();
                captureTurnStartState();
                
                triggerStatusNotification("Đã đặt lại trận đấu về Lượt 1!");
            }
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
    // CONCENTRATION & SHINING SMITE LOGIC
    // ═══════════════════════════════════
    const CONCENTRATION_SPELLS = ["Shining Smite", "Darkness", "Fly", "Shadow of Moil"];

    function syncConcentrationUI() {
        const btnCon = document.getElementById("btn-concentration-status");
        if (!btnCon) return;

        if (character.concentrationActive && character.concentratingSpell) {
            btnCon.textContent = `CONCENTRATION: ${character.concentratingSpell.toUpperCase()}`;
            btnCon.className = "btn-concentration active";
        } else {
            btnCon.textContent = "CONCENTRATION: NONE";
            btnCon.className = "btn-concentration none";
        }
    }

    function cancelConcentration() {
        if (!character.concentrationActive) return;

        const previousSpell = character.concentratingSpell;
        character.concentrationActive = false;
        character.concentratingSpell = null;
        character.shiningSmiteDamageApplied = false;

        // If previous spell was Shining Smite, remove smite addon from all strikes
        if (previousSpell === "Shining Smite") {
            for (let i = 1; i <= 3; i++) {
                if (strikeStates[i]) {
                    strikeStates[i].addons.smite = false;
                }
            }
            document.querySelectorAll('.chk-strike-addon[data-addon="smite"]').forEach(chk => {
                chk.checked = false;
            });
            updateTotalDicePool();
        }

        saveCharacterState();
        updateHpUI();
        triggerStatusNotification(`Mất tập trung phép ${previousSpell}!`);
    }

    function toggleShiningSmite() {
        const isCurrentlyActive = character.concentrationActive && character.concentratingSpell === "Shining Smite";
        if (isCurrentlyActive) {
            cancelConcentration();
        } else {
            // Deduct spell slot
            if (!consumePactSlot("Shining Smite")) return;

            // Track latest hit
            let latestHitIndex = -1;
            for (let i = 1; i <= 3; i++) {
                if (strikeStates[i] && strikeStates[i].state === "hit") {
                    latestHitIndex = i;
                }
            }

            // Lose previous concentration if any
            if (character.concentrationActive && character.concentratingSpell) {
                const prev = character.concentratingSpell;
                if (prev === "Shining Smite") {
                    for (let i = 1; i <= 3; i++) {
                        if (strikeStates[i]) {
                            strikeStates[i].addons.smite = false;
                        }
                    }
                    document.querySelectorAll('.chk-strike-addon[data-addon="smite"]').forEach(chk => {
                        chk.checked = false;
                    });
                }
            }

            // Start concentration
            character.concentrationActive = true;
            character.concentratingSpell = "Shining Smite";
            character.shiningSmiteDamageApplied = false;

            // If a hit was found, check smite checkbox and set shiningSmiteDamageApplied to true
            if (latestHitIndex !== -1) {
                strikeStates[latestHitIndex].addons.smite = true;
                const chk = document.querySelector(`.chk-strike-addon[data-strike="${latestHitIndex}"][data-addon="smite"]`);
                if (chk) chk.checked = true;
                character.shiningSmiteDamageApplied = true;
                triggerStatusNotification("Kích hoạt Shining Smite! Đã trừ 1 Pact Slot Bậc 4. Tự động cộng +4d6 Radiant vào Đòn Đánh " + latestHitIndex + ".");
            } else {
                triggerStatusNotification("Kích hoạt Shining Smite! Đã trừ 1 Pact Slot Bậc 4. Bắt đầu duy trì Concentration (chờ đòn đánh trúng).");
            }

            if (chkBonus) {
                chkBonus.checked = true;
                character.turnActions.bonusChecked = true;
            }

            saveCharacterState();
            updateHpUI();
            updateTotalDicePool();
        }
    }

    function startConcentrationCheck(type, damageValue = 0) {
        if (!diceModalOverlay) return;

        conCheckActive = true;
        conCheckType = type; // 'manual' or 'auto'

        // Reset double dice layout in graphic container
        if (diceModal) diceModal.classList.remove("double-dice-active");
        const container = document.getElementById("dice-graphic-container");
        if (container) container.classList.remove("double-dice");
        const diceVisual2 = document.getElementById("dice-visual-2");
        if (diceVisual2) diceVisual2.style.display = "none";

        if (diceVisual) {
            diceVisual.className = "dice-d20-visual";
            diceVisual.style.transform = "";
        }
        if (diceVisual2) {
            diceVisual2.className = "dice-d20-visual";
            diceVisual2.style.transform = "";
        }

        // Prepare modal elements
        if (diceRollTitle) diceRollTitle.textContent = type === 'auto' ? "CONCENTRATION CHECK (AUTO)" : "CONCENTRATION CHECK (MANUAL)";
        if (diceRollSubtitle) diceRollSubtitle.textContent = character.concentratingSpell ? character.concentratingSpell.toUpperCase() : "NO ACTIVE SPELL";
        if (diceCritText) diceCritText.textContent = "";
        if (diceNumberText) diceNumberText.textContent = "?";
        const diceNumberText2 = document.getElementById("dice-number-text-2");
        if (diceNumberText2) diceNumberText2.textContent = "?";
        if (diceTotalDisplay) diceTotalDisplay.textContent = "";

        // Hide other elements
        if (diceModalOaButtons) diceModalOaButtons.style.display = "none";
        if (diceModalOaDamageSetup) diceModalOaDamageSetup.style.display = "none";
        if (btnDismissRoll) btnDismissRoll.style.display = "none";
        if (btnCloseDiceModal) btnCloseDiceModal.style.display = "none";
        const manualButtons = document.getElementById("dice-modal-con-manual-buttons");
        if (manualButtons) manualButtons.style.display = "none";

        // Show setup panel
        const conSetup = document.getElementById("dice-modal-con-setup");
        if (conSetup) {
            conSetup.style.display = "flex";
            const dcDisplay = document.getElementById("con-dc-display");
            if (dcDisplay) {
                if (type === 'auto') {
                    conDc = Math.max(10, Math.floor(damageValue / 2));
                    dcDisplay.textContent = `KIỂM TRA TỰ ĐỘNG - ĐỘ KHÓ (DC): ${conDc}`;
                } else {
                    conDc = 10;
                    dcDisplay.textContent = "KIỂM TRA TẬP TRUNG (THỦ CÔNG)";
                }
            }
        }

        // Clear formula displays
        if (diceCalcFormula) diceCalcFormula.textContent = "";
        if (diceCalcDie) diceCalcDie.textContent = "";
        if (diceCalcMod) diceCalcMod.textContent = "";

        // Display modal
        diceModalOverlay.style.display = "flex";
        diceModalOverlay.classList.remove("show-result");

        const graphicContainer = document.querySelector(".dice-graphic-container");
        if (graphicContainer) {
            graphicContainer.style.display = "flex";
        }

        gsap.fromTo(diceModal, 
            { scale: 0.85, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }
        );
    }

    function performConcentrationRoll(rollType) {
        const conSetup = document.getElementById("dice-modal-con-setup");
        if (conSetup) conSetup.style.display = "none";

        const container = document.getElementById("dice-graphic-container");
        const diceVisual2 = document.getElementById("dice-visual-2");
        const diceNumberText2 = document.getElementById("dice-number-text-2");

        // Clean up classes/styling
        if (container) container.classList.remove("double-dice");
        if (diceVisual2) diceVisual2.style.display = "none";
        
        if (diceVisual) {
            diceVisual.className = "dice-d20-visual";
            diceVisual.style.transform = "";
        }
        if (diceVisual2) {
            diceVisual2.className = "dice-d20-visual";
            diceVisual2.style.transform = "";
        }

        const isAdvOrDis = (rollType === 'adv' || rollType === 'disadv');

        if (isAdvOrDis) {
            if (container) container.classList.add("double-dice");
            if (diceModal) diceModal.classList.add("double-dice-active");
            if (diceVisual2) diceVisual2.style.display = "block";
            if (diceVisual) diceVisual.classList.add("rolling");
            if (diceVisual2) diceVisual2.classList.add("rolling");
        } else {
            if (diceVisual) diceVisual.classList.add("rolling");
        }

        let count = 0;
        const spinInterval = setInterval(() => {
            if (diceNumberText) diceNumberText.textContent = rollDice(20);
            if (isAdvOrDis && diceNumberText2) {
                diceNumberText2.textContent = rollDice(20);
            }
            count++;
            if (count > 12) clearInterval(spinInterval);
        }, 60);

        setTimeout(() => {
            if (diceVisual) diceVisual.classList.remove("rolling");
            if (isAdvOrDis && diceVisual2) diceVisual2.classList.remove("rolling");

            // Perform rolls
            let r1 = rollDice(20);
            let r2 = null;
            let rolledValue = r1;
            let formulaText = "";

            if (rollType === 'adv') {
                r2 = rollDice(20);
                rolledValue = Math.max(r1, r2);
                formulaText = `Advantage: max(${r1}, ${r2})`;
            } else if (rollType === 'disadv') {
                r2 = rollDice(20);
                rolledValue = Math.min(r1, r2);
                formulaText = `Disadvantage: min(${r1}, ${r2})`;
            } else {
                formulaText = `Đổ d20: ${r1}`;
            }

            const conSaveBonus = parseInt(document.getElementById("btn-save-con")?.getAttribute("data-bonus")) || 4;
            const total = rolledValue + conSaveBonus;

            if (diceNumberText) diceNumberText.textContent = r1;
            if (isAdvOrDis && diceNumberText2) {
                diceNumberText2.textContent = r2;
            }

            // Apply selected/grayed styling
            if (isAdvOrDis) {
                if (rollType === 'adv') {
                    if (r1 >= r2) {
                        if (diceVisual) diceVisual.classList.add("chosen-adv");
                        if (diceVisual2) diceVisual2.classList.add("unchosen");
                    } else {
                        if (diceVisual) diceVisual.classList.add("unchosen");
                        if (diceVisual2) diceVisual2.classList.add("chosen-adv");
                    }
                } else if (rollType === 'disadv') {
                    if (r1 <= r2) {
                        if (diceVisual) diceVisual.classList.add("chosen-disadv");
                        if (diceVisual2) diceVisual2.classList.add("unchosen");
                    } else {
                        if (diceVisual) diceVisual.classList.add("unchosen");
                        if (diceVisual2) diceVisual2.classList.add("chosen-disadv");
                    }
                }
            }

            if (diceCalcFormula) diceCalcFormula.textContent = `Công thức: ${formulaText} + ${conSaveBonus}`;
            if (diceCalcDie) diceCalcDie.textContent = rolledValue;
            if (diceCalcMod) diceCalcMod.textContent = `+ ${conSaveBonus}`;

            if (diceTotalDisplay) {
                diceTotalDisplay.textContent = total;
                diceTotalDisplay.className = "dice-total-display";
            }

            diceModalOverlay.classList.add("show-result");

            if (conCheckType === 'auto') {
                const isSuccess = (rolledValue === 20) || (total >= conDc);
                if (isSuccess) {
                    if (diceTotalDisplay) diceTotalDisplay.classList.add("crit-success");
                    if (diceCritText) {
                        if (rolledValue === 20) {
                            diceCritText.textContent = `CRITICAL SUCCESS (NAT 20)! Tự động giữ được spell.`;
                        } else {
                            diceCritText.textContent = `THÀNH CÔNG (ĐẠT DC ${conDc})! Giữ được spell.`;
                        }
                        diceCritText.style.color = "var(--color-success)";
                    }
                } else {
                    if (diceTotalDisplay) diceTotalDisplay.classList.add("crit-fail");
                    if (diceCritText) {
                        diceCritText.textContent = `THẤT BẠI (KHÔNG ĐẠT DC ${conDc})! Mất tập trung spell.`;
                        diceCritText.style.color = "var(--color-danger)";
                    }
                    cancelConcentration();
                }

                // Show standard dismiss button
                if (btnDismissRoll) {
                    btnDismissRoll.textContent = "ĐỒNG Ý";
                    btnDismissRoll.style.display = "inline-block";
                }
                if (btnCloseDiceModal) btnCloseDiceModal.style.display = "block";

            } else {
                // Manual check: show Success & Fail manual selection buttons
                if (diceCritText) {
                    diceCritText.textContent = `Chọn kết quả cho phép: ${character.concentratingSpell}`;
                    diceCritText.style.color = "var(--color-accent-orange)";
                }

                const manualButtons = document.getElementById("dice-modal-con-manual-buttons");
                if (manualButtons) {
                    manualButtons.style.display = "flex";
                }
                if (btnDismissRoll) btnDismissRoll.style.display = "none";
                if (btnCloseDiceModal) btnCloseDiceModal.style.display = "none";
            }
        }, 800);
    }

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

        const btnPact = document.getElementById("btn-use-pact");
        if (btnPact) {
            const isUsed = !!(character.turnActions && character.turnActions.pact);
            const parent = btnPact.closest(".bonus-action-item");
            if (isUsed) {
                btnPact.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnPact.textContent = "TRIỆU HỒI";
                if (parent) parent.classList.remove("active");
            }
        }

        const btnRepel = document.getElementById("btn-use-repel");
        if (btnRepel) {
            const isUsed = !!(character.turnActions && character.turnActions.repel);
            const parent = btnRepel.closest(".bonus-action-item");
            if (isUsed) {
                btnRepel.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnRepel.textContent = "KÍCH HOẠT";
                if (parent) parent.classList.remove("active");
            }
        }

        const btnCounterspell = document.getElementById("btn-use-counterspell");
        if (btnCounterspell) {
            const isUsed = !!(character.turnActions && character.turnActions.counterspell);
            const parent = btnCounterspell.closest(".reaction-action-item");
            if (isUsed) {
                btnCounterspell.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnCounterspell.textContent = "CAST COUNTERSPELL";
                if (parent) parent.classList.remove("active");
            }
        }

        const btnOpportunity = document.getElementById("btn-use-opportunity-attack");
        if (btnOpportunity) {
            const isUsed = !!(character.turnActions && character.turnActions.opportunity);
            const parent = btnOpportunity.closest(".reaction-action-item");
            if (isUsed) {
                btnOpportunity.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnOpportunity.textContent = "TẤN CÔNG CƠ HỘI";
                if (parent) parent.classList.remove("active");
            }
        }

        const btnBulwarkReduction = document.getElementById("btn-use-bulwark-reduction");
        if (btnBulwarkReduction) {
            const isUsed = !!(character.turnActions && character.turnActions.bulwarkReduction);
            const parent = btnBulwarkReduction.closest(".reaction-action-item");
            if (isUsed) {
                btnBulwarkReduction.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnBulwarkReduction.textContent = "KÍCH HOẠT";
                if (parent) parent.classList.remove("active");
            }
        }

        const btnBulwarkResist = document.getElementById("btn-use-bulwark-resist");
        if (btnBulwarkResist) {
            const isUsed = !!(character.turnActions && character.turnActions.bulwarkResist);
            const parent = btnBulwarkResist.closest(".reaction-action-item");
            if (isUsed) {
                btnBulwarkResist.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnBulwarkResist.textContent = "KÍCH HOẠT";
                if (parent) parent.classList.remove("active");
            }
        }

        const btnKasaLeapBonus = document.getElementById("btn-use-kasa-leap-bonus");
        if (btnKasaLeapBonus) {
            const isUsed = !!(character.turnActions && character.turnActions.kasaLeap);
            const parent = btnKasaLeapBonus.closest(".bonus-action-item");
            if (isUsed) {
                btnKasaLeapBonus.textContent = "HUỶ DÙNG";
                if (parent) parent.classList.add("active");
            } else {
                btnKasaLeapBonus.textContent = "KÍCH HOẠT";
                if (parent) parent.classList.remove("active");
            }
        }
        const btnShiningSmite = document.getElementById("btn-use-shining-smite");
        if (btnShiningSmite) {
            const isConcentratingOnSmite = (character.concentrationActive && character.concentratingSpell === "Shining Smite");
            const parent = btnShiningSmite.closest(".bonus-action-item");
            if (isConcentratingOnSmite) {
                btnShiningSmite.textContent = "HỦY CONCENTRATION";
                if (parent) parent.classList.add("active");
            } else {
                btnShiningSmite.textContent = "KÍCH HOẠT";
                if (parent) parent.classList.remove("active");
            }
        }
    }

    // Đăng ký sự kiện click cho các nút Bonus Action mới
    const btnUseShiningSmite = document.getElementById("btn-use-shining-smite");
    if (btnUseShiningSmite) {
        btnUseShiningSmite.addEventListener("click", () => {
            toggleShiningSmite();
        });
    }

    const btnUseCurse = document.getElementById("btn-use-curse");
    if (btnUseCurse) {
        btnUseCurse.addEventListener("click", () => {
            const isUsed = !character.resources.curse;
            character.resources.curse = isUsed;
            character.turnActions.curse = isUsed;
            if (isUsed && chkBonus) {
                chkBonus.checked = true;
                character.turnActions.bonusChecked = true;
            }
            
            // Auto-check/uncheck strike checkboxes for Curse
            for (let i = 1; i <= 3; i++) {
                if (strikeStates[i]) {
                    strikeStates[i].addons.curse = isUsed;
                }
            }
            document.querySelectorAll('.chk-strike-addon[data-addon="curse"]').forEach(chk => {
                chk.checked = isUsed;
            });
            
            saveCharacterState();
            updateHpUI();
            updateTotalDicePool();
            
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Hexblade's Curse! Thêm +3 sát thương (HB's Curse) và Crit trên 19-20.");
            } else {
                triggerStatusNotification("Hủy kích hoạt Hexblade's Curse.");
            }
        });
    }

    const btnUsePact = document.getElementById("btn-use-pact");
    if (btnUsePact) {
        btnUsePact.addEventListener("click", () => {
            const isUsed = !character.turnActions.pact;
            character.turnActions.pact = isUsed;
            if (isUsed && chkBonus) {
                chkBonus.checked = true;
                character.turnActions.bonusChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Triệu hồi/Liên kết Pact Weapon thành công! Bạn sẵn sàng tấn công bằng Mortal Wrath.");
            } else {
                triggerStatusNotification("Hủy triệu hồi Pact Weapon.");
            }
        });
    }

    const btnUseSurface = document.getElementById("btn-use-surface-echo");
    if (btnUseSurface) {
        btnUseSurface.addEventListener("click", () => {
            const isUsed = !character.resources.maskThoughts;
            character.resources.maskThoughts = isUsed;
            character.turnActions.maskThoughts = isUsed;
            if (isUsed && chkBonus) {
                chkBonus.checked = true;
                character.turnActions.bonusChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Surface Echo! Đọc ý nghĩ bề mặt của một sinh vật trong vòng 30 ft (INT ≥ 6) trong vòng 1 round.");
            } else {
                triggerStatusNotification("Hủy kích hoạt Surface Echo.");
            }
        });
    }

    const btnUseRepel = document.getElementById("btn-use-repel");
    if (btnUseRepel) {
        btnUseRepel.addEventListener("click", () => {
            const isUsed = !character.turnActions.repel;
            character.turnActions.repel = isUsed;
            if (isUsed && chkBonus) {
                chkBonus.checked = true;
                character.turnActions.bonusChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Command Word: Repel! Sinh vật trong nón 30 ft phải thực hiện Wisdom Save DC 15.");
            } else {
                triggerStatusNotification("Hủy kích hoạt Command Word: Repel.");
            }
        });
    }

    const btnUseHunt = document.getElementById("btn-use-hunt");
    if (btnUseHunt) {
        btnUseHunt.addEventListener("click", () => {
            const isUsed = !character.resources.kimonoHunt;
            character.resources.kimonoHunt = isUsed;
            character.turnActions.kimonoHunt = isUsed;
            if (isUsed && chkBonus) {
                chkBonus.checked = true;
                character.turnActions.bonusChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Command Word: Hunt! Dịch chuyển 30 ft cạnh mục tiêu Frightened. Đòn đầu trúng gây +2d6 Radiant.");
            } else {
                triggerStatusNotification("Hủy kích hoạt Command Word: Hunt.");
            }
        });
    }

    const btnUseKasaLeapBonus = document.getElementById("btn-use-kasa-leap-bonus");
    if (btnUseKasaLeapBonus) {
        btnUseKasaLeapBonus.addEventListener("click", () => {
            const isUsed = !character.turnActions.kasaLeap;
            character.turnActions.kasaLeap = isUsed;
            if (isUsed && chkBonus) {
                chkBonus.checked = true;
                character.turnActions.bonusChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Trickster's Leap! Kasa-obake nhảy lò cò 20 feet.");
            } else {
                triggerStatusNotification("Hủy Trickster's Leap.");
            }
        });
    }

    // Đăng ký sự kiện click cho các nút Reaction mới
    const btnUseShield = document.getElementById("btn-use-shield");
    if (btnUseShield) {
        btnUseShield.addEventListener("click", () => {
            character.shieldActive = !character.shieldActive;
            updateAC();
            character.turnActions.shield = character.shieldActive;
            if (character.shieldActive && chkReaction) {
                chkReaction.checked = true;
                character.turnActions.reactionChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            triggerStatusNotification(character.shieldActive ? `Kích hoạt Khiên phép Shield! AC tăng thành ${character.ac} (+5).` : `Huỷ kích hoạt Khiên phép Shield. AC trở lại ${character.ac}.`);
        });
    }

    const btnUseBulwarkReduction = document.getElementById("btn-use-bulwark-reduction");
    if (btnUseBulwarkReduction) {
        btnUseBulwarkReduction.addEventListener("click", () => {
            const isUsed = !character.turnActions.bulwarkReduction;
            character.turnActions.bulwarkReduction = isUsed;
            if (isUsed && chkReaction) {
                chkReaction.checked = true;
                character.turnActions.reactionChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Phản ứng: Bulwark Weapon Shield! Giảm 3 sát thương từ đòn đánh vũ khí vật lý.");
            } else {
                triggerStatusNotification("Hủy Phản ứng: Bulwark Weapon Shield.");
            }
        });
    }

    const btnUseBulwarkResist = document.getElementById("btn-use-bulwark-resist");
    if (btnUseBulwarkResist) {
        btnUseBulwarkResist.addEventListener("click", () => {
            const isUsed = !character.turnActions.bulwarkResist;
            character.turnActions.bulwarkResist = isUsed;
            if (isUsed && chkReaction) {
                chkReaction.checked = true;
                character.turnActions.reactionChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                triggerStatusNotification("Kích hoạt Phản ứng: Bulwark Steady Body! Advantage Saving Throw chống ngã/dịch chuyển.");
            } else {
                triggerStatusNotification("Hủy Phản ứng: Bulwark Steady Body.");
            }
        });
    }

    const btnUseCounterspell = document.getElementById("btn-use-counterspell");
    if (btnUseCounterspell) {
        btnUseCounterspell.addEventListener("click", () => {
            const isUsed = !character.turnActions.counterspell;
            if (isUsed) {
                if (consumePactSlot("Counterspell")) {
                    character.turnActions.counterspell = true;
                    if (chkReaction) {
                        chkReaction.checked = true;
                        character.turnActions.reactionChecked = true;
                    }
                    saveCharacterState();
                    updateHpUI();
                    triggerStatusNotification("Kích hoạt Counterspell! Kẻ địch trong 60ft phải thực hiện Constitution Save DC 15 hoặc mất spell.");
                }
            } else {
                character.turnActions.counterspell = false;
                character.pactSlotsCurrent = Math.min(2, character.pactSlotsCurrent + 1);
                saveCharacterState();
                updateHpUI();
                triggerStatusNotification("Hủy Counterspell. Đã hoàn trả lại 1 Pact Slot Bậc 4.");
            }
        });
    }

    // Helper & Event handlers for Opportunity Attack (OA)
    function updateOADamageExpressionLabel() {
        if (!oaDamageDiceExpression) return;
        const nextStack = currentWrathStack + 1;
        const baseDice = oaIsCrit ? "4d6" : "2d6";
        const mod = "6";
        const necroticDice = oaIsCrit ? `${2 * nextStack}d4` : `${nextStack}d4`;
        
        let expr = `${baseDice} + ${mod} + ${necroticDice} necrotic`;
        if (character.resources.curse) {
            expr += " + 3 [HB's Curse]";
        }
        oaDamageDiceExpression.textContent = expr;
    }

    function rollOADamage(isCrit) {
        // Tăng stack nộ lên 1
        currentWrathStack++;
        character.wrathStack = currentWrathStack;
        saveCharacterState();
        updateWrathStackUI();
        updateTotalDicePool();

        const wp = weaponsConfig[activeWeaponKey] || { name: "Mortal Wrath", dice: "2d6", mod: 6, type: "Slashing" };
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

        // Base Greatsword Damage: 2d6 (hoặc 4d6 nếu Crit)
        const baseDiceCount = 2 * (isCrit ? 2 : 1);
        let baseSum = 0;
        let baseRolls = [];
        for (let i = 0; i < baseDiceCount; i++) {
            const r = Math.floor(Math.random() * 6) + 1;
            baseRolls.push(r);
            baseSum += r;
        }
        breakdown[primaryType] += baseSum;
        totalDmgDiceOnly += baseSum;
        diceRecord.push(`${baseDiceCount}d6 (${baseRolls.join("+")}) [Mortal Wrath]`);

        // Mod vũ khí: +6
        breakdown[primaryType] += wp.mod;
        totalFlatMod += wp.mod;

        // Necrotic d4: (currentWrathStack * 1d4) (hoặc nhân đôi nếu Crit)
        if (currentWrathStack > 0) {
            const necroticDiceCount = currentWrathStack * (isCrit ? 2 : 1);
            let necroticSum = 0;
            let necroticRolls = [];
            for (let i = 0; i < necroticDiceCount; i++) {
                const r = Math.floor(Math.random() * 4) + 1;
                necroticRolls.push(r);
                necroticSum += r;
            }
            breakdown.necrotic += necroticSum;
            totalDmgDiceOnly += necroticSum;
            diceRecord.push(`${necroticDiceCount}d4 (${necroticRolls.join("+")}) [Necrotic Stack x${currentWrathStack}]`);
        }

        // Hexblade's Curse: +3 flat mod (Slashing)
        if (character.resources.curse) {
            const curseBonus = 3;
            breakdown[primaryType] += curseBonus;
            totalFlatMod += curseBonus;
        }

        // Tính tổng sát thương
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

    function handleOpportunityAttackRoll() {
        triggerRollAnimation({
            title: "TẤN CÔNG CƠ HỘI (MORTAL WRATH)",
            subtitle: "OPPORTUNITY ATTACK (D20)",
            isOA: true,
            rollAction: () => {
                const die = rollDice(20);
                const isCritSuccess = (die === 20) || (character.resources.curse && die === 19);
                const isCritFail = (die === 1);
                const total = die + 9;

                lastOARoll = {
                    isCrit: isCritSuccess,
                    die: die,
                    total: total
                };

                return {
                    dieResult: die,
                    modValue: 9,
                    total: total,
                    formula: `Công thức: 1d20 + 9`,
                    isCritSuccess,
                    isCritFail,
                    customCritText: `Tổng điểm đánh trúng: ${total}`
                };
            }
        });
    }

    // Đăng ký Event Listeners cho các nút OA mới
    if (btnOaHit) {
        btnOaHit.addEventListener("click", () => {
            // Chuyển sang bảng thiết lập sát thương
            if (diceModalOaButtons) diceModalOaButtons.style.display = "none";
            if (diceModalOaDamageSetup) diceModalOaDamageSetup.style.display = "flex";
            
            oaIsCrit = !!lastOARoll.isCrit;
            if (btnOaCritToggle) {
                btnOaCritToggle.classList.toggle("active", oaIsCrit);
            }
            
            updateOADamageExpressionLabel();
        });
    }

    if (btnOaMiss) {
        btnOaMiss.addEventListener("click", () => {
            currentWrathStack = 0;
            character.wrathStack = 0;
            saveCharacterState();
            updateWrathStackUI();
            updateTotalDicePool();
            hideDiceModal();
            triggerStatusNotification("Tấn công Cơ hội Hụt. Reset Wrath Stack về 0.");
        });
    }

    if (btnOaCritToggle) {
        btnOaCritToggle.addEventListener("click", () => {
            oaIsCrit = !oaIsCrit;
            btnOaCritToggle.classList.toggle("active", oaIsCrit);
            updateOADamageExpressionLabel();
        });
    }

    if (btnOaRollDamage) {
        btnOaRollDamage.addEventListener("click", () => {
            // Ẩn bảng thiết lập
            if (diceModalOaDamageSetup) diceModalOaDamageSetup.style.display = "none";
            
            // Chạy hiệu ứng roll sát thương trong modal
            triggerRollAnimation({
                title: "SÁT THƯƠNG TẤN CÔNG CƠ HỘI",
                subtitle: `MORTAL WRATH ${oaIsCrit ? "(CHÍ MẠNG)" : ""}`,
                isOA: false,
                hideVisual: true,
                rollAction: () => {
                    const result = rollOADamage(oaIsCrit);
                    
                    baseRolledDamage = result.totalDmg;
                    activeDamageBreakdown = result.breakdown;
                    
                    setTimeout(() => {
                        updateDamageDisplay();
                    }, 800);

                    // Record reaction damage
                    character.turnDamageRecords.reaction = result.totalDmg;
                    saveCharacterState();

                    const formulaText = result.diceRecord.join(" + ") + (character.resources.curse ? " + 3 [HB's Curse]" : "");
                    
                    return {
                        dieResult: result.totalDmgDiceOnly,
                        modValue: result.totalDmg - result.totalDmgDiceOnly,
                        total: result.totalDmg,
                        formula: `Công thức: ${formulaText}`,
                        isCritSuccess: false,
                        isCritFail: false,
                        customCritText: `Tấn công Cơ hội Trúng! Gây ${result.totalDmg} Sát thương.`
                    };
                }
            });
            
            triggerStatusNotification(`Đã sử dụng đòn Tấn công Cơ hội (Mortal Wrath).`);
        });
    }

    const btnUseOpportunityAttack = document.getElementById("btn-use-opportunity-attack");
    if (btnUseOpportunityAttack) {
        btnUseOpportunityAttack.addEventListener("click", () => {
            const isUsed = !character.turnActions.opportunity;
            character.turnActions.opportunity = isUsed;
            if (isUsed && chkReaction) {
                chkReaction.checked = true;
                character.turnActions.reactionChecked = true;
            }
            saveCharacterState();
            updateHpUI();
            if (isUsed) {
                handleOpportunityAttackRoll();
            } else {
                triggerStatusNotification("Hủy đòn Tấn công Cơ hội.");
            }
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
            'graspless1', 'graspless2', 'graspless3',
            'bulwarkRecovery1', 'bulwarkRecovery2', 'bulwarkRecovery3',
            'kasaCharges1', 'kasaCharges2', 'kasaCharges3'
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
            'graspless1', 'graspless2', 'graspless3',
            'bulwarkRecovery1', 'bulwarkRecovery2', 'bulwarkRecovery3',
            'kasaCharges1', 'kasaCharges2', 'kasaCharges3'
        ];
        resKeys.forEach(key => {
            const chk = document.getElementById(`chk-res-${key}`);
            if (chk) {
                chk.addEventListener("change", () => {
                    character.resources[key] = chk.checked;
                    if (key === 'curse') {
                        const isUsed = chk.checked;
                        for (let i = 1; i <= 3; i++) {
                            if (strikeStates[i]) {
                                strikeStates[i].addons.curse = isUsed;
                            }
                        }
                        document.querySelectorAll('.chk-strike-addon[data-addon="curse"]').forEach(addonChk => {
                            addonChk.checked = isUsed;
                        });
                        updateTotalDicePool();
                    }
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

            if (spellName === "Shining Smite") {
                toggleShiningSmite();
                return;
            }

            const freeSpells = ["Booming Blade", "Eldritch Blast", "Chill Touch", "False Life", "Kasa Veil"];
            const isFree = freeSpells.includes(spellName);

            if (!isFree) {
                if (!consumePactSlot(spellName)) return;
            }

            // Set Concentration if the cast spell requires it
            if (CONCENTRATION_SPELLS.includes(spellName)) {
                if (character.concentrationActive && character.concentratingSpell && character.concentratingSpell !== spellName) {
                    const prev = character.concentratingSpell;
                    if (prev === "Shining Smite") {
                        for (let i = 1; i <= 3; i++) {
                            if (strikeStates[i]) {
                                strikeStates[i].addons.smite = false;
                            }
                        }
                        document.querySelectorAll('.chk-strike-addon[data-addon="smite"]').forEach(chk => {
                            chk.checked = false;
                        });
                    }
                }
                character.concentrationActive = true;
                character.concentratingSpell = spellName;
                saveCharacterState();
                updateHpUI();
            }

            if (dmgExpr === "0") {
                let msg = `Kích hoạt phép ${spellName}!`;
                if (spellName === "Shield") {
                    character.shieldActive = true;
                    updateAC();
                    saveCharacterState();
                    updateHpUI();
                    msg = `Kích hoạt Shield! +5 AC phản ứng cho đến đầu lượt sau (AC hiện tại: ${character.ac}), miễn nhiễm Magic Missile.`;
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
                } else if (spellName === "Kasa Veil") {
                    // Consume 1 Kasa Charge
                    if (!character.resources.kasaCharges1) {
                        character.resources.kasaCharges1 = true;
                    } else if (!character.resources.kasaCharges2) {
                        character.resources.kasaCharges2 = true;
                    } else if (!character.resources.kasaCharges3) {
                        character.resources.kasaCharges3 = true;
                    } else {
                        alert("Kasa-obake đã hết hạt ngọc (Charges) cho ngày hôm nay!");
                        return;
                    }
                    saveCharacterState();
                    updateHpUI();
                    msg = "Kích hoạt Kasa: Veil of Forgotten Existence! Tạo vùng 10x10 ft ẩn thân tuyệt đối.";
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
