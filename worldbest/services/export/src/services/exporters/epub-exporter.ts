import * as fs from 'fs/promises';
import * as path from 'path';
import JSZip from 'jszip';
import { BaseExporter } from './base-exporter';
import { FileOutput } from '../../types';
import { config } from '../../config';
import { v4 as uuidv4 } from 'uuid';

export class EPubExporter extends BaseExporter {
  private zip: JSZip;
  private bookId: string;

  constructor(projectData: any, options: any) {
    super(projectData, options);
    this.zip = new JSZip();
    this.bookId = uuidv4();
  }

  async export(): Promise<FileOutput> {
    // Create ePub structure
    await this.createMimeType();
    await this.createContainer();
    await this.createContent();
    
    // Generate the ePub file
    const epubBuffer = await this.zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    const filename = this.options.filename || this.generateFilename('epub');
    
    return {
      buffer: epubBuffer,
      filename,
      mimeType: 'application/epub+zip',
      size: epubBuffer.length,
    };
  }

  private async createMimeType(): Promise<void> {
    this.zip.file('mimetype', 'application/epub+zip');
  }

  private async createContainer(): Promise<void> {
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    
    this.zip.folder('META-INF')?.file('container.xml', containerXml);
  }

  private async createContent(): Promise<void> {
    const oebpsFolder = this.zip.folder('OEBPS');
    if (!oebpsFolder) return;

    // Create content.opf (package document)
    const contentOpf = this.generateContentOpf();
    oebpsFolder.file('content.opf', contentOpf);

    // Create toc.ncx (navigation)
    const tocNcx = this.generateTocNcx();
    oebpsFolder.file('toc.ncx', tocNcx);

    // Create stylesheet
    const stylesheet = this.generateStylesheet();
    oebpsFolder.file('styles.css', stylesheet);

    // Create title page
    if (this.options.includeCoverPage) {
      const titlePage = this.generateTitlePage();
      oebpsFolder.file('title.xhtml', titlePage);
    }

    // Create table of contents page
    if (this.options.includeTableOfContents) {
      const tocPage = this.generateTocPage();
      oebpsFolder.file('toc.xhtml', tocPage);
    }

    // Create content pages
    await this.createContentPages(oebpsFolder);

    // Create appendix pages
    if (this.shouldIncludeAppendices()) {
      await this.createAppendixPages(oebpsFolder);
    }
  }

