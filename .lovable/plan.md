

## תוכנית: מעבר בין קטגוריות בתוך זרימת הדיל

### הבעיה
כשדינו מציג מוצרים אחרי בחירת קטגוריה, אין דרך לחזור לבחירת קטגוריה אחרת. המשתמש חייב להתחיל שיחה חדשה — מה שמאלץ לבחור שוב פלטפורמה ומצב עמלה.

### הפתרון
הוספת כפתור "🔄 קטגוריה אחרת" בשני מקומות:

**1. אחרי הצגת מוצרים (שורה ~669)**
כשדינו מציג רשימת מוצרים, נוסיף כפתור חזרה לקטגוריות מתחת לרשימה:
```
addAssistant(`נמצאו ${items.length} מוצרים, בחר מספר:`, { 
  type: "products", products: items,
  buttons: [{ label: "🔄 קטגוריה אחרת", value: "change_category" }]
});
```

**2. אחרי יצירת הודעת דיל (שורה ~718)**
במקום `resetFlow()`, נשאל אם רוצה להמשיך:
```
addAssistant("מה עכשיו?", {
  type: "buttons",
  buttons: [
    { label: "🔄 קטגוריה אחרת", value: "change_category" },
    { label: "🏠 תפריט ראשי", value: "back_to_menu" },
  ]
});
```
ולא לעשות `resetFlow()` — רק לאפס את `selectedProduct` ו-`flowProducts`.

**3. handler חדש ב-handleButtonAction**
כשהמשתמש לוחץ "change_category", נקרא ל-`showCategoryPicker(flowPlatform!)` בלי לאפס platform או highCommission:
```typescript
case "change_category":
  setFlowProducts([]);
  setSelectedProduct(null);
  showCategoryPicker(flowPlatform!);
  break;
```

### קובץ: `src/components/DinoChat.tsx`
- ~4 שינויים קטנים
- שומר על `flowPlatform` ו-`flowHighCommission` — רק מאפס מוצרים
- המשתמש נשאר באותו מצב (ישראל/תאילנד + רגיל/עמלה גבוהה)

