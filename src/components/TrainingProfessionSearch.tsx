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
  const [hasUserCleared, setHasUserCleared] = useState(false);

  // Initialisiere mit existierendem Namen (nur beim ersten Laden)
  useEffect(() => {
    if (initialName && !query && !hasUserCleared) {
      setQuery(initialName);
    }
  }, [initialName, query, hasUserCleared]);

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
    
    // Wenn User das Feld leert, markiere es als manuell geleert
    if (newQuery === '') {
      setHasUserCleared(true);
    }
    
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
    setHasUserCleared(false); // Reset beim Auswählen
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
    setHasUserCleared(true); // Markiere als manuell geleert
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
          className="w-full bg-transparent outline-none text-sm font-medium p-3 pr-10 rounded-lg border-2 transition-all"
          style={{
            background: 'rgba(0, 0, 0, 0.02)',
            borderColor: 'rgba(0, 0, 0, 0.1)',
            color: 'var(--text-primary)'
          }}
          onFocusCapture={(e) => {
            e.target.style.borderColor = '#7c3aed'
            e.target.style.background = 'rgba(0, 0, 0, 0.03)'
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)'
            e.target.style.background = 'rgba(0, 0, 0, 0.02)'
          }}
        />
        {query && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-bold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 rounded-lg max-h-60 overflow-y-auto border-2 glass-strong backdrop-blur-xl"
          style={{
            borderColor: 'rgba(124, 58, 237, 0.4)',
            boxShadow: '0 8px 32px rgba(124, 58, 237, 0.25), 0 0 0 1px rgba(124, 58, 237, 0.1)'
          }}
        >
          {loading ? (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              ⏳ Suche läuft...
            </div>
          ) : professions.length > 0 ? (
            professions.map((profession, index) => {
              const color = index % 4 === 0 ? '#7c3aed' : 
                           index % 4 === 1 ? '#ec4899' : 
                           index % 4 === 2 ? '#14b8a6' : 
                           '#f97316'
              
              return (
                <div
                  key={profession.id}
                  onClick={() => handleSelectProfession(profession)}
                  className="px-4 py-3 cursor-pointer border-b transition-all"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)'
                    e.currentTarget.style.borderColor = color
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                  }}
                >
                  <div className="font-semibold text-sm" style={{ color }}>
                    {profession.name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {profession.category}
                  </div>
                </div>
              )
            })
          ) : query.length > 1 ? (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              ❌ Keine Ergebnisse gefunden
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}