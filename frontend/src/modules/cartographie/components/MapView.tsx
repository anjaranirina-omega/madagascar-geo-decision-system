import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export default function MapView() {
  return (
    <MapContainer center={[-18.8792, 47.5079]} zoom={6} style={{ height: 560, width: '100%' }}>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[-18.8792, 47.5079]}><Popup>Antananarivo — point de départ</Popup></Marker>
    </MapContainer>
  );
}
