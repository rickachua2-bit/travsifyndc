
fetch('https://travsify-ndc.onrender.com/')
  .then(r => r.text())
  .then(html => {
    const cssLinks = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/g);
    console.log("CSS Links:", cssLinks);
    
    // Check if the specific CSS file is mentioned anywhere
    console.log("Mentions CSS file?", html.includes('styles-DuyH7ZF-.css'));
  });
