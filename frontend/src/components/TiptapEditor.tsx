import { useEditor, EditorContent } from "@tiptap/react";
import CodeBlock from "@tiptap/extension-code-block";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Node, Extension, mergeAttributes } from "@tiptap/core";
import { CommandProps, RawCommands } from "@tiptap/core";
import React, { useRef, useState, useEffect } from "react";
import { useColorScheme } from "@mui/joy/styles";
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  ListBullets,
  ListNumbers,
  Quotes,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  PaintBrush,
  Check,
  X,
  ArrowCounterClockwise,
  ArrowClockwise,
  TextAlignCenter,
  TextAlignRight,
  TextAlignLeft,
  Video,
  TextH,
  CaretDown,
  Article as ButtonIcon,
} from "@phosphor-icons/react/dist/ssr";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string }) => ReturnType;
    };
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    customButton: {
      setCustomButton: (options: {
        text: string;
        url: string;
        backgroundColor: string;
        textColor: string;
        padding: string;
        borderWidth: string;
        borderColor: string;
        borderStyle: string;
        borderRadius: string;
        fontSize: string;
        fontFamily: string;
      }) => ReturnType;
    };
  }
}

const CustomButton = Node.create({
  name: "customButton",
  group: "inline",
  inline: true,
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      text: {
        default: "Button",
      },
      url: {
        default: "#",
      },
      backgroundColor: {
        default: "#3d37dd",
      },
      textColor: {
        default: "#ffffff",
      },
      padding: {
        default: "2px 6px",
      },
      borderWidth: {
        default: "1px",
      },
      borderColor: {
        default: "#3d37dd",
      },
      borderStyle: {
        default: "solid",
      },
      borderRadius: {
        default: "4px",
      },
      fontSize: {
        default: "14px",
      },
      fontFamily: {
        default: "inherit",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a.custom-button",
        getAttrs: (element: HTMLElement) => ({
          text: element.textContent,
          url: element.getAttribute("href"),
          backgroundColor: element.style.backgroundColor,
          textColor: element.style.color,
          padding: element.style.padding,
          borderWidth: element.style.borderWidth,
          borderColor: element.style.borderColor,
          borderStyle: element.style.borderStyle,
          borderRadius: element.style.borderRadius,
          fontSize: element.style.fontSize,
          fontFamily: element.style.fontFamily,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(
        {
          class: "custom-button",
          href: HTMLAttributes.url,
          style: `
            display: inline-block;
            background-color: ${HTMLAttributes.backgroundColor};
            color: ${HTMLAttributes.textColor};
            padding: ${HTMLAttributes.padding};
            border: ${HTMLAttributes.borderWidth} ${HTMLAttributes.borderStyle} ${HTMLAttributes.borderColor};
            border-radius: ${HTMLAttributes.borderRadius};
            font-size: ${HTMLAttributes.fontSize};
            font-family: ${HTMLAttributes.fontFamily};
            text-decoration: none;
            cursor: pointer;
            transition: opacity 0.2s;
            margin: 0;
          `,
        },
        HTMLAttributes
      ),
      HTMLAttributes.text,
    ];
  },

  addCommands() {
    return {
      setCustomButton:
        (options: {
          text: string;
          url: string;
          backgroundColor: string;
          textColor: string;
          padding: string;
          borderWidth: string;
          borderColor: string;
          borderStyle: string;
          borderRadius: string;
          fontSize: string;
          fontFamily: string;
        }) =>
        ({ commands }: CommandProps): boolean => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as Partial<RawCommands>;
  },
});

const VideoNode = Node.create({
  name: "video",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
      width: {
        default: "100%",
      },
      maxWidth: {
        default: "100%",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video",
        getAttrs: (element: HTMLElement) => ({
          src: element.getAttribute("src"),
          controls: element.hasAttribute("controls"),
          width: element.getAttribute("width") || "100%",
          maxWidth: element.getAttribute("max-width") || "100%",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes({ controls: true }, HTMLAttributes)];
  },

  addCommands() {
    return {
      setVideo:
        (options: { src: string }) =>
        ({ commands }: CommandProps): boolean => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    } as Partial<RawCommands>;
  },
});

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ commands }: CommandProps) =>
          commands.setMark("textStyle", { fontSize }),
      unsetFontSize:
        () =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes("textStyle", { fontSize: null }),
    };
  },
});

const HeadingWithId = Extension.create({
  name: "headingWithId",
  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          id: {
            default: null,
            parseHTML: (element) => element.getAttribute("id"),
            renderHTML: (attributes) => {
              if (!attributes.id) {
                const text = attributes.node?.textContent || "";
                const level = attributes.node?.attrs?.level || 1;
                attributes.id = `heading-${text
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}-${level}`;
              }
              return {
                id: attributes.id,
              };
            },
          },
        },
      },
    ];
  },
});

