import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { brand } from "@/config/brand";
import {
  EXTERNAL_BODY_ITEMS,
  MECHANICAL_ITEMS,
  PHOTO_ANGLES,
  type InspectionReportData,
} from "@/lib/inspection/report-schema";
import { inspectionReportTitle } from "@/lib/inspection/report-filename";

const PAGE: [number, number] = [595.28, 841.89];
const INK = rgb(0.07, 0.08, 0.11);
const MUTED = rgb(0.36, 0.37, 0.4);
const LINE = rgb(0.78, 0.79, 0.81);
const SOFT = rgb(0.965, 0.965, 0.97);
const SECTION = rgb(0.9, 0.91, 0.93);
const PASS = rgb(0.05, 0.43, 0.2);
const FAIL = rgb(0.68, 0.08, 0.08);
const MARGIN = 42;
const CONTENT_WIDTH = PAGE[0] - MARGIN * 2;
const COLUMN_GAP = 12;
const COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2;

export type InspectionPdfPhoto = {
  angle: string;
  note?: string;
  contentType: string;
  bytes: ArrayBuffer;
};

export type InspectionPdfInput = {
  data: InspectionReportData;
  completedAt: string | null;
  inspectorName?: string | null;
  photosExpired?: boolean;
  photos: InspectionPdfPhoto[];
};

type Fonts = { regular: PDFFont; bold: PDFFont };
type Field = [label: string, value: unknown];

