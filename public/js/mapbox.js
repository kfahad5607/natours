export const displayMap = (locations) => {
    mapboxgl.accessToken = 'pk.eyJ1Ijoia2ZhaGFkNTYwNyIsImEiOiJja2Y1aTZydW4wMXYxMnNyNDRkNGUwMDZjIn0.ghzsWq5VnSmXFgYwEgvisg';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/kfahad5607/ckf5lb8o52m8v19mj4j59gvkg',
    scrollZoom: false
});

const bounds = new mapboxgl.LngLatBounds();

locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
    }).setLngLat(loc.coordinates).addTo(map);

    // Add popup
    new mapboxgl.Popup({offset: 30}).setLngLat(loc.coordinates).setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`).addTo(map)

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
});

map.fitBounds(bounds, {
    padding: {
        top: 200,
        bottom: 150,
        left: 100,
        right: 100
    }
});

}

