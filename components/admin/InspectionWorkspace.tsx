"use client";

/* Authorized same-origin photo URLs are rendered directly so private photos do not pass through a public image optimizer. */
/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check, ChevronLeft, ChevronRight, Download, Eye, FolderOpen, RotateCcw, Save, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { useVehicleCatalog, modelsFor, trimsFor } from "@/lib/use-vehicle-catalog";
import {
  EMPTY_INSPECTION_REPORT,
  EXTERNAL_BODY_ITEMS,
  MECHANICAL_ITEMS,
  PHOTO_ANGLES,
  PHOTO_REQUIREMENTS,
  type InspectionReportData,
  type InspectionResult,
  inspectionReportSchema,
} from "@/lib/inspection/report-schema";
import { inspectionReportFilename } from "@/lib/inspection/report-filename";
import { InspectionActivityDrawer } from "@/components/admin/InspectionActivityDrawer";
import { useLeads } from "@/lib/admin/leads-store";

type Photo = { angle: string; url: string | null; note: string };
type Loaded = { lead: { full_name: string; make: string; model: string; trim: string | null; year: number; mileage_km: number | null; specification: string | null; arrival_status?: "not_arrived" | "arrived" }; report: { data: InspectionReportData; status: "draft" | "completed" }; photos: Photo[] };
type UploadPhotoResponse = { ok?: boolean; data?: { note: string; url: string }; error?: { message?: string } };
type Choice = "yes" | "no" | "unknown";

const MAX_PHOTO_BYTES = 1024 * 1024;

async function compressInspectionPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser cannot prepare this photo.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.7, 0.58, 0.46]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= MAX_PHOTO_BYTES) {
          return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg", lastModified: Date.now() });
        }
      }
      scale *= 0.8;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("This photo could not be compressed below 1 MB. Please choose another photo.");
}

const BASIC_FIELDS: Array<[keyof InspectionReportData, string, "text" | "number"]> = [
  ["chassisNumber", "Chassis Number / VIN Number", "text"], ["exteriorColor", "Exterior Color", "text"], ["bodyType", "Body Type", "text"],
  ["transmission", "Transmission", "text"], ["drive", "Drive", "text"], ["productionYear", "Production Year", "number"],
  ["mileageKm", "Mileage (KM)", "number"], ["numberOfKeys", "Number of Keys", "number"], ["numberOfSeats", "Number of Seats", "number"],
  ["cylinders", "Cylinders", "text"], ["engineSize", "Engine Size", "text"], ["engineNumber", "Engine Number", "text"],
  ["fuel", "Fuel", "text"], ["rimSize", "Rim Size", "text"], ["vehicleCategory", "Vehicle Category", "text"],
  ["insuranceType", "Insurance Type", "text"], ["registrationExpiryDate", "Registration Expiry Date", "text"],
  ["registeredCityPlate", "Registered City / Plate", "text"], ["plateNumber", "Plate Number", "text"], ["tcn", "TCN", "text"],
  ["lastServiced", "Last Serviced", "text"],
];

function choiceOptions() { return ["yes", "no", "unknown"] as const; }

