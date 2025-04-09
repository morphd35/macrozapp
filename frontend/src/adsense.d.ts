// src/adsense.d.ts
interface Window {
    adsbygoogle: {
        push: (config?: any) => void;
        // Add other properties if needed, but push is the main method we use
    } | any[];
}