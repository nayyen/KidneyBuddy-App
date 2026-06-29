SELECT id, nama, jam_pengingat, hari_aktif, 
  hari_aktif ? 'sabtu' AS matches_sabtu
FROM reminder_schedule 
WHERE jenis='obat' AND aktif=true 
ORDER BY created_at DESC;
