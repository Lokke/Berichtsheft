'use client';

import { useState, useEffect } from 'react';

interface TrainingProfession {
  id: string;
  name: string;
  category: string;
}

interface TrainingProfessionSearchProps {
  value: string | null;
  initialName?: string;
  onChange: (professionId: string | null, professionName: string) => void;
  placeholder?: string;
}

export default function TrainingProfessionSearch({ 
  value, 
  initialName = '',
  onChange, 
  placeholder = "Ausbildungsberuf suchen..." 
}: TrainingProfessionSearchProps) {
  const [query, setQuery] = useState(initialName);
  const [professions, setProfessions] = useState<TrainingProfession[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState<TrainingProfession | null>(null);

  // Initialisiere mit existierendem Namen
  useEffect(() => {
    if (initialName && !query) {
      setQuery(initialName);
    }
  }, [initialName, query]);

  // Lade die ausgewählte Profession beim Initialisieren über ID
  useEffect(() => {
    if (value && !selectedProfession && !initialName) {
      fetchProfessionById(value);
    }
  }, [value, selectedProfession, initialName]);

  const fetchProfessionById = async (id: string) => {
    try {
      const response = await fetch(`/api/training-professions?id=${id}`);
      const data = await response.json();
      const profession = data.professions?.[0];
      if (profession) {
        setSelectedProfession(profession);
        setQuery(profession.name);
      }
    } catch (error) {
      console.error('Error fetching profession:', error);
    }
  };

  const searchProfessions = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setProfessions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/training-professions?search=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setProfessions(data.professions || []);
    } catch (error) {
      console.error('Error searching professions:', error);
      setProfessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedProfession(null);
    
    if (newQuery.length > 1) {
      setIsOpen(true);
      searchProfessions(newQuery);
    } else {
      setIsOpen(false);
      setProfessions([]);
    }
  };

  const handleSelectProfession = (profession: TrainingProfession) => {
    setSelectedProfession(profession);
    setQuery(profession.name);
    setIsOpen(false);
    onChange(profession.id, profession.name);
  };

  const handleInputFocus = () => {
    if (query.length > 1) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Verzögerung um Klicks auf Dropdown-Items zu ermöglichen
    setTimeout(() => setIsOpen(false), 150);
  };

  const clearSelection = () => {
    setQuery('');
    setSelectedProfession(null);
    setProfessions([]);
    setIsOpen(false);
    onChange(null, '');
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-gray-500">Suche läuft...</div>
          ) : professions.length > 0 ? (
            professions.map((profession) => (
              <div
                key={profession.id}
                onClick={() => handleSelectProfession(profession)}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{profession.name}</div>
                <div className="text-sm text-gray-500">{profession.category}</div>
              </div>
            ))
          ) : query.length > 1 ? (
            <div className="px-4 py-2 text-gray-500">Keine Ergebnisse gefunden</div>
          ) : null}
        </div>
      )}
    </div>
  );
}