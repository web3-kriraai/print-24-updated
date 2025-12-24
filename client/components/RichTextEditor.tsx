import React, { useState, useEffect, useMemo, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  height?: string;
}

// Client-only RichTextEditor to avoid PrimeReact SSR issues
const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter description...",
  className = "",
  style,
  height = '300px',
}) => {
  const [Editor, setEditor] = useState<React.ComponentType<any> | null>(null);
  const [mounted, setMounted] = useState(false);

  // Only import and render Editor on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Dynamically import PrimeReact Editor only on client
      import('primereact/editor').then((mod) => {
        setEditor(() => mod.Editor);
        setMounted(true);
      }).catch((err) => {
        console.error('Failed to load PrimeReact Editor:', err);
        setMounted(true); // Still set mounted to show fallback
      });
    }
  }, []);

  // Show loading/fallback during SSR and before client hydration
  if (!mounted || !Editor) {
    return (
      <div 
        className={`rich-text-editor-wrapper ${className}`}
        style={{ height, ...style }}
      >
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          style={{ height, minHeight: '200px' }}
        />
      </div>
    );
  }

  // Render the actual PrimeReact Editor once loaded on client
  return (
    <ClientEditor 
      Editor={Editor}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      style={style}
      height={height}
    />
  );
};

// Internal component that uses the dynamically imported Editor
const ClientEditor: React.FC<{
  Editor: React.ComponentType<any>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  height?: string;
}> = ({ Editor, value, onChange, placeholder, className, style, height }) => {
  const editorRef = useRef<any>(null);

  // Configure Quill modules for rich functionality - memoized for performance
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  }), []);

  const formats = useMemo(() => [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'indent',
    'align',
    'image'
  ], []);

  const handleTextChange = useMemo(() => (e: any) => {
    if (e.htmlValue !== undefined) {
      onChange(e.htmlValue || '');
    } else if (e.textValue !== undefined) {
      // Fallback to text value if htmlValue is not available
      onChange(e.textValue || '');
    } else if (e.value !== undefined) {
      // Some versions use 'value' property
      onChange(e.value || '');
    }
  }, [onChange]);

  const editorStyle = useMemo(() => ({
    height,
    ...style
  }), [height, style]);

  return (
    <div className={`rich-text-editor-wrapper ${className}`}>
      <Editor
        ref={editorRef}
        value={value || ''}
        onTextChange={handleTextChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={editorStyle}
      />
      <style>{`
        .rich-text-editor-wrapper {
          width: 100%;
        }
        .rich-text-editor-wrapper .p-editor-container {
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .rich-text-editor-wrapper .p-editor-toolbar {
          border-bottom: 1px solid #d1d5db;
          background: #f9fafb;
          padding: 0.5rem;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 200px;
        }
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;