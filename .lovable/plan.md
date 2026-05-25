## שיפוץ UI ל-ScoutDraftsTab

איפוס יומי ב-21:30 שעון דפדפן כבר בוצע. עכשיו מבצעים את שיפוץ ה-UI:

### 1. קומפקטיות
- צמצום padding/gap בכרטיסי הטיוטות
- הקטנת גובה תמונה ושורות מטא
- צפיפות מידע גבוהה יותר, פחות whitespace מיותר

### 2. כפתורי ארכיון
- כפתור ארכיון בולט בכל כרטיס טיוטה
- פתיחת `ArchiveReasonDialog` הקיים (wording/price/image/other + הערה)
- עדכון סטטוס ל-archived עם reason+notes ב-DB

### 3. הרחבת טקסט
- כפתור "הצג עוד/פחות" לטקסטים ארוכים (תיאור/הודעת דיל)
- ברירת מחדל: 3 שורות עם clamp; הרחבה מלאה בלחיצה

### 4. כפתור QA
- כפתור QA בכל כרטיס שמריץ את ה-auditor על המוצר
- מציג תוצאה (verdict + הערות) ב-inline panel או toast
- כולל מצב loading

### טכני
- קובץ יחיד: `src/components/admin/v2/ScoutDraftsTab.tsx`
- שימוש ב-`ArchiveReasonDialog` הקיים
- כפתור QA יקרא ל-edge function קיים (auditor) או יוסיף state חדש
- שמירה על workday logic הקיים (21:30 reset)
- שימוש בטוקנים סמנטיים מ-`index.css`, ללא צבעים hardcoded

### לבירור לפני ביצוע
האם כפתור QA צריך לקרוא ל-`auditor-ingest` קיים, או שיש edge function נפרד ל-QA של דראפט קיים?