function ascii(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function display(value: unknown) {
  const text = ascii(value);
  if (!text) return "-";
  return text.replace(/\b(pass|yes)\b/gi, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .replace(/\b(fail|no|unknown)\b/gi, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

function drawPageNumber(page: PDFPage, fonts: Fonts, pageNumber: number) {
  page.drawText(`Page ${pageNumber}`, { x: 510, y: 22, size: 7, font: fonts.regular, color: MUTED });
}

function drawReportHeader(page: PDFPage, fonts: Fonts, logo: PDFImage | null) {
  if (logo) {
    const scale = Math.min(30 / logo.width, 30 / logo.height);
    page.drawImage(logo, { x: MARGIN, y: 784, width: logo.width * scale, height: logo.height * scale });
  }
  page.drawText("CarVibeDubai", { x: MARGIN + (logo ? 38 : 0), y: 796, size: 11, font: fonts.bold, color: INK });
  page.drawText("Vehicle inspection report", { x: MARGIN + (logo ? 38 : 0), y: 785, size: 6.8, font: fonts.regular, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: 775 }, end: { x: PAGE[0] - MARGIN, y: 775 }, thickness: 0.75, color: LINE });
}

function drawSectionTitle(page: PDFPage, fonts: Fonts, title: string, y: number) {
  const text = ascii(title);
  page.drawRectangle({ x: MARGIN, y: y - 7, width: CONTENT_WIDTH, height: 24, color: SECTION });
  page.drawText(text, { x: MARGIN + 10, y, size: 11, font: fonts.bold, color: INK });
}

function shorten(font: PDFFont, text: string, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > maxWidth) result = result.slice(0, -1);
  return `${result.trim()}...`;
}

function drawField(page: PDFPage, fonts: Fonts, field: Field, x: number, y: number, width = COLUMN_WIDTH, height = 31) {
  const label = display(field[0]);
  const value = display(field[1]);
  page.drawRectangle({ x, y, width, height, color: SOFT, borderColor: LINE, borderWidth: 0.55 });
  page.drawText(shorten(fonts.bold, label, 7.1, width - 16), { x: x + 8, y: y + 18, size: 7.1, font: fonts.bold, color: MUTED });
  const fitted = shorten(fonts.regular, value, 7.7, width * 0.48);
  page.drawText(fitted, { x: x + width - 8 - fonts.regular.widthOfTextAtSize(fitted, 7.7), y: y + 7, size: 7.7, font: fonts.regular, color: INK });
}

function drawFieldGrid(page: PDFPage, fonts: Fonts, fields: Field[], startY: number, rowHeight = 37) {
  fields.forEach((field, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawField(page, fonts, field, MARGIN + column * (COLUMN_WIDTH + COLUMN_GAP), startY - row * rowHeight);
  });
}

function wrapLines(font: PDFFont, value: unknown, size: number, maxWidth: number) {
  const words = display(value).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWideNote(page: PDFPage, fonts: Fonts, label: string, value: unknown, x: number, y: number, width = CONTENT_WIDTH, height = 42) {
  page.drawRectangle({ x, y, width, height, borderColor: LINE, borderWidth: 0.55 });
  page.drawText(display(label), { x: x + 8, y: y + height - 13, size: 7.5, font: fonts.bold, color: INK });
  const lines = wrapLines(fonts.regular, value, 7.2, width - 16).slice(0, Math.max(1, Math.floor((height - 18) / 9)));
  lines.forEach((line, index) => page.drawText(line, { x: x + 8, y: y + height - 24 - index * 9, size: 7.2, font: fonts.regular, color: INK }));
}

function drawCheckGrid(page: PDFPage, fonts: Fonts, fields: Field[], startY: number, rowHeight = 34) {
  fields.forEach((field, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + column * (COLUMN_WIDTH + COLUMN_GAP);
    const y = startY - row * rowHeight;
    const value = display(field[1]);
    const isPass = /^(Pass|Yes)$/i.test(value);
    const valueColor = isPass ? PASS : /^(Fail|No)$/i.test(value) ? FAIL : MUTED;
    page.drawRectangle({ x, y, width: COLUMN_WIDTH, height: 28, borderColor: LINE, borderWidth: 0.55 });
    page.drawText(shorten(fonts.bold, display(field[0]), 7.4, COLUMN_WIDTH - 70), { x: x + 8, y: y + 10, size: 7.4, font: fonts.bold, color: INK });
    page.drawText(value, { x: x + COLUMN_WIDTH - 8 - fonts.bold.widthOfTextAtSize(value, 7.4), y: y + 10, size: 7.4, font: fonts.bold, color: valueColor });
  });
}

function formatResult(result: string | undefined, note: string | undefined) {
  const base = display(result || "Not checked");
  return note ? `${base} - ${display(note)}` : base;
}

function formatCompletedAt(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Dubai",
  }).format(date);
}

async function embedPhoto(pdf: PDFDocument, photo: InspectionPdfPhoto) {
  try {
    return photo.contentType === "image/png" ? await pdf.embedPng(photo.bytes) : await pdf.embedJpg(photo.bytes);
  } catch {
    throw new Error(`The stored photo for ${photo.angle} is damaged or unsupported.`);
  }
}

function drawContainedPhoto(page: PDFPage, fonts: Fonts, image: PDFImage, title: string, note: string | undefined, x: number, y: number, width: number, height: number) {
  const captionHeight = note ? 32 : 17;
  const imageHeight = height - captionHeight;
  page.drawRectangle({ x, y, width, height, borderColor: LINE, borderWidth: 0.65 });
  page.drawRectangle({ x, y: y + imageHeight, width, height: captionHeight, color: SOFT });
  page.drawText(shorten(fonts.bold, ascii(title), 7.2, width - 12), { x: x + 6, y: y + imageHeight + 5.5, size: 7.2, font: fonts.bold, color: INK });
  if (note) page.drawText(shorten(fonts.regular, ascii(note), 6.4, width - 12), { x: x + 6, y: y + imageHeight + 17.5, size: 6.4, font: fonts.regular, color: MUTED });
  const scale = Math.min((width - 4) / image.width, (imageHeight - 4) / image.height);
  const drawnWidth = image.width * scale;
  const drawnHeight = image.height * scale;
  page.drawImage(image, {
    x: x + (width - drawnWidth) / 2,
    y: y + (imageHeight - drawnHeight) / 2,
    width: drawnWidth,
    height: drawnHeight,
  });
}

export async function buildInspectionPdf(input: InspectionPdfInput) {
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  let logo: PDFImage | null = null;
  try {
    logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "images", "logo.png")));
  } catch {
    // The report is still usable if a deployment is missing the optional brand asset.
  }
  let pageNumber = 0;
  const addPage = () => {
    const page = pdf.addPage(PAGE);
    pageNumber += 1;
    drawReportHeader(page, fonts, logo);
    drawPageNumber(page, fonts, pageNumber);
    return page;
  };
  const data = input.data;

  let page = addPage();
  const reportTitle = ascii(inspectionReportTitle(data));
  page.drawText(reportTitle, { x: MARGIN, y: 748, size: 15, font: fonts.bold, color: INK });
  drawSectionTitle(page, fonts, "Basic Information", 712);
  drawFieldGrid(page, fonts, [
    ["Car Make", data.carMake], ["Car Model", data.carModel], ["Model Trim", data.carTrim], ["Model Year", data.modelYear],
    ["Chassis Number / VIN Number", data.chassisNumber], ["Exterior Color", data.exteriorColor], ["Body Type", data.bodyType], ["Transmission", data.transmission],
    ["Drive Displacement", data.drive], ["Car Specifications", data.carSpecification], ["Production Year", data.productionYear],
    ["Mileage", data.mileageKm ? `${data.mileageKm} KM` : ""], ["Number of Keys", data.numberOfKeys], ["Number of Seats", data.numberOfSeats],
    ["Cylinders", data.cylinders], ["Engine Size", data.engineSize], ["Engine Number", data.engineNumber], ["Fuel", data.fuel],
    ["Rim Size", data.rimSize],
  ], 670);
  drawWideNote(page, fonts, "Notes", data.basicNotes, MARGIN, 287, CONTENT_WIDTH, 40);
  drawSectionTitle(page, fonts, "License Information", 252);
  drawFieldGrid(page, fonts, [
    ["First Owner", data.firstOwner], ["Is the Car Mortgaged", data.mortgaged], ["Vehicle Category", data.vehicleCategory],
    ["Insurance Type", data.insuranceType], ["Registration Expiry Date", data.registrationExpiryDate],
    ["Registered City / Plate", data.registeredCityPlate], ["Plate Number", data.plateNumber], ["TCN", data.tcn],
  ], 210);

  page = addPage();
  drawSectionTitle(page, fonts, "Service History", 742);
  drawFieldGrid(page, fonts, [
    ["Service Pack", data.servicePack], ["Service History", data.serviceHistory], ["Last Serviced", data.lastServiced], ["Warranty", data.warranty],
  ], 702);
  drawSectionTitle(page, fonts, "External Body Condition", 607);
  drawCheckGrid(page, fonts, EXTERNAL_BODY_ITEMS.map((item) => [item, formatResult(data.externalBody[item], undefined)]), 568);

  page = addPage();
  drawSectionTitle(page, fonts, "Mechanical Components", 742);
  drawCheckGrid(page, fonts, MECHANICAL_ITEMS.map((item) => [item, formatResult(data.mechanical[item], undefined)]), 704, 31);
  drawSectionTitle(page, fonts, "Tyres and Accessories", 238);
  const tyreFields: Field[] = [
    ["Driver Side Front Tyre", `${display(data.tyres.driverFront.result)} - ${display(data.tyres.driverFront.year)}`],
    ["Driver Side Rear Tyre", `${display(data.tyres.driverRear.result)} - ${display(data.tyres.driverRear.year)}`],
    ["Passenger Side Front Tyre", `${display(data.tyres.passengerFront.result)} - ${display(data.tyres.passengerFront.year)}`],
    ["Passenger Side Rear Tyre", `${display(data.tyres.passengerRear.result)} - ${display(data.tyres.passengerRear.year)}`],
    ["Spare Tyre", data.tyres.spareTyre], ["Truck Tools Available", data.tyres.truckToolsAvailable],
    ["Service Book", data.tyres.serviceBook], ["Interior Seats", data.interiorSeatType],
  ];
  drawFieldGrid(page, fonts, tyreFields, 198, 34);

  const detailedNotes: Field[] = [
    ...EXTERNAL_BODY_ITEMS.filter((item) => data.externalBody[item] === "fail" && data.failureNotes[item]?.trim()).map((item) => [item, data.failureNotes[item]] as Field),
    ...MECHANICAL_ITEMS.filter((item) => data.mechanical[item] === "fail" && data.failureNotes[item]?.trim()).map((item) => [item, data.failureNotes[item]] as Field),
    ...([['Driver Side Front Tyre', data.tyres.driverFront], ['Driver Side Rear Tyre', data.tyres.driverRear], ['Passenger Side Front Tyre', data.tyres.passengerFront], ['Passenger Side Rear Tyre', data.tyres.passengerRear]] as const)
      .filter(([, tyre]) => tyre.note.trim()).map(([label, tyre]) => [label, tyre.note] as Field),
    ...(data.interiorNotes.trim() ? [["Interior Notes", data.interiorNotes] as Field] : []),
  ];
  for (let start = 0; start < detailedNotes.length; start += 9) {
    page = addPage();
    drawSectionTitle(page, fonts, start === 0 ? "Inspection Notes" : "Inspection Notes - Continued", 742);
    detailedNotes.slice(start, start + 9).forEach(([label, value], index) => drawWideNote(page, fonts, label, value, MARGIN, 662 - index * 73, CONTENT_WIDTH, 61));
  }

  const photoMap = new Map(input.photos.map((photo) => [photo.angle, photo]));
  const orderedPhotos = PHOTO_ANGLES.map((angle) => photoMap.get(angle)).filter((photo): photo is InspectionPdfPhoto => Boolean(photo));
  const embeddedPhotos = await Promise.all(orderedPhotos.map(async (photo) => ({ photo, image: await embedPhoto(pdf, photo) })));

  page = addPage();
  drawSectionTitle(page, fonts, "Report Information", 742);
  drawFieldGrid(page, fonts, [
    ["Report Status", "Completed"], ["Inspected By", input.inspectorName], ["Inspected On", formatCompletedAt(input.completedAt)], ["Branch", brand.address],
  ], 702);
  const first = embeddedPhotos.slice(0, 4);
  if (input.photosExpired) {
    drawWideNote(page, fonts, "Photo retention", "Inspection photos were automatically removed 60 days after the vehicle was sold. The inspection information and activity record remain available.", MARGIN, 570, CONTENT_WIDTH, 64);
  }
  const firstSlots = [
    [MARGIN, 362, COLUMN_WIDTH, 298], [MARGIN + COLUMN_WIDTH + COLUMN_GAP, 362, COLUMN_WIDTH, 298],
    [MARGIN, 48, COLUMN_WIDTH, 290], [MARGIN + COLUMN_WIDTH + COLUMN_GAP, 48, COLUMN_WIDTH, 290],
  ] as const;
  first.forEach((entry, index) => {
    const [x, y, width, height] = firstSlots[index];
    drawContainedPhoto(page, fonts, entry.image, `${index + 1}. ${entry.photo.angle}`, entry.photo.note, x, y, width, height);
  });

  let start = 4;
  while (start < embeddedPhotos.length) {
    page = addPage();
    const remaining = embeddedPhotos.length - start;
    const groupSize = Math.min(5, remaining);
    const group = embeddedPhotos.slice(start, start + groupSize);
    const slots = group.length === 4
      ? [
          [MARGIN, 400, COLUMN_WIDTH, 350], [MARGIN + COLUMN_WIDTH + COLUMN_GAP, 400, COLUMN_WIDTH, 350],
          [MARGIN, 48, COLUMN_WIDTH, 328], [MARGIN + COLUMN_WIDTH + COLUMN_GAP, 48, COLUMN_WIDTH, 328],
        ] as const
      : [
          [MARGIN, 570, COLUMN_WIDTH, 180], [MARGIN + COLUMN_WIDTH + COLUMN_GAP, 570, COLUMN_WIDTH, 180],
          [MARGIN, 275, CONTENT_WIDTH, 271], [MARGIN, 48, COLUMN_WIDTH, 203],
          [MARGIN + COLUMN_WIDTH + COLUMN_GAP, 48, COLUMN_WIDTH, 203],
        ] as const;
    group.forEach((entry, index) => {
      const [x, y, width, height] = slots[index];
      drawContainedPhoto(page, fonts, entry.image, `${start + index + 1}. ${entry.photo.angle}`, entry.photo.note, x, y, width, height);
    });
    start += groupSize;
  }

  return pdf.save();
}
