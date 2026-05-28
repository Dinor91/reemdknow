## תיקון שבירת שורה ב-KPI של ScoutDraftsTab

### מטרה
לפצל את שורת המטא-דאטה הנוכחית בשורה אחת לשתי שורות נפרדות, כך שהשבוע / ממתינות יופיעו מתחת לדאטה בייס.

### הנוכחי (שורה 622-624)
```tsx
<div className="text-xs text-muted-foreground mt-1">
  דאטה בייס: היום נכנסו {draftsToday} מתוך {HANDS_FREE_DAILY_TARGET} • השבוע: {draftsThisWeek} / {HANDS_FREE_DAILY_TARGET * 6} • ממתינות: {pendingCount}
</div>
```

### הרצוי
```tsx
<div className="text-xs text-muted-foreground mt-1">
  דאטה בייס: היום נכנסו {draftsToday} מתוך {HANDS_FREE_DAILY_TARGET}
</div>
<div className="text-xs text-muted-foreground">
  השבוע: {draftsThisWeek} / {HANDS_FREE_DAILY_TARGET * 6} • ממתינות: {pendingCount}
</div>
```

### קובץ
- `src/components/admin/v2/ScoutDraftsTab.tsx` — שורות 622-624