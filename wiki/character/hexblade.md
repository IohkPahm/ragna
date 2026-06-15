# ⚔️🖤 The Hexblade — Warlock Subclass

> **Nguồn**: Xanathar's Guide to Everything (XGE p55)
> **Lưu ý**: Hexblade là subclass từ phiên bản cũ hơn, được dùng với PHB 2024 Warlock.
> **Ragna**: Warlock Lv7, The Hexblade

---

## Tổng quan

Hexblade đã hình thành giao ước với một thực thể bí ẩn từ **Shadowfell** — một thế lực hiện thân qua các **sentient magic weapons** được tạc từ bóng tối. Thanh kiếm Blackrazor là vũ khí nổi tiếng nhất của loại này.

Nhiều người cho rằng thực thể đứng sau Hexblade chính là **Raven Queen** — nữ hoàng quạ của Shadowfell.

---

## Hexblade Expanded Spell List

Các spell sau được **thêm vào danh sách Warlock** dành cho Ragna (không tốn slot Prepared Spells):

| Spell Level | Spells |
|------------|--------|
| 1st | **Shield**, Wrathful Smite |
| 2nd | **Blur**, Branding Smite |
| 3rd | Blink, Elemental Weapon |
| 4th | Phantasmal Killer, Staggering Smite |
| 5th | Banishing Smite, Cone of Cold |

> 💡 **Shield** và **Blur** là 2 spell mạnh nhất trong list này.

---

## Features đã có (Lv7)

### Level 3 — Hexblade's Curse
*(Áp dụng ở Warlock Level 3, feature từ XGE)*

**Bonus Action**: Chọn 1 creature có thể thấy trong **30 ft** → bị Cursed trong **1 phút**.

Curse kết thúc sớm nếu: target chết, bạn chết, hoặc bạn Incapacitated.

Khi Curse đang hoạt động, bạn nhận:
- ➕ **Bonus damage = PB (+3)** chống lại target.
- 🎯 **Critical Hit trên 19-20** (thay vì chỉ 20) với mọi attack vs target.
- ❤️‍🔥 Khi target **chết**: Hồi **Warlock Level + CHA modifier** HP (= 7 + 4 = **11 HP**).

> **Recharge**: 1 lần/Short or Long Rest.

---

### Level 3 — Hex Warrior
*(Feature từ XGE)*

- Nhận proficiency với **Medium Armor, Shields, và Martial Weapons**.
- Mỗi Long Rest: Touch một weapon bạn proficient (không có Two-Handed property) → dùng **CHA modifier** thay STR/DEX cho attack & damage.
- Nếu có **Pact of the Blade**: Benefit tự động áp dụng cho **tất cả Pact Weapons**.

> ⚠️ Vì Ragna có Pact of the Blade, Hex Warrior benefit tự động áp dụng cho Mortal Wrath.

---

### Level 6 — Accursed Specter
*(Áp dụng ở Warlock Level 6)*

Khi bạn **giết một humanoid**: Có thể triệu hồi linh hồn của nó như một **Specter**.
- Specter nhận **THP = nửa Warlock Level** (= 3 THP).
- Roll Initiative riêng cho Specter.
- Specter vâng lệnh verbal.
- Specter nhận **bonus attack rolls = CHA modifier (+4)**.
- Specter tồn tại đến cuối **Long Rest tiếp theo**.

> **Recharge**: 1 lần/Long Rest.

---

## Features chưa có (tương lai)

### Level 10 — Armor of Hexes
*(Áp dụng ở Warlock Level 10)*

Nếu target bị **Hexblade's Curse** hit bạn bằng attack roll:
- Dùng **Reaction** → Roll **d6**.
- Kết quả **4+** → Attack **miss** bạn, bất kể kết quả roll.

---

### Level 14 — Master of Hexes
*(Áp dụng ở Warlock Level 14)*

Khi creature bị **Hexblade's Curse chết**: Có thể **di chuyển** Curse sang creature khác trong 30 ft (bạn thấy được).
- Không hồi HP từ cái chết của creature trước.

---

## Chiến Thuật Hexblade (Lv7)

### Core Combat Loop

```
Bonus Action: Hexblade's Curse trên target
Action:       Attack (Pact Weapon — Mortal Wrath)
              ├── Attack 1: CHA attack (via Pact of Blade)
              └── Attack 2: CHA attack (via Thirsting Blade)
                  + Wrath Accumulation tích lũy
                  + Hexblade's Curse: +3 damage mỗi hit
                  + Crit trên 19-20
```

### Damage một turn đầy đủ (ước tính)

```
Mortal Wrath:  2d6 (Greatsword) + 4 (CHA) + 2 (Weapon +2) + 3 (Curse) per hit
Wrath Accum:   +1d4 hit 1, +2d4 hit 2
Pact Damage:   Necrotic/Psychic/Radiant (tùy chọn)
Agonizing:     Nếu dùng cantrip: +4 (CHA) thêm vào damage
```

### Khi nào dùng Spell Slot (Level 4)?
Ưu tiên cast bằng **Eldritch Blast + Agonizing Blast** (không tốn slot). Spell slot dành cho:
1. **Shield** (Reaction, +5 AC khi bị hit) — Rất quan trọng
2. **Hex** (Concentration, thêm 1d6 damage mỗi hit)
3. **Hunger of Hadar / Hypnotic Pattern** (control)
4. Các Hexblade spells: **Blur** (Concentration, protection)

---

## Ghi Chú Pact of the Blade + Hex Warrior

| Tình huống | Attack Modifier |
|-----------|----------------|
| Normal weapon (không Bond) | STR hoặc DEX |
| Hex Warrior weapon (Long Rest touch) | CHA |
| Pact Weapon (Pact of Blade) | CHA (tự động) |
| Mortal Wrath + Pact of Blade | CHA (+4) + Weapon +2 → **+9 total** |

---

*Xem thêm: [Ragna Character Sheet](ragna.md) | [Warlock Class](warlock.md) | [Eldritch Invocations](invocations.md)*
