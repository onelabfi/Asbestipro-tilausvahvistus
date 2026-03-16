'use client';

import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

type Props = {
  onSelect: (place: {
    osoite: string;
    postinumero: string;
    kaupunki: string;
    latitude: number;
    longitude: number;
  }) => void;
  value: string;
  onChange: (val: string) => void;
};

export default function AddressAutocomplete({ onSelect, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });

    loader.importLibrary('places').then(() => {
      if (!inputRef.current) return;

      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'fi' },
        types: ['address'],
        fields: ['address_components', 'geometry', 'formatted_address'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.address_components || !place.geometry?.location) return;

        let streetNumber = '';
        let route = '';
        let postalCode = '';
        let city = '';

        for (const comp of place.address_components) {
          const type = comp.types[0];
          if (type === 'street_number') streetNumber = comp.long_name;
          if (type === 'route') route = comp.long_name;
          if (type === 'postal_code') postalCode = comp.long_name;
          if (type === 'locality') city = comp.long_name;
          if (type === 'administrative_area_level_3' && !city) city = comp.long_name;
        }

        const osoite = route + (streetNumber ? ' ' + streetNumber : '');
        onChange(osoite);

        onSelect({
          osoite,
          postinumero: postalCode,
          kaupunki: city,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        });
      });
    });
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Kirjoita osoite..."
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base"
    />
  );
}
