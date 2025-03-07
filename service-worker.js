self.addEventListener('install', (event) => {
    console.log('Service worker installed');
  });
  
  self.addEventListener('fetch', (event) => {
    // Add caching logic if needed
  });
  