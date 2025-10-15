export enum AppStatus {
    IDLE = 'IDLE',
    PROCESSING = 'PROCESSING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

export type AppState = AppStatus;

export interface InventoryItem {
    name: string;
    count: number;
    description: string;
    tags: string[];
    estimatedSize: string; // e.g., "approx. 2 cubic feet"
}

export interface InventoryData {
    inventory: InventoryItem[];
    transcript: string;
    totalEstimatedSize: string; // e.g., "approx. 50 cubic feet"
}

export interface SavedInventoryData extends InventoryData {
    id: string;
    createdAt: string;
}
