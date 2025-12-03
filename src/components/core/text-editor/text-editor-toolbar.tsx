'use client';

import * as React from 'react';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Stack from '@mui/joy/Stack';
import { Code as CodeIcon } from '@phosphor-icons/react/dist/ssr/Code';
import { Link as LinkIcon } from '@phosphor-icons/react/dist/ssr/Link';
import { LinkBreak as LinkBreakIcon } from '@phosphor-icons/react/dist/ssr/LinkBreak';
import { ListDashes as ListDashesIcon } from '@phosphor-icons/react/dist/ssr/ListDashes';
import { ListNumbers as ListNumbersIcon } from '@phosphor-icons/react/dist/ssr/ListNumbers';
import { TextB as TextBIcon } from '@phosphor-icons/react/dist/ssr/TextB';
import { TextItalic as TextItalicIcon } from '@phosphor-icons/react/dist/ssr/TextItalic';
import { TextStrikethrough as TextStrikethroughIcon } from '@phosphor-icons/react/dist/ssr/TextStrikethrough';
import type { Editor } from '@tiptap/react';

import { usePopover } from '@/hooks/use-popover';
import { Popup, PopupContent } from '@/components/core/popup';

type HeadlingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TextEditorToolbarProps {
  editor: Editor | null;
}

export function TextEditorToolbar({ editor }: TextEditorToolbarProps): React.JSX.Element {
  const linkPopover = usePopover<HTMLButtonElement>();
  const [link, setLink] = React.useState<string>('');

  return (
    <React.Fragment>
      <Stack
        className="tiptap-toolbar"
        spacing={1}
        sx={{ borderBottom: '1px solid var(--joy-palette-divider)', p: '8px', minHeight: '57px' }}
      >
        {editor ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl>
              <Select
                onChange={(_, value: string | null) => {
                  if (!value) {
                    return;
                  }

                  if (value === 'p') {
                    editor.chain().focus().setParagraph().run();
                    return;
                  }

                  if (value.startsWith('h')) {
                    const level = parseInt(value.replace('h', '')) as HeadlingLevel;

                    if (!isNaN(level) && level >= 1 && level <= 6) {
                      editor.chain().focus().setHeading({ level }).run();
                    }
                  }
                }}
                sx={{ width: '140px' }}
                value={getFontValue(editor)}
              >
                <Option disabled={!editor.can().chain().focus().setParagraph().run()} value="p">
                  Paragrah
                </Option>
                {([1, 2, 3, 4, 5, 6] as const).map((level) => (
                  <Option
                    disabled={!editor.can().chain().focus().setHeading({ level }).run()}
                    key={level}
                    value={`h${level}`}
                  >
                    Heading {level}
                  </Option>
                ))}
              </Select>
            </FormControl>
            <ToolbarButton
              active={editor.isActive('bold')}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              onClick={() => {
                editor.chain().focus().toggleBold().run();
              }}
            >
              <TextBIcon fontSize="var(--Icon-fontSize)" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('italic')}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              onClick={() => {
                editor.chain().focus().toggleItalic().run();
              }}
            >
              <TextItalicIcon fontSize="var(--Icon-fontSize)" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('strike')}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              onClick={() => {
                editor.chain().focus().toggleStrike().run();
              }}
            >
              <TextStrikethroughIcon fontSize="var(--Icon-fontSize)" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('codeBlock')}
              disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
              onClick={() => {
                editor.chain().focus().toggleCodeBlock();
              }}
            >
              <CodeIcon fontSize="var(--Icon-fontSize)" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('bulletList')}
              disabled={!editor.can().chain().focus().toggleBulletList().run()}
              onClick={() => {
                editor.chain().focus().toggleBulletList().run();
              }}
            >
              <ListDashesIcon fontSize="var(--Icon-fontSize)" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('orderedList')}
              disabled={!editor.can().chain().focus().toggleOrderedList().run()}
              onClick={() => {
                editor.chain().focus().toggleOrderedList().run();
              }}
            >
              <ListNumbersIcon fontSize="var(--Icon-fontSize)" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                setLink((editor.getAttributes('link').href as string) ?? '');
                linkPopover.handleOpen();
              }}
              ref={linkPopover.anchorRef}
            >
              <LinkIcon fontSize="var(--Icon-fontSize)" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('link')}
              disabled={!editor.can().chain().focus().unsetLink().run()}
              onClick={() => {
                editor.chain().focus().unsetLink().run();
              }}
            >
              <LinkBreakIcon fontSize="var(--Icon-fontSize)" />
            </ToolbarButton>
          </Stack>
        ) : null}
      </Stack>
      <Popup
        anchorEl={linkPopover.anchorRef.current}
        onClose={() => {
          linkPopover.handleClose();
          setLink('');
        }}
        open={linkPopover.open}
        placement="bottom-end"
      >
        <PopupContent sx={{ p: 1 }}>
          <FormControl>
            <FormLabel>URL</FormLabel>
            <Input
              name="url"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setLink(event.target.value);
              }}
              onKeyUp={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key !== 'Enter') {
                  return;
                }

                if (link === '') {
                  editor?.chain().focus().extendMarkRange('link').unsetLink().run();
                  return;
                }

                editor?.chain().focus().setLink({ href: link }).run();
                linkPopover.handleClose();
                setLink('');
              }}
              value={link}
            />
          </FormControl>
        </PopupContent>
      </Popup>
    </React.Fragment>
  );
}

function getFontValue(editor: Editor): string {
  return editor.isActive('paragraph')
    ? 'p'
    : editor.isActive('heading', { level: 1 })
      ? 'h1'
      : editor.isActive('heading', { level: 2 })
        ? 'h2'
        : editor.isActive('heading', { level: 3 })
          ? 'h3'
          : editor.isActive('heading', { level: 4 })
            ? 'h4'
            : editor.isActive('heading', { level: 5 })
              ? 'h5'
              : editor.isActive('heading', { level: 6 })
                ? 'h6'
                : 'p';
}

interface ToolbarButtonProps {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton(
  { active, children, disabled, onClick },
  ref
): React.JSX.Element {
  return (
    <IconButton color={active ? 'primary' : 'neutral'} disabled={disabled} onClick={onClick} ref={ref}>
      {children}
    </IconButton>
  );
});