  private generateContentOpf(): string {
    const metadata = this.generateMetadata();
    const epubOptions = this.options.epubOptions || {};
    
    let manifest = '';
    let spine = '';
    let itemId = 1;

    // Add CSS
    manifest += `    <item id="css" href="styles.css" media-type="text/css"/>\n`;

    // Add title page
    if (this.options.includeCoverPage) {
      manifest += `    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>\n`;
      spine += `    <itemref idref="title"/>\n`;
    }

    // Add table of contents
    if (this.options.includeTableOfContents) {
      manifest += `    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>\n`;
      spine += `    <itemref idref="toc"/>\n`;
    }

    // Add content pages
    this.projectData.books.forEach((bookData: any, bookIndex: number) => {
      bookData.chapters.forEach((chapterData: any, chapterIndex: number) => {
        const id = `chapter-${bookIndex}-${chapterIndex}`;
        const filename = `${id}.xhtml`;
        manifest += `    <item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>\n`;
        spine += `    <itemref idref="${id}"/>\n`;
      });
    });

    // Add appendices
    if (this.shouldIncludeAppendices()) {
      if (this.options.includeCharacterProfiles) {
        manifest += `    <item id="characters" href="characters.xhtml" media-type="application/xhtml+xml"/>\n`;
        spine += `    <itemref idref="characters"/>\n`;
      }
      if (this.options.includeWorldbuilding) {
        manifest += `    <item id="worldbuilding" href="worldbuilding.xhtml" media-type="application/xhtml+xml"/>\n`;
        spine += `    <itemref idref="worldbuilding"/>\n`;
      }
      if (this.options.includeTimeline) {
        manifest += `    <item id="timeline" href="timeline.xhtml" media-type="application/xhtml+xml"/>\n`;
        spine += `    <itemref idref="timeline"/>\n`;
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${this.bookId}</dc:identifier>
    <dc:title>${this.escapeXml(metadata.title)}</dc:title>
    <dc:creator>${this.escapeXml(metadata.author)}</dc:creator>
    <dc:language>${epubOptions.language || config.epub.language}</dc:language>
    <dc:publisher>${epubOptions.publisher || config.epub.publisher}</dc:publisher>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    ${metadata.description ? `<dc:description>${this.escapeXml(metadata.description)}</dc:description>` : ''}
    <dc:subject>${this.escapeXml(metadata.genre)}</dc:subject>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifest}  </manifest>
  <spine toc="ncx">
${spine}  </spine>
</package>`;
  }

  private generateTocNcx(): string {
    let navPoints = '';
    let playOrder = 1;

    if (this.options.includeCoverPage) {
      navPoints += `    <navPoint id="title" playOrder="${playOrder++}">
      <navLabel><text>Title Page</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>\n`;
    }

    if (this.options.includeTableOfContents) {
      navPoints += `    <navPoint id="toc" playOrder="${playOrder++}">
      <navLabel><text>Table of Contents</text></navLabel>
      <content src="toc.xhtml"/>
    </navPoint>\n`;
    }

    this.projectData.books.forEach((bookData: any, bookIndex: number) => {
      navPoints += `    <navPoint id="book-${bookIndex}" playOrder="${playOrder++}">
      <navLabel><text>${this.escapeXml(bookData.book.title)}</text></navLabel>
      <content src="chapter-${bookIndex}-0.xhtml"/>
`;
      
      bookData.chapters.forEach((chapterData: any, chapterIndex: number) => {
        navPoints += `      <navPoint id="chapter-${bookIndex}-${chapterIndex}" playOrder="${playOrder++}">
        <navLabel><text>Chapter ${chapterData.chapter.number}: ${this.escapeXml(chapterData.chapter.title)}</text></navLabel>
        <content src="chapter-${bookIndex}-${chapterIndex}.xhtml"/>
      </navPoint>\n`;
      });
      
      navPoints += `    </navPoint>\n`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <head>
    <meta name="dtb:uid" content="${this.bookId}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${this.escapeXml(this.projectData.project.title)}</text>
  </docTitle>
  <navMap>
${navPoints}  </navMap>
</ncx>`;
  }

  private generateStylesheet(): string {
    const epubOptions = this.options.epubOptions || {};
    
    return epubOptions.customCSS || config.epub.css;
  }

  private generateTitlePage(): string {
    const metadata = this.generateMetadata();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Title Page</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="title-page">
    <h1 class="title">${this.escapeXml(metadata.title)}</h1>
    <h2 class="author">by ${this.escapeXml(metadata.author)}</h2>
    ${metadata.description ? `<p class="description">${this.escapeXml(metadata.description)}</p>` : ''}
    <div class="metadata">
      <p><strong>Genre:</strong> ${this.escapeXml(metadata.genre)}</p>
      ${metadata.timePeriod ? `<p><strong>Time Period:</strong> ${this.escapeXml(metadata.timePeriod)}</p>` : ''}
      ${metadata.targetAudience ? `<p><strong>Target Audience:</strong> ${this.escapeXml(metadata.targetAudience)}</p>` : ''}
    </div>
  </div>
</body>
</html>`;
  }

  private generateTocPage(): string {
    let tocContent = '';
    
    this.projectData.books.forEach((bookData: any, bookIndex: number) => {
      tocContent += `    <h2><a href="chapter-${bookIndex}-0.xhtml">${this.escapeXml(bookData.book.title)}</a></h2>\n`;
      tocContent += `    <ul>\n`;
      
      bookData.chapters.forEach((chapterData: any, chapterIndex: number) => {
        tocContent += `      <li><a href="chapter-${bookIndex}-${chapterIndex}.xhtml">Chapter ${chapterData.chapter.number}: ${this.escapeXml(chapterData.chapter.title)}</a></li>\n`;
      });
      
      tocContent += `    </ul>\n`;
    });
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="toc">
    <h1>Table of Contents</h1>
${tocContent}  </div>
</body>
</html>`;
  }

  private async createContentPages(oebpsFolder: JSZip): Promise<void> {
    this.projectData.books.forEach((bookData: any, bookIndex: number) => {
      bookData.chapters.forEach((chapterData: any, chapterIndex: number) => {
        const filename = `chapter-${bookIndex}-${chapterIndex}.xhtml`;
        const content = this.generateChapterPage(bookData, chapterData, chapterIndex);
        oebpsFolder.file(filename, content);
      });
    });
  }

  private generateChapterPage(bookData: any, chapterData: any, chapterIndex: number): string {
    let content = '';
    
    // Chapter title
    content += `    <h1>Chapter ${chapterData.chapter.number}: ${this.escapeXml(chapterData.chapter.title)}</h1>\n`;
    
    if (chapterData.chapter.summary) {
      content += `    <p class="chapter-summary"><em>${this.escapeXml(chapterData.chapter.summary)}</em></p>\n`;
    }
    
    // Scenes
    chapterData.scenes.forEach((sceneData: any, sceneIndex: number) => {
      if (this.options.sceneBreaks && sceneIndex > 0) {
        content += `    <div class="scene-break">* * *</div>\n`;
      }
      
      if (sceneData.textVersions.length > 0) {
        const sceneContent = this.formatTextForXHTML(sceneData.textVersions[0].content);
        content += sceneContent;
      }
    });
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chapter ${chapterData.chapter.number}: ${this.escapeXml(chapterData.chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body class="chapter">
${content}</body>
</html>`;
  }

  private async createAppendixPages(oebpsFolder: JSZip): Promise<void> {
    // Character profiles
    if (this.options.includeCharacterProfiles && this.projectData.characters.length > 0) {
      const content = this.generateCharacterAppendix();
      oebpsFolder.file('characters.xhtml', content);
    }
    
    // Worldbuilding
    if (this.options.includeWorldbuilding) {
      const content = this.generateWorldbuildingAppendix();
      oebpsFolder.file('worldbuilding.xhtml', content);
    }
    
    // Timeline
    if (this.options.includeTimeline && this.projectData.timelines.length > 0) {
      const content = this.generateTimelineAppendix();
      oebpsFolder.file('timeline.xhtml', content);
    }
  }

  private generateCharacterAppendix(): string {
    let content = '    <h1>Character Profiles</h1>\n';
    
    this.projectData.characters.forEach((character: any) => {
      content += `    <div class="character-profile">\n`;
      content += `      <h2>${this.escapeXml(character.name)}</h2>\n`;
      
      if (character.aliases?.length) {
        content += `      <p><strong>Aliases:</strong> ${character.aliases.map((alias: string) => this.escapeXml(alias)).join(', ')}</p>\n`;
      }
      
      if (character.age) {
        content += `      <p><strong>Age:</strong> ${character.age}</p>\n`;
      }
      
      if (character.gender) {
        content += `      <p><strong>Gender:</strong> ${this.escapeXml(character.gender)}</p>\n`;
      }
      
      if (character.backstory) {
        content += `      <div class="backstory">\n`;
        content += `        <h3>Backstory</h3>\n`;
        content += `        <p>${this.escapeXml(character.backstory)}</p>\n`;
        content += `      </div>\n`;
      }
      
      content += `    </div>\n`;
    });
    
    return this.wrapInXHTML('Character Profiles', content);
  }

  private generateWorldbuildingAppendix(): string {
    let content = '    <h1>Worldbuilding</h1>\n';
    
    // Locations
    if (this.projectData.locations.length > 0) {
      content += '    <h2>Locations</h2>\n';
      this.projectData.locations.forEach((location: any) => {
        content += `    <div class="location">\n`;
        content += `      <h3>${this.escapeXml(location.name)}</h3>\n`;
        
        if (location.region) {
          content += `      <p><strong>Region:</strong> ${this.escapeXml(location.region)}</p>\n`;
        }
        
        if (location.description) {
          content += `      <p>${this.escapeXml(location.description)}</p>\n`;
        }
        
        content += `    </div>\n`;
      });
    }
    
    // Cultures
    if (this.projectData.cultures.length > 0) {
      content += '    <h2>Cultures</h2>\n';
      this.projectData.cultures.forEach((culture: any) => {
        content += `    <div class="culture">\n`;
        content += `      <h3>${this.escapeXml(culture.name)}</h3>\n`;
        
        if (culture.government) {
          content += `      <p><strong>Government:</strong> ${this.escapeXml(culture.government)}</p>\n`;
        }
        
        if (culture.religion) {
          content += `      <p><strong>Religion:</strong> ${this.escapeXml(culture.religion)}</p>\n`;
        }
        
        content += `    </div>\n`;
      });
    }
    
    return this.wrapInXHTML('Worldbuilding', content);
  }

  private generateTimelineAppendix(): string {
    let content = '    <h1>Timeline</h1>\n';
    
    this.projectData.timelines.forEach((timeline: any) => {
      content += `    <h2>${this.escapeXml(timeline.name)}</h2>\n`;
      
      if (timeline.events?.length) {
        content += '    <div class="timeline-events">\n';
        timeline.events.forEach((event: any) => {
          content += `      <div class="timeline-event">\n`;
          content += `        <h3>${this.escapeXml(event.date)}: ${this.escapeXml(event.title)}</h3>\n`;
          content += `        <p>${this.escapeXml(event.description)}</p>\n`;
          content += `      </div>\n`;
        });
        content += '    </div>\n';
      }
    });
    
    return this.wrapInXHTML('Timeline', content);
  }

  private wrapInXHTML(title: string, content: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${content}</body>
</html>`;
  }

  private formatTextForXHTML(text: string): string {
    if (!text) return '';
    
    // Format text and escape for XHTML
    const formatted = this.formatText(text);
    const escaped = this.escapeXml(formatted);
    
    // Convert paragraphs
    const paragraphs = escaped.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map(p => `    <p>${p.trim()}</p>\n`).join('');
  }

  private escapeXml(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private shouldIncludeAppendices(): boolean {
    return this.options.includeCharacterProfiles || 
           this.options.includeWorldbuilding || 
           this.options.includeTimeline;
  }
}