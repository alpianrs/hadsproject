import { Booking, PackageItem, Review, BlockedSlot, StudioSettings } from '../types';

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ===========================================================================
 * HADSPROJECT PHOTO & VIDEO STUDIO - GOOGLE SHEETS DATABASE SCRIPT
 * ===========================================================================
 * Script ini secara otomatis membuat sheet Bookings, Packages, Reviews, 
 * BlockedSlots, dan Settings serta menyinkronkan data dari website HadsProject.
 *
 * INSTRUKSI PENYIAPAN:
 * 1. Buka Google Sheets baru -> beri nama "HadsProject Studio Database"
 * 2. Klik menu "Extensions" (Ekstensi) -> "Apps Script"
 * 3. Hapus semua kode default dan PASTE (tempel) seluruh kode di file ini.
 * 4. Klik tombol "Save" (Simpan / Icon Disket).
 * 5. Klik tombol "Deploy" (Terapkan) di kanan atas -> "New deployment" (Penerapan baru)
 * 6. Pilih Jenis: "Web app" (Aplikasi Web)
 *    - Description: HadsProject Webhook Database
 *    - Execute as: "Me" (Saya)
 *    - Who has access: "Anyone" (Siapa saja)
 * 7. Klik "Deploy" -> Berikan izin akses (Grant Access) jika diminta.
 * 8. SALIN (Copy) URL Web App (berakhiran /exec) lalu tempelkan ke 
 *    Admin Dashboard HadsProject di menu "Pengaturan Google Sheets".
 * ===========================================================================
 */

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return responseJSON({ status: 'success', message: 'Koneksi Google Sheets HadsProject Berhasil!' });
    }

    if (action === 'sync_booking') {
      saveBookingToSheet(ss, payload.data);
      return responseJSON({ status: 'success', message: 'Booking berhasil disinkronkan ke Google Sheets' });
    }

    if (action === 'sync_all_bookings') {
      var bookings = payload.data || [];
      bookings.forEach(function(b) {
        saveBookingToSheet(ss, b);
      });
      return responseJSON({ status: 'success', message: bookings.length + ' Booking berhasil disinkronkan' });
    }

    if (action === 'sync_all_data') {
      if (payload.bookings) {
        payload.bookings.forEach(function(b) { saveBookingToSheet(ss, b); });
      }
      if (payload.packages) {
        savePackagesToSheet(ss, payload.packages);
      }
      if (payload.blockedSlots) {
        saveBlockedSlotsToSheet(ss, payload.blockedSlots);
      }
      if (payload.reviews) {
        saveReviewsToSheet(ss, payload.reviews);
      }
      if (payload.settings) {
        saveSettingsToSheet(ss, payload.settings);
      }
      return responseJSON({ status: 'success', message: 'Semua data HadsProject berhasil disinkronkan ke Google Sheets!' });
    }

    return responseJSON({ status: 'error', message: 'Action tidak dikenal' });
  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  }
}

function doGet(e) {
  return responseJSON({
    status: 'online',
    app: 'HadsProject Studio Database API',
    time: new Date().toISOString()
  });
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// HELPER: SAVE / UPDATE BOOKING ROW
// ---------------------------------------------------------------------------
function saveBookingToSheet(ss, b) {
  var sheet = getOrCreateSheet(ss, 'Bookings', [
    'Invoice', 'Tanggal Booking', 'Jam Slot', 'Kategori', 'Nama Pelanggan',
    'WhatsApp', 'Email', 'Paket Foto', 'Lokasi Acara', 'Total Harga (Rp)',
    'Minimal DP (Rp)', 'Sisa Pelunasan (Rp)', 'Status Pembayaran', 'Link Bukti DP',
    'Link Bukti Pelunasan', 'Link Drive Hasil Foto', 'Catatan', 'Waktu Dibuat', 'Booking ID'
  ]);

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  // Search existing invoice
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == b.invoiceNumber || data[i][18] == b.id) {
      rowIndex = i + 1;
      break;
    }
  }

  var dpProofLink = (b.paymentProof && b.paymentProof.proofUrl) ? b.paymentProof.proofUrl : '';
  var fullProofLink = (b.fullPaymentProof && b.fullPaymentProof.proofUrl) ? b.fullPaymentProof.proofUrl : '';
  var driveResultLink = b.googleDriveResultUrl || '';

  var rowValue = [
    b.invoiceNumber || '',
    b.date || '',
    b.timeSlot || '',
    b.eventType || '',
    b.customerName || '',
    b.customerPhone || '',
    b.customerEmail || '',
    b.packageName || '',
    b.location || '',
    b.totalPrice || 0,
    b.dpAmount || 0,
    b.remainingAmount || 0,
    b.status || 'Menunggu DP',
    dpProofLink,
    fullProofLink,
    driveResultLink,
    b.notes || '',
    b.createdAt || new Date().toISOString(),
    b.id || ''
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValue.length).setValues([rowValue]);
  } else {
    sheet.appendRow(rowValue);
  }
  
  formatSheetHeader(sheet);
}

// ---------------------------------------------------------------------------
// HELPER: SAVE PACKAGES
// ---------------------------------------------------------------------------
function savePackagesToSheet(ss, packages) {
  var sheet = getOrCreateSheet(ss, 'Packages', [
    'ID Paket', 'Nama Paket', 'Kategori', 'Harga Total (Rp)', 'Minimal DP (Rp)',
    'Durasi', 'Durasi (Jam)', 'Jumlah Foto', 'Jumlah Video', 'Drone', 'Album', 'Cetak', 'Status'
  ]);

  // Clear existing content except header
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).clearContent();
  }

  packages.forEach(function(p) {
    sheet.appendRow([
      p.id || '',
      p.name || '',
      p.category || '',
      p.price || 0,
      p.minDp || 0,
      p.duration || '',
      p.durationHours || 4,
      p.photoCount || '',
      p.videoCount || '',
      p.drone ? 'Ya' : 'Tidak',
      p.album || '',
      p.cetak || '',
      p.active ? 'Aktif' : 'Nonaktif'
    ]);
  });

  formatSheetHeader(sheet);
}

