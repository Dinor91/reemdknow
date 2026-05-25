## המרת כפתור QA לכפתור עריכה

הסר את הלוגיקה של `handleQA` שמייצרת מחדש את הטקסט מהבק-אנד. במקומה, הוסף מצב עריכה מקומי לכל כרטיס שמאפשר לערוך את `audit_notes` ידנית לפני אישור ושליחה לטלגרם.

### שינויים ב-`ScoutDraftsTab.tsx` בלבד

1. **הסרת `handleQA`** והאייקון `Wand2` מהאימפורטים.

2. **State חדש לעריכה**:
   - `editingId: string | null` — איזה כרטיס נמצא במצב עריכה
   - `editedText: string` — הטקסט הנערך כרגע
   - `savingId: string | null` — אינדיקציה לשמירה

3. **כפתור "ערוך"** (אייקון `Pencil`) במקום QA:
   - בלחיצה: `setEditingId(d.id)` + `setEditedText(d.audit_notes || "")`
   - מוצג כאשר לא במצב עריכה

4. **מצב עריכה** — כאשר `editingId === d.id`:
   - ה-`<pre>` של `audit_notes` מוחלף ב-`<Textarea>` עם `value={editedText}` ו-`onChange`
   - שני כפתורים מתחת: **"שמור"** (שומר ל-DB את הטקסט החדש דרך `tableFor(d.source_table).update({ audit_notes: editedText })`) ו-**"בטל"** (סוגר בלי לשמור)
   - לאחר שמירה מוצלחת: toast + `loadDrafts()` לרענון + סגירת מצב עריכה

5. **כפתור האישור והשליחה לטלגרם** הקיים נשאר כפי שהוא — הוא ישלח את ה-`audit_notes` המעודכן (לאחר שמירה).

### הערה טכנית
אין שינוי בבק-אנד, אין קריאות ל-edge functions, אין שינויים בלוגיקת איפוס/סקאוט. השמירה היא `UPDATE` פשוט על העמודה `audit_notes` בטבלה הרלוונטית (`feed_products` או `israel_editor_products`).
