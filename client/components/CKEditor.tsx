/// <reference types="vite/client" />
import React, { useEffect, useRef, useState, FC } from 'react';
import './CKEditor.css';

interface CKEditorProps {
    value: string;
    onChange: (data: string) => void;
    placeholder?: string;
    config?: any;
    disabled?: boolean;
}

const CK_SCRIPT_URL = 'https://cdn.ckeditor.com/ckeditor5/47.2.0/ckeditor5.umd.js';
const CK_PREMIUM_SCRIPT_URL = 'https://cdn.ckeditor.com/ckeditor5-premium-features/47.2.0/ckeditor5-premium-features.umd.js';
const CK_CSS_URL = 'https://cdn.ckeditor.com/ckeditor5/47.2.0/ckeditor5.css';
const CK_PREMIUM_CSS_URL = 'https://cdn.ckeditor.com/ckeditor5-premium-features/47.2.0/ckeditor5-premium-features.css';
const CKBOX_SCRIPT_URL = 'https://cdn.ckbox.io/ckbox/2.9.2/ckbox.js';

const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;

        if (existingScript) {
            // If script tag exists but hasn't loaded, wait for it
            if ((window as any).CKEDITOR && src.includes('ckeditor5.umd.js')) {
                resolve();
                return;
            }
            if ((window as any).CKEDITOR_PREMIUM_FEATURES && src.includes('ckeditor5-premium-features.umd.js')) {
                resolve();
                return;
            }

            // Fallback for when script tag exists but libraries aren't ready yet
            const handleLoad = () => {
                existingScript.removeEventListener('load', handleLoad);
                existingScript.removeEventListener('error', handleError);
                resolve();
            };
            const handleError = (err: any) => {
                existingScript.removeEventListener('load', handleLoad);
                existingScript.removeEventListener('error', handleError);
                reject(err);
            };

            existingScript.addEventListener('load', handleLoad);
            existingScript.addEventListener('error', handleError);

            // Safety check: if it somehow loaded between the check and listener
            if ((src.includes('ckeditor5.umd.js') && (window as any).CKEDITOR) ||
                (src.includes('ckeditor5-premium-features.umd.js') && (window as any).CKEDITOR_PREMIUM_FEATURES)) {
                handleLoad();
            }
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.body.appendChild(script);
    });
};

const loadCSS = (href: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`link[href="${href}"]`)) {
            resolve();
            return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.crossOrigin = 'anonymous';
        link.onload = () => resolve();
        link.onerror = (err) => reject(err);
        document.head.appendChild(link);
    });
};