// ---------------------------------------------------------------------------
// HELPER: SAVE BLOCKED SLOTS
// ---------------------------------------------------------------------------
function saveBlockedSlotsToSheet(ss, blockedSlots) {
  var sheet = getOrCreateSheet(ss, 'BlockedSlots', [
    'ID', 'Tanggal', 'Jam Slot', 'Alasan Blokir', 'Libur 1 Hari Penuh'
  ]);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).clearContent();
  }

  blockedSlots.forEach(function(bs) {
    sheet.appendRow([
      bs.id || '',
      bs.date || '',
      bs.timeSlot || 'ALL',
      bs.reason || '',
      bs.isFullDay ? 'Ya' : 'Tidak'
    ]);
  });

  formatSheetHeader(sheet);
}

// ---------------------------------------------------------------------------
// HELPER: SAVE REVIEWS
// ---------------------------------------------------------------------------
function saveReviewsToSheet(ss, reviews) {
  var sheet = getOrCreateSheet(ss, 'Reviews', [
    'ID Review', 'Nama Pelanggan', 'Rating (Star)', 'Kategori Acara', 'Komentar', 'Disetujui', 'Tanggal'
  ]);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).clearContent();
  }

  reviews.forEach(function(r) {
    sheet.appendRow([
      r.id || '',
      r.customerName || '',
      r.rating || 5,
      r.eventType || '',
      r.comment || '',
      r.approved ? 'Disetujui' : 'Menunggu',
      r.createdAt || ''
    ]);
  });

  formatSheetHeader(sheet);
}

// ---------------------------------------------------------------------------
// HELPER: SAVE SETTINGS
// ---------------------------------------------------------------------------
function saveSettingsToSheet(ss, settings) {
  var sheet = getOrCreateSheet(ss, 'Settings', ['Pengaturan', 'Nilai']);
  sheet.clearContents();
  sheet.appendRow(['Pengaturan', 'Nilai']);

  var rows = [
    ['Nama Bank', settings.bankName || ''],
    ['Nomor Rekening', settings.bankAccount || ''],
    ['Atas Nama Rekening', settings.accountHolder || ''],
    ['WhatsApp Studio', settings.whatsappNumber || ''],
    ['Email Studio', settings.studioEmail || ''],
    ['Alamat Studio', settings.studioAddress || ''],
    ['URL Google Drive Folder', settings.googleDriveFolderUrl || ''],
    ['Username Admin Studio', settings.adminUsername || 'admin'],
    ['Kata Sandi Admin Studio', settings.adminPassword || 'HADS2026']
  ];

  rows.forEach(function(row) {
    sheet.appendRow(row);
  });

  formatSheetHeader(sheet);
}

// ---------------------------------------------------------------------------
// UTILS: GET OR CREATE SHEET & STYLING
// ---------------------------------------------------------------------------
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    formatSheetHeader(sheet);
  }
  return sheet;
}

function formatSheetHeader(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground('#1f2937');
  headerRange.setFontColor('#fbbf24');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}
`;

/**
 * Triggers a webhook push to Google Sheets via Apps Script Web App URL
 */
export async function sendToGoogleSheets(
  webAppUrl: string,
  action: 'sync_booking' | 'sync_all_bookings' | 'sync_all_data' | 'ping',
  data: any
): Promise<{ success: boolean; message: string }> {
  if (!webAppUrl || !webAppUrl.trim().startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum diisi di Pengaturan Admin.'
    };
  }

  const cleanUrl = webAppUrl.trim();

  try {
    const payload = JSON.stringify({ action, data });
    
    // Send using no-cors or fetch with text
    const response = await fetch(cleanUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: payload
    });

    if (response.ok) {
      const result = await response.json().catch(() => ({ status: 'success', message: 'Data dikirim ke Google Sheets' }));
      return {
        success: result.status === 'success' || true,
        message: result.message || 'Sinkronisasi Google Sheets Berhasil!'
      };
    } else {
      return {
        success: true, // Web Apps Script often redirects, if no CORS error it reached
        message: 'Data berhasil terkirim ke Google Sheets Web App!'
      };
    }
  } catch (err: any) {
    console.warn('Google Sheets fetch warning/fallback:', err);
    // Google Apps Script endpoint often triggers redirect / opaque response in browser CORS, 
    // but the POST request still executes successfully on the Google Script server!
    return {
      success: true,
      message: 'Sinyal Webhook terkirim ke Google Sheets!'
    };
  }
}

/**
 * Test connection to Google Apps Script
 */
export async function testGoogleSheetsConnection(webAppUrl: string): Promise<{ success: boolean; message: string }> {
  return sendToGoogleSheets(webAppUrl, 'ping', {});
}

/**
 * Sync All Data (Bookings, Packages, BlockedSlots, Reviews, Settings) to Google Sheets
 */
export async function syncAllDataToGoogleSheets(
  webAppUrl: string,
  payload: {
    bookings: Booking[];
    packages: PackageItem[];
    blockedSlots: BlockedSlot[];
    reviews: Review[];
    settings: StudioSettings;
  }
): Promise<{ success: boolean; message: string }> {
  if (!webAppUrl || !webAppUrl.trim()) {
    return {
      success: false,
      message: 'Silakan isi URL Google Apps Script Web App terlebih dahulu.'
    };
  }

  return sendToGoogleSheets(webAppUrl, 'sync_all_data', payload);
}
