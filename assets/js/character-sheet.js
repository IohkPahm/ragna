document.addEventListener("DOMContentLoaded", () => {
    console.log("Khởi chạy D&D Character Sheet View Mode cho Ragna...");

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
    // 2. QUẢN LÝ TRẠNG THÁI NHÂN VẬT & LOCALSTORAGE
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

    // Cập nhật giao diện dựa trên dữ liệu nhân vật
    function updateViewUI() {
        // Cập nhật HP
        const viewCurrentHp = document.getElementById("view-current-hp");
        const viewHpBarFill = document.getElementById("view-hp-bar-fill");
        const viewTempBarFill = document.getElementById("view-temp-bar-fill");
        const viewTempHpLabel = document.getElementById("view-temp-hp-label");
        const viewTempHp = document.getElementById("view-temp-hp");
        
        if (viewCurrentHp && viewHpBarFill) {
            viewCurrentHp.textContent = character.hpCurrent;
            const currentHpPercent = (character.hpCurrent / character.hpMax) * 100;
            viewHpBarFill.style.width = `${currentHpPercent}%`;
            
            if (viewTempBarFill && viewTempHpLabel && viewTempHp) {
                if (character.hpTemp > 0) {
                    viewTempHp.textContent = character.hpTemp;
                    viewTempHpLabel.style.display = "inline";
                    viewTempBarFill.style.left = `${currentHpPercent}%`;
                    const tempPercent = (character.hpTemp / character.hpMax) * 100;
                    viewTempBarFill.style.width = `${Math.min(tempPercent, 100 - currentHpPercent)}%`;
                } else {
                    viewTempHpLabel.style.display = "none";
                    viewTempBarFill.style.width = "0%";
                }
            }
        }

        // Cập nhật AC
        const acDisplay = document.getElementById("ac-value-display");
        if (acDisplay) {
            acDisplay.textContent = character.ac;
            const acBox = document.getElementById("stat-ac-box");
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

        // Đồng bộ checkboxes tài nguyên
        syncResourcesUI();

        // Cập nhật các class trạng thái trên body
        const conds = character.conditions || {};
        toggleBodyConditionClass("unconscious", conds.unconscious);
        toggleBodyConditionClass("blinded", conds.blinded);
        toggleBodyConditionClass("poisoned", conds.poisoned);
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

    function syncSlotsUI() {
        const chks = document.querySelectorAll(".slot-sync-chk");
        const count = character.pactSlotsCurrent;
        chks.forEach((chk, idx) => {
            chk.checked = (idx < (2 - count));
        });
        const display = document.getElementById("spells-pact-slots-display");
        if (display) {
            display.textContent = `${count} / 2`;
        }
    }

    function syncResourcesUI() {
        const resKeys = [
            'curse', 'specter', 'cunning', 
            'maskDisguise1', 'maskDisguise2', 'maskThoughts', 
            'kimonoHunt', 'seedLife', 
            'graspless1', 'graspless2', 'graspless3'
        ];
        resKeys.forEach(key => {
            const chk = document.querySelector(`.res-sync-chk[data-res="${key}"]`);
            if (chk) {
                chk.checked = !!character.resources[key];
            }
        });
        syncSlotsUI();
    }

    // Lắng nghe thay đổi checkboxes trên Character Sheet
    document.querySelectorAll(".res-sync-chk").forEach(chk => {
        chk.addEventListener("change", () => {
            const resKey = chk.getAttribute("data-res");
            character.resources[resKey] = chk.checked;
            saveCharacterState();
            updateViewUI();
        });
    });

    document.querySelectorAll(".slot-sync-chk").forEach(chk => {
        chk.addEventListener("change", () => {
            const checkedCount = document.querySelectorAll(".slot-sync-chk:checked").length;
            character.pactSlotsCurrent = 2 - checkedCount;
            saveCharacterState();
            updateViewUI();
        });
    });

    updateViewUI();

    // ═══════════════════════════════════
    // 3. ĐIỀU KHIỂN TABS CHUYỂN MƯỢT MÀ BẰNG GSAP
    // ═══════════════════════════════════
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            const targetPane = document.getElementById(`tab-pane-${targetTab}`);

            if (!targetPane || btn.classList.contains("active")) return;

            const activeBtn = document.querySelector(".tab-button.active");
            const activePane = document.querySelector(".tab-pane.active");

            if (activeBtn) activeBtn.classList.remove("active");
            if (activePane) {
                gsap.to(activePane, {
                    opacity: 0,
                    y: -10,
                    duration: 0.15,
                    onComplete: () => {
                        activePane.classList.remove("active");
                        targetPane.classList.add("active");
                        gsap.fromTo(targetPane,
                            { opacity: 0, y: 10 },
                            { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
                        );
                    }
                });
            } else {
                targetPane.classList.add("active");
                gsap.fromTo(targetPane,
                    { opacity: 0, y: 10 },
                    { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
                );
            }
            btn.classList.add("active");
        });
    });

    // ═══════════════════════════════════
    // 4. POP-UP TRÌNH TUNG XÚC XẮC (DICE ROLLER MODAL)
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
                diceModalOverlay.style.display = "none";
                diceModalOverlay.classList.remove("show-result");
            }
        });
    }

    if (btnCloseDiceModal) btnCloseDiceModal.addEventListener("click", hideDiceModal);
    if (btnDismissRoll) btnDismissRoll.addEventListener("click", hideDiceModal);
    diceModalOverlay.addEventListener("click", (e) => {
        if (e.target === diceModalOverlay) hideDiceModal();
    });

    function rollDice(sides) {
        return Math.floor(Math.random() * sides) + 1;
    }

    function triggerRollAnimation({ title, subtitle, rollAction }) {
        diceModalOverlay.style.display = "flex";
        diceModalOverlay.classList.remove("show-result");
        
        diceRollTitle.textContent = title.toUpperCase();
        diceRollSubtitle.textContent = subtitle.toUpperCase();
        diceCritText.textContent = "";
        diceNumberText.textContent = "?";
        
        gsap.fromTo(diceModal, 
            { scale: 0.85, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }
        );

        diceVisual.classList.add("rolling");

        let count = 0;
        const spinInterval = setInterval(() => {
            diceNumberText.textContent = rollDice(20);
            count++;
            if (count > 12) clearInterval(spinInterval);
        }, 60);

        setTimeout(() => {
            diceVisual.classList.remove("rolling");
            
            const result = rollAction();
            
            diceNumberText.textContent = result.dieResult;

            diceCalcFormula.textContent = result.formula;
            diceCalcDie.textContent = result.dieResult;
            
            if (result.modValue >= 0) {
                diceCalcMod.textContent = `+ ${result.modValue}`;
            } else {
                diceCalcMod.textContent = `- ${Math.abs(result.modValue)}`;
            }

            diceTotalDisplay.textContent = result.total;

            diceTotalDisplay.className = "dice-total-display";
            if (result.isCritSuccess) {
                diceTotalDisplay.classList.add("crit-success");
                diceCritText.textContent = "CHÍ MẠNG (CRITICAL 20)!";
                diceCritText.style.color = "var(--color-success)";
            } else if (result.isCritFail) {
                diceTotalDisplay.classList.add("crit-fail");
                diceCritText.textContent = "HỤT CỰC KỲ ĐÁNG TIẾC (CRIT 1)!";
                diceCritText.style.color = "var(--color-danger)";
            } else {
                diceCritText.textContent = result.customCritText || "HOÀN THÀNH TUNG XÚC XẮC!";
                diceCritText.style.color = "var(--color-accent-orange)";
            }

            diceModalOverlay.classList.add("show-result");
        }, 800);
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

    // ═══════════════════════════════════
    // 5. ĐĂNG KÝ CLICK TUNG XÚC XẮC CHỈ SỐ & KỸ NĂNG & AC / INITIATIVE
    // ═══════════════════════════════════
    
    // Roll Ability Scores
    document.querySelectorAll(".ability-skill-header.rollable").forEach(header => {
        header.addEventListener("click", () => {
            const ability = header.getAttribute("data-ability");
            const mod = parseInt(header.getAttribute("data-mod")) || 0;
            handleGeneralRoll(`Kiểm tra ${ability}`, mod, "Kiểm tra Thuộc tính");
        });
    });

    // Roll Saving Throws
    document.querySelectorAll(".ability-save-row.rollable").forEach(row => {
        row.addEventListener("click", () => {
            const saveName = row.getAttribute("data-save");
            const bonus = parseInt(row.getAttribute("data-bonus")) || 0;
            handleGeneralRoll(`${saveName} Saving Throw`, bonus, "Cứu Nạn (Saving Throw)");
        });
    });

    // Roll Skills
    document.querySelectorAll(".card-skill-row.rollable").forEach(row => {
        row.addEventListener("click", () => {
            const skillName = row.getAttribute("data-skill");
            const bonus = parseInt(row.getAttribute("data-bonus")) || 0;
            handleGeneralRoll(`Kiểm tra ${skillName}`, bonus, "Kiểm tra Kỹ năng");
        });
    });

    // Roll Initiative
    const initBox = document.getElementById("stat-init-box");
    if (initBox) {
        initBox.addEventListener("click", () => {
            handleGeneralRoll("Initiative (Đổ lượt đi)", character.initiative, "Đổ Initiative");
        });
    }

    // Toggle Shield Spell on AC Click
    const acBox = document.getElementById("stat-ac-box");
    if (acBox) {
        acBox.addEventListener("click", () => {
            character.shieldActive = !character.shieldActive;
            character.ac = character.shieldActive ? 24 : 19;
            saveCharacterState();
            updateViewUI();
            triggerStatusNotification(character.shieldActive ? "Kích hoạt Khiên phép Shield! AC tăng thành 24 (+5)." : "Huỷ kích hoạt Khiên phép Shield. AC trở lại 19.");
        });
    }

    // ═══════════════════════════════════
    // 6. ACCORDION CHO VẬT PHẨM, PHÉP & FEATS
    // ═══════════════════════════════════
    
    // Magic Items Accordion
    document.querySelectorAll(".interactive-item-card").forEach(card => {
        card.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("input")) return;
            card.classList.toggle("expanded");
        });
    });

    // Feats/traits Accordion
    document.querySelectorAll(".feat-panel-card").forEach(card => {
        card.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("input")) return;
            card.classList.toggle("expanded");
        });
    });

    // Spells Accordion
    document.querySelectorAll(".spell-panel-card").forEach(card => {
        card.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("input")) return;
            card.classList.toggle("expanded");
        });
    });

    // ═══════════════════════════════════
    // 7. HÀNH ĐỘNG DÙNG VẬT PHẨM & KÍCH HOẠT FEATS
    // ═══════════════════════════════════
    
    // Shapeshifter Mask - Veil of False Skin (2/Long Rest)
    const btnMaskDisguise = document.getElementById("btn-use-mask-disguise");
    if (btnMaskDisguise) {
        btnMaskDisguise.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!character.resources.maskDisguise1) {
                character.resources.maskDisguise1 = true;
            } else if (!character.resources.maskDisguise2) {
                character.resources.maskDisguise2 = true;
            } else {
                alert("Bạn đã dùng hết cả 2 lượt 'Mask Disguise' (Veil of False Skin) của Shapeshifter Mask trong ngày!");
                return;
            }
            saveCharacterState();
            updateViewUI();
            triggerStatusNotification("Kích hoạt Veil of False Skin! Bạn dùng Disguise Self biến đổi ngoại hình (Kéo dài 1 giờ).");
        });
    }

    // Shapeshifter Mask - Surface Echo (1/Short Rest)
    const btnMaskThoughts = document.getElementById("btn-use-mask-thoughts");
    if (btnMaskThoughts) {
        btnMaskThoughts.addEventListener("click", (e) => {
            e.stopPropagation();
            if (character.resources.maskThoughts) {
                alert("Bạn đã dùng lượt 'Mask Thoughts' (Surface Echo) của Short Rest này rồi!");
                return;
            }
            character.resources.maskThoughts = true;
            saveCharacterState();
            updateViewUI();
            triggerStatusNotification("Kích hoạt Surface Echo! Đọc ý nghĩ bề mặt của một mục tiêu trong 30 ft (Wis Save DC 13).");
        });
    }

    // Demon Hunter Kimono - Word: Repel (Vô hạn)
    const btnKimonoRepel = document.getElementById("btn-use-kimono-repel");
    if (btnKimonoRepel) {
        btnKimonoRepel.addEventListener("click", (e) => {
            e.stopPropagation();
            triggerStatusNotification("Kích hoạt Command Word: Repel! Cone 30 ft, kẻ địch phải Wis Save DC 15 hoặc bị Frightened.");
        });
    }

    // Demon Hunter Kimono - Word: Hunt (1/Long Rest)
    const btnKimonoHunt = document.getElementById("btn-use-kimono-hunt");
    if (btnKimonoHunt) {
        btnKimonoHunt.addEventListener("click", (e) => {
            e.stopPropagation();
            if (character.resources.kimonoHunt) {
                alert("Bạn đã dùng lượt 'Kimono Hunt' (Command Word: Hunt) của ngày hôm nay rồi!");
                return;
            }
            
            const roll = rollDice(6);
            let resultText = "";
            if (roll === 1 || roll === 2) {
                character.resources.kimonoHunt = true;
                resultText = " (Tung d6 ra 1 hoặc 2: Kimono cạn năng lượng cho tới bình minh).";
            } else {
                resultText = " (Tung d6 ra " + roll + ": Kimono vẫn đầy năng lượng!).";
            }
            
            saveCharacterState();
            updateViewUI();
            triggerStatusNotification("Kích hoạt Command Word: Hunt! Teleport 30 ft chém kẻ thù bị Frightened và gây thêm +2d6 Radiant damage" + resultText);
        });
    }

    // Seed of Life - Life Pulse (1/Long Rest)
    const btnFeatSeed = document.getElementById("btn-use-feat-seed");
    if (btnFeatSeed) {
        btnFeatSeed.addEventListener("click", (e) => {
            e.stopPropagation();
            if (character.resources.seedLife) {
                alert("Bạn đã dùng lượt 'Seed Life Pulse' của ngày hôm nay rồi!");
                return;
            }
            castSpellFromCharacterSheet("Life Burst");
        });
    }

    // Leader Inspiration (Hào Khí Dẫn Đầu)
    const btnFeatLeader = document.getElementById("btn-use-feat-leader");
    if (btnFeatLeader) {
        btnFeatLeader.addEventListener("click", (e) => {
            e.stopPropagation();
            character.hpTemp = Math.max(character.hpTemp, 10);
            saveCharacterState();
            updateViewUI();
            triggerStatusNotification("Kích hoạt Hào Khí Dẫn Đầu! Bạn và tối đa 4 đồng đội nhận 10 Máu Tạm Thời (THP) trong 4 vòng.");
        });
    }

    // ═══════════════════════════════════
    // 8. TÍNH NĂNG CAST PHÉP & TRỪ SPELL SLOT
    // ═══════════════════════════════════
    
    function consumePactSlot(spellName) {
        if (character.pactSlotsCurrent > 0) {
            character.pactSlotsCurrent--;
            saveCharacterState();
            return true;
        } else {
            return confirm(`Bạn đã dùng hết Pact Slots hiện tại! Bạn có muốn tiếp tục cast phép "${spellName}" vượt mức (hoặc DM cấp phép) không?`);
        }
    }

    function rollSpellDamage(spellName, diceCount, diceSides, staticMod, dmgType) {
        triggerRollAnimation({
            title: `Cast Phép: ${spellName}`,
            subtitle: `Sát thương (${dmgType})`,
            rollAction: () => {
                let rolledSum = 0;
                let rolls = [];
                for (let i = 0; i < diceCount; i++) {
                    const r = rollDice(diceSides);
                    rolls.push(r);
                    rolledSum += r;
                }
                const total = rolledSum + staticMod;
                return {
                    dieResult: rolledSum,
                    modValue: staticMod,
                    total: total,
                    formula: `Công thức: ${diceCount}d${diceSides} (${rolls.join("+")}) ${staticMod ? `+ ${staticMod}` : ""}`,
                    isCritSuccess: false,
                    isCritFail: false,
                    customCritText: `Cast phép ${spellName}: Gây ${total} DMG (${dmgType})`
                };
            }
        });
    }

    function rollLifeBurst() {
        triggerRollAnimation({
            title: `Cast Phép: Life Burst`,
            subtitle: `Hồi máu & Giáp ảo`,
            rollAction: () => {
                const healDie = rollDice(8);
                const temp1 = rollDice(8);
                const temp2 = rollDice(8);
                const tempTotal = temp1 + temp2;
                
                const oldHp = character.hpCurrent;
                character.hpCurrent = Math.min(character.hpMax, character.hpCurrent + healDie);
                const actualHealed = character.hpCurrent - oldHp;
                character.hpTemp = Math.max(character.hpTemp, tempTotal);
                saveCharacterState();
                
                setTimeout(() => {
                    updateViewUI();
                }, 800);

                return {
                    dieResult: healDie,
                    modValue: tempTotal,
                    total: healDie + tempTotal,
                    formula: `Công thức: Hồi 1d8 HP (${healDie}) + 2d8 THP (${temp1}+${temp2})`,
                    isCritSuccess: false,
                    isCritFail: false,
                    customCritText: `Life Burst: Hồi +${actualHealed} HP, nhận ${tempTotal} THP`
                };
            }
        });
    }

    function castSpellFromCharacterSheet(spellName) {
        const freeSpells = ["Booming Blade", "Eldritch Blast", "Chill Touch", "False Life"];
        const isFree = freeSpells.includes(spellName);
        
        if (!isFree) {
            if (spellName === "Life Burst") {
                // Seed of Life free spell
                character.resources.seedLife = true; // Checked/used
                saveCharacterState();
                updateViewUI();
            } else {
                if (!consumePactSlot(spellName)) return;
            }
        }

        // Thi hành hiệu ứng phép
        if (spellName === "Eldritch Blast") {
            rollSpellDamage(spellName, 2, 10, 8, "Force");
        } else if (spellName === "Chill Touch") {
            rollSpellDamage(spellName, 2, 10, 0, "Necrotic");
        } else if (spellName === "Booming Blade") {
            rollSpellDamage(spellName, 1, 8, 0, "Thunder");
        } else if (spellName === "Shadow of Moil") {
            rollSpellDamage(spellName, 2, 8, 0, "Necrotic");
        } else if (spellName === "Life Burst") {
            rollLifeBurst();
        } else if (spellName === "False Life") {
            // Fiendish Vigor: cast miễn phí, Pact Magic L4 → max THP = 4 + 19 = 23
            character.hpTemp = Math.max(character.hpTemp, 23);
            saveCharacterState();
            updateViewUI();
            triggerStatusNotification("Thi triển False Life! Fiendish Vigor (Bậc 4, Miễn phí) → Nhận 23 Máu Tạm Thời (THP).");
        } else if (spellName === "Shining Smite") {
            if (!consumePactSlot(spellName)) return;
            rollSpellDamage(spellName, 4, 6, 0, "Radiant");
            return;
        } else if (spellName === "Shield") {
            character.shieldActive = true;
            character.ac = 24;
            saveCharacterState();
            updateViewUI();
            triggerStatusNotification("Thi triển Shield! +5 AC phản ứng cho đến đầu lượt sau (AC hiện tại: 24).");
        } else {
            let msg = `Thi triển thành công phép ${spellName}!`;
            if (spellName === "Darkness") {
                msg = "Thi triển Darkness! Tạo vùng tối ma thuật bán kính 15 ft tập trung Concentration.";
            } else if (spellName === "Shining Smite") {
                msg = "Thi triển Shining Smite! Vũ khí phát sáng, đòn chém trúng tiếp theo gây thêm +4d6 Radiant và kẻ địch bị phát lộ sáng.";
            } else if (spellName === "Fly") {
                msg = "Thi triển Fly! Nhận tốc độ bay 60 ft tập trung Concentration trong tối đa 10 phút.";
            } else if (spellName === "Counterspell") {
                msg = "Thi triển Counterspell! Phản ứng ngắt phép của kẻ địch trong tầm 60 ft.";
            } else if (spellName === "Dimension Door") {
                msg = "Thi triển Dimension Door! Dịch chuyển tức thời bạn và 1 đồng đội lên tới 500 ft.";
            } else if (spellName === "Revivify") {
                msg = "Thi triển Revivify! Tiêu tốn 1 diamond (300+ GP), hồi sinh mục tiêu vừa chết trong 1 phút với 1 HP.";
            }
            triggerStatusNotification(msg);
            updateViewUI();
        }
    }

    document.querySelectorAll(".btn-cast-spell-action").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const spellName = btn.getAttribute("data-spell");
            castSpellFromCharacterSheet(spellName);
        });
    });

    // ═══════════════════════════════════
    // 9. NHẤP TIỀN TỆ (COINAGE INTERACTIONS)
    // ═══════════════════════════════════
    const coins = {
        cp: { name: "Đồng Đồng (Copper)", desc: "12 CP. Dùng cho giao dịch sinh hoạt hàng ngày cực nhỏ." },
        sp: { name: "Đồng Bạc (Silver)", desc: "45 SP. 10 SP đổi được 1 GP. Phổ biến ở các quán trọ và chợ dân sinh." },
        gp: { name: "Đồng Vàng (Gold)", desc: "320 GP. Đơn vị giao dịch phổ thông chuẩn của giới mạo hiểm giả." },
        pp: { name: "Đồng Bạch Kim (Platinum)", desc: "15 PP. 1 PP tương đương 10 GP. Dành cho các giao dịch cao cấp." }
    };

    Object.keys(coins).forEach(key => {
        const btn = document.getElementById(`coin-${key}-btn`);
        if (btn) {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                triggerStatusNotification(`${coins[key].name}: ${coins[key].desc}`);
            });
        }
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
    // 10. ĐỒNG BỘ HÓA REAL-TIME QUA STORAGE EVENT
    // ═══════════════════════════════════
    window.addEventListener("storage", (e) => {
        if (e.key === "dnd_character_ragna") {
            const newState = getCharacterState();
            Object.assign(character, newState);
            updateViewUI();
        }
    });
});
