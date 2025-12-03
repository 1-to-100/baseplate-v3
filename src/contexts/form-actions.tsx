'use client';

import * as React from 'react';

interface FormActions {
  onReset?: () => void;
  onSubmit?: () => void;
  setSubmitHandler?: (handler: () => void) => void;
}

export const FormActionsContext = React.createContext<FormActions>({}); 