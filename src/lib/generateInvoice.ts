import { jsPDF } from 'jspdf';
import { Booking, StudioSettings } from '../types';

export function generateInvoicePDF(booking: Booking, settings?: StudioSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const goldColor = '#D4AF37';
  const darkColor = '#121212';
  const grayColor = '#555555';

  // Background Header Bar (Dark & Gold Line)
  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setFillColor(212, 175, 55);
  doc.rect(0, 38, 210, 3, 'F');

  // Studio Header Logo Text
  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('HADSPROJECT', 15, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('PHOTOGRAPHY & CINEMATOGRAPHY', 15, 25);
  doc.text(settings?.studioAddress || 'Jl. Kemang Raya No. 45, Jakarta Selatan', 15, 31);

  // Invoice Title Right
  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('INVOICE', 195, 18, { align: 'right' });

  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`NO: ${booking.invoiceNumber || 'INV-HADS-' + booking.id.slice(-6).toUpperCase()}`, 195, 25, { align: 'right' });
  doc.text(`DATE: ${new Date(booking.createdAt).toLocaleDateString('id-ID')}`, 195, 31, { align: 'right' });

  // Bill To & Event Details Boxes
  let y = 52;

  // Box 1: Customer Details
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(15, y, 88, 42, 2, 2, 'FD');

  doc.setTextColor(18, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INFORMASI CUSTOMER', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Nama    : ${booking.customerName}`, 20, y + 16);
  doc.text(`WhatsApp: ${booking.customerPhone}`, 20, y + 22);
  doc.text(`Email   : ${booking.customerEmail}`, 20, y + 28);
  doc.text(`Lokasi  : ${booking.location.substring(0, 32)}`, 20, y + 34);

  // Box 2: Event Details
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(107, y, 88, 42, 2, 2, 'FD');

  doc.setTextColor(18, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETAIL JADWAL ACARA', 112, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Jenis Acara : ${booking.eventType}`, 112, y + 16);
  doc.text(`Tanggal     : ${booking.date}`, 112, y + 22);
  doc.text(`Jam Slot    : ${booking.timeSlot} WIB`, 112, y + 28);

  let statusText = booking.status.toUpperCase();
  doc.setFont('helvetica', 'bold');
  if (booking.status === 'DP Lunas' || booking.status === 'Selesai' || booking.status === 'DP Diverifikasi') {
    doc.setTextColor(34, 139, 34); // Green
  } else if (booking.status === 'Dibatalkan') {
    doc.setTextColor(178, 34, 34); // Red
  } else {
    doc.setTextColor(184, 134, 11); // Gold Dark
  }
  doc.text(`Status      : ${statusText}`, 112, y + 34);

  // Itemized Table Header
  y = 104;
  doc.setFillColor(18, 18, 18);
  doc.rect(15, y, 180, 10, 'F');

  doc.setTextColor(212, 175, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ITEM & PAKET FOTOGRAFI', 20, y + 6.5);
  doc.text('ACARA', 120, y + 6.5);
  doc.text('HARGA TOTAL (IDR)', 190, y + 6.5, { align: 'right' });

  // Table Body Row
  y += 10;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(230, 230, 230);
  doc.rect(15, y, 180, 25, 'FD');

  doc.setTextColor(18, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(booking.packageName, 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  const notesClean = booking.notes ? `Catatan: ${booking.notes.substring(0, 50)}` : 'Sesi fotografi & dokumentasi profesional';
  doc.text(notesClean, 20, y + 15);

  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text(booking.eventType, 120, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.text(`Rp ${booking.totalPrice.toLocaleString('id-ID')}`, 190, y + 8, { align: 'right' });

  // Financial Breakdown Box Right
  y += 33;
  const rightBoxX = 110;
  const boxWidth = 85;

  doc.setDrawColor(212, 175, 55);
  doc.setFillColor(253, 250, 240);
  doc.roundedRect(rightBoxX, y, boxWidth, 45, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  doc.text('Total Paket:', rightBoxX + 6, y + 10);
  doc.text(`Rp ${booking.totalPrice.toLocaleString('id-ID')}`, rightBoxX + boxWidth - 6, y + 10, { align: 'right' });

  doc.text('Minimal DP (Down Payment):', rightBoxX + 6, y + 18);
  doc.text(`Rp ${booking.dpAmount.toLocaleString('id-ID')}`, rightBoxX + boxWidth - 6, y + 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 139, 34);
  const isPaidDP = booking.status === 'DP Lunas' || booking.status === 'Selesai' || booking.status === 'DP Diverifikasi';
  const dpPaidDisplay = isPaidDP ? booking.dpAmount : 0;
  doc.text('DP Terbayar:', rightBoxX + 6, y + 26);
  doc.text(`Rp ${dpPaidDisplay.toLocaleString('id-ID')}`, rightBoxX + boxWidth - 6, y + 26, { align: 'right' });

  doc.setDrawColor(200, 200, 200);
  doc.line(rightBoxX + 6, y + 30, rightBoxX + boxWidth - 6, y + 30);

  doc.setFontSize(10);
  doc.setTextColor(178, 34, 34);
  const remainDisplay = isPaidDP ? booking.totalPrice - booking.dpAmount : booking.totalPrice;
  doc.text('Sisa Pembayaran:', rightBoxX + 6, y + 38);
  doc.text(`Rp ${remainDisplay.toLocaleString('id-ID')}`, rightBoxX + boxWidth - 6, y + 38, { align: 'right' });

  // Bank Info Left Box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(15, y, 88, 45, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(18, 18, 18);
  doc.text('INFORMASI REKENING PEMBAYARAN', 20, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`Bank          : ${settings?.bankName || 'BANK BCA'}`, 20, y + 17);
  doc.text(`No. Rekening  : ${settings?.bankAccount || '8835091244'}`, 20, y + 23);
  doc.text(`Atas Nama     : ${settings?.accountHolder || 'HadsProject Studio'}`, 20, y + 29);
  doc.text('Konfirmasi transfer via aplikasi atau WhatsApp.', 20, y + 37);

  // Authenticity Stamp & QR Representation Bottom
  y += 58;

  doc.setDrawColor(220, 220, 220);
  doc.line(15, y, 195, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text('HADSPROJECT OFFICIAL VERIFIED INVOICE', 15, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Dokumen ini diterbitkan secara resmi oleh sistem HadsProject Photography. Harap simpan sebagai bukti transaksi sah.', 15, y + 5);

  // Download PDF file
  const fileName = `Invoice_HadsProject_${booking.invoiceNumber || booking.id.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
