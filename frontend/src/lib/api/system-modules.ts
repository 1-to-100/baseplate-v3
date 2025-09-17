import { apiFetch } from "./api-fetch";
import {config} from "@/config";

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
  return apiFetch<SystemModules[]>(`${config.site.apiUrl}/system-modules`, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });
}