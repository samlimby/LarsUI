import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export async function renderPdfThumbnail(file: File): Promise<string> {
  const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })

  try {
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(1)
    const pageSize = page.getViewport({ scale: 1 })
    const scale = Math.min(76 / pageSize.width, 256 / pageSize.height)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    await page.render({ canvas, viewport }).promise
    return canvas.toDataURL('image/png')
  } finally {
    await loadingTask.destroy()
  }
}
