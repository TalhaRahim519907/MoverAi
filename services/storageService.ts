import type { InventoryData, SavedInventoryData } from '../types';

const STORAGE_KEY = 'easyMoveInventories';

/**
 * Retrieves all saved inventories from localStorage.
 * @returns {SavedInventoryData[]} An array of saved inventories, or an empty array if none are found.
 */
export const getSavedInventories = (): SavedInventoryData[] => {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const inventories = JSON.parse(savedData) as SavedInventoryData[];
            // Sort by most recent first
            return inventories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
    } catch (error) {
        console.error("Failed to parse inventories from localStorage", error);
        // If parsing fails, clear the corrupted data
        localStorage.removeItem(STORAGE_KEY);
    }
    return [];
};

/**
 * Saves a new inventory to localStorage.
 * @param {InventoryData} inventoryData - The inventory data to save.
 * @returns {SavedInventoryData} The saved inventory data including its new ID and timestamp.
 */
export const saveInventory = (inventoryData: InventoryData): SavedInventoryData => {
    const allInventories = getSavedInventories();
    
    const newInventory: SavedInventoryData = {
        ...inventoryData,
        id: `inv_${new Date().getTime()}`,
        createdAt: new Date().toISOString(),
    };

    allInventories.unshift(newInventory); // Add to the beginning of the array

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allInventories));
    } catch (error) {
        console.error("Failed to save inventory to localStorage", error);
        throw new Error("Could not save the inventory. Storage might be full.");
    }
    
    return newInventory;
};

/**
 * Deletes an inventory by its ID from localStorage.
 * @param {string} id - The ID of the inventory to delete.
 */
export const deleteInventoryById = (id: string): void => {
    let allInventories = getSavedInventories();
    const filteredInventories = allInventories.filter(inv => inv.id !== id);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredInventories));
    } catch (error) {
        console.error("Failed to update inventories in localStorage after deletion", error);
    }
};
