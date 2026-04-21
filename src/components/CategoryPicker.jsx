import React, { useState, useMemo } from 'react';
import { Search, X, Check, ChevronRight, Hash, Star } from 'lucide-react';

const CategoryPicker = ({ selectedCategories, onToggle, categoriesByGroup }) => {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(
    Object.keys(categoriesByGroup).reduce((acc, group) => ({ ...acc, [group]: true }), {})
  );

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categoriesByGroup;
    
    const filtered = {};
    const searchLower = search.toLowerCase();
    
    Object.entries(categoriesByGroup).forEach(([group, categories]) => {
      const matching = categories.filter(cat => 
        cat.toLowerCase().includes(searchLower) || 
        group.toLowerCase().includes(searchLower)
      );
      if (matching.length > 0) {
        filtered[group] = matching;
      }
    });
    return filtered;
  }, [search, categoriesByGroup]);


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search 100+ categories (e.g. AI, Vegan, Fitness...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-gray-700 font-medium placeholder:text-gray-400"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Selected Categories Summary (if any) */}
      {selectedCategories.length > 0 && (
        <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100/50">
          <div className="flex items-center gap-2 mb-3">
             <Star size={16} className="text-indigo-600 fill-indigo-600" />
             <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Your Interests ({selectedCategories.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(cat => (
              <button
                key={cat}
                onClick={() => onToggle(cat)}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                {cat}
                <X size={12} className="opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grouped Selection */}
      <div className="grid gap-4 max-h-[600px] overflow-y-auto px-1 custom-scrollbar">
        {Object.entries(filteredCategories).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
             <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-400" />
             </div>
             <p className="text-gray-500 font-bold tracking-tight">No categories matching "{search}"</p>
          </div>
        ) : (
          Object.entries(filteredCategories).map(([group, categories]) => (
            <div key={group} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <button 
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <Hash size={18} className="text-indigo-600" />
                  </div>
                  <h3 className="font-black text-gray-900 tracking-tight">{group}</h3>
                  <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                    {categories.length}
                  </span>
                </div>
                <div className={`transform transition-transform duration-300 ${expandedGroups[group] ? 'rotate-90' : ''}`}>
                   <ChevronRight size={18} className="text-gray-400" />
                </div>
              </button>
              
              {expandedGroups[group] && (
                <div className="p-5 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 animate-in slide-in-from-top-2 duration-300">
                  {categories.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => onToggle(cat)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-1.5xl text-xs font-bold transition-all duration-200 border-2 ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105 z-10' 
                            : 'bg-white border-gray-50 text-gray-600 hover:border-indigo-100 hover:bg-indigo-50/30'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {isSelected && <Check size={14} className="shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryPicker;
