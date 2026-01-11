
/**
 * Syifamili Backend - 10 Minute Reminder Logic
 * PENTING: Ganti URL VERCEL_PUSH_API_URL setelah deploy Vercel selesai.
 */

// LANGKAH TERAKHIR: GANTI INI DENGAN URL VERCEL ANDA
// Contoh: 'https://syifamili-app.vercel.app/api/send-push'
const VERCEL_PUSH_API_URL = 'https://GANTI_DENGAN_DOMAIN_VERCEL_ANDA/api/send-push'; 

const DATABASE_SCHEMA = {
  'members': ['id', 'name', 'relation', 'gender', 'birthDate', 'bloodType', 'photoUrl', 'isElderly', 'isChild', 'nik', 'insurances', 'allergies', 'aiGrowthAnalysis', 'aiImmunizationAnalysis', 'aiDevelopmentAnalysis', 'developmentChecklist', 'immunizationChecklist'],
  'records': ['id', 'memberId', 'title', 'dateTime', 'type', 'description', 'diagnosis', 'saran', 'obat', 'doctorName', 'facility', 'files', 'temperature', 'systolic', 'diastolic', 'heartRate', 'oxygen', 'respiratoryRate', 'investigations', 'aiAnalysis'], 
  'appointments': ['id', 'memberId', 'title', 'dateTime', 'doctor', 'location', 'reminded'],
  'meds': ['id', 'memberId', 'name', 'dosage', 'frequency', 'instructions', 'nextTime', 'active', 'fileUrl', 'fileName', 'aiAnalysis', 'consumptionHistory'],
  'growthLogs': ['id', 'memberId', 'dateTime', 'weight', 'height', 'headCircumference'],
  'vitalLogs': ['id', 'memberId', 'dateTime', 'heartRate', 'systolic', 'diastolic', 'temperature', 'oxygen', 'respiratoryRate'],
  'homeCareLogs': ['id', 'memberId', 'title', 'active', 'entries', 'createdTime', 'aiAnalysis'], 
  'notes': ['id', 'memberId', 'date', 'dateTime', 'text', 'type', 'mood', 'activity', 'meals', 'fluids', 'hygiene', 'bab', 'bak'],
  'contacts': ['id', 'name', 'type', 'phone', 'address', 'gmapsUrl', 'latitude', 'longitude'],
  'subscriptions': ['endpoint', 'keys_p256dh', 'keys_auth', 'userAgent', 'timestamp'],
  'Listing': ['id', 'priorities', 'startDate', 'periodeAktif', 'endDate', 'jenis', 'subJenis', 'tenagaKesehatan', 'nama', 'str', 'kontak', 'alamat', 'linkAlamat', 'tempatPraktik1', 'kontak1', 'alamat1', 'link1', 'sip1', 'tempatPraktik2', 'kontak2', 'alamat2', 'link2', 'sip2', 'tempatPraktik3', 'kontak3', 'alamat3', 'link3', 'sip3', 'sosmed', 'campaign', 'imageUrl', 'wilayahKerja', 'keywords'],
  'Banner': ['ID', 'Client', 'StartDate', 'Periode', 'EndDate', 'LinkImage']
};

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  Object.keys(DATABASE_SCHEMA).forEach(sheetName => {
    if (sheetName === 'subscriptions') return;
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) { result[sheetName] = []; return; }
    const values = sheet.getDataRange().getDisplayValues(); 
    if (values.length <= 1) { result[sheetName] = []; return; }
    const headers = values[0];
    result[sheetName] = values.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        let val = row[index];
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) { try { val = JSON.parse(val); } catch(err) {} }
        obj[header] = val;
      });
      return obj;
    });
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (lock.tryLock(30000)) {
      const request = JSON.parse(e.postData.contents);
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      
      if (request.action === 'saveSubscription') {
        const sub = request.subscription;
        let sheet = ss.getSheetByName('subscriptions');
        if (!sheet) { sheet = ss.insertSheet('subscriptions'); sheet.appendRow(DATABASE_SCHEMA['subscriptions']); }
        const data = sheet.getDataRange().getValues();
        if (!data.some(row => row[0] === sub.endpoint)) {
          sheet.appendRow([sub.endpoint, sub.keys.p256dh, sub.keys.auth, request.userAgent, new Date().toISOString()]);
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
      }

      if (request.action === 'saveAll') {
        const payload = request.payload;
        Object.keys(DATABASE_SCHEMA).forEach(sheetName => {
          if (sheetName === 'subscriptions') return;
          if (payload.hasOwnProperty(sheetName)) {
            let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
            const headers = DATABASE_SCHEMA[sheetName];
            const dataRows = payload[sheetName] || [];
            sheet.clearContents();
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            if (dataRows.length > 0) {
              const formattedRows = dataRows.map(item => headers.map(h => {
                let val = item[h]; if (val === undefined || val === null) return '';
                return "'" + ((typeof val === 'object') ? JSON.stringify(val) : val.toString()); 
              }));
              sheet.getRange(2, 1, formattedRows.length, headers.length).setValues(formattedRows);
            }
          }
        });
        SpreadsheetApp.flush();
        return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (request.action === 'upload') {
        // Simple upload handler placeholder (requires Drive API setup usually)
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', url: 'https://via.placeholder.com/150' })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}

/**
 * LOGIKA NOTIFIKASI: 10 MENIT SEBELUM JADWAL
 * Dijalankan tiap menit oleh Trigger.
 */
function checkReminders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();
  
  // Target = Waktu Sekarang + 10 Menit.
  // Jika Jadwal Obat jam 10:00. Script jalan jam 09:50.
  // 09:50 + 10 menit = 10:00. (COCOK -> KIRIM NOTIF)
  const targetTime = new Date(now.getTime() + (10 * 60 * 1000)); 
  const targetString = Utilities.formatDate(targetTime, "GMT+7", "yyyy-MM-dd HH:mm"); // Format sampai menit
  
  // 1. Cek Pengingat Obat (meds)
  const medSheet = ss.getSheetByName('meds');
  if (medSheet) {
    const data = medSheet.getDataRange().getDisplayValues(); // Ambil semua data sebagai string
    // Index Kolom (Berdasarkan Schema di atas):
    // 0:id, 1:memberId, 2:name, 3:dosage, 4:freq, 5:instruct, 6:nextTime, 7:active
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nextTimeStr = row[6]; 
      const isActive = row[7] === 'TRUE' || row[7] === 'true';
      
      if (isActive && nextTimeStr) {
        const scheduleDate = new Date(nextTimeStr);
        const scheduleString = Utilities.formatDate(scheduleDate, "GMT+7", "yyyy-MM-dd HH:mm");
        
        // Cek apakah jadwal obat == (sekarang + 10 menit)
        if (scheduleString === targetString) {
          sendPushBroadcast({
            title: "Pengingat Obat 💊",
            body: `10 Menit lagi waktunya minum: ${row[2]} (${row[3]}).`,
            url: "/?tab=meds"
          });
        }
      }
    }
  }

  // 2. Cek Jadwal Kontrol (appointments)
  const apptSheet = ss.getSheetByName('appointments');
  if (apptSheet) {
    const data = apptSheet.getDataRange().getDisplayValues();
    // Index Kolom:
    // 0:id, 1:memberId, 2:title, 3:dateTime, 4:doctor, 5:location
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const dateStr = row[3];
      
      if (dateStr) {
        const scheduleDate = new Date(dateStr);
        const scheduleString = Utilities.formatDate(scheduleDate, "GMT+7", "yyyy-MM-dd HH:mm");

        // Cek apakah jadwal kontrol == (sekarang + 10 menit)
        if (scheduleString === targetString) {
          sendPushBroadcast({
            title: "Jadwal Kontrol 🏥",
            body: `10 Menit lagi: ${row[2]} di ${row[5]}. Jangan lupa dokumen Anda.`,
            url: "/?tab=schedule"
          });
        }
      }
    }
  }
}

function sendPushBroadcast(payload) {
  if (VERCEL_PUSH_API_URL.includes('GANTI_DENGAN')) return; // Belum disetting

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const subSheet = ss.getSheetByName('subscriptions');
  if (!subSheet) return;

  const data = subSheet.getDataRange().getValues();
  // Loop semua subscriber (mulai baris 2)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const endpoint = row[0];
    const p256dh = row[1];
    const auth = row[2];

    if (endpoint && p256dh && auth) {
      const subscription = {
        endpoint: endpoint,
        keys: { p256dh: p256dh, auth: auth }
      };

      try {
        UrlFetchApp.fetch(VERCEL_PUSH_API_URL, {
          'method': 'post',
          'contentType': 'application/json',
          'payload': JSON.stringify({ subscription: subscription, payload: payload }),
          'muteHttpExceptions': true
        });
      } catch (e) {
        Logger.log("Gagal kirim notif: " + e.toString());
      }
    }
  }
}
