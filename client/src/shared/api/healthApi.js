import apiClient from "./axios";

export const getHealth = async () => {
  const response = await apiClient.get("/health");

  return response.data;
};