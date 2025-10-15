import React, { useState, useMemo } from 'react';
import type { SavedInventoryData } from '../types';
import { InventoryIcon, SizeIcon, TrashIcon, BackIcon, ResetIcon } from './Icons';

interface SavedInventoriesPageProps {
    inventories: SavedInventoryData[];
    onView: (inventory: SavedInventoryData) => void;
    onDelete: (id: string) => void;
    onNew: () => void;
}

const parseVolume = (sizeString: string): number => {
    if (!sizeString) return 0;
    const match = sizeString.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : 0;
};

const SavedInventoriesPage: React.FC<SavedInventoriesPageProps> = ({ inventories, onView, onDelete, onNew }) => {
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [minItems, setMinItems] = useState<string>('');
    const [minVolume, setMinVolume] = useState<string>('');

    const handleClearFilters = () => {
        setSortOrder('newest');
        setMinItems('');
        setMinVolume('');
    };

    const filteredAndSortedInventories = useMemo(() => {
        let processedInventories = [...inventories];

        // Apply filters
        if (minItems) {
            const minItemsNum = parseInt(minItems, 10);
            if (!isNaN(minItemsNum)) {
                processedInventories = processedInventories.filter(inv => inv.inventory.length >= minItemsNum);
            }
        }

        if (minVolume) {
            const minVolumeNum = parseFloat(minVolume);
            if (!isNaN(minVolumeNum)) {
                processedInventories = processedInventories.filter(inv => parseVolume(inv.totalEstimatedSize) >= minVolumeNum);
            }
        }

        // Apply sorting
        processedInventories.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return processedInventories;
    }, [inventories, sortOrder, minItems, minVolume]);


    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in">
            <div className="bg-gray-900/50 rounded-xl shadow-2xl p-6 sm:p-8 border border-gray-700/50">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                         <InventoryIcon className="w-8 h-8 text-cyan-400" />
                         <h2 className="text-2xl font-bold text-gray-100">Saved Inventories</h2>
                    </div>
                     <button
                        onClick={onNew}
                        className="inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                    >
                        <BackIcon className="w-5 h-5 mr-2 transform rotate-180" />
                        Create New
                    </button>
                </div>
                
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/80 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className='flex items-center gap-4 flex-wrap'>
                        <span className="font-semibold text-gray-300">Filter by:</span>
                        <input
                            type="number"
                            placeholder="Min Items"
                            value={minItems}
                            onChange={(e) => setMinItems(e.target.value)}
                            className="bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 placeholder-gray-500 w-28 py-1.5 px-2 text-sm"
                        />
                        <input
                            type="number"
                            placeholder="Min Volume (cu ft)"
                            value={minVolume}
                            onChange={(e) => setMinVolume(e.target.value)}
                            className="bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 placeholder-gray-500 w-36 py-1.5 px-2 text-sm"
                        />
                    </div>
                     <div className='flex items-center gap-4 flex-wrap'>
                        <label htmlFor="sort-order" className="font-semibold text-gray-300">Sort by:</label>
                        <select
                            id="sort-order"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                             className="bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 py-1.5 pl-2 pr-8 text-sm"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                         <button onClick={handleClearFilters} className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors" aria-label="Clear filters">
                            <ResetIcon className="w-5 h-5" />
                         </button>
                    </div>
                </div>

                {inventories.length > 0 ? (
                    filteredAndSortedInventories.length > 0 ? (
                        <div className="space-y-4">
                            {filteredAndSortedInventories.map(inv => (
                                <div key={inv.id} className="bg-gray-800/70 p-4 rounded-lg border border-gray-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <p className="font-bold text-lg text-gray-200">
                                            Inventory from {new Date(inv.createdAt).toLocaleString()}
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {inv.inventory.length} item types
                                        </p>
                                        <p className="text-cyan-300/80 text-sm font-medium mt-1">
                                            <SizeIcon className="inline w-4 h-4 mr-1.5 align-text-bottom" />
                                            Total Volume: {inv.totalEstimatedSize}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <button
                                            onClick={() => onView(inv)}
                                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold rounded-md transition-colors"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('Are you sure you want to delete this inventory?')) {
                                                onDelete(inv.id);
                                            }
                                            }}
                                            className="p-2 bg-red-800/50 hover:bg-red-700 text-red-300 hover:text-white rounded-md transition-colors"
                                            aria-label="Delete inventory"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                            <h3 className="text-xl font-semibold text-gray-300">No Inventories Match Your Filters</h3>
                            <p className="text-gray-500 mt-2">Try adjusting or clearing your filters.</p>
                            <button
                                onClick={handleClearFilters}
                                className="mt-6 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors shadow-md inline-flex items-center"
                            >
                                <ResetIcon className="w-5 h-5 mr-2" />
                                Clear Filters
                            </button>
                        </div>
                    )
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                        <h3 className="text-xl font-semibold text-gray-300">No Saved Inventories Yet</h3>
                        <p className="text-gray-500 mt-2">Create your first inventory and it will appear here.</p>
                         <button
                            onClick={onNew}
                            className="mt-6 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                        >
                            Create a New Inventory
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedInventoriesPage;