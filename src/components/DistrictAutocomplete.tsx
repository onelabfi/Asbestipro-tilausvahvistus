"use client";

import { useState, useRef, useEffect } from "react";

// Finnish cities and their districts/areas — covers main service areas
const DISTRICTS: Record<string, string[]> = {
  Helsinki: [
    "Alppiharju", "Arabianranta", "Eira", "Haaga", "Hakaniemi", "Herttoniemi",
    "Itäkeskus", "Jätkäsaari", "Kallio", "Kalasatama", "Kamppi", "Katajanokka",
    "Kontula", "Kruununhaka", "Kulosaari", "Käpylä", "Laajasalo", "Lauttasaari",
    "Malmi", "Maunula", "Mellunmäki", "Munkkiniemi", "Myllypuro", "Oulunkylä",
    "Pakila", "Pasila", "Pihlajamäki", "Pitäjänmäki", "Puistola", "Pukinmäki",
    "Punavuori", "Ruoholahti", "Sörnäinen", "Tapanila", "Toukola", "Töölö",
    "Ullanlinna", "Vallila", "Viikki", "Vuosaari",
  ],
  Espoo: [
    "Espoon keskus", "Espoonlahti", "Haukilahti", "Karakallio", "Kivenlahti",
    "Leppävaara", "Mankkaa", "Matinkylä", "Niittykumpu", "Nöykkiö",
    "Olari", "Otaniemi", "Saunalahti", "Soukka", "Tapiola", "Westend",
  ],
  Vantaa: [
    "Aviapolis", "Hakunila", "Hiekkaharju", "Kivistö", "Koivukylä",
    "Korso", "Martinlaakso", "Myyrmäki", "Pakkala", "Tikkurila",
  ],
  Tampere: [
    "Amuri", "Härmälä", "Hervanta", "Kaleva", "Kissanmaa", "Koivistonkylä",
    "Leinola", "Lentävänniemi", "Linnainmaa", "Nekala", "Peltolammi",
    "Pispala", "Rahola", "Ruotula", "Tampella", "Tesoma", "Vuores",
  ],
  Turku: [
    "Hirvensalo", "Keskusta", "Kupittaa", "Martti", "Nummi",
    "Pansio", "Port Arthur", "Raunistula", "Runosmäki", "Varissuo",
  ],
  Oulu: [
    "Alppila", "Höyhtyä", "Kaijonharju", "Keskusta", "Linnanmaa",
    "Pateniemi", "Puolivälinkangas", "Rajakylä", "Toppila", "Tuira",
  ],
  Lahti: [
    "Ahtiala", "Jalkaranta", "Keskusta", "Kiveriö", "Laune",
    "Mukkula", "Möysä", "Renkomäki", "Saksala",
  ],
  Kuopio: [
    "Keskusta", "Linnanpelto", "Neulamäki", "Petonen", "Puijonlaakso",
    "Päiväranta", "Rahusenkangas", "Saaristokaupunki",
  ],
  Jyväskylä: [
    "Halssila", "Huhtasuo", "Keljo", "Keskusta", "Kortepohja",
    "Kuokkala", "Kypärämäki", "Palokka", "Seppälänkangas",
  ],
};

// Flatten all districts for search
const ALL_OPTIONS = Object.entries(DISTRICTS).flatMap(([city, districts]) =>
  districts.map((d) => ({ district: d, city }))
);

// Also allow city-level entries
const CITY_OPTIONS = Object.keys(DISTRICTS).map((city) => ({
  district: city,
  city,
}));

interface Props {
  value: string;
  city: string;
  onChange: (district: string) => void;
  onCityChange?: (city: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function DistrictAutocomplete({
  value,
  city,
  onChange,
  onCityChange,
  placeholder = "e.g. Töölö",
  required = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Filter options — prioritize current city, then show others
  const q = query.toLowerCase().trim();
  const filtered = q
    ? [...ALL_OPTIONS, ...CITY_OPTIONS]
        .filter(
          (o) =>
            o.district.toLowerCase().includes(q) ||
            o.city.toLowerCase().includes(q)
        )
        .sort((a, b) => {
          // Prioritize current city
          const aCity = a.city === city ? 0 : 1;
          const bCity = b.city === city ? 0 : 1;
          if (aCity !== bCity) return aCity - bCity;
          // Then by match position
          const aIdx = a.district.toLowerCase().indexOf(q);
          const bIdx = b.district.toLowerCase().indexOf(q);
          return aIdx - bIdx;
        })
        .slice(0, 12)
    : // No query — show districts for current city, or all cities
      (city && DISTRICTS[city]
        ? DISTRICTS[city].map((d) => ({ district: d, city }))
        : CITY_OPTIONS
      ).slice(0, 12);

  const handleSelect = (option: { district: string; city: string }) => {
    onChange(option.district);
    if (onCityChange && option.city !== city) {
      onCityChange(option.city);
    }
    setQuery(option.district);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((opt, i) => (
            <button
              key={`${opt.city}-${opt.district}-${i}`}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                opt.district === value ? "bg-blue-50 font-medium" : ""
              }`}
            >
              <span className="font-medium">{opt.district}</span>
              {opt.district !== opt.city && (
                <span className="text-gray-400 ml-1.5 text-xs">{opt.city}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