const CKEditor: FC<CKEditorProps> = ({ value, onChange, placeholder, config = {}, disabled = false }) => {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<any>(null);

    // Generate unique IDs for this instance
    const instanceId = useRef(`ckeditor-${Math.random().toString(36).substring(2, 9)}`);
    const containerId = `${instanceId.current}-container`;
    const editorId = `${instanceId.current}-element`;

    // Check if CKEditor is already available globally
    const [isScriptLoaded, setIsScriptLoaded] = useState(() => !!(window as any).CKEDITOR);
    const [isEditorInitializing, setIsEditorInitializing] = useState(true);
    const [isLayoutReady, setIsLayoutReady] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);

    useEffect(() => {
        setIsLayoutReady(true);
    }, []);

    useEffect(() => {
        if (!isLayoutReady) return;

        let isMounted = true;

        const initEditor = async () => {
            setIsEditorInitializing(true);
            try {
                // Robust check to prevent duplicate script loading
                if (!(window as any).CKEDITOR) {
                    // Check if scripts are already loading/loaded in DOM to prevent race conditions
                    const isScriptTagPresent = document.querySelector(`script[src="${CK_SCRIPT_URL}"]`);

                    if (!isScriptTagPresent) {
                        await Promise.all([
                            loadCSS(CK_CSS_URL),
                            loadCSS(CK_PREMIUM_CSS_URL),
                            loadScript(CK_SCRIPT_URL),
                            loadScript(CK_PREMIUM_SCRIPT_URL)
                        ]);
                    } else {
                        // Wait for both libraries to be available
                        await new Promise<void>((resolve) => {
                            const checkInterval = setInterval(() => {
                                const ckReady = !!(window as any).CKEDITOR;
                                const premiumReady = !!(window as any).CKEDITOR_PREMIUM_FEATURES;
                                if (ckReady && premiumReady) {
                                    clearInterval(checkInterval);
                                    resolve();
                                }
                            }, 50);
                            // Safety timeout
                            setTimeout(() => {
                                clearInterval(checkInterval);
                                resolve();
                            }, 10000);
                        });
                    }

                    if (!isMounted) return;
                    setIsScriptLoaded(true);
                }

                const {
                    ClassicEditor,
                    Autosave,
                    Essentials,
                    Paragraph,
                    Alignment,
                    AutoImage,
                    Autoformat,
                    AutoLink,
                    ImageBlock,
                    BlockQuote,
                    Bold,
                    Bookmark,
                    CloudServices,
                    Code,
                    CodeBlock,
                    Emoji,
                    FindAndReplace,
                    FontBackgroundColor,
                    FontColor,
                    FontFamily,
                    FontSize,
                    Fullscreen,
                    GeneralHtmlSupport,
                    Heading,
                    Highlight,
                    HorizontalLine,
                    HtmlEmbed,
                    ImageCaption,
                    ImageEditing,
                    ImageInsert,
                    ImageInsertViaUrl,
                    ImageResize,
                    ImageStyle,
                    ImageTextAlternative,
                    ImageToolbar,
                    ImageUpload,
                    ImageUtils,
                    ImageInline,
                    Indent,
                    IndentBlock,
                    Italic,
                    Link,
                    LinkImage,
                    List,
                    ListProperties,
                    MediaEmbed,
                    Mention,
                    PageBreak,
                    PasteFromOffice,
                    PictureEditing,
                    PlainTableOutput,
                    RemoveFormat,
                    ShowBlocks,
                    SpecialCharacters,
                    SpecialCharactersArrows,
                    SpecialCharactersCurrency,
                    SpecialCharactersEssentials,
                    SpecialCharactersLatin,
                    SpecialCharactersMathematical,
                    SpecialCharactersText,
                    Strikethrough,
                    Subscript,
                    Superscript,
                    Table,
                    TableCaption,
                    TableCellProperties,
                    TableColumnResize,
                    TableLayout,
                    TableProperties,
                    TableToolbar,
                    TextPartLanguage,
                    TextTransformation,
                    TodoList,
                    Underline,
                    BalloonToolbar
                } = (window as any).CKEDITOR;

                const {
                    CaseChange,
                    ExportPdf,
                    ExportWord,
                    ExportInlineStyles,
                    Footnotes,
                    FormatPainter,
                    ImportWord,
                    LineHeight,
                    MergeFields,
                    MultiLevelList,
                    PasteFromOfficeEnhanced,
                    SlashCommand,
                    TableOfContents,
                    Template,
                } = (window as any).CKEDITOR_PREMIUM_FEATURES;

                const LICENSE_KEY = import.meta.env.VITE_CKEDITOR_LICENSE_KEY;

                // Ensure DOCUMENT_ID is unique per editor instance if not provided
                const DOCUMENT_ID = config.documentId || `doc-${instanceId.current}`;

                const baseConfig = {
                    toolbar: {
                        items: [
                            'undo', 'redo', '|', 'heading', '|',
                            'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor', '|',
                            'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'code', 'removeFormat', '|',
                            'bulletedList', 'numberedList', 'todoList', 'outdent', 'indent', '|',
                            'alignment', 'lineHeight', '|',
                            'link', 'insertImage', 'insertImageViaUrl', 'mediaEmbed', 'insertTable', 'blockQuote', 'htmlEmbed', '|',
                            'specialCharacters', 'horizontalLine', 'pageBreak', '|',
                            'findAndReplace', 'showBlocks', 'fullscreen'
                        ],
                        shouldNotGroupWhenFull: false
                    },
                    plugins: [
                        Alignment, Autoformat, AutoImage,
                        AutoLink, Autosave, BalloonToolbar, BlockQuote, Bold, Bookmark, CaseChange,
                        CloudServices, Code, CodeBlock, Emoji, Essentials, ExportInlineStyles,
                        ExportPdf, ExportWord, FindAndReplace, FontBackgroundColor, FontColor, FontFamily, FontSize,
                        Footnotes, FormatPainter, Fullscreen, GeneralHtmlSupport, Heading, Highlight, HorizontalLine,
                        HtmlEmbed, ImageBlock, ImageCaption, ImageEditing, ImageInline, ImageInsert, ImageInsertViaUrl,
                        ImageResize, ImageStyle, ImageTextAlternative, ImageToolbar, ImageUpload, ImageUtils, ImportWord,
                        Indent, IndentBlock, Italic, LineHeight, Link, LinkImage, List, ListProperties, MediaEmbed,
                        Mention, MergeFields, MultiLevelList, PageBreak, Paragraph, PasteFromOffice, PasteFromOfficeEnhanced,
                        PictureEditing, PlainTableOutput, RemoveFormat,
                        ShowBlocks, SlashCommand, SpecialCharacters, SpecialCharactersArrows, SpecialCharactersCurrency,
                        SpecialCharactersEssentials, SpecialCharactersLatin, SpecialCharactersMathematical, SpecialCharactersText,
                        Strikethrough, Subscript, Superscript, Table, TableCaption, TableCellProperties, TableColumnResize,
                        TableLayout, TableOfContents, TableProperties, TableToolbar, Template, TextPartLanguage,
                        TextTransformation, TodoList, Underline
                    ].filter(plugin => {
                        if (!plugin) {
                            console.warn('CKEditor: A requested plugin was not found in the loaded libraries and will be skipped.');
                            return false;
                        }
                        return true;
                    }),
                    balloonToolbar: [
                        'bold', 'italic', '|', 'link', 'insertImage', '|',
                        'bulletedList', 'numberedList'
                    ],
                    exportInlineStyles: {
                        stylesheets: [CK_CSS_URL, CK_PREMIUM_CSS_URL]
                    },
                    exportPdf: {
                        stylesheets: [CK_CSS_URL, CK_PREMIUM_CSS_URL],
                        fileName: 'export-pdf-demo.pdf',
                        converterOptions: {
                            format: 'Tabloid',
                            margin_top: '20mm',
                            margin_bottom: '20mm',
                            margin_right: '24mm',
                            margin_left: '24mm',
                            page_orientation: 'portrait'
                        }
                    },
                    exportWord: {
                        stylesheets: [CK_CSS_URL, CK_PREMIUM_CSS_URL],
                        fileName: 'export-word-demo.docx',
                        converterOptions: {
                            document: {
                                orientation: 'portrait',
                                size: 'Tabloid',
                                margins: {
                                    top: '20mm',
                                    bottom: '20mm',
                                    right: '24mm',
                                    left: '24mm'
                                }
                            }
                        }
                    },
                    fontFamily: { supportAllValues: true },
                    fontSize: {
                        options: [10, 12, 14, 'default', 18, 20, 22],
                        supportAllValues: true
                    },
                    fullscreen: {
                        onEnterCallback: (container: any) =>
                            container.classList.add(
                                'editor-container',
                                'editor-container_classic-editor',
                                'editor-container_include-annotations',
                                'editor-container_include-fullscreen',
                                'main-container'
                            )
                    },
                    heading: {
                        options: [
                            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
                            { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
                            { model: 'heading5', view: 'h5', title: 'Heading 5', class: 'ck-heading_heading5' },
                            { model: 'heading6', view: 'h6', title: 'Heading 6', class: 'ck-heading_heading6' }
                        ]
                    },
                    htmlSupport: {
                        allow: [{ name: /^.*$/, styles: true, attributes: true, classes: true }]
                    },
                    image: {
                        toolbar: [
                            'toggleImageCaption', 'imageTextAlternative', '|',
                            'imageStyle:inline', 'imageStyle:wrapText', 'imageStyle:breakText', '|',
                            'resizeImage'
                        ]
                    },
                    // initialData removed to prevent editor-create-initial-data error
                    licenseKey: LICENSE_KEY,
                    lineHeight: { supportAllValues: true },
                    link: {
                        addTargetToExternalLinks: true,
                        defaultProtocol: 'https://',
                        decorators: {
                            toggleDownloadable: {
                                mode: 'manual',
                                label: 'Downloadable',
                                attributes: { download: 'file' }
                            }
                        }
                    },
                    list: {
                        properties: { styles: true, startIndex: true, reversed: true }
                    },
                    mention: {
                        feeds: [{ marker: '@', feed: [] }]
                    },
                    menuBar: { isVisible: true },
                    mergeFields: {},
                    placeholder: placeholder || 'Type or paste your content here!',
                    table: {
                        contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties']
                    },
                    template: {
                        definitions: [
                            {
                                title: 'Introduction',
                                description: 'Simple introduction to an article',
                                icon: '<svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="icons/article-image-right"><rect id="icon-bg" width="45" height="45" rx="2" fill="#A5E7EB"/><g id="page" filter="url(#filter0_d_1_507)"><path d="M9 41H36V12L28 5H9V41Z" fill="white"/><path d="M35.25 12.3403V40.25H9.75V5.75H27.7182L35.25 12.3403Z" stroke="#333333" stroke-width="1.5"/></g><g id="image"><path id="Rectangle 22" d="M21.5 23C21.5 22.1716 22.1716 21.5 23 21.5H31C31.8284 21.5 32.5 22.1716 32.5 23V29C32.5 29.8284 31.8284 30.5 31 30.5H23C22.1716 30.5 21.5 29.8284 21.5 29V23Z" fill="#B6E3FC" stroke="#333333"/><path id="Vector 1" d="M24.1184 27.8255C23.9404 27.7499 23.7347 27.7838 23.5904 27.9125L21.6673 29.6268C21.5124 29.7648 21.4589 29.9842 21.5328 30.178C21.6066 30.3719 21.7925 30.5 22 30.5H32C32.2761 30.5 32.5 30.2761 32.5 30V27.7143C32.5 27.5717 32.4391 27.4359 32.3327 27.3411L30.4096 25.6268C30.2125 25.451 29.9127 25.4589 29.7251 25.6448L26.5019 28.8372L24.1184 27.8255Z" fill="#44D500" stroke="#333333" stroke-linejoin="round"/><circle id="Ellipse 1" cx="26" cy="25" r="1.5" fill="#FFD12D" stroke="#333333"/></g><rect id="Rectangle 23" x="13" y="13" width="12" height="2" rx="1" fill="#B4B4B4"/><rect id="Rectangle 24" x="13" y="17" width="19" height="2" rx="1" fill="#B4B4B4"/><rect id="Rectangle 25" x="13" y="21" width="6" height="2" rx="1" fill="#B4B4B4"/><rect id="Rectangle 26" x="13" y="25" width="6" height="2" rx="1" fill="#B4B4B4"/><rect id="Rectangle 27" x="13" y="29" width="6" height="2" rx="1" fill="#B4B4B4"/><rect id="Rectangle 28" x="13" y="33" width="16" height="2" rx="1" fill="#B4B4B4"/></g><defs><filter id="filter0_d_1_507" x="9" y="5" width="28" height="37" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dx="1" dy="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.29 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_507"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_507" result="shape"/></filter></defs></svg>',
                                data: "<h2>Introduction</h2><p>Article introduction...</p>"
                            }
                        ]
                    }
                };

                // Merge config props
                const derivedConfig = { ...baseConfig, ...config };

                // Cleanup existing editor if any
                if (editorInstanceRef.current) {
                    await editorInstanceRef.current.destroy();
                    editorInstanceRef.current = null;
                }

                // Create editor
                const editor = await ClassicEditor.create(editorRef.current, derivedConfig);

                // CRITICAL: Double-check if the component is still mounted
                // If the user navigated away or React StrictMode unmounted this instance while
                // we were awaiting the creation, we must destroy the newly created editor.
                if (!isMounted) {
                    await editor.destroy();
                    return;
                }

                editorInstanceRef.current = editor;

                // Set initial data manually to avoid "editor-create-initial-data" error
                editor.setData(value || '');

                // Handle changes
                editor.model.document.on('change:data', () => {
                    const data = editor.getData();
                    onChange(data);
                });

                if (disabled) {
                    editor.enableReadOnlyMode('ckeditor-react-component');
                } else {
                    editor.disableReadOnlyMode('ckeditor-react-component');
                }


                setIsEditorInitializing(false);

            } catch (error: any) {
                console.error('Failed to initialize CKEditor:', error);
                setInitError(error.message || 'Failed to populate editor');
                setIsEditorInitializing(false);
            }
        };

        if (isLayoutReady) {
            initEditor();
        }

        return () => {
            isMounted = false;
            if (editorInstanceRef.current) {
                editorInstanceRef.current.destroy()
                    .then(() => {
                        editorInstanceRef.current = null;
                    })
                    .catch((err: any) => console.error('Error destroying editor:', err));
            }
        };
    }, [isLayoutReady, isScriptLoaded]); // Only re-run if layout is ready (on mount)

    useEffect(() => {
        if (editorInstanceRef.current) {
            if (disabled) {
                editorInstanceRef.current.enableReadOnlyMode('ckeditor-react-component');
            } else {
                editorInstanceRef.current.disableReadOnlyMode('ckeditor-react-component');
            }
        }
    }, [disabled]);

    // Update value if changed externally (be careful with loops)
    useEffect(() => {
        if (editorInstanceRef.current && value !== editorInstanceRef.current.getData()) {
            editorInstanceRef.current.setData(value || '');
        }
    }, [value]);

    if (initError) {
        return (
            <div className="w-full h-[300px] bg-red-50 border border-red-200 rounded-xl flex items-center justify-center p-4">
                <div className="text-red-500 text-center">
                    <p className="font-bold">Editor Error</p>
                    <p className="text-sm">{initError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="main-container">
            {isEditorInitializing && (
                <div className="w-full h-[300px] bg-slate-50 border border-slate-200 rounded-xl animate-pulse flex flex-col p-4 gap-4">
                    <div className="flex gap-2 mb-2 border-b border-slate-200 pb-2">
                        <div className="h-6 w-6 bg-slate-200 rounded"></div>
                        <div className="h-6 w-6 bg-slate-200 rounded"></div>
                        <div className="h-6 w-6 bg-slate-200 rounded"></div>
                    </div>
                    <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                    <div className="h-4 w-5/6 bg-slate-200 rounded"></div>
                </div>
            )}
            <div
                className={`editor-container editor-container_classic-editor editor-container_include-annotations editor-container_include-fullscreen ${isEditorInitializing ? 'hidden' : ''}`}
                id={containerId}
                ref={editorContainerRef}
            >
                <div className="editor-container__editor-wrapper">
                    <div className="editor-container__editor">
                        <div ref={editorRef} id={editorId}></div>
                    </div>
                    {/* Sidebar hidden/removed for standard look */}
                </div>
            </div>
        </div>
    );
};

export default CKEditor;
