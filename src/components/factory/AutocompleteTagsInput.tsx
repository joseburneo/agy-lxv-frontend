import React, { useState, useRef, useEffect } from "react";

interface AutocompleteTagsInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  placeholder: string;
  label?: string;
  suggestions?: string[];
  type?: "text" | "textarea";
}

export const AutocompleteTagsInput: React.FC<AutocompleteTagsInputProps> = ({ 
  tags, 
  setTags, 
  placeholder, 
  label, 
  suggestions = [],
  type = "text"
}) => {
  const [inputVal, setInputVal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(inputVal.toLowerCase()) && !tags.includes(s)
  );

  const addTag = (val: string) => {
    // split by comma in case user pastes comma separated list
    const vals = val.split(',').map(v => v.trim()).filter(Boolean);
    const newTags = [...tags];
    let added = false;
    vals.forEach(v => {
      if (!newTags.includes(v)) {
        newTags.push(v);
        added = true;
      }
    });

    if (added) {
      setTags(newTags);
    }
    setInputVal("");
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputVal) {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="w-full relative" ref={wrapperRef}>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}
      <div className="min-h-[42px] border border-gray-300 rounded-lg shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 flex flex-wrap items-center gap-1.5 p-1.5 bg-white">
        {tags.map((tag, index) => (
          <span key={index} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
            {tag}
            <button type="button" onClick={() => removeTag(index)} className="hover:text-blue-900 focus:outline-none">
              &times;
            </button>
          </span>
        ))}
        {type === "textarea" ? (
          <textarea
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder={tags.length === 0 ? placeholder : ""} 
            className="flex-1 min-w-[120px] outline-none text-sm text-gray-900 bg-transparent border-none focus:ring-0 p-1 resize-y min-h-[40px]"
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
          />
        ) : (
          <input 
            type="text" 
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder={tags.length === 0 ? placeholder : ""} 
            className="flex-1 min-w-[120px] outline-none text-sm text-gray-900 bg-transparent border-none focus:ring-0 p-1"
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
          />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && inputVal.length > 0 && filteredSuggestions.length > 0 && (
         <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredSuggestions.slice(0, 50).map(s => (
               <div 
                 key={s} 
                 className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm text-gray-700" 
                 onMouseDown={(e) => {
                   e.preventDefault(); // Prevent input onBlur from firing before click
                   addTag(s);
                 }}
               >
                 {s}
               </div>
            ))}
         </div>
      )}
      
      {/* If empty input but clicked, show popular suggestions */}
      {showSuggestions && suggestions.length > 0 && inputVal.length === 0 && (
         <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            <div className="px-3 py-1 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested</div>
            {suggestions.filter(s => !tags.includes(s)).slice(0, 20).map(s => (
               <div 
                 key={s} 
                 className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm text-gray-700" 
                 onMouseDown={(e) => {
                   e.preventDefault();
                   addTag(s);
                 }}
               >
                 {s}
               </div>
            ))}
         </div>
      )}
    </div>
  );
};
