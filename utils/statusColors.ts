import { type FilmStatus } from "@/types";

export const statusColors: Record<FilmStatus, string> = {
    'in-camera': '#4CAF50', // Green
    'developing': '#FF9800', // Orange
    'archived': '#9E9E9E', // Grey
};

export const getStatusColor = (status: FilmStatus): string => {
    return statusColors[status] || '#000000';
};