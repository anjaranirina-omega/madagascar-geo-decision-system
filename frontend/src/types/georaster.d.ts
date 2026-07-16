declare module 'georaster' {
  const parseGeoraster: (data: ArrayBuffer) => Promise<any>;
  export default parseGeoraster;
}

declare module 'georaster-layer-for-leaflet' {
  const GeoRasterLayer: any;
  export default GeoRasterLayer;
}
