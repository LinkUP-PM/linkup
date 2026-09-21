declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
  }

  function pdf(data: Buffer): Promise<PdfParseResult>;
  export default pdf;
}
