// utils/distanceUtils.js

/**
 * Calculate the Haversine distance between two points on the Earth's surface.
 * @param {number} lat1 - Latitude of the first point.
 * @param {number} lon1 - Longitude of the first point.
 * @param {number} lat2 - Latitude of the second point.
 * @param {number} lon2 - Longitude of the second point.
 * @returns {number} - Distance between the two points in kilometers or NaN if inputs are invalid.
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  // Check for valid number inputs
  if ([lat1, lon1, lat2, lon2].some(coord => typeof coord !== 'number' || isNaN(coord))) {
      console.error('Invalid coordinates:', { lat1, lon1, lat2, lon2 });
      return NaN; // Return NaN if any of the coordinates are invalid
  }

  const toRadians = (degree) => (degree * Math.PI) / 180;

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon1 - lon2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export default haversineDistance;
