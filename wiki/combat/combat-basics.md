# ⚔️ Luật Chiến Đấu Cơ Bản (Combat Basics)

> **Nguồn**: D&D 5e Player's Handbook 2024 (PHB 2024), Chapter 1
> ⚠️ File này đã được cập nhật theo PHB 2024 — phiên bản mới nhất.

---

## 1. Thứ tự chiến đấu (Initiative)

- Khi combat bắt đầu, mỗi người tham chiến **roll Dexterity check (d20 + DEX modifier)**.
- Đây là **D20 Test** — không có Proficiency Bonus trừ khi có feature cho phép.
- Đánh theo **thứ tự từ cao xuống thấp (Initiative order)**.
- **Surprise**: Nếu bị bất ngờ → **Disadvantage** trên Initiative roll.
- **Ties**: Players quyết định thứ tự giữa các player; DM quyết định khi tie giữa monster và player.
- Initiative order **không thay đổi** từ round sang round.

---

## 2. Cấu trúc một lượt (Your Turn)

Mỗi lượt bạn có:

| Loại | Số lượng | Ghi chú |
|------|----------|---------|
| **Movement** | = Speed (ft) | Có thể chia nhỏ trước/sau actions |
| **Action** | 1 | Tấn công, Cast spell, Dash, v.v. |
| **Bonus Action** | 1 (nếu có) | Chỉ khi feature/spell cho phép |
| **Reaction** | 1 | Dùng bất kỳ lúc nào trong round |
| **Free Object Interaction** | 1 | Rút/cất vũ khí, mở cửa (object thứ 2 cần dùng Utilize action) |
| **Communication** | Free | Nói ngắn, cử chỉ — không tốn action |

> **PHB 2024**: Object interaction thứ 2 cần dùng **Utilize action** (không còn là free).

---

## 3. D20 Tests — Cơ chế cốt lõi

```
D20 Test = d20 + Ability Modifier + Proficiency Bonus (nếu có) + Bonuses/Penalties
```

Ba loại D20 Tests:
- **Ability Check**: Vượt qua DC
- **Saving Throw**: Vượt qua DC
- **Attack Roll**: Vượt qua AC của target

### Advantage & Disadvantage
- **Advantage**: Roll 2d20, lấy **kết quả cao hơn**.
- **Disadvantage**: Roll 2d20, lấy **kết quả thấp hơn**.
- Không cộng dồn: 1 Adv + 1 Dis = **bình thường** (bất kể số lượng).

---

## 4. Tấn công (Attack Roll)

```
Attack Roll = d20 + Ability Modifier + Proficiency Bonus (nếu proficient)
```

- **Hit**: Roll ≥ AC của mục tiêu → gây damage.
- **Miss**: Roll < AC → không có hiệu lực.
- **Critical Hit (Nat 20 trên d20)**: Tự động hit, double số lượng damage dice (bao gồm cả Sneak Attack dice, v.v.).
- **Critical Fail (Nat 1 trên d20)**: Tự động miss, bất kể AC.

### Unseen Attackers & Targets
- Attack vs target bạn **không thấy** → **Disadvantage**.
- Attack vs target **không thấy bạn** → **Advantage**.

### Melee vs Ranged
- **Melee**: Reach 5 ft (mặc định), một số weapon có reach 10 ft.
- **Ranged**: Có 2 số `Normal/Long`. Long range → Disadvantage. Enemy trong 5 ft → Disadvantage.

---

## 5. Damage Roll

```
Damage = Weapon Dice + Ability Modifier + Bonuses
```

- **Melee**: STR modifier (mặc định).
- **Ranged**: DEX modifier (mặc định).
- **Finesse weapons**: Chọn STR hoặc DEX.

### Resistance & Vulnerability (PHB 2024)
Thứ tự áp dụng damage modifiers:
1. Bonuses/Penalties/Multipliers áp dụng trước
2. Resistance (halved, round down)
3. Vulnerability (doubled)

Không cộng dồn nhiều lớp Resistance — chỉ tính 1.

---

## 6. Máu & Dying

### Bloodied (PHB 2024 — Mới!)
- Khi HP ≤ **một nửa HP maximum** → trạng thái **Bloodied**.
- Bloodied **không có hiệu ứng tự động** trong base rules, nhưng một số features/spells tương tác với nó.

### Dropping to 0 HP

Khi HP = 0:
- **Monster**: Chết ngay lập tức.
- **Character**: Rơi vào **Unconscious** + bắt đầu Death Saving Throws.

**Instant Death** (character):
- Nếu damage còn dư sau khi HP về 0 ≥ HP maximum → **chết ngay**.

### Death Saving Throws
Đầu mỗi lượt khi có 0 HP: Roll **d20** (không modifier):

| Kết quả | Hiệu ứng |
|---------|---------|
| **≥ 10** | 1 success |
| **< 10** | 1 failure |
| **Nat 20** | Hồi phục **1 HP**, đứng dậy |
| **Nat 1** | **2 failures** |

- **3 successes** → **Stable** (vẫn Unconscious nhưng không cần roll nữa).
- **3 failures** → **Chết**.
- Nhận damage khi đang 0 HP → 1 failure (Critical Hit → 2 failures).
- Stable creature tự hồi 1 HP sau 1d4 giờ nếu không được heal.

### Knocking Out (PHB 2024)
Khi hit creature bằng **melee attack** về 0 HP → có thể chọn thay bằng **Knock Out**:
- Creature hồi về 1 HP + Unconscious.
- Tự tỉnh dậy sau Short Rest, hoặc khi nhận HP, hoặc DC 10 Wisdom (Medicine) check.

---

## 7. Temporary Hit Points

- **Mất trước**: THP bị mất trước HP thật.
- **Không cộng dồn**: Khi nhận THP mới, chọn giữ cái cũ hay cái mới.
- **Không phải healing**: Không thể restore bằng healing.
- Hết khi bị depleted hoặc sau **Long Rest**.
- THP ≠ 0 HP → không tỉnh dậy nếu đang Unconscious ở 0 HP.

---

## 8. Cover (Che chắn)

| Loại Cover | Bonus AC & DEX Saves | Cần |
|------------|---------------------|-----|
| **Half Cover** | +2 | ≥ 1/2 target bị che |
| **Three-Quarters Cover** | +5 | ≥ 3/4 target bị che |
| **Total Cover** | Không thể bị target trực tiếp | Toàn thân bị che |

- Chỉ áp dụng cover bảo vệ nhất (không cộng dồn).

---

## 9. Opportunity Attack (Reaction)

- Khi một kẻ thù **rời tầm reach** của bạn mà bạn **nhìn thấy được** và không dùng **Disengage**.
- Bạn dùng **Reaction** để thực hiện **1 melee attack** (weapon hoặc Unarmed Strike).
- **Không** bị trigger khi Teleport, hoặc khi bị di chuyển bởi external force.

---

## 10. Mounted & Underwater Combat

### Mounted Combat
- Mount phải ≥ 1 size lớn hơn, willingness.
- Mounting/Dismounting tốn nửa Speed.
- Controlled mount: Initiative theo bạn, chỉ có Dash/Disengage/Dodge.

### Underwater Combat
- Melee attack (không có Swim Speed) → **Disadvantage** trừ khi weapon deal Piercing.
- Ranged attack: Auto-miss nếu vượt Normal range; Disadvantage trong Normal range.
- Mọi thứ dưới nước có **Resistance to Fire**.

---

*Xem thêm: [Actions](actions.md) | [Conditions](conditions.md)*