interface TiptapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  isPreview: boolean;
  onTocChange?: (toc: { id: string; text: string; level: number }[]) => void;
}

const fontFamilies = [
  { label: "Default", value: "inherit" },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Verdana", value: "Verdana" },
  { label: "Roboto", value: "Roboto" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Lato", value: "Lato" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Poppins", value: "Poppins" },
  { label: "Source Sans Pro", value: "Source Sans Pro" },
  { label: "Comic Sans MS", value: "Comic Sans MS" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
];

const fontSizes = ["12px", "14px", "16px", "18px", "24px", "32px"];

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  isPreview,
  onTocChange,
}) => {
  const { colorScheme } = useColorScheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const customButtonRef = useRef<HTMLButtonElement>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false);
  const [isCustomButtonOpen, setIsCustomButtonOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isHeadingDropdownOpen, setIsHeadingDropdownOpen] = useState(false);
  const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false);
  const [isFontFamilyDropdownOpen, setIsFontFamilyDropdownOpen] = useState(false);
  
  const headingDropdownRef = useRef<HTMLDivElement>(null);
  const fontFamilyDropdownRef = useRef<HTMLDivElement>(null);
  
  // Custom button state
  const [buttonText, setButtonText] = useState("Button");
  const [buttonUrl, setButtonUrl] = useState("#");
  const [buttonBgColor, setButtonBgColor] = useState("#3d37dd");
  const [buttonTextColor, setButtonTextColor] = useState("#ffffff");
  const [buttonPadding, setButtonPadding] = useState("2px 6px");
  const [buttonBorderWidth, setButtonBorderWidth] = useState("1px");
  const [buttonBorderColor, setButtonBorderColor] = useState("#3d37dd");
  const [buttonBorderStyle, setButtonBorderStyle] = useState("solid");
  const [buttonBorderRadius, setButtonBorderRadius] = useState("4px");
  const [buttonFontSize, setButtonFontSize] = useState("14px");
  const [buttonFontFamily, setButtonFontFamily] = useState("inherit");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: "heading",
          },
        },
      }),
      HeadingWithId,
      CodeBlock.configure({
        HTMLAttributes: {
          class: "custom-code-block",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontFamily,
      Subscript,
      Superscript,
      FontSize,
      VideoNode,
      CustomButton,
    ],
    content,
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
    editable: !isPreview,
    editorProps: {
      attributes: {
        style: 'font-size: 14px;',
      },
    },
  });

  useEffect(() => {
    if (editor && content && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (!isPreview || !editor) return;
    const html = editor.getHTML();
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const headings: { id: string; text: string; level: number }[] = [];
    const headingCounts: { [key: string]: number } = {};
    let changed = false;

    Array.from(doc.body.querySelectorAll("h1, h2, h3, h4, h5, h6")).forEach(
      (el) => {
        const level = Number(el.tagName[1]);
        const text = el.textContent || "";
        const baseId = `heading-${text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${level}`;

        headingCounts[baseId] = (headingCounts[baseId] || 0) + 1;
        const count = headingCounts[baseId];

        const id = count > 1 ? `${baseId}-${count}` : baseId;

        if (el.getAttribute("id") !== id) {
          el.setAttribute("id", id);
          changed = true;
        }

        headings.push({ id, text, level });
      }
    );

    if (onTocChange) onTocChange(headings);

    if (changed) {
      editor.commands.setContent(doc.body.innerHTML, false);
    }
  }, [isPreview, editor, onTocChange]);

  const applyLink = () => {
    if (linkUrl) {
      const formattedUrl = linkUrl.match(/^https?:\/\//)
        ? linkUrl
        : `https://${linkUrl}`;
      editor?.chain().focus().setLink({ href: formattedUrl }).run();
    }
    setIsLinkInputOpen(false);
    setLinkUrl("");
  };

  const cancelLink = () => {
    setIsLinkInputOpen(false);
    setLinkUrl("");
  };

  const openLinkInput = () => {
    if (!isPreview) {
      setIsLinkInputOpen(true);
    }
  };

  const addImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isPreview) return;
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        editor
          ?.chain()
          .focus()
          .setImage({ src: reader.result as string })
          .run();
      };
      reader.onerror = () => {
        setError("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    }
  };

  const addVideo = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isPreview) return;
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ["video/mp4", "video/webm", "video/ogg"];
      if (!validTypes.includes(file.type)) {
        setError("Unsupported video format. Please use MP4, WebM, or OGG.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor?.chain().focus().setVideo({ src }).run();
        setError(null);
      };
      reader.onerror = () => {
        setError("Failed to read video file.");
      };
      reader.readAsDataURL(file);
    }
  };

  const openColorPicker = () => {
    if (!isPreview) {
      setIsColorPickerOpen(!isColorPickerOpen);
      if (!isColorPickerOpen && colorButtonRef.current) {
        const rect = colorButtonRef.current.getBoundingClientRect();
        const colorPicker = document.querySelector(".color-picker");
        if (colorPicker) {
          let top = rect.bottom + window.scrollY;
          let left = rect.left + window.scrollX;
          const pickerWidth = 140;
          const pickerHeight = 100;

          if (left + pickerWidth > window.innerWidth) {
            left = window.innerWidth - pickerWidth - 10;
          }
          if (top + pickerHeight > window.innerHeight + window.scrollY) {
            top = rect.top + window.scrollY - pickerHeight - 10;
          }

          (colorPicker as HTMLElement).style.top = `${top}px`;
          (colorPicker as HTMLElement).style.left = `${left}px`;
        }
      }
    }
  };

  const selectColor = (color: string) => {
    if (!isPreview) {
      editor?.chain().focus().setColor(color).run();
      setIsColorPickerOpen(false);
    }
  };

  const colors = [
    "#000000",
    "#FF0000",
    "#FFA500",
    "#FFFF00",
    "#00FF00",
    "#0000FF",
    "#800080",
    "#FF00FF",
    "#00FFFF",
    "#800000",
    "#008000",
    "#000080",
    "#808000",
    "#008080",
    "#C0C0C0",
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof globalThis.Node &&
        colorButtonRef.current &&
        !colorButtonRef.current.contains(target) &&
        !(target as HTMLElement).closest('.color-picker')
      ) {
        setIsColorPickerOpen(false);
      }
    };

    if (isColorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorPickerOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof globalThis.Node &&
        headingDropdownRef.current &&
        !headingDropdownRef.current.contains(target)
      ) {
        setIsHeadingDropdownOpen(false);
      }
    };
    if (isHeadingDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHeadingDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof globalThis.Node &&
        fontFamilyDropdownRef.current &&
        !fontFamilyDropdownRef.current.contains(target)
      ) {
        setIsFontFamilyDropdownOpen(false);
      }
    };
    if (isFontFamilyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFontFamilyDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof globalThis.Node &&
        linkButtonRef.current &&
        !linkButtonRef.current.contains(target) &&
        !(target as HTMLElement).closest('.link-input-container')
      ) {
        setIsLinkInputOpen(false);
      }
    };
    if (isLinkInputOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLinkInputOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof globalThis.Node &&
        customButtonRef.current &&
        !customButtonRef.current.contains(target) &&
        !(target as HTMLElement).closest('.custom-button-popup')
      ) {
        setIsCustomButtonOpen(false);
      }
    };
    if (isCustomButtonOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomButtonOpen]);

  return (
    <div>
      {error && (
        <div style={{ color: "red", marginBottom: "8px" }}>{error}</div>
      )}
      {!isPreview && (
        <div className="tiptap-toolbar">
          <div className="tooltip-wrapper">
            <button
              onClick={() => editor?.commands.undo()}
              disabled={isPreview || !editor?.can().undo()}
            >
              <ArrowCounterClockwise size={20} />
            </button>
            <span className="tooltip">Undo</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              onClick={() => editor?.commands.redo()}
              disabled={isPreview || !editor?.can().redo()}
            >
              <ArrowClockwise size={20} />
            </button>
            <span className="tooltip">Redo</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("superscript") ? "active" : ""}
              onClick={() => editor?.commands.toggleSuperscript()}
              disabled={isPreview || !editor}
            >
              X²
            </button>
            <span className="tooltip">Superscript</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("subscript") ? "active" : ""}
              onClick={() => editor?.commands.toggleSubscript()}
              disabled={isPreview || !editor}
            >
              X₂
            </button>
            <span className="tooltip">Subscript</span>
          </div>
          {/* <div className="tooltip-wrapper">
            <div className="custom-select">
              <button
                onClick={() =>
                  setIsFontSizeDropdownOpen(!isFontSizeDropdownOpen)
                }
                disabled={isPreview}
                className="select-button"
              >
                {editor?.getAttributes("textStyle").fontSize || "14px"}
                <CaretDown size={16} />
              </button>
              {isFontSizeDropdownOpen && !isPreview && (
                <div className="select-dropdown  w-75">
                  {fontSizes.map((size) => (
                    <div
                      key={size}
                      className="select-option"
                      onClick={() => {
                        editor?.commands.setFontSize(size);
                        setIsFontSizeDropdownOpen(false);
                      }}
                    >
                      {size}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="tooltip">Font Size</span>
          </div> */}
          <div className="tooltip-wrapper">
            <div className="custom-select" ref={fontFamilyDropdownRef}>
              <button
                onClick={() =>
                  setIsFontFamilyDropdownOpen(!isFontFamilyDropdownOpen)
                }
                disabled={isPreview}
                className="select-button"
              >
                {fontFamilies.find(
                  (f) =>
                    f.value === editor?.getAttributes("textStyle").fontFamily
                )?.label || "Default"}
                <CaretDown size={16} />
              </button>
              {isFontFamilyDropdownOpen && !isPreview && (
                <div className="select-dropdown">
                  {fontFamilies.map((f) => (
                    <div
                      key={f.value}
                      className="select-option"
                      style={{ fontFamily: f.value }}
                      onClick={() => {
                        editor?.commands.setFontFamily(f.value);
                        setIsFontFamilyDropdownOpen(false);
                      }}
                    >
                      {f.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="tooltip">Font Family</span>
          </div>
          <div className="tooltip-wrapper">
            <div className="custom-select" ref={headingDropdownRef}>
              <button
                onClick={() => setIsHeadingDropdownOpen(!isHeadingDropdownOpen)}
                disabled={isPreview}
                className="select-button"
              >
                {editor?.isActive("heading", { level: 1 })
                  ? "Heading 1"
                  : editor?.isActive("heading", { level: 2 })
                  ? "Heading 2"
                  : editor?.isActive("heading", { level: 3 })
                  ? "Heading 3"
                  : editor?.isActive("heading", { level: 4 })
                  ? "Heading 4"
                  : "Paragraph"}
                <CaretDown size={16} />
              </button>
              {isHeadingDropdownOpen && !isPreview && (
                <div className="select-dropdown">
                  <div
                    className="select-option"
                    onClick={() => {
                      editor?.chain().focus().setParagraph().run();
                      setIsHeadingDropdownOpen(false);
                    }}
                  >
                    Paragraph
                  </div>
                  <div
                    className="select-option heading-1"
                    onClick={() => {
                      editor?.chain().focus().toggleHeading({ level: 1 }).run();
                      setIsHeadingDropdownOpen(false);
                    }}
                  >
                    Heading 1
                  </div>
                  <div
                    className="select-option heading-2"
                    onClick={() => {
                      editor?.chain().focus().toggleHeading({ level: 2 }).run();
                      setIsHeadingDropdownOpen(false);
                    }}
                  >
                    Heading 2
                  </div>
                  <div
                    className="select-option heading-3"
                    onClick={() => {
                      editor?.chain().focus().toggleHeading({ level: 3 }).run();
                      setIsHeadingDropdownOpen(false);
                    }}
                  >
                    Heading 3
                  </div>
                  <div
                    className="select-option heading-4"
                    onClick={() => {
                      editor?.chain().focus().toggleHeading({ level: 4 }).run();
                      setIsHeadingDropdownOpen(false);
                    }}
                  >
                    Heading 4
                  </div>
                </div>
              )}
            </div>
            <span className="tooltip">Heading</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              onClick={() => editor?.commands.setTextAlign("left")}
              disabled={!editor}
            >
              <TextAlignLeft size={22} />
            </button>
            <span className="tooltip">Align Left</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              onClick={() => editor?.commands.setTextAlign("center")}
              disabled={!editor}
            >
              <TextAlignCenter size={22} />
            </button>
            <span className="tooltip">Align Center</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              onClick={() => editor?.commands.setTextAlign("right")}
              disabled={!editor}
            >
              <TextAlignRight size={22} />
            </button>
            <span className="tooltip">Align Right</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("italic") ? "active" : ""}
              onClick={() => editor?.commands.toggleItalic()}
              disabled={isPreview || !editor}
            >
              <TextItalic size={22} />
            </button>
            <span className="tooltip">Italic</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("bold") ? "active" : ""}
              onClick={() => editor?.commands.toggleBold()}
              disabled={isPreview || !editor}
            >
              <TextB size={22} />
            </button>
            <span className="tooltip">Bold</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("underline") ? "active" : ""}
              onClick={() => editor?.commands.toggleUnderline()}
              disabled={isPreview || !editor}
            >
              <TextUnderline size={22} />
            </button>
            <span className="tooltip">Underline</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("strike") ? "active" : ""}
              onClick={() => editor?.commands.toggleStrike()}
              disabled={isPreview || !editor}
            >
              <TextStrikethrough size={22} />
            </button>
            <span className="tooltip">Strikethrough</span>
          </div>
          <div className="color-picker-container">
            <div className="tooltip-wrapper">
              <button
                ref={colorButtonRef}
                onClick={openColorPicker}
                disabled={isPreview || !editor}
              >
                <PaintBrush size={21} />
              </button>
              <span className="tooltip">Text Color</span>
            </div>
            {isColorPickerOpen && !isPreview && (
              <div className="color-picker">
                {colors.map((color) => (
                  <div className="tooltip-wrapper" key={color}>
                    <div
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      onClick={() => selectColor(color)}
                    />
                    <span className="tooltip">Color {color}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("blockquote") ? "active" : ""}
              onClick={() => editor?.commands.toggleBlockquote()}
              disabled={isPreview || !editor}
            >
              <Quotes size={22} />
            </button>
            <span className="tooltip">Blockquote</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("bulletList") ? "active" : ""}
              onClick={() => editor?.commands.toggleBulletList()}
              disabled={isPreview || !editor}
            >
              <ListBullets size={22} />
            </button>
            <span className="tooltip">Bullet List</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("orderedList") ? "active" : ""}
              onClick={() => editor?.commands.toggleOrderedList()}
              disabled={isPreview || !editor}
            >
              <ListNumbers size={22} />
            </button>
            <span className="tooltip">Ordered List</span>
          </div>
          <span className="divider" />
          <div className="tooltip-wrapper">
            <button
              className={editor?.isActive("codeBlock") ? "active" : ""}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              disabled={isPreview || !editor}
            >
              <Code size={22} />
            </button>
            <span className="tooltip">Code Block</span>
          </div>
          <div className="link-container">
            <div className="tooltip-wrapper">
              <button
                ref={linkButtonRef}
                onClick={openLinkInput}
                disabled={isPreview || !editor}
              >
                <LinkIcon size={22} />
              </button>
              <span className="tooltip">Insert Link</span>
            </div>
            {isLinkInputOpen && !isPreview && (
              <div className="link-input-container">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Input URL"
                  autoFocus
                />
                <div className="tooltip-wrapper">
                  <button onClick={applyLink}>
                    <Check size={18} />
                  </button>
                </div>
                <div className="tooltip-wrapper">
                  <button onClick={cancelLink}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="tooltip-wrapper">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isPreview || !editor}
            >
              <ImageIcon size={22} />
            </button>
            <span className="tooltip">Insert Image</span>
          </div>
          <div className="tooltip-wrapper">
            <button
              ref={customButtonRef}
              onClick={() => setIsCustomButtonOpen(!isCustomButtonOpen)}
              disabled={isPreview || !editor}
            >
              <ButtonIcon size={22} />
            </button>
            <span className="tooltip">Insert Custom Button</span>
          </div>
          {isCustomButtonOpen && !isPreview && (
            <div className="custom-button-popup">
              <div className="custom-button-form">
                <div className="form-group">
                  <label>Button Text:</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Enter button text"
                  />
                </div>
                <div className="form-group">
                  <label>URL:</label>
                  <input
                    type="text"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    placeholder="Enter URL"
                  />
                </div>
                <div className="form-group">
                  <label>Background Color:</label>
                  <input
                    type="color"
                    value={buttonBgColor}
                    onChange={(e) => setButtonBgColor(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Text Color:</label>
                  <input
                    type="color"
                    value={buttonTextColor}
                    onChange={(e) => setButtonTextColor(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Padding:</label>
                  <input
                    type="text"
                    value={buttonPadding}
                    onChange={(e) => setButtonPadding(e.target.value)}
                    placeholder="e.g., 8px 16px"
                  />
                </div>
                <div className="form-group">
                  <label>Border Width:</label>
                  <input
                    type="text"
                    value={buttonBorderWidth}
                    onChange={(e) => setButtonBorderWidth(e.target.value)}
                    placeholder="e.g., 1px"
                  />
                </div>
                <div className="form-group">
                  <label>Border Color:</label>
                  <input
                    type="color"
                    value={buttonBorderColor}
                    onChange={(e) => setButtonBorderColor(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Border Style:</label>
                  <select
                    value={buttonBorderStyle}
                    onChange={(e) => setButtonBorderStyle(e.target.value)}
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                    <option value="double">Double</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Border Radius:</label>
                  <input
                    type="text"
                    value={buttonBorderRadius}
                    onChange={(e) => setButtonBorderRadius(e.target.value)}
                    placeholder="e.g., 4px"
                  />
                </div>
                <div className="form-group">
                  <label>Font Size:</label>
                  <select
                    value={buttonFontSize}
                    onChange={(e) => setButtonFontSize(e.target.value)}
                  >
                    {fontSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Font Family:</label>
                  <select
                    value={buttonFontFamily}
                    onChange={(e) => setButtonFontFamily(e.target.value)}
                  >
                    {fontFamilies.map((font) => (
                      <option
                        key={font.value}
                        value={font.value}
                        style={{ fontFamily: font.value }}
                      >
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="button-actions">
                  <button
                    onClick={() => {
                      editor?.chain().focus().setCustomButton({
                        text: buttonText,
                        url: buttonUrl,
                        backgroundColor: buttonBgColor,
                        textColor: buttonTextColor,
                        padding: buttonPadding,
                        borderWidth: buttonBorderWidth,
                        borderColor: buttonBorderColor,
                        borderStyle: buttonBorderStyle,
                        borderRadius: buttonBorderRadius,
                        fontSize: buttonFontSize,
                        fontFamily: buttonFontFamily,
                      }).run();
                      setIsCustomButtonOpen(false);
                    }}
                  >
                    <Check size={18} />
                  </button>
                  <button onClick={() => setIsCustomButtonOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={addImage}
          />
          <input
            type="file"
            accept="video/mp4,video/webm,video/ogg"
            style={{ display: "none" }}
            ref={videoInputRef}
            onChange={addVideo}
          />
        </div>
      )}
      {/* {content ? (
      <div
        className="tiptap-preview"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    ) : isPreview ? (
      <div
        className="tiptap-preview"
        dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
      />
    ) : (
      <EditorContent editor={editor} />
    )} */}

      {isPreview ? (
        <div
          className="tiptap-preview"
          dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      <style jsx>{`
        .tiptap-toolbar {
          position: relative;
          overflow: visible;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          background: var(--joy-palette-background-body);
          border-radius: 10px;
          border: 1px solid var(--joy-palette-divider);
          padding: 8px 8px;
          gap: 2px;
          margin-bottom: 12px;
          scrollbar-width: thin;
          scrollbar-color: #e0e0e0 #fff;
          white-space: pre-wrap;
          position: sticky;
          top: 100px;
          z-index: 100;
          background: var(--joy-palette-background-body);
          max-width: 100%;
        }
        .tiptap-toolbar::-webkit-scrollbar {
          height: 6px;
          background: #fff;
        }
        .tiptap-toolbar::-webkit-scrollbar-thumb {
          background: #e0e0e0;
          border-radius: 4px;
        }
        .tiptap-toolbar button,
        .tiptap-toolbar select {
          background: none;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
          display: flex;
          align-items: center;
          font-size: 14px;
          min-width: 36px;
        }
        .tiptap-toolbar select {
          margin: 0 4px;
          padding: 4px 8px;
          border: 1px solid var(--joy-palette-divider);
          background: var(--joy-palette-background-body);
          border-radius: 4px;
        }
        .tiptap-toolbar button.active,
        .tiptap-toolbar button:hover {
          opacity: 0.6;
        }
        .tiptap-toolbar button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .tiptap-toolbar .divider {
          width: 1px;
          height: 24px;
          background: #e0e0e0;
          margin: 0 6px;
        }
        .color-picker-container {
          position: relative;
        }
        .color-picker {
          position: fixed;
          top: auto;
          right: 32px;
          margin-top: 4px;
          display: grid;
          grid-template-columns: repeat(5, 24px);
          gap: 4px;
          background: var(--joy-palette-background-body);
          border: 1px solid var(--joy-palette-divider);
          border-radius: 4px;
          padding: 8px;
          box-shadow: 0 2px 8px rgba(60, 60, 60, 0.08);
          z-index: 10001;
        }
        .color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          border: 1px solid var(--joy-palette-divider);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
        }
        .color-swatch:hover {
          transform: scale(1.1);
        }
        .color-picker .tooltip-wrapper .tooltip {
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
        }
        .link-container {
          position: relative;
        }
        .link-input-container {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          display: flex;
          align-items: center;
          background: var(--joy-palette-background-body);
          border: 1px solid var(--joy-palette-divider);
          border-radius: 4px;
          padding: 4px;
          z-index: 10000;
        }
        .link-input-container input {
          border: none;
          outline: none;
          padding: 4px 8px;
          font-size: 14px;
          width: 200px;
        }
        .link-input-container button {
          padding: 4px;
          background: none;
          border: none;
          cursor: pointer;
        }
        .link-input-container button:hover {
          opacity: 0.8;
        }
        :global(.ProseMirror img),
        :global(.tiptap-preview img) {
          max-width: 100%;
          height: auto;
          object-fit: contain;
          display: block;
          margin: 0 auto;
          box-sizing: border-box;
          border-radius: 8px;
        }
        :global(.ProseMirror video),
        :global(.tiptap-preview video) {
          max-width: 100%;
          width: 100%;
          height: auto;
          display: block;
          margin: 8px auto;
          border-radius: 8px;
          object-fit: contain;
        }
        :global(.ProseMirror) {
          pointer-events: ${isPreview ? "none" : "auto"};
          border-radius: 8px;
          padding: 16px;
          color: var(--joy-palette-text-primary);
          font-size: 16px;
          min-height: 200px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow-wrap: break-word;
          word-wrap: break-word;
          position: relative;
          ${colorScheme === "dark" && `
            p[style*='color: black'], p[style*='color: #000'], p[style*='color: rgb(0, 0, 0)'], p[style*='color: rgba(0,0,0'], p[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            span[style*='color: black'], span[style*='color: #000'], span[style*='color: rgb(0, 0, 0)'], span[style*='color: rgba(0,0,0'], span[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            div[style*='color: black'], div[style*='color: #000'], div[style*='color: rgb(0, 0, 0)'], div[style*='color: rgba(0,0,0'], div[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h1[style*='color: black'], h1[style*='color: #000'], h1[style*='color: rgb(0, 0, 0)'], h1[style*='color: rgba(0,0,0'], h1[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h2[style*='color: black'], h2[style*='color: #000'], h2[style*='color: rgb(0, 0, 0)'], h2[style*='color: rgba(0,0,0'], h2[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h3[style*='color: black'], h3[style*='color: #000'], h3[style*='color: rgb(0, 0, 0)'], h3[style*='color: rgba(0,0,0'], h3[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h4[style*='color: black'], h4[style*='color: #000'], h4[style*='color: rgb(0, 0, 0)'], h4[style*='color: rgba(0,0,0'], h4[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h5[style*='color: black'], h5[style*='color: #000'], h5[style*='color: rgb(0, 0, 0)'], h5[style*='color: rgba(0,0,0'], h5[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h6[style*='color: black'], h6[style*='color: #000'], h6[style*='color: rgb(0, 0, 0)'], h6[style*='color: rgba(0,0,0'], h6[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            li[style*='color: black'], li[style*='color: #000'], li[style*='color: rgb(0, 0, 0)'], li[style*='color: rgba(0,0,0'], li[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            blockquote[style*='color: black'], blockquote[style*='color: #000'], blockquote[style*='color: rgb(0, 0, 0)'], blockquote[style*='color: rgba(0,0,0'], blockquote[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
          `}
        }
        :global(.ProseMirror-focused) {
          outline: none;
        }
        :global(.pre) {
          white-space: pre-wrap;
        }
        :global(p) {
          margin-block-start: 0.5em !important;
          margin-block-end: 0.5em !important;
        }
        :global(.custom-code-block) {
          border: 1px solid var(--joy-palette-divider);
          background: var(--Layout-bg);
          border-radius: 4px;
          padding: 10px;
          color: var(--joy-palette-text-primary);
          font-size: 14px;
          margin: 8px 0;
        }
        :global(.custom-code-block pre) {
          margin: 0;
          padding: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: break-all;
        }
        :global(.custom-code-block code) {
          display: block;
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: break-all;
        }
        :global(.custom-code-block.ProseMirror-selectednode) {
          border: 1px solid var(--joy-palette-divider);
          background: var(--Layout-bg);
        }
        :global(.tiptap-preview) {
          min-height: 200px;
          border-radius: 8px;
          padding: 16px;
          color: #222;
          font-size: 16px;
          margin-top: 8px;
          ${colorScheme === "dark" && `
            color: var(--joy-palette-text-primary);
            p[style*='color: black'], p[style*='color: #000'], p[style*='color: rgb(0, 0, 0)'], p[style*='color: rgba(0,0,0'], p[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            span[style*='color: black'], span[style*='color: #000'], span[style*='color: rgb(0, 0, 0)'], span[style*='color: rgba(0,0,0'], span[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            div[style*='color: black'], div[style*='color: #000'], div[style*='color: rgb(0, 0, 0)'], div[style*='color: rgba(0,0,0'], div[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h1[style*='color: black'], h1[style*='color: #000'], h1[style*='color: rgb(0, 0, 0)'], h1[style*='color: rgba(0,0,0'], h1[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h2[style*='color: black'], h2[style*='color: #000'], h2[style*='color: rgb(0, 0, 0)'], h2[style*='color: rgba(0,0,0'], h2[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h3[style*='color: black'], h3[style*='color: #000'], h3[style*='color: rgb(0, 0, 0)'], h3[style*='color: rgba(0,0,0'], h3[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h4[style*='color: black'], h4[style*='color: #000'], h4[style*='color: rgb(0, 0, 0)'], h4[style*='color: rgba(0,0,0'], h4[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h5[style*='color: black'], h5[style*='color: #000'], h5[style*='color: rgb(0, 0, 0)'], h5[style*='color: rgba(0,0,0'], h5[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            h6[style*='color: black'], h6[style*='color: #000'], h6[style*='color: rgb(0, 0, 0)'], h6[style*='color: rgba(0,0,0'], h6[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            li[style*='color: black'], li[style*='color: #000'], li[style*='color: rgb(0, 0, 0)'], li[style*='color: rgba(0,0,0'], li[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
            blockquote[style*='color: black'], blockquote[style*='color: #000'], blockquote[style*='color: rgb(0, 0, 0)'], blockquote[style*='color: rgba(0,0,0'], blockquote[style*='color: rgb(11, 13, 14)'] {
              color: var(--joy-palette-text-secondary) !important;
            }
          `}
        }
        :global(.tiptap-preview pre) {
          border: 1px solid var(--joy-palette-divider);
          border-radius: 4px;
          padding: 8px;
          font-family: monospace;
          font-size: 14px;
          margin: 8px 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          word-break: break-all;
        }
        :global(.ProseMirror a),
        :global(.tiptap-preview a) {
          text-decoration: none !important;
          color: inherit;
        }
        .tooltip-wrapper {
          position: relative;
          display: inline-flex;
        }
        .tooltip-wrapper:hover .tooltip {
          visibility: visible;
          opacity: 1;
        }
        .tooltip {
          visibility: hidden;
          opacity: 0;
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: #dad8fd;
          color: #3d37dd;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 1000;
          transition: opacity 0.2s;
        }
        @media (max-width: 600px) {
          .tiptap-toolbar {
            padding: 4px 2px;
            gap: 1px;
          }
          .tiptap-toolbar button,
          .tiptap-toolbar select {
            padding: 4px 4px;
            min-width: 28px;
            font-size: 12px;
          }
          .color-picker {
            grid-template-columns: repeat(5, 18px);
            padding: 4px;
          }
          .color-swatch {
            width: 18px;
            height: 18px;
          }
          .link-input-container input {
            font-size: 12px;
            width: 120px;
          }
          .tooltip {
            font-size: 10px;
          }
        }
        .custom-select {
          position: relative;
        }
        .select-button {
          background: var(--joy-palette-background-body);
          border: 1px solid var(--joy-palette-divider) !important;
          min-width: 120px;
          text-align: left;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .select-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: var(--joy-palette-background-body);
          border: 1px solid var(--joy-palette-divider);
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          min-width: 130px;
        }
        .select-dropdown.w-75 {
          min-width: 75px !important;
        }
        .select-option {
          padding: 2px 8px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-size: 14px;
        }
        .select-option:hover {
          background-color: var(--joy-palette-neutral-100);
        }
        .select-option.heading-1 {
          font-size: 22px;
          font-weight: bold;
        }
        .select-option.heading-2 {
          font-size: 20px;
          font-weight: bold;
        }
        .select-option.heading-3 {
          font-size: 18px;
          font-weight: bold;
        }
        .select-option.heading-4 {
          font-size: 16px;
          font-weight: bold;
        }
        .custom-button-popup {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: var(--joy-palette-background-body);
          border: 1px solid var(--joy-palette-divider);
          border-radius: 4px;
          padding: 16px;
          z-index: 10000;
          min-width: 300px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          max-height: 300px;
          overflow-y: auto;
        }
        .custom-button-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-group label {
          font-size: 14px;
          color: var(--joy-palette-text-secondary);
        }
        .form-group input[type="text"] {
          padding: 8px;
          border: 1px solid var(--joy-palette-divider);
          border-radius: 4px;
          font-size: 14px;
          background: var(--joy-palette-background-body);
          color: var(--joy-palette-text-primary);
        }
        .form-group input[type="color"] {
          width: 100%;
          height: 36px;
          padding: 2px;
          border: 1px solid var(--joy-palette-divider);
          border-radius: 4px;
          cursor: pointer;
        }
        .button-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 8px;
        }
        .button-actions button {
          padding: 8px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--joy-palette-background-body);
          color: var(--joy-palette-text-primary);
          transition: background-color 0.2s;
        }
        .button-actions button:hover {
          background: var(--joy-palette-neutral-100);
        }
        :global(.custom-button) {
          display: inline-block;
          text-decoration: none;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        :global(.custom-button:hover) {
          opacity: 0.8;
        }
        .form-group select {
          padding: 8px;
          border: 1px solid var(--joy-palette-divider);
          border-radius: 4px;
          font-size: 14px;
          background: var(--joy-palette-background-body);
          color: var(--joy-palette-text-primary);
          width: 100%;
          cursor: pointer;
        }
        .form-group select:focus {
          outline: none;
          border-color: var(--joy-palette-primary-500);
        }
        .form-group select option {
          padding: 8px;
          background: var(--joy-palette-background-body);
          color: var(--joy-palette-text-primary);
        }
      `}</style>
    </div>
  );
};

export default TiptapEditor;
