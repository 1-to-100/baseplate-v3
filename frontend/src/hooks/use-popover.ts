import * as React from 'react';

interface PopoverController<T> {
  anchorRef: React.MutableRefObject<T | null>;
  handleOpen: () => void;
  handleClose: () => void;
  handleToggle: () => void;
  open: boolean;
}

export function usePopover<T = HTMLElement>(): PopoverController<T> {
  const anchorRef = React.useRef<T>(null);
  const [open, setOpen] = React.useState<boolean>(false);

  const handleOpen = React.useCallback((): void => {
    setOpen(true);
  }, []);

  const handleClose = React.useCallback((): void => {
    setOpen(false);
  }, []);

  const handleToggle = React.useCallback((): void => {
    setOpen((prevState) => !prevState);
  }, []);

  return { anchorRef, handleClose, handleOpen, handleToggle, open };
}
