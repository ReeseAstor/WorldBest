import { ExportOptions, ProjectContent } from '../../types/export.types.js';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { promises as fs } from 'fs';

export class DOCXProcessor {
  async process(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    const doc = await this.createDocument(content, options);
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);

    return { filePath: outputPath };
  }

  async generatePreview(
    content: ProjectContent,
    options: ExportOptions,
    outputPath: string
  ): Promise<{ filePath: string }> {
    const previewContent = {
      ...content,
      chapters: content.chapters.slice(0, 2)
    };

    return this.process(previewContent, options, outputPath);
  }

  private async createDocument(content: ProjectContent, options: ExportOptions): Promise<Document> {
    const sections = [];

    // Title page
    const titlePageChildren = this.createTitlePage(content, options);
    
    // Table of contents (if requested)
    let tocChildren = [];
    if (options.includeTOC) {
      tocChildren = this.createTableOfContents(content.chapters);
    }

    // Chapters
    const chapterChildren = [];
    for (const chapter of content.chapters) {
      const chapterParagraphs = this.createChapter(chapter, options);
      chapterChildren.push(...chapterParagraphs);
    }

    const doc = new Document({
      creator: options.author || content.author,
      title: options.title || content.title,
      description: options.description || content.description,
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: this.convertInchesToTwips(options.margins?.top || 1),
                right: this.convertInchesToTwips(options.margins?.right || 1),
                bottom: this.convertInchesToTwips(options.margins?.bottom || 1),
                left: this.convertInchesToTwips(options.margins?.left || 1),
              },
            },
          },
          headers: options.header ? {
            default: {
              options: {},
              children: [
                new Paragraph({
                  children: [new TextRun(options.header)],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            },
          } : undefined,
          footers: options.footer ? {
            default: {
              options: {},
              children: [
                new Paragraph({
                  children: [new TextRun(options.footer)],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            },
          } : undefined,
          children: [
            ...titlePageChildren,
            ...tocChildren,
            ...chapterChildren,
          ],
        },
      ],
    });

    return doc;
  }

  private createTitlePage(content: ProjectContent, options: ExportOptions): Paragraph[] {
    const fontSize = (options.fontSize || 12) * 2;
    
    return [
      // Title
      new Paragraph({
        children: [
          new TextRun({
            text: content.title,
            bold: true,
            size: fontSize * 2,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000, after: 1000 },
      }),
      
      // Author
      new Paragraph({
        children: [
          new TextRun({
            text: content.author,
            size: Math.round(fontSize * 1.2),
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 500 },
      }),
      
      // Description
      ...(content.description ? [
        new Paragraph({
          children: [
            new TextRun({
              text: content.description,
              italics: true,
              size: fontSize,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1000 },
        }),
      ] : []),
      
      // Page break
      new Paragraph({
        children: [],
        pageBreakBefore: true,
      }),
    ];
  }

  private createTableOfContents(chapters: any[]): Paragraph[] {
    const tocParagraphs = [
      new Paragraph({
        children: [
          new TextRun({
            text: "Table of Contents",
            bold: true,
            size: 32,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1000 },
        heading: HeadingLevel.HEADING_1,
      }),
    ];

    chapters.forEach((chapter, index) => {
      tocParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Chapter ${index + 1}: ${chapter.title}`,
              size: 24,
            }),
            new TextRun({
              text: `\t${index + 1}`,
              size: 24,
            }),
          ],
          spacing: { after: 200 },
          tabStops: [
            {
              type: 'right',
              position: 8000,
              leader: 'dot',
            },
          ],
        })
      );
    });

    // Page break after TOC
    tocParagraphs.push(
      new Paragraph({
        children: [],
        pageBreakBefore: true,
      })
    );

    return tocParagraphs;
  }

  private createChapter(chapter: any, options: ExportOptions): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const fontSize = (options.fontSize || 12) * 2;

    // Chapter title
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: chapter.title,
            bold: true,
            size: Math.round(fontSize * 1.5),
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 400 },
        border: {
          bottom: {
            color: "000000",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      })
    );

    // Chapter metadata (if requested)
    if (options.includeMetadata && chapter.metadata) {
      const metadataParagraphs = this.createMetadataParagraphs(chapter.metadata, fontSize);
      paragraphs.push(...metadataParagraphs);
    }

    // Chapter content
    const contentParagraphs = this.parseContent(chapter.content, options);
    paragraphs.push(...contentParagraphs);

    // Chapter break (if requested)
    if (options.chapterBreaks) {
      paragraphs.push(
        new Paragraph({
          children: [],
          pageBreakBefore: true,
        })
      );
    }

    return paragraphs;
  }

  private createMetadataParagraphs(metadata: Record<string, any>, fontSize: number): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Chapter Information",
            bold: true,
            size: Math.round(fontSize * 1.1),
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    Object.entries(metadata).forEach(([key, value]) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${key}: `,
              bold: true,
              size: fontSize,
            }),
            new TextRun({
              text: String(value),
              size: fontSize,
            }),
          ],
          spacing: { after: 100 },
        })
      );
    });

    return paragraphs;
  }

  private parseContent(content: string, options: ExportOptions): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const fontSize = (options.fontSize || 12) * 2;
    const fontFamily = options.fontFamily || 'Times New Roman';

    // Split content into paragraphs
    const textParagraphs = content.split('\n\n').filter(p => p.trim().length > 0);

    textParagraphs.forEach(paragraphText => {
      const runs = this.parseTextRuns(paragraphText.trim(), fontSize, fontFamily);
      
      paragraphs.push(
        new Paragraph({
          children: runs,
          spacing: { 
            after: 240,
            line: Math.round(240 * (options.lineHeight || 1.6)),
            lineRule: 'exact'
          },
          alignment: AlignmentType.JUSTIFIED,
          indent: {
            firstLine: 720, // 0.5 inch paragraph indent
          },
        })
      );
    });

    return paragraphs;
  }

  private parseTextRuns(text: string, fontSize: number, fontFamily: string): TextRun[] {
    const runs: TextRun[] = [];
    
    // Simple markdown parsing for bold and italic
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/);
    
    parts.forEach(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        runs.push(new TextRun({
          text: part.slice(2, -2),
          bold: true,
          size: fontSize,
          font: fontFamily,
        }));
      } else if (part.startsWith('*') && part.endsWith('*')) {
        // Italic text
        runs.push(new TextRun({
          text: part.slice(1, -1),
          italics: true,
          size: fontSize,
          font: fontFamily,
        }));
      } else if (part.trim().length > 0) {
        // Normal text
        runs.push(new TextRun({
          text: part,
          size: fontSize,
          font: fontFamily,
        }));
      }
    });

    return runs;
  }

  private convertInchesToTwips(inches: number): number {
    return Math.round(inches * 1440); // 1 inch = 1440 twips
  }
}