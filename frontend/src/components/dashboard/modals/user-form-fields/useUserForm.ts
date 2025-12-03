"use client";

import { useState, useCallback, useMemo } from "react";

export interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  customer?: string;
  role?: string;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  customer: string;
  role: string;
  team: string;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return "Email is required";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }

  if (email.startsWith(".") || email.endsWith(".")) {
    return "Invalid email format";
  }

  if (email.includes("..")) {
    return "Invalid email format";
  }

  if (email.includes("/")) {
    return "Invalid email format";
  }

  const atIndex = email.indexOf("@");
  if (email[atIndex - 1] === ".") {
    return "Invalid email format";
  }

  return null;
}

export function useUserForm(initialData?: Partial<UserFormData>) {
  const [formData, setFormData] = useState<UserFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    customer: initialData?.customer || "",
    role: initialData?.role || "",
    team: initialData?.team || "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = useCallback((field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  }, []);

  const validateForm = useCallback((requireCustomer: boolean = false): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    if (requireCustomer && !formData.customer.trim()) {
      newErrors.customer = "Customer is required";
    }

    if (!formData.role.trim()) {
      newErrors.role = "Role is required";
    }

    return newErrors;
  }, [formData]);

  const setFormErrors = useCallback((newErrors: FormErrors) => {
    setErrors(newErrors);
  }, []);

  const resetForm = useCallback((newData?: Partial<UserFormData>) => {
    setFormData({
      firstName: newData?.firstName || "",
      lastName: newData?.lastName || "",
      email: newData?.email || "",
      customer: newData?.customer || "",
      role: newData?.role || "",
      team: newData?.team || "",
    });
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    updateField,
    validateForm,
    setFormErrors,
    resetForm,
    setFormData,
  };
}

