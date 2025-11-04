import { apiFetch } from "./api-fetch";
import {config} from "@/config";

export interface Manager {
  id: string;
  name: string;
}

export async function getManagers(customerId?: string): Promise<Manager[]> {
  const url = customerId 
    ? `${config.site.apiUrl}/taxonomies/managers?customerId=${customerId}`
    : `${config.site.apiUrl}/taxonomies/managers`;
  
  return apiFetch<Manager[]>(url, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });
}