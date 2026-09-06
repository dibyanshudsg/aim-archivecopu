type PdfJsWorkerHost = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
};

// Versioned public asset copied from the installed pdfjs-dist package. Keeping
// the version in the URL allows a long immutable cache without stale upgrades.
const PDF_WORKER_SRC = '/pdf.worker-4.8.69.min.mjs';

export function configurePdfWorker(pdfjsLib: PdfJsWorkerHost) {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== PDF_WORKER_SRC) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  }
}
