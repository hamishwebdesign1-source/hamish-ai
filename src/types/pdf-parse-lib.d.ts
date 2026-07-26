declare module "pdf-parse/lib/pdf-parse.js" {
  import type PDFParse from "pdf-parse";
  const parse: typeof PDFParse;
  export default parse;
}
