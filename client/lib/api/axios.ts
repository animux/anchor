import axios from "axios"

const DEFAULT_SERVER_URL = "http://localhost:4000"

export function getServerApiBaseUrl() {
  return (
    process.env.API_SERVER_URL ??
    process.env.NEXT_PUBLIC_API_SERVER_URL ??
    DEFAULT_SERVER_URL
  ).replace(/\/$/, "")
}

export function createBackendAxios(token?: string | null) {
  return axios.create({
    baseURL: getServerApiBaseUrl(),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 15000,
  })
}
