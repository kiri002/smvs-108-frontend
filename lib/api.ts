import axios from "axios";

// Shared HTTP client for the SMVS-108 backend.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api/v1",
  headers: { "Content-Type": "application/json" },
});