export function InspectionWorkspace({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { refresh: refreshLeads } = useLeads();
  const { makes, specifications } = useVehicleCatalog();
  const [data, setData] = useState<InspectionReportData>(EMPTY_INSPECTION_REPORT);
  const [arrivalStatus, setArrivalStatus] = useState<"not_arrived" | "arrived" | undefined>(undefined);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStage, setUploadStage] = useState<"compressing" | "uploading" | "saving" | null>(null);
  const [completed, setCompleted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedSections, setHighlightedSections] = useState<string[]>([]);
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const [photoTarget, setPhotoTarget] = useState<(typeof PHOTO_REQUIREMENTS)[number] | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ angle: string; title: string; url: string; note: string; failed?: boolean } | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const photoSwipeStartX = useRef<number | null>(null);

  const photoByAngle = useMemo(() => new Map(photos.map((photo) => [photo.angle, photo])), [photos]);
  const previewablePhotos = useMemo(() => PHOTO_REQUIREMENTS.flatMap((requirement) => {
    const photo = photoByAngle.get(requirement.angle);
    return photo?.url ? [{ angle: requirement.angle, title: requirement.title, url: photo.url, note: photo.note }] : [];
  }), [photoByAngle]);
  const selectedModels = modelsFor(makes, data.carMake);
  const selectedTrims = trimsFor(makes, data.carMake, data.carModel);
  const previewIndex = previewPhoto ? previewablePhotos.findIndex((photo) => photo.angle === previewPhoto.angle) : -1;

  function openPhotoPreview(requirement: (typeof PHOTO_REQUIREMENTS)[number], photo: Photo | undefined) {
    if (!photo?.url) return;
    setPhotoZoom(1);
    setPreviewPhoto({ angle: requirement.angle, title: requirement.title, url: photo.url, note: photo.note });
  }

  const movePhotoPreview = useCallback((direction: -1 | 1) => {
    if (!previewPhoto || previewablePhotos.length < 2) return;
    const current = previewablePhotos.findIndex((photo) => photo.angle === previewPhoto.angle);
    const nextIndex = (Math.max(current, 0) + direction + previewablePhotos.length) % previewablePhotos.length;
    setPhotoZoom(1);
    setPreviewPhoto(previewablePhotos[nextIndex]);
  }, [previewPhoto, previewablePhotos]);

  useEffect(() => {
    if (!previewPhoto || previewablePhotos.length < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      movePhotoPreview(event.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [movePhotoPreview, previewPhoto, previewablePhotos.length]);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/inspection`, { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) throw new Error(body?.error?.message ?? "Couldn't load the inspection.");
    const loaded = body.data as Loaded;
    const initial = loaded.report.data;
    setData({
      ...initial,
      carMake: initial.carMake || loaded.lead.make,
      carModel: initial.carModel || loaded.lead.model,
      carTrim: initial.carTrim || loaded.lead.trim || "",
      modelYear: initial.modelYear || String(loaded.lead.year),
      carSpecification: initial.carSpecification || loaded.lead.specification || "",
      mileageKm: initial.mileageKm || (loaded.lead.mileage_km ? String(loaded.lead.mileage_km) : ""),
    });
    setArrivalStatus(loaded.lead.arrival_status);
    setPhotos(loaded.photos); setCompleted(loaded.report.status === "completed"); setReady(true);
  }, [leadId]);

  useEffect(() => { void load().catch((reason: Error) => { setError(reason.message); setReady(true); }); }, [load]);

  function setField<K extends keyof InspectionReportData>(key: K, value: InspectionReportData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }
  function setCheck(section: "externalBody" | "mechanical", item: string, result: InspectionResult) {
    setData((current) => ({ ...current, [section]: { ...current[section], [item]: result } }));
  }
  function setFailureNote(item: string, note: string) { setData((current) => ({ ...current, failureNotes: { ...current.failureNotes, [item]: note } })); }

  function getCompletionIssues() {
    const issues: Array<{ section: string; message: string; fieldKeys?: string[] }> = [];
    const requiredVehicleFields: Array<[keyof InspectionReportData, string, boolean]> = [
      ["carMake", "Make", !data.carMake.trim()],
      ["carModel", "Model", !data.carModel.trim()],
      ["modelYear", "Model Year", !/^\d{4}$/.test(data.modelYear)],
      ["carSpecification", "Car Specification", !data.carSpecification.trim()],
      ["mileageKm", "Mileage", !/^\d{1,7}$/.test(data.mileageKm)],
    ];
    const missingVehicleFields = requiredVehicleFields.filter(([, , invalid]) => invalid).map(([key, label]) => [key, label] as const);
    if (missingVehicleFields.length) {
      issues.push({
        section: "vehicle",
        fieldKeys: missingVehicleFields.map(([key]) => key),
        message: `Vehicle details: complete ${missingVehicleFields.map(([, label]) => label).join(", ")}.`,
      });
    }
    const parsed = inspectionReportSchema.safeParse(data);
    if (!parsed.success) {
      const labels = new Map<string, string>([
        ["carMake", "Make"], ["carModel", "Model"], ["modelYear", "Model Year"],
        ["carSpecification", "Specification"], ["mileageKm", "Mileage"], ["productionYear", "Production Year"],
        ["numberOfKeys", "Number of Keys"], ["numberOfSeats", "Number of Seats"],
      ]);
      const fields = Array.from(new Set(parsed.error.issues.map((issue) => labels.get(String(issue.path[0])) ?? String(issue.path[0]))));
      const fieldKeys = Array.from(new Set(parsed.error.issues.map((issue) => String(issue.path[0]))));
      if (fields.length) issues.push({ section: "vehicle", fieldKeys, message: `Vehicle details: check ${fields.join(", ")}.` });
    }
    const missingExternal = EXTERNAL_BODY_ITEMS.filter((item) => !data.externalBody[item]);
    if (missingExternal.length) issues.push({ section: "external", message: `External Body Condition: select check or X for ${missingExternal.slice(0, 3).join(", ")}${missingExternal.length > 3 ? ` and ${missingExternal.length - 3} more` : ""}.` });
    const missingMechanical = MECHANICAL_ITEMS.filter((item) => !data.mechanical[item]);
    if (missingMechanical.length) issues.push({ section: "mechanical", message: `Mechanical Components: select Pass or Fail for ${missingMechanical.slice(0, 3).join(", ")}${missingMechanical.length > 3 ? ` and ${missingMechanical.length - 3} more` : ""}.` });
    const failedWithoutNote = [...EXTERNAL_BODY_ITEMS, ...MECHANICAL_ITEMS].filter((item) => (data.externalBody[item] ?? data.mechanical[item]) === "fail" && !data.failureNotes[item]?.trim());
    if (failedWithoutNote.length) issues.push({ section: "external", message: `External/Mechanical failure notes: add a reason for ${failedWithoutNote.slice(0, 3).join(", ")}${failedWithoutNote.length > 3 ? ` and ${failedWithoutNote.length - 3} more` : ""}.` });
    const tyresMissing = ([['driverFront', 'Driver front tyre'], ['driverRear', 'Driver rear tyre'], ['passengerFront', 'Passenger front tyre'], ['passengerRear', 'Passenger rear tyre']] as const).filter(([key]) => !data.tyres[key].result || !/^\d{4}$/.test(data.tyres[key].year) || (data.tyres[key].result === "fail" && !data.tyres[key].note.trim())).map(([, label]) => label);
    if (tyresMissing.length) issues.push({ section: "tyres", message: `Tyres and interior: complete ${tyresMissing.join(", ")}, including the four-digit year and any failure note.` });
    const missingPhotos = PHOTO_REQUIREMENTS.filter((requirement) => {
      const photo = photoByAngle.get(requirement.angle);
      return !photo?.url || !photo.note?.trim();
    }).map((requirement) => requirement.title);
    if (missingPhotos.length) issues.push({ section: "photos", message: `Required vehicle photos: add ${missingPhotos.slice(0, 3).join(", ")}${missingPhotos.length > 3 ? ` and ${missingPhotos.length - 3} more` : ""}.` });
    return issues;
  }

  async function save(complete = false) {
    setSaving(true); setError(null); setMessage(null);
    setHighlightedSections([]);
    setHighlightedFields([]);
    if (complete) {
      const issues = getCompletionIssues();
      if (issues.length) {
        setSaving(false);
        setHighlightedSections(Array.from(new Set(issues.map((issue) => issue.section))));
        setHighlightedFields(Array.from(new Set(issues.flatMap((issue) => issue.fieldKeys ?? []))));
        setError(issues.map((issue) => issue.message).join(" "));
        const focusTarget = document.getElementById(`inspection-field-${issues[0].fieldKeys?.[0] ?? issues[0].section}`) ?? document.getElementById(`inspection-${issues[0].section}`);
        focusTarget?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/inspection`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ report: data, complete }) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.error?.message ?? "Couldn't save the inspection.");
      setCompleted(body.data.status === "completed");
      setActivityRefreshKey((current) => current + 1);
      setMessage(complete ? "Inspection saved and lead marked as Inspected." : completed ? "Inspection changes saved." : "Draft saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't save the inspection."); }
    finally { setSaving(false); }
  }

  async function upload(angle: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return false;
    setUploading(angle); setError(null);
    try {
      if (!photoNote.trim()) throw new Error("Add a note describing this photo before uploading it.");
      if (!/^(image\/jpeg|image\/png)$/.test(file.type)) throw new Error("Use a JPG or PNG photo.");
      setUploadStage("compressing");
      setUploadProgress(5);
      const compressedFile = await compressInspectionPhoto(file);
      const form = new FormData(); form.set("angle", angle); form.set("note", photoNote.trim()); form.set("file", file);
      setUploadProgress(0);
      setUploadStage("uploading");
      form.set("file", compressedFile);
      const body = await new Promise<{ ok: true; data: { note: string; url: string } }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", `/api/admin/leads/${encodeURIComponent(leadId)}/inspection/photos`);
        request.withCredentials = true;
        request.upload.addEventListener("progress", (progressEvent) => {
          if (!progressEvent.lengthComputable) return;
          // Keep a small final portion for the server-side storage and RPC save.
          setUploadProgress(Math.min(95, Math.round((progressEvent.loaded / progressEvent.total) * 95)));
        });
        request.addEventListener("load", () => {
          let parsed: UploadPhotoResponse | null = null;
          try { parsed = JSON.parse(request.responseText) as UploadPhotoResponse; } catch { parsed = null; }
          if (request.status >= 200 && request.status < 300 && parsed?.ok && parsed.data) {
            setUploadStage("saving");
            setUploadProgress(100);
            resolve({ ok: true, data: parsed.data });
          } else {
            reject(new Error(parsed?.error?.message ?? `Couldn't upload the photo (${request.status || "network"}).`));
          }
        });
        request.addEventListener("error", () => reject(new Error("The photo upload was interrupted. Check the connection and try again.")));
        request.addEventListener("abort", () => reject(new Error("The photo upload was cancelled.")));
        request.send(form);
      });
      setPhotos((current) => [...current.filter((photo) => photo.angle !== angle), { angle, note: body.data.note, url: body.data.url }]);
      setActivityRefreshKey((current) => current + 1);
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn't upload the photo."); return false; }
    finally { setUploading(null); setUploadProgress(null); setUploadStage(null); }
  }

  async function uploadChosenPhoto(event: ChangeEvent<HTMLInputElement>) {
    const target = photoTarget;
    if (!target) return;
    if (await upload(target.angle, event)) { setPhotoTarget(null); setPhotoNote(""); }
  }

  async function returnToLead() {
    await refreshLeads();
    router.push(`/admin/leads/${encodeURIComponent(leadId)}`);
    router.refresh();
  }

  async function downloadPdf() {
    if (downloading || !completed) return;
    setDownloading(true); setDownloadProgress(null); setError(null); setMessage(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/inspection/pdf?delivery=internal`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Couldn't generate the inspection PDF (${response.status}).`);
      }
      if (response.headers.get("x-carvibe-payload") !== "inspection-pdf") {
        throw new Error("The server returned an unexpected download response. Please try again.");
      }

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const signature = bytes.length >= 5
        ? String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4])
        : "";
      if (bytes.byteLength === 0 || signature !== "%PDF-") {
        throw new Error("The generated report was empty or invalid. No file was saved; please try again.");
      }

      setDownloadProgress(100);
      const blob = new Blob([buffer], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      const responseFilename = response.headers.get("x-carvibe-filename");
      link.download = responseFilename ? decodeURIComponent(responseFilename) : inspectionReportFilename(data);
      document.body.appendChild(link); link.click(); link.remove();
      // Edge may not copy a large Blob immediately. Keep it alive long enough
      // for the browser to finish writing the file.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setMessage("Inspection PDF downloaded successfully.");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setError("The PDF took longer than two minutes to generate. Please check the connection and try again.");
      } else {
        setError(reason instanceof Error ? reason.message : "Couldn't download the inspection PDF.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setDownloading(false);
    }
  }

  if (!ready) return <Card className="p-5"><p className="text-text-muted">Loading inspection workspace…</p></Card>;
  if (error && !data.carMake) return <Card className="p-5"><p className="text-danger">{error}</p></Card>;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <button type="button" onClick={() => void returnToLead()} className="inline-flex items-center gap-2 self-start text-sm text-text-muted hover:text-gold"><ArrowLeft className="h-4 w-4" /> Back to customer record</button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-fluid-3 text-text">Vehicle Inspection</h1>
            {arrivalStatus === "arrived" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Check className="h-3.5 w-3.5" /> Customer Arrived
              </span>
            )}
          </div>
          <p className="mt-1 text-fluid--1 text-text-muted">Save a draft while checking the car. Save Inspection marks the lead as Inspected; Purchasers and Super Admin can edit it later.</p>
        </div>
        <div className="flex flex-wrap gap-2"><InspectionActivityDrawer leadId={leadId} refreshKey={activityRefreshKey} />{completed ? <Button variant="outline" disabled={downloading} loading={downloading} onClick={() => void downloadPdf()}><Download className="h-4 w-4" />{downloading ? "Preparing PDF" : "Download PDF"}</Button> : <Button variant="outline" disabled title="Save the inspection first to enable the PDF download"><Download className="h-4 w-4" /> PDF after completion</Button>}</div>
      </div>
      {error && <p className="rounded-card border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
      {message && <p className="rounded-card border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
      {downloading && <div className="rounded-card border border-gold/40 bg-gold/5 p-3" role="status"><div className="mb-2 flex items-center justify-between gap-3 text-sm text-text"><span>Generating and downloading your PDF…</span><span className="text-gold">{downloadProgress === null ? "Working" : `${downloadProgress}%`}</span></div><div className="h-2 overflow-hidden rounded-full bg-bg"><div className={`h-full rounded-full bg-gold transition-[width] duration-300 ${downloadProgress === null ? "w-2/3 animate-pulse" : ""}`} style={downloadProgress === null ? undefined : { width: `${downloadProgress}%` }} /></div></div>}
      {completed && <p className="rounded-card border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">This inspection is completed. Authorized Purchasers and Super Admin can still correct it; every save and photo replacement is recorded.</p>}

      <Card id="inspection-vehicle" className={`p-5 ${highlightedSections.includes("vehicle") ? "ring-2 ring-danger/70" : ""}`}><SectionTitle title="Vehicle and registration" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div id="inspection-field-carMake"><Select label="Make" value={data.carMake} options={makes.map((make) => ({ label: make.name, value: make.name }))} error={highlightedFields.includes("carMake") ? "Required" : undefined} onChange={(value) => setField("carMake", value)} /></div>
          <div id="inspection-field-carModel"><Select label="Model" value={data.carModel} options={selectedModels.map((model) => ({ label: model.name, value: model.name }))} error={highlightedFields.includes("carModel") ? "Required" : undefined} disabled={!data.carMake} onChange={(value) => setField("carModel", value)} /></div>
          <Select label="Trim" value={data.carTrim} options={selectedTrims.map((trim) => ({ label: trim, value: trim }))} disabled={!data.carModel} onChange={(value) => setField("carTrim", value)} />
          <div id="inspection-field-modelYear"><TextInput label="Model Year" value={data.modelYear} error={highlightedFields.includes("modelYear")} onChange={(value) => setField("modelYear", value)} /></div>
          <div id="inspection-field-carSpecification"><Select label="Car Specification" value={data.carSpecification} options={specifications.map((specification) => ({ label: specification.name, value: specification.name }))} error={highlightedFields.includes("carSpecification") ? "Required" : undefined} onChange={(value) => setField("carSpecification", value)} /></div>
          {BASIC_FIELDS.map(([key, label, type]) => <div key={key} id={`inspection-field-${key}`}><TextInput label={label} type={type} value={String(data[key] ?? "")} error={highlightedFields.includes(key)} onChange={(value) => setField(key, value as never)} /></div>)}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Choice label="First Owner" value={data.firstOwner} onChange={(value) => setField("firstOwner", value)} />
          <Choice label="Car Mortgaged" value={data.mortgaged} onChange={(value) => setField("mortgaged", value)} />
          <Choice label="Service Pack" value={data.servicePack} onChange={(value) => setField("servicePack", value)} />
          <Choice label="Service History" value={data.serviceHistory} onChange={(value) => setField("serviceHistory", value)} />
          <Choice label="Warranty" value={data.warranty} onChange={(value) => setField("warranty", value)} />
        </div>
        <TextArea label="Basic Notes" value={data.basicNotes} onChange={(value) => setField("basicNotes", value)} />
      </Card>

      <div id="inspection-external" className={highlightedSections.includes("external") ? "rounded-card ring-2 ring-danger/70" : ""}><Checklist title="External Body Condition" items={EXTERNAL_BODY_ITEMS} values={data.externalBody} notes={data.failureNotes} iconOnly onChange={(item, result) => setCheck("externalBody", item, result)} onNote={setFailureNote} /></div>
      <div id="inspection-mechanical" className={highlightedSections.includes("mechanical") ? "rounded-card ring-2 ring-danger/70" : ""}><Checklist title="Mechanical Components" items={MECHANICAL_ITEMS} values={data.mechanical} notes={data.failureNotes} onChange={(item, result) => setCheck("mechanical", item, result)} onNote={setFailureNote} /></div>
      <Card id="inspection-tyres" className={`p-5 ${highlightedSections.includes("tyres") ? "ring-2 ring-danger/70" : ""}`}><SectionTitle title="Tyres, accessories and interior" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{([['driverFront','Driver Side Front Tyre'],['driverRear','Driver Side Rear Tyre'],['passengerFront','Passenger Side Front Tyre'],['passengerRear','Passenger Side Rear Tyre']] as const).map(([key,label]) => <Tyre key={key} label={label} value={data.tyres[key]} onChange={(value) => setData((current) => ({ ...current, tyres: { ...current.tyres, [key]: value } }))} />)}</div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3"><Choice label="Spare Tyre" value={data.tyres.spareTyre} onChange={(value) => setData((current) => ({ ...current, tyres: { ...current.tyres, spareTyre: value } }))} /><Choice label="Truck Tools Available" value={data.tyres.truckToolsAvailable} onChange={(value) => setData((current) => ({ ...current, tyres: { ...current.tyres, truckToolsAvailable: value } }))} /><Choice label="Service Book" value={data.tyres.serviceBook} onChange={(value) => setData((current) => ({ ...current, tyres: { ...current.tyres, serviceBook: value } }))} /></div>
        <div className="mt-5"><Select label="Interior Seats" value={data.interiorSeatType} options={[{label:'Leather seats',value:'leather'},{label:'Fabric seats',value:'fabric'},{label:'Other',value:'other'},{label:'Unknown',value:'unknown'}]} onChange={(value) => setField("interiorSeatType", value as InspectionReportData["interiorSeatType"])} /></div><TextArea label="Interior Notes" value={data.interiorNotes} onChange={(value) => setField("interiorNotes", value)} />
      </Card>

      <Card id="inspection-photos" className={`p-5 ${highlightedSections.includes("photos") ? "ring-2 ring-danger/70" : ""}`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-text">Required vehicle photos</h2><p className="mt-1 text-xs text-text-muted">{photos.length} of {PHOTO_ANGLES.length} captured</p></div>
          <Button size="sm" variant="outline" disabled={photos.length === 0} onClick={() => setGalleryOpen(true)}><FolderOpen className="h-4 w-4" /> View photo folder</Button>
        </div>
        <p className="mb-4 text-xs text-text-muted">Select <strong className="text-text">Add photo</strong>, then choose whether to use the phone camera or upload an existing JPG/PNG. A green check appears only after the photo is stored.</p>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{PHOTO_REQUIREMENTS.map((requirement, index) => { const photo = photoByAngle.get(requirement.angle); return <li key={requirement.angle} className="flex min-h-40 flex-col justify-between gap-3 rounded-card border border-border bg-surface-2 p-4 sm:min-h-0 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-text">{index + 1}. {requirement.title}</p><p className="mt-1 max-w-md text-xs leading-5 text-text-muted">{requirement.guide}</p>{photo ? <><p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400"><Check className="h-3.5 w-3.5" /> Saved with note</p><div className="mt-2 rounded-card border border-gold/30 bg-gold/5 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Inspector note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-text">{photo.note}</p></div></> : <p className="mt-2 text-xs text-text-faint">Photo and note required</p>}</div><div className="flex shrink-0 items-center justify-end gap-2">{photo?.url && <button type="button" onClick={() => openPhotoPreview(requirement, photo)} aria-label={`Preview ${requirement.title}`} className="min-h-11 min-w-11 rounded p-2 text-text-muted hover:text-gold"><Eye className="mx-auto h-4 w-4" /></button>}<Button size="sm" variant="outline" disabled={uploading === requirement.angle} loading={uploading === requirement.angle} onClick={() => { setPhotoTarget(requirement); setPhotoNote(photo?.note ?? ""); }}>{photo ? "Replace" : "Add photo"}</Button></div></li>; })}</ul>
        <input ref={cameraInputRef} className="sr-only" type="file" accept="image/jpeg,image/png" capture="environment" disabled={!photoTarget || !photoNote.trim()} onChange={(event) => void uploadChosenPhoto(event)} />
        <input ref={uploadInputRef} className="sr-only" type="file" accept="image/jpeg,image/png" disabled={!photoTarget || !photoNote.trim()} onChange={(event) => void uploadChosenPhoto(event)} />
      </Card>
      <div className="flex flex-wrap justify-end gap-3 pb-8"><Button variant="outline" onClick={() => void save(false)} disabled={saving} loading={saving}><Save className="h-4 w-4" /> {completed ? "Save changes" : "Save draft"}</Button>{completed ? <Button variant="outline" disabled={downloading} loading={downloading} onClick={() => void downloadPdf()}><Download className="h-4 w-4" />{downloading ? "Preparing PDF" : "Download PDF"}</Button> : <><Button variant="outline" disabled title="Save the inspection first to enable the PDF download"><Download className="h-4 w-4" /> Download PDF</Button><Button onClick={() => void save(true)} disabled={saving} loading={saving}><Check className="h-4 w-4" /> Save inspection</Button></>}</div>
      <Dialog open={photoTarget !== null} onClose={() => { if (!uploading) setPhotoTarget(null); }} title={photoTarget ? `Add photo: ${photoTarget.title}` : "Add photo"}>
        {photoTarget && <div className="space-y-4"><p className="rounded-card border border-gold/30 bg-gold/5 p-3 text-sm leading-6 text-text-muted"><span className="font-medium text-text">How to take it:</span> {photoTarget.guide}</p><label className="block text-xs font-medium uppercase tracking-wide text-text-muted">Required photo note<textarea value={photoNote} onChange={(event) => setPhotoNote(event.target.value)} maxLength={600} rows={3} disabled={Boolean(uploading)} placeholder="Example: Front bumper has a small scratch on the lower-left side." className="mt-2 w-full resize-y rounded-card border border-border bg-bg p-3 text-sm normal-case tracking-normal text-text outline-none focus:border-gold disabled:opacity-60" /></label><p className="text-xs text-text-muted">Photos are automatically compressed to JPG and kept under 1 MB before upload.</p>{uploading && <div className="rounded-card border border-gold/35 bg-gold/5 p-3" role="status" aria-live="polite"><div className="flex items-center justify-between gap-3 text-xs"><span className="text-text">{uploadStage === "compressing" ? "Compressing photo..." : uploadStage === "saving" ? "Saving photo securely..." : "Uploading compressed photo..."}</span><span className="tabular-nums text-gold">{uploadProgress ?? 0}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-bg" aria-hidden="true"><div className="h-full rounded-full bg-gold transition-[width] duration-200" style={{ width: `${uploadProgress ?? 0}%` }} /></div><p className="mt-2 text-xs text-text-muted">Please keep this window open until the photo is saved.</p></div>}<div className="grid gap-3 sm:grid-cols-2"><Button disabled={!photoNote.trim() || Boolean(uploading)} onClick={() => cameraInputRef.current?.click()}><Camera className="h-4 w-4" /> Use phone camera</Button><Button variant="outline" disabled={!photoNote.trim() || Boolean(uploading)} onClick={() => uploadInputRef.current?.click()}><Upload className="h-4 w-4" /> Upload file</Button></div></div>}
      </Dialog>
      <Dialog open={galleryOpen} onClose={() => setGalleryOpen(false)} title="Photo folder" className="max-w-5xl">
        <p className="mb-4 text-sm text-text-muted">All saved inspection photos are together here. Select a photo to open the full-size image.</p>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PHOTO_REQUIREMENTS.map((requirement, index) => {
              const photo = photoByAngle.get(requirement.angle);
              return <li key={requirement.angle} className="overflow-hidden rounded-card border border-border bg-surface-2">
                {photo?.url ? <button type="button" onClick={() => { setGalleryOpen(false); openPhotoPreview(requirement, photo); }} aria-label={`Preview ${requirement.title}`} className="group relative block h-40 w-full bg-black text-left"><img src={photo.url} alt={requirement.title} className="h-40 w-full object-contain" /><span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Preview photo</span></button> : <div className="flex h-40 items-center justify-center bg-bg px-4 text-center text-xs text-text-faint">Not added yet</div>}
                <div className="flex items-start gap-2 p-3"><span className="text-xs text-text-faint">{index + 1}.</span><div className="min-w-0"><p className="text-sm font-medium text-text">{requirement.title}</p><p className={`mt-1 text-xs ${photo ? "text-emerald-400" : "text-text-faint"}`}>{photo ? "Saved" : "Missing"}</p>{photo?.note && <p className="mt-1 line-clamp-3 text-xs leading-5 text-text-muted">{photo.note}</p>}</div></div>
              </li>;
            })}
          </ul>
        </div>
      </Dialog>
      <Dialog open={previewPhoto !== null} onClose={() => setPreviewPhoto(null)} title={previewPhoto ? `${Math.max(previewIndex, 0) + 1} of ${previewablePhotos.length} captured — ${previewPhoto.title}` : "Photo preview"} className="max-w-4xl">
        {previewPhoto && <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-text-muted">Zoom: {Math.round(photoZoom * 100)}%</p><div className="flex items-center gap-2"><Button size="sm" variant="outline" aria-label="Zoom out" title="Zoom out" disabled={photoZoom <= 1} onClick={() => setPhotoZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))))}><ZoomOut className="h-4 w-4" /></Button><Button size="sm" variant="outline" aria-label="Reset zoom" title="Reset zoom" disabled={photoZoom === 1} onClick={() => setPhotoZoom(1)}><RotateCcw className="h-4 w-4" /></Button><Button size="sm" variant="outline" aria-label="Zoom in" title="Zoom in" disabled={photoZoom >= 3} onClick={() => setPhotoZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))}><ZoomIn className="h-4 w-4" /></Button></div></div><div className="flex min-h-56 max-h-[65vh] w-full touch-pan-y items-center justify-center overflow-auto rounded-card bg-black p-2" onWheel={(event) => { event.preventDefault(); setPhotoZoom((current) => Math.min(3, Math.max(1, Number((current + (event.deltaY < 0 ? 0.1 : -0.1)).toFixed(2))))); }} onTouchStart={(event) => { photoSwipeStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const startX = photoSwipeStartX.current; const endX = event.changedTouches[0]?.clientX; photoSwipeStartX.current = null; if (startX === null || endX === undefined || Math.abs(endX - startX) < 50) return; movePhotoPreview(endX < startX ? 1 : -1); }} onTouchCancel={() => { photoSwipeStartX.current = null; }}><img src={previewPhoto.url} alt={previewPhoto.title} className="max-h-[62vh] max-w-full object-contain transition-transform duration-150" style={{ transform: `scale(${photoZoom})`, transformOrigin: "center center" }} onError={() => setPreviewPhoto((current) => current ? { ...current, failed: true } : current)} />{previewPhoto.failed && <p className="absolute rounded-card bg-black/80 p-3 text-sm text-danger">This photo could not be loaded. Please refresh the inspection page and try again.</p>}</div><div className="rounded-card border border-gold/30 bg-gold/5 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Inspector note</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-text">{previewPhoto.note || "No note recorded."}</p></div><div className="flex items-center justify-between gap-3"><Button size="sm" variant="outline" disabled={previewablePhotos.length < 2} onClick={() => movePhotoPreview(-1)}><ChevronLeft className="h-4 w-4" /> Previous</Button><p className="text-center text-xs text-text-muted">Use the keyboard arrows, swipe, or Previous and Next to review saved photos.</p><Button size="sm" variant="outline" disabled={previewablePhotos.length < 2} onClick={() => movePhotoPreview(1)}>Next <ChevronRight className="h-4 w-4" /></Button></div></div>}
      </Dialog>
    </div>
  );
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) { return <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold text-text">{title}</h2>{detail && <span className="text-xs text-text-muted">{detail}</span>}</div>; }
function TextInput({ label, value, type = "text", disabled = false, error, onChange }: { label:string; value:string; type?:string; disabled?:boolean; error?:boolean; onChange:(value:string)=>void }) { return <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">{label}<input type={type} value={value} disabled={disabled} onChange={(event)=>onChange(event.target.value)} className={`h-10 rounded-card border bg-bg px-3 text-sm normal-case tracking-normal text-text outline-none focus:border-gold disabled:opacity-60 ${error ? "border-danger ring-2 ring-danger/25" : "border-border"}`} /></label>; }
function TextArea({ label,value,disabled=false,onChange}:{label:string;value:string;disabled?:boolean;onChange:(value:string)=>void}) { return <label className="mt-5 flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">{label}<textarea rows={3} value={value} disabled={disabled} onChange={(event)=>onChange(event.target.value)} className="resize-y rounded-card border border-border bg-bg p-3 text-sm normal-case tracking-normal text-text outline-none focus:border-gold disabled:opacity-60" /></label>; }
function Choice({ label,value,disabled=false,onChange}:{label:string;value:Choice;disabled?:boolean;onChange:(value:Choice)=>void}) { return <div><p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p><div className="flex gap-1">{choiceOptions().map((option)=><button key={option} type="button" disabled={disabled} onClick={()=>onChange(option)} className={`min-h-9 flex-1 rounded-card border px-2 text-xs capitalize ${value===option?'border-gold bg-gold/10 text-gold':'border-border text-text-muted'} disabled:opacity-60`}>{option}</button>)}</div></div>; }
function Checklist({title,items,values,notes,disabled=false,iconOnly,onChange,onNote}:{title:string;items:readonly string[];values:Record<string,InspectionResult|undefined>;notes:Record<string,string>;disabled?:boolean;iconOnly?:boolean;onChange:(item:string,result:InspectionResult)=>void;onNote:(item:string,note:string)=>void}) { return <Card className="p-5"><SectionTitle title={title} /><div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{items.map((item)=><div key={item} className="rounded-card border border-border bg-surface-2 p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm text-text">{item}</span><div className="flex gap-1">{(['pass','fail'] as const).map((result)=><button key={result} type="button" disabled={disabled} title={iconOnly ? (result === 'pass' ? 'Pass' : 'Fail') : undefined} aria-label={`${item}: ${iconOnly ? (result === 'pass' ? 'Pass' : 'Fail') : result}`} onClick={()=>onChange(item,result)} className={`flex h-8 items-center justify-center rounded-card border ${iconOnly ? 'w-9 px-0' : 'px-3'} text-xs capitalize ${values[item]===result?(result==='pass'?'border-emerald-500 bg-emerald-500/10 text-emerald-300':'border-danger bg-danger/10 text-danger'):'border-border text-text-muted'} disabled:opacity-60`}>{iconOnly ? (result === 'pass' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />) : result}</button>)}</div></div>{values[item]==='fail'&&<input value={notes[item]??''} disabled={disabled} onChange={(event)=>onNote(item,event.target.value)} placeholder="Reason or note required for failure" className="mt-3 h-9 w-full rounded-card border border-danger/40 bg-bg px-3 text-xs text-text outline-none focus:border-danger" />}</div>)}</div></Card>; }
function Tyre({label,value,disabled=false,onChange}:{label:string;value:InspectionReportData['tyres']['driverFront'];disabled?:boolean;onChange:(value:InspectionReportData['tyres']['driverFront'])=>void}) { return <div className="rounded-card border border-border bg-surface-2 p-3"><p className="text-sm text-text">{label}</p><div className="mt-3 grid grid-cols-[1fr_5rem] gap-2"><div className="flex gap-1">{(['pass','fail'] as const).map((result)=><button key={result} type="button" disabled={disabled} onClick={()=>onChange({...value,result})} className={`h-9 flex-1 rounded-card border text-xs capitalize ${value.result===result?(result==='pass'?'border-emerald-500 text-emerald-300':'border-danger text-danger'):'border-border text-text-muted'} disabled:opacity-60`}>{result}</button>)}</div><input value={value.year} disabled={disabled} onChange={(event)=>onChange({...value,year:event.target.value})} placeholder="Year" maxLength={4} className="h-9 rounded-card border border-border bg-bg px-2 text-xs text-text outline-none focus:border-gold" /></div>{value.result==='fail'&&<input value={value.note} disabled={disabled} onChange={(event)=>onChange({...value,note:event.target.value})} placeholder="Failure reason or note" className="mt-2 h-9 w-full rounded-card border border-danger/40 bg-bg px-3 text-xs text-text outline-none focus:border-danger" />}</div>; }
