import { apiFetch } from "./api-fetch";
import {config} from "@/config";

export interface Manager {
  id: string;
  name: string;
}

export async function getManagers(): Promise<Manager[]> {
  return apiFetch<Manager[]>(`${config.site.apiUrl}/taxonomies/managers`, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });
}