import React from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Box from '@mui/joy/Box';
import FormHelperText from '@mui/joy/FormHelperText';

export interface ModalData {
  title: string;
  fields: {
    name: string;
    label: string;
    type: 'text' | 'email' | 'password';
    placeholder: string;
    required?: boolean;
    error?: string;
  }[];
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  data: ModalData;
  onSave?: (formData: Record<string, string>) => void;
  isLoading?: boolean;
}

export function ModalComponent({ 
  open, 
  onClose, 
  data, 
  onSave,
  isLoading = false
}: ModalProps) {
  const [formData, setFormData] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      const initialData: Record<string, string> = {};
      data.fields.forEach(field => {
        initialData[field.name] = '';
      });
      setFormData(initialData);
      setErrors({});
    }
  }, [open, data]);

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    data.fields.forEach(field => {
      const fieldValue = formData[field.name] || '';
      
      if (field.required && !fieldValue.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
      
      if (field.type === 'email' && fieldValue) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fieldValue)) {
          newErrors[field.name] = 'Invalid email format';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm() && onSave) {
      onSave(formData);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: { xs: "90%", sm: 600, md: 800 },
          maxWidth: "100%",
          p: { xs: 2, sm: 3 },
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <ModalClose sx={{ color: "#6B7280" }} />
        <Typography
          level="h3"
          sx={{
            fontSize: { xs: "20px", sm: "22px", md: "24px" },
            fontWeight: 600,
            color: "var(--joy-palette-text-primary)",
            mb: { xs: 1.5, sm: 2 },
          }}
        >
          {data.title}
        </Typography>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          {data.fields.map((field) => (
            <Stack key={field.name}>
              <Typography
                level="body-sm"
                sx={{
                  fontSize: { xs: "12px", sm: "14px" },
                  color: "var(--joy-palette-text-primary)",
                  mb: 0.5,
                  fontWeight: 500,
                }}
              >
                {field.label}
              </Typography>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                error={!!errors[field.name]}
                slotProps={{ input: { maxLength: 255 } }}
                sx={{
                  borderRadius: "6px",
                  fontSize: { xs: "12px", sm: "14px" },
                }}
              />
              {errors[field.name] && (
                <FormHelperText
                  sx={{
                    color: "var(--joy-palette-danger-500)",
                    fontSize: { xs: "10px", sm: "12px" },
                  }}
                >
                  {errors[field.name]}
                </FormHelperText>
              )}
            </Stack>
          ))}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2 }}
            justifyContent="flex-end"
            sx={{ mt: 2 }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                fontSize: { xs: "12px", sm: "14px" },
                px: { xs: 2, sm: 3 },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleSave}
              disabled={isLoading}
              sx={{
                borderRadius: "20px",
                bgcolor: "#4F46E5",
                color: "#FFFFFF",
                fontWeight: 500,
                fontSize: { xs: "12px", sm: "14px" },
                px: { xs: 2, sm: 3 },
                py: 1,
                "&:hover": { bgcolor: "#4338CA" },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
