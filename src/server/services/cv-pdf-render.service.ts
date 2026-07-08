import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { readStoredFileUrlToBuffer } from "@/lib/stored-file";

let workerReady = false;

function ensurePdfWorker() {
  if (workerReady) return;
  pdfjs.GlobalWorkerOptions.workerSrc = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "build",
    "pdf.worker.min.mjs",
  );
  workerReady = true;
}

async function loadPdf(url: string) {
  const buffer = await readStoredFileUrlToBuffer(url);
  if (!buffer) return null;
  return pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
}

async function renderPageToPng(
  pageNum: number,
  maxWidth: number,
  url: string,
): Promise<Buffer | null> {
  const pdf = await loadPdf(url);
  if (!pdf || pageNum < 1 || pageNum > pdf.numPages) return null;

  const page = await pdf.getPage(pageNum);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = maxWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(
    Math.floor(viewport.width),
    Math.floor(viewport.height),
  );
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
    canvas: canvas as unknown as HTMLCanvasElement,
  }).promise;

  return canvas.toBuffer("image/png");
}

export async function renderStoredPdfAsPngPages(
  url: string,
  maxWidth = 1100,
): Promise<Buffer[]> {
  ensurePdfWorker();

  const pdf = await loadPdf(url);
  if (!pdf) return [];

  const pages: Buffer[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(
      Math.floor(viewport.width),
      Math.floor(viewport.height),
    );
    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;

    pages.push(canvas.toBuffer("image/png"));
  }
  return pages;
}

export async function getStoredPdfPageCount(url: string): Promise<number> {
  ensurePdfWorker();
  const pdf = await loadPdf(url);
  return pdf?.numPages ?? 0;
}

export async function renderStoredPdfPageAsPng(
  url: string,
  pageNum: number,
  maxWidth = 1100,
): Promise<Buffer | null> {
  ensurePdfWorker();
  return renderPageToPng(pageNum, maxWidth, url);
}
