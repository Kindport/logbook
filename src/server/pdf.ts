import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface StudentInfo {
  name: string;
  matric_no: string;
  institution: string;
  department: string;
  host_organization: string;
  start_date: string;
  duration_weeks: number;
}

interface EntryDay {
  day_name: string;
  text: string;
}

interface EntryItem {
  week_number: number;
  date_range: string;
  summary: string;
  raw_notes?: string;
  days: EntryDay[];
}

export async function generateLogbookPdf(student: StudentInfo, entries: EntryItem[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_WIDTH = 595.28; // A4 standard width (pt)
  const PAGE_HEIGHT = 841.89; // A4 standard height (pt)
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  // Primary colors
  const primaryColor = rgb(0.12, 0.45, 0.22); // Deep forest green (official SIWES style)
  const darkTextColor = rgb(0.1, 0.1, 0.1);
  const mutedTextColor = rgb(0.35, 0.35, 0.35);
  const borderColor = rgb(0.78, 0.82, 0.8);
  const tableHeaderBg = rgb(0.93, 0.96, 0.93);

  // Helper to split text into lines given maxWidth and fontSize
  function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
    if (!text) return [];
    const paragraphs = text.split('\n');
    const resultLines: string[] = [];

    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) resultLines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) {
        resultLines.push(currentLine);
      }
    }
    return resultLines;
  }

  // --- PAGE 1: COVER & PROFILE ---
  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 50;

  // Header banner box
  coverPage.drawRectangle({
    x: MARGIN,
    y: y - 75,
    width: CONTENT_WIDTH,
    height: 75,
    color: primaryColor,
  });

  coverPage.drawText('FEDERAL REPUBLIC OF NIGERIA', {
    x: MARGIN + 20,
    y: y - 22,
    size: 11,
    font: fontBold,
    color: rgb(0.9, 0.95, 0.9),
  });

  coverPage.drawText('STUDENTS INDUSTRIAL WORK EXPERIENCE SCHEME (SIWES)', {
    x: MARGIN + 20,
    y: y - 42,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  coverPage.drawText('OFFICIAL TRAINING LOGBOOK & ACTIVITY RECORD', {
    x: MARGIN + 20,
    y: y - 62,
    size: 10,
    font: fontRegular,
    color: rgb(0.85, 0.95, 0.85),
  });

  y -= 105;

  // Trainee details card
  coverPage.drawText('STUDENT & PLACEMENT PARTICULARS', {
    x: MARGIN,
    y,
    size: 13,
    font: fontBold,
    color: primaryColor,
  });

  y -= 10;
  coverPage.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 1.5,
    color: primaryColor,
  });

  y -= 25;

  const infoRows = [
    ['Full Name of Student:', student.name || 'N/A'],
    ['Matriculation / Reg. No:', student.matric_no || 'N/A'],
    ['Institution of Higher Learning:', student.institution || 'N/A'],
    ['Department / Course of Study:', student.department || 'N/A'],
    ['Host Organisation / Employer:', student.host_organization || 'N/A'],
    ['Commencement Date:', student.start_date || 'N/A'],
    ['Scheduled Training Duration:', `${student.duration_weeks || 0} Weeks`],
    ['Total Recorded Log Entries:', `${entries.length} Weekly Reports`],
  ];

  for (const [label, val] of infoRows) {
    coverPage.drawText(label, {
      x: MARGIN + 10,
      y,
      size: 10,
      font: fontBold,
      color: mutedTextColor,
    });
    coverPage.drawText(val, {
      x: MARGIN + 210,
      y,
      size: 10.5,
      font: fontRegular,
      color: darkTextColor,
    });
    y -= 24;
  }

  y -= 15;
  coverPage.drawRectangle({
    x: MARGIN,
    y: y - 100,
    width: CONTENT_WIDTH,
    height: 100,
    color: rgb(0.97, 0.98, 0.97),
    borderColor,
    borderWidth: 1,
  });

  coverPage.drawText('STATUTORY DECLARATION & LOGBOOK CERTIFICATION', {
    x: MARGIN + 15,
    y: y - 22,
    size: 10,
    font: fontBold,
    color: primaryColor,
  });

  const declaration =
    'This industrial logbook constitutes the authentic record of weekly work, operational duties, and practical training received by the student under the Industrial Training Fund (ITF) SIWES scheme. All daily activities described herein represent actual tasks undertaken at the host organization.';
  const decLines = wrapText(declaration, CONTENT_WIDTH - 30, fontRegular, 9);
  let decY = y - 40;
  for (const line of decLines) {
    coverPage.drawText(line, {
      x: MARGIN + 15,
      y: decY,
      size: 9,
      font: fontRegular,
      color: darkTextColor,
    });
    decY -= 13;
  }

  coverPage.drawText(`Logbook compiled via LogBook SIWES Companion on ${new Date().toLocaleDateString('en-GB')}`, {
    x: MARGIN + 15,
    y: y - 88,
    size: 8.5,
    font: fontOblique,
    color: mutedTextColor,
  });

  // --- WEEKLY REPORT PAGES ---
  // If there are no entries, add an empty notice page
  if (entries.length === 0) {
    const emptyPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    emptyPage.drawText('No weekly entries have been recorded yet.', {
      x: MARGIN,
      y: PAGE_HEIGHT / 2,
      size: 14,
      font: fontRegular,
      color: mutedTextColor,
    });
  }

  // Iterate each entry, render neatly
  let currentPage: any = null;
  let currentY = 0;

  const startNewPage = () => {
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    currentY = PAGE_HEIGHT - MARGIN;

    // Small running top header
    currentPage.drawText(`SIWES LOGBOOK — ${student.name.toUpperCase()} (${student.matric_no})`, {
      x: MARGIN,
      y: currentY,
      size: 8,
      font: fontBold,
      color: primaryColor,
    });
    currentPage.drawLine({
      start: { x: MARGIN, y: currentY - 5 },
      end: { x: MARGIN + CONTENT_WIDTH, y: currentY - 5 },
      thickness: 0.5,
      color: borderColor,
    });
    currentY -= 25;
  };

  startNewPage();

  for (const entry of entries) {
    // Check if we need a new page for the upcoming week entry block (minimum 250 pt)
    if (currentY < 320) {
      startNewPage();
    }

    // Week Banner
    currentPage.drawRectangle({
      x: MARGIN,
      y: currentY - 24,
      width: CONTENT_WIDTH,
      height: 24,
      color: tableHeaderBg,
      borderColor: primaryColor,
      borderWidth: 1,
    });

    currentPage.drawText(`WEEK ${entry.week_number} REPORT`, {
      x: MARGIN + 10,
      y: currentY - 16,
      size: 11,
      font: fontBold,
      color: primaryColor,
    });

    currentPage.drawText(`Date Range: ${entry.date_range}`, {
      x: MARGIN + 280,
      y: currentY - 16,
      size: 9.5,
      font: fontRegular,
      color: darkTextColor,
    });

    currentY -= 36;

    // Weekly Summary Box
    currentPage.drawText('Weekly Overview & Summary:', {
      x: MARGIN,
      y: currentY,
      size: 9.5,
      font: fontBold,
      color: primaryColor,
    });
    currentY -= 14;

    const summaryLines = wrapText(entry.summary || 'No summary provided for this week.', CONTENT_WIDTH - 20, fontRegular, 9);
    const summaryBoxHeight = Math.max(30, summaryLines.length * 13 + 12);

    currentPage.drawRectangle({
      x: MARGIN,
      y: currentY - summaryBoxHeight,
      width: CONTENT_WIDTH,
      height: summaryBoxHeight,
      color: rgb(0.99, 0.99, 0.99),
      borderColor,
      borderWidth: 0.8,
    });

    let sLineY = currentY - 14;
    for (const sLine of summaryLines) {
      currentPage.drawText(sLine, {
        x: MARGIN + 10,
        y: sLineY,
        size: 9,
        font: fontRegular,
        color: darkTextColor,
      });
      sLineY -= 13;
    }

    currentY -= summaryBoxHeight + 15;

    // Daily breakdown table
    const days = entry.days && entry.days.length > 0 ? entry.days : [
      { day_name: 'Monday', text: 'Routine industrial training and workplace assignments.' },
      { day_name: 'Tuesday', text: 'Continued assigned technical duties.' },
      { day_name: 'Wednesday', text: 'Hands-on practical operations.' },
      { day_name: 'Thursday', text: 'Supervised workplace tasks and documentation.' },
      { day_name: 'Friday', text: 'Weekly review, system maintenance, and cleanup.' },
    ];

    for (const d of days) {
      const dayLines = wrapText(d.text || 'No recorded activity.', CONTENT_WIDTH - 110, fontRegular, 8.5);
      const rowHeight = Math.max(22, dayLines.length * 12 + 10);

      if (currentY - rowHeight < 70) {
        startNewPage();
      }

      // Day cell outline
      currentPage.drawRectangle({
        x: MARGIN,
        y: currentY - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(1, 1, 1),
        borderColor,
        borderWidth: 0.5,
      });

      // Day Name column background
      currentPage.drawRectangle({
        x: MARGIN,
        y: currentY - rowHeight,
        width: 90,
        height: rowHeight,
        color: rgb(0.96, 0.97, 0.96),
        borderColor,
        borderWidth: 0.5,
      });

      currentPage.drawText(d.day_name.toUpperCase(), {
        x: MARGIN + 8,
        y: currentY - 14,
        size: 8.5,
        font: fontBold,
        color: primaryColor,
      });

      let dLineY = currentY - 13;
      for (const line of dayLines) {
        currentPage.drawText(line, {
          x: MARGIN + 100,
          y: dLineY,
          size: 8.5,
          font: fontRegular,
          color: darkTextColor,
        });
        dLineY -= 12;
      }

      currentY -= rowHeight;
    }

    currentY -= 10;

    // Supervisor sign-off block for the week
    if (currentY < 75) {
      startNewPage();
    }

    currentPage.drawRectangle({
      x: MARGIN,
      y: currentY - 45,
      width: CONTENT_WIDTH,
      height: 45,
      color: rgb(0.98, 0.99, 0.98),
      borderColor,
      borderWidth: 0.5,
    });

    currentPage.drawText("Industry Supervisor's Remarks & Signature: __________________________", {
      x: MARGIN + 10,
      y: currentY - 18,
      size: 8,
      font: fontRegular,
      color: mutedTextColor,
    });

    currentPage.drawText('Date: _______________   Stamp:', {
      x: MARGIN + 370,
      y: currentY - 18,
      size: 8,
      font: fontRegular,
      color: mutedTextColor,
    });

    currentPage.drawText("Institutional Supervisor's Assessment / Comment: ________________________________________________", {
      x: MARGIN + 10,
      y: currentY - 34,
      size: 8,
      font: fontRegular,
      color: mutedTextColor,
    });

    currentY -= 65;
  }

  // Add Page Numbers
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    page.drawText(`Page ${i + 1} of ${totalPages}`, {
      x: PAGE_WIDTH - MARGIN - 60,
      y: 20,
      size: 8,
      font: fontRegular,
      color: mutedTextColor,
    });
  }

  return await pdfDoc.save();
}
