export interface SystemModules {
  name: string;
  label: string;
  enabled: boolean;
  permissions: {
    name: string;
    label: string;
    order: number;
  }[];
}

export async function getSystemModules(): Promise<SystemModules[]> {
  // API call removed
  return [];
}
